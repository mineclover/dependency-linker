/**
 * Workflow Service Interfaces
 * Defines contracts for workflow orchestration and execution
 */

import type { ProjectFile, NotionConfig } from '../../shared/types/index.js';

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  projectPath: string;
  config: NotionConfig;
  options: Record<string, any>;
  metadata: {
    startTime: Date;
    userId?: string;
    sessionId?: string;
  };
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  dependencies: string[];
  timeout?: number;
  retryable: boolean;
  critical: boolean;
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult {
  success: boolean;
  duration: number;
  stepsExecuted: number;
  stepsSkipped: number;
  stepsFailed: number;
  results: Record<string, any>;
  errors: string[];
  warnings: string[];
}

/**
 * Base Workflow Service Interface
 */
export interface IWorkflowService {
  /**
   * Execute workflow with context
   */
  execute(context: WorkflowContext): Promise<WorkflowExecutionResult>;

  /**
   * Validate workflow prerequisites
   */
  validatePrerequisites(context: WorkflowContext): Promise<{
    isValid: boolean;
    missingRequirements: string[];
    warnings: string[];
  }>;

  /**
   * Get workflow definition
   */
  getWorkflowDefinition(): {
    id: string;
    name: string;
    description: string;
    steps: WorkflowStep[];
  };

  /**
   * Cancel running workflow
   */
  cancel(workflowId: string): Promise<boolean>;
}

/**
 * Sync Workflow Service Interface
 */
export interface ISyncWorkflowService extends IWorkflowService {
  /**
   * Synchronize project with external system
   */
  syncProject(
    projectPath: string,
    config: NotionConfig,
    options?: {
      direction: 'upload' | 'download' | 'bidirectional';
      includeDeletes: boolean;
      conflictResolution: 'local' | 'remote' | 'merge' | 'manual';
    }
  ): Promise<WorkflowExecutionResult>;

  /**
   * Check synchronization status
   */
  getSyncStatus(projectPath: string): Promise<{
    isInSync: boolean;
    lastSync: Date | null;
    pendingChanges: number;
    conflicts: Array<{
      filePath: string;
      type: 'content' | 'metadata' | 'structure';
      description: string;
    }>;
  }>;
}

/**
 * File Discovery Service Interface
 */
export interface IFileDiscoveryService {
  /**
   * Discover files in project matching patterns
   */
  discoverFiles(
    projectPath: string,
    patterns: {
      include?: string[];
      exclude?: string[];
      maxDepth?: number;
      maxFiles?: number;
    }
  ): Promise<ProjectFile[]>;

  /**
   * Watch for file changes
   */
  watchFiles(
    projectPath: string,
    callback: (changes: Array<{
      type: 'added' | 'modified' | 'deleted';
      filePath: string;
      timestamp: Date;
    }>) => void
  ): Promise<{
    stop: () => void;
    isWatching: boolean;
  }>;

  /**
   * Get file analysis for discovered files
   */
  analyzeFiles(files: ProjectFile[]): Promise<{
    totalSize: number;
    fileTypes: Record<string, number>;
    languageDistribution: Record<string, number>;
    complexity: {
      average: number;
      high: string[];
      recommendations: string[];
    };
  }>;
}

/**
 * Git Integration Service Interface
 */
export interface IGitIntegrationService {
  /**
   * Get git status for project
   */
  getGitStatus(projectPath: string): Promise<{
    isGitRepo: boolean;
    branch: string;
    isClean: boolean;
    staged: string[];
    modified: string[];
    untracked: string[];
    commits: Array<{
      hash: string;
      message: string;
      author: string;
      date: Date;
    }>;
  }>;

  /**
   * Create commit with workflow integration
   */
  createCommit(
    projectPath: string,
    message: string,
    files?: string[]
  ): Promise<{
    success: boolean;
    commitHash?: string;
    error?: string;
  }>;

  /**
   * Integrate with CI/CD workflows
   */
  triggerWorkflow(
    projectPath: string,
    workflowName: string,
    parameters?: Record<string, any>
  ): Promise<{
    success: boolean;
    workflowId?: string;
    status?: string;
  }>;
}