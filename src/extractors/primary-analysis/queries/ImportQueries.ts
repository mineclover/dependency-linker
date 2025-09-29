/**
 * Functional Queries - 함수형 쿼리 시스템
 * 단일 매퍼에서 키-네임으로 쿼리를 호출하고 타입 추론이 가능한 시스템
 */

import type {
	ImportSourceResult,
	NamedImportResult,
	DefaultImportResult,
	TypeImportResult,
	ExtendedSourceLocation,
} from "../results/QueryResults";
import type { QueryExecutionContext, QueryMatch } from "../core/QueryEngine";
import type { SupportedLanguage } from "../core/ASTProvider";

/**
 * 쿼리 함수 타입 정의
 */
export type QueryFunction<TResult, TCaptureNames extends string = string> = {
	readonly name: string;
	readonly description: string;
	readonly query: string;
	readonly languages: readonly SupportedLanguage[];
	readonly priority: number;
	readonly resultType: string;
	readonly processor: (matches: QueryMatch<TCaptureNames>[], context: QueryExecutionContext) => TResult[];
};

/**
 * 쿼리 실행 결과 타입 매핑
 */
export interface QueryResultMap {
	"import-sources": ImportSourceResult;
	"named-imports": NamedImportResult;
	"default-imports": DefaultImportResult;
	"type-imports": TypeImportResult;
}

/**
 * 쿼리 키 타입
 */
export type QueryKey = keyof QueryResultMap;

/**
 * 타입 안전한 쿼리 함수 타입
 */
export type TypedQueryFunction<K extends QueryKey> = QueryFunction<QueryResultMap[K]>;

/**
 * 유틸리티 함수들
 */
const extractStringFromNode = (node: any): string => {
	const text = node.text;
	return text.slice(1, -1);
};

const extractLocation = (node: any): ExtendedSourceLocation => ({
	line: node.startPosition.row + 1,
	column: node.startPosition.column,
	offset: 0,
	endLine: node.endPosition.row + 1,
	endColumn: node.endPosition.column,
	endOffset: 0,
});

const groupCaptures = (captures: Array<{ name: string; node: any }>): Record<string, any[]> => {
	const grouped: Record<string, any[]> = {};
	for (const capture of captures) {
		if (!grouped[capture.name]) grouped[capture.name] = [];
		grouped[capture.name].push(capture.node);
	}
	return grouped;
};

/**
 * Import Source 쿼리 함수
 */
export const importSourceQuery: TypedQueryFunction<"import-sources"> = {
	name: "import-sources",
	description: "Extract all import sources from import statements",
	query: `
		(import_statement
			source: (string) @source)
	`,
	languages: ["typescript", "tsx", "javascript", "jsx"] as const,
	priority: 100,
	resultType: "import-sources",
	processor: (matches, context) => {
		const results: ImportSourceResult[] = [];

		for (const match of matches) {
			for (const capture of match.captures) {
				if (capture.name === "source") {
					const sourceValue = extractStringFromNode(capture.node);
					const location = extractLocation(capture.node);

					results.push({
						queryName: "import-sources",
						location,
						nodeText: capture.node.text,
						source: sourceValue,
						isRelative: sourceValue.startsWith("."),
						type: sourceValue.startsWith(".") ? "local" : "package",
					});
				}
			}
		}

		return results;
	},
};

/**
 * Named Import 쿼리 함수
 */
export const namedImportQuery: TypedQueryFunction<"named-imports"> = {
	name: "named-imports",
	description: "Extract named imports from import statements",
	query: `
		(import_statement
			(import_clause
				(named_imports
					(import_specifier
						name: (identifier) @named_import
						alias: (identifier)? @import_alias)))
			source: (string) @source)
	`,
	languages: ["typescript", "tsx", "javascript", "jsx"] as const,
	priority: 95,
	resultType: "named-imports",
	processor: (matches, context) => {
		const results: NamedImportResult[] = [];

		for (const match of matches) {
			const captures = groupCaptures(match.captures);
			const sources = captures.source || [];
			const namedImports = captures.named_import || [];
			const aliases = captures.import_alias || [];

			for (let i = 0; i < namedImports.length; i++) {
				const namedImport = namedImports[i];
				const source = sources[Math.min(i, sources.length - 1)];
				const alias = aliases[i];

				if (namedImport && source) {
					results.push({
						queryName: "named-imports",
						location: extractLocation(namedImport),
						nodeText: namedImport.text,
						name: namedImport.text,
						source: extractStringFromNode(source),
						alias: alias?.text,
						originalName: namedImport.text,
					});
				}
			}
		}

		return results;
	},
};

