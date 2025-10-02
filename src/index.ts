/**
 * Multi-Language Dependency Linker - Main Entry Point
 * 다국어 의존성 분석 라이브러리의 메인 진입점
 */

// ===== CORE API EXPORTS =====
export type { AnalysisOptions, AnalysisResult } from "./api/analysis";
export {
	analyzeDependencies,
	analyzeFile,
	analyzeImports,
	analyzeJavaFile,
	analyzeJavaScriptFile,
	analyzePythonFile,
	analyzeTypeScriptFile,
	initializeAnalysisSystem,
} from "./api/analysis";

// ===== CORE SYSTEM EXPORTS =====
export type { QueryKey, QueryResult } from "./core/QueryResultMap";
export type { QueryExecutionContext, SupportedLanguage } from "./core/types";

// Custom Key Mapping
export type { CustomKeyMapper, CustomKeyMapping } from "./mappers/CustomKeyMapper";
export { createCustomKeyMapper, predefinedCustomMappings } from "./mappers/CustomKeyMapper";

// Query System
export { globalQueryEngine, QueryEngine } from "./core/QueryEngine";
export { globalTreeSitterQueryEngine, TreeSitterQueryEngine } from "./core/TreeSitterQueryEngine";
export {
	executeAllLanguageQueries,
	executeMultipleTreeSitterQueries,
	executeTreeSitterQuery,
	initializeQueryBridge,
} from "./core/QueryBridge";

// ===== PARSER EXPORTS =====
export type { ParseResult, ParserOptions } from "./parsers/base";
export { globalParserFactory, ParserFactory } from "./parsers/ParserFactory";
export { globalParserManager, ParserManager } from "./parsers/ParserManager";
export { TypeScriptParser } from "./parsers/typescript";
export { JavaParser } from "./parsers/java";
export { PythonParser } from "./parsers/python";
export { GoParser } from "./parsers/go";

// ===== GRAPH ANALYSIS EXPORTS =====
export type {
	DependencyEdge,
	DependencyGraph,
	DependencyNode,
	FileDependency,
	GraphAnalysisResult,
	GraphBuildOptions,
	GraphBuildResult,
	PathResolutionOptions,
	PathResolutionResult,
} from "./graph/types";

export {
	analyzeDependencyGraph,
	analyzeFileImpact,
	analyzeProjectDependencies,
	createDependencyAnalyzer,
} from "./graph/api";

export {
	buildDependencyGraph,
	createDependencyGraphBuilder,
	DependencyGraphBuilder,
} from "./graph/DependencyGraphBuilder";

export { analyzeGraph, createGraphAnalyzer, GraphAnalyzer } from "./graph/GraphAnalyzer";
export { createPathResolver, PathResolver, resolvePath } from "./graph/PathResolver";

// ===== VERSION =====
export const VERSION = "2.4.1";
