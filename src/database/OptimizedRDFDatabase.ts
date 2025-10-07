/**
 * Optimized RDF Database
 * 성능 최적화된 RDF 통합 데이터베이스
 */

import type { NodeType } from "../core/RDFAddress";
import { RDFCache, RDFSearchCache, RDFStatisticsCache } from "../core/RDFCache";
import type {
	RDFAddressSearchResult,
	RDFAddressStoreOptions,
	RDFRelationshipSearchResult,
	RDFRelationshipStoreOptions,
	RDFStatistics,
} from "./RDFIntegratedGraphDatabase";
import { RDFIntegratedGraphDatabase } from "./RDFIntegratedGraphDatabase";

// ===== OPTIMIZATION OPTIONS =====

/**
 * 성능 최적화 옵션
 */
export interface PerformanceOptimizationOptions {
	/** 캐시 활성화 */
	enableCache: boolean;
	/** 검색 캐시 TTL (밀리초) */
	searchCacheTTL: number;
	/** 통계 캐시 TTL (밀리초) */
	statisticsCacheTTL: number;
	/** 배치 처리 크기 */
	batchSize: number;
	/** 병렬 처리 수 */
	maxConcurrency: number;
	/** 인덱스 최적화 */
	enableIndexOptimization: boolean;
	/** 메모리 제한 (MB) */
	memoryLimit: number;
}

/**
 * 성능 메트릭
 */
export interface PerformanceMetrics {
	/** 총 실행 시간 (밀리초) */
	totalTime: number;
	/** 캐시 히트율 */
	cacheHitRate: number;
	/** 처리된 항목 수 */
	processedItems: number;
	/** 메모리 사용량 (MB) */
	memoryUsage: number;
	/** 데이터베이스 쿼리 수 */
	databaseQueries: number;
	/** 캐시 조회 수 */
	cacheHits: number;
	/** 캐시 미스 수 */
	cacheMisses: number;
}

// ===== OPTIMIZED RDF DATABASE =====

/**
 * 성능 최적화된 RDF 통합 데이터베이스
 */
export class OptimizedRDFDatabase extends RDFIntegratedGraphDatabase {
	private searchCache!: RDFSearchCache;
	private statisticsCache!: RDFStatisticsCache;
	private options: PerformanceOptimizationOptions;
	private metrics: PerformanceMetrics;

	constructor(
		dbPath: string,
		options: Partial<PerformanceOptimizationOptions> = {},
	) {
		super(dbPath);

		this.options = {
			enableCache: true,
			searchCacheTTL: 10 * 60 * 1000, // 10 minutes
			statisticsCacheTTL: 30 * 60 * 1000, // 30 minutes
			batchSize: 100,
			maxConcurrency: 4,
			enableIndexOptimization: true,
			memoryLimit: 512, // 512MB
			...options,
		};

		this.metrics = {
			totalTime: 0,
			cacheHitRate: 0,
			processedItems: 0,
			memoryUsage: 0,
			databaseQueries: 0,
			cacheHits: 0,
			cacheMisses: 0,
		};

		// 캐시 초기화
		if (this.options.enableCache) {
			this.searchCache = new RDFSearchCache({
				defaultTTL: this.options.searchCacheTTL,
			});
			this.statisticsCache = new RDFStatisticsCache({
				defaultTTL: this.options.statisticsCacheTTL,
			});
		}
	}

	/**
	 * 최적화된 RDF 주소 검색
	 */
	override async searchRDFAddresses(
		query: string,
		options: {
			projectName?: string;
			filePath?: string;
			nodeType?: NodeType;
			symbolName?: string;
			namespace?: string;
			limit?: number;
		} = {},
	): Promise<RDFAddressSearchResult[]> {
		const startTime = Date.now();

		// 캐시 확인
		if (this.options.enableCache) {
			const cached = this.searchCache.getSearchResults(query, options);
			if (cached) {
				this.metrics.cacheHits++;
				this.updateCacheHitRate();
				return cached;
			}
		}

		// 데이터베이스 검색
		this.metrics.databaseQueries++;
		const results = await super.searchRDFAddresses(query, options);

		// 캐시 저장
		if (this.options.enableCache && results.length > 0) {
			this.searchCache.setSearchResults(query, results, options);
		}

		this.metrics.cacheMisses++;
		this.updateCacheHitRate();
		this.metrics.totalTime += Date.now() - startTime;
		this.metrics.processedItems += results.length;

		return results;
	}