/**
 * Default Import 쿼리 함수
 */
export const defaultImportQuery: TypedQueryFunction<"default-imports"> = {
	name: "default-imports",
	description: "Extract default imports from import statements",
	query: `
		(import_statement
			(import_clause
				(identifier) @default_import)
			source: (string) @source)
	`,
	languages: ["typescript", "tsx", "javascript", "jsx"] as const,
	priority: 90,
	resultType: "default-imports",
	processor: (matches, context) => {
		const results: DefaultImportResult[] = [];

		for (const match of matches) {
			const captures = groupCaptures(match.captures);
			const defaultImports = captures.default_import || [];
			const sources = captures.source || [];

			for (let i = 0; i < defaultImports.length; i++) {
				const defaultImport = defaultImports[i];
				const source = sources[Math.min(i, sources.length - 1)];

				if (defaultImport && source) {
					results.push({
						queryName: "default-imports",
						location: extractLocation(defaultImport),
						nodeText: defaultImport.text,
						name: defaultImport.text,
						source: extractStringFromNode(source),
					});
				}
			}
		}

		return results;
	},
};

/**
 * Type Import 쿼리 함수
 */
export const typeImportQuery: TypedQueryFunction<"type-imports"> = {
	name: "type-imports",
	description: "Extract TypeScript type imports from import statements",
	query: `
		(import_statement
			"type"
			(import_clause
				(named_imports
					(import_specifier
						name: (identifier) @type_name
						alias: (identifier)? @type_alias)))
			source: (string) @source)
	`,
	languages: ["typescript", "tsx"] as const,
	priority: 88,
	resultType: "type-imports",
	processor: (matches, context) => {
		const results: TypeImportResult[] = [];

		for (const match of matches) {
			const captures = groupCaptures(match.captures);
			const sources = captures.source || [];
			const typeNames = captures.type_name || [];
			const typeAliases = captures.type_alias || [];

			if (sources.length > 0) {
				const source = extractStringFromNode(sources[0]);

				typeNames.forEach((typeNode, i) => {
					const alias = typeAliases[i];
					results.push({
						queryName: "type-imports",
						location: extractLocation(typeNode),
						nodeText: typeNode.text,
						typeName: typeNode.text,
						source,
						alias: alias?.text,
						importType: "named",
					});
				});
			}
		}

		return results;
	},
};

/**
 * 쿼리 정보 객체 타입 - keyName 포함
 */
export interface QueryInfo<K extends QueryKey> {
	keyName: K;
	queryFunction: TypedQueryFunction<K>;
	name: string;
	description: string;
	query: string;
	languages: readonly SupportedLanguage[];
	priority: number;
	resultType: string;
}

/**
 * 단일 쿼리 매퍼 - 키-네임으로 쿼리 함수 매핑
 */
const createQueryMapper = () => {
	const mapper = {
		"import-sources": importSourceQuery,
		"named-imports": namedImportQuery,
		"default-imports": defaultImportQuery,
		"type-imports": typeImportQuery,
	} as const satisfies Record<QueryKey, TypedQueryFunction<QueryKey>>;

	return mapper;
};

export const queryMapper = createQueryMapper();

/**
 * 타입 안전한 쿼리 실행 함수
 */
export function executeQuery<K extends QueryKey>(
	queryKey: K,
	matches: QueryMatch<any>[],
	context: QueryExecutionContext
): QueryResultMap[K][] {
	const queryFunction = queryMapper[queryKey];
	return queryFunction.processor(matches, context) as QueryResultMap[K][];
}

