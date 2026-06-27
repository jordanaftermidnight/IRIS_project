#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';
import { AIRouter } from './core/ai-router.js';
import { IrisStore } from './core/store.js';
import { validateConfig } from './core/config-schema.js';
import { runCouncil } from './core/council.js';
import { submitBatch, getBatch } from './core/batch.js';
import { withDeadline } from './core/timeout.js';
import { classify as classifyTask } from './core/task-classifier.js';
import { getLogger } from './core/logger.js';

const log = getLogger({ component: 'multi-ai' });

// Single source of truth for the version string. Avoids the prior bug
// where saveConfig wrote 2.0.0 while getSystemStatus reported 2.8.0.
export const IRIS_VERSION = (() => {
  try {
    const pkgPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
  } catch {
    return '0.0.0-unknown';
  }
})();
import { OllamaProvider } from './providers/ollama-provider.js';
import { GeminiProvider } from './providers/gemini-provider.js';
import { ClaudeProvider } from './providers/claude-provider.js';
import { OpenAIProvider } from './providers/openai-provider.js';
import { GroqProvider } from './providers/groq-provider.js';
import { OpenAICompatibleProvider } from './providers/openai-compatible-provider.js';
import { BUILTIN_PROVIDERS } from './providers/builtin-registry.js';

const STATIC_PROVIDER_NAMES = new Set(['ollama', 'groq', 'openai', 'gemini', 'claude']);

/**
 * Iris - Integrated Runtime Intelligence Service
 * Main entry point for programmatic usage
 */
export class MultiAI {
  constructor(options = {}) {
    this.context = [];
    this.config = this.loadConfig(options.configPath);
    // Live event bus — subscribers receive {type, ...} objects for
    // routing decisions, council results, and breaker transitions.
    // The MCP server's /events SSE endpoint pipes these to live dashboard
    // dockviews and other live consumers.
    this.events = new EventEmitter();
    this.events.setMaxListeners(50);
    this.router = new AIRouter({
      circuitBreaker: this.config.routing?.circuitBreaker,
      availabilityTtlMs: this.config.routing?.availabilityTtlMs,
      availabilityFailureTtlMs: this.config.routing?.availabilityFailureTtlMs,
      intelTtlMs: this.config.routing?.intelTtlMs,
      events: this.events,
    });
    this.initialized = false;
    this.providerStatus = {
      ollama: { available: false, status: 'unknown', priority: 1 },
      groq: { available: false, status: 'unknown', priority: 2 },
      openai: { available: false, status: 'unknown', priority: 3 },
      gemini: { available: false, status: 'unknown', priority: 4 },
      claude: { available: false, status: 'unknown', priority: 5 }
    };

    // Persistent store: provider stats survive across CLI invocations,
    // sessions enable conversation continuity, knowledge replaces the
    // prior in-memory Map. Disable with options.store === false.
    if (options.store !== false) {
      try {
        this.store = new IrisStore(options.dbPath);
        this.router.setStore(this.store);
      } catch (error) {
        log.warn({ err: error.message }, 'persistent store unavailable');
        this.store = null;
      }
    } else {
      this.store = null;
    }
  }

  /**
   * Initialize AI providers with Mistral-first logic
   */
  async initializeProviders(options = {}) {
    if (this.initialized) return this.getProviderStatus();
    
    console.log('Initializing AI providers...');
    
    try {
      // Always initialize Ollama/Mistral first (primary provider)
      await this.initializeOllama(options);

      // Initialize optional providers silently
      await this.initializeOptionalProviders(options);

      // Auto-register built-in OpenAI-compatible providers (Kimi,
      // MiniMax, DeepSeek, Grok, Mistral, Cerebras, Together,
      // OpenRouter, Perplexity) — user only needs the env var.
      await this.initializeBuiltinProviders(options);

      // Initialize any user-defined OpenAI-compatible providers
      await this.initializeDynamicProviders(options);

      // Set fallback order prioritizing cost efficiency and performance.
      // Dynamic providers are appended after the known cost-ordered five.
      const dynamicNames = Array.from(this.router.providers.keys())
        .filter((n) => !STATIC_PROVIDER_NAMES.has(n));
      this.router.setFallbackOrder([
        'ollama', 'groq', 'openai', 'gemini', 'claude', ...dynamicNames,
      ]);

      // Connect to memory backend if enabled
      await this.initializeMemory();

      this.initialized = true;
      return this.getProviderStatus();

    } catch (error) {
      log.error({ err: this.sanitizeError(error.message) }, 'provider initialization failed');
      throw error;
    }
  }

