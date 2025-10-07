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
export {
	createMarkdownDependencyExtractor,
	extractMarkdownDependencies,
} from "./core/MarkdownDependencyExtractor";
// ===== MARKDOWN DEPENDENCY EXPORTS =====
export type {
	MarkdownDependency,
	MarkdownDependencyType,
	MarkdownExtractionResult,
	MarkdownLocation,
} from "./core/markdown-types";
export {
	extractFrontMatter,
	isAnchorLink,
	isExternalUrl,
	MARKDOWN_PATTERNS,
	normalizeMarkdownPath,
	parseUrl,
} from "./core/markdown-types";
export {
	executeAllLanguageQueries,
	executeMultipleTreeSitterQueries,
	executeTreeSitterQuery,
	initializeQueryBridge,
} from "./core/QueryBridge";
// Query System
export { globalQueryEngine, QueryEngine } from "./core/QueryEngine";
// ===== CORE SYSTEM EXPORTS =====
export type { QueryKey, QueryResult } from "./core/QueryResultMap";
export type { SymbolExtractorConfig } from "./core/SymbolExtractor";
export {
	createSymbolExtractor,
	SymbolExtractor,
} from "./core/SymbolExtractor";
// ===== SYMBOL EXTRACTION EXPORTS =====
export type {
	ParameterInfo,
	SourceLocation,
	SymbolDependency,
	SymbolDependencyType,
	SymbolExtractionResult,
	SymbolInfo,
	SymbolQueryOptions,
} from "./core/symbol-types";
export {
	generateSymbolNamePath,
	getParentSymbolPath,
	getSymbolName,
	isCallableSymbol,
	isContainerSymbol,
	parseSymbolNamePath,
	SymbolKind,
} from "./core/symbol-types";
export {
	globalTreeSitterQueryEngine,
	TreeSitterQueryEngine,
} from "./core/TreeSitterQueryEngine";
export type { QueryExecutionContext, SupportedLanguage } from "./core/types";
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
export {
	analyzeGraph,
	createGraphAnalyzer,
	GraphAnalyzer,
} from "./graph/GraphAnalyzer";
export {
	createPathResolver,
	PathResolver,
	resolvePath,
} from "./graph/PathResolver";
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
export type { MarkdownToGraphOptions } from "./integration/MarkdownToGraph";
export {
	getAllSemanticTypes,
	markdownDirectoryToGraph,
	markdownFileToGraph,
	markdownResultToGraph,
	queryFileHeadings,
	queryHeadingsBySemanticType,
	queryMarkdownDependencies,
	registerMarkdownEdgeTypes,
} from "./integration/MarkdownToGraph";
// Custom Key Mapping
export type {
	CustomKeyMapper,
	CustomKeyMapping,
} from "./mappers/CustomKeyMapper";
export {
	createCustomKeyMapper,
	predefinedCustomMappings,
} from "./mappers/CustomKeyMapper";
export {
	ConfigManager,
	configManager,
	FilePatternMatcher,
	filePatternMatcher,
	NamespaceDependencyAnalyzer,
	NamespaceGraphDB,
	namespaceDependencyAnalyzer,
} from "./namespace";
// ===== NAMESPACE MODULE EXPORTS =====
export type {
	CategorizedFiles,
	ConfigFile,
	NamespaceConfig,
	NamespaceDependencyResult,
	NamespaceList,
	NamespaceWithFiles,
} from "./namespace/types";
// ===== PARSER EXPORTS =====
export type { ParseResult, ParserOptions } from "./parsers/base";
export { GoParser } from "./parsers/go";
export { JavaParser } from "./parsers/java";
export { globalParserFactory, ParserFactory } from "./parsers/ParserFactory";
export { globalParserManager, ParserManager } from "./parsers/ParserManager";
export { PythonParser } from "./parsers/python";
export { TypeScriptParser } from "./parsers/typescript";

// ===== VERSION =====
export const VERSION = "3.0.0";
