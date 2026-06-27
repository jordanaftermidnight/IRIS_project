#!/usr/bin/env node

/**
 * Groq Provider for ultra-fast inference (Llama via Groq LPUs).
 */

import { BaseProvider } from './base-provider.js';
import { _toolCallHelpers } from './openai-compatible-provider.js';

let Groq = null;
try {
  const module = await import('groq-sdk');
  Groq = module.default;
} catch {
  // Optional - constructor throws a clear error.
}

// Refreshed 2026-06-27 against console.groq.com/docs/models. Llama 4
// Scout (multimodal MoE) is Groq's new flagship at $0.11/$0.34. GPT
// OSS 20B is the speed champion (1000+ t/s). Llama 3.x retained as
// backward-compatible aliases since some configs pin them.
const MODELS = {
  fast: 'openai/gpt-oss-20b',
  balanced: 'meta-llama/llama-4-scout-17b-16e-instruct',
  creative: 'meta-llama/llama-4-scout-17b-16e-instruct',
  code: 'openai/gpt-oss-120b',
  large: 'openai/gpt-oss-120b',
  complex: 'openai/gpt-oss-120b',
  reasoning: 'openai/gpt-oss-120b',
  vision: 'meta-llama/llama-4-scout-17b-16e-instruct',
  ultra_fast: 'openai/gpt-oss-20b',
};

const RATES = {
  'openai/gpt-oss-20b': { input: 0.000000075, output: 0.0000003 },
  'openai/gpt-oss-120b': { input: 0.00000015, output: 0.0000006 },
  'meta-llama/llama-4-scout-17b-16e-instruct': { input: 0.00000011, output: 0.00000034 },
  'qwen/qwen3-32b': { input: 0.00000029, output: 0.00000059 },
  'qwen/qwen3.6-27b': { input: 0.0000006, output: 0.000003 },
  // Legacy Llama 3.x kept for backward compatibility.
  'llama-3.1-8b-instant': { input: 0.00000005, output: 0.00000008 },
  'llama-3.3-70b-versatile': { input: 0.00000059, output: 0.00000079 },
};

const PROMPTS = {
  code: 'You are an expert software engineer. Provide clean, efficient code with clear explanations. Focus on best practices and performance.',
  creative: 'You are a creative AI assistant. Generate engaging, original content with flair and imagination.',
  fast: 'You are a speed-optimized AI assistant. Provide quick, accurate, concise responses.',
  complex: 'You are an analytical AI assistant. Break down complex problems systematically and provide detailed reasoning.',
  reasoning: 'You are a logical reasoning expert. Think step-by-step and show your problem-solving process.',
  analysis: 'You are a data analyst. Provide insights, patterns, and actionable recommendations.',
  balanced: 'You are a versatile AI assistant. Provide helpful, accurate, and well-structured responses.',
};

export class GroqProvider extends BaseProvider {
  constructor(options = {}) {
    if (!Groq) {
      throw new Error('Groq provider unavailable: groq-sdk package not installed. Run: npm install groq-sdk');
    }
    const apiKey = options.apiKey || process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('Groq API key is required. Set GROQ_API_KEY environment variable.');
    }

    super({
      name: 'groq',
      priority: 1,
      models: { ...MODELS, ...(options.models || {}) },
      rates: RATES,
      prompts: PROMPTS,
      costPerToken: 0.000000075, // lowest input rate (gpt-oss-20b)
      capabilities: {
        reasoning: true,
        analysis: true,
        cost: 'low',
        speed: 'ultra_fast',
        speciality: 'speed',
        contextLength: {
          'openai/gpt-oss-20b': 131072,
          'openai/gpt-oss-120b': 131072,
          'meta-llama/llama-4-scout-17b-16e-instruct': 131072,
          'qwen/qwen3-32b': 131072,
          'qwen/qwen3.6-27b': 131072,
          'llama-3.1-8b-instant': 131072,
          'llama-3.3-70b-versatile': 131072,
        },
      },
    });

    this.apiKey = apiKey;
    this.client = new Groq({ apiKey });
  }

  async _ping() {
    // Use the fastest model for the availability probe.
    await this.client.chat.completions.create({
      model: this.selectModel('fast'),
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 5,
    });
  }

  _buildMessages(messages, taskType) {
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
      stop: options.stop || null,
    };
    if (Array.isArray(options.tools) && options.tools.length > 0) {
      req.tools = options.tools;
      if (options.toolChoice) req.tool_choice = options.toolChoice;
    }
    if (options.responseFormat) req.response_format = options.responseFormat;

    const response = await this.client.chat.completions.create(req);
    const choice = response.choices[0];
    const msg = choice.message;
    const usage = response.usage || {};
    return {
      response: msg.content || '',
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      toolCalls: _toolCallHelpers._normalizeOpenAiToolCalls(msg.tool_calls),
      finishReason: choice.finish_reason,
      extra: { speed: 'ultra_fast' },
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
}

export default GroqProvider;
