/**
 * RDF Cache System
 * RDF 주소 캐싱 및 성능 최적화 시스템
 */

import type {
	RDFAddressSearchResult,
	RDFStatistics,
} from "../database/RDFIntegratedGraphDatabase";
import type { NodeType } from "./RDFAddress";

// ===== CACHE TYPES =====

/**
 * RDF 캐시 항목
 */
export interface RDFCacheItem {
	key: string;
	data: any;
	timestamp: number;
	ttl: number; // Time to live in milliseconds
	accessCount: number;
	lastAccessed: number;
}

/**
 * RDF 캐시 통계
 */
export interface RDFCacheStatistics {
	totalItems: number;
	hitCount: number;
	missCount: number;
	hitRate: number;
	memoryUsage: number;
	oldestItem: number;
	newestItem: number;
}

/**
 * RDF 캐시 옵션
 */
export interface RDFCacheOptions {
	maxSize: number;
	defaultTTL: number;
	cleanupInterval: number;
	enableLRU: boolean;
	enableStatistics: boolean;
}

// ===== RDF CACHE =====

/**
 * RDF 캐시 시스템
 */
export class RDFCache {
	private cache: Map<string, RDFCacheItem> = new Map();
	private options: RDFCacheOptions;
	private statistics: RDFCacheStatistics;
	private cleanupTimer: NodeJS.Timeout | null = null;

	constructor(options: Partial<RDFCacheOptions> = {}) {
		this.options = {
			maxSize: 1000,
			defaultTTL: 5 * 60 * 1000, // 5 minutes
			cleanupInterval: 60 * 1000, // 1 minute
			enableLRU: true,
			enableStatistics: true,
			...options,
		};

		this.statistics = {
			totalItems: 0,
			hitCount: 0,
			missCount: 0,
			hitRate: 0,
			memoryUsage: 0,
			oldestItem: 0,
			newestItem: 0,
		};

		this.startCleanupTimer();
	}

	/**
	 * 캐시에서 데이터 조회
	 */
	get<T>(key: string): T | null {
		const item = this.cache.get(key);

		if (!item) {
			this.statistics.missCount++;
			this.updateHitRate();
			return null;
		}

		// TTL 확인
		if (this.isExpired(item)) {
			this.cache.delete(key);
			this.statistics.missCount++;
			this.updateHitRate();
			return null;
		}

		// 접근 통계 업데이트
		item.accessCount++;
		item.lastAccessed = Date.now();
		this.statistics.hitCount++;
		this.updateHitRate();

		return item.data as T;
	}

	/**
	 * 캐시에 데이터 저장
	 */
	set<T>(key: string, data: T, ttl?: number): void {
		const now = Date.now();
		const item: RDFCacheItem = {
			key,
			data,
			timestamp: now,
			ttl: ttl || this.options.defaultTTL,
			accessCount: 0,
			lastAccessed: now,
		};

		// 캐시 크기 확인
		if (this.cache.size >= this.options.maxSize) {
			this.evictLRU();
		}

		this.cache.set(key, item);
		this.updateStatistics();
	}

	/**
	 * 캐시에서 데이터 삭제
	 */
	delete(key: string): boolean {
		const deleted = this.cache.delete(key);
		if (deleted) {
			this.updateStatistics();
		}
		return deleted;
	}

	/**
	 * 캐시 전체 삭제
	 */
	clear(): void {
		this.cache.clear();
		this.statistics = {
			totalItems: 0,
			hitCount: 0,
			missCount: 0,
			hitRate: 0,
			memoryUsage: 0,
			oldestItem: 0,
			newestItem: 0,
		};
	}

	/**
	 * 캐시 통계 조회
	 */
	getStatistics(): RDFCacheStatistics {
		return { ...this.statistics };
	}

	/**
	 * 캐시 크기 조회
	 */
	size(): number {
		return this.cache.size;
	}

	/**
	 * 캐시 키 목록 조회
	 */
	keys(): string[] {
		return Array.from(this.cache.keys());
	}

	/**
	 * 캐시 정리
	 */
	cleanup(): void {
		const now = Date.now();
		const expiredKeys: string[] = [];

		for (const [key, item] of this.cache.entries()) {
			if (this.isExpired(item)) {
				expiredKeys.push(key);
			}
		}

		expiredKeys.forEach((key) => this.cache.delete(key));
		this.updateStatistics();
	}

