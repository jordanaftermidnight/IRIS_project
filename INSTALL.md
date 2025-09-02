# 📦 Iris Installation Guide

**Complete installation guide for all platforms and scenarios**

---

## 🚀 **Quick Install (Recommended)**

### **One-Line Install**
```bash
git clone https://github.com/jordanaftermidnight/IRIS_project.git && cd IRIS_project && chmod +x install.sh && ./install.sh
```

### **Step-by-Step Install**
```bash
# 1. Clone repository
git clone https://github.com/jordanaftermidnight/IRIS_project.git
cd IRIS_project

# 2. Run automated installer
chmod +x install.sh
./install.sh

# 3. Setup configuration
npm run setup
```

---

## 📋 **Prerequisites**

### **Required**
- **Node.js >= 18.0.0** - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (for cloning)

### **Optional (but recommended)**
- **Ollama** - [Download here](https://ollama.ai/) for free local AI
- **API Keys** - For enhanced capabilities (see configuration section)

---

## 💻 **Installation Methods**

### **Method 1: Global Installation (Recommended)**
```bash
# Clone and install globally
git clone https://github.com/jordanaftermidnight/IRIS_project.git
cd IRIS_project
npm install
npm install -g .

# Test installation
iris help
iris --version
```

### **Method 2: Local Installation**
```bash
# Clone and run locally
git clone https://github.com/jordanaftermidnight/IRIS_project.git
cd IRIS_project
npm install

# Use with npm scripts
npm start help
npm start chat "Hello!"
```

### **Method 3: Development Installation**
```bash
# Clone for development
git clone https://github.com/jordanaftermidnight/IRIS_project.git
cd IRIS_project
npm install

# Create alias for convenience
echo 'alias iris="npm start"' >> ~/.bashrc
source ~/.bashrc

# Use anywhere
iris help
```

---

## 🔧 **Configuration Setup**

### **1. Copy Configuration Files**
```bash
# Copy environment template
cp .env.example .env

# Copy provider configs (optional)
cp config/gemini-config.example.json config/gemini-config.json
cp config/llama2-config.example.json config/llama2-config.json
```

### **2. Add API Keys (Optional)**
Edit `.env` file and add your API keys:
```bash
# OpenAI (for GPT-4o, o1-preview)
OPENAI_API_KEY=sk-your-openai-key

# Groq (for ultra-fast inference) 
GROQ_API_KEY=gsk_your-groq-key

# Gemini (for multimodal analysis)
GEMINI_API_KEY=AI-your-gemini-key

# Claude (for advanced reasoning)
ANTHROPIC_API_KEY=sk-ant-your-claude-key
```

### **3. Install Ollama (Free Local AI)**
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull recommended models
ollama pull mistral
ollama pull qwen2.5
ollama pull deepseek-coder
```

---

## 🧪 **Verification & Testing**

### **Test Basic Functionality**
```bash
# Check installation
iris --version
iris help

# Test AI providers
iris providers
iris health

# Quick chat test
iris chat "Hello, test message"
```

### **Test IDE Features**
```bash
# Create test file
echo "function test() { return 'hello'; }" > test.js

# Test IDE features
iris context test.js
iris explain test.js
iris complete test.js 1 20

# Cleanup
rm test.js
```

---

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **"iris: command not found"**
```bash
# Solution 1: Use npm start
npm start help

# Solution 2: Create alias
echo 'alias iris="node $(pwd)/src/enhanced-ai.js"' >> ~/.bashrc
source ~/.bashrc

# Solution 3: Fix global install
npm uninstall -g iris-ai
npm install -g .
```

#### **"Permission denied" during npm install**
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
npm cache clean --force

# Or install without sudo
npm config set prefix ~/.local
echo 'export PATH=$HOME/.local/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

#### **"Module not found" errors**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Or install specific missing package
npm install ollama @google/generative-ai
```

#### **Ollama connection issues**
```bash
# Start Ollama service
ollama serve

# Check Ollama status
ollama list
ollama pull mistral
```

---

## 🌍 **Platform-Specific Instructions**

### **macOS**
```bash
# Install with Homebrew (if preferred)
brew install node
brew install git
brew install ollama

# Then follow standard installation
git clone https://github.com/jordanaftermidnight/IRIS_project.git
cd IRIS_project
./install.sh
```

### **Ubuntu/Debian Linux**
```bash
# Install prerequisites
sudo apt update
sudo apt install nodejs npm git curl

# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Then follow standard installation
git clone https://github.com/jordanaftermidnight/IRIS_project.git
cd IRIS_project
./install.sh
```

### **Windows**
```bash
# Install Node.js from https://nodejs.org/
# Install Git from https://git-scm.com/

# Open Command Prompt or PowerShell
git clone https://github.com/jordanaftermidnight/IRIS_project.git
cd IRIS_project
npm install
npm install -g .

# Test installation
iris help
```

### **Docker** (Alternative)
```bash
# Create Dockerfile
cat > Dockerfile << EOF
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENTRYPOINT ["node", "src/enhanced-ai.js"]
EOF

# Build and run
docker build -t iris-ai .
docker run --rm iris-ai help
```

---

## 🔄 **Updating Iris**

### **Quick Update (Recommended)**
```bash
# Navigate to your Iris directory
cd /path/to/Iris_Integrated-Runtime-Intelligence-Service

# Pull latest changes and update
git pull origin main && npm install && npm install -g .

# Verify update
iris --version
```

### **Step-by-Step Update**
```bash
# 1. Navigate to Iris directory
cd /path/to/Iris_Integrated-Runtime-Intelligence-Service

# 2. Check for updates
git fetch origin
git status

# 3. Pull latest changes
git pull origin main

# 4. Update dependencies
npm install

# 5. Reinstall globally
npm install -g .

# 6. Verify installation
iris --version
iris health
```

### **Update with Backup (Safe Method)**
```bash
# 1. Backup current configuration
cp .env .env.backup 2>/dev/null || echo "No .env to backup"

# 2. Check current version
iris --version

# 3. Update
git pull origin main
npm install
npm install -g .

# 4. Restore configuration if needed
cp .env.backup .env 2>/dev/null || echo "No backup to restore"

# 5. Test new version
iris health
```

### **Check for Updates**
```bash
# Check current version
iris --version

# Check latest available version
git fetch origin
git log --oneline -5

# Compare with current
git status
```

### **Force Clean Update (If Issues)**
```bash
# Clean install (removes local changes)
git fetch origin
git reset --hard origin/main
npm ci
npm install -g .

# Verify
iris --version
iris providers
```

### **Auto-Update Script**
Create an update script for easy future updates:
```bash
# Create update script
cat > update-iris.sh << 'EOF'
#!/bin/bash
echo "🔄 Updating Iris..."
cd "$(dirname "$0")"
git pull origin main
npm install
npm install -g .
echo "✅ Update complete!"
iris --version
EOF

# Make executable
chmod +x update-iris.sh

# Use anytime
./update-iris.sh
```

---

## 🆘 **Getting Help**

### **Documentation**
- **Main README**: [README.md](README.md)
- **Features Guide**: [README_IRIS_ENHANCED.md](README_IRIS_ENHANCED.md)
- **Quick Start**: [QUICKSTART.md](QUICKSTART.md)

### **Support**
- **GitHub Issues**: [Report problems](https://github.com/jordanaftermidnight/Iris_Integrated-Runtime-Intelligence-Service/issues)
- **Email**: jordanaftermidnight@users.noreply.github.com

### **Community**
- **Examples**: Check [examples/](examples/) directory
- **Tests**: Run `npm test` to see example usage

---

## ✅ **Installation Complete!**

Once installed, you'll have access to:

```bash
iris help                        # Show all commands
iris chat "Hello!"               # Chat with AI
iris complete file.js 25 10      # Code completion
iris explain file.py 15 30       # Code explanation
iris commit                      # Smart commit messages
iris workspace                   # Project analysis
iris providers                   # Check AI provider status
```

**Welcome to professional AI development! 🚀**