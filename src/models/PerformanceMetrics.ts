/**
 * Performance metrics for analysis operations
 * Tracks timing, memory usage, and resource utilization
 */

export interface PerformanceMetrics {
	/** Time spent parsing AST in milliseconds */
	parseTime: number;

	/** Time spent extracting data in milliseconds */
	extractionTime: number;

	/** Time spent interpreting data in milliseconds */
	interpretationTime: number;

	/** Total analysis time in milliseconds */
	totalTime: number;

	/** Peak memory usage during analysis in bytes */
	memoryUsage: number;

	/** Detailed breakdown by component */
	breakdown?: PerformanceBreakdown;

	/** Resource utilization metrics */
	resources?: ResourceMetrics;

	/** Cache performance metrics */
	cache?: CachePerformanceMetrics;
}

export interface PerformanceBreakdown {
	/** Parser-specific metrics */
	parser: ParserMetrics;

	/** Extractor-specific metrics */
	extractors: Map<string, ExtractorMetrics>;

	/** Interpreter-specific metrics */
	interpreters: Map<string, InterpreterMetrics>;

	/** I/O operation metrics */
	io: IOMetrics;

	/** Cache operation metrics */
	cache: CacheOperationMetrics;
}

export interface ParserMetrics {
	/** Language detection time */
	languageDetectionTime: number;

	/** Grammar loading time */
	grammarLoadTime: number;

	/** Actual parsing time */
	parseTime: number;

	/** AST validation time */
	validationTime: number;

	/** Number of AST nodes created */
	nodeCount: number;

	/** Maximum nesting depth */
	maxDepth: number;

	/** Memory used for AST */
	astMemoryUsage: number;
}

export interface ExtractorMetrics {
	/** Extractor name */
	name: string;

	/** Version of the extractor */
	version: string;

	/** Time spent in extraction */
	extractionTime: number;

	/** Memory used during extraction */
	memoryUsage: number;

	/** Number of items extracted */
	itemsExtracted: number;

	/** Confidence score of extraction */
	confidence: number;

	/** Whether extraction completed successfully */
	success: boolean;

	/** Error details if extraction failed */
	error?: string;
}

export interface InterpreterMetrics {
	/** Interpreter name */
	name: string;

	/** Version of the interpreter */
	version: string;

	/** Time spent in interpretation */
	interpretationTime: number;

	/** Memory used during interpretation */
	memoryUsage: number;

	/** Size of input data processed */
	inputDataSize: number;

	/** Size of output data generated */
	outputDataSize: number;

	/** Processing rate (items per second) */
	processingRate: number;

	/** Whether interpretation completed successfully */
	success: boolean;

	/** Error details if interpretation failed */
	error?: string;
}

export interface IOMetrics {
	/** File read time */
	fileReadTime: number;

	/** File size in bytes */
	fileSize: number;

	/** Disk read operations */
	diskReads: number;

	/** Cache read operations */
	cacheReads: number;

	/** Network operations (if any) */
	networkRequests: number;
}

export interface CacheOperationMetrics {
	/** Cache lookup time */
	lookupTime: number;

	/** Cache write time */
	writeTime: number;

	/** Number of cache hits */
	hits: number;

	/** Number of cache misses */
	misses: number;

	/** Cache hit rate */
	hitRate: number;

	/** Memory saved through caching */
	memorySaved: number;

	/** Time saved through caching */
	timeSaved: number;
}

export interface ResourceMetrics {
	/** CPU utilization percentage */
	cpuUsage: number;

	/** Memory utilization percentage */
	memoryUsage: number;

	/** File handles used */
	fileHandles: number;

	/** Thread count */
	threadCount: number;

	/** Garbage collection metrics */
	gc?: GCMetrics;
}

export interface GCMetrics {
	/** Number of GC cycles during analysis */
	collections: number;

	/** Total time spent in GC */
	gcTime: number;

	/** Memory reclaimed by GC */
	memoryReclaimed: number;
}

