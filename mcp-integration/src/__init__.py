"""
Multi-AI MCP Integration Package
A comprehensive multi-provider AI consultation system for Claude Code
"""

__version__ = "1.0.0"
__author__ = "Multi-AI Integration Team"
__description__ = "Multi-provider AI consultation system with Gemini and Llama2"

from .multi_ai_integration import MultiAIIntegration, MultiAIConsultationRequest, AIProvider
from .gemini_integration import GeminiIntegration, ConsultationRequest
from .llama2_integration import Llama2Integration, Llama2ConsultationRequest

__all__ = [
    "MultiAIIntegration",
    "MultiAIConsultationRequest", 
    "AIProvider",
    "GeminiIntegration",
    "ConsultationRequest",
    "Llama2Integration",
    "Llama2ConsultationRequest"
]