	/**
	 * 캐시 파괴
	 */
	destroy(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
			this.cleanupTimer = null;
		}
		this.clear();
	}

	// ===== PRIVATE METHODS =====

	/**
	 * 항목 만료 확인
	 */
	private isExpired(item: RDFCacheItem): boolean {
		return Date.now() - item.timestamp > item.ttl;
	}

	/**
	 * LRU 항목 제거
	 */
	private evictLRU(): void {
		if (!this.options.enableLRU) return;

		let oldestKey = "";
		let oldestTime = Date.now();

		for (const [key, item] of this.cache.entries()) {
			if (item.lastAccessed < oldestTime) {
				oldestTime = item.lastAccessed;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey);
		}
	}

	/**
	 * 히트율 업데이트
	 */
	private updateHitRate(): void {
		const total = this.statistics.hitCount + this.statistics.missCount;
		this.statistics.hitRate = total > 0 ? this.statistics.hitCount / total : 0;
	}

	/**
	 * 통계 업데이트
	 */
	private updateStatistics(): void {
		if (!this.options.enableStatistics) return;

		this.statistics.totalItems = this.cache.size;

		if (this.cache.size > 0) {
			const items = Array.from(this.cache.values());
			this.statistics.oldestItem = Math.min(
				...items.map((item) => item.timestamp),
			);
			this.statistics.newestItem = Math.max(
				...items.map((item) => item.timestamp),
			);
		} else {
			this.statistics.oldestItem = 0;
			this.statistics.newestItem = 0;
		}

		// 메모리 사용량 추정 (간단한 계산)
		this.statistics.memoryUsage = this.cache.size * 1024; // 1KB per item estimate
	}

	/**
	 * 정리 타이머 시작
	 */
	private startCleanupTimer(): void {
		this.cleanupTimer = setInterval(() => {
			this.cleanup();
		}, this.options.cleanupInterval);
	}
}

// ===== RDF SEARCH CACHE =====

/**
 * RDF 검색 캐시
 */
export class RDFSearchCache {
	private cache: RDFCache;

	constructor(options: Partial<RDFCacheOptions> = {}) {
		this.cache = new RDFCache({
			maxSize: 500,
			defaultTTL: 10 * 60 * 1000, // 10 minutes
			cleanupInterval: 2 * 60 * 1000, // 2 minutes
			enableLRU: true,
			enableStatistics: true,
			...options,
		});
	}

	/**
	 * 검색 결과 캐시 조회
	 */
	getSearchResults(
		query: string,
		options: any = {},
	): RDFAddressSearchResult[] | null {
		const key = this.createSearchKey(query, options);
		return this.cache.get<RDFAddressSearchResult[]>(key);
	}

	/**
	 * 검색 결과 캐시 저장
	 */
	setSearchResults(
		query: string,
		results: RDFAddressSearchResult[],
		options: any = {},
	): void {
		const key = this.createSearchKey(query, options);
		this.cache.set(key, results);
	}

	/**
	 * 통계 조회
	 */
	getStatistics(): RDFCacheStatistics {
		return this.cache.getStatistics();
	}

	/**
	 * 캐시 정리
	 */
	cleanup(): void {
		this.cache.cleanup();
	}

	/**
	 * 캐시 파괴
	 */
	destroy(): void {
		this.cache.destroy();
	}

	/**
	 * 검색 키 생성
	 */
	private createSearchKey(query: string, options: any): string {
		const optionsStr = JSON.stringify(options, Object.keys(options).sort());
		return `search:${query}:${optionsStr}`;
	}
}

// ===== RDF STATISTICS CACHE =====

/**
 * RDF 통계 캐시
 */
export class RDFStatisticsCache {
	private cache: RDFCache;

	constructor(options: Partial<RDFCacheOptions> = {}) {
		this.cache = new RDFCache({
			maxSize: 100,
			defaultTTL: 30 * 60 * 1000, // 30 minutes
			cleanupInterval: 5 * 60 * 1000, // 5 minutes
			enableLRU: true,
			enableStatistics: true,
			...options,
		});
	}

	/**
	 * 통계 캐시 조회
	 */
	getStatistics(namespace?: string): RDFStatistics | null {
		const key = namespace ? `stats:${namespace}` : "stats:global";
		return this.cache.get<RDFStatistics>(key);
	}

	/**
	 * 통계 캐시 저장
	 */
	setStatistics(statistics: RDFStatistics, namespace?: string): void {
		const key = namespace ? `stats:${namespace}` : "stats:global";
		this.cache.set(key, statistics);
	}

	/**
	 * 캐시 정리
	 */
	cleanup(): void {
		this.cache.cleanup();
	}

	/**
	 * 캐시 파괴
	 */
	destroy(): void {
		this.cache.destroy();
	}
}
