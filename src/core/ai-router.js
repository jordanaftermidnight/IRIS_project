#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { getLogger } from './logger.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { withDeadline } from './timeout.js';
const log = getLogger({ component: 'router' });

/** 8-char base36 request id — short enough to scan logs by eye. */
function _genRequestId() {
  // Use a UUID slice rather than raw randomUUID so log lines stay narrow.
  return randomUUID().replace(/-/g, '').slice(0, 8);
}

// Hard deadline for any single provider chat call. If the provider
// hangs longer than this, executeRequest moves on to the retry or
// errors out — the caller is never blocked past this bound.
export const DEFAULT_PROVIDER_TIMEOUT_MS = 30_000;

/**
 * Scoring weights for selectProvider. Higher score → preferred provider.
 * All constants live here so they're tunable in one place.
 */
export const SCORING_WEIGHTS = {
  // (10 - priority) * priorityWeight — provider.priority is 1-10, lower preferred.
  priorityWeight: 20,
  // success_rate ∈ [0, 1] * successWeight
  successWeight: 30,
  // speed_score ∈ [0, 100] * speedWeight / 100 (kept as historical (100 - avgMs/100) * 20 baseline)
  speedWeight: 20,
  // Free providers (cost=0) get costFreeBonus, otherwise max(0, costCloudCap - cost*1000).
  costFreeBonus: 50,
  costCloudCap: 30,
  // Flat +25 bonus to ollama so it stays the cost-optimized default.
  ollamaBonus: 25,
  // privacy=local + options.preferLocal
  preferLocalBonus: 25,
  // Penalty when cost exceeds options.maxCost.
  overBudgetPenalty: 50,
  // (taskType, providerName) -> bonus; missing pairs default to 0.
  taskAffinity: {
    fast: { ollama: 25, groq: 22 },
    code: { ollama: 20, groq: 15, openai: 18 },
    creative: { ollama: 15, groq: 12, gemini: 12, claude: 6 },
    analysis: { ollama: 10, openai: 15, gemini: 10, claude: 6 },
    vision: { ollama: 15, openai: 20, gemini: 15 },
    reasoning: { ollama: 8, openai: 25, claude: 8 },
    complex: { openai: 20, claude: 10 },
    balanced: { groq: 10 },
    multimodal: { gemini: 18 },
    github: { ollama: 20 },
    build: { ollama: 18 },
    deploy: { openai: 12 },
    ultra_fast: { groq: 30 },
  },
  // memory backend alert bonuses (see _alertBonus).
  alertDominantMultiplier: 20,
  alertSplitMultiplier: 10,
  alertDistributionMultiplier: 3,
};

/**
 * Smart AI Router - Intelligently routes requests to the best available provider
 */
export class AIRouter {
  constructor(opts = {}) {
    this.providers = new Map();
    this.fallbackOrder = [];
    this.requestHistory = [];
    this.providerStats = new Map();
    this.memoryClient = null;
    this.store = null;
    this.availabilityCache = new Map(); // name -> { available, expiresAt }
    this.availabilityTtlMs = opts.availabilityTtlMs ?? 60_000;
    this.availabilityFailureTtlMs = opts.availabilityFailureTtlMs ?? 10_000;
    this.intelAlerts = []; // cached memory backend intel alerts
    this.intelAlertsExpiresAt = 0;
    this.intelTtlMs = opts.intelTtlMs ?? 5 * 60_000;
    // Optional event emitter for live updates (Phase F). When set,
    // routing decisions and breaker transitions are emitted as
    // {type, ...} objects. Council fires its own events via this same
    // emitter (passed through runCouncil).
    this.events = opts.events || null;
    // Per-provider circuit breaker. Configurable via constructor for
    // tests; production reads from config.routing.circuitBreaker.
    // Pass through the emitter so breaker transitions surface live.
    this.breaker = new CircuitBreaker({
      ...(opts.circuitBreaker || {}),
      events: this.events,
    });
  }

  _emit(event) {
    if (!this.events) return;
    try { this.events.emit('iris', event); } catch { /* swallow */ }
  }

  /**
   * Attach an IrisStore. Hydrates in-memory stats from disk so the score
   * function's success-rate term reflects historical reality, not just
   * this process's lifetime.
   */
  setStore(store) {
    this.store = store;
    if (!store) return;
    const persisted = store.getAllProviderStats();
    for (const [name, row] of Object.entries(persisted)) {
      this.providerStats.set(name, {
        requests: row.requests,
        successes: row.successes,
        failures: row.failures,
        avgResponseTime: row.avg_response_time_ms,
        totalCost: row.total_cost,
      });
    }
  }

