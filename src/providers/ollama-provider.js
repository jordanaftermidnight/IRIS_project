#!/usr/bin/env node

// Optional dependency - graceful fallback if not installed
let Ollama;
try {
  const ollamaModule = await import('ollama');
  Ollama = ollamaModule.Ollama;
} catch (error) {
  console.warn('Local AI provider not available. Check installation.');
}

/**
 * Ollama provider for local AI models
 * 
 * @author Jordan After Midnight (concept and architecture)
 * @author Claude AI (implementation assistance)
 * @copyright 2025 Jordan After Midnight. All rights reserved.
 */
export class OllamaProvider {
  constructor(options = {}) {
    this.name = 'ollama';
    this.available = !!Ollama;
    this.ollama = Ollama ? new Ollama({ host: options.host || 'http://localhost:11434' }) : null;
    this.models = {
      fast: 'llama3.2:latest',
      balanced: 'mistral:7b',
      creative: 'llama3.2:latest',
      code: 'mistral:7b',
      large: 'mistral:7b',
      complex: 'mistral:7b',
      reasoning: 'mistral:7b',
      vision: 'llama3.2:latest',
      coding_expert: 'mistral:7b',
      ultra_large: 'mistral:7b'
    };
    this.priority = 1; // High priority for local models
    this.costPerToken = 0; // Free local models
  }

  async isAvailable() {
    try {
      await this.ollama.list();
      return true;
    } catch (error) {
      return false;
    }
  }

  async getAvailableModels() {
    if (!this.available || !this.ollama) {
      return [];
    }
    
    try {
      const response = await this.ollama.list();
      return response.models.map(m => m.name);
    } catch (error) {
      return [];
    }
    }

  selectModel(taskType) {
    return this.models[taskType] || this.models.balanced;
  }

  getSystemPrompt(taskType) {
    const prompts = {
      code: 'You are an expert programmer. Provide clean, efficient code with explanations.',
      creative: 'You are a creative assistant. Think outside the box and provide imaginative solutions.',
      fast: 'You are a helpful assistant. Provide quick, accurate responses.',
      complex: 'You are an expert analyst. Break down complex problems step-by-step.',
      analysis: 'You are a thoughtful assistant. Analyze thoroughly and provide detailed insights.',
      balanced: 'You are an intelligent assistant. Think step-by-step and provide helpful responses.'
    };
    
    return prompts[taskType] || prompts.balanced;
  }

  async chat(message, options = {}) {
    if (!this.available || !this.ollama) {
      throw new Error('Local AI provider not available. Check system configuration.');
    }

    const taskType = options.taskType || 'balanced';
    const model = this.selectModel(taskType);
    const systemPrompt = this.getSystemPrompt(taskType);

    try {
      const response = await this.ollama.chat({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        stream: options.stream || false
      });

      return {
        response: response.message?.content || '',
        model: model,
        provider: this.name,
        taskType: taskType,
        timestamp: new Date().toISOString(),
        usage: {
          tokens: response.eval_count || 0,
          cost: 0 // Free local models
        }
      };

    } catch (error) {
      throw new Error(`Ollama chat error: ${error.message}`);
    }
  }

  async streamChat(message, options = {}) {
    const taskType = options.taskType || 'balanced';
    const model = this.selectModel(taskType);
    const systemPrompt = this.getSystemPrompt(taskType);

    try {
      const response = await this.ollama.chat({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        stream: true
      });

      return response;
    } catch (error) {
      throw new Error(`Ollama stream error: ${error.message}`);
    }
  }

  async validateModel(modelName) {
    const available = await this.getAvailableModels();
    return available.some(model => model.includes(modelName.split(':')[0]));
  }

  async healthCheck() {
    try {
      const response = await this.ollama.list();
      return {
        status: 'healthy',
        provider: this.name,
        models: response.models.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        provider: this.name,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  getCapabilities() {
    return {
      chat: true,
      stream: true,
      vision: false,
      functions: false,
      fileUpload: false,
      cost: 'free',
      speed: 'medium',
      privacy: 'local'
    };
  }
}

export default OllamaProvider;