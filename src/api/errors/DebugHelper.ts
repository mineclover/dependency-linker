/**
 * Debug Helper Utilities
 * Comprehensive debugging and diagnostic tools
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import {
	getDependencies,
	getError,
	getExports,
	getImports,
	isSuccessful,
} from "../../lib/AnalysisResultHelper";
import type { AnalysisResult } from "../../models/AnalysisResult";
import type { DependencyInfo } from "../../models/DependencyInfo";
import { logger } from "../../utils/logger";
import { errorReporter } from "./ErrorReporter";

export interface DebugContext {
	filePath: string;
	fileSize: number;
	fileStats: {
		created: Date;
		modified: Date;
		accessed: Date;
	};
	encoding: string;
	lineCount: number;
	characterCount: number;
	hasUnicodeChars: boolean;
	parseAttempts: number;
	lastParseTime?: number;
	memoryUsage: NodeJS.MemoryUsage;
}

export interface DebugTrace {
	timestamp: number;
	operation: string;
	phase: string;
	duration?: number;
	memory?: NodeJS.MemoryUsage;
	data?: any;
	error?: Error;
}

export interface PerformanceMetrics {
	totalTime: number;
	parseTime: number;
	analysisTime: number;
	memoryPeak: number;
	memoryDelta: number;
	gcCount: number;
	operationsPerSecond: number;
}

// biome-ignore lint/complexity/noStaticOnlyClass: Maintains internal state and trace history
export class DebugHelper {
	private static traces: DebugTrace[] = [];
	private static maxTraces = 1000;
	private static performanceMarks: Map<string, number> = new Map();
	private static debugMode = false;

	/**
	 * Enable or disable debug mode
	 */
	public static setDebugMode(enabled: boolean): void {
		DebugHelper.debugMode = enabled;
		logger.info(`Debug mode ${enabled ? "enabled" : "disabled"}`);
	}

	/**
	 * Check if debug mode is enabled
	 */
	public static isDebugEnabled(): boolean {
		return DebugHelper.debugMode;
	}

	/**
	 * Gather comprehensive file context for debugging
	 */
	public static gatherFileContext(filePath: string): DebugContext {
		const startMemory = process.memoryUsage();

		try {
			if (!existsSync(filePath)) {
				throw new Error(`File does not exist: ${filePath}`);
			}

			const absolutePath = resolve(filePath);
			const stats = statSync(absolutePath);
			const content = readFileSync(absolutePath, "utf8");

			const context: DebugContext = {
				filePath: absolutePath,
				fileSize: stats.size,
				fileStats: {
					created: stats.birthtime,
					modified: stats.mtime,
					accessed: stats.atime,
				},
				encoding: "utf8", // Assuming UTF-8 for TypeScript files
				lineCount: content.split("\n").length,
				characterCount: content.length,
				hasUnicodeChars: /[\u0080-\uFFFF]/.test(content),
				parseAttempts: 0,
				memoryUsage: startMemory,
			};

			if (DebugHelper.debugMode) {
				logger.debug("File context gathered", {
					path: context.filePath,
					size: `${Math.round(context.fileSize / 1024)}KB`,
					lines: context.lineCount,
					hasUnicode: context.hasUnicodeChars,
				});
			}

			return context;
		} catch (error) {
			const errorId = errorReporter.reportError(error as Error, {
				filePath,
				operation: "gatherFileContext",
			});

			throw new Error(
				`Failed to gather file context: ${(error as Error).message} (Error ID: ${errorId})`,
			);
		}
	}

	/**
	 * Create a detailed analysis of parsing failures
	 */
	public static analyzeParseFailure(
		filePath: string,
		error: Error,
	): {
		context: DebugContext;
		suggestions: string[];
		possibleCauses: string[];
		diagnosticInfo: Record<string, any>;
	} {
		const context = DebugHelper.gatherFileContext(filePath);
		const suggestions: string[] = [];
		const possibleCauses: string[] = [];
		const diagnosticInfo: Record<string, any> = {};

		// Analyze file characteristics
		if (context.fileSize === 0) {
			possibleCauses.push("File is empty");
			suggestions.push("Verify file contains valid TypeScript code");
		}

		if (context.fileSize > 1024 * 1024) {
			// > 1MB
			possibleCauses.push("File is very large (>1MB)");
			suggestions.push(
				"Consider breaking down large files into smaller modules",
			);
			diagnosticInfo.sizeConcern = true;
		}

		if (context.hasUnicodeChars) {
			possibleCauses.push("File contains Unicode characters");
			suggestions.push("Ensure proper UTF-8 encoding");
			suggestions.push(
				"Check for invisible Unicode characters that might break parsing",
			);
			diagnosticInfo.unicodeDetected = true;
		}

		// Analyze error message
		const errorMessage = error.message.toLowerCase();
		if (errorMessage.includes("unexpected token")) {
			possibleCauses.push("Syntax error in TypeScript code");
			suggestions.push("Check TypeScript syntax with tsc compiler");
			suggestions.push("Look for missing semicolons, brackets, or quotes");
		}

		if (errorMessage.includes("premature end")) {
			possibleCauses.push("File may be truncated or corrupted");
			suggestions.push("Verify file is complete and not corrupted");
			suggestions.push("Check if file was properly saved");
		}

		if (errorMessage.includes("encoding")) {
			possibleCauses.push("File encoding issues");
			suggestions.push("Convert file to UTF-8 encoding");
			suggestions.push("Remove BOM (Byte Order Mark) if present");
		}

		// File extension analysis
		const ext = extname(filePath).toLowerCase();
		if (![".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
			possibleCauses.push(`Unexpected file extension: ${ext}`);
			suggestions.push("Ensure file has .ts, .tsx, .js, or .jsx extension");
			diagnosticInfo.unexpectedExtension = ext;
		}

		// Performance analysis
		diagnosticInfo.performanceMetrics = {
			fileReadTime: Date.now() - context.memoryUsage.external, // Approximate
			memoryUsed: process.memoryUsage().heapUsed - context.memoryUsage.heapUsed,
			fileSizeToMemoryRatio:
				context.fileSize / (process.memoryUsage().heapUsed || 1),
		};

		if (DebugHelper.debugMode) {
			logger.debug("Parse failure analysis completed", {
				filePath,
				causes: possibleCauses.length,
				suggestions: suggestions.length,
				diagnosticKeys: Object.keys(diagnosticInfo),
			});
		}

		return {
			context,
			suggestions,
			possibleCauses,
			diagnosticInfo,
		};
	}

	/**
	 * Start performance tracking for an operation
	 */
	public static startPerformanceTracking(operationId: string): void {
		DebugHelper.performanceMarks.set(operationId, Date.now());

		if (DebugHelper.debugMode) {
			DebugHelper.addTrace({
				timestamp: Date.now(),
				operation: operationId,
				phase: "start",
				memory: process.memoryUsage(),
			});
		}
	}

	/**
	 * End performance tracking and get metrics
	 */
	public static endPerformanceTracking(
		operationId: string,
	): PerformanceMetrics | null {
		const startTime = DebugHelper.performanceMarks.get(operationId);
		if (!startTime) {
			return null;
		}

		const endTime = Date.now();
		const totalTime = endTime - startTime;
		const currentMemory = process.memoryUsage();

		DebugHelper.performanceMarks.delete(operationId);

		const metrics: PerformanceMetrics = {
			totalTime,
			parseTime: totalTime * 0.7, // Estimate - parsing typically takes ~70% of time
			analysisTime: totalTime * 0.3, // Estimate - analysis takes ~30% of time
			memoryPeak: currentMemory.heapUsed,
			memoryDelta: 0, // Would need start memory to calculate
			gcCount: 0, // Not easily accessible in Node.js
			operationsPerSecond: totalTime > 0 ? 1000 / totalTime : 0,
		};

		if (DebugHelper.debugMode) {
			DebugHelper.addTrace({
				timestamp: endTime,
				operation: operationId,
				phase: "end",
				duration: totalTime,
				memory: currentMemory,
				data: metrics,
			});

			logger.debug(`Performance tracking completed for ${operationId}`, {
				totalTime: `${totalTime}ms`,
				operationsPerSecond: metrics.operationsPerSecond.toFixed(2),
				memoryUsed: `${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`,
			});
		}

		return metrics;
	}

	/**
	 * Validate analysis result for completeness and consistency
	 */
	public static validateAnalysisResult(
		result: AnalysisResult,
		filePath: string,
	): {
		isValid: boolean;
		warnings: string[];
		errors: string[];
		suggestions: string[];
	} {
		const warnings: string[] = [];
		const errors: string[] = [];
		const suggestions: string[] = [];

		// Basic structure validation
		const resultError = getError(result);
		if (!isSuccessful(result) && !resultError) {
			errors.push("Result marked as failed but no error provided");
		}

		if (isSuccessful(result) && resultError) {
			warnings.push("Result marked as successful but error is present");
		}

		if (!result.filePath || result.filePath !== filePath) {
			errors.push(
				`File path mismatch: expected ${filePath}, got ${result.filePath}`,
			);
		}

		if (isSuccessful(result)) {
			// Validate successful analysis
			const dependencies = getDependencies(result);
			const imports = getImports(result);
			const exports = getExports(result);

			if (!Array.isArray(dependencies)) {
				errors.push("Dependencies array is missing or invalid");
			} else if (dependencies.length === 0) {
				warnings.push("No dependencies found - verify this is expected");
				suggestions.push("Check if file contains import statements");
			}

			if (!Array.isArray(exports)) {
				warnings.push("Exports array is missing or invalid");
			}

			if (!Array.isArray(imports)) {
				warnings.push("Imports array is missing or invalid");
			}

			// Cross-reference validation
			if (Array.isArray(dependencies) && Array.isArray(imports)) {
				const dependencyCount = dependencies.length;
				const importCount = imports.length;

				if (Math.abs(dependencyCount - importCount) > importCount * 0.5) {
					warnings.push(
						`Dependency count (${dependencyCount}) and import count (${importCount}) differ significantly`,
					);
					suggestions.push("Verify all imports are properly detected");
				}
			}

			// Performance validation would be done with separate metrics
		}

		const isValid = errors.length === 0;

		if (DebugHelper.debugMode) {
			logger.debug("Analysis result validation completed", {
				filePath,
				isValid,
				warnings: warnings.length,
				errors: errors.length,
				suggestions: suggestions.length,
			});
		}

		return {
			isValid,
			warnings,
			errors,
			suggestions,
		};
	}

	/**
	 * Analyze dependency patterns for potential issues
	 */
	public static analyzeDependencyPatterns(dependencies: DependencyInfo[]): {
		circularRisks: string[];
		heavyDependencies: string[];
		unusualPatterns: string[];
		recommendations: string[];
	} {
		const circularRisks: string[] = [];
		const heavyDependencies: string[] = [];
		const unusualPatterns: string[] = [];
		const recommendations: string[] = [];

		const dependencyMap = new Map<string, DependencyInfo[]>();
		const sourceCount = new Map<string, number>();

		// Group dependencies and count sources
		dependencies.forEach((dep) => {
			if (!dependencyMap.has(dep.source)) {
				dependencyMap.set(dep.source, []);
			}
			dependencyMap.get(dep.source)?.push(dep);

			sourceCount.set(dep.source, (sourceCount.get(dep.source) || 0) + 1);
		});

		// Analyze patterns
		sourceCount.forEach((count, source) => {
			if (count > 5) {
				heavyDependencies.push(`${source} (imported ${count} times)`);
			}
		});

		// Look for potential circular dependencies (same source imported multiple times with different types)
		dependencyMap.forEach((deps, source) => {
			if (deps.length > 1) {
				const types = new Set(deps.map((d: DependencyInfo) => d.type));
				if (types.size > 1) {
					circularRisks.push(
						`${source} imported with multiple types: ${Array.from(types).join(", ")}`,
					);
				}
			}
		});

		// Detect unusual patterns
		const externalDeps = dependencies.filter((d) => d.type === "external");
		const relativeDeps = dependencies.filter((d) => d.type === "relative");

		if (externalDeps.length > 20) {
			unusualPatterns.push(
				`High number of external dependencies (${externalDeps.length})`,
			);
			recommendations.push("Consider consolidating external dependencies");
		}

		if (relativeDeps.length > 15) {
			unusualPatterns.push(
				`High number of relative imports (${relativeDeps.length})`,
			);
			recommendations.push("Consider reorganizing module structure");
		}

		// Detect builtin modules by checking if they're common Node.js modules
		const nodeBuiltins = [
			"fs",
			"path",
			"os",
			"crypto",
			"util",
			"http",
			"https",
			"url",
			"querystring",
			"stream",
		];
		const builtinDeps = dependencies.filter(
			(d) => nodeBuiltins.includes(d.source) || d.source.startsWith("node:"),
		);
		if (builtinDeps.length > 10) {
			unusualPatterns.push(
				`Many Node.js builtin modules used (${builtinDeps.length})`,
			);
			recommendations.push("Verify all builtin imports are necessary");
		}

		if (heavyDependencies.length > 0) {
			recommendations.push(
				"Review frequently imported modules for potential optimization",
			);
		}

		if (circularRisks.length > 0) {
			recommendations.push("Investigate potential circular dependencies");
		}

		if (DebugHelper.debugMode) {
			logger.debug("Dependency pattern analysis completed", {
				totalDependencies: dependencies.length,
				circularRisks: circularRisks.length,
				heavyDependencies: heavyDependencies.length,
				unusualPatterns: unusualPatterns.length,
			});
		}

		return {
			circularRisks,
			heavyDependencies,
			unusualPatterns,
			recommendations,
		};
	}

	/**
	 * Add a trace entry for debugging
	 */
	public static addTrace(trace: DebugTrace): void {
		if (!DebugHelper.debugMode) return;

		DebugHelper.traces.push(trace);

		// Maintain trace history size
		if (DebugHelper.traces.length > DebugHelper.maxTraces) {
			DebugHelper.traces = DebugHelper.traces.slice(-DebugHelper.maxTraces);
		}
	}

	/**
	 * Get recent traces
	 */
	public static getRecentTraces(count = 50): DebugTrace[] {
		return DebugHelper.traces.slice(-count);
	}

	/**
	 * Get traces for specific operation
	 */
	public static getTracesForOperation(operation: string): DebugTrace[] {
		return DebugHelper.traces.filter((trace) => trace.operation === operation);
	}

	/**
	 * Clear all traces
	 */
	public static clearTraces(): void {
		DebugHelper.traces = [];
	}

	/**
	 * Export debug information
	 */
	public static exportDebugInfo(): {
		debugMode: boolean;
		traceCount: number;
		recentTraces: DebugTrace[];
		performanceMarks: Array<{ operation: string; startTime: number }>;
		systemInfo: {
			nodeVersion: string;
			platform: string;
			memory: NodeJS.MemoryUsage;
			uptime: number;
		};
	} {
		return {
			debugMode: DebugHelper.debugMode,
			traceCount: DebugHelper.traces.length,
			recentTraces: DebugHelper.getRecentTraces(10),
			performanceMarks: Array.from(DebugHelper.performanceMarks.entries()).map(
				([operation, startTime]) => ({
					operation,
					startTime,
				}),
			),
			systemInfo: {
				nodeVersion: process.version,
				platform: process.platform,
				memory: process.memoryUsage(),
				uptime: process.uptime(),
			},
		};
	}

	/**
	 * Create a comprehensive debug report
	 */
	public static createDebugReport(
		filePath?: string,
		analysisResult?: AnalysisResult,
	): string {
		let report = "TypeScript File Analyzer Debug Report\n";
		report += `${"=".repeat(50)}\n`;
		report += `Generated: ${new Date().toISOString()}\n\n`;

		// System information
		const systemInfo = DebugHelper.exportDebugInfo().systemInfo;
		report += "System Information:\n";
		report += `  Node.js: ${systemInfo.nodeVersion}\n`;
		report += `  Platform: ${systemInfo.platform}\n`;
		report += `  Memory: ${Math.round(systemInfo.memory.heapUsed / 1024 / 1024)}MB used\n`;
		report += `  Uptime: ${Math.round(systemInfo.uptime)}s\n\n`;

		// Debug mode status
		report += `Debug Mode: ${DebugHelper.debugMode ? "Enabled" : "Disabled"}\n`;
		report += `Trace Count: ${DebugHelper.traces.length}\n\n`;

		// File context if provided
		if (filePath) {
			try {
				const context = DebugHelper.gatherFileContext(filePath);
				report += "File Context:\n";
				report += `  Path: ${context.filePath}\n`;
				report += `  Size: ${Math.round(context.fileSize / 1024)}KB\n`;
				report += `  Lines: ${context.lineCount}\n`;
				report += `  Characters: ${context.characterCount}\n`;
				report += `  Unicode: ${context.hasUnicodeChars ? "Yes" : "No"}\n`;
				report += `  Modified: ${context.fileStats.modified.toISOString()}\n\n`;
			} catch (error) {
				report += `File Context Error: ${(error as Error).message}\n\n`;
			}
		}

		// Analysis result validation if provided
		if (analysisResult && filePath) {
			const validation = DebugHelper.validateAnalysisResult(
				analysisResult,
				filePath,
			);
			report += "Analysis Validation:\n";
			report += `  Valid: ${validation.isValid}\n`;
			report += `  Errors: ${validation.errors.length}\n`;
			report += `  Warnings: ${validation.warnings.length}\n`;

			if (validation.errors.length > 0) {
				report += "  Error Details:\n";
				for (const error of validation.errors) {
					report += `    - ${error}\n`;
				}
			}

			if (validation.warnings.length > 0) {
				report += "  Warning Details:\n";
				for (const warning of validation.warnings) {
					report += `    - ${warning}\n`;
				}
			}
			report += "\n";

			// Dependency analysis if available
			if (isSuccessful(analysisResult)) {
				const dependencies = getDependencies(analysisResult);
				if (dependencies.length > 0) {
					const depAnalysis =
						DebugHelper.analyzeDependencyPatterns(dependencies);
					report += "Dependency Analysis:\n";
					report += `  Total Dependencies: ${dependencies.length}\n`;
					report += `  Heavy Dependencies: ${depAnalysis.heavyDependencies.length}\n`;
					report += `  Circular Risks: ${depAnalysis.circularRisks.length}\n`;
					report += `  Unusual Patterns: ${depAnalysis.unusualPatterns.length}\n\n`;
				}
			}
		}

		// Recent traces
		if (DebugHelper.traces.length > 0) {
			report += "Recent Traces (last 5):\n";
			for (const trace of DebugHelper.getRecentTraces(5)) {
				report += `  [${new Date(trace.timestamp).toISOString()}] ${trace.operation}:${trace.phase}`;
				if (trace.duration) report += ` (${trace.duration}ms)`;
				report += "\n";
			}
			report += "\n";
		}

		return report;
	}
}

export default DebugHelper;
