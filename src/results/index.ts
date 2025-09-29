/**
 * Query Results - Type Definitions
 * 모든 쿼리 결과 타입들의 통합 익스포트
 */

// ===== BASE TYPES =====
export * from "./base";
export * from "./classes";
export * from "./exports";
export * from "./functions";
// ===== SPECIFIC RESULT TYPES =====
export * from "./imports";
export * from "./java";
export * from "./python";

// ===== TYPE IMPORTS FOR CONVENIENCE =====
import type { CommentResult, IdentifierResult } from "./base";
import type {
	ClassDefinitionResult,
	EnumDefinitionResult,
	InterfaceDefinitionResult,
	MethodDefinitionResult,
	PropertyDefinitionResult,
	StructDefinitionResult,
} from "./classes";
import type {
	ExportAssignmentResult,
	ExportDeclarationResult,
	GoExportResult,
} from "./exports";
import type {
	ArrowFunctionResult,
	ClosureResult,
	FunctionCallResult,
	FunctionDeclarationResult,
} from "./functions";
import type {
	DefaultImportResult,
	GoImportResult,
	ImportSourceResult,
	NamedImportResult,
	TypeImportResult,
} from "./imports";
import type { JavaQueryResultMap } from "./java";
import type { PythonQueryResultMap } from "./python";

// ===== LANGUAGE-SPECIFIC QUERY RESULT MAPS =====

/**
 * Base Query Result Map (공통 쿼리들)
 */
export interface BaseQueryResultMap {
	comments: CommentResult;
	identifiers: IdentifierResult;
}

/**
 * TypeScript Query Result Map
 */
export interface TypeScriptQueryResultMap extends BaseQueryResultMap {
	// Import/Export
	"ts-import-sources": ImportSourceResult;
	"ts-named-imports": NamedImportResult;
	"ts-default-imports": DefaultImportResult;
	"ts-type-imports": TypeImportResult;
	"ts-export-declarations": ExportDeclarationResult;
	"ts-export-assignments": ExportAssignmentResult;

	// Classes and Types
	"ts-class-definitions": ClassDefinitionResult;
	"ts-interface-definitions": InterfaceDefinitionResult;
	"ts-enum-definitions": EnumDefinitionResult;
	"ts-method-definitions": MethodDefinitionResult;
	"ts-property-definitions": PropertyDefinitionResult;

	// Functions
	"ts-function-declarations": FunctionDeclarationResult;
	"ts-arrow-functions": ArrowFunctionResult;
	"ts-function-calls": FunctionCallResult;
}

/**
 * JavaScript Query Result Map
 */
export interface JavaScriptQueryResultMap extends BaseQueryResultMap {
	// Import/Export
	"js-import-sources": ImportSourceResult;
	"js-named-imports": NamedImportResult;
	"js-default-imports": DefaultImportResult;
	"js-export-declarations": ExportDeclarationResult;

	// Classes
	"js-class-definitions": ClassDefinitionResult;
	"js-method-definitions": MethodDefinitionResult;
	"js-property-definitions": PropertyDefinitionResult;

	// Functions
	"js-function-declarations": FunctionDeclarationResult;
	"js-arrow-functions": ArrowFunctionResult;
	"js-function-calls": FunctionCallResult;
}

/**
 * Go Query Result Map
 */
export interface GoQueryResultMap extends BaseQueryResultMap {
	// Package and Imports
	"go-import-declarations": GoImportResult;
	"go-exports": GoExportResult;

	// Types
	"go-struct-definitions": StructDefinitionResult;

	// Functions
	"go-function-declarations": FunctionDeclarationResult;
	"go-function-calls": FunctionCallResult;
	"go-closures": ClosureResult;
}

// Java QueryResultMap is imported from "./java"

/**
 * Unified Query Result Map (모든 언어 통합)
 */
export interface UnifiedQueryResultMap
	extends TypeScriptQueryResultMap,
		JavaScriptQueryResultMap,
		GoQueryResultMap,
		JavaQueryResultMap,
		PythonQueryResultMap {}

// ===== CONVENIENCE TYPES =====
export type QueryKey = keyof UnifiedQueryResultMap;
export type LanguageGroup =
	| "typescript"
	| "javascript"
	| "go"
	| "java"
	| "python";

export type LanguageQueryKey<L extends LanguageGroup> = L extends "typescript"
	? keyof TypeScriptQueryResultMap
	: L extends "javascript"
		? keyof JavaScriptQueryResultMap
		: L extends "go"
			? keyof GoQueryResultMap
			: L extends "java"
				? keyof JavaQueryResultMap
				: keyof PythonQueryResultMap;

export type QueryResult<K extends QueryKey> = UnifiedQueryResultMap[K];
