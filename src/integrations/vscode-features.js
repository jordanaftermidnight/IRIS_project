#!/usr/bin/env node

/**
 * IDE Integration Features for Iris
 * Professional development tools with intelligent code analysis and workspace awareness
 * 
 * @author Jordan After Midnight
 * @version 0.9.0
 */

import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';

// Fallback glob implementation using fs
function simpleGlob(pattern, options = {}) {
  try {
    const { cwd = process.cwd(), ignore = [] } = options;
    
    // Simple recursive file listing
    function getAllFiles(dir, baseDir = dir) {
      const files = [];
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const relativePath = path.relative(baseDir, fullPath);
          
          // Skip ignored patterns
          if (ignore.some(pattern => relativePath.includes(pattern))) {
            continue;
          }
          
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            files.push(...getAllFiles(fullPath, baseDir));
          } else {
            files.push(relativePath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
      
      return files;
    }
    
    const allFiles = getAllFiles(cwd);
    
    // Simple pattern matching
    if (pattern === '**/*') {
      return allFiles;
    }
    
    if (pattern.includes('*.{')) {
      // Handle patterns like *.{js,ts,jsx,tsx}
      const extensions = pattern.match(/\{([^}]+)\}/)?.[1]?.split(',') || [];
      return allFiles.filter(file => {
        const ext = path.extname(file).substring(1);
        return extensions.includes(ext);
      });
    }
    
    if (pattern.startsWith('*.')) {
      const ext = pattern.substring(2);
      return allFiles.filter(file => file.endsWith(ext));
    }
    
    return allFiles;
  } catch (error) {
    return [];
  }
}

export class IDEFeatures {
  constructor(multiAI) {
    this.ai = multiAI;
    this.workspaceRoot = this.findWorkspaceRoot();
    this.projectContext = new Map();
    this.fileWatchers = new Map();
    this.gitIntegration = new GitIntegration();
    this.codeAnalyzer = new CodeAnalyzer();
    this.debugAssistant = new DebugAssistant(multiAI);
    this.initialized = false;
  }

  /**
   * Find workspace root using common project indicators
   */
  findWorkspaceRoot() {
    let currentDir = process.cwd();
    
    while (currentDir !== path.dirname(currentDir)) {
      // Check for common project indicators
      const indicators = [
        'package.json', 'package-lock.json', 'yarn.lock',
        '.git', '.gitignore',
        'Cargo.toml', 'requirements.txt', 'pom.xml',
        '.vscode', 'tsconfig.json', 'jsconfig.json'
      ];
      
      for (const indicator of indicators) {
        if (fs.existsSync(path.join(currentDir, indicator))) {
          return currentDir;
        }
      }
      
      currentDir = path.dirname(currentDir);
    }
    
    return process.cwd();
  }

  /**
   * Get intelligent context about current file/project
   */
  async getFileContext(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
      return this.getWorkspaceContext();
    }

    const relativePath = path.relative(this.workspaceRoot, filePath);
    const fileExtension = path.extname(filePath);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Analyze file context
    const context = {
      file: {
        path: relativePath,
        extension: fileExtension,
        language: this.detectLanguage(fileExtension),
        size: fileContent.length,
        lines: fileContent.split('\n').length
      },
      project: await this.getProjectMetadata(),
      dependencies: await this.getProjectDependencies(),
      git: await this.gitIntegration.getFileGitContext(filePath),
      codeAnalysis: this.codeAnalyzer.analyzeFile(fileContent, fileExtension)
    };

