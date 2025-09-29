/**
 * Multi-Language Dependency Linker - Main Entry Point
 * 다국어 의존성 분석 라이브러리의 메인 진입점
 */

// ===== CORE API EXPORTS =====

export type {
	AnalysisOptions,
	AnalysisResult,
} from "./api/analysis";
// Analysis API
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

export type {
	QueryKey,
	QueryResult,
} from "./core/QueryResultMap";
// Types
export type {
	QueryExecutionContext,
	SupportedLanguage,
} from "./core/types";
export type {
	CustomKeyMapper,
	CustomKeyMapping,
} from "./mappers/CustomKeyMapper";
// Custom Key Mapping
export {
	createCustomKeyMapper,
	predefinedCustomMappings,
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
	analyzeDependencyGraph,
	analyzeFileImpact,
	analyzeProjectDependencies,
	createDependencyAnalyzer,
} from "./graph/api";

// Graph Building
export {
	buildDependencyGraph,
	createDependencyGraphBuilder,
	DependencyGraphBuilder,
} from "./graph/DependencyGraphBuilder";

// Graph Analysis
export {
	analyzeGraph,
	createGraphAnalyzer,
	GraphAnalyzer,
} from "./graph/GraphAnalyzer";

// Path Resolution
export {
	createPathResolver,
	PathResolver,
	resolvePath,
} from "./graph/PathResolver";

// Graph Types
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

// ===== QUERY ENGINE EXPORTS =====

// Query Bridge
export {
	executeAllLanguageQueries,
	executeMultipleTreeSitterQueries,
	executeTreeSitterQuery,
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

export { GoParser } from "./parsers/go";
export { JavaParser } from "./parsers/java";
// Parser Factory
export {
	globalParserFactory,
	ParserFactory,
} from "./parsers/ParserFactory";
export { PythonParser } from "./parsers/python";
// Individual Parsers
export { TypeScriptParser } from "./parsers/typescript";

// ===== UTILITIES =====

// Note: Additional utilities can be added here as needed

// ===== VERSION INFO =====

export const VERSION = "2.4.1";
