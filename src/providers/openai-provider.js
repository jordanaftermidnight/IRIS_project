#!/usr/bin/env node

/**
 * OpenAI Provider with o1 Models for Advanced Reasoning
 * Handles GPT-4o, o1-preview, o1-mini with robust error handling
 */

// Optional import - gracefully handle missing dependency
let OpenAI = null;
let importError = null;

try {
  const module = await import('openai');
  OpenAI = module.default;
} catch (error) {
  importError = error;
  // Don't log here - will be handled in constructor
}

export class OpenAIProvider {
  constructor(options = {}) {
    this.name = 'openai';
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    
    if (!OpenAI) {
      throw new Error('OpenAI provider unavailable. Check system configuration.');
    }
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
    }
    
    this.client = new OpenAI({
      apiKey: this.apiKey,
    });
    
    this.models = {
      fast: 'gpt-4o-mini',
      balanced: 'gpt-4o', 
      creative: 'gpt-4o',
      code: 'o1-preview',
      large: 'o1-preview',
      complex: 'o1-preview',
      reasoning: 'o1-preview',
      vision: 'gpt-4o',
      affordable: 'o1-mini'
    };
    
    this.priority = 2; // High priority for reasoning tasks
    this.costPerToken = {
      'gpt-4o-mini': 0.00015,
      'gpt-4o': 0.0025,
      'o1-preview': 0.015,
      'o1-mini': 0.003
    };
  }

  async isAvailable() {
    try {
      // Use cheapest model for availability test
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      });
      return true;
    } catch (error) {
      console.warn(`OpenAI availability check failed: ${error.message}`);
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
      code: 'You are an expert software engineer and computer scientist. Provide clean, efficient, well-documented code with best practices. Think step by step through complex problems.',
      creative: 'You are a creative genius and expert writer. Think imaginatively and provide original, engaging content.',
      fast: 'You are an efficient AI assistant. Provide concise, accurate responses quickly.',
      complex: 'You are an expert researcher and analyst. Break down complex problems systematically. Think step by step and show your reasoning process.',
      reasoning: 'You are an expert at logical reasoning and problem-solving. Think through problems step by step, showing your work and reasoning process.',
      analysis: 'You are a data analyst and researcher. Provide thorough analysis with insights and actionable recommendations.',
      balanced: 'You are a knowledgeable AI assistant. Provide comprehensive, well-reasoned responses.'
    };
    
    return prompts[taskType] || prompts.balanced;
  }

  async chat(message, options = {}) {
    const taskType = options.taskType || 'balanced';
    const modelName = this.selectModel(taskType);
    const maxTokens = options.maxTokens || (modelName.startsWith('o1') ? 4000 : 2000);

    try {
      let response;
      
      // o1 models use different API structure
      if (modelName.startsWith('o1')) {
        response = await this.client.chat.completions.create({
          model: modelName,
          messages: [
            {
              role: 'user',
              content: message
            }
          ],
          max_completion_tokens: maxTokens
        });
      } else {
        // Regular GPT models
        const systemPrompt = this.getSystemPrompt(taskType);
        response = await this.client.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          max_tokens: maxTokens,
          temperature: options.temperature || 0.7
        });
      }

      const text = response.choices[0].message.content;
      const usage = response.usage;
      const cost = this.calculateCost(usage, modelName);

      return {
        response: text,
        model: modelName,
        provider: this.name,
        taskType: taskType,
        timestamp: new Date().toISOString(),
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          cost: parseFloat(cost.toFixed(6))
        }
      };

    } catch (error) {
      throw new Error(`OpenAI chat error: ${error.message}`);
    }
  }

  calculateCost(usage, modelName) {
    const rate = this.costPerToken[modelName] || 0.002;
    return (usage.prompt_tokens + usage.completion_tokens) * rate / 1000;
  }

  async streamChat(message, options = {}) {
    const taskType = options.taskType || 'balanced';
    const modelName = this.selectModel(taskType);

    try {
      // o1 models don't support streaming yet
      if (modelName.startsWith('o1')) {
        return await this.chat(message, options);
      }

      const systemPrompt = this.getSystemPrompt(taskType);
      const stream = await this.client.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        stream: true
      });

      return stream;

    } catch (error) {
      throw new Error(`OpenAI stream error: ${error.message}`);
    }
  }

  async analyzeImage(imagePath, prompt, options = {}) {
    const taskType = options.taskType || 'vision';
    const modelName = 'gpt-4o'; // Only GPT-4o supports vision

    try {
      // Read and encode image
      const fs = await import('fs');
      const imageData = fs.readFileSync(imagePath);
      const imageBase64 = imageData.toString('base64');
      
      // Determine image type
      const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

      const response = await this.client.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: options.maxTokens || 1000
      });

      const text = response.choices[0].message.content;
      const usage = response.usage;
      const cost = this.calculateCost(usage, modelName);

      return {
        response: text,
        model: modelName,
        provider: this.name,
        taskType: taskType,
        timestamp: new Date().toISOString(),
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          cost: parseFloat(cost.toFixed(6))
        }
      };

    } catch (error) {
      throw new Error(`OpenAI image analysis error: ${error.message}`);
    }
  }

  async healthCheck() {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Health check' }],
        max_tokens: 5
      });
      
      return {
        status: 'healthy',
        provider: this.name,
        models: Object.values(this.models).length,
        timestamp: new Date().toISOString(),
        version: 'gpt-4o-mini'
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
      functions: true,
      reasoning: true,
      analysis: true,
      cost: 'medium',
      speed: 'fast',
      privacy: 'cloud',
      contextLength: {
        'gpt-4o-mini': 128000,
        'gpt-4o': 128000,
        'o1-preview': 128000,
        'o1-mini': 128000
      }
    };
  }
}

export default OpenAIProvider;