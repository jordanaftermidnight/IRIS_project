/**
 * Minimal hand-rolled schema validator for IRIS config.
 *
 * Returns { ok: boolean, errors: string[], warnings: string[] }.
 * Surfaces typos and structural mistakes without crashing on a bad
 * config — the user gets actionable feedback and the defaults take over.
 */

const KNOWN_TOP_LEVEL = new Set([
  'providers', 'routing', 'context', 'memory', 'server',
  // Documentation-only blocks are tolerated.
  '_builtinProviderOverrides', '_customProviderExamples', '_doc',
]);

const KNOWN_ROUTING_KEYS = new Set([
  'preferLocal', 'maxCost', 'fallbackOrder', 'costOptimization',
  'circuitBreaker', 'availabilityTtlMs', 'availabilityFailureTtlMs',
  'intelTtlMs',
]);

const KNOWN_BREAKER_KEYS = new Set([
  'failureThreshold', 'windowMs', 'cooldownMs',
]);

const KNOWN_CONTEXT_KEYS = new Set(['maxLength']);

const KNOWN_MEMORY_KEYS = new Set(['enabled', 'host', 'port']);

const KNOWN_SERVER_KEYS = new Set([
  'enabled', 'port', 'host', 'authToken', 'authTokenEnv', 'agentId',
  'metricsEnabled', 'corsOrigin', 'maxEventStreams', 'drainSeconds',
  'auditLogPath', 'mdnsEnabled',
  'tls', // populated in Commit D (mTLS)
]);

const KNOWN_PROVIDER_KEYS = new Set([
  'type', 'baseURL', 'apiKey', 'apiKeyEnv', 'allowNoAuth', 'priority',
  'models', 'rates', 'capabilities', 'description', 'disabled', 'host',
  'timeout', 'maxRetries', 'rateLimit', 'maxTokens', 'costTier',
]);

export function validateConfig(config) {
  const errors = [];
  const warnings = [];

  if (!config || typeof config !== 'object') {
    return { ok: false, errors: ['config must be an object'], warnings };
  }

  for (const key of Object.keys(config)) {
    if (key.startsWith('_')) continue; // _comment / _doc / _examples — convention
    if (!KNOWN_TOP_LEVEL.has(key)) {
      warnings.push(`unknown top-level key "${key}" — ignored`);
    }
  }

  if (config.routing !== undefined) {
    if (typeof config.routing !== 'object') errors.push('routing must be an object');
    else {
      for (const key of Object.keys(config.routing)) {
        if (key.startsWith('_')) continue;
        if (!KNOWN_ROUTING_KEYS.has(key)) warnings.push(`unknown routing.${key}`);
      }
      if (config.routing.preferLocal !== undefined && typeof config.routing.preferLocal !== 'boolean') {
        errors.push('routing.preferLocal must be a boolean');
      }
      if (config.routing.maxCost !== undefined && typeof config.routing.maxCost !== 'number') {
        errors.push('routing.maxCost must be a number');
      }
      if (config.routing.fallbackOrder !== undefined && !Array.isArray(config.routing.fallbackOrder)) {
        errors.push('routing.fallbackOrder must be an array');
      }
      if (config.routing.circuitBreaker !== undefined) {
        const cb = config.routing.circuitBreaker;
        if (typeof cb !== 'object') errors.push('routing.circuitBreaker must be an object');
        else for (const key of Object.keys(cb)) {
          if (key.startsWith('_')) continue;
          if (!KNOWN_BREAKER_KEYS.has(key)) warnings.push(`unknown routing.circuitBreaker.${key}`);
        }
      }
    }
  }

  if (config.context !== undefined) {
    if (typeof config.context !== 'object') errors.push('context must be an object');
    else for (const key of Object.keys(config.context)) {
      if (key.startsWith('_')) continue;
      if (!KNOWN_CONTEXT_KEYS.has(key)) warnings.push(`unknown context.${key}`);
    }
  }

  if (config.memory !== undefined) {
    if (typeof config.memory !== 'object') errors.push('memory must be an object');
    else {
      for (const key of Object.keys(config.memory)) {
        if (key.startsWith('_')) continue;
        if (!KNOWN_MEMORY_KEYS.has(key)) warnings.push(`unknown memory.${key}`);
      }
      if (config.memory.port !== undefined && !Number.isInteger(config.memory.port)) {
        errors.push('memory.port must be an integer');
      }
    }
  }

  if (config.server !== undefined) {
    if (typeof config.server !== 'object') errors.push('server must be an object');
    else {
      for (const key of Object.keys(config.server)) {
        if (key.startsWith('_')) continue;
        if (!KNOWN_SERVER_KEYS.has(key)) warnings.push(`unknown server.${key}`);
      }
      if (config.server.port !== undefined && !Number.isInteger(config.server.port)) {
        errors.push('server.port must be an integer');
      }
      if (config.server.enabled !== undefined && typeof config.server.enabled !== 'boolean') {
        errors.push('server.enabled must be a boolean');
      }
    }
  }

  if (config.providers !== undefined) {
    if (typeof config.providers !== 'object') errors.push('providers must be an object');
    else {
      for (const [name, p] of Object.entries(config.providers)) {
        if (name.startsWith('_')) continue; // documentation blocks
        if (typeof p !== 'object') {
          errors.push(`providers.${name} must be an object`);
          continue;
        }
        for (const key of Object.keys(p)) {
          if (key.startsWith('_')) continue;
          if (!KNOWN_PROVIDER_KEYS.has(key)) {
            warnings.push(`unknown providers.${name}.${key}`);
          }
        }
        if (p.type !== undefined && p.type !== 'openai-compatible') {
          warnings.push(`providers.${name}.type "${p.type}" is unknown — only "openai-compatible" is recognized`);
        }
        if (p.priority !== undefined && (!Number.isFinite(p.priority) || p.priority < 1)) {
          errors.push(`providers.${name}.priority must be a positive number`);
        }
        if (p.models !== undefined && typeof p.models !== 'object') {
          errors.push(`providers.${name}.models must be an object`);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export default validateConfig;
