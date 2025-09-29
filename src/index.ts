/**
 * Multi-Language Dependency Linker - Main Entry Point
 * 다국어 의존성 분석 라이브러리의 메인 진입점
 */

// ===== CORE API EXPORTS =====

// Analysis API
export {
	analyzeFile,
	analyzeTypeScriptFile,
	analyzeJavaScriptFile,
	analyzeJavaFile,
	analyzePythonFile,
	analyzeImports,
	analyzeDependencies,
	initializeAnalysisSystem,
} from "./api/analysis";

export type {
	AnalysisResult,
	AnalysisOptions,
} from "./api/analysis";

// ===== CORE SYSTEM EXPORTS =====

// Types
export type {
	SupportedLanguage,
	QueryExecutionContext,
} from "./core/types";

export type {
	QueryKey,
	QueryResult,
} from "./core/QueryResultMap";

// Custom Key Mapping
export {
	createCustomKeyMapper,
	predefinedCustomMappings,
} from "./mappers/CustomKeyMapper";

export type {
	CustomKeyMapping,
	CustomKeyMapper,
} from "./mappers/CustomKeyMapper";

// Parsers
export { parseCode } from "./parsers";
export type { ParseResult, ParserOptions } from "./parsers/base";

// Parser Management
export {
	globalParserManager,
	ParserManager,
} from "./parsers/ParserManager";

// ===== DEPENDENCY GRAPH ANALYSIS =====

// Main Graph API
export {
	createDependencyAnalyzer,
	analyzeDependencyGraph,
	analyzeProjectDependencies,
	analyzeFileImpact,
} from "./graph/api";

// Graph Building
export {
	DependencyGraphBuilder,
	createDependencyGraphBuilder,
	buildDependencyGraph,
} from "./graph/DependencyGraphBuilder";

// Graph Analysis
export {
	GraphAnalyzer,
	createGraphAnalyzer,
	analyzeGraph,
} from "./graph/GraphAnalyzer";

// Path Resolution
export {
	PathResolver,
	createPathResolver,
	resolvePath,
} from "./graph/PathResolver";

// Graph Types
export type {
	FileDependency,
	DependencyNode,
	DependencyEdge,
	DependencyGraph,
	PathResolutionOptions,
	PathResolutionResult,
	GraphAnalysisResult,
	GraphBuildOptions,
	GraphBuildResult,
} from "./graph/types";

// ===== QUERY ENGINE EXPORTS =====

// Query Bridge
export {
	executeTreeSitterQuery,
	executeMultipleTreeSitterQueries,
	executeAllLanguageQueries,
	initializeQueryBridge,
} from "./core/QueryBridge";

// Query Engine
export {
	globalQueryEngine,
	QueryEngine,
} from "./core/QueryEngine";

// Tree-sitter Query Engine
export {
	globalTreeSitterQueryEngine,
	TreeSitterQueryEngine,
} from "./core/TreeSitterQueryEngine";

// ===== LANGUAGE PARSERS =====

// Individual Parsers
export { TypeScriptParser } from "./parsers/typescript";
export { JavaParser } from "./parsers/java";
export { PythonParser } from "./parsers/python";
export { GoParser } from "./parsers/go";

// Parser Factory
export {
	ParserFactory,
	globalParserFactory,
} from "./parsers/ParserFactory";

// ===== UTILITIES =====

// Note: Additional utilities can be added here as needed

// ===== VERSION INFO =====

export const VERSION = "2.4.1";