export interface CachePerformanceMetrics {
	/** Overall cache hit rate */
	hitRate: number;

	/** Time saved through AST caching */
	astTimeSaved: number;

	/** Time saved through result caching */
	resultTimeSaved: number;

	/** Memory efficiency of cache */
	memoryEfficiency: number;
}

/**
 * Performance monitoring and measurement utilities
 */
export class PerformanceMonitor {
	private startTime: number = 0;
	private metrics: Partial<PerformanceMetrics> = {};
	private breakdownMetrics: Partial<PerformanceBreakdown> = {};
	private memorySnapshots: MemorySnapshot[] = [];
	private peakMemoryUsage: number = 0;
	private initialMemory: NodeJS.MemoryUsage = process.memoryUsage();
	private cpuUsageStart: NodeJS.CpuUsage = process.cpuUsage();
	private gcEvents: GCEvent[] = [];
	private fileHandleCount: number = 0;

	/**
	 * Starts performance monitoring
	 */
	start(): void {
		this.startTime = this.now();
		this.initialMemory = process.memoryUsage();
		this.cpuUsageStart = process.cpuUsage();
		this.peakMemoryUsage = this.initialMemory.heapUsed;
		this.memorySnapshots = [];
		this.gcEvents = [];
		this.fileHandleCount = this.getOpenFileHandleCount();

		// Setup GC monitoring if available
		this.setupGCMonitoring();

		// Take initial memory snapshot
		this.takeMemorySnapshot("start");

		this.metrics = {
			parseTime: 0,
			extractionTime: 0,
			interpretationTime: 0,
			totalTime: 0,
			memoryUsage: 0,
		};
		this.breakdownMetrics = {
			extractors: new Map(),
			interpreters: new Map(),
		};
	}

	/**
	 * Records parsing performance
	 */
	recordParsing(
		parseTime: number,
		nodeCount: number,
		memoryUsage: number,
	): void {
		this.metrics.parseTime = parseTime;
		this.updateMemoryTracking(memoryUsage);

		// Take memory snapshot after parsing
		this.takeMemorySnapshot("parse");

		this.breakdownMetrics.parser = {
			languageDetectionTime: 0,
			grammarLoadTime: 0,
			parseTime,
			validationTime: 0,
			nodeCount,
			maxDepth: 0,
			astMemoryUsage: memoryUsage,
		};
	}

	/**
	 * Records extractor performance
	 */
	recordExtractor(
		name: string,
		version: string,
		extractionTime: number,
		memoryUsage: number,
		itemsExtracted: number,
		confidence: number,
		success: boolean,
		error?: string,
	): void {
		this.metrics.extractionTime =
			(this.metrics.extractionTime || 0) + extractionTime;
		this.updateMemoryTracking(memoryUsage);

		if (!this.breakdownMetrics.extractors) {
			this.breakdownMetrics.extractors = new Map();
		}

		this.breakdownMetrics.extractors.set(name, {
			name,
			version,
			extractionTime,
			memoryUsage,
			itemsExtracted,
			confidence,
			success,
			error,
		});

		// Take memory snapshot if this is the last extractor or first major one
		if (this.breakdownMetrics.extractors.size === 1) {
			this.takeMemorySnapshot("extract");
		}
	}

	/**
	 * Records interpreter performance
	 */
	recordInterpreter(
		name: string,
		version: string,
		interpretationTime: number,
		memoryUsage: number,
		inputDataSize: number,
		outputDataSize: number,
		success: boolean,
		error?: string,
	): void {
		this.metrics.interpretationTime =
			(this.metrics.interpretationTime || 0) + interpretationTime;
		this.updateMemoryTracking(memoryUsage);

		if (!this.breakdownMetrics.interpreters) {
			this.breakdownMetrics.interpreters = new Map();
		}

		const processingRate =
			interpretationTime > 0 ? (inputDataSize / interpretationTime) * 1000 : 0;

		this.breakdownMetrics.interpreters.set(name, {
			name,
			version,
			interpretationTime,
			memoryUsage,
			inputDataSize,
			outputDataSize,
			processingRate,
			success,
			error,
		});

		// Take memory snapshot if this is the last interpreter or first major one
		if (this.breakdownMetrics.interpreters.size === 1) {
			this.takeMemorySnapshot("interpret");
		}
	}

