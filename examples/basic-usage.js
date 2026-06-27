#!/usr/bin/env node

/**
 * Basic Usage Examples for Multi-AI Integration
 * Demonstrates core functionality and features
 */

import MultiAI from '../src/index.js';

async function runExamples() {
  console.log('Multi-AI Integration - Basic Usage Examples\n');

  // Initialize the AI system
  const ai = new MultiAI();
  
  try {
    // Initialize providers
    console.log('1. Initializing AI providers...');
    await ai.initializeProviders();
    
    // Example 1: Basic chat
    console.log('\n2. Basic Chat Example:');
    try {
      const response = await ai.chat('Hello! Tell me a fun fact about programming.');
      console.log(`Response: ${response.response}`);
      console.log(`Provider: ${response.provider}, Model: ${response.model}`);
    } catch (error) {
      console.log('⚠️ Chat failed (no providers available):', error.message);
    }

    // Example 2: Task-specific chat
    console.log('\n3. Task-Specific Chat Example:');
    try {
      const codeResponse = await ai.chat(
        'Write a simple Python function to calculate fibonacci numbers',
        { taskType: 'code' }
      );
      console.log(`Code Response: ${codeResponse.response.substring(0, 200)}...`);
      console.log(`Provider: ${codeResponse.provider}`);
    } catch (error) {
      console.log('⚠️ Code chat failed:', error.message);
    }

    // Example 3: Knowledge base usage
    console.log('\n4. Knowledge Base Example:');
    ai.addKnowledge('project_info', {
      name: 'Multi-AI Integration',
      version: '2.0.0',
      description: 'Advanced multi-provider AI system'
    });
    
    ai.addKnowledge('best_practices', 'Always validate user input and sanitize API keys');
    
    console.log(`Knowledge entries: ${ai.knowledgeBase.size}`);
    
    // Search knowledge
    const searchResults = ai.searchKnowledge('project');
    console.log(`Search results for 'project': ${searchResults.length} entries`);

    // Example 4: Context management
    console.log('\n5. Context Management Example:');
    ai.clearContext();
    ai.updateContext('What is AI?', 'AI stands for Artificial Intelligence...');
    ai.updateContext('Tell me about machine learning', 'Machine learning is a subset of AI...');
    
    const context = ai.getContext();
    console.log(`Context entries: ${context.length}`);
    console.log(`Latest context: ${context[context.length - 1]}`);

    // Example 5: System status
    console.log('\n6. System Status Example:');
    const status = await ai.getSystemStatus();
    console.log(`System version: ${status.version}`);
    console.log(`Healthy providers: ${status.providers.healthy}/${status.providers.total}`);
    console.log(`Knowledge base entries: ${status.resources.knowledgeBase.entries}`);
    console.log(`Memory usage: ${Math.round(status.resources.knowledgeBase.memoryUsage.heapUsed / 1024 / 1024)}MB`);

    // Example 6: Configuration
    console.log('\n7. Configuration Example:');
    console.log(`Prefer local providers: ${ai.config.routing.preferLocal}`);
    console.log(`Max context length: ${ai.config.context.maxLength}`);
    console.log(`Request timeout: ${ai.config.performance?.requestTimeout || 'default'}ms`);

    // Example 7: Error handling
    console.log('\n8. Error Handling Example:');
    try {
      await ai.chat(''); // This should fail
    } catch (error) {
      console.log(`✅ Properly caught error: ${error.message}`);
    }

    try {
      ai.addKnowledge('', 'empty key'); // This should fail
    } catch (error) {
      console.log(`✅ Properly caught error: ${error.message}`);
    }

    // Example 8: Provider statistics (if any requests were made)
    console.log('\n9. Provider Statistics Example:');
    const stats = ai.router.getProviderStats();
    for (const [provider, data] of Object.entries(stats)) {
      if (data.requests > 0) {
        console.log(`${provider}: ${data.requests} requests, ${data.successRate} success rate`);
      }
    }

    console.log('\n✅ All examples completed successfully!');
    console.log('\nNext steps:');
    console.log('- Try the CLI: npm run start');
    console.log('- Process a file: npm run start file ./examples/basic-usage.js');
    console.log('- Check health: npm run health');

  } catch (error) {
    console.error('❌ Example failed:', error.message);
    
    if (error.message.includes('No AI providers')) {
      console.log('\nTip: Make sure Ollama is installed and running:');
      console.log(' 1. Install Ollama: https://ollama.ai/');
      console.log(' 2. Pull a model: ollama pull llama3.2');
      console.log(' 3. Run this example again');
    }
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples().catch(error => {
    console.error('Examples failed:', error);
    process.exit(1);
  });
}

export { runExamples };