  /**
   * Initialize Ollama/Mistral (primary provider)
   */
  async initializeOllama(options = {}) {
    try {
      const ollamaProvider = new OllamaProvider({
        host: options.ollamaHost || this.config.providers?.ollama?.host,
        models: this.config.providers?.ollama?.models,
      });
      ollamaProvider.priority = 1;
      this.router.registerProvider(ollamaProvider);

      // Test availability + seed router cache
      const isAvailable = await ollamaProvider.isAvailable();
      this.router.primeAvailability('ollama', isAvailable);
      this.providerStatus.ollama = {
        available: isAvailable,
        status: isAvailable ? 'healthy' : 'unavailable',
        priority: 1,
        type: 'local',
        cost: 'free'
      };

      if (isAvailable) {
        console.log('✅ Mistral (Ollama) ready - primary provider active');
      } else {
        console.warn('⚠️ Mistral (Ollama) unavailable - fallback providers will be used');
      }
    } catch (error) {
      this.providerStatus.ollama.status = 'error';
      log.warn({ err: this.sanitizeError(error.message) }, 'ollama initialization failed');
    }
  }

  /**
   * Initialize optional providers (Gemini, Claude, OpenAI, Groq) in
   * parallel. One slow provider shouldn't block the rest.
   */
  async initializeOptionalProviders(options = {}) {
    await Promise.allSettled([
      this.initializeProvider('groq', GroqProvider, 'GROQ_API_KEY', {
        priority: 2, type: 'cloud', cost: 'low',
        description: 'Ultra-fast inference',
      }),
      this.initializeProvider('openai', OpenAIProvider, 'OPENAI_API_KEY', {
        priority: 3, type: 'cloud', cost: 'medium',
        description: 'Advanced reasoning with o3 models',
      }),
      this.initializeProvider('gemini', GeminiProvider, 'GEMINI_API_KEY', {
        priority: 4, type: 'cloud', cost: 'medium',
        description: "Google's multimodal AI",
      }),
      this.initializeProvider('claude', ClaudeProvider, 'ANTHROPIC_API_KEY', {
        priority: 5, type: 'cloud', cost: 'high',
        description: "Anthropic's reasoning AI",
      }),
    ]);
  }

  /**
   * Auto-register built-in OpenAI-compatible providers from
   * `BUILTIN_PROVIDERS`. The user only needs to set the corresponding
   * env var (e.g., MOONSHOT_API_KEY for Kimi). User config under the
   * same provider name deep-merges over the registry defaults; set
   * `disabled: true` to skip a builtin entirely.
   */
  async initializeBuiltinProviders(options = {}) {
    const tasks = [];
    for (const [name, defaults] of Object.entries(BUILTIN_PROVIDERS)) {
      if (STATIC_PROVIDER_NAMES.has(name)) continue; // safety belt

      const userCfg = this.config.providers?.[name] || {};
      if (userCfg.disabled === true) continue;

      // Deep-merge: user config takes precedence on every leaf.
      const cfg = this._mergeBuiltinConfig(defaults, userCfg);
      const apiKey =
        (cfg.apiKeyEnv ? process.env[cfg.apiKeyEnv] : null) ||
        cfg.apiKey ||
        '';

      if (!apiKey && !cfg.allowNoAuth) {
        this.providerStatus[name] = {
          available: false,
          status: 'no_api_key',
          priority: cfg.priority || 5,
          type: 'cloud',
          cost: cfg.costTier || 'medium',
          message: `Set ${cfg.apiKeyEnv} to enable`,
          description: cfg.description,
        };
        continue;
      }

      tasks.push(this._registerOneBuiltin(name, cfg, apiKey));
    }
    await Promise.allSettled(tasks);
  }

  async _registerOneBuiltin(name, cfg, apiKey) {
    try {
      const provider = new OpenAICompatibleProvider({
        name,
        baseURL: cfg.baseURL,
        apiKey,
        allowNoAuth: !!cfg.allowNoAuth,
        priority: cfg.priority || 5,
        models: cfg.models,
        rates: cfg.rates,
        capabilities: cfg.capabilities,
        description: cfg.description,
      });
      this.router.registerProvider(provider);

      const isAvailable = await provider.isAvailable();
      this.router.primeAvailability(name, isAvailable);
      this.providerStatus[name] = {
        available: isAvailable,
        status: isAvailable ? 'healthy' : 'unavailable',
        priority: cfg.priority || 5,
        type: 'cloud',
        cost: cfg.costTier || 'medium',
        description: cfg.description,
      };

      if (isAvailable) {
        console.log(`✅ ${name.toUpperCase()} ready - ${cfg.description}`);
      }
    } catch (error) {
      this.providerStatus[name] = {
        available: false,
        status: 'error',
        priority: cfg.priority || 5,
        type: 'cloud',
        cost: cfg.costTier || 'medium',
        error: this.sanitizeError(error.message),
        description: cfg.description,
      };
    }
  }

