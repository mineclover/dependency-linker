/**
 * Batch Processing System
 * 배치 처리 시스템
 *
 * 핵심 기능:
 * 1. 대용량 파일 배치 처리
 * 2. 병렬 처리
 * 3. 진행률 추적
 * 4. 에러 처리 및 재시도
 * 5. 성능 모니터링
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { EventEmitter } from "node:events";
import { AdvancedCache } from "../cache/AdvancedCache.js";

export interface BatchJob<T, R> {
	id: string;
	input: T;
	priority: number;
	retryCount: number;
	maxRetries: number;
	createdAt: Date;
	startedAt?: Date;
	completedAt?: Date;
	error?: Error;
	result?: R;
}

export interface BatchProcessorOptions {
	/** 최대 동시 처리 수 */
	maxConcurrency?: number;
	/** 배치 크기 */
	batchSize?: number;
	/** 최대 재시도 횟수 */
	maxRetries?: number;
	/** 재시도 간격 (밀리초) */
	retryInterval?: number;
	/** 진행률 업데이트 간격 (밀리초) */
	progressInterval?: number;
	/** 캐싱 활성화 */
	enableCaching?: boolean;
	/** 성능 모니터링 활성화 */
	enableMonitoring?: boolean;
	/** 메모리 제한 (바이트) */
	memoryLimit?: number;
}

export interface BatchProgress {
	total: number;
	completed: number;
	failed: number;
	processing: number;
	percentage: number;
	estimatedTimeRemaining: number;
	throughput: number;
}

export interface BatchStats {
	totalJobs: number;
	completedJobs: number;
	failedJobs: number;
	averageProcessingTime: number;
	totalProcessingTime: number;
	throughput: number;
	memoryUsage: number;
	cacheHitRate: number;
}

/**
 * 배치 처리 시스템
 */
export class BatchProcessor<T, R> extends EventEmitter {
	private jobs = new Map<string, BatchJob<T, R>>();
	private processing = new Set<string>();
	private completed = new Set<string>();
	private failed = new Set<string>();
	private options: Required<BatchProcessorOptions>;
	private cache?: AdvancedCache<R>;
	private stats: BatchStats;
	private startTime?: number;

	constructor(
		private processor: (input: T) => Promise<R>,
		options: BatchProcessorOptions = {},
	) {
		super();

		this.options = {
			maxConcurrency: options.maxConcurrency || 4,
			batchSize: options.batchSize || 10,
			maxRetries: options.maxRetries || 3,
			retryInterval: options.retryInterval || 1000,
			progressInterval: options.progressInterval || 1000,
			enableCaching: options.enableCaching !== false,
			enableMonitoring: options.enableMonitoring !== false,
			memoryLimit: options.memoryLimit || 1024 * 1024 * 1024, // 1GB
		};

		this.stats = {
			totalJobs: 0,
			completedJobs: 0,
			failedJobs: 0,
			averageProcessingTime: 0,
			totalProcessingTime: 0,
			throughput: 0,
			memoryUsage: 0,
			cacheHitRate: 0,
		};

		// 캐시 초기화
		if (this.options.enableCaching) {
			this.cache = new AdvancedCache<R>({
				maxSize: this.options.memoryLimit / 4, // 메모리의 1/4을 캐시에 할당
				maxEntries: 1000,
				defaultTTL: 3600000, // 1시간
			});
		}
	}

	/**
	 * 작업 추가
	 */
	async addJob(id: string, input: T, priority: number = 0): Promise<void> {
		const job: BatchJob<T, R> = {
			id,
			input,
			priority,
			retryCount: 0,
			maxRetries: this.options.maxRetries,
			createdAt: new Date(),
		};

		this.jobs.set(id, job);
		this.stats.totalJobs++;

		// 진행률 이벤트 발생
		this.emit("jobAdded", { job, progress: this.getProgress() });
	}

