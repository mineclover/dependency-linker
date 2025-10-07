/**
 * Enhanced Query System
 * 고급 쿼리 시스템 - SQL, GraphQL, 자연어, 실시간 쿼리 통합
 */

import type { GraphQLOperation, QueryAST } from "./AdvancedQueryLanguage";
import { AdvancedQueryExecutor } from "./AdvancedQueryLanguage";
import type { RealtimeQuery, RealtimeQueryConfig } from "./RealtimeQuerySystem";
import { RealtimeQuerySystem } from "./RealtimeQuerySystem";

export interface EnhancedQueryConfig {
	enableAdvancedQueries: boolean;
	enableRealtimeQueries: boolean;
	enableCaching: boolean;
	cacheSize: number;
	cacheTTL: number;
	realtimeConfig?: Partial<RealtimeQueryConfig>;
}

export interface QueryResult {
	data: any[];
	metadata: {
		queryType: string;
		executionTime: number;
		resultCount: number;
		cached: boolean;
		timestamp: Date;
	};
}

export interface QueryCache {
	key: string;
	data: any[];
	timestamp: Date;
	ttl: number;
}

/**
 * 고급 쿼리 시스템
 */
export class EnhancedQuerySystem {
	private queryExecutor = new AdvancedQueryExecutor();
	private realtimeSystem?: RealtimeQuerySystem;
	private cache = new Map<string, QueryCache>();
	private config: Required<EnhancedQueryConfig>;

	constructor(config?: Partial<EnhancedQueryConfig>) {
		this.config = {
			enableAdvancedQueries: config?.enableAdvancedQueries ?? true,
			enableRealtimeQueries: config?.enableRealtimeQueries ?? true,
			enableCaching: config?.enableCaching ?? true,
			cacheSize: config?.cacheSize ?? 1000,
			cacheTTL: config?.cacheTTL ?? 300000, // 5분
			realtimeConfig: config?.realtimeConfig ?? {},
		};

		if (this.config.enableRealtimeQueries) {
			this.realtimeSystem = new RealtimeQuerySystem(this.config.realtimeConfig);
		}
	}

	/**
	 * SQL 쿼리 실행
	 */
	async executeSQLQuery(query: string, dataSource: any): Promise<QueryResult> {
		const startTime = performance.now();
		const cacheKey = this.generateCacheKey("SQL", query, dataSource);

		// 캐시 확인
		if (this.config.enableCaching) {
			const cached = this.getFromCache(cacheKey);
			if (cached) {
				return {
					data: cached,
					metadata: {
						queryType: "SQL",
						executionTime: 0,
						resultCount: cached.length,
						cached: true,
						timestamp: new Date(),
					},
				};
			}
		}

		// 쿼리 실행
		const results = await this.queryExecutor.executeSQLQuery(query, dataSource);
		const executionTime = performance.now() - startTime;

		// 캐시 저장
		if (this.config.enableCaching) {
			this.setCache(cacheKey, results);
		}

		return {
			data: results,
			metadata: {
				queryType: "SQL",
				executionTime,
				resultCount: results.length,
				cached: false,
				timestamp: new Date(),
			},
		};
	}

	/**
	 * GraphQL 쿼리 실행
	 */
	async executeGraphQLQuery(
		query: string,
		dataSource: any,
	): Promise<QueryResult> {
		const startTime = performance.now();
		const cacheKey = this.generateCacheKey("GraphQL", query, dataSource);

		// 캐시 확인
		if (this.config.enableCaching) {
			const cached = this.getFromCache(cacheKey);
			if (cached) {
				return {
					data: cached,
					metadata: {
						queryType: "GraphQL",
						executionTime: 0,
						resultCount: Array.isArray(cached) ? cached.length : 1,
						cached: true,
						timestamp: new Date(),
					},
				};
			}
		}

		// 쿼리 실행
		const results = await this.queryExecutor.executeGraphQLQuery(
			query,
			dataSource,
		);
		const executionTime = performance.now() - startTime;

		// 캐시 저장
		if (this.config.enableCaching) {
			this.setCache(cacheKey, results);
		}

		return {
			data: Array.isArray(results) ? results : [results],
			metadata: {
				queryType: "GraphQL",
				executionTime,
				resultCount: Array.isArray(results) ? results.length : 1,
				cached: false,
				timestamp: new Date(),
			},
		};
	}

