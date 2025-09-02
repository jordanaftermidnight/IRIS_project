#!/bin/bash

# IRIS Enhancement Setup Script
# Run this in your existing IRIS project directory

echo "🚀 Setting up IRIS ML Enhancement..."

# Create directory structure
echo "📁 Creating ML directory structure..."
mkdir -p src/ml
mkdir -p src/security  
mkdir -p src/providers/new
mkdir -p models

# Install dependencies
echo "📦 Installing ML dependencies..."
npm install @xenova/transformers ml-matrix chromadb uuid systeminformation axios
npm install @google-ai/generativelanguage groq-sdk together-ai
npm install @types/node typescript

# Create TypeScript config
echo "⚙️ Setting up TypeScript..."
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs", 
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Create environment template
echo "🔧 Creating environment template..."
cat > .env.example << 'EOF'
# AI Provider API Keys (Free Tiers)
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here  
TOGETHER_API_KEY=your_together_api_key_here
HUGGINGFACE_API_KEY=your_huggingface_api_key_here

# Service Endpoints
OLLAMA_HOST=http://localhost:11434
CHROMA_HOST=http://localhost:8000

# ML Configuration
TRANSFORMER_CACHE_DIR=./models
VECTOR_DB_COLLECTION=iris-cache
ML_CONFIDENCE_THRESHOLD=0.7
SECURITY_THREAT_THRESHOLD=0.8

# Debug
DEBUG=true
LOG_LEVEL=info
EOF

# Copy to actual .env if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created .env file - please add your API keys!"
fi

# Create provider config
echo "🌐 Creating provider configuration..."
cat > config/enhanced-providers.json << 'EOF'
{
  "providers": {
    "ollama-local": {
      "type": "local",
      "endpoint": "http://localhost:11434",
      "models": ["llama3.1:8b", "mistral:7b", "phi3:mini"],
      "capabilities": ["text", "code", "conversation"],
      "cost": 0,
      "privacy": "high",
      "speed": "fast"
    },
    "gemini": {
      "type": "cloud",
      "endpoint": "https://generativelanguage.googleapis.com",
      "models": ["gemini-1.5-flash", "gemini-1.5-pro"],
      "capabilities": ["text", "vision", "code", "multimodal"],
      "limits": {"daily": 1500, "rpm": 5},
      "cost": 0,
      "context_window": 1000000
    },
    "groq": {
      "type": "cloud",
      "endpoint": "https://api.groq.com", 
      "models": ["llama3.1-70b", "mixtral-8x7b"],
      "capabilities": ["text", "code"],
      "speed": "ultra-fast",
      "cost": 0,
      "context_window": 32768
    },
    "together-ai": {
      "type": "cloud",
      "endpoint": "https://api.together.xyz",
      "models": ["codellama-34b", "wizardcoder-34b"],
      "capabilities": ["code", "text"],
      "specialization": "coding",
      "cost": 0
    }
  },
  "routing": {
    "local_first": ["coding", "personal", "sensitive"],
    "cloud_preferred": ["complex", "multimodal", "research"],
    "security_levels": {
      "confidential": ["ollama-local"],
      "personal": ["ollama-local", "gemini", "groq"],
      "public": ["all"]
    }
  }
}
EOF

# Create initial ML file structure
echo "🧠 Creating ML file templates..."

# Query Classifier Template
cat > src/ml/query-classifier.ts << 'EOF'
// IRIS Query Classifier - ML-powered query understanding
// This replaces the mock "neural-learning.js" with real transformers

import { pipeline } from '@xenova/transformers';

interface QueryClassification {
  taskType: 'coding' | 'writing' | 'analysis' | 'multimodal' | 'conversation';
  complexity: 'simple' | 'moderate' | 'complex';
  urgency: 'low' | 'medium' | 'high';
  contextLength: number;
  confidence: number;
}

export class QueryClassifier {
  private pipeline: any;
  private embeddingModel: any;
  private initialized = false;
  
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('🤖 Loading transformer models...');
    
    // Load classification model
    this.pipeline = await pipeline(
      'text-classification',
      'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
    );
    
    // Load embedding model for semantic analysis
    this.embeddingModel = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
    