/**
 * keyName을 포함한 쿼리 정보 가져오기
 */
export function getQueryInfo<K extends QueryKey>(queryKey: K): QueryInfo<K> {
	const queryFunction = queryMapper[queryKey];
	const { processor, ...info } = queryFunction;

	return {
		keyName: queryKey,
		queryFunction: queryFunction as TypedQueryFunction<K>,
		...info,
	};
}

/**
 * keyName을 포함한 쿼리 객체 가져오기 (타입 안전)
 */
export function getQueryObject<K extends QueryKey>(queryKey: K): {
	keyName: K;
	queryFunction: TypedQueryFunction<K>;
	execute: (matches: QueryMatch<any>[], context: QueryExecutionContext) => QueryResultMap[K][];
} {
	const queryFunction = queryMapper[queryKey];

	return {
		keyName: queryKey,
		queryFunction: queryFunction as TypedQueryFunction<K>,
		execute: (matches, context) => queryFunction.processor(matches, context) as QueryResultMap[K][],
	};
}

/**
 * 모든 쿼리의 keyName과 정보 가져오기
 */
export function getAllQueryObjects(): {
	[K in QueryKey]: {
		keyName: K;
		queryFunction: TypedQueryFunction<K>;
		execute: (matches: QueryMatch<any>[], context: QueryExecutionContext) => QueryResultMap[K][];
	}
} {
	return {
		"import-sources": getQueryObject("import-sources"),
		"named-imports": getQueryObject("named-imports"),
		"default-imports": getQueryObject("default-imports"),
		"type-imports": getQueryObject("type-imports"),
	};
}

/**
 * 지원되는 언어 확인
 */
export function supportsLanguage<K extends QueryKey>(queryKey: K, language: SupportedLanguage): boolean {
	const queryFunction = queryMapper[queryKey];
	return queryFunction.languages.includes(language);
}

/**
 * 모든 쿼리 키 목록
 */
export const allQueryKeys: QueryKey[] = Object.keys(queryMapper) as QueryKey[];

/**
 * 언어별 쿼리 키 필터링
 */
export function getQueryKeysForLanguage(language: SupportedLanguage): QueryKey[] {
	return allQueryKeys.filter(key => supportsLanguage(key, language));
}

/**
 * TypeScript 전용 쿼리 키들
 */
export const typeScriptQueryKeys: QueryKey[] = ["import-sources", "named-imports", "default-imports", "type-imports"];

/**
 * JavaScript 전용 쿼리 키들
 */
export const javaScriptQueryKeys: QueryKey[] = ["import-sources", "named-imports", "default-imports"];

/**
 * 동적 키 기반 객체 구조 시스템
 */

/**
 * 동적 키 기반 쿼리 결과 타입
 * {[keyName]: QueryResultMap[keyName][]}
 */
export type DynamicQueryResult<K extends QueryKey> = {
	[key in K]: QueryResultMap[key][];
};

/**
 * 단일 쿼리를 동적 키 객체로 실행
 */
export function executeQueryAsDynamicObject<K extends QueryKey>(
	queryKey: K,
	matches: QueryMatch<any>[],
	context: QueryExecutionContext
): DynamicQueryResult<K> {
	const results = executeQuery(queryKey, matches, context);
	return {
		[queryKey]: results
	} as DynamicQueryResult<K>;
}

/**
 * 다중 쿼리를 동적 키 객체로 실행
 */
export function executeMultipleQueriesAsDynamicObject<K extends QueryKey>(
	queryKeys: readonly K[],
	matches: QueryMatch<any>[],
	context: QueryExecutionContext
): DynamicQueryResult<K> {
	const results: Partial<DynamicQueryResult<K>> = {};

	for (const queryKey of queryKeys) {
		const queryResults = executeQuery(queryKey, matches, context);
		(results as any)[queryKey] = queryResults;
	}

	return results as DynamicQueryResult<K>;
}

/**
 * 조건부 쿼리를 동적 키 객체로 실행
 */
