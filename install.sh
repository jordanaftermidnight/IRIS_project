#!/bin/bash

# Iris Installation Script
# Automated installation for new users

set -e  # Exit on any error

echo "🚀 Iris - Integrated Runtime Intelligence Service"
echo "================================================="
echo ""

# Check Node.js version
check_node() {
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js not found. Please install Node.js >= 18.0.0"
        echo "   Download: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo "❌ Node.js $NODE_VERSION found. Requires >= 18.0.0"
        echo "   Download: https://nodejs.org/"
        exit 1
    fi
    
    echo "✅ Node.js $(node -v) (compatible)"
}

# Install dependencies
install_deps() {
    echo "📦 Installing dependencies..."
    if npm install --prefer-offline --no-audit --progress=false; then
        echo "✅ Dependencies installed"
    else
        echo "❌ Failed to install dependencies"
        echo "💡 Try: npm cache clean --force && npm install"
        exit 1
    fi
}

# Install globally
install_global() {
    echo "🌐 Installing Iris globally..."
    if npm install -g . --prefer-offline --no-audit; then
        echo "✅ Iris installed globally"
        return 0
    else
        echo "⚠️  Global install failed (permission issue)"
        echo "💡 Alternative: Use 'npm start' or create an alias"
        return 1
    fi
}

# Test installation
test_installation() {
    echo "🧪 Testing installation..."
    
    if command -v iris &> /dev/null; then
        echo "✅ 'iris' command available globally"
        iris --version 2>/dev/null && echo "✅ Iris responds correctly"
    else
        echo "⚠️  'iris' command not available globally"
        echo "💡 You can use: npm start [command]"
        echo "💡 Or add alias: alias iris='npm start'"
    fi
}

# Check optional tools
check_optional() {
    echo ""
    echo "🔧 Optional Tools:"
    
    if command -v ollama &> /dev/null; then
        echo "✅ Ollama found (free local AI available)"
    else
        echo "⚠️  Ollama not found (optional)"
        echo "   Install for free local AI: https://ollama.ai"
    fi
    
    if command -v git &> /dev/null; then
        echo "✅ Git found (commit features available)"
    else
        echo "⚠️  Git not found (limits git integration features)"
    fi
}

# Show next steps
show_next_steps() {
    echo ""
    echo "🎯 Next Steps:"
    echo "1. Run setup: npm run setup"
    echo "2. Copy config: cp .env.example .env"
    echo "3. Add API keys to .env (optional)"
    echo "4. Start using: iris help"
    echo ""
    echo "📚 Documentation: https://github.com/jordanaftermidnight/IRIS_project"
}

# Main installation
main() {
    check_node
    install_deps
    
    if install_global; then
        test_installation
    fi
    
    check_optional
    show_next_steps
    
    echo "✅ Installation complete!"
}

# Run installation
main