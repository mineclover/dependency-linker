/**
 * Git Hook Manager - Infrastructure Layer
 * Git 훅과 버전 관리 기능 구현
 */

import { readFile, writeFile, chmod, access } from 'fs/promises';
import { execSync } from 'child_process';
import * as path from 'path';
import { existsSync } from 'fs';
import type { IGitIntegration, GitStatus, GitHookStatus, GitLogResult } from '../../domain/interfaces/IGitIntegration.js';
import { logger } from '../../shared/utils/index.js';

export class GitHookManager implements IGitIntegration {
  private projectPath: string;
  private gitDir: string;
  private hooksDir: string;

  constructor(projectPath: string) {
    this.projectPath = path.resolve(projectPath);
    this.gitDir = path.join(this.projectPath, '.git');
    this.hooksDir = path.join(this.gitDir, 'hooks');
  }

  /**
   * Check if this is a Git repository
   */
  private isGitRepo(): boolean {
    return existsSync(this.gitDir);
  }

  /**
   * Execute Git command safely
   */
  private execGit(command: string): string {
    try {
      return execSync(`git -C "${this.projectPath}" ${command}`, { 
        encoding: 'utf-8',
        stdio: 'pipe'
      }).trim();
    } catch (error) {
      throw new Error(`Git command failed: ${command} - ${error}`);
    }
  }

  /**
   * Install pre-commit hook for file tracking
   */
  async installPreCommitHook(): Promise<void> {
    if (!this.isGitRepo()) {
      throw new Error('Not a Git repository');
    }

    const hookPath = path.join(this.hooksDir, 'pre-commit');
    const hookContent = `#!/bin/sh
# Dependency Linker - Pre-commit hook
# Track file changes for dependency analysis

echo "📋 Dependency Linker: Scanning for changes..."

# Create or update file tracking before commit
npx deplink analyze --pre-commit || {
  echo "⚠️  Dependency analysis failed, but allowing commit to proceed"
  exit 0
}

exit 0
`;

    await writeFile(hookPath, hookContent, { encoding: 'utf-8' });
    
    // Make executable on Unix systems
    if (process.platform !== 'win32') {
      await chmod(hookPath, 0o755);
    }

    logger.info(`Pre-commit hook installed: ${hookPath}`, '🪝');
  }

  /**
   * Install post-commit hook with optional auto-sync
   */
  async installPostCommitHook(autoSync: boolean): Promise<void> {
    if (!this.isGitRepo()) {
      throw new Error('Not a Git repository');
    }

    const hookPath = path.join(this.hooksDir, 'post-commit');
    const hookContent = `#!/bin/sh
# Dependency Linker - Post-commit hook
# ${autoSync ? 'Auto-sync changes to Notion' : 'Mark sync point only'}

echo "📝 Dependency Linker: Processing commit..."

# Mark sync point in Git history
npx deplink sync --mark-commit || {
  echo "⚠️  Failed to mark sync point"
}

${autoSync ? `
# Auto-sync to Notion if enabled
echo "🔄 Auto-syncing to Notion..."
npx deplink sync --auto || {
  echo "⚠️  Auto-sync failed - you may need to run manual sync later"
  echo "    Run: npx deplink sync"
}
` : `
# Manual sync reminder
echo "💡 Reminder: Run 'npx deplink sync' to upload changes to Notion"
`}

exit 0
`;

    await writeFile(hookPath, hookContent, { encoding: 'utf-8' });
    
    // Make executable on Unix systems  
    if (process.platform !== 'win32') {
      await chmod(hookPath, 0o755);
    }

    logger.info(`Post-commit hook installed: ${hookPath} (auto-sync: ${autoSync})`, '🪝');
  }