    return context;
  }

  /**
   * Get comprehensive workspace context and project metadata
   */
  async getWorkspaceContext() {
    const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
    const gitPath = path.join(this.workspaceRoot, '.git');
    
    const context = {
      workspace: {
        root: this.workspaceRoot,
        name: path.basename(this.workspaceRoot),
        hasGit: fs.existsSync(gitPath),
        hasPackageJson: fs.existsSync(packageJsonPath)
      },
      project: await this.getProjectMetadata(),
      structure: await this.getProjectStructure(),
      git: await this.gitIntegration.getRepoContext(),
      recentFiles: await this.getRecentlyModifiedFiles()
    };

    return context;
  }

  /**
   * Provide intelligent code suggestions with context awareness
   */
  async getInlineSuggestions(filePath, cursorLine, cursorColumn, context = '') {
    const fileContext = await this.getFileContext(filePath);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n');
    
    // Get surrounding context
    const contextLines = Math.min(5, cursorLine);
    const beforeContext = lines.slice(Math.max(0, cursorLine - contextLines), cursorLine).join('\n');
    const currentLine = lines[cursorLine] || '';
    const afterContext = lines.slice(cursorLine + 1, cursorLine + contextLines + 1).join('\n');

    const prompt = `
## Code Completion Request

**File**: ${fileContext.file.path}
**Language**: ${fileContext.file.language}
**Position**: Line ${cursorLine + 1}, Column ${cursorColumn + 1}

**Context Before**:
\`\`\`${fileContext.file.language}
${beforeContext}
\`\`\`

**Current Line**: \`${currentLine}\`
**Cursor Position**: ${cursorColumn} (after "${currentLine.substring(0, cursorColumn)}")

**Context After**:
\`\`\`${fileContext.file.language}
${afterContext}
\`\`\`

**Project Context**: ${fileContext.project.type} project using ${fileContext.dependencies.main?.join(', ') || 'unknown dependencies'}

Please provide intelligent code completion suggestions for the cursor position. Consider:
1. Current syntax context
2. Variable/function scope
3. Project dependencies and imports
4. Language-specific patterns
5. Best practices for this language

Provide completions in this format:
1. **Primary suggestion**: [main completion]
2. **Alternative 1**: [alternative]
3. **Alternative 2**: [alternative]

Keep suggestions concise and contextually relevant.
`;

    const response = await this.ai.chat(prompt, {
      task: 'code',
      maxTokens: 500,
      context: 'inline_suggestions'
    });

    return this.parseCompletionResponse(response);
  }

  /**
   * Generate intelligent commit messages from staged changes
   */
  async generateCommitMessage() {
    const stagedChanges = await this.gitIntegration.getStagedChanges();
    const recentCommits = await this.gitIntegration.getRecentCommits(5);
    
    if (!stagedChanges || stagedChanges.length === 0) {
      throw new Error('No staged changes found. Stage your changes first with: git add <files>');
    }

    const prompt = `
## Generate Commit Message

**Staged Changes**:
${stagedChanges.map(change => `- ${change.status}: ${change.file}`).join('\n')}

**Code Diff**:
\`\`\`diff
${await this.gitIntegration.getStagedDiff()}
\`\`\`

**Recent Commits** (for style reference):
${recentCommits.map(commit => `- ${commit.hash.substring(0, 7)}: ${commit.message}`).join('\n')}

Generate a concise, descriptive commit message following conventional commit format:
- Use prefixes: feat:, fix:, docs:, style:, refactor:, test:, chore:
- Keep first line under 50 characters
- Focus on the "what" and "why", not the "how"
- Be specific about the changes made

Provide 3 options:
1. **Primary**: [main suggestion]
2. **Alternative**: [different angle]
3. **Detailed**: [with body if needed]
`;

    try {
      const response = await this.ai.chat(prompt, {
        task: 'code',
        maxTokens: 300,
        context: 'git_commit'
      });

      return this.parseCommitSuggestions(response);
    } catch (error) {
      // Fallback to basic commit message generation when no AI providers available
      console.log('⚠️  AI providers unavailable, generating basic commit message...');
      return this.generateBasicCommitMessage(stagedChanges);
    }
  }

  /**
   * Generate basic commit message fallback when AI providers unavailable
   */
  generateBasicCommitMessage(stagedChanges) {
    const addedFiles = stagedChanges.filter(c => c.status === 'A').map(c => c.file);
    const modifiedFiles = stagedChanges.filter(c => c.status === 'M').map(c => c.file);
    const deletedFiles = stagedChanges.filter(c => c.status === 'D').map(c => c.file);
    
    let commitType = 'chore';
    let description = 'update files';
    
    // Determine commit type and description based on file changes
    if (addedFiles.length > 0) {
      commitType = 'feat';
      if (addedFiles.length === 1) {
        description = `add ${path.basename(addedFiles[0])}`;
      } else {
        description = `add ${addedFiles.length} new files`;
      }
    } else if (modifiedFiles.length > 0) {
      // Check file types for better categorization
      const hasCode = modifiedFiles.some(f => /\.(js|ts|py|java|cpp|c|go|rs)$/.test(f));
      const hasDocs = modifiedFiles.some(f => /\.(md|txt|rst)$/.test(f));
      const hasConfig = modifiedFiles.some(f => /\.(json|yml|yaml|toml|ini)$/.test(f));
      
      if (hasDocs) {
        commitType = 'docs';
        description = 'update documentation';
      } else if (hasConfig) {
        commitType = 'chore';
        description = 'update configuration';
      } else if (hasCode) {
        commitType = 'fix';
        description = 'update code';
      }
      
      if (modifiedFiles.length === 1) {
        description = `update ${path.basename(modifiedFiles[0])}`;
      }
    } else if (deletedFiles.length > 0) {
      commitType = 'chore';
      description = `remove ${deletedFiles.length === 1 ? path.basename(deletedFiles[0]) : deletedFiles.length + ' files'}`;
    }
    
    const message = `${commitType}: ${description}`;
    
    return [
      message,
      `${commitType}: ${description} (basic)`,
      `${commitType}: ${description}\n\nGenerated fallback commit message`
    ];
  }

  /**
   * Analyze and debug code issues with intelligent error context
   */
  async debugCode(filePath, errorMessage = '', stackTrace = '') {
    return await this.debugAssistant.analyzeError(filePath, errorMessage, stackTrace);
  }

  /**
   * Explain code sections with detailed analysis
   */
  async explainCode(filePath, startLine, endLine) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n');
    const codeSection = lines.slice(startLine - 1, endLine).join('\n');
    const fileContext = await this.getFileContext(filePath);

    const prompt = `
## Code Explanation Request

**File**: ${fileContext.file.path}
**Language**: ${fileContext.file.language}
**Lines**: ${startLine}-${endLine}

**Code Section**:
\`\`\`${fileContext.file.language}
${codeSection}
\`\`\`

**Project Context**: ${fileContext.project.type} project

Please explain this code section in a clear, educational way:
1. **Purpose**: What does this code do?
2. **How it works**: Step-by-step breakdown
3. **Key concepts**: Important patterns or principles used
4. **Dependencies**: What it relies on
5. **Potential issues**: Any concerns or improvement suggestions

Keep the explanation accessible but technical enough to be useful.
`;

    try {
      return await this.ai.chat(prompt, {
        task: 'code',
        maxTokens: 800,
        context: 'code_explanation'
      });
    } catch (error) {
      // Fallback explanation when no AI providers available
      console.log('⚠️  AI providers unavailable, generating basic code analysis...');
      return this.generateBasicCodeExplanation(codeSection, fileContext);
    }
  }

  /**
   * Provide intelligent code refactoring suggestions
   */
  async suggestRefactoring(filePath, startLine, endLine, refactorType = 'general') {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n');
    const codeSection = lines.slice(startLine - 1, endLine).join('\n');
    const fileContext = await this.getFileContext(filePath);

    const prompt = `
## Code Refactoring Suggestions

**File**: ${fileContext.file.path}
**Language**: ${fileContext.file.language}
**Refactor Type**: ${refactorType}
**Lines**: ${startLine}-${endLine}

**Current Code**:
\`\`\`${fileContext.file.language}
${codeSection}
\`\`\`

**Project Context**: ${fileContext.project.type} using ${fileContext.dependencies.main?.join(', ')}

Analyze this code and suggest improvements:
1. **Performance optimizations**
2. **Readability improvements**
3. **Best practices alignment**
4. **Error handling enhancements**
5. **Maintainability improvements**

For each suggestion, provide:
- **Issue**: What's wrong or could be better
- **Solution**: Specific refactored code
- **Benefit**: Why this improvement matters

Format as actionable refactoring steps.
`;

    try {
      return await this.ai.chat(prompt, {
        task: 'code',
        maxTokens: 1000,
        context: 'code_refactoring'
      });
    } catch (error) {
      // Fallback refactoring suggestions when no AI providers available
      console.log('⚠️  AI providers unavailable, generating basic refactoring suggestions...');
      return this.generateBasicRefactoringSuggestions(codeSection, fileContext, refactorType);
    }
  }

  /**
   * Generate basic code explanation fallback
   */
  generateBasicCodeExplanation(codeSection, fileContext) {
    const lines = codeSection.split('\n');
    const language = fileContext.file.language;
    
    let explanation = `## Basic Code Analysis (${language})\n\n`;
    explanation += `**File**: ${fileContext.file.path}\n`;
    explanation += `**Lines**: ${lines.length} lines of code\n\n`;
    
    // Basic code structure analysis
    if (language === 'javascript' || language === 'typescript') {
      const functions = lines.filter(line => line.includes('function ') || line.includes('const ') && line.includes('=>'));
      const imports = lines.filter(line => line.trim().startsWith('import '));
      const exports = lines.filter(line => line.includes('export '));
      
      if (functions.length > 0) explanation += `**Functions**: Found ${functions.length} function(s)\n`;
      if (imports.length > 0) explanation += `**Imports**: ${imports.length} import statement(s)\n`;
      if (exports.length > 0) explanation += `**Exports**: ${exports.length} export statement(s)\n`;
    } else if (language === 'python') {
      const functions = lines.filter(line => line.trim().startsWith('def '));
      const classes = lines.filter(line => line.trim().startsWith('class '));
      const imports = lines.filter(line => line.trim().startsWith('import ') || line.trim().startsWith('from '));
      
      if (classes.length > 0) explanation += `**Classes**: Found ${classes.length} class(es)\n`;
      if (functions.length > 0) explanation += `**Functions**: Found ${functions.length} function(s)\n`;
      if (imports.length > 0) explanation += `**Imports**: ${imports.length} import statement(s)\n`;
    }
    
    explanation += `\n**Note**: This is a basic analysis. For detailed code explanation, configure AI providers.\n`;
    explanation += `Install Ollama (https://ollama.ai) for free local analysis or add API keys for cloud providers.`;
    
    return explanation;
  }

  /**
   * Generate basic refactoring suggestions fallback
   */
  generateBasicRefactoringSuggestions(codeSection, fileContext, refactorType) {
    const language = fileContext.file.language;
    let suggestions = `## Basic Refactoring Suggestions (${language})\n\n`;
    
    const lines = codeSection.split('\n');
    const issues = [];
    
    // Basic code quality checks
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Long lines
      if (line.length > 120) {
        issues.push(`Line ${index + 1}: Consider breaking long line (${line.length} characters)`);
      }
      
      // TODO/FIXME comments
      if (trimmed.includes('TODO') || trimmed.includes('FIXME')) {
        issues.push(`Line ${index + 1}: Address TODO/FIXME comment`);
      }
      
      // Nested callbacks (JavaScript)
      if (language === 'javascript' && line.includes('.then(') && line.includes('.then(')) {
        issues.push(`Line ${index + 1}: Consider using async/await instead of nested .then()`);
      }
      
      // Magic numbers
      const numbers = trimmed.match(/\b\d{2,}\b/g);
      if (numbers && !trimmed.includes('//') && !trimmed.includes('const ')) {
        issues.push(`Line ${index + 1}: Consider extracting magic numbers to constants`);
      }
    });
    
    if (issues.length > 0) {
      suggestions += `**Issues Found**:\n`;
      issues.forEach(issue => suggestions += `- ${issue}\n`);
    } else {
      suggestions += `**No obvious issues detected** in this code section.\n`;
    }
    
    suggestions += `\n**General Refactoring Tips**:\n`;
    suggestions += `- Extract repeated code into functions\n`;
    suggestions += `- Use meaningful variable and function names\n`;
    suggestions += `- Add error handling where appropriate\n`;
    suggestions += `- Consider breaking large functions into smaller ones\n`;
    suggestions += `- Add comments for complex logic\n\n`;
    
    suggestions += `**Note**: For intelligent refactoring suggestions, configure AI providers.\n`;
    suggestions += `Install Ollama (https://ollama.ai) for free analysis or add API keys for enhanced suggestions.`;
    
    return suggestions;
  }

  // Helper methods
  detectLanguage(extension) {
    const languageMap = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'react',
      '.tsx': 'react-typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.sql': 'sql',
      '.sh': 'bash',
      '.md': 'markdown'
    };
    return languageMap[extension] || 'text';
  }

  async getProjectMetadata() {
    const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
    const cargoTomlPath = path.join(this.workspaceRoot, 'Cargo.toml');
    const requirementsPath = path.join(this.workspaceRoot, 'requirements.txt');

    let metadata = { type: 'unknown', name: 'unknown' };

    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      metadata = {
        type: 'node',
        name: packageJson.name,
        version: packageJson.version,
        main: packageJson.main,
        scripts: Object.keys(packageJson.scripts || {})
      };
    } else if (fs.existsSync(cargoTomlPath)) {
      metadata.type = 'rust';
    } else if (fs.existsSync(requirementsPath)) {
      metadata.type = 'python';
    }

    return metadata;
  }

  async getProjectDependencies() {
    const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return {
        main: Object.keys(packageJson.dependencies || {}),
        dev: Object.keys(packageJson.devDependencies || {}),
        peer: Object.keys(packageJson.peerDependencies || {})
      };
    }

    return { main: [], dev: [], peer: [] };
  }

  async getProjectStructure() {
    try {
      const files = simpleGlob('**/*', {
        cwd: this.workspaceRoot,
        ignore: ['node_modules', '.git', 'dist', 'build']
      });

      const directories = [];
      const extensions = new Set();
      
      for (const file of files) {
        const fullPath = path.join(this.workspaceRoot, file);
        try {
          if (fs.statSync(fullPath).isDirectory()) {
            directories.push(file);
          } else {
            const ext = path.extname(file);
            if (ext) extensions.add(ext);
          }
        } catch (error) {
          // Skip files we can't stat
        }
      }

      return {
        totalFiles: files.length,
        directories,
        extensions: [...extensions]
      };
    } catch (error) {
      return { totalFiles: 0, directories: [], extensions: [] };
    }
  }

  async getRecentlyModifiedFiles() {
    try {
      const files = simpleGlob('**/*.{js,ts,jsx,tsx,py,java,cpp,c,cs,php,rb,go,rs}', {
        cwd: this.workspaceRoot,
        ignore: ['node_modules', '.git']
      });

      const fileStats = files.map(file => {
        const fullPath = path.join(this.workspaceRoot, file);
        const stats = fs.statSync(fullPath);
        return {
          path: file,
          modified: stats.mtime,
          size: stats.size
        };
      });

      return fileStats
        .sort((a, b) => b.modified - a.modified)
        .slice(0, 10)
        .map(f => ({ path: f.path, modified: f.modified.toISOString() }));
    } catch (error) {
      return [];
    }
  }

  parseCompletionResponse(response) {
    // Parse AI response to extract completion suggestions
    const lines = response.split('\n');
    const suggestions = [];
    
    for (const line of lines) {
      if (line.includes('**Primary suggestion**:') || line.includes('**Alternative')) {
        const suggestion = line.split(':')[1]?.trim();
        if (suggestion) {
          suggestions.push(suggestion.replace(/\[|\]/g, ''));
        }
      }
    }
    
    return suggestions.slice(0, 3); // Max 3 suggestions
  }

  parseCommitSuggestions(response) {
    const lines = response.split('\n');
    const suggestions = [];
    
    for (const line of lines) {
      if (line.includes('**Primary**:') || line.includes('**Alternative**:') || line.includes('**Detailed**:')) {
        const suggestion = line.split(':')[1]?.trim();
        if (suggestion) {
          suggestions.push(suggestion.replace(/\[|\]/g, ''));
        }
      }
    }
    
    return suggestions;
  }
}

