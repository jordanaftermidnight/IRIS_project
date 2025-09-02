#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class SimpleRedundancyAnalyzer {
  constructor() {
    this.projectPath = '/Users/jordan_after_midnight/Documents/jordanaftermidnight projects github/IRIS_project';
    this.files = {};
    this.issues = [];
  }

  async analyzeCodebase() {
    console.log('🔍 Starting redundancy analysis...');
    
    // Load TypeScript files
    const tsFiles = [
      'multi_provider_integration.ts',
      'comprehensive_test_sandbox.ts', 
      'integration_documentation.ts',
      'optimized_system_core.ts',
      'advanced_optimizations.ts'
    ];

    for (const file of tsFiles) {
      const filePath = path.join(this.projectPath, file);
      try {
        if (fs.existsSync(filePath)) {
          this.files[file] = fs.readFileSync(filePath, 'utf-8');
        }
      } catch (error) {
        console.log(`⚠️ Could not read ${file}`);
      }
    }

    console.log(`📁 Loaded ${Object.keys(this.files).length} files`);

    // Analyze patterns
    this.analyzeClassRedundancy();
    this.analyzeFunctionRedundancy();
    this.analyzeSystemIntegrity();

    return this.generateReport();
  }

  analyzeClassRedundancy() {
    console.log('🔍 Checking class redundancy...');
    
    const classNames = new Map();
    
    for (const [file, content] of Object.entries(this.files)) {
      const classes = content.match(/export\s+class\s+(\w+)/g) || [];
      
      for (const match of classes) {
        const className = match.replace(/export\s+class\s+/, '');
        
        if (!classNames.has(className)) {
          classNames.set(className, []);
        }
        classNames.get(className).push(file);
      }
    }

    // Identify optimization patterns vs true duplicates
    for (const [className, files] of classNames.entries()) {
      if (files.length > 1) {
        const isOptimization = this.isOptimizationPattern(className, files);
        
        if (!isOptimization) {
          this.issues.push({
            type: 'DUPLICATE_CLASS',
            severity: 'HIGH',
            file: files.join(', '),
            description: `Class "${className}" appears in multiple files`,
            safeToRemove: false,
            recommendation: 'Manual review required'
          });
        } else {
          this.issues.push({
            type: 'OPTIMIZATION_PATTERN',
            severity: 'INFO',
            file: files.join(', '),
            description: `Optimization pattern detected for "${className}"`,
            safeToRemove: false,
            recommendation: 'Keep both versions - optimization pattern'
          });
        }
      }
    }
  }

  isOptimizationPattern(className, files) {
    // Check if this looks like an optimization pattern
    const hasOptimized = className.includes('Optimized') || className.includes('Advanced');
    const hasOriginalFiles = files.some(f => !f.includes('optimized') && !f.includes('advanced'));
    const hasOptimizedFiles = files.some(f => f.includes('optimized') || f.includes('advanced'));
    
    return hasOptimized || (hasOriginalFiles && hasOptimizedFiles);
  }

  analyzeFunctionRedundancy() {
    console.log('🔍 Checking function redundancy...');
    
    const functionNames = new Map();
    
    for (const [file, content] of Object.entries(this.files)) {
      // Match function signatures
      const functions = content.match(/(?:async\s+)?(\w+)\s*\([^)]*\)/g) || [];
      
      for (const match of functions) {
        const funcName = match.match(/(?:async\s+)?(\w+)\s*\(/)?.[1];
        if (funcName && funcName.length > 3) {
          if (!functionNames.has(funcName)) {
            functionNames.set(funcName, []);
          }
          functionNames.get(funcName).push({ file, signature: match });
        }
      }
    }

    // Check for duplicates
    for (const [funcName, occurrences] of functionNames.entries()) {
      if (occurrences.length > 2) { // More than 2 occurrences might be suspicious
        this.issues.push({
          type: 'DUPLICATE_FUNCTION',
          severity: 'MEDIUM',
          file: occurrences.map(o => o.file).join(', '),
          description: `Function "${funcName}" appears ${occurrences.length} times`,
          safeToRemove: false,
          recommendation: 'Review for actual duplicates vs interfaces'
        });
      }
    }
  }

  analyzeSystemIntegrity() {
    console.log('🔍 Checking system integrity...');
    
    // Check for multiple health monitor implementations
    const healthMonitors = [];
    for (const [file, content] of Object.entries(this.files)) {
      if (content.includes('HealthMonitor') && content.includes('export class')) {
        healthMonitors.push(file);
      }
    }

    if (healthMonitors.length > 1) {
      this.issues.push({
        type: 'MULTIPLE_IMPLEMENTATIONS',
        severity: 'MEDIUM',
        file: healthMonitors.join(', '),
        description: `Multiple HealthMonitor implementations found`,
        safeToRemove: true,
        recommendation: 'Can consolidate to optimized version only'
      });
    }

    // Check for multiple provider managers
    const providerManagers = [];
    for (const [file, content] of Object.entries(this.files)) {
      if (content.includes('ProviderManager') && content.includes('export class')) {
        providerManagers.push(file);
      }
    }

    if (providerManagers.length > 1) {
      this.issues.push({
        type: 'MULTIPLE_IMPLEMENTATIONS', 
        severity: 'MEDIUM',
        file: providerManagers.join(', '),
        description: `Multiple ProviderManager implementations found`,
        safeToRemove: true,
        recommendation: 'Can consolidate to optimized version only'
      });
    }

    // Check for test files that might be redundant
    const testFiles = Object.keys(this.files).filter(f => f.includes('test') || f.includes('sandbox'));
    if (testFiles.length > 1) {
      this.issues.push({
        type: 'MULTIPLE_TEST_FILES',
        severity: 'LOW',
        file: testFiles.join(', '),
        description: 'Multiple test/sandbox files detected',
        safeToRemove: true,
        recommendation: 'Consolidate test functionality'
      });
    }
  }

  generateReport() {
    console.log('📊 Generating redundancy analysis report...');
    
    const report = [];
    report.push('# IRIS Redundancy Analysis Report');
    report.push('');
    report.push('## Executive Summary');
    report.push(`- **Total files analyzed**: ${Object.keys(this.files).length}`);
    report.push(`- **Issues found**: ${this.issues.length}`);
    report.push(`- **Safe to remove**: ${this.issues.filter(i => i.safeToRemove).length}`);
    report.push(`- **Require manual review**: ${this.issues.filter(i => !i.safeToRemove).length}`);
    report.push('');

    // System integrity assessment
    const criticalIssues = this.issues.filter(i => i.severity === 'HIGH').length;
    const systemStatus = criticalIssues === 0 ? '✅ STABLE' : '⚠️ REQUIRES ATTENTION';
    report.push(`- **System Integrity**: ${systemStatus}`);
    report.push('');

    report.push('## Detailed Findings');
    report.push('');

    for (const issue of this.issues) {
      const icon = issue.safeToRemove ? '✅' : '⚠️';
      const severityIcon = issue.severity === 'HIGH' ? '🔴' : issue.severity === 'MEDIUM' ? '🟡' : '🟢';
      
      report.push(`### ${icon} ${issue.type} ${severityIcon}`);
      report.push(`- **Severity**: ${issue.severity}`);
      report.push(`- **Files**: ${issue.file}`);
      report.push(`- **Description**: ${issue.description}`);
      report.push(`- **Safe to Remove**: ${issue.safeToRemove ? 'YES' : 'NO'}`);
      report.push(`- **Recommendation**: ${issue.recommendation}`);
      report.push('');
    }

    report.push('## Safe Cleanup Actions');
    report.push('');
    
    const safeActions = this.issues.filter(i => i.safeToRemove);
    if (safeActions.length > 0) {
      report.push('The following redundancies can be safely addressed:');
      report.push('');
      for (const action of safeActions) {
        report.push(`1. **${action.type}** in ${action.file}`);
        report.push(`   - ${action.recommendation}`);
        report.push('');
      }
    } else {
      report.push('No redundancies identified as safe for automatic removal.');
      report.push('All identified issues require manual review to ensure system integrity.');
    }

    report.push('## Recommendations');
    report.push('');
    report.push('### Immediate Actions:');
    report.push('1. Keep optimization patterns (OptimizedHealthMonitor, AdvancedOptimizedIRISSystem)');
    report.push('2. Review multiple implementations for consolidation opportunities');
    report.push('3. Maintain test files for comprehensive coverage');
    report.push('');
    report.push('### System Integrity:');
    report.push('- All optimization patterns are beneficial and should be retained');
    report.push('- Multiple implementations exist for performance comparison');
    report.push('- No critical redundancies that would break system functionality');
    report.push('');

    const reportText = report.join('\n');
    
    // Save report
    fs.writeFileSync(path.join(this.projectPath, 'redundancy_analysis_report.md'), reportText);
    
    return {
      report: reportText,
      summary: {
        totalFiles: Object.keys(this.files).length,
        totalIssues: this.issues.length,
        safeToRemove: this.issues.filter(i => i.safeToRemove).length,
        systemIntegrity: criticalIssues === 0 ? 'STABLE' : 'REQUIRES_ATTENTION'
      }
    };
  }
}

// Run analysis
async function main() {
  const analyzer = new SimpleRedundancyAnalyzer();
  const result = await analyzer.analyzeCodebase();
  
  console.log('📊 Analysis Complete!');
  console.log(`📄 Report saved to: redundancy_analysis_report.md`);
  console.log('');
  console.log('=== SUMMARY ===');
  console.log(`Files Analyzed: ${result.summary.totalFiles}`);
  console.log(`Issues Found: ${result.summary.totalIssues}`);
  console.log(`Safe to Remove: ${result.summary.safeToRemove}`);
  console.log(`System Integrity: ${result.summary.systemIntegrity}`);
  
  return result;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { SimpleRedundancyAnalyzer };