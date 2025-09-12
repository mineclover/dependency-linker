/**
 * Task Validator
 * Comprehensive validation system for tasks and task operations
 */

import {
	type Task,
	type TaskBatch,
	TaskComplexity,
	type TaskExecutionContext,
	TaskPhase,
	TaskPriority,
	TaskRisk,
	TaskStatus,
	type ValidationResult,
} from "../types";

export class TaskValidator {
	/**
	 * Validate a complete task object
	 */
	static validateTask(task: Task): ValidationResult[] {
		const results: ValidationResult[] = [];

		// Basic field validation
		results.push(...TaskValidator.validateBasicFields(task));

		// Business logic validation
		results.push(...TaskValidator.validateBusinessRules(task));

		// Dependency validation
		results.push(...TaskValidator.validateDependencies(task));

		// Metrics validation
		results.push(...TaskValidator.validateMetrics(task));

		// Implementation tasks validation
		results.push(...TaskValidator.validateImplementationTasks(task));

		return results;
	}

	/**
	 * Validate task creation data
	 */
	static validateTaskCreation(
		taskData: Omit<Task, "id" | "createdAt" | "updatedAt">,
	): ValidationResult[] {
		const results: ValidationResult[] = [];

		// Required fields
		if (!taskData.title || taskData.title.trim().length === 0) {
			results.push({
				criterion: { description: "Task title is required", required: true },
				passed: false,
				message: "Task title cannot be empty",
			});
		}

		if (!taskData.description || taskData.description.trim().length === 0) {
			results.push({
				criterion: {
					description: "Task description is required",
					required: true,
				},
				passed: false,
				message: "Task description cannot be empty",
			});
		}

		// Title length validation
		if (taskData.title && taskData.title.length > 200) {
			results.push({
				criterion: {
					description: "Task title should be under 200 characters",
					required: false,
				},
				passed: false,
				message: `Task title is too long: ${taskData.title.length} characters (max: 200)`,
			});
		}

		// Description length validation
		if (taskData.description && taskData.description.length > 2000) {
			results.push({
				criterion: {
					description: "Task description should be under 2000 characters",
					required: false,
				},
				passed: false,
				message: `Task description is too long: ${taskData.description.length} characters (max: 2000)`,
			});
		}

		// Enum validation
		if (!Object.values(TaskPriority).includes(taskData.priority)) {
			results.push({
				criterion: {
					description: "Valid task priority is required",
					required: true,
				},
				passed: false,
				message: `Invalid priority: ${taskData.priority}`,
			});
		}

		if (!Object.values(TaskComplexity).includes(taskData.complexity)) {
			results.push({
				criterion: {
					description: "Valid task complexity is required",
					required: true,
				},
				passed: false,
				message: `Invalid complexity: ${taskData.complexity}`,
			});
		}

		if (!Object.values(TaskRisk).includes(taskData.risk)) {
			results.push({
				criterion: {
					description: "Valid task risk is required",
					required: true,
				},
				passed: false,
				message: `Invalid risk: ${taskData.risk}`,
			});
		}

		if (!Object.values(TaskPhase).includes(taskData.phase)) {
			results.push({
				criterion: {
					description: "Valid task phase is required",
					required: true,
				},
				passed: false,
				message: `Invalid phase: ${taskData.phase}`,
			});
		}

		// Duration validation
		if (taskData.estimatedDuration <= 0) {
			results.push({
				criterion: {
					description: "Estimated duration must be positive",
					required: true,
				},
				passed: false,
				message: `Invalid estimated duration: ${taskData.estimatedDuration}`,
			});
		}

		if (taskData.estimatedDuration > 1000) {
			results.push({
				criterion: {
					description: "Estimated duration should be reasonable",
					required: false,
				},
				passed: false,
				message: `Estimated duration seems too high: ${taskData.estimatedDuration} hours`,
			});
		}

		return results;
	}

	/**
	 * Validate task status transition
	 */
	static validateStatusTransition(
		currentStatus: TaskStatus,
		newStatus: TaskStatus,
		_taskId: string,
	): ValidationResult {
		const validTransitions: Record<TaskStatus, TaskStatus[]> = {
			[TaskStatus.PENDING]: [
				TaskStatus.IN_PROGRESS,
				TaskStatus.BLOCKED,
				TaskStatus.CANCELLED,
			],
			[TaskStatus.IN_PROGRESS]: [
				TaskStatus.COMPLETED,
				TaskStatus.BLOCKED,
				TaskStatus.CANCELLED,
				TaskStatus.PENDING,
			],
			[TaskStatus.BLOCKED]: [TaskStatus.PENDING, TaskStatus.CANCELLED],
			[TaskStatus.COMPLETED]: [], // Completed tasks cannot transition
			[TaskStatus.CANCELLED]: [TaskStatus.PENDING], // Allow restarting cancelled tasks
		};

		const allowedTransitions = validTransitions[currentStatus] || [];
		const isValid = allowedTransitions.includes(newStatus);

		return {
			criterion: {
				description: `Status transition from ${currentStatus} to ${newStatus} must be valid`,
				required: true,
			},
			passed: isValid,
			message: isValid
				? `Valid status transition: ${currentStatus} -> ${newStatus}`
				: `Invalid status transition: ${currentStatus} -> ${newStatus}. Allowed: ${allowedTransitions.join(", ")}`,
		};
	}

