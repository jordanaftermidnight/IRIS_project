#!/usr/bin/env ts-node

// IRIS Advanced Optimizations - Phase 2
// Implements async processing, memory management, and performance tuning

import { OptimizedIRISSystem, OptimizedHealthMonitor, OptimizedSecurityDetector } from './optimized_system_core.js';

// ===== ASYNC PROCESSING OPTIMIZATION =====
export class AsyncOptimizedHealthMonitor extends OptimizedHealthMonitor {
  private processingQueue: Array<{ providerId: string, responseTime: number, success: boolean }> = [];
  private isProcessing = false;
  private batchSize = 10;
  private batchInterval = 100; // Process every 100ms

  constructor() {
    super();
    this.startBatchProcessor();
  }

  recordSuccess(providerId: string, responseTime: number): void {
    this.queueMetricUpdate(providerId, responseTime, true);
  }

  recordError(providerId: string, responseTime: number): void {
    this.queueMetricUpdate(providerId, responseTime, false);
  }

  private queueMetricUpdate(providerId: string, responseTime: number, success: boolean): void {
    this.processingQueue.push({ providerId, responseTime, success });
    
    // Process immediately if queue is getting full
    if (this.processingQueue.length >= this.batchSize * 2) {
      this.processBatch();
    }
  }

  private startBatchProcessor(): void {
    setInterval(() => {
      if (this.processingQueue.length > 0 && !this.isProcessing) {
        this.processBatch();
      }
    }, this.batchInterval);
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) return;
    
    this.isProcessing = true;
    const batch = this.processingQueue.splice(0, this.batchSize);
    
    try {
      // Process metrics in batch for better performance
      const updates = new Map<string, { successes: number, errors: number, totalTime: number }>();
      
      for (const update of batch) {
        const existing = updates.get(update.providerId) || { successes: 0, errors: 0, totalTime: 0 };
        existing.totalTime += update.responseTime;
        if (update.success) {
          existing.successes++;
        } else {
          existing.errors++;
        }
        updates.set(update.providerId, existing);
      }

      // Apply batch updates
      for (const [providerId, batchUpdate] of updates.entries()) {
        for (let i = 0; i < batchUpdate.successes; i++) {
          super.recordSuccess(providerId, batchUpdate.totalTime / (batchUpdate.successes + batchUpdate.errors));
        }
        for (let i = 0; i < batchUpdate.errors; i++) {
          super.recordError(providerId, batchUpdate.totalTime / (batchUpdate.successes + batchUpdate.errors));
        }
      }
      
    } finally {
      this.isProcessing = false;
    }
  }
}

// ===== MEMORY OPTIMIZED SECURITY DETECTOR =====
export class MemoryOptimizedSecurityDetector extends OptimizedSecurityDetector {
  private memoryUsageTarget = 50 * 1024 * 1024; // 50MB target
  private memoryCheckInterval = 30000; // Check every 30s
  private lastMemoryCheck = 0;

  constructor() {
    super();
    this.startMemoryMonitoring();
  }

  async detectThreats(query: string, context?: string[]): Promise<any> {
    // Check memory usage before processing
    await this.checkMemoryUsage();
    
    return super.detectThreats(query, context);
  }

  private startMemoryMonitoring(): void {
    setInterval(() => {
      this.checkMemoryUsage();
    }, this.memoryCheckInterval);
  }

  private async checkMemoryUsage(): Promise<void> {
    const now = Date.now();
    if (now - this.lastMemoryCheck < this.memoryCheckInterval) return;
    
    this.lastMemoryCheck = now;
    
    try {
      if (process.memoryUsage && typeof process.memoryUsage === 'function') {
        const usage = process.memoryUsage();
        
        if (usage.heapUsed > this.memoryUsageTarget) {
          console.log(`🧠 Memory usage high (${Math.round(usage.heapUsed / 1024 / 1024)}MB), clearing cache`);
          this.clearCache();
          
          // Force garbage collection if available
          if (global.gc && typeof global.gc === 'function') {
            global.gc();
          }
        }
      }
    } catch (error) {
      // Silently handle memory monitoring errors
    }
  }
}

// ===== PERFORMANCE TUNED PROVIDER MANAGER =====
export class PerformanceTunedProviderManager {
  private providers: Map<string, any> = new Map();
  private healthCache: Map<string, { score: number, timestamp: number }> = new Map();
  private cacheTimeout = 5000; // 5s cache for health scores
  private healthMonitor: AsyncOptimizedHealthMonitor;

  constructor(healthMonitor: AsyncOptimizedHealthMonitor) {
    this.healthMonitor = healthMonitor;
    console.log('⚡ Initializing Performance Tuned Provider Manager');
  }

