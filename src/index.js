#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { AIRouter } from './core/ai-router.js';
import { OllamaProvider } from './providers/ollama-provider.js';
import { GeminiProvider } from './providers/gemini-provider.js';
import { ClaudeProvider } from './providers/claude-provider.js';
import { OpenAIProvider } from './providers/openai-provider.js';
import { GroqProvider } from './providers/groq-provider.js';

/**
 * Iris - Integrated Runtime Intelligence Service
 * Main entry point for programmatic usage
 * 
 * @author Jordan After Midnight
 * @author Claude AI (implementation assistance)
 * @copyright 2025 Jordan After Midnight. All rights reserved.
 */
export class MultiAI {
  constructor(options = {}) {
    this.router = new AIRouter();
    this.context = [];
    this.knowledgeBase = new Map();
    this.config = this.loadConfig(options.configPath);
    this.initialized = false;
    this.providerStatus = {
      ollama: { available: false, status: 'unknown', priority: 1 },
      groq: { available: false, status: 'unknown', priority: 2 },
      openai: { available: false, status: 'unknown', priority: 3 },
      gemini: { available: false, status: 'unknown', priority: 4 },
      claude: { available: false, status: 'unknown', priority: 5 }
    };
  }

  /**
   * Initialize AI providers with Mistral-first logic
   */
  async initializeProviders(options = {}) {
    if (this.initialized) return this.getProviderStatus();
    
    console.log('🚀 Initializing AI providers...');
    
    try {
      // Always initialize Ollama/Mistral first (primary provider)
      await this.initializeOllama(options);
      
      // Initialize optional providers silently
      await this.initializeOptionalProviders(options);
      
      // Set fallback order prioritizing cost efficiency and performance
      this.router.setFallbackOrder(['ollama', 'groq', 'openai', 'gemini', 'claude']);
      
      this.initialized = true;
      return this.getProviderStatus();

    } catch (error) {
      console.error('❌ Provider initialization failed:', this.sanitizeError(error.message));
      throw error;
    }
  }

  /**
   * Initialize Ollama/Mistral (primary provider)
   */
  async initializeOllama(options = {}) {
    try {
      const ollamaProvider = new OllamaProvider({
        host: options.ollamaHost || this.config.providers?.ollama?.host
      });
      ollamaProvider.priority = 1;
      this.router.registerProvider(ollamaProvider);
      
      // Test availability
      const isAvailable = await ollamaProvider.isAvailable();
      this.providerStatus.ollama = {
        available: isAvailable,
        status: isAvailable ? 'healthy' : 'unavailable',
        priority: 1,
        type: 'local',
        cost: 'free'
      };
      
      if (isAvailable) {
        console.log('✅ Mistral (Ollama) ready - primary provider active');
      } else {
        console.warn('⚠️  Mistral (Ollama) unavailable - fallback providers will be used');
      }
    } catch (error) {
      this.providerStatus.ollama.status = 'error';
      console.warn('⚠️  Ollama initialization failed:', this.sanitizeError(error.message));
    }
  }

  /**
   * Initialize optional providers (Gemini, Claude)
   */
  async initializeOptionalProviders(options = {}) {
    // Initialize Groq if API key available (fastest responses)
    await this.initializeProvider('groq', GroqProvider, 'GROQ_API_KEY', {
      priority: 2,
      type: 'cloud',
      cost: 'low',
      description: 'Ultra-fast inference'
    });

    // Initialize OpenAI if API key available (best reasoning)
    await this.initializeProvider('openai', OpenAIProvider, 'OPENAI_API_KEY', {
      priority: 3,
      type: 'cloud', 
      cost: 'medium',
      description: 'Advanced reasoning with o1 models'
    });

    // Initialize Gemini if API key available
    await this.initializeProvider('gemini', GeminiProvider, 'GEMINI_API_KEY', {
      priority: 4,
      type: 'cloud',
      cost: 'medium',
      description: 'Google\'s multimodal AI'
    });

    // Initialize Claude if API key available
    await this.initializeProvider('claude', ClaudeProvider, 'ANTHROPIC_API_KEY', {
      priority: 5,
      type: 'cloud',
      cost: 'high',
      description: 'Anthropic\'s reasoning AI'
    });
  }