	/**
	 * Records cache performance
	 */
	recordCache(
		hits: number,
		misses: number,
		timeSaved: number,
		memorySaved: number,
	): void {
		const hitRate = hits + misses > 0 ? hits / (hits + misses) : 0;

		this.metrics.cache = {
			hitRate,
			astTimeSaved: timeSaved * 0.7, // Estimate
			resultTimeSaved: timeSaved * 0.3, // Estimate
			memoryEfficiency: memorySaved / (this.metrics.memoryUsage || 1),
		};
	}

	/**
	 * Finishes monitoring and returns final metrics
	 */
	finish(): PerformanceMetrics {
		this.metrics.totalTime = this.now() - this.startTime;

		// Take final memory snapshot
		this.takeMemorySnapshot("finish");

		// Calculate memory efficiency and trend
		const _memoryMetrics = this.calculateMemoryMetrics();

		return {
			parseTime: this.metrics.parseTime || 0,
			extractionTime: this.metrics.extractionTime || 0,
			interpretationTime: this.metrics.interpretationTime || 0,
			totalTime: this.metrics.totalTime || 0,
			memoryUsage: this.peakMemoryUsage,
			breakdown: this.breakdownMetrics as PerformanceBreakdown,
			cache: this.metrics.cache,
			resources: {
				cpuUsage: this.calculateCPUUsage(),
				memoryUsage: (this.peakMemoryUsage / (1024 * 1024 * 100)) * 100, // Percentage of 100MB
				fileHandles: this.getOpenFileHandleCount() - this.fileHandleCount, // Delta
				threadCount: 1, // Single-threaded for now
				gc: this.calculateGCMetrics(),
			},
		};
	}

	/**
	 * Takes a memory snapshot at a specific phase
	 */
	private takeMemorySnapshot(
		phase: "start" | "parse" | "extract" | "interpret" | "finish",
	): MemorySnapshot {
		const memory = process.memoryUsage();
		const snapshot: MemorySnapshot = {
			timestamp: this.now(),
			phase,
			heapUsed: memory.heapUsed,
			heapTotal: memory.heapTotal,
			external: memory.external,
			arrayBuffers: memory.arrayBuffers,
			rss: memory.rss,
		};

		this.memorySnapshots.push(snapshot);
		return snapshot;
	}

	/**
	 * Updates memory tracking with current usage
	 */
	private updateMemoryTracking(currentMemory: number): void {
		this.peakMemoryUsage = Math.max(this.peakMemoryUsage, currentMemory);
		this.metrics.memoryUsage = this.peakMemoryUsage;
	}

	/**
	 * Calculates detailed memory metrics from snapshots
	 */
	private calculateMemoryMetrics(): DetailedMemoryMetrics {
		const finalMemory = process.memoryUsage();
		const trend = this.calculateMemoryTrend();

		return {
			initial: this.initialMemory,
			peak: {
				...this.initialMemory,
				heapUsed: this.peakMemoryUsage,
			},
			final: finalMemory,
			snapshots: this.memorySnapshots,
			trend,
			efficiency: this.calculateMemoryEfficiency(),
			garbageCollections: [], // TODO: Add GC event tracking
		};
	}

