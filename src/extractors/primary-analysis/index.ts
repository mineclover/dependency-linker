/**
 * Functional Query System - 함수형 쿼리 시스템 통합 인덱스
 *
 * 이 파일은 새로운 함수형 쿼리 시스템의 모든 컴포넌트를 통합하고
 * 타입 안전한 API를 제공합니다.
 */

// 핵심 함수형 쿼리 시스템
export {
	// 기본 쿼리 함수들
	importSourceQuery,
	namedImportQuery,
	defaultImportQuery,
	typeImportQuery,
	queryMapper,
	executeQuery,
	getQueryInfo,
	supportsLanguage,
	allQueryKeys,
	getQueryKeysForLanguage,
	typeScriptQueryKeys,
	javaScriptQueryKeys,

	// 동적 키 기반 객체 구조 함수들
	executeQueryAsDynamicObject,
	executeMultipleQueriesAsDynamicObject,
	executeConditionalQueriesAsDynamicObject,
	createDynamicQueryMapper,
	createLanguageSpecificQueryMapper,
	dynamicQueryHelpers,
	getQueryObject,
	getAllQueryObjects,

	// 사용자 정의 키 매핑 함수들
	executeQueriesWithCustomKeys,
	executeConditionalQueriesWithCustomKeys,
	createCustomKeyMapper,
	predefinedCustomMappings,

	// 타입들
	type QueryFunction,
	type QueryResultMap,
	type QueryKey,
	type TypedQueryFunction,
	type QueryInfo,
	type DynamicQueryResult,
	type CustomKeyMapping,
	type CustomKeyMappingResult,
} from "./queries/ImportQueries";

// 함수형 쿼리 엔진
export {
	FunctionalQueryEngine,
	extractImportSources,
	extractNamedImports,
	extractTypeImports,
	performFullImportAnalysis,
	calculatePerformanceMetrics,

	// 타입들
	type QueryExecutionResult,
	type MultiQueryExecutionResult,
	type QueryExecutionOptions,
	type QueryPerformanceMetrics,
} from "./core/QueryEngine";

// 함수형 쿼리 조합
export {
	FunctionalQueryComposer,
	analyzeImports,
	analyzeTypeScriptTypes,
	analyzeJavaScript,
	unifyAnalysisResults,
	withTiming,
	timedAnalyzeImports,
	timedAnalyzeTypeScriptTypes,
	timedAnalyzeJavaScript,
	CompositionFactory,

	// 타입들
	type ComposableResults,
	type CompositionKey,
	type UnifiedAnalysisResult,
} from "./core/QueryComposition";

// 결과 타입들 (기존과 호환)
export type {
	ImportSourceResult,
	NamedImportResult,
	DefaultImportResult,
	TypeImportResult,
	ExtendedSourceLocation,
} from "./results/QueryResults";

// 기존 시스템과의 호환성
export type { SupportedLanguage } from "./core/ASTProvider";
export type { QueryExecutionContext } from "./core/QueryEngine";

// 함수형 쿼리 시스템을 위한 헬퍼 유틸리티들
export { predefinedCustomMappings, createCustomKeyMapper, createDynamicQueryMapper };

/**
 * 사용법 예시와 패턴들
 */

// 1. 기본 사용법 - 사용자 정의 키 매핑
export const usageExamples = {
	/**
	 * React 컴포넌트 분석 예시
	 */
	reactComponentAnalysis: {
		code: `
// 사용자 정의 키 매핑으로 React 분석
const mapping = {
	sources: "import-sources",
	namedImports: "named-imports",
	types: "type-imports"
} as const;
const result = executeQueriesWithCustomKeys(mapping, matches, context);
// result: { sources: ImportSourceResult[], namedImports: NamedImportResult[], types: TypeImportResult[] }
		`
	},

	/**
	 * JavaScript 모듈 분석 예시
	 */
	jsModuleAnalysis: {
		code: `
// JavaScript 모듈 분석 (TypeScript 타입 제외)
const mapper = createCustomKeyMapper({
	sources: "import-sources",
	namedImports: "named-imports",
	defaultImports: "default-imports"
});
const result = mapper.execute(matches, context);
// result: { sources: ImportSourceResult[], namedImports: NamedImportResult[], defaultImports: DefaultImportResult[] }
		`
	},

	/**
	 * 조건부 실행 예시
	 */
	conditionalExecution: {
		code: `
// 조건부 쿼리 실행
const mapping = { allSources: "import-sources", types: "type-imports", defaults: "default-imports" } as const;
const conditions = { allSources: true, types: true, defaults: false };
const result = executeConditionalQueriesWithCustomKeys(mapping, conditions, matches, context);
// result: { allSources: ImportSourceResult[], types: TypeImportResult[] } // defaults는 제외됨
		`
	}
};

/**
 * 마이그레이션 가이드
 */

// 기존 클래스 기반 접근법:
// const query = new ImportSourceQuery();
// const results = query.processMatches(matches, context);

// 새로운 함수형 접근법 - 사용자 정의 키 매핑:
// const mapping = { sources: "import-sources", named: "named-imports" } as const;
// const results = executeQueriesWithCustomKeys(mapping, matches, context);
// // results: { sources: ImportSourceResult[], named: NamedImportResult[] }

// 기존 조합 접근법:
// const composer = new CombinableQuerySystem();
// const analysis = composer.buildImportAnalysis(...);

// 새로운 함수형 조합 접근법:
// const mapper = createCustomKeyMapper({ sources: "import-sources", namedImports: "named-imports" });
// const analysis = mapper.execute(matches, context);

export default { predefinedCustomMappings, createCustomKeyMapper, createDynamicQueryMapper };