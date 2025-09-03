#!/usr/bin/env node

// Optional import - gracefully handle missing dependency
let Anthropic = null;
let importError = null;

try {
  const module = await import('@anthropic-ai/sdk');
  Anthropic = module.default;
} catch (error) {
  importError = error;
  // Don't log here - will be handled in constructor
}

/**
 * Anthropic Claude provider for advanced reasoning and analysis
 * 
 * @author Jordan After Midnight
 * @author Claude AI (implementation assistance)
 * @copyright 2025 Jordan After Midnight. All rights reserved.
 */
export class ClaudeProvider {
  constructor(options = {}) {
    this.name = 'claude';
    this.apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
    
    if (!Anthropic) {
      throw new Error('Claude provider unavailable. Check system configuration.');
    }
    
    if (!this.apiKey) {
      throw new Error('Claude API key is required. Set ANTHROPIC_API_KEY environment variable.');
    }
    
    this.client = new Anthropic({
      apiKey: this.apiKey,
    });
    
    this.models = {
      fast: 'claude-3-haiku-20240307',
      balanced: 'claude-3-5-sonnet-20241022', 
      creative: 'claude-3-5-sonnet-20241022',
      code: 'claude-3-5-sonnet-20241022',
      large: 'claude-3-5-sonnet-20241022',
      complex: 'claude-3-5-sonnet-20241022',
      vision: 'claude-3-5-sonnet-20241022',
      reasoning: 'claude-3-5-sonnet-20241022'
    };
    
    this.priority = 1; // High priority for reasoning tasks
    this.costPerToken = {
      'claude-3-haiku-20240307': 0.00025,
      'claude-3-sonnet-20240229': 0.003,
      'claude-3-5-sonnet-20241022': 0.003,
      'claude-3-opus-20240229': 0.015
    };
  }

  async isAvailable() {
    try {
      const message = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: 'test'
        }]
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getAvailableModels() {
    return Object.values(this.models);
  }

  selectModel(taskType) {
    return this.models[taskType] || this.models.balanced;
  }

  getSystemPrompt(taskType) {
    const prompts = {
      code: 'You are Claude, an AI assistant created by Anthropic. You are an expert software engineer with deep knowledge of programming languages, software architecture, and best practices. Provide clean, well-documented, secure code with clear explanations.',
      creative: 'You are Claude, an AI assistant created by Anthropic. You excel at creative thinking, writing, and problem-solving. Approach tasks with imagination and originality while being helpful and harmless.',
      fast: 'You are Claude, an AI assistant created by Anthropic. Provide concise, accurate, and helpful responses efficiently.',
      complex: 'You are Claude, an AI assistant created by Anthropic. You excel at complex reasoning, analysis, and breaking down sophisticated problems. Think step-by-step and provide thorough, well-reasoned responses.',
      analysis: 'You are Claude, an AI assistant created by Anthropic. You are skilled at data analysis, research, and providing insights. Analyze information thoroughly and provide actionable recommendations.',
      balanced: 'You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest. Provide comprehensive, well-reasoned responses that are both informative and accessible.'
    };
    
    return prompts[taskType] || prompts.balanced;
  }

  async chat(message, options = {}) {
    const taskType = options.taskType || 'balanced';
    const modelName = this.selectModel(taskType);
    const systemPrompt = this.getSystemPrompt(taskType);
    const maxTokens = options.maxTokens || 4096;

    try {
      const response = await this.client.messages.create({
        model: modelName,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: message
        }]
      });

      const text = response.content[0].text;
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;
      const totalTokens = inputTokens + outputTokens;
      const cost = (inputTokens * this.costPerToken[modelName]) + (outputTokens * this.costPerToken[modelName] * 3);

      return {
        response: text,
        model: modelName,
        provider: this.name,
        taskType: taskType,
        timestamp: new Date().toISOString(),
        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
          cost: parseFloat(cost.toFixed(6))
        }
      };

    } catch (error) {
      throw new Error(`Claude chat error: ${error.message}`);
    }
  }

  async streamChat(message, options = {}) {
    const taskType = options.taskType || 'balanced';
    const modelName = this.selectModel(taskType);
    const systemPrompt = this.getSystemPrompt(taskType);
    const maxTokens = options.maxTokens || 4096;

    try {
      const stream = await this.client.messages.create({
        model: modelName,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: message
        }],
        stream: true
      });

      return stream;

    } catch (error) {
      throw new Error(`Claude stream error: ${error.message}`);
    }
  }

  async analyzeImage(imagePath, prompt, options = {}) {
    const taskType = options.taskType || 'analysis';
    const modelName = this.selectModel(taskType);
    const systemPrompt = this.getSystemPrompt(taskType);
    const maxTokens = options.maxTokens || 4096;

    try {
      // Read image file
      const fs = await import('fs');
      const imageData = fs.readFileSync(imagePath);
      const imageBase64 = imageData.toString('base64');
      
      // Determine image type
      const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

      const response = await this.client.messages.create({
        model: modelName,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBase64
              }
            }
          ]
        }]
      });

      const text = response.content[0].text;
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;
      const totalTokens = inputTokens + outputTokens;
      const cost = (inputTokens * this.costPerToken[modelName]) + (outputTokens * this.costPerToken[modelName] * 3);

      return {
        response: text,
        model: modelName,
        provider: this.name,
        taskType: taskType,
        timestamp: new Date().toISOString(),
        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
          cost: parseFloat(cost.toFixed(6))
        }
      };

    } catch (error) {
      throw new Error(`Claude image analysis error: ${error.message}`);
    }
  }

  async healthCheck() {
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: 'Health check'
        }]
      });
      
      return {
        status: 'healthy',
        provider: this.name,
        models: Object.values(this.models).length,
        timestamp: new Date().toISOString(),
        version: response.model
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
      vision: true,
      functions: false, // Claude doesn't support function calling yet
      fileUpload: false,
      reasoning: true,
      analysis: true,
      cost: 'medium',
      speed: 'medium',
      privacy: 'cloud',
      contextLength: {
        'claude-3-haiku-20240307': 200000,
        'claude-3-sonnet-20240229': 200000,
        'claude-3-5-sonnet-20241022': 200000,
        'claude-3-opus-20240229': 200000
      }
    };
  }

  async conversationChat(messages, options = {}) {
    const taskType = options.taskType || 'balanced';
    const modelName = this.selectModel(taskType);
    const systemPrompt = this.getSystemPrompt(taskType);
    const maxTokens = options.maxTokens || 4096;

    try {
      const response = await this.client.messages.create({
        model: modelName,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages
      });

      const text = response.content[0].text;
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;
      const totalTokens = inputTokens + outputTokens;
      const cost = (inputTokens * this.costPerToken[modelName]) + (outputTokens * this.costPerToken[modelName] * 3);

      return {
        response: text,
        model: modelName,
        provider: this.name,
        taskType: taskType,
        timestamp: new Date().toISOString(),
        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
          cost: parseFloat(cost.toFixed(6))
        }
      };

    } catch (error) {
      throw new Error(`Claude conversation error: ${error.message}`);
    }
  }
}

export default ClaudeProvider;