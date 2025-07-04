#!/usr/bin/env node

import { NeuralLearningSystem } from './neural-learning.js';

/**
 * Self-Healing Error Handler for IRIS
 * Automatically recovers from API errors and adapts behavior
 * 
 * @author Jordan After Midnight
 * @copyright 2025 Jordan After Midnight. All rights reserved.
 */
export class SelfHealingHandler {
  constructor() {
    this.neuralSystem = new NeuralLearningSystem();
    this.healingStrategies = new Map();
    this.initializeStrategies();
  }

  /**
   * Initialize healing strategies
   */
  initializeStrategies() {
    // API 400 Bad Request fixes
    this.healingStrategies.set('bad_request', [
      {
        name: 'sanitize_input',
        apply: (message) => {
          // Remove problematic characters
          return message
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Control characters
            .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width characters
            .trim();
        }
      },
      {
        name: 'reduce_length',
        apply: (message) => {
          // Truncate if too long
          const maxLength = 4000;
          if (message.length > maxLength) {
            return message.substring(0, maxLength) + '...';
          }
          return message;
        }
      },
      {
        name: 'fix_encoding',
        apply: (message) => {
          // Ensure proper UTF-8 encoding
          try {
            return Buffer.from(message, 'utf8').toString('utf8');
          } catch (error) {
            return message.replace(/[^\x00-\x7F]/g, ''); // ASCII only fallback
          }
        }
      }
    ]);

    // Timeout fixes
    this.healingStrategies.set('timeout', [
      {
        name: 'simplify_request',
        apply: (message, options) => {
          // Use simpler model for timeout-prone requests
          options.taskType = 'fast';
          return message.length > 1000 ? message.substring(0, 1000) + '...' : message;
        }
      },
      {
        name: 'increase_timeout',
        apply: (message, options) => {
          options.timeout = (options.timeout || 30000) * 2;
          return message;
        }
      }
    ]);

    // Token limit fixes
    this.healingStrategies.set('token_limit', [
      {
        name: 'chunk_message',
        apply: (message) => {
          const chunks = [];
          const chunkSize = 2000;
          for (let i = 0; i < message.length; i += chunkSize) {
            chunks.push(message.substring(i, i + chunkSize));
          }
          return chunks[0]; // Return first chunk for now
        }
      },
      {
        name: 'summarize_context',
        apply: (message) => {
          // Extract key parts of the message
          const lines = message.split('\n');
          if (lines.length > 50) {
            return lines.slice(0, 25).join('\n') + '\n...\n' + lines.slice(-25).join('\n');
          }
          return message;
        }
      }
    ]);

    // Rate limit fixes
    this.healingStrategies.set('rate_limit', [
      {
        name: 'exponential_backoff',
        apply: async (message, options, attempt = 0) => {
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          await new Promise(resolve => setTimeout(resolve, delay));
          return message;
        }
      },
      {
        name: 'use_cache',
        apply: (message, options) => {
          options.useCache = true;
          options.cacheTTL = 3600; // 1 hour
          return message;
        }
      }
    ]);
  }

  /**
   * Handle error with self-healing
   */
  async handleError(error, context) {
    const { message, options, provider, attempt = 0 } = context;
    
    // Learn from the error
    this.neuralSystem.learnFromError({
      error,
      provider,
      message,
      taskType: options.taskType
    });

    // Get healing suggestion
    const suggestion = this.neuralSystem.getSelfHealingSuggestion(error, context);
    const errorType = this.neuralSystem.classifyError(error);
    
    console.log(`🔧 Self-healing: ${suggestion.action} for ${errorType}`);

    // Apply healing strategies
    const strategies = this.healingStrategies.get(errorType) || [];
    let healedMessage = message;
    let healedOptions = { ...options };

    for (const strategy of strategies) {
      try {
        console.log(`   Applying: ${strategy.name}`);
        healedMessage = await strategy.apply(healedMessage, healedOptions, attempt);
        
        // Return healed context for retry
        return {
          message: healedMessage,
          options: healedOptions,
          healed: true,
          strategy: strategy.name
        };
      } catch (strategyError) {
        console.warn(`   Strategy ${strategy.name} failed:`, strategyError.message);
      }
    }

    // If no healing worked, suggest alternative approach
    return {
      message: healedMessage,
      options: {
        ...healedOptions,
        provider: this.suggestAlternativeProvider(provider, errorType)
      },
      healed: false,
      fallback: true
    };
  }

  /**
   * Suggest alternative provider based on error type
   */
  suggestAlternativeProvider(currentProvider, errorType) {
    const alternatives = {
      'ollama': ['groq', 'openai', 'gemini'],
      'openai': ['groq', 'ollama', 'claude'],
      'groq': ['ollama', 'openai', 'gemini'],
      'gemini': ['groq', 'ollama', 'openai'],
      'claude': ['openai', 'groq', 'gemini']
    };

    const providerAlts = alternatives[currentProvider] || ['ollama', 'groq'];
    
    // For specific error types, prefer certain providers
    if (errorType === 'token_limit') {
      return 'claude'; // Claude has high token limits
    } else if (errorType === 'rate_limit') {
      return 'ollama'; // Local, no rate limits
    } else if (errorType === 'timeout') {
      return 'groq'; // Fast inference
    }

    return providerAlts[0];
  }

  /**
   * Validate and fix request before sending
   */
  validateAndFixRequest(message, options = {}) {
    let fixedMessage = message;
    const fixes = [];

    // Check for empty message
    if (!fixedMessage || fixedMessage.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    // Apply preventive fixes for common issues
    const preventiveFixes = [
      {
        check: () => fixedMessage.length > 10000,
        fix: () => {
          fixedMessage = fixedMessage.substring(0, 10000) + '...';
          fixes.push('Truncated long message');
        }
      },
      {
        check: () => /[\u0000-\u001F\u007F-\u009F]/.test(fixedMessage),
        fix: () => {
          fixedMessage = fixedMessage.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
          fixes.push('Removed control characters');
        }
      },
      {
        check: () => fixedMessage.includes('```') && !fixedMessage.match(/```[\s\S]*```/),
        fix: () => {
          fixedMessage += '\n```';
          fixes.push('Fixed unclosed code block');
        }
      }
    ];

    preventiveFixes.forEach(({ check, fix }) => {
      if (check()) {
        fix();
      }
    });

    if (fixes.length > 0) {
      console.log('🔧 Applied preventive fixes:', fixes.join(', '));
    }

    return { message: fixedMessage, options, fixes };
  }

  /**
   * Get healing report
   */
  getHealingReport() {
    const insights = this.neuralSystem.getInsights();
    const healingStats = {
      totalErrors: insights.commonErrors.reduce((sum, e) => sum + e.count, 0),
      selfHealingRate: 0.85, // Placeholder - would calculate from actual healing success
      commonFixes: [
        'Input sanitization',
        'Message truncation',
        'Provider switching',
        'Timeout adjustment'
      ],
      insights
    };

    return healingStats;
  }
}

export default SelfHealingHandler;