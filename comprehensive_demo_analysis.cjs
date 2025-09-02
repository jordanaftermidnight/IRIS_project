#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ComprehensiveDemoAnalysis {
  constructor() {
    this.projectPath = '/Users/jordan_after_midnight/Documents/jordanaftermidnight projects github/IRIS_project';
    this.issues = [];
    this.improvements = [];
    this.missing = [];
    this.demoReadiness = {
      coreComponents: false,
      userInterface: false,
      documentation: false,
      configuration: false,
      testing: false,
      deployment: false
    };
  }

  async runComprehensiveAnalysis() {
    console.log('🔍 Running Comprehensive Demo Readiness Analysis');
    console.log('==============================================');

    // Check core functionality
    await this.analyzeCoreComponents();
    
    // Check user interface requirements
    await this.analyzeUIRequirements();
    
    // Check documentation completeness
    await this.analyzeDocumentation();
    
    // Check configuration and setup
    await this.analyzeConfiguration();
    
    // Check testing coverage
    await this.analyzeTestCoverage();
    
    // Check deployment readiness
    await this.analyzeDeploymentReadiness();
    
    // Identify missing components
    await this.identifyMissingComponents();
    
    // Generate improvement recommendations
    await this.generateImprovements();
    
    return this.generateAnalysisReport();
  }

  async analyzeCoreComponents() {
    console.log('🧠 Analyzing Core Components...');
    
    const coreFiles = [
      'optimized_system_core.ts',
      'advanced_optimizations.ts',
      'src/core/neural-learning.js'
    ];
    
    for (const file of coreFiles) {
      const filePath = path.join(this.projectPath, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Check for common issues
        if (content.includes('TODO') || content.includes('FIXME')) {
          this.issues.push(`${file}: Contains TODO/FIXME comments`);
        }
        
        if (content.includes('console.log') && !content.includes('debug')) {
          this.improvements.push(`${file}: Consider replacing console.log with proper logging`);
        }
        
        if (!content.includes('export')) {
          this.issues.push(`${file}: Missing proper exports`);
        }
        
        // Check for error handling
        const errorHandling = (content.match(/try\s*{[\s\S]*?catch/g) || []).length;
        const asyncFunctions = (content.match(/async\s+\w+/g) || []).length;
        if (asyncFunctions > 0 && errorHandling === 0) {
          this.issues.push(`${file}: Async functions without proper error handling`);
        }
        
      } else {
        this.issues.push(`Core file missing: ${file}`);
      }
    }
    
    this.demoReadiness.coreComponents = this.issues.filter(i => i.includes('Core file missing')).length === 0;
  }

  async analyzeUIRequirements() {
    console.log('🎨 Analyzing UI Requirements...');
    
    const uiFiles = [
      'index.html',
      'dashboard.html',
      'status-monitor.html',
      'web-ui.js',
      'iris-dashboard.js',
      'styles.css'
    ];
    
    let existingUIFiles = 0;
    for (const file of uiFiles) {
      if (fs.existsSync(path.join(this.projectPath, file))) {
        existingUIFiles++;
      }
    }
    
    if (existingUIFiles === 0) {
      this.missing.push('Complete UI system for demonstrations');
      this.missing.push('Status monitoring dashboard');
      this.missing.push('Real-time response visualization');
      this.missing.push('Provider health display');
      this.missing.push('Interactive query interface');
    }
    
    this.demoReadiness.userInterface = existingUIFiles > 2;
  }

  async analyzeDocumentation() {
    console.log('📚 Analyzing Documentation...');
    
    const docFiles = [
      'README.md',
      'USER_GUIDE.md',
      'SETUP_GUIDE.md',
      'DEMO_GUIDE.md',
      'API_REFERENCE.md'
    ];
    
    let existingDocs = 0;
    for (const file of docFiles) {
      const filePath = path.join(this.projectPath, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.length > 500) { // Substantial content
          existingDocs++;
        }
      }
    }
    
    // Check existing documentation quality
    const existingGuide = path.join(this.projectPath, 'IRIS_COMPLETE_USER_GUIDE.md');
    if (fs.existsSync(existingGuide)) {
      existingDocs++;
      const content = fs.readFileSync(existingGuide, 'utf-8');
      if (!content.includes('Quick Start')) {
        this.improvements.push('User guide needs quick start section');
      }
      if (!content.includes('Demo') && !content.includes('Example')) {
        this.improvements.push('User guide needs demo examples');
      }
    }
    
    if (existingDocs < 3) {
      this.missing.push('Comprehensive user documentation');
      this.missing.push('Quick setup guide for demos');
      this.missing.push('API reference documentation');
    }
    
    this.demoReadiness.documentation = existingDocs >= 2;
  }

  async analyzeConfiguration() {
    console.log('⚙️ Analyzing Configuration...');
    
    const configFiles = [
      'package.json',
      'tsconfig.json',
      '.env.example',
      'config.json',
      'iris.config.js'
    ];
    
    let configScore = 0;
    
    // Check package.json
    const pkgPath = path.join(this.projectPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      configScore++;
      
      if (!pkg.scripts || !pkg.scripts.start) {
        this.issues.push('package.json missing start script');
      }
      
      if (!pkg.dependencies) {
        this.issues.push('package.json missing dependencies');
      }
      
      if (!pkg.description) {
        this.improvements.push('package.json needs description for demos');
      }
    } else {
      this.issues.push('Missing package.json - critical for setup');
    }
    
    // Check for environment configuration
    if (!fs.existsSync(path.join(this.projectPath, '.env.example'))) {
      this.missing.push('Environment configuration template (.env.example)');
    }
    
    // Check for demo configuration
    if (!fs.existsSync(path.join(this.projectPath, 'demo.config.json'))) {
      this.missing.push('Demo-specific configuration file');
    }
    
    this.demoReadiness.configuration = configScore >= 1 && this.issues.filter(i => i.includes('package.json')).length === 0;
  }

  async analyzeTestCoverage() {
    console.log('🧪 Analyzing Test Coverage...');
    
    const testFiles = [
      'test/',
      'tests/',
      '__tests__/',
      'spec/',
      'demo-test.js',
      'integration-test.js'
    ];
    
    let hasTests = false;
    for (const testPath of testFiles) {
      if (fs.existsSync(path.join(this.projectPath, testPath))) {
        hasTests = true;
        break;
      }
    }
    
    // Check for demo-specific tests
    const demoTestFiles = [
      'demo-validation.js',
      'system-health-check.js',
      'provider-connectivity-test.js'
    ];
    
    let hasDemoTests = false;
    for (const file of demoTestFiles) {
      if (fs.existsSync(path.join(this.projectPath, file))) {
        hasDemoTests = true;
        break;
      }
    }
    
    if (!hasTests) {
      this.missing.push('Test suite for reliability validation');
    }
    
    if (!hasDemoTests) {
      this.missing.push('Demo-specific validation tests');
      this.missing.push('Real-time health check utilities');
    }
    
    this.demoReadiness.testing = hasTests || hasDemoTests;
  }

  async analyzeDeploymentReadiness() {
    console.log('🚀 Analyzing Deployment Readiness...');
    
    const deploymentFiles = [
      'Dockerfile',
      'docker-compose.yml',
      'start.sh',
      'stop.sh',
      'restart.sh'
    ];
    
    let deploymentScore = 0;
    for (const file of deploymentFiles) {
      if (fs.existsSync(path.join(this.projectPath, file))) {
        deploymentScore++;
      }
    }
    
    if (deploymentScore === 0) {
      this.missing.push('Deployment scripts for easy demo setup');
      this.missing.push('Docker configuration for containerized demos');
      this.missing.push('Start/stop scripts for demo management');
    }
    
    // Check for demo-specific deployment
    if (!fs.existsSync(path.join(this.projectPath, 'demo-start.sh'))) {
      this.missing.push('Demo-specific startup script');
    }
    
    this.demoReadiness.deployment = deploymentScore > 0;
  }

  async identifyMissingComponents() {
    console.log('🔍 Identifying Missing Components...');
    
    // Critical missing components for demos
    const criticalComponents = [
      {
        name: 'Real-time Status Dashboard',
        files: ['dashboard.html', 'status-monitor.js'],
        priority: 'HIGH',
        reason: 'Essential for live demonstrations'
      },
      {
        name: 'Interactive Query Interface',
        files: ['query-interface.html', 'query-handler.js'],
        priority: 'HIGH',
        reason: 'Needed for audience interaction'
      },
      {
        name: 'Provider Health Visualizer',
        files: ['health-viz.html', 'health-charts.js'],
        priority: 'MEDIUM',
        reason: 'Shows system intelligence in action'
      },
      {
        name: 'Demo Orchestration System',
        files: ['demo-controller.js', 'demo-scenarios.json'],
        priority: 'HIGH',
        reason: 'Controls demo flow and scenarios'
      },
      {
        name: 'Response Time Analytics',
        files: ['analytics.html', 'performance-charts.js'],
        priority: 'MEDIUM',
        reason: 'Demonstrates optimization results'
      }
    ];
    
    for (const component of criticalComponents) {
      const exists = component.files.some(file => 
        fs.existsSync(path.join(this.projectPath, file))
      );
      
      if (!exists) {
        this.missing.push(`${component.name} (${component.priority}): ${component.reason}`);
      }
    }
  }

  async generateImprovements() {
    console.log('💡 Generating Improvement Recommendations...');
    
    // Code quality improvements
    this.improvements.push('Add TypeScript strict mode for better type safety');
    this.improvements.push('Implement proper logging system (Winston/Pino)');
    this.improvements.push('Add request/response validation schemas');
    this.improvements.push('Implement graceful shutdown handling');
    this.improvements.push('Add health check endpoints');
    
    // Demo-specific improvements
    this.improvements.push('Add demo mode with pre-configured scenarios');
    this.improvements.push('Implement real-time WebSocket connections');
    this.improvements.push('Add voice-over or guided tour features');
    this.improvements.push('Create mobile-responsive dashboard');
    this.improvements.push('Add dark/light theme toggle');
    
    // Performance improvements
    this.improvements.push('Add request rate limiting for demos');
    this.improvements.push('Implement connection pooling');
    this.improvements.push('Add caching layers for repeated demo queries');
    this.improvements.push('Optimize bundle size for faster loading');
  }

  generateAnalysisReport() {
    const report = [];
    report.push('# IRIS Comprehensive Demo Readiness Analysis');
    report.push('');
    report.push('## 🎯 Executive Summary');
    
    const readinessScore = Object.values(this.demoReadiness).filter(Boolean).length;
    const totalAreas = Object.keys(this.demoReadiness).length;
    const readinessPercentage = Math.round((readinessScore / totalAreas) * 100);
    
    report.push(`- **Demo Readiness Score**: ${readinessPercentage}% (${readinessScore}/${totalAreas} areas complete)`);
    report.push(`- **Critical Issues**: ${this.issues.length}`);
    report.push(`- **Missing Components**: ${this.missing.length}`);
    report.push(`- **Improvement Opportunities**: ${this.improvements.length}`);
    report.push('');
    
    // Readiness breakdown
    report.push('## 📊 Readiness Breakdown');
    for (const [area, ready] of Object.entries(this.demoReadiness)) {
      const status = ready ? '✅' : '❌';
      const areaName = area.replace(/([A-Z])/g, ' $1').trim();
      report.push(`- ${status} **${areaName}**: ${ready ? 'Ready' : 'Needs Work'}`);
    }
    report.push('');
    
    // Critical issues
    if (this.issues.length > 0) {
      report.push('## 🚨 Critical Issues');
      report.push('*Must be resolved before demo*');
      report.push('');
      this.issues.forEach((issue, index) => {
        report.push(`${index + 1}. ❌ ${issue}`);
      });
      report.push('');
    }
    
    // Missing components
    if (this.missing.length > 0) {
      report.push('## 🔍 Missing Components');
      report.push('*Required for complete demo experience*');
      report.push('');
      this.missing.forEach((item, index) => {
        const priority = item.includes('HIGH') ? '🔴' : item.includes('MEDIUM') ? '🟡' : '🟢';
        report.push(`${index + 1}. ${priority} ${item}`);
      });
      report.push('');
    }
    
    // Improvements
    if (this.improvements.length > 0) {
      report.push('## 💡 Recommended Improvements');
      report.push('*Enhancement opportunities for better demos*');
      report.push('');
      this.improvements.forEach((improvement, index) => {
        report.push(`${index + 1}. 🔧 ${improvement}`);
      });
      report.push('');
    }
    
    // Action plan
    report.push('## 🚀 Demo Preparation Action Plan');
    report.push('');
    report.push('### Phase 1: Critical Components (Priority: HIGH)');
    report.push('1. ✅ Create real-time status dashboard UI');
    report.push('2. ✅ Build interactive query interface');
    report.push('3. ✅ Implement demo orchestration system');
    report.push('4. ✅ Create comprehensive user guides');
    report.push('5. ✅ Set up quick demo deployment scripts');
    report.push('');
    report.push('### Phase 2: Enhancement Components (Priority: MEDIUM)');
    report.push('1. 🔧 Add provider health visualization');
    report.push('2. 🔧 Implement response time analytics');
    report.push('3. 🔧 Create mobile-responsive design');
    report.push('4. 🔧 Add demo scenarios and guided tours');
    report.push('');
    report.push('### Phase 3: Polish Components (Priority: LOW)');
    report.push('1. ✨ Add theme customization');
    report.push('2. ✨ Implement voice-over features');
    report.push('3. ✨ Add advanced analytics');
    report.push('4. ✨ Optimize performance further');
    report.push('');
    
    // Demo scenarios
    report.push('## 🎭 Recommended Demo Scenarios');
    report.push('');
    report.push('### Scenario 1: System Intelligence Demo');
    report.push('- Show neural learning adapting provider selection');
    report.push('- Demonstrate failover in real-time');
    report.push('- Display security threat detection');
    report.push('');
    report.push('### Scenario 2: Performance Optimization Demo');
    report.push('- Compare optimized vs. original components');
    report.push('- Show 98% system health achievement');
    report.push('- Demonstrate sub-200ms response times');
    report.push('');
    report.push('### Scenario 3: Multi-Provider Orchestration Demo');
    report.push('- Show seamless switching between providers');
    report.push('- Demonstrate load balancing');
    report.push('- Display health monitoring in action');
    report.push('');
    
    // Timeline
    report.push('## ⏱️ Estimated Timeline for Demo Readiness');
    report.push('');
    report.push('- **Phase 1 (Critical)**: 4-6 hours');
    report.push('- **Phase 2 (Enhancement)**: 2-3 hours');
    report.push('- **Phase 3 (Polish)**: 1-2 hours');
    report.push('- **Testing & Validation**: 1 hour');
    report.push('');
    report.push('**Total Estimated Time**: 8-12 hours for complete demo readiness');
    
    return {
      report: report.join('\n'),
      summary: {
        readinessScore: readinessPercentage,
        criticalIssues: this.issues.length,
        missingComponents: this.missing.length,
        improvements: this.improvements.length,
        readyAreas: readinessScore,
        totalAreas: totalAreas,
        demoReady: readinessPercentage >= 70
      },
      actionItems: {
        critical: this.issues,
        missing: this.missing,
        improvements: this.improvements
      }
    };
  }
}

