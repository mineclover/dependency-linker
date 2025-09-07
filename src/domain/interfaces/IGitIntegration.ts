/**
 * Git Integration Interface - Domain Layer
 * Git 기능에 대한 도메인 인터페이스
 */

export interface GitStatus {
  staged: string[];
  modified: string[];
  untracked?: string[];
  needsSync: string[];
  branch?: string;
  hasRemote?: boolean;
}

export interface GitHookStatus {
  preCommitInstalled?: boolean;
  postCommitInstalled?: boolean;
  autoSyncEnabled?: boolean;
  errors?: string[];
}

export interface GitLogResult {
  changedFiles?: string[];
  lastSyncCommit?: string;
  commitCount?: number;
}

export interface IGitIntegration {
  /**
   * Install pre-commit hook for file tracking
   */
  installPreCommitHook(): Promise<void>;
  
  /**
   * Install post-commit hook with optional auto-sync
   */
  installPostCommitHook(autoSync: boolean): Promise<void>;
  
  /**
   * Remove all installed hooks
   */
  removeHooks(): Promise<void>;
  
  /**
   * Check Git repository status
   */
  checkGitStatus(): Promise<GitStatus>;
  
  /**
   * Get Git hook installation status
   */
  getHookStatus(): Promise<GitHookStatus>;
  
  /**
   * Get commits and changes since last sync
   */
  getCommitsSinceLastSync(): Promise<GitLogResult>;
  
  /**
   * Mark current commit as sync point
   */
  markSyncPoint(): Promise<string>;
}