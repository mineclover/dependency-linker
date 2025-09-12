/**
 * Task Repository Implementation
 * In-memory repository with file persistence support
 */

import { 
  Task, 
  TaskQueryOptions, 
  TaskBatch, 
  TaskStatistics, 
  TaskTemplate,
  TaskStatus,
  TaskPriority,
  TaskComplexity,
  TaskRisk,
  TaskPhase
} from '../types';
import { ITaskRepository } from '../interfaces/ITaskRepository';
import { promises as fs } from 'fs';
import * as path from 'path';

export class TaskRepository implements ITaskRepository {
  private tasks: Map<string, Task> = new Map();
  private batches: Map<string, TaskBatch> = new Map();
  private templates: Map<string, TaskTemplate> = new Map();
  private persistencePath?: string;
  private autoSave: boolean = true;

  // Event callbacks
  private onTaskCreatedCallbacks: Array<(task: Task) => void> = [];
  private onTaskUpdatedCallbacks: Array<(taskId: string, updates: Partial<Task>) => void> = [];
  private onTaskDeletedCallbacks: Array<(taskId: string) => void> = [];

  constructor(persistencePath?: string, autoSave = true) {
    this.persistencePath = persistencePath;
    this.autoSave = autoSave;
  }

  async create(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const id = this.generateId();
    const now = new Date();
    
    const task: Task = {
      ...taskData,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.tasks.set(id, task);
    
    if (this.autoSave) {
      await this.save();
    }

    this.onTaskCreatedCallbacks.forEach(callback => callback(task));
    return task;
  }

  async update(taskId: string, updates: Partial<Task>): Promise<Task> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    const updatedTask: Task = {
      ...task,
      ...updates,
      id: taskId, // Ensure ID cannot be changed
      createdAt: task.createdAt, // Preserve creation date
      updatedAt: new Date()
    };

    this.tasks.set(taskId, updatedTask);
    
    if (this.autoSave) {
      await this.save();
    }

    this.onTaskUpdatedCallbacks.forEach(callback => callback(taskId, updates));
    return updatedTask;
  }

  async delete(taskId: string): Promise<boolean> {
    const result = this.tasks.delete(taskId);
    
    if (result && this.autoSave) {
      await this.save();
    }

    if (result) {
      this.onTaskDeletedCallbacks.forEach(callback => callback(taskId));
    }

    return result;
  }

  async findById(taskId: string): Promise<Task | null> {
    return this.tasks.get(taskId) || null;
  }

  async findAll(options?: TaskQueryOptions): Promise<Task[]> {
    let tasks = Array.from(this.tasks.values());

    if (options?.filter) {
      tasks = this.applyFilters(tasks, options.filter);
    }

    if (options?.sort) {
      tasks = this.applySorting(tasks, options.sort);
    }

    if (options?.limit || options?.offset) {
      const offset = options.offset || 0;
      const limit = options.limit;
      tasks = limit ? tasks.slice(offset, offset + limit) : tasks.slice(offset);
    }

    return tasks;
  }

  async exists(taskId: string): Promise<boolean> {
    return this.tasks.has(taskId);
  }

