/**
 * Task Management System Example
 * Demonstrates how to use the task management API for the API modularization project
 */

import {
  createTaskAPI,
  TaskPriority,
  TaskComplexity,
  TaskRisk,
  TaskPhase,
  TaskStatus
} from '../src/task';

async function demonstrateTaskManagement() {
  console.log('🚀 Task Management System Demo\n');

  // Create a task API instance
  const taskAPI = createTaskAPI({
    enableValidation: true,
    autoSave: false // For demo purposes
  });

  try {
    // 1. Create all 21 specification tasks
    console.log('📋 Creating all 21 API modularization tasks...');
    const specTasks = await taskAPI.createSpecificationTasks();
    console.log(`✅ Created ${specTasks.length} tasks\n`);

    // 2. Show task statistics
    console.log('📊 Task Statistics:');
    const stats = await taskAPI.getStatistics();
    console.log(`- Total tasks: ${stats.totalTasks}`);
    console.log(`- By Priority: Critical=${stats.byPriority.Critical}, High=${stats.byPriority.High}, Medium=${stats.byPriority.Medium}, Low=${stats.byPriority.Low}`);
    console.log(`- By Phase: Foundation=${stats.byPhase['Foundation & Validation']}, Core=${stats.byPhase['Core Layer Implementation']}`);
    console.log(`- Parallelizable tasks: ${stats.parallelizableTasksCount}`);
    console.log(`- Estimated total time: ${stats.estimatedTotalHours} hours\n`);

    // 3. Show tasks by phase
    console.log('🏗️ Foundation Phase Tasks:');
    const foundationTasks = await taskAPI.getTasksByPhase(TaskPhase.FOUNDATION);
    foundationTasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title} (${task.priority}, ${task.complexity})`);
    });
    console.log();

    // 4. Show ready-to-start tasks
    console.log('🚦 Ready to Start:');
    const readyTasks = await taskAPI.getReadyTasks();
    readyTasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title} - Can start: ${await taskAPI.canStartTask(task.id)}`);
    });
    console.log();

    // 5. Start a task and track progress
    if (readyTasks.length > 0) {
      const taskToStart = readyTasks[0];
      console.log(`▶️ Starting task: ${taskToStart.title}`);
      
      // Set up progress tracking
      taskAPI.onTaskProgress((taskId, progress) => {
        console.log(`   Progress: ${progress.completionPercentage}% - ${progress.message || 'Working...'}`);
      });

      taskAPI.onTaskCompleted((taskId, result) => {
        console.log(`   ✅ Task completed successfully in ${result.duration}ms`);
      });

      // Start the task
      const result = await taskAPI.startTask(taskToStart.id);
      console.log(`   Task execution result: ${result.success ? 'SUCCESS' : 'FAILED'}\n`);
    }

    // 6. Create a custom task with dependencies
    console.log('🔗 Creating custom task with dependencies...');
    const dependencyTask = await taskAPI.createTask({
      title: 'Setup Development Environment',
      description: 'Install and configure development tools',
      priority: TaskPriority.HIGH,
      complexity: TaskComplexity.SIMPLE,
      risk: TaskRisk.LOW,
      status: TaskStatus.PENDING,
      phase: TaskPhase.FOUNDATION,
      dependencies: [],
      files: ['package.json', 'tsconfig.json'],
      estimatedDuration: 1,
      isParallelizable: false,
      validationCriteria: [
        { description: 'All dependencies installed', required: true },
        { description: 'TypeScript compilation successful', required: true }
      ],
      riskMitigation: [
        { description: 'Use exact versions', strategy: 'Lock dependencies' }
      ],
      implementationTasks: [
        { description: 'Run npm install', completed: false },
        { description: 'Verify TypeScript compilation', completed: false }
      ],
      metrics: {
        estimatedDuration: 1,
        completionPercentage: 0
      },
      tags: ['setup', 'environment']
    });

    const mainTask = await taskAPI.createTask({
      title: 'Implement Core Features',
      description: 'Build main application features',
      priority: TaskPriority.CRITICAL,
      complexity: TaskComplexity.COMPLEX,
      risk: TaskRisk.MEDIUM,
      status: TaskStatus.PENDING,
      phase: TaskPhase.CORE_LAYER,
      dependencies: [{ taskId: dependencyTask.id, type: 'requires' }],
      files: ['src/core/**/*.ts'],
      estimatedDuration: 8,
      isParallelizable: false,
      validationCriteria: [
        { description: 'All features implemented', required: true },
        { description: 'All tests pass', required: true }
      ],
      riskMitigation: [
        { description: 'Incremental development', strategy: 'Break into smaller tasks' }
      ],
      implementationTasks: [
        { description: 'Design interfaces', completed: false },
        { description: 'Implement services', completed: false },
        { description: 'Add tests', completed: false }
      ],
      metrics: {
        estimatedDuration: 8,
        completionPercentage: 0
      },
      tags: ['core', 'features']
    });

    console.log(`✅ Created dependency task: ${dependencyTask.title}`);
    console.log(`✅ Created main task: ${mainTask.title}`);

    // Check if main task can start (should be false due to dependency)
    const canStartMain = await taskAPI.canStartTask(mainTask.id);
    console.log(`   Can start main task: ${canStartMain}\n`);

    // 7. Create and execute a batch
    console.log('📦 Creating and executing task batch...');
    const parallelTasks = (await taskAPI.getParallelizableTasks()).slice(0, 3);
    
    if (parallelTasks.length > 0) {
      const batch = await taskAPI.createBatch({
        name: 'Parallel Development Tasks',
        tasks: parallelTasks,
        parallelizable: true,
        maxConcurrency: 3,
        dependencies: []
      });

      console.log(`   Created batch with ${batch.tasks.length} parallelizable tasks`);
      
      // Execute the batch (this would run in parallel in a real scenario)
      const batchResults = await taskAPI.executeBatch(batch.id, 2);
      const successCount = batchResults.filter(r => r.success).length;
      console.log(`   Batch execution: ${successCount}/${batchResults.length} tasks succeeded\n`);
    }

    // 8. Validate all tasks
    console.log('🔍 Validating all tasks...');
    const validationResults = await taskAPI.validateAllTasks();
    const tasksWithIssues = Object.entries(validationResults)
      .filter(([_, results]) => results.some(r => !r.passed)).length;
    
    console.log(`   Tasks with validation issues: ${tasksWithIssues}\n`);

    // 9. Export tasks
    console.log('💾 Exporting tasks...');
    const jsonExport = await taskAPI.exportTasks('json');
    const csvExport = await taskAPI.exportTasks('csv');
    
    console.log(`   JSON export: ${jsonExport.length} characters`);
    console.log(`   CSV export: ${csvExport.split('\n').length} lines\n`);

    // 10. Show final statistics
    console.log('📈 Final Statistics:');
    const finalStats = await taskAPI.getStatistics();
    const estimatedTime = await taskAPI.estimateCompletionTime();
    
    console.log(`   Total tasks: ${finalStats.totalTasks}`);
    console.log(`   Completion rate: ${((finalStats.completedTasks / finalStats.totalTasks) * 100).toFixed(1)}%`);
    console.log(`   Estimated completion time: ${estimatedTime.toFixed(1)} hours`);
    console.log(`   Critical path length: ${finalStats.criticalPathLength} tasks`);

  } catch (error) {
    console.error('❌ Error during task management demo:', error);
  }

  console.log('\n🎉 Task Management Demo Complete!');
}

