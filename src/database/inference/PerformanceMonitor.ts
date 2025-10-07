/**
 * Performance Monitor
 * 성능 측정 및 벤치마크 시스템
 */

export interface PerformanceMetric {
	name: string;
	startTime: number;
	endTime: number;
	duration: number;
	metadata?: Record<string, any>;
}

export interface BenchmarkResult {
	name: string;
	iterations: number;
	averageTime: number;
	minTime: number;
	maxTime: number;
	totalTime: number;
	throughput: number; // operations per second
	metadata?: Record<string, any>;
}

export interface SystemPerformanceReport {
	timestamp: Date;
	overallScore: number;
	metrics: {
		parsing: BenchmarkResult;
		database: BenchmarkResult;
		inference: BenchmarkResult;
		cache: BenchmarkResult;
	};
	recommendations: string[];
}

/**
 * Performance Monitor
 * 성능 측정 및 벤치마크를 위한 모니터링 시스템
 */
export class PerformanceMonitor {
	private metrics: PerformanceMetric[] = [];
	private benchmarks: BenchmarkResult[] = [];
	private isMonitoring = false;

	/**
	 * 성능 측정 시작
	 */
	startMeasurement(name: string, metadata?: Record<string, any>): string {
		const measurementId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		this.metrics.push({
			name,
			startTime: performance.now(),
			endTime: 0,
			duration: 0,
			metadata: { ...metadata, measurementId },
		});

		return measurementId;
	}

	/**
	 * 성능 측정 종료
	 */
	endMeasurement(measurementId: string): PerformanceMetric | null {
		const metric = this.metrics.find(
			(m) => m.metadata?.measurementId === measurementId,
		);
		if (!metric) {
			return null;
		}

		metric.endTime = performance.now();
		metric.duration = metric.endTime - metric.startTime;

		return metric;
	}

	/**
	 * 성능 측정 (간편 버전)
	 */
	async measure<T>(
		name: string,
		operation: () => Promise<T>,
		metadata?: Record<string, any>,
	): Promise<{ result: T; metric: PerformanceMetric }> {
		const measurementId = this.startMeasurement(name, metadata);

		try {
			const result = await operation();
			const metric = this.endMeasurement(measurementId);
			return { result, metric: metric! };
		} catch (error) {
			this.endMeasurement(measurementId);
			throw error;
		}
	}

	/**
	 * 벤치마크 실행
	 */
	async benchmark<T>(
		name: string,
		operation: () => Promise<T>,
		iterations: number = 10,
		metadata?: Record<string, any>,
	): Promise<BenchmarkResult> {
		const times: number[] = [];
		const startTime = performance.now();

		// Warmup
		await operation();

		// Benchmark iterations
		for (let i = 0; i < iterations; i++) {
			const iterationStart = performance.now();
			await operation();
			const iterationEnd = performance.now();
			times.push(iterationEnd - iterationStart);
		}

		const totalTime = performance.now() - startTime;
		const averageTime =
			times.reduce((sum, time) => sum + time, 0) / times.length;
		const minTime = Math.min(...times);
		const maxTime = Math.max(...times);
		const throughput = (iterations / totalTime) * 1000; // operations per second

		const result: BenchmarkResult = {
			name,
			iterations,
			averageTime,
			minTime,
			maxTime,
			totalTime,
			throughput,
			metadata,
		};

		this.benchmarks.push(result);
		return result;
	}

	/**
	 * 파싱 성능 벤치마크
	 */
	async benchmarkParsing(
		parseFunction: (code: string, language: string) => Promise<any>,
		testCases: Array<{ code: string; language: string; name: string }>,
	): Promise<BenchmarkResult> {
		return this.benchmark(
			"parsing",
			async () => {
				for (const testCase of testCases) {
					await parseFunction(testCase.code, testCase.language);
				}
			},
			10,
			{ testCases: testCases.length },
		);
	}

	/**
	 * 데이터베이스 성능 벤치마크
	 */
	async benchmarkDatabase(
		_database: any,
		operations: Array<{ name: string; operation: () => Promise<any> }>,
	): Promise<BenchmarkResult> {
		return this.benchmark(
			"database",
			async () => {
				for (const op of operations) {
					await op.operation();
				}
			},
			5,
			{ operations: operations.length },
		);
	}

	/**
	 * 추론 성능 벤치마크
	 */
	async benchmarkInference(
		inferenceEngine: any,
		queries: Array<{ type: string; options: any }>,
	): Promise<BenchmarkResult> {
		return this.benchmark(
			"inference",
			async () => {
				for (const query of queries) {
					await inferenceEngine.queryHierarchical(query.type, query.options);
				}
			},
			5,
			{ queries: queries.length },
		);
	}

	/**
	 * 캐시 성능 벤치마크
	 */
	async benchmarkCache(
		cache: any,
		operations: Array<{ key: string; value: any; operation: "get" | "set" }>,
	): Promise<BenchmarkResult> {
		return this.benchmark(
			"cache",
			async () => {
				for (const op of operations) {
					if (op.operation === "set") {
						cache.set(op.key, op.value);
					} else {
						cache.get(op.key);
					}
				}
			},
			20,
			{ operations: operations.length },
		);
	}

