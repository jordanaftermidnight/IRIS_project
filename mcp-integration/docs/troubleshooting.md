# 🔧 Troubleshooting Guide

Comprehensive troubleshooting guide for Multi-AI MCP Integration issues.

## 🚨 Common Issues & Solutions

### 🔌 Connection Issues

#### Ollama Service Not Running
**Symptoms:**
- "Ollama server is not running or accessible" errors
- Llama2 provider shows as unavailable
- Connection refused errors on port 11434

**Solutions:**
```bash
# Check if Ollama is running
ps aux | grep ollama

# Start Ollama service
ollama serve

# Check if port is in use
lsof -i :11434

# Restart Ollama
pkill -f ollama && ollama serve

# Check Ollama status
curl http://localhost:11434/api/tags
```

#### Gemini API Connection Issues
**Symptoms:**
- "Invalid API key" errors
- "Quota exceeded" messages
- Gemini provider unavailable

**Solutions:**
```bash
# Verify API key is set
echo $GOOGLE_API_KEY

# Test API key validity
python3 -c "
import google.generativeai as genai
genai.configure(api_key='$GOOGLE_API_KEY')
models = genai.list_models()
print('API key valid, models available:', len(list(models)))
"

# Check API quotas in Google AI Studio
# Visit: https://makersuite.google.com/app/apikey
```

### 🐍 Python Environment Issues

#### Module Import Errors
**Symptoms:**
- "ModuleNotFoundError" for httpx, google-generativeai, etc.
- "No module named 'src'" errors

**Solutions:**
```bash
# Activate virtual environment
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt

# Check Python path
python3 -c "import sys; print(sys.path)"

# Add src to Python path
export PYTHONPATH="$PWD/src:$PYTHONPATH"
```

#### Virtual Environment Issues
**Symptoms:**
- Commands not found after setup
- Wrong Python version being used

**Solutions:**
```bash
# Recreate virtual environment
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Check Python version
python3 --version

# Verify virtual environment
which python3
which pip
```

### 🤖 Model Issues

#### No Ollama Models Available
**Symptoms:**
- "No Llama models available" warnings
- Empty model list from `ollama list`

**Solutions:**
```bash
# Check available models
ollama list

# Download recommended models
ollama pull llama3.2:3b
ollama pull llama2:7b

# Check model download progress
ollama ps

# Verify model works
ollama run llama3.2:3b "Hello, how are you?"
```

#### Model Download Failures
**Symptoms:**
- Download timeouts
- Partial downloads
- Corrupted models

**Solutions:**
```bash
# Remove corrupted model
ollama rm model_name

# Re-download with verbose output
OLLAMA_DEBUG=1 ollama pull llama3.2:3b

# Check available disk space
df -h

# Clear Ollama cache if needed
rm -rf ~/.ollama/models/*
```

### ⚙️ Configuration Issues

#### Invalid Configuration Files
**Symptoms:**
- JSON parsing errors
- "Configuration file not found" errors
- Default values being used unexpectedly

**Solutions:**
```bash
# Validate JSON configuration
python3 -m json.tool config/multi-ai-config.json

# Reset to defaults
cp config/*.example.json config/

# Check file permissions
ls -la config/

# Validate configuration
python3 scripts/validate_config.py
```

#### Environment Variable Issues
**Symptoms:**
- API keys not being recognized
- Default values being used instead of custom settings

**Solutions:**
```bash
# Check all environment variables
env | grep -E "(GOOGLE_API_KEY|OLLAMA|MCP)"

# Source .env file manually
source .env

# Check .env file format
cat -n .env

# Export variables for current session
export $(cat .env | grep -v '^#' | xargs)
```

### 🔧 MCP Server Issues

#### Claude Code Not Recognizing Tools
**Symptoms:**
- MCP tools not available in Claude Code
- "Unknown tool" errors
- MCP server not starting

**Solutions:**
```bash
# Check MCP server configuration
cat ~/.anthropic/claude-code/mcp_servers.json

# Test MCP server manually
python3 src/mcp_server.py

# Check file paths in MCP config
ls -la "$(pwd)/src/mcp_server.py"

# Restart Claude Code after configuration changes

# Check Claude Code logs (if available)
```

#### MCP Server Startup Errors
**Symptoms:**
- MCP server fails to initialize
- Import errors in MCP server
- Permission denied errors

**Solutions:**
```bash
# Check Python path for MCP server
cd /path/to/multi-ai-mcp
python3 -c "import src.multi_ai_integration"

# Make files executable
chmod +x src/mcp_server.py

# Check working directory
pwd

# Test imports manually
python3 -c "
import sys
sys.path.insert(0, 'src')
from multi_ai_integration import MultiAIIntegration
print('Imports successful')
"
```

## 🔍 Diagnostic Commands

### System Health Check
```bash
# Run comprehensive system test
python3 tests/test_system.py --verbose

# Quick health check
./start.sh

# Manual component testing
python3 examples/basic_usage.py
```

### Provider Status Check
```bash
# Check all providers
python3 -c "
import asyncio
import sys
sys.path.insert(0, 'src')
from multi_ai_integration import MultiAIIntegration

async def check():
    multi_ai = MultiAIIntegration()
    availability = await multi_ai.check_provider_availability()
    print('Provider availability:', availability)
    status = multi_ai.get_system_status()
    print('System status:', status)

asyncio.run(check())
"
```