/**
 * Git Integration Helper
 */
class GitIntegration {
  async getStagedChanges() {
    try {
      const output = execSync('git diff --cached --name-status', { encoding: 'utf8' });
      return output.trim().split('\n').filter(Boolean).map(line => {
        const [status, file] = line.split('\t');
        return { status, file };
      });
    } catch (error) {
      return [];
    }
  }

  async getStagedDiff() {
    try {
      return execSync('git diff --cached', { encoding: 'utf8' });
    } catch (error) {
      return '';
    }
  }

  async getRecentCommits(count = 5) {
    try {
      const output = execSync(`git log --oneline -${count}`, { encoding: 'utf8' });
      return output.trim().split('\n').map(line => {
        const [hash, ...messageParts] = line.split(' ');
        return { hash, message: messageParts.join(' ') };
      });
    } catch (error) {
      return [];
    }
  }

  async getFileGitContext(filePath) {
    try {
      const lastCommit = execSync(`git log -1 --format="%h %an %ar" -- "${filePath}"`, { encoding: 'utf8' }).trim();
      const status = execSync(`git status --porcelain "${filePath}"`, { encoding: 'utf8' }).trim();
      
      return {
        lastCommit: lastCommit || 'No commits',
        status: status || 'clean',
        isTracked: !status.startsWith('??')
      };
    } catch (error) {
      return { lastCommit: 'unknown', status: 'unknown', isTracked: false };
    }
  }

