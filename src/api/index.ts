/**
 * API Layer Exports
 * Main entry point for the API layer of the TypeScript File Analyzer
 */

// Main API Class
export { TypeScriptAnalyzer } from './TypeScriptAnalyzer';

// Core API Types
export * from './types';

// Error Classes
export * from './errors';

// Re-export core models for convenience
export { AnalysisResult } from '../models/AnalysisResult';
export { DependencyInfo } from '../models/DependencyInfo';
export { ImportInfo } from '../models/ImportInfo';
export { ExportInfo } from '../models/ExportInfo';
export { SourceLocation } from '../models/SourceLocation';
export { OutputFormat, FileAnalysisRequest as CoreFileAnalysisRequest } from '../models/FileAnalysisRequest';

// Re-export core interfaces
export { IFileAnalyzer } from '../core/interfaces/IFileAnalyzer';
export { ITypeScriptParser } from '../core/interfaces/ITypeScriptParser';
export { IOutputFormatter } from '../core/interfaces/IOutputFormatter';

// Re-export core types
export { ParseOptions, ParseResult, ValidationResult } from '../core/types/ParseTypes';

// Factory Functions
export {
  analyzeTypeScriptFile,
  extractDependencies,
  getBatchAnalysis,
  analyzeDirectory,
  clearFactoryCache,
  resetFactoryAnalyzer
} from './factory-functions';