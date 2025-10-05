/**
 * Performance Analysis API
 * 대용량 프로젝트 처리를 위한 성능 최적화 분석 API
 */

import fs from "fs";
import { glob } from "glob";
import { Worker } from "worker_threads";
import { cpus } from "os";
import type { SupportedLanguage } from "../core/types.js";

// ===== PERFORMANCE CONFIGURATION =====

export interface PerformanceConfig {
	maxConcurrency: number;
	batchSize: number;
	enableCaching: boolean;
	cacheDirectory: string;
	enableWorkerThreads: boolean;
	enableStreaming: boolean;
	memoryLimit: number; // MB
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
	maxConcurrency: Math.min(cpus().length, 8),
	batchSize: 50,
	enableCaching: true,
	cacheDirectory: "./.dependency-linker-cache",
	enableWorkerThreads: true,
	enableStreaming: true,
	memoryLimit: 1024, // 1GB
};

// ===== PERFORMANCE MONITORING =====

export class PerformanceMonitor {
	private startTime: number = 0;
	private memoryUsage: NodeJS.MemoryUsage[] = [];
	private fileCount: number = 0;
	private symbolCount: number = 0;
	private errorCount: number = 0;

	start(): void {
		this.startTime = performance.now();
		this.memoryUsage = [];
		this.fileCount = 0;
		this.symbolCount = 0;
		this.errorCount = 0;
	}

	recordMemoryUsage(): void {
		this.memoryUsage.push(process.memoryUsage());
	}

	recordFileProcessed(symbols: number, errors: number): void {
		this.fileCount++;
		this.symbolCount += symbols;
		this.errorCount += errors;
	}

	getMetrics(): {
		totalTime: number;
		averageMemoryUsage: number;
		peakMemoryUsage: number;
		filesPerSecond: number;
		symbolsPerSecond: number;
		throughput: {
			files: number;
			symbols: number;
			errors: number;
		};
	} {
		const totalTime = performance.now() - this.startTime;
		const averageMemoryUsage =
			this.memoryUsage.length > 0
				? this.memoryUsage.reduce((sum, usage) => sum + usage.heapUsed, 0) /
					this.memoryUsage.length
				: 0;
		const peakMemoryUsage =
			this.memoryUsage.length > 0
				? Math.max(...this.memoryUsage.map((usage) => usage.heapUsed))
				: 0;

		return {
			totalTime,
			averageMemoryUsage,
			peakMemoryUsage,
			filesPerSecond: this.fileCount / (totalTime / 1000),
			symbolsPerSecond: this.symbolCount / (totalTime / 1000),
			throughput: {
				files: this.fileCount,
				symbols: this.symbolCount,
				errors: this.errorCount,
			},
		};
	}
}

// ===== CACHING SYSTEM =====

export class AnalysisCache {
	private cacheDirectory: string;
	private cache: Map<string, any> = new Map();

	constructor(cacheDirectory: string) {
		this.cacheDirectory = cacheDirectory;
		this.ensureCacheDirectory();
	}

	private ensureCacheDirectory(): void {
		if (!fs.existsSync(this.cacheDirectory)) {
			fs.mkdirSync(this.cacheDirectory, { recursive: true });
		}
	}

	private getCacheKey(filePath: string, sourceCode: string): string {
		const crypto = require("crypto");
		return crypto
			.createHash("md5")
			.update(filePath + sourceCode)
			.digest("hex");
	}

	private getCacheFilePath(key: string): string {
		return `${this.cacheDirectory}/${key}.json`;
	}

	get(filePath: string, sourceCode: string): any | null {
		const key = this.getCacheKey(filePath, sourceCode);

		// 메모리 캐시 확인
		if (this.cache.has(key)) {
			return this.cache.get(key);
		}

		// 파일 캐시 확인
		const cacheFilePath = this.getCacheFilePath(key);
		if (fs.existsSync(cacheFilePath)) {
			try {
				const cached = JSON.parse(fs.readFileSync(cacheFilePath, "utf-8"));
				this.cache.set(key, cached);
				return cached;
			} catch (error) {
				// 캐시 파일이 손상된 경우 삭제
				fs.unlinkSync(cacheFilePath);
			}
		}

		return null;
	}

