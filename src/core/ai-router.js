#!/usr/bin/env node

import { integrityChecker } from './integrity-checker.js';
import { usageMonitor } from './usage-monitor.js';

/**
 * Smart AI Router - Intelligently routes requests to the best available provider
 * Enhanced with security and usage monitoring
 * 
 * @author Jordan After Midnight (concept and architecture)
 * @author Claude AI (implementation assistance)
 * @copyright 2025 Jordan After Midnight. All rights reserved.
 */
export class AIRouter {
  constructor() {
    this.providers = new Map();
    this.fallbackOrder = [];
    this.requestHistory = [];
    this.providerStats = new Map();
  }

  /**
   * Register an AI provider
   */
  registerProvider(provider) {
    this.providers.set(provider.name, provider);
    this.providerStats.set(provider.name, {
      requests: 0,
      successes: 0,
      failures: 0,
      avgResponseTime: 0,
      totalCost: 0
    });
  }

  /**
   * Set fallback order for providers
   */
  setFallbackOrder(order) {
    this.fallbackOrder = order;
  }

  /**
   * Smart provider selection based on task type, availability, and performance
   */
  async selectProvider(taskType = 'balanced', options = {}) {
    const availableProviders = [];
    
    // Check availability of all providers
    for (const [name, provider] of this.providers) {
      try {
        const isAvailable = await provider.isAvailable();
        if (isAvailable) {
          availableProviders.push({
            name,
            provider,
            priority: provider.priority || 10,
            cost: provider.costPerToken || 0,
            stats: this.providerStats.get(name)
          });
        }
      } catch (error) {
        // Provider availability check failed - silent fallback
      }
    }

    if (availableProviders.length === 0) {
      throw new Error('No AI providers are currently available');
    }

    // Scoring algorithm for provider selection
    const scoredProviders = availableProviders.map(({ name, provider, priority, cost, stats }) => {
      let score = 0;

      // Priority score (higher priority = higher score)
      score += (10 - priority) * 20;

      // Success rate score
      const successRate = stats.requests > 0 ? stats.successes / stats.requests : 1;
      score += successRate * 30;

      // Speed score (lower response time = higher score)
      const speedScore = stats.avgResponseTime > 0 ? Math.max(0, 100 - stats.avgResponseTime / 100) : 50;
      score += speedScore * 20;

      // Cost score (heavily favor free local models)
      const costScore = cost === 0 ? 50 : Math.max(0, 30 - cost * 1000);
      score += costScore;

      // Strong bonus for Ollama/Mistral to minimize API costs
      if (name === 'ollama') score += 25;

      // Enhanced task-specific routing with all providers
      
      // Ollama (free, local) - prioritize for most tasks
      if (taskType === 'fast' && name === 'ollama') score += 25;
      if (taskType === 'code' && name === 'ollama') score += 20;
      if (taskType === 'creative' && name === 'ollama') score += 15;
      if (taskType === 'analysis' && name === 'ollama') score += 10;
      if (taskType === 'vision' && name === 'ollama') score += 15;
      if (taskType === 'reasoning' && name === 'ollama') score += 8; // Slightly lower for complex reasoning
      
      // Groq - ultra-fast responses, low cost
      if (taskType === 'fast' && name === 'groq') score += 22;
      if (taskType === 'code' && name === 'groq') score += 15;
      if (taskType === 'creative' && name === 'groq') score += 12;
      if (taskType === 'balanced' && name === 'groq') score += 10;
      
      // OpenAI - best for complex reasoning and advanced coding
      if (taskType === 'complex' && name === 'openai') score += 20;
      if (taskType === 'reasoning' && name === 'openai') score += 25;
      if (taskType === 'code' && name === 'openai') score += 18;
      if (taskType === 'analysis' && name === 'openai') score += 15;
      if (taskType === 'vision' && name === 'openai') score += 20;
      
      // Gemini - multimodal and creative tasks
      if (taskType === 'creative' && name === 'gemini') score += 12;
      if (taskType === 'analysis' && name === 'gemini') score += 10;
      if (taskType === 'vision' && name === 'gemini') score += 15;
      if (taskType === 'multimodal' && name === 'gemini') score += 18;
      
      // Claude - general reasoning (lower priority due to cost)
      if (taskType === 'complex' && name === 'claude') score += 10;
      if (taskType === 'reasoning' && name === 'claude') score += 8;
      if (taskType === 'creative' && name === 'claude') score += 6;
      if (taskType === 'analysis' && name === 'claude') score += 6;
      
      // Specialized task routing
      if (taskType === 'github' && name === 'ollama') score += 20;
      if (taskType === 'build' && name === 'ollama') score += 18;
      if (taskType === 'deploy' && name === 'openai') score += 12;
      if (taskType === 'ultra_fast' && name === 'groq') score += 30;

      // Privacy preference
      if (options.preferLocal && provider.getCapabilities().privacy === 'local') {
        score += 25;
      }

      // Budget constraints
      if (options.maxCost && cost > options.maxCost) {
        score -= 50;
      }

      return { name, provider, score };
    });

    // Sort by score (highest first)
    scoredProviders.sort((a, b) => b.score - a.score);

    // Return the best provider
    return scoredProviders[0].provider;
  }

