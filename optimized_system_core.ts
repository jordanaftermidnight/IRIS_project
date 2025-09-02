#!/usr/bin/env ts-node

// IRIS Optimized System Core - Fixed Import Issues & Enhanced Performance
// Addresses all critical blocking issues identified in system analysis

// ===== OPTIMIZED HEALTH MONITOR =====
export class OptimizedHealthMonitor {
  private metrics: Map<string, any> = new Map();
  private healthScores: Map<string, number> = new Map();
  private anomalyThreshold = 2; // Reduced from 3-sigma for better sensitivity
  private metricsWindow = 30; // Reduced from 50 for faster response

  constructor() {
    console.log('🏥 Initializing Optimized Health Monitor');
  }

  recordSuccess(providerId: string, responseTime: number): void {
    this.updateMetrics(providerId, responseTime, true);
  }

  recordError(providerId: string, responseTime: number): void {
    this.updateMetrics(providerId, responseTime, false);
  }

  private updateMetrics(providerId: string, responseTime: number, success: boolean): void {
    if (!this.metrics.has(providerId)) {
      this.metrics.set(providerId, {
        successes: 0,
        failures: 0,
        totalTime: 0,
        requestCount: 0,
        recentTimes: [],
        lastUpdate: Date.now()
      });
    }

    const metrics = this.metrics.get(providerId)!;
    metrics.requestCount++;
    metrics.totalTime += responseTime;
    metrics.recentTimes.push(responseTime);
    
    if (metrics.recentTimes.length > this.metricsWindow) {
      metrics.recentTimes.shift();
    }

    if (success) {
      metrics.successes++;
    } else {
      metrics.failures++;
    }

    metrics.lastUpdate = Date.now();
    
    // Calculate health score with improved algorithm
    this.calculateHealthScore(providerId);
  }

  private calculateHealthScore(providerId: string): void {
    const metrics = this.metrics.get(providerId);
    if (!metrics || metrics.requestCount === 0) {
      this.healthScores.set(providerId, 100);
      return;
    }

    const successRate = metrics.successes / metrics.requestCount;
    const avgResponseTime = metrics.totalTime / metrics.requestCount;
    const recentPerformance = this.calculateRecentPerformance(metrics);
    
    // Improved health calculation with weighted factors
    let healthScore = 
      (successRate * 50) +           // 50% weight on success rate
      (recentPerformance * 30) +     // 30% weight on recent performance
      (this.getLatencyScore(avgResponseTime) * 20); // 20% weight on speed

    // Penalty for recent failures
    const recentFailures = metrics.recentTimes.length > 0 ? 
      (metrics.failures / metrics.requestCount) : 0;
    healthScore = Math.max(0, healthScore - (recentFailures * 30));

    this.healthScores.set(providerId, Math.round(Math.min(100, healthScore)));
  }

  private calculateRecentPerformance(metrics: any): number {
    if (metrics.recentTimes.length === 0) return 1;
    
    const avgRecent = metrics.recentTimes.reduce((a: number, b: number) => a + b, 0) / metrics.recentTimes.length;
    return Math.max(0, Math.min(1, 1 - (avgRecent / 5000))); // Good performance under 5s
  }

  private getLatencyScore(avgLatency: number): number {
    if (avgLatency < 500) return 1;      // Excellent
    if (avgLatency < 1000) return 0.8;   // Good
    if (avgLatency < 2000) return 0.6;   // Acceptable
    if (avgLatency < 5000) return 0.4;   // Poor
    return 0.2;                          // Very poor
  }

  getHealthScore(providerId: string): number {
    return this.healthScores.get(providerId) || 100;
  }

  getHealthReport(): any {
    const report: any = {
      timestamp: Date.now(),
      providers: {},
      systemHealth: 0
    };

    let totalHealth = 0;
    let providerCount = 0;

    for (const [providerId, health] of this.healthScores.entries()) {
      const metrics = this.metrics.get(providerId);
      report.providers[providerId] = {
        health,
        metrics: metrics || {},
        status: health > 80 ? 'healthy' : health > 60 ? 'warning' : 'critical'
      };
      totalHealth += health;
      providerCount++;
    }

    report.systemHealth = providerCount > 0 ? Math.round(totalHealth / providerCount) : 100;
    return report;
  }
}

// ===== OPTIMIZED SMART FAILOVER SYSTEM =====
export class OptimizedSmartFailover {
  private circuitBreakers: Map<string, any> = new Map();
  private failureThreshold = 2; // Reduced from 3 for faster response
  private recoveryTimeout = 3 * 60 * 1000; // Reduced from 5min to 3min
  private healthMonitor: OptimizedHealthMonitor;

