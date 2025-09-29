/**
 * Functional Query Engine - 함수형 쿼리 실행 엔진
 * 타입 안전한 쿼리 실행과 자동 타입 추론 제공
 */

import type { SupportedLanguage } from "./ASTProvider";

/**
 * 쿼리 실행 컨텍스트
 */
export interface QueryExecutionContext {
	sourceCode: string;
	language: SupportedLanguage;
	filePath: string;
	astNode: any;
}

/**
 * 쿼리 매치 타입
 */
export interface QueryMatch<TCaptureNames extends string = string> {
	captures: Array<{
		name: TCaptureNames;
		node: any;
	}>;
	node: any;
}
import {
	queryMapper,
	executeQuery,
	getQueryInfo,
	supportsLanguage,
	allQueryKeys,
	getQueryKeysForLanguage,
	type QueryKey,
	type QueryResultMap,
	type TypedQueryFunction
} from "../queries/ImportQueries";

/**
 * 쿼리 실행 결과 타입
 */
export type QueryExecutionResult<K extends QueryKey> = {
	queryKey: K;
	queryInfo: Omit<TypedQueryFunction<K>, 'processor'>;
	results: QueryResultMap[K][];
	executionTime: number;
	success: boolean;
	error?: string;
};

/**
 * 다중 쿼리 실행 결과 타입
 */
export type MultiQueryExecutionResult<K extends QueryKey> = {
	[key in K]: QueryExecutionResult<key>;
};

/**
 * 쿼리 실행 옵션
 */
export interface QueryExecutionOptions {
	language: SupportedLanguage;
	sourceCode: string;
	filePath?: string;
	timeoutMs?: number;
}

/**
 * 함수형 쿼리 엔진 클래스
 */
export class FunctionalQueryEngine {
	private astProvider: any; // ASTProvider 타입 추후 정의

	constructor(astProvider: any) {
		this.astProvider = astProvider;
	}

