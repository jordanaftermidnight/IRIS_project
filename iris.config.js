#!/usr/bin/env node

/**
 * IRIS Configuration File
 * Centralized configuration for cache, connection pool, and performance settings
 */

export const config = {
  // Cache Configuration
  cache: {
    maxSize: 100,              // Maximum number of cached responses
    ttlMinutes: 15,            // Time-to-live in minutes
    cleanupIntervalMinutes: 5, // Cleanup interval for expired entries
    keyGenerationStrategy: 'normalized', // 'normalized' or 'exact'
    enableCompression: false   // Enable response compression (future feature)
  },

  // Connection Pool Configuration
  connectionPool: {
    maxConnections: 10,        // Maximum concurrent connections
    maxRetries: 3,             // Maximum retry attempts
    retryDelayBase: 1000,      // Base delay for exponential backoff (ms)
    retryDelayMax: 30000,      // Maximum retry delay (ms)
    healthCheckInterval: 30000, // Health check interval (ms)
    timeoutMs: 30000           // Request timeout
  },

  // Performance Configuration
  performance: {
    updateInterval: 3000,      // Real-time update interval (ms)
    debounceMs: 300,           // Chart update debounce (ms)
    significantChangeThreshold: 5, // Minimum change to trigger updates
    enableAnalytics: true,     // Enable performance analytics
    maxErrorLogs: 50,          // Maximum stored error logs
    maxPerformanceHistory: 100 // Maximum performance data points
  },

  // API Configuration
  api: {
    port: 3001,                // API server port
    enableCors: true,          // Enable CORS
    rateLimitWindowMs: 60000,  // Rate limit window (ms)
    rateLimitMaxRequests: 100, // Max requests per window
    enableRequestLogging: true, // Log API requests
    enableMetrics: true        // Enable metrics endpoints
  },

  // Security Configuration
  security: {
    enableInputSanitization: true,  // Sanitize user inputs
    maxInputLength: 10000,          // Maximum input length
    enableThreatDetection: true,    // Enable basic threat detection
    enableAuditLogging: true,       // Enable security audit logs
    blockedPatterns: [              // Blocked input patterns
      /(<script|<iframe|javascript:|data:)/i,
      /(union\s+select|drop\s+table|delete\s+from)/i
    ]
  },

  // UI Configuration
  ui: {
    theme: 'auto',             // 'light', 'dark', 'auto'
    animationDuration: 300,    // Animation duration (ms)
    enableSmoothScrolling: true, // Enable smooth scrolling
    chartAnimationDuration: 750, // Chart animation duration (ms)
    enableSkeletonLoading: true, // Enable skeleton screens
    mobileBreakpoint: 768,     // Mobile breakpoint (px)
    enableAccessibility: true   // Enable accessibility features
  },

  // Provider Configuration
  providers: {
    priorityOrder: ['ollama', 'groq', 'gemini', 'openai', 'claude'],
    fallbackEnabled: true,     // Enable provider fallback
    healthCheckEnabled: true,  // Enable provider health checks
    costOptimization: true,    // Enable cost-based routing
    loadBalancing: 'round_robin', // 'round_robin', 'least_connections', 'random'
    timeoutMs: 30000          // Provider request timeout
  },

  // Development Configuration
  development: {
    enableDebugMode: false,    // Enable debug logging
    enableHotReload: false,    // Enable hot reload (future feature)
    mockResponses: false,      // Use mock responses for testing
    enableProfiler: false,     // Enable performance profiler
    verboseLogging: false      // Enable verbose logging
  },

  // Monitoring Configuration
  monitoring: {
    enableMetrics: true,       // Enable metrics collection
    metricsRetentionDays: 30,  // Metrics retention period
    enableAlerting: false,     // Enable alerting (future feature)
    alertThresholds: {
      errorRate: 0.1,          // Alert if error rate > 10%
      responseTime: 5000,      // Alert if response time > 5s
      cacheHitRate: 0.3        // Alert if cache hit rate < 30%
    },
    healthCheckEndpoints: [
      '/api/health',
      '/api/performance-stats',
      '/api/cache-stats',
      '/api/pool-stats'
    ]
  }
};

