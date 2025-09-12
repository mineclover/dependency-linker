/**
 * Error Reporting and Debugging System Exports
 * Comprehensive error handling and diagnostic capabilities
 */

export { ErrorReporter, errorReporter } from './ErrorReporter';
export { DebugHelper } from './DebugHelper';
export { DiagnosticTool } from './DiagnosticTool';

export type {
  ErrorContext,
  DiagnosticInfo,
  ErrorReport
} from './ErrorReporter';

export type {
  DebugContext,
  DebugTrace,
  PerformanceMetrics
} from './DebugHelper';

export type {
  SystemHealthCheck,
  DiagnosticReport,
  PerformanceTest
} from './DiagnosticTool';

// Re-export main error classes for convenience
export {
  AnalysisError,
  ParseError,
  ResourceError,
  OperationCancelledError
} from '../errors';