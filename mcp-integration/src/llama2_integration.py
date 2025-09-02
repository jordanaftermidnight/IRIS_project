#!/usr/bin/env python3
"""
Llama2 Integration Module for Claude Code MCP Server
Handles communication with local Ollama server for Llama2 consultations
"""

import asyncio
import json
import logging
import time
import httpx
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import subprocess
import os

@dataclass
class Llama2ConsultationRequest:
    query: str
    context: str
    uncertainty_detected: bool = False
    confidence_score: float = 0.0
    model: str = "llama2:7b"

class Llama2IntegrationError(Exception):
    """Base exception for Llama2 integration errors"""
    pass

class OllamaConnectionError(Llama2IntegrationError):
    """Raised when cannot connect to Ollama server"""
    pass

class ModelNotAvailableError(Llama2IntegrationError):
    """Raised when requested model is not available"""
    pass

class Llama2Integration:
    def __init__(self, config_path: str):
        self.config = self._load_config(config_path)
        self.logger = self._setup_logging()
        self.ollama_host = self.config.get("ollama_host", "http://localhost:11434")
        self.default_model = self.config.get("default_model", "llama2:7b")
        self.timeout = self.config.get("timeout_seconds", 60)
        self.max_tokens = self.config.get("max_tokens", 2048)
        
        # Available models cache
        self.available_models = []
        self.last_model_check = 0
        self.model_check_interval = 300  # 5 minutes
        
    def _setup_logging(self) -> logging.Logger:
        """Setup logging for Llama2 integration"""
        logger = logging.getLogger("llama2_integration")
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
        
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load Llama2 configuration"""
        default_config = {
            "ollama_host": "http://localhost:11434",
            "default_model": "llama2:7b",
            "fallback_models": ["llama2:13b", "llama2", "llama3.2:3b"],
            "timeout_seconds": 60,
            "max_tokens": 2048,
            "temperature": 0.7,
            "auto_install_models": True,
            "preferred_model_size": "7b"  # 7b, 13b, 70b
        }
        
        try:
            if os.path.exists(config_path):
                with open(config_path, 'r') as f:
                    config = json.load(f)
                # Merge with defaults
                llama_config = config.get("llama2", {})
                return {**default_config, **llama_config}
        except Exception as e:
            self.logger.warning(f"Could not load Llama2 config: {e}, using defaults")
        
        return default_config
        
    async def check_ollama_status(self) -> bool:
        """Check if Ollama server is running and accessible"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.ollama_host}/api/tags")
                return response.status_code == 200
        except Exception as e:
            self.logger.error(f"Cannot connect to Ollama: {e}")
            return False
            
    async def get_available_models(self, force_refresh: bool = False) -> List[str]:
        """Get list of available Llama models from Ollama"""
        current_time = time.time()
        
        # Use cache if recent and not forcing refresh
        if (not force_refresh and 
            self.available_models and 
            current_time - self.last_model_check < self.model_check_interval):
            return self.available_models
            
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.ollama_host}/api/tags")
                response.raise_for_status()
                
                data = response.json()
                models = [model["name"] for model in data.get("models", [])]
                
                # Filter for Llama models
                llama_models = [m for m in models if "llama" in m.lower()]
                
                self.available_models = llama_models
                self.last_model_check = current_time
                
                self.logger.info(f"Found {len(llama_models)} Llama models: {llama_models}")
                return llama_models
                
        except Exception as e:
            self.logger.error(f"Error getting models: {e}")
            raise OllamaConnectionError(f"Cannot retrieve models from Ollama: {e}")
            
    async def ensure_model_available(self, model: str) -> bool:
        """Ensure a specific model is available, attempt to pull if not"""
        available_models = await self.get_available_models(force_refresh=True)
        
        if model in available_models:
            return True
            
        if not self.config.get("auto_install_models", True):
            raise ModelNotAvailableError(f"Model {model} not available and auto-install disabled")
            
        self.logger.info(f"Model {model} not found, attempting to pull...")
        
        try:
            # Use Ollama CLI to pull the model
            process = await asyncio.create_subprocess_exec(
                "ollama", "pull", model,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=300  # 5 minutes for model download
            )
            
            if process.returncode == 0:
                self.logger.info(f"Successfully pulled model {model}")
                # Refresh model cache
                await self.get_available_models(force_refresh=True)
                return True
            else:
                self.logger.error(f"Failed to pull model {model}: {stderr.decode()}")
                return False
                
        except asyncio.TimeoutError:
            self.logger.error(f"Timeout pulling model {model}")
            return False
        except Exception as e:
            self.logger.error(f"Error pulling model {model}: {e}")
            return False
            
    async def select_best_model(self, request: Llama2ConsultationRequest) -> str:
        """Select the best available model for the request"""
        # Try the requested model first
        if request.model:
            try:
                if await self.ensure_model_available(request.model):
                    return request.model
            except Exception as e:
                self.logger.warning(f"Requested model {request.model} unavailable: {e}")
        
        # Try default model
        try:
            if await self.ensure_model_available(self.default_model):
                return self.default_model
        except Exception as e:
            self.logger.warning(f"Default model {self.default_model} unavailable: {e}")
        
        # Try fallback models
        fallback_models = self.config.get("fallback_models", [])
        for model in fallback_models:
            try:
                if await self.ensure_model_available(model):
                    self.logger.info(f"Using fallback model: {model}")
                    return model
            except Exception:
                continue
        
        # If all else fails, try to find any llama model
        available_models = await self.get_available_models()
        if available_models:
            model = available_models[0]
            self.logger.warning(f"Using any available model: {model}")
            return model
            
        raise ModelNotAvailableError("No Llama models available")
        
    def _construct_prompt(self, request: Llama2ConsultationRequest) -> str:
        """Construct a prompt for Llama2 consultation"""
        base_prompt = f"""You are providing a second opinion on a technical question. Another AI assistant (Claude) has provided an initial response, but there may be uncertainty or complexity involved.

Original Query: {request.query}

Context: {request.context}

Uncertainty Detected: {request.uncertainty_detected}
Confidence Score: {request.confidence_score:.2f}

Please provide:
1. Your independent analysis of the question
2. Alternative approaches or considerations  
3. Areas where you might agree or disagree with typical solutions
4. Any additional insights or recommendations

Keep your response focused, practical, and under 500 words. Aim for clarity and actionable advice.
"""
        return base_prompt
        
    async def consult_llama2(self, request: Llama2ConsultationRequest) -> Optional[str]:
        """
        Consult Llama2 for a second opinion using Ollama
        """
        try:
            # Check Ollama status
            if not await self.check_ollama_status():
                raise OllamaConnectionError("Ollama server is not running or accessible")
            
            # Select best available model
            model = await self.select_best_model(request)
            self.logger.info(f"Using model: {model}")
            
            # Construct prompt
            prompt = self._construct_prompt(request)
            
            # Prepare request payload
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": self.config.get("temperature", 0.7),
                    "num_predict": self.max_tokens
                }
            }
            
            # Make request to Ollama
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                self.logger.info("Sending request to Ollama...")
                start_time = time.time()
                
                response = await client.post(
                    f"{self.ollama_host}/api/generate",
                    json=payload
                )
                
                response.raise_for_status()
                result = response.json()
                
                response_time = time.time() - start_time
                self.logger.info(f"Llama2 response received in {response_time:.2f}s")
                
                # Extract response text
                llama_response = result.get("response", "").strip()
                
                if not llama_response:
                    raise Llama2IntegrationError("Empty response from Llama2")
                
                # Format the response
                formatted_response = self._format_response(llama_response, request, model, response_time)
                
                return formatted_response
                
        except OllamaConnectionError:
            raise
        except ModelNotAvailableError:
            raise
        except Exception as e:
            self.logger.error(f"Error during Llama2 consultation: {str(e)}")
            raise Llama2IntegrationError(f"Failed to consult Llama2: {str(e)}")
            
    def _format_response(self, llama_response: str, request: Llama2ConsultationRequest, 
                        model: str, response_time: float) -> str:
        """Format the Llama2 response for display"""
        formatted = f"""
🦙 **Llama2 Second Opinion** ({model})

{llama_response}

---
*Local consultation • Response time: {response_time:.2f}s*
*Triggered by: {'Uncertainty detection' if request.uncertainty_detected else 'Manual request'}*
*Confidence score: {request.confidence_score:.2f}*
"""
        return formatted
        
    async def get_system_info(self) -> Dict[str, Any]:
        """Get Ollama system information"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Get version info
                version_response = await client.get(f"{self.ollama_host}/api/version")
                version_info = version_response.json() if version_response.status_code == 200 else {}
                
                # Get available models
                models = await self.get_available_models()
                
                return {
                    "ollama_host": self.ollama_host,
                    "version": version_info.get("version", "unknown"),
                    "available_models": models,
                    "default_model": self.default_model,
                    "status": "connected"
                }
                
        except Exception as e:
            return {
                "ollama_host": self.ollama_host,
                "status": "disconnected",
                "error": str(e)
            }

# Utility functions for standalone testing
async def test_llama2_integration():
    """Test Llama2 integration standalone"""
    print("🧪 Testing Llama2 Integration...")
    
    # Create integration instance
    integration = Llama2Integration("llama2-config.json")
    
    # Test 1: Check Ollama status
    print("\\n1. Testing Ollama connection...")
    status = await integration.check_ollama_status()
    print(f"   {'✅' if status else '❌'} Ollama status: {'Connected' if status else 'Disconnected'}")
    
    if not status:
        print("   💡 Make sure Ollama is running: 'ollama serve'")
        return
    
    # Test 2: Get available models
    print("\\n2. Getting available models...")
    try:
        models = await integration.get_available_models()
        print(f"   ✅ Found {len(models)} Llama models: {models}")
    except Exception as e:
        print(f"   ❌ Error getting models: {e}")
        return
    
    # Test 3: System info
    print("\\n3. Getting system info...")
    info = await integration.get_system_info()
    print(f"   Status: {info['status']}")
    print(f"   Default model: {info.get('default_model', 'unknown')}")
    
    # Test 4: Simple consultation
    print("\\n4. Testing consultation...")
    try:
        request = Llama2ConsultationRequest(
            query="What's the best way to implement user authentication in a web application?",
            context="Building a Python Flask application with a PostgreSQL database",
            uncertainty_detected=True,
            confidence_score=0.6
        )
        
        response = await integration.consult_llama2(request)
        if response:
            print("   ✅ Consultation successful")
            print(f"   Response length: {len(response)} characters")
            print(f"   Preview: {response[:200]}...")
        else:
            print("   ❌ No response received")
            
    except Exception as e:
        print(f"   ❌ Consultation failed: {e}")
    
    print("\\n🎉 Llama2 integration test completed!")

if __name__ == "__main__":
    asyncio.run(test_llama2_integration())