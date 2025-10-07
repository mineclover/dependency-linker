import { OptimizedGraphAnalysis } from "../../performance/OptimizedGraphAnalysis";
import { AdvancedCache } from "../../cache/AdvancedCache";
import { BatchProcessor } from "../../batch/BatchProcessor";
import { GraphDatabase } from "../../database/GraphDatabase";

export interface PerformanceOptimizationHandlerOptions {
	projectRoot?: string;
	databasePath?: string;
	enableCaching?: boolean;
	enableBatchProcessing?: boolean;
	enableVisualization?: boolean;
	enableMonitoring?: boolean;
	maxConcurrency?: number;
	batchSize?: number;
	cacheSizeLimit?: number;
	memoryLimit?: number;
}

export class PerformanceOptimizationHandler {
	private optimizedAnalysis: OptimizedGraphAnalysis;
	private cache: AdvancedCache<any>;
	private batchProcessor: BatchProcessor<string, any>;
	private database: GraphDatabase;
	private options: Required<PerformanceOptimizationHandlerOptions>;

	constructor(options: PerformanceOptimizationHandlerOptions = {}) {
		this.options = {
			projectRoot: options.projectRoot || process.cwd(),
			databasePath: options.databasePath || "dependency-linker.db",
			enableCaching: options.enableCaching ?? true,
			enableBatchProcessing: options.enableBatchProcessing ?? true,
			enableVisualization: options.enableVisualization ?? true,
			enableMonitoring: options.enableMonitoring ?? true,
			maxConcurrency: options.maxConcurrency || 4,
			batchSize: options.batchSize || 10,
			cacheSizeLimit: options.cacheSizeLimit || 100 * 1024 * 1024, // 100MB
			memoryLimit: options.memoryLimit || 1024 * 1024 * 1024, // 1GB
		};

		this.optimizedAnalysis = new OptimizedGraphAnalysis({
			enableCaching: this.options.enableCaching,
			enableBatchProcessing: this.options.enableBatchProcessing,
			enableVisualization: this.options.enableVisualization,
			enableMonitoring: this.options.enableMonitoring,
			maxConcurrency: this.options.maxConcurrency,
			batchSize: this.options.batchSize,
			cacheSizeLimit: this.options.cacheSizeLimit,
			memoryLimit: this.options.memoryLimit,
		});

		this.cache = new AdvancedCache({
			maxSize: this.options.cacheSizeLimit,
			maxEntries: 1000,
			defaultTTL: 3600000, // 1시간
		});

		this.batchProcessor = new BatchProcessor(
			async (filePath: string) => await this.processFile(filePath),
			{
				maxConcurrency: this.options.maxConcurrency,
				batchSize: this.options.batchSize,
				enableCaching: this.options.enableCaching,
				enableMonitoring: this.options.enableMonitoring,
				memoryLimit: this.options.memoryLimit,
			},
		);

		this.database = new GraphDatabase(this.options.databasePath);
	}

	/**
	 * 최적화된 프로젝트 분석 실행
	 */
	async analyzeProject(
		projectName?: string,
		filePatterns?: string[],
		options?: {
			enableCaching?: boolean;
			enableBatchProcessing?: boolean;
			enableVisualization?: boolean;
			enableMonitoring?: boolean;
		},
	): Promise<void> {
		try {
			console.log(
				`🚀 최적화된 프로젝트 분석 실행: ${projectName || "unknown-project"}`,
			);

			const result = await this.optimizedAnalysis.analyzeProject(
				this.options.projectRoot,
				projectName || "unknown-project",
				filePatterns || ["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx"],
			);

			console.log(`✅ 최적화된 프로젝트 분석 완료:`);
			console.log(`  - 프로젝트: ${result.metadata.projectName}`);
			console.log(`  - 총 파일 수: ${result.analysis.totalFiles}개`);
			console.log(`  - 처리된 파일: ${result.analysis.processedFiles}개`);
			console.log(`  - 실패한 파일: ${result.analysis.failedFiles}개`);
			console.log(`  - 총 의존성: ${result.analysis.totalDependencies}개`);
			console.log(`  - 직접 의존성: ${result.analysis.directDependencies}개`);
			console.log(
				`  - 전이적 의존성: ${result.analysis.transitiveDependencies}개`,
			);
			console.log(`  - 순환 의존성: ${result.analysis.circularDependencies}개`);

			console.log(`\n📊 성능 메트릭:`);
			console.log(
				`  - 총 실행 시간: ${Math.round(result.performance.totalTime)}ms`,
			);
			console.log(
				`  - 파일당 평균 시간: ${Math.round(result.performance.averageTimePerFile)}ms`,
			);
			console.log(
				`  - 처리량: ${Math.round(result.performance.throughput)}파일/초`,
			);
			console.log(
				`  - 메모리 사용량: ${Math.round(result.performance.memoryUsage / 1024 / 1024)}MB`,
			);
			console.log(
				`  - 캐시 히트율: ${Math.round(result.performance.cacheHitRate * 100)}%`,
			);
			console.log(
				`  - CPU 사용률: ${Math.round(result.performance.cpuUsage * 100)}%`,
			);

			console.log(`\n💾 캐시 통계:`);
			console.log(`  - 총 히트: ${result.cache.totalHits}개`);
			console.log(`  - 총 미스: ${result.cache.totalMisses}개`);
			console.log(`  - 히트율: ${Math.round(result.cache.hitRate * 100)}%`);
			console.log(
				`  - 총 크기: ${Math.round(result.cache.totalSize / 1024 / 1024)}MB`,
			);
			console.log(`  - 엔트리 수: ${result.cache.entryCount}개`);

			if (result.visualization) {
				console.log(`\n📈 시각화 결과:`);
				console.log(`  - 형식: ${result.visualization.format}`);
				console.log(`  - 출력 경로: ${result.visualization.outputPath}`);
				console.log(
					`  - 파일 크기: ${Math.round(result.visualization.fileSize / 1024)}KB`,
				);
				console.log(`  - 노드 수: ${result.visualization.nodeCount}개`);
				console.log(`  - 엣지 수: ${result.visualization.edgeCount}개`);
			}
		} catch (error) {
			console.error(
				`❌ 최적화된 프로젝트 분석 실패: ${(error as Error).message}`,
			);
			throw error;
		}
	}

	/**
	 * 캐시 관리
	 */
	async manageCache(action: "clear" | "stats" | "optimize"): Promise<void> {
		try {
			switch (action) {
				case "clear":
					await this.cache.clear();
					console.log(`✅ 캐시 초기화 완료`);
					break;

				case "stats":
					const stats = await this.cache.getStats();
					console.log(`📊 캐시 통계:`);
					console.log(`  - 총 히트: ${stats.totalHits}개`);
					console.log(`  - 총 미스: ${stats.totalMisses}개`);
					console.log(`  - 히트율: ${Math.round(stats.hitRate * 100)}%`);
					console.log(
						`  - 총 크기: ${Math.round(stats.totalSize / 1024 / 1024)}MB`,
					);
					console.log(`  - 엔트리 수: ${stats.entryCount}개`);
					console.log(`  - 제거된 엔트리: ${stats.evictionCount}개`);
					console.log(
						`  - 평균 접근 시간: ${Math.round(stats.averageAccessTime)}ms`,
					);
					break;

				case "optimize":
					await this.cache.clear();
					console.log(`✅ 캐시 최적화 완료`);
					break;
			}
		} catch (error) {
			console.error(`❌ 캐시 관리 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 배치 처리 관리
	 */
	async manageBatchProcessing(
		action: "start" | "stop" | "stats" | "retry",
		options?: {
			filePaths?: string[];
			maxConcurrency?: number;
			batchSize?: number;
		},
	): Promise<void> {
		try {
			switch (action) {
				case "start":
					if (!options?.filePaths) {
						console.log("❌ 파일 경로를 지정해주세요");
						return;
					}

					console.log(`🔄 배치 처리 시작: ${options.filePaths.length}개 파일`);

					// 작업 추가
					for (let i = 0; i < options.filePaths.length; i++) {
						await this.batchProcessor.addJob(
							`job_${i}`,
							options.filePaths[i],
							i,
						);
					}

					// 처리 시작
					await this.batchProcessor.process();

					console.log(`✅ 배치 처리 완료`);
					break;

				case "stop":
					this.batchProcessor.destroy();
					console.log(`✅ 배치 처리 중지 완료`);
					break;

				case "stats":
					const progress = this.batchProcessor.getProgress();
					const stats = this.batchProcessor.getStats();

					console.log(`📊 배치 처리 통계:`);
					console.log(`  - 총 작업: ${progress.total}개`);
					console.log(`  - 완료된 작업: ${progress.completed}개`);
					console.log(`  - 실패한 작업: ${progress.failed}개`);
					console.log(`  - 진행률: ${Math.round(progress.percentage)}%`);
					console.log(
						`  - 평균 처리 시간: ${Math.round(stats.averageProcessingTime)}ms`,
					);
					console.log(
						`  - 총 처리 시간: ${Math.round(stats.totalProcessingTime)}ms`,
					);
					console.log(`  - 처리량: ${Math.round(stats.throughput)}작업/초`);
					console.log(
						`  - 메모리 사용량: ${Math.round(stats.memoryUsage / 1024 / 1024)}MB`,
					);
					console.log(
						`  - 캐시 히트율: ${Math.round(stats.cacheHitRate * 100)}%`,
					);
					break;

				case "retry":
					await this.batchProcessor.retryFailedJobs();
					console.log(`✅ 실패한 작업 재시도 완료`);
					break;
			}
		} catch (error) {
			console.error(`❌ 배치 처리 관리 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 성능 모니터링
	 */
	async startMonitoring(options?: {
		interval?: number;
		includeMemory?: boolean;
		includeCPU?: boolean;
		includeCache?: boolean;
	}): Promise<void> {
		try {
			console.log(`📊 성능 모니터링 시작`);

			const interval = options?.interval || 5000; // 5초
			const includeMemory = options?.includeMemory ?? true;
			const includeCPU = options?.includeCPU ?? true;
			const includeCache = options?.includeCache ?? true;

			const monitor = setInterval(async () => {
				console.log(`\n📊 성능 모니터링 (${new Date().toLocaleTimeString()}):`);

				if (includeMemory) {
					const memUsage = process.memoryUsage();
					console.log(
						`  - 메모리 사용량: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
					);
					console.log(
						`  - 힙 사용량: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
					);
					console.log(
						`  - 외부 메모리: ${Math.round(memUsage.external / 1024 / 1024)}MB`,
					);
				}

				if (includeCPU) {
					const cpuUsage = process.cpuUsage();
					console.log(`  - CPU 사용량: ${Math.round(cpuUsage.user / 1000)}ms`);
					console.log(
						`  - 시스템 CPU: ${Math.round(cpuUsage.system / 1000)}ms`,
					);
				}

				if (includeCache) {
					const cacheStats = await this.cache.getStats();
					console.log(
						`  - 캐시 히트율: ${Math.round(cacheStats.hitRate * 100)}%`,
					);
					console.log(
						`  - 캐시 크기: ${Math.round(cacheStats.totalSize / 1024 / 1024)}MB`,
					);
				}
			}, interval);

			// 모니터링 중지 (Ctrl+C 등)
			process.on("SIGINT", () => {
				clearInterval(monitor);
				console.log(`\n✅ 성능 모니터링 중지`);
			});
		} catch (error) {
			console.error(`❌ 성능 모니터링 시작 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 메모리 최적화
	 */
	async optimizeMemory(): Promise<void> {
		try {
			console.log(`🧹 메모리 최적화 시작`);

			// 가비지 컬렉션 강제 실행
			if (global.gc) {
				global.gc();
				console.log(`  - 가비지 컬렉션 실행 완료`);
			}

			// 캐시 최적화
			await this.cache.clear();
			console.log(`  - 캐시 최적화 완료`);

			// 메모리 사용량 확인
			const memUsage = process.memoryUsage();
			console.log(`✅ 메모리 최적화 완료:`);
			console.log(
				`  - 힙 사용량: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
			);
			console.log(
				`  - 힙 총량: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
			);
			console.log(
				`  - 외부 메모리: ${Math.round(memUsage.external / 1024 / 1024)}MB`,
			);
		} catch (error) {
			console.error(`❌ 메모리 최적화 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 성능 벤치마크 실행
	 */
	async runBenchmark(options?: {
		iterations?: number;
		includeMemory?: boolean;
		includeCPU?: boolean;
		includeCache?: boolean;
	}): Promise<void> {
		try {
			console.log(`🏃 성능 벤치마크 실행`);

			const iterations = options?.iterations || 10;
			const includeMemory = options?.includeMemory ?? true;
			const includeCPU = options?.includeCPU ?? true;
			const includeCache = options?.includeCache ?? true;

			const results = [];

			for (let i = 0; i < iterations; i++) {
				console.log(`  - 반복 ${i + 1}/${iterations} 실행 중...`);

				const startTime = Date.now();
				const startMemory = process.memoryUsage();
				const startCPU = process.cpuUsage();

				// 벤치마크 작업 실행
				await this.runBenchmarkTask();

				const endTime = Date.now();
				const endMemory = process.memoryUsage();
				const endCPU = process.cpuUsage();

				const result = {
					iteration: i + 1,
					executionTime: endTime - startTime,
					memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
					cpuDelta: endCPU.user - startCPU.user,
				};

				results.push(result);
			}

			// 결과 분석
			const avgExecutionTime =
				results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;
			const avgMemoryDelta =
				results.reduce((sum, r) => sum + r.memoryDelta, 0) / results.length;
			const avgCPUDelta =
				results.reduce((sum, r) => sum + r.cpuDelta, 0) / results.length;

			console.log(`✅ 성능 벤치마크 완료:`);
			console.log(`  - 반복 횟수: ${iterations}회`);
			console.log(`  - 평균 실행 시간: ${Math.round(avgExecutionTime)}ms`);
			console.log(
				`  - 평균 메모리 변화: ${Math.round(avgMemoryDelta / 1024 / 1024)}MB`,
			);
			console.log(`  - 평균 CPU 변화: ${Math.round(avgCPUDelta / 1000)}ms`);
		} catch (error) {
			console.error(`❌ 성능 벤치마크 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 성능 통계 생성
	 */
	async generateStatistics(): Promise<void> {
		try {
			console.log(`📊 성능 통계 생성`);

			// 시스템 정보
			console.log(`\n💻 시스템 정보:`);
			console.log(`  - Node.js 버전: ${process.version}`);
			console.log(`  - 플랫폼: ${process.platform}`);
			console.log(`  - 아키텍처: ${process.arch}`);
			console.log(`  - 프로젝트 루트: ${this.options.projectRoot}`);
			console.log(`  - 데이터베이스 경로: ${this.options.databasePath}`);

			// 설정 정보
			console.log(`\n⚙️ 설정 정보:`);
			console.log(
				`  - 캐싱: ${this.options.enableCaching ? "Enabled" : "Disabled"}`,
			);
			console.log(
				`  - 배치 처리: ${this.options.enableBatchProcessing ? "Enabled" : "Disabled"}`,
			);
			console.log(
				`  - 시각화: ${this.options.enableVisualization ? "Enabled" : "Disabled"}`,
			);
			console.log(
				`  - 모니터링: ${this.options.enableMonitoring ? "Enabled" : "Disabled"}`,
			);
			console.log(`  - 최대 동시성: ${this.options.maxConcurrency}`);
			console.log(`  - 배치 크기: ${this.options.batchSize}`);
			console.log(
				`  - 캐시 크기 제한: ${Math.round(this.options.cacheSizeLimit / 1024 / 1024)}MB`,
			);
			console.log(
				`  - 메모리 제한: ${Math.round(this.options.memoryLimit / 1024 / 1024)}MB`,
			);

			// 현재 성능 상태
			const memUsage = process.memoryUsage();
			const cpuUsage = process.cpuUsage();
			const cacheStats = await this.cache.getStats();

			console.log(`\n📊 현재 성능 상태:`);
			console.log(
				`  - 힙 사용량: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
			);
			console.log(
				`  - 힙 총량: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
			);
			console.log(
				`  - 외부 메모리: ${Math.round(memUsage.external / 1024 / 1024)}MB`,
			);
			console.log(`  - CPU 사용량: ${Math.round(cpuUsage.user / 1000)}ms`);
			console.log(`  - 시스템 CPU: ${Math.round(cpuUsage.system / 1000)}ms`);
			console.log(`  - 캐시 히트율: ${Math.round(cacheStats.hitRate * 100)}%`);
			console.log(
				`  - 캐시 크기: ${Math.round(cacheStats.totalSize / 1024 / 1024)}MB`,
			);
		} catch (error) {
			console.error(`❌ 성능 통계 생성 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 파일 처리 (벤치마크용)
	 */
	private async processFile(filePath: string): Promise<any> {
		// 실제 파일 처리 로직 구현
		return { filePath, processed: true };
	}

	/**
	 * 벤치마크 작업 실행
	 */
	private async runBenchmarkTask(): Promise<void> {
		// 벤치마크용 작업 실행
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	/**
	 * 핸들러 초기화
	 */
	async initialize(): Promise<void> {
		try {
			await this.database.initialize();
			console.log("✅ Performance Optimization Handler 초기화 완료");
		} catch (error) {
			console.error(
				`❌ Performance Optimization Handler 초기화 실패: ${(error as Error).message}`,
			);
			throw error;
		}
	}

	/**
	 * 핸들러 종료
	 */
	async close(): Promise<void> {
		try {
			await this.database.close();
			this.cache.destroy();
			this.batchProcessor.destroy();
			console.log("✅ Performance Optimization Handler 종료 완료");
		} catch (error) {
			console.error(
				`❌ Performance Optimization Handler 종료 실패: ${(error as Error).message}`,
			);
			throw error;
		}
	}
}
