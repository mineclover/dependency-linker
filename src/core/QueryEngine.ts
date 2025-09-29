/**
 * Core Query Engine
 * 중앙 쿼리 실행 엔진
 */

import type { QueryKey, QueryResult } from "./QueryResultMap";
import type {
	BaseQueryResult,
	QueryExecutionContext,
	QueryFunction,
	QueryMatch,
	QueryPerformanceMetrics,
	SupportedLanguage,
	ValidationResult,
} from "./types";

// ===== QUERY REGISTRY =====
export class QueryRegistry {
	private queries = new Map<QueryKey, QueryFunction<BaseQueryResult, string>>();
	private languageSupport = new Map<SupportedLanguage, Set<QueryKey>>();

	/**
	 * 쿼리 등록
	 */
	register<K extends QueryKey>(
		queryKey: K,
		queryFunction: QueryFunction<QueryResult<K>>,
	): void {
		// 타입 일관성 검증
		if (queryFunction.resultType !== queryKey) {
			throw new Error(
				`Query function result type "${queryFunction.resultType}" does not match key "${queryKey}"`,
			);
		}

		this.queries.set(
			queryKey,
			queryFunction as QueryFunction<BaseQueryResult, string>,
		);

		// 언어별 지원 매핑 업데이트
		for (const language of queryFunction.languages) {
			if (!this.languageSupport.has(language)) {
				this.languageSupport.set(language, new Set());
			}
			this.languageSupport.get(language)?.add(queryKey);
		}
	}

	/**
	 * 쿼리 조회
	 */
	get<K extends QueryKey>(
		queryKey: K,
	): QueryFunction<QueryResult<K>> | undefined {
		return this.queries.get(queryKey) as
			| QueryFunction<QueryResult<K>>
			| undefined;
	}

	/**
	 * 모든 쿼리 키 조회
	 */
	getAllQueryKeys(): QueryKey[] {
		return Array.from(this.queries.keys());
	}

	/**
	 * 언어별 지원 쿼리 조회
	 */
	getQueriesForLanguage(language: SupportedLanguage): QueryKey[] {
		return Array.from(this.languageSupport.get(language) || []);
	}

	/**
	 * 쿼리가 언어를 지원하는지 확인
	 */
	supportsLanguage<K extends QueryKey>(
		queryKey: K,
		language: SupportedLanguage,
	): boolean {
		const query = this.queries.get(queryKey);
		return query?.languages.includes(language) ?? false;
	}

	/**
	 * 레지스트리 무결성 검증
	 */
	validate(): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		for (const [key, query] of this.queries) {
			// 키와 resultType 일치 검증
			if (query.resultType !== key) {
				errors.push(
					`Query "${key}" has mismatched resultType: ${query.resultType}`,
				);
			}

			// 언어 지원 검증
			if (query.languages.length === 0) {
				warnings.push(`Query "${key}" has no supported languages`);
			}

			// 우선순위 검증
			if (query.priority < 0 || query.priority > 100) {
				warnings.push(`Query "${key}" has invalid priority: ${query.priority}`);
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		};
	}
}

// ===== QUERY EXECUTION ENGINE =====
export class QueryEngine {
	private registry = new QueryRegistry();
	private performanceMetrics = new Map<QueryKey, QueryPerformanceMetrics[]>();

	/**
	 * 쿼리 등록
	 */
	register<K extends QueryKey>(
		queryKey: K,
		queryFunction: QueryFunction<QueryResult<K>>,
	): void {
		this.registry.register(queryKey, queryFunction);
	}

	/**
	 * 단일 쿼리 실행
	 */
	async execute<K extends QueryKey>(
		queryKey: K,
		matches: QueryMatch[],
		context: QueryExecutionContext,
	): Promise<QueryResult<K>[]> {
		const startTime = performance.now();
		let errorCount = 0;

		try {
			// 쿼리 함수 조회
			const queryFunction = this.registry.get(queryKey);
			if (!queryFunction) {
				throw new Error(`Query "${queryKey}" not found in registry`);
			}

			// 언어 지원 확인
			if (!this.registry.supportsLanguage(queryKey, context.language)) {
				throw new Error(
					`Query "${queryKey}" does not support language "${context.language}"`,
				);
			}

			// 쿼리 실행
			const results = queryFunction.processor(matches, context);

			// 결과 검증
			this.validateResults(queryKey, results);

			return results as QueryResult<K>[];
		} catch (error) {
			errorCount = 1;
			throw error;
		} finally {
			// 성능 메트릭 기록
			const executionTime = performance.now() - startTime;
			this.recordPerformanceMetrics(queryKey, {
				executionTime,
				matchCount: matches.length,
				resultCount: errorCount === 0 ? matches.length : 0,
				errorCount,
			});
		}
	}

	/**
	 * 다중 쿼리 실행
	 */
	async executeMultiple<K extends QueryKey>(
		queryKeys: K[],
		matches: QueryMatch[],
		context: QueryExecutionContext,
	): Promise<Record<K, QueryResult<K>[]>> {
		const results = {} as Record<K, QueryResult<K>[]>;

		// 병렬 실행
		const promises = queryKeys.map(async (queryKey) => {
			try {
				const result = await this.execute(queryKey, matches, context);
				return { queryKey, result };
			} catch (error) {
				console.warn(`Query "${queryKey}" failed:`, error);
				return { queryKey, result: [] };
			}
		});

		const settled = await Promise.allSettled(promises);

		for (const promise of settled) {
			if (promise.status === "fulfilled") {
				const { queryKey, result } = promise.value;
				results[queryKey] = result;
			}
		}

		return results;
	}

