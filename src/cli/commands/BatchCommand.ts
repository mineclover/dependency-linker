/**
 * Batch Analysis Command
 * Handles batch analysis of multiple TypeScript files
 */

import fs from "node:fs";
import path from "node:path";
import { glob } from "glob";
import { TypeScriptAnalyzer } from "../../api/TypeScriptAnalyzer";
import { LogLevel } from "../../api/types";
import {
	getDependencies,
	getError,
	getExports,
	getImports,
	getParseTime,
	isSuccessful,
} from "../../lib/AnalysisResultHelper";
import type { AnalysisResult } from "../../models/AnalysisResult";
import { EnhancedOutputFormatter } from "../formatters/EnhancedOutputFormatter";

export interface BatchCommandOptions {
	pattern: string;
	format: string;
	outputFile?: string;
	maxFiles: number;
	recursive?: boolean;
	includeTests?: boolean;
	excludePatterns?: string[];
	verbose?: boolean;
}

export interface BatchProgress {
	processed: number;
	total: number;
	current?: string;
	errors: number;
	startTime: number;
}

export interface BatchResult {
	success: boolean;
	results: AnalysisResult[];
	summary: {
		totalFiles: number;
		processedFiles: number;
		failedFiles: number;
		totalDependencies: number;
		uniqueDependencies: Set<string>;
		processingTime: number;
	};
	errors: Array<{ file: string; error: string }>;
}

export class BatchCommand {
	private analyzer: TypeScriptAnalyzer;
	private formatter: EnhancedOutputFormatter;

	constructor() {
		this.analyzer = new TypeScriptAnalyzer({
			enableCache: true, // Enable cache for batch operations
			logLevel: LogLevel.WARN,
			defaultTimeout: 15000,
		});

		this.formatter = new EnhancedOutputFormatter();
	}

	/**
	 * Execute batch analysis
	 */
	async execute(options: BatchCommandOptions): Promise<BatchResult> {
		const startTime = Date.now();

		try {
			// Find files matching the pattern
			const files = await this.findFiles(options);

			if (files.length === 0) {
				return {
					success: false,
					results: [],
					summary: {
						totalFiles: 0,
						processedFiles: 0,
						failedFiles: 0,
						totalDependencies: 0,
						uniqueDependencies: new Set(),
						processingTime: Date.now() - startTime,
					},
					errors: [
						{
							file: "pattern",
							error: `No files found matching pattern: ${options.pattern}`,
						},
					],
				};
			}

			console.log(`Found ${files.length} files to analyze`);

			// Limit files if maxFiles is specified
			const filesToProcess = files.slice(0, options.maxFiles);
			if (filesToProcess.length < files.length) {
				console.log(`Limiting analysis to first ${options.maxFiles} files`);
			}

			// Setup progress reporting
			const progress: BatchProgress = {
				processed: 0,
				total: filesToProcess.length,
				errors: 0,
				startTime,
			};

			if (options.verbose) {
				this.setupProgressReporting(progress);
			}

			// Analyze files
			const results: AnalysisResult[] = [];
			const errors: Array<{ file: string; error: string }> = [];
			const uniqueDependencies = new Set<string>();

			for (const file of filesToProcess) {
				try {
					progress.current = file;
					progress.processed++;

					if (options.verbose) {
						console.log(
							`[${progress.processed}/${progress.total}] Analyzing: ${file}`,
						);
					}

					const result = await this.analyzer.analyzeFile(file, {
						format: options.format as any,
						includeSources: false,
						parseTimeout: 15000,
					});

					if (isSuccessful(result)) {
						results.push(result);

						// Collect unique dependencies
						const dependencies = getDependencies(result);
						dependencies.forEach((dep) => {
							if (dep.source) {
								uniqueDependencies.add(dep.source);
							}
						});
					} else {
						progress.errors++;
						const error = getError(result);
						errors.push({
							file,
							error: error?.message || "Unknown analysis error",
						});
					}
				} catch (error) {
					progress.errors++;
					errors.push({
						file,
						error: error instanceof Error ? error.message : String(error),
					});

					if (options.verbose) {
						console.error(`Error analyzing ${file}: ${error}`);
					}
				}
			}

			const processingTime = Date.now() - startTime;
			const summary = {
				totalFiles: files.length,
				processedFiles: results.length,
				failedFiles: errors.length,
				totalDependencies: results.reduce(
					(sum, r) => sum + getDependencies(r).length,
					0,
				),
				uniqueDependencies,
				processingTime,
			};

			const batchResult: BatchResult = {
				success: results.length > 0,
				results,
				summary,
				errors,
			};

			// Save results if output file is specified
			if (options.outputFile) {
				await this.saveResults(batchResult, options);
			}

			return batchResult;
		} catch (error) {
			return {
				success: false,
				results: [],
				summary: {
					totalFiles: 0,
					processedFiles: 0,
					failedFiles: 1,
					totalDependencies: 0,
					uniqueDependencies: new Set(),
					processingTime: Date.now() - startTime,
				},
				errors: [
					{
						file: "batch",
						error: error instanceof Error ? error.message : String(error),
					},
				],
			};
		}
	}