  /**
   * Deep-merge a user provider override on top of the builtin default.
   * Plain objects merge field-by-field; arrays and primitives are
   * replaced wholesale (so users can wholesale-replace `models`).
   */
  _mergeBuiltinConfig(defaults, userCfg) {
    const out = { ...defaults };
    for (const [k, v] of Object.entries(userCfg)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && defaults[k] && typeof defaults[k] === 'object') {
        out[k] = { ...defaults[k], ...v };
      } else if (v !== undefined) {
        out[k] = v;
      }
    }
    return out;
  }

  /**
   * Initialize OpenAI-compatible providers declared in config.
   * Any `providers.<name>` entry with `type: "openai-compatible"` is
   * instantiated. Names that collide with the built-in five are
   * rejected so the special-cased static paths stay authoritative.
   */
  async initializeDynamicProviders(options = {}) {
    const cfg = this.config.providers || {};
    const dynamic = Object.entries(cfg).filter(
      ([name, c]) => c?.type === 'openai-compatible'
    );

    const tasks = [];
    for (const [name, c] of dynamic) {
      if (STATIC_PROVIDER_NAMES.has(name)) {
        console.warn(`⚠️ Skipping dynamic provider "${name}" — name collides with a built-in.`);
        continue;
      }
      if (this.router.providers.has(name)) {
        // Already registered by initializeBuiltinProviders (user config
        // override merged over the registry default). Don't re-register.
        continue;
      }

      const apiKey =
        (c.apiKeyEnv ? process.env[c.apiKeyEnv] : null) ||
        c.apiKey ||
        process.env[`${name.toUpperCase()}_API_KEY`] ||
        '';

      if (!apiKey && !c.allowNoAuth) {
        this.providerStatus[name] = {
          available: false,
          status: 'no_api_key',
          priority: c.priority || 5,
          type: 'cloud',
          cost: c.costTier || 'medium',
          message: `Set ${c.apiKeyEnv || `${name.toUpperCase()}_API_KEY`} to enable`,
          description: c.description || `${name} (OpenAI-compatible)`,
        };
        continue;
      }

      tasks.push(this._registerOneDynamic(name, c, apiKey));
    }
    await Promise.allSettled(tasks);
  }

  async _registerOneDynamic(name, c, apiKey) {
    try {
      const provider = new OpenAICompatibleProvider({
        name,
        baseURL: c.baseURL,
        apiKey,
        allowNoAuth: !!c.allowNoAuth,
        priority: c.priority || 5,
        models: c.models,
        rates: c.rates,
        capabilities: c.capabilities,
        description: c.description,
      });
      this.router.registerProvider(provider);

      const isAvailable = await provider.isAvailable();
      this.router.primeAvailability(name, isAvailable);
      this.providerStatus[name] = {
        available: isAvailable,
        status: isAvailable ? 'healthy' : 'unavailable',
        priority: c.priority || 5,
        type: c.allowNoAuth ? 'local' : 'cloud',
        cost: c.costTier || 'medium',
        description: provider.description,
      };

      if (isAvailable) {
        console.log(`✅ ${name.toUpperCase()} ready - ${provider.description}`);
      }
    } catch (error) {
      this.providerStatus[name] = {
        available: false,
        status: 'error',
        priority: c.priority || 5,
        type: 'cloud',
        cost: c.costTier || 'medium',
        error: this.sanitizeError(error.message),
        description: c.description || `${name} (OpenAI-compatible)`,
      };
      console.warn(`⚠️ ${name.toUpperCase()} init failed: ${this.sanitizeError(error.message)}`);
    }
  }

  /**
   * Generic provider initialization with robust error handling
   */
  async initializeProvider(name, ProviderClass, envKey, config) {
    const apiKey = process.env[envKey] || this.config.providers?.[name]?.apiKey;
    
    if (apiKey) {
      try {
        const provider = new ProviderClass({ apiKey });
        provider.priority = config.priority;
        this.router.registerProvider(provider);

        const isAvailable = await provider.isAvailable();
        this.router.primeAvailability(name, isAvailable);
        this.providerStatus[name] = {
          available: isAvailable,
          status: isAvailable ? 'healthy' : 'unavailable',
          priority: config.priority,
          type: config.type,
          cost: config.cost,
          description: config.description
        };
        
        if (isAvailable && name !== 'ollama') {
          console.log(`✅ ${name.toUpperCase()} ready - ${config.description}`);
        }
      } catch (error) {
        this.providerStatus[name] = {
          available: false,
          status: 'error',
          priority: config.priority,
          type: config.type,
          cost: config.cost,
          error: 'Initialization failed',
          description: config.description
        };
        console.warn(`⚠️ ${name.toUpperCase()} initialization failed: ${error.message}`);
      }
    } else {
      // No API key provided
      this.providerStatus[name] = {
        available: false,
        status: 'no_api_key',
        priority: config.priority,
        type: config.type,
        cost: config.cost,
        message: `Set ${envKey} to enable`,
        description: config.description
      };
    }
  }

  /**
   * Initialize the optional MCP memory backend if enabled in config.
   */
  async initializeMemory() {
    const memoryConfig = this.config.memory;
    if (!memoryConfig?.enabled) return;

    try {
      const { MemoryClient } = await import('./integrations/memory-client.js');
      const client = new MemoryClient({
        host: memoryConfig.host || 'localhost',
        port: memoryConfig.port || 8781,
        agentId: this.config.server?.agentId || 'iris',
      });

      if (await client.connect()) {
        this.router.setMemoryClient(client);
        this.memoryClient = client;
        log.info({ host: memoryConfig.host, port: memoryConfig.port }, 'memory connected');

        // Idempotent: only register signal handlers once per process
        // even if initializeMemory runs twice (e.g., test re-init).
        if (!this._signalHandlersRegistered) {
          this._signalHandlersRegistered = true;
          const cleanup = () => {
            this.memoryClient?.close().catch(() => {});
            try { this.store?.close(); } catch { /* ignore */ }
          };
          process.on('SIGTERM', cleanup);
          process.on('SIGINT', cleanup);
          process.on('beforeExit', cleanup);
        }
      }
    } catch (error) {
      log.warn({ err: error.message }, 'memory setup failed');
    }
  }

  /**
   * Get visual status of all providers
   */
  getProviderStatus() {
    return {
      ...this.providerStatus,
      summary: {
        total: Object.keys(this.providerStatus).length,
        available: Object.values(this.providerStatus).filter(p => p.available).length,
        primary: this.providerStatus.ollama.available ? 'mistral' : 'fallback'
      }
    };
  }

  /**
   * Display visual status of all providers
   */
  displayProviderStatus() {
    console.log('\nProvider Status:');

    for (const [name, status] of Object.entries(this.providerStatus)) {
      const icon = status.available
        ? '✅'
        : (status.status === 'error' ? '❌'
          : (status.status === 'no_api_key' ? '🔑' : '⚠️'));
      const tier = status.type === 'local' ? '(local)' : '(cloud)';

      let statusText = status.status;
      if (status.status === 'no_api_key') statusText = 'needs API key';

      console.log(`${icon} ${name.toUpperCase().padEnd(11)} ${tier.padEnd(8)} Priority: ${status.priority} - ${statusText}`);

      if (status.message) {
        console.log(` ${status.message}`);
      }
    }

    const summary = this.getProviderStatus().summary;
    console.log(`\nSummary: ${summary.available}/${summary.total} providers available`);
    console.log(`Primary: ${summary.primary === 'mistral' ? 'Mistral (cost-optimized)' : 'Fallback providers'}\n`);
  }

  /**
   * Sanitize error messages to remove sensitive information
   */
  sanitizeError(message) {
    return message.replace(/(?:api[_\s]*key|token|password)[=:\s]*[^\s&]+/gi, '[REDACTED]');
  }

  /**
   * Resolve a session id from explicit option, env var, or null.
   * Touches the session in the store so listings stay LRU-ordered.
   */
  _resolveSession(options = {}) {
    const id = options.sessionId || options.session || process.env.IRIS_SESSION || null;
    if (!id || !this.store) return null;
    if (!this.store.getSession(id)) this.store.createSession(id);
    return id;
  }

  /**
   * Build a messages array for the provider: prior session turns
   * (user/assistant only) followed by the new user message. Providers
   * accept either a string or a messages array via BaseProvider's
   * _normalizePayload — sessions take the array path.
   */
  _buildMessagesArray(message, sessionId) {
    if (!sessionId || !this.store) {
      return [{ role: 'user', content: message }];
    }
    const history = this.store.getMessages(sessionId, 10);
    const turns = history
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));
    return [...turns, { role: 'user', content: message }];
  }

  /**
   * Streaming chat. Returns an async iterable of text chunks plus a
   * `finalize()` method the caller invokes after consumption to record
   * stats, persist session turns, and return the final envelope.
   *
   * Provider streams come in 4 shapes; `_normalizeStream` papers over them.
   */
  async streamChat(message, options = {}) {
    if (!this.initialized) {
      await this.initializeProviders(options);
    }
    if (!message || typeof message !== 'string') {
      throw new Error('Message must be a non-empty string');
    }

    const sessionId = this._resolveSession(options);
    const messages = this._buildMessagesArray(message, sessionId);
    const payload = messages.length === 1 ? message : { messages };
    const taskType = options.taskType || 'balanced';

    const provider = options.provider
      ? this.router.providers.get(options.provider)
      : await this.router.selectProvider(taskType, {
          preferLocal: options.local ?? this.config.routing?.preferLocal ?? true,
        });

    if (!provider) {
      throw new Error(`Provider not available for streaming`);
    }

    const startTime = Date.now();
    const rawStream = await provider.streamChat(payload, { ...options, taskType });

    const self = this;
    let collected = '';
    // Tool-call accumulation across deltas. Both providers send partial
    // arguments JSON spread across chunks; assemble per-index.
    const toolCallAcc = new Map(); // index -> {id, name, argsParts:[], finalized?}
    let finishReason = null;

    async function* iterator() {
      for await (const event of _normalizeStream(provider.name, rawStream)) {
        if (event.type === 'text') {
          collected += event.text;
          yield event.text; // legacy: text-only string for back-compat
        } else if (event.type === 'toolCallDelta') {
          const slot = toolCallAcc.get(event.index) || { argsParts: [] };
          if (event.id) slot.id = event.id;
          if (event.name) slot.name = event.name;
          if (event.argumentsDelta) slot.argsParts.push(event.argumentsDelta);
          toolCallAcc.set(event.index, slot);
        } else if (event.type === 'finish') {
          finishReason = event.reason;
        }
      }
    }

    return {
      provider: provider.name,
      model: provider.selectModel(taskType),
      taskType,
      sessionId,
      [Symbol.asyncIterator]: iterator,
      /**
       * After the iterator drains, finalize() returns the full envelope:
       * { response, toolCalls?, finishReason, responseTime, sessionId }.
       * Tool-call args are assembled from accumulated deltas and parsed
       * to objects; on parse failure, raw string is preserved.
       */
      async finalize() {
        const responseTime = Date.now() - startTime;
        self.router.updateProviderStats(provider.name, true, responseTime, 0, taskType, message.slice(0, 100));
        self.updateContext(message, collected);
        if (sessionId && self.store) {
          self.store.appendMessage(sessionId, 'user', message);
          self.store.appendMessage(sessionId, 'assistant', collected, {
            provider: provider.name,
            model: provider.selectModel(taskType),
          });
        }
        const toolCalls = [];
        for (const [, slot] of toolCallAcc) {
          const raw = slot.argsParts.join('');
          let parsed;
          try { parsed = raw ? JSON.parse(raw) : undefined; } catch { /* keep raw */ }
          toolCalls.push({
            id: slot.id,
            type: 'function',
            function: { name: slot.name, arguments: parsed, argumentsRaw: raw },
          });
        }
        return {
          response: collected,
          provider: provider.name,
          taskType,
          sessionId,
          responseTime,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          finishReason,
        };
      },
    };
  }

  /**
   * Chat. Routes through AIRouter scoring (no second-guessing layer).
   * Persists turns to the resolved session so subsequent invocations
   * can replay context.
   */
  async chat(message, options = {}) {
    if (!this.initialized) {
      await this.initializeProviders(options);
    }

    if (!message || typeof message !== 'string') {
      throw new Error('Message must be a non-empty string');
    }
    if (message.length > 10000) {
      throw new Error('Message too long (maximum 10,000 characters)');
    }

    if (options.provider) {
      return await this.chatWithProvider(message, options.provider, options);
    }

    const sessionId = this._resolveSession(options);
    const messages = this._buildMessagesArray(message, sessionId);
    // Single user turn → pass the raw string for log readability.
    // Multi-turn session → pass the messages array.
    const payload = messages.length === 1 ? message : { messages };

    // Auto-classify the task when the caller didn't pin one. Opt-out
    // via options.autoClassify === false. Lightweight regex+keyword
    // scoring — no extra LLM call.
    let taskType = options.taskType;
    if (!taskType && options.autoClassify !== false) {
      const guess = classifyTask(message);
      taskType = guess.taskType;
      log.debug({ taskType, complexity: guess.complexity }, 'task auto-classified');
    }
    taskType = taskType || 'balanced';

    try {
      const result = await this.router.executeRequest(payload, {
        taskType,
        stream: options.stream || false,
        // --local CLI flag wins; otherwise fall through to config default.
        preferLocal: options.local ?? this.config.routing?.preferLocal ?? true,
        maxCost: options.maxCost || this.config.routing?.maxCost,
        timeout: options.timeout || 30000,
      });

      this.updateContext(message, result.response);

      if (sessionId && this.store) {
        this.store.appendMessage(sessionId, 'user', message);
        this.store.appendMessage(sessionId, 'assistant', result.response, {
          provider: result.provider,
          model: result.model,
        });
      }

      return {
        ...result,
        contextLength: this.context.length,
        sessionId,
        sanitized: true,
      };
    } catch (error) {
      log.error({ err: this.sanitizeError(error.message) }, 'chat failed');
      throw new Error(`Multi-AI chat failed: ${this.sanitizeError(error.message)}`);
    }
  }

  /**
   * Fan out a prompt to N providers in parallel. Returns side-by-side
   * results — no judge, no synthesis. See src/core/council.js.
   */
  async council(message, options = {}) {
    if (!this.initialized) {
      await this.initializeProviders(options);
    }
    return runCouncil({ router: this.router, message, options });
  }

  /**
   * Submit a batch to OpenAI's or Anthropic's batch API. Returns
   * { batchId, provider, status, ... }. Use getBatch(batchId) to poll
   * for results. See src/core/batch.js.
   */
  async submitBatch(requests, options = {}) {
    if (!this.initialized) await this.initializeProviders();
    const provider = options.provider || 'anthropic';
    return submitBatch({ router: this.router, provider, requests, model: options.model });
  }

  async getBatch(batchId, options = {}) {
    if (!this.initialized) await this.initializeProviders();
    const provider = options.provider || 'anthropic';
    return getBatch({ router: this.router, provider, batchId });
  }

  /**
   * Chat with a specific provider (forced selection)
   */
  async chatWithProvider(message, providerName, options = {}) {
    const provider = this.router.providers.get(providerName);
    
    if (!provider) {
      throw new Error(`Provider '${providerName}' not found. Available providers: ${Array.from(this.router.providers.keys()).join(', ')}`);
    }

    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      throw new Error(`Provider '${providerName}' is not available. Check configuration and API keys.`);
    }

    log.info({ provider: providerName }, 'forced provider');

    try {
      const startTime = Date.now();
      const timeoutMs = options.timeout || 30_000;
      const abortController = new AbortController();
      const result = await withDeadline(
        provider.chat(message, { ...options, signal: abortController.signal }),
        timeoutMs, `${providerName} chat`, abortController);
      const responseTime = Date.now() - startTime;

      // Update provider statistics
      this.router.updateProviderStats(providerName, true, responseTime, result.usage?.cost || 0);

      // Update conversation context
      this.updateContext(message, result.response);

      return {
        ...result,
        contextLength: this.context.length,
        forced: true,
        providerName,
        sanitized: true
      };

    } catch (error) {
      this.router.updateProviderStats(providerName, false, 0, 0);
      throw new Error(`Provider '${providerName}' failed: ${this.sanitizeError(error.message)}`);
    }
  }

  /**
   * Update conversation context with size management
   */
  updateContext(userMessage, assistantResponse) {
    this.context.push(`User: ${userMessage}`);
    this.context.push(`Assistant: ${assistantResponse}`);
    
    // Intelligent context trimming
    const maxContextLength = this.config.context?.maxLength || 20;
    if (this.context.length > maxContextLength) {
      const keepLength = Math.floor(maxContextLength * 0.8);
      this.context = this.context.slice(-keepLength);
    }
  }

  /**
   * Clear conversation context
   */
  clearContext() {
    this.context = [];
  }

  /**
   * Get sanitized conversation context
   */
  getContext() {
    return [...this.context];
  }

  /**
   * Knowledge base — persistent across CLI invocations when store is on.
   * Falls back to a no-op shim if the store is unavailable.
   */
  addKnowledge(key, value, metadata = {}) {
    if (!key || typeof key !== 'string') {
      throw new Error('Knowledge key must be a non-empty string');
    }
    if (!this.store) return;
    this.store.setKnowledge(key, {
      value,
      timestamp: new Date().toISOString(),
      metadata: {
        type: typeof value,
        size: JSON.stringify(value).length,
        ...metadata,
      },
    });
  }

  getKnowledge(key) {
    if (!this.store) return null;
    return this.store.getKnowledge(key);
  }

  /**
   * Process files with enhanced error handling
   */
  async processFile(filePath, options = {}) {
    // Validate file path. realpath resolves symlinks so a symlink whose
    // alias is inside cwd but whose target lives outside (e.g.
    // pointing at /etc/passwd) is correctly rejected.
    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const realPath = fs.realpathSync(resolvedPath);
    if (!realPath.startsWith(process.cwd()) && !options.allowExternal) {
      throw new Error('File path outside project directory not allowed');
    }

    try {
      const stats = fs.statSync(realPath);
      if (stats.size > 1024 * 1024) { // 1MB limit
        throw new Error('File too large (maximum 1MB)');
      }

      const fileContent = fs.readFileSync(realPath, 'utf8');
      const fileName = path.basename(realPath);
      const fileExt = path.extname(realPath).toLowerCase();

      let prompt = options.customPrompt || `Analyze this ${fileExt} file named "${fileName}":

${fileContent}

Please provide insights about:
- File purpose and structure
- Key components or sections
- Potential improvements
- Any issues or concerns`;

      const result = await this.chat(prompt, { 
        taskType: options.taskType || 'analysis' 
      });

      // Store analysis in knowledge base
      this.addKnowledge(`file_analysis_${fileName}`, {
        path: realPath,
        analysis: result.response,
        fileSize: stats.size,
        provider: result.provider,
        timestamp: result.timestamp
      });

      return result;

    } catch (error) {
      throw new Error(`File processing failed: ${this.sanitizeError(error.message)}`);
    }
  }

  /**
   * Get comprehensive system status
   */
  async getSystemStatus() {
    // Ensure providers are initialized
    if (!this.initialized) {
      await this.initializeProviders();
    }

    const healthChecks = await this.router.healthCheckAll();
    const providerStats = this.router.getProviderStats();
    const requestHistory = this.router.getRequestHistory(5);
    const providerStatus = this.getProviderStatus();
    
    return {
      timestamp: new Date().toISOString(),
      version: IRIS_VERSION,
      providers: {
        ...providerStatus,
        details: healthChecks
      },
      performance: {
        statistics: providerStats,
        recentRequests: requestHistory
      },
      resources: {
        knowledgeBase: {
          entries: this.store ? this.store.knowledgeSize() : 0,
          memoryUsage: process.memoryUsage()
        },
        context: {
          length: this.context.length,
          maxLength: this.config.context?.maxLength || 20
        }
      },
      decision: {
        primaryProvider: providerStatus.summary.primary,
        costOptimized: this.config.routing?.costOptimization || true
      }
    };
  }

  /**
   * Load configuration with defaults
   */
  loadConfig(configPath = './config/iris-config.json') {
    const defaultConfig = {
      providers: {
        ollama: {
          host: 'http://localhost:11434',
          timeout: 30000,
          maxRetries: 3
        },
        gemini: {
          rateLimit: {
            requestsPerMinute: 60
          }
        },
        claude: {
          maxTokens: 4096,
          rateLimit: {
            requestsPerMinute: 50
          }
        }
      },
      routing: {
        preferLocal: true,
        maxCost: 0.05, // Lower cost limit to prioritize free Ollama
        fallbackOrder: ['ollama', 'gemini', 'claude'],
        costOptimization: true
      },
      context: {
        maxLength: 20
      }
    };

    try {
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        // Interpolate ${VAR} and ${VAR:-default} before JSON.parse so
        // secrets live in env vars and never get committed. Matches
        // memory backend/ convention.
        const interpolated = _interpolateEnv(configData, process.env);
        const userConfig = JSON.parse(interpolated);
        const { ok, errors, warnings } = validateConfig(userConfig);
        for (const w of warnings) console.warn(`⚠️ config(${configPath}): ${w}`);
        if (!ok) {
          for (const e of errors) console.error(`❌ config(${configPath}): ${e}`);
          console.warn('⚠️ Falling back to defaults — fix the errors above to use your config.');
          return defaultConfig;
        }
        return this.mergeConfig(defaultConfig, userConfig);
      }
    } catch (error) {
      log.warn({ err: error.message }, 'config loading failed, using defaults');
    }

    return defaultConfig;
  }

  /**
   * Deep merge configuration objects
   */
  mergeConfig(defaultConfig, userConfig) {
    const result = { ...defaultConfig };
    
    for (const key in userConfig) {
      if (typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
        result[key] = this.mergeConfig(result[key] || {}, userConfig[key]);
      } else {
        result[key] = userConfig[key];
      }
    }
    
    return result;
  }

  /**
   * Save configuration with error handling
   */
  saveConfig(configPath = './config/iris-config.json') {
    try {
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      // Strip apiKey from every provider entry, not just gemini.
      // Anything ending in *_API_KEY env var should never land in JSON.
      const redactedProviders = {};
      for (const [name, p] of Object.entries(this.config.providers || {})) {
        if (typeof p !== 'object') { redactedProviders[name] = p; continue; }
        const { apiKey, ...rest } = p;
        redactedProviders[name] = rest;
      }

      const config = {
        ...this.config,
        providers: redactedProviders,
        lastSaved: new Date().toISOString(),
        version: IRIS_VERSION,
      };
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`Configuration saved to ${configPath}`);
    } catch (error) {
      console.error('❌ Failed to save config:', this.sanitizeError(error.message));
    }
  }
}

