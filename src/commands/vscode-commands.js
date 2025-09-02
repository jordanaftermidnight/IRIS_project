#!/usr/bin/env node

/**
 * IDE Integration Commands for Iris
 * Professional development commands with intelligent code analysis
 * 
 * @author Jordan After Midnight
 * @version 0.9.0
 */

import fs from 'fs';
import path from 'path';
import IDEFeatures from '../integrations/vscode-features.js';

export class IDECommands {
  constructor(multiAI) {
    this.ai = multiAI;
    this.ide = new IDEFeatures(multiAI);
  }

  /**
   * Code completion command: iris complete <file> <line> <column>
   */
  async complete(filePath, line, column, options = {}) {
    try {
      console.log('🔍 Analyzing code context...');
      
      const lineNum = parseInt(line) - 1; // Convert to 0-based
      const colNum = parseInt(column) - 1;
      
      const suggestions = await this.ide.getInlineSuggestions(filePath, lineNum, colNum);
      
      console.log('\n✨ Code Completion Suggestions:');
      console.log('================================');
      
      suggestions.forEach((suggestion, index) => {
        console.log(`${index + 1}. ${suggestion}`);
      });
      
      if (suggestions.length === 0) {
        console.log('No specific suggestions available for this context.');
      }
      
      return suggestions;
    } catch (error) {
      console.error('❌ Completion failed:', error.message);
      throw error;
    }
  }

  /**
   * Explain code command: iris explain <file> [startLine] [endLine]
   */
  async explain(filePath, startLine = null, endLine = null, options = {}) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      console.log('🔍 Analyzing code...');
      
      let explanation;
      if (startLine && endLine) {
        explanation = await this.ide.explainCode(filePath, parseInt(startLine), parseInt(endLine));
      } else {
        // Explain entire file or significant portions
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const totalLines = fileContent.split('\n').length;
        const linesToExplain = Math.min(50, totalLines); // Explain first 50 lines max
        explanation = await this.ide.explainCode(filePath, 1, linesToExplain);
      }
      
      console.log('\n📖 Code Explanation:');
      console.log('====================');
      console.log(explanation);
      
