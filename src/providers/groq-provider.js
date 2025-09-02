#!/usr/bin/env node

/**
 * Groq Provider for Ultra-Fast Inference
 * Lightning-fast responses with Llama and Mixtral models
 */

// Optional import - gracefully handle missing dependency
let Groq = null;
let importError = null;

try {
  const module = await import('groq-sdk');
  Groq = module.default;
} catch (error) {
  importError = error;
  // Don't log here - will be handled in constructor
}

export class GroqProvider {
  constructor(options = {}) {
    this.name = 'groq';
    this.apiKey = options.apiKey || process.env.GROQ_API_KEY;
    
    if (!Groq) {
      throw new Error('Groq provider unavailable. Check system configuration.');
    }
    
    if (!this.apiKey) {
      throw new Error('Groq API key is required. Set GROQ_API_KEY environment variable.');
    }
    
    this.client = new Groq({
      apiKey: this.apiKey,
    });
    
    this.models = {
      fast: 'llama-3.1-8b-instant',
      balanced: 'llama-3.1-70b-versatile', 
      creative: 'llama-3.2-90b-text-preview',
      code: 'llama-3.1-70b-versatile',
      large: 'llama-3.2-90b-text-preview',
      complex: 'llama-3.1-70b-versatile',
      reasoning: 'llama-3.1-70b-versatile',
      ultra_fast: 'llama-3.1-8b-instant',
      mixtral: 'mixtral-8x7b-32768'
    };
    
    this.priority = 1; // High priority for speed
    this.costPerToken = {
      'llama-3.1-8b-instant': 0.00005,
      'llama-3.1-70b-versatile': 0.00059,
      'llama-3.2-90b-text-preview': 0.00088,
      'mixtral-8x7b-32768': 0.00024
    };
  }

  async isAvailable() {
    try {
      const response = await this.client.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      });
      return true;
    } catch (error) {
      console.warn(`Groq availability check failed: ${error.message}`);
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
      code: 'You are an expert software engineer. Provide clean, efficient code with clear explanations. Focus on best practices and performance.',
      creative: 'You are a creative AI assistant. Generate engaging, original content with flair and imagination.',
      fast: 'You are a speed-optimized AI assistant. Provide quick, accurate, concise responses.',
      complex: 'You are an analytical AI assistant. Break down complex problems systematically and provide detailed reasoning.',
      reasoning: 'You are a logical reasoning expert. Think step-by-step and show your problem-solving process.',
      analysis: 'You are a data analyst. Provide insights, patterns, and actionable recommendations.',
      balanced: 'You are a versatile AI assistant. Provide helpful, accurate, and well-structured responses.'
    };
    
    return prompts[taskType] || prompts.balanced;
  }

  async chat(message, options = {}) {
    const taskType = options.taskType || 'balanced';
    const modelName = this.selectModel(taskType);
    const systemPrompt = this.getSystemPrompt(taskType);
    const maxTokens = options.maxTokens || 2000;

    try {
      const response = await this.client.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: maxTokens,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 1,
        stop: options.stop || null
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
        },
        speed: 'ultra_fast'
      };

    } catch (error) {
      throw new Error(`Groq chat error: ${error.message}`);
    }
  }

  calculateCost(usage, modelName) {
    const inputRate = this.costPerToken[modelName] || 0.0001;
    const outputRate = inputRate * 2; // Groq typically charges 2x for output
    return (usage.prompt_tokens * inputRate + usage.completion_tokens * outputRate) / 1000;
  }

  async streamChat(message, options = {}) {
    const taskType = options.taskType || 'balanced';
    const modelName = this.selectModel(taskType);
    const systemPrompt = this.getSystemPrompt(taskType);

    try {
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
      throw new Error(`Groq stream error: ${error.message}`);
    }
  }

  async healthCheck() {
    try {
      const startTime = Date.now();
      const response = await this.client.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'Health check' }],
        max_tokens: 5
      });
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        provider: this.name,
        models: Object.values(this.models).length,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        speedTest: responseTime < 1000 ? 'ultra_fast' : 'fast'
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
      reasoning: true,
      analysis: true,
      cost: 'low',
      speed: 'ultra_fast',
      privacy: 'cloud',
      speciality: 'speed',
      contextLength: {
        'llama-3.1-8b-instant': 128000,
        'llama-3.1-70b-versatile': 128000,
        'llama-3.2-90b-text-preview': 128000,
        'mixtral-8x7b-32768': 32768
      }
    };
  }
}

export default GroqProvider;