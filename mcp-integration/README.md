# MCP Integration for IRIS

This directory contains the Model Context Protocol (MCP) integration components that enable IRIS to work with Claude Code.

## Overview

The MCP integration provides:
- Direct integration with Claude Code through MCP protocol
- Python-based server implementation for handling MCP requests
- Additional AI provider integrations (Gemini, Llama2) specifically for MCP

## Structure

```
mcp-integration/
├── src/                    # Python source files
│   ├── mcp_server.py      # Main MCP server
│   ├── multi_ai_integration.py  # Multi-AI orchestration
│   ├── gemini_integration.py    # Google Gemini integration
│   └── llama2_integration.py    # Llama2/Ollama integration
├── docs/                   # MCP-specific documentation
│   ├── api-reference.md
│   ├── configuration.md
│   ├── installation.md
│   ├── troubleshooting.md
│   └── use-cases.md
├── CAPABILITIES.md         # Detailed MCP capabilities
├── pyproject.toml         # Python project configuration
└── start.sh               # MCP server startup script
```

## Usage

To use the MCP integration with IRIS:

1. Ensure Python 3.8+ is installed
2. Install the Python dependencies from the main IRIS requirements.txt
3. Run the MCP server: `./mcp-integration/start.sh`
4. The MCP tools will be available in Claude Code

## Relationship to IRIS

This MCP integration extends IRIS's capabilities by providing:
- Direct Claude Code integration
- Additional Python-based AI providers
- MCP-specific tools and commands

The main IRIS system (Node.js) and this MCP integration (Python) work together to provide a comprehensive AI development assistant.