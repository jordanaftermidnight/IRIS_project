/**
 * memory backend MCP client — logs routing decisions and health snapshots.
 *
 * Connects to the memory backend MCP server over SSE and provides
 * fire-and-forget logging methods for the AI router.
 *
 * Requires: @modelcontextprotocol/sdk
 */

let Client, SSEClientTransport;
let MCP_AVAILABLE = false;

try {
  ({ Client } = await import("@modelcontextprotocol/sdk/client/index.js"));
  ({ SSEClientTransport } = await import("@modelcontextprotocol/sdk/client/sse.js"));
  MCP_AVAILABLE = true;
} catch {
  // MCP SDK not installed — client will be a no-op
}

export class MemoryClient {
  /**
   * @param {Object} options
   * @param {string} options.host - memory backend server host
   * @param {number} options.port - memory backend server port
   * @param {string} options.agentId - Agent identifier for entries
   */
  constructor({ host = "localhost", port = 8781, agentId = "iris" } = {}) {
    this.host = host;
    this.port = port;
    this.agentId = agentId;
    this._client = null;
    this._transport = null;
    this._connected = false;
  }

  get connected() {
    return this._connected;
  }

  /**
   * Connect to the memory backend MCP server.
   * @returns {Promise<boolean>} true if connected successfully
   */
  async connect() {
    if (!MCP_AVAILABLE) {
      console.warn("MCP SDK not installed — memory backend integration disabled");
      return false;
    }

    try {
      const url = new URL(`http://${this.host}:${this.port}/sse`);
      this._transport = new SSEClientTransport(url);
      this._client = new Client({ name: this.agentId, version: "1.0.0" }, {});
      await this._client.connect(this._transport);
      this._connected = true;
      return true;
    } catch (error) {
      console.warn(`memory backend connection failed: ${error.message}`);
      this._connected = false;
      return false;
    }
  }

  /**
   * Disconnect from memory backend.
   */
  async close() {
    if (this._client) {
      try {
        await this._client.close();
      } catch {
        // Ignore close errors
      }
    }
    this._connected = false;
    this._client = null;
    this._transport = null;
  }

