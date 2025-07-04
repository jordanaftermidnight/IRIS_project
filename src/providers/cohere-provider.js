#!/usr/bin/env node

/**
 * Cohere Provider
 * 1000+ requests/month free
 * Excellent for text generation and analysis
 */

export class CohereProvider {
  constructor(options = {}) {
    this.name = 'cohere';
    this.apiKey = options.apiKey || process.env.COHERE_API_KEY;
    this.baseURL = 'https://api.cohere.ai/v1';
    
    this.models = {
      fast: 'command-light',
      balanced: 'command',
      creative: 'command',
      reasoning: 'command',
      large: 'command'
    };
    
    this.priority = 4;
    this.costPerToken = {
      'command-light': 0.0003,
      'command': 0.0015
    };
  }

  async isAvailable() {
    if (!this.apiKey) return false;
    
    try {
      const response = await fetch(`${this.baseURL}/check-api-key`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async chat(message, options = {}) {
    if (!this.apiKey) {
      throw new Error('Cohere API key required. Set COHERE_API_KEY environment variable.');
    }

    const model = this.selectModel(options.taskType || 'balanced');

    try {
      const response = await fetch(`${this.baseURL}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          prompt: message,
          max_tokens: options.max_tokens || 300,
          temperature: options.temperature || 0.7,
          k: 0,
          stop_sequences: [],
          return_likelihoods: 'NONE'
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cohere API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      
      return {
        content: data.generations[0].text.trim(),
        model: model,
        provider: this.name,
        usage: data.meta
      };
    } catch (error) {
      throw new Error(`Cohere chat error: ${error.message}`);
    }
  }

  selectModel(taskType) {
    return this.models[taskType] || this.models.balanced;
  }

  async getAvailableModels() {
    return Object.values(this.models);
  }
}