  async getRepoContext() {
    try {
      const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
      
      return {
        currentBranch: branch,
        remoteUrl: remoteUrl,
        hasUncommittedChanges: this.hasUncommittedChanges()
      };
    } catch (error) {
      return { currentBranch: 'unknown', remoteUrl: '', hasUncommittedChanges: false };
    }
  }

  hasUncommittedChanges() {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      return status.trim().length > 0;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Code Analysis Helper
 */
class CodeAnalyzer {
  analyzeFile(content, extension) {
    const language = this.getLanguageFromExtension(extension);
    
    return {
      language,
      linesOfCode: content.split('\n').length,
      complexity: this.estimateComplexity(content, language),
      imports: this.extractImports(content, language),
      functions: this.extractFunctions(content, language),
      classes: this.extractClasses(content, language)
    };
  }

  getLanguageFromExtension(ext) {
    const map = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c'
    };
    return map[ext] || 'unknown';
  }

  estimateComplexity(content, language) {
    // Simple complexity estimation based on control structures
    const controlKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'try', 'catch'];
    let complexity = 1; // Base complexity
    
    for (const keyword of controlKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return Math.min(complexity, 20); // Cap at 20 for display purposes
  }

  extractImports(content, language) {
    const lines = content.split('\n');
    const imports = [];
    
    for (const line of lines) {
      if (language === 'javascript' || language === 'typescript') {
        if (line.includes('import ') || line.includes('require(')) {
          imports.push(line.trim());
        }
      } else if (language === 'python') {
        if (line.includes('import ') || line.includes('from ')) {
          imports.push(line.trim());
        }
      }
    }
    
    return imports.slice(0, 5); // First 5 imports
  }

  extractFunctions(content, language) {
    const functions = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (language === 'javascript' || language === 'typescript') {
        if (line.includes('function ') || line.includes('const ') && line.includes('=>')) {
          functions.push({ name: this.extractFunctionName(line), line: i + 1 });
        }
      } else if (language === 'python') {
        if (line.includes('def ')) {
          functions.push({ name: this.extractPythonFunctionName(line), line: i + 1 });
        }
      }
    }
    
    return functions.slice(0, 10); // First 10 functions
  }

