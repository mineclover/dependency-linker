/**
 * TypeScript Tree-sitter Query Strings
 * Tree-sitter 쿼리 문자열 정의 (실제 TypeScript AST 패턴 매칭용)
 */

import type { SupportedLanguage } from "../../core/types";

/**
 * TypeScript/TSX Tree-sitter 쿼리 문자열들
 */
export const TYPESCRIPT_TREE_SITTER_QUERIES = {
	// ===== IMPORT QUERIES =====

	/**
	 * Import sources (모든 import 문의 소스 경로)
	 * 예: import React from 'react' → 'react'
	 */
	"ts-import-sources": `
		(import_statement
			source: (string) @source)
	`,

	/**
	 * Named imports (네임드 임포트)
	 * 예: import { useState, useEffect } from 'react'
	 */
	"ts-named-imports": `
		(import_statement
			import_clause: (import_clause
				named_imports: (named_imports
					(import_specifier
						name: (identifier) @name
						alias: (identifier)? @alias))))
	`,

	/**
	 * Default imports (기본 임포트)
	 * 예: import React from 'react'
	 */
	"ts-default-imports": `
		(import_statement
			import_clause: (import_clause
				name: (identifier) @import_name)
			source: (string) @source)
	`,

	/**
	 * Type-only imports (타입 전용 임포트)
	 * 예: import type { User } from './types'
	 */
	"ts-type-imports": `
		(import_statement
			"type"
			import_clause: (import_clause
				named_imports: (named_imports
					(import_specifier
						name: (identifier) @name
						alias: (identifier)? @alias)))
			source: (string) @source)
	`,

	// ===== EXPORT QUERIES =====

	/**
	 * Export declarations (익스포트 선언)
	 * 예: export const foo = 'bar', export function test() {}
	 */
	"ts-export-declarations": `
		(export_statement
			declaration: [
				(variable_statement) @declaration
				(function_declaration) @declaration
				(class_declaration) @declaration
				(interface_declaration) @declaration
				(type_alias_declaration) @declaration
				(enum_declaration) @declaration
			])
	`,

	/**
	 * Export assignments (익스포트 할당)
	 * 예: export default Component, export = module
	 */
	"ts-export-assignments": `
		[
			(export_statement
				"default"
				value: [
					(identifier) @default_export
					(call_expression) @default_export
					(arrow_function) @default_export
					(function_expression) @default_export
					(class_expression) @default_export
				])
			(export_assignment
				"="
				(identifier) @export_assignment)
		]
	`,

} as const;

/**
 * JavaScript 전용 Tree-sitter 쿼리 (TypeScript와 유사하지만 타입 관련 제외)
 */
export const JAVASCRIPT_TREE_SITTER_QUERIES = {
	// JavaScript는 타입 관련 쿼리 제외하고 TypeScript와 동일
	"js-import-sources": TYPESCRIPT_TREE_SITTER_QUERIES["ts-import-sources"],
	"js-named-imports": TYPESCRIPT_TREE_SITTER_QUERIES["ts-named-imports"],
	"js-default-imports": TYPESCRIPT_TREE_SITTER_QUERIES["ts-default-imports"],
	"js-export-declarations": TYPESCRIPT_TREE_SITTER_QUERIES["ts-export-declarations"],
	"js-export-assignments": TYPESCRIPT_TREE_SITTER_QUERIES["ts-export-assignments"],
} as const;

/**
 * 언어별 쿼리 매핑
 */
export const TREE_SITTER_QUERY_MAP: Record<SupportedLanguage, Record<string, string>> = {
	typescript: TYPESCRIPT_TREE_SITTER_QUERIES,
	tsx: TYPESCRIPT_TREE_SITTER_QUERIES,
	javascript: JAVASCRIPT_TREE_SITTER_QUERIES,
	jsx: JAVASCRIPT_TREE_SITTER_QUERIES,
	// 다른 언어들은 아직 미구현
	go: {},
	java: {},
	python: {},
} as const;

/**
 * 특정 언어의 모든 Tree-sitter 쿼리 가져오기
 */
export function getTreeSitterQueries(language: SupportedLanguage): Record<string, string> {
	return TREE_SITTER_QUERY_MAP[language] || {};
}

/**
 * 특정 언어의 특정 쿼리 가져오기
 */
export function getTreeSitterQuery(language: SupportedLanguage, queryName: string): string | undefined {
	const queries = getTreeSitterQueries(language);
	return queries[queryName];
}

/**
 * 모든 지원되는 쿼리 이름 목록
 */
export function getAllQueryNames(language: SupportedLanguage): string[] {
	return Object.keys(getTreeSitterQueries(language));
}