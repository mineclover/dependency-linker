/**
 * Batch Processor
 *
 * 성능 최적화를 위한 배치 처리 시스템
 * CONVENTIONS.md 기준에 따른 성능 패턴 적용
 */

import { ErrorHandler, ERROR_CODES } from "./ErrorHandler";
import { PERFORMANCE_CONSTANTS, TypeGuards } from "./Constants";

/**
 * 배치 처리 옵션
 */
export interface BatchProcessorOptions {
	/** 배치 크기 */
	batchSize?: number;

	/** 동시 처리 수 */
	concurrency?: number;

	/** 타임아웃 (밀리초) */
	timeout?: number;

	/** 재시도 횟수 */
	retryCount?: number;

	/** 재시도 지연 (밀리초) */
	retryDelay?: number;

	/** 진행 상황 콜백 */
	onProgress?: (completed: number, total: number) => void;

	/** 에러 콜백 */
	onError?: (error: Error, item: any, index: number) => void;
}

/**
 * 배치 처리 결과
 */
export interface BatchProcessorResult<T> {
	/** 성공한 결과들 */
	results: T[];

	/** 실패한 항목들 */
	failures: Array<{
		item: any;
		index: number;
		error: Error;
	}>;

	/** 처리 통계 */
	statistics: {
		total: number;
		successful: number;
		failed: number;
		executionTime: number;
		throughput: number; // items per second
	};
}

/**
 * 배치 처리기
 */
export class BatchProcessor<T, R> {
	private options: Required<BatchProcessorOptions>;

	constructor(options: BatchProcessorOptions = {}) {
		this.options = {
			batchSize: options.batchSize ?? PERFORMANCE_CONSTANTS.DEFAULT_BATCH_SIZE,
			concurrency: options.concurrency ?? 1,
			timeout: options.timeout ?? PERFORMANCE_CONSTANTS.DEFAULT_TIMEOUT,
			retryCount: options.retryCount ?? 3,
			retryDelay: options.retryDelay ?? 1000,
			onProgress: options.onProgress ?? (() => {}),
			onError: options.onError ?? (() => {}),
		};

		// 설정 검증
		this.validateOptions();
	}

	/**
	 * 설정 검증
	 */
	private validateOptions(): void {
		if (
			!TypeGuards.isValidNumber(
				this.options.batchSize,
				1,
				PERFORMANCE_CONSTANTS.MAX_BATCH_SIZE,
			)
		) {
			throw new Error(`Invalid batch size: ${this.options.batchSize}`);
		}

		if (!TypeGuards.isValidNumber(this.options.concurrency, 1, 10)) {
			throw new Error(`Invalid concurrency: ${this.options.concurrency}`);
		}

		if (
			!TypeGuards.isValidNumber(
				this.options.timeout,
				1000,
				PERFORMANCE_CONSTANTS.MAX_TIMEOUT,
			)
		) {
			throw new Error(`Invalid timeout: ${this.options.timeout}`);
		}
	}

	/**
	 * 배치 처리 실행
	 */
	async process(
		items: T[],
		processor: (item: T, index: number) => Promise<R>,
	): Promise<BatchProcessorResult<R>> {
		const startTime = Date.now();
		const results: R[] = [];
		const failures: Array<{ item: T; index: number; error: Error }> = [];

		// 배치 생성
		const batches = this.createBatches(items);

		// 배치별 처리
		for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
			const batch = batches[batchIndex];
			const batchResults = await this.processBatch(
				batch,
				processor,
				batchIndex,
			);

			results.push(...batchResults.results);
			failures.push(...batchResults.failures);

			// 진행 상황 알림
			if (this.options.onProgress) {
				const completed = (batchIndex + 1) * this.options.batchSize;
				this.options.onProgress(
					Math.min(completed, items.length),
					items.length,
				);
			}
		}

		const executionTime = Date.now() - startTime;
		const throughput = items.length / (executionTime / 1000);

		return {
			results,
			failures,
			statistics: {
				total: items.length,
				successful: results.length,
				failed: failures.length,
				executionTime,
				throughput,
			},
		};
	}

	/**
	 * 배치 생성
	 */
	protected createBatches<T>(items: T[]): T[][] {
		const batches: T[][] = [];

		for (let i = 0; i < items.length; i += this.options.batchSize) {
			batches.push(items.slice(i, i + this.options.batchSize));
		}

		return batches;
	}

	/**
	 * 단일 배치 처리
	 */
	protected async processBatch<T, R>(
		batch: T[],
		processor: (item: T, index: number) => Promise<R>,
		batchIndex: number,
	): Promise<{
		results: R[];
		failures: Array<{ item: T; index: number; error: Error }>;
	}> {
		const results: R[] = [];
		const failures: Array<{ item: T; index: number; error: Error }> = [];

		// 동시 처리
		const promises = batch.map(async (item, localIndex) => {
			const globalIndex = batchIndex * this.options.batchSize + localIndex;

			try {
				const result = await this.processWithRetry(
					() => processor(item, globalIndex),
					item,
					globalIndex,
				);
				results.push(result);
			} catch (error) {
				const failure = {
					item,
					index: globalIndex,
					error: error as Error,
				};
				failures.push(failure);

				if (this.options.onError) {
					this.options.onError(error as Error, item, globalIndex);
				}
			}
		});

		// 타임아웃 적용
		await Promise.race([Promise.all(promises), this.createTimeoutPromise()]);

		return { results, failures };
	}

	/**
	 * 재시도와 함께 처리
	 */
	private async processWithRetry<T>(
		operation: () => Promise<T>,
		item: any,
		index: number,
	): Promise<T> {
		let lastError: Error;

		for (let attempt = 1; attempt <= this.options.retryCount; attempt++) {
			try {
				return await operation();
			} catch (error) {
				lastError = error as Error;

				if (attempt === this.options.retryCount) {
					throw lastError;
				}

				// 지연 후 재시도
				await this.delay(this.options.retryDelay * attempt);
			}
		}

		// 이 지점에 도달하면 안 됨
		throw lastError!;
	}

	/**
	 * 타임아웃 Promise 생성
	 */
	private createTimeoutPromise(): Promise<never> {
		return new Promise((_, reject) => {
			setTimeout(() => {
				reject(
					new Error(`Batch processing timeout after ${this.options.timeout}ms`),
				);
			}, this.options.timeout);
		});
	}

	/**
	 * 지연 함수
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

/**
 * 병렬 배치 처리기
 */
