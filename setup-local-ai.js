#!/usr/bin/env node

/**
 * IRIS Local AI Setup Script
 * Automatically downloads and configures Mistral 7B as the default local AI model
 * 
 * @author Jordan After Midnight
 * @copyright 2025 Jordan After Midnight. All rights reserved.
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const exec = promisify(require('child_process').exec);

class LocalAISetup {
    constructor() {
        this.defaultModel = 'mistral:7b';
        this.backupModels = ['llama3.1:8b', 'llama3.2:latest'];
        this.ollamaHost = 'http://localhost:11434';
    }

    async checkOllamaInstalled() {
        try {
            await exec('ollama --version');
            console.log('✅ Ollama is installed');
            return true;
        } catch (error) {
            console.log('❌ Ollama is not installed');
            console.log('📋 Please install Ollama first:');
            console.log('   macOS: brew install ollama');
            console.log('   Linux: curl -fsSL https://ollama.com/install.sh | sh');
            console.log('   Windows: Download from https://ollama.com/download');
            return false;
        }
    }

    async checkOllamaRunning() {
        try {
            const response = await fetch(`${this.ollamaHost}/api/version`);
            if (response.ok) {
                console.log('✅ Ollama service is running');
                return true;
            }
        } catch (error) {
            console.log('❌ Ollama service is not running');
            console.log('🚀 Starting Ollama service...');
            
            // Try to start Ollama service
            try {
                const ollamaProcess = spawn('ollama', ['serve'], {
                    detached: true,
                    stdio: 'ignore'
                });
                ollamaProcess.unref();
                
                // Wait a bit for service to start
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                const retryResponse = await fetch(`${this.ollamaHost}/api/version`);
                if (retryResponse.ok) {
                    console.log('✅ Ollama service started successfully');
                    return true;
                }
            } catch (startError) {
                console.log('⚠️  Could not auto-start Ollama. Please run: ollama serve');
                return false;
            }
        }
        return false;
    }

    async getInstalledModels() {
        try {
            const response = await fetch(`${this.ollamaHost}/api/tags`);
            const data = await response.json();
            return data.models?.map(m => m.name) || [];
        } catch (error) {
            console.log('⚠️  Could not fetch installed models');
            return [];
        }
    }

    async downloadModel(modelName) {
        console.log(`📥 Downloading ${modelName}...`);
        
        return new Promise((resolve, reject) => {
            const downloadProcess = spawn('ollama', ['pull', modelName], {
                stdio: ['inherit', 'pipe', 'pipe']
            });

            let output = '';
            let lastProgress = '';

            downloadProcess.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                
                // Extract progress information
                const progressMatch = text.match(/pulling.*?(\d+%)/);
                if (progressMatch && progressMatch[1] !== lastProgress) {
                    lastProgress = progressMatch[1];
                    process.stdout.write(`\r📊 Progress: ${lastProgress}`);
                }
            });

            downloadProcess.stderr.on('data', (data) => {
                const text = data.toString();
                if (!text.includes('[?')) { // Filter out terminal control sequences
                    console.log(text);
                }
            });

            downloadProcess.on('close', (code) => {
                process.stdout.write('\n');
                if (code === 0) {
                    console.log(`✅ ${modelName} downloaded successfully`);
                    resolve(true);
                } else {
                    console.log(`❌ Failed to download ${modelName}`);
                    reject(new Error(`Download failed with code ${code}`));
                }
            });

            downloadProcess.on('error', (error) => {
                console.log(`❌ Error downloading ${modelName}:`, error.message);
                reject(error);
            });
        });
    }

    async testModel(modelName) {
        console.log(`🧪 Testing ${modelName}...`);
        
        try {
            const response = await fetch(`${this.ollamaHost}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelName,
                    prompt: 'Say "Hello from IRIS" in exactly 3 words.',
                    stream: false
                })
            });

            const data = await response.json();
            if (data.response && data.response.includes('Hello')) {
                console.log(`✅ ${modelName} is working correctly`);
                console.log(`   Response: ${data.response.trim()}`);
                return true;
            } else {
                console.log(`⚠️  ${modelName} gave unexpected response: ${data.response}`);
                return false;
            }
        } catch (error) {
            console.log(`❌ Failed to test ${modelName}:`, error.message);
            return false;
        }
    }

    async setupDefaultModel() {
        console.log('\n🚀 IRIS Local AI Setup Starting...\n');

        // Check prerequisites
        if (!await this.checkOllamaInstalled()) {
            return false;
        }

        if (!await this.checkOllamaRunning()) {
            return false;
        }

        // Check existing models
        const installedModels = await this.getInstalledModels();
        console.log(`📋 Currently installed models: ${installedModels.join(', ') || 'None'}`);

        // Download default model if not present
        if (!installedModels.includes(this.defaultModel)) {
            try {
                await this.downloadModel(this.defaultModel);
            } catch (error) {
                console.log(`⚠️  Failed to download ${this.defaultModel}, trying backup models...`);
                
                // Try backup models
                for (const backupModel of this.backupModels) {
                    if (!installedModels.includes(backupModel)) {
                        try {
                            await this.downloadModel(backupModel);
                            console.log(`✅ Using ${backupModel} as fallback model`);
                            break;
                        } catch (backupError) {
                            console.log(`⚠️  ${backupModel} also failed, trying next...`);
                        }
                    }
                }
            }
        } else {
            console.log(`✅ ${this.defaultModel} already installed`);
        }

        // Test the model
        const finalModels = await this.getInstalledModels();
        const modelToTest = finalModels.find(m => 
            m.includes('mistral') || m.includes('llama3.1') || m.includes('llama3.2')
        );

        if (modelToTest) {
            await this.testModel(modelToTest);
            console.log('\n🎉 Local AI setup completed successfully!');
            console.log(`🤖 Primary model: ${modelToTest}`);
            console.log('🚀 IRIS is ready to use local AI');
            return true;
        } else {
            console.log('\n❌ No suitable AI model could be installed');
            return false;
        }
    }

    async run() {
        const success = await this.setupDefaultModel();
        process.exit(success ? 0 : 1);
    }
}

// Auto-run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const setup = new LocalAISetup();
    setup.run().catch(console.error);
}

export default LocalAISetup;