  /**
   * Cached availability check. Re-checks at most every TTL window.
   * Negative results expire fast (10s) so transient failures recover quickly.
   */
  async _isAvailable(name, provider) {
    const now = Date.now();
    const cached = this.availabilityCache.get(name);
    if (cached && cached.expiresAt > now) return cached.available;

    let available = false;
    try {
      available = await provider.isAvailable();
    } catch {
      available = false;
    }
    const ttl = available ? this.availabilityTtlMs : this.availabilityFailureTtlMs;
    this.availabilityCache.set(name, { available, expiresAt: now + ttl });
    return available;
  }

  /**
   * Seed the availability cache (e.g., from initialization).
   */
  primeAvailability(name, available) {
    this.availabilityCache.set(name, {
      available,
      expiresAt: Date.now() + (available ? this.availabilityTtlMs : this.availabilityFailureTtlMs),
    });
  }

  /**
   * Invalidate cached availability (e.g., after a hard failure).
   */
  invalidateAvailability(name) {
    this.availabilityCache.delete(name);
  }

  /**
   * Refresh cached intel alerts from memory backend if stale. Returns the
   * cached array. Network errors are swallowed — alerts are advisory.
   */
  async _ensureIntelAlerts() {
    if (!this.memoryClient?.connected) return this.intelAlerts;
    if (Date.now() < this.intelAlertsExpiresAt) return this.intelAlerts;

    try {
      // No `wing` → MemoryClient defaults to its configured agentId.
      const alerts = await this.memoryClient.getIntelAlerts({ limit: 30 });
      this.intelAlerts = Array.isArray(alerts) ? alerts : [];
    } catch {
      // keep stale cache rather than wiping
    }
    this.intelAlertsExpiresAt = Date.now() + this.intelTtlMs;
    return this.intelAlerts;
  }

  /**
   * Compute a per-provider score bonus from memory backend intel alerts.
   *
   * Bonus rules (only provider-preference alerts matching this task type):
   * - dominant (share > 0.7): +20 * share to preferred_provider
   * - split (share 0.3-0.7): +10 * share to preferred_provider
   * - rotating: no bonus (history says no clear preference)
   *
   * Distribution tail: small +3 * share for any provider in the
   * distribution map, so a "split" alert lifts both runners-up slightly.
   */
  _alertBonus(providerName, taskType, alerts) {
    const W = SCORING_WEIGHTS;
    let bonus = 0;
    for (const alert of alerts) {
      const meta = alert?.metadata;
      if (!meta || meta.task_type !== taskType) continue;

      if (meta.preferred_provider === providerName) {
        const share = Number(meta.share) || 0;
        if (meta.pattern === 'dominant') bonus += W.alertDominantMultiplier * share;
        else if (meta.pattern === 'split') bonus += W.alertSplitMultiplier * share;
      }

      const dist = meta.distribution;
      if (dist && typeof dist[providerName] === 'number' && meta.preferred_provider !== providerName) {
        bonus += W.alertDistributionMultiplier * dist[providerName];
      }
    }
    return bonus;
  }

  /**
   * Attach a MemoryClient for routing decision logging.
   * @param {import('../integrations/memory-client.js').MemoryClient} client
   */
  setMemoryClient(client) {
    this.memoryClient = client;
  }

  /**
   * Register an AI provider
   */
  registerProvider(provider) {
    this.providers.set(provider.name, provider);
    if (!this.providerStats.has(provider.name)) {
      this.providerStats.set(provider.name, {
        requests: 0,
        successes: 0,
        failures: 0,
        avgResponseTime: 0,
        totalCost: 0
      });
    }
  }

  /**
   * Set fallback order for providers
   */
  setFallbackOrder(order) {
    this.fallbackOrder = order;
  }

