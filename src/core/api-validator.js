#!/usr/bin/env node

/**
 * API Request Validator
 * Validates and sanitizes API requests to prevent 400 errors
 * 
 * @author Jordan After Midnight
 * @copyright 2025 Jordan After Midnight. All rights reserved.
 */

export class ApiValidator {
  constructor() {
    this.maxMessageLength = 10000;
    this.maxTokens = 4096;
    this.validRoles = ['system', 'user', 'assistant'];
  }

  /**
   * Validate and fix API request
   */
  validateRequest(provider, messages, options = {}) {
    const validated = {
      messages: this.validateMessages(messages),
      options: this.validateOptions(provider, options),
      isValid: true,
      warnings: []
    };

    // Provider-specific validation
    switch (provider) {
      case 'groq':
        validated.options.maxTokens = Math.min(validated.options.maxTokens || 2000, 32768);
        break;
      case 'openai':
        validated.options.maxTokens = Math.min(validated.options.maxTokens || 2000, 4096);
        break;
      case 'claude':
        validated.options.maxTokens = Math.min(validated.options.maxTokens || 2000, 4096);
        break;
    }

    return validated;
  }

  /**
   * Validate messages array
   */
  validateMessages(messages) {
    if (!Array.isArray(messages)) {
      messages = [{ role: 'user', content: String(messages) }];
    }

    return messages.map(msg => {
      // Ensure message has required fields
      if (!msg.role || !this.validRoles.includes(msg.role)) {
        msg.role = 'user';
      }

      // Ensure content is string
      if (typeof msg.content !== 'string') {
        msg.content = String(msg.content || '');
      }

      // Truncate overly long messages
      if (msg.content.length > this.maxMessageLength) {
        msg.content = msg.content.substring(0, this.maxMessageLength) + '... [truncated]';
      }

      // Remove problematic characters
      msg.content = this.sanitizeContent(msg.content);

      return msg;
    });
  }

  /**
   * Validate options
   */
  validateOptions(provider, options) {
    const validated = { ...options };

    // Ensure temperature is valid
    if (validated.temperature !== undefined) {
      validated.temperature = Math.max(0, Math.min(2, validated.temperature));
    }

    // Ensure maxTokens is valid
    if (validated.maxTokens !== undefined) {
      validated.maxTokens = Math.max(1, Math.min(this.maxTokens, validated.maxTokens));
    }

    // Remove invalid options
    delete validated.undefined;
    delete validated.null;

    return validated;
  }

  /**
   * Sanitize content
   */
  sanitizeContent(content) {
    // Remove null bytes and control characters
    content = content.replace(/\0/g, '');
    content = content.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    
    // Fix common encoding issues
    content = content.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width spaces
    
    // Ensure valid UTF-8
    try {
      content = Buffer.from(content, 'utf8').toString('utf8');
    } catch (e) {
      // Fallback to ASCII if UTF-8 fails
      content = content.replace(/[^\x00-\x7F]/g, '?');
    }

    return content.trim();
  }

  /**
   * Validate API key
   */
  validateApiKey(key) {
    if (!key || typeof key !== 'string') {
      return { valid: false, error: 'API key is missing' };
    }

    if (key.length < 10) {
      return { valid: false, error: 'API key is too short' };
    }

    if (key.includes(' ') || key.includes('\n')) {
      return { valid: false, error: 'API key contains invalid characters' };
    }

    return { valid: true };
  }

  /**
   * Fix common API errors
   */
  fixCommonErrors(error, context) {
    const errorStr = error.toString().toLowerCase();
    
    if (errorStr.includes('tool_use') && errorStr.includes('tool_result')) {
      // Fix tool use/result mismatch
      return {
        fixed: true,
        action: 'retry',
        modifications: {
          stripToolMessages: true
        }
      };
    }

    if (errorStr.includes('invalid model')) {
      // Use fallback model
      return {
        fixed: true,
        action: 'retry',
        modifications: {
          model: this.getFallbackModel(context.provider)
        }
      };
    }

    if (errorStr.includes('context length exceeded')) {
      // Reduce token count
      return {
        fixed: true,
        action: 'retry',
        modifications: {
          maxTokens: Math.floor((context.maxTokens || 2000) / 2),
          truncateMessages: true
        }
      };
    }

    return { fixed: false };
  }

  /**
   * Get fallback model
   */
  getFallbackModel(provider) {
    const fallbacks = {
      groq: 'llama-3.1-8b-instant',
      openai: 'gpt-3.5-turbo',
      claude: 'claude-3-sonnet-20240229',
      gemini: 'gemini-pro'
    };

    return fallbacks[provider] || 'gpt-3.5-turbo';
  }
}

export const apiValidator = new ApiValidator();