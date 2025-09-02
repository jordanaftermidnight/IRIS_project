#!/usr/bin/env ts-node

// IRIS Redundancy Analysis and Safe Removal System
// Identifies and safely removes redundant code while maintaining system integrity

import * as fs from 'fs';
import * as path from 'path';

interface RedundancyAnalysis {
  file: string;
  issues: RedundancyIssue[];
  safeToRemove: boolean;
  systemImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

interface RedundancyIssue {
  type: 'duplicate_class' | 'duplicate_function' | 'unused_import' | 'dead_code' | 'overlapping_functionality';
  location: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  safeToRemove: boolean;
}

class RedundancyAnalyzer {
  private codebase: Map<string, string> = new Map();
  private analysis: RedundancyAnalysis[] = [];

  constructor(private projectPath: string) {}

  async analyzeCodebase(): Promise<RedundancyAnalysis[]> {
    console.log('🔍 Starting comprehensive redundancy analysis...');
    
    // Load all TypeScript files
    await this.loadCodebase();
    
    // Perform various analysis types
    await this.analyzeClassDuplication();
    await this.analyzeFunctionDuplication();
    await this.analyzeUnusedImports();
    await this.analyzeDeadCode();
    await this.analyzeOverlappingFunctionality();
    
    // Generate integrity impact assessment
    await this.assessSystemIntegrity();
    
    return this.analysis;
  }

  private async loadCodebase(): Promise<void> {
    const files = [
      'multi_provider_integration.ts',
      'comprehensive_test_sandbox.ts', 
      'integration_documentation.ts',
      'optimized_system_core.ts',
      'advanced_optimizations.ts'
    ];

    for (const file of files) {
      const filePath = path.join(this.projectPath, file);
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          this.codebase.set(file, content);
        }
      } catch (error) {
        console.log(`⚠️ Could not read ${file}: ${error}`);
      }
    }

