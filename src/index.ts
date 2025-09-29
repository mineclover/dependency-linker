/**
 * Query-Based AST Analysis Library
 * QueryResultMap 중심의 타입 안전한 AST 분석 라이브러리
 */

export * from "./core/QueryEngine";
export {
	extractLanguageFromQueryKey,
	filterQueryKeysByLanguage,
	GoQueryResultMap,
	groupQueryKeysByLanguage,
	isLanguageQueryKey,
	JavaQueryResultMap,
	JavaScriptQueryResultMap,
	LanguageSpecificQueryKey,
	LanguageSpecificQueryResult,
	PythonQueryResultMap,
	QueryKey,
	QueryResult,
	QueryResultMap,
	TypeScriptQueryResultMap,
} from "./core/QueryResultMap";
// ===== CORE SYSTEM =====
export * from "./core/types";
// ===== MAPPING SYSTEMS =====
export * from "./mappers/CustomKeyMapper";
export { javaQueries, registerJavaQueries } from "./queries/java";
export { pythonQueries, registerPythonQueries } from "./queries/python";
// ===== QUERY SYSTEMS =====
export {
	registerTypeScriptQueries,
	typeScriptQueries,
} from "./queries/typescript";
// ===== RESULT TYPES =====
export {
	ArrowFunctionResult,
	BaseQueryResultMap,
	ClassDefinitionResult,
	DefaultImportResult,
	EnumDefinitionResult,
	ExportAssignmentResult,
	ExportDeclarationResult,
	FunctionDeclarationResult,
	GoExportResult,
	ImportSourceResult,
	InterfaceDefinitionResult,
	JavaExportResult,
	MethodDefinitionResult,
	NamedImportResult,
	TypeImportResult,
	UnifiedQueryResultMap,
} from "./results";

// ===== UTILITIES =====
export * from "./utils";

// ===== MAIN API =====
import {
	executeQueries,
	executeQuery,
	globalQueryEngine,
	registerQuery,
} from "./core/QueryEngine";
import {
	createCustomKeyMapper,
	executeQueriesWithCustomKeys,
	predefinedCustomMappings,
} from "./mappers/CustomKeyMapper";
import { registerJavaQueries } from "./queries/java";
import { registerPythonQueries } from "./queries/python";
import { registerTypeScriptQueries } from "./queries/typescript";

// 기본 쿼리들 자동 등록
registerTypeScriptQueries(globalQueryEngine);
registerJavaQueries(globalQueryEngine);
registerPythonQueries(globalQueryEngine);

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
	registerJavaQueries,
	registerPythonQueries,
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
