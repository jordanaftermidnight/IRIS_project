#!/usr/bin/env node

/**
 * OpenAICompatibleProvider — generic adapter for any service that speaks
 * the OpenAI Chat Completions protocol.
 *
 * {
 * "type": "openai-compatible",
 * "baseURL": "https://api.moonshot.cn/v1",
 * "apiKeyEnv": "MOONSHOT_API_KEY",
 * "allowNoAuth": false,
 * "priority": 5,
 * "models": { "balanced": "moonshot-v1-32k", ... },
 * "rates": { "moonshot-v1-32k": { "input": 0.000012, "output": 0.000012 } },
 * "capabilities": { "vision": false, "functions": true },
 * "description": "Moonshot Kimi"
 * }
 *
 * Works with: Kimi/Moonshot, DeepSeek, OpenRouter, Together, Fireworks,
 * xAI Grok, Cerebras, SiliconFlow, Mistral La Plateforme, LM Studio,
 * llama.cpp/vLLM HTTP servers — anything OpenAI-compatible.
 */

import { BaseProvider } from './base-provider.js';

let OpenAI = null;
try {
  const module = await import('openai');
  OpenAI = module.default;
} catch {
  // Optional — provider construction will throw a clear error.
}

export class OpenAICompatibleProvider extends BaseProvider {
  constructor({
    name,
    baseURL,
    apiKey,
    allowNoAuth = false,
    priority = 5,
    models,
    rates,
    capabilities,
    description,
  } = {}) {
    if (!name) throw new Error('OpenAICompatibleProvider: name is required');
    if (!baseURL) throw new Error('OpenAICompatibleProvider: baseURL is required');
    if (!OpenAI) {
      throw new Error('openai package not installed. Run: npm install openai');
    }
    if (!apiKey && !allowNoAuth) {
      throw new Error(`${name}: apiKey required (or set allowNoAuth: true for local servers)`);
    }

    const normalizedModels =
      models && Object.keys(models).length ? models : { balanced: 'default' };

    super({
      name,
      priority,
      models: normalizedModels,
      rates: rates || {},
      capabilities,
      description: description || `${name} (OpenAI-compatible)`,
    });

    this.baseURL = baseURL;
    this.client = new OpenAI({ apiKey: apiKey || 'sk-noop', baseURL });

    // Router uses costPerToken as a single-number heuristic. Use the
    // lowest input rate across known models so cost-favoring scoring
    // doesn't unfairly penalize this provider for its priciest model.
    const inputRates = Object.values(this.rates)
      .map((r) => (r && typeof r.input === 'number' ? r.input : null))
      .filter((n) => n !== null);
    this.costPerToken = inputRates.length ? Math.min(...inputRates) : 0;
  }

  async _ping() {
    // Tiny ping. 1-token max keeps cost negligible and latency fast.
    await this.client.chat.completions.create({
      model: this.selectModel('fast'),
      messages: [{ role: 'user', content: '.' }],
      max_tokens: 1,
    });
  }

  _buildMessages(messages, taskType) {
    // Inject system prompt if the caller didn't supply one.
    const hasSystem = messages.some((m) => m.role === 'system');
    if (hasSystem) return messages;
    return [{ role: 'system', content: this.getSystemPrompt(taskType) }, ...messages];
  }

  async _doChat({ messages, modelName, taskType }, options) {
    const req = {
      model: modelName,
      messages: this._buildMessages(messages, taskType),
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature ?? 0.7,
      top_p: options.topP ?? 1,
    };
    // Tool calling — pass through OpenAI's native shape. Caller is
    // responsible for re-feeding tool results in the next turn.
    if (Array.isArray(options.tools) && options.tools.length > 0) {
      req.tools = options.tools;
      if (options.toolChoice) req.tool_choice = options.toolChoice;
    }
    // Structured outputs (Commit C): response_format json_schema.
    if (options.responseFormat) req.response_format = options.responseFormat;

    const response = await this.client.chat.completions.create(req);

    const choice = response.choices?.[0];
    const msg = choice?.message;
    const text = msg?.content ?? '';
    const usage = response.usage || {};
    return {
      response: text,
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      toolCalls: _normalizeOpenAiToolCalls(msg?.tool_calls),
      finishReason: choice?.finish_reason,
    };
  }

  async _doStream({ messages, modelName, taskType }, options) {
    return this.client.chat.completions.create({
      model: modelName,
      messages: this._buildMessages(messages, taskType),
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature ?? 0.7,
      stream: true,
    });
  }

  getCapabilities() {
    return {
      chat: true,
      stream: true,
      vision: false,
      functions: false,
      cost: 'medium',
      speed: 'medium',
      privacy: 'cloud',
      ...this._capabilitiesOverride,
    };
  }
}

/**
 * Convert OpenAI's tool_calls shape into the normalized envelope.
 * OpenAI: [{id, type:'function', function:{name, arguments: stringified}}]
 * Envelope keeps the same shape but parses arguments JSON eagerly so
 * callers don't have to.
 */
function _normalizeOpenAiToolCalls(toolCalls) {
  if (!Array.isArray(toolCalls)) return undefined;
  return toolCalls.map((tc) => ({
    id: tc.id,
    type: tc.type || 'function',
    function: {
      name: tc.function?.name,
      // OpenAI gives stringified JSON; parse eagerly. If the model
      // returns invalid JSON, surface the raw string under .raw so
      // callers can still inspect.
      arguments: _safeParseJson(tc.function?.arguments) ?? undefined,
      argumentsRaw: tc.function?.arguments,
    },
  }));
}

function _safeParseJson(s) {
  if (typeof s !== 'string' || !s) return undefined;
  try { return JSON.parse(s); } catch { return undefined; }
}

// Exported for provider modules that share the same normalization (e.g., OpenAI/Groq).
export const _toolCallHelpers = { _normalizeOpenAiToolCalls, _safeParseJson };

export default OpenAICompatibleProvider;
