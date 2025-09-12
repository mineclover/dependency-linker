/**
 * Task API Test Suite
 * Comprehensive tests for the Task Management API
 */

import { TaskNotFoundError, TaskValidationError } from "../errors/TaskError";
import { TaskAPI } from "../TaskAPI";
import {
	TaskComplexity,
	TaskPhase,
	TaskPriority,
	TaskRisk,
	TaskStatus,
} from "../types";

describe("TaskAPI", () => {
	let taskAPI: TaskAPI;

	beforeEach(() => {
		taskAPI = new TaskAPI({
			enableValidation: true,
			autoSave: false,
		});
	});

	afterEach(async () => {
		await taskAPI.clearState();
	});

	describe("Task CRUD Operations", () => {
		describe("createTask", () => {
			it("should create a valid task", async () => {
				const taskData = {
					title: "Test Task",
					description: "A test task for validation",
					priority: TaskPriority.HIGH,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.PENDING,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: ["test.ts"],
					estimatedDuration: 2,
					isParallelizable: true,
					validationCriteria: [
						{ description: "Task should be completable", required: true },
					],
					riskMitigation: [
						{ description: "Test thoroughly", strategy: "Unit testing" },
					],
					implementationTasks: [
						{ description: "Implement feature", completed: false },
					],
					metrics: {
						estimatedDuration: 2,
						completionPercentage: 0,
					},
				};

				const task = await taskAPI.createTask(taskData);

				expect(task).toBeDefined();
				expect(task.id).toBeDefined();
				expect(task.title).toBe(taskData.title);
				expect(task.status).toBe(TaskStatus.PENDING);
				expect(task.createdAt).toBeDefined();
				expect(task.updatedAt).toBeDefined();
			});

			it("should reject task creation with empty title", async () => {
				const taskData = {
					title: "",
					description: "A test task",
					priority: TaskPriority.HIGH,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.PENDING,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 2,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 2,
						completionPercentage: 0,
					},
				};

				await expect(taskAPI.createTask(taskData)).rejects.toThrow(
					TaskValidationError,
				);
			});

			it("should reject task creation with invalid estimated duration", async () => {
				const taskData = {
					title: "Test Task",
					description: "A test task",
					priority: TaskPriority.HIGH,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.PENDING,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: -1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: -1,
						completionPercentage: 0,
					},
				};

				await expect(taskAPI.createTask(taskData)).rejects.toThrow(
					TaskValidationError,
				);
			});
		});

		describe("getTask", () => {
			it("should retrieve an existing task", async () => {
				const taskData = {
					title: "Test Task",
					description: "A test task",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.PENDING,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 0,
					},
				};

				const createdTask = await taskAPI.createTask(taskData);
				const retrievedTask = await taskAPI.getTask(createdTask.id);

				expect(retrievedTask).toEqual(createdTask);
			});

			it("should throw TaskNotFoundError for non-existent task", async () => {
				await expect(taskAPI.getTask("non-existent-id")).rejects.toThrow(
					TaskNotFoundError,
				);
			});
		});

		describe("updateTask", () => {
			it("should update task fields", async () => {
				const task = await taskAPI.createTask({
					title: "Original Title",
					description: "Original description",
					priority: TaskPriority.LOW,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.PENDING,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 0,
					},
				});

				const updatedTask = await taskAPI.updateTask(task.id, {
					title: "Updated Title",
					priority: TaskPriority.HIGH,
				});

				expect(updatedTask.title).toBe("Updated Title");
				expect(updatedTask.priority).toBe(TaskPriority.HIGH);
				expect(updatedTask.updatedAt.getTime()).toBeGreaterThan(
					task.updatedAt.getTime(),
				);
			});

			it("should validate status transitions", async () => {
				const task = await taskAPI.createTask({
					title: "Test Task",
					description: "Test description",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.COMPLETED,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 100,
					},
				});

				// Completed tasks cannot transition to in-progress
				await expect(
					taskAPI.updateTask(task.id, { status: TaskStatus.IN_PROGRESS }),
				).rejects.toThrow(TaskValidationError);
			});
		});

		describe("deleteTask", () => {
			it("should delete an existing task", async () => {
				const task = await taskAPI.createTask({
					title: "Task to Delete",
					description: "This task will be deleted",
					priority: TaskPriority.LOW,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.PENDING,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 0,
					},
				});

				const deleted = await taskAPI.deleteTask(task.id);
				expect(deleted).toBe(true);

				await expect(taskAPI.getTask(task.id)).rejects.toThrow(
					TaskNotFoundError,
				);
			});

			it("should prevent deletion of task with dependents", async () => {
				const parentTask = await taskAPI.createTask({
					title: "Parent Task",
					description: "Parent task",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.PENDING,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 0,
					},
				});

				const _childTask = await taskAPI.createTask({
					title: "Child Task",
					description: "Child task",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.PENDING,
					phase: TaskPhase.FOUNDATION,
					dependencies: [{ taskId: parentTask.id, type: "requires" }],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 0,
					},
				});

				await expect(taskAPI.deleteTask(parentTask.id)).rejects.toThrow();
			});
		});

		describe("getTasks", () => {
			it("should return all tasks when no filter is provided", async () => {
				const task1 = await taskAPI.createTask({
					title: "Task 1",
					description: "First task",
					priority: TaskPriority.HIGH,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.PENDING,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 0,
					},
				});

				const task2 = await taskAPI.createTask({
					title: "Task 2",
					description: "Second task",
					priority: TaskPriority.LOW,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.COMPLETED,
					phase: TaskPhase.CORE_LAYER,
					dependencies: [],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 100,
					},
				});

				const tasks = await taskAPI.getTasks();
				expect(tasks).toHaveLength(2);
				expect(tasks.map((t) => t.id)).toContain(task1.id);
				expect(tasks.map((t) => t.id)).toContain(task2.id);
			});

			it("should filter tasks by status", async () => {
				await taskAPI.createTask({
					title: "Pending Task",
					description: "Pending task",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.PENDING,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 0,
					},
				});

				await taskAPI.createTask({
					title: "Completed Task",
					description: "Completed task",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.COMPLETED,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 100,
					},
				});

				const pendingTasks = await taskAPI.getTasks({
					filter: { status: [TaskStatus.PENDING] },
				});

				expect(pendingTasks).toHaveLength(1);
				expect(pendingTasks[0].status).toBe(TaskStatus.PENDING);
			});
		});
	});

	describe("Task Execution", () => {
		describe("startTask", () => {
			it("should start a task without dependencies", async () => {
				const task = await taskAPI.createTask({
					title: "Startable Task",
					description: "Task that can be started",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.PENDING,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 0,
					},
				});

				const result = await taskAPI.startTask(task.id);

				expect(result).toBeDefined();
				expect(result.taskId).toBe(task.id);
				expect(result.success).toBe(true);
				expect(result.startTime).toBeDefined();
				expect(result.endTime).toBeDefined();
			});

			it("should not start task with unresolved dependencies", async () => {
				const dependencyTask = await taskAPI.createTask({
					title: "Dependency Task",
					description: "Required dependency",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.PENDING,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 0,
					},
				});

				const mainTask = await taskAPI.createTask({
					title: "Main Task",
					description: "Task with dependencies",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.PENDING,
					phase: TaskPhase.FOUNDATION,
					dependencies: [{ taskId: dependencyTask.id, type: "requires" }],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 0,
					},
				});

				await expect(taskAPI.startTask(mainTask.id)).rejects.toThrow();
			});
		});

		describe("completeTask", () => {
			it("should complete a task manually", async () => {
				const task = await taskAPI.createTask({
					title: "Task to Complete",
					description: "This task will be completed manually",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.IN_PROGRESS,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 50,
					},
				});

				const result = await taskAPI.completeTask(task.id);

				expect(result.success).toBe(true);
				expect(result.status).toBe(TaskStatus.COMPLETED);

				const updatedTask = await taskAPI.getTask(task.id);
				expect(updatedTask.status).toBe(TaskStatus.COMPLETED);
				expect(updatedTask.metrics.completionPercentage).toBe(100);
			});
		});

		describe("cancelTask", () => {
			it("should cancel a task", async () => {
				const task = await taskAPI.createTask({
					title: "Task to Cancel",
					description: "This task will be cancelled",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.IN_PROGRESS,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 30,
					},
				});

				const cancelled = await taskAPI.cancelTask(
					task.id,
					"Test cancellation",
				);

				expect(cancelled).toBe(true);

				const updatedTask = await taskAPI.getTask(task.id);
				expect(updatedTask.status).toBe(TaskStatus.CANCELLED);
			});
		});
	});

	describe("Dependency Management", () => {
		describe("addDependency", () => {
			it("should add a dependency between tasks", async () => {
				const task1 = await taskAPI.createTask({
					title: "Task 1",
					description: "First task",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.PENDING,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 0,
					},
				});

				const task2 = await taskAPI.createTask({
					title: "Task 2",
					description: "Second task",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.PENDING,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 0,
					},
				});

				const added = await taskAPI.addDependency(
					task2.id,
					task1.id,
					"requires",
				);

				expect(added).toBe(true);

				const dependencies = await taskAPI.getDependencies(task2.id);
				expect(dependencies).toHaveLength(1);
				expect(dependencies[0].id).toBe(task1.id);
			});

			it("should prevent circular dependencies", async () => {
				const task1 = await taskAPI.createTask({
					title: "Task 1",
					description: "First task",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.PENDING,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 0,
					},
				});

				const task2 = await taskAPI.createTask({
					title: "Task 2",
					description: "Second task",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.PENDING,
					phase: TaskPhase.FOUNDATION,
					dependencies: [{ taskId: task1.id, type: "requires" }],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 0,
					},
				});

				// Trying to make task1 depend on task2 would create a circular dependency
				await expect(
					taskAPI.addDependency(task1.id, task2.id, "requires"),
				).rejects.toThrow();
			});
		});

		describe("canStartTask", () => {
			it("should return true for task without dependencies", async () => {
				const task = await taskAPI.createTask({
					title: "Independent Task",
					description: "Task without dependencies",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.PENDING,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 0,
					},
				});

				const canStart = await taskAPI.canStartTask(task.id);
				expect(canStart).toBe(true);
			});

			it("should return false for task with incomplete dependencies", async () => {
				const dependencyTask = await taskAPI.createTask({
					title: "Dependency Task",
					description: "Required dependency",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.PENDING,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 0,
					},
				});

				const mainTask = await taskAPI.createTask({
					title: "Main Task",
					description: "Task with dependencies",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.PENDING,
					phase: TaskPhase.FOUNDATION,
					dependencies: [{ taskId: dependencyTask.id, type: "requires" }],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 0,
					},
				});

				const canStart = await taskAPI.canStartTask(mainTask.id);
				expect(canStart).toBe(false);
			});
		});
	});

	describe("Progress Tracking", () => {
		describe("getTaskProgress", () => {
			it("should return current task progress", async () => {
				const task = await taskAPI.createTask({
					title: "Progress Task",
					description: "Task for progress tracking",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.IN_PROGRESS,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [
						{ description: "Step 1", completed: true },
						{ description: "Step 2", completed: false },
						{ description: "Step 3", completed: false },
					],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 50,
					},
				});

				const progress = await taskAPI.getTaskProgress(task.id);

				expect(progress.taskId).toBe(task.id);
				expect(progress.status).toBe(TaskStatus.IN_PROGRESS);
				expect(progress.completionPercentage).toBe(50);
				expect(progress.stepsCompleted).toBe(1);
				expect(progress.totalSteps).toBe(3);
			});
		});

		describe("updateTaskProgress", () => {
			it("should update task progress", async () => {
				const task = await taskAPI.createTask({
					title: "Updateable Task",
					description: "Task with updateable progress",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.IN_PROGRESS,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 25,
					},
				});

				const updated = await taskAPI.updateTaskProgress(
					task.id,
					75,
					"Making good progress",
				);

				expect(updated).toBe(true);

				const updatedTask = await taskAPI.getTask(task.id);
				expect(updatedTask.metrics.completionPercentage).toBe(75);
			});

			it("should clamp progress percentage to valid range", async () => {
				const task = await taskAPI.createTask({
					title: "Clampable Task",
					description: "Task for testing progress clamping",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.IN_PROGRESS,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 50,
					},
				});

				await taskAPI.updateTaskProgress(task.id, 150); // Should be clamped to 100
				const task150 = await taskAPI.getTask(task.id);
				expect(task150.metrics.completionPercentage).toBe(100);

				await taskAPI.updateTaskProgress(task.id, -25); // Should be clamped to 0
				const taskNeg = await taskAPI.getTask(task.id);
				expect(taskNeg.metrics.completionPercentage).toBe(0);
			});
		});
	});

	describe("Analytics and Statistics", () => {
		describe("getStatistics", () => {
			it("should return task statistics", async () => {
				// Create sample tasks
				await taskAPI.createTask({
					title: "Completed Task",
					description: "A completed task",
					priority: TaskPriority.HIGH,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.COMPLETED,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 2,
					isParallelizable: true,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 2,
						completionPercentage: 100,
					},
				});

				await taskAPI.createTask({
					title: "In Progress Task",
					description: "A task in progress",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.MODERATE,
					risk: TaskRisk.MEDIUM,
					status: TaskStatus.IN_PROGRESS,
					phase: TaskPhase.CORE_LAYER,
					dependencies: [],
					files: [],
					estimatedDuration: 4,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 4,
						completionPercentage: 50,
					},
				});

				const stats = await taskAPI.getStatistics();

				expect(stats.totalTasks).toBe(2);
				expect(stats.completedTasks).toBe(1);
				expect(stats.inProgressTasks).toBe(1);
				expect(stats.byPriority[TaskPriority.HIGH]).toBe(1);
				expect(stats.byPriority[TaskPriority.MEDIUM]).toBe(1);
				expect(stats.byComplexity[TaskComplexity.SIMPLE]).toBe(1);
				expect(stats.byComplexity[TaskComplexity.MODERATE]).toBe(1);
				expect(stats.parallelizableTasksCount).toBe(1);
			});
		});

		describe("estimateCompletionTime", () => {
			it("should estimate total completion time", async () => {
				await taskAPI.createTask({
					title: "Task 1",
					description: "First task",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.PENDING,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 3,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 3,
						completionPercentage: 0,
					},
				});

				await taskAPI.createTask({
					title: "Task 2",
					description: "Second task",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.IN_PROGRESS,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 4,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 4,
						completionPercentage: 50,
					},
				});

				const estimatedTime = await taskAPI.estimateCompletionTime();

				// Task 1: 3 hours (0% complete)
				// Task 2: 2 hours remaining (50% complete)
				// Total: 5 hours
				expect(estimatedTime).toBe(5);
			});
		});
	});

	describe("Data Management", () => {
		describe("exportTasks", () => {
			it("should export tasks in JSON format", async () => {
				const task = await taskAPI.createTask({
					title: "Export Task",
					description: "Task for export testing",
					priority: TaskPriority.MEDIUM,
					complexity: TaskComplexity.SIMPLE,
					risk: TaskRisk.LOW,
					status: TaskStatus.PENDING,
					phase: TaskPhase.FOUNDATION,
					dependencies: [],
					files: [],
					estimatedDuration: 1,
					isParallelizable: false,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 1,
						completionPercentage: 0,
					},
				});

				const exportedData = await taskAPI.exportTasks("json");

				expect(exportedData).toBeDefined();
				expect(typeof exportedData).toBe("string");

				const parsedData = JSON.parse(exportedData);
				expect(Array.isArray(parsedData)).toBe(true);
				expect(parsedData).toHaveLength(1);
				expect(parsedData[0].id).toBe(task.id);
			});

			it("should export tasks in CSV format", async () => {
				await taskAPI.createTask({
					title: "CSV Task",
					description: "Task for CSV export testing",
					priority: TaskPriority.HIGH,
					complexity: TaskComplexity.COMPLEX,
					risk: TaskRisk.HIGH,
					status: TaskStatus.COMPLETED,
					phase: TaskPhase.API_LAYER,
					dependencies: [],
					files: [],
					estimatedDuration: 8,
					isParallelizable: true,
					validationCriteria: [],
					riskMitigation: [],
					implementationTasks: [],
					metrics: {
						estimatedDuration: 8,
						completionPercentage: 100,
					},
				});

				const csvData = await taskAPI.exportTasks("csv");

				expect(csvData).toBeDefined();
				expect(typeof csvData).toBe("string");
				expect(csvData).toContain("ID,Title,Status");
				expect(csvData).toContain("CSV Task");
				expect(csvData).toContain("completed");
			});
		});
	});

	describe("Specification Tasks", () => {
		describe("createSpecificationTasks", () => {
			it("should create all 21 specification tasks", async () => {
				const tasks = await taskAPI.createSpecificationTasks();

				expect(tasks).toHaveLength(21);
				expect(tasks[0].title).toBe("Development Environment Validation");
				expect(tasks[20].title).toBe("Release Preparation & Final Validation");

				// Verify phases are correct
				const foundationTasks = tasks.filter(
					(t) => t.phase === TaskPhase.FOUNDATION,
				);
				expect(foundationTasks).toHaveLength(3);

				const coreLayerTasks = tasks.filter(
					(t) => t.phase === TaskPhase.CORE_LAYER,
				);
				expect(coreLayerTasks).toHaveLength(4);

				const apiLayerTasks = tasks.filter(
					(t) => t.phase === TaskPhase.API_LAYER,
				);
				expect(apiLayerTasks).toHaveLength(5);
			});
		});

		describe("getTasksByPhase", () => {
			it("should return tasks for specific phase", async () => {
				await taskAPI.createSpecificationTasks();

				const foundationTasks = await taskAPI.getTasksByPhase(
					TaskPhase.FOUNDATION,
				);
				expect(foundationTasks).toHaveLength(3);
				expect(
					foundationTasks.every((t) => t.phase === TaskPhase.FOUNDATION),
				).toBe(true);
			});
		});

		describe("getReadyTasks", () => {
			it("should return tasks that can be started", async () => {
				await taskAPI.createSpecificationTasks();

				const readyTasks = await taskAPI.getReadyTasks();

				// Initially, only tasks without dependencies should be ready
				expect(readyTasks.length).toBeGreaterThan(0);
				expect(readyTasks.every((t) => t.status === TaskStatus.PENDING)).toBe(
					true,
				);
			});
		});
	});
});
