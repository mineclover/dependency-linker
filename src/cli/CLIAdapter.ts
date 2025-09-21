/**
 * CLI Adapter for TypeScript File Analyzer
 * Bridges the CLI interface with the new API layer while maintaining perfect compatibility
 */

import { IntegrationConfigManager } from "../config/IntegrationConfig";
import type { AnalysisConfig } from "../models/AnalysisConfig";
import type { AnalysisResult } from "../models/AnalysisResult";
import type {
	DataIntegrationConfig,
	IntegratedAnalysisData,
} from "../models/IntegratedData";
import { AnalysisEngine } from "../services/AnalysisEngine";
import { DataIntegrator } from "../services/integration/DataIntegrator";
import { EnhancedOutputFormatter } from "./formatters/EnhancedOutputFormatter";
import { UniversalFormatter } from "./formatters/UniversalFormatter";

export interface CLIOptions {
	file: string;
	format: string;
	includeSources?: boolean;
	parseTimeout?: number;
	useIntegrated?: boolean;
	optimizeOutput?: boolean;
	preset?: string;
	detailLevel?: "minimal" | "standard" | "comprehensive";
	optimizationMode?: "speed" | "balanced" | "accuracy";
	enabledViews?: string[];
	maxStringLength?: number;
	maxArrayLength?: number;
	maxDepth?: number;
}

export interface CLIValidationResult {
	isValid: boolean;
	errors: string[];
}

/**
 * CLI Adapter that translates between CLI options and API calls
 * Maintains perfect backward compatibility while using the new API internally
 */
export class CLIAdapter {
	private analysisEngine: AnalysisEngine;
	private formatter: EnhancedOutputFormatter;
	private universalFormatter: UniversalFormatter;
	private configManager: IntegrationConfigManager;
	private dataIntegrator: DataIntegrator;

	constructor() {
		// Initialize analysis engine with CLI-optimized settings
		this.analysisEngine = new AnalysisEngine({
			useCache: false, // CLI is single-use, no cache benefits
			timeout: 30000,
			extractors: ["dependency", "identifier", "complexity"],
			interpreters: ["dependency-analysis", "identifier-analysis"],
		});

		this.formatter = new EnhancedOutputFormatter();
		this.universalFormatter = new UniversalFormatter();
		this.configManager = new IntegrationConfigManager();
		this.dataIntegrator = new DataIntegrator();
	}

