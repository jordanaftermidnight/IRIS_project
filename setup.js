#!/usr/bin/env node

/**
 * Iris Setup Script
 * Automatic setup and validation for new installations
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkNode() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion >= 18) {
    log(colors.green, `✅ Node.js ${nodeVersion} (compatible)`);
    return true;
  } else {
    log(colors.red, `❌ Node.js ${nodeVersion} (requires >= 18.0.0)`);
    return false;
  }
}

function checkOllama() {
  try {
    execSync('ollama --version', { stdio: 'pipe' });
    log(colors.green, '✅ Ollama installed (local AI available)');
    return true;
  } catch (error) {
    log(colors.yellow, '⚠️  Ollama not found (optional - enables free local AI)');
    log(colors.blue, '💡 Install: https://ollama.ai');
    return false;
  }
}

function createConfigFiles() {
  const configDir = './config';
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  // Check if user configs exist, if not suggest copying examples
  const configs = [
    { example: 'gemini-config.example.json', user: 'gemini-config.json' },
    { example: 'llama2-config.example.json', user: 'llama2-config.json' }
  ];
  
  let needsSetup = false;
  
  for (const config of configs) {
    const examplePath = path.join(configDir, config.example);
    const userPath = path.join(configDir, config.user);
    
    if (fs.existsSync(examplePath) && !fs.existsSync(userPath)) {
      needsSetup = true;
    }
  }
  
  if (needsSetup) {
    log(colors.yellow, '\n⚙️  Configuration Setup:');
    log(colors.blue, '   Copy example configs and add your API keys:');
    for (const config of configs) {
      log(colors.blue, `   cp config/${config.example} config/${config.user}`);
    }
  }
}

function checkEnvFile() {
  if (!fs.existsSync('.env') && fs.existsSync('.env.example')) {
    log(colors.yellow, '\n🔧 Environment Setup:');
    log(colors.blue, '   Copy .env.example to .env and add your API keys:');
    log(colors.blue, '   cp .env.example .env');
    return false;
  }
  return true;
}

function showQuickStart() {
  log(colors.green, '\n🚀 Quick Start:');
  log(colors.blue, '   iris help                    # Show all commands');
  log(colors.blue, '   iris chat "Hello!"           # Chat with AI');
  log(colors.blue, '   iris providers              # Check AI provider status');
  log(colors.blue, '   iris workspace              # Analyze current project');
  
  log(colors.green, '\n💻 IDE Features:');
  log(colors.blue, '   iris complete file.js 25 10 # Code completion');
  log(colors.blue, '   iris explain file.js 10 20  # Explain code');
  log(colors.blue, '   iris commit                  # Smart commit messages');
  log(colors.blue, '   iris review file.js         # Code review');
}

function main() {
  log(colors.bold + colors.blue, '\n🚀 Iris - Integrated Runtime Intelligence Service');
  log(colors.blue, '   Professional AI Development Assistant');
  log(colors.blue, '===============================================\n');
  
  log(colors.bold + colors.green, '📋 System Check:');
  
  const nodeOk = checkNode();
  const ollamaAvailable = checkOllama();
  
  if (!nodeOk) {
    log(colors.red, '\n❌ Setup failed: Node.js >= 18.0.0 required');
    process.exit(1);
  }
  
  log(colors.bold + colors.green, '\n⚙️  Configuration:');
  createConfigFiles();
  checkEnvFile();
  
  log(colors.bold + colors.green, '\n🎯 Available AI Providers:');
  log(colors.green, '✅ Ollama (Free, Local)' + (ollamaAvailable ? ' - Ready' : ' - Install for free AI'));
  log(colors.yellow, '⚠️  Groq (Fast, Low cost) - Add GROQ_API_KEY');
  log(colors.yellow, '⚠️  OpenAI (Advanced) - Add OPENAI_API_KEY');
  log(colors.yellow, '⚠️  Gemini (Multimodal) - Add GEMINI_API_KEY');
  log(colors.yellow, '⚠️  Claude (Reasoning) - Add ANTHROPIC_API_KEY');
  
  showQuickStart();
  
  log(colors.bold + colors.green, '\n✨ Setup Complete!');
  
  if (!ollamaAvailable) {
    log(colors.yellow, '\n💡 Tip: Install Ollama for free local AI:');
    log(colors.blue, '   https://ollama.ai');
    log(colors.blue, '   Then: ollama pull mistral');
  }
  
  log(colors.blue, '\n📚 Documentation: https://github.com/jordanaftermidnight/Iris_Integrated-Runtime-Intelligence-Service');
  log(colors.blue, '🐛 Issues: https://github.com/jordanaftermidnight/Iris_Integrated-Runtime-Intelligence-Service/issues\n');
}

// Run setup
main();