	/**
	 * Calculates memory usage trend
	 */
	private calculateMemoryTrend(): MemoryTrend {
		if (this.memorySnapshots.length < 2) {
			return {
				direction: "stable",
				rate: 0,
				volatility: 0,
			};
		}

		const first = this.memorySnapshots[0];
		const last = this.memorySnapshots[this.memorySnapshots.length - 1];
		const timeDiff = (last.timestamp - first.timestamp) / 1000; // seconds
		const memoryDiff = last.heapUsed - first.heapUsed;

		const rate = timeDiff > 0 ? memoryDiff / timeDiff : 0;

		// Calculate volatility (variance in memory usage)
		const memoryValues = this.memorySnapshots.map((s) => s.heapUsed);
		const mean = memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length;
		const variance =
			memoryValues.reduce((acc, val) => acc + (val - mean) ** 2, 0) /
			memoryValues.length;
		const volatility = Math.sqrt(variance);

		let direction: "increasing" | "decreasing" | "stable" = "stable";
		if (Math.abs(rate) > 1000) {
			// 1KB/s threshold
			direction = rate > 0 ? "increasing" : "decreasing";
		}

		return {
			direction,
			rate: Math.abs(rate),
			volatility,
		};
	}

	/**
	 * Calculates memory efficiency (work done per MB used)
	 */
	private calculateMemoryEfficiency(): number {
		const memoryMB = this.peakMemoryUsage / (1024 * 1024);
		const timeSeconds = (this.metrics.totalTime || 1) / 1000;

		// Efficiency = 1 / (memory_usage_MB * time_seconds)
		// Higher values indicate better efficiency
		return 1000 / (memoryMB * timeSeconds);
	}

	/**
	 * Calculates garbage collection metrics
	 */
	private calculateGCMetrics(): GCMetrics {
		return {
			collections: this.gcEvents.length,
			gcTime: this.gcEvents.reduce((total, event) => total + event.duration, 0),
			memoryReclaimed: this.gcEvents.reduce(
				(total, event) => total + event.memoryReclaimed,
				0,
			),
		};
	}

	/**
	 * Calculates CPU usage percentage
	 */
	private calculateCPUUsage(): number {
		try {
			const cpuUsageEnd = process.cpuUsage(this.cpuUsageStart);
			const totalTime = (this.now() - this.startTime) * 1000; // Convert to microseconds
			const cpuTime = cpuUsageEnd.user + cpuUsageEnd.system;

			return totalTime > 0 ? (cpuTime / totalTime) * 100 : 0;
		} catch (_error) {
			return 0;
		}
	}

	/**
	 * Gets current number of open file handles
	 */
	private getOpenFileHandleCount(): number {
		try {
			// On Unix systems, count file descriptors
			if (process.platform !== "win32") {
				const fs = require("node:fs");
				try {
					const fdDir = "/proc/self/fd";
					return fs.readdirSync(fdDir).length;
				} catch {
					// Fallback: estimate based on known operations
					return 10; // Base file handles
				}
			} else {
				// Windows: estimate based on operations
				return 10; // Base file handles
			}
		} catch (_error) {
			return 0;
		}
	}

	/**
	 * Sets up garbage collection monitoring
	 */
	private setupGCMonitoring(): void {
		try {
			// Try to use performance hooks for GC monitoring
			const perf = require("node:perf_hooks");
			const obs = new perf.PerformanceObserver((list: any) => {
				for (const entry of list.getEntries()) {
					if (entry.entryType === "gc") {
						const memoryBefore =
							this.memorySnapshots.length > 0
								? this.memorySnapshots[this.memorySnapshots.length - 1].heapUsed
								: this.initialMemory.heapUsed;
						const memoryAfter = process.memoryUsage().heapUsed;

						this.gcEvents.push({
							timestamp: entry.startTime + this.startTime,
							type: this.getGCType(entry.detail?.kind || 0),
							duration: entry.duration,
							memoryBefore,
							memoryAfter,
							memoryReclaimed: Math.max(0, memoryBefore - memoryAfter),
						});
					}
				}
			});

			obs.observe({ entryTypes: ["gc"] });
		} catch (error) {
			// GC monitoring not available, continue without it
			console.warn(
				"GC monitoring not available:",
				error instanceof Error ? error.message : String(error),
			);
		}
	}

