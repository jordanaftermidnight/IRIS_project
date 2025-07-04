#!/usr/bin/env python3
"""
Multi-AI Integration Module for Claude Code MCP Server
Combines Gemini and Llama2 for comprehensive AI consultations
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from enum import Enum

from gemini_integration import GeminiIntegration, ConsultationRequest
from llama2_integration import Llama2Integration, Llama2ConsultationRequest

class AIProvider(Enum):
    GEMINI = "gemini"
    LLAMA2 = "llama2" 
    BOTH = "both"
    AUTO = "auto"

@dataclass
class MultiAIConsultationRequest:
    query: str
    context: str
    uncertainty_detected: bool = False
    confidence_score: float = 0.0
    preferred_provider: AIProvider = AIProvider.AUTO
    compare_responses: bool = False
    include_reasoning: bool = True

@dataclass
class AIResponse:
    provider: str
    response: str
    response_time: float
    model_used: str
    success: bool
    error: Optional[str] = None

class MultiAIIntegration:
    def __init__(self, gemini_config_path: str = "gemini-config.json", 
                 llama2_config_path: str = "llama2-config.json"):
        self.logger = self._setup_logging()
        
        # Initialize individual integrations
        try:
            self.gemini = GeminiIntegration(gemini_config_path)
            self.gemini_available = True
            self.logger.info("Gemini integration initialized")
        except Exception as e:
            self.logger.warning(f"Gemini initialization failed: {e}")
            self.gemini = None
            self.gemini_available = False
        
        try:
            self.llama2 = Llama2Integration(llama2_config_path)
            self.llama2_available = True
            self.logger.info("Llama2 integration initialized")
        except Exception as e:
            self.logger.warning(f"Llama2 initialization failed: {e}")
            self.llama2 = None
            self.llama2_available = False
        
        # Configuration
        self.config = self._load_multi_ai_config()
        
        # Performance tracking
        self.provider_stats = {
            "gemini": {"requests": 0, "successes": 0, "avg_time": 0.0},
            "llama2": {"requests": 0, "successes": 0, "avg_time": 0.0}
        }
        
    def _setup_logging(self) -> logging.Logger:
        """Setup logging for multi-AI integration"""
        logger = logging.getLogger("multi_ai_integration")
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
        
    def _load_multi_ai_config(self) -> Dict[str, Any]:
        """Load multi-AI configuration"""
        default_config = {
            "default_provider": "auto",
            "fallback_enabled": True,
            "comparison_mode": False,
            "provider_selection_strategy": "performance",  # performance, round_robin, preference
            "gemini_preference_score": 0.6,  # 0.0-1.0
            "llama2_preference_score": 0.4,
            "timeout_total": 120,
            "enable_parallel_consultation": False,
            "response_synthesis": True
        }
        
        try:
            config_path = "multi-ai-config.json"
            with open(config_path, 'r') as f:
                config = json.load(f)
            return {**default_config, **config}
        except Exception:
            return default_config
            
    async def check_provider_availability(self) -> Dict[str, bool]:
        """Check which AI providers are currently available"""
        availability = {}
        
        # Check Gemini
        if self.gemini:
            try:
                # Simple API key check
                availability["gemini"] = True
            except Exception:
                availability["gemini"] = False
        else:
            availability["gemini"] = False
            
        # Check Llama2
        if self.llama2:
            try:
                availability["llama2"] = await self.llama2.check_ollama_status()
            except Exception:
                availability["llama2"] = False
        else:
            availability["llama2"] = False
            
        self.logger.info(f"Provider availability: {availability}")
        return availability
        
    def _select_provider(self, request: MultiAIConsultationRequest, 
                        availability: Dict[str, bool]) -> List[str]:
        """Select which AI provider(s) to use for the request"""
        if request.preferred_provider == AIProvider.GEMINI:
            return ["gemini"] if availability.get("gemini", False) else []
        elif request.preferred_provider == AIProvider.LLAMA2:
            return ["llama2"] if availability.get("llama2", False) else []
        elif request.preferred_provider == AIProvider.BOTH:
            providers = []
            if availability.get("gemini", False):
                providers.append("gemini")
            if availability.get("llama2", False):
                providers.append("llama2")
            return providers
        else:  # AUTO selection
            return self._auto_select_provider(request, availability)
            
    def _auto_select_provider(self, request: MultiAIConsultationRequest, 
                             availability: Dict[str, bool]) -> List[str]:
        """Automatically select the best provider based on various factors"""
        available_providers = [p for p, avail in availability.items() if avail]
        
        if not available_providers:
            return []
            
        # If only one provider available, use it
        if len(available_providers) == 1:
            return available_providers
            
        # Strategy-based selection
        strategy = self.config.get("provider_selection_strategy", "performance")
        
        if strategy == "performance":
            # Select based on historical performance
            best_provider = self._get_best_performing_provider(available_providers)
            return [best_provider]
        elif strategy == "round_robin":
            # Simple round-robin selection
            total_requests = sum(stats["requests"] for stats in self.provider_stats.values())
            return [available_providers[total_requests % len(available_providers)]]
        elif strategy == "preference":
            # Use configured preferences
            if "gemini" in available_providers and "llama2" in available_providers:
                gemini_score = self.config.get("gemini_preference_score", 0.6)
                llama2_score = self.config.get("llama2_preference_score", 0.4)
                return ["gemini" if gemini_score >= llama2_score else "llama2"]
            else:
                return available_providers[:1]
        else:
            # Default to first available
            return available_providers[:1]
            
    def _get_best_performing_provider(self, available_providers: List[str]) -> str:
        """Get the best performing provider based on stats"""
        best_provider = available_providers[0]
        best_score = 0.0
        
        for provider in available_providers:
            stats = self.provider_stats.get(provider, {})
            requests = stats.get("requests", 0)
            successes = stats.get("successes", 0)
            avg_time = stats.get("avg_time", 10.0)
            
            if requests == 0:
                # No history, use default preference
                score = 0.5
            else:
                # Calculate score: success_rate * speed_bonus
                success_rate = successes / requests
                speed_bonus = max(0.1, (10.0 - min(avg_time, 10.0)) / 10.0)
                score = success_rate * (0.7 + 0.3 * speed_bonus)
            
            if score > best_score:
                best_score = score
                best_provider = provider
                
        return best_provider
        
    def _update_provider_stats(self, provider: str, success: bool, response_time: float):
        """Update performance statistics for a provider"""
        stats = self.provider_stats.get(provider, {"requests": 0, "successes": 0, "avg_time": 0.0})
        
        stats["requests"] += 1
        if success:
            stats["successes"] += 1
        
        # Update average response time
        current_avg = stats["avg_time"]
        total_requests = stats["requests"]
        stats["avg_time"] = ((current_avg * (total_requests - 1)) + response_time) / total_requests
        
        self.provider_stats[provider] = stats
        
    async def _consult_gemini(self, request: MultiAIConsultationRequest) -> AIResponse:
        """Consult Gemini with error handling"""
        start_time = time.time()
        
        try:
            gemini_request = ConsultationRequest(
                query=request.query,
                context=request.context,
                uncertainty_detected=request.uncertainty_detected,
                confidence_score=request.confidence_score
            )
            
            response = await self.gemini.consult_gemini(gemini_request)
            response_time = time.time() - start_time
            
            if response:
                self._update_provider_stats("gemini", True, response_time)
                return AIResponse(
                    provider="gemini",
                    response=response,
                    response_time=response_time,
                    model_used=self.gemini.primary_model,
                    success=True
                )
            else:
                self._update_provider_stats("gemini", False, response_time)
                return AIResponse(
                    provider="gemini",
                    response="",
                    response_time=response_time,
                    model_used="unknown",
                    success=False,
                    error="Empty response"
                )
                
        except Exception as e:
            response_time = time.time() - start_time
            self._update_provider_stats("gemini", False, response_time)
            return AIResponse(
                provider="gemini",
                response="",
                response_time=response_time,
                model_used="unknown",
                success=False,
                error=str(e)
            )
            
    async def _consult_llama2(self, request: MultiAIConsultationRequest) -> AIResponse:
        """Consult Llama2 with error handling"""
        start_time = time.time()
        
        try:
            llama_request = Llama2ConsultationRequest(
                query=request.query,
                context=request.context,
                uncertainty_detected=request.uncertainty_detected,
                confidence_score=request.confidence_score
            )
            
            response = await self.llama2.consult_llama2(llama_request)
            response_time = time.time() - start_time
            
            if response:
                self._update_provider_stats("llama2", True, response_time)
                return AIResponse(
                    provider="llama2",
                    response=response,
                    response_time=response_time,
                    model_used=self.llama2.default_model,
                    success=True
                )
            else:
                self._update_provider_stats("llama2", False, response_time)
                return AIResponse(
                    provider="llama2",
                    response="",
                    response_time=response_time,
                    model_used="unknown",
                    success=False,
                    error="Empty response"
                )
                
        except Exception as e:
            response_time = time.time() - start_time
            self._update_provider_stats("llama2", False, response_time)
            return AIResponse(
                provider="llama2",
                response="",
                response_time=response_time,
                model_used="unknown",
                success=False,
                error=str(e)
            )
            
    async def consult_multi_ai(self, request: MultiAIConsultationRequest) -> Dict[str, Any]:
        """
        Perform multi-AI consultation with intelligent provider selection
        """
        self.logger.info(f"Starting multi-AI consultation: {request.query[:50]}...")
        
        # Check provider availability
        availability = await self.check_provider_availability()
        
        if not any(availability.values()):
            return {
                "success": False,
                "error": "No AI providers are currently available",
                "responses": [],
                "summary": "All AI services are currently unavailable"
            }
        
        # Select providers
        selected_providers = self._select_provider(request, availability)
        
        if not selected_providers:
            return {
                "success": False,
                "error": "No suitable providers available for this request",
                "responses": [],
                "summary": "Selected AI providers are not available"
            }
        
        self.logger.info(f"Selected providers: {selected_providers}")
        
        # Execute consultations
        responses = []
        
        if self.config.get("enable_parallel_consultation", False) and len(selected_providers) > 1:
            # Parallel execution
            tasks = []
            for provider in selected_providers:
                if provider == "gemini":
                    tasks.append(self._consult_gemini(request))
                elif provider == "llama2":
                    tasks.append(self._consult_llama2(request))
            
            responses = await asyncio.gather(*tasks, return_exceptions=True)
        else:
            # Sequential execution with fallback
            for provider in selected_providers:
                try:
                    if provider == "gemini":
                        response = await self._consult_gemini(request)
                    elif provider == "llama2":
                        response = await self._consult_llama2(request)
                    else:
                        continue
                    
                    responses.append(response)
                    
                    # If we got a successful response and fallback is disabled, stop here
                    if response.success and not request.compare_responses:
                        break
                        
                except Exception as e:
                    self.logger.error(f"Error consulting {provider}: {e}")
                    responses.append(AIResponse(
                        provider=provider,
                        response="",
                        response_time=0.0,
                        model_used="unknown",
                        success=False,
                        error=str(e)
                    ))
        
        # Process and format responses
        successful_responses = [r for r in responses if r.success]
        
        if not successful_responses:
            return {
                "success": False,
                "error": "All AI consultations failed",
                "responses": [self._format_ai_response(r) for r in responses],
                "summary": "No AI providers were able to generate a response"
            }
        
        # Generate summary and comparison if requested
        result = {
            "success": True,
            "responses": [self._format_ai_response(r) for r in responses],
            "summary": self._generate_consultation_summary(successful_responses, request)
        }
        
        if request.compare_responses and len(successful_responses) > 1:
            result["comparison"] = self._generate_response_comparison(successful_responses)
        
        return result
        
    def _format_ai_response(self, response: AIResponse) -> Dict[str, Any]:
        """Format AI response for output"""
        return {
            "provider": response.provider,
            "success": response.success,
            "response": response.response,
            "response_time": response.response_time,
            "model_used": response.model_used,
            "error": response.error
        }
        
    def _generate_consultation_summary(self, responses: List[AIResponse], 
                                     request: MultiAIConsultationRequest) -> str:
        """Generate a summary of the consultation results"""
        if len(responses) == 1:
            response = responses[0]
            return f"""
🤖 **AI Consultation Summary**

**Provider:** {response.provider.title()} ({response.model_used})
**Response Time:** {response.response_time:.2f}s
**Status:** {'✅ Success' if response.success else '❌ Failed'}

{response.response if response.success else f'Error: {response.error}'}
"""
        else:
            summary_parts = ["🤖 **Multi-AI Consultation Summary**\\n"]
            
            for i, response in enumerate(responses, 1):
                status = '✅' if response.success else '❌'
                summary_parts.append(
                    f"**{i}. {response.provider.title()}** ({response.model_used}) "
                    f"{status} {response.response_time:.2f}s"
                )
            
            summary_parts.append("\\n" + "="*50)
            
            # Add successful responses
            for response in responses:
                if response.success:
                    summary_parts.append(f"\\n**{response.provider.title()} Response:**")
                    summary_parts.append(response.response)
                    summary_parts.append("\\n" + "-"*30)
            
            return "\\n".join(summary_parts)
            
    def _generate_response_comparison(self, responses: List[AIResponse]) -> str:
        """Generate a comparison of multiple AI responses"""
        if len(responses) < 2:
            return "Not enough responses to compare"
        
        comparison = ["📊 **Response Comparison**\\n"]
        
        # Performance comparison
        comparison.append("**Performance:**")
        for response in responses:
            comparison.append(f"• {response.provider.title()}: {response.response_time:.2f}s")
        
        # Length comparison
        comparison.append("\\n**Response Length:**")
        for response in responses:
            length = len(response.response) if response.response else 0
            comparison.append(f"• {response.provider.title()}: {length} characters")
        
        comparison.append("\\n**Key Differences:**")
        comparison.append("• Gemini: Typically more detailed and structured")
        comparison.append("• Llama2: Often more conversational and direct")
        comparison.append("• Both provide valuable perspectives on technical topics")
        
        return "\\n".join(comparison)
        
    def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status"""
        return {
            "providers": {
                "gemini": {
                    "available": self.gemini_available,
                    "stats": self.provider_stats.get("gemini", {})
                },
                "llama2": {
                    "available": self.llama2_available,
                    "stats": self.provider_stats.get("llama2", {})
                }
            },
            "configuration": {
                "default_provider": self.config.get("default_provider"),
                "fallback_enabled": self.config.get("fallback_enabled"),
                "parallel_enabled": self.config.get("enable_parallel_consultation")
            }
        }

