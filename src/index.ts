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
// Built-in extractors and interpreters
export * from "./extractors";
export * from "./interpreters";
// Library exports
export * from "./lib";
// New Architecture Exports (Phase 3 Implementation)
// Core models
export { AnalysisConfig } from "./models/AnalysisConfig";
export { AnalysisError } from "./models/AnalysisError";
// export { OutputFormatter } from "./formatters/OutputFormatter"; // Removed - not implemented
// Core models (for backward compatibility)
export { AnalysisResult } from "./models/AnalysisResult";
export { CacheEntry } from "./models/CacheEntry";
export { DependencyInfo } from "./models/DependencyInfo";
export { ExportInfo } from "./models/ExportInfo";
export { ExtractedData } from "./models/ExtractedData";
export {
	FileAnalysisRequest,
	OutputFormat,
} from "./models/FileAnalysisRequest";
export { ImportInfo } from "./models/ImportInfo";
export { PerformanceMetrics } from "./models/PerformanceMetrics";
export { SourceLocation } from "./models/SourceLocation";
export { GoParser } from "./parsers/GoParser";
// Language parsers
export { ILanguageParser } from "./parsers/ILanguageParser";
export { JavaParser } from "./parsers/JavaParser";
export { JavaScriptParser } from "./parsers/JavaScriptParser";
export { TypeScriptParser as NewTypeScriptParser } from "./parsers/TypeScriptParser";
export { AnalysisEngine } from "./services/AnalysisEngine";
export { CacheManager } from "./services/CacheManager";
export { DependencyAnalyzer } from "./services/DependencyAnalyzer";
export { ExtractorRegistry } from "./services/ExtractorRegistry";
// Legacy CLI exports (for backward compatibility)
export { FileAnalyzer } from "./services/FileAnalyzer";
// Core interfaces and services
export { IAnalysisEngine } from "./services/IAnalysisEngine";
export { InterpreterRegistry } from "./services/InterpreterRegistry";
export { ParserRegistry } from "./services/ParserRegistry";
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