  extractClasses(content, language) {
    const classes = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (language === 'javascript' || language === 'typescript') {
        if (line.includes('class ')) {
          classes.push({ name: this.extractClassName(line), line: i + 1 });
        }
      } else if (language === 'python') {
        if (line.includes('class ')) {
          classes.push({ name: this.extractPythonClassName(line), line: i + 1 });
        }
      }
    }
    
    return classes;
  }

  extractFunctionName(line) {
    const match = line.match(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    if (match) return match[1];
    
    const arrowMatch = line.match(/const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/);
    if (arrowMatch) return arrowMatch[1];
    
    return 'anonymous';
  }

  extractPythonFunctionName(line) {
    const match = line.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    return match ? match[1] : 'unknown';
  }

  extractClassName(line) {
    const match = line.match(/class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    return match ? match[1] : 'unknown';
  }

  extractPythonClassName(line) {
    const match = line.match(/class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    return match ? match[1] : 'unknown';
  }
}

/**
 * Debug Assistant
 */
class DebugAssistant {
  constructor(multiAI) {
    this.ai = multiAI;
  }

  async analyzeError(filePath, errorMessage, stackTrace) {
    const fileContext = await this.getErrorContext(filePath, stackTrace);
    
    const prompt = `
## Debug Analysis Request

**File**: ${filePath}
**Error Message**: ${errorMessage}

**Stack Trace**:
\`\`\`
${stackTrace}
\`\`\`

**Code Context**:
\`\`\`
${fileContext}
\`\`\`

Please analyze this error and provide:
1. **Root Cause**: What's causing this error?
2. **Solution**: How to fix it (with code examples)
3. **Prevention**: How to prevent similar errors
4. **Best Practices**: Related coding best practices

Be specific and actionable in your suggestions.
`;

    return await this.ai.chat(prompt, {
      task: 'code',
      maxTokens: 1000,
      context: 'debug_analysis'
    });
  }

  async getErrorContext(filePath, stackTrace) {
    if (!filePath || !fs.existsSync(filePath)) {
      return 'File not accessible';
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Extract line numbers from stack trace
      const lineNumbers = this.extractLineNumbers(stackTrace);
      
      if (lineNumbers.length === 0) {
        // Return first 20 lines if no specific line numbers found
        return lines.slice(0, 20).map((line, i) => `${i + 1}: ${line}`).join('\n');
      }
      
      // Return context around error lines
      let contextLines = [];
      for (const lineNum of lineNumbers) {
        const start = Math.max(0, lineNum - 5);
        const end = Math.min(lines.length, lineNum + 5);
        const section = lines.slice(start, end).map((line, i) => `${start + i + 1}: ${line}`);
        contextLines.push(...section);
      }
      
      return [...new Set(contextLines)].join('\n'); // Remove duplicates
    } catch (error) {
      return 'Unable to read file content';
    }
  }

  extractLineNumbers(stackTrace) {
    const lineNumbers = [];
    const lines = stackTrace.split('\n');
    
    for (const line of lines) {
      // Match various stack trace formats
      const matches = line.match(/:(\d+):\d+/g) || line.match(/line (\d+)/g);
      if (matches) {
        for (const match of matches) {
          const num = parseInt(match.match(/\d+/)[0]);
          if (num > 0) {
            lineNumbers.push(num - 1); // Convert to 0-based indexing
          }
        }
      }
    }
    
    return [...new Set(lineNumbers)].slice(0, 3); // Max 3 locations, remove duplicates
  }
}

export default IDEFeatures;