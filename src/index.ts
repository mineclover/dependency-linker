/**
 * TypeScript File Analyzer - Main Entry Point
 * Provides both class-based and function-based APIs for TypeScript dependency analysis
 */

// Main API exports
export * from './api';

// Legacy CLI exports (for backward compatibility)
export { FileAnalyzer } from './services/FileAnalyzer';
export { TypeScriptParser } from './services/TypeScriptParser';
export { OutputFormatter } from './formatters/OutputFormatter';
export { DependencyAnalyzer } from './services/DependencyAnalyzer';

// Core models (for backward compatibility)
export { AnalysisResult } from './models/AnalysisResult';
export { DependencyInfo } from './models/DependencyInfo';
export { ImportInfo } from './models/ImportInfo';
export { ExportInfo } from './models/ExportInfo';
export { SourceLocation } from './models/SourceLocation';
export { FileAnalysisRequest, OutputFormat } from './models/FileAnalysisRequest';

// Utility exports
export { createLogger } from './utils/logger';

// Diagnostic and debugging utilities
export {
  ErrorReporter,
  errorReporter,
  DebugHelper,
  DiagnosticTool,
  // Types
  ErrorContext,
  DiagnosticInfo,
  ErrorReport,
  DebugContext,
  DebugTrace,
  PerformanceMetrics as DiagnosticPerformanceMetrics,
  SystemHealthCheck,
  DiagnosticReport,
  PerformanceTest
} from './api/errors/index';