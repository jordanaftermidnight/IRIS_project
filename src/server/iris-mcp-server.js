/**
 * IRIS MCP Server — exposes IRIS as a Model Context Protocol server so
 * any MCP-aware client can call routing,
 * sessions, and health checks programmatically.
 *
 * Transport: SSE on a configurable port (default 8782) at /sse, with
 * POST /messages?sessionId=... for client→server messages. Tools:
 *
 * iris_chat — route a chat through the scoring engine
 * iris_providers — provider status + scoring stats
 * iris_health — health-check every provider in parallel
 * iris_session_list — list recent sessions
 * iris_session_new — create a session
 * iris_session_show — return session messages
 * iris_session_delete — drop a session
 *
 * Also serves /metrics in Prometheus format and gates everything behind
 * an optional bearer token (env IRIS_AUTH_TOKEN or config.server.authToken).
 */

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import { renderPrometheusMetrics } from './metrics.js';
import { getLogger, forceJsonFormat } from '../core/logger.js';
import { LatencyHistogram } from '../core/latency-histogram.js';
import { AuditLog } from '../core/audit-log.js';
import { MdnsAdvertiser } from './mdns.js';

export class IrisMcpServer {
  /**
   * @param {Object} opts
   * @param {import('../index.js').MultiAI} opts.ai
   * @param {number} [opts.port=8782]
   * @param {string} [opts.host="127.0.0.1"]
   * @param {string} [opts.authToken]
   * @param {string} [opts.agentId="iris"]
   * @param {boolean} [opts.metricsEnabled=true]
   */
  constructor({
    ai, port = 8782, host = '127.0.0.1', authToken, agentId = 'iris',
    metricsEnabled = true, maxEventStreams = 100, drainSeconds = 10,
    corsOrigin = null, auditLogPath = undefined, mdnsEnabled = false,
    tls = null,
  }) {
    if (!ai) throw new Error('IrisMcpServer: ai (MultiAI) is required');
    this.ai = ai;
    this.port = port;
    this.host = host;
    this.authToken = authToken || null;
    this.agentId = agentId;
    this.metricsEnabled = metricsEnabled;
    this.maxEventStreams = maxEventStreams;
    this.drainMs = Math.max(0, drainSeconds * 1000);
    // CORS: a single origin or "*" enables Cross-Origin Resource Sharing
    // for /events, /metrics, /healthz. Useful for browser dockviews;
    // off by default since the server is usually behind a same-origin
    // proxy or only accessed by other servers.
    this.corsOrigin = corsOrigin || null;
    this.transports = new Map(); // sessionId → SSEServerTransport
    this.eventStreamCount = 0; // live /events connections (cap below)
    this.httpServer = null;
    this.inFlight = 0; // active tool calls being processed
    this.shuttingDown = false;
    // Per-tool latency histogram. snapshot() returns
    // {[toolName]: {count, mean, p50, p95, p99}} — surfaced on /metrics.
    this.toolLatency = new LatencyHistogram();
    this.toolCallCount = new Map(); // toolName -> {ok, err}
    // Append-only JSONL audit trail. Default: ~/.iris/audit.jsonl,
    // overridable via constructor arg or $IRIS_AUDIT_LOG.
    this.auditLog = new AuditLog(auditLogPath);
    this.mdnsEnabled = !!mdnsEnabled;
    this.mdns = null;
    // TLS config (optional). Shape: {certPath, keyPath, caPath?,
    // requestCert?, rejectUnauthorized?}. If certPath+keyPath are set,
    // the HTTP server runs as HTTPS. If requestCert+rejectUnauthorized
    // are both true and caPath is set, full mTLS is in effect.
    this.tlsConfig = tls || null;
  }

