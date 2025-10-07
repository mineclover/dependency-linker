/**
 * Enhanced Metadata Tracker
 * 향상된 메타데이터 추적 시스템
 */

import { PackageJsonResolver } from "../../database/utils/PackageJsonResolver";
import { ExternalLinkValidator } from "./ExternalLinkValidator";

export interface EnhancedMetadata {
	/** 생성 시간 */
	createdAt: Date;
	/** 마지막 업데이트 시간 */
	updatedAt: Date;
	/** 소스 파일 해시 */
	fileHash: string;
	/** 링크 통계 */
	linkStats: {
		total: number;
		internal: number;
		external: number;
		broken: number;
		accessible: number;
		redirected: number;
	};
	/** 라이브러리 통계 */
	libraryStats: {
		total: number;
		installed: number;
		devDependencies: number;
		peerDependencies: number;
		optionalDependencies: number;
	};
	/** 성능 메트릭 */
	performance: {
		parseTime: number;
		validationTime: number;
		cacheHitRate: number;
	};
	/** 검증 상태 */
	validationStatus: {
		lastValidated: Date;
		needsRevalidation: boolean;
		validationErrors: string[];
	};
}

export interface TrackingOptions {
	/** 링크 검증 활성화 */
	validateLinks: boolean;
	/** 라이브러리 정보 추적 활성화 */
	trackLibraries: boolean;
	/** 성능 메트릭 수집 활성화 */
	collectMetrics: boolean;
	/** 캐시 사용 여부 */
	useCache: boolean;
	/** 재검증 주기 (시간) */
	revalidationInterval: number;
}

export class EnhancedMetadataTracker {
	private linkValidator: ExternalLinkValidator;
	private packageResolver: PackageJsonResolver;
	private metadataCache = new Map<string, EnhancedMetadata>();
	private options: Required<TrackingOptions>;

	constructor(projectRoot: string, options: Partial<TrackingOptions> = {}) {
		this.options = {
			validateLinks: options.validateLinks !== false,
			trackLibraries: options.trackLibraries !== false,
			collectMetrics: options.collectMetrics !== false,
			useCache: options.useCache !== false,
			revalidationInterval: options.revalidationInterval || 24 * 60 * 60 * 1000, // 24시간
		};

		this.linkValidator = new ExternalLinkValidator({
			timeout: 5000,
			concurrent: 5,
			cache: this.options.useCache,
		});

		this.packageResolver = new PackageJsonResolver(projectRoot);
	}

	/**
	 * 향상된 메타데이터 생성
	 */
	async generateEnhancedMetadata(
		filePath: string,
		content: string,
		links: Array<{ url: string; type: string }>,
		libraries: string[] = [],
	): Promise<EnhancedMetadata> {
		const startTime = Date.now();

		// 파일 해시 계산
		const fileHash = await this.calculateFileHash(content);

		// 캐시 확인
		if (this.options.useCache && this.metadataCache.has(filePath)) {
			const cached = this.metadataCache.get(filePath);
			if (cached && this.shouldUseCachedMetadata(cached)) {
				return cached;
			}
		}

		// 링크 통계 계산
		const linkStats = await this.calculateLinkStats(links);

		// 라이브러리 통계 계산
		const libraryStats = await this.calculateLibraryStats(libraries);

		// 성능 메트릭 계산
		const performance = this.calculatePerformanceMetrics(startTime);

		// 검증 상태 계산
		const validationStatus = this.calculateValidationStatus(filePath);

		const metadata: EnhancedMetadata = {
			createdAt: new Date(),
			updatedAt: new Date(),
			fileHash,
			linkStats,
			libraryStats,
			performance,
			validationStatus,
		};

		// 캐시에 저장
		if (this.options.useCache) {
			this.metadataCache.set(filePath, metadata);
		}

		return metadata;
	}

