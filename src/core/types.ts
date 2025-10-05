/**
 * Core Types for Query System
 * 쿼리 시스템의 핵심 타입 정의
 */

import type Parser from "tree-sitter";
import type { RDFAddress, NodeType } from "./RDFAddress";

// Re-export QueryResult type
export interface QueryResult {
	[key: string]: any;
}

// ===== LANGUAGE SUPPORT =====
export type SupportedLanguage =
	| "typescript"
	| "tsx"
	| "javascript"
	| "jsx"
	| "go"
	| "java"
	| "python"
	| "markdown"
	| "external"
	| "unknown";

export type LanguageGroup =
	| "typescript"
	| "javascript"
	| "go"
	| "java"
	| "python";

export const LANGUAGE_GROUPS: Record<LanguageGroup, SupportedLanguage[]> = {
	typescript: ["typescript", "tsx"],
	javascript: ["javascript", "jsx"],
	go: ["go"],
	java: ["java"],
	python: ["python"],
} as const;

// ===== TREE-SITTER NATIVE TYPES =====
export interface QueryMatch<TCaptureNames extends string = string> {
	queryName: string;
	captures: Array<{
		name: TCaptureNames;
		node: Parser.SyntaxNode;
	}>;
}

// ===== QUERY EXECUTION CONTEXT =====
export interface QueryExecutionContext {
	sourceCode: string;
	language: SupportedLanguage;
	filePath: string;
	tree: Parser.Tree;
}

// ===== SOURCE LOCATION =====
export interface ExtendedSourceLocation {
	line: number;
	column: number;
	offset: number;
	endLine: number;
	endColumn: number;
	endOffset: number;
}

// ===== BASE RESULT TYPE =====
export interface BaseQueryResult {
	queryName: string;
	location: ExtendedSourceLocation;
	nodeText: string;
}

// ===== QUERY FUNCTION TYPE =====
export type QueryFunction<
	TResult extends BaseQueryResult,
	TCaptureNames extends string = string,
> = {
	readonly name: string;
	readonly description: string;
	readonly query: string;
	readonly languages: readonly SupportedLanguage[];
	readonly priority: number;
	readonly resultType: string;
	readonly processor: (
		matches: QueryMatch<TCaptureNames>[],
		context: QueryExecutionContext,
	) => TResult[];
};

// ===== PERFORMANCE METRICS =====
export interface QueryPerformanceMetrics {
	executionTime: number;
	matchCount: number;
	resultCount: number;
	errorCount: number;
}

// ===== VALIDATION RESULT =====
export interface ValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
}

// ===== RDF ADDRESS INTEGRATION =====

/**
 * RDF 기반 노드 식별자
 */
export interface RDFNodeIdentifier {
	rdfAddress: string;
	projectName: string;
	filePath: string;
	nodeType: NodeType;
	symbolName: string;
	namespace?: string;
	localName?: string;
}

/**
 * RDF 주소 생성 옵션
 */
export interface RDFNodeIdentifierOptions {
	projectName: string;
	filePath: string;
	nodeType: NodeType;
	symbolName: string;
	validate?: boolean;
}

/**
 * 심볼 추출 결과 (RDF 기반)
 */
export interface RDFSymbolExtractionResult {
	rdfAddress: string;
	nodeType: NodeType;
	symbolName: string;
	namespace?: string;
	localName?: string;
	metadata: {
		accessModifier?: "public" | "private" | "protected";
		isStatic?: boolean;
		isAsync?: boolean;
		isAbstract?: boolean;
		lineNumber?: number;
		columnNumber?: number;
	};
}

/**
 * RDF 기반 분석 결과
 */
export interface RDFAnalysisResult {
	language: SupportedLanguage;
	filePath: string;
	sourceCode: string;
	projectName: string;
	symbols: RDFSymbolExtractionResult[];
	queryResults: Record<string, QueryResult[]>;
	errors: string[];
	warnings: string[];
}