  constructor(healthMonitor: OptimizedHealthMonitor) {
    this.healthMonitor = healthMonitor;
    console.log('🔄 Initializing Optimized Smart Failover');
  }

  async executeWithFailover(
    providerId: string, 
    operation: () => Promise<any>, 
    context?: any
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Check circuit breaker
      if (this.isCircuitOpen(providerId)) {
        throw new Error(`Circuit breaker open for ${providerId}`);
      }

      // Execute operation with timeout
      const result = await Promise.race([
        operation(),
        this.timeoutPromise(10000) // 10s timeout
      ]);

      // Record success
      const responseTime = Date.now() - startTime;
      this.recordSuccess(providerId, responseTime);
      
      return {
        success: true,
        result,
        provider: providerId,
        responseTime,
        failoverUsed: false
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordFailure(providerId, responseTime);
      
      // Attempt failover to next best provider
      const alternativeProvider = this.getAlternativeProvider(providerId, context);
      
      if (alternativeProvider) {
        console.log(`🔄 Failing over from ${providerId} to ${alternativeProvider}`);
        
        try {
          const fallbackResult = await this.executeWithFailover(
            alternativeProvider, 
            operation, 
            { ...context, originalProvider: providerId }
          );
          
          return {
            ...fallbackResult,
            failoverUsed: true,
            originalProvider: providerId
          };
        } catch (fallbackError) {
          // If failover also fails, return original error
          throw error;
        }
      }
      
      throw error;
    }
  }

  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), ms);
    });
  }

  private isCircuitOpen(providerId: string): boolean {
    const breaker = this.circuitBreakers.get(providerId);
    if (!breaker) return false;

    if (breaker.state === 'open') {
      if (Date.now() - breaker.openedAt > this.recoveryTimeout) {
        breaker.state = 'half-open';
        console.log(`🔧 Circuit breaker for ${providerId} moving to half-open`);
      } else {
        return true;
      }
    }

    return false;
  }

  private recordSuccess(providerId: string, responseTime: number): void {
    this.healthMonitor.recordSuccess(providerId, responseTime);
    
    const breaker = this.getOrCreateBreaker(providerId);
    breaker.failures = 0;
    breaker.lastSuccess = Date.now();
    
    if (breaker.state === 'half-open') {
      breaker.state = 'closed';
      console.log(`✅ Circuit breaker for ${providerId} closed`);
    }
  }

  private recordFailure(providerId: string, responseTime: number): void {
    this.healthMonitor.recordError(providerId, responseTime);
    
    const breaker = this.getOrCreateBreaker(providerId);
    breaker.failures++;
    breaker.lastFailure = Date.now();

    if (breaker.failures >= this.failureThreshold && breaker.state !== 'open') {
      breaker.state = 'open';
      breaker.openedAt = Date.now();
      console.log(`🚨 Circuit breaker for ${providerId} opened after ${breaker.failures} failures`);
    }
  }

  private getOrCreateBreaker(providerId: string): any {
    if (!this.circuitBreakers.has(providerId)) {
      this.circuitBreakers.set(providerId, {
        state: 'closed',
        failures: 0,
        openedAt: null,
        lastSuccess: null,
        lastFailure: null
      });
    }
    return this.circuitBreakers.get(providerId);
  }

  private getAlternativeProvider(failedProvider: string, context?: any): string | null {
    // Get all available providers sorted by health
    const healthReport = this.healthMonitor.getHealthReport();
    const providers = Object.entries(healthReport.providers)
      .filter(([id, _]) => id !== failedProvider)
      .sort(([_, a]: [string, any], [__, b]: [string, any]) => b.health - a.health);

    if (providers.length === 0) return null;

    // Return the healthiest alternative
    const [bestProvider, _] = providers[0];
    return bestProvider;
  }

  getFailoverStatus(): any {
    return {
      circuitBreakers: Object.fromEntries(this.circuitBreakers),
      thresholds: {
        failureThreshold: this.failureThreshold,
        recoveryTimeout: this.recoveryTimeout
      }
    };
  }
}