	/**
	 * 자연어 쿼리 실행
	 */
	async executeNaturalLanguageQuery(
		query: string,
		dataSource: any,
	): Promise<QueryResult> {
		const startTime = performance.now();
		const cacheKey = this.generateCacheKey(
			"NaturalLanguage",
			query,
			dataSource,
		);

		// 캐시 확인
		if (this.config.enableCaching) {
			const cached = this.getFromCache(cacheKey);
			if (cached) {
				return {
					data: cached,
					metadata: {
						queryType: "NaturalLanguage",
						executionTime: 0,
						resultCount: cached.length,
						cached: true,
						timestamp: new Date(),
					},
				};
			}
		}

		// 쿼리 실행
		const results = await this.queryExecutor.executeNaturalLanguageQuery(
			query,
			dataSource,
		);
		const executionTime = performance.now() - startTime;

		// 캐시 저장
		if (this.config.enableCaching) {
			this.setCache(cacheKey, results);
		}

		return {
			data: results,
			metadata: {
				queryType: "NaturalLanguage",
				executionTime,
				resultCount: results.length,
				cached: false,
				timestamp: new Date(),
			},
		};
	}

	/**
	 * 자동 쿼리 타입 감지 및 실행
	 */
	async executeQuery(query: string, dataSource: any): Promise<QueryResult> {
		const queryType = this.detectQueryType(query);

		switch (queryType) {
			case "SQL":
				return this.executeSQLQuery(query, dataSource);
			case "GraphQL":
				return this.executeGraphQLQuery(query, dataSource);
			case "NaturalLanguage":
				return this.executeNaturalLanguageQuery(query, dataSource);
			default:
				throw new Error(`Unsupported query type: ${queryType}`);
		}
	}

	/**
	 * 실시간 쿼리 등록
	 */
	async registerRealtimeQuery(
		query: string,
		queryType: "SQL" | "GraphQL" | "NaturalLanguage",
		clientId: string,
		dataSource: any,
	): Promise<string> {
		if (!this.realtimeSystem) {
			throw new Error("Realtime queries are not enabled");
		}

		return this.realtimeSystem.registerQuery(
			query,
			queryType,
			clientId,
			dataSource,
		);
	}

	/**
	 * 실시간 쿼리 구독
	 */
	subscribeToRealtimeQuery(
		queryId: string,
		clientId: string,
		eventType: "data" | "error" | "complete",
		callback: (data: any) => void,
	): string {
		if (!this.realtimeSystem) {
			throw new Error("Realtime queries are not enabled");
		}

		return this.realtimeSystem.subscribeToQuery(
			queryId,
			clientId,
			eventType,
			callback,
		);
	}

	/**
	 * 실시간 쿼리 구독 취소
	 */
	unsubscribeFromRealtimeQuery(subscriptionId: string): void {
		if (!this.realtimeSystem) {
			throw new Error("Realtime queries are not enabled");
		}

		this.realtimeSystem.unsubscribeFromQuery(subscriptionId);
	}

	/**
	 * 데이터 변경 알림
	 */
	notifyDataChange(changeEvent: any): void {
		if (this.realtimeSystem) {
			this.realtimeSystem.notifyDataChange(changeEvent);
		}

		// 관련 캐시 무효화
		this.invalidateRelatedCache(changeEvent);
	}

	/**
	 * 쿼리 타입 자동 감지
	 */
	private detectQueryType(
		query: string,
	): "SQL" | "GraphQL" | "NaturalLanguage" {
		const trimmedQuery = query.trim().toLowerCase();

		// SQL 패턴 감지
		if (
			trimmedQuery.startsWith("select") ||
			trimmedQuery.startsWith("insert") ||
			trimmedQuery.startsWith("update") ||
			trimmedQuery.startsWith("delete") ||
			trimmedQuery.includes("from ") ||
			trimmedQuery.includes("where ")
		) {
			return "SQL";
		}

		// GraphQL 패턴 감지
		if (
			trimmedQuery.startsWith("{") ||
			trimmedQuery.includes("query ") ||
			trimmedQuery.includes("mutation ") ||
			trimmedQuery.includes("subscription ")
		) {
			return "GraphQL";
		}

		// 자연어 패턴 감지
		if (
			trimmedQuery.includes("find") ||
			trimmedQuery.includes("show") ||
			trimmedQuery.includes("get") ||
			trimmedQuery.includes("list") ||
			trimmedQuery.includes("search")
		) {
			return "NaturalLanguage";
		}

		// 기본값: 자연어
		return "NaturalLanguage";
	}