  /**
   * Wrap a tool-call handler so in-flight count tracks correctly AND
   * latency is recorded per tool name. `toolName` is captured at
   * registration time so the wrapper knows what bucket to land in.
   */
  _trackInFlight(fn, toolName = 'unknown') {
    return async (...args) => {
      if (this.shuttingDown) {
        return {
          content: [{ type: 'text', text: 'server is shutting down — try again' }],
          isError: true,
        };
      }
      this.inFlight++;
      const startedAt = Date.now();
      let ok = true;
      let errorMsg = null;
      try {
        return await fn(...args);
      } catch (error) {
        ok = false;
        errorMsg = error?.message || String(error);
        throw error;
      } finally {
        const elapsed = Date.now() - startedAt;
        this.inFlight = Math.max(0, this.inFlight - 1);
        this.toolLatency.observe(toolName, elapsed);
        const c = this.toolCallCount.get(toolName) || { ok: 0, err: 0 };
        if (ok) c.ok++; else c.err++;
        this.toolCallCount.set(toolName, c);
        this.auditLog.record({
          tool: toolName,
          requestId: args[0]?.requestId || null,
          success: ok,
          durationMs: elapsed,
          args: args[0],
          error: errorMsg,
        });
      }
    };
  }

  /**
   * Build a fresh McpServer instance with every IRIS tool registered.
   * One server per SSE connection — the SDK pattern.
   */
  _buildServer() {
    const server = new McpServer(
      { name: this.agentId, version: '1.0.0' },
      { capabilities: { tools: {} } });

    // Wrap registerTool so every handler is tracked for graceful drain
    // and per-tool latency histograms.
    const _origRegister = server.registerTool.bind(server);
    server.registerTool = (name, schema, handler) =>
      _origRegister(name, schema, this._trackInFlight(handler, name));

    const TASK_TYPE_ENUM = z.enum([
      'balanced', 'code', 'creative', 'fast', 'complex',
      'reasoning', 'vision', 'ultra_fast', 'analysis',
      'multimodal', 'github', 'build', 'deploy',
    ]);

    server.registerTool('iris_chat', {
      description: 'Route a chat message through IRIS scoring and return the response.',
      inputSchema: {
        message: z.string().min(1).describe('User message to send'),
        taskType: TASK_TYPE_ENUM.optional().describe('Task type'),
        provider: z.string().optional().describe('Force a specific provider (must be registered — see iris_providers)'),
        sessionId: z.string().optional().describe('Persistent session id'),
        local: z.boolean().optional().describe('Prefer local providers'),
      },
    }, async (args) => {
      const result = await this.ai.chat(args.message, {
        taskType: args.taskType,
        provider: args.provider,
        sessionId: args.sessionId,
        local: args.local,
      });
      return {
        content: [{ type: 'text', text: result.response }],
        structuredContent: {
          provider: result.provider,
          model: result.model,
          taskType: result.taskType,
          sessionId: result.sessionId,
          usage: result.usage,
        },
      };
    });

    server.registerTool('iris_providers', {
      description: 'List provider statuses, priorities, and lifetime stats.',
      inputSchema: {},
    }, async () => {
      if (!this.ai.initialized) await this.ai.initializeProviders();
      const status = this.ai.getProviderStatus();
      const stats = this.ai.router.getProviderStats();
      return {
        content: [{ type: 'text', text: JSON.stringify({ status, stats }, null, 2) }],
        structuredContent: { status, stats },
      };
    });

    server.registerTool('iris_health', {
      description: 'Run a parallel health check across all registered providers.',
      inputSchema: {},
    }, async () => {
      if (!this.ai.initialized) await this.ai.initializeProviders();
      const health = await this.ai.router.healthCheckAll();
      return {
        content: [{ type: 'text', text: JSON.stringify(health, null, 2) }],
        structuredContent: health,
      };
    });

    server.registerTool('iris_session_list', {
      description: 'List the most recent persistent sessions.',
      inputSchema: { limit: z.number().int().min(1).max(200).optional() },
    }, async (args) => {
      if (!this.ai.store) return { content: [{ type: 'text', text: '[]' }] };
      const sessions = this.ai.store.listSessions(args?.limit || 20);
      return {
        content: [{ type: 'text', text: JSON.stringify(sessions, null, 2) }],
        structuredContent: { sessions },
      };
    });

    server.registerTool('iris_session_new', {
      description: 'Create a new persistent session. id is generated if omitted.',
      inputSchema: { id: z.string().optional() },
    }, async (args) => {
      if (!this.ai.store) {
        return { content: [{ type: 'text', text: 'store unavailable' }], isError: true };
      }
      const id = args?.id || randomUUID();
      this.ai.store.createSession(id);
      return { content: [{ type: 'text', text: id }], structuredContent: { id } };
    });

    server.registerTool('iris_session_show', {
      description: 'Return all messages in a session.',
      inputSchema: { id: z.string(), limit: z.number().int().min(1).max(500).optional() },
    }, async (args) => {
      if (!this.ai.store) return { content: [{ type: 'text', text: '[]' }] };
      const messages = this.ai.store.getMessages(args.id, args.limit || 50);
      return {
        content: [{ type: 'text', text: JSON.stringify(messages, null, 2) }],
        structuredContent: { id: args.id, messages },
      };
    });

    server.registerTool('iris_council', {
      description: 'Fan a prompt out to N providers in parallel. Returns side-by-side responses with per-call latency and cost. Optionally ranked by a judge provider.',
      inputSchema: {
        message: z.string().min(1).describe('Prompt to broadcast'),
        taskType: TASK_TYPE_ENUM.optional().describe('Task type'),
        providers: z.array(z.string()).optional().describe('Whitelist of provider names. Defaults to every registered provider.'),
        exclude: z.array(z.string()).optional().describe('Blacklist of provider names'),
        timeoutSeconds: z.number().int().min(1).max(600).optional().describe('Per-provider timeout in seconds (default 60)'),
        judge: z.string().optional().describe('Optional provider name to rank the panel after fan-out'),
        merge: z.boolean().optional().describe('Also return a single merged string with [provider] attribution'),
      },
    }, async (args) => {
      const council = await this.ai.council(args.message, {
        taskType: args.taskType,
        providers: args.providers,
        exclude: args.exclude,
        timeoutMs: args.timeoutSeconds ? args.timeoutSeconds * 1000 : undefined,
        judge: args.judge,
        merge: args.merge,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(council, null, 2) }],
        structuredContent: council,
      };
    });