### Network Connectivity Test
```bash
# Test Ollama connectivity
curl -v http://localhost:11434/api/tags

# Test Gemini API connectivity
curl -H "x-goog-api-key: $GOOGLE_API_KEY" \
     "https://generativelanguage.googleapis.com/v1beta/models"

# Test DNS resolution
nslookup generativelanguage.googleapis.com
```

## 📊 Performance Issues

### Slow Response Times
**Symptoms:**
- Requests taking longer than expected
- Timeouts occurring frequently

**Diagnosis & Solutions:**
```bash
# Check system resources
top
free -h
df -h

# Monitor Ollama performance
ollama ps

# Test individual providers
time python3 -c "
import asyncio
import sys
sys.path.insert(0, 'src')
from gemini_integration import GeminiIntegration, ConsultationRequest

async def test():
    gemini = GeminiIntegration()
    request = ConsultationRequest(query='Hello', context='Test')
    response = await gemini.consult_gemini(request)
    print('Response:', response[:100] if response else 'None')

asyncio.run(test())
"

# Optimize configuration
# Edit config/multi-ai-config.json:
# - Reduce timeout values
# - Enable response caching
# - Optimize model selection
```

### Memory Issues
**Symptoms:**
- Out of memory errors
- System becoming unresponsive
- Ollama crashes

**Solutions:**
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Use smaller models
ollama pull llama3.2:3b  # Instead of larger models

# Limit concurrent requests
# Edit config/multi-ai-config.json:
{
  "max_concurrent_requests": 1,
  "enable_parallel_consultation": false
}

# Restart Ollama
pkill -f ollama
ollama serve
```

## 🐛 Debugging Tools

### Enable Debug Logging
```bash
# Set debug environment variables
export MCP_LOG_LEVEL=DEBUG
export LOG_LEVEL=DEBUG
export DEBUG=true

# Run with verbose output
python3 tests/test_system.py --debug
```

### Log Analysis
```bash
# View real-time logs
tail -f logs/multi-ai.log

# Search for errors
grep -i error logs/multi-ai.log

# Analyze performance
grep "response_time" logs/multi-ai.log | awk '{print $NF}' | sort -n
```

### Request Tracing
```python
# Add to config/multi-ai-config.json for debugging
{
  "debug": {
    "enabled": true,
    "trace_requests": true,
    "save_requests": true,
    "request_log_path": "debug/requests.json"
  }
}
```

## 🔧 Advanced Troubleshooting

### Port Conflicts
```bash
# Find process using port 11434
lsof -i :11434

# Kill process and restart
pkill -f "ollama serve"
ollama serve

# Use alternative port
OLLAMA_HOST=http://localhost:11435 ollama serve --port 11435
```

### Permission Issues
```bash
# Fix file permissions
chmod +x setup.sh install.sh start.sh
chmod -R 755 src/
chmod -R 644 config/

# Fix Ollama permissions (Linux)
sudo chown -R $USER:$USER ~/.ollama
```

### Firewall Issues
```bash
# Ubuntu/Debian
sudo ufw allow 11434

# CentOS/RHEL
sudo firewall-cmd --add-port=11434/tcp --permanent
sudo firewall-cmd --reload

# macOS
# Add rule in System Preferences > Security & Privacy > Firewall
```

## 📋 Error Code Reference

| Error Code | Description | Solution |
|------------|-------------|----------|
| `OLLAMA_001` | Ollama service not running | Start Ollama: `ollama serve` |
| `GEMINI_001` | Invalid API key | Check `GOOGLE_API_KEY` environment variable |
| `GEMINI_002` | API quota exceeded | Wait or upgrade quota in Google AI Studio |
| `MCP_001` | MCP server failed to start | Check Python path and permissions |
| `CONFIG_001` | Invalid JSON configuration | Validate JSON syntax |
| `MODEL_001` | No models available | Download models: `ollama pull llama3.2:3b` |
| `NET_001` | Network connectivity issue | Check internet connection and firewall |

## 🆘 Getting Help

### Self-Help Resources
1. **Run diagnostics**: `python3 tests/test_system.py --verbose`
2. **Check logs**: `tail -f logs/multi-ai.log`
3. **Validate config**: `python3 scripts/validate_config.py`
4. **Reset configuration**: `cp config/*.example.json config/`

### Community Support
- **GitHub Issues**: [Report bugs and get help](https://github.com/your-username/multi-ai-mcp/issues)
- **Discussions**: [Community discussions and Q&A](https://github.com/your-username/multi-ai-mcp/discussions)

### Reporting Issues
When reporting issues, please include:

```bash
# System information
uname -a
python3 --version
ollama --version

# Error logs
tail -50 logs/multi-ai.log

# Configuration (remove sensitive data)
cat config/multi-ai-config.json

# Test results
python3 tests/test_system.py --verbose 2>&1
```

### Emergency Reset
```bash
# Complete reset (use with caution)
./emergency-reset.sh

# Or manual reset:
pkill -f ollama
rm -rf venv/
rm config/*.json
cp config/*.example.json config/
./setup.sh
```

---

**Most issues can be resolved quickly with these steps!** 🎯 If you're still experiencing problems, please check our GitHub issues or create a new one with the diagnostic information above.