	/**
	 * Maps GC kind number to readable type
	 */
	private getGCType(kind: number): string {
		const gcTypes = {
			1: "minor",
			2: "major",
			4: "incremental",
			8: "weakCallback",
			15: "all",
		};
		return gcTypes[kind as keyof typeof gcTypes] || "unknown";
	}

	/**
	 * Gets current timestamp in milliseconds
	 */
	private now(): number {
		return Date.now();
	}
}

/**
 * Performance analysis and reporting utilities
 */
/**
 * Analyzes performance metrics and identifies bottlenecks
 */
export function analyzePerformance(
	metrics: PerformanceMetrics,
): PerformanceAnalysis {
	const bottlenecks: string[] = [];
	const recommendations: string[] = [];

	// Analyze parse time
	const parseRatio = metrics.parseTime / metrics.totalTime;
	if (parseRatio > 0.5) {
		bottlenecks.push("parsing");
		recommendations.push("Consider caching AST or using incremental parsing");
	}

	// Analyze extraction time
	const extractionRatio = metrics.extractionTime / metrics.totalTime;
	if (extractionRatio > 0.3) {
		bottlenecks.push("extraction");
		recommendations.push("Optimize extractors or run them in parallel");
	}

	// Analyze interpretation time
	const interpretationRatio = metrics.interpretationTime / metrics.totalTime;
	if (interpretationRatio > 0.3) {
		bottlenecks.push("interpretation");
		recommendations.push(
			"Optimize interpreters or improve data processing algorithms",
		);
	}

	// Analyze memory usage
	const memoryMB = metrics.memoryUsage / (1024 * 1024);
	if (memoryMB > 100) {
		bottlenecks.push("memory");
		recommendations.push(
			"Implement memory optimization or streaming processing",
		);
	}

	// Analyze cache performance
	if (metrics.cache && metrics.cache.hitRate < 0.5) {
		bottlenecks.push("cache");
		recommendations.push("Improve cache strategy or increase cache size");
	}

	return {
		overall: calculateOverallScore(metrics),
		bottlenecks,
		recommendations,
		efficiency: calculateEfficiency(metrics),
		scalability: estimateScalability(metrics),
	};
}

/**
 * Compares two performance metrics
 */
export function comparePerformanceMetrics(
	baseline: PerformanceMetrics,
	current: PerformanceMetrics,
): PerformanceComparison {
	return {
		totalTimeChange:
			((current.totalTime - baseline.totalTime) / baseline.totalTime) * 100,
		parseTimeChange:
			((current.parseTime - baseline.parseTime) / baseline.parseTime) * 100,
		extractionTimeChange:
			((current.extractionTime - baseline.extractionTime) /
				baseline.extractionTime) *
			100,
		interpretationTimeChange:
			((current.interpretationTime - baseline.interpretationTime) /
				baseline.interpretationTime) *
			100,
		memoryUsageChange:
			((current.memoryUsage - baseline.memoryUsage) / baseline.memoryUsage) *
			100,
		summary: generateComparisonSummary(baseline, current),
	};
}

/**
 * Formats performance metrics for display
 */
export function formatPerformanceMetrics(
	metrics: PerformanceMetrics,
	format: "summary" | "detailed" = "summary",
): string {
	if (format === "summary") {
		return `Performance Summary:
Total Time: ${metrics.totalTime}ms
Parse: ${metrics.parseTime}ms (${((metrics.parseTime / metrics.totalTime) * 100).toFixed(1)}%)
Extraction: ${metrics.extractionTime}ms (${((metrics.extractionTime / metrics.totalTime) * 100).toFixed(1)}%)
Interpretation: ${metrics.interpretationTime}ms (${((metrics.interpretationTime / metrics.totalTime) * 100).toFixed(1)}%)
Memory: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB
Cache Hit Rate: ${metrics.cache ? (metrics.cache.hitRate * 100).toFixed(1) : "N/A"}%`;
	}

	// Detailed format would include breakdown information
	return JSON.stringify(metrics, null, 2);
}