	/**
	 * 단일 쿼리 실행 (타입 안전)
	 */
	async executeQuery<K extends QueryKey>(
		queryKey: K,
		options: QueryExecutionOptions
	): Promise<QueryExecutionResult<K>> {
		const startTime = Date.now();

		try {
			// 언어 지원 확인
			if (!supportsLanguage(queryKey, options.language)) {
				throw new Error(`Query ${queryKey} does not support language ${options.language}`);
			}

			// 쿼리 정보 가져오기
			const queryInfo = getQueryInfo(queryKey);

			// AST 생성
			const ast = await this.astProvider.parse(options.sourceCode, options.language);

			// Tree-sitter 쿼리 실행
			const matches = await this.executeTreeSitterQuery(
				queryInfo.query,
				ast,
				options.language
			);

			// 컨텍스트 생성
			const context: QueryExecutionContext = {
				sourceCode: options.sourceCode,
				language: options.language,
				filePath: options.filePath || '',
				astNode: ast,
			};

			// 쿼리 실행
			const results = executeQuery(queryKey, matches, context);

			const executionTime = Date.now() - startTime;

			return {
				queryKey,
				queryInfo,
				results,
				executionTime,
				success: true,
			};

		} catch (error) {
			const executionTime = Date.now() - startTime;
			const queryInfo = getQueryInfo(queryKey);

			return {
				queryKey,
				queryInfo,
				results: [],
				executionTime,
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * 다중 쿼리 실행 (타입 안전)
	 */
	async executeQueries<K extends QueryKey>(
		queryKeys: readonly K[],
		options: QueryExecutionOptions
	): Promise<MultiQueryExecutionResult<K>> {
		const results: Partial<MultiQueryExecutionResult<K>> = {};

		// 병렬 실행
		const promises = queryKeys.map(async (queryKey) => {
			const result = await this.executeQuery(queryKey, options);
			return { queryKey, result };
		});

		const resolvedResults = await Promise.all(promises);

		// 결과 매핑
		for (const { queryKey, result } of resolvedResults) {
			(results as any)[queryKey] = result;
		}

		return results as MultiQueryExecutionResult<K>;
	}

	/**
	 * 언어별 모든 쿼리 실행
	 */
	async executeAllQueriesForLanguage(
		options: QueryExecutionOptions
	): Promise<MultiQueryExecutionResult<QueryKey>> {
		const supportedKeys = getQueryKeysForLanguage(options.language);
		return this.executeQueries(supportedKeys, options);
	}

	/**
	 * Import 분석 전용 쿼리 실행
	 */
	async executeImportAnalysis(
		options: QueryExecutionOptions
	): Promise<{
		sources: QueryExecutionResult<"import-sources">;
		namedImports: QueryExecutionResult<"named-imports">;
		defaultImports: QueryExecutionResult<"default-imports">;
		typeImports?: QueryExecutionResult<"type-imports">;
	}> {
		const isTypeScript = options.language === "typescript" || options.language === "tsx";

		const baseQueries: ["import-sources", "named-imports", "default-imports"] = [
			"import-sources",
			"named-imports",
			"default-imports"
		];

		const allQueries = isTypeScript
			? [...baseQueries, "type-imports" as const]
			: baseQueries;

		const results = await this.executeQueries(allQueries, options);

		return {
			sources: results["import-sources"],
			namedImports: results["named-imports"],
			defaultImports: results["default-imports"],
			...(isTypeScript && { typeImports: results["type-imports"] }),
		};
	}

	/**
	 * Tree-sitter 쿼리 실행 (내부 구현)
	 */
	private async executeTreeSitterQuery(
		query: string,
		ast: any,
		language: SupportedLanguage
	): Promise<any[]> {
		// 실제 Tree-sitter 쿼리 실행 로직
		// 이 부분은 기존 QueryEngine의 구현을 활용

		// 임시 모킹 - 실제 구현에서는 Tree-sitter API 사용
		return [];
	}

	/**
	 * 쿼리 지원 언어 확인
	 */
	getSupportsLanguages<K extends QueryKey>(queryKey: K): readonly SupportedLanguage[] {
		return getQueryInfo(queryKey).languages;
	}

	/**
	 * 모든 쿼리 목록 가져오기
	 */
	getAllQueryKeys(): QueryKey[] {
		return allQueryKeys;
	}

	/**
	 * 쿼리 매퍼 가져오기 (디버깅용)
	 */
	getQueryMapper() {
		return queryMapper;
	}
}

/**
 * 타입 안전한 쿼리 실행 헬퍼 함수들
 */

/**
 * Import 소스만 추출
 */
export async function extractImportSources(
	engine: FunctionalQueryEngine,
	options: QueryExecutionOptions
): Promise<QueryResultMap["import-sources"][]> {
	const result = await engine.executeQuery("import-sources", options);
	if (!result.success) {
		throw new Error(`Failed to extract import sources: ${result.error}`);
	}
	return result.results;
}

/**
 * Named imports만 추출
 */
export async function extractNamedImports(
	engine: FunctionalQueryEngine,
	options: QueryExecutionOptions
): Promise<QueryResultMap["named-imports"][]> {
	const result = await engine.executeQuery("named-imports", options);
	if (!result.success) {
		throw new Error(`Failed to extract named imports: ${result.error}`);
	}
	return result.results;
}

/**
 * TypeScript 타입 imports만 추출
 */
export async function extractTypeImports(
	engine: FunctionalQueryEngine,
	options: QueryExecutionOptions
): Promise<QueryResultMap["type-imports"][]> {
	if (options.language !== "typescript" && options.language !== "tsx") {
		throw new Error("Type imports are only supported in TypeScript files");
	}

	const result = await engine.executeQuery("type-imports", options);
	if (!result.success) {
		throw new Error(`Failed to extract type imports: ${result.error}`);
	}
	return result.results;
}

/**
 * 완전한 Import 분석 수행
 */
export async function performFullImportAnalysis(
	engine: FunctionalQueryEngine,
	options: QueryExecutionOptions
): Promise<{
	sources: QueryResultMap["import-sources"][];
	namedImports: QueryResultMap["named-imports"][];
	defaultImports: QueryResultMap["default-imports"][];
	typeImports: QueryResultMap["type-imports"][];
}> {
	const analysis = await engine.executeImportAnalysis(options);

	return {
		sources: analysis.sources.results,
		namedImports: analysis.namedImports.results,
		defaultImports: analysis.defaultImports.results,
		typeImports: analysis.typeImports?.results || [],
	};
}

/**
 * 쿼리 성능 측정
 */
export interface QueryPerformanceMetrics {
	totalExecutionTime: number;
	queryExecutionTimes: Record<string, number>;
	successfulQueries: number;
	failedQueries: number;
	averageExecutionTime: number;
}

export function calculatePerformanceMetrics<K extends QueryKey>(
	results: MultiQueryExecutionResult<K>
): QueryPerformanceMetrics {
	const entries = Object.entries(results) as [K, QueryExecutionResult<K>][];

	const totalExecutionTime = entries.reduce((sum, [, result]) => sum + result.executionTime, 0);
	const queryExecutionTimes = Object.fromEntries(
		entries.map(([key, result]) => [key, result.executionTime])
	);
	const successfulQueries = entries.filter(([, result]) => result.success).length;
	const failedQueries = entries.length - successfulQueries;
	const averageExecutionTime = totalExecutionTime / entries.length;

	return {
		totalExecutionTime,
		queryExecutionTimes,
		successfulQueries,
		failedQueries,
		averageExecutionTime,
	};
}