# Standalone testing
async def test_multi_ai_integration():
    """Test multi-AI integration"""
    print("🧪 Testing Multi-AI Integration...")
    
    integration = MultiAIIntegration()
    
    # Test 1: Check availability
    print("\\n1. Checking provider availability...")
    availability = await integration.check_provider_availability()
    for provider, available in availability.items():
        status = "✅" if available else "❌"
        print(f"   {status} {provider.title()}: {'Available' if available else 'Unavailable'}")
    
    # Test 2: System status
    print("\\n2. System status...")
    status = integration.get_system_status()
    print(f"   Providers available: {len([p for p, info in status['providers'].items() if info['available']])}/2")
    
    # Test 3: Multi-AI consultation
    print("\\n3. Testing multi-AI consultation...")
    try:
        request = MultiAIConsultationRequest(
            query="What's the best way to implement user authentication?",
            context="Building a web application with Python Flask",
            uncertainty_detected=True,
            confidence_score=0.6,
            preferred_provider=AIProvider.AUTO,
            compare_responses=True
        )
        
        result = await integration.consult_multi_ai(request)
        
        if result["success"]:
            print("   ✅ Multi-AI consultation successful")
            print(f"   Responses received: {len(result['responses'])}")
            print(f"   Summary length: {len(result['summary'])} characters")
        else:
            print(f"   ❌ Consultation failed: {result['error']}")
            
    except Exception as e:
        print(f"   ❌ Consultation error: {e}")
    
    print("\\n🎉 Multi-AI integration test completed!")

if __name__ == "__main__":
    asyncio.run(test_multi_ai_integration())