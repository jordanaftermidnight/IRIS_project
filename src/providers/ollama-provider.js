#!/usr/bin/env node

/**
 * Ollama provider — local AI models via the Ollama runtime.
 */

import { Ollama } from 'ollama';
import { BaseProvider } from './base-provider.js';

const DEFAULT_MODELS = {
  fast: 'llama3.2:latest',
  balanced: 'mistral:7b',
  creative: 'llama3.2:latest',
  code: 'mistral:7b',
  large: 'mistral:7b',
  complex: 'mistral:7b',
  reasoning: 'mistral:7b',
  vision: 'llama3.2:latest',
  coding_expert: 'mistral:7b',
  ultra_large: 'mistral:7b',
};

const PROMPTS = {
  code: 'You are an expert programmer. Provide clean, efficient code with explanations.',
  creative: 'You are a creative assistant. Think outside the box and provide imaginative solutions.',
  fast: 'You are a helpful assistant. Provide quick, accurate responses.',
  complex: 'You are an expert analyst. Break down complex problems step-by-step.',
  analysis: 'You are a thoughtful assistant. Analyze thoroughly and provide detailed insights.',
  balanced: 'You are an intelligent assistant. Think step-by-step and provide helpful responses.',
};

export class OllamaProvider extends BaseProvider {
  constructor(options = {}) {
    super({
      name: 'ollama',
      priority: 1,
      models: { ...DEFAULT_MODELS, ...(options.models || {}) },
      prompts: PROMPTS,
      costPerToken: 0,
      capabilities: {
        cost: 'free',
        speed: 'medium',
        privacy: 'local',
      },
    });

    this.host = options.host || 'http://localhost:11434';
    this.ollama = new Ollama({ host: this.host });
  }

  async _ping() {
    await this.ollama.list();
  }

  async getAvailableModels() {
    try {
      const response = await this.ollama.list();
      return response.models.map((m) => m.name);
    } catch {
      return Object.values(this.models);
    }
  }

  _buildMessages(messages, taskType) {
    const hasSystem = messages.some((m) => m.role === 'system');
    if (hasSystem) return messages;
    return [{ role: 'system', content: this.getSystemPrompt(taskType) }, ...messages];
  }

  async _doChat({ messages, modelName, taskType }) {
    const response = await this.ollama.chat({
      model: modelName,
      messages: this._buildMessages(messages, taskType),
      stream: false,
    });

    return {
      response: response.message?.content || '',
      // Ollama doesn't split input/output tokens; expose the total as output.
      inputTokens: response.prompt_eval_count || 0,
      outputTokens: response.eval_count || 0,
      cost: 0,
    };
  }

  async _doStream({ messages, modelName, taskType }) {
    return this.ollama.chat({
      model: modelName,
      messages: this._buildMessages(messages, taskType),
      stream: true,
    });
  }

  async validateModel(modelName) {
    const available = await this.getAvailableModels();
    return available.some((model) => model.includes(modelName.split(':')[0]));
  }
}

export default OllamaProvider;