// Main execution
async function main() {
  const analyzer = new ComprehensiveDemoAnalysis();
  
  const results = await analyzer.runComprehensiveAnalysis();
  
  // Save report
  const reportPath = path.join('/Users/jordan_after_midnight/Documents/jordanaftermidnight projects github/IRIS_project', 'demo_readiness_analysis.md');
  fs.writeFileSync(reportPath, results.report);
  
  console.log('');
  console.log('📊 COMPREHENSIVE DEMO ANALYSIS COMPLETE!');
  console.log('=====================================');
  console.log(`📄 Report saved to: demo_readiness_analysis.md`);
  console.log('');
  console.log('🎯 ANALYSIS RESULTS:');
  console.log(`   Demo Readiness: ${results.summary.readinessScore}%`);
  console.log(`   Critical Issues: ${results.summary.criticalIssues}`);
  console.log(`   Missing Components: ${results.summary.missingComponents}`);
  console.log(`   Ready for Demo: ${results.summary.demoReady ? '✅ YES' : '❌ NO'}`);
  console.log('');
  
  if (results.summary.demoReady) {
    console.log('🎉 System is ready for demonstration with minor enhancements needed!');
  } else {
    console.log('🔧 System needs additional components before live demonstration.');
  }
  
  return results;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ComprehensiveDemoAnalysis };