/**
 * Task Repository Interface
 * Handles persistence and retrieval of tasks
 */

import {
  Task,
  TaskQueryOptions,
  TaskBatch,
  TaskStatistics,
  TaskTemplate
} from '../types';

/**
 * Task Repository Interface
 */
export interface ITaskRepository {
  /**
   * Basic CRUD operations
   */
  create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>;
  update(taskId: string, updates: Partial<Task>): Promise<Task>;
  delete(taskId: string): Promise<boolean>;
  findById(taskId: string): Promise<Task | null>;
  findAll(options?: TaskQueryOptions): Promise<Task[]>;
  exists(taskId: string): Promise<boolean>;
  
  /**
   * Batch operations
   */
  createBatch(tasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Task[]>;
  updateBatch(updates: Array<{ taskId: string; updates: Partial<Task> }>): Promise<Task[]>;
  deleteBatch(taskIds: string[]): Promise<boolean>;
  
  /**
   * Task batch management
   */
  saveBatch(batch: Omit<TaskBatch, 'id'>): Promise<TaskBatch>;
  getBatch(batchId: string): Promise<TaskBatch | null>;
  deleteBatchDefinition(batchId: string): Promise<boolean>;
  getAllBatches(): Promise<TaskBatch[]>;
  
  /**
   * Query operations
   */
  findByStatus(status: string[]): Promise<Task[]>;
  findByPriority(priority: string[]): Promise<Task[]>;
  findByPhase(phase: string[]): Promise<Task[]>;
  findByTags(tags: string[]): Promise<Task[]>;
  findByDependency(dependencyTaskId: string): Promise<Task[]>;
  
  /**
   * Dependency queries
   */
  getDependencies(taskId: string): Promise<Task[]>;
  getDependents(taskId: string): Promise<Task[]>;
  getCriticalPath(): Promise<Task[]>;
  getParallelizableTasks(): Promise<Task[]>;
  
  /**
   * Statistics and analytics
   */
  getStatistics(): Promise<TaskStatistics>;
  getTaskCount(): Promise<number>;
  getCompletionRate(): Promise<number>;
  getAverageDuration(): Promise<number>;
  
  /**
   * Search operations
   */
  search(query: string): Promise<Task[]>;
  searchByTitle(title: string): Promise<Task[]>;
  searchByDescription(description: string): Promise<Task[]>;
  
  /**
   * Template operations
   */
  saveTemplate(template: TaskTemplate): Promise<TaskTemplate>;
  getTemplate(templateId: string): Promise<TaskTemplate | null>;
  getAllTemplates(): Promise<TaskTemplate[]>;
  deleteTemplate(templateId: string): Promise<boolean>;
  
  /**
   * Backup and restore
   */
  backup(): Promise<string>;
  restore(backupData: string): Promise<boolean>;
  
  /**
   * Data integrity
   */
  validateData(): Promise<boolean>;
  repair(): Promise<boolean>;
  
  /**
   * Performance optimization
   */
  optimize(): Promise<boolean>;
  getIndexes(): Promise<string[]>;
  rebuildIndexes(): Promise<boolean>;
  
  /**
   * Transaction support
   */
  beginTransaction(): Promise<string>;
  commitTransaction(transactionId: string): Promise<boolean>;
  rollbackTransaction(transactionId: string): Promise<boolean>;
  
  /**
   * Event subscriptions
   */
  onTaskCreated(callback: (task: Task) => void): void;
  onTaskUpdated(callback: (taskId: string, updates: Partial<Task>) => void): void;
  onTaskDeleted(callback: (taskId: string) => void): void;
  
  /**
   * Cleanup operations
   */
  clear(): Promise<boolean>;
  close(): Promise<void>;
}