  /**
   * Generic provider initialization with robust error handling
   */
  async initializeProvider(name, ProviderClass, envKey, config) {
    const apiKey = process.env[envKey] || this.config.providers?.[name]?.apiKey;
    
    if (apiKey) {
      try {
        const provider = new ProviderClass({ apiKey });
        provider.priority = config.priority;
        this.router.registerProvider(provider);
        
        const isAvailable = await provider.isAvailable();
        this.providerStatus[name] = {
          available: isAvailable,
          status: isAvailable ? 'healthy' : 'unavailable',
          priority: config.priority,
          type: config.type,
          cost: config.cost,
          description: config.description
        };
        
        if (isAvailable && name !== 'ollama') {
          console.log(`✅ ${name.toUpperCase()} ready - ${config.description}`);
        }
      } catch (error) {
        this.providerStatus[name] = {
          available: false,
          status: 'error',
          priority: config.priority,
          type: config.type,
          cost: config.cost,
          error: 'Initialization failed',
          description: config.description
        };
        console.warn(`⚠️  ${name.toUpperCase()} initialization failed: ${error.message}`);
      }
    } else {
      // No API key provided
      this.providerStatus[name] = {
        available: false,
        status: 'no_api_key',
        priority: config.priority,
        type: config.type,
        cost: config.cost,
        message: `Set ${envKey} to enable`,
        description: config.description
      };
    }
  }

  /**
   * Get visual status of all providers
   */
  getProviderStatus() {
    return {
      ...this.providerStatus,
      summary: {
        total: Object.keys(this.providerStatus).length,
        available: Object.values(this.providerStatus).filter(p => p.available).length,
        primary: this.providerStatus.ollama.available ? 'mistral' : 'fallback'
      }
    };
  }

  /**
   * Display visual status of all providers
   */
  displayProviderStatus() {
    console.log('\n📊 Provider Status:');
    
    for (const [name, status] of Object.entries(this.providerStatus)) {
      const icon = status.available ? '✅' : (status.status === 'error' ? '❌' : 
                  (status.status === 'no_api_key' ? '🔑' : '⚠️'));
      const costBadge = status.cost === 'free' ? '🆓' : '💰';
      const typeBadge = status.type === 'local' ? '🏠' : '☁️';
      
      let statusText = status.status;
      if (status.status === 'no_api_key') {
        statusText = 'needs API key';
      }
      
      console.log(`${icon} ${name.toUpperCase().padEnd(8)} ${typeBadge} ${costBadge} Priority: ${status.priority} - ${statusText}`);
      
      if (status.message) {
        console.log(`   💡 ${status.message}`);
      }
    }
    
    const summary = this.getProviderStatus().summary;
    console.log(`\n📈 Summary: ${summary.available}/${summary.total} providers available`);
    console.log(`🎯 Primary: ${summary.primary === 'mistral' ? 'Mistral (cost-optimized)' : 'Fallback providers'}\n`);
  }

  /**
   * Mistral-first decision logic for task handling
   */
  async shouldUseMistral(message, options = {}) {
    if (!this.providerStatus.ollama.available) {
      return { useMistral: false, reason: 'Mistral unavailable' };
    }

    const taskType = options.taskType || 'balanced';
    const messageLength = message.length;
    const complexity = this.assessComplexity(message, options);

    // Always try Mistral first unless explicitly complex
    if (complexity < 0.8 && messageLength < 8000) {
      return { useMistral: true, reason: 'Standard task - Mistral can handle' };
    }

    if (taskType === 'complex' && complexity > 0.8) {
      return { useMistral: false, reason: 'High complexity - using specialized provider' };
    }

    // For large projects, assess if splitting is needed
    if (messageLength > 8000 || options.splitWorkload) {
      return { useMistral: true, reason: 'Large task - will split workload if needed', split: true };
    }

    return { useMistral: true, reason: 'Default to cost-efficient Mistral' };
  }

  /**
   * Assess complexity of the task
   */
  assessComplexity(message, options = {}) {
    let complexity = 0.3; // Base complexity

    // Technical indicators
    if (/\b(algorithm|architecture|design pattern|optimization|performance|security|database|api|framework)\b/i.test(message)) {
      complexity += 0.2;
    }

    // Length factor
    if (message.length > 5000) complexity += 0.2;
    if (message.length > 10000) complexity += 0.3;

    // Task type factor
    const complexTasks = ['complex', 'analysis', 'code'];
    if (complexTasks.includes(options.taskType)) {
      complexity += 0.3;
    }

    // Multi-part indicators
    if (/\b(step by step|analyze|compare|evaluate|research|comprehensive|detailed)\b/i.test(message)) {
      complexity += 0.2;
    }

    return Math.min(complexity, 1.0);
  }

  /**
   * Sanitize error messages to remove sensitive information
   */
  sanitizeError(message) {
    return message.replace(/(?:api[_\s]*key|token|password)[=:\s]*[^\s&]+/gi, '[REDACTED]');
  }