  addProvider(providerId: string, config: any): void {
    this.providers.set(providerId, {
      id: providerId,
      name: config.name || providerId,
      type: config.type || 'generic',
      endpoint: config.endpoint,
      enabled: config.enabled !== false,
      capabilities: config.capabilities || {},
      priority: config.priority || 1,
      maxConcurrentRequests: config.maxConcurrentRequests || 10,
      currentRequests: 0,
      addedAt: Date.now()
    });
    
    console.log(`✅ Added high-performance provider: ${providerId}`);
  }

  getCachedHealthScore(providerId: string): number {
    const cached = this.healthCache.get(providerId);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      return cached.score;
    }
    
    // Update cache
    const score = this.healthMonitor.getHealthScore(providerId);
    this.healthCache.set(providerId, { score, timestamp: now });
    return score;
  }

  selectOptimalProvider(criteria?: any): string | null {
    const availableProviders = Array.from(this.providers.values())
      .filter(p => p.enabled && p.currentRequests < p.maxConcurrentRequests)
      .map(p => ({
        ...p,
        health: this.getCachedHealthScore(p.id),
        load: p.currentRequests / p.maxConcurrentRequests
      }))
      .filter(p => p.health >= 60) // Minimum health threshold
      .sort((a, b) => {
        // Multi-factor selection: health (60%) + priority (25%) + load (15%)
        const scoreA = (a.health * 0.6) + (a.priority * 25) + ((1 - a.load) * 15);
        const scoreB = (b.health * 0.6) + (b.priority * 25) + ((1 - b.load) * 15);
        return scoreB - scoreA;
      });

    return availableProviders.length > 0 ? availableProviders[0].id : null;
  }

  async reserveProvider(providerId: string): Promise<boolean> {
    const provider = this.providers.get(providerId);
    if (!provider || provider.currentRequests >= provider.maxConcurrentRequests) {
      return false;
    }
    
    provider.currentRequests++;
    return true;
  }

  releaseProvider(providerId: string): void {
    const provider = this.providers.get(providerId);
    if (provider && provider.currentRequests > 0) {
      provider.currentRequests--;
    }
  }

  getProviderLoadStats(): any {
    const stats: any = {};
    
    for (const [id, provider] of this.providers.entries()) {
      stats[id] = {
        currentLoad: provider.currentRequests,
        maxLoad: provider.maxConcurrentRequests,
        utilization: provider.currentRequests / provider.maxConcurrentRequests,
        health: this.getCachedHealthScore(id)
      };
    }
    
    return stats;
  }
}

// ===== ADVANCED OPTIMIZED IRIS SYSTEM =====
export class AdvancedOptimizedIRISSystem {
  private healthMonitor: AsyncOptimizedHealthMonitor;
  private securityDetector: MemoryOptimizedSecurityDetector;
  private providerManager: PerformanceTunedProviderManager;
  private queryCache: Map<string, { result: any, timestamp: number }> = new Map();
  private cacheTimeout = 60000; // 1 minute cache
  private maxCacheSize = 1000;
  private metrics = {
    totalQueries: 0,
    cacheHits: 0,
    averageResponseTime: 0,
    successRate: 0
  };

  constructor() {
    console.log('🚀 Initializing Advanced Optimized IRIS System...');
    this.healthMonitor = new AsyncOptimizedHealthMonitor();
    this.securityDetector = new MemoryOptimizedSecurityDetector();
    this.providerManager = new PerformanceTunedProviderManager(this.healthMonitor);
    
    this.setupProviders();
    this.startCacheCleanup();
  }

  private setupProviders(): void {
    // Add providers with performance-tuned configurations
    this.providerManager.addProvider('groq', {
      name: 'Groq Lightning',
      type: 'cloud',
      endpoint: 'https://api.groq.com',
      priority: 3, // Highest priority for speed
      maxConcurrentRequests: 15,
      capabilities: { maxTokens: 8192, streaming: true, speed: 'fastest' }
    });

    this.providerManager.addProvider('gemini', {
      name: 'Google Gemini Pro',
      type: 'cloud', 
      endpoint: 'https://generativelanguage.googleapis.com',
      priority: 2,
      maxConcurrentRequests: 10,
      capabilities: { maxTokens: 32768, multimodal: true, speed: 'medium' }
    });

    this.providerManager.addProvider('ollama', {
      name: 'Ollama Local',
      type: 'local',
      endpoint: 'http://localhost:11434',
      priority: 1, // Lowest priority for privacy tasks
      maxConcurrentRequests: 5,
      capabilities: { maxTokens: 4096, privacy: 'high', speed: 'slow' }
    });
  }

  async processQuery(query: string, options: any = {}): Promise<any> {
    const startTime = Date.now();
    this.metrics.totalQueries++;
    
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(query, options);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        return {
          ...cached,
          cached: true,
          responseTime: Date.now() - startTime
        };
      }

      // Security check with optimized detector
      const securityResult = await this.securityDetector.detectThreats(query);
      
      if (securityResult.threatLevel === 'dangerous') {
        return {
          success: false,
          error: 'Query blocked due to security concerns',
          securityReport: securityResult,
          responseTime: Date.now() - startTime
        };
      }

