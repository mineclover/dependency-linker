/**
 * Performance Monitor
 * 성능 모니터링 및 벤치마킹 시스템
 */

// ===== PERFORMANCE TYPES =====

/**
 * 성능 측정 결과
 */
export interface PerformanceMeasurement {
	name: string;
	startTime: number;
	endTime: number;
	duration: number;
	memoryBefore: number;
	memoryAfter: number;
	memoryDelta: number;
	metadata?: Record<string, any>;
}

/**
 * 성능 벤치마크 결과
 */
export interface PerformanceBenchmark {
	name: string;
	iterations: number;
	totalTime: number;
	averageTime: number;
	minTime: number;
	maxTime: number;
	memoryUsage: number;
	throughput: number; // operations per second
	results: PerformanceMeasurement[];
}

/**
 * 성능 리포트
 */
export interface PerformanceReport {
	timestamp: string;
	totalMeasurements: number;
	totalTime: number;
	averageTime: number;
	memoryUsage: {
		peak: number;
		average: number;
		current: number;
	};
	benchmarks: PerformanceBenchmark[];
	recommendations: string[];
}

// ===== PERFORMANCE MONITOR =====

/**
 * 성능 모니터
 */
export class PerformanceMonitor {
	private measurements: PerformanceMeasurement[] = [];
	private benchmarks: PerformanceBenchmark[] = [];

	/**
	 * 성능 측정 시작
	 */
	startMeasurement(name: string, metadata?: Record<string, any>): string {
		const measurementId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		const measurement: PerformanceMeasurement = {
			name,
			startTime: Date.now(),
			endTime: 0,
			duration: 0,
			memoryBefore: this.getCurrentMemoryUsage(),
			memoryAfter: 0,
			memoryDelta: 0,
			metadata,
		};

		this.measurements.push(measurement);
		return measurementId;
	}

	/**
	 * 성능 측정 종료
	 */
	endMeasurement(measurementId: string): PerformanceMeasurement | null {
		const measurement = this.measurements.find(
			(m) => m.name === measurementId.split("_")[0] && m.endTime === 0,
		);

		if (!measurement) {
			console.warn(`Measurement not found: ${measurementId}`);
			return null;
		}

		measurement.endTime = Date.now();
		measurement.duration = measurement.endTime - measurement.startTime;
		measurement.memoryAfter = this.getCurrentMemoryUsage();
		measurement.memoryDelta =
			measurement.memoryAfter - measurement.memoryBefore;

		return measurement;
	}

	/**
	 * 성능 벤치마크 실행
	 */
	async runBenchmark(
		name: string,
		fn: () => Promise<any>,
		iterations: number = 10,
	): Promise<PerformanceBenchmark> {
		const results: PerformanceMeasurement[] = [];
		const startTime = Date.now();

		console.log(`🏃 Running benchmark: ${name} (${iterations} iterations)`);

		for (let i = 0; i < iterations; i++) {
			const measurementId = this.startMeasurement(`${name}_iteration_${i}`);
			await fn();
			const measurement = this.endMeasurement(measurementId);
			if (measurement) {
				results.push(measurement);
			}
		}

		const totalTime = Date.now() - startTime;
		const durations = results.map((r) => r.duration);
		const memoryUsages = results.map((r) => r.memoryAfter);

		const benchmark: PerformanceBenchmark = {
			name,
			iterations,
			totalTime,
			averageTime: durations.reduce((a, b) => a + b, 0) / durations.length,
			minTime: Math.min(...durations),
			maxTime: Math.max(...durations),
			memoryUsage:
				memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
			throughput: iterations / (totalTime / 1000),
			results,
		};

		this.benchmarks.push(benchmark);
		return benchmark;
	}

	/**
	 * 성능 리포트 생성
	 */
	generateReport(): PerformanceReport {
		const now = new Date().toISOString();
		const totalMeasurements = this.measurements.length;
		const totalTime = this.measurements.reduce((sum, m) => sum + m.duration, 0);
		const averageTime = totalTime / totalMeasurements;

		const memoryUsages = this.measurements.map((m) => m.memoryAfter);
		const peakMemory = Math.max(...memoryUsages);
		const averageMemory =
			memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
		const currentMemory = this.getCurrentMemoryUsage();

		const recommendations = this.generateRecommendations();

		return {
			timestamp: now,
			totalMeasurements,
			totalTime,
			averageTime,
			memoryUsage: {
				peak: peakMemory,
				average: averageMemory,
				current: currentMemory,
			},
			benchmarks: [...this.benchmarks],
			recommendations,
		};
	}