    server.registerTool('iris_batch_submit', {
      description: 'Submit a batch of requests to OpenAI or Anthropic batch API (~50% off, 24h SLA). Returns {batchId, provider, status}. Poll via iris_batch_get.',
      inputSchema: {
        provider: z.enum(['anthropic', 'openai']).describe('Batch backend'),
        requests: z.array(z.object({
          customId: z.string().optional(),
          message: z.string().optional(),
          messages: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
          taskType: z.string().optional(),
          maxTokens: z.number().int().optional(),
          model: z.string().optional(),
        })).min(1).describe('Array of requests to batch'),
        model: z.string().optional().describe('Override model for all requests'),
      },
    }, async (args) => {
      const handle = await this.ai.submitBatch(args.requests, { provider: args.provider, model: args.model });
      return {
        content: [{ type: 'text', text: JSON.stringify(handle, null, 2) }],
        structuredContent: handle,
      };
    });

    server.registerTool('iris_batch_get', {
      description: 'Get batch status or results from OpenAI/Anthropic batch API. Returns {status, results?} — results present only when batch has completed.',
      inputSchema: {
        provider: z.enum(['anthropic', 'openai']).describe('Batch backend'),
        batchId: z.string().describe('Batch ID returned by iris_batch_submit'),
      },
    }, async (args) => {
      const handle = await this.ai.getBatch(args.batchId, { provider: args.provider });
      return {
        content: [{ type: 'text', text: JSON.stringify(handle, null, 2) }],
        structuredContent: handle,
      };
    });

