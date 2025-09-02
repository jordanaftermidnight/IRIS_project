#!/usr/bin/env node

/**
 * Together AI Provider
 * Free $25 credits for new accounts
 * Access to many open source models
 */

export class TogetherProvider {
  constructor(options = {}) {
    this.name = 'together';
    this.apiKey = options.apiKey || process.env.TOGETHER_API_KEY;
    this.baseURL = 'https://api.together.xyz/v1';
    
    this.models = {
      fast: 'meta-llama/Llama-2-7b-chat-hf',
      coding: 'codellama/CodeLlama-7b-Instruct-hf',
      reasoning: 'meta-llama/Llama-2-13b-chat-hf',
      creative: 'NousResearch/Nous-Hermes-2-Yi-34B',
      large: 'meta-llama/Llama-2-70b-chat-hf',
      math: 'WizardLM/WizardMath-70B-V1.0',
      instruct: 'teknium/OpenHermes-2.5-Mistral-7B'
    };
    
    this.priority = 2;
    this.costPerToken = {
      'meta-llama/Llama-2-7b-chat-hf': 0.0002,
      'meta-llama/Llama-2-70b-chat-hf': 0.0009
    };
  }

  async isAvailable() {
    if (!this.apiKey) return false;
    
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async chat(message, options = {}) {
    if (!this.apiKey) {
      throw new Error('Together AI API key required. Set TOGETHER_API_KEY environment variable.');
    }

    const model = this.selectModel(options.taskType || 'balanced');

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: message }],
          max_tokens: options.max_tokens || 512,
          temperature: options.temperature || 0.7,
          stream: false
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Together AI API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices[0].message.content,
        model: model,
        provider: this.name,
        usage: data.usage
      };
    } catch (error) {
      throw new Error(`Together AI chat error: ${error.message}`);
    }
  }

  selectModel(taskType) {
    return this.models[taskType] || this.models.fast;
  }

  async getAvailableModels() {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.map(model => model.id);
      }
    } catch (error) {
      // Fallback to known models
    }
    
    return Object.values(this.models);
  }
}