  /**
   * Enhanced chat with Mistral-first decision logic
   */
  async chat(message, options = {}) {
    // Ensure providers are initialized
    if (!this.initialized) {
      await this.initializeProviders(options);
    }

    // Input validation
    if (!message || typeof message !== 'string') {
      throw new Error('Message must be a non-empty string');
    }
    
    if (message.length > 10000) {
      throw new Error('Message too long (maximum 10,000 characters)');
    }

    // Check if a specific provider is forced
    if (options.provider) {
      return await this.chatWithProvider(message, options.provider, options);
    }

    try {
      // Mistral-first decision logic
      const decision = await this.shouldUseMistral(message, options);
      console.log(`🤖 Decision: ${decision.reason}`);

      if (decision.split) {
        return await this.handleLargeTask(message, options);
      }

      const result = await this.router.executeRequest(message, {
        taskType: options.taskType || 'balanced',
        stream: options.stream || false,
        preferLocal: decision.useMistral,
        maxCost: options.maxCost || this.config.routing?.maxCost,
        timeout: options.timeout || 30000
      });

      // Update conversation context
      this.updateContext(message, result.response);

      return {
        ...result,
        contextLength: this.context.length,
        decision: decision,
        sanitized: true
      };

    } catch (error) {
      console.error('💬 Chat error:', this.sanitizeError(error.message));
      throw new Error(`Multi-AI chat failed: ${this.sanitizeError(error.message)}`);
    }
  }

  /**
   * Handle large tasks with potential workload splitting
   */
  async handleLargeTask(message, options = {}) {
    console.log('📊 Analyzing large task for potential splitting...');
    
    // For now, try with Mistral first, then fallback
    try {
      const result = await this.router.executeRequest(message, {
        ...options,
        preferLocal: true,
        taskType: options.taskType || 'balanced'
      });
      
      console.log('✅ Mistral handled large task successfully');
      return result;
    } catch (error) {
      console.log('🔄 Large task failed on Mistral, using specialized provider...');
      
      return await this.router.executeRequest(message, {
        ...options,
        preferLocal: false,
        taskType: 'complex'
      });
    }
  }

  /**
   * Chat with a specific provider (forced selection)
   */
  async chatWithProvider(message, providerName, options = {}) {
    const provider = this.router.providers.get(providerName);
    
    if (!provider) {
      throw new Error(`Provider '${providerName}' not found. Available providers: ${Array.from(this.router.providers.keys()).join(', ')}`);
    }

    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      throw new Error(`Provider '${providerName}' is not available. Check configuration and API keys.`);
    }

    console.log(`🎯 Forcing provider: ${providerName}`);

