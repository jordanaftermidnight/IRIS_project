# 📋 API Reference

Complete API reference for the Multi-AI MCP Integration system.

## 🛠️ MCP Tools

### `consult_multi_ai`
Smart AI consultation with automatic provider selection and fallback.

**Parameters:**
```json
{
  "query": "string",                    // Required: Your question or request
  "context": "string",                  // Optional: Additional context
  "provider": "auto|gemini|llama2|both", // Optional: Provider preference
  "compare_responses": "boolean",       // Optional: Get responses from multiple providers
  "uncertainty_detected": "boolean",    // Optional: Flag for uncertain scenarios
  "confidence_score": "number"          // Optional: Confidence level (0.0-1.0)
}
```

**Example Usage:**
```
"Get an AI second opinion on this authentication implementation"
"Please consult both AI providers about microservices architecture"
"Ask the best available AI about React performance optimization"
```

**Response Format:**
```json
{
  "success": true,
  "responses": [
    {
      "provider": "gemini",
      "success": true,
      "response": "Detailed AI response...",
      "response_time": 2.34,
      "model_used": "gemini-2.5-pro",
      "error": null
    }
  ],
  "summary": "Formatted summary with provider info and response",
  "comparison": "Comparison analysis (if compare_responses=true)"
}
```

---

### `consult_gemini`
Direct consultation with Google Gemini AI.

**Parameters:**
```json
{
  "query": "string",                    // Required: Your question
  "context": "string",                  // Optional: Additional context
  "uncertainty_detected": "boolean",    // Optional: Uncertainty flag
  "confidence_score": "number"          // Optional: Confidence level
}
```

**Example Usage:**
```
"Please consult Gemini about cloud architecture best practices"
"Ask Gemini to analyze this code for security vulnerabilities"
```

**Response Format:**
```json
{
  "success": true,
  "response": "Gemini's detailed response...",
  "model_used": "gemini-2.5-pro",
  "response_time": 3.21,
  "provider": "gemini"
}
```

---

### `consult_llama2`
Direct consultation with local Llama2 via Ollama.

**Parameters:**
```json
{
  "query": "string",                    // Required: Your question
  "context": "string",                  // Optional: Additional context
  "uncertainty_detected": "boolean",    // Optional: Uncertainty flag
  "confidence_score": "number",         // Optional: Confidence level
  "model": "string"                     // Optional: Specific model to use
}
```

**Example Usage:**
```
"Ask Llama2 for a privacy-focused approach to user data handling"
"Please consult Llama2 about database design patterns"
```

**Response Format:**
```json
{
  "success": true,
  "response": "Llama2's response...",
  "model_used": "llama3.2:3b",
  "response_time": 1.87,
  "provider": "llama2",
  "ollama_host": "http://localhost:11434"
}
```

---

### `compare_ai_providers`
Get responses from multiple AI providers for comparative analysis.

**Parameters:**
```json
{
  "query": "string",                    // Required: Your question
  "context": "string",                  // Optional: Additional context
  "providers": ["gemini", "llama2"],    // Optional: Specific providers to compare
  "include_analysis": "boolean"         // Optional: Include comparative analysis
}
```

**Example Usage:**
```
"Compare Gemini and Llama2 responses on React vs Vue"
"Get both AI perspectives on microservices vs monolith architecture"
```

**Response Format:**
```json
{
  "success": true,
  "responses": [
    {
      "provider": "gemini",
      "response": "Gemini's perspective...",
      "response_time": 2.1
    },
    {
      "provider": "llama2",
      "response": "Llama2's perspective...",
      "response_time": 1.5
    }
  ],
  "comparison": {
    "summary": "Key differences and similarities...",
    "performance": "Response time and length comparison",
    "recommendations": "Which response might be better for different use cases"
  }
}
```

---

### `ai_system_status`
Check health and performance of all AI providers.

**Parameters:**
```json
{
  "detailed": "boolean"                 // Optional: Include detailed metrics
}
```

