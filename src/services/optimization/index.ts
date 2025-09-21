/**
 * Test Optimization Services
 * Complete test optimization framework with analysis, optimization, and performance tracking
 */

import { PerformanceTracker } from "./PerformanceTracker";
// ===== IMPORTS FOR INTERNAL USE =====
import { TestAnalyzer } from "./TestAnalyzer";
import { TestOptimizer } from "./TestOptimizer";

// ===== BENCHMARK UTILITIES =====
export {
	assertPerformance,
	type BenchmarkOptions,
	type BenchmarkResult,
	benchmark,
	clearBenchmarkResults,
	getAllBenchmarkResults,
	getBenchmarkResult,
} from "../../helpers/benchmark/PerformanceBenchmark";
export { PerformanceOptimizer } from "./PerformanceOptimizer";
export type {
	PerformanceTrackingOptions,
	TestExecutionResult,
	TestSuiteMetrics,
} from "./PerformanceTracker";
export { PerformanceTracker } from "./PerformanceTracker";
// ===== TYPE EXPORTS =====
export type {
	CategorizedTests,
	TestAnalysisOptions,
	TestFileInfo,
	TestSuiteAnalysis,
} from "./TestAnalyzer";
// ===== CORE SERVICES =====
export { TestAnalyzer } from "./TestAnalyzer";
// ===== UTILITY SERVICES =====
export { TestAssertions } from "./TestAssertions";
export { TestBenchmark } from "./TestBenchmark";
export { TestDataFactory } from "./TestDataFactory";
export { TestOptimizer } from "./TestOptimizer";
export { TestSetupManager } from "./TestSetupManager";

// ===== ORCHESTRATOR =====
export interface OptimizationServiceConfig {
	/** Maximum number of concurrent optimizations */
	maxConcurrentOptimizations?: number;
	/** Default timeout for service operations (ms) */
	defaultTimeoutMs?: number;
	/** Enable detailed performance tracking */
	enablePerformanceTracking?: boolean;
	/** Enable real-time monitoring */
	enableRealTimeMonitoring?: boolean;
	/** Output directory for reports and logs */
	outputDirectory?: string;
	/** Log level for service operations */
	logLevel?: "error" | "warn" | "info" | "debug" | "trace";
}

/**
 * Main optimization orchestrator class
 * Coordinates all optimization services for complete workflow
 */
export class OptimizationOrchestrator {
	private analyzer: TestAnalyzer;
	private optimizer: TestOptimizer;
	private tracker: PerformanceTracker;
	private config: OptimizationServiceConfig;

	constructor(config: OptimizationServiceConfig = {}) {
		this.config = {
			maxConcurrentOptimizations: 5,
			defaultTimeoutMs: 30000,
			enablePerformanceTracking: true,
			enableRealTimeMonitoring: false,
			outputDirectory: "./optimization-reports",
			logLevel: "info",
			...config,
		};

		this.analyzer = new TestAnalyzer();
		this.optimizer = new TestOptimizer();
		this.tracker = new PerformanceTracker();
	}

	/**
	 * Execute complete optimization workflow
	 */
	async optimizeTestSuite(testFilesPattern: string): Promise<{
		analysis: any;
		optimizations: any[];
		performance: any;
	}> {
		try {
			// 1. Analyze test files
			const analysis = await this.analyzer.analyzeTestSuite(testFilesPattern);

			// 2. Apply optimizations
			const optimizations = await Promise.all(
				analysis.testSuites
					.slice(0, this.config.maxConcurrentOptimizations)
					.map((suite: any) =>
						this.optimizer.optimizeTestSuite(suite, {
							preserveCriticalTests: true,
							targetDuration: 1500,
						}),
					),
			);

			// 3. Track performance if enabled
			let performance = null;
			if (this.config.enablePerformanceTracking) {
				for (const optimization of optimizations) {
					await this.tracker.trackTestSuiteExecution(
						optimization.optimizedSuite,
						async () => {
							// Simulate test execution
							await new Promise((resolve) => setTimeout(resolve, 100));
						},
					);
				}

				performance = {
					metrics: optimizations
						.map((opt: any) => this.tracker.getMetrics(opt.optimizedSuite.id))
						.filter(Boolean),
				};
			}

			return {
				analysis,
				optimizations,
				performance,
			};
		} catch (error) {
			throw new Error(
				`Optimization workflow failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Get service configuration
	 */
	getConfig(): OptimizationServiceConfig {
		return { ...this.config };
	}

	/**
	 * Update service configuration
	 */
	updateConfig(updates: Partial<OptimizationServiceConfig>): void {
		this.config = { ...this.config, ...updates };
	}

	/**
	 * Get individual service instances for advanced usage
	 */
	getServices() {
		return {
			analyzer: this.analyzer,
			optimizer: this.optimizer,
			tracker: this.tracker,
		};
	}

	/**
	 * Initialize all services
	 */
	async initialize(): Promise<void> {
		if (typeof this.tracker.initialize === "function") {
			await this.tracker.initialize();
		}
	}

	/**
	 * Cleanup all services
	 */
	async cleanup(): Promise<void> {
		if (typeof this.tracker.cleanup === "function") {
			await this.tracker.cleanup();
		}
	}
}

/**
 * Factory function for creating optimization orchestrator
 */
export function createOptimizationOrchestrator(
	config?: OptimizationServiceConfig,
): OptimizationOrchestrator {
	return new OptimizationOrchestrator(config);
}

/**
 * Utility function for quick optimization
 */
export async function optimizeTests(
	testFilesPattern: string,
	config?: OptimizationServiceConfig,
): Promise<{
	analysis: any;
	optimizations: any[];
	performance: any;
}> {
	const orchestrator = createOptimizationOrchestrator(config);

	try {
		await orchestrator.initialize();
		return await orchestrator.optimizeTestSuite(testFilesPattern);
	} finally {
		await orchestrator.cleanup();
	}
}
