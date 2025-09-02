# ⚙️ Configuration Guide

Complete configuration guide for customizing your Multi-AI MCP Integration system.

## 📁 Configuration Files

### Main Configuration Files
- **`.env`** - Environment variables and API keys
- **`config/gemini-config.json`** - Gemini provider settings
- **`config/llama2-config.json`** - Llama2/Ollama settings
- **`config/multi-ai-config.json`** - Multi-AI system behavior

## 🔑 Environment Variables

### `.env` File
```bash
# Google Gemini API Configuration
GOOGLE_API_KEY=your-gemini-api-key-here

# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODELS_PATH=/usr/share/ollama/.ollama/models

# MCP Server Configuration
MCP_LOG_LEVEL=INFO
MCP_TIMEOUT=120

# Claude Code Configuration
CLAUDE_CONFIG_DIR=~/.anthropic/claude-code

# Multi-AI System Configuration
MULTI_AI_PROVIDER_STRATEGY=performance
MULTI_AI_PARALLEL_ENABLED=false
MULTI_AI_CACHE_TTL=300

# Development Configuration
DEBUG=false
LOG_LEVEL=INFO
```

### Environment Variable Details

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_API_KEY` | None | **Required** - Your Google Gemini API key |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server endpoint |
| `MCP_LOG_LEVEL` | `INFO` | Logging level: DEBUG, INFO, WARN, ERROR |
| `MCP_TIMEOUT` | `120` | Request timeout in seconds |
| `MULTI_AI_PROVIDER_STRATEGY` | `performance` | Provider selection: performance, round_robin, preference |

## 🤖 AI Provider Configuration

### Gemini Configuration (`config/gemini-config.json`)

```json
{
  "api_key_env": "GOOGLE_API_KEY",
  "primary_model": "gemini-2.5-pro",
  "fallback_models": [
    "gemini-2.5-flash",
    "gemini-2.0-flash-exp"
  ],
  "request_timeout": 60,
  "max_retries": 3,
  "retry_delay": 2,
  "circuit_breaker": {
    "failure_threshold": 5,
    "recovery_timeout": 300,
    "expected_failure_threshold": 3
  },
  "rate_limiting": {
    "requests_per_minute": 60,
    "burst_size": 10
  },
  "response_caching": {
    "enabled": true,
    "ttl_seconds": 300,
    "max_cache_size": 100
  },
  "safety_settings": {
    "harassment": "BLOCK_MEDIUM_AND_ABOVE",
    "hate_speech": "BLOCK_MEDIUM_AND_ABOVE",
    "sexually_explicit": "BLOCK_MEDIUM_AND_ABOVE",
    "dangerous_content": "BLOCK_MEDIUM_AND_ABOVE"
  }
}
```

### Llama2 Configuration (`config/llama2-config.json`)

```json
{
  "ollama_host": "http://localhost:11434",
  "default_model": "llama3.2:3b",
  "fallback_models": [
    "llama3:latest",
    "llama2:7b"
  ],
  "request_timeout": 120,
  "max_retries": 2,
  "retry_delay": 1,
  "model_parameters": {
    "temperature": 0.7,
    "top_p": 0.9,
    "top_k": 40,
    "num_predict": 1024
  },
  "auto_pull_models": false,
  "stream_responses": false
}
```

### Multi-AI System Configuration (`config/multi-ai-config.json`)

```json
{
  "default_provider": "auto",
  "fallback_enabled": true,
  "comparison_mode": false,
  "provider_selection_strategy": "performance",
  "gemini_preference_score": 0.6,
  "llama2_preference_score": 0.4,
  "timeout_total": 120,
  "enable_parallel_consultation": false,
  "response_synthesis": true,
  "smart_routing": {
    "enabled": true,
    "privacy_keywords": ["private", "confidential", "sensitive", "secret"],
    "speed_keywords": ["quick", "fast", "urgent", "immediate"],
    "detailed_keywords": ["comprehensive", "thorough", "in-depth", "detailed"],
    "local_keywords": ["offline", "local", "private"]
  },
  "fallback_rules": {
    "gemini_unavailable": "llama2",
    "llama2_unavailable": "gemini",
    "both_unavailable": "error"
  },
  "performance_tracking": {
    "enabled": true,
    "metrics_retention_days": 30,
    "update_strategy_threshold": 10
  }
}
```

## 🎯 Provider Selection Strategies

### Performance Strategy
Automatically selects the best-performing provider based on:
- Success rate
- Average response time
- Recent performance trends

```json
{
  "provider_selection_strategy": "performance",
  "performance_weight_success": 0.7,
  "performance_weight_speed": 0.3
}
```

### Round Robin Strategy
Alternates between available providers to balance load:

```json
{
  "provider_selection_strategy": "round_robin"
}
```

### Preference Strategy
Uses configured preference scores:

```json
{
  "provider_selection_strategy": "preference",
  "gemini_preference_score": 0.8,
  "llama2_preference_score": 0.2
}
```

## 🧠 Smart Routing

### Keyword-Based Routing
Automatically routes queries based on content:

```json
{
  "smart_routing": {
    "enabled": true,
    "rules": {
      "privacy_keywords": {
        "keywords": ["private", "confidential", "gdpr"],
        "preferred_provider": "llama2",
        "reason": "Local processing for privacy"
      },
      "speed_keywords": {
        "keywords": ["quick", "fast", "urgent"],
        "selection_strategy": "fastest_available"
      },
      "analysis_keywords": {
        "keywords": ["analyze", "compare", "evaluate"],
        "preferred_provider": "gemini",
        "reason": "Better analytical capabilities"
      }
    }
  }
}
```

### Context-Aware Routing

```json
{
  "context_routing": {
    "enabled": true,
    "rules": [
      {
        "context_patterns": ["authentication", "security", "encryption"],
        "preferred_provider": "llama2",
        "confidence_threshold": 0.8
      },
      {
        "context_patterns": ["cloud", "scaling", "architecture"],
        "preferred_provider": "gemini",
        "confidence_threshold": 0.7
      }
    ]
  }
}
```

## 🛡️ Security Configuration

### API Key Management

1. **Environment Variables** (Recommended):
   ```bash
   export GOOGLE_API_KEY="your-key-here"
   ```

2. **Encrypted Configuration**:
   ```json
   {
     "api_key_encrypted": true,
     "api_key_file": "/secure/path/to/encrypted/key",
     "encryption_key_env": "ENCRYPTION_KEY"
   }
   ```

3. **Cloud Secret Management**:
   ```json
   {
     "api_key_source": "aws_secrets_manager",
     "secret_name": "gemini-api-key",
     "region": "us-west-2"
   }
   ```

### Rate Limiting

```json
{
  "rate_limiting": {
    "global_enabled": true,
    "per_provider": {
      "gemini": {
        "requests_per_minute": 60,
        "burst_size": 10,
        "queue_size": 20
      },
      "llama2": {
        "requests_per_minute": 120,
        "burst_size": 20,
        "queue_size": 50
      }
    }
  }
}
```

## 📊 Performance Tuning

### Response Caching

```json
{
  "response_caching": {
    "enabled": true,
    "ttl_seconds": 300,
    "max_cache_size": 100,
    "cache_key_strategy": "query_hash",
    "exclude_patterns": ["current time", "random", "uuid"]
  }
}
```

### Model Optimization

```json
{
  "model_optimization": {
    "auto_model_selection": true,
    "model_performance_tracking": true,
    "model_switching_threshold": 0.2,
    "model_warmup": {
      "enabled": true,
      "warmup_queries": ["hello", "test"]
    }
  }
}
```

### Parallel Processing

```json
{
  "parallel_processing": {
    "enable_parallel_consultation": true,
    "max_concurrent_requests": 3,
    "timeout_per_request": 60,
    "aggregate_responses": true
  }
}
```

## 🔍 Monitoring Configuration

### Logging

```json
{
  "logging": {
    "level": "INFO",
    "format": "structured",
    "output": {
      "console": true,
      "file": {
        "enabled": true,
        "path": "logs/multi-ai.log",
        "rotation": "daily",
        "retention_days": 7
      }
    },
    "include_performance_metrics": true,
    "include_request_details": false
  }
}
```

### Metrics Collection

```json
{
  "metrics": {
    "enabled": true,
    "collectors": ["prometheus", "statsd"],
    "prometheus": {
      "port": 8090,
      "path": "/metrics"
    },
    "statsd": {
      "host": "localhost",
      "port": 8125,
      "prefix": "multi_ai"
    }
  }
}
```

## 🔧 Development Configuration

### Debug Mode

```json
{
  "debug": {
    "enabled": false,
    "verbose_logging": true,
    "trace_requests": true,
    "mock_responses": false,
    "save_requests": true,
    "request_log_path": "debug/requests.json"
  }
}
```

### Testing Configuration

```json
{
  "testing": {
    "mock_providers": false,
    "test_api_keys": {
      "gemini": "test-key-gemini",
      "llama2": "http://localhost:11434"
    },
    "integration_tests": true,
    "performance_tests": true
  }
}
```

## 📝 Configuration Templates

### Minimal Configuration
For basic usage with automatic settings:

```json
{
  "provider_selection_strategy": "auto",
  "fallback_enabled": true
}
```

### High-Performance Configuration
For maximum speed and efficiency:

```json
{
  "provider_selection_strategy": "performance",
  "enable_parallel_consultation": true,
  "response_caching": {"enabled": true, "ttl_seconds": 600},
  "smart_routing": {"enabled": true}
}
```

### Privacy-Focused Configuration
For maximum privacy and local processing:

```json
{
  "default_provider": "llama2",
  "smart_routing": {
    "privacy_keywords": ["*"],
    "preferred_provider": "llama2"
  },
  "fallback_rules": {
    "llama2_unavailable": "error"
  }
}
```

## 🚀 Quick Configuration Commands

```bash
# Reset to defaults
cp config/*.example.json config/

# Optimize for performance
python3 scripts/optimize_config.py --performance

# Setup privacy mode
python3 scripts/configure_privacy.py

# Test configuration
python3 scripts/validate_config.py

# Backup configuration
tar -czf config-backup-$(date +%Y%m%d).tar.gz config/
```

---

**Configuration complete!** 🎉 Your multi-AI system is now optimized for your specific needs.