	/**
	 * 최적화된 RDF 통계 생성
	 */
	override async generateRDFStatistics(): Promise<RDFStatistics> {
		const startTime = Date.now();

		// 캐시 확인
		if (this.options.enableCache) {
			const cached = this.statisticsCache.getStatistics();
			if (cached) {
				this.metrics.cacheHits++;
				this.updateCacheHitRate();
				return cached;
			}
		}

		// 데이터베이스 통계 생성
		this.metrics.databaseQueries++;
		const statistics = await super.generateRDFStatistics();

		// 캐시 저장
		if (this.options.enableCache) {
			this.statisticsCache.setStatistics(statistics);
		}

		this.metrics.cacheMisses++;
		this.updateCacheHitRate();
		this.metrics.totalTime += Date.now() - startTime;

		return statistics;
	}

	/**
	 * 배치 RDF 주소 저장
	 */
	async batchStoreRDFAddresses(
		addresses: RDFAddressStoreOptions[],
	): Promise<void> {
		const startTime = Date.now();
		const batches = this.createBatches(addresses, this.options.batchSize);

		for (const batch of batches) {
			await Promise.all(batch.map((address) => this.storeRDFAddress(address)));
		}

		this.metrics.totalTime += Date.now() - startTime;
		this.metrics.processedItems += addresses.length;
	}

	/**
	 * 배치 RDF 관계 저장
	 */
	async batchStoreRDFRelationships(
		relationships: RDFRelationshipStoreOptions[],
	): Promise<void> {
		const startTime = Date.now();
		const batches = this.createBatches(relationships, this.options.batchSize);

		for (const batch of batches) {
			await Promise.all(
				batch.map((relationship) => this.storeRDFRelationship(relationship)),
			);
		}

		this.metrics.totalTime += Date.now() - startTime;
		this.metrics.processedItems += relationships.length;
	}

	/**
	 * 병렬 RDF 주소 검색
	 */
	async parallelSearchRDFAddresses(
		queries: Array<{
			query: string;
			options: any;
		}>,
	): Promise<RDFAddressSearchResult[][]> {
		const startTime = Date.now();
		const chunks = this.createBatches(queries, this.options.maxConcurrency);
		const results: RDFAddressSearchResult[][] = [];

		for (const chunk of chunks) {
			const chunkResults = await Promise.all(
				chunk.map(({ query, options }) =>
					this.searchRDFAddresses(query, options),
				),
			);
			results.push(...chunkResults);
		}

		this.metrics.totalTime += Date.now() - startTime;
		this.metrics.processedItems += queries.length;

		return results;
	}

	/**
	 * 성능 메트릭 조회
	 */
	getPerformanceMetrics(): PerformanceMetrics {
		return { ...this.metrics };
	}

	/**
	 * 캐시 통계 조회
	 */
	getCacheStatistics(): {
		search: any;
		statistics: any;
	} {
		return {
			search: this.searchCache?.getStatistics() || null,
			statistics: this.statisticsCache?.getStatistics() || null,
		};
	}

	/**
	 * 캐시 정리
	 */
	cleanupCaches(): void {
		if (this.options.enableCache) {
			this.searchCache?.cleanup();
			this.statisticsCache?.cleanup();
		}
	}

	/**
	 * 메모리 사용량 확인
	 */
	checkMemoryUsage(): boolean {
		const usage = process.memoryUsage();
		const memoryUsageMB = usage.heapUsed / 1024 / 1024;
		this.metrics.memoryUsage = memoryUsageMB;

		return memoryUsageMB < this.options.memoryLimit;
	}

	/**
	 * 데이터베이스 연결 종료
	 */
	override async close(): Promise<void> {
		// 캐시 정리
		if (this.options.enableCache) {
			this.searchCache?.destroy();
			this.statisticsCache?.destroy();
		}

		await super.close();
	}

	// ===== PRIVATE METHODS =====

	/**
	 * 배열을 배치로 분할
	 */
	private createBatches<T>(array: T[], batchSize: number): T[][] {
		const batches: T[][] = [];
		for (let i = 0; i < array.length; i += batchSize) {
			batches.push(array.slice(i, i + batchSize));
		}
		return batches;
	}

	/**
	 * 캐시 히트율 업데이트
	 */
	private updateCacheHitRate(): void {
		const total = this.metrics.cacheHits + this.metrics.cacheMisses;
		this.metrics.cacheHitRate = total > 0 ? this.metrics.cacheHits / total : 0;
	}
}
