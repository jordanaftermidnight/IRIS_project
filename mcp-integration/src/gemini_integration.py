#!/usr/bin/env python3
"""
Gemini Integration Module for Claude Code MCP Server
Handles communication with Gemini CLI and provides second opinion capabilities
"""

import json
import subprocess
import asyncio
import logging
import os
from typing import Dict, List, Optional, Any
import re
import time
from dataclasses import dataclass
import hashlib

# Custom Exception Classes
class GeminiIntegrationError(Exception):
    """Base exception for Gemini integration errors"""
    pass

class GeminiAPIError(GeminiIntegrationError):
    """Raised when Gemini API call fails"""
    pass

class RateLimitError(GeminiIntegrationError):
    """Raised when rate limit is exceeded"""
    pass

class AuthenticationError(GeminiIntegrationError):
    """Raised when API authentication fails"""
    pass

class ConfigurationError(GeminiIntegrationError):
    """Raised when configuration is invalid"""
    pass

class CircuitBreakerOpenError(GeminiIntegrationError):
    """Raised when circuit breaker is open"""
    pass

@dataclass
class ConsultationRequest:
    query: str
    context: str
    uncertainty_detected: bool = False
    confidence_score: float = 0.0

class CircuitBreaker:
    """Circuit breaker pattern implementation for API resilience"""
    
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        
    def call(self, func):
        """Execute function with circuit breaker protection"""
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "HALF_OPEN"
                self.failure_count = 0
            else:
                raise CircuitBreakerOpenError("Circuit breaker is OPEN - too many recent failures")
        
        try:
            result = func()
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
                self.failure_count = 0
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
            
            raise e
            
    def reset(self):
        """Reset circuit breaker to closed state"""
        self.state = "CLOSED"
        self.failure_count = 0
        self.last_failure_time = None

class ResponseCache:
    """Simple TTL-based response cache"""
    
    def __init__(self, ttl: int = 300):
        self.cache = {}
        self.ttl = ttl
        
    def _hash_request(self, request: ConsultationRequest) -> str:
        """Generate hash for request caching"""
        cache_key = f"{request.query}:{request.context}"
        return hashlib.md5(cache_key.encode()).hexdigest()
        
    def get(self, request: ConsultationRequest) -> Optional[str]:
        """Get cached response if available and not expired"""
        key = self._hash_request(request)
        if key in self.cache:
            response, timestamp = self.cache[key]
            if time.time() - timestamp < self.ttl:
                return response
            else:
                del self.cache[key]
        return None
        
    def set(self, request: ConsultationRequest, response: str):
        """Cache response with timestamp"""
        key = self._hash_request(request)
        self.cache[key] = (response, time.time())
        
    def clear_expired(self):
        """Remove expired entries from cache"""
        current_time = time.time()
        expired_keys = [
            key for key, (_, timestamp) in self.cache.items()
            if current_time - timestamp >= self.ttl
        ]
        for key in expired_keys:
            del self.cache[key]

