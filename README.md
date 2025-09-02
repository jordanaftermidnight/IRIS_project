# IRIS - Integrated Runtime Intelligence Service

**Professional AI Development Assistant with Multi-Provider Intelligence**

*Created by Jordan After Midnight*

[![Version](https://img.shields.io/badge/version-0.9.0--beta-orange.svg)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![IDE Features](https://img.shields.io/badge/IDE%20Features-✅%20Integrated-blue.svg)]()

---

## What is IRIS?

IRIS is a professional AI development assistant that provides IDE-level intelligence with multi-provider AI consultation. It combines the power of 5 AI providers with intelligent caching, local processing options, and universal compatibility across any editor or platform.

### Key Features
- **Multi-AI Intelligence** - 5 providers with intelligent routing
- **High Cache Hit Rate** - Optimized responses for repeated queries  
- **Local Processing** - Privacy-focused with Ollama support
- **Professional IDE Tools** - Code completion, debugging, refactoring
- **Universal Compatibility** - Works with any editor/IDE
- **Cost Optimized** - Efficient provider selection minimizes API costs

---

## Installation and Setup

### Installation

#### Option 1: Install from GitHub (Recommended)
```bash
# Clone and install
git clone https://github.com/jordanaftermidnight/IRIS_project.git
cd IRIS_project
npm install
npm install -g .

# Verify installation
iris help
```

#### Option 2: Direct npm install (future)
```bash
# Will be available when published to npm registry
npm install -g iris-ai

# Verify installation
iris help
```

#### Option 3: Run without global install
```bash
# Clone and run directly
git clone https://github.com/jordanaftermidnight/IRIS_project.git
cd IRIS_project
npm install
npm start help
```

### Demo Options

IRIS provides multiple ways to explore its capabilities:

#### Option 1: Web Dashboard Demo (Recommended)
```bash
# Launch complete demo with web interface
npm run demo

# This will:
# - Start IRIS API server on port 3002
# - Launch web dashboard at http://localhost:8082
# - Open browser automatically
# - Show real-time analytics and interactive query interface
```

#### Option 2: Simple API Demo
```bash
# Start API server only
npm run api

# Test with curl (in another terminal):
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello IRIS", "provider": "auto"}'
```

#### Option 3: CLI Demo
```bash
# Basic CLI interaction
iris chat "Hello, how can IRIS help me?"
iris chat "Write a Python function to calculate fibonacci"
iris chat "Explain machine learning concepts"

# System monitoring
iris health
iris performance  
iris cache-stats
iris pool-stats
```

### Basic Usage
```bash
# Chat with AI
iris chat "Explain async/await in JavaScript"

# System status
iris health

# Performance metrics  
iris performance

# Cache statistics
iris cache-stats
```

### **Setup AI Providers** (Optional)
```bash
# Set API keys for enhanced capabilities
export OPENAI_API_KEY="your-key"    # GPT-4o, o1-preview
export GROQ_API_KEY="your-key"      # Ultra-fast inference
export GEMINI_API_KEY="your-key"    # Multimodal analysis
export ANTHROPIC_API_KEY="your-key" # Advanced reasoning

# Start local AI (free, private)
ollama serve  # Runs Mistral/Qwen locally
```

---

## 💻 **Professional IDE Features**

### **🧠 Smart Code Intelligence**
```bash
# Intelligent code completion
iris complete ./src/utils.js 25 10

# Explain complex code
iris explain ./algorithms/sort.py 15 35

# Smart refactoring suggestions
iris refactor ./api/routes.js 100 150
```

### **🔧 Development Workflow**
```bash
# Generate intelligent commit messages
iris commit

# Comprehensive code review
iris review ./components/Header.jsx

# Generate test cases
iris test ./math-utils.js calculateAverage

# Debug with context
iris debug ./app.js "TypeError: Cannot read property" trace.log
```

### **🏗️ Project Intelligence**
```bash
# Analyze entire workspace
iris workspace

# Get file context and dependencies
iris context ./src/database/models/User.js

# Check project health
iris health
```

---

## 🎯 **Multi-Provider AI**

Iris intelligently routes queries to the best AI provider:

| Provider | Strengths | Cost | Speed |
|----------|-----------|------|-------|
| **Ollama** | Local, Private, Free | 🆓 Free | ⚡ Fast |
| **Groq** | Ultra-fast inference | 💰 Low | 🚀 Ultra-fast |
| **OpenAI** | Advanced reasoning | 💰💰 High | 🐌 Slow |
| **Gemini** | Multimodal analysis | 💰 Medium | ⚡ Fast |
| **Claude** | General purpose | 💰💰 High | 🐌 Medium |

### **Smart Routing Examples**
```bash
# Coding tasks → Ollama (fast, free) → OpenAI (complex)
iris chat "Write a REST API" --task=code

# Creative tasks → Ollama → Gemini (multimodal)
iris chat "Design a logo concept" --task=creative

# Fast queries → Groq (ultra-fast)
iris chat "What is 2+2?" --task=fast

# Force specific provider
iris chat "Analyze this image" --provider=gemini
```

---

## 🔧 **Troubleshooting**

### **Demo and API Launch Issues**

**Problem**: `npm run api` doesn't show the web dashboard
**Solution**: The `api` command only starts the backend API server. You need both API server AND web server:

```bash
# Option 1: Use full demo (recommended)
npm run demo                    # Starts both API server + web server

# Option 2: Manual setup
# Terminal 1: API server
npm run api                     # Backend on port 3001

# Terminal 2: Web server  
python3 -m http.server 8083     # Frontend on port 8083
# OR
npx http-server -p 8083

# Then open: http://localhost:8083
```

**Problem**: Demo won't start or shows port conflicts
**Solution**: Check for port conflicts and kill existing processes:

```bash
# Check what's using the ports
lsof -i :3001                   # API server port
lsof -i :8083                   # Web server port

# Kill processes if needed
kill -9 <PID>                   # Replace <PID> with actual process ID

# Try alternative ports
npm run api -- --port 3002     # Alternative API port
python3 -m http.server 8084     # Alternative web port
```

**Problem**: API server starts but no providers available
**Solution**: Ensure Ollama is running (minimum requirement):

```bash
# Install Ollama if not installed
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve

# Pull a model
ollama pull mistral:7b

# Verify IRIS can connect
iris health
```

**Problem**: Demo shows errors or blank pages
**Solution**: Browser and network troubleshooting:

```bash
# Check browser console for errors (F12 → Console)
# Clear browser cache and cookies
# Try different browser (Chrome, Firefox, Safari)
# Verify both servers are running:

curl http://localhost:3001/api/health    # API server check
curl http://localhost:8083               # Web server check
```

### **Command Line Issues**

**Problem**: `iris` command not found after installation
**Solution**: Reinstall globally and check PATH:

```bash
# Reinstall globally
npm install -g .

# Check if iris is in PATH
which iris
echo $PATH

# Manual linking if needed
npm link
```

**Problem**: Permission errors on macOS/Linux
**Solution**: Use sudo for global installation:

```bash
sudo npm install -g .
# OR use npm prefix to avoid sudo
npm config set prefix ~/.local
export PATH=$PATH:~/.local/bin
```

### **Provider Connection Issues**

**Problem**: All providers show "needs API key"
**Solution**: This is expected! Ollama works without API keys:

```bash
# Check if Ollama is running
ollama list                     # Should show installed models
iris providers                 # Should show Ollama as "healthy"

# Ollama is the free, local provider - others are optional
```

**Problem**: Slow responses or timeouts
**Solution**: Optimize provider settings:

```bash
# Use fast providers for quick queries
iris chat "Hello" --task=fast  # Routes to Groq if available

# Check system resources
iris performance               # Shows response times and metrics

# Restart services if needed
pkill -f ollama && ollama serve
```

---

## 📚 **Command Reference**

### **Core Commands**
```bash
iris chat <message>              # Chat with smart provider selection
iris providers                   # Show provider status
iris health                      # System health check
iris help                        # Show all commands
```

### **IDE Integration**
```bash
iris complete <file> <line> <col> # Code completion
iris explain <file> [start] [end] # Code explanation
iris refactor <file> <start> <end> # Refactoring suggestions
iris debug <file> [error] [trace] # Debug assistance
iris commit                       # Smart commit messages
iris review <file> [start] [end]  # Code review
iris test <file> [function]       # Generate tests
iris workspace                    # Project analysis
iris context <file>               # File context
```

### **File Processing**
```bash
iris file <path>                 # Analyze single file
iris dir <path>                  # Process directory
```

---

## ⚙️ **Configuration**

### **Environment Variables**
```bash
# Optional API keys (Ollama works without any keys)
export OPENAI_API_KEY="sk-..."      # OpenAI GPT-4o, o1
export GROQ_API_KEY="gsk_..."       # Groq Llama/Mixtral
export GEMINI_API_KEY="AI..."       # Google Gemini
export ANTHROPIC_API_KEY="sk-ant-..." # Claude
export OLLAMA_HOST="http://localhost:11434" # Ollama server
```

### **Configuration Files**
```bash
# Copy example configs
cp config/gemini-config.example.json config/gemini-config.json
cp config/llama2-config.example.json config/llama2-config.json

# Edit with your preferences
# See config/ directory for examples
```

---

## 🔍 **How Iris Compares**

### **🆚 Comprehensive Tool Comparison**

| Feature | **Iris** | Ollama | LM Studio | ChatGPT | Perplexity | GitHub Copilot |
|---------|----------|--------|-----------|---------|------------|----------------|
| **Multi-AI Providers** | ✅ 5 providers | ❌ Local only | ❌ Local only | ❌ OpenAI only | ❌ Web search | ❌ GitHub only |
| **Intelligent Caching** | ✅ 85%+ hit rate | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None |
| **Local + Cloud** | ✅ Best of both | ✅ Local only | ✅ Local only | ❌ Cloud only | ❌ Cloud only | ❌ Cloud only |
| **IDE Integration** | ✅ Universal CLI | ❌ None | ❌ None | ❌ Web only | ❌ Web only | ✅ VS Code only |
| **Code Completion** | ✅ Context-aware | ❌ Manual | ❌ Manual | ❌ None | ❌ None | ✅ Limited |
| **Project Analysis** | ✅ Workspace-wide | ❌ None | ❌ None | ❌ None | ❌ None | ❌ File-level |
| **Cost Optimization** | ✅ Smart routing | ✅ Free | ✅ Free | ❌ Expensive | ❌ Subscription | ❌ Subscription |
| **Commercial License** | ✅ Enterprise ready | ❌ None | ❌ None | ❌ Per-user | ❌ Per-user | ❌ Per-seat |
| **Privacy Control** | ✅ Local options | ✅ Fully local | ✅ Fully local | ❌ Cloud only | ❌ Cloud only | ❌ Cloud only |

### **🎯 Key Differentiators**

**vs Ollama/LM Studio**: Iris uses them as providers but adds intelligent orchestration, caching, and professional IDE features.

**vs ChatGPT/Perplexity**: Iris provides development-focused tools with multi-provider intelligence and local processing options.

**vs GitHub Copilot**: Iris works everywhere (not just VS Code) with multiple AI providers and enterprise-grade features.

### **💡 Unique Value Proposition**
Iris is the **only tool** that combines:
- Multi-provider AI intelligence
- Professional development features  
- Universal editor compatibility
- Enterprise-grade caching and optimization
- Local privacy with cloud capabilities

---

## 📄 **Documentation**

- **[Enhanced README](README_IRIS_ENHANCED.md)** - Comprehensive feature guide
- **[Optimized Features](README_OPTIMIZED.md)** - Performance optimization details
- **[Quick Start](QUICKSTART.md)** - Get started in 5 minutes
- **[Examples](examples/)** - Usage examples and integrations
- **[Configuration](config/)** - Setup and customization

---

## 🤝 **Contributing**

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📧 **Support**

- **Issues**: [GitHub Issues](https://github.com/jordanaftermidnight/Iris_Integrated-Runtime-Intelligence-Service/issues)
- **Email**: jordanaftermidnight@users.noreply.github.com

---

## 📜 **License**

**Dual License**: Personal use free, Commercial use licensed - see [LICENSE](LICENSE) file for details.

- **Personal Use**: Free for individual, non-commercial use
- **Commercial Use**: Requires paid license (contact for pricing)  
- **Enterprise Features**: Source code access, custom development, SLA support

---

**Transform your development workflow with professional AI intelligence! 🚀**