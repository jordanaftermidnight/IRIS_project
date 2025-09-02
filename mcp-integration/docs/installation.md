# 📥 Installation Guide

This guide provides detailed installation instructions for the Multi-AI MCP Integration system across different platforms.

## 🚀 Quick Installation

### One-Line Installer (Recommended)
```bash
curl -fsSL https://raw.githubusercontent.com/your-username/multi-ai-mcp/main/install.sh | bash
```

### Manual Installation
```bash
# Clone the repository
git clone https://github.com/your-username/multi-ai-mcp.git
cd multi-ai-mcp

# Run setup
./setup.sh
```

## 📋 Prerequisites

### System Requirements
- **Python**: 3.8 or higher
- **Operating System**: macOS, Linux (Ubuntu/Debian, CentOS/RHEL), Windows (WSL2)
- **Memory**: 4GB RAM minimum (8GB recommended for larger models)
- **Storage**: 10GB free space
- **Network**: Internet connection for Gemini API and model downloads

### Required Software
- Git
- Python 3.8+
- curl
- Claude Code (for MCP integration)

## 🖥️ Platform-Specific Instructions

### macOS

#### Using Homebrew (Recommended)
```bash
# Install prerequisites
brew install python@3.11 git curl

# Install Ollama
brew install ollama

# Clone and setup
git clone https://github.com/your-username/multi-ai-mcp.git
cd multi-ai-mcp
./setup.sh
```

#### Manual Installation
```bash
# Download Python from python.org if not installed
# Download and install Ollama from ollama.com

git clone https://github.com/your-username/multi-ai-mcp.git
cd multi-ai-mcp
./setup.sh
```

### Linux

#### Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install prerequisites
sudo apt install -y python3 python3-pip python3-venv git curl

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Clone and setup
git clone https://github.com/your-username/multi-ai-mcp.git
cd multi-ai-mcp
./setup.sh
```

#### CentOS/RHEL/Fedora
```bash
# Install prerequisites
sudo dnf install -y python3 python3-pip git curl

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Clone and setup
git clone https://github.com/your-username/multi-ai-mcp.git
cd multi-ai-mcp
./setup.sh
```

### Windows (WSL2)

1. **Install WSL2**:
   ```powershell
   wsl --install -d Ubuntu
   ```

2. **Inside WSL2**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install prerequisites
   sudo apt install -y python3 python3-pip python3-venv git curl

   # Install Ollama
   curl -fsSL https://ollama.com/install.sh | sh

   # Clone and setup
   git clone https://github.com/your-username/multi-ai-mcp.git
   cd multi-ai-mcp
   ./setup.sh
   ```

## 🔑 API Key Setup

### Google Gemini API Key

1. **Get API Key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the key

2. **Set Environment Variable**:
   ```bash
   # Option 1: Export for current session
   export GOOGLE_API_KEY='your-api-key-here'

   # Option 2: Add to .env file
   echo "GOOGLE_API_KEY=your-api-key-here" >> .env

   # Option 3: Add to shell profile (permanent)
   echo 'export GOOGLE_API_KEY="your-api-key-here"' >> ~/.bashrc
   source ~/.bashrc
   ```

## 🦙 Ollama Model Setup

### Recommended Models

#### Quick Setup (Faster, Smaller)
```bash
# Download lightweight model (1.7GB)
ollama pull llama3.2:3b
```

#### Full Setup (Better Quality)
```bash
# Download recommended models
ollama pull llama3.2:3b    # Fast and efficient
ollama pull llama2:7b      # More capable
ollama pull llama3:latest  # Latest version
```

### Model Management
```bash
# List installed models
ollama list

# Remove a model
ollama rm model_name

# Update a model
ollama pull model_name
```

## 🔧 Configuration

### Basic Configuration

1. **Copy Example Files**:
   ```bash
   cp .env.example .env
   cp config/gemini-config.example.json config/gemini-config.json
   cp config/llama2-config.example.json config/llama2-config.json
   ```

2. **Edit Configuration**:
   ```bash
   # Edit API key
   nano .env

   # Customize AI settings
   nano config/multi-ai-config.json
   ```

### Advanced Configuration

#### Custom Ollama Host
```bash
# If running Ollama on different host/port
export OLLAMA_HOST=http://192.168.1.100:11434
```

#### Custom Model Preferences
Edit `config/multi-ai-config.json`:
```json
{
  "provider_selection_strategy": "performance",
  "gemini_preference_score": 0.7,
  "llama2_preference_score": 0.3,
  "default_llama_model": "llama3.2:3b"
}
```

## 🔌 Claude Code Integration

### Setup MCP Server

The setup script automatically configures Claude Code. Manual setup:

1. **Create MCP Configuration**:
   ```bash
   mkdir -p ~/.anthropic/claude-code
   ```

2. **Add to `~/.anthropic/claude-code/mcp_servers.json`**:
   ```json
   {
     "mcpServers": {
       "multi-ai-consultant": {
         "command": "python3",
         "args": ["/path/to/multi-ai-mcp/src/mcp_server.py"],
         "cwd": "/path/to/multi-ai-mcp",
         "env": {
           "GEMINI_CONFIG_PATH": "/path/to/multi-ai-mcp/config/gemini-config.json",
           "LLAMA2_CONFIG_PATH": "/path/to/multi-ai-mcp/config/llama2-config.json"
         }
       }
     }
   }
   ```

3. **Restart Claude Code**

## ✅ Verification

### Quick Test
```bash
# Run system test
python3 tests/test_system.py

# Check system status
./start.sh
```

### Manual Verification

1. **Test Ollama**:
   ```bash
   ollama list
   curl http://localhost:11434/api/tags
   ```

2. **Test Gemini**:
   ```bash
   python3 -c "import google.generativeai as genai; genai.configure(api_key='$GOOGLE_API_KEY'); print('Gemini OK')"
   ```

3. **Test Integration**:
   ```bash
   python3 examples/basic_usage.py
   ```

## 🚨 Troubleshooting

### Common Issues

#### Ollama Not Starting
```bash
# Check if port is in use
lsof -i :11434

# Kill existing process
pkill -f ollama

# Restart
ollama serve
```

#### Python Path Issues
```bash
# Ensure Python 3.8+
python3 --version

# Check virtual environment
which python3
```

#### Permission Issues (Linux)
```bash
# Fix permissions
sudo chown -R $USER:$USER ~/.ollama
```

### Getting Help

- Check [Troubleshooting Guide](troubleshooting.md)
- View logs: `tail -f ~/.ollama/logs/server.log`
- Test components individually: `python3 tests/test_system.py --verbose`

## 📚 Next Steps

1. **Complete Configuration**: Edit `.env` with your API key
2. **Test Installation**: Run `./start.sh`
3. **Try Examples**: Run `python3 examples/basic_usage.py`
4. **Use in Claude Code**: Restart Claude Code and try commands
5. **Read Usage Guide**: See [Usage Examples](../examples/)

---

**Installation complete!** 🎉 Your multi-AI system is ready to transform your development workflow.