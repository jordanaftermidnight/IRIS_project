#!/bin/bash

# Start script for Multi-AI MCP Integration
# Ensures all services are running and healthy

set -e

echo "🚀 Starting Multi-AI MCP Integration System"
echo "==========================================="

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if virtual environment exists
check_venv() {
    if [[ ! -d "venv" ]]; then
        print_error "Virtual environment not found. Please run ./setup.sh first."
        exit 1
    fi
}

# Activate virtual environment
activate_venv() {
    print_step "Activating virtual environment..."
    source venv/bin/activate
    print_status "Virtual environment activated"
}

# Check Ollama service
check_ollama() {
    print_step "Checking Ollama service..."
    
    if ! command -v ollama &> /dev/null; then
        print_error "Ollama not installed. Please run ./setup.sh first."
        exit 1
    fi
    
    # Check if Ollama is running
    if ! pgrep -f "ollama serve" > /dev/null; then
        print_status "Starting Ollama service..."
        nohup ollama serve > /dev/null 2>&1 &
        sleep 3
    fi
    
    # Test Ollama connection
    if curl -s http://localhost:11434/api/tags > /dev/null; then
        print_status "Ollama service is running"
    else
        print_warning "Ollama service may not be fully ready. Waiting..."
        sleep 5
        if curl -s http://localhost:11434/api/tags > /dev/null; then
            print_status "Ollama service is now ready"
        else
            print_error "Failed to start Ollama service"
            exit 1
        fi
    fi
}

# Check available models
check_models() {
    print_step "Checking available models..."
    
    MODELS=$(ollama list | tail -n +2 | awk '{print $1}' | tr '\n' ' ')
    
    if [[ -z "$MODELS" ]]; then
        print_warning "No Ollama models found. Downloading llama3.2:3b..."
        ollama pull llama3.2:3b
        print_status "Model downloaded successfully"
    else
        print_status "Available models: $MODELS"
    fi
}

# Check configuration
check_config() {
    print_step "Checking configuration..."
    
    # Check if config files exist
    for config in config/gemini-config.json config/llama2-config.json config/multi-ai-config.json; do
        if [[ ! -f "$config" ]]; then
            print_error "Configuration file missing: $config"
            print_error "Please run ./setup.sh to create configuration files"
            exit 1
        fi
    done
    
    # Check .env file
    if [[ ! -f ".env" ]]; then
        print_warning ".env file not found. Using environment variables or defaults"
    fi
    
    # Check API key
    if [[ -z "$GOOGLE_API_KEY" ]]; then
        if [[ -f ".env" ]] && grep -q "GOOGLE_API_KEY=" .env; then
            print_status "GOOGLE_API_KEY found in .env file"
        else
            print_warning "GOOGLE_API_KEY not set. Gemini integration will be disabled"
        fi
    else
        print_status "GOOGLE_API_KEY environment variable set"
    fi
}

# Test system
test_system() {
    print_step "Running system test..."
    
    if python3 tests/test_system.py --quick; then
        print_status "System test passed!"
    else
        print_warning "System test failed. Some components may not be working correctly."
        print_warning "Check the output above for details."
    fi
}

# Show status
show_status() {
    echo
    echo "📊 System Status:"
    echo "=================="
    
    # Ollama status
    if pgrep -f "ollama serve" > /dev/null; then
        echo -e "🟢 Ollama Service: Running"
    else
        echo -e "🔴 Ollama Service: Stopped"
    fi
    
    # Models
    MODEL_COUNT=$(ollama list | tail -n +2 | wc -l | tr -d ' ')
    echo -e "📦 Available Models: $MODEL_COUNT"
    
    # API Key
    if [[ -n "$GOOGLE_API_KEY" ]] || (grep -q "GOOGLE_API_KEY=" .env 2>/dev/null); then
        echo -e "🔑 Gemini API Key: Configured"
    else
        echo -e "⚠️  Gemini API Key: Not configured"
    fi
    
    # MCP Server
    if [[ -f src/mcp_server.py ]]; then
        echo -e "🔧 MCP Server: Ready"
    else
        echo -e "🔴 MCP Server: Missing"
    fi
    
    echo
}

# Show usage instructions
show_usage() {
    echo "🎯 Usage Instructions:"
    echo "======================"
    echo
    echo "1. Make sure Claude Code is restarted to load new tools"
    echo "2. Try these commands in Claude Code:"
    echo
    echo "   • 'Get an AI second opinion on this code'"
    echo "   • 'Please consult Gemini about authentication best practices'"
    echo "   • 'Ask Llama2 for a privacy-focused approach to data handling'"
    echo "   • 'Compare AI perspectives on React vs Vue'"
    echo "   • 'Check AI system status'"
    echo
    echo "Available MCP Tools:"
    echo "   • consult_multi_ai - Smart AI selection with fallback"
    echo "   • consult_gemini - Direct Gemini consultation"
    echo "   • consult_llama2 - Direct Llama2 consultation"
    echo "   • compare_ai_providers - Side-by-side comparison"
    echo "   • ai_system_status - System health monitoring"
    echo "   • detect_uncertainty - Uncertainty analysis"
    echo
}

# Main startup sequence
main() {
    check_venv
    activate_venv
    check_ollama
    check_models
    check_config
    test_system
    show_status
    show_usage
    
    echo "✅ Multi-AI MCP Integration is ready!"
    echo
    echo "To stop services:"
    echo "  pkill -f 'ollama serve'"
    echo
    echo "To restart:"
    echo "  ./start.sh"
}

# Handle interruption
trap 'echo -e "\n🛑 Startup interrupted"' INT

# Run main function
main "$@"