**Example Usage:**
```
"Check AI system status"
"Show detailed AI provider performance metrics"
```

**Response Format:**
```json
{
  "success": true,
  "providers": {
    "gemini": {
      "available": true,
      "status": "healthy",
      "model": "gemini-2.5-pro",
      "stats": {
        "requests": 45,
        "successes": 43,
        "success_rate": 95.6,
        "avg_response_time": 2.34
      }
    },
    "llama2": {
      "available": true,
      "status": "healthy",
      "models": ["llama3.2:3b", "llama3:latest"],
      "ollama_host": "http://localhost:11434",
      "stats": {
        "requests": 32,
        "successes": 32,
        "success_rate": 100.0,
        "avg_response_time": 1.87
      }
    }
  },
  "system": {
    "total_requests": 77,
    "overall_success_rate": 97.4,
    "uptime": "2 days, 14 hours",
    "configuration": {
      "strategy": "performance",
      "fallback_enabled": true,
      "parallel_enabled": false
    }
  }
}
```

---

### `detect_uncertainty`
Analyze text for uncertainty indicators and confidence levels.

**Parameters:**
```json
{
  "text": "string",                        // Required: Text to analyze
  "threshold": "number",               // Optional: Uncertainty threshold (0.0-1.0)
  "detailed_analysis": "boolean"       // Optional: Include detailed breakdown
}
```

**Example Usage:**
```
"Analyze this code review for uncertainty: 'I think this might work, but I'm not sure about the performance implications'"
```

**Response Format:**
```json
{
  "success": true,
  "uncertainty_detected": true,
  "confidence_score": 0.32,
  "uncertainty_indicators": [
    {
      "phrase": "I think",
      "type": "hedging",
      "confidence_impact": -0.2
    },
    {
      "phrase": "might work",
      "type": "possibility",
      "confidence_impact": -0.3
    },
    {
      "phrase": "not sure",
      "type": "explicit_uncertainty",
      "confidence_impact": -0.4
    }
  ],
  "recommendation": "Consider getting a second opinion due to high uncertainty",
  "suggested_action": "consult_multi_ai"
}
```

## 🔧 Python API

### Core Classes

#### `MultiAIIntegration`
Main class for multi-AI coordination.

```python
from multi_ai_integration import MultiAIIntegration, MultiAIConsultationRequest, AIProvider

# Initialize
multi_ai = MultiAIIntegration(
    gemini_config_path="config/gemini-config.json",
    llama2_config_path="config/llama2-config.json"
)

# Check provider availability
availability = await multi_ai.check_provider_availability()

# Perform consultation
request = MultiAIConsultationRequest(
    query="What's the best way to implement caching?",
    context="Building a high-traffic web application",
    preferred_provider=AIProvider.AUTO,
    compare_responses=False
)

result = await multi_ai.consult_multi_ai(request)
```

#### `GeminiIntegration`
Direct Gemini API integration.

```python
from gemini_integration import GeminiIntegration, ConsultationRequest

# Initialize
gemini = GeminiIntegration("config/gemini-config.json")

# Consult Gemini
request = ConsultationRequest(
    query="Explain OAuth 2.0 flow",
    context="Web application security",
    uncertainty_detected=False,
    confidence_score=0.8
)

response = await gemini.consult_gemini(request)
```

#### `Llama2Integration`
Local Llama2 via Ollama integration.

```python
from llama2_integration import Llama2Integration, Llama2ConsultationRequest

# Initialize
llama2 = Llama2Integration("config/llama2-config.json")

# Check Ollama status
status = await llama2.check_ollama_status()

# Get available models
models = await llama2.get_available_models()

# Consult Llama2
request = Llama2ConsultationRequest(
    query="Privacy-focused user authentication",
    context="GDPR compliance requirements",
    model="llama3.2:3b"
)

response = await llama2.consult_llama2(request)
```

### Data Classes

