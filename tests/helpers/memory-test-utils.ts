/**
 * Memory monitoring utilities for test scenarios
 * Provides tools for tracking memory usage during analyzer operations
 */

// Node.js process memory interface

export interface MemorySnapshot {
	rss: number; // Resident Set Size
	heapTotal: number;
	heapUsed: number;
	external: number;
	arrayBuffers: number;
	timestamp: number;
}

export interface MemoryTestResult {
	before: MemorySnapshot;
	after: MemorySnapshot;
	delta: {
		rss: number;
		heapTotal: number;
		heapUsed: number;
		external: number;
		arrayBuffers: number;
	};
	duration: number;
}

export interface MemoryMonitorOptions {
	sampleInterval?: number; // ms, default 100
	maxSamples?: number; // default 1000
	warnThreshold?: number; // bytes, default 50MB
}

export class MemoryMonitor {
	private samples: MemorySnapshot[] = [];
	private options: Required<MemoryMonitorOptions>;
	private intervalId: NodeJS.Timeout | null = null;
	private startTime: number = 0;

	constructor(options: MemoryMonitorOptions = {}) {
		this.options = {
			sampleInterval: options.sampleInterval ?? 100,
			maxSamples: options.maxSamples ?? 1000,
			warnThreshold: options.warnThreshold ?? 50 * 1024 * 1024, // 50MB
		};
	}

	/**
	 * Take a memory snapshot at current point in time
	 */
	public takeSnapshot(): MemorySnapshot {
		const mem = process.memoryUsage();
		return {
			rss: mem.rss,
			heapTotal: mem.heapTotal,
			heapUsed: mem.heapUsed,
			external: mem.external,
			arrayBuffers: mem.arrayBuffers,
			timestamp: Date.now(),
		};
	}

	/**
	 * Start monitoring memory usage with periodic sampling
	 */
	public startMonitoring(): void {
		this.startTime = Date.now();
		this.samples = [];

		this.intervalId = setInterval(() => {
			if (this.samples.length >= this.options.maxSamples) {
				this.stopMonitoring();
				return;
			}

			const snapshot = this.takeSnapshot();
			this.samples.push(snapshot);

			// Check for memory warnings
			if (snapshot.heapUsed > this.options.warnThreshold) {
				console.warn(
					`Memory usage warning: ${Math.round(snapshot.heapUsed / 1024 / 1024)}MB heap used`,
				);
			}
		}, this.options.sampleInterval);
	}

	/**
	 * Stop monitoring and return collected samples
	 */
	public stopMonitoring(): MemorySnapshot[] {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
		return [...this.samples];
	}

	/**
	 * Get memory usage statistics from collected samples
	 */
	public getStats(): {
		peak: MemorySnapshot;
		average: Omit<MemorySnapshot, "timestamp">;
		samples: number;
		duration: number;
	} {
		if (this.samples.length === 0) {
			throw new Error("No samples collected. Start monitoring first.");
		}

		const peak = this.samples.reduce((max, sample) =>
			sample.heapUsed > max.heapUsed ? sample : max,
		);

		const totals = this.samples.reduce(
			(acc, sample) => ({
				rss: acc.rss + sample.rss,
				heapTotal: acc.heapTotal + sample.heapTotal,
				heapUsed: acc.heapUsed + sample.heapUsed,
				external: acc.external + sample.external,
				arrayBuffers: acc.arrayBuffers + sample.arrayBuffers,
			}),
			{ rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 },
		);

		const count = this.samples.length;
		const average = {
			rss: Math.round(totals.rss / count),
			heapTotal: Math.round(totals.heapTotal / count),
			heapUsed: Math.round(totals.heapUsed / count),
			external: Math.round(totals.external / count),
			arrayBuffers: Math.round(totals.arrayBuffers / count),
		};

		return {
			peak,
			average,
			samples: count,
			duration: Date.now() - this.startTime,
		};
	}
}

/**
 * Measure memory usage around a function execution
 * @param fn Function to execute and measure
 * @param label Optional label for the measurement
 * @returns Memory test result with before/after snapshots
 */
