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

		// Shutdown engines
		for (const engine of this.engines) {
			try {
				await engine.shutdown();
			} catch (error) {
				// Ignore shutdown errors
			}
		}
		this.engines.length = 0;

		// Clear analyzer caches
		for (const analyzer of this.analyzers) {
			try {
				analyzer.clearCache();
			} catch (error) {
				// Ignore cache clear errors
			}
		}
		this.analyzers.length = 0;

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