/**
 * Environment-specific configurations
 */
export const environments = {
  development: {
    ...config,
    development: {
      ...config.development,
      enableDebugMode: true,
      verboseLogging: true,
      mockResponses: false
    },
    cache: {
      ...config.cache,
      maxSize: 50,
      ttlMinutes: 5
    },
    connectionPool: {
      ...config.connectionPool,
      maxConnections: 5
    }
  },

  production: {
    ...config,
    cache: {
      ...config.cache,
      maxSize: 500,
      ttlMinutes: 30,
      enableCompression: true
    },
    connectionPool: {
      ...config.connectionPool,
      maxConnections: 20,
      maxRetries: 5
    },
    api: {
      ...config.api,
      rateLimitMaxRequests: 200
    },
    monitoring: {
      ...config.monitoring,
      enableAlerting: true,
      metricsRetentionDays: 90
    }
  },

  testing: {
    ...config,
    development: {
      ...config.development,
      mockResponses: true,
      enableDebugMode: true
    },
    cache: {
      ...config.cache,
      maxSize: 10,
      ttlMinutes: 1
    },
    connectionPool: {
      ...config.connectionPool,
      maxConnections: 2,
      maxRetries: 1
    }
  }
};

/**
 * Get configuration for current environment
 */
export function getConfig(env = process.env.NODE_ENV || 'development') {
  const envConfig = environments[env] || environments.development;
  
  // Override with environment variables if present
  const overrides = {
    cache: {
      maxSize: process.env.IRIS_CACHE_SIZE ? parseInt(process.env.IRIS_CACHE_SIZE) : envConfig.cache.maxSize,
      ttlMinutes: process.env.IRIS_CACHE_TTL ? parseInt(process.env.IRIS_CACHE_TTL) : envConfig.cache.ttlMinutes
    },
    connectionPool: {
      ...envConfig.connectionPool,
      maxConnections: process.env.IRIS_POOL_SIZE ? parseInt(process.env.IRIS_POOL_SIZE) : envConfig.connectionPool.maxConnections,
      maxRetries: process.env.IRIS_MAX_RETRIES ? parseInt(process.env.IRIS_MAX_RETRIES) : envConfig.connectionPool.maxRetries
    },
    api: {
      ...envConfig.api,
      port: process.env.IRIS_API_PORT ? parseInt(process.env.IRIS_API_PORT) : envConfig.api.port,
      rateLimitMaxRequests: process.env.IRIS_RATE_LIMIT ? parseInt(process.env.IRIS_RATE_LIMIT) : envConfig.api.rateLimitMaxRequests
    }
  };

  return {
    ...envConfig,
    ...overrides,
    cache: { ...envConfig.cache, ...overrides.cache },
    connectionPool: { ...envConfig.connectionPool, ...overrides.connectionPool },
    api: { ...envConfig.api, ...overrides.api }
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config) {
  const errors = [];

  // Validate cache settings
  if (config.cache.maxSize < 1 || config.cache.maxSize > 10000) {
    errors.push('Cache maxSize must be between 1 and 10000');
  }

  if (config.cache.ttlMinutes < 1 || config.cache.ttlMinutes > 1440) {
    errors.push('Cache TTL must be between 1 and 1440 minutes');
  }

  // Validate connection pool settings
  if (config.connectionPool.maxConnections < 1 || config.connectionPool.maxConnections > 100) {
    errors.push('Connection pool maxConnections must be between 1 and 100');
  }

  if (config.connectionPool.maxRetries < 0 || config.connectionPool.maxRetries > 10) {
    errors.push('Connection pool maxRetries must be between 0 and 10');
  }

  // Validate API settings
  if (config.api.port < 1000 || config.api.port > 65535) {
    errors.push('API port must be between 1000 and 65535');
  }

  if (config.api.rateLimitMaxRequests < 1 || config.api.rateLimitMaxRequests > 10000) {
    errors.push('Rate limit max requests must be between 1 and 10000');
  }

  return errors;
}

/**
 * Default export
 */
export default getConfig();