	/**
	 * Validate task execution context
	 */
	static validateExecutionContext(
		context: TaskExecutionContext,
	): ValidationResult[] {
		const results: ValidationResult[] = [];

		// Working directory validation
		if (
			!context.workingDirectory ||
			context.workingDirectory.trim().length === 0
		) {
			results.push({
				criterion: {
					description: "Working directory is required",
					required: true,
				},
				passed: false,
				message: "Working directory cannot be empty",
			});
		}

		// Timeout validation
		if (context.timeout !== undefined) {
			if (context.timeout <= 0) {
				results.push({
					criterion: {
						description: "Timeout must be positive",
						required: true,
					},
					passed: false,
					message: `Invalid timeout: ${context.timeout}`,
				});
			}

			if (context.timeout > 24 * 60 * 60 * 1000) {
				// 24 hours
				results.push({
					criterion: {
						description: "Timeout should be reasonable",
						required: false,
					},
					passed: false,
					message: `Timeout seems too high: ${context.timeout}ms`,
				});
			}
		}

		// Retry count validation
		if (context.retryCount !== undefined && context.retryCount < 0) {
			results.push({
				criterion: {
					description: "Retry count must be non-negative",
					required: true,
				},
				passed: false,
				message: `Invalid retry count: ${context.retryCount}`,
			});
		}

		if (context.maxRetries !== undefined && context.maxRetries < 0) {
			results.push({
				criterion: {
					description: "Max retries must be non-negative",
					required: true,
				},
				passed: false,
				message: `Invalid max retries: ${context.maxRetries}`,
			});
		}

		if (context.retryCount !== undefined && context.maxRetries !== undefined) {
			if (context.retryCount > context.maxRetries) {
				results.push({
					criterion: {
						description: "Retry count should not exceed max retries",
						required: true,
					},
					passed: false,
					message: `Retry count (${context.retryCount}) exceeds max retries (${context.maxRetries})`,
				});
			}
		}

		return results;
	}

	/**
	 * Validate task batch
	 */
	static validateTaskBatch(batch: TaskBatch): ValidationResult[] {
		const results: ValidationResult[] = [];

		// Basic validation
		if (!batch.name || batch.name.trim().length === 0) {
			results.push({
				criterion: { description: "Batch name is required", required: true },
				passed: false,
				message: "Batch name cannot be empty",
			});
		}

		if (!batch.tasks || batch.tasks.length === 0) {
			results.push({
				criterion: { description: "Batch must contain tasks", required: true },
				passed: false,
				message: "Batch cannot be empty",
			});
		}

		// Validate individual tasks
		if (batch.tasks) {
			batch.tasks.forEach((task, index) => {
				const taskResults = TaskValidator.validateTask(task);
				const failedResults = taskResults.filter((result) => !result.passed);

				if (failedResults.length > 0) {
					results.push({
						criterion: {
							description: `Task ${index + 1} in batch must be valid`,
							required: true,
						},
						passed: false,
						message: `Task ${task.id} has validation errors: ${failedResults.length} failed criteria`,
					});
				}
			});
		}

		// Parallelizable validation
		if (batch.parallelizable && batch.maxConcurrency !== undefined) {
			if (batch.maxConcurrency <= 0) {
				results.push({
					criterion: {
						description:
							"Max concurrency must be positive for parallelizable batches",
						required: true,
					},
					passed: false,
					message: `Invalid max concurrency: ${batch.maxConcurrency}`,
				});
			}

			if (batch.maxConcurrency > 20) {
				results.push({
					criterion: {
						description: "Max concurrency should be reasonable",
						required: false,
					},
					passed: false,
					message: `Max concurrency seems too high: ${batch.maxConcurrency}`,
				});
			}
		}

		return results;
	}