/**
 * Interpolate ${VAR} and ${VAR:-default} from env vars in a string.
 * Used at config-load time. Mirrors the memory backend/ convention so
 * config files can reference secrets without ever holding them.
 *
 * Escape with $${VAR} (the JSON-string `$$` collapses to literal `$`).
 *
 * Exported for tests.
 */
export function _interpolateEnv(text, env = process.env) {
  return text.replace(/\$\{([A-Z_][A-Z0-9_]*)(?::-([^}]*))?\}/g, (_, name, dflt) => {
    const val = env[name];
    if (val !== undefined && val !== '') return val;
    return dflt !== undefined ? dflt : '';
  });
}

/**
 * Normalize the four provider stream shapes to a uniform async iterable
 * of plain text chunks. The caller appends chunks to stdout without
 * caring whether the source is OpenAI SSE, Anthropic events, Gemini's
 * native iterable, or Ollama's chat-stream chunks.
 */
/**
 * Normalize provider stream shapes into typed events.
 * Yields:
 * { type: 'text', text } — token deltas
 * { type: 'toolCallDelta', index, ... } — tool-call progress (partial)
 * { type: 'finish', reason } — terminal event
 *
 * Anthropic content_block_start carries `tool_use` blocks; input_json_delta
 * builds the arguments JSON across chunks. OpenAI delta.tool_calls comes
 * with index + partial fields per chunk. Both are normalized.
 */