  /**
   * Call a memory backend tool. Returns null on failure (never throws).
   * @param {string} toolName
   * @param {Object} args
   * @returns {Promise<Object|null>}
   */
  async _callTool(toolName, args) {
    if (!this._connected || !this._client) return null;

    try {
      const result = await this._client.callTool({ name: toolName, arguments: args });
      return result;
    } catch (error) {
      // Log but don't crash — memory backend errors should never affect IRIS
      console.debug?.(`memory backend tool call failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Log a routing decision to memory backend.
   * @param {Object} decision
   * @param {string} decision.provider - Selected provider name
   * @param {string} decision.taskType - Task type used for routing
   * @param {number} decision.score - Provider score
   * @param {Array} decision.alternatives - Other considered providers
   */
  async logRoutingDecision(decision) {
    const content = JSON.stringify({
      provider: decision.provider,
      task_type: decision.taskType,
      score: decision.score,
      alternatives: (decision.alternatives || []).map((a) => ({
        provider: a.name,
        score: a.score,
      })),
    });

    return this._callTool("memory_store", {
      wing: this.agentId,
      room: "routing",
      agent_id: this.agentId,
      entry_type: "routing_decision",
      content,
      importance: 0.4,
      tags: ["routing", decision.taskType, decision.provider],
    });
  }

  /**
   * Log a completed request (after execution).
   * @param {Object} record
   * @param {string} record.provider - Provider that handled the request
   * @param {string} record.taskType - Task type
   * @param {boolean} record.success - Whether the request succeeded
   * @param {number} record.responseTime - Response time in ms
   * @param {number} [record.cost] - Request cost
   */
  async logRequest(record) {
    const content = JSON.stringify({
      request_id: record.requestId || null,
      provider: record.provider,
      task_type: record.taskType,
      success: record.success,
      response_time_ms: record.responseTime,
      cost: record.cost || 0,
    });

    const importance = record.success ? 0.3 : 0.7;

    return this._callTool("memory_store", {
      wing: this.agentId,
      room: "requests",
      agent_id: this.agentId,
      entry_type: "generic",
      content,
      importance,
      tags: [
        "request",
        record.provider,
        record.success ? "success" : "failure",
      ],
    });
  }

  /**
   * Fetch recent intelligence alerts for IRIS (or any wing). Returns raw
   * alert dicts as produced by memory_intel_alerts. Empty array on
   * failure/disconnect — never throws.
   *
   * Each IRIS alert's `metadata` carries:
   * { task_type, pattern: dominant|split|rotating,
   * preferred_provider, share, total_decisions, distribution }
   *
   * @param {Object} opts
   * @param {string} [opts.wing="iris"]
   * @param {number} [opts.limit=20]
   * @returns {Promise<Array<Object>>}
   */
  async getIntelAlerts({ wing, limit = 20 } = {}) {
    const targetWing = wing || this.agentId;
    const result = await this._callTool('memory_intel_alerts', { wing: targetWing, limit });
    if (!result) return [];
    const raw = _extractAlertArray(result);
    if (raw === null) {
      // None of the known shapes matched — surface this so a memory backend
      // schema change doesn't silently kill the learning loop.
      console.debug?.('memory backend alert payload shape unrecognized:',
        JSON.stringify(result).slice(0, 200));
      return [];
    }
    // Validate each alert against the documented shape. Drop malformed
    // entries with a debug log rather than trust memory backend blindly —
    // protects against schema drift on the server side.
    const valid = [];
    let dropped = 0;
    for (const alert of raw) {
      if (_isValidAlert(alert)) valid.push(alert);
      else dropped++;
    }
    if (dropped > 0) {
      console.debug?.(`memory backend: dropped ${dropped}/${raw.length} alerts with invalid shape`);
    }
    return valid;
  }

  /**
   * Log provider health snapshot as knowledge triples.
   * @param {Object} healthResults - Results from healthCheckAll()
   */
  async logHealthSnapshot(healthResults) {
    const promises = [];

    for (const [provider, health] of Object.entries(healthResults)) {
      const status = health.status || "unknown";
      promises.push(
        this._callTool("memory_kg_add", {
          subject: provider,
          predicate: "health_status",
          object: status,
          source_agent: this.agentId,
        })
      );
    }

    return Promise.allSettled(promises);
  }
}

/**
 * Extract an alert array from any of the known MCP response shapes.
 * Returns the array, or null if no known shape matched.
 */
function _extractAlertArray(result) {
  // structuredContent is the cleanest shape — prefer it when present.
  const structured = result.structuredContent;
  if (Array.isArray(structured)) return structured;
  if (Array.isArray(structured?.result)) return structured.result;

  // MCP text-block shape: content is [{type:'text', text:'<json>'}]
  // and the inner JSON is the actual array. Check this BEFORE the
  // bare-array check below, because content IS an array of text blocks
  // and would otherwise short-circuit incorrectly.
  if (Array.isArray(result.content) &&
      result.content.length > 0 &&
      result.content[0]?.type === 'text') {
    for (const block of result.content) {
      if (block?.type === 'text' && block.text) {
        try {
          const parsed = JSON.parse(block.text);
          if (Array.isArray(parsed)) return parsed;
          if (Array.isArray(parsed?.result)) return parsed.result;
        } catch { /* try next block */ }
      }
    }
  }

  // Fallback: raw array directly on .content or the result.
  if (Array.isArray(result.content)) return result.content;
  if (Array.isArray(result)) return result;
  return null;
}

const _VALID_PATTERNS = new Set(['dominant', 'split', 'rotating']);

/**
 * Validate a single alert against the documented shape:
 * { metadata: {
 * task_type: string,
 * pattern: 'dominant'|'split'|'rotating',
 * preferred_provider: string,
 * share: number,
 * distribution?: { [providerName]: number }
 * }
 * }
 * The router's _alertBonus is defensive about missing fields, but this
 * is the explicit contract — anything that doesn't match drops out so
 * memory backend schema drift can't accidentally poison scoring.
 */
function _isValidAlert(alert) {
  if (!alert || typeof alert !== 'object') return false;
  const meta = alert.metadata;
  if (!meta || typeof meta !== 'object') return false;
  if (typeof meta.task_type !== 'string' || !meta.task_type) return false;
  if (!_VALID_PATTERNS.has(meta.pattern)) return false;
  if (typeof meta.preferred_provider !== 'string' || !meta.preferred_provider) return false;
  const share = Number(meta.share);
  if (!Number.isFinite(share) || share < 0 || share > 1) return false;
  if (meta.distribution !== undefined) {
    if (!meta.distribution || typeof meta.distribution !== 'object') return false;
    for (const v of Object.values(meta.distribution)) {
      if (typeof v !== 'number' || !Number.isFinite(v)) return false;
    }
  }
  return true;
}

// Exported for tests.
export const _internals = { _extractAlertArray, _isValidAlert };

export default MemoryClient;
