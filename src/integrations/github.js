#!/usr/bin/env node

/**
 * GitHub Integration for Multi-AI CLI
 * Provides GitHub API access and repository management
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export class GitHubIntegration {
  constructor(options = {}) {
    this.token = options.token || process.env.GITHUB_TOKEN;
    this.baseUrl = options.baseUrl || 'https://api.github.com';
  }

  /**
   * Check if GitHub CLI is available
   */
  isGitHubCLIAvailable() {
    try {
      execSync('gh --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get repository information
   */
  async getRepoInfo() {
    try {
      if (this.isGitHubCLIAvailable()) {
        const result = execSync('gh repo view --json name,owner,description,url', { encoding: 'utf8' });
        return JSON.parse(result);
      }
      
      // Fallback to git remote
      const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
      const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
      
      if (match) {
        return {
          owner: { login: match[1] },
          name: match[2],
          url: `https://github.com/${match[1]}/${match[2]}`
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Create a new issue
   */
  async createIssue(title, body, labels = []) {
    try {
      if (this.isGitHubCLIAvailable()) {
        const labelsArg = labels.length > 0 ? `--label "${labels.join(',')}"` : '';
        const command = `gh issue create --title "${title}" --body "${body}" ${labelsArg}`;
        const result = execSync(command, { encoding: 'utf8' });
        return { success: true, url: result.trim() };
      }
      
      throw new Error('GitHub CLI not available');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a pull request
   */
  async createPullRequest(title, body, branch = null) {
    try {
      if (this.isGitHubCLIAvailable()) {
        const branchArg = branch ? `--head ${branch}` : '';
        const command = `gh pr create --title "${title}" --body "${body}" ${branchArg}`;
        const result = execSync(command, { encoding: 'utf8' });
        return { success: true, url: result.trim() };
      }
      
      throw new Error('GitHub CLI not available');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * List recent issues
   */
  async listIssues(limit = 10) {
    try {
      if (this.isGitHubCLIAvailable()) {
        const result = execSync(`gh issue list --limit ${limit} --json number,title,state,url`, { encoding: 'utf8' });
        return JSON.parse(result);
      }
      
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get current branch status
   */
  getBranchStatus() {
    try {
      const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
      const hasChanges = status.length > 0;
      
      return {
        branch,
        hasChanges,
        changes: status.split('\n').filter(line => line.length > 0)
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Commit and push changes
   */
  async commitAndPush(message, files = []) {
    try {
      if (files.length > 0) {
        execSync(`git add ${files.join(' ')}`, { stdio: 'inherit' });
      } else {
        execSync('git add .', { stdio: 'inherit' });
      }
      
      execSync(`git commit -m "${message}"`, { stdio: 'inherit' });
      execSync('git push', { stdio: 'inherit' });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Setup GitHub integration for AI project
   */
  async setupForAI() {
    const setup = {
      hasGitHubCLI: this.isGitHubCLIAvailable(),
      repoInfo: await this.getRepoInfo(),
      branchStatus: this.getBranchStatus()
    };

    if (setup.hasGitHubCLI) {
      setup.capabilities = [
        'create_issues',
        'create_pull_requests', 
        'list_issues',
        'repo_management'
      ];
    } else {
      setup.capabilities = ['basic_git_operations'];
      setup.recommendations = [
        'Install GitHub CLI: brew install gh',
        'Authenticate: gh auth login'
      ];
    }

    return setup;
  }
}

export default GitHubIntegration;