// ===== OPTIMIZED SECURITY THREAT DETECTOR =====
export class OptimizedSecurityDetector {
  private threatPatterns: RegExp[] = [
    /ignore\s+(?:all\s+)?(?:previous\s+)?instructions?/i,
    /forget\s+(?:everything\s+)?(?:above|before)/i,
    /reveal\s+(?:your\s+)?(?:system\s+)?(?:prompt|instructions?)/i,
    /what\s+(?:are\s+)?(?:your\s+)?(?:initial\s+)?(?:system\s+)?(?:prompt|instructions?)/i,
    /override\s+(?:your\s+)?(?:safety\s+)?(?:settings?|guidelines?)/i,
    /jailbreak|roleplay\s+as|pretend\s+(?:to\s+be|you\s+are)/i,
    /(?:admin|root|developer)\s+mode/i,
    /bypass\s+(?:your\s+)?(?:safety\s+)?(?:filters?|restrictions?)/i
  ];
  
  private dangerousKeywords = [
    'api key', 'secret', 'password', 'token', 'credential',
    'hack', 'exploit', 'malware', 'virus', 'trojan'
  ];
  
  private threatCache: Map<string, any> = new Map();
  private cacheMaxSize = 1000;

  constructor() {
    console.log('🛡️ Initializing Optimized Security Detector');
  }

  async detectThreats(query: string, context?: string[]): Promise<any> {
    const queryHash = this.hashQuery(query);
    
    // Check cache first
    if (this.threatCache.has(queryHash)) {
      return this.threatCache.get(queryHash);
    }

    const startTime = Date.now();
    
    const threatAssessment = {
      threatLevel: 'safe' as 'safe' | 'low' | 'medium' | 'high' | 'dangerous',
      riskScore: 0,
      detectedThreats: [] as any[],
      recommendedAction: 'allow' as 'allow' | 'warn' | 'block',
      confidence: 0,
      processingTime: 0
    };

    // Pattern-based detection (fast)
    const patternThreats = this.detectPatternThreats(query);
    threatAssessment.detectedThreats.push(...patternThreats);

    // Keyword-based detection  
    const keywordThreats = this.detectKeywordThreats(query);
    threatAssessment.detectedThreats.push(...keywordThreats);

    // Context-based analysis
    if (context && context.length > 0) {
      const contextThreats = this.analyzeContext(query, context);
      threatAssessment.detectedThreats.push(...contextThreats);
    }

    // Calculate overall threat level
    this.calculateThreatLevel(threatAssessment);
    
    threatAssessment.processingTime = Date.now() - startTime;

    // Cache result
    if (this.threatCache.size >= this.cacheMaxSize) {
      const firstKey = this.threatCache.keys().next().value;
      this.threatCache.delete(firstKey);
    }
    this.threatCache.set(queryHash, threatAssessment);

    return threatAssessment;
  }

  private detectPatternThreats(query: string): any[] {
    const threats = [];
    
    for (let i = 0; i < this.threatPatterns.length; i++) {
      const pattern = this.threatPatterns[i];
      if (pattern.test(query)) {
        threats.push({
          type: 'pattern',
          pattern: { name: `threat_pattern_${i}`, description: 'Malicious instruction pattern' },
          confidence: 0.85,
          severity: 'high'
        });
      }
    }
    
    return threats;
  }

  private detectKeywordThreats(query: string): any[] {
    const threats = [];
    const lowerQuery = query.toLowerCase();
    
    for (const keyword of this.dangerousKeywords) {
      if (lowerQuery.includes(keyword)) {
        threats.push({
          type: 'keyword',
          pattern: { name: keyword, description: 'Suspicious keyword detected' },
          confidence: 0.6,
          severity: 'medium'
        });
      }
    }
    
    return threats;
  }

  private analyzeContext(query: string, context: string[]): any[] {
    const threats = [];
    
    // Simple context analysis - look for escalating threat patterns
    const recentQueries = context.slice(-3).join(' ').toLowerCase();
    const currentQuery = query.toLowerCase();
    
    if (recentQueries.includes('ignore') && currentQuery.includes('instructions')) {
      threats.push({
        type: 'contextual',
        pattern: { name: 'escalation_pattern', description: 'Multi-query attack pattern' },
        confidence: 0.9,
        severity: 'high'
      });
    }
    
    return threats;
  }

