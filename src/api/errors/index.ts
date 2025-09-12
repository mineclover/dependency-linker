/**
 * Error Reporting and Debugging System Exports
 * Comprehensive error handling and diagnostic capabilities
 */

// Re-export main error classes for convenience
export {
	AnalysisError,
	OperationCancelledError,
	ParseError,
	ResourceError,
} from "../errors";
export type {
	DebugContext,
	DebugTrace,
	PerformanceMetrics,
} from "./DebugHelper";
export { DebugHelper } from "./DebugHelper";
export type {
	DiagnosticReport,
	PerformanceTest,
	SystemHealthCheck,
} from "./DiagnosticTool";
export { DiagnosticTool } from "./DiagnosticTool";
export type {
	DiagnosticInfo,
	ErrorContext,
	ErrorReport,
} from "./ErrorReporter";
export { ErrorReporter, errorReporter } from "./ErrorReporter";