async function* _normalizeStream(providerName, stream) {
  if (!stream || typeof stream[Symbol.asyncIterator] !== 'function') {
    if (stream?.response) { yield { type: 'text', text: stream.response }; return; }
    if (typeof stream === 'string') { yield { type: 'text', text: stream }; return; }
    return;
  }

  // Anthropic tool_use blocks need accumulation: content_block_start gives
  // {id, name}; input_json_delta gives partial_json chunks.
  const anthropicToolBlocks = new Map(); // index -> {id, name, partialJson}

  for await (const event of stream) {
    // Anthropic text
    if (event?.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      yield { type: 'text', text: event.delta.text };
      continue;
    }
    if (event?.type === 'content_block_delta' && event.delta?.text) {
      yield { type: 'text', text: event.delta.text };
      continue;
    }
    // Anthropic tool_use start
    if (event?.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
      const block = event.content_block;
      anthropicToolBlocks.set(event.index, { id: block.id, name: block.name, partial: '' });
      yield { type: 'toolCallDelta', index: event.index, id: block.id, name: block.name };
      continue;
    }
    // Anthropic tool_use argument chunks
    if (event?.type === 'content_block_delta' && event.delta?.type === 'input_json_delta') {
      const blk = anthropicToolBlocks.get(event.index);
      if (blk) blk.partial += event.delta.partial_json || '';
      yield {
        type: 'toolCallDelta',
        index: event.index,
        argumentsDelta: event.delta.partial_json,
      };
      continue;
    }
    // Anthropic finish
    if (event?.type === 'message_delta' && event.delta?.stop_reason) {
      yield { type: 'finish', reason: event.delta.stop_reason };
      continue;
    }
    // OpenAI/Groq/Compat text
    const openaiDelta = event?.choices?.[0]?.delta?.content;
    if (openaiDelta) {
      yield { type: 'text', text: openaiDelta };
      continue;
    }
    // OpenAI/Groq/Compat tool_calls deltas
    const oaToolCalls = event?.choices?.[0]?.delta?.tool_calls;
    if (Array.isArray(oaToolCalls)) {
      for (const tc of oaToolCalls) {
        yield {
          type: 'toolCallDelta',
          index: tc.index,
          id: tc.id,
          name: tc.function?.name,
          argumentsDelta: tc.function?.arguments,
        };
      }
      continue;
    }
    // OpenAI/Compat finish
    const finish = event?.choices?.[0]?.finish_reason;
    if (finish) { yield { type: 'finish', reason: finish }; continue; }
    // Ollama
    if (event?.message?.content) {
      yield { type: 'text', text: event.message.content };
      continue;
    }
    if (event?.done && event?.done_reason) {
      yield { type: 'finish', reason: event.done_reason };
      continue;
    }
    // Gemini SDK chunks expose .text() as a method.
    if (typeof event?.text === 'function') {
      const t = event.text();
      if (t) yield { type: 'text', text: t };
      continue;
    }
  }
}

export default MultiAI;