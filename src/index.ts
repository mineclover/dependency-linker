/**
 * TypeScript File Analyzer - Main Entry Point
 * Provides both class-based and function-based APIs for TypeScript dependency analysis
 */

// Main API exports
export * from "./api";
// Diagnostic and debugging utilities
export {
	DebugContext,
	DebugHelper,
	DebugTrace,
	DiagnosticInfo,
	DiagnosticReport,
	DiagnosticTool,
	// Types
	ErrorContext,
	ErrorReport,
	ErrorReporter,
	errorReporter,
	PerformanceMetrics as DiagnosticPerformanceMetrics,
	PerformanceTest,
	SystemHealthCheck,
} from "./api/errors/index";
export { OutputFormatter } from "./formatters/OutputFormatter";
// Core models (for backward compatibility)
export { AnalysisResult } from "./models/AnalysisResult";
export { DependencyInfo } from "./models/DependencyInfo";
export { ExportInfo } from "./models/ExportInfo";
export {
	FileAnalysisRequest,
	OutputFormat,
} from "./models/FileAnalysisRequest";
export { ImportInfo } from "./models/ImportInfo";
export { SourceLocation } from "./models/SourceLocation";
export { DependencyAnalyzer } from "./services/DependencyAnalyzer";
// Legacy CLI exports (for backward compatibility)
export { FileAnalyzer } from "./services/FileAnalyzer";
export { TypeScriptParser } from "./services/TypeScriptParser";
// Task Management System
export {
	createTaskAPI,
	ITaskExecutor,
	// Interfaces
	ITaskManager,
	ITaskRepository,
	// Core types
	Task,
	TaskAPI,
	TaskBatch,
	TaskComplexity,
	// Error handling
	TaskError,
	TaskErrorFactory,
	TaskExecutionError,
	TaskExecutionResult,
	TaskExecutor,
	// Services
	TaskManager,
	TaskNotFoundError,
	TaskPhase,
	TaskPriority,
	TaskProgress,
	TaskRepository,
	TaskRisk,
	TaskStatistics,
	TaskStatus,
	TaskStatusError,
	TaskValidationError,
	TaskValidator,
	ValidationResult,
} from "./task";
// Utility exports
export { createLogger } from "./utils/logger";