export function executeConditionalQueriesAsDynamicObject<K extends QueryKey>(
	queryConditions: { queryKey: K; condition: boolean }[],
	matches: QueryMatch<any>[],
	context: QueryExecutionContext
): Partial<DynamicQueryResult<K>> {
	const results: Partial<DynamicQueryResult<K>> = {};

	for (const { queryKey, condition } of queryConditions) {
		if (condition) {
			const queryResults = executeQuery(queryKey, matches, context);
			(results as any)[queryKey] = queryResults;
		}
	}

	return results;
}

/**
 * 동적 키를 사용한 쿼리 매퍼 생성
 */
export function createDynamicQueryMapper<K extends QueryKey>(
	queryKeys: readonly K[]
): {
	execute: (matches: QueryMatch<any>[], context: QueryExecutionContext) => DynamicQueryResult<K>;
	executeConditional: (
		conditions: { [key in K]?: boolean },
		matches: QueryMatch<any>[],
		context: QueryExecutionContext
	) => Partial<DynamicQueryResult<K>>;
} {
	return {
		execute: (matches, context) => executeMultipleQueriesAsDynamicObject(queryKeys, matches, context),
		executeConditional: (conditions, matches, context) => {
			const queryConditions = queryKeys
				.filter(key => conditions[key] !== false)
				.map(queryKey => ({ queryKey, condition: conditions[queryKey] ?? true }));
			return executeConditionalQueriesAsDynamicObject(queryConditions, matches, context);
		}
	};
}

/**
 * 언어별 동적 쿼리 매퍼 생성
 */
export function createLanguageSpecificQueryMapper(language: SupportedLanguage) {
	const supportedKeys = getQueryKeysForLanguage(language);
	return createDynamicQueryMapper(supportedKeys);
}

/**
 * 사용자 정의 키 매핑 시스템
 */

/**
 * 사용자 정의 키 매핑 타입
 * TMapping: { [userKey: string]: QueryKey }
 */
export type CustomKeyMapping<TMapping extends Record<string, QueryKey>> = TMapping;

/**
 * 사용자 정의 키 매핑 결과 타입
 * { [K in keyof TMapping]: QueryResultMap[TMapping[K]][] }
 */
export type CustomKeyMappingResult<TMapping extends Record<string, QueryKey>> = {
	[K in keyof TMapping]: QueryResultMap[TMapping[K]][];
};

/**
 * 사용자 정의 키 매핑으로 쿼리 실행
 *
 * @example
 * const mapping = { sources: "import-sources", defaults: "default-imports" } as const;
 * const result = executeQueriesWithCustomKeys(mapping, matches, context);
 * // result: { sources: ImportSourceResult[], defaults: DefaultImportResult[] }
 */
export function executeQueriesWithCustomKeys<TMapping extends Record<string, QueryKey>>(
	keyMapping: TMapping,
	matches: QueryMatch<any>[],
	context: QueryExecutionContext
): CustomKeyMappingResult<TMapping> {
	const result = {} as CustomKeyMappingResult<TMapping>;

	for (const [userKey, queryKey] of Object.entries(keyMapping)) {
		const queryResults = executeQuery(queryKey, matches, context);
		(result as any)[userKey] = queryResults;
	}

	return result;
}

/**
 * 조건부 사용자 정의 키 매핑으로 쿼리 실행
 *
 * @example
 * const mapping = { sources: "import-sources", defaults: "default-imports" } as const;
 * const conditions = { sources: true, defaults: false };
 * const result = executeConditionalQueriesWithCustomKeys(mapping, conditions, matches, context);
 * // result: { sources: ImportSourceResult[] } // defaults는 제외됨
 */
export function executeConditionalQueriesWithCustomKeys<TMapping extends Record<string, QueryKey>>(
	keyMapping: TMapping,
	conditions: { [K in keyof TMapping]?: boolean },
	matches: QueryMatch<any>[],
	context: QueryExecutionContext
): Partial<CustomKeyMappingResult<TMapping>> {
	const result = {} as Partial<CustomKeyMappingResult<TMapping>>;

	for (const [userKey, queryKey] of Object.entries(keyMapping)) {
		const condition = conditions[userKey as keyof TMapping];
		if (condition !== false) { // undefined나 true면 실행
			const queryResults = executeQuery(queryKey, matches, context);
			(result as any)[userKey] = queryResults;
		}
	}

	return result;
}

