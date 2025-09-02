// File: src/providers/multi-provider-integration.ts
// IRIS Phase 4: Multi-Provider Integration - Complete Provider Ecosystem
// Priority: Production-ready clients for Gemini, Groq, HuggingFace, and Ollama

interface ProviderResponse {
  content: string;
  provider: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata: {
    responseTime: number;
    finishReason: string;
    timestamp: number;
  };
}

interface ProviderConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

// ===== GEMINI API CLIENT =====

class GeminiProvider {
  private config: ProviderConfig;
  private requestCount: number = 0;
  private readonly DAILY_LIMIT = 1500;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  async generateResponse(
    messages: Array<{role: string, content: string}>,
    options: {
      maxTokens?: number;
      temperature?: number;
      streaming?: boolean;
    } = {}
  ): Promise<ProviderResponse> {
    
    // Check daily limit
    if (this.requestCount >= this.DAILY_LIMIT) {
      throw new Error(`Gemini daily limit exceeded (${this.DAILY_LIMIT} requests)`);
    }

    const startTime = Date.now();

    try {
      // Convert messages to Gemini format
      const contents = this.convertMessagesToGemini(messages);
      
      const requestBody = {
        contents,
        generationConfig: {
          maxOutputTokens: options.maxTokens || this.config.maxTokens,
          temperature: options.temperature || this.config.temperature,
          topP: 0.8,
          topK: 40
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      const response = await fetch(
        `${this.config.baseURL}?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(this.config.timeout)
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${error}`);
      }

      const data = await response.json();
      this.requestCount++;

      // Extract response content
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const finishReason = data.candidates?.[0]?.finishReason || 'unknown';

      // Calculate token usage (approximation)
      const promptTokens = this.estimateTokens(messages.map(m => m.content).join(' '));
      const completionTokens = this.estimateTokens(content);

      return {
        content,
        provider: 'gemini',
        model: this.config.model,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens
        },
        metadata: {
          responseTime: Date.now() - startTime,
          finishReason,
          timestamp: Date.now()
        }
      };

    } catch (error) {
      throw new Error(`Gemini generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private convertMessagesToGemini(messages: Array<{role: string, content: string}>) {
    return messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.split(/\s+/).length * 1.3); // Rough estimate
  }

  getUsageStats() {
    return {
      requestsUsed: this.requestCount,
      requestsRemaining: this.DAILY_LIMIT - this.requestCount,
      dailyLimit: this.DAILY_LIMIT,
      utilizationRate: (this.requestCount / this.DAILY_LIMIT) * 100
    };
  }
}

// ===== GROQ API CLIENT =====

class GroqProvider {
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  async generateResponse(
    messages: Array<{role: string, content: string}>,
    options: {
      maxTokens?: number;
      temperature?: number;
      streaming?: boolean;
    } = {}
  ): Promise<ProviderResponse> {
    
    const startTime = Date.now();

    try {
      const requestBody = {
        model: this.config.model || 'llama3-8b-8192',
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        max_tokens: options.maxTokens || this.config.maxTokens,
        temperature: options.temperature || this.config.temperature,
        top_p: 1,
        stream: options.streaming || false,
        stop: null
      };

      const response = await fetch(
        `${this.config.baseURL}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(this.config.timeout)
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Groq API error (${response.status}): ${error}`);
      }

      const data = await response.json();

      // Extract response content
      const content = data.choices?.[0]?.message?.content || '';
      const finishReason = data.choices?.[0]?.finish_reason || 'unknown';

      return {
        content,
        provider: 'groq',
        model: data.model || this.config.model,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        },
        metadata: {
          responseTime: Date.now() - startTime,
          finishReason,
          timestamp: Date.now()
        }
      };

    } catch (error) {
      throw new Error(`Groq generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async streamResponse(
    messages: Array<{role: string, content: string}>,
    onChunk: (chunk: string) => void,
    options: {
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<ProviderResponse> {
    
    const startTime = Date.now();
    let fullContent = '';

    try {
      const requestBody = {
        model: this.config.model || 'llama3-8b-8192',
        messages,
        max_tokens: options.maxTokens || this.config.maxTokens,
        temperature: options.temperature || this.config.temperature,
        stream: true
      };

      const response = await fetch(
        `${this.config.baseURL}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        throw new Error(`Groq streaming error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body reader available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
        
        for (const line of lines) {
          if (line === 'data: [DONE]') continue;
          
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices?.[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              onChunk(content);
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }

      return {
        content: fullContent,
        provider: 'groq',
        model: this.config.model,
        usage: {
          promptTokens: this.estimateTokens(messages.map(m => m.content).join(' ')),
          completionTokens: this.estimateTokens(fullContent),
          totalTokens: 0 // Will be calculated
        },
        metadata: {
          responseTime: Date.now() - startTime,
          finishReason: 'stop',
          timestamp: Date.now()
        }
      };

    } catch (error) {
      throw new Error(`Groq streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }
}

// ===== HUGGINGFACE INFERENCE API CLIENT =====

class HuggingFaceProvider {
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  async generateResponse(
    messages: Array<{role: string, content: string}>,
    options: {
      maxTokens?: number;
      temperature?: number;
      model?: string;
    } = {}
  ): Promise<ProviderResponse> {
    
    const startTime = Date.now();

    try {
      // Convert messages to prompt format
      const prompt = this.convertMessagesToPrompt(messages);
      
      // Use coding-optimized models by default
      const model = options.model || this.config.model || 'codellama/CodeLlama-7b-Instruct-hf';
      
      const requestBody = {
        inputs: prompt,
        parameters: {
          max_new_tokens: options.maxTokens || this.config.maxTokens,
          temperature: options.temperature || this.config.temperature,
          top_p: 0.9,
          do_sample: true,
          return_full_text: false
        }
      };

      const response = await fetch(
        `${this.config.baseURL}/models/${model}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(this.config.timeout)
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HuggingFace API error (${response.status}): ${error}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      let content = '';
      if (Array.isArray(data) && data[0]?.generated_text) {
        content = data[0].generated_text;
      } else if (data.generated_text) {
        content = data.generated_text;
      } else {
        throw new Error('Unexpected HuggingFace response format');
      }

      // Clean up the response (remove prompt repetition)
      content = this.cleanResponse(content, prompt);

      const promptTokens = this.estimateTokens(prompt);
      const completionTokens = this.estimateTokens(content);

      return {
        content,
        provider: 'huggingface',
        model,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens
        },
        metadata: {
          responseTime: Date.now() - startTime,
          finishReason: 'stop',
          timestamp: Date.now()
        }
      };

    } catch (error) {
      throw new Error(`HuggingFace generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateCode(
    prompt: string,
    language: string = 'python',
    options: {
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<ProviderResponse> {
    
    const codePrompt = `Generate ${language} code for the following request:\n\n${prompt}\n\nCode:`;
    
    return this.generateResponse([
      { role: 'user', content: codePrompt }
    ], {
      ...options,
      model: 'codellama/CodeLlama-13b-Instruct-hf'
    });
  }

  private convertMessagesToPrompt(messages: Array<{role: string, content: string}>): string {
    return messages.map(msg => {
      const rolePrefix = msg.role === 'user' ? 'Human: ' : 'Assistant: ';
      return rolePrefix + msg.content;
    }).join('\n\n') + '\n\nAssistant: ';
  }

  private cleanResponse(response: string, prompt: string): string {
    // Remove prompt repetition if present
    if (response.startsWith(prompt)) {
      response = response.slice(prompt.length);
    }
    
    // Clean up common artifacts
    return response
      .replace(/^Assistant:\s*/g, '')
      .replace(/Human:.*$/g, '')
      .trim();
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }

  // Get available models for coding
  getAvailableModels(): string[] {
    return [
      'codellama/CodeLlama-7b-Instruct-hf',
      'codellama/CodeLlama-13b-Instruct-hf', 
      'codellama/CodeLlama-34b-Instruct-hf',
      'microsoft/DialoGPT-large',
      'microsoft/CodeBERT-base',
      'Salesforce/codet5-base'
    ];
  }
}

// ===== OLLAMA LOCAL AI CLIENT =====

class OllamaProvider {
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = {
      ...config,
      baseURL: config.baseURL || 'http://localhost:11434'
    };
  }

  async generateResponse(
    messages: Array<{role: string, content: string}>,
    options: {
      maxTokens?: number;
      temperature?: number;
      streaming?: boolean;
    } = {}
  ): Promise<ProviderResponse> {
    
    const startTime = Date.now();

    try {
      // Convert messages to Ollama format
      const prompt = this.convertMessagesToPrompt(messages);
      
      const requestBody = {
        model: this.config.model || 'llama3',
        prompt,
        stream: false,
        options: {
          num_predict: options.maxTokens || this.config.maxTokens,
          temperature: options.temperature || this.config.temperature,
          top_p: 0.9,
          top_k: 40
        }
      };

      const response = await fetch(
        `${this.config.baseURL}/api/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(this.config.timeout)
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error (${response.status}): ${error}`);
      }

      const data = await response.json();
      
      const content = data.response || '';
      
      const promptTokens = this.estimateTokens(prompt);
      const completionTokens = this.estimateTokens(content);

      return {
        content,
        provider: 'ollama',
        model: data.model || this.config.model,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens
        },
        metadata: {
          responseTime: Date.now() - startTime,
          finishReason: data.done ? 'stop' : 'length',
          timestamp: Date.now()
        }
      };

    } catch (error) {
      throw new Error(`Ollama generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async streamResponse(
    messages: Array<{role: string, content: string}>,
    onChunk: (chunk: string) => void,
    options: {
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<ProviderResponse> {
    
    const startTime = Date.now();
    let fullContent = '';

    try {
      const prompt = this.convertMessagesToPrompt(messages);
      
      const requestBody = {
        model: this.config.model || 'llama3',
        prompt,
        stream: true,
        options: {
          num_predict: options.maxTokens || this.config.maxTokens,
          temperature: options.temperature || this.config.temperature
        }
      };

      const response = await fetch(
        `${this.config.baseURL}/api/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        throw new Error(`Ollama streaming error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body reader available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              fullContent += data.response;
              onChunk(data.response);
            }
            if (data.done) break;
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }

      return {
        content: fullContent,
        provider: 'ollama',
        model: this.config.model,
        usage: {
          promptTokens: this.estimateTokens(prompt),
          completionTokens: this.estimateTokens(fullContent),
          totalTokens: 0 // Will be calculated
        },
        metadata: {
          responseTime: Date.now() - startTime,
          finishReason: 'stop',
          timestamp: Date.now()
        }
      };

    } catch (error) {
      throw new Error(`Ollama streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private convertMessagesToPrompt(messages: Array<{role: string, content: string}>): string {
    return messages.map(msg => {
      const rolePrefix = msg.role === 'user' ? 'User: ' : 'Assistant: ';
      return rolePrefix + msg.content;
    }).join('\n\n') + '\n\nAssistant: ';
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }

  // Check if Ollama is running
  async checkHealth(): Promise<{running: boolean, models: string[], version?: string}> {
    try {
      const response = await fetch(`${this.config.baseURL}/api/tags`);
      if (!response.ok) {
        return { running: false, models: [] };
      }

      const data = await response.json();
      return {
        running: true,
        models: data.models?.map((m: any) => m.name) || [],
        version: data.version
      };

    } catch (error) {
      return { running: false, models: [] };
    }
  }
}

// ===== UNIFIED PROVIDER MANAGER =====

export class MultiProviderManager {
  private providers: Map<string, any> = new Map();
  private configs: Map<string, ProviderConfig> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Default configurations (will be overridden by user settings)
    const defaultConfigs = {
      gemini: {
        apiKey: '',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        model: 'gemini-pro',
        maxTokens: 2048,
        temperature: 0.7,
        timeout: 30000
      },
      groq: {
        apiKey: '',
        baseURL: 'https://api.groq.com/openai/v1',
        model: 'llama3-8b-8192',
        maxTokens: 2048,
        temperature: 0.7,
        timeout: 15000
      },
      huggingface: {
        apiKey: '',
        baseURL: 'https://api-inference.huggingface.co',
        model: 'codellama/CodeLlama-7b-Instruct-hf',
        maxTokens: 1024,
        temperature: 0.7,
        timeout: 30000
      },
      ollama: {
        apiKey: '',
        baseURL: 'http://localhost:11434',
        model: 'llama3',
        maxTokens: 2048,
        temperature: 0.7,
        timeout: 60000
      }
    };

    // Initialize provider instances
    Object.entries(defaultConfigs).forEach(([name, config]) => {
      this.configs.set(name, config);
      this.initializeProvider(name, config);
    });
  }

  private initializeProvider(name: string, config: ProviderConfig): void {
    switch (name) {
      case 'gemini':
        this.providers.set(name, new GeminiProvider(config));
        break;
      case 'groq':
        this.providers.set(name, new GroqProvider(config));
        break;
      case 'huggingface':
        this.providers.set(name, new HuggingFaceProvider(config));
        break;
      case 'ollama':
        this.providers.set(name, new OllamaProvider(config));
        break;
      default:
        throw new Error(`Unknown provider: ${name}`);
    }
  }

  async generateResponse(
    providerName: string,
    messages: Array<{role: string, content: string}>,
    options: any = {}
  ): Promise<ProviderResponse> {
    
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider '${providerName}' not found or not configured`);
    }

    return provider.generateResponse(messages, options);
  }

  async streamResponse(
    providerName: string,
    messages: Array<{role: string, content: string}>,
    onChunk: (chunk: string) => void,
    options: any = {}
  ): Promise<ProviderResponse> {
    
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider '${providerName}' not found`);
    }

    if (!provider.streamResponse) {
      throw new Error(`Provider '${providerName}' does not support streaming`);
    }

    return provider.streamResponse(messages, onChunk, options);
  }

  updateProviderConfig(providerName: string, updates: Partial<ProviderConfig>): void {
    const currentConfig = this.configs.get(providerName);
    if (!currentConfig) {
      throw new Error(`Provider '${providerName}' not found`);
    }

    const newConfig = { ...currentConfig, ...updates };
    this.configs.set(providerName, newConfig);
    this.initializeProvider(providerName, newConfig);
  }

  getProviderConfig(providerName: string): ProviderConfig | undefined {
    return this.configs.get(providerName);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async checkProviderHealth(providerName: string): Promise<{healthy: boolean, details: any}> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      return { healthy: false, details: { error: 'Provider not found' } };
    }

    try {
      // Special health check for Ollama
      if (providerName === 'ollama' && provider.checkHealth) {
        const health = await provider.checkHealth();
        return { healthy: health.running, details: health };
      }

      // Generic health check - try a simple generation
      const testResponse = await provider.generateResponse(
        [{ role: 'user', content: 'Say "OK"' }],
        { maxTokens: 10, temperature: 0 }
      );

      return { 
        healthy: true, 
        details: { 
          responseTime: testResponse.metadata.responseTime,
          model: testResponse.model
        } 
      };

    } catch (error) {
      return { 
        healthy: false, 
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        } 
      };
    }
  }
}

export { GeminiProvider, GroqProvider, HuggingFaceProvider, OllamaProvider, ProviderResponse, ProviderConfig };