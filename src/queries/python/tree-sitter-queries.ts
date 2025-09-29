/**
 * Python Tree-sitter Query Strings
 * Tree-sitter 쿼리 문자열 정의 (실제 Python AST 패턴 매칭용)
 */

/**
 * Python Tree-sitter 쿼리 문자열들
 */
export const PYTHON_TREE_SITTER_QUERIES = {
	// ===== IMPORT QUERIES =====

	/**
	 * Import sources (모든 import 문의 소스 경로)
	 * 예: import os → os, from pathlib import Path → pathlib
	 */
	"python-import-sources": `
		[
			(import_statement
				name: (dotted_name) @source)
			(import_from_statement
				module_name: (dotted_name) @source)
		]
	`,

	/**
	 * Import statements (전체 import 문)
	 * 예: import os, sys
	 */
	"python-import-statements": `
		(import_statement) @import
	`,

	/**
	 * From imports (from ... import ...)
	 * 예: from pathlib import Path, from typing import List
	 */
	"python-from-imports": `
		(import_from_statement
			module_name: (dotted_name) @module
			name: [
				(dotted_name) @import_name
				(aliased_import
					name: (dotted_name) @import_name
					alias: (identifier) @alias)
				(wildcard_import) @wildcard
			])
	`,

	/**
	 * Import as (별칭 임포트)
	 * 예: import numpy as np, from typing import List as ListType
	 */
	"python-import-as": `
		[
			(import_statement
				name: (aliased_import
					name: (dotted_name) @name
					alias: (identifier) @alias))
			(import_from_statement
				name: (aliased_import
					name: (dotted_name) @name
					alias: (identifier) @alias))
		]
	`,

	// ===== DEFINITION QUERIES =====

	/**
	 * Function definitions (함수 정의)
	 * 예: def my_function(param1, param2): ...
	 */
	"python-function-definitions": `
		(function_definition
			name: (identifier) @function_name
			parameters: (parameters) @parameters
			body: (block) @function_body)
	`,

	/**
	 * Class definitions (클래스 정의)
	 * 예: class MyClass(BaseClass): ...
	 */
	"python-class-definitions": `
		(class_definition
			name: (identifier) @class_name
			superclasses: (argument_list)? @superclasses
			body: (block) @class_body)
	`,

	/**
	 * Method definitions (메서드 정의 - 클래스 내부 함수)
	 * 예: def __init__(self, param): ...
	 */
	"python-method-definitions": `
		(class_definition
			body: (block
				(function_definition
					name: (identifier) @method_name
					parameters: (parameters) @parameters
					body: (block) @method_body)))
	`,

	/**
	 * Variable definitions (변수 정의/할당)
	 * 예: x = 10, my_var = "hello"
	 */
	"python-variable-definitions": `
		(assignment
			left: [
				(identifier) @variable_name
				(pattern_list (identifier) @variable_name)
			]
			right: (_) @value)
	`,
} as const;

/**
 * Python의 모든 Tree-sitter 쿼리 가져오기
 */
export function getPythonTreeSitterQueries(): Record<string, string> {
	return PYTHON_TREE_SITTER_QUERIES;
}

/**
 * 특정 Python 쿼리 가져오기
 */
export function getPythonTreeSitterQuery(
	queryName: string,
): string | undefined {
	return PYTHON_TREE_SITTER_QUERIES[
		queryName as keyof typeof PYTHON_TREE_SITTER_QUERIES
	];
}

/**
 * 모든 Python 쿼리 이름 목록
 */
export function getAllPythonQueryNames(): string[] {
	return Object.keys(PYTHON_TREE_SITTER_QUERIES);
}