	/**
	 * 캐시 키 생성
	 */
	private generateCacheKey(
		queryType: string,
		query: string,
		dataSource: any,
	): string {
		const dataSourceHash = JSON.stringify(dataSource || {}).slice(0, 100);
		return `${queryType}:${this.hashString(query)}:${this.hashString(dataSourceHash)}`;
	}

	/**
	 * 문자열 해시
	 */
	private hashString(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // 32bit 정수로 변환
		}
		return Math.abs(hash).toString(36);
	}

	/**
	 * 캐시에서 데이터 조회
	 */
	private getFromCache(key: string): any[] | null {
		const cached = this.cache.get(key);
		if (!cached) {
			return null;
		}

		// TTL 체크
		const now = Date.now();
		if (now - cached.timestamp.getTime() > cached.ttl) {
			this.cache.delete(key);
			return null;
		}

		return cached.data;
	}

	/**
	 * 캐시에 데이터 저장
	 */
	private setCache(key: string, data: any[]): void {
		// 캐시 크기 제한
		if (this.cache.size >= this.config.cacheSize) {
			const oldestKey = this.cache.keys().next().value;
			if (oldestKey) {
				this.cache.delete(oldestKey);
			}
		}

		this.cache.set(key, {
			key,
			data,
			timestamp: new Date(),
			ttl: this.config.cacheTTL,
		});
	}

	/**
	 * 관련 캐시 무효화
	 */
	private invalidateRelatedCache(changeEvent: any): void {
		const keysToDelete: string[] = [];

		for (const [key, cached] of this.cache.entries()) {
			// 간단한 구현: 모든 캐시 무효화
			// 실제로는 변경 이벤트와 관련된 캐시만 무효화
			keysToDelete.push(key);
		}

		keysToDelete.forEach((key) => this.cache.delete(key));
	}

	/**
	 * 캐시 통계
	 */
	getCacheStats(): {
		size: number;
		maxSize: number;
		hitRate: number;
		oldestEntry: Date | null;
		newestEntry: Date | null;
	} {
		const entries = Array.from(this.cache.values());
		const now = Date.now();

		const validEntries = entries.filter(
			(entry) => now - entry.timestamp.getTime() <= entry.ttl,
		);

		const timestamps = validEntries.map((entry) => entry.timestamp.getTime());
		const oldestTime = timestamps.length > 0 ? Math.min(...timestamps) : null;
		const newestTime = timestamps.length > 0 ? Math.max(...timestamps) : null;

		return {
			size: validEntries.length,
			maxSize: this.config.cacheSize,
			hitRate: 0, // 실제 구현에서는 히트율 계산
			oldestEntry: oldestTime ? new Date(oldestTime) : null,
			newestEntry: newestTime ? new Date(newestTime) : null,
		};
	}

	/**
	 * 실시간 시스템 통계
	 */
	getRealtimeStats(): any {
		if (!this.realtimeSystem) {
			return null;
		}

		return this.realtimeSystem.getStats();
	}

	/**
	 * 전체 시스템 통계
	 */
	getSystemStats(): {
		cache: any;
		realtime: any;
		config: any;
	} {
		return {
			cache: this.getCacheStats(),
			realtime: this.getRealtimeStats(),
			config: {
				enableAdvancedQueries: this.config.enableAdvancedQueries,
				enableRealtimeQueries: this.config.enableRealtimeQueries,
				enableCaching: this.config.enableCaching,
				cacheSize: this.config.cacheSize,
				cacheTTL: this.config.cacheTTL,
			},
		};
	}

	/**
	 * 캐시 정리
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * 리소스 정리
	 */
	destroy(): void {
		this.clearCache();
		if (this.realtimeSystem) {
			this.realtimeSystem.destroy();
		}
	}
}