export async function measureMemory<T>(
	fn: () => Promise<T>,
	label?: string,
): Promise<{ result: T; memory: MemoryTestResult }> {
	// Force garbage collection if available (--expose-gc flag)
	if (global.gc) {
		global.gc();
	}

	const before = takeMemorySnapshot();
	const startTime = process.hrtime.bigint();

	try {
		const result = await fn();
		const endTime = process.hrtime.bigint();
		const after = takeMemorySnapshot();

		const memory: MemoryTestResult = {
			before,
			after,
			delta: {
				rss: after.rss - before.rss,
				heapTotal: after.heapTotal - before.heapTotal,
				heapUsed: after.heapUsed - before.heapUsed,
				external: after.external - before.external,
				arrayBuffers: after.arrayBuffers - before.arrayBuffers,
			},
			duration: Number(endTime - startTime) / 1000000, // Convert to ms
		};

		if (label) {
			console.log(`Memory measurement [${label}]:`);
			console.log(`  Heap delta: ${formatBytes(memory.delta.heapUsed)}`);
			console.log(`  RSS delta: ${formatBytes(memory.delta.rss)}`);
			console.log(`  Duration: ${memory.duration.toFixed(2)}ms`);
		}

		return { result, memory };
	} catch (error) {
		const endTime = process.hrtime.bigint();
		const after = takeMemorySnapshot();

		const memory: MemoryTestResult = {
			before,
			after,
			delta: {
				rss: after.rss - before.rss,
				heapTotal: after.heapTotal - before.heapTotal,
				heapUsed: after.heapUsed - before.heapUsed,
				external: after.external - before.external,
				arrayBuffers: after.arrayBuffers - before.arrayBuffers,
			},
			duration: Number(endTime - startTime) / 1000000,
		};

		if (label) {
			console.log(`Memory measurement [${label}] - ERROR occurred:`);
			console.log(`  Heap delta: ${formatBytes(memory.delta.heapUsed)}`);
			console.log(`  Duration: ${memory.duration.toFixed(2)}ms`);
		}

		throw error;
	}
}

/**
 * Take a simple memory snapshot
 */
export function takeMemorySnapshot(): MemorySnapshot {
	const mem = process.memoryUsage();
	return {
		rss: mem.rss,
		heapTotal: mem.heapTotal,
		heapUsed: mem.heapUsed,
		external: mem.external,
		arrayBuffers: mem.arrayBuffers,
		timestamp: Date.now(),
	};
}

/**
 * Format bytes into human-readable string
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";

	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));

	const value = bytes / Math.pow(k, i);
	const sign = bytes < 0 ? "-" : "";

	return `${sign}${value.toFixed(2)} ${sizes[i]}`;
}

/**
 * Assert that memory usage is within expected bounds
 */
export function expectMemoryUsage(
	memory: MemoryTestResult,
	options: {
		maxHeapDelta?: number;
		maxRssDelta?: number;
		maxDuration?: number;
	} = {},
) {
	const {
		maxHeapDelta = 100 * 1024 * 1024, // 100MB default
		maxRssDelta = 200 * 1024 * 1024, // 200MB default
		maxDuration = 30000, // 30s default
	} = options;

	if (memory.delta.heapUsed > maxHeapDelta) {
		throw new Error(
			`Heap usage exceeded limit: ${formatBytes(memory.delta.heapUsed)} > ${formatBytes(maxHeapDelta)}`,
		);
	}

	if (memory.delta.rss > maxRssDelta) {
		throw new Error(
			`RSS usage exceeded limit: ${formatBytes(memory.delta.rss)} > ${formatBytes(maxRssDelta)}`,
		);
	}

	if (memory.duration > maxDuration) {
		throw new Error(
			`Duration exceeded limit: ${memory.duration.toFixed(2)}ms > ${maxDuration}ms`,
		);
	}
}

/**
 * Jest custom matcher for memory assertions
 */
declare global {
	namespace jest {
		interface Matchers<R> {
			toHaveMemoryUsageWithin(bounds: {
				maxHeapDelta?: number;
				maxRssDelta?: number;
				maxDuration?: number;
			}): R;
		}
	}
}

// Add custom matcher if Jest is available
if (typeof expect !== "undefined") {
	expect.extend({
		toHaveMemoryUsageWithin(
			memory: MemoryTestResult,
			bounds: {
				maxHeapDelta?: number;
				maxRssDelta?: number;
				maxDuration?: number;
			},
		) {
			try {
				expectMemoryUsage(memory, bounds);
				return {
					message: () => "Memory usage is within expected bounds",
					pass: true,
				};
			} catch (error) {
				return {
					message: () => (error as Error).message,
					pass: false,
				};
			}
		},
	});
}