  async createBatch(tasksData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Task[]> {
    const createdTasks: Task[] = [];
    
    for (const taskData of tasksData) {
      const task = await this.create(taskData);
      createdTasks.push(task);
    }

    return createdTasks;
  }

  async updateBatch(updates: Array<{ taskId: string; updates: Partial<Task> }>): Promise<Task[]> {
    const updatedTasks: Task[] = [];
    
    for (const { taskId, updates: taskUpdates } of updates) {
      const task = await this.update(taskId, taskUpdates);
      updatedTasks.push(task);
    }

    return updatedTasks;
  }

  async deleteBatch(taskIds: string[]): Promise<boolean> {
    let allDeleted = true;
    
    for (const taskId of taskIds) {
      const deleted = await this.delete(taskId);
      if (!deleted) {
        allDeleted = false;
      }
    }

    return allDeleted;
  }

  async saveBatch(batchData: Omit<TaskBatch, 'id'>): Promise<TaskBatch> {
    const id = this.generateId();
    const batch: TaskBatch = { ...batchData, id };
    
    this.batches.set(id, batch);
    
    if (this.autoSave) {
      await this.save();
    }

    return batch;
  }

  async getBatch(batchId: string): Promise<TaskBatch | null> {
    return this.batches.get(batchId) || null;
  }

  async deleteBatchDefinition(batchId: string): Promise<boolean> {
    const result = this.batches.delete(batchId);
    
    if (result && this.autoSave) {
      await this.save();
    }

    return result;
  }

  async getAllBatches(): Promise<TaskBatch[]> {
    return Array.from(this.batches.values());
  }

  async findByStatus(statuses: string[]): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => 
      statuses.includes(task.status)
    );
  }

  async findByPriority(priorities: string[]): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => 
      priorities.includes(task.priority)
    );
  }

  async findByPhase(phases: string[]): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => 
      phases.includes(task.phase)
    );
  }

  async findByTags(tags: string[]): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => 
      task.tags && task.tags.some(tag => tags.includes(tag))
    );
  }

  async findByDependency(dependencyTaskId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => 
      task.dependencies.some(dep => dep.taskId === dependencyTaskId)
    );
  }

  async getDependencies(taskId: string): Promise<Task[]> {
    const task = await this.findById(taskId);
    if (!task) return [];

    const dependencies: Task[] = [];
    for (const dep of task.dependencies) {
      const depTask = await this.findById(dep.taskId);
      if (depTask) {
        dependencies.push(depTask);
      }
    }

    return dependencies;
  }

  async getDependents(taskId: string): Promise<Task[]> {
    return this.findByDependency(taskId);
  }

  async getCriticalPath(): Promise<Task[]> {
    // Simplified critical path calculation
    // In a real implementation, this would use a proper critical path algorithm
    const tasks = Array.from(this.tasks.values());
    return tasks
      .filter(task => task.priority === TaskPriority.CRITICAL)
      .sort((a, b) => a.metrics.estimatedDuration - b.metrics.estimatedDuration);
  }

  async getParallelizableTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.isParallelizable);
  }

  async getStatistics(): Promise<TaskStatistics> {
    const tasks = Array.from(this.tasks.values());
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const inProgressTasks = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
    const blockedTasks = tasks.filter(t => t.status === TaskStatus.BLOCKED).length;

    const byPriority = {
      [TaskPriority.CRITICAL]: tasks.filter(t => t.priority === TaskPriority.CRITICAL).length,
      [TaskPriority.HIGH]: tasks.filter(t => t.priority === TaskPriority.HIGH).length,
      [TaskPriority.MEDIUM]: tasks.filter(t => t.priority === TaskPriority.MEDIUM).length,
      [TaskPriority.LOW]: tasks.filter(t => t.priority === TaskPriority.LOW).length
    };

    const byComplexity = {
      [TaskComplexity.SIMPLE]: tasks.filter(t => t.complexity === TaskComplexity.SIMPLE).length,
      [TaskComplexity.MODERATE]: tasks.filter(t => t.complexity === TaskComplexity.MODERATE).length,
      [TaskComplexity.COMPLEX]: tasks.filter(t => t.complexity === TaskComplexity.COMPLEX).length
    };

    const byRisk = {
      [TaskRisk.LOW]: tasks.filter(t => t.risk === TaskRisk.LOW).length,
      [TaskRisk.MEDIUM]: tasks.filter(t => t.risk === TaskRisk.MEDIUM).length,
      [TaskRisk.HIGH]: tasks.filter(t => t.risk === TaskRisk.HIGH).length
    };

    const byPhase = {
      [TaskPhase.FOUNDATION]: tasks.filter(t => t.phase === TaskPhase.FOUNDATION).length,
      [TaskPhase.CORE_LAYER]: tasks.filter(t => t.phase === TaskPhase.CORE_LAYER).length,
      [TaskPhase.API_LAYER]: tasks.filter(t => t.phase === TaskPhase.API_LAYER).length,
      [TaskPhase.INTEGRATION_TESTING]: tasks.filter(t => t.phase === TaskPhase.INTEGRATION_TESTING).length,
      [TaskPhase.PACKAGE_DISTRIBUTION]: tasks.filter(t => t.phase === TaskPhase.PACKAGE_DISTRIBUTION).length,
      [TaskPhase.FINAL_VALIDATION]: tasks.filter(t => t.phase === TaskPhase.FINAL_VALIDATION).length
    };

    const estimatedTotalHours = tasks.reduce((sum, task) => sum + task.metrics.estimatedDuration, 0);
    const actualTotalHours = tasks.reduce((sum, task) => sum + (task.metrics.actualDuration || 0), 0);
    const completedTasksWithActual = tasks.filter(t => t.status === TaskStatus.COMPLETED && t.metrics.actualDuration);
    const averageTaskDuration = completedTasksWithActual.length > 0
      ? completedTasksWithActual.reduce((sum, task) => sum + (task.metrics.actualDuration || 0), 0) / completedTasksWithActual.length
      : 0;

    const parallelizableTasksCount = tasks.filter(t => t.isParallelizable).length;
    const criticalPathLength = (await this.getCriticalPath()).length;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      byPriority,
      byComplexity,
      byRisk,
      byPhase,
      estimatedTotalHours,
      actualTotalHours,
      averageTaskDuration,
      parallelizableTasksCount,
      criticalPathLength
    };
  }

  async getTaskCount(): Promise<number> {
    return this.tasks.size;
  }

  async getCompletionRate(): Promise<number> {
    const totalTasks = this.tasks.size;
    if (totalTasks === 0) return 0;
    
    const completedTasks = Array.from(this.tasks.values())
      .filter(task => task.status === TaskStatus.COMPLETED).length;
    
    return (completedTasks / totalTasks) * 100;
  }

  async getAverageDuration(): Promise<number> {
    const completedTasks = Array.from(this.tasks.values())
      .filter(task => task.status === TaskStatus.COMPLETED && task.metrics.actualDuration);
    
    if (completedTasks.length === 0) return 0;
    
    const totalDuration = completedTasks.reduce((sum, task) => sum + (task.metrics.actualDuration || 0), 0);
    return totalDuration / completedTasks.length;
  }

  async search(query: string): Promise<Task[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.tasks.values()).filter(task =>
      task.title.toLowerCase().includes(lowercaseQuery) ||
      task.description.toLowerCase().includes(lowercaseQuery) ||
      (task.tags && task.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)))
    );
  }

  async searchByTitle(title: string): Promise<Task[]> {
    const lowercaseTitle = title.toLowerCase();
    return Array.from(this.tasks.values()).filter(task =>
      task.title.toLowerCase().includes(lowercaseTitle)
    );
  }

  async searchByDescription(description: string): Promise<Task[]> {
    const lowercaseDescription = description.toLowerCase();
    return Array.from(this.tasks.values()).filter(task =>
      task.description.toLowerCase().includes(lowercaseDescription)
    );
  }

  // Template operations
  async saveTemplate(template: TaskTemplate): Promise<TaskTemplate> {
    this.templates.set(template.id, template);
    
    if (this.autoSave) {
      await this.save();
    }

    return template;
  }

  async getTemplate(templateId: string): Promise<TaskTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  async getAllTemplates(): Promise<TaskTemplate[]> {
    return Array.from(this.templates.values());
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    const result = this.templates.delete(templateId);
    
    if (result && this.autoSave) {
      await this.save();
    }

    return result;
  }

  // Backup and restore
  async backup(): Promise<string> {
    const data = {
      tasks: Array.from(this.tasks.entries()),
      batches: Array.from(this.batches.entries()),
      templates: Array.from(this.templates.entries()),
      timestamp: new Date().toISOString()
    };

    return JSON.stringify(data, null, 2);
  }

  async restore(backupData: string): Promise<boolean> {
    try {
      const data = JSON.parse(backupData);
      
      this.tasks = new Map(data.tasks || []);
      this.batches = new Map(data.batches || []);
      this.templates = new Map(data.templates || []);
      
      if (this.autoSave) {
        await this.save();
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async validateData(): Promise<boolean> {
    // Basic validation - ensure all tasks have required fields
    for (const task of this.tasks.values()) {
      if (!task.id || !task.title || !task.status || !task.priority) {
        return false;
      }
    }
    return true;
  }

  async repair(): Promise<boolean> {
    // Basic repair - remove invalid tasks
    const validTasks = new Map<string, Task>();
    
    for (const [id, task] of this.tasks.entries()) {
      if (task.id && task.title && task.status && task.priority) {
        validTasks.set(id, task);
      }
    }

    this.tasks = validTasks;
    
    if (this.autoSave) {
      await this.save();
    }

    return true;
  }

  async optimize(): Promise<boolean> {
    // No-op for in-memory repository
    return true;
  }

  async getIndexes(): Promise<string[]> {
    return ['id', 'status', 'priority', 'phase'];
  }

  async rebuildIndexes(): Promise<boolean> {
    // No-op for in-memory repository
    return true;
  }

  // Transaction support (simplified for in-memory)
  async beginTransaction(): Promise<string> {
    return this.generateId();
  }

  async commitTransaction(transactionId: string): Promise<boolean> {
    // No-op for in-memory repository
    return true;
  }

  async rollbackTransaction(transactionId: string): Promise<boolean> {
    // No-op for in-memory repository
    return true;
  }

  // Event subscriptions
  onTaskCreated(callback: (task: Task) => void): void {
    this.onTaskCreatedCallbacks.push(callback);
  }

  onTaskUpdated(callback: (taskId: string, updates: Partial<Task>) => void): void {
    this.onTaskUpdatedCallbacks.push(callback);
  }

  onTaskDeleted(callback: (taskId: string) => void): void {
    this.onTaskDeletedCallbacks.push(callback);
  }

  async clear(): Promise<boolean> {
    this.tasks.clear();
    this.batches.clear();
    this.templates.clear();
    
    if (this.autoSave) {
      await this.save();
    }

    return true;
  }

  async close(): Promise<void> {
    if (this.autoSave) {
      await this.save();
    }
  }

  // Private helper methods
  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private applyFilters(tasks: Task[], filter: any): Task[] {
    return tasks.filter(task => {
      if (filter.status && !filter.status.includes(task.status)) return false;
      if (filter.priority && !filter.priority.includes(task.priority)) return false;
      if (filter.complexity && !filter.complexity.includes(task.complexity)) return false;
      if (filter.risk && !filter.risk.includes(task.risk)) return false;
      if (filter.phase && !filter.phase.includes(task.phase)) return false;
      if (filter.tags && (!task.tags || !filter.tags.some((tag: string) => task.tags!.includes(tag)))) return false;
      if (filter.assignee && task.assignee !== filter.assignee) return false;
      if (filter.isParallelizable !== undefined && task.isParallelizable !== filter.isParallelizable) return false;
      
      return true;
    });
  }

  private applySorting(tasks: Task[], sort: any): Task[] {
    return tasks.sort((a, b) => {
      let comparison = 0;
      
      switch (sort.field) {
        case 'priority':
          const priorityOrder = { [TaskPriority.CRITICAL]: 4, [TaskPriority.HIGH]: 3, [TaskPriority.MEDIUM]: 2, [TaskPriority.LOW]: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'complexity':
          const complexityOrder = { [TaskComplexity.COMPLEX]: 3, [TaskComplexity.MODERATE]: 2, [TaskComplexity.SIMPLE]: 1 };
          comparison = complexityOrder[a.complexity] - complexityOrder[b.complexity];
          break;
        case 'estimatedDuration':
          comparison = a.metrics.estimatedDuration - b.metrics.estimatedDuration;
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'updatedAt':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
        default:
          comparison = 0;
      }

      return sort.direction === 'desc' ? -comparison : comparison;
    });
  }

  private async save(): Promise<void> {
    if (!this.persistencePath) return;

    const backupData = await this.backup();
    await fs.mkdir(path.dirname(this.persistencePath), { recursive: true });
    await fs.writeFile(this.persistencePath, backupData, 'utf8');
  }

  async load(): Promise<void> {
    if (!this.persistencePath) return;

    try {
      const data = await fs.readFile(this.persistencePath, 'utf8');
      await this.restore(data);
    } catch (error) {
      // File doesn't exist or can't be read - start with empty state
    }
  }
}