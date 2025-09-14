/**
 * Library Main Exports - Phase 3.12
 * Main library exports for the new AST-based analysis framework
 */

// Built-in plugins
export * from "../extractors";
// Plugin interfaces
export { IDataExtractor } from "../extractors/IDataExtractor";
export * from "../interpreters";
export { IDataInterpreter } from "../interpreters/IDataInterpreter";
export { AnalysisConfig } from "../models/AnalysisConfig";
export { AnalysisError } from "../models/AnalysisError";
// Core models
export { AnalysisResult } from "../models/AnalysisResult";
export { CacheEntry } from "../models/CacheEntry";
export { ExtractedData } from "../models/ExtractedData";
export { PerformanceMetrics } from "../models/PerformanceMetrics";
export { GoParser } from "../parsers/GoParser";
// Language parsers
export { ILanguageParser } from "../parsers/ILanguageParser";
export { JavaParser } from "../parsers/JavaParser";
export { JavaScriptParser } from "../parsers/JavaScriptParser";
export { TypeScriptParser } from "../parsers/TypeScriptParser";
export { AnalysisEngine } from "../services/AnalysisEngine";
export { AnalysisEngineFactory } from "../services/AnalysisEngineFactory";
export { CacheManager } from "../services/CacheManager";
export { ExtractorRegistry } from "../services/ExtractorRegistry";
// Core engine and interfaces
export { IAnalysisEngine } from "../services/IAnalysisEngine";
export { InterpreterRegistry } from "../services/InterpreterRegistry";
// Registry system
export { ParserRegistry } from "../services/ParserRegistry";

// Utility and factory functions
export * from "./factory";
// export * from "./types"; // Removed - types file not needed