	/**
	 * Validate task dependencies for circular references
	 */
	static async validateCircularDependencies(
		taskId: string,
		_dependencies: string[],
		getDependenciesFunc: (id: string) => Promise<string[]>,
	): Promise<ValidationResult> {
		const visited = new Set<string>();
		const recursionStack = new Set<string>();

		const hasCircularDependency = async (
			currentId: string,
			path: string[],
		): Promise<string[] | null> => {
			if (recursionStack.has(currentId)) {
				return [...path, currentId]; // Return the circular path
			}

			if (visited.has(currentId)) {
				return null;
			}

			visited.add(currentId);
			recursionStack.add(currentId);

			try {
				const deps = await getDependenciesFunc(currentId);

				for (const depId of deps) {
					const circularPath = await hasCircularDependency(depId, [
						...path,
						currentId,
					]);
					if (circularPath) {
						return circularPath;
					}
				}
			} catch (_error) {
				// If we can't get dependencies, assume no circular dependency
			}

			recursionStack.delete(currentId);
			return null;
		};

		try {
			const circularPath = await hasCircularDependency(taskId, []);

			return {
				criterion: {
					description: "Task dependencies must not create circular references",
					required: true,
				},
				passed: !circularPath,
				message: circularPath
					? `Circular dependency detected: ${circularPath.join(" -> ")}`
					: "No circular dependencies found",
			};
		} catch (error) {
			return {
				criterion: {
					description: "Task dependencies must not create circular references",
					required: true,
				},
				passed: false,
				message: `Error validating dependencies: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * Private validation methods
	 */
	private static validateBasicFields(task: Task): ValidationResult[] {
		const results: ValidationResult[] = [];

		// ID validation
		if (!task.id || task.id.trim().length === 0) {
			results.push({
				criterion: { description: "Task ID is required", required: true },
				passed: false,
				message: "Task ID cannot be empty",
			});
		}

		// Title validation
		if (!task.title || task.title.trim().length === 0) {
			results.push({
				criterion: { description: "Task title is required", required: true },
				passed: false,
				message: "Task title cannot be empty",
			});
		} else if (task.title.length > 200) {
			results.push({
				criterion: {
					description: "Task title should be concise",
					required: false,
				},
				passed: false,
				message: `Task title is too long: ${task.title.length} characters`,
			});
		} else {
			results.push({
				criterion: { description: "Task title is valid", required: true },
				passed: true,
				message: "Task title is valid",
			});
		}

		// Description validation
		if (!task.description || task.description.trim().length === 0) {
			results.push({
				criterion: {
					description: "Task description is required",
					required: true,
				},
				passed: false,
				message: "Task description cannot be empty",
			});
		} else {
			results.push({
				criterion: { description: "Task description is valid", required: true },
				passed: true,
				message: "Task description is valid",
			});
		}

		return results;
	}

	private static validateBusinessRules(task: Task): ValidationResult[] {
		const results: ValidationResult[] = [];

		// Priority-complexity alignment
		if (
			task.priority === TaskPriority.CRITICAL &&
			task.complexity === TaskComplexity.SIMPLE
		) {
			results.push({
				criterion: {
					description: "Critical tasks should typically be more complex",
					required: false,
				},
				passed: false,
				message:
					"Critical priority with simple complexity may indicate incorrect prioritization",
			});
		}

		if (
			task.priority === TaskPriority.LOW &&
			task.complexity === TaskComplexity.COMPLEX
		) {
			results.push({
				criterion: {
					description: "Complex tasks should typically have higher priority",
					required: false,
				},
				passed: false,
				message:
					"Low priority with complex task may indicate incorrect prioritization",
			});
		}

		// Risk-complexity alignment
		if (
			task.risk === TaskRisk.HIGH &&
			task.complexity === TaskComplexity.SIMPLE
		) {
			results.push({
				criterion: {
					description: "High-risk tasks should typically be more complex",
					required: false,
				},
				passed: false,
				message:
					"High risk with simple complexity may indicate incomplete risk assessment",
			});
		}

		// Status-progress alignment
		if (
			task.status === TaskStatus.COMPLETED &&
			task.metrics.completionPercentage < 100
		) {
			results.push({
				criterion: {
					description: "Completed tasks should have 100% completion",
					required: true,
				},
				passed: false,
				message: `Completed task has ${task.metrics.completionPercentage}% completion`,
			});
		}

		if (
			task.status === TaskStatus.PENDING &&
			task.metrics.completionPercentage > 0
		) {
			results.push({
				criterion: {
					description: "Pending tasks should have 0% completion",
					required: false,
				},
				passed: false,
				message: `Pending task has ${task.metrics.completionPercentage}% completion`,
			});
		}

		return results;
	}

	private static validateDependencies(task: Task): ValidationResult[] {
		const results: ValidationResult[] = [];

		// Self-dependency check
		const selfDependency = task.dependencies.find(
			(dep) => dep.taskId === task.id,
		);
		if (selfDependency) {
			results.push({
				criterion: {
					description: "Task cannot depend on itself",
					required: true,
				},
				passed: false,
				message: "Self-dependency detected",
			});
		}

		// Duplicate dependency check
		const dependencyIds = task.dependencies.map((dep) => dep.taskId);
		const uniqueDependencyIds = new Set(dependencyIds);
		if (dependencyIds.length !== uniqueDependencyIds.size) {
			results.push({
				criterion: {
					description: "Task dependencies should be unique",
					required: true,
				},
				passed: false,
				message: "Duplicate dependencies detected",
			});
		}

		// Dependency type validation
		task.dependencies.forEach((dep, index) => {
			if (!["blocks", "requires", "optional"].includes(dep.type)) {
				results.push({
					criterion: {
						description: `Dependency ${index + 1} type must be valid`,
						required: true,
					},
					passed: false,
					message: `Invalid dependency type: ${dep.type}`,
				});
			}
		});

		return results;
	}

	private static validateMetrics(task: Task): ValidationResult[] {
		const results: ValidationResult[] = [];

		// Completion percentage validation
		if (
			task.metrics.completionPercentage < 0 ||
			task.metrics.completionPercentage > 100
		) {
			results.push({
				criterion: {
					description: "Completion percentage must be between 0 and 100",
					required: true,
				},
				passed: false,
				message: `Invalid completion percentage: ${task.metrics.completionPercentage}%`,
			});
		}

		// Duration validation
		if (task.metrics.estimatedDuration <= 0) {
			results.push({
				criterion: {
					description: "Estimated duration must be positive",
					required: true,
				},
				passed: false,
				message: `Invalid estimated duration: ${task.metrics.estimatedDuration}`,
			});
		}

		if (
			task.metrics.actualDuration !== undefined &&
			task.metrics.actualDuration < 0
		) {
			results.push({
				criterion: {
					description: "Actual duration must be non-negative",
					required: true,
				},
				passed: false,
				message: `Invalid actual duration: ${task.metrics.actualDuration}`,
			});
		}

		// Time consistency validation
		if (task.metrics.startTime && task.metrics.endTime) {
			if (task.metrics.startTime >= task.metrics.endTime) {
				results.push({
					criterion: {
						description: "End time must be after start time",
						required: true,
					},
					passed: false,
					message: "Invalid time range: end time is not after start time",
				});
			}
		}

		return results;
	}

	private static validateImplementationTasks(task: Task): ValidationResult[] {
		const results: ValidationResult[] = [];

		if (task.implementationTasks.length === 0) {
			results.push({
				criterion: {
					description: "Task should have implementation steps",
					required: false,
				},
				passed: false,
				message: "No implementation tasks defined",
			});
		}

		// Check for empty implementation tasks
		task.implementationTasks.forEach((impl, index) => {
			if (!impl.description || impl.description.trim().length === 0) {
				results.push({
					criterion: {
						description: `Implementation task ${index + 1} should have description`,
						required: true,
					},
					passed: false,
					message: `Implementation task ${index + 1} has no description`,
				});
			}
		});

		// Check completion consistency
		const completedTasks = task.implementationTasks.filter(
			(impl) => impl.completed,
		);
		const completionRate =
			(completedTasks.length / task.implementationTasks.length) * 100;

		if (Math.abs(completionRate - task.metrics.completionPercentage) > 10) {
			results.push({
				criterion: {
					description:
						"Implementation task completion should align with overall progress",
					required: false,
				},
				passed: false,
				message: `Implementation completion (${completionRate.toFixed(1)}%) differs significantly from overall progress (${task.metrics.completionPercentage}%)`,
			});
		}

		return results;
	}

	/**
	 * Utility method to check if all validation results passed
	 */
	static allValidationsPassed(results: ValidationResult[]): boolean {
		return results.every((result) => result.passed);
	}

	/**
	 * Get only failed validation results
	 */
	static getFailedValidations(results: ValidationResult[]): ValidationResult[] {
		return results.filter((result) => !result.passed);
	}

	/**
	 * Get validation summary
	 */
	static getValidationSummary(results: ValidationResult[]): {
		total: number;
		passed: number;
		failed: number;
		passRate: number;
	} {
		const total = results.length;
		const passed = results.filter((result) => result.passed).length;
		const failed = total - passed;
		const passRate = total > 0 ? (passed / total) * 100 : 0;

		return { total, passed, failed, passRate };
	}
}