	/**
	 * 종합 성능 보고서 생성
	 */
	generateReport(): SystemPerformanceReport {
		const parsingBenchmark = this.benchmarks.find((b) => b.name === "parsing");
		const databaseBenchmark = this.benchmarks.find(
			(b) => b.name === "database",
		);
		const inferenceBenchmark = this.benchmarks.find(
			(b) => b.name === "inference",
		);
		const cacheBenchmark = this.benchmarks.find((b) => b.name === "cache");

		// Calculate overall score (0-100)
		const scores = [
			parsingBenchmark?.throughput || 0,
			databaseBenchmark?.throughput || 0,
			inferenceBenchmark?.throughput || 0,
			cacheBenchmark?.throughput || 0,
		];
		const overallScore = Math.round(
			scores.reduce((sum, score) => sum + score, 0) / scores.length,
		);

		// Generate recommendations
		const recommendations: string[] = [];

		if (parsingBenchmark && parsingBenchmark.averageTime > 100) {
			recommendations.push(
				"파싱 성능이 느립니다. Tree-sitter 쿼리 최적화를 고려하세요.",
			);
		}

		if (databaseBenchmark && databaseBenchmark.averageTime > 50) {
			recommendations.push(
				"데이터베이스 성능이 느립니다. 인덱스 최적화를 고려하세요.",
			);
		}

		if (inferenceBenchmark && inferenceBenchmark.averageTime > 200) {
			recommendations.push("추론 성능이 느립니다. 캐시 전략을 검토하세요.");
		}

		if (cacheBenchmark && cacheBenchmark.throughput < 1000) {
			recommendations.push("캐시 성능이 느립니다. LRU 캐시 크기를 조정하세요.");
		}

		return {
			timestamp: new Date(),
			overallScore,
			metrics: {
				parsing: parsingBenchmark || this.createEmptyBenchmark("parsing"),
				database: databaseBenchmark || this.createEmptyBenchmark("database"),
				inference: inferenceBenchmark || this.createEmptyBenchmark("inference"),
				cache: cacheBenchmark || this.createEmptyBenchmark("cache"),
			},
			recommendations,
		};
	}

	/**
	 * 빈 벤치마크 결과 생성
	 */
	private createEmptyBenchmark(name: string): BenchmarkResult {
		return {
			name,
			iterations: 0,
			averageTime: 0,
			minTime: 0,
			maxTime: 0,
			totalTime: 0,
			throughput: 0,
		};
	}

	/**
	 * 성능 메트릭 조회
	 */
	getMetrics(name?: string): Map<string, any> {
		const metricsMap = new Map<string, any>();

		if (name) {
			const filteredMetrics = this.metrics.filter((m) => m.name === name);
			metricsMap.set(name, filteredMetrics);
		} else {
			// Group metrics by name
			const groupedMetrics = this.metrics.reduce(
				(acc, metric) => {
					if (!acc[metric.name]) {
						acc[metric.name] = [];
					}
					acc[metric.name].push(metric);
					return acc;
				},
				{} as Record<string, PerformanceMetric[]>,
			);

			for (const [metricName, metrics] of Object.entries(groupedMetrics)) {
				metricsMap.set(metricName, metrics);
			}
		}

		return metricsMap;
	}

	/**
	 * 벤치마크 결과 조회
	 */
	getBenchmarks(name?: string): BenchmarkResult[] {
		if (name) {
			return this.benchmarks.filter((b) => b.name === name);
		}
		return [...this.benchmarks];
	}

	/**
	 * 성능 통계
	 */
	getStatistics(): {
		totalMeasurements: number;
		totalBenchmarks: number;
		averageDuration: number;
		slowestOperation: PerformanceMetric | null;
		fastestOperation: PerformanceMetric | null;
	} {
		const totalMeasurements = this.metrics.length;
		const totalBenchmarks = this.benchmarks.length;
		const averageDuration =
			this.metrics.length > 0
				? this.metrics.reduce((sum, m) => sum + m.duration, 0) /
					this.metrics.length
				: 0;

		const slowestOperation =
			this.metrics.length > 0
				? this.metrics.reduce((slowest, current) =>
						current.duration > slowest.duration ? current : slowest,
					)
				: null;

		const fastestOperation =
			this.metrics.length > 0
				? this.metrics.reduce((fastest, current) =>
						current.duration < fastest.duration ? current : fastest,
					)
				: null;

		return {
			totalMeasurements,
			totalBenchmarks,
			averageDuration,
			slowestOperation,
			fastestOperation,
		};
	}

	/**
	 * 데이터 초기화
	 */
	clear(): void {
		this.metrics = [];
		this.benchmarks = [];
	}

	/**
	 * 모니터링 상태 확인
	 */
	isActive(): boolean {
		return this.isMonitoring;
	}

	/**
	 * 모니터링 시작
	 */
	startMonitoring(): void {
		this.isMonitoring = true;
	}

	/**
	 * 모니터링 중지
	 */
	stopMonitoring(): void {
		this.isMonitoring = false;
	}
}