function calculateOverallScore(metrics: PerformanceMetrics): number {
	// Score based on typical performance expectations
	const timeScore = Math.max(0, 100 - (metrics.totalTime / 1000) * 10); // Penalty for >10s
	const memoryScore = Math.max(
		0,
		100 - (metrics.memoryUsage / (100 * 1024 * 1024)) * 20,
	); // Penalty for >100MB
	const cacheScore = metrics.cache ? metrics.cache.hitRate * 100 : 50; // Default 50 if no cache

	return (timeScore + memoryScore + cacheScore) / 3;
}

function calculateEfficiency(metrics: PerformanceMetrics): number {
	const totalTime = metrics.totalTime || 1;
	const memoryMB = metrics.memoryUsage / (1024 * 1024);

	// Efficiency = work done / (time * memory)
	// Simplified calculation based on successful completion
	return 1000 / (totalTime * Math.max(1, memoryMB));
}

function estimateScalability(
	metrics: PerformanceMetrics,
): "excellent" | "good" | "fair" | "poor" {
	const memoryMB = metrics.memoryUsage / (1024 * 1024);
	const timePerMB = metrics.totalTime / Math.max(1, memoryMB);

	if (timePerMB < 100 && memoryMB < 50) return "excellent";
	if (timePerMB < 500 && memoryMB < 100) return "good";
	if (timePerMB < 1000 && memoryMB < 200) return "fair";
	return "poor";
}

function generateComparisonSummary(
	baseline: PerformanceMetrics,
	current: PerformanceMetrics,
): string {
	const timeChange =
		((current.totalTime - baseline.totalTime) / baseline.totalTime) * 100;
	const memoryChange =
		((current.memoryUsage - baseline.memoryUsage) / baseline.memoryUsage) * 100;

	const timeDirection = timeChange > 0 ? "slower" : "faster";
	const memoryDirection = memoryChange > 0 ? "more" : "less";

	return `Performance is ${Math.abs(timeChange).toFixed(1)}% ${timeDirection} and uses ${Math.abs(memoryChange).toFixed(1)}% ${memoryDirection} memory compared to baseline.`;
}

// Legacy class export removed - use individual functions instead

export interface PerformanceAnalysis {
	overall: number;
	bottlenecks: string[];
	recommendations: string[];
	efficiency: number;
	scalability: "excellent" | "good" | "fair" | "poor";
}

export interface PerformanceComparison {
	totalTimeChange: number;
	parseTimeChange: number;
	extractionTimeChange: number;
	interpretationTimeChange: number;
	memoryUsageChange: number;
	summary: string;
}

export interface MemorySnapshot {
	timestamp: number;
	phase: "start" | "parse" | "extract" | "interpret" | "finish";
	heapUsed: number;
	heapTotal: number;
	external: number;
	arrayBuffers: number;
	rss: number; // Resident Set Size
}

export interface MemoryTracker {
	takeSnapshot(phase: string): MemorySnapshot;
	getMemoryTrend(): MemoryTrend;
	detectMemoryLeaks(): MemoryLeakInfo[];
	getMemoryEfficiency(): number;
}

export interface MemoryTrend {
	direction: "increasing" | "decreasing" | "stable";
	rate: number; // bytes per second
	volatility: number; // variance in memory usage
}

export interface MemoryLeakInfo {
	suspectedPhase: string;
	leakRate: number; // bytes per operation
	confidence: number; // 0-1 scale
	recommendation: string;
}

export interface DetailedMemoryMetrics {
	initial: NodeJS.MemoryUsage;
	peak: NodeJS.MemoryUsage;
	final: NodeJS.MemoryUsage;
	snapshots: MemorySnapshot[];
	trend: MemoryTrend;
	efficiency: number;
	garbageCollections?: GCEvent[];
}

export interface GCEvent {
	timestamp: number;
	type: string;
	duration: number;
	memoryBefore: number;
	memoryAfter: number;
	memoryReclaimed: number;
}
