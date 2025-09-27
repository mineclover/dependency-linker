/**
 * TypeScript Dependency Linker - Main Entry Point
 * Multi-language AST-based code analysis framework with extensible plugin architecture
 */

// ===== CORE API =====
export * from "./api";
// ===== EXTRACTORS & INTERPRETERS =====
export * from "./extractors";
export * from "./interpreters";
// ===== LIBRARY FUNCTIONS =====
export * from "./lib";
// ===== CORE MODELS =====
export { AnalysisConfig } from "./models/AnalysisConfig";
export { AnalysisError } from "./models/AnalysisError";
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
export { IntegratedAnalysisData } from "./models/IntegratedData";
export { PerformanceMetrics } from "./models/PerformanceMetrics";
export { SourceLocation } from "./models/SourceLocation";
export { GoParser } from "./parsers/GoParser";
// ===== LANGUAGE PARSERS =====
export { ILanguageParser } from "./parsers/ILanguageParser";
export { JavaParser } from "./parsers/JavaParser";
export { JavaScriptParser } from "./parsers/JavaScriptParser";
export { TypeScriptParser } from "./parsers/TypeScriptParser";
// ===== CORE SERVICES =====
export { AnalysisEngine } from "./services/analysis-engine";
export { AnalysisEngineFactory } from "./services/AnalysisEngineFactory";
export { CacheManager } from "./services/CacheManager";
export { DependencyAnalyzer } from "./services/DependencyAnalyzer";
export { DirectoryAnalyzer } from "./services/DirectoryAnalyzer";
// ===== REGISTRIES =====
export { ExtractorRegistry } from "./services/ExtractorRegistry";
export { FileAnalyzer } from "./services/FileAnalyzer";
export { IAnalysisEngine } from "./services/IAnalysisEngine";
export { ICacheManager } from "./services/ICacheManager";
export { InterpreterRegistry } from "./services/InterpreterRegistry";
// ===== INTEGRATION SERVICES =====
export { DataIntegrator } from "./services/integration/DataIntegrator";
export { ParserRegistry } from "./services/ParserRegistry";
export { TypeScriptParser as LegacyTypeScriptParser } from "./services/TypeScriptParser"; // Legacy parser
export * from "./types/ASTWrappers";
// ===== TYPE SYSTEM =====
export * from "./types/TreeSitterTypes";
// ===== UTILITIES =====
export { createLogger } from "./utils/logger";
export * from "./utils/PathResolutionUtils";
export * from "./utils/PathUtils";

// ===== CONFIGURATION =====
// Configuration is handled through config files and API
