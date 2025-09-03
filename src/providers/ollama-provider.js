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
    this.availableModels = [];
    this.modelPreferences = {
      // Preferred models in order of preference
      fast: ['mistral:7b', 'llama3.2:latest', 'llama3:latest', 'llama3.1:8b'],
      balanced: ['mistral:7b', 'llama3.1:8b', 'llama3:latest', 'llama3.2:latest'],
      creative: ['llama3.2:latest', 'mistral:7b', 'llama3.1:8b', 'llama3:latest'],
      code: ['mistral:7b', 'llama3.1:8b', 'llama3:latest', 'llama3.2:latest'],
      large: ['llama3.1:8b', 'mistral:7b', 'llama3:latest', 'llama3.2:latest'],
      complex: ['mistral:7b', 'llama3.1:8b', 'llama3:latest', 'llama3.2:latest'],
      reasoning: ['mistral:7b', 'llama3.1:8b', 'llama3:latest', 'llama3.2:latest']
    };
    this.priority = 1; // High priority for local models
    this.costPerToken = 0; // Free local models
    
    // Initialize available models
    this.refreshAvailableModels();
  }

  async isAvailable() {
    try {
      await this.ollama.list();
      return true;
    } catch (error) {
      return false;
    }
  }

  async refreshAvailableModels() {
    if (!this.available || !this.ollama) {
      this.availableModels = [];
      return [];
    }
    
    try {
      const response = await this.ollama.list();
      this.availableModels = response.models.map(m => m.name);
      return this.availableModels;
    } catch (error) {
      this.availableModels = [];
      return [];
    }
  }

  async getAvailableModels() {
    return this.availableModels.length > 0 ? this.availableModels : await this.refreshAvailableModels();
  }

  selectModel(taskType = 'balanced') {
    const preferences = this.modelPreferences[taskType] || this.modelPreferences.balanced;
    
    // Find first available preferred model
    for (const preferredModel of preferences) {
      if (this.availableModels.includes(preferredModel)) {
        return preferredModel;
      }
    }
    
    // Fallback to any available model
    if (this.availableModels.length > 0) {
      return this.availableModels[0];
    }
    
    // Ultimate fallback
    return 'llama3:latest';
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

    // Refresh available models if empty
    if (this.availableModels.length === 0) {
      await this.refreshAvailableModels();
    }

    const taskType = options.taskType || 'balanced';
    const model = this.selectModel(taskType);
    const systemPrompt = this.getSystemPrompt(taskType);
    
    console.log(`🤖 Using Ollama model: ${model} for task: ${taskType}`);

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