import {
	EnhancedQuerySystem,
	type QueryResult,
} from "../../core/EnhancedQuerySystem";
import type { RealtimeQuerySystem } from "../../core/RealtimeQuerySystem";

export interface QueryHandlerOptions {
	enableAdvancedQueries?: boolean;
	enableRealtimeQueries?: boolean;
	enableCaching?: boolean;
	cacheSize?: number;
	cacheTTL?: number;
}

export class QueryHandler {
	private querySystem: EnhancedQuerySystem;
	private realtimeSystem?: RealtimeQuerySystem;

	constructor(options: QueryHandlerOptions = {}) {
		this.querySystem = new EnhancedQuerySystem({
			enableAdvancedQueries: options.enableAdvancedQueries ?? true,
			enableRealtimeQueries: options.enableRealtimeQueries ?? true,
			enableCaching: options.enableCaching ?? true,
			cacheSize: options.cacheSize ?? 1000,
			cacheTTL: options.cacheTTL ?? 300000,
		});
	}

	/**
	 * SQL 쿼리 실행
	 */
	async executeSQLQuery(query: string, dataSource: any): Promise<QueryResult> {
		try {
			console.log(`🔍 SQL 쿼리 실행: ${query}`);
			const result = await this.querySystem.executeSQLQuery(query, dataSource);

			console.log(`✅ SQL 쿼리 완료:`);
			console.log(`  - 결과 수: ${result.data.length}개`);
			console.log(`  - 메타데이터: ${JSON.stringify(result.metadata || {})}`);

			return result;
		} catch (error) {
			console.error(`❌ SQL 쿼리 실행 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * GraphQL 쿼리 실행
	 */
	async executeGraphQLQuery(
		query: string,
		dataSource: any,
	): Promise<QueryResult> {
		try {
			console.log(`🔍 GraphQL 쿼리 실행: ${query}`);
			const result = await this.querySystem.executeGraphQLQuery(
				query,
				dataSource,
			);

			console.log(`✅ GraphQL 쿼리 완료:`);
			console.log(`  - 결과 수: ${result.data.length}개`);
			console.log(`  - 메타데이터: ${JSON.stringify(result.metadata || {})}`);

			return result;
		} catch (error) {
			console.error(`❌ GraphQL 쿼리 실행 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 자연어 쿼리 실행
	 */
	async executeNaturalLanguageQuery(
		query: string,
		dataSource: any,
	): Promise<QueryResult> {
		try {
			console.log(`🔍 자연어 쿼리 실행: ${query}`);
			const result = await this.querySystem.executeNaturalLanguageQuery(
				query,
				dataSource,
			);

			console.log(`✅ 자연어 쿼리 완료:`);
			console.log(`  - 결과 수: ${result.data.length}개`);
			console.log(`  - 메타데이터: ${JSON.stringify(result.metadata || {})}`);

			return result;
		} catch (error) {
			console.error(`❌ 자연어 쿼리 실행 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 자동 쿼리 타입 감지 및 실행
	 */
	async executeQuery(query: string, dataSource: any): Promise<QueryResult> {
		try {
			console.log(`🔍 쿼리 실행 (자동 감지): ${query}`);
			const result = await this.querySystem.executeQuery(query, dataSource);

			console.log(`✅ 쿼리 완료:`);
			console.log(`  - 결과 수: ${result.data.length}개`);
			console.log(`  - 메타데이터: ${JSON.stringify(result.metadata || {})}`);

			return result;
		} catch (error) {
			console.error(`❌ 쿼리 실행 실패: ${(error as Error).message}`);
			throw error;
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
		try {
			console.log(`🔍 실시간 쿼리 등록: ${query}`);
			const queryId = await this.querySystem.registerRealtimeQuery(
				query,
				queryType,
				clientId,
				dataSource,
			);

			console.log(`✅ 실시간 쿼리 등록 완료:`);
			console.log(`  - 쿼리 ID: ${queryId}`);
			console.log(`  - 클라이언트 ID: ${clientId}`);
			console.log(`  - 쿼리 타입: ${queryType}`);

			return queryId;
		} catch (error) {
			console.error(`❌ 실시간 쿼리 등록 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 실시간 쿼리 구독
	 */
	async subscribeToRealtimeQuery(
		queryId: string,
		clientId: string,
		eventType: "data" | "error" | "complete",
	): Promise<string> {
		try {
			console.log(`🔍 실시간 쿼리 구독: ${queryId}`);

			if (!this.realtimeSystem) {
				throw new Error("실시간 쿼리 시스템이 활성화되지 않았습니다.");
			}

			const subscriptionId = this.realtimeSystem.subscribeToQuery(
				queryId,
				clientId,
				eventType,
				(data) => {
					console.log(`📡 실시간 쿼리 이벤트 (${eventType}):`, data);
				},
			);

			console.log(`✅ 실시간 쿼리 구독 완료:`);
			console.log(`  - 구독 ID: ${subscriptionId}`);
			console.log(`  - 쿼리 ID: ${queryId}`);
			console.log(`  - 이벤트 타입: ${eventType}`);

			return subscriptionId;
		} catch (error) {
			console.error(`❌ 실시간 쿼리 구독 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 쿼리 성능 통계
	 */
	async getQueryStatistics(): Promise<void> {
		try {
			console.log(`📊 쿼리 성능 통계:`);

			// 캐시 통계
			const cacheStats = this.querySystem.getCacheStats();
			console.log(`  - 캐시 크기: ${cacheStats.size}개`);
			console.log(`  - 최대 캐시 크기: ${cacheStats.maxSize}개`);
			console.log(`  - 캐시 히트율: ${Math.round(cacheStats.hitRate * 100)}%`);
			console.log(
				`  - 가장 오래된 항목: ${cacheStats.oldestEntry?.toISOString() || "None"}`,
			);
			console.log(
				`  - 가장 최근 항목: ${cacheStats.newestEntry?.toISOString() || "None"}`,
			);
		} catch (error) {
			console.error(`❌ 쿼리 통계 조회 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 쿼리 캐시 관리
	 */
	async manageCache(action: "clear" | "stats" | "optimize"): Promise<void> {
		try {
			switch (action) {
				case "clear":
					this.querySystem.clearCache();
					console.log(`✅ 쿼리 캐시 초기화 완료`);
					break;

				case "stats": {
					const stats = this.querySystem.getCacheStats();
					console.log(`📊 쿼리 캐시 통계:`);
					console.log(`  - 캐시 크기: ${stats.size}개`);
					console.log(`  - 최대 캐시 크기: ${stats.maxSize}개`);
					console.log(`  - 히트율: ${Math.round(stats.hitRate * 100)}%`);
					console.log(
						`  - 가장 오래된 항목: ${stats.oldestEntry?.toISOString() || "None"}`,
					);
					console.log(
						`  - 가장 최근 항목: ${stats.newestEntry?.toISOString() || "None"}`,
					);
					break;
				}

				case "optimize":
					this.querySystem.clearCache();
					console.log(`✅ 쿼리 캐시 최적화 완료`);
					break;
			}
		} catch (error) {
			console.error(`❌ 쿼리 캐시 관리 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 쿼리 시스템 초기화
	 */
	async initialize(): Promise<void> {
		try {
			console.log("✅ Query Handler 초기화 완료");
		} catch (error) {
			console.error(
				`❌ Query Handler 초기화 실패: ${(error as Error).message}`,
			);
			throw error;
		}
	}

	/**
	 * 쿼리 시스템 종료
	 */
	async close(): Promise<void> {
		try {
			console.log("✅ Query Handler 종료 완료");
		} catch (error) {
			console.error(`❌ Query Handler 종료 실패: ${(error as Error).message}`);
			throw error;
		}
	}
}
