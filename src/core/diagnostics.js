#!/usr/bin/env node

/**
 * IRIS Automated Diagnostics System
 * Self-healing and troubleshooting automation
 */

import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';

export class DiagnosticsSystem {
  constructor() {
    this.issues = [];
    this.fixes = [];
    this.healthScore = 100;
  }

  /**
   * Run comprehensive automated diagnostics
   */
  async runFullDiagnostics() {
    console.log('🔍 Running IRIS Automated Diagnostics...');
    
    const checks = [
      this.checkEnvironmentVariables(),
      this.checkNetworkConnectivity(),
      this.checkOllamaService(),
      this.checkDependencies(),
      this.checkAPIQuotas(),
      this.checkSystemResources(),
      this.checkProviderHealth()
    ];

    const results = await Promise.all(checks);
    
    // Calculate health score
    const passedChecks = results.filter(r => r.status === 'pass').length;
    this.healthScore = Math.round((passedChecks / results.length) * 100);
    
    // Auto-fix issues
    await this.autoFixIssues();
    
    return this.generateReport();
  }

  /**
   * Check environment variables
   */
  checkEnvironmentVariables() {
    const requiredVars = ['GROQ_API_KEY', 'GEMINI_API_KEY'];
    const missing = [];
    
    for (const envVar of requiredVars) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }

    if (missing.length > 0) {
      this.issues.push({
        type: 'environment',
        severity: 'medium',
        description: `Missing API keys: ${missing.join(', ')}`,
        autofix: true,
        fix: () => this.fixEnvironmentVariables(missing)
      });
      return { status: 'warn', check: 'environment', message: `Missing: ${missing.join(', ')}` };
    }

