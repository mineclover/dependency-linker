/**
 * Query Results - Type Definitions
 * 모든 쿼리 결과 타입들의 통합 익스포트
 */

// ===== BASE TYPES =====
export * from "./base";

// ===== SPECIFIC RESULT TYPES =====
export * from "./imports";
export * from "./exports";
export * from "./classes";
export * from "./functions";

// ===== TYPE IMPORTS FOR CONVENIENCE =====
import type { CommentResult, IdentifierResult } from "./base";
import type {
  ImportSourceResult,
  NamedImportResult,
  DefaultImportResult,
  TypeImportResult,
  GoImportResult,
  JavaImportResult,
} from "./imports";
import type {
  ExportDeclarationResult,
  ExportAssignmentResult,
  GoExportResult,
  JavaExportResult,
} from "./exports";
import type {
  ClassDefinitionResult,
  InterfaceDefinitionResult,
  MethodDefinitionResult,
  PropertyDefinitionResult,
  StructDefinitionResult,
  EnumDefinitionResult,
} from "./classes";
import type {
  FunctionDeclarationResult,
  ArrowFunctionResult,
  FunctionCallResult,
  LambdaExpressionResult,
  ClosureResult,
} from "./functions";

// ===== LANGUAGE-SPECIFIC QUERY RESULT MAPS =====

/**
 * Base Query Result Map (공통 쿼리들)
 */
export interface BaseQueryResultMap {
  "comments": CommentResult;
  "identifiers": IdentifierResult;
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

/**
 * Java Query Result Map
 */
export interface JavaQueryResultMap extends BaseQueryResultMap {
  // Import/Export
  "java-import-declarations": JavaImportResult;
  "java-exports": JavaExportResult;

  // Classes and Interfaces
  "java-class-definitions": ClassDefinitionResult;
  "java-interface-definitions": InterfaceDefinitionResult;
  "java-enum-definitions": EnumDefinitionResult;
  "java-method-definitions": MethodDefinitionResult;
  "java-property-definitions": PropertyDefinitionResult;

  // Functions
  "java-function-declarations": FunctionDeclarationResult;
  "java-function-calls": FunctionCallResult;
  "java-lambda-expressions": LambdaExpressionResult;
}

/**
 * Unified Query Result Map (모든 언어 통합)
 */
export interface UnifiedQueryResultMap extends
  TypeScriptQueryResultMap,
  JavaScriptQueryResultMap,
  GoQueryResultMap,
  JavaQueryResultMap {
}

// ===== CONVENIENCE TYPES =====
export type QueryKey = keyof UnifiedQueryResultMap;
export type LanguageGroup = "typescript" | "javascript" | "go" | "java";

export type LanguageQueryKey<L extends LanguageGroup> =
  L extends "typescript" ? keyof TypeScriptQueryResultMap :
  L extends "javascript" ? keyof JavaScriptQueryResultMap :
  L extends "go" ? keyof GoQueryResultMap :
  keyof JavaQueryResultMap;

export type QueryResult<K extends QueryKey> = UnifiedQueryResultMap[K];

// ===== LEGACY COMPATIBILITY (기존 시스템과의 호환성) =====
export interface LegacyQueryResultMap {
  "import-sources": ImportSourceResult;
  "named-imports": NamedImportResult;
  "default-imports": DefaultImportResult;
  "type-imports": TypeImportResult;
}

// 기존 시스템과의 호환성을 위한 타입 별칭
export type ImportSourceResult_Legacy = ImportSourceResult;
export type NamedImportResult_Legacy = NamedImportResult;
export type DefaultImportResult_Legacy = DefaultImportResult;
export type TypeImportResult_Legacy = TypeImportResult;