  /**
   * Remove all installed hooks
   */
  async removeHooks(): Promise<void> {
    const hooks = ['pre-commit', 'post-commit'];
    
    for (const hook of hooks) {
      const hookPath = path.join(this.hooksDir, hook);
      
      try {
        await access(hookPath);
        // Read hook content to verify it's ours
        const content = await readFile(hookPath, 'utf-8');
        
        if (content.includes('Dependency Linker')) {
          await writeFile(hookPath + '.backup', content);
          await writeFile(hookPath, '#!/bin/sh\n# Hook removed by Dependency Linker\nexit 0\n');
          logger.info(`Git hook removed: ${hook}`, '🗑️');
        }
      } catch (error) {
        // Hook doesn't exist or not accessible
      }
    }
  }

  /**
   * Check Git repository status
   */
  async checkGitStatus(): Promise<GitStatus> {
    if (!this.isGitRepo()) {
      throw new Error('Not a Git repository');
    }

    try {
      // Get staged files
      const staged = this.execGit('diff --cached --name-only').split('\n').filter(Boolean);
      
      // Get modified files
      const modified = this.execGit('diff --name-only').split('\n').filter(Boolean);
      
      // Get untracked files
      const untracked = this.execGit('ls-files --others --exclude-standard').split('\n').filter(Boolean);
      
      // Get current branch
      const branch = this.execGit('rev-parse --abbrev-ref HEAD');
      
      // Check for remote
      const hasRemote = (() => {
        try {
          this.execGit('remote');
          return true;
        } catch {
          return false;
        }
      })();

      // Files that potentially need sync (modified or untracked source files)
      const needsSync = [...modified, ...untracked].filter(file => {
        return /\.(ts|js|tsx|jsx|py|go|rs|java|cpp|c|h|md|json|yaml|yml)$/i.test(file);
      });

      return {
        staged,
        modified,
        untracked,
        needsSync,
        branch,
        hasRemote
      };
    } catch (error) {
      throw new Error(`Failed to get Git status: ${error}`);
    }
  }

  /**
   * Get Git hook installation status
   */
  async getHookStatus(): Promise<GitHookStatus> {
    const status: GitHookStatus = {
      preCommitInstalled: false,
      postCommitInstalled: false,
      autoSyncEnabled: false,
      errors: []
    };

    if (!this.isGitRepo()) {
      status.errors?.push('Not a Git repository');
      return status;
    }

    try {
      // Check pre-commit hook
      const preCommitPath = path.join(this.hooksDir, 'pre-commit');
      try {
        const preCommitContent = await readFile(preCommitPath, 'utf-8');
        status.preCommitInstalled = preCommitContent.includes('Dependency Linker');
      } catch {
        // Hook doesn't exist
      }

      // Check post-commit hook
      const postCommitPath = path.join(this.hooksDir, 'post-commit');
      try {
        const postCommitContent = await readFile(postCommitPath, 'utf-8');
        status.postCommitInstalled = postCommitContent.includes('Dependency Linker');
        status.autoSyncEnabled = postCommitContent.includes('--auto');
      } catch {
        // Hook doesn't exist
      }

    } catch (error) {
      status.errors?.push(`Failed to check hook status: ${error}`);
    }

    return status;
  }

  /**
   * Get commits and changes since last sync
   */
  async getCommitsSinceLastSync(): Promise<GitLogResult> {
    if (!this.isGitRepo()) {
      throw new Error('Not a Git repository');
    }

    try {
      // Look for last sync marker (could be a tag or note)
      let lastSyncCommit: string | undefined;
      
      try {
        // Try to find sync marker tag
        lastSyncCommit = this.execGit('tag --list "deplink-sync-*" --sort=-version:refname | head -1');
        if (!lastSyncCommit) {
          // Fallback: look for sync marker in commit messages
          lastSyncCommit = this.execGit('log --grep="deplink-sync" --oneline -1 --format="%H"');
        }
      } catch {
        // No sync markers found
      }

      let commitCount = 0;
      let changedFiles: string[] = [];

      if (lastSyncCommit) {
        // Get commits since last sync
        const commits = this.execGit(`rev-list --count ${lastSyncCommit}..HEAD`);
        commitCount = parseInt(commits) || 0;

        // Get files changed since last sync
        if (commitCount > 0) {
          const files = this.execGit(`diff --name-only ${lastSyncCommit}..HEAD`);
          changedFiles = files.split('\n').filter(Boolean);
        }
      } else {
        // No sync point found, consider all files
        const allFiles = this.execGit('ls-tree -r --name-only HEAD');
        changedFiles = allFiles.split('\n').filter(Boolean);
        
        const totalCommits = this.execGit('rev-list --count HEAD');
        commitCount = parseInt(totalCommits) || 0;
      }

      return {
        changedFiles,
        lastSyncCommit,
        commitCount
      };

    } catch (error) {
      throw new Error(`Failed to get commits since last sync: ${error}`);
    }
  }

