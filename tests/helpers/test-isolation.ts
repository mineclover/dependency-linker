/**
 * Test Isolation Utilities
 * Provides shared utilities for better test isolation and cleanup
 */

import { AnalysisEngine } from "../../src/services/analysis-engine";
import { TypeScriptAnalyzer } from "../../src/api/TypeScriptAnalyzer";

export class TestIsolationManager {
	private static engines: AnalysisEngine[] = [];
	private static analyzers: TypeScriptAnalyzer[] = [];
	private static timers: NodeJS.Timeout[] = [];

	/**
	 * Register an engine for cleanup
	 */
	static registerEngine(engine: AnalysisEngine): void {
		this.engines.push(engine);
	}

	/**
	 * Register an analyzer for cleanup
	 */
	static registerAnalyzer(analyzer: TypeScriptAnalyzer): void {
		this.analyzers.push(analyzer);
	}

	/**
	 * Register a timer for cleanup
	 */
	static registerTimer(timer: NodeJS.Timeout): void {
		this.timers.push(timer);
	}

	/**
	 * Clean up all registered resources
	 */
	static async cleanup(): Promise<void> {
		// Clear timers
		for (const timer of this.timers) {
			clearTimeout(timer);
		}
		this.timers.length = 0;

		// Shutdown engines and clear their registries
		for (const engine of this.engines) {
			try {
				// Clear engine caches and state - CRITICAL for test isolation
				engine.clearCache();

				// Reset engine performance metrics
				engine.resetPerformanceMetrics();

				// Force clear all internal registries
				const extractorRegistry = (engine as any).extractorRegistry;
				const interpreterRegistry = (engine as any).interpreterRegistry;
				const cacheManager = (engine as any).cacheManager;
				const cacheModule = (engine as any).cacheModule;

				if (extractorRegistry && typeof extractorRegistry.clear === 'function') {
					extractorRegistry.clear();
				}
				if (interpreterRegistry && typeof interpreterRegistry.clear === 'function') {
					interpreterRegistry.clear();
				}
				if (cacheManager && typeof cacheManager.clear === 'function') {
					cacheManager.clear();
				}
				if (cacheModule && typeof cacheModule.clearAll === 'function') {
					await cacheModule.clearAll();
				}

				// Shutdown engine
				await engine.shutdown();
			} catch (error) {
				// Ignore shutdown errors
				console.warn("Engine cleanup error:", error);
			}
		}
		this.engines.length = 0;

		// Clear analyzer caches
		for (const analyzer of this.analyzers) {
			try {
				analyzer.clearCache();
			} catch (error) {
				// Ignore cache clear errors
				console.warn("Analyzer cleanup error:", error);
			}
		}
		this.analyzers.length = 0;

		// Additional cleanup for better isolation
		await this.clearGlobalState();

		// Force garbage collection if available
		if (global.gc) {
			try {
				global.gc();
			} catch {
				// Ignore GC errors
			}
		}
	}

	/**
	 * Clear global state that might interfere with tests
	 */
	private static async clearGlobalState(): Promise<void> {
		// Clear any cached modules or singletons
		try {
			// Force module cache clearing for key modules
			delete require.cache[require.resolve("../../src/services/analysis-engine")];
			delete require.cache[require.resolve("../../src/api/TypeScriptAnalyzer")];
		} catch {
			// Ignore module cache errors
		}

		// Small delay to ensure async cleanup completes
		await new Promise(resolve => setTimeout(resolve, 10));
	}

	/**
	 * Create an isolated engine with automatic cleanup
	 */
	static createEngine(): AnalysisEngine {
		const engine = new AnalysisEngine();
		this.registerEngine(engine);
		return engine;
	}

	/**
	 * Create an isolated analyzer with automatic cleanup
	 */
	static createAnalyzer(config?: any): TypeScriptAnalyzer {
		const analyzer = new TypeScriptAnalyzer(config);
		this.registerAnalyzer(analyzer);
		return analyzer;
	}

	/**
	 * Wait with automatic timer cleanup
	 */
	static wait(ms: number): Promise<void> {
		return new Promise((resolve) => {
			const timer = setTimeout(resolve, ms);
			this.registerTimer(timer);
		});
	}
}

/**
 * Decorator for automatic test cleanup
 */
export function withIsolation() {
	return function (
		target: any,
		propertyName: string,
		descriptor: PropertyDescriptor,
	) {
		const method = descriptor.value;
		descriptor.value = async function (...args: any[]) {
			try {
				return await method.apply(this, args);
			} finally {
				await TestIsolationManager.cleanup();
			}
		};
	};
}

/**
 * Setup function for test suites
 */
export function setupTestIsolation(): void {
	afterEach(async () => {
		await TestIsolationManager.cleanup();
	});

	afterAll(async () => {
		await TestIsolationManager.cleanup();
	});
}