      return explanation;
    } catch (error) {
      console.error('❌ Explanation failed:', error.message);
      throw error;
    }
  }

  /**
   * Refactor code command: iris refactor <file> [startLine] [endLine] [type]
   */
  async refactor(filePath, startLine, endLine, refactorType = 'general', options = {}) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      console.log('🔧 Analyzing code for refactoring opportunities...');
      
      const suggestions = await this.ide.suggestRefactoring(
        filePath, 
        parseInt(startLine), 
        parseInt(endLine), 
        refactorType
      );
      
      console.log('\n🛠️  Refactoring Suggestions:');
      console.log('============================');
      console.log(suggestions);
      
      return suggestions;
    } catch (error) {
      console.error('❌ Refactoring analysis failed:', error.message);
      throw error;
    }
  }

  /**
   * Debug command: iris debug <file> [errorMessage] [stackTrace]
   */
  async debug(filePath, errorMessage = '', stackTraceFile = '', options = {}) {
    try {
      console.log('🐛 Analyzing debugging context...');
      
      let stackTrace = '';
      if (stackTraceFile && fs.existsSync(stackTraceFile)) {
        stackTrace = fs.readFileSync(stackTraceFile, 'utf8');
      } else if (stackTraceFile) {
        stackTrace = stackTraceFile; // Treat as direct stack trace text
      }
      
      const analysis = await this.ide.debugCode(filePath, errorMessage, stackTrace);
      
      console.log('\n🔍 Debug Analysis:');
      console.log('==================');
      console.log(analysis);
      
      return analysis;
    } catch (error) {
      console.error('❌ Debug analysis failed:', error.message);
      throw error;
    }
  }

  /**
   * Git commit message generation: iris commit
   */
  async commit(options = {}) {
    try {
      console.log('📝 Analyzing staged changes...');
      
      const suggestions = await this.ide.generateCommitMessage();
      
      console.log('\n💬 Commit Message Suggestions:');
      console.log('===============================');
      
      suggestions.forEach((suggestion, index) => {
        console.log(`${index + 1}. ${suggestion}`);
      });
      
      if (options.interactive) {
        return await this.interactiveCommitSelection(suggestions);
      }
      
      return suggestions;
    } catch (error) {
      console.error('❌ Commit message generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Workspace analysis: iris workspace
   */
  async workspace(options = {}) {
    try {
      console.log('🏗️  Analyzing workspace...');
      
      const context = await this.ide.getWorkspaceContext();
      
      console.log('\n🏢 Workspace Analysis:');
      console.log('======================');
      console.log(`📁 Name: ${context.workspace.name}`);
      console.log(`📍 Root: ${context.workspace.root}`);
      console.log(`🔧 Type: ${context.project.type} project`);
      
      if (context.project.name && context.project.name !== 'unknown') {
        console.log(`📦 Package: ${context.project.name} v${context.project.version || '?'}`);
      }
      
      if (context.workspace.hasGit) {
        console.log(`🌿 Git: ${context.git.currentBranch} branch`);
        if (context.git.hasUncommittedChanges) {
          console.log('⚠️  Has uncommitted changes');
        }
      }
      
      console.log(`📊 Structure: ${context.structure.totalFiles} files`);
      console.log(`🔧 Extensions: ${context.structure.extensions.slice(0, 10).join(', ')}`);
      
      if (context.dependencies && context.dependencies.main && context.dependencies.main.length > 0) {
        console.log(`📦 Dependencies: ${context.dependencies.main.slice(0, 5).join(', ')}${context.dependencies.main.length > 5 ? '...' : ''}`);
      }
      
      if (context.recentFiles.length > 0) {
        console.log('\n📝 Recently Modified:');
        context.recentFiles.slice(0, 5).forEach(file => {
          const timeAgo = this.getTimeAgo(new Date(file.modified));
          console.log(`   ${file.path} (${timeAgo})`);
        });
      }
      
      return context;
    } catch (error) {
      console.error('❌ Workspace analysis failed:', error.message);
      throw error;
    }
  }

  /**
   * File context analysis: iris context <file>
   */
  async context(filePath, options = {}) {
    try {
      console.log('🔍 Analyzing file context...');
      
      const context = await this.ide.getFileContext(filePath);
      
      console.log('\n📄 File Context Analysis:');
      console.log('=========================');
      console.log(`📁 File: ${context.file.path}`);
      console.log(`🔧 Language: ${context.file.language}`);
      console.log(`📏 Size: ${context.file.lines} lines (${this.formatBytes(context.file.size)})`);
      
      if (context.git.isTracked) {
        console.log(`🌿 Git: ${context.git.status} (${context.git.lastCommit})`);
      }
      
      if (context.codeAnalysis) {
        console.log(`🧮 Complexity: ${context.codeAnalysis.complexity}/20`);
        
        if (context.codeAnalysis.functions.length > 0) {
          console.log(`⚙️  Functions: ${context.codeAnalysis.functions.slice(0, 3).map(f => f.name).join(', ')}${context.codeAnalysis.functions.length > 3 ? '...' : ''}`);
        }
        
        if (context.codeAnalysis.classes.length > 0) {
          console.log(`🏗️  Classes: ${context.codeAnalysis.classes.map(c => c.name).join(', ')}`);
        }
        
        if (context.codeAnalysis.imports.length > 0) {
          console.log('📦 Imports:');
          context.codeAnalysis.imports.slice(0, 3).forEach(imp => {
            console.log(`   ${imp}`);
          });
        }
      }
      
      return context;
    } catch (error) {
      console.error('❌ Context analysis failed:', error.message);
      throw error;
    }
  }

  /**
   * Smart code review: iris review <file> [startLine] [endLine]
   */
  async review(filePath, startLine = null, endLine = null, options = {}) {
    try {
      console.log('👀 Conducting code review...');
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split('\n');
      
      let codeSection;
      if (startLine && endLine) {
        codeSection = lines.slice(parseInt(startLine) - 1, parseInt(endLine)).join('\n');
      } else {
        codeSection = fileContent;
      }
      
      const context = await this.ide.getFileContext(filePath);
      
      const prompt = `
## Code Review Request

**File**: ${context.file.path}
**Language**: ${context.file.language}
**Project**: ${context.project.type}

**Code to Review**:
\`\`\`${context.file.language}
${codeSection}
\`\`\`

Conduct a thorough code review focusing on:
1. **Code Quality**: Best practices, readability, maintainability
2. **Performance**: Potential optimizations and bottlenecks
3. **Security**: Vulnerabilities and security considerations
4. **Bugs**: Potential issues or edge cases
5. **Architecture**: Design patterns and structure
6. **Testing**: Testability and test coverage suggestions

Provide specific, actionable feedback with examples where possible.
Rate each category (1-5) and provide an overall assessment.
`;

      const review = await this.ai.chat(prompt, {
        task: 'code',
        maxTokens: 1200,
        context: 'code_review'
      });
      
      console.log('\n👨‍💻 Code Review Results:');
      console.log('========================');
      console.log(review);
      
      return review;
    } catch (error) {
      console.error('❌ Code review failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate tests: iris test <file> [function]
   */
  async generateTests(filePath, functionName = '', options = {}) {
    try {
      console.log('🧪 Generating test suggestions...');
      
      const context = await this.ide.getFileContext(filePath);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      let codeToTest = fileContent;
      if (functionName) {
        // Try to extract specific function
        const lines = fileContent.split('\n');
        const functionStart = lines.findIndex(line => line.includes(`function ${functionName}`) || line.includes(`${functionName} =`));
        if (functionStart !== -1) {
          // Extract function (simple heuristic)
          const functionLines = [];
          let braceCount = 0;
          let started = false;
          
          for (let i = functionStart; i < lines.length; i++) {
            functionLines.push(lines[i]);
            if (lines[i].includes('{')) {
              braceCount++;
              started = true;
            }
            if (lines[i].includes('}')) {
              braceCount--;
            }
            if (started && braceCount === 0) {
              break;
            }
          }
          codeToTest = functionLines.join('\n');
        }
      }
      
      const prompt = `
## Test Generation Request

**File**: ${context.file.path}
**Language**: ${context.file.language}
**Function**: ${functionName || 'entire file'}

**Code to Test**:
\`\`\`${context.file.language}
${codeToTest}
\`\`\`

Generate comprehensive test cases:
1. **Unit Tests**: Test individual functions/methods
2. **Edge Cases**: Boundary conditions and error scenarios
3. **Integration Tests**: Test component interactions
4. **Mocking**: Mock external dependencies

Provide tests in the appropriate testing framework for ${context.file.language}:
- JavaScript/TypeScript: Jest, Mocha, or Vitest
- Python: pytest or unittest
- Java: JUnit
- etc.

Include setup, teardown, and assertion examples.
`;

      const tests = await this.ai.chat(prompt, {
        task: 'code',
        maxTokens: 1500,
        context: 'test_generation'
      });
      
      console.log('\n🧪 Generated Test Cases:');
      console.log('=======================');
      console.log(tests);
      
      return tests;
    } catch (error) {
      console.error('❌ Test generation failed:', error.message);
      throw error;
    }
  }

  // Helper methods
  async interactiveCommitSelection(suggestions) {
    // In a real implementation, this would use a proper CLI library for interaction
    console.log('\nSelect a commit message (1-3) or press Enter for the first one:');
    // For now, return the first suggestion
    return suggestions[0];
  }

  getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return 'just now';
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

export default IDECommands;