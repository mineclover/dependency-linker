/**
 * API Layer Exports
 * Main entry point for the API layer of the TypeScript File Analyzer
 */

// Core types removed - using new architecture
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
