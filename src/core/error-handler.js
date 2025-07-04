#!/usr/bin/env node

/**
 * Enhanced Error Handler with Self-Healing Capabilities
 * Provides intelligent error recovery and API request validation
 */

export class ErrorHandler {
  constructor() {
    this.errorHistory = [];
    this.recoveryStrategies = new Map();
    this.knownIssues = {
      '400': {
        'invalid_model': { fix: 'useDefaultModel', message: 'Invalid model specified' },
        'context_length_exceeded': { fix: 'reduceTokens', message: 'Message too long' },
        'invalid_api_key': { fix: 'checkApiKey', message: 'API key invalid or expired' },
        'missing_required_field': { fix: 'validateRequest', message: 'Missing required parameters' }
      },
      '401': {
        'unauthorized': { fix: 'refreshAuth', message: 'Authentication failed' }
      },
      '429': {
        'rate_limit': { fix: 'backoffRetry', message: 'Rate limit exceeded' }
      },
      '500': {
        'internal_error': { fix: 'switchProvider', message: 'Provider service error' }
      }
    };
  }

  /**
   * Analyze error and determine recovery strategy
   */
  async handleApiError(error, context = {}) {
    const errorInfo = this.parseError(error);
    
    // Log error for pattern analysis
    this.errorHistory.push({
      timestamp: new Date().toISOString(),
      error: errorInfo,
      context,
      provider: context.provider,
      model: context.model
    });

    // Determine recovery strategy
    const strategy = this.determineRecoveryStrategy(errorInfo, context);
    
    if (strategy) {
      console.log(`🔧 Applying recovery strategy: ${strategy.name}`);
      return await this.executeRecoveryStrategy(strategy, context);
    }

    throw error;
  }

  /**
   * Parse error to extract useful information
   */
  parseError(error) {
    const errorInfo = {
      message: error.message || 'Unknown error',
      code: null,
      type: null,
      details: {}
    };

    // Extract HTTP status code
    if (error.response?.status) {
      errorInfo.code = error.response.status;
    } else if (error.message.includes('400')) {
      errorInfo.code = '400';
    } else if (error.message.includes('429')) {
      errorInfo.code = '429';
    }

    // Extract error type from message
    if (error.message.includes('model')) {
      errorInfo.type = 'invalid_model';
    } else if (error.message.includes('token') || error.message.includes('length')) {
      errorInfo.type = 'context_length_exceeded';
    } else if (error.message.includes('key') || error.message.includes('auth')) {
      errorInfo.type = 'invalid_api_key';
    } else if (error.message.includes('rate limit')) {
      errorInfo.type = 'rate_limit';
    }

    return errorInfo;
  }

  /**
   * Determine best recovery strategy based on error
   */
  determineRecoveryStrategy(errorInfo, context) {
    const codeStrategies = this.knownIssues[errorInfo.code];
    
    if (codeStrategies && errorInfo.type && codeStrategies[errorInfo.type]) {
      const issue = codeStrategies[errorInfo.type];
      return {
        name: issue.fix,
        message: issue.message,
        errorInfo,
        context
      };
    }

    // Fallback strategies
    if (errorInfo.code === '400') {
      return { name: 'validateAndRetry', errorInfo, context };
    } else if (errorInfo.code === '429') {
      return { name: 'backoffRetry', errorInfo, context };
    }

    return null;
  }

  /**
   * Execute recovery strategy
   */
  async executeRecoveryStrategy(strategy, context) {
    switch (strategy.name) {
      case 'useDefaultModel':
        return { ...context, model: this.getDefaultModel(context.provider) };
      
      case 'reduceTokens':
        return { ...context, maxTokens: Math.floor((context.maxTokens || 2000) * 0.75) };
      
      case 'validateRequest':
        return this.validateAndFixRequest(context);
      
      case 'backoffRetry':
        const delay = this.calculateBackoffDelay(context.provider);
        await new Promise(resolve => setTimeout(resolve, delay));
        return { ...context, retry: true };
      
      case 'switchProvider':
        return { ...context, switchProvider: true };
      
      default:
        return context;
    }
  }

  /**
   * Get default model for provider
   */
  getDefaultModel(provider) {
    const defaults = {
      'openai': 'gpt-3.5-turbo',
      'groq': 'llama-3.1-8b-instant',
      'gemini': 'gemini-1.5-flash',
      'claude': 'claude-3-haiku-20240307',
      'ollama': 'llama3.2:latest'
    };
    return defaults[provider] || 'gpt-3.5-turbo';
  }

  /**
   * Validate and fix request parameters
   */
  validateAndFixRequest(context) {
    const fixed = { ...context };
    
    // Ensure required fields
    if (!fixed.messages && fixed.message) {
      fixed.messages = [{ role: 'user', content: fixed.message }];
    }
    
    // Validate token limits
    if (fixed.maxTokens > 4000) {
      fixed.maxTokens = 4000;
    }
    
    // Ensure valid temperature
    if (fixed.temperature && (fixed.temperature < 0 || fixed.temperature > 2)) {
      fixed.temperature = 0.7;
    }
    
    return fixed;
  }

  /**
   * Calculate exponential backoff delay
   */
  calculateBackoffDelay(provider) {
    const recentErrors = this.errorHistory.filter(e => 
      e.provider === provider && 
      e.error.type === 'rate_limit' &&
      Date.now() - new Date(e.timestamp).getTime() < 300000 // Last 5 minutes
    );
    
    const attemptCount = recentErrors.length;
    return Math.min(1000 * Math.pow(2, attemptCount), 30000); // Max 30 seconds
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStats() {
    const stats = {
      total: this.errorHistory.length,
      byCode: {},
      byProvider: {},
      recentErrors: this.errorHistory.slice(-10)
    };

    this.errorHistory.forEach(entry => {
      const code = entry.error.code || 'unknown';
      stats.byCode[code] = (stats.byCode[code] || 0) + 1;
      
      const provider = entry.provider || 'unknown';
      stats.byProvider[provider] = (stats.byProvider[provider] || 0) + 1;
    });

    return stats;
  }
}

export const errorHandler = new ErrorHandler();