  /**
   * Smart provider selection based on task type, availability, and performance
   */
  async selectProvider(taskType = 'balanced', options = {}) {
    const availableProviders = [];
    const exclude = options.exclude instanceof Set ? options.exclude : new Set();

    // Check availability of all providers (cached, so cheap on repeat).
    // Also skip providers whose breaker is open — they're reachable but
    // erroring repeatedly, no point routing to them.
    for (const [name, provider] of this.providers) {
      if (exclude.has(name)) continue;
      if (!this.breaker.canRoute(name)) continue;
      const isAvailable = await this._isAvailable(name, provider);
      if (isAvailable) {
        availableProviders.push({
          name,
          provider,
          priority: provider.priority || 10,
          cost: typeof provider.costPerToken === 'number' ? provider.costPerToken : 0,
          stats: this.providerStats.get(name)
        });
      }
    }

    if (availableProviders.length === 0) {
      throw new Error('No AI providers are currently available');
    }

    const alerts = await this._ensureIntelAlerts();
    const W = SCORING_WEIGHTS;
    const affinity = W.taskAffinity[taskType] || {};

    const scoredProviders = availableProviders.map(({ name, provider, priority, cost, stats }) => {
      let score = 0;

      // Priority: 1 (preferred) → 9 weight units; 10 → 0.
      score += (10 - priority) * W.priorityWeight;

      // Success rate. Untested providers get a benefit-of-the-doubt 100%.
      const successRate = stats.requests > 0 ? stats.successes / stats.requests : 1;
      score += successRate * W.successWeight;

      // Speed: inverse of avg response time. Untested → mid-tier 50.
      const speedScore = stats.avgResponseTime > 0
        ? Math.max(0, 100 - stats.avgResponseTime / 100)
        : 50;
      score += speedScore * W.speedWeight;

      // Cost: free wins big; cloud rates penalize linearly.
      score += cost === 0
        ? W.costFreeBonus
        : Math.max(0, W.costCloudCap - cost * 1000);

      // Hardcoded ollama bias — keeps the cost-optimized default.
      if (name === 'ollama') score += W.ollamaBonus;

      // Task-specific affinity (data-driven, see SCORING_WEIGHTS.taskAffinity).
      score += affinity[name] || 0;

      if (options.preferLocal && provider.getCapabilities().privacy === 'local') {
        score += W.preferLocalBonus;
      }
      if (options.maxCost && cost > options.maxCost) {
        score -= W.overBudgetPenalty;
      }

      // memory backend-learned preferences (closes the learning loop).
      score += this._alertBonus(name, taskType, alerts);

      return { name, provider, score };
    });

    // Sort by score (highest first)
    scoredProviders.sort((a, b) => b.score - a.score);

    const winner = scoredProviders[0];

    // Fire-and-forget: log routing decision to memory backend
    if (this.memoryClient?.connected) {
      this.memoryClient.logRoutingDecision({
        provider: winner.name,
        taskType,
        score: winner.score,
        alternatives: scoredProviders.slice(1, 4),
      }).catch(() => {});
    }

    // Live event for dockview clients etc.
    this._emit({
      type: 'routing',
      provider: winner.name,
      taskType,
      score: Math.round(winner.score * 100) / 100,
      alternatives: scoredProviders.slice(1, 4).map((s) => ({
        provider: s.name,
        score: Math.round(s.score * 100) / 100,
      })),
      timestamp: new Date().toISOString(),
    });

    return winner.provider;
  }

  /**
   * Best-effort preview of a chat payload for log/history use.
   * Accepts a string OR { messages: [{role,content},...] }.
   */
  _previewOf(payload) {
    if (typeof payload === 'string') return payload.slice(0, 100);
    if (payload && Array.isArray(payload.messages)) {
      const lastUser = [...payload.messages].reverse().find((m) => m.role === 'user');
      return (lastUser?.content || '').slice(0, 100);
    }
    return '';
  }

