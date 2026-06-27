#!/usr/bin/env node

/**
 * Google Gemini provider — multimodal AI from Google.
 */

import { BaseProvider } from './base-provider.js';

let GoogleGenerativeAI = null;
try {
  const module = await import('@google/generative-ai');
  GoogleGenerativeAI = module.GoogleGenerativeAI;
} catch {
  // Optional - constructor throws a clear error.
}

// Refreshed 2026-06-27 against ai.google.dev. Current lineup: Gemini 3.1
// Pro (GA Feb 2026, $2/$12), Gemini 3.5 Flash (May 2026, $1.50/$9,
// faster than 3.1 Pro and better at coding), Gemini 3.1 Flash-Lite
// (cheapest text). Gemini 3.1 Flash-Image for multimodal natively.
const MODELS = {
  fast: 'gemini-3.5-flash',
  balanced: 'gemini-3.5-flash',
  creative: 'gemini-3.1-pro',
  code: 'gemini-3.5-flash',
  large: 'gemini-3.1-pro',
  complex: 'gemini-3.1-pro',
  reasoning: 'gemini-3.1-pro',
  vision: 'gemini-3.1-flash-image',
  ultra_fast: 'gemini-3.1-flash-lite',
};

// Per-token rates (USD/token), verified 2026-06-27 against ai.google.dev.
// Short-context tier (≤200K tokens); long-context is ~2x.
const RATES = {
  'gemini-3.5-flash': { input: 0.0000015, output: 0.000009 },
  'gemini-3.1-pro': { input: 0.000002, output: 0.000012 },
  'gemini-3.1-flash-lite': { input: 0.0000001, output: 0.0000004 },
  'gemini-3.1-flash-image': { input: 0.0000015, output: 0.000009 },
  'gemini-3-flash': { input: 0.0000005, output: 0.000003 },
  // Legacy 2.5 family, still supported through Oct 2026.
  'gemini-2.5-pro': { input: 0.00000125, output: 0.000005 },
  'gemini-2.5-flash': { input: 0.0000003, output: 0.0000025 },
};

const PROMPTS = {
  code: 'You are an expert software engineer. Provide clean, well-documented code with best practices.',
  creative: 'You are a creative genius. Think innovatively and provide original, imaginative solutions.',
  fast: 'You are an efficient assistant. Provide concise, accurate responses quickly.',
  complex: 'You are a research expert. Analyze complex problems methodically with detailed reasoning.',
  analysis: 'You are a data analyst. Provide thorough analysis with insights and actionable recommendations.',
  balanced: 'You are a knowledgeable assistant. Provide comprehensive, well-reasoned responses.',
};

export class GeminiProvider extends BaseProvider {
  constructor(options = {}) {
    if (!GoogleGenerativeAI) {
      throw new Error('Gemini provider unavailable: @google/generative-ai package not installed. Run: npm install @google/generative-ai');
    }
    const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key is required. Set GEMINI_API_KEY environment variable.');
    }

    super({
      name: 'gemini',
      priority: 2,
      models: { ...MODELS, ...(options.models || {}) },
      rates: RATES,
      prompts: PROMPTS,
      // Lowest input rate across the lineup (flash-lite) — biases the
      // router's cost score toward Gemini where it makes sense.
      costPerToken: 0.0000001,
      capabilities: {
        vision: true,
        functions: true,
        fileUpload: true,
        cost: 'low',
        speed: 'fast',
      },
    });

    this.apiKey = apiKey;
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async _ping() {
    const model = this.client.getGenerativeModel({ model: this.models.fast });
    await model.generateContent('test');
  }

  // Gemini SDK takes systemInstruction separately and turns as {role, parts:[{text}]}.
  _splitMessages(messages) {
    const system = [];
    const turns = [];
    for (const m of messages) {
      if (m.role === 'system') system.push(m.content);
      else turns.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      });
    }
    return { systemInstruction: system.join('\n'), turns };
  }

  async _doChat({ messages, modelName, taskType }) {
    const { systemInstruction, turns } = this._splitMessages(messages);
    const model = this.client.getGenerativeModel({
      model: modelName,
      systemInstruction: systemInstruction || this.getSystemPrompt(taskType),
    });

    // Single user turn: use generateContent for simplicity.
    // Multi-turn: use the chat() session API.
    let response;
    if (turns.length === 1 && turns[0].role === 'user') {
      const result = await model.generateContent(turns[0].parts[0].text);
      response = await result.response;
    } else {
      const history = turns.slice(0, -1);
      const last = turns[turns.length - 1];
      const chatSession = model.startChat({ history });
      const result = await chatSession.sendMessage(last.parts[0].text);
      response = await result.response;
    }

    const text = response.text();
    const totalTokens = response.usageMetadata?.totalTokenCount || 0;
    return {
      response: text,
      inputTokens: response.usageMetadata?.promptTokenCount || 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount || (totalTokens - (response.usageMetadata?.promptTokenCount || 0)),
    };
  }

  async _doStream({ messages, modelName, taskType }) {
    const { systemInstruction, turns } = this._splitMessages(messages);
    const model = this.client.getGenerativeModel({
      model: modelName,
      systemInstruction: systemInstruction || this.getSystemPrompt(taskType),
    });
    const lastUserContent = [...turns].reverse().find((t) => t.role === 'user')?.parts[0]?.text || '';
    const result = await model.generateContentStream(lastUserContent);
    return result.stream;
  }
}

export default GeminiProvider;
