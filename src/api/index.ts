/**
 * API Layer Exports
 * Main entry point for the API layer of the TypeScript File Analyzer
 */

// Re-export core interfaces
export { IFileAnalyzer } from "../core/interfaces/IFileAnalyzer";
export { IOutputFormatter } from "../core/interfaces/IOutputFormatter";
export { ITypeScriptParser } from "../core/interfaces/ITypeScriptParser";
// Re-export core types
export {
	ParseOptions,
	ParseResult,
	ValidationResult,
} from "../core/types/ParseTypes";
// Re-export core models for convenience
export { AnalysisResult } from "../models/AnalysisResult";
export { DependencyInfo } from "../models/DependencyInfo";
export { ExportInfo } from "../models/ExportInfo";
export {
	FileAnalysisRequest as CoreFileAnalysisRequest,
	OutputFormat,
} from "../models/FileAnalysisRequest";
export { ImportInfo } from "../models/ImportInfo";
export { SourceLocation } from "../models/SourceLocation";
// Error Classes
export * from "./errors";
// Factory Functions
export {
	analyzeDirectory,
	analyzeTypeScriptFile,
	clearFactoryCache,
	extractDependencies,
	getBatchAnalysis,
	resetFactoryAnalyzer,
} from "./factory-functions";
// Main API Class
export { TypeScriptAnalyzer } from "./TypeScriptAnalyzer";
// Core API Types
export * from "./types";