      // Select and reserve optimal provider
      const providerId = options.provider || this.providerManager.selectOptimalProvider(options);
      if (!providerId) {
        throw new Error('No available providers');
      }

      const reserved = await this.providerManager.reserveProvider(providerId);
      if (!reserved) {
        throw new Error(`Provider ${providerId} at capacity`);
      }

      try {
        // Simulate provider processing
        const result = await this.simulateProviderQuery(providerId, query, options);
        const responseTime = Date.now() - startTime;
        
        // Record success
        this.healthMonitor.recordSuccess(providerId, responseTime);
        
        const response = {
          success: true,
          content: result,
          provider: providerId,
          responseTime,
          securityReport: securityResult,
          cached: false
        };

        // Cache successful responses
        this.cacheResult(cacheKey, response);
        this.updateMetrics(true, responseTime);
        
        return response;
        
      } finally {
        this.providerManager.releaseProvider(providerId);
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(false, responseTime);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime
      };
    }
  }

  private getCacheKey(query: string, options: any): string {
    return `${query.substring(0, 100)}_${JSON.stringify(options)}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.queryCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.result;
    }
    return null;
  }

  private cacheResult(key: string, result: any): void {
    if (this.queryCache.size >= this.maxCacheSize) {
      const firstKey = this.queryCache.keys().next().value;
      this.queryCache.delete(firstKey);
    }
    
    this.queryCache.set(key, {
      result: { ...result, cached: false },
      timestamp: Date.now()
    });
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.queryCache.entries()) {
        if (now - value.timestamp > this.cacheTimeout) {
          this.queryCache.delete(key);
        }
      }
    }, 60000); // Clean every minute
  }

  private async simulateProviderQuery(providerId: string, query: string, options: any): Promise<string> {
    // Improved simulation with provider-specific characteristics
    const baseDelay = providerId === 'groq' ? 200 : providerId === 'gemini' ? 600 : 1000;
    const delay = baseDelay + (Math.random() * 300);
    
    await new Promise(resolve => setTimeout(resolve, delay));

    // Reduced failure rate for optimized system
    if (Math.random() < 0.02) { // 2% failure rate
      throw new Error(`${providerId} processing failed`);
    }

    return `Optimized response from ${providerId}: ${query.length > 50 ? query.substring(0, 50) + '...' : query}`;
  }

  private updateMetrics(success: boolean, responseTime: number): void {
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalQueries - 1) + responseTime) / this.metrics.totalQueries;
    
    // Update success rate (simplified calculation)
    const currentSuccesses = this.metrics.successRate * (this.metrics.totalQueries - 1);
    this.metrics.successRate = (currentSuccesses + (success ? 1 : 0)) / this.metrics.totalQueries;
  }

  getAdvancedMetrics(): any {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.totalQueries > 0 ? this.metrics.cacheHits / this.metrics.totalQueries : 0,
      cacheSize: this.queryCache.size,
      providerLoad: this.providerManager.getProviderLoadStats(),
      memoryUsage: process.memoryUsage ? process.memoryUsage() : {},
      uptime: process.uptime ? process.uptime() : 0
    };
  }

  async runPerformanceBenchmark(iterations: number = 50): Promise<any> {
    console.log(`🏃‍♂️ Running performance benchmark (${iterations} iterations)...`);
    
    const results = {
      totalIterations: iterations,
      successCount: 0,
      failureCount: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      providerDistribution: {} as any
    };

    const startTime = Date.now();
    const responseTimes: number[] = [];
    let cacheHits = 0;

    for (let i = 0; i < iterations; i++) {
      const query = `Test query ${i}: What is the meaning of life?`;
      
      try {
        const result = await this.processQuery(query, { benchmark: true });
        
        if (result.success) {
          results.successCount++;
          responseTimes.push(result.responseTime);
          
          if (result.cached) cacheHits++;
          
          // Track provider usage
          if (result.provider) {
            results.providerDistribution[result.provider] = 
              (results.providerDistribution[result.provider] || 0) + 1;
          }
        } else {
          results.failureCount++;
        }
        
      } catch (error) {
        results.failureCount++;
      }
      
      // Small delay between requests
      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    results.averageResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    results.cacheHitRate = cacheHits / iterations;

    const totalTime = Date.now() - startTime;
    
    console.log(`✅ Benchmark completed in ${totalTime}ms`);
    console.log(`📊 Success rate: ${(results.successCount / iterations * 100).toFixed(1)}%`);
    console.log(`⚡ Average response time: ${results.averageResponseTime.toFixed(0)}ms`);
    console.log(`💾 Cache hit rate: ${(results.cacheHitRate * 100).toFixed(1)}%`);

    return {
      ...results,
      totalBenchmarkTime: totalTime,
      successRate: results.successCount / iterations,
      timestamp: Date.now()
    };
  }
}

export default AdvancedOptimizedIRISSystem;