/**
 * 사용자 정의 키 매핑 매퍼 생성
 *
 * @example
 * const mapping = { sources: "import-sources", types: "type-imports" } as const;
 * const mapper = createCustomKeyMapper(mapping);
 * const result = mapper.execute(matches, context);
 * // result: { sources: ImportSourceResult[], types: TypeImportResult[] }
 */
export function createCustomKeyMapper<TMapping extends Record<string, QueryKey>>(
	keyMapping: TMapping
): {
	execute: (matches: QueryMatch<any>[], context: QueryExecutionContext) => CustomKeyMappingResult<TMapping>;
	executeConditional: (
		conditions: { [K in keyof TMapping]?: boolean },
		matches: QueryMatch<any>[],
		context: QueryExecutionContext
	) => Partial<CustomKeyMappingResult<TMapping>>;
	getMapping: () => TMapping;
	getUserKeys: () => (keyof TMapping)[];
	getQueryKeys: () => TMapping[keyof TMapping][];
} {
	return {
		execute: (matches, context) => executeQueriesWithCustomKeys(keyMapping, matches, context),
		executeConditional: (conditions, matches, context) =>
			executeConditionalQueriesWithCustomKeys(keyMapping, conditions, matches, context),
		getMapping: () => keyMapping,
		getUserKeys: () => Object.keys(keyMapping),
		getQueryKeys: () => Object.values(keyMapping) as TMapping[keyof TMapping][],
	};
}

/**
 * 사전 정의된 사용자 정의 키 매핑들
 */
export const predefinedCustomMappings = {
	/**
	 * React 컴포넌트 분석용 매핑
	 */
	reactAnalysis: {
		sources: "import-sources",
		namedImports: "named-imports",
		defaultImports: "default-imports",
		typeImports: "type-imports",
	} as const,

	/**
	 * JavaScript 모듈 분석용 매핑 (TypeScript 타입 제외)
	 */
	jsModuleAnalysis: {
		sources: "import-sources",
		namedImports: "named-imports",
		defaultImports: "default-imports",
	} as const,

	/**
	 * Import 소스 분석용 매핑
	 */
	sourceAnalysis: {
		sources: "import-sources",
	} as const,

	/**
	 * TypeScript 타입 분석용 매핑
	 */
	typeAnalysis: {
		types: "type-imports",
		sources: "import-sources",
	} as const,
} as const;

/**
 * 빠른 액세스를 위한 헬퍼 함수들
 */
export const dynamicQueryHelpers = {
	/**
	 * Import 분석용 (TypeScript)
	 */
	executeImportAnalysis: (matches: QueryMatch<any>[], context: QueryExecutionContext) =>
		executeMultipleQueriesAsDynamicObject(
			["import-sources", "named-imports", "default-imports", "type-imports"] as const,
			matches,
			context
		),

	/**
	 * Import 분석용 (JavaScript)
	 */
	executeJavaScriptImportAnalysis: (matches: QueryMatch<any>[], context: QueryExecutionContext) =>
		executeMultipleQueriesAsDynamicObject(
			["import-sources", "named-imports", "default-imports"] as const,
			matches,
			context
		),

	/**
	 * 타입 분석 전용
	 */
	executeTypeAnalysis: (matches: QueryMatch<any>[], context: QueryExecutionContext) =>
		executeQueryAsDynamicObject("type-imports", matches, context),

	/**
	 * 사용자 정의 쿼리 조합
	 */
	executeCustomCombination: <K extends QueryKey>(
		queryKeys: readonly K[],
		matches: QueryMatch<any>[],
		context: QueryExecutionContext
	): DynamicQueryResult<K> =>
		executeMultipleQueriesAsDynamicObject(queryKeys, matches, context),
};