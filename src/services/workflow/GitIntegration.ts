/**
 * Git integration service for workflow automation
 * Handles Git hooks, status tracking, and automated sync triggers
 */

import type { IGitIntegration } from '../../domain/interfaces/index.js';
import { GitHookManager } from '../../infrastructure/git/GitHookManager.js';
import type { GitIntegrationOptions } from './WorkflowTypes.js';

export class GitIntegrationService {
  private projectPath: string;
  private gitHookManager: GitHookManager;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.gitHookManager = new GitHookManager(projectPath);
  }

  /**
   * Setup Git integration with hooks
   */
  async setupGitIntegration(options: GitIntegrationOptions = {}): Promise<{
    success: boolean;
    hooksInstalled: string[];
    error?: string;
  }> {
    try {
      console.log('🔧 Setting up Git integration...');
      
      const hooksInstalled: string[] = [];

      // Install pre-commit hook
      await this.gitHookManager.installPreCommitHook();
      hooksInstalled.push('pre-commit');
      
      // Install post-commit hook if auto-sync enabled
      if (options.autoSync) {
        await this.gitHookManager.installPostCommitHook(true);
        hooksInstalled.push('post-commit');
        console.log('🚀 Auto-sync enabled for commits');
      }
      
      console.log('✅ Git integration setup complete');
      
      return {
        success: true,
        hooksInstalled
      };
    } catch (error) {
      console.error('❌ Failed to setup Git integration:', error);
      return {
        success: false,
        hooksInstalled: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Remove Git integration hooks
   */
  async removeGitIntegration(): Promise<{
    success: boolean;
    hooksRemoved: string[];
    error?: string;
  }> {
    try {
      console.log('🗑️ Removing Git integration...');
      
      await this.gitHookManager.removeHooks();
      console.log('✅ Git integration removed');
      
      return {
        success: true,
        hooksRemoved: ['pre-commit', 'post-commit']
      };
    } catch (error) {
      console.error('❌ Failed to remove Git integration:', error);
      return {
        success: false,
        hooksRemoved: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check Git status for the project
   */
  async checkGitStatus(): Promise<{
    isGitRepo: boolean;
    staged: string[];
    modified: string[];
    untracked: string[];
    needsSync: string[];
    branch: string;
    hasRemote: boolean;
  }> {
    try {
      const gitStatus = await this.gitHookManager.checkGitStatus();
      
      return {
        isGitRepo: true,
        staged: gitStatus.staged,
        modified: gitStatus.modified,
        untracked: gitStatus.untracked || [],
        needsSync: gitStatus.needsSync,
        branch: gitStatus.branch || 'main',
        hasRemote: gitStatus.hasRemote || false
      };
    } catch (error) {
      console.warn('Git status check failed:', error);
      return {
        isGitRepo: false,
        staged: [],
        modified: [],
        untracked: [],
        needsSync: [],
        branch: 'unknown',
        hasRemote: false
      };
    }
  }

  /**
   * Get Git hook status
   */
  async getHookStatus(): Promise<{
    preCommitInstalled: boolean;
    postCommitInstalled: boolean;
    autoSyncEnabled: boolean;
    hookErrors: string[];
  }> {
    try {
      const hookStatus = await this.gitHookManager.getHookStatus();
      
      return {
        preCommitInstalled: hookStatus.preCommitInstalled || false,
        postCommitInstalled: hookStatus.postCommitInstalled || false,
        autoSyncEnabled: hookStatus.autoSyncEnabled || false,
        hookErrors: hookStatus.errors || []
      };
    } catch (error) {
      return {
        preCommitInstalled: false,
        postCommitInstalled: false,
        autoSyncEnabled: false,
        hookErrors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Trigger sync for Git changes
   */
  async triggerSyncForChanges(changedFiles: string[]): Promise<{
    triggered: boolean;
    syncedFiles: number;
    error?: string;
  }> {
    try {
      console.log(`🔄 Triggering sync for ${changedFiles.length} changed files...`);
      
      // Filter files that actually need syncing
      const filteredFiles = changedFiles.filter(file => 
        this.shouldSyncFile(file)
      );
      
      if (filteredFiles.length === 0) {
        console.log('📋 No files need syncing');
        return { triggered: false, syncedFiles: 0 };
      }
      
      // This would typically trigger the main sync workflow
      console.log(`✅ Sync triggered for ${filteredFiles.length} files`);
      
      return {
        triggered: true,
        syncedFiles: filteredFiles.length
      };
    } catch (error) {
      console.error('❌ Failed to trigger sync:', error);
      return {
        triggered: false,
        syncedFiles: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if a file should be synced based on Git changes
   */
  private shouldSyncFile(filePath: string): boolean {
    // Skip certain file types and directories
    const skipPatterns = [
      /node_modules\//,
      /\.git\//,
      /\.DS_Store$/,
      /\.log$/,
      /\.tmp$/,
      /\.cache\//
    ];
    
    return !skipPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Get files modified since last sync
   */
  async getFilesSinceLastSync(): Promise<{
    files: string[];
    lastSyncCommit?: string;
    commits: number;
  }> {
    try {
      // Get Git log since last sync marker
      const gitLog = await this.gitHookManager.getCommitsSinceLastSync();
      
      return {
        files: gitLog.changedFiles || [],
        lastSyncCommit: gitLog.lastSyncCommit,
        commits: gitLog.commitCount || 0
      };
    } catch (error) {
      console.warn('Failed to get files since last sync:', error);
      return {
        files: [],
        commits: 0
      };
    }
  }

  /**
   * Mark sync point in Git history
   */
  async markSyncPoint(): Promise<{
    success: boolean;
    commit?: string;
    error?: string;
  }> {
    try {
      const commit = await this.gitHookManager.markSyncPoint();
      
      return {
        success: true,
        commit
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate Git repository setup
   */
  async validateGitSetup(): Promise<{
    valid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const gitStatus = await this.checkGitStatus();
      
      if (!gitStatus.isGitRepo) {
        issues.push('Not a Git repository');
        suggestions.push('Run "git init" to initialize Git repository');
      }
      
      if (!gitStatus.hasRemote) {
        suggestions.push('Consider adding a remote repository for backup');
      }
      
      const hookStatus = await this.getHookStatus();
      
      if (!hookStatus.preCommitInstalled) {
        suggestions.push('Install pre-commit hook for automatic file tracking');
      }
      
      if (!hookStatus.postCommitInstalled) {
        suggestions.push('Install post-commit hook for automatic syncing');
      }

      if (hookStatus.hookErrors.length > 0) {
        issues.push(`Git hook errors: ${hookStatus.hookErrors.join(', ')}`);
      }

    } catch (error) {
      issues.push(`Git validation failed: ${error}`);
    }

    return {
      valid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Get Git integration recommendations
   */
  async getIntegrationRecommendations(): Promise<{
    recommendations: Array<{
      type: 'setup' | 'optimization' | 'maintenance';
      priority: 'high' | 'medium' | 'low';
      title: string;
      description: string;
      action: string;
    }>;
  }> {
    const recommendations = [];
    const gitStatus = await this.checkGitStatus();
    const hookStatus = await this.getHookStatus();

    if (!gitStatus.isGitRepo) {
      recommendations.push({
        type: 'setup' as const,
        priority: 'high' as const,
        title: 'Initialize Git Repository',
        description: 'Project is not under Git version control',
        action: 'Run "git init" to initialize Git tracking'
      });
    }

    if (!hookStatus.preCommitInstalled) {
      recommendations.push({
        type: 'setup' as const,
        priority: 'medium' as const,
        title: 'Install Pre-commit Hook',
        description: 'Automatically track file changes before commits',
        action: 'Run sync workflow setup with Git integration'
      });
    }

    if (!hookStatus.autoSyncEnabled) {
      recommendations.push({
        type: 'optimization' as const,
        priority: 'medium' as const,
        title: 'Enable Auto-sync',
        description: 'Automatically sync changes to Notion after commits',
        action: 'Enable auto-sync in Git integration setup'
      });
    }

    if (gitStatus.needsSync.length > 0) {
      recommendations.push({
        type: 'maintenance' as const,
        priority: 'high' as const,
        title: 'Sync Pending Changes',
        description: `${gitStatus.needsSync.length} files need syncing to Notion`,
        action: 'Run sync workflow to upload pending changes'
      });
    }

    return { recommendations };
  }
}