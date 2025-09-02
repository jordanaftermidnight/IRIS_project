#!/usr/bin/env node

/**
 * Advanced Error Recovery System
 * Self-healing capabilities for API errors
 * 
 * @author Jordan After Midnight
 * @copyright 2025 Jordan After Midnight. All rights reserved.
 */

import { messageFormatter } from './message-formatter.js';
import { apiValidator } from './api-validator.js';

export class ErrorRecoverySystem {
  constructor() {
    this.errorPatterns = new Map();
    this.recoveryStrategies = new Map();
    this.setupRecoveryStrategies();
  }

  /**
   * Setup recovery strategies for different error types
   */
  setupRecoveryStrategies() {
    // Tool message errors
    this.recoveryStrategies.set('tool_message_error', {
      patterns: ['tool_use', 'tool_result', 'tool blocks'],
      strategy: async (error, context) => {
        console.log('🔧 Removing tool messages that cause API errors');
        return {
          success: true,
          action: 'retry',
          modifications: {
            messages: messageFormatter.stripToolMessages(context.messages),
            reformatted: true
          }
        };
      }
    });

    // Bad request errors
    this.recoveryStrategies.set('bad_request', {
      patterns: ['400', 'bad request', 'invalid request'],
      strategy: async (error, context) => {
        console.log('🔍 Validating and fixing request format');
        const validated = apiValidator.validateRequest(
          context.provider,
          context.messages,
          context.options
        );
        return {
          success: true,
          action: 'retry',
          modifications: {
            messages: validated.messages,
            options: validated.options
          }
        };
      }
    });

    // Rate limit errors
    this.recoveryStrategies.set('rate_limit', {
      patterns: ['429', 'rate limit', 'too many requests'],
      strategy: async (error, context) => {
        const waitTime = this.extractWaitTime(error) || 10000;
        console.log(`⏰ Rate limited - waiting ${waitTime}ms`);
        await this.sleep(waitTime);
        return {
          success: true,
          action: 'retry',
          modifications: {
            useAlternateProvider: context.attempt > 1
          }
        };
      }
    });

    // Model errors
    this.recoveryStrategies.set('model_error', {
      patterns: ['model not found', 'invalid model', 'unknown model'],
      strategy: async (error, context) => {
        console.log('🔄 Switching to fallback model');
        const fallbackModel = apiValidator.getFallbackModel(context.provider);
        return {
          success: true,
          action: 'retry',
          modifications: {
            options: { ...context.options, model: fallbackModel }
          }
        };
      }
    });

    // Token limit errors
    this.recoveryStrategies.set('token_limit', {
      patterns: ['context length', 'token limit', 'maximum context'],
      strategy: async (error, context) => {
        console.log('✂️ Reducing message size');
        const truncated = this.truncateMessages(context.messages, 0.7);
        return {
          success: true,
          action: 'retry',
          modifications: {
            messages: truncated,
            options: {
              ...context.options,
              maxTokens: Math.floor((context.options.maxTokens || 2000) * 0.7)
            }
          }
        };
      }
    });

    // Timeout errors
    this.recoveryStrategies.set('timeout', {
      patterns: ['timeout', 'timed out', 'deadline exceeded'],
      strategy: async (error, context) => {
        console.log('⏱️ Extending timeout and simplifying request');
        return {
          success: true,
          action: 'retry',
          modifications: {
            options: {
              ...context.options,
              timeout: (context.options.timeout || 30000) * 1.5,
              temperature: 0.3 // More focused responses
            }
          }
        };
      }
    });

    // Authentication errors
    this.recoveryStrategies.set('auth_error', {
      patterns: ['401', 'unauthorized', 'authentication failed'],
      strategy: async (error, context) => {
        console.error('🔑 Authentication failed - check API key');
        return {
          success: false,
          action: 'fail',
          error: 'Invalid API key'
        };
      }
    });
  }

  /**
   * Recover from error
   */
  async recoverFromError(error, context) {
    const errorStr = error.toString().toLowerCase();
    
    // Find matching recovery strategy
    for (const [name, strategy] of this.recoveryStrategies) {
      const matches = strategy.patterns.some(pattern => 
        errorStr.includes(pattern.toLowerCase())
      );
      
      if (matches) {
        console.log(`🚨 Detected ${name} - applying recovery strategy`);
        try {
          const result = await strategy.strategy(error, context);
          
          // Track successful recovery
          if (result.success) {
            this.trackRecovery(name, context.provider);
          }
          
          return result;
        } catch (recoveryError) {
          console.error(`Recovery strategy failed: ${recoveryError.message}`);
        }
      }
    }

    // No specific strategy found
    return {
      success: false,
      action: 'retry',
      modifications: {}
    };
  }

  /**
   * Track recovery patterns
   */
  trackRecovery(strategyName, provider) {
    const key = `${strategyName}:${provider}`;
    const count = this.errorPatterns.get(key) || 0;
    this.errorPatterns.set(key, count + 1);
    
    // Log frequent errors
    if (count > 5 && count % 5 === 0) {
      console.warn(`⚠️ Frequent ${strategyName} errors with ${provider} (${count} times)`);
    }
  }

  /**
   * Extract wait time from rate limit error
   */
  extractWaitTime(error) {
    const patterns = [
      /retry after (\d+) seconds/i,
      /wait (\d+)s/i,
      /retry in (\d+)/i
    ];
    
    for (const pattern of patterns) {
      const match = error.message?.match(pattern);
      if (match) {
        return parseInt(match[1]) * 1000;
      }
    }
    
    return null;
  }

  /**
   * Truncate messages to reduce tokens
   */
  truncateMessages(messages, ratio = 0.7) {
    return messages.map(msg => {
      if (msg.content && msg.content.length > 1000) {
        const newLength = Math.floor(msg.content.length * ratio);
        return {
          ...msg,
          content: msg.content.substring(0, newLength) + '... [truncated]'
        };
      }
      return msg;
    });
  }

  /**
   * Generate recovery report
   */
  getRecoveryReport() {
    const report = {
      totalRecoveries: 0,
      byStrategy: {},
      byProvider: {}
    };

    for (const [key, count] of this.errorPatterns) {
      const [strategy, provider] = key.split(':');
      
      report.totalRecoveries += count;
      report.byStrategy[strategy] = (report.byStrategy[strategy] || 0) + count;
      report.byProvider[provider] = (report.byProvider[provider] || 0) + count;
    }

    return report;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const errorRecovery = new ErrorRecoverySystem();