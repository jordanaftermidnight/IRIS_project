#!/usr/bin/env node

/**
 * Message Formatter for API Requests
 * Ensures proper message formatting to prevent API errors
 * 
 * @author Jordan After Midnight (concept and architecture)
 * @author Claude AI (implementation assistance)
 * @copyright 2025 Jordan After Midnight. All rights reserved.
 */

export class MessageFormatter {
  constructor() {
    this.providers = {
      claude: this.formatClaudeMessages.bind(this),
      openai: this.formatOpenAIMessages.bind(this),
      groq: this.formatGroqMessages.bind(this),
      gemini: this.formatGeminiMessages.bind(this)
    };
  }

  /**
   * Format messages for specific provider
   */
  formatMessages(provider, messages, options = {}) {
    const formatter = this.providers[provider] || this.formatDefaultMessages.bind(this);
    return formatter(messages, options);
  }

  /**
   * Strip tool-related messages that cause 400 errors
   */
  stripToolMessages(messages) {
    return messages.filter(msg => {
      // Remove any tool_use or tool_result messages
      if (msg.type === 'tool_use' || msg.type === 'tool_result') {
        return false;
      }
      // Remove messages with tool-related content
      if (msg.content && typeof msg.content === 'object') {
        if (msg.content.type === 'tool_use' || msg.content.type === 'tool_result') {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Format messages for Claude
   */
  formatClaudeMessages(messages, options) {
    // Ensure messages is an array
    if (!Array.isArray(messages)) {
      messages = [{ role: 'user', content: String(messages) }];
    }

    // Strip problematic tool messages
    messages = this.stripToolMessages(messages);

    // Ensure proper role alternation
    const formatted = [];
    let lastRole = null;

    for (const msg of messages) {
      // Skip empty messages
      if (!msg.content) continue;

      // Ensure valid role
      const role = msg.role || 'user';
      if (!['user', 'assistant', 'system'].includes(role)) {
        continue;
      }

      // Convert system messages to user messages for Claude
      if (role === 'system' && formatted.length === 0) {
        formatted.push({
          role: 'user',
          content: `System: ${msg.content}`
        });
        lastRole = 'user';
      } else if (role === lastRole) {
        // Merge consecutive messages with same role
        formatted[formatted.length - 1].content += '\n\n' + msg.content;
      } else {
        formatted.push({
          role: role,
          content: String(msg.content)
        });
        lastRole = role;
      }
    }

    // Ensure conversation starts with user
    if (formatted.length > 0 && formatted[0].role !== 'user') {
      formatted.unshift({ role: 'user', content: 'Begin conversation' });
    }

    // Ensure conversation ends with user
    if (formatted.length > 0 && formatted[formatted.length - 1].role !== 'user') {
      formatted.push({ role: 'user', content: 'Please respond' });
    }

    return formatted;
  }

  /**
   * Format messages for OpenAI
   */
  formatOpenAIMessages(messages, options) {
    if (!Array.isArray(messages)) {
      messages = [{ role: 'user', content: String(messages) }];
    }

    messages = this.stripToolMessages(messages);

    return messages.map(msg => ({
      role: msg.role || 'user',
      content: String(msg.content || '')
    }));
  }

  /**
   * Format messages for Groq
   */
  formatGroqMessages(messages, options) {
    // Groq uses same format as OpenAI
    return this.formatOpenAIMessages(messages, options);
  }

  /**
   * Format messages for Gemini
   */
  formatGeminiMessages(messages, options) {
    if (!Array.isArray(messages)) {
      messages = [{ role: 'user', content: String(messages) }];
    }

    messages = this.stripToolMessages(messages);

    // Gemini expects 'parts' instead of 'content'
    return messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(msg.content || '') }]
    }));
  }

  /**
   * Default message formatting
   */
  formatDefaultMessages(messages, options) {
    if (!Array.isArray(messages)) {
      return [{ role: 'user', content: String(messages) }];
    }

    return this.stripToolMessages(messages).map(msg => ({
      role: msg.role || 'user',
      content: String(msg.content || '')
    }));
  }

  /**
   * Validate message structure
   */
  validateMessageStructure(messages) {
    if (!Array.isArray(messages) || messages.length === 0) {
      return { valid: false, error: 'Messages must be a non-empty array' };
    }

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      if (!msg.role) {
        return { valid: false, error: `Message at index ${i} missing role` };
      }

      if (!msg.content && !msg.parts) {
        return { valid: false, error: `Message at index ${i} missing content` };
      }

      // Check for tool messages that might cause errors
      if (msg.type === 'tool_use' || msg.type === 'tool_result') {
        return { valid: false, error: 'Tool messages detected - these will cause API errors' };
      }
    }

    return { valid: true };
  }
}

export const messageFormatter = new MessageFormatter();