class GeminiIntegration:
    def __init__(self, config_path: str):
        self.config = self._load_config(config_path)
        self.last_request_time = 0
        self.request_count = 0
        self.logger = self._setup_logging()
        self.circuit_breaker = CircuitBreaker(
            failure_threshold=self.config.get("circuit_breaker", {}).get("failure_threshold", 5),
            recovery_timeout=self.config.get("circuit_breaker", {}).get("recovery_timeout", 60)
        )
        self.response_cache = ResponseCache(
            ttl=self.config.get("caching", {}).get("ttl", 300)
        )
        
        # Setup multi-model configuration
        self.primary_model = self.config["model"]
        self.fallback_models = self.config.get("fallback_models", [
            "gemini-2.5-flash",  # Faster fallback
            "gemini-2.0-flash-exp"  # Experimental fallback
        ])
        # Remove primary model from fallbacks if present
        self.fallback_models = [m for m in self.fallback_models if m != self.primary_model]
        
        self.model_performance = {}  # Track performance per model
        self._initialize_model_stats()
        
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load and validate configuration from JSON file"""
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
            self._validate_config(config)
            return config
        except FileNotFoundError:
            raise ConfigurationError(f"Config file not found: {config_path}")
        except json.JSONDecodeError as e:
            raise ConfigurationError(f"Invalid JSON in config file: {config_path} - {str(e)}")
        except Exception as e:
            raise ConfigurationError(f"Error loading config: {str(e)}")
            
    def _validate_config(self, config: Dict[str, Any]):
        """Validate configuration structure and values"""
        required_keys = ["model", "uncertainty_keywords", "consultation_triggers", "rate_limiting"]
        
        for key in required_keys:
            if key not in config:
                raise ConfigurationError(f"Missing required config key: {key}")
        
        # Validate model
        valid_models = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash"]
        if config["model"] not in valid_models:
            raise ConfigurationError(f"Invalid model: {config['model']}. Must be one of: {valid_models}")
        
        # Validate rate limiting
        rate_config = config["rate_limiting"]
        if not isinstance(rate_config.get("requests_per_minute"), int) or rate_config["requests_per_minute"] <= 0:
            raise ConfigurationError("requests_per_minute must be a positive integer")
        
        if not isinstance(rate_config.get("timeout_seconds"), int) or rate_config["timeout_seconds"] <= 0:
            raise ConfigurationError("timeout_seconds must be a positive integer")
        
        # Validate consultation triggers
        triggers = config["consultation_triggers"]
        threshold = triggers.get("confidence_threshold")
        if not isinstance(threshold, (int, float)) or not 0 <= threshold <= 1:
            raise ConfigurationError("confidence_threshold must be a number between 0 and 1")
    
    def _default_config(self) -> Dict[str, Any]:
        """Return default configuration"""
        return {
            "model": "gemini-2.5-pro",
            "uncertainty_keywords": ["not sure", "uncertain", "might be", "could be"],
            "consultation_triggers": {
                "auto_consult_on_uncertainty": True,
                "confidence_threshold": 0.7
            },
            "rate_limiting": {
                "requests_per_minute": 10,
                "timeout_seconds": 30
            },
            "circuit_breaker": {
                "failure_threshold": 5,
                "recovery_timeout": 60
            },
            "caching": {
                "ttl": 300,
                "enabled": True
            },
            "retry": {
                "max_attempts": 3,
                "backoff_factor": 2.0
            }
        }
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging for the integration"""
        logger = logging.getLogger("gemini_integration")
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
        
    def _initialize_model_stats(self):
        """Initialize model performance tracking"""
        all_models = [self.primary_model] + self.fallback_models
        for model in all_models:
            self.model_performance[model] = {
                "success_count": 0,
                "failure_count": 0,
                "avg_response_time": 0.0,
                "last_success": None,
                "last_failure": None
            }
            
    def _update_model_stats(self, model: str, success: bool, response_time: float):
        """Update performance statistics for a model"""
        stats = self.model_performance.get(model, {})
        
        if success:
            stats["success_count"] = stats.get("success_count", 0) + 1
            stats["last_success"] = time.time()
            
            # Update average response time
            current_avg = stats.get("avg_response_time", 0.0)
            total_successes = stats["success_count"]
            stats["avg_response_time"] = ((current_avg * (total_successes - 1)) + response_time) / total_successes
        else:
            stats["failure_count"] = stats.get("failure_count", 0) + 1
            stats["last_failure"] = time.time()
            
        self.model_performance[model] = stats
        
    def _get_best_available_model(self) -> str:
        """Select the best performing available model"""
        all_models = [self.primary_model] + self.fallback_models
        
        # Calculate success rate for each model
        model_scores = []
        for model in all_models:
            stats = self.model_performance.get(model, {})
            success_count = stats.get("success_count", 0)
            failure_count = stats.get("failure_count", 0)
            total_attempts = success_count + failure_count
            
            if total_attempts == 0:
                success_rate = 1.0  # No data, assume good
            else:
                success_rate = success_count / total_attempts
                
            # Penalize recent failures
            last_failure = stats.get("last_failure")
            if last_failure and time.time() - last_failure < 300:  # 5 minutes
                success_rate *= 0.5
                
            avg_response_time = stats.get("avg_response_time", 10.0)
            
            # Combined score: success rate (80%) + speed bonus (20%)
            speed_bonus = max(0, (10.0 - avg_response_time) / 10.0) * 0.2
            score = (success_rate * 0.8) + speed_bonus
            
            model_scores.append((model, score))
            
        # Sort by score and return best model
        model_scores.sort(key=lambda x: x[1], reverse=True)
        selected_model = model_scores[0][0]
        
        self.logger.debug(f"Selected model: {selected_model} (scores: {model_scores})")
        return selected_model
    
    def detect_uncertainty(self, text: str) -> tuple[bool, float]:
        """
        Enhanced uncertainty detection using keywords, patterns, and confidence indicators
        Returns (is_uncertain, confidence_score)
        """
        if not text:
            return False, 1.0
            
        text_lower = text.lower()
        uncertainty_score = 0.0
        total_indicators = 0
        
        # 1. Keyword-based detection
        uncertainty_keywords = self.config.get("uncertainty_keywords", [])
        keyword_matches = 0
        for keyword in uncertainty_keywords:
            if keyword.lower() in text_lower:
                keyword_matches += 1
        
        if uncertainty_keywords:
            keyword_score = min(keyword_matches / len(uncertainty_keywords), 1.0)
            uncertainty_score += keyword_score * 0.4  # 40% weight
            total_indicators += 1
        
        # 2. Pattern-based detection using regex
        uncertainty_patterns = [
            r"I'?m (not sure|uncertain|unsure)",
            r"(might|could|possibly|maybe) (be|work|help)",
            r"(depends on|varies based on)",
            r"(multiple|several) (approaches|options|ways|methods)",
            r"(it'?s )?unclear (whether|if|how)",
            r"(there are|you have) (different|various|multiple) (options|choices)",
            r"(consider|think about|evaluate) (different|alternative) (approaches|methods)",
            r"(hard to say|difficult to determine)",
            r"(pros and cons|trade-?offs)",
            r"(more research|further investigation) (needed|required)"
        ]
        
        pattern_matches = 0
        for pattern in uncertainty_patterns:
            if re.search(pattern, text_lower):
                pattern_matches += 1
        
        if uncertainty_patterns:
            pattern_score = min(pattern_matches / len(uncertainty_patterns), 1.0)
            uncertainty_score += pattern_score * 0.3  # 30% weight
            total_indicators += 1
        
        # 3. Confidence indicators (inverse scoring)
        confidence_indicators = {
            r"definitely": 0.9,
            r"certainly": 0.8,
            r"clearly": 0.7,
            r"obviously": 0.7,
            r"absolutely": 0.9,
            r"without (a )?doubt": 0.8,
            r"(I'?m )?confident": 0.7,
            r"(best|recommended|preferred) (approach|method|way)": 0.6
        }
        
        confidence_score = 0.0
        confidence_matches = 0
        for pattern, weight in confidence_indicators.items():
            if re.search(pattern, text_lower):
                confidence_score += weight
                confidence_matches += 1
        
        if confidence_matches > 0:
            avg_confidence = confidence_score / confidence_matches
            uncertainty_score += (1 - avg_confidence) * 0.2  # 20% weight (inverse)
            total_indicators += 1
        
        # 4. Question density (questions often indicate uncertainty)
        question_count = text.count('?')
        sentence_count = max(text.count('.') + text.count('!') + question_count, 1)
        question_density = question_count / sentence_count
        uncertainty_score += min(question_density, 1.0) * 0.1  # 10% weight
        total_indicators += 1
        
        # Normalize the uncertainty score
        if total_indicators > 0:
            uncertainty_score = uncertainty_score / total_indicators
        
        # Determine if uncertain based on threshold
        threshold = 1 - self.config["consultation_triggers"]["confidence_threshold"]
        is_uncertain = uncertainty_score > threshold
        
        # Return confidence score (inverse of uncertainty)
        confidence_score = max(0.0, min(1.0, 1 - uncertainty_score))
        
        self.logger.debug(
            f"Uncertainty analysis: score={uncertainty_score:.3f}, "
            f"confidence={confidence_score:.3f}, threshold={threshold:.3f}, "
            f"uncertain={is_uncertain}"
        )
        
        return is_uncertain, confidence_score
    
    def _check_rate_limit(self) -> bool:
        """Check if we're within rate limits with sliding window"""
        current_time = time.time()
        
        # Initialize if first request
        if self.last_request_time == 0:
            self.last_request_time = current_time
            self.request_count = 0
        
        # Reset counter if more than a minute has passed
        if current_time - self.last_request_time > 60:
            self.request_count = 0
            self.last_request_time = current_time
        
        max_requests = self.config["rate_limiting"]["requests_per_minute"]
        
        if self.request_count >= max_requests:
            remaining_time = 60 - (current_time - self.last_request_time)
            self.logger.warning(
                f"Rate limit exceeded ({self.request_count}/{max_requests}). "
                f"Next request available in {remaining_time:.1f} seconds"
            )
            return False
        
        self.request_count += 1
        self.logger.debug(f"Rate limit check passed: {self.request_count}/{max_requests}")
        return True
    
    async def consult_gemini(self, request: ConsultationRequest) -> Optional[str]:
        """
        Consult Gemini for a second opinion with caching and circuit breaker
        """
        # Check cache first if enabled
        if self.config.get("caching", {}).get("enabled", True):
            cached_response = self.response_cache.get(request)
            if cached_response:
                self.logger.info("Returning cached Gemini response")
                return cached_response
        
        # Check rate limits
        if not self._check_rate_limit():
            raise RateLimitError("Rate limit exceeded. Please wait before making another request.")
        
        try:
            # Use circuit breaker pattern
            def _make_request():
                return asyncio.create_task(self._make_gemini_request(request))
            
            task = self.circuit_breaker.call(_make_request)
            result = await task
            
            if result:
                formatted_response = self._format_response(result, request)
                
                # Cache the response
                if self.config.get("caching", {}).get("enabled", True):
                    self.response_cache.set(request, formatted_response)
                
                self.logger.info("Successfully received Gemini consultation")
                return formatted_response
            else:
                raise GeminiAPIError("Empty response from Gemini API")
                
        except CircuitBreakerOpenError as e:
            self.logger.error(f"Circuit breaker open: {str(e)}")
            raise e
        except RateLimitError as e:
            self.logger.warning(f"Rate limit error: {str(e)}")
            raise e
        except AuthenticationError as e:
            self.logger.error(f"Authentication error: {str(e)}")
            raise e
        except Exception as e:
            self.logger.error(f"Unexpected error during Gemini consultation: {str(e)}")
            raise GeminiAPIError(f"Failed to consult Gemini: {str(e)}")
            
    async def _make_gemini_request(self, request: ConsultationRequest) -> Optional[str]:
        """Make the actual request to Gemini with multi-model fallback"""
        models_to_try = [self._get_best_available_model()] + self.fallback_models
        # Remove duplicates while preserving order
        models_to_try = list(dict.fromkeys(models_to_try))
        
        last_exception = None
        
        for model_index, model in enumerate(models_to_try):
            start_time = time.time()
            max_attempts = self.config.get("retry", {}).get("max_attempts", 2)  # Reduced since we have fallbacks
            backoff_factor = self.config.get("retry", {}).get("backoff_factor", 2.0)
            
            self.logger.info(f"Trying model {model} (attempt {model_index + 1}/{len(models_to_try)})")
            
            for attempt in range(max_attempts):
                try:
                    prompt = self._construct_prompt(request)
                    result = await self._call_gemini_cli_with_model(prompt, model)
                    
                    # Update success statistics
                    response_time = time.time() - start_time
                    self._update_model_stats(model, True, response_time)
                    
                    if result:
                        self.logger.info(f"Success with model {model} after {response_time:.2f}s")
                        return result
                    
                except Exception as e:
                    last_exception = e
                    response_time = time.time() - start_time
                    self._update_model_stats(model, False, response_time)
                    
                    self.logger.warning(
                        f"Model {model} attempt {attempt + 1}/{max_attempts} failed: {str(e)}"
                    )
                    
                    # If this is the last attempt for this model, try next model
                    if attempt == max_attempts - 1:
                        break
                    
                    # Wait before retry (but not before trying next model)
                    wait_time = backoff_factor ** attempt
                    await asyncio.sleep(wait_time)
        
        # All models failed
        if last_exception:
            raise last_exception
        
        raise GeminiAPIError("All models failed to provide a response")
    
    def _construct_prompt(self, request: ConsultationRequest) -> str:
        """Construct a prompt for Gemini consultation"""
        base_prompt = f"""
You are providing a second opinion on a technical question. Another AI assistant (Claude) has provided an initial response, but there may be uncertainty or complexity involved.

Original Query: {request.query}

Context: {request.context}

Uncertainty Detected: {request.uncertainty_detected}

Please provide:
1. Your independent analysis of the question
2. Alternative approaches or considerations
3. Areas where you agree or disagree with the initial assessment
4. Any additional insights or recommendations

Keep your response focused and practical. Aim for clarity and actionable advice.
"""
        return base_prompt
    
    async def _call_gemini_cli_with_model(self, prompt: str, model: str) -> Optional[str]:
        """Call Gemini CLI with the given prompt and enhanced error handling"""
        try:
            # Validate API key first
            api_key = os.getenv('GOOGLE_API_KEY')
            if not api_key:
                raise AuthenticationError("GOOGLE_API_KEY environment variable is required but not set")
            
            # Use gemini CLI command with prompt flag
            cmd = [
                "gemini", 
                "--model", model,
                "--prompt", prompt
            ]
            
            env = dict(os.environ)
            env['GOOGLE_API_KEY'] = api_key
            
            self.logger.debug(f"Calling Gemini CLI with model: {model}")
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env
            )
            
            timeout_seconds = self.config["rate_limiting"]["timeout_seconds"]
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout_seconds
            )
            
            if process.returncode == 0:
                response = stdout.decode('utf-8').strip()
                if not response:
                    raise GeminiAPIError("Received empty response from Gemini CLI")
                return response
            else:
                error_msg = stderr.decode('utf-8').strip()
                self.logger.error(f"Gemini CLI error (code {process.returncode}): {error_msg}")
                
                # Parse specific error types
                if "quota" in error_msg.lower() or "limit" in error_msg.lower():
                    raise RateLimitError(f"Gemini API rate limit exceeded: {error_msg}")
                elif "auth" in error_msg.lower() or "key" in error_msg.lower():
                    raise AuthenticationError(f"Gemini API authentication failed: {error_msg}")
                else:
                    raise GeminiAPIError(f"Gemini CLI failed: {error_msg}")
                
        except asyncio.TimeoutError:
            error_msg = f"Gemini CLI call timed out after {timeout_seconds} seconds"
            self.logger.error(error_msg)
            raise GeminiAPIError(error_msg)
        except (AuthenticationError, RateLimitError, GeminiAPIError):
            raise  # Re-raise our custom exceptions
        except FileNotFoundError:
            raise GeminiAPIError("Gemini CLI not found. Please install it with: npm install -g @google/gemini-cli")
        except Exception as e:
            self.logger.error(f"Unexpected error calling Gemini CLI: {str(e)}")
            raise GeminiAPIError(f"Unexpected error calling Gemini CLI: {str(e)}")
    
    def _format_response(self, gemini_response: str, request: ConsultationRequest) -> str:
        """Format the Gemini response for display"""
        formatted = f"""
🤖 **Gemini Second Opinion**

{gemini_response}

---
*Consultation triggered by: {'Uncertainty detection' if request.uncertainty_detected else 'Manual request'}*
*Confidence score: {request.confidence_score:.2f}*
"""
        return formatted
    
    def should_auto_consult(self, text: str) -> bool:
        """Determine if we should automatically consult Gemini"""
        if not self.config["consultation_triggers"]["auto_consult_on_uncertainty"]:
            return False
        
        is_uncertain, confidence = self.detect_uncertainty(text)
        return is_uncertain

# Usage example and testing
if __name__ == "__main__":
    async def test_integration():
        integration = GeminiIntegration("gemini-config.json")
        
        # Test uncertainty detection
        test_text = "I'm not sure about this approach, it might be better to use a different method"
        is_uncertain, confidence = integration.detect_uncertainty(test_text)
        print(f"Uncertainty detected: {is_uncertain}, Confidence: {confidence}")
        
        # Test consultation
        request = ConsultationRequest(
            query="How should I implement authentication in a web application?",
            context="Working on a Python Flask application",
            uncertainty_detected=True,
            confidence_score=0.6
        )
        
        response = await integration.consult_gemini(request)
        if response:
            print("Gemini Response:")
            print(response)
        else:
            print("Failed to get Gemini response")
    
    # Run test
    asyncio.run(test_integration())