	/**
	 * 조건부 쿼리 실행
	 */
	async executeConditional<K extends QueryKey>(
		queryMapping: Record<string, K>,
		conditions: Record<string, boolean>,
		matches: QueryMatch[],
		context: QueryExecutionContext,
	): Promise<Record<string, QueryResult<K>[]>> {
		const activeQueries = Object.entries(queryMapping)
			.filter(([key]) => conditions[key])
			.map(([, queryKey]) => queryKey);

		const results = await this.executeMultiple(activeQueries, matches, context);

		// 사용자 키로 다시 매핑
		const userResults: Record<string, QueryResult<K>[]> = {};
		for (const [userKey, queryKey] of Object.entries(queryMapping)) {
			if (conditions[userKey] && results[queryKey]) {
				userResults[userKey] = results[queryKey];
			}
		}

		return userResults;
	}

	/**
	 * 쿼리 우선순위별 실행
	 */
	async executeByPriority<K extends QueryKey>(
		queryKeys: K[],
		matches: QueryMatch[],
		context: QueryExecutionContext,
		minPriority: number = 0,
	): Promise<Record<K, QueryResult<K>[]>> {
		// 우선순위별 정렬
		const sortedQueries = queryKeys
			.map((key) => ({ key, query: this.registry.get(key) }))
			.filter(({ query }) => query && query.priority >= minPriority)
			.sort((a, b) => (b.query?.priority || 0) - (a.query?.priority || 0))
			.map(({ key }) => key);

		return this.executeMultiple(sortedQueries, matches, context);
	}

	/**
	 * 언어별 지원 쿼리 실행
	 */
	async executeForLanguage(
		language: SupportedLanguage,
		matches: QueryMatch[],
		context: QueryExecutionContext,
	): Promise<Record<QueryKey, QueryResult<QueryKey>[]>> {
		const supportedQueries = this.registry.getQueriesForLanguage(language);
		return this.executeMultiple(supportedQueries, matches, context);
	}

	/**
	 * 쿼리 결과 검증
	 */
	private validateResults<K extends QueryKey>(
		queryKey: K,
		results: QueryResult<K>[],
	): void {
		for (const result of results) {
			if (!result.queryName) {
				throw new Error(`Result from query "${queryKey}" missing queryName`);
			}

			if (result.queryName !== queryKey) {
				throw new Error(
					`Result queryName "${result.queryName}" does not match query key "${queryKey}"`,
				);
			}

			if (!result.location) {
				throw new Error(`Result from query "${queryKey}" missing location`);
			}

			if (!result.nodeText) {
				throw new Error(`Result from query "${queryKey}" missing nodeText`);
			}
		}
	}

	/**
	 * 성능 메트릭 기록
	 */
	private recordPerformanceMetrics(
		queryKey: QueryKey,
		metrics: QueryPerformanceMetrics,
	): void {
		if (!this.performanceMetrics.has(queryKey)) {
			this.performanceMetrics.set(queryKey, []);
		}

		const history = this.performanceMetrics.get(queryKey)!;
		history.push(metrics);

		// 최근 100개 기록만 유지
		if (history.length > 100) {
			history.shift();
		}
	}

	/**
	 * 성능 메트릭 조회
	 */
	getPerformanceMetrics(
		queryKey?: QueryKey,
	): Map<QueryKey, QueryPerformanceMetrics[]> | QueryPerformanceMetrics[] {
		if (queryKey) {
			return this.performanceMetrics.get(queryKey) || [];
		}
		return new Map(this.performanceMetrics);
	}

	/**
	 * 레지스트리 조회
	 */
	getRegistry(): QueryRegistry {
		return this.registry;
	}

	/**
	 * 엔진 상태 검증
	 */
	validate(): ValidationResult {
		return this.registry.validate();
	}
}

// ===== GLOBAL INSTANCE =====
export const globalQueryEngine = new QueryEngine();

// ===== CONVENIENCE FUNCTIONS =====

/**
 * 글로벌 엔진에 쿼리 등록
 */
export function registerQuery<K extends QueryKey>(
	queryKey: K,
	queryFunction: QueryFunction<QueryResult<K>>,
): void {
	globalQueryEngine.register(queryKey, queryFunction);
}

/**
 * 글로벌 엔진으로 쿼리 실행
 */
export function executeQuery<K extends QueryKey>(
	queryKey: K,
	matches: QueryMatch[],
	context: QueryExecutionContext,
): Promise<QueryResult<K>[]> {
	return globalQueryEngine.execute(queryKey, matches, context);
}

/**
 * 다중 쿼리 실행
 */
export function executeQueries<K extends QueryKey>(
	queryKeys: K[],
	matches: QueryMatch[],
	context: QueryExecutionContext,
): Promise<Record<K, QueryResult<K>[]>> {
	return globalQueryEngine.executeMultiple(queryKeys, matches, context);
}