	/**
	 * Find files matching the pattern
	 */
	private async findFiles(options: BatchCommandOptions): Promise<string[]> {
		try {
			const globOptions: any = {
				ignore: [
					"**/node_modules/**",
					"**/dist/**",
					"**/build/**",
					"**/*.d.ts", // Exclude type definition files by default
					...(options.excludePatterns || []),
				],
			};

			// Add test exclusion if not including tests
			if (!options.includeTests) {
				globOptions.ignore.push(
					"**/*.test.ts",
					"**/*.spec.ts",
					"**/__tests__/**",
				);
			}

			const files = await glob(options.pattern, globOptions);

			// Filter to only TypeScript files
			return files.filter((file) => {
				const ext = path.extname(file).toLowerCase();
				return [".ts", ".tsx"].includes(ext);
			});
		} catch (error) {
			throw new Error(
				`Failed to find files: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Setup progress reporting
	 */
	private setupProgressReporting(progress: BatchProgress): void {
		const interval = setInterval(() => {
			const elapsed = Date.now() - progress.startTime;
			const rate = progress.processed / (elapsed / 1000);
			const eta =
				progress.total > progress.processed
					? Math.round((progress.total - progress.processed) / rate)
					: 0;

			process.stdout.write(
				`\rProgress: ${progress.processed}/${progress.total} ` +
					`(${Math.round((progress.processed / progress.total) * 100)}%) ` +
					`Errors: ${progress.errors} ` +
					`Rate: ${rate.toFixed(1)}/s ` +
					`ETA: ${eta}s`,
			);
		}, 1000);

		// Clear interval when done
		setTimeout(() => clearInterval(interval), 60000); // Max 1 minute
	}

	/**
	 * Save results to file
	 */
	private async saveResults(
		result: BatchResult,
		options: BatchCommandOptions,
	): Promise<void> {
		try {
			if (!options.outputFile) {
				throw new Error("Output file path is required");
			}
			const outputPath = path.resolve(options.outputFile);
			const outputDir = path.dirname(outputPath);

			// Ensure output directory exists
			if (!fs.existsSync(outputDir)) {
				fs.mkdirSync(outputDir, { recursive: true });
			}

			let content: string;
			const ext = path.extname(outputPath).toLowerCase();

			switch (ext) {
				case ".json":
					content = JSON.stringify(result, null, 2);
					break;
				case ".csv":
					content = this.formatAsCSV(result);
					break;
				case ".md":
					content = this.formatAsMarkdown(result);
					break;
				default:
					// Default to JSON
					content = JSON.stringify(result, null, 2);
					break;
			}

			await fs.promises.writeFile(outputPath, content, "utf8");
			console.log(`Results saved to: ${outputPath}`);
		} catch (error) {
			console.error(
				`Failed to save results: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Format results as CSV
	 */
	private formatAsCSV(result: BatchResult): string {
		const headers = [
			"File",
			"Dependencies",
			"Imports",
			"Exports",
			"Analysis Time",
			"Success",
		];
		const rows = result.results.map((r) => [
			r.filePath || "",
			getDependencies(r).length,
			getImports(r).length,
			getExports(r).length,
			getParseTime(r),
			isSuccessful(r) ? "Yes" : "No",
		]);

		return [headers, ...rows]
			.map((row) => row.map((cell) => `"${cell}"`).join(","))
			.join("\n");
	}

	/**
	 * Format results as Markdown
	 */
	private formatAsMarkdown(result: BatchResult): string {
		let content = `# Batch Analysis Results\n\n`;
		content += `## Summary\n\n`;
		content += `- **Total Files**: ${result.summary.totalFiles}\n`;
		content += `- **Processed**: ${result.summary.processedFiles}\n`;
		content += `- **Failed**: ${result.summary.failedFiles}\n`;
		content += `- **Total Dependencies**: ${result.summary.totalDependencies}\n`;
		content += `- **Unique Dependencies**: ${result.summary.uniqueDependencies.size}\n`;
		content += `- **Processing Time**: ${result.summary.processingTime}ms\n\n`;

		if (result.summary.uniqueDependencies.size > 0) {
			content += `## Dependencies Found\n\n`;
			Array.from(result.summary.uniqueDependencies)
				.sort()
				.forEach((dep) => {
					content += `- \`${dep}\`\n`;
				});
			content += `\n`;
		}

		if (result.errors.length > 0) {
			content += `## Errors\n\n`;
			result.errors.forEach((error) => {
				content += `- **${error.file}**: ${error.error}\n`;
			});
		}

		return content;
	}

	/**
	 * Format batch result for console output
	 */
	formatResult(result: BatchResult, format: string): string {
		switch (format.toLowerCase()) {
			case "json":
				return this.formatter.formatAsJSON(result.results, false);

			case "compact":
				return this.formatter.formatAsJSON(result.results, true);

			case "csv":
				return this.formatter.formatAsCSV(result.results, true);

			case "table":
				return this.formatter.formatAsTable(result.results);

			case "summary":
				return this.formatSummary(result);
			default:
				return this.formatAsText(result);
		}
	}

	/**
	 * Format as text summary
	 */
	private formatSummary(result: BatchResult): string {
		const { summary } = result;
		return (
			`Processed ${summary.processedFiles}/${summary.totalFiles} files, ` +
			`found ${summary.totalDependencies} dependencies (${summary.uniqueDependencies.size} unique), ` +
			`${summary.failedFiles} errors, ${summary.processingTime}ms`
		);
	}

	/**
	 * Format as detailed text
	 */
	private formatAsText(result: BatchResult): string {
		let output = `Batch Analysis Results\n`;
		output += `=====================\n\n`;

		const { summary } = result;
		output += `Summary:\n`;
		output += `  Total Files: ${summary.totalFiles}\n`;
		output += `  Processed: ${summary.processedFiles}\n`;
		output += `  Failed: ${summary.failedFiles}\n`;
		output += `  Success Rate: ${((summary.processedFiles / summary.totalFiles) * 100).toFixed(1)}%\n`;
		output += `  Total Dependencies: ${summary.totalDependencies}\n`;
		output += `  Unique Dependencies: ${summary.uniqueDependencies.size}\n`;
		output += `  Processing Time: ${summary.processingTime}ms\n`;
		output += `  Average Time per File: ${Math.round(summary.processingTime / summary.totalFiles)}ms\n\n`;

		if (summary.uniqueDependencies.size > 0) {
			output += `Unique Dependencies:\n`;
			Array.from(summary.uniqueDependencies)
				.sort()
				.forEach((dep) => {
					output += `  - ${dep}\n`;
				});
			output += `\n`;
		}

		if (result.errors.length > 0) {
			output += `Errors (${result.errors.length}):\n`;
			result.errors.forEach((error, index) => {
				output += `  ${index + 1}. ${error.file}: ${error.error}\n`;
			});
		}

		return output;
	}

	/**
	 * Clean up resources
	 */
	dispose(): void {
		this.analyzer.clearCache();
	}
}
