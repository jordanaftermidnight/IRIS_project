#!/usr/bin/env node

/**
 * Enhanced Request Handler with Timeout and Error Recovery
 * 
 * @author Jordan After Midnight (concept and architecture)
 * @author Claude AI (implementation assistance)
 * @copyright 2025 Jordan After Midnight. All rights reserved.
 */

import { messageFormatter } from './message-formatter.js';
import { apiValidator } from './api-validator.js';

export class RequestHandler {
  constructor() {
    this.defaultTimeout = 30000; // 30 seconds
    this.maxRetries = 3;
    this.retryDelays = [1000, 2000, 5000]; // Exponential backoff
  }

  /**
   * Execute request with timeout and retry logic
   */
  async executeWithTimeout(provider, requestFn, options = {}) {
    const timeout = options.timeout || this.defaultTimeout;
    const maxRetries = options.maxRetries || this.maxRetries;
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, timeout);

        // Execute request with timeout
        const result = await Promise.race([
          requestFn({ ...options, signal: controller.signal }),
          new Promise((_, reject) => {
            controller.signal.addEventListener('abort', () => {
              reject(new Error(`Request timed out after ${timeout}ms`));
            });
          })
        ]);

        clearTimeout(timeoutId);
        return result;

      } catch (error) {
        lastError = error;
        
        // Handle specific errors
        const recovery = await this.handleError(error, {
          provider,
          attempt,
          options
        });

        if (!recovery.retry) {
          throw error;
        }

        // Apply recovery modifications
        if (recovery.modifications) {
          Object.assign(options, recovery.modifications);
        }

        // Wait before retry
        if (attempt < maxRetries - 1) {
          const delay = this.retryDelays[attempt] || 5000;
          console.log(`⏳ Retrying in ${delay}ms (attempt ${attempt + 2}/${maxRetries})`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * Handle errors and determine recovery strategy
   */
  async handleError(error, context) {
    const errorMsg = error.message?.toLowerCase() || '';
    const errorStr = error.toString().toLowerCase();

    // API 400 - Bad Request
    if (errorStr.includes('400') || errorStr.includes('bad request')) {
      if (errorStr.includes('tool_use') && errorStr.includes('tool_result')) {
        return {
          retry: true,
          modifications: {
            stripToolMessages: true,
            reformatMessages: true
          }
        };
      }
      return {
        retry: true,
        modifications: {
          validateRequest: true,
          reduceComplexity: true
        }
      };
    }

    // API 401 - Unauthorized
    if (errorStr.includes('401') || errorStr.includes('unauthorized')) {
      console.error('🔑 API key invalid or expired');
      return { retry: false };
    }

    // API 429 - Rate Limit
    if (errorStr.includes('429') || errorStr.includes('rate limit')) {
      const delay = this.extractRetryDelay(error) || 10000;
      return {
        retry: true,
        modifications: {
          retryDelay: delay,
          useAlternateProvider: context.attempt > 1
        }
      };
    }

    // Timeout errors
    if (errorStr.includes('timeout') || errorStr.includes('timed out')) {
      return {
        retry: true,
        modifications: {
          timeout: context.options.timeout * 1.5,
          reduceTokens: true
        }
      };
    }

    // Model errors
    if (errorStr.includes('model') && (errorStr.includes('not found') || errorStr.includes('invalid'))) {
      return {
        retry: true,
        modifications: {
          useFallbackModel: true
        }
      };
    }

    // Context length errors
    if (errorStr.includes('context') || errorStr.includes('token')) {
      return {
        retry: true,
        modifications: {
          maxTokens: Math.floor((context.options.maxTokens || 2000) / 2),
          truncateInput: true
        }
      };
    }

    // Network errors
    if (errorStr.includes('econnrefused') || errorStr.includes('enotfound')) {
      return {
        retry: context.attempt < 2,
        modifications: {
          checkConnection: true
        }
      };
    }

    // Default: retry with backoff
    return {
      retry: context.attempt < context.maxRetries - 1
    };
  }

  /**
   * Extract retry delay from rate limit error
   */
  extractRetryDelay(error) {
    const match = error.message?.match(/retry.*?(\d+)/i);
    if (match) {
      return parseInt(match[1]) * 1000;
    }
    return null;
  }

  /**
   * Prepare request with validation
   */
  prepareRequest(provider, messages, options = {}) {
    // Format messages for provider
    const formatted = messageFormatter.formatMessages(provider, messages, options);
    
    // Validate messages
    const validation = messageFormatter.validateMessageStructure(formatted);
    if (!validation.valid) {
      throw new Error(`Invalid message format: ${validation.error}`);
    }

    // Validate request parameters
    const validated = apiValidator.validateRequest(provider, formatted, options);
    
    return {
      messages: validated.messages,
      options: validated.options
    };
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create safe API caller with all protections
   */
  createSafeApiCaller(provider, apiMethod) {
    return async (messages, options = {}) => {
      // Prepare and validate request
      const { messages: preparedMessages, options: preparedOptions } = 
        this.prepareRequest(provider, messages, options);

      // Execute with timeout and retry
      return await this.executeWithTimeout(
        provider,
        async (execOptions) => {
          return await apiMethod(preparedMessages, {
            ...preparedOptions,
            ...execOptions
          });
        },
        preparedOptions
      );
    };
  }
}

export const requestHandler = new RequestHandler();