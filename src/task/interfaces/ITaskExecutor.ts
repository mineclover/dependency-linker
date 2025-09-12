/**
 * Task Executor Interface
 * Handles the actual execution of tasks with support for different execution strategies
 */

import {
  Task,
  TaskExecutionResult,
  TaskExecutionContext,
  TaskProgress,
  ValidationResult
} from '../types';

/**
 * Task Execution Strategy
 */
export enum ExecutionStrategy {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  ADAPTIVE = 'adaptive'
}

/**
 * Task Execution Configuration
 */
export interface TaskExecutionConfig {
  strategy: ExecutionStrategy;
  maxConcurrency?: number;
  timeout?: number;
  retryCount?: number;
  failFast?: boolean;
  validateBeforeExecution?: boolean;
  validateAfterExecution?: boolean;
}

/**
 * Task Executor Interface
 */
export interface ITaskExecutor {
  /**
   * Execute a single task
   */
  executeTask(task: Task, context?: TaskExecutionContext): Promise<TaskExecutionResult>;
  
  /**
   * Execute multiple tasks with specified strategy
   */
  executeTasks(tasks: Task[], config?: TaskExecutionConfig): Promise<TaskExecutionResult[]>;
  
  /**
   * Execute tasks in batches for optimal resource utilization
   */
  executeBatch(tasks: Task[], batchSize?: number, config?: TaskExecutionConfig): Promise<TaskExecutionResult[]>;
  
  /**
   * Progress tracking
   */
  getExecutionProgress(taskId: string): Promise<TaskProgress>;
  onProgressUpdate(callback: (taskId: string, progress: TaskProgress) => void): void;
  
  /**
   * Cancellation support
   */
  cancelExecution(taskId: string): Promise<boolean>;
  cancelAllExecutions(): Promise<boolean>;
  
  /**
   * Resource management
   */
  getActiveExecutions(): Promise<string[]>;
  getResourceUsage(): Promise<ResourceUsage>;
  setResourceLimits(limits: ResourceLimits): void;
  
  /**
   * Validation
   */
  validateTaskExecution(task: Task): Promise<ValidationResult[]>;
  validateExecutionEnvironment(context: TaskExecutionContext): Promise<boolean>;
}

/**
 * Resource Usage Information
 */
export interface ResourceUsage {
  activeExecutions: number;
  maxConcurrency: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage?: number;
  networkUsage?: number;
}

/**
 * Resource Limits Configuration
 */
export interface ResourceLimits {
  maxConcurrentTasks: number;
  maxMemoryUsage: number; // in MB
  maxCpuUsage: number; // percentage
  maxExecutionTime: number; // in minutes
  maxRetries: number;
}