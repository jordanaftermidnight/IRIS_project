#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Neural Learning System for Iris
 * Learns from user interactions to improve responses and performance
 */

export class NeuralLearningSystem {
  constructor() {
    this.learningDataPath = path.join(os.homedir(), '.iris', 'learning-data.json');
    this.patterns = new Map();
    this.userPreferences = new Map();
    this.responseQuality = new Map();
    this.contextMemory = [];
    this.maxMemorySize = 1000;
    
    this.loadLearningData();
  }

  /**
   * Load existing learning data
   */
  loadLearningData() {
    try {
      if (fs.existsSync(this.learningDataPath)) {
        const data = JSON.parse(fs.readFileSync(this.learningDataPath, 'utf8'));
        this.patterns = new Map(data.patterns || []);
        this.userPreferences = new Map(data.preferences || []);
        this.responseQuality = new Map(data.quality || []);
        this.contextMemory = data.memory || [];
      }
    } catch (error) {
      console.log('🧠 Initializing new neural learning system');
    }
  }

  /**
   * Save learning data
   */
  saveLearningData() {
    try {
      const dir = path.dirname(this.learningDataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        patterns: Array.from(this.patterns.entries()),
        preferences: Array.from(this.userPreferences.entries()),
        quality: Array.from(this.responseQuality.entries()),
        memory: this.contextMemory.slice(-this.maxMemorySize)
      };

      fs.writeFileSync(this.learningDataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      // Silently fail - learning is optional enhancement
    }
  }

  /**
   * Learn from user interaction
   */
  async learnFromInteraction(interaction) {
    const { message, response, provider, taskType, responseTime, success } = interaction;
    
    // Extract patterns from message
    const patterns = this.extractPatterns(message);
    patterns.forEach(pattern => {
      const stats = this.patterns.get(pattern) || { count: 0, providers: {} };
      stats.count++;
      stats.providers[provider] = (stats.providers[provider] || 0) + 1;
      this.patterns.set(pattern, stats);
    });

    // Track provider performance
    const providerKey = `${provider}:${taskType}`;
    const performance = this.responseQuality.get(providerKey) || {
      successCount: 0,
      failureCount: 0,
      avgResponseTime: 0,
      totalRequests: 0
    };

    performance.totalRequests++;
    if (success) {
      performance.successCount++;
      performance.avgResponseTime = 
        (performance.avgResponseTime * (performance.totalRequests - 1) + responseTime) / 
        performance.totalRequests;
    } else {
      performance.failureCount++;
    }

    this.responseQuality.set(providerKey, performance);

    // Add to context memory
    this.contextMemory.push({
      timestamp: new Date().toISOString(),
      message: message.substring(0, 100),
      taskType,
      provider,
      success,
      responseTime
    });

    // Trim memory if needed
    if (this.contextMemory.length > this.maxMemorySize) {
      this.contextMemory = this.contextMemory.slice(-this.maxMemorySize);
    }

    // Save periodically
    if (performance.totalRequests % 10 === 0) {
      this.saveLearningData();
    }
  }

  /**
   * Extract patterns from message
   */
  extractPatterns(message) {
    const patterns = [];
    const words = message.toLowerCase().split(/\s+/);
    
    // Common programming patterns
    const codePatterns = ['function', 'class', 'api', 'error', 'bug', 'implement', 'create', 'fix'];
    const taskPatterns = ['explain', 'help', 'debug', 'optimize', 'refactor', 'test'];
    
    codePatterns.forEach(pattern => {
      if (message.toLowerCase().includes(pattern)) {
        patterns.push(`code:${pattern}`);
      }
    });

    taskPatterns.forEach(pattern => {
      if (words.includes(pattern)) {
        patterns.push(`task:${pattern}`);
      }
    });

    // Detect question patterns
    if (message.includes('?')) {
      patterns.push('type:question');
    }

    // Detect code blocks
    if (message.includes('```') || message.includes('function') || message.includes('const')) {
      patterns.push('has:code');
    }

    return patterns;
  }

  /**
   * Get recommended provider based on learning
   */
  getRecommendedProvider(message, taskType) {
    const patterns = this.extractPatterns(message);
    const providerScores = {};

    // Score based on pattern success
    patterns.forEach(pattern => {
      const stats = this.patterns.get(pattern);
      if (stats) {
        Object.entries(stats.providers).forEach(([provider, count]) => {
          providerScores[provider] = (providerScores[provider] || 0) + count;
        });
      }
    });

    // Score based on provider performance
    Object.entries(this.responseQuality).forEach(([key, performance]) => {
      const [provider, type] = key.split(':');
      if (type === taskType || taskType === 'balanced') {
        const score = performance.successCount / (performance.totalRequests || 1);
        const speedBonus = 1 / (performance.avgResponseTime || 1000);
        providerScores[provider] = (providerScores[provider] || 0) + score + speedBonus;
      }
    });

    // Return top scoring provider
    const sorted = Object.entries(providerScores).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || null;
  }

  /**
   * Predict best provider based on patterns
   */
  predictBestProvider(message, taskType) {
    return this.getRecommendedProvider(message, taskType);
  }

  /**
   * Learn from successful interaction
   */
  learnFromSuccess(context) {
    return this.learnFromInteraction({
      ...context,
      success: true
    });
  }

  /**
   * Learn from error
   */
  learnFromError(context) {
    return this.learnFromInteraction({
      message: context.message,
      provider: context.provider,
      taskType: context.taskType,
      success: false,
      error: context.error
    });
  }

  /**
   * Get user preferences
   */
  getUserPreferences() {
    const preferences = {
      preferredProviders: [],
      commonPatterns: [],
      averageResponseTime: 0
    };

    // Find most used providers
    const providerCounts = {};
    this.contextMemory.forEach(entry => {
      providerCounts[entry.provider] = (providerCounts[entry.provider] || 0) + 1;
    });
    
    preferences.preferredProviders = Object.entries(providerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([provider]) => provider);

    // Find common patterns
    preferences.commonPatterns = Array.from(this.patterns.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([pattern]) => pattern);

    // Calculate average response time
    const times = this.contextMemory
      .filter(e => e.success && e.responseTime)
      .map(e => e.responseTime);
    
    if (times.length > 0) {
      preferences.averageResponseTime = 
        times.reduce((a, b) => a + b, 0) / times.length;
    }

    return preferences;
  }

  /**
   * Optimize request based on learning
   */
  optimizeRequest(message, options = {}) {
    const optimized = { ...options };
    
    // Get recommended provider
    const recommended = this.getRecommendedProvider(message, options.taskType || 'balanced');
    if (recommended && !options.provider) {
      optimized.provider = recommended;
      console.log(`🧠 Neural recommendation: ${recommended} provider`);
    }

    // Adjust token limits based on patterns
    if (this.extractPatterns(message).includes('has:code')) {
      optimized.maxTokens = Math.min((options.maxTokens || 2000) * 1.5, 4000);
    }

    // Set temperature based on task type
    const patterns = this.extractPatterns(message);
    if (patterns.includes('task:explain') || patterns.includes('task:debug')) {
      optimized.temperature = 0.3; // More focused
    } else if (patterns.includes('task:create') || patterns.includes('code:implement')) {
      optimized.temperature = 0.7; // More creative
    }

    return optimized;
  }

  /**
   * Get learning insights
   */
  getInsights() {
    const insights = {
      totalInteractions: this.contextMemory.length,
      successRate: 0,
      topProviders: [],
      commonTasks: [],
      performanceByProvider: {}
    };

    // Calculate success rate
    const successful = this.contextMemory.filter(e => e.success).length;
    insights.successRate = successful / (this.contextMemory.length || 1);

    // Get provider performance
    this.responseQuality.forEach((perf, key) => {
      const [provider] = key.split(':');
      if (!insights.performanceByProvider[provider]) {
        insights.performanceByProvider[provider] = {
          requests: 0,
          successRate: 0,
          avgResponseTime: 0
        };
      }
      
      const providerPerf = insights.performanceByProvider[provider];
      providerPerf.requests += perf.totalRequests;
      providerPerf.successRate = perf.successCount / (perf.totalRequests || 1);
      providerPerf.avgResponseTime = perf.avgResponseTime;
    });

    // Get top providers
    insights.topProviders = Object.entries(insights.performanceByProvider)
      .sort((a, b) => b[1].successRate - a[1].successRate)
      .slice(0, 3)
      .map(([provider, stats]) => ({ provider, ...stats }));

    // Get common tasks
    insights.commonTasks = Array.from(this.patterns.entries())
      .filter(([pattern]) => pattern.startsWith('task:'))
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([pattern, stats]) => ({
        task: pattern.replace('task:', ''),
        count: stats.count
      }));

    return insights;
  }
}

export const neuralLearning = new NeuralLearningSystem();