  private calculateThreatLevel(assessment: any): void {
    let totalRisk = 0;
    let maxSeverity = 0;
    
    for (const threat of assessment.detectedThreats) {
      const severityScore = threat.severity === 'high' ? 3 : threat.severity === 'medium' ? 2 : 1;
      totalRisk += threat.confidence * severityScore;
      maxSeverity = Math.max(maxSeverity, severityScore);
    }
    
    assessment.riskScore = Math.min(100, totalRisk * 20);
    
    // Determine threat level
    if (assessment.riskScore >= 80 || maxSeverity >= 3) {
      assessment.threatLevel = 'dangerous';
      assessment.recommendedAction = 'block';
    } else if (assessment.riskScore >= 60) {
      assessment.threatLevel = 'high';
      assessment.recommendedAction = 'warn';
    } else if (assessment.riskScore >= 40) {
      assessment.threatLevel = 'medium';
      assessment.recommendedAction = 'warn';
    } else if (assessment.riskScore >= 20) {
      assessment.threatLevel = 'low';
      assessment.recommendedAction = 'allow';
    } else {
      assessment.threatLevel = 'safe';
      assessment.recommendedAction = 'allow';
    }
    
    assessment.confidence = assessment.detectedThreats.length > 0 ? 
      assessment.detectedThreats.reduce((sum: number, t: any) => sum + t.confidence, 0) / assessment.detectedThreats.length : 1.0;
  }

  private hashQuery(query: string): string {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  clearCache(): void {
    this.threatCache.clear();
  }

  getCacheStats(): any {
    return {
      size: this.threatCache.size,
      maxSize: this.cacheMaxSize,
      hitRate: 0 // Would need to track hits/misses for actual rate
    };
  }
}

// ===== OPTIMIZED PROVIDER MANAGER =====
export class OptimizedProviderManager {
  private providers: Map<string, any> = new Map();
  private configurations: Map<string, any> = new Map();
  private healthMonitor: OptimizedHealthMonitor;

  constructor(healthMonitor: OptimizedHealthMonitor) {
    this.healthMonitor = healthMonitor;
    console.log('🤖 Initializing Optimized Provider Manager');
  }

  addProvider(providerId: string, config: any): void {
    this.providers.set(providerId, {
      id: providerId,
      name: config.name || providerId,
      type: config.type || 'generic',
      endpoint: config.endpoint,
      enabled: config.enabled !== false,
      capabilities: config.capabilities || {},
      lastHealthCheck: null,
      addedAt: Date.now()
    });
    
    this.configurations.set(providerId, config);
    console.log(`✅ Added provider: ${providerId}`);
  }

  removeProvider(providerId: string): boolean {
    const removed = this.providers.delete(providerId);
    this.configurations.delete(providerId);
    
    if (removed) {
      console.log(`❌ Removed provider: ${providerId}`);
    }
    
    return removed;
  }

  listProviders(includeDisabled: boolean = false): any[] {
    return Array.from(this.providers.values())
      .filter(provider => includeDisabled || provider.enabled)
      .map(provider => ({
        ...provider,
        health: this.healthMonitor.getHealthScore(provider.id),
        status: this.getProviderStatus(provider.id)
      }));
  }

  async testProvider(providerId: string): Promise<any> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    const startTime = Date.now();
    
    try {
      // Simulate provider test
      await this.simulateProviderTest(providerId);
      
      const responseTime = Date.now() - startTime;
      this.healthMonitor.recordSuccess(providerId, responseTime);
      
      return {
        success: true,
        providerId,
        responseTime,
        health: this.healthMonitor.getHealthScore(providerId)
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.healthMonitor.recordError(providerId, responseTime);
      
      return {
        success: false,
        providerId,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
        health: this.healthMonitor.getHealthScore(providerId)
      };
    }
  }

  private async simulateProviderTest(providerId: string): Promise<void> {
    // Simulate network delay and potential failures
    const delay = Math.random() * 1000 + 200; // 200-1200ms
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Simulate 10% failure rate for testing
    if (Math.random() < 0.1) {
      throw new Error('Provider test failed');
    }
  }

  private getProviderStatus(providerId: string): string {
    const health = this.healthMonitor.getHealthScore(providerId);
    const provider = this.providers.get(providerId);
    
    if (!provider?.enabled) return 'disabled';
    if (health >= 80) return 'healthy';
    if (health >= 60) return 'warning';
    return 'critical';
  }

  getProviderCapabilities(providerId: string): any {
    const provider = this.providers.get(providerId);
    return provider?.capabilities || {};
  }

  updateProviderConfig(providerId: string, updates: any): boolean {
    const provider = this.providers.get(providerId);
    const config = this.configurations.get(providerId);
    
    if (!provider || !config) return false;
    
    Object.assign(provider, updates);
    Object.assign(config, updates);
    
    console.log(`🔧 Updated provider config: ${providerId}`);
    return true;
  }

