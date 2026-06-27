#!/usr/bin/env node

/**
 * Anthropic Claude provider for advanced reasoning and analysis.
 */

import { BaseProvider } from './base-provider.js';

let Anthropic = null;
try {
  const module = await import('@anthropic-ai/sdk');
  Anthropic = module.default;
} catch {
  // Optional - constructor throws a clear error.
}

// Refreshed 2026-06-27 against docs.anthropic.com. Opus 4.8 is the
// current flagship; 4.7 still supported. Fable 5 / Mythos 5 are above
// at $10/$50 per MTok — opt-in via config since they're 2x Opus pricing.
const MODELS = {
  fast: 'claude-haiku-4-5-20251001',
  balanced: 'claude-sonnet-4-6',
  creative: 'claude-sonnet-4-6',
  code: 'claude-sonnet-4-6',
  large: 'claude-opus-4-8',
  complex: 'claude-opus-4-8',
  vision: 'claude-sonnet-4-6',
  reasoning: 'claude-opus-4-8',
};

// Per-token rates (USD/token) — published per MTok, divided by 1e6.
// Verified 2026-06-27. Note Opus 4.7/4.8 corrected from the old
// $15/$75 pricing (that was Opus 4.1; current Opus is $5/$25).
const RATES = {
  'claude-haiku-4-5-20251001': { input: 0.000001, output: 0.000005 },
  'claude-haiku-4-5': { input: 0.000001, output: 0.000005 },
  'claude-sonnet-4-6': { input: 0.000003, output: 0.000015 },
  'claude-sonnet-4-5': { input: 0.000003, output: 0.000015 },
  'claude-opus-4-8': { input: 0.000005, output: 0.000025 },
  'claude-opus-4-7': { input: 0.000005, output: 0.000025 },
  'claude-opus-4-6': { input: 0.000005, output: 0.000025 },
  'claude-fable-5': { input: 0.00001, output: 0.00005 },
  'claude-mythos-5': { input: 0.00001, output: 0.00005 },
};

const PROMPTS = {
  code: 'You are Claude, an AI assistant created by Anthropic. You are an expert software engineer with deep knowledge of programming languages, software architecture, and best practices. Provide clean, well-documented, secure code with clear explanations.',
  creative: 'You are Claude, an AI assistant created by Anthropic. You excel at creative thinking, writing, and problem-solving. Approach tasks with imagination and originality while being helpful and harmless.',
  fast: 'You are Claude, an AI assistant created by Anthropic. Provide concise, accurate, and helpful responses efficiently.',
  complex: 'You are Claude, an AI assistant created by Anthropic. You excel at complex reasoning, analysis, and breaking down sophisticated problems. Think step-by-step and provide thorough, well-reasoned responses.',
  analysis: 'You are Claude, an AI assistant created by Anthropic. You are skilled at data analysis, research, and providing insights. Analyze information thoroughly and provide actionable recommendations.',
  balanced: 'You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest. Provide comprehensive, well-reasoned responses that are both informative and accessible.',
};

export class ClaudeProvider extends BaseProvider {
  constructor(options = {}) {
    if (!Anthropic) {
      throw new Error('Claude provider unavailable: @anthropic-ai/sdk package not installed. Run: npm install @anthropic-ai/sdk');
    }
    const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Claude API key is required. Set ANTHROPIC_API_KEY environment variable.');
    }

    super({
      name: 'claude',
      priority: 1,
      models: { ...MODELS, ...(options.models || {}) },
      rates: RATES,
      prompts: PROMPTS,
      costPerToken: 0.000003,
      capabilities: {
        vision: true,
        functions: false,
        reasoning: true,
        analysis: true,
        cost: 'medium',
        speed: 'medium',
        contextLength: {
          'claude-haiku-4-5-20251001': 200000,
          'claude-sonnet-4-6': 1000000,
          'claude-opus-4-7': 1000000,
          'claude-opus-4-8': 1000000,
        },
      },
    });