	/**
	 * 링크 통계 계산
	 */
	private async calculateLinkStats(
		links: Array<{ url: string; type: string }>,
	): Promise<EnhancedMetadata["linkStats"]> {
		const stats = {
			total: links.length,
			internal: 0,
			external: 0,
			broken: 0,
			accessible: 0,
			redirected: 0,
		};

		if (!this.options.validateLinks) {
			return stats;
		}

		// 링크 타입별 분류
		for (const link of links) {
			if (link.type === "internal") {
				stats.internal++;
			} else if (link.type === "external") {
				stats.external++;

				// 외부 링크 검증
				const validation = await this.linkValidator.validateLink(link.url);
				switch (validation.status) {
					case "accessible":
						stats.accessible++;
						break;
					case "broken":
						stats.broken++;
						break;
					case "redirected":
						stats.redirected++;
						break;
				}
			}
		}

		return stats;
	}

	/**
	 * 라이브러리 통계 계산
	 */
	private async calculateLibraryStats(
		libraries: string[],
	): Promise<EnhancedMetadata["libraryStats"]> {
		const stats = {
			total: libraries.length,
			installed: 0,
			devDependencies: 0,
			peerDependencies: 0,
			optionalDependencies: 0,
		};

		if (!this.options.trackLibraries) {
			return stats;
		}

		for (const library of libraries) {
			const packageInfo = await this.packageResolver.getPackageInfo(library);
			if (packageInfo) {
				stats.installed++;

				if (packageInfo.isDevDependency) {
					stats.devDependencies++;
				}
				if (packageInfo.isPeerDependency) {
					stats.peerDependencies++;
				}
				if (packageInfo.isOptionalDependency) {
					stats.optionalDependencies++;
				}
			}
		}

		return stats;
	}

	/**
	 * 성능 메트릭 계산
	 */
	private calculatePerformanceMetrics(
		startTime: number,
	): EnhancedMetadata["performance"] {
		const parseTime = Date.now() - startTime;
		const cacheStats = this.linkValidator.getCacheStats();
		const cacheHitRate =
			cacheStats.totalCached > 0
				? (cacheStats.accessible + cacheStats.redirected) /
					cacheStats.totalCached
				: 0;

		return {
			parseTime,
			validationTime: 0, // TODO: 실제 검증 시간 측정
			cacheHitRate,
		};
	}

	/**
	 * 검증 상태 계산
	 */
	private calculateValidationStatus(
		filePath: string,
	): EnhancedMetadata["validationStatus"] {
		const cached = this.metadataCache.get(filePath);
		const lastValidated = cached?.validationStatus.lastValidated || new Date(0);
		const needsRevalidation =
			Date.now() - lastValidated.getTime() > this.options.revalidationInterval;

		return {
			lastValidated,
			needsRevalidation,
			validationErrors: [],
		};
	}

	/**
	 * 파일 해시 계산
	 */
	private async calculateFileHash(content: string): Promise<string> {
		const crypto = await import("node:crypto");
		return crypto.createHash("sha256").update(content).digest("hex");
	}

	/**
	 * 캐시된 메타데이터 사용 여부 판단
	 */
	private shouldUseCachedMetadata(metadata: EnhancedMetadata): boolean {
		if (!this.options.useCache) {
			return false;
		}

		// 재검증이 필요한 경우
		if (metadata.validationStatus.needsRevalidation) {
			return false;
		}

		// 24시간 이내 생성된 경우
		const age = Date.now() - metadata.createdAt.getTime();
		return age < 24 * 60 * 60 * 1000;
	}

	/**
	 * 캐시 클리어
	 */
	clearCache(): void {
		this.metadataCache.clear();
		this.linkValidator.clearCache();
	}

	/**
	 * 캐시 통계
	 */
	getCacheStats(): {
		metadataCacheSize: number;
		linkCacheStats: ReturnType<ExternalLinkValidator["getCacheStats"]>;
	} {
		return {
			metadataCacheSize: this.metadataCache.size,
			linkCacheStats: this.linkValidator.getCacheStats(),
		};
	}
}
