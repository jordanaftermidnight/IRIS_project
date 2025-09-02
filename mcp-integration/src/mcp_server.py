#!/usr/bin/env python3
"""
Enhanced MCP Server for Multi-AI Integration with Claude Code
Provides tools for both Gemini and Llama2 consultation
"""

import asyncio
import json
import logging
import os
import sys
from typing import Any, Dict, List, Optional

# MCP imports
try:
    from mcp.server import Server
    from mcp.server.models import InitializationOptions
    from mcp.server.stdio import stdio_server
    from mcp.types import (
        Tool,
        TextContent,
        CallToolRequest,
        CallToolResult,
        ListToolsRequest,
        ListToolsResult,
    )
except ImportError:
    print("MCP library not installed. Install with: pip install mcp")
    sys.exit(1)

from multi_ai_integration import MultiAIIntegration, MultiAIConsultationRequest, AIProvider
from gemini_integration import (
    GeminiIntegrationError,
    GeminiAPIError,
    RateLimitError,
    AuthenticationError,
    ConfigurationError,
    CircuitBreakerOpenError
)
from llama2_integration import (
    Llama2IntegrationError,
    OllamaConnectionError,
    ModelNotAvailableError
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("enhanced-mcp-server")

class EnhancedMCPServer:
    def __init__(self):
        self.server = Server("multi-ai-consultant")
        self.multi_ai = None
        self.setup_handlers()
    
    def setup_handlers(self):
        """Setup MCP server handlers"""
        
        @self.server.list_tools()
        async def list_tools() -> ListToolsResult:
            """List available tools"""
            return ListToolsResult(
                tools=[
                    # Multi-AI consultation tools
                    Tool(
                        name="consult_multi_ai",
                        description="Get opinions from multiple AI providers (Gemini + Llama2) for comprehensive analysis",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "query": {
                                    "type": "string",
                                    "description": "The technical question or problem to analyze"
                                },
                                "context": {
                                    "type": "string",
                                    "description": "Additional context about the problem or situation"
                                },
                                "provider": {
                                    "type": "string",
                                    "enum": ["auto", "gemini", "llama2", "both"],
                                    "description": "Preferred AI provider (auto=smart selection, both=compare responses)",
                                    "default": "auto"
                                },
                                "compare_responses": {
                                    "type": "boolean",
                                    "description": "Whether to compare responses from multiple providers",
                                    "default": False
                                }
                            },
                            "required": ["query"]
                        }
                    ),
                    # Individual provider tools
                    Tool(
                        name="consult_gemini",
                        description="Get a second opinion from Google Gemini AI on technical questions",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "query": {
                                    "type": "string",
                                    "description": "The technical question or problem to get a second opinion on"
                                },
                                "context": {
                                    "type": "string",
                                    "description": "Additional context about the problem or current situation"
                                },
                                "claude_response": {
                                    "type": "string",
                                    "description": "Claude's initial response (optional, for comparison)"
                                }
                            },
                            "required": ["query"]
                        }
                    ),
                    Tool(
                        name="consult_llama2",
                        description="Get a local second opinion from Llama2 AI for privacy-focused consultation",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "query": {
                                    "type": "string",
                                    "description": "The technical question or problem to analyze"
                                },
                                "context": {
                                    "type": "string",
                                    "description": "Additional context about the problem or situation"
                                },
                                "model": {
                                    "type": "string",
                                    "description": "Specific Llama2 model to use (optional, auto-selected if not specified)"
                                }
                            },
                            "required": ["query"]
                        }
                    ),
                    # Analysis and utility tools
                    Tool(
                        name="detect_uncertainty",
                        description="Analyze text for uncertainty indicators that might warrant a second opinion",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "text": {
                                    "type": "string",
                                    "description": "The text to analyze for uncertainty indicators"
                                }
                            },
                            "required": ["text"]
                        }
                    ),
                    Tool(
                        name="ai_system_status",
                        description="Check the status and availability of all AI providers",
                        inputSchema={
                            "type": "object",
                            "properties": {},
                            "additionalProperties": False
                        }
                    ),
                    Tool(
                        name="compare_ai_providers",
                        description="Get the same question answered by multiple AI providers for comparison",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "query": {
                                    "type": "string",
                                    "description": "The question to ask all available AI providers"
                                },
                                "context": {
                                    "type": "string",
                                    "description": "Additional context for the question"
                                }
                            },
                            "required": ["query"]
                        }
                    )
                ]
            )
        
        @self.server.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> CallToolResult:
            """Handle tool calls"""
            try:
                if name == "consult_multi_ai":
                    return await self.handle_multi_ai_consultation(arguments)
                elif name == "consult_gemini":
                    return await self.handle_gemini_consultation(arguments)
                elif name == "consult_llama2":
                    return await self.handle_llama2_consultation(arguments)
                elif name == "detect_uncertainty":
                    return await self.handle_detect_uncertainty(arguments)
                elif name == "ai_system_status":
                    return await self.handle_system_status(arguments)
                elif name == "compare_ai_providers":
                    return await self.handle_compare_providers(arguments)
                else:
                    raise ValueError(f"Unknown tool: {name}")
            
            except RateLimitError as e:
                logger.warning(f"Rate limit error in tool call {name}: {str(e)}")
                return CallToolResult(
                    content=[TextContent(
                        type="text",
                        text=f"⏰ Rate limit reached: {str(e)}\\n\\nPlease wait a moment before trying again."
                    )]
                )
            except AuthenticationError as e:
                logger.error(f"Authentication error in tool call {name}: {str(e)}")
                return CallToolResult(
                    content=[TextContent(
                        type="text",
                        text=f"🔑 Authentication failed: {str(e)}\\n\\nPlease check your GOOGLE_API_KEY environment variable."
                    )]
                )
            except CircuitBreakerOpenError as e:
                logger.warning(f"Circuit breaker open for tool call {name}: {str(e)}")
                return CallToolResult(
                    content=[TextContent(
                        type="text",
                        text=f"🔌 Service temporarily unavailable: {str(e)}\\n\\nThe system is recovering from recent failures. Please try again in a few minutes."
                    )]
                )
            except OllamaConnectionError as e:
                logger.error(f"Ollama connection error in tool call {name}: {str(e)}")
                return CallToolResult(
                    content=[TextContent(
                        type="text",
                        text=f"🦙 Llama2 unavailable: {str(e)}\\n\\nMake sure Ollama is running: 'ollama serve'"
                    )]
                )
            except ModelNotAvailableError as e:
                logger.error(f"Model not available in tool call {name}: {str(e)}")
                return CallToolResult(
                    content=[TextContent(
                        type="text",
                        text=f"📦 Model unavailable: {str(e)}\\n\\nTry: 'ollama pull llama2:7b'"
                    )]
                )
            except (GeminiAPIError, Llama2IntegrationError) as e:
                logger.error(f"AI provider error in tool call {name}: {str(e)}")
                return CallToolResult(
                    content=[TextContent(
                        type="text",
                        text=f"🤖 AI service error: {str(e)}\\n\\nPlease try again or check service status."
                    )]
                )
            except ConfigurationError as e:
                logger.error(f"Configuration error in tool call {name}: {str(e)}")
                return CallToolResult(
                    content=[TextContent(
                        type="text",
                        text=f"⚙️ Configuration error: {str(e)}\\n\\nPlease check your configuration files."
                    )]
                )
            except Exception as e:
                logger.error(f"Unexpected error in tool call {name}: {str(e)}")
                return CallToolResult(
                    content=[TextContent(
                        type="text",
                        text=f"❌ Unexpected error: {str(e)}\\n\\nPlease check the logs for more details."
                    )]
                )
    
    async def initialize_multi_ai(self):
        """Initialize multi-AI integration"""
        gemini_config_path = os.getenv("GEMINI_CONFIG_PATH", "gemini-config.json")
        llama2_config_path = os.getenv("LLAMA2_CONFIG_PATH", "llama2-config.json")
        
        self.multi_ai = MultiAIIntegration(gemini_config_path, llama2_config_path)
        logger.info("Multi-AI integration initialized")
    
    async def handle_multi_ai_consultation(self, arguments: Dict[str, Any]) -> CallToolResult:
        """Handle multi-AI consultation requests"""
        query = arguments.get("query", "")
        context = arguments.get("context", "")
        provider = arguments.get("provider", "auto")
        compare_responses = arguments.get("compare_responses", False)
        
        if not query:
            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text="Error: Query is required for AI consultation"
                )]
            )
        
        # Map provider string to enum
        provider_mapping = {
            "auto": AIProvider.AUTO,
            "gemini": AIProvider.GEMINI,
            "llama2": AIProvider.LLAMA2,
            "both": AIProvider.BOTH
        }
        
        preferred_provider = provider_mapping.get(provider, AIProvider.AUTO)
        
        # If provider is "both", enable comparison
        if provider == "both":
            compare_responses = True
        
        # Create consultation request
        request = MultiAIConsultationRequest(
            query=query,
            context=context,
            uncertainty_detected=False,  # Could be enhanced with uncertainty detection
            confidence_score=1.0,
            preferred_provider=preferred_provider,
            compare_responses=compare_responses
        )
        
        # Get consultation result
        result = await self.multi_ai.consult_multi_ai(request)
        
        if result["success"]:
            response_text = result["summary"]
            
            # Add comparison if available
            if "comparison" in result:
                response_text += "\\n\\n" + result["comparison"]
            
            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=response_text
                )]
            )
        else:
            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=f"Multi-AI consultation failed: {result['error']}"
                )]
            )
    
    async def handle_gemini_consultation(self, arguments: Dict[str, Any]) -> CallToolResult:
        """Handle individual Gemini consultation"""
        # Delegate to the existing Gemini integration
        if not self.multi_ai or not self.multi_ai.gemini:
            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text="🔑 Gemini integration not available. Please check your configuration and API key."
                )]
            )
        
        request = MultiAIConsultationRequest(
            query=arguments.get("query", ""),
            context=arguments.get("context", ""),
            preferred_provider=AIProvider.GEMINI
        )
        
        result = await self.multi_ai.consult_multi_ai(request)
        
        if result["success"]:
            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=result["summary"]
                )]
            )
        else:
            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=f"Gemini consultation failed: {result['error']}"
                )]
            )
    
    async def handle_llama2_consultation(self, arguments: Dict[str, Any]) -> CallToolResult:
        """Handle individual Llama2 consultation"""
        if not self.multi_ai or not self.multi_ai.llama2:
            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text="🦙 Llama2 integration not available. Please install and start Ollama."
                )]
            )
        
        request = MultiAIConsultationRequest(
            query=arguments.get("query", ""),
            context=arguments.get("context", ""),
            preferred_provider=AIProvider.LLAMA2
        )
        
        result = await self.multi_ai.consult_multi_ai(request)
        
        if result["success"]:
            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=result["summary"]
                )]
            )
        else:
            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=f"Llama2 consultation failed: {result['error']}"
                )]
            )
    
    async def handle_detect_uncertainty(self, arguments: Dict[str, Any]) -> CallToolResult:
        """Handle uncertainty detection requests"""
        text = arguments.get("text", "")
        
        if not text:
            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text="Error: Text is required for uncertainty detection"
                )]
            )
        
        # Use Gemini integration's uncertainty detection if available
        if self.multi_ai and self.multi_ai.gemini:
            is_uncertain, confidence_score = self.multi_ai.gemini.detect_uncertainty(text)
            
            result = {
                "uncertain": is_uncertain,
                "confidence_score": confidence_score,
                "recommendation": "Consider consulting AI for a second opinion" if is_uncertain else "Response appears confident",
                "detected_patterns": "Advanced pattern matching with regex and confidence indicators"
            }
            
            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=json.dumps(result, indent=2)
                )]
            )
        else:
            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text="Uncertainty detection not available - Gemini integration required"
                )]
            )
    
    async def handle_system_status(self, arguments: Dict[str, Any]) -> CallToolResult:
        """Handle system status requests"""
        if not self.multi_ai:
            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text="Multi-AI system not initialized"
                )]
            )
        
        # Get comprehensive system status
        status = self.multi_ai.get_system_status()
        availability = await self.multi_ai.check_provider_availability()
        
        # Format status report
        status_report = "🤖 **AI System Status Report**\\n\\n"
        
        # Provider availability
        status_report += "**Provider Availability:**\\n"
        for provider, available in availability.items():
            icon = "✅" if available else "❌"
            status_report += f"  {icon} {provider.title()}: {'Online' if available else 'Offline'}\\n"
        
        # Performance statistics
        status_report += "\\n**Performance Statistics:**\\n"
        for provider, info in status["providers"].items():
            if info["available"]:
                stats = info.get("stats", {})
                requests = stats.get("requests", 0)
                successes = stats.get("successes", 0)
                avg_time = stats.get("avg_time", 0.0)
                success_rate = (successes / requests * 100) if requests > 0 else 0
                
                status_report += f"  • {provider.title()}: {requests} requests, {success_rate:.1f}% success, {avg_time:.2f}s avg\\n"
        
        # Configuration
        config = status["configuration"]
        status_report += "\\n**Configuration:**\\n"
        status_report += f"  • Default provider: {config.get('default_provider', 'auto')}\\n"
        status_report += f"  • Fallback enabled: {config.get('fallback_enabled', False)}\\n"
        status_report += f"  • Parallel consultation: {config.get('parallel_enabled', False)}\\n"
        
        return CallToolResult(
            content=[TextContent(
                type="text",
                text=status_report
            )]
        )
    
    async def handle_compare_providers(self, arguments: Dict[str, Any]) -> CallToolResult:
        """Handle provider comparison requests"""
        query = arguments.get("query", "")
        context = arguments.get("context", "")
        
        if not query:
            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text="Error: Query is required for provider comparison"
                )]
            )
        
        request = MultiAIConsultationRequest(
            query=query,
            context=context,
            preferred_provider=AIProvider.BOTH,
            compare_responses=True,
            include_reasoning=True
        )
        
        result = await self.multi_ai.consult_multi_ai(request)
        
        if result["success"]:
            response_text = result["summary"]
            
            if "comparison" in result:
                response_text += "\\n\\n" + result["comparison"]
            
            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=response_text
                )]
            )
        else:
            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=f"Provider comparison failed: {result['error']}"
                )]
            )
    
    async def run(self):
        """Run the MCP server"""
        try:
            await self.initialize_multi_ai()
            
            # Run the server
            async with stdio_server() as (read_stream, write_stream):
                await self.server.run(
                    read_stream,
                    write_stream,
                    InitializationOptions(
                        server_name="multi-ai-consultant",
                        server_version="2.0.0",
                        capabilities=self.server.get_capabilities(
                            notification_options=None,
                            experimental_capabilities=None
                        )
                    )
                )
        except Exception as e:
            logger.error(f"Server error: {str(e)}")
            raise

async def main():
    """Main entry point"""
    server = EnhancedMCPServer()
    await server.run()

if __name__ == "__main__":
    asyncio.run(main())