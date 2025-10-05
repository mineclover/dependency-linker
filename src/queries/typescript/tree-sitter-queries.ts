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
			(import_clause
				(named_imports
					(import_specifier
						(identifier) @name))))
	`,

	/**
	 * Default imports (기본 임포트)
	 * 예: import React from 'react'
	 */
	"ts-default-imports": `
		(import_statement
			(import_clause
				(identifier) @import_name)
			source: (string) @source)
	`,

	/**
	 * Type-only imports (타입 전용 임포트)
	 * 예: import type { User } from './types'
	 */
	"ts-type-imports": `
		(import_statement
			"type"
			(import_clause
				(named_imports
					(import_specifier
						(identifier) @name)))
			source: (string) @source)
	`,

	// ===== EXPORT QUERIES =====

	/**
	 * Export declarations (익스포트 선언)
	 * 예: export const foo = 'bar', export function test() {}
	 */
	"ts-export-declarations": `
		(export_statement
			(lexical_declaration
				(variable_declarator
					name: (identifier) @export_name))) @export_statement
	`,

	/**
	 * Export assignments (익스포트 할당)
	 * 예: export default Component, export = module
	 */
	"ts-export-assignments": `
		(export_statement "default") @default_export
	`,

	// ===== SYMBOL DEFINITION QUERIES =====

	/**
	 * Class definitions (클래스 정의)
	 * 예: class MyClass extends BaseClass implements IMyInterface
	 */
	"ts-class-definitions": `
		(class_declaration
			name: (type_identifier) @class_name
			type_parameters: (type_parameters)? @type_params
			(class_heritage)? @heritage
			body: (class_body) @class_body) @class
	`,

	/**
	 * Interface definitions (인터페이스 정의)
	 * 예: interface IMyInterface extends BaseInterface
	 */
	"ts-interface-definitions": `
		(interface_declaration
			name: (type_identifier) @interface_name
			type_parameters: (type_parameters)? @type_params
			body: (interface_body) @interface_body) @interface
	`,

	/**
	 * Function definitions (함수 정의)
	 * 예: function myFunction(param: string): number
	 */
	"ts-function-definitions": `
		(function_declaration
			name: (identifier) @function_name
			type_parameters: (type_parameters)? @type_params
			parameters: (formal_parameters) @params
			return_type: (type_annotation)? @return_type
			body: (statement_block) @function_body) @function
	`,

	/**
	 * Method definitions (메서드 정의)
	 * 예: myMethod(param: string): void
	 */
	"ts-method-definitions": `
		(method_definition
			name: [
				(property_identifier) @method_name
				(computed_property_name) @computed_name
			]
			parameters: (formal_parameters) @params
			return_type: (type_annotation)? @return_type
			body: (statement_block) @method_body) @method
	`,

	/**
	 * Type alias definitions (타입 별칭 정의)
	 * 예: type MyType = string | number
	 */
	"ts-type-definitions": `
		(type_alias_declaration
			name: (type_identifier) @type_name
			type_parameters: (type_parameters)? @type_params
			value: (_) @type_value) @type_def
	`,

	/**
	 * Enum definitions (열거형 정의)
	 * 예: enum Color { Red, Green, Blue }
	 */
	"ts-enum-definitions": `
		(enum_declaration
			name: (identifier) @enum_name
			body: (enum_body) @enum_body) @enum
	`,

	/**
	 * Variable declarations (변수 선언)
	 * 예: const myVar: string = "hello"
	 */
	"ts-variable-definitions": `
		(lexical_declaration
			(variable_declarator
				name: (identifier) @var_name
				type: (type_annotation)? @var_type
				value: (_)? @var_value)) @variable
	`,

	/**
	 * Arrow function declarations (화살표 함수)
	 * 예: const myFunc = (param: string): number => { }
	 */
	"ts-arrow-function-definitions": `
		(lexical_declaration
			(variable_declarator
				name: (identifier) @function_name
				value: (arrow_function
					parameters: (_) @params
					return_type: (type_annotation)? @return_type
					body: (_) @function_body))) @arrow_function
	`,

	/**
	 * Property definitions (클래스 프로퍼티)
	 * 예: private myProperty: string;
	 */
	"ts-property-definitions": `
		(public_field_definition
			name: (property_identifier) @property_name
			type: (type_annotation)? @property_type
			value: (_)? @property_value) @property
	`,

	// ===== DEPENDENCY TRACKING QUERIES =====

	/**
	 * Function/method calls (함수/메서드 호출)
	 * 예: someFunction(), obj.method(), this.helper(), super()
	 */
	"ts-call-expressions": `
		(call_expression
			function: [
				(identifier) @function_name
				(super) @super_call
				(member_expression
					object: (_) @object
					property: (property_identifier) @method_name)
			]
			arguments: (arguments) @args) @call
	`,

	/**
	 * Class instantiation (클래스 인스턴스화)
	 * 예: new MyClass(), new pkg.MyClass()
	 */
	"ts-new-expressions": `
		(new_expression
			constructor: [
				(identifier) @class_name
				(member_expression
					property: (property_identifier) @class_name)
			]
			arguments: (arguments)? @args) @new_expr
	`,

	/**
	 * Property access (속성 접근)
	 * 예: obj.property, this.field
	 */
	"ts-member-expressions": `
		(member_expression
			object: (_) @object
			property: (property_identifier) @property_name) @member_access
	`,

	/**
	 * Type references in annotations (타입 참조)
	 * 예: param: SomeType, : ReturnType
	 */
	"ts-type-references": `
		(type_annotation
			[
				(type_identifier) @type_name
				(generic_type
					name: (type_identifier) @type_name)
			]) @type_ref
	`,

	/**
	 * Class inheritance (클래스 상속)
	 * 예: class MyClass extends BaseClass
	 */
	"ts-extends-clause": `
		(class_heritage
			(extends_clause
				value: [
					(identifier) @base_class
					(member_expression
						property: (property_identifier) @base_class)
				])) @extends
	`,

	/**
	 * Interface implementation (인터페이스 구현)
	 * 예: class MyClass implements IInterface
	 */
	"ts-implements-clause": `
		(class_heritage
			(implements_clause
				(type_identifier) @interface_name)) @implements
	`,
} as const;

/**
 * JavaScript 전용 Tree-sitter 쿼리 (TypeScript와 유사하지만 타입 관련 제외)
 */
export const JAVASCRIPT_TREE_SITTER_QUERIES = {
	// Import/Export queries
	"js-import-sources": TYPESCRIPT_TREE_SITTER_QUERIES["ts-import-sources"],
	"js-named-imports": TYPESCRIPT_TREE_SITTER_QUERIES["ts-named-imports"],
	"js-default-imports": TYPESCRIPT_TREE_SITTER_QUERIES["ts-default-imports"],
	"js-export-declarations":
		TYPESCRIPT_TREE_SITTER_QUERIES["ts-export-declarations"],
	"js-export-assignments":
		TYPESCRIPT_TREE_SITTER_QUERIES["ts-export-assignments"],

	// Symbol definition queries (타입 관련 쿼리 제외)
	"js-class-definitions":
		TYPESCRIPT_TREE_SITTER_QUERIES["ts-class-definitions"],
	"js-function-definitions":
		TYPESCRIPT_TREE_SITTER_QUERIES["ts-function-definitions"],
	"js-method-definitions":
		TYPESCRIPT_TREE_SITTER_QUERIES["ts-method-definitions"],
	"js-variable-definitions":
		TYPESCRIPT_TREE_SITTER_QUERIES["ts-variable-definitions"],
	"js-arrow-function-definitions":
		TYPESCRIPT_TREE_SITTER_QUERIES["ts-arrow-function-definitions"],
	"js-property-definitions":
		TYPESCRIPT_TREE_SITTER_QUERIES["ts-property-definitions"],

	// Dependency tracking queries (타입 참조 제외)
	"js-call-expressions": TYPESCRIPT_TREE_SITTER_QUERIES["ts-call-expressions"],
	"js-new-expressions": TYPESCRIPT_TREE_SITTER_QUERIES["ts-new-expressions"],
	"js-member-expressions":
		TYPESCRIPT_TREE_SITTER_QUERIES["ts-member-expressions"],
	"js-extends-clause": TYPESCRIPT_TREE_SITTER_QUERIES["ts-extends-clause"],
	// JavaScript에는 interface, type, enum 없음
} as const;

/**
 * 언어별 쿼리 매핑
 */
export const TREE_SITTER_QUERY_MAP: Record<
	SupportedLanguage,
	Record<string, string>
> = {
	typescript: TYPESCRIPT_TREE_SITTER_QUERIES,
	tsx: TYPESCRIPT_TREE_SITTER_QUERIES,
	javascript: JAVASCRIPT_TREE_SITTER_QUERIES,
	jsx: JAVASCRIPT_TREE_SITTER_QUERIES,
	// 다른 언어들은 아직 미구현
	go: {},
	java: {},
	python: {},
	markdown: {}, // Markdown uses custom parser, not tree-sitter
	external: {},
	unknown: {},
} as const;

/**
 * 특정 언어의 모든 Tree-sitter 쿼리 가져오기
 */
export function getTreeSitterQueries(
	language: SupportedLanguage,
): Record<string, string> {
	return TREE_SITTER_QUERY_MAP[language] || {};
}

/**
 * 특정 언어의 특정 쿼리 가져오기
 */
export function getTreeSitterQuery(
	language: SupportedLanguage,
	queryName: string,
): string | undefined {
	const queries = getTreeSitterQueries(language);
	return queries[queryName];
}

/**
 * 모든 지원되는 쿼리 이름 목록
 */
export function getAllQueryNames(language: SupportedLanguage): string[] {
	return Object.keys(getTreeSitterQueries(language));
}