    this.initialized = true;
    console.log('✅ ML models loaded successfully');
  }
  
  async classifyQuery(query: string): Promise<QueryClassification> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // TODO: Implement full classification logic
    // For now, return basic classification
    return {
      taskType: this.detectTaskType(query),
      complexity: this.estimateComplexity(query),
      urgency: 'medium',
      contextLength: query.split(' ').length,
      confidence: 0.8
    };
  }
  
  private detectTaskType(query: string): QueryClassification['taskType'] {
    // Simple keyword-based detection (enhance with ML)
    if (/code|function|bug|debug|program/i.test(query)) return 'coding';
    if (/write|essay|story|article/i.test(query)) return 'writing';  
    if (/analyze|research|study|examine/i.test(query)) return 'analysis';
    if (/image|picture|video|visual/i.test(query)) return 'multimodal';
    return 'conversation';
  }
  
  private estimateComplexity(query: string): QueryClassification['complexity'] {
    const wordCount = query.split(' ').length;
    if (wordCount > 100) return 'complex';
    if (wordCount > 30) return 'moderate'; 
    return 'simple';
  }
}
EOF

# RL Provider Selector Template  
cat > src/ml/rl-provider-selector.ts << 'EOF'
// IRIS RL Provider Selector - Thompson Sampling for optimal routing
// This replaces hardcoded provider selection with learning algorithms

interface ProviderStats {
  alpha: number;  // Success count (Beta distribution)
  beta: number;   // Failure count  
  avgResponseTime: number;
  qualityHistory: number[];
}

export class RLProviderSelector {
  private providerStats = new Map<string, ProviderStats>();
  
  selectProvider(availableProviders: string[]): string {
    // TODO: Implement Thompson Sampling
    // For now, return random selection
    return availableProviders[Math.floor(Math.random() * availableProviders.length)];
  }
  
  updatePerformance(providerId: string, responseTime: number, quality: number): void {
    // TODO: Update provider statistics and learn from performance
    console.log(`📊 Updating ${providerId} performance: ${quality} quality, ${responseTime}ms`);
  }
}
EOF

# Start Ollama service
echo "🦙 Starting Ollama service..."
if command -v ollama &> /dev/null; then
    ollama serve &
    sleep 2
    echo "📥 Pulling Llama 3.1 model..."
    ollama pull llama3.1:8b
else
    echo "⚠️ Ollama not found. Install it from https://ollama.ai"
fi

# Create implementation checklist
echo "📋 Creating implementation checklist..."
cat > IMPLEMENTATION_CHECKLIST.md << 'EOF'
# IRIS ML Enhancement Implementation Checklist

## Setup Complete ✅
- [x] Dependencies installed
- [x] Directory structure created  
- [x] TypeScript configured
- [x] Environment template created
- [x] Provider configuration added

## Next Steps (For Claude Code)

### Day 1: Core ML Foundation
- [ ] Complete QueryClassifier implementation with real transformers
- [ ] Add Gemini API integration in src/providers/new/gemini-provider.ts
- [ ] Add Groq API integration in src/providers/new/groq-provider.ts  
- [ ] Set up basic semantic caching
- [ ] Test end-to-end query classification

### Day 2: Advanced Features  
- [ ] Implement Thompson Sampling in RLProviderSelector
- [ ] Add security threat detection
- [ ] Create semantic cache with vector embeddings
- [ ] Integrate all new providers into main router
- [ ] Add performance monitoring

### Day 3: Polish & Demo
- [ ] End-to-end integration testing
- [ ] Create benchmarking suite
- [ ] Performance validation
- [ ] Demo scenarios
- [ ] Documentation

## API Keys Needed
- [ ] Gemini API: https://aistudio.google.com/app/apikey  
- [ ] Groq API: https://console.groq.com/
- [ ] Together AI: https://api.together.xyz/

## Current Status
Ready for Claude Code implementation! Start with src/ml/query-classifier.ts
EOF

echo ""
echo "🎉 IRIS ML Enhancement setup complete!"
echo ""
echo "📍 Next steps:"
echo "1. Add your API keys to .env file"
echo "2. Point Claude Code to this directory" 
echo "3. Start with: src/ml/query-classifier.ts"
echo "4. Follow IMPLEMENTATION_CHECKLIST.md"
echo ""
echo "🚀 Ready for weekend implementation sprint!"