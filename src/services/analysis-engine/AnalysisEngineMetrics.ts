import type { AnalysisResult } from '../../models/AnalysisResult';
import type { EnginePerformanceMetrics } from '../IAnalysisEngine';
import { SyntaxNode } from 'tree-sitter';

/**
 * Performance metrics and monitoring module for AnalysisEngine
 * Handles all performance tracking, metrics calculation, and monitoring operations
 */
export class AnalysisEngineMetrics {
	private performanceMetrics: EnginePerformanceMetrics;
	private startTime: number;

	constructor() {
		this.startTime = Date.now();
		this.performanceMetrics = {
			totalAnalyses: 0,
			successfulAnalyses: 0,
			failedAnalyses: 0,
			averageAnalysisTime: 0,
			peakMemoryUsage: 0,
			currentMemoryUsage: 0,
			cacheHitRate: 0,
			timeSavedByCache: 0,
			filesProcessed: 0,
			totalDataProcessed: 0,
			uptime: 0,
			languageMetrics: new Map(),
			extractorMetrics: new Map(),
			interpreterMetrics: new Map(),
		};
	}

	/**
	 * Gets current performance metrics
	 * @returns Current engine performance metrics
	 * @example
	 * ```typescript
	 * const metrics = metricsManager.getPerformanceMetrics();
	 * console.log(`Success rate: ${metrics.successfulAnalyses / metrics.totalAnalyses * 100}%`);
	 * ```
	 */
	getPerformanceMetrics(): EnginePerformanceMetrics {
		this.performanceMetrics.uptime = Date.now() - this.startTime;
		this.performanceMetrics.currentMemoryUsage = process.memoryUsage().heapUsed;

		return { ...this.performanceMetrics };
	}

	/**
	 * Resets all performance metrics to initial state
	 * @example
	 * ```typescript
	 * // Reset metrics for benchmarking
	 * metricsManager.resetPerformanceMetrics();
	 *
	 * // Run analysis operations...
	 *
	 * const benchmarkMetrics = metricsManager.getPerformanceMetrics();
	 * ```
	 */
	resetPerformanceMetrics(): void {
		this.startTime = Date.now();
		this.performanceMetrics = {
			totalAnalyses: 0,
			successfulAnalyses: 0,
			failedAnalyses: 0,
			averageAnalysisTime: 0,
			peakMemoryUsage: 0,
			currentMemoryUsage: 0,
			cacheHitRate: 0,
			timeSavedByCache: 0,
			filesProcessed: 0,
			totalDataProcessed: 0,
			uptime: 0,
			languageMetrics: new Map(),
			extractorMetrics: new Map(),
			interpreterMetrics: new Map(),
		};
	}

	/**
	 * Updates analysis metrics after completing an analysis
	 * @param result - Analysis result
	 * @param totalTime - Total analysis time in milliseconds
	 */
	updateAnalysisMetrics(result: AnalysisResult, totalTime: number): void {
		this.performanceMetrics.totalAnalyses++;

		// Update average analysis time
		const currentAvg = this.performanceMetrics.averageAnalysisTime;
		const totalAnalyses = this.performanceMetrics.totalAnalyses;
		this.performanceMetrics.averageAnalysisTime =
			(currentAvg * (totalAnalyses - 1) + totalTime) / totalAnalyses;

		if (result.errors.length === 0) {
			this.performanceMetrics.successfulAnalyses++;
		} else {
			this.performanceMetrics.failedAnalyses++;
		}

		// Update language-specific metrics
		this.updateLanguageMetrics(result.language, totalTime);

		// Update extractor metrics
		if (result.metadata.extractorsUsed) {
			for (const extractorName of result.metadata.extractorsUsed) {
				this.updateExtractorMetrics(extractorName, totalTime);
			}
		}

		// Update interpreter metrics
		if (result.metadata.interpretersUsed) {
			for (const interpreterName of result.metadata.interpretersUsed) {
				this.updateInterpreterMetrics(interpreterName, totalTime);
			}
		}
	}

