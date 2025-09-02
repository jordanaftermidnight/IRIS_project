#!/usr/bin/env node

/**
 * IRIS Test Simulation Harness
 * Comprehensive testing of installation, setup, and feature functionality
 * Author: Jordan After Midnight
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

class IRISTestSimulation {
  constructor() {
    this.results = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      errors: [],
      performanceMetrics: {
        averageInstallTime: 0,
        averageStartupTime: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
        throughput: 0
      },
      featureTests: {
        cli: { passed: 0, failed: 0 },
        api: { passed: 0, failed: 0 },
        dashboard: { passed: 0, failed: 0 },
        providers: { passed: 0, failed: 0 },
        cache: { passed: 0, failed: 0 },
        pooling: { passed: 0, failed: 0 }
      }
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '[ERROR]' : type === 'success' ? '[SUCCESS]' : '[INFO]';
    console.log(`${timestamp} ${prefix} ${message}`);
  }

  async runCommand(command, options = {}) {
    const startTime = Date.now();
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: __dirname,
        timeout: 30000,
        ...options
      });
      const duration = Date.now() - startTime;
      return { success: true, stdout, stderr, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      return { success: false, error: error.message, duration };
    }
  }

  async testInstallation() {
    this.log('Testing installation process...');
    
    const installTests = [
      'npm install',
      'npm run setup',
      'node src/cli.js --version',
      'node src/cli.js help'
    ];

    let installTime = 0;
    for (const command of installTests) {
      const result = await this.runCommand(command);
      installTime += result.duration;
      
      if (result.success) {
        this.results.passed++;
      } else {
        this.results.failed++;
        this.results.errors.push(`Installation: ${command} - ${result.error}`);
      }
      this.results.totalTests++;
    }

    this.results.performanceMetrics.averageInstallTime = installTime / installTests.length;
  }

  async testCLIFeatures() {
    this.log('Testing CLI features...');
    
    const cliCommands = [
      'node src/cli.js health',
      'node src/cli.js providers',
      'node src/cli.js cache-stats',
      'node src/cli.js pool-stats',
      'node src/cli.js performance',
      'node src/cli.js chat "Hello IRIS"'
    ];

    for (const command of cliCommands) {
      const result = await this.runCommand(command);
      
      if (result.success) {
        this.results.featureTests.cli.passed++;
        this.results.passed++;
      } else {
        this.results.featureTests.cli.failed++;
        this.results.failed++;
        this.results.errors.push(`CLI: ${command} - ${result.error}`);
      }
      this.results.totalTests++;
    }
  }

  async testAPIEndpoints() {
    this.log('Testing API endpoints...');
    
    // Start API server
    const serverProcess = spawn('node', ['iris-api-server.js'], {
      stdio: 'pipe',
      cwd: __dirname
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    const apiTests = [
      'curl -s http://localhost:3001/api/health',
      'curl -s http://localhost:3001/api/performance-stats',
      'curl -s http://localhost:3001/api/cache-stats',
      'curl -s http://localhost:3001/api/pool-stats',
      'curl -s -X POST http://localhost:3001/api/chat -H "Content-Type: application/json" -d \'{"message": "Test query"}\''
    ];

    for (const command of apiTests) {
      const result = await this.runCommand(command);
      
      if (result.success && result.stdout.includes('"')) {
        try {
          JSON.parse(result.stdout);
          this.results.featureTests.api.passed++;
          this.results.passed++;
        } catch {
          this.results.featureTests.api.failed++;
          this.results.failed++;
          this.results.errors.push(`API: ${command} - Invalid JSON response`);
        }
      } else {
        this.results.featureTests.api.failed++;
        this.results.failed++;
        this.results.errors.push(`API: ${command} - ${result.error || 'No response'}`);
      }
      this.results.totalTests++;
    }

    // Clean up server
    serverProcess.kill();
  }

  async testDashboardFunctionality() {
    this.log('Testing dashboard functionality...');
    
    // Test dashboard files exist and are valid
    const dashboardFiles = [
      'index.html',
      'iris-dashboard.js',
      'styles.css'
    ];

    for (const file of dashboardFiles) {
      try {
        const content = await fs.readFile(path.join(__dirname, file), 'utf8');
        if (content.length > 0) {
          this.results.featureTests.dashboard.passed++;
          this.results.passed++;
        } else {
          this.results.featureTests.dashboard.failed++;
          this.results.failed++;
          this.results.errors.push(`Dashboard: ${file} is empty`);
        }
      } catch (error) {
        this.results.featureTests.dashboard.failed++;
        this.results.failed++;
        this.results.errors.push(`Dashboard: ${file} - ${error.message}`);
      }
      this.results.totalTests++;
    }
  }

  async testProviderIntegration() {
    this.log('Testing provider integration...');
    
    const providerTests = [
      'ls src/providers/',
      'node -e "import(\'./src/providers/ollama-provider.js\').then(() => console.log(\'OK\'))"',
      'node -e "import(\'./src/providers/builtin-provider.js\').then(() => console.log(\'OK\'))"'
    ];

    for (const command of providerTests) {
      const result = await this.runCommand(command);
      
      if (result.success) {
        this.results.featureTests.providers.passed++;
        this.results.passed++;
      } else {
        this.results.featureTests.providers.failed++;
        this.results.failed++;
        this.results.errors.push(`Providers: ${command} - ${result.error}`);
      }
      this.results.totalTests++;
    }
  }

  async testCachePerformance() {
    this.log('Testing cache performance...');
    
    // Test cache functionality through repeated queries
    const queries = [
      'Hello',
      'What is JavaScript?',
      'Explain async/await',
      'Hello', // Repeat for cache test
      'What is JavaScript?' // Repeat for cache test
    ];

    let cacheHits = 0;
    let totalQueries = 0;

    for (const query of queries) {
      const result = await this.runCommand(
        `node src/cli.js chat "${query}"`,
        { timeout: 10000 }
      );
      
      totalQueries++;
      
      if (result.success) {
        // Check if response indicates cache hit (would need to parse output)
        if (result.stdout.includes('cache') || result.duration < 500) {
          cacheHits++;
        }
        this.results.featureTests.cache.passed++;
        this.results.passed++;
      } else {
        this.results.featureTests.cache.failed++;
        this.results.failed++;
        this.results.errors.push(`Cache: ${query} - ${result.error}`);
      }
      this.results.totalTests++;
    }

    this.results.performanceMetrics.cacheHitRate = (cacheHits / totalQueries) * 100;
  }

  async testConnectionPooling() {
    this.log('Testing connection pooling...');
    
    // Simulate concurrent requests
    const concurrentTests = Array.from({ length: 10 }, (_, i) => 
      this.runCommand(`node src/cli.js chat "Concurrent test ${i}"`)
    );

    const startTime = Date.now();
    const results = await Promise.allSettled(concurrentTests);
    const endTime = Date.now();

    let successful = 0;
    let failed = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successful++;
        this.results.featureTests.pooling.passed++;
        this.results.passed++;
      } else {
        failed++;
        this.results.featureTests.pooling.failed++;
        this.results.failed++;
        this.results.errors.push(`Pooling: Concurrent test ${index} failed`);
      }
      this.results.totalTests++;
    });

    const totalTime = endTime - startTime;
    this.results.performanceMetrics.throughput = (successful / totalTime) * 1000; // requests per second
  }

  async runSingleIteration(iteration) {
    this.log(`Running iteration ${iteration + 1}/200`);
    
    try {
      await this.testInstallation();
      await this.testCLIFeatures();
      await this.testAPIEndpoints();
      await this.testDashboardFunctionality();
      await this.testProviderIntegration();
      await this.testCachePerformance();
      await this.testConnectionPooling();
    } catch (error) {
      this.results.errors.push(`Iteration ${iteration + 1}: ${error.message}`);
      this.results.failed++;
    }
  }

  async runFullSimulation() {
    this.log('Starting IRIS comprehensive test simulation (200 iterations)...');
    const startTime = Date.now();

    for (let i = 0; i < 200; i++) {
      await this.runSingleIteration(i);
      
      // Progress update every 10 iterations
      if ((i + 1) % 10 === 0) {
        this.log(`Completed ${i + 1}/200 iterations`);
      }
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    this.generateReport(totalTime);
  }

  generateReport(totalTime) {
    const report = {
      summary: {
        totalIterations: 200,
        totalTests: this.results.totalTests,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: ((this.results.passed / this.results.totalTests) * 100).toFixed(2) + '%',
        totalTime: (totalTime / 1000).toFixed(2) + ' seconds'
      },
      performance: this.results.performanceMetrics,
      featureBreakdown: this.results.featureTests,
      errors: this.results.errors.slice(0, 20) // Top 20 errors
    };

    this.log('Test simulation completed. Generating report...');
    console.log('\n' + '='.repeat(80));
    console.log('IRIS TEST SIMULATION REPORT');
    console.log('='.repeat(80));
    console.log(JSON.stringify(report, null, 2));
    console.log('='.repeat(80));

    return report;
  }
}

// Run simulation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const simulation = new IRISTestSimulation();
  simulation.runFullSimulation().catch(console.error);
}

export default IRISTestSimulation;