    server.registerTool('iris_recent_requests', {
      description: 'Snapshot of recent routing decisions from the SQLite store. Each row: {provider, task_type, success, response_time_ms, cost, ts}.',
      inputSchema: {
        limit: z.number().int().min(1).max(500).optional().describe('Max rows (default 50)'),
        sinceIso: z.string().optional().describe('ISO timestamp lower bound'),
      },
    }, async (args) => {
      const rows = this.ai.store
        ? this.ai.store.getRecentRequests(args?.limit || 50, args?.sinceIso || null)
        : [];
      return {
        content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }],
        structuredContent: { rows },
      };
    });

    server.registerTool('iris_cost_summary', {
      description: 'Lifetime or windowed cost broken down by provider. Each row: {provider, requests, successes, cost, avg_ms}.',
      inputSchema: {
        sinceIso: z.string().optional().describe('ISO timestamp lower bound; omit for lifetime'),
      },
    }, async (args) => {
      const rows = this.ai.store
        ? this.ai.store.getCostSummary(args?.sinceIso || null)
        : [];
      const totalCost = rows.reduce((a, r) => a + (r.cost || 0), 0);
      return {
        content: [{ type: 'text', text: JSON.stringify({ rows, totalCost }, null, 2) }],
        structuredContent: { rows, totalCost },
      };
    });

    server.registerTool('iris_breaker_status', {
      description: 'Current circuit-breaker state per provider. Each row: {state: closed|half-open|open, failuresInWindow, msSinceOpen}.',
      inputSchema: {},
    }, async () => {
      const snapshot = this.ai.router.breaker.snapshot();
      return {
        content: [{ type: 'text', text: JSON.stringify(snapshot, null, 2) }],
        structuredContent: snapshot,
      };
    });

    server.registerTool('iris_session_delete', {
      description: 'Delete a session and its messages.',
      inputSchema: { id: z.string() },
    }, async (args) => {
      if (!this.ai.store) {
        return { content: [{ type: 'text', text: 'store unavailable' }], isError: true };
      }
      const ok = this.ai.store.deleteSession(args.id);
      return {
        content: [{ type: 'text', text: ok ? 'deleted' : 'not_found' }],
        structuredContent: { id: args.id, deleted: ok },
      };
    });

    return server;
  }

  /**
   * Validate bearer auth. Returns true if authorized OR if no token is
   * configured (open mode for local-only usage on 127.0.0.1).
   */
  _checkAuth(req) {
    if (!this.authToken) return true;
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return false;
    const token = header.slice(7).trim();
    // Constant-time compare to thwart timing oracles on the auth token.
    if (token.length !== this.authToken.length) return false;
    let diff = 0;
    for (let i = 0; i < token.length; i++) {
      diff |= token.charCodeAt(i) ^ this.authToken.charCodeAt(i);
    }
    return diff === 0;
  }

  _writeUnauthorized(res) {
    res.writeHead(401, { 'WWW-Authenticate': 'Bearer realm="iris"', 'Content-Type': 'text/plain' });
    res.end('Unauthorized\n');
  }

  /**
   * Boot the HTTP server. Returns a promise that resolves once it's
   * listening. Caller can also await `started` then call `stop()`.
   */
  async start() {
    // Serve mode is long-running — flip to JSON so output is grep/jq/Loki
    // friendly. CLI mode keeps its pretty default.
    forceJsonFormat();
    const log = getLogger({ component: 'mcp-server', agentId: this.agentId });
    this._log = log;

    // Create HTTPS server when TLS config is set, plain HTTP otherwise.
    // mTLS = TLS + requestCert + rejectUnauthorized + a trusted CA bundle.
    const requestHandler = async (req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);

      // CORS: apply headers to every response when corsOrigin is set,
      // and short-circuit OPTIONS preflight requests.
      if (this.corsOrigin) {
        res.setHeader('Access-Control-Allow-Origin', this.corsOrigin);
        // Match memory backend's tightened allow_headers (Authorization +
        // Content-Type only; no wildcard).
        res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Vary', 'Origin');
        if (req.method === 'OPTIONS') {
          res.writeHead(204).end();
          return;
        }
      }

      // Health check — unauthenticated, used by orchestrators.
      if (url.pathname === '/healthz' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('ok\n');
        return;
      }

      // Metrics — Prometheus format, optionally auth-gated.
      if (url.pathname === '/metrics' && req.method === 'GET') {
        if (!this.metricsEnabled) {
          res.writeHead(404).end();
          return;
        }
        if (!this._checkAuth(req)) return this._writeUnauthorized(res);
        const body = renderPrometheusMetrics(this.ai, {
          toolLatency: this.toolLatency.snapshot(),
          toolCallCount: this.toolCallCount,
        });
        res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
        res.end(body);
        return;
      }

      // Live event stream (Phase F) — raw SSE feed of {type, ...}
      // objects emitted by the router, council, and circuit breaker.
      // Distinct from /sse which is the MCP control channel.
      if (url.pathname === '/events' && req.method === 'GET') {
        if (!this._checkAuth(req)) return this._writeUnauthorized(res);
        this._handleEventsStream(req, res);
        return;
      }

      // MCP SSE channel.
      if (url.pathname === '/sse' && req.method === 'GET') {
        if (!this._checkAuth(req)) return this._writeUnauthorized(res);
        const transport = new SSEServerTransport('/messages', res);
        const server = this._buildServer();
        this.transports.set(transport.sessionId, transport);
        transport.onclose = () => { this.transports.delete(transport.sessionId); };
        try {
          await server.connect(transport);
          log.info({ sessionId: transport.sessionId }, 'mcp client connected');
        } catch (err) {
          log.error({ err: err.message }, 'mcp connect failed');
          this.transports.delete(transport.sessionId);
        }
        return;
      }

      // Client→server JSON-RPC messages over POST.
      if (url.pathname === '/messages' && req.method === 'POST') {
        if (!this._checkAuth(req)) return this._writeUnauthorized(res);
        const sessionId = url.searchParams.get('sessionId');
        const transport = sessionId ? this.transports.get(sessionId) : null;
        if (!transport) {
          res.writeHead(400).end('No active session for sessionId\n');
          return;
        }
        try {
          await transport.handlePostMessage(req, res);
        } catch (err) {
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`error: ${err.message}\n`);
          }
        }
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found\n');
    };

    if (this.tlsConfig?.certPath && this.tlsConfig?.keyPath) {
      const tlsOpts = {
        cert: fs.readFileSync(this.tlsConfig.certPath),
        key: fs.readFileSync(this.tlsConfig.keyPath),
      };
      if (this.tlsConfig.caPath) tlsOpts.ca = fs.readFileSync(this.tlsConfig.caPath);
      // mTLS: require + verify client cert against the CA bundle.
      if (this.tlsConfig.requestCert) tlsOpts.requestCert = true;
      if (this.tlsConfig.rejectUnauthorized !== false) tlsOpts.rejectUnauthorized = true;
      this.httpServer = https.createServer(tlsOpts, requestHandler);
      this._scheme = 'https';
      this._mtls = !!(this.tlsConfig.requestCert && this.tlsConfig.caPath);
    } else {
      this.httpServer = http.createServer(requestHandler);
      this._scheme = 'http';
      this._mtls = false;
    }

    await new Promise((resolve, reject) => {
      this.httpServer.once('error', reject);
      this.httpServer.listen(this.port, this.host, () => {
        this.httpServer.off('error', reject);
        resolve();
      });
    });

    log.info({
      url: `${this._scheme}://${this.host}:${this.port}`,
      port: this.port,
      tls: this._scheme === 'https',
      mtls: this._mtls,
      auth: !!this.authToken,
      metrics: this.metricsEnabled,
      endpoints: ['/sse', '/messages', '/events', '/metrics', '/healthz'],
    }, 'iris mcp server listening');

    // mDNS — optional service advertisement so dashboard clients
    // and other discoverers find IRIS on the LAN automatically.
    // Disabled by default; opt-in via config.server.mdnsEnabled.
    if (this.mdnsEnabled) {
      const providers = Array.from(this.ai.router?.providers?.keys() || []);
      this.mdns = new MdnsAdvertiser({
        port: this.port,
        agentId: this.agentId,
        version: this.ai.constructor.name === 'MultiAI' ? (await _getIrisVersion()) : '1.0.0',
        providers,
        requiresAuth: !!this.authToken,
      });
      this.mdns.start();
    }
  }

  /**
   * Open an SSE stream of live IRIS events (routing decisions, council
   * completions, breaker transitions). Heartbeat every 15s. The
   * connection closes naturally when the client disconnects.
   */
  _handleEventsStream(req, res) {
    // Cap concurrent /events connections so a hostile (or buggy)
    // client can't open thousands and OOM the server.
    if (this.eventStreamCount >= this.maxEventStreams) {
      res.writeHead(503, { 'Content-Type': 'text/plain', 'Retry-After': '5' });
      res.end(`Server busy: max ${this.maxEventStreams} concurrent /events connections\n`);
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering if proxied
    });
    res.write(`: connected to iris/${this.agentId}\n\n`);
    this.eventStreamCount++;

    const listener = (event) => {
      try {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch {
        // Client gone — cleanup happens via the close handler.
      }
    };
    this.ai.events.on('iris', listener);

    // Heartbeat to keep intermediaries from idle-timing the connection.
    const heartbeat = setInterval(() => {
      try { res.write(`: heartbeat ${new Date().toISOString()}\n\n`); }
      catch { /* ignore */ }
    }, 15_000);

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      clearInterval(heartbeat);
      this.ai.events.off('iris', listener);
      this.eventStreamCount = Math.max(0, this.eventStreamCount - 1);
    };
    req.on('close', cleanup);
    req.on('error', cleanup);
    res.on('close', cleanup);
    res.on('error', cleanup);
  }

  /**
   * Graceful shutdown:
   * 1. Mark shuttingDown so new tool calls return immediately.
   * 2. Stop the HTTP server from accepting new connections.
   * 3. Wait up to drainMs for in-flight tool calls to finish.
   * 4. Close all MCP transports (kicks open SSE clients off cleanly).
   * 5. Close the HTTP listener.
   *
   * Returns { drained: boolean, inFlight: number, ms: number }.
   */
  async stop() {
    const log = this._log || getLogger({ component: 'mcp-server' });
    const startedAt = Date.now();
    this.shuttingDown = true;
    log.info({ inFlight: this.inFlight, drainMs: this.drainMs }, 'graceful shutdown starting');

    // Wait for in-flight tool calls to drain, bounded by drainMs.
    if (this.drainMs > 0 && this.inFlight > 0) {
      const deadline = startedAt + this.drainMs;
      while (this.inFlight > 0 && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 50));
      }
    }
    const drained = this.inFlight === 0;
    const leftover = this.inFlight;

    // Close MCP transports — connected clients see clean disconnect.
    for (const transport of this.transports.values()) {
      try { await transport.close(); } catch { /* ignore */ }
    }
    this.transports.clear();

    // Stop mDNS advertisement so peers see us go away.
    if (this.mdns) {
      try { await this.mdns.stop(); } catch { /* ignore */ }
      this.mdns = null;
    }

    if (this.httpServer) {
      await new Promise((resolve) => this.httpServer.close(() => resolve()));
      this.httpServer = null;
    }

    const ms = Date.now() - startedAt;
    log.info({ drained, leftover, ms }, 'graceful shutdown complete');
    return { drained, inFlight: leftover, ms };
  }
}

/** Lazy version read — avoids a circular import on the IRIS_VERSION export. */
async function _getIrisVersion() {
  const m = await import('../index.js');
  return m.IRIS_VERSION;
}

export default IrisMcpServer;
