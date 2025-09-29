/**
 * Query-Based AST Analysis Library
 * QueryResultMap 중심의 타입 안전한 AST 분석 라이브러리
 */

// ===== CORE SYSTEM =====
export * from "./core/types";
export {
  QueryResultMap,
  QueryKey,
  QueryResult,
  TypeScriptQueryResultMap,
  JavaScriptQueryResultMap,
  GoQueryResultMap,
  JavaQueryResultMap,
  LanguageSpecificQueryKey,
  LanguageSpecificQueryResult,
  isLanguageQueryKey,
  extractLanguageFromQueryKey,
  filterQueryKeysByLanguage,
  groupQueryKeysByLanguage
} from "./core/QueryResultMap";
export * from "./core/QueryEngine";

// ===== RESULT TYPES =====
export {
  UnifiedQueryResultMap,
  BaseQueryResultMap,
  ImportSourceResult,
  NamedImportResult,
  DefaultImportResult,
  TypeImportResult,
  ExportDeclarationResult,
  ExportAssignmentResult,
  GoExportResult,
  JavaExportResult,
  ClassDefinitionResult,
  InterfaceDefinitionResult,
  EnumDefinitionResult,
  FunctionDeclarationResult,
  MethodDefinitionResult,
  ArrowFunctionResult
} from "./results";

// ===== QUERY SYSTEMS =====
export * from "./queries/typescript";

// ===== MAPPING SYSTEMS =====
export * from "./mappers/CustomKeyMapper";

// ===== UTILITIES =====
export * from "./utils";

// ===== MAIN API =====
import { globalQueryEngine, registerQuery, executeQuery, executeQueries } from "./core/QueryEngine";
import { executeQueriesWithCustomKeys, createCustomKeyMapper, predefinedCustomMappings } from "./mappers/CustomKeyMapper";
import { registerTypeScriptQueries } from "./queries/typescript";

// 기본 쿼리들 자동 등록
registerTypeScriptQueries(globalQueryEngine);

// ===== CONVENIENCE EXPORTS =====
export const QueryEngine = {
  globalInstance: globalQueryEngine,
  registerQuery,
  executeQuery,
  executeQueries,
};

export const CustomKeyMapping = {
  execute: executeQueriesWithCustomKeys,
  createMapper: createCustomKeyMapper,
  predefined: predefinedCustomMappings,
};

// ===== DEFAULT EXPORT =====
export default {
  QueryEngine,
  CustomKeyMapping,
  predefinedMappings: predefinedCustomMappings,
  registerTypeScriptQueries,
};

// ===== LIBRARY INFO =====
export const LIBRARY_INFO = {
  name: "Query-Based AST Analysis Library",
  version: "3.0.0",
  description: "TypeScript-first AST analysis with extensible query system",
  features: [
    "QueryResultMap-based type safety",
    "Language-specific query grouping",
    "Custom key mapping system",
    "Extensible query architecture",
    "TypeScript-first design",
  ],
} as const;