  /**
   * Execute request with automatic fallback and security checks
   */
  async executeRequest(message, options = {}) {
    // Perform security check before processing
    const securityCheck = integrityChecker.performSecurityCheck(message);
    
    if (!securityCheck.allowed) {
      const error = new Error('Request blocked by security policy');
      error.violations = [...securityCheck.ethical, ...securityCheck.integrity];
      throw error;
    }

    // Log usage for monitoring
    usageMonitor.logUsage({
      type: 'ai_request',
      message: message.length > 100 ? message.substring(0, 100) + '...' : message,
      taskType: options.taskType || 'balanced',
      provider: options.provider
    });

    const taskType = options.taskType || 'balanced';
    const maxRetries = options.maxRetries || 2;
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const provider = await this.selectProvider(taskType, options);
        const startTime = Date.now();
        
        // Provider selected for task execution

        let result;
        if (options.stream) {
          result = await provider.streamChat(message, options);
        } else {
          result = await provider.chat(message, options);
        }

        const responseTime = Date.now() - startTime;
        
        // Update provider statistics
        this.updateProviderStats(provider.name, true, responseTime, result.usage?.cost || 0);
        
        // Add to request history
        this.requestHistory.push({
          message: message.substring(0, 100) + '...',
          provider: provider.name,
          taskType,
          success: true,
          responseTime,
          timestamp: new Date().toISOString()
        });

        return result;

      } catch (error) {
        lastError = error;
        // Provider failed - attempting fallback
        
        if (error.message.includes('quota') || error.message.includes('rate limit')) {
          // Rate limit reached - trying alternative provider
          continue;
        }
        
        // Update failure stats
        const failedProvider = await this.selectProvider(taskType, options).catch(() => null);
        if (failedProvider) {
          this.updateProviderStats(failedProvider.name, false, 0, 0);
        }
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Update provider performance statistics
   */
  updateProviderStats(providerName, success, responseTime, cost) {
    const stats = this.providerStats.get(providerName);
    if (!stats) return;

    stats.requests++;
    if (success) {
      stats.successes++;
      stats.avgResponseTime = (stats.avgResponseTime * (stats.successes - 1) + responseTime) / stats.successes;
      stats.totalCost += cost;
    } else {
      stats.failures++;
    }
  }

  /**
   * Get provider performance statistics
   */
  getProviderStats() {
    const stats = {};
    for (const [name, provider] of this.providers) {
      const providerStats = this.providerStats.get(name);
      stats[name] = {
        ...providerStats,
        capabilities: provider.getCapabilities(),
        successRate: providerStats.requests > 0 ? 
          (providerStats.successes / providerStats.requests * 100).toFixed(1) + '%' : 
          'N/A'
      };
    }
    return stats;
  }

  /**
   * Get request history
   */
  getRequestHistory(limit = 10) {
    return this.requestHistory.slice(-limit);
  }

  /**
   * Health check for all providers
   */
  async healthCheckAll() {
    const results = {};
    
    for (const [name, provider] of this.providers) {
      try {
        results[name] = await provider.healthCheck();
      } catch (error) {
        results[name] = {
          status: 'error',
          provider: name,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }
    
    return results;
  }

  /**
   * Compare providers for a specific task
   */
  async compareProviders(message, taskType = 'balanced', providers = []) {
    const results = [];
    const targetProviders = providers.length > 0 ? providers : Array.from(this.providers.keys());
    
    for (const providerName of targetProviders) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;
      
      try {
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) continue;
        
        const startTime = Date.now();
        const result = await provider.chat(message, { taskType });
        const responseTime = Date.now() - startTime;
        
        results.push({
          provider: providerName,
          response: result.response,
          responseTime,
          cost: result.usage?.cost || 0,
          model: result.model,
          success: true
        });
        
      } catch (error) {
        results.push({
          provider: providerName,
          error: error.message,
          success: false
        });
      }
    }
    
    return results;
  }
}

export default AIRouter;