#!/usr/bin/env node

/**
 * Intelligent Provider Manager
 * Manages API providers with smart fallbacks and automatic key detection
 * 
 * @author Jordan After Midnight (concept and architecture)
 * @author Claude AI (implementation assistance)
 * @copyright 2025 Jordan After Midnight. All rights reserved.
 */

export class ProviderManager {
  constructor() {
    this.availableProviders = new Map();
    this.providerStatus = new Map();
    this.requiredKeys = {
      groq: 'GROQ_API_KEY',
      openai: 'OPENAI_API_KEY',
      claude: 'ANTHROPIC_API_KEY',
      gemini: 'GOOGLE_API_KEY',
      cohere: 'COHERE_API_KEY',
      huggingface: 'HUGGINGFACE_API_TOKEN',
      together: 'TOGETHER_API_KEY',
      ollama: null, // No API key required
      builtin: null  // No API key required
    };
  }

  /**
   * Check if provider has required API key
   */
  hasApiKey(providerName) {
    const keyName = this.requiredKeys[providerName];
    if (!keyName) return true; // Provider doesn't need API key
    
    return process.env[keyName] && process.env[keyName].trim().length > 0;
  }

  /**
   * Register provider with intelligent initialization
   */
  async registerProvider(providerName, ProviderClass, options = {}) {
    try {
      // Check if API key is available
      if (!this.hasApiKey(providerName)) {
        this.providerStatus.set(providerName, {
          status: 'missing_key',
          error: `Missing ${this.requiredKeys[providerName]}`,
          canInitialize: false
        });
        
        if (!options.forceInit) {
          console.log(`⏭️  Skipping ${providerName} - no API key found`);
          return false;
        }
      }

      // Try to initialize provider
      const provider = new ProviderClass(options);
      
      // Verify provider is functional
      if (provider.isAvailable && !await provider.isAvailable()) {
        this.providerStatus.set(providerName, {
          status: 'unavailable',
          error: 'Provider not available',
          canInitialize: false
        });
        console.log(`⚠️  ${providerName} is not available`);
        return false;
      }

      this.availableProviders.set(providerName, provider);
      this.providerStatus.set(providerName, {
        status: 'active',
        canInitialize: true
      });
      
      console.log(`✅ ${providerName} provider initialized`);
      return true;

    } catch (error) {
      this.providerStatus.set(providerName, {
        status: 'error',
        error: error.message,
        canInitialize: false
      });
      
      if (options.verbose) {
        console.error(`❌ Failed to initialize ${providerName}: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * Get available providers
   */
  getAvailableProviders() {
    return Array.from(this.availableProviders.keys());
  }

  /**
   * Get provider instance
   */
  getProvider(providerName) {
    return this.availableProviders.get(providerName);
  }

  /**
   * Get provider status report
   */
  getStatusReport() {
    const report = {
      total: this.providerStatus.size,
      active: 0,
      missingKey: 0,
      error: 0,
      providers: {}
    };

    for (const [name, status] of this.providerStatus) {
      report.providers[name] = status;
      
      switch (status.status) {
        case 'active':
          report.active++;
          break;
        case 'missing_key':
          report.missingKey++;
          break;
        case 'error':
        case 'unavailable':
          report.error++;
          break;
      }
    }

    return report;
  }

  /**
   * Setup provider if requested
   */
  async setupProvider(providerName, apiKey) {
    const keyName = this.requiredKeys[providerName];
    
    if (!keyName) {
      return { success: false, error: 'Provider does not require API key' };
    }

    if (!apiKey || apiKey.trim().length === 0) {
      return { success: false, error: 'Invalid API key provided' };
    }

    // Set environment variable
    process.env[keyName] = apiKey;
    
    // Update status
    this.providerStatus.set(providerName, {
      status: 'pending_init',
      canInitialize: true
    });

    return { 
      success: true, 
      message: `API key set for ${providerName}. Re-initialize to activate.` 
    };
  }

  /**
   * Get missing API keys info
   */
  getMissingKeys() {
    const missing = [];
    
    for (const [provider, keyName] of Object.entries(this.requiredKeys)) {
      if (keyName && !this.hasApiKey(provider)) {
        missing.push({
          provider,
          envVariable: keyName,
          status: this.providerStatus.get(provider)
        });
      }
    }

    return missing;
  }

  /**
   * Auto-initialize all available providers
   */
  async autoInitializeProviders(providerClasses) {
    console.log('🔍 Auto-detecting available providers...\n');
    
    const results = {
      successful: [],
      skipped: [],
      failed: []
    };

    for (const [name, ProviderClass] of Object.entries(providerClasses)) {
      const result = await this.registerProvider(name, ProviderClass);
      
      if (result) {
        results.successful.push(name);
      } else {
        const status = this.providerStatus.get(name);
        if (status?.status === 'missing_key') {
          results.skipped.push(name);
        } else {
          results.failed.push(name);
        }
      }
    }

    // Summary
    console.log('\n📊 Provider Initialization Summary:');
    console.log(`✅ Active: ${results.successful.join(', ') || 'None'}`);
    console.log(`⏭️  Skipped (no key): ${results.skipped.join(', ') || 'None'}`);
    console.log(`❌ Failed: ${results.failed.join(', ') || 'None'}`);
    
    if (results.successful.length === 0) {
      console.log('\n⚠️  No providers available. Set API keys to enable providers.');
      console.log('Missing keys:', this.getMissingKeys().map(k => k.envVariable).join(', '));
    }

    return results;
  }
}

export const providerManager = new ProviderManager();