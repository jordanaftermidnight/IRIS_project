#!/usr/bin/env node

/**
 * OpenAI Provider with o-series Models for Advanced Reasoning
 */

import { BaseProvider } from './base-provider.js';
import { _toolCallHelpers } from './openai-compatible-provider.js';

let OpenAI = null;
try {
  const module = await import('openai');
  OpenAI = module.default;
} catch {
  // Optional - constructor throws a clear error.
}

// Refreshed 2026-06-27 against developers.openai.com. Current flagship
// lineup: GPT-5.5 (top), GPT-5.4 (workhorse, with mini/nano/pro
// variants), o4-mini (reasoning at small-model cost), o3 (legacy
// reasoning). GPT-4o family kept as cheap fallback.
const MODELS = {
  fast: 'gpt-5.4-mini',
  balanced: 'gpt-5.4',
  creative: 'gpt-5.4',
  code: 'gpt-5.4',
  large: 'gpt-5.5',
  complex: 'gpt-5.5',
  reasoning: 'o4-mini',
  vision: 'gpt-5.4',
  affordable: 'gpt-5.4-nano',
  ultra_fast: 'gpt-5.4-nano',
};

// Per-token rates (USD/token); published per-MTok, divided by 1e6.
// Verified 2026-06-27 against developers.openai.com/api/docs/pricing
// (short-context rates; long-context tiers cost ~2x).
const RATES = {
  'gpt-5.5': { input: 0.000005, output: 0.00003 },
  'gpt-5.5-pro': { input: 0.00003, output: 0.00018 },
  'gpt-5.4': { input: 0.0000025, output: 0.000015 },
  'gpt-5.4-mini': { input: 0.00000075, output: 0.0000045 },
  'gpt-5.4-nano': { input: 0.0000002, output: 0.00000125 },
  'gpt-5.4-pro': { input: 0.00003, output: 0.00018 },
  'o4-mini': { input: 0.0000011, output: 0.0000044 },
  'o3': { input: 0.000002, output: 0.000008 },
  'o3-mini': { input: 0.0000011, output: 0.0000044 },
  'gpt-4o': { input: 0.0000025, output: 0.00001 },
  'gpt-4o-mini': { input: 0.00000015, output: 0.0000006 },
};

const PROMPTS = {
  code: 'You are an expert software engineer and computer scientist. Provide clean, efficient, well-documented code with best practices. Think step by step through complex problems.',
  creative: 'You are a creative genius and expert writer. Think imaginatively and provide original, engaging content.',
  fast: 'You are an efficient AI assistant. Provide concise, accurate responses quickly.',
  complex: 'You are an expert researcher and analyst. Break down complex problems systematically. Think step by step and show your reasoning process.',
  reasoning: 'You are an expert at logical reasoning and problem-solving. Think through problems step by step, showing your work and reasoning process.',
  analysis: 'You are a data analyst and researcher. Provide thorough analysis with insights and actionable recommendations.',
  balanced: 'You are a knowledgeable AI assistant. Provide comprehensive, well-reasoned responses.',
};

function isReasoningModel(name) {
  return name.startsWith('o1') || name.startsWith('o3') || name.startsWith('o4');
}

export class OpenAIProvider extends BaseProvider {
  constructor(options = {}) {
    if (!OpenAI) {
      throw new Error('OpenAI provider unavailable: openai package not installed. Run: npm install openai');
    }
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
    }

    super({
      name: 'openai',
      priority: 2,
      models: { ...MODELS, ...(options.models || {}) },
      rates: RATES,
      prompts: PROMPTS,
      costPerToken: 0.0000025,
      capabilities: {
        vision: true,
        functions: true,
        reasoning: true,
        analysis: true,
        cost: 'medium',
        speed: 'fast',
        contextLength: {
          'gpt-5.5': 400000,
          'gpt-5.4': 400000,
          'gpt-5.4-mini': 400000,
          'gpt-5.4-nano': 128000,
          'o4-mini': 200000,
          'o3': 200000,
          'gpt-4o-mini': 128000,
          'gpt-4o': 128000,
        },
      },
    });

    this.apiKey = apiKey;
    this.client = new OpenAI({ apiKey });
  }

  async _ping() {
    await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 5,
    });
  }

  _buildMessages(messages, taskType, modelName) {
    // o-series rejects system prompts and uses max_completion_tokens.
    if (isReasoningModel(modelName)) {
      return messages.filter((m) => m.role !== 'system');
    }
    const hasSystem = messages.some((m) => m.role === 'system');
    if (hasSystem) return messages;
    return [{ role: 'system', content: this.getSystemPrompt(taskType) }, ...messages];
  }

  async _doChat({ messages, modelName, taskType }, options) {
    const maxTokens = options.maxTokens || (isReasoningModel(modelName) ? 4000 : 2000);
    const payload = {
      model: modelName,
      messages: this._buildMessages(messages, taskType, modelName),
    };
    if (isReasoningModel(modelName)) {
      payload.max_completion_tokens = maxTokens;
    } else {
      payload.max_tokens = maxTokens;
      payload.temperature = options.temperature ?? 0.7;
    }
    if (Array.isArray(options.tools) && options.tools.length > 0) {
      payload.tools = options.tools;
      if (options.toolChoice) payload.tool_choice = options.toolChoice;
    }
    if (options.responseFormat) payload.response_format = options.responseFormat;

    const response = await this.client.chat.completions.create(payload);
    const choice = response.choices[0];
    const msg = choice.message;
    const usage = response.usage || {};
    return {
      response: msg.content || '',
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      toolCalls: _toolCallHelpers._normalizeOpenAiToolCalls(msg.tool_calls),
      finishReason: choice.finish_reason,
    };
  }

  async _doStream({ messages, modelName, taskType }, options) {
    if (isReasoningModel(modelName)) {
      // o-series doesn't support streaming; fall back to non-streaming.
      const result = await this._doChat({ messages, modelName, taskType }, options);
      return _syntheticStream(result.response);
    }
    return this.client.chat.completions.create({
      model: modelName,
      messages: this._buildMessages(messages, taskType, modelName),
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature ?? 0.7,
      stream: true,
    });
  }
}

async function* _syntheticStream(text) {
  yield { choices: [{ delta: { content: text } }] };
}

export default OpenAIProvider;
