/**
 * Task Management Types
 * Defines comprehensive types for task management system based on specs/tasks.md
 */

/**
 * Task Priority Levels
 */
export enum TaskPriority {
  CRITICAL = 'Critical',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

/**
 * Task Complexity Levels
 */
export enum TaskComplexity {
  SIMPLE = 'Simple',
  MODERATE = 'Moderate',
  COMPLEX = 'Complex'
}

/**
 * Task Risk Levels
 */
export enum TaskRisk {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

/**
 * Task Status
 */
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled'
}

/**
 * Task Phase
 */
export enum TaskPhase {
  FOUNDATION = 'Foundation & Validation',
  CORE_LAYER = 'Core Layer Implementation',
  API_LAYER = 'API Layer Implementation',
  INTEGRATION_TESTING = 'Integration & Testing',
  PACKAGE_DISTRIBUTION = 'Package & Distribution',
  FINAL_VALIDATION = 'Final Validation & Release'
}

/**
 * Task Dependencies
 */
export interface TaskDependency {
  taskId: string;
  type: 'blocks' | 'requires' | 'optional';
  description?: string;
}

/**
 * Task Validation Criteria
 */
export interface ValidationCriteria {
  description: string;
  metric?: string;
  threshold?: number | string;
  required: boolean;
}

/**
 * Task Risk Mitigation
 */
export interface RiskMitigation {
  description: string;
  strategy: string;
  contingency?: string;
}

/**
 * Task Implementation Details
 */
export interface TaskImplementation {
  description: string;
  completed: boolean;
  evidence?: string;
  notes?: string;
}

/**
 * Task Performance Metrics
 */
export interface TaskMetrics {
  estimatedDuration: number; // in hours
  actualDuration?: number; // in hours
  startTime?: Date;
  endTime?: Date;
  completionPercentage: number;
  resourcesUsed?: string[];
}

/**
 * Core Task Definition
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  complexity: TaskComplexity;
  risk: TaskRisk;
  status: TaskStatus;
  phase: TaskPhase;
  
  // Dependencies
  dependencies: TaskDependency[];
  blocks?: string[]; // Task IDs that this task blocks
  
  // Execution details
  files: string[];
  estimatedDuration: number; // in hours
  isParallelizable: boolean;
  
  // Validation
  validationCriteria: ValidationCriteria[];
  riskMitigation: RiskMitigation[];
  
  // Implementation
  implementationTasks: TaskImplementation[];
  
  // Metrics
  metrics: TaskMetrics;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  assignee?: string;
  tags?: string[];
}

/**
 * Task Execution Context
 */
export interface TaskExecutionContext {
  taskId: string;
  environment: string;
  workingDirectory: string;
  environmentVariables?: Record<string, string>;
  timeout?: number;
  retryCount?: number;
  maxRetries?: number;
}

/**
 * Task Execution Result
 */
export interface TaskExecutionResult {
  taskId: string;
  status: TaskStatus;
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number;
  output?: string;
  error?: string;
  validationResults: ValidationResult[];
  metrics?: Record<string, any>;
}

/**
 * Validation Result
 */
export interface ValidationResult {
  criterion: ValidationCriteria;
  passed: boolean;
  actualValue?: any;
  message?: string;
  evidence?: string;
}

/**
 * Task Progress Information
 */
export interface TaskProgress {
  taskId: string;
  status: TaskStatus;
  completionPercentage: number;
  currentStep?: string;
  stepsCompleted: number;
  totalSteps: number;
  estimatedTimeRemaining?: number;
  message?: string;
}

/**
 * Task Batch for parallel execution
 */
export interface TaskBatch {
  id: string;
  name: string;
  tasks: Task[];
  parallelizable: boolean;
  maxConcurrency?: number;
  dependencies: string[]; // Other batch IDs this depends on
}

/**
 * Task Filter Options
 */
export interface TaskFilterOptions {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  complexity?: TaskComplexity[];
  risk?: TaskRisk[];
  phase?: TaskPhase[];
  tags?: string[];
  assignee?: string;
  isParallelizable?: boolean;
  hasBlockingDependencies?: boolean;
}

/**
 * Task Sort Options
 */
export interface TaskSortOptions {
  field: 'priority' | 'complexity' | 'risk' | 'estimatedDuration' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
}

/**
 * Task Query Options
 */
export interface TaskQueryOptions {
  filter?: TaskFilterOptions;
  sort?: TaskSortOptions;
  limit?: number;
  offset?: number;
}

/**
 * Task Statistics
 */
export interface TaskStatistics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  
  byPriority: Record<TaskPriority, number>;
  byComplexity: Record<TaskComplexity, number>;
  byRisk: Record<TaskRisk, number>;
  byPhase: Record<TaskPhase, number>;
  
  estimatedTotalHours: number;
  actualTotalHours: number;
  averageTaskDuration: number;
  
  parallelizableTasksCount: number;
  criticalPathLength: number;
}

/**
 * Task Template for creating common task types
 */
export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  defaultPriority: TaskPriority;
  defaultComplexity: TaskComplexity;
  defaultRisk: TaskRisk;
  defaultPhase: TaskPhase;
  defaultEstimatedDuration: number;
  defaultValidationCriteria: ValidationCriteria[];
  defaultImplementationTasks: Omit<TaskImplementation, 'completed'>[];
  defaultRiskMitigation: RiskMitigation[];
}