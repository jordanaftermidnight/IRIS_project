# IRIS AI Orchestration System - Operational Manual

**Version:** 0.9.0  
**Author:** Jordan After Midnight  
**Last Updated:** September 2025

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Architecture](#core-architecture)
3. [Function Reference](#function-reference)
4. [Configuration Management](#configuration-management)
5. [API Operations](#api-operations)
6. [Provider Management](#provider-management)
7. [Performance Monitoring](#performance-monitoring)
8. [Error Handling](#error-handling)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance Procedures](#maintenance-procedures)

## System Overview

IRIS (Integrated Runtime Intelligence Service) is an AI orchestration platform that manages multiple AI providers through intelligent routing, connection pooling, and performance optimization. The system provides a unified interface for interacting with various AI services while maintaining optimal performance and cost efficiency.

### Key Components

- **Provider Management**: Handles multiple AI service providers (Ollama, OpenAI, Gemini, Groq, Claude)
- **Connection Pool**: Manages concurrent connections with retry logic and health monitoring
- **Response Cache**: LRU cache with TTL for performance optimization
- **Rate Limiting**: Request throttling with configurable windows
- **Analytics Dashboard**: Real-time monitoring and predictive insights
- **CLI Interface**: Command-line tools for system interaction

## Core Architecture

### File Structure

```
src/
├── cli.js                    # Command-line interface entry point
├── enhanced-ai.js            # Core AI orchestration logic
├── core/                     # Core system components
│   ├── api-validator.js      # Input validation and sanitization
│   ├── cache-manager.js      # Response caching implementation
│   ├── connection-pool.js    # Connection pooling logic
│   ├── error-handler.js      # Error handling and recovery
│   ├── message-formatter.js  # Response formatting utilities
│   └── performance-monitor.js # Performance tracking
└── providers/               # AI provider implementations
    ├── ollama-provider.js   # Local Ollama integration
    ├── openai-provider.js   # OpenAI API integration
    ├── gemini-provider.js   # Google Gemini integration
    ├── groq-provider.js     # Groq API integration
    └── claude-provider.js   # Anthropic Claude integration
```

## Function Reference

### Core System Functions

#### `src/enhanced-ai.js`

**`constructor(options = {})`**
- Initializes the IRIS system with configuration options
- Sets up provider instances, cache, connection pool, and monitoring
- Parameters: `options` - Configuration object with provider settings

**`async initialize()`**
- Performs system initialization and provider health checks
- Establishes connections to available AI providers
- Returns: Boolean indicating successful initialization

**`async query(message, options = {})`**
- Main query processing function with intelligent provider selection
- Parameters: `message` - User query, `options` - Processing options
- Returns: Response object with content, metadata, and performance metrics

**`selectProvider(taskType, options = {})`**
- Intelligent provider selection based on task requirements and health
- Parameters: `taskType` - Type of task (code, creative, fast, reasoning)
- Returns: Selected provider instance

**`getSystemStatus()`**
- Returns comprehensive system health and performance metrics
- Includes provider status, cache statistics, and connection pool data

#### `src/core/connection-pool.js`

**`constructor(maxConnections, options)`**
- Creates connection pool with specified limits
- Parameters: `maxConnections` - Maximum concurrent connections

**`async acquire(key)`**
- Acquires a connection from the pool for a specific provider
- Implements exponential backoff for retry logic
- Returns: Connection object or throws error on timeout

**`release(key, connection)`**
- Returns connection to the pool for reuse
- Updates connection statistics and health metrics

**`getStats()`**
- Returns pool performance statistics including success rates and response times

#### `src/core/cache-manager.js`

**`constructor(maxSize, ttlMs)`**
- Creates LRU cache with size and time-based expiration
- Parameters: `maxSize` - Maximum cached items, `ttlMs` - Time-to-live

**`set(key, value)`**
- Stores value in cache with automatic expiration
- Implements LRU eviction when capacity is reached

**`get(key)`**
- Retrieves cached value if present and not expired
- Updates access timestamps for LRU ordering

**`clear()`**
- Removes all cached entries and resets statistics

### Provider Functions

#### Base Provider Interface

All providers implement the following interface:

**`async isAvailable()`**
- Checks if provider is accessible and properly configured
- Returns: Boolean indicating availability

**`async query(message, options)`**
- Sends query to AI provider and returns formatted response
- Handles provider-specific authentication and request formatting

**`async getModels()`**
- Returns list of available models for the provider
- Used for provider capability assessment

**`getProviderInfo()`**
- Returns metadata about the provider (cost, speed, capabilities)

### Dashboard Functions

#### `iris-dashboard.js`

**`constructor()`**
- Initializes dashboard with real-time data connections
- Sets up chart rendering, event listeners, and update intervals

**`setupCharts()`**
- Creates Chart.js instances for performance visualization
- Configures responsive layouts and accessibility features

**`updateRealTimeMetrics()`**
- Fetches latest system metrics and updates dashboard display
- Implements efficient update strategies to minimize performance impact

**`submitQuery()`**
- Handles user queries through the dashboard interface
- Provides visual feedback and real-time response display

### CLI Functions

#### `src/cli.js`

**`handleHealthCommand()`**
- Executes system health check and displays provider status
- Shows detailed availability and performance information

**`handleCacheStatsCommand()`**
- Displays cache performance metrics including hit rates and efficiency
- Provides cache optimization recommendations

**`handlePerformanceCommand()`**
- Shows comprehensive system performance statistics
- Includes response times, throughput, and error rates

## Configuration Management

### Environment Variables

The system uses environment-based configuration for flexibility:

```bash
# Provider Configuration
OLLAMA_HOST=http://localhost:11434
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
ANTHROPIC_API_KEY=your_claude_key

# System Configuration
IRIS_CACHE_SIZE=100
IRIS_CACHE_TTL=15
IRIS_POOL_SIZE=10
IRIS_MAX_RETRIES=3
IRIS_API_PORT=3001
NODE_ENV=production
```

### Configuration File

`iris.config.js` contains environment-specific settings:

**`getConfig(env)`**
- Returns configuration object for specified environment
- Merges defaults with environment-specific overrides

**`validateConfig(config)`**
- Validates configuration parameters and returns error list
- Ensures all required settings are within acceptable ranges

## API Operations

### Endpoint Functions

**Health Check: `GET /api/health`**
- Returns system status and provider availability
- Used for monitoring and load balancer health checks

**Chat Completion: `POST /api/chat`**
- Processes AI queries with intelligent provider routing
- Supports provider selection and task type optimization

**Performance Stats: `GET /api/performance-stats`**
- Returns detailed system performance metrics
- Includes connection pool and cache statistics

**Rate Limiting: Middleware Function**
- Implements sliding window rate limiting
- Tracks requests per client IP with configurable limits

## Provider Management

### Provider Lifecycle

1. **Initialization**: Provider instances are created during system startup
2. **Health Checking**: Continuous monitoring of provider availability
3. **Load Balancing**: Intelligent request distribution based on performance
4. **Failover**: Automatic switching when providers become unavailable

### Provider Selection Logic

The system uses a multi-factor selection algorithm:

1. **Task Type Matching**: Providers are optimized for specific task types
2. **Health Score**: Recent performance and availability metrics
3. **Cost Optimization**: Preference for lower-cost providers when appropriate
4. **Load Distribution**: Balancing requests across available providers

## Performance Monitoring

### Metrics Collection

The system continuously collects performance data:

- **Response Times**: Per-provider and overall system latency
- **Success Rates**: Request completion and error rates
- **Cache Performance**: Hit rates and efficiency metrics
- **Connection Pool**: Utilization and queue lengths

### Real-time Analytics

The dashboard provides live system monitoring:

- **Performance Trends**: Historical response time analysis
- **Provider Usage**: Distribution of requests across providers
- **Cost Analysis**: Real-time cost tracking and optimization suggestions
- **Predictive Insights**: Load forecasting and capacity planning

## Error Handling

### Error Categories

1. **Provider Errors**: API failures, authentication issues, rate limits
2. **System Errors**: Configuration problems, resource exhaustion
3. **Input Errors**: Invalid requests, malformed queries

### Recovery Strategies

- **Automatic Retry**: Exponential backoff for transient failures
- **Provider Failover**: Switching to alternative providers
- **Graceful Degradation**: Fallback responses when all providers fail
- **Circuit Breaker**: Temporary isolation of failing providers

## Troubleshooting

### Common Issues

**Provider Not Available**
- Verify API keys are correctly configured
- Check network connectivity to provider endpoints
- Review rate limiting and quota restrictions

**Poor Performance**
- Monitor cache hit rates and adjust TTL settings
- Review connection pool configuration
- Check for provider-specific latency issues

**High Error Rates**
- Examine provider health status
- Review input validation logs
- Check for configuration mismatches

### Diagnostic Commands

```bash
# System health overview
iris health

# Detailed performance metrics
iris performance

# Cache efficiency analysis
iris cache-stats

# Connection pool status
iris pool-stats
```

## Maintenance Procedures

### Regular Tasks

1. **Monitor System Health**: Daily review of dashboard metrics
2. **Update Provider Keys**: Rotate API keys as required by providers
3. **Performance Optimization**: Weekly analysis of cache and pool efficiency
4. **Log Analysis**: Regular review of error logs and performance trends

### Scaling Considerations

- **Horizontal Scaling**: Multiple IRIS instances behind load balancer
- **Cache Optimization**: Adjust cache size based on usage patterns
- **Provider Limits**: Monitor API quotas and adjust request distribution

### Backup and Recovery

- **Configuration Backup**: Regular backup of environment settings
- **Performance Data**: Archive metrics for long-term analysis
- **Provider Failover Testing**: Periodic testing of failover mechanisms

## Security Considerations

### API Security

- Input validation and sanitization for all requests
- Rate limiting to prevent abuse
- Secure handling of provider API keys
- Request logging for audit purposes

### Data Protection

- No persistent storage of user queries
- Encryption of API keys in environment variables
- Secure communication with AI providers
- Minimal data retention policies

---

**This operational manual provides comprehensive guidance for IRIS system operation and maintenance. For technical implementation details, refer to the source code documentation and inline comments.**