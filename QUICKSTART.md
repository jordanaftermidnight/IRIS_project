# 🚀 Multi-AI Integration CLI - Quickstart Guide

Get up and running with the Multi-AI Integration CLI in under 5 minutes!

## 📦 Installation & Setup

### 1. Prerequisites
- **Node.js 16+** installed
- **Ollama** running locally (for free local AI)

### 2. Install Ollama (Primary Free Provider)
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service
ollama serve

# Install Mistral model (recommended primary model)
ollama pull mistral:7b

# Install additional models (optional)
ollama pull qwen2.5:7b
ollama pull deepseek-coder:6.7b
```

### 3. Setup the CLI
```bash
# Clone/navigate to the project
cd multi-ai-integration

# Install dependencies
npm install

# Make CLI executable
chmod +x src/cli.js
```

## 🎯 Quick Start

### Basic Usage
```bash
# Simple chat with auto-selection (free Ollama/Mistral)
node src/cli.js chat "Hello, how are you?"

# Ask a programming question
node src/cli.js chat "Write a Python function to reverse a string" --task=code

# Check system status
node src/cli.js health
```

### Force Specific Provider
```bash
# Force Ollama (local, free)
node src/cli.js chat "What is 2+2?" --provider=ollama

# Force Gemini (requires API key)
node src/cli.js chat "Describe this image" --provider=gemini
```

### Advanced Usage
```bash
# Creative writing task
node src/cli.js chat "Write a short story about AI" --task=creative

# Fast simple query
node src/cli.js chat "What's the capital of France?" --task=fast

# Complex reasoning task
node src/cli.js chat "Analyze the pros and cons of renewable energy" --task=complex
```

## 🔧 Configuration

### Environment Variables (Optional)
```bash
# For additional cloud providers (optional)
export GROQ_API_KEY="your-groq-key"          # Ultra-fast inference
export OPENAI_API_KEY="your-openai-key"      # Advanced reasoning
export GEMINI_API_KEY="your-gemini-key"      # Multimodal AI
export ANTHROPIC_API_KEY="your-claude-key"   # General purpose

# Ollama configuration (optional)
export OLLAMA_HOST="http://localhost:11434"
```

### Provider Priority (Cost-Optimized)
1. **🆓 OLLAMA** (Priority 1) - Free, local Mistral/Qwen models
2. **🔥 GROQ** (Priority 2) - Ultra-fast, low-cost cloud inference
3. **🧠 OPENAI** (Priority 3) - Advanced reasoning with o1/GPT-4o
4. **🎨 GEMINI** (Priority 4) - Google's multimodal AI
5. **📝 CLAUDE** (Priority 5) - Anthropic's reasoning AI (deprioritized)

## 📋 Common Commands

### System Management
```bash
# Check health of all providers
node src/cli.js health --verbose

# List provider status and statistics
node src/cli.js providers

# List available models
node src/cli.js models

# Clear conversation context
node src/cli.js clear
```

### Chat Examples
```bash
# General conversation
node src/cli.js chat "Explain quantum computing"

# Code assistance
node src/cli.js chat "Debug this Python code: print('hello world')" --task=code

# Creative writing
node src/cli.js chat "Write a poem about technology" --task=creative

# Quick facts
node src/cli.js chat "What's 15% of 200?" --task=fast

# Complex analysis
node src/cli.js chat "Compare React vs Vue.js frameworks" --task=complex
```

### File Processing
```bash
# Analyze a file
node src/cli.js file ./README.md --task=analysis

# Code review
node src/cli.js file ./src/app.js --task=code --verbose
```

## 🔍 Task Types

| Task Type | Description | Primary Provider | Use Case |
|-----------|-------------|------------------|----------|
| `balanced` | Default general purpose | Ollama → Others | General conversation |
| `fast` | Quick responses | Ollama → Groq | Simple questions |
| `code` | Programming tasks | Ollama → OpenAI | Code, debugging |
| `creative` | Writing, brainstorming | Ollama → Gemini | Stories, poems |
| `complex` | Deep analysis | OpenAI → Others | Research, analysis |
| `reasoning` | Logical problems | OpenAI → Others | Math, logic |
| `vision` | Image analysis | OpenAI → Others | Image description |
| `ultra_fast` | Lightning speed | Groq preferred | Quick facts |

## 🎯 Best Practices

### Cost Optimization
- **Always start with Ollama** - It's free and handles 80% of tasks well
- **Use task types** - They automatically select the most cost-effective provider
- **Set API keys only when needed** - The system works great with just Ollama

### Performance Tips
```bash
# Use task-specific routing for better results
node src/cli.js chat "Fix this bug" --task=code

# Use --verbose for debugging
node src/cli.js chat "Test message" --verbose

# Force local-only for privacy
node src/cli.js chat "Sensitive question" --local
```

### Error Handling
```bash
# Check system health first
node src/cli.js health

# Verify Ollama is running
ollama list

# Check provider status
node src/cli.js providers
```

## 🔧 Troubleshooting

### Common Issues

**"No providers available"**
```bash
# Start Ollama
ollama serve

# Pull a model
ollama pull mistral:7b

# Test again
node src/cli.js health
```

**"Provider not found"**
```bash
# Check available providers
node src/cli.js providers

# Use correct provider name
node src/cli.js chat "test" --provider=ollama  # ✅ Correct
node src/cli.js chat "test" --provider=mistral # ❌ Wrong
```

**"Rate limit exceeded"**
```bash
# Use free local provider
node src/cli.js chat "test" --provider=ollama

# Or wait and retry with cloud provider
```

### System Check
```bash
# Comprehensive system health
node src/cli.js health --verbose

# Test basic functionality
node src/cli.js chat "System test" --provider=ollama

# Check configuration
node src/cli.js providers
```

## 🎊 You're Ready!

The CLI is now configured and ready to use! Key points:

- ✅ **Works immediately** with just Ollama (free, local)
- ✅ **Claude is deprioritized** (Priority 5) to minimize costs
- ✅ **Intelligent routing** automatically selects the best provider
- ✅ **Force specific providers** when needed with `--provider=name`
- ✅ **Cost-optimized** - prioritizes free local models first

### Next Steps
1. Try different task types to see intelligent routing in action
2. Add API keys for cloud providers when you need advanced features
3. Use the comprehensive test suite: `node test-comprehensive.js`
4. Explore the examples in the `examples/` directory

---

**Need help?** Run `node src/cli.js help` for full command reference!