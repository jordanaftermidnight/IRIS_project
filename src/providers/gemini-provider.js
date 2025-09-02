#!/usr/bin/env node

// Optional import - gracefully handle missing dependency
let GoogleGenerativeAI = null;
let importError = null;

try {
  const module = await import('@google/generative-ai');
  GoogleGenerativeAI = module.GoogleGenerativeAI;
} catch (error) {
  importError = error;
  // Don't log here - will be handled in constructor
}

/**
 * Google Gemini provider for advanced AI capabilities
 */
export class GeminiProvider {
  constructor(options = {}) {
    this.name = 'gemini';
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    
    if (!GoogleGenerativeAI) {
      throw new Error('Gemini provider unavailable. Check system configuration.');
    }
    
    if (!this.apiKey) {
      throw new Error('Gemini API key is required. Set GEMINI_API_KEY environment variable.');
    }
    
    this.client = new GoogleGenerativeAI(this.apiKey);
    this.models = {
      fast: 'gemini-1.5-flash',
      balanced: 'gemini-1.5-pro',
      creative: 'gemini-1.5-pro',
      code: 'gemini-1.5-pro',
      large: 'gemini-1.5-pro'
    };
    this.priority = 2; // Medium priority
    this.costPerToken = 0.00001; // Approximate cost
  }

  async isAvailable() {
    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });
      await model.generateContent('test');
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
      code: 'You are an expert software engineer. Provide clean, well-documented code with best practices.',
      creative: 'You are a creative genius. Think innovatively and provide original, imaginative solutions.',
      fast: 'You are an efficient assistant. Provide concise, accurate responses quickly.',
      complex: 'You are a research expert. Analyze complex problems methodically with detailed reasoning.',
      analysis: 'You are a data analyst. Provide thorough analysis with insights and actionable recommendations.',
      balanced: 'You are a knowledgeable assistant. Provide comprehensive, well-reasoned responses.'
    };
    
    return prompts[taskType] || prompts.balanced;
  }

  async chat(message, options = {}) {
    const taskType = options.taskType || 'balanced';
    const modelName = this.selectModel(taskType);
    const systemPrompt = this.getSystemPrompt(taskType);

    try {
      const model = this.client.getGenerativeModel({ 
        model: modelName,
        systemInstruction: systemPrompt 
      });

      const result = await model.generateContent(message);
      const response = await result.response;
      const text = response.text();

      return {
        response: text,
        model: modelName,
        provider: this.name,
        taskType: taskType,
        timestamp: new Date().toISOString(),
        usage: {
          tokens: response.usageMetadata?.totalTokenCount || 0,
          cost: (response.usageMetadata?.totalTokenCount || 0) * this.costPerToken
        }
      };

    } catch (error) {
      throw new Error(`Gemini chat error: ${error.message}`);
    }
  }

  async streamChat(message, options = {}) {
    const taskType = options.taskType || 'balanced';
    const modelName = this.selectModel(taskType);
    const systemPrompt = this.getSystemPrompt(taskType);

    try {
      const model = this.client.getGenerativeModel({ 
        model: modelName,
        systemInstruction: systemPrompt 
      });

      const result = await model.generateContentStream(message);
      return result.stream;

    } catch (error) {
      throw new Error(`Gemini stream error: ${error.message}`);
    }
  }

  async analyzeImage(imagePath, prompt, options = {}) {
    const taskType = options.taskType || 'analysis';
    const modelName = this.selectModel(taskType);

    try {
      const model = this.client.getGenerativeModel({ model: modelName });
      
      // Read image file
      const fs = await import('fs');
      const imageData = fs.readFileSync(imagePath);
      const imageBase64 = imageData.toString('base64');
      
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg' // Adjust based on image type
        }
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      return {
        response: text,
        model: modelName,
        provider: this.name,
        taskType: taskType,
        timestamp: new Date().toISOString(),
        usage: {
          tokens: response.usageMetadata?.totalTokenCount || 0,
          cost: (response.usageMetadata?.totalTokenCount || 0) * this.costPerToken
        }
      };

    } catch (error) {
      throw new Error(`Gemini image analysis error: ${error.message}`);
    }
  }

  async healthCheck() {
    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });
      await model.generateContent('Health check');
      
      return {
        status: 'healthy',
        provider: this.name,
        models: Object.values(this.models).length,
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
      vision: true,
      functions: true,
      fileUpload: true,
      cost: 'low',
      speed: 'fast',
      privacy: 'cloud'
    };
  }
}

export default GeminiProvider;