export class ParallelBatchProcessor<T, R> extends BatchProcessor<T, R> {
	constructor(options: BatchProcessorOptions = {}) {
		super({
			...options,
			concurrency:
				options.concurrency ?? Math.min(4, navigator.hardwareConcurrency || 2),
		});
	}

	/**
	 * 병렬 배치 처리
	 */
	async processParallel(
		items: T[],
		processor: (item: T, index: number) => Promise<R>,
	): Promise<BatchProcessorResult<R>> {
		const startTime = Date.now();
		const results: R[] = [];
		const failures: Array<{ item: T; index: number; error: Error }> = [];

		// 워커 풀 생성
		const workers = this.createWorkers();
		const workerCount = workers.length;

		// 작업 분배
		const workChunks = this.distributeWork(items, workerCount);

		// 병렬 처리
		const workerPromises = workChunks.map((chunk, workerIndex) =>
			this.processWorkerChunk(chunk, processor, workers[workerIndex]),
		);

		const workerResults = await Promise.all(workerPromises);

		// 결과 병합
		for (const workerResult of workerResults) {
			results.push(...workerResult.results);
			failures.push(...workerResult.failures);
		}

		const executionTime = Date.now() - startTime;
		const throughput = items.length / (executionTime / 1000);

		return {
			results,
			failures,
			statistics: {
				total: items.length,
				successful: results.length,
				failed: failures.length,
				executionTime,
				throughput,
			},
		};
	}

	/**
	 * 워커 생성
	 */
	protected createWorkers(): Array<{ id: number; busy: boolean }> {
		const workerCount = (this as any).options.concurrency;
		return Array.from({ length: workerCount }, (_, i) => ({
			id: i,
			busy: false,
		}));
	}

	/**
	 * 작업 분배
	 */
	private distributeWork<T>(items: T[], workerCount: number): T[][] {
		const chunks: T[][] = Array.from({ length: workerCount }, () => []);

		items.forEach((item, index) => {
			chunks[index % workerCount].push(item);
		});

		return chunks;
	}

	/**
	 * 워커 청크 처리
	 */
	private async processWorkerChunk<T, R>(
		chunk: T[],
		processor: (item: T, index: number) => Promise<R>,
		worker: { id: number; busy: boolean },
	): Promise<{
		results: R[];
		failures: Array<{ item: T; index: number; error: Error }>;
	}> {
		worker.busy = true;

		try {
			const results: R[] = [];
			const failures: Array<{ item: T; index: number; error: Error }> = [];

			for (let i = 0; i < chunk.length; i++) {
				try {
					const result = await processor(chunk[i], i);
					results.push(result);
				} catch (error) {
					failures.push({
						item: chunk[i],
						index: i,
						error: error as Error,
					});
				}
			}

			return { results, failures };
		} finally {
			worker.busy = false;
		}
	}
}

/**
 * 스트리밍 배치 처리기
 */
export class StreamingBatchProcessor<T, R> extends BatchProcessor<T, R> {
	/**
	 * 스트리밍 배치 처리
	 */
	async processStreaming(
		items: T[],
		processor: (item: T, index: number) => Promise<R>,
		onBatchComplete?: (batch: R[], batchIndex: number) => void,
	): Promise<BatchProcessorResult<R>> {
		const startTime = Date.now();
		const allResults: R[] = [];
		const allFailures: Array<{ item: T; index: number; error: Error }> = [];

		// 배치 생성
		const batches = this.createBatches(items);

		// 스트리밍 처리
		for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
			const batch = batches[batchIndex];
			const batchResults = await this.processBatch(
				batch,
				processor,
				batchIndex,
			);

			allResults.push(...batchResults.results);
			allFailures.push(...batchResults.failures);

			// 배치 완료 콜백
			if (onBatchComplete) {
				onBatchComplete(batchResults.results, batchIndex);
			}
		}

		const executionTime = Date.now() - startTime;
		const throughput = items.length / (executionTime / 1000);

		return {
			results: allResults,
			failures: allFailures,
			statistics: {
				total: items.length,
				successful: allResults.length,
				failed: allFailures.length,
				executionTime,
				throughput,
			},
		};
	}
}