    console.log(`📁 Loaded ${this.codebase.size} files for analysis`);
  }

  private async analyzeClassDuplication(): Promise<void> {
    console.log('🔍 Analyzing class duplication...');
    
    const classes = new Map<string, string[]>();
    
    // Extract class definitions from each file
    for (const [file, content] of this.codebase.entries()) {
      const classMatches = content.match(/export\s+class\s+(\w+)/g) || [];
      
      for (const match of classMatches) {
        const className = match.replace(/export\s+class\s+/, '');
        if (!classes.has(className)) {
          classes.set(className, []);
        }
        classes.get(className)!.push(file);
      }
    }

    // Identify duplications and overlaps
    for (const [className, files] of classes.entries()) {
      if (files.length > 1) {
        // Check for actual duplication vs. inheritance/optimization
        const isDuplication = this.isClassDuplication(className, files);
        
        if (isDuplication.isDuplicate) {
          this.addRedundancyIssue(files[0], {
            type: 'duplicate_class',
            location: `class ${className}`,
            description: `Class ${className} appears to be duplicated across: ${files.join(', ')}`,
            severity: isDuplication.severity,
            safeToRemove: isDuplication.safeToRemove
          });
        }
      }
    }
  }

  private isClassDuplication(className: string, files: string[]): {
    isDuplicate: boolean;
    severity: 'low' | 'medium' | 'high';
    safeToRemove: boolean;
  } {
    // Check for specific optimization patterns
    const isOptimizedVersion = className.includes('Optimized') || className.includes('Advanced');
    const hasOriginalVersion = files.some(f => 
      this.codebase.get(f)?.includes(`class ${className.replace(/^(Optimized|Advanced)/, '')}`)
    );

    if (isOptimizedVersion && hasOriginalVersion) {
      return {
        isDuplicate: false, // This is an optimization, not duplication
        severity: 'low',
        safeToRemove: false
      };
    }

    // Check for true duplicates
    const implementations = files.map(f => this.extractClassImplementation(className, f));
    const similarityScore = this.calculateSimilarity(implementations);

    if (similarityScore > 0.8) {
      return {
        isDuplicate: true,
        severity: 'high',
        safeToRemove: true
      };
    }

    return { isDuplicate: false, severity: 'low', safeToRemove: false };
  }

  private extractClassImplementation(className: string, file: string): string {
    const content = this.codebase.get(file) || '';
    const classStart = content.indexOf(`class ${className}`);
    if (classStart === -1) return '';
    
    let braceCount = 0;
    let inClass = false;
    let implementation = '';
    
    for (let i = classStart; i < content.length; i++) {
      const char = content[i];
      implementation += char;
      
      if (char === '{') {
        braceCount++;
        inClass = true;
      } else if (char === '}') {
        braceCount--;
        if (inClass && braceCount === 0) {
          break;
        }
      }
    }
    
    return implementation;
  }

  private calculateSimilarity(implementations: string[]): number {
    if (implementations.length < 2) return 0;
    
    // Simple similarity calculation based on common lines
    const lines1 = implementations[0].split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const lines2 = implementations[1].split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    const commonLines = lines1.filter(line => lines2.includes(line));
    const totalUniqueLines = new Set([...lines1, ...lines2]).size;
    
    return commonLines.length / totalUniqueLines;
  }

  private async analyzeFunctionDuplication(): Promise<void> {
    console.log('🔍 Analyzing function duplication...');
    
    const functions = new Map<string, { file: string, signature: string }[]>();
    
    for (const [file, content] of this.codebase.entries()) {
      // Match both methods and standalone functions
      const funcMatches = content.match(/(async\s+)?(\w+)\s*\([^)]*\)\s*:\s*[^{]+/g) || [];
      
      for (const match of funcMatches) {
        const funcName = this.extractFunctionName(match);
        if (funcName && funcName.length > 3) { // Skip very short function names
          if (!functions.has(funcName)) {
            functions.set(funcName, []);
          }
          functions.get(funcName)!.push({ file, signature: match.trim() });
        }
      }
    }

    // Identify potential duplicates
    for (const [funcName, occurrences] of functions.entries()) {
      if (occurrences.length > 1) {
        const signatures = occurrences.map(o => o.signature);
        const uniqueSignatures = new Set(signatures);
        
        if (uniqueSignatures.size === 1) {
          // Exact duplicate signatures
          this.addRedundancyIssue(occurrences[0].file, {
            type: 'duplicate_function',
            location: `function ${funcName}`,
            description: `Function ${funcName} has identical signatures in: ${occurrences.map(o => o.file).join(', ')}`,
            severity: 'medium',
            safeToRemove: this.isFunctionSafeToRemove(funcName, occurrences)
          });
        }
      }
    }
  }

  private extractFunctionName(signature: string): string {
    const match = signature.match(/(?:async\s+)?(\w+)\s*\(/);
    return match ? match[1] : '';
  }

  private isFunctionSafeToRemove(funcName: string, occurrences: { file: string, signature: string }[]): boolean {
    // Check if this is part of an optimization pattern
    const hasOptimizedVersion = occurrences.some(o => 
      o.file.includes('optimized') || o.file.includes('advanced')
    );
    
    const hasOriginalVersion = occurrences.some(o => 
      !o.file.includes('optimized') && !o.file.includes('advanced')
    );
    
    // If we have both optimized and original, original may be safe to remove
    return hasOptimizedVersion && hasOriginalVersion;
  }

  private async analyzeUnusedImports(): Promise<void> {
    console.log('🔍 Analyzing unused imports...');
    
    for (const [file, content] of this.codebase.entries()) {
      const imports = this.extractImports(content);
      const unusedImports = imports.filter(imp => !this.isImportUsed(imp, content));
      
      for (const unused of unusedImports) {
        this.addRedundancyIssue(file, {
          type: 'unused_import',
          location: `import statement`,
          description: `Unused import: ${unused}`,
          severity: 'low',
          safeToRemove: true
        });
      }
    }
  }

  private extractImports(content: string): string[] {
    const importMatches = content.match(/import\s+[^;]+;/g) || [];
    return importMatches.map(imp => imp.trim());
  }

  private isImportUsed(importStatement: string, content: string): boolean {
    // Extract imported names
    const match = importStatement.match(/import\s+(?:{([^}]+)}|\*\s+as\s+(\w+)|(\w+))/);
    if (!match) return true; // Assume used if we can't parse
    
    const importedNames = match[1]?.split(',').map(n => n.trim()) || 
                         match[2] ? [match[2]] : 
                         match[3] ? [match[3]] : [];
    
    // Check if any imported name is used in the content
    return importedNames.some(name => 
      content.includes(name) && content.indexOf(name) !== content.indexOf(importStatement)
    );
  }

  private async analyzeDeadCode(): Promise<void> {
    console.log('🔍 Analyzing dead code...');
    
    for (const [file, content] of this.codebase.entries()) {
      // Look for unreachable code patterns
      const deadCodePatterns = [
        /\/\*[\s\S]*?\*\//g, // Block comments that might contain commented code
        /\/\/.*$/gm, // Line comments
        /return\s+[^;]+;\s*\n\s*\w+/g, // Code after return statements
      ];
      
      for (const pattern of deadCodePatterns) {
        const matches = content.match(pattern) || [];
        for (const match of matches) {
          if (this.looksLikeCode(match)) {
            this.addRedundancyIssue(file, {
              type: 'dead_code',
              location: 'commented/unreachable code',
              description: `Potentially dead code found: ${match.substring(0, 50)}...`,
              severity: 'low',
              safeToRemove: true
            });
          }
        }
      }
    }
  }

  private looksLikeCode(text: string): boolean {
    // Simple heuristic to detect if comment contains actual code
    const codeIndicators = ['function', 'class', 'const', 'let', 'var', '{', '}', '=>'];
    const matches = codeIndicators.filter(indicator => text.includes(indicator));
    return matches.length >= 3;
  }

  private async analyzeOverlappingFunctionality(): Promise<void> {
    console.log('🔍 Analyzing overlapping functionality...');
    
    // Check for multiple provider manager implementations
    const providerManagers = [];
    for (const [file, content] of this.codebase.entries()) {
      if (content.includes('ProviderManager') || content.includes('Provider')) {
        providerManagers.push(file);
      }
    }
    
    if (providerManagers.length > 2) {
      this.addRedundancyIssue(providerManagers[0], {
        type: 'overlapping_functionality',
        location: 'Provider management',
        description: `Multiple provider management implementations found in: ${providerManagers.join(', ')}`,
        severity: 'medium',
        safeToRemove: false // Requires careful analysis
      });
    }

    // Check for multiple health monitoring implementations
    const healthMonitors = [];
    for (const [file, content] of this.codebase.entries()) {
      if (content.includes('HealthMonitor')) {
        healthMonitors.push(file);
      }
    }
    
    if (healthMonitors.length > 2) {
      this.addRedundancyIssue(healthMonitors[0], {
        type: 'overlapping_functionality',
        location: 'Health monitoring',
        description: `Multiple health monitoring implementations: ${healthMonitors.join(', ')}`,
        severity: 'medium',
        safeToRemove: false
      });
    }
  }

  private async assessSystemIntegrity(): Promise<void> {
    console.log('🔍 Assessing system integrity impact...');
    
    for (const analysis of this.analysis) {
      const criticalIssues = analysis.issues.filter(i => i.severity === 'high');
      const mediumIssues = analysis.issues.filter(i => i.severity === 'medium');
      const safeToRemoveCount = analysis.issues.filter(i => i.safeToRemove).length;
      
      if (criticalIssues.length > 0) {
        analysis.systemImpact = 'high';
        analysis.safeToRemove = false;
        analysis.recommendations.push('Manual review required before any changes');
      } else if (mediumIssues.length > 2) {
        analysis.systemImpact = 'medium';
        analysis.safeToRemove = safeToRemoveCount > mediumIssues.length / 2;
        analysis.recommendations.push('Careful review recommended');
      } else {
        analysis.systemImpact = safeToRemoveCount === analysis.issues.length ? 'low' : 'medium';
        analysis.safeToRemove = safeToRemoveCount > 0;
        analysis.recommendations.push('Safe to proceed with automated cleanup');
      }
      
      if (analysis.safeToRemove && analysis.issues.length > 0) {
        analysis.recommendations.push(`Can safely remove ${safeToRemoveCount} redundant items`);
      }
    }
  }

  private addRedundancyIssue(file: string, issue: RedundancyIssue): void {
    let analysis = this.analysis.find(a => a.file === file);
    if (!analysis) {
      analysis = {
        file,
        issues: [],
        safeToRemove: false,
        systemImpact: 'none',
        recommendations: []
      };
      this.analysis.push(analysis);
    }
    
    analysis.issues.push(issue);
  }

  generateReport(): string {
    const report = ['# IRIS Redundancy Analysis Report', '', '## Executive Summary'];
    
    const totalIssues = this.analysis.reduce((sum, a) => sum + a.issues.length, 0);
    const safeToRemove = this.analysis.reduce((sum, a) => sum + a.issues.filter(i => i.safeToRemove).length, 0);
    const criticalFiles = this.analysis.filter(a => a.systemImpact === 'high').length;
    
    report.push(`- **Total redundancy issues found**: ${totalIssues}`);
    report.push(`- **Safe to remove**: ${safeToRemove} (${((safeToRemove/totalIssues)*100).toFixed(1)}%)`);
    report.push(`- **Files requiring manual review**: ${criticalFiles}`);
    report.push(`- **Overall system integrity**: ${criticalFiles === 0 ? '✅ STABLE' : '⚠️ REQUIRES ATTENTION'}`);
    report.push('');
    
    report.push('## Detailed Analysis by File');
    report.push('');
    
    for (const analysis of this.analysis) {
      report.push(`### ${analysis.file}`);
      report.push(`- **System Impact**: ${analysis.systemImpact.toUpperCase()}`);
      report.push(`- **Safe to Remove**: ${analysis.safeToRemove ? '✅ YES' : '❌ NO'}`);
      report.push(`- **Issues Found**: ${analysis.issues.length}`);
      report.push('');
      
      if (analysis.issues.length > 0) {
        report.push('#### Issues:');
        for (const issue of analysis.issues) {
          const status = issue.safeToRemove ? '✅' : '⚠️';
          report.push(`- ${status} **${issue.type.replace('_', ' ').toUpperCase()}** (${issue.severity}): ${issue.description}`);
        }
        report.push('');
      }
      
      if (analysis.recommendations.length > 0) {
        report.push('#### Recommendations:');
        for (const rec of analysis.recommendations) {
          report.push(`- ${rec}`);
        }
        report.push('');
      }
    }
    
    report.push('## Safe Cleanup Actions');
    report.push('');
    
    const safeActions = [];
    for (const analysis of this.analysis) {
      for (const issue of analysis.issues) {
        if (issue.safeToRemove) {
          safeActions.push(`- Remove ${issue.type.replace('_', ' ')} in ${analysis.file}: ${issue.location}`);
        }
      }
    }
    
    if (safeActions.length > 0) {
      report.push('The following items can be safely removed:');
      report.push(...safeActions);
    } else {
      report.push('No items identified as safe for automatic removal.');
    }
    
    return report.join('\n');
  }
}