// Example of event-driven task management
async function demonstrateEventDrivenTaskManagement() {
  console.log('\n🎭 Event-Driven Task Management Demo\n');

  const taskAPI = createTaskAPI();

  // Set up event handlers
  taskAPI.onTaskStatusChange((taskId, oldStatus, newStatus) => {
    console.log(`📄 Task ${taskId}: ${oldStatus} → ${newStatus}`);
  });

  taskAPI.onTaskProgress((taskId, progress) => {
    console.log(`📊 Task ${taskId}: ${progress.completionPercentage}% complete`);
  });

  taskAPI.onTaskCompleted((taskId, result) => {
    console.log(`✅ Task ${taskId} completed in ${result.duration}ms`);
  });

  taskAPI.onTaskFailed((taskId, error) => {
    console.log(`❌ Task ${taskId} failed: ${error.message}`);
  });

  // Create and execute a simple task
  const task = await taskAPI.createTask({
    title: 'Event Demo Task',
    description: 'Demonstrates event-driven task management',
    priority: TaskPriority.MEDIUM,
    complexity: TaskComplexity.SIMPLE,
    risk: TaskRisk.LOW,
    status: TaskStatus.PENDING,
    phase: TaskPhase.FOUNDATION,
    dependencies: [],
    files: [],
    estimatedDuration: 0.5,
    isParallelizable: false,
    validationCriteria: [],
    riskMitigation: [],
    implementationTasks: [],
    metrics: {
      estimatedDuration: 0.5,
      completionPercentage: 0
    }
  });

  // Update task status to trigger events
  await taskAPI.updateTask(task.id, { status: TaskStatus.IN_PROGRESS });
  await taskAPI.updateTaskProgress(task.id, 50, 'Halfway done');
  await taskAPI.updateTaskProgress(task.id, 100, 'Almost finished');
  await taskAPI.completeTask(task.id);

  console.log('\n🎊 Event-Driven Demo Complete!');
}

// Main execution
if (require.main === module) {
  (async () => {
    await demonstrateTaskManagement();
    await demonstrateEventDrivenTaskManagement();
  })().catch(console.error);
}

export { demonstrateTaskManagement, demonstrateEventDrivenTaskManagement };