    this.apiKey = apiKey;
    this.client = new Anthropic({ apiKey });
  }

  async _ping() {
    await this.client.messages.create({
      model: this.models.fast,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'test' }],
    });
  }

  // Anthropic's messages API takes system as a top-level field and
  // models tool calls / tool results as content blocks inside
  // user/assistant turns. Convert OpenAI-shape messages on input so
  // callers can write one shape and have IRIS adapt.
  _splitMessages(messages) {
    const system = [];
    const turns = [];
    for (const m of messages) {
      if (m.role === 'system') {
        system.push(m.content);
        continue;
      }
      // Assistant message with tool_calls (OpenAI shape) → Anthropic
      // content blocks: [{type:'text',text}, {type:'tool_use',id,name,input}]
      if (m.role === 'assistant' && Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
        const blocks = [];
        if (m.content) blocks.push({ type: 'text', text: m.content });
        for (const tc of m.tool_calls) {
          const fn = tc.function || tc;
          const input = typeof fn.arguments === 'string'
            ? (_safeJson(fn.arguments) ?? {})
            : (fn.arguments ?? {});
          blocks.push({ type: 'tool_use', id: tc.id, name: fn.name, input });
        }
        turns.push({ role: 'assistant', content: blocks });
        continue;
      }
      // Tool result message (OpenAI: {role:'tool', tool_call_id, content})
      // → Anthropic: {role:'user', content:[{type:'tool_result', tool_use_id, content}]}
      if (m.role === 'tool') {
        turns.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: m.tool_call_id,
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
          }],
        });
        continue;
      }
      // Pass-through for plain user/assistant text turns.
      turns.push(m);
    }
    return { system: system.join('\n'), turns };
  }

  async _doChat({ messages, modelName, taskType }, options) {
    const { system, turns } = this._splitMessages(messages);
    const systemText = system || this.getSystemPrompt(taskType);

    // Anthropic prompt caching: when options.promptCaching is true
    // (or options.cacheSystem), wrap the system prompt as a single
    // cache-controlled block. The tools array (if present) gets
    // cache_control too. Saves ~90% on cached input tokens after the
    // first call within the 5min TTL.
    const cacheSystem = options.cacheSystem ?? options.promptCaching;
    const cacheTools = options.cacheTools ?? options.promptCaching;

    const req = {
      model: modelName,
      max_tokens: options.maxTokens || 4096,
      messages: turns,
    };
    if (cacheSystem && systemText) {
      req.system = [{
        type: 'text',
        text: systemText,
        cache_control: { type: 'ephemeral' },
      }];
    } else {
      req.system = systemText;
    }

    // Tool calling: convert OpenAI-shape tools → Anthropic shape.
    if (Array.isArray(options.tools) && options.tools.length > 0) {
      req.tools = _openAiToolsToAnthropic(options.tools);
      if (cacheTools && req.tools.length > 0) {
        // Cache on the last tool — Anthropic caches everything UP TO
        // and including the marked block.
        req.tools[req.tools.length - 1].cache_control = { type: 'ephemeral' };
      }
      if (options.toolChoice) {
        req.tool_choice = _openAiToolChoiceToAnthropic(options.toolChoice);
      }
    }

    const response = await this.client.messages.create(req);

    // Anthropic's response is an array of content blocks. Extract the
    // text and any tool_use blocks separately.
    const textBlocks = [];
    const toolCalls = [];
    for (const block of response.content || []) {
      if (block.type === 'text') textBlocks.push(block.text);
      else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          type: 'function',
          function: {
            name: block.name,
            arguments: block.input, // already parsed JSON
            argumentsRaw: JSON.stringify(block.input),
          },
        });
      }
    }

    const usage = response.usage || {};
    return {
      response: textBlocks.join('\n'),
      inputTokens: usage.input_tokens || 0,
      outputTokens: usage.output_tokens || 0,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason: response.stop_reason, // 'end_turn'|'tool_use'|'max_tokens'|...
      extra: {
        cacheCreationTokens: usage.cache_creation_input_tokens || 0,
        cacheReadTokens: usage.cache_read_input_tokens || 0,
      },
    };
  }

  async _doStream({ messages, modelName, taskType }, options) {
    const { system, turns } = this._splitMessages(messages);
    return this.client.messages.create({
      model: modelName,
      max_tokens: options.maxTokens || 4096,
      system: system || this.getSystemPrompt(taskType),
      messages: turns,
      stream: true,
    });
  }
}

/**
 * Convert OpenAI tool spec to Anthropic's tool shape.
 * OpenAI: [{type:'function', function:{name, description, parameters}}]
 * Anthropic: [{name, description, input_schema}]
 */
function _openAiToolsToAnthropic(tools) {
  return tools.map((t) => {
    const fn = t.function || t;
    return {
      name: fn.name,
      description: fn.description || '',
      input_schema: fn.parameters || { type: 'object', properties: {} },
    };
  });
}

/**
 * Convert OpenAI tool_choice → Anthropic tool_choice.
 * 'auto' → {type:'auto'}
 * 'none' → {type:'none'} (Anthropic supports this since claude-3.5+)
 * 'required' → {type:'any'}
 * {type:'function', function:{name}} → {type:'tool', name}
 */
function _openAiToolChoiceToAnthropic(choice) {
  if (choice === 'auto') return { type: 'auto' };
  if (choice === 'none') return { type: 'none' };
  if (choice === 'required') return { type: 'any' };
  if (choice && typeof choice === 'object' && choice.function?.name) {
    return { type: 'tool', name: choice.function.name };
  }
  return { type: 'auto' };
}

function _safeJson(s) {
  try { return JSON.parse(s); } catch { return undefined; }
}

// Exported for unit tests.
export const _toolConverters = { _openAiToolsToAnthropic, _openAiToolChoiceToAnthropic, _safeJson };

export default ClaudeProvider;