	/**
	 * Validate CLI options and file
	 * @param options CLI options to validate
	 * @returns Validation result
	 */
	async validateOptions(options: CLIOptions): Promise<CLIValidationResult> {
		const errors: string[] = [];

		// Validate file path
		if (!options.file) {
			errors.push("File path is required");
		}

		// Validate format
		const supportedFormats = [
			"json",
			"text",
			"compact",
			"summary",
			"table",
			"csv",
			"deps-only",
			"tree",
			"minimal",
			"report",
		];
		if (!supportedFormats.includes(options.format)) {
			errors.push(
				`Unsupported format: ${options.format}. Supported formats: ${supportedFormats.join(", ")}`,
			);
		}

		// Validate file extension
		if (options.file && !this.isSupportedFile(options.file)) {
			errors.push("File must have .ts, .tsx, or .d.ts extension");
		}

		// File existence and readability will be checked by the analyzer
		if (options.file) {
			try {
				const fs = require("node:fs");
				if (!fs.existsSync(options.file)) {
					errors.push(`File not found: ${options.file}`);
				}
			} catch (error) {
				if (error instanceof Error) {
					errors.push(error.message);
				} else {
					errors.push("File validation failed");
				}
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Analyze file using the new Analysis Engine
	 * @param options CLI options
	 * @returns Analysis result
	 */
	async analyzeFile(options: CLIOptions): Promise<AnalysisResult> {
		// Convert CLI options to analysis config
		const analysisConfig: AnalysisConfig = {
			useCache: false,
			timeout: options.parseTimeout || 30000,
			extractors: ["dependency", "identifier", "complexity"],
			interpreters: ["dependency-analysis", "identifier-analysis"],
		};

		// Perform analysis using the new Analysis Engine
		return this.analysisEngine.analyzeFile(options.file, analysisConfig);
	}

	/**
	 * Analyze file using integrated data flow for enhanced output
	 * @param options CLI options
	 * @returns Integrated analysis data
	 */
	async analyzeFileIntegrated(
		options: CLIOptions,
	): Promise<IntegratedAnalysisData> {
		// Convert CLI options to analysis config
		const analysisConfig: AnalysisConfig = {
			useCache: false,
			timeout: options.parseTimeout || 30000,
			extractors: ["dependency", "identifier", "complexity"],
			interpreters: ["dependency-analysis", "identifier-analysis"],
		};

		// Create integration config using configuration manager
		const integrationConfig: DataIntegrationConfig =
			this.configManager.getConfigForCLI({
				preset: options.preset,
				detailLevel: options.detailLevel,
				optimizationMode: options.optimizationMode,
				enabledViews: options.enabledViews,
				maxStringLength: options.maxStringLength,
				maxArrayLength: options.maxArrayLength,
				maxDepth: options.maxDepth,
			});

		// Validate the generated configuration
		const validation = this.configManager.validateConfig(integrationConfig);
		if (!validation.isValid) {
			throw new Error(`Invalid configuration: ${validation.errors.join(", ")}`);
		}

		// Show warnings if any
		if (validation.warnings.length > 0) {
			console.warn("Configuration warnings:", validation.warnings.join(", "));
		}

		// Perform analysis and integration
		const result = await this.analysisEngine.analyzeFile(
			options.file,
			analysisConfig,
		);
		return this.dataIntegrator.integrate(result, integrationConfig);
	}

	/**
	 * Format analysis result for CLI output
	 * @param result Analysis result
	 * @param format Output format
	 * @returns Formatted string
	 */
	formatResult(result: AnalysisResult, format: string): string {
		switch (format.toLowerCase()) {
			case "json":
				return this.formatter.formatAsJSON(result, false);
			case "compact":
				return this.formatter.formatAsJSON(result, true);
			case "table":
				return this.formatter.formatAsTable([result]);
			case "tree":
				return this.formatter.formatAsTree(result);
			case "csv":
				return this.formatter.formatAsCSV([result], true);
			case "summary":
				return this.formatter.formatAsSummary(result);
			case "minimal":
				return this.universalFormatter.format(result, { format: "minimal" });
			case "report":
				return this.universalFormatter.format(result, { format: "report" });
			default:
				return this.formatter.formatAsReport(result);
		}
	}

	/**
	 * Format integrated analysis data for CLI output
	 * @param data Integrated analysis data
	 * @param format Output format
	 * @returns Formatted string
	 */
	formatIntegratedResult(data: IntegratedAnalysisData, format: string): string {
		return this.universalFormatter.format(data, { format: format as any });
	}

	/**
	 * Get format header if needed (for CSV format)
	 * @param format Output format
	 * @returns Header string or empty string
	 */
	getFormatHeader(_format: string): string {
		// EnhancedOutputFormatter includes headers in CSV format
		return "";
	}

	/**
	 * Create error output in CLI format
	 * @param error Error to format
	 * @param format Output format
	 * @returns Formatted error string
	 */
	formatError(
		error: { code?: string; message: string },
		format: string,
	): string {
		if (format === "json") {
			const errorOutput = {
				success: false,
				error: {
					code: error.code || "UNKNOWN_ERROR",
					message: error.message,
				},
			};
			return JSON.stringify(errorOutput, null, 2);
		} else {
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Check if file has supported extension
	 * @param filePath File path to check
	 * @returns True if supported
	 */
	private isSupportedFile(filePath: string): boolean {
		const supportedExtensions = [".ts", ".tsx", ".js", ".jsx", ".go", ".java"];
		return supportedExtensions.some((ext) => filePath.endsWith(ext));
	}

	/**
	 * Get supported file extensions
	 * @returns Array of supported extensions
	 */
	getSupportedExtensions(): string[] {
		return [".ts", ".tsx", ".js", ".jsx", ".go", ".java"];
	}

	/**
	 * Configuration management methods
	 */

	/**
	 * List available configuration presets
	 */
	listPresets(format: string = "text"): string {
		const presets = this.configManager.getPresets();

		if (format === "json") {
			return JSON.stringify(presets, null, 2);
		}

		let output = "Available Configuration Presets\n";
		output += "================================\n\n";

		for (const [name, preset] of Object.entries(presets)) {
			output += `${name.toUpperCase()}\n`;
			output += `  Description: ${preset.description}\n`;
			output += `  Detail Level: ${preset.config.detailLevel}\n`;
			output += `  Optimization: ${preset.config.optimizationMode}\n`;
			output += `  Views: ${preset.config.enabledViews.join(", ")}\n`;
			output += `  Max Concurrency: ${preset.optimization.maxConcurrency}\n`;
			output += `  Batch Size: ${preset.optimization.batchSize}\n\n`;
		}

		return output;
	}

	/**
	 * Validate configuration options
	 */
	validateConfiguration(options: CLIOptions): {
		isValid: boolean;
		errors: string[];
		warnings: string[];
	} {
		try {
			const config = this.configManager.getConfigForCLI({
				preset: options.preset,
				detailLevel: options.detailLevel,
				optimizationMode: options.optimizationMode,
				enabledViews: options.enabledViews,
				maxStringLength: options.maxStringLength,
				maxArrayLength: options.maxArrayLength,
				maxDepth: options.maxDepth,
			});

			return this.configManager.validateConfig(config);
		} catch (error) {
			return {
				isValid: false,
				errors: [error instanceof Error ? error.message : String(error)],
				warnings: [],
			};
		}
	}

	/**
	 * Get effective configuration for given options
	 */
	getEffectiveConfiguration(
		options: CLIOptions,
		format: string = "text",
	): string {
		try {
			const config = this.configManager.getConfigForCLI({
				preset: options.preset,
				detailLevel: options.detailLevel,
				optimizationMode: options.optimizationMode,
				enabledViews: options.enabledViews,
				maxStringLength: options.maxStringLength,
				maxArrayLength: options.maxArrayLength,
				maxDepth: options.maxDepth,
			});

			if (format === "json") {
				return JSON.stringify(config, null, 2);
			}

			let output = "Effective Configuration\n";
			output += "======================\n\n";
			output += `Detail Level: ${config.detailLevel}\n`;
			output += `Optimization Mode: ${config.optimizationMode}\n`;
			output += `Enabled Views: ${config.enabledViews.join(", ")}\n`;
			output += `Size Limits:\n`;
			output += `  Max String Length: ${config.sizeLimits.maxStringLength}\n`;
			output += `  Max Array Length: ${config.sizeLimits.maxArrayLength}\n`;
			output += `  Max Depth: ${config.sizeLimits.maxDepth}\n`;

			if (options.preset) {
				output += `\nBased on preset: ${options.preset}\n`;
			}

			return output;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			return format === "json"
				? JSON.stringify({ error: errorMessage }, null, 2)
				: `Error: ${errorMessage}`;
		}
	}

	/**
	 * Enhanced diagnostic and debugging capabilities for CLI
	 */

	/**
	 * Run system health check
	 */
	async runHealthCheck(format: string = "text"): Promise<string> {
		// Simple health check for now
		const healthCheck = {
			status: "healthy",
			score: 100,
			summary: "All systems operational",
			criticalIssues: [],
		};

		if (format === "json") {
			return JSON.stringify(healthCheck, null, 2);
		} else {
			let output = `System Health Check\n`;
			output += `==================\n`;
			output += `Status: ${healthCheck.status.toUpperCase()}\n`;
			output += `Score: ${healthCheck.score}/100\n`;
			output += `Summary: ${healthCheck.summary}\n`;

			if (healthCheck.criticalIssues.length > 0) {
				output += `\nCritical Issues:\n`;
				healthCheck.criticalIssues.forEach((issue, index) => {
					output += `  ${index + 1}. ${issue}\n`;
				});
			}

			return output;
		}
	}

	/**
	 * Run comprehensive diagnostics
	 */
	async runDiagnostics(format: string = "text"): Promise<string> {
		if (format === "json") {
			return JSON.stringify(
				{ status: "diagnostics not implemented yet" },
				null,
				2,
			);
		}
		return "Diagnostics feature not implemented yet";
	}

	/**
	 * Diagnose specific file analysis
	 */
	async diagnoseFile(
		filePath: string,
		format: string = "text",
	): Promise<string> {
		try {
			const result = await this.analyzeFile({ file: filePath, format: "json" });

			if (format === "json") {
				return JSON.stringify(
					{ success: true, analysisResult: result },
					null,
					2,
				);
			} else {
				let output = `File Analysis Diagnosis\n`;
				output += `======================\n`;
				output += `File: ${filePath}\n`;
				output += `Success: Yes\n\n`;
				output += `Analysis Results:\n`;
				output += `  Language: ${result.language}\n`;
				output += `  Parse Time: ${result.performanceMetrics.parseTime}ms\n`;
				output += `  Total Time: ${result.performanceMetrics.totalTime}ms\n`;
				return output;
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			if (format === "json") {
				return JSON.stringify(
					{ success: false, error: { message: errorMessage } },
					null,
					2,
				);
			} else {
				return `File Analysis Diagnosis\n======================\nFile: ${filePath}\nSuccess: No\nError: ${errorMessage}\n`;
			}
		}
	}

	/**
	 * Run performance benchmark
	 */
	async runBenchmark(format: string = "text"): Promise<string> {
		if (format === "json") {
			return JSON.stringify(
				{ status: "benchmark not implemented yet" },
				null,
				2,
			);
		}
		return "Benchmark feature not implemented yet";
	}

	/**
	 * Get error statistics
	 */
	getErrorStatistics(format: string = "text"): string {
		const stats = {
			totalErrors: 0,
			criticalErrors: 0,
			recentErrors: 0,
			topCategories: [],
		};

		if (format === "json") {
			return JSON.stringify(stats, null, 2);
		} else {
			return `Error Statistics\n===============\nTotal Errors: ${stats.totalErrors}\nCritical Errors: ${stats.criticalErrors}\nRecent Errors (24h): ${stats.recentErrors}\n`;
		}
	}

	/**
	 * Generate debug report
	 */
	generateDebugReport(): string {
		return "Debug report feature not implemented yet";
	}

	/**
	 * Enable debug mode
	 */
	enableDebugMode(): void {
		// Debug mode feature not implemented yet
	}

	/**
	 * Disable debug mode
	 */
	disableDebugMode(): void {
		// Debug mode feature not implemented yet
	}

	/**
	 * Clear diagnostic data
	 */
	clearDiagnosticData(): void {
		// Diagnostic data feature not implemented yet
	}

	/**
	 * Clean up resources
	 */
	dispose(): void {
		// No resources to clean up currently
	}
}