	/**
	 * 배치 처리 시작
	 */
	async process(): Promise<Map<string, R>> {
		this.startTime = Date.now();
		this.emit("processingStarted", { totalJobs: this.jobs.size });

		// 진행률 모니터링 시작
		if (this.options.enableMonitoring) {
			this.startProgressMonitoring();
		}

		// 배치별로 처리
		const results = new Map<string, R>();
		const jobIds = Array.from(this.jobs.keys());

		for (let i = 0; i < jobIds.length; i += this.options.batchSize) {
			const batch = jobIds.slice(i, i + this.options.batchSize);
			await this.processBatch(batch, results);
		}

		// 완료 이벤트 발생
		this.emit("processingCompleted", {
			results,
			stats: this.getStats(),
			progress: this.getProgress(),
		});

		return results;
	}

	/**
	 * 배치 처리
	 */
	private async processBatch(
		jobIds: string[],
		results: Map<string, R>,
	): Promise<void> {
		const promises = jobIds.map((jobId) => this.processJob(jobId, results));
		await Promise.allSettled(promises);
	}

	/**
	 * 개별 작업 처리
	 */
	private async processJob(
		jobId: string,
		results: Map<string, R>,
	): Promise<void> {
		const job = this.jobs.get(jobId);
		if (!job) return;

		// 캐시 확인
		if (this.cache) {
			const cached = await this.cache.get(jobId);
			if (cached) {
				job.result = cached;
				job.completedAt = new Date();
				this.completed.add(jobId);
				this.stats.completedJobs++;
				results.set(jobId, cached);

				this.emit("jobCompleted", { job, result: cached });
				return;
			}
		}

		// 처리 시작
		job.startedAt = new Date();
		this.processing.add(jobId);

		try {
			// 메모리 사용량 확인
			if (this.options.enableMonitoring) {
				this.updateMemoryUsage();
			}

			// 작업 처리
			const result = await this.processor(job.input);

			// 결과 저장
			job.result = result;
			job.completedAt = new Date();
			this.completed.add(jobId);
			this.processing.delete(jobId);
			this.stats.completedJobs++;
			results.set(jobId, result);

			// 캐시 저장
			if (this.cache) {
				await this.cache.set(jobId, result);
			}

			// 통계 업데이트
			this.updateStats(job);

			// 완료 이벤트 발생
			this.emit("jobCompleted", { job, result });
		} catch (error) {
			// 에러 처리
			job.error = error instanceof Error ? error : new Error(String(error));

			// 재시도 확인
			if (job.retryCount < job.maxRetries) {
				job.retryCount++;
				this.processing.delete(jobId);

				// 재시도 스케줄링
				setTimeout(() => {
					this.processJob(jobId, results);
				}, this.options.retryInterval);

				this.emit("jobRetry", { job, retryCount: job.retryCount });
			} else {
				// 최종 실패
				this.failed.add(jobId);
				this.processing.delete(jobId);
				this.stats.failedJobs++;

				this.emit("jobFailed", { job, error: job.error });
			}
		}
	}

	/**
	 * 진행률 조회
	 */
	getProgress(): BatchProgress {
		const total = this.jobs.size;
		const completed = this.completed.size;
		const failed = this.failed.size;
		const processing = this.processing.size;
		const percentage = total > 0 ? (completed / total) * 100 : 0;

		// 예상 완료 시간 계산
		let estimatedTimeRemaining = 0;
		if (this.startTime && completed > 0) {
			const elapsed = Date.now() - this.startTime;
			const rate = completed / elapsed;
			const remaining = total - completed;
			estimatedTimeRemaining = remaining / rate;
		}

		// 처리량 계산
		let throughput = 0;
		if (this.startTime) {
			const elapsed = (Date.now() - this.startTime) / 1000; // 초
			throughput = completed / elapsed;
		}

		return {
			total,
			completed,
			failed,
			processing,
			percentage,
			estimatedTimeRemaining,
			throughput,
		};
	}

	/**
	 * 통계 조회
	 */
	getStats(): BatchStats {
		return { ...this.stats };
	}

	/**
	 * 진행률 모니터링 시작
	 */
	private startProgressMonitoring(): void {
		setInterval(() => {
			const progress = this.getProgress();
			this.emit("progress", progress);
		}, this.options.progressInterval);
	}