  /**
   * Execute request with automatic fallback. `payload` is the string
   * message OR a `{messages:[...]}` object; providers handle either via
   * BaseProvider._normalizePayload.
   */
  async executeRequest(payload, options = {}) {
    const taskType = options.taskType || 'balanced';
    const maxRetries = options.maxRetries || 2;
    const timeoutMs = options.timeout || DEFAULT_PROVIDER_TIMEOUT_MS;
    // Correlation ID for end-to-end tracing. Caller can pass one in
    // (e.g., an MCP client threading its own request id); otherwise we
    // generate. Shows up in every log line + memory backend log call.
    const requestId = options.requestId || _genRequestId();
    const triedProviders = new Set();
    const preview = this._previewOf(payload);
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      let provider;
      try {
        provider = await this.selectProvider(taskType, { ...options, exclude: triedProviders });
        triedProviders.add(provider.name);
        const startTime = Date.now();

        log.info({ requestId, provider: provider.name, taskType, attempt: attempt + 1, timeoutMs }, 'routing chat');

        // Per-call hard deadline. The abortController is passed via
        // options so SDK-aware providers can cancel underlying HTTP.
        // Even providers that ignore it can't block IRIS past timeoutMs.
        const abortController = new AbortController();
        const callOpts = { ...options, signal: abortController.signal };

        let result;
        if (options.stream) {
          result = await withDeadline(
            provider.streamChat(payload, callOpts),
            timeoutMs, `${provider.name} streamChat`, abortController);
        } else {
          result = await withDeadline(
            provider.chat(payload, callOpts),
            timeoutMs, `${provider.name} chat`, abortController);
        }

        const responseTime = Date.now() - startTime;

        this.updateProviderStats(
          provider.name, true, responseTime, result.usage?.cost || 0,
          taskType, preview);

        this.requestHistory.push({
          requestId,
          message: preview + (preview.length === 100 ? '...' : ''),
          provider: provider.name,
          taskType,
          success: true,
          responseTime,
          timestamp: new Date().toISOString(),
        });

        // Fire-and-forget: log completed request to memory backend
        if (this.memoryClient?.connected) {
          this.memoryClient.logRequest({
            requestId,
            provider: provider.name,
            taskType,
            success: true,
            responseTime,
            cost: result.usage?.cost || 0,
          }).catch(() => {});
        }

        return { ...result, requestId };

      } catch (error) {
        lastError = error;
        log.warn({ requestId, provider: provider?.name, attempt: attempt + 1, err: error.message }, 'provider failed');

        // Penalize the provider that actually failed (not whichever is best now).
        if (provider) {
          this.updateProviderStats(
            provider.name, false, 0, 0,
            taskType, preview);

          if (this.memoryClient?.connected) {
            this.memoryClient.logRequest({
              requestId,
              provider: provider.name,
              taskType,
              success: false,
              responseTime: 0,
              cost: 0,
            }).catch(() => {});
          }
        }

        if (error.message.includes('quota') || error.message.includes('rate limit')) {
          log.info({ provider: provider?.name }, 'rate limit hit, trying next provider');
          continue;
        }
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Update provider performance statistics (in-memory + persisted).
   */
  updateProviderStats(providerName, success, responseTime, cost, taskType = 'unknown', messagePreview = null) {
    const stats = this.providerStats.get(providerName);
    if (!stats) return;

    stats.requests++;
    if (success) {
      stats.successes++;
      stats.avgResponseTime = (stats.avgResponseTime * (stats.successes - 1) + responseTime) / stats.successes;
      stats.totalCost += cost;
      this.breaker.recordSuccess(providerName);
    } else {
      stats.failures++;
      const tripped = this.breaker.recordFailure(providerName);
      if (tripped) {
        log.warn({ provider: providerName }, 'circuit breaker tripped — provider parked');
        this.invalidateAvailability(providerName);
      }
    }

    if (this.store) {
      try {
        this.store.recordRequest({
          provider: providerName,
          taskType,
          success,
          responseTimeMs: responseTime,
          cost,
          messagePreview,
        });
      } catch (error) {
        // Persistence failure shouldn't break the main path, but the
        // user needs a signal that stats aren't being recorded.
        log.warn({ err: error.message }, 'stats persistence failed');
      }
    }
  }

  /**
   * Get provider performance statistics
   */
  getProviderStats() {
    const stats = {};
    for (const [name, provider] of this.providers) {
      const providerStats = this.providerStats.get(name);
      stats[name] = {
        ...providerStats,
        capabilities: provider.getCapabilities(),
        successRate: providerStats.requests > 0 ? 
          (providerStats.successes / providerStats.requests * 100).toFixed(1) + '%' : 
          'N/A'
      };
    }
    return stats;
  }

  /**
   * Get request history
   */
  getRequestHistory(limit = 10) {
    return this.requestHistory.slice(-limit);
  }

  /**
   * Health check for all providers
   */
  async healthCheckAll() {
    const results = {};
    const entries = Array.from(this.providers.entries());

    // Run health checks in parallel — one slow provider shouldn't block
    // the rest. Each provider's healthCheck is itself bounded.
    const settled = await Promise.allSettled(
      entries.map(([name, provider]) =>
        provider.healthCheck().then((r) => [name, r])));

    for (let i = 0; i < settled.length; i++) {
      const [name] = entries[i];
      const s = settled[i];
      if (s.status === 'fulfilled') {
        const [, r] = s.value;
        results[name] = r;
        this.primeAvailability(name, r.status === 'healthy');
      } else {
        results[name] = {
          status: 'error',
          provider: name,
          error: s.reason?.message || String(s.reason),
          timestamp: new Date().toISOString(),
        };
        this.primeAvailability(name, false);
      }
    }

    // Push the snapshot to memory backend knowledge graph (fire-and-forget).
    if (this.memoryClient?.connected) {
      this.memoryClient.logHealthSnapshot(results).catch(() => {});
    }

    return results;
  }

  /**
   * Compare providers for a specific task
   */
  async compareProviders(message, taskType = 'balanced', providers = []) {
    const results = [];
    const targetProviders = providers.length > 0 ? providers : Array.from(this.providers.keys());
    
    for (const providerName of targetProviders) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;
      
      try {
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) continue;
        
        const startTime = Date.now();
        const result = await provider.chat(message, { taskType });
        const responseTime = Date.now() - startTime;
        
        results.push({
          provider: providerName,
          response: result.response,
          responseTime,
          cost: result.usage?.cost || 0,
          model: result.model,
          success: true
        });
        
      } catch (error) {
        results.push({
          provider: providerName,
          error: error.message,
          success: false
        });
      }
    }
    
    return results;
  }
}

export default AIRouter;