    try {
      const startTime = Date.now();
      const result = await provider.chat(message, options);
      const responseTime = Date.now() - startTime;

      // Update provider statistics
      this.router.updateProviderStats(providerName, true, responseTime, result.usage?.cost || 0);

      // Update conversation context
      this.updateContext(message, result.response);

      return {
        ...result,
        contextLength: this.context.length,
        forced: true,
        providerName,
        sanitized: true
      };

    } catch (error) {
      this.router.updateProviderStats(providerName, false, 0, 0);
      throw new Error(`Provider '${providerName}' failed: ${this.sanitizeError(error.message)}`);
    }
  }

  /**
   * Update conversation context with size management
   */
  updateContext(userMessage, assistantResponse) {
    this.context.push(`User: ${userMessage}`);
    this.context.push(`Assistant: ${assistantResponse}`);
    
    // Intelligent context trimming
    const maxContextLength = this.config.context?.maxLength || 20;
    if (this.context.length > maxContextLength) {
      const keepLength = Math.floor(maxContextLength * 0.8);
      this.context = this.context.slice(-keepLength);
    }
  }

  /**
   * Clear conversation context
   */
  clearContext() {
    this.context = [];
  }

  /**
   * Get sanitized conversation context
   */
  getContext() {
    return [...this.context];
  }

  /**
   * Enhanced knowledge base management
   */
  addKnowledge(key, value, metadata = {}) {
    if (!key || typeof key !== 'string') {
      throw new Error('Knowledge key must be a non-empty string');
    }

    this.knowledgeBase.set(key, {
      value,
      timestamp: new Date().toISOString(),
      accessCount: 0,
      metadata: {
        type: typeof value,
        size: JSON.stringify(value).length,
        ...metadata
      }
    });

    // Cleanup old entries if knowledge base gets too large
    if (this.knowledgeBase.size > 1000) {
      this.cleanupKnowledgeBase();
    }
  }

  /**
   * Cleanup knowledge base by removing least accessed entries
   */
  cleanupKnowledgeBase() {
    const entries = Array.from(this.knowledgeBase.entries());
    entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
    
    // Remove oldest 20% of entries
    const removeCount = Math.floor(entries.length * 0.2);
    for (let i = 0; i < removeCount; i++) {
      this.knowledgeBase.delete(entries[i][0]);
    }
  }

  /**
   * Process files with enhanced error handling
   */
  async processFile(filePath, options = {}) {
    // Validate file path
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(process.cwd()) && !options.allowExternal) {
      throw new Error('File path outside project directory not allowed');
    }

    try {
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const stats = fs.statSync(resolvedPath);
      if (stats.size > 1024 * 1024) { // 1MB limit
        throw new Error('File too large (maximum 1MB)');
      }

      const fileContent = fs.readFileSync(resolvedPath, 'utf8');
      const fileName = path.basename(resolvedPath);
      const fileExt = path.extname(resolvedPath).toLowerCase();

      let prompt = options.customPrompt || `Analyze this ${fileExt} file named "${fileName}":

${fileContent}

Please provide insights about:
- File purpose and structure
- Key components or sections
- Potential improvements
- Any issues or concerns`;

      const result = await this.chat(prompt, { 
        taskType: options.taskType || 'analysis' 
      });

      // Store analysis in knowledge base
      this.addKnowledge(`file_analysis_${fileName}`, {
        path: resolvedPath,
        analysis: result.response,
        fileSize: stats.size,
        provider: result.provider,
        timestamp: result.timestamp
      });

      return result;

    } catch (error) {
      throw new Error(`File processing failed: ${this.sanitizeError(error.message)}`);
    }
  }

  /**
   * Get comprehensive system status
   */
  async getSystemStatus() {
    // Ensure providers are initialized
    if (!this.initialized) {
      await this.initializeProviders();
    }

    const healthChecks = await this.router.healthCheckAll();
    const providerStats = this.router.getProviderStats();
    const requestHistory = this.router.getRequestHistory(5);
    const providerStatus = this.getProviderStatus();
    
    return {
      timestamp: new Date().toISOString(),
      version: '2.3.0',
      providers: {
        ...providerStatus,
        details: healthChecks
      },
      performance: {
        statistics: providerStats,
        recentRequests: requestHistory
      },
      resources: {
        knowledgeBase: {
          entries: this.knowledgeBase.size,
          memoryUsage: process.memoryUsage()
        },
        context: {
          length: this.context.length,
          maxLength: this.config.context?.maxLength || 20
        }
      },
      decision: {
        primaryProvider: providerStatus.summary.primary,
        costOptimized: this.config.routing?.costOptimization || true
      }
    };
  }

  /**
   * Load configuration with defaults
   */
  loadConfig(configPath = './config/iris-config.json') {
    const defaultConfig = {
      providers: {
        ollama: {
          host: 'http://localhost:11434',
          timeout: 30000,
          maxRetries: 3
        },
        gemini: {
          rateLimit: {
            requestsPerMinute: 60
          }
        },
        claude: {
          maxTokens: 4096,
          rateLimit: {
            requestsPerMinute: 50
          }
        }
      },
      routing: {
        preferLocal: true,
        maxCost: 0.05, // Lower cost limit to prioritize free Ollama
        fallbackOrder: ['ollama', 'gemini', 'claude'],
        costOptimization: true
      },
      context: {
        maxLength: 20
      }
    };

    try {
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        const userConfig = JSON.parse(configData);
        return this.mergeConfig(defaultConfig, userConfig);
      }
    } catch (error) {
      console.warn('⚠️  Config loading failed, using defaults:', error.message);
    }
    
    return defaultConfig;
  }

  /**
   * Deep merge configuration objects
   */
  mergeConfig(defaultConfig, userConfig) {
    const result = { ...defaultConfig };
    
    for (const key in userConfig) {
      if (typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
        result[key] = this.mergeConfig(result[key] || {}, userConfig[key]);
      } else {
        result[key] = userConfig[key];
      }
    }
    
    return result;
  }

  /**
   * Save configuration with error handling
   */
  saveConfig(configPath = './config/iris-config.json') {
    try {
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      const config = {
        ...this.config,
        // Don't save sensitive data
        providers: {
          ...this.config.providers,
          gemini: {
            ...this.config.providers?.gemini,
            apiKey: undefined // Remove API key from saved config
          }
        },
        lastSaved: new Date().toISOString(),
        version: '2.0.0'
      };
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`💾 Configuration saved to ${configPath}`);
    } catch (error) {
      console.error('❌ Failed to save config:', this.sanitizeError(error.message));
    }
  }
}

export default MultiAI;