  /**
   * Mark current commit as sync point
   */
  async markSyncPoint(): Promise<string> {
    if (!this.isGitRepo()) {
      throw new Error('Not a Git repository');
    }

    try {
      // Get current commit hash
      const currentCommit = this.execGit('rev-parse HEAD');
      
      // Create sync marker tag
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const tagName = `deplink-sync-${timestamp}`;
      
      this.execGit(`tag -a "${tagName}" -m "Dependency Linker sync point: ${new Date().toLocaleString()}"`);
      
      logger.info(`Sync point marked: ${tagName} (${currentCommit.substring(0, 8)})`, '🏷️');
      
      return currentCommit;
    } catch (error) {
      throw new Error(`Failed to mark sync point: ${error}`);
    }
  }

  /**
   * Get recent commit info for context
   */
  async getRecentCommits(count: number = 5): Promise<Array<{
    hash: string;
    message: string;
    author: string;
    date: string;
    files: string[];
  }>> {
    if (!this.isGitRepo()) {
      throw new Error('Not a Git repository');
    }

    try {
      const commits = [];
      
      // Get commit hashes
      const hashes = this.execGit(`log --oneline -n ${count} --format="%H"`).split('\n').filter(Boolean);
      
      for (const hash of hashes) {
        const message = this.execGit(`log -1 --format="%s" ${hash}`);
        const author = this.execGit(`log -1 --format="%an" ${hash}`);
        const date = this.execGit(`log -1 --format="%ci" ${hash}`);
        
        // Get files changed in this commit
        const files = this.execGit(`diff-tree --no-commit-id --name-only -r ${hash}`).split('\n').filter(Boolean);
        
        commits.push({
          hash: hash.substring(0, 8),
          message,
          author,
          date,
          files
        });
      }
      
      return commits;
    } catch (error) {
      throw new Error(`Failed to get recent commits: ${error}`);
    }
  }

  /**
   * Check Git repository health
   */
  async validateRepository(): Promise<{
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!this.isGitRepo()) {
      issues.push('Not a Git repository');
      recommendations.push('Initialize Git: git init');
      return { isHealthy: false, issues, recommendations };
    }

    try {
      // Check if there are commits
      try {
        this.execGit('log -1 --oneline');
      } catch {
        issues.push('No commits in repository');
        recommendations.push('Make initial commit: git add . && git commit -m "Initial commit"');
      }

      // Check for remote
      try {
        const remotes = this.execGit('remote');
        if (!remotes) {
          recommendations.push('Consider adding remote repository for backup');
        }
      } catch {
        // No remotes configured
      }

      // Check working directory status
      const status = await this.checkGitStatus();
      
      if (status.staged.length > 0) {
        recommendations.push('You have staged changes - commit them or unstage');
      }

      if (status.modified.length > 10) {
        recommendations.push('Many modified files - consider committing changes');
      }

      if (status.untracked && status.untracked.length > 20) {
        recommendations.push('Many untracked files - consider adding .gitignore');
      }

    } catch (error) {
      issues.push(`Git validation error: ${error}`);
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations
    };
  }
}