#### `MultiAIConsultationRequest`
```python
@dataclass
class MultiAIConsultationRequest:
    query: str                                    # Required: The question
    context: str                                  # Optional: Additional context
    uncertainty_detected: bool = False            # Uncertainty flag
    confidence_score: float = 0.0               # Confidence level (0.0-1.0)
    preferred_provider: AIProvider = AIProvider.AUTO  # Provider preference
    compare_responses: bool = False              # Enable comparison mode
    include_reasoning: bool = True               # Include reasoning in response
```

#### `ConsultationRequest` (Gemini)
```python
@dataclass
class ConsultationRequest:
    query: str                          # Required: The question
    context: str                        # Optional: Additional context
    uncertainty_detected: bool = False  # Uncertainty flag
    confidence_score: float = 0.0      # Confidence level
```

#### `Llama2ConsultationRequest`
```python
@dataclass
class Llama2ConsultationRequest:
    query: str                          # Required: The question
    context: str                        # Optional: Additional context
    uncertainty_detected: bool = False  # Uncertainty flag
    confidence_score: float = 0.0      # Confidence level
    model: Optional[str] = None         # Specific model to use
    temperature: float = 0.7            # Response creativity (0.0-1.0)
```

#### `AIResponse`
```python
@dataclass
class AIResponse:
    provider: str                       # Provider name
    response: str                       # AI response text
    response_time: float               # Time taken in seconds
    model_used: str                    # Model identifier
    success: bool                      # Success flag
    error: Optional[str] = None        # Error message if failed
```

### Enums

#### `AIProvider`
```python
class AIProvider(Enum):
    GEMINI = "gemini"    # Google Gemini
    LLAMA2 = "llama2"    # Local Llama2 via Ollama
    BOTH = "both"        # Use both providers
    AUTO = "auto"        # Automatic selection
```

## 🔍 Error Handling

### Exception Classes

```python
# Base exception
class MultiAIException(Exception):
    pass

# Provider-specific exceptions
class GeminiAPIError(MultiAIException):
    pass

class OllamaConnectionError(MultiAIException):
    pass

class ModelNotFoundError(MultiAIException):
    pass

class ConfigurationError(MultiAIException):
    pass

# Usage
try:
    result = await multi_ai.consult_multi_ai(request)
except GeminiAPIError as e:
    print(f"Gemini API error: {e}")
except OllamaConnectionError as e:
    print(f"Ollama connection error: {e}")
except MultiAIException as e:
    print(f"General multi-AI error: {e}")
```

### Error Response Format

```json
{
  "success": false,
  "error": "Descriptive error message",
  "error_code": "ERROR_001",
  "error_type": "connection_error",
  "provider": "gemini",
  "timestamp": "2024-01-15T10:30:00Z",
  "retry_after": 60,
  "suggestions": [
    "Check your internet connection",
    "Verify API key is correct",
    "Try again in a few minutes"
  ]
}
```

## 📊 Performance Metrics

### Metrics Available

```python
# Get system performance metrics
status = multi_ai.get_system_status()

metrics = {
    "requests_total": 150,
    "requests_successful": 147,
    "success_rate": 98.0,
    "avg_response_time": 2.1,
    "provider_distribution": {
        "gemini": 0.6,
        "llama2": 0.4
    },
    "model_usage": {
        "gemini-2.5-pro": 90,
        "llama3.2:3b": 60
    },
    "error_breakdown": {
        "timeout": 2,
        "api_limit": 1,
        "connection": 0
    }
}
```

### Custom Metrics Collection

```python
# Enable custom metrics
multi_ai.enable_metrics_collection(
    include_request_details=True,
    include_response_analysis=True,
    metrics_retention_days=30
)

# Export metrics
metrics_data = multi_ai.export_metrics(
    format="json",  # json, csv, prometheus
    start_date="2024-01-01",
    end_date="2024-01-31"
)
```

---

**Complete API reference for building powerful multi-AI applications!** 🚀 Use these APIs to integrate intelligent AI consultation into your own projects.