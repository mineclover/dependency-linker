/**
 * Core Types for Query System
 * 쿼리 시스템의 핵심 타입 정의
 */

import type Parser from "tree-sitter";

// ===== LANGUAGE SUPPORT =====
export type SupportedLanguage =
	| "typescript"
	| "tsx"
	| "javascript"
	| "jsx"
	| "go"
	| "java"
	| "python";

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