	set(filePath: string, sourceCode: string, result: any): void {
		const key = this.getCacheKey(filePath, sourceCode);

		// 메모리 캐시에 저장
		this.cache.set(key, result);

		// 파일 캐시에 저장
		const cacheFilePath = this.getCacheFilePath(key);
		try {
			fs.writeFileSync(cacheFilePath, JSON.stringify(result, null, 2));
		} catch (error) {
			console.warn(`⚠️  Failed to write cache for ${filePath}:`, error);
		}
	}

	clear(): void {
		this.cache.clear();
		if (fs.existsSync(this.cacheDirectory)) {
			fs.rmSync(this.cacheDirectory, { recursive: true, force: true });
			this.ensureCacheDirectory();
		}
	}
}

// ===== BATCH PROCESSING =====

export class BatchProcessor {
	private config: PerformanceConfig;
	private cache: AnalysisCache;
	private monitor: PerformanceMonitor;

	constructor(config: PerformanceConfig = DEFAULT_PERFORMANCE_CONFIG) {
		this.config = config;
		this.cache = new AnalysisCache(config.cacheDirectory);
		this.monitor = new PerformanceMonitor();
	}

	async processFiles(
		files: string[],
		language: SupportedLanguage = "typescript",
	): Promise<{
		results: any[];
		metrics: any;
		cacheStats: { hits: number; misses: number };
	}> {
		this.monitor.start();
		const results: any[] = [];
		let cacheHits = 0;
		let cacheMisses = 0;

		// 배치로 파일 처리
		const batches = this.createBatches(files, this.config.batchSize);

		for (const batch of batches) {
			// 병렬 처리
			const batchPromises = batch.map(async (file) => {
				try {
					// 캐시 확인
					const sourceCode = fs.readFileSync(file, "utf-8");
					const cached = this.cache.get(file, sourceCode);

					if (cached) {
						cacheHits++;
						this.monitor.recordFileProcessed(
							cached.symbols?.length || 0,
							cached.errors?.length || 0,
						);
						return cached;
					}

					// 캐시 미스 - 분석 실행
					cacheMisses++;
					const result = await this.analyzeFile(file, sourceCode, language);

					// 캐시에 저장
					this.cache.set(file, sourceCode, result);

					this.monitor.recordFileProcessed(
						result.symbols?.length || 0,
						result.errors?.length || 0,
					);
					return result;
				} catch (error) {
					console.warn(`⚠️  Failed to process ${file}:`, error);
					return {
						filePath: file,
						symbols: [],
						errors: [
							`Processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
						],
					};
				}
			});

			// 배치 결과 대기
			const batchResults = await Promise.all(batchPromises);
			results.push(...batchResults);

			// 메모리 사용량 기록
			this.monitor.recordMemoryUsage();

			// 메모리 제한 확인
			if (this.isMemoryLimitExceeded()) {
				console.warn("⚠️  Memory limit exceeded, clearing cache");
				this.cache.clear();
			}
		}

		return {
			results,
			metrics: this.monitor.getMetrics(),
			cacheStats: { hits: cacheHits, misses: cacheMisses },
		};
	}

	private createBatches<T>(items: T[], batchSize: number): T[][] {
		const batches: T[][] = [];
		for (let i = 0; i < items.length; i += batchSize) {
			batches.push(items.slice(i, i + batchSize));
		}
		return batches;
	}

	private async analyzeFile(
		filePath: string,
		sourceCode: string,
		language: SupportedLanguage,
	): Promise<any> {
		// 정규식 기반 분석 (기존 robust-analysis 로직 사용)
		const { extractSymbolsWithRegex } = await import("./robust-analysis.js");
		const { symbols, parseTime } = extractSymbolsWithRegex(
			sourceCode,
			filePath,
		);

		return {
			filePath,
			language,
			symbols,
			parseTime,
			errors: [],
		};
	}

	private isMemoryLimitExceeded(): boolean {
		const usage = process.memoryUsage();
		const heapUsedMB = usage.heapUsed / 1024 / 1024;
		return heapUsedMB > this.config.memoryLimit;
	}
}

// ===== STREAMING PROCESSING =====

export class StreamingProcessor {
	private config: PerformanceConfig;
	private cache: AnalysisCache;

	constructor(config: PerformanceConfig = DEFAULT_PERFORMANCE_CONFIG) {
		this.config = config;
		this.cache = new AnalysisCache(config.cacheDirectory);
	}

	async processFilesStreaming(
		files: string[],
		language: SupportedLanguage = "typescript",
		onProgress?: (processed: number, total: number, current: string) => void,
	): Promise<{
		results: any[];
		metrics: any;
	}> {
		const startTime = performance.now();
		const results: any[] = [];
		let processed = 0;

		for (const file of files) {
			try {
				// 캐시 확인
				const sourceCode = fs.readFileSync(file, "utf-8");
				const cached = this.cache.get(file, sourceCode);

				let result;
				if (cached) {
					result = cached;
				} else {
					// 분석 실행
					const { extractSymbolsWithRegex } = await import(
						"./robust-analysis.js"
					);
					const { symbols, parseTime } = extractSymbolsWithRegex(
						sourceCode,
						file,
					);

					result = {
						filePath: file,
						language,
						symbols,
						parseTime,
						errors: [],
					};

					// 캐시에 저장
					this.cache.set(file, sourceCode, result);
				}

				results.push(result);
				processed++;

				// 진행률 콜백
				if (onProgress) {
					onProgress(processed, files.length, file);
				}

				// 메모리 정리 (필요시)
				if (processed % 100 === 0) {
					if (global.gc) {
						global.gc();
					}
				}
			} catch (error) {
				console.warn(`⚠️  Failed to process ${file}:`, error);
				results.push({
					filePath: file,
					symbols: [],
					errors: [
						`Processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
					],
				});
				processed++;
			}
		}

		const totalTime = performance.now() - startTime;
		return {
			results,
			metrics: {
				totalTime,
				filesPerSecond: files.length / (totalTime / 1000),
				processedFiles: processed,
				totalFiles: files.length,
			},
		};
	}
}

// ===== PERFORMANCE ANALYSIS API =====

export async function analyzeFilesWithPerformance(
	files: string[],
	language: SupportedLanguage = "typescript",
	config: PerformanceConfig = DEFAULT_PERFORMANCE_CONFIG,
): Promise<{
	results: any[];
	metrics: any;
	cacheStats: { hits: number; misses: number };
	summary: {
		totalFiles: number;
		totalSymbols: number;
		totalErrors: number;
		successRate: number;
	};
}> {
	console.log(
		`🚀 Starting performance-optimized analysis of ${files.length} files...`,
	);
	console.log(
		`⚙️  Configuration: ${config.maxConcurrency} workers, ${config.batchSize} batch size`,
	);

	const processor = new BatchProcessor(config);
	const { results, metrics, cacheStats } = await processor.processFiles(
		files,
		language,
	);

	// 요약 통계
	const totalSymbols = results.reduce(
		(sum, result) => sum + (result.symbols?.length || 0),
		0,
	);
	const totalErrors = results.reduce(
		(sum, result) => sum + (result.errors?.length || 0),
		0,
	);
	const successRate =
		files.length > 0
			? ((files.length - results.filter((r) => r.errors?.length > 0).length) /
					files.length) *
				100
			: 100;

	console.log(`✅ Analysis completed!`);
	console.log(`📊 Performance metrics:`);
	console.log(`   Time: ${metrics.totalTime.toFixed(2)}ms`);
	console.log(`   Files/sec: ${metrics.filesPerSecond.toFixed(2)}`);
	console.log(`   Symbols/sec: ${metrics.symbolsPerSecond.toFixed(2)}`);
	console.log(
		`   Memory: ${(metrics.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB peak`,
	);
	console.log(`   Cache: ${cacheStats.hits} hits, ${cacheStats.misses} misses`);

	return {
		results,
		metrics,
		cacheStats,
		summary: {
			totalFiles: files.length,
			totalSymbols,
			totalErrors,
			successRate,
		},
	};
}
