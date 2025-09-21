/**
 * Core Services
 * Analysis engine, registries, and core service implementations
 */

// ===== CORE ANALYSIS SERVICES =====
export { AnalysisEngine } from "./AnalysisEngine";
export { AnalysisEngineFactory } from "./AnalysisEngineFactory";
export { CacheManager } from "./CacheManager";
export { DependencyAnalyzer } from "./DependencyAnalyzer";
export { DirectoryAnalyzer } from "./DirectoryAnalyzer";
// ===== REGISTRIES =====
export { ExtractorRegistry } from "./ExtractorRegistry";
export { FileAnalyzer } from "./FileAnalyzer";
// ===== INTERFACES =====
export { IAnalysisEngine } from "./IAnalysisEngine";
export { ICacheManager } from "./ICacheManager";
export { InterpreterRegistry } from "./InterpreterRegistry";
// ===== INTEGRATION SERVICES =====
export * from "./integration";
// ===== OPTIMIZATION SERVICES =====
export * from "./optimization";
export { ParserRegistry } from "./ParserRegistry";
// ===== LEGACY SERVICES =====
export { TypeScriptParser } from "./TypeScriptParser";