  getProviderStats(): any {
    const providers = this.listProviders(true);
    const enabled = providers.filter(p => p.enabled).length;
    const healthy = providers.filter(p => p.health >= 80).length;
    
    return {
      total: providers.length,
      enabled,
      disabled: providers.length - enabled,
      healthy,
      unhealthy: enabled - healthy,
      averageHealth: providers.reduce((sum, p) => sum + p.health, 0) / providers.length || 0
    };
  }
}

// ===== SYSTEM INTEGRATION CLASS =====
export class OptimizedIRISSystem {
  private healthMonitor: OptimizedHealthMonitor;
  private failoverSystem: OptimizedSmartFailover;
  private securityDetector: OptimizedSecurityDetector;
  private providerManager: OptimizedProviderManager;
  private initialized = false;

  constructor() {
    this.healthMonitor = new OptimizedHealthMonitor();
    this.failoverSystem = new OptimizedSmartFailover(this.healthMonitor);
    this.securityDetector = new OptimizedSecurityDetector();
    this.providerManager = new OptimizedProviderManager(this.healthMonitor);
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('⚠️ System already initialized');
      return;
    }

    console.log('🚀 Initializing Optimized IRIS System...');
    console.log('=====================================');

    // Add default providers
    this.providerManager.addProvider('gemini', {
      name: 'Google Gemini',
      type: 'cloud',
      endpoint: 'https://generativelanguage.googleapis.com',
      enabled: true,
      capabilities: { maxTokens: 32768, streaming: false, multimodal: true }
    });

    this.providerManager.addProvider('groq', {
      name: 'Groq',
      type: 'cloud',
      endpoint: 'https://api.groq.com',
      enabled: true,
      capabilities: { maxTokens: 8192, streaming: true, multimodal: false }
    });

    this.providerManager.addProvider('ollama', {
      name: 'Ollama',
      type: 'local',
      endpoint: 'http://localhost:11434',
      enabled: true,
      capabilities: { maxTokens: 4096, streaming: true, multimodal: false }
    });

    this.initialized = true;
    console.log('✅ Optimized IRIS System initialized successfully!');
  }

  async processQuery(query: string, options: any = {}): Promise<any> {
    if (!this.initialized) {
      throw new Error('System not initialized');
    }

    const startTime = Date.now();

    try {
      // Security check first
      const securityResult = await this.securityDetector.detectThreats(query);
      
      if (securityResult.threatLevel === 'dangerous') {
        return {
          success: false,
          error: 'Query blocked due to security concerns',
          securityReport: securityResult
        };
      }

      // Select optimal provider
      const providerId = options.provider || this.selectOptimalProvider(query, options);
      
      // Execute with failover
      const result = await this.failoverSystem.executeWithFailover(
        providerId,
        () => this.simulateProviderQuery(providerId, query, options)
      );

      return {
        success: true,
        content: result.result,
        provider: result.provider,
        responseTime: Date.now() - startTime,
        securityReport: securityResult,
        failoverUsed: result.failoverUsed
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      };
    }
  }

  private selectOptimalProvider(query: string, options: any): string {
    const providers = this.providerManager.listProviders()
      .filter(p => p.enabled)
      .sort((a, b) => b.health - a.health);
    
    if (providers.length === 0) {
      throw new Error('No providers available');
    }

    // Simple selection based on health - can be enhanced with ML
    return providers[0].id;
  }

  private async simulateProviderQuery(providerId: string, query: string, options: any): Promise<string> {
    // Simulate provider-specific processing time
    const baseDelay = providerId === 'groq' ? 300 : providerId === 'gemini' ? 800 : 1200;
    const delay = baseDelay + (Math.random() * 500);
    
    await new Promise(resolve => setTimeout(resolve, delay));

    // Simulate occasional failures
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error(`${providerId} processing failed`);
    }

    return `Response from ${providerId}: ${query.length > 50 ? query.substring(0, 50) + '...' : query}`;
  }

  getSystemStatus(): any {
    return {
      initialized: this.initialized,
      timestamp: Date.now(),
      health: this.healthMonitor.getHealthReport(),
      providers: this.providerManager.getProviderStats(),
      failover: this.failoverSystem.getFailoverStatus(),
      security: {
        cacheStats: this.securityDetector.getCacheStats(),
        threatDetectionEnabled: true
      }
    };
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Optimized IRIS System...');
    this.securityDetector.clearCache();
    this.initialized = false;
    console.log('✅ System shutdown complete');
  }
}

// Export for use in tests
export {
  OptimizedHealthMonitor,
  OptimizedSmartFailover,
  OptimizedSecurityDetector,
  OptimizedProviderManager
};