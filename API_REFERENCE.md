# IRIS API Reference

## Overview

The IRIS AI Orchestration System provides a RESTful API for intelligent AI provider management and query routing.

**Base URL:** `http://localhost:3001/api`

## Endpoints

### Health Check
```http
GET /api/health
```

Returns system health status and available providers.

**Response:**
```json
{
  "status": "healthy",
  "providers": {
    "ollama": {
      "available": true,
      "status": "healthy",
      "priority": 1,
      "type": "local",
      "cost": "free"
    }
  },
  "timestamp": "2025-09-02T09:10:33.782Z",
  "version": "2.0.0"
}
```

### Chat Completion
```http
POST /api/chat
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "Your query here",
  "provider": "auto", // Optional: "auto", "ollama", "groq", "gemini", "openai", "claude"
  "taskType": "balanced" // Optional: "code", "creative", "fast", "reasoning", "balanced"
}
```

**Response:**
```json
{
  "response": "AI response here",
  "provider": "Ollama Local",
  "responseTime": 1234,
  "model": "qwen2.5:7b",
  "success": true,
  "metadata": {
    "contextLength": 97,
    "tokensUsed": 150,
    "decision": {
      "reason": "Optimized for balanced task",
      "confidence": 0.95
    }
  }
}
```

### Performance Statistics
```http
GET /api/performance-stats
```

Returns connection pool and cache performance metrics.

**Response:**
```json
{
  "success": true,
  "connectionPool": {
    "totalRequests": 8,
    "successfulRequests": 6,
    "failedRequests": 2,
    "averageResponseTime": 1234,
    "activeConnections": 2,
    "queueLength": 0,
    "successRate": "75.00%"
  },
  "cache": {
    "hits": 45,
    "misses": 15,
    "evictions": 2,
    "hitRate": "75.00%",
    "size": 12,
    "maxSize": 100,
    "ttlMinutes": 15
  },
  "timestamp": "2025-09-02T09:10:37.453Z"
}
```

### Cache Statistics
```http
GET /api/cache-stats
```

Returns detailed cache performance metrics.

### Connection Pool Statistics
```http
GET /api/pool-stats
```

Returns connection pool status and metrics.

### Configuration
```http
GET /api/config
```

Returns current system configuration (development only).

### Rate Limit Status
```http
GET /api/rate-limit-stats
```

Returns current rate limiting statistics.

## Error Handling

The API uses standard HTTP status codes:

- `200 OK` - Request successful
- `400 Bad Request` - Invalid request format
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

**Error Response Format:**
```json
{
  "error": "Error description",
  "provider": "Error Handler",
  "timestamp": "2025-09-02T09:10:37.453Z"
}
```

## Rate Limiting

- **Window:** 60 seconds
- **Max Requests:** 100 per window (configurable)
- **Headers:** `X-RateLimit-*` headers included in responses

## Authentication

Currently, the API does not require authentication. Provider API keys should be set as environment variables:

- `OLLAMA_HOST` - Ollama server URL (default: http://localhost:11434)
- `GROQ_API_KEY` - Groq API key
- `OPENAI_API_KEY` - OpenAI API key  
- `GEMINI_API_KEY` - Google Gemini API key
- `ANTHROPIC_API_KEY` - Anthropic Claude API key

## Configuration

The system can be configured via environment variables:

- `IRIS_CACHE_SIZE` - Cache size limit
- `IRIS_CACHE_TTL` - Cache TTL in minutes
- `IRIS_POOL_SIZE` - Connection pool size
- `IRIS_MAX_RETRIES` - Maximum retry attempts
- `IRIS_API_PORT` - API server port
- `IRIS_RATE_LIMIT` - Rate limit per window
- `NODE_ENV` - Environment (development/production/testing)

## CLI Integration

The system provides CLI commands that interact with these API endpoints:

```bash
# Check system health
iris health

# View cache statistics
iris cache-stats

# View connection pool stats  
iris pool-stats

# View performance metrics
iris performance

# Start interactive chat
iris chat "Your message here"
```

## Dashboard Integration

The web dashboard at `http://localhost:3001` provides a visual interface for monitoring these API endpoints with real-time updates and advanced analytics.