	/**
	 * 성능 데이터 초기화
	 */
	reset(): void {
		this.measurements = [];
		this.benchmarks = [];
	}

	/**
	 * 모니터링 시작
	 */
	startMonitoring(): void {
		console.log("📊 Performance monitoring started");
	}

	/**
	 * 모니터링 중지
	 */
	stopMonitoring(): void {
		console.log("📊 Performance monitoring stopped");
	}

	/**
	 * 현재 메모리 사용량 조회
	 */
	getCurrentMemoryUsage(): number {
		const usage = process.memoryUsage();
		return usage.heapUsed / 1024 / 1024; // MB
	}

	/**
	 * 성능 데이터 내보내기
	 */
	exportData(): {
		measurements: PerformanceMeasurement[];
		benchmarks: PerformanceBenchmark[];
		report: PerformanceReport;
	} {
		return {
			measurements: [...this.measurements],
			benchmarks: [...this.benchmarks],
			report: this.generateReport(),
		};
	}

	// ===== PRIVATE METHODS =====

	/**
	 * 성능 개선 권장사항 생성
	 */
	private generateRecommendations(): string[] {
		const recommendations: string[] = [];
		const report = this.generateReport();

		// 메모리 사용량 권장사항
		if (report.memoryUsage.peak > 512) {
			recommendations.push(
				"High memory usage detected. Consider implementing caching or reducing batch sizes.",
			);
		}

		// 실행 시간 권장사항
		if (report.averageTime > 1000) {
			recommendations.push(
				"Slow operations detected. Consider optimizing algorithms or using parallel processing.",
			);
		}

		// 벤치마크 권장사항
		for (const benchmark of report.benchmarks) {
			if (benchmark.throughput < 10) {
				recommendations.push(
					`Low throughput in ${benchmark.name}. Consider performance optimization.`,
				);
			}
		}

		return recommendations;
	}
}

// ===== PERFORMANCE UTILITIES =====

/**
 * 성능 측정 데코레이터
 */
export function measurePerformanceDecorator(
	name: string,
	metadata?: Record<string, any>,
) {
	return (
		_target: any,
		_propertyName: string,
		descriptor: PropertyDescriptor,
	) => {
		const method = descriptor.value;

		descriptor.value = async function (...args: any[]) {
			const monitor = new PerformanceMonitor();
			const measurementId = monitor.startMeasurement(name, metadata);

			try {
				const result = await method.apply(this, args);
				const measurement = monitor.endMeasurement(measurementId);

				if (measurement) {
					console.log(
						`⏱️  ${name}: ${measurement.duration}ms (${measurement.memoryDelta.toFixed(2)}MB)`,
					);
				}

				return result;
			} catch (error) {
				monitor.endMeasurement(measurementId);
				throw error;
			}
		};
	};
}

/**
 * 성능 측정 헬퍼 함수들
 */
const monitor = new PerformanceMonitor();

/**
 * 함수 실행 시간 측정
 */
export async function measurePerformance<T>(
	name: string,
	fn: () => Promise<T>,
	metadata?: Record<string, any>,
): Promise<{ result: T; measurement: PerformanceMeasurement }> {
	const measurementId = monitor.startMeasurement(name, metadata);
	const result = await fn();
	const measurement = monitor.endMeasurement(measurementId);

	if (!measurement) {
		throw new Error(`Failed to end measurement: ${measurementId}`);
	}

	return { result, measurement };
}

/**
 * 벤치마크 실행
 */
export async function runBenchmark<T>(
	name: string,
	fn: () => Promise<T>,
	iterations: number = 10,
): Promise<PerformanceBenchmark> {
	return await monitor.runBenchmark(name, fn, iterations);
}

/**
 * 리포트 생성
 */
export function generatePerformanceReport(): PerformanceReport {
	return monitor.generateReport();
}