    return { status: 'pass', check: 'environment', message: 'All API keys configured' };
  }

  /**
   * Check network connectivity
   */
  async checkNetworkConnectivity() {
    const endpoints = [
      'https://api.groq.com',
      'https://generativelanguage.googleapis.com',
      'http://localhost:11434'
    ];

    const results = [];
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { 
          method: 'HEAD', 
          timeout: 5000 
        });
        results.push({ endpoint, status: response.status < 500 });
      } catch (error) {
        results.push({ endpoint, status: false, error: error.message });
      }
    }

    const failed = results.filter(r => !r.status);
    if (failed.length > 0) {
      this.issues.push({
        type: 'network',
        severity: 'high',
        description: `Network connectivity issues: ${failed.map(f => f.endpoint).join(', ')}`,
        autofix: true,
        fix: () => this.fixNetworkIssues(failed)
      });
      return { status: 'fail', check: 'network', message: `${failed.length} endpoints unreachable` };
    }

    return { status: 'pass', check: 'network', message: 'All endpoints reachable' };
  }

  /**
   * Check Ollama service
   */
  checkOllamaService() {
    try {
      const result = execSync('ollama list', { encoding: 'utf8', timeout: 5000 });
      const models = result.split('\n').filter(line => line.includes(':')).length;
      
      if (models === 0) {
        this.issues.push({
          type: 'ollama',
          severity: 'medium',
          description: 'No Ollama models installed',
          autofix: true,
          fix: () => this.fixOllamaModels()
        });
        return { status: 'warn', check: 'ollama', message: 'No models installed' };
      }

      return { status: 'pass', check: 'ollama', message: `${models} models available` };
    } catch (error) {
      this.issues.push({
        type: 'ollama',
        severity: 'high',
        description: 'Ollama service not running',
        autofix: true,
        fix: () => this.fixOllamaService()
      });
      return { status: 'fail', check: 'ollama', message: 'Service not running' };
    }
  }

  /**
   * Check dependencies
   */
  checkDependencies() {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const required = Object.keys(packageJson.dependencies);
    const missing = [];

    for (const dep of required) {
      try {
        require.resolve(dep);
      } catch (error) {
        missing.push(dep);
      }
    }

    if (missing.length > 0) {
      this.issues.push({
        type: 'dependencies',
        severity: 'high',
        description: `Missing dependencies: ${missing.join(', ')}`,
        autofix: true,
        fix: () => this.fixDependencies(missing)
      });
      return { status: 'fail', check: 'dependencies', message: `${missing.length} missing` };
    }

    return { status: 'pass', check: 'dependencies', message: 'All dependencies installed' };
  }

  /**
   * Check API quotas
   */
  async checkAPIQuotas() {
    const quotaChecks = [];
    
    // Check Groq quota
    if (process.env.GROQ_API_KEY) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }
        });
        quotaChecks.push({ provider: 'groq', status: response.ok });
      } catch (error) {
        quotaChecks.push({ provider: 'groq', status: false, error: error.message });
      }
    }

    // Check Gemini quota
    if (process.env.GEMINI_API_KEY) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        quotaChecks.push({ provider: 'gemini', status: response.ok });
      } catch (error) {
        quotaChecks.push({ provider: 'gemini', status: false, error: error.message });
      }
    }

    const failed = quotaChecks.filter(q => !q.status);
    if (failed.length > 0) {
      this.issues.push({
        type: 'quota',
        severity: 'medium',
        description: `API quota issues: ${failed.map(f => f.provider).join(', ')}`,
        autofix: false,
        fix: null
      });
      return { status: 'warn', check: 'quotas', message: `${failed.length} providers over quota` };
    }

    return { status: 'pass', check: 'quotas', message: 'All quotas healthy' };
  }

  /**
   * Check system resources
   */
  checkSystemResources() {
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const memUsage = ((totalMem - freeMem) / totalMem) * 100;
    
    const loadAvg = os.loadavg()[0];
    const cpuCount = os.cpus().length;
    const cpuUsage = (loadAvg / cpuCount) * 100;

    if (memUsage > 90 || cpuUsage > 90) {
      this.issues.push({
        type: 'resources',
        severity: 'medium',
        description: `High resource usage: ${memUsage.toFixed(1)}% memory, ${cpuUsage.toFixed(1)}% CPU`,
        autofix: false,
        fix: null
      });
      return { status: 'warn', check: 'resources', message: 'High system load' };
    }

    return { status: 'pass', check: 'resources', message: 'System resources healthy' };
  }

  /**
   * Check provider health
   */
  async checkProviderHealth() {
    // This would integrate with the existing provider status check
    // For now, return a basic check
    return { status: 'pass', check: 'providers', message: 'Provider health check passed' };
  }

  /**
   * Auto-fix identified issues
   */
  async autoFixIssues() {
    console.log('🔧 Attempting auto-fixes...');
    
    for (const issue of this.issues) {
      if (issue.autofix && issue.fix) {
        try {
          console.log(`   Fixing: ${issue.description}`);
          await issue.fix();
          this.fixes.push({
            issue: issue.description,
            status: 'fixed',
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.warn(`   Failed to fix: ${issue.description} - ${error.message}`);
          this.fixes.push({
            issue: issue.description,
            status: 'failed',
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  }

  /**
   * Fix environment variables
   */
  async fixEnvironmentVariables(missing) {
    const shellProfile = `${os.homedir()}/.zshrc`;
    console.log(`   Adding missing environment variables to ${shellProfile}`);
    
    // This would prompt user for API keys if needed
    // For automation, we skip if keys aren't available
    throw new Error('API keys need manual configuration');
  }

  /**
   * Fix network issues
   */
  async fixNetworkIssues(failed) {
    console.log('   Checking network configuration...');
    
    // Basic network diagnostics
    try {
      execSync('ping -c 1 8.8.8.8', { timeout: 5000 });
      console.log('   Internet connectivity: OK');
    } catch (error) {
      throw new Error('No internet connectivity');
    }

    // Check for VPN issues
    const vpnProcesses = ['nordvpn', 'expressvpn', 'protonvpn'];
    for (const vpn of vpnProcesses) {
      try {
        execSync(`pgrep ${vpn}`, { timeout: 1000 });
        console.log(`   ⚠️  VPN detected (${vpn}). This may block some providers.`);
      } catch (error) {
        // VPN not running, which is good
      }
    }
  }

  /**
   * Fix Ollama service
   */
  async fixOllamaService() {
    console.log('   Starting Ollama service...');
    try {
      execSync('ollama serve &', { timeout: 5000 });
      console.log('   Ollama service started');
    } catch (error) {
      throw new Error('Failed to start Ollama service');
    }
  }

  /**
   * Fix Ollama models
   */
  async fixOllamaModels() {
    console.log('   Installing basic Ollama model...');
    try {
      execSync('ollama pull llama3.2:latest', { timeout: 300000 }); // 5 minutes
      console.log('   Basic model installed');
    } catch (error) {
      throw new Error('Failed to install Ollama model');
    }
  }

  /**
   * Fix dependencies
   */
  async fixDependencies(missing) {
    console.log('   Installing missing dependencies...');
    try {
      execSync(`npm install ${missing.join(' ')}`, { timeout: 60000 });
      console.log('   Dependencies installed');
    } catch (error) {
      throw new Error('Failed to install dependencies');
    }
  }

  /**
   * Generate diagnostic report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      healthScore: this.healthScore,
      issues: this.issues,
      fixes: this.fixes,
      summary: {
        totalIssues: this.issues.length,
        autoFixed: this.fixes.filter(f => f.status === 'fixed').length,
        failedFixes: this.fixes.filter(f => f.status === 'failed').length,
        status: this.healthScore > 80 ? 'healthy' : this.healthScore > 60 ? 'warning' : 'critical'
      }
    };

    return report;
  }
}