	/**
	 * 통계 업데이트
	 */
	private updateStats(job: BatchJob<T, R>): void {
		if (job.startedAt && job.completedAt) {
			const processingTime =
				job.completedAt.getTime() - job.startedAt.getTime();
			this.stats.totalProcessingTime += processingTime;
			this.stats.averageProcessingTime =
				this.stats.totalProcessingTime / this.stats.completedJobs;
		}

		// 처리량 업데이트
		if (this.startTime) {
			const elapsed = (Date.now() - this.startTime) / 1000;
			this.stats.throughput = this.stats.completedJobs / elapsed;
		}

		// 캐시 히트율 업데이트
		if (this.cache) {
			const cacheStats = this.cache.getStats();
			this.stats.cacheHitRate = cacheStats.hitRate;
		}
	}

	/**
	 * 메모리 사용량 업데이트
	 */
	private updateMemoryUsage(): void {
		const memoryUsage = process.memoryUsage();
		this.stats.memoryUsage = memoryUsage.heapUsed / 1024 / 1024; // MB

		// 메모리 제한 확인
		if (this.stats.memoryUsage > this.options.memoryLimit / 1024 / 1024) {
			this.emit("memoryWarning", {
				usage: this.stats.memoryUsage,
				limit: this.options.memoryLimit / 1024 / 1024,
			});
		}
	}

	/**
	 * 작업 상태 조회
	 */
	getJobStatus(
		jobId: string,
	): "pending" | "processing" | "completed" | "failed" {
		if (this.completed.has(jobId)) return "completed";
		if (this.failed.has(jobId)) return "failed";
		if (this.processing.has(jobId)) return "processing";
		return "pending";
	}

	/**
	 * 작업 결과 조회
	 */
	getJobResult(jobId: string): R | undefined {
		const job = this.jobs.get(jobId);
		return job?.result;
	}

	/**
	 * 실패한 작업 재시도
	 */
	async retryFailedJobs(): Promise<void> {
		const failedJobIds = Array.from(this.failed);
		this.failed.clear();
		this.stats.failedJobs = 0;

		for (const jobId of failedJobIds) {
			const job = this.jobs.get(jobId);
			if (job) {
				job.retryCount = 0;
				job.error = undefined;
				job.startedAt = undefined;
				job.completedAt = undefined;
			}
		}

		// 재처리 시작
		await this.process();
	}

	/**
	 * 배치 처리기 정리
	 */
	destroy(): void {
		if (this.cache) {
			this.cache.destroy();
		}
		this.removeAllListeners();
	}
}

/**
 * 파일 배치 처리기
 */
export class FileBatchProcessor extends BatchProcessor<string, any> {
	constructor(
		private fileProcessor: (filePath: string) => Promise<any>,
		options: BatchProcessorOptions = {},
	) {
		super(async (filePath: string) => {
			// 파일 존재 확인
			try {
				await fs.access(filePath);
				return await this.fileProcessor(filePath);
			} catch (error) {
				throw new Error(`File not found: ${filePath}`);
			}
		}, options);
	}

	/**
	 * 디렉토리에서 파일 배치 추가
	 */
	async addFilesFromDirectory(
		directoryPath: string,
		pattern: string = "**/*",
		priority: number = 0,
	): Promise<void> {
		try {
			const files = await this.findFiles(directoryPath, pattern);

			for (const file of files) {
				await this.addJob(file, file, priority);
			}
		} catch (error) {
			throw new Error(
				`Failed to add files from directory: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * 파일 검색
	 */
	private async findFiles(
		directoryPath: string,
		pattern: string,
	): Promise<string[]> {
		const files: string[] = [];

		try {
			const entries = await fs.readdir(directoryPath, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = path.join(directoryPath, entry.name);

				if (entry.isDirectory()) {
					const subFiles = await this.findFiles(fullPath, pattern);
					files.push(...subFiles);
				} else if (entry.isFile()) {
					// 패턴 매칭 (간단한 구현)
					if (this.matchesPattern(entry.name, pattern)) {
						files.push(fullPath);
					}
				}
			}
		} catch (error) {
			console.warn(`Failed to read directory ${directoryPath}:`, error);
		}

		return files;
	}

	/**
	 * 패턴 매칭
	 */
	private matchesPattern(fileName: string, pattern: string): boolean {
		// 간단한 와일드카드 매칭
		if (pattern === "**/*") return true;
		if (pattern.includes("*")) {
			const regex = new RegExp(pattern.replace(/\*/g, ".*"));
			return regex.test(fileName);
		}
		return fileName === pattern;
	}
}