	/**
	 * Updates language-specific performance metrics
	 * @param language - Programming language
	 * @param analysisTime - Time taken for analysis in milliseconds
	 */
	updateLanguageMetrics(language: string, analysisTime: number): void {
		const existing = this.performanceMetrics.languageMetrics.get(language);

		if (existing) {
			existing.filesAnalyzed++;
			existing.averageTime =
				(existing.averageTime * (existing.filesAnalyzed - 1) + analysisTime) /
				existing.filesAnalyzed;
		} else {
			this.performanceMetrics.languageMetrics.set(language, {
				language,
				filesAnalyzed: 1,
				averageTime: analysisTime,
				successRate: 1.0,
				averageFileSize: 0,
			});
		}
	}

	/**
	 * Updates extractor-specific performance metrics
	 * @param extractorName - Name of the extractor
	 * @param totalTime - Total analysis time (will be distributed)
	 */
	updateExtractorMetrics(extractorName: string, totalTime: number): void {
		const existing = this.performanceMetrics.extractorMetrics.get(extractorName);

		if (existing) {
			existing.executions++;
			existing.averageTime =
				(existing.averageTime * (existing.executions - 1) + totalTime) /
				existing.executions;
		} else {
			this.performanceMetrics.extractorMetrics.set(extractorName, {
				name: extractorName,
				executions: 1,
				averageTime: totalTime,
				successRate: 1.0,
				averageDataSize: 0,
			});
		}
	}

	/**
	 * Updates interpreter-specific performance metrics
	 * @param interpreterName - Name of the interpreter
	 * @param totalTime - Total analysis time (will be distributed)
	 */
	updateInterpreterMetrics(interpreterName: string, totalTime: number): void {
		const existing = this.performanceMetrics.interpreterMetrics.get(interpreterName);

		if (existing) {
			existing.executions++;
			existing.averageTime =
				(existing.averageTime * (existing.executions - 1) + totalTime) /
				existing.executions;
		} else {
			this.performanceMetrics.interpreterMetrics.set(interpreterName, {
				name: interpreterName,
				executions: 1,
				averageTime: totalTime,
				successRate: 1.0,
				averageInputSize: 0,
				averageOutputSize: 0,
			});
		}
	}

	/**
	 * Counts the number of AST nodes for performance tracking
	 * @param node - Root AST node
	 * @returns Total number of nodes in the AST
	 */
	countASTNodes(node: SyntaxNode): number {
		let count = 1; // Count current node

		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (child) {
				count += this.countASTNodes(child);
			}
		}

		return count;
	}

	/**
	 * Calculates extraction confidence based on extracted data and AST
	 * @param extractedData - Data extracted by an extractor
	 * @param ast - AST that was analyzed
	 * @returns Confidence score between 0 and 1
	 */
	calculateExtractionConfidence(extractedData: any, ast: SyntaxNode): number {
		if (!extractedData || typeof extractedData !== 'object') {
			return 0;
		}

		// Simple heuristic: ratio of extracted items to AST complexity
		const extractedItemCount = Object.keys(extractedData).length;
		const astNodeCount = this.countASTNodes(ast);

		if (astNodeCount === 0) return 0;

		// Normalize to 0-1 range with diminishing returns
		const ratio = extractedItemCount / Math.sqrt(astNodeCount);
		return Math.min(ratio, 1.0);
	}

	/**
	 * Updates memory usage metrics
	 * @param currentMemory - Current memory usage in bytes
	 */
	updateMemoryMetrics(currentMemory: number): void {
		this.performanceMetrics.currentMemoryUsage = currentMemory;

		if (currentMemory > this.performanceMetrics.peakMemoryUsage) {
			this.performanceMetrics.peakMemoryUsage = currentMemory;
		}
	}
}