// Main execution
async function main() {
  const projectPath = '/Users/jordan_after_midnight/Documents/jordanaftermidnight projects github/IRIS_project';
  const analyzer = new RedundancyAnalyzer(projectPath);
  
  const results = await analyzer.analyzeCodebase();
  const report = analyzer.generateReport();
  
  // Write report to file
  const reportPath = path.join(projectPath, 'redundancy_analysis_report.md');
  fs.writeFileSync(reportPath, report);
  
  console.log('📊 Redundancy Analysis Complete!');
  console.log(`📄 Report saved to: ${reportPath}`);
  console.log('');
  console.log('=== SUMMARY ===');
  
  const totalIssues = results.reduce((sum, a) => sum + a.issues.length, 0);
  const safeToRemove = results.reduce((sum, a) => sum + a.issues.filter(i => i.safeToRemove).length, 0);
  
  console.log(`Total Issues: ${totalIssues}`);
  console.log(`Safe to Remove: ${safeToRemove}`);
  console.log(`System Integrity: ${results.every(r => r.systemImpact !== 'high') ? '✅ STABLE' : '⚠️ REQUIRES REVIEW'}`);
  
  return results;
}

if (require.main === module) {
  main().catch(console.error);
}

export { RedundancyAnalyzer, main as analyzeRedundancy };