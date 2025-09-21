/**
 * Universal Formatter
 * Unified formatter that can handle both AnalysisResult and IntegratedAnalysisData
 */

import type { AnalysisResult } from "../../models/AnalysisResult";
import type { IntegratedAnalysisData } from "../../models/IntegratedData";
import { EnhancedOutputFormatter } from "./EnhancedOutputFormatter";
import {
	IntegratedOutputFormatter,
	type OutputOptions,
} from "./IntegratedOutputFormatter";

export type FormattableData =
	| AnalysisResult
	| AnalysisResult[]
	| IntegratedAnalysisData
	| IntegratedAnalysisData[];

export interface UniversalFormatOptions extends OutputOptions {
	preferIntegrated?: boolean;
}

export class UniversalFormatter {
	private enhancedFormatter: EnhancedOutputFormatter;
	private integratedFormatter: IntegratedOutputFormatter;

	constructor() {
		this.enhancedFormatter = new EnhancedOutputFormatter();
		this.integratedFormatter = new IntegratedOutputFormatter();
	}

	/**
	 * Auto-detect data type and format accordingly
	 */
	format(data: FormattableData, options: UniversalFormatOptions): string {
		if (this.isIntegratedData(data)) {
			return this.integratedFormatter.format(data, options);
		} else {
			return this.formatAnalysisResult(
				data as AnalysisResult | AnalysisResult[],
				options,
			);
		}
	}

	/**
	 * Format AnalysisResult using enhanced formatter
	 */
	private formatAnalysisResult(
		data: AnalysisResult | AnalysisResult[],
		options: UniversalFormatOptions,
	): string {
		const results = Array.isArray(data) ? data : [data];

		switch (options.format) {
			case "summary":
				return results
					.map((r) => this.enhancedFormatter.formatAsSummary(r))
					.join("\n");

			case "table":
				return this.enhancedFormatter.formatAsTable(results);

			case "tree":
				if (results.length === 1) {
					return this.enhancedFormatter.formatAsTree(results[0]);
				} else {
					return results
						.map(
							(r, i) => `\n${i + 1}. ${this.enhancedFormatter.formatAsTree(r)}`,
						)
						.join("\n" + "─".repeat(50) + "\n");
				}

			case "csv":
				return this.enhancedFormatter.formatAsCSV(
					results,
					options.includeHeaders,
				);

			case "json":
				return this.enhancedFormatter.formatAsJSON(data, options.compact);

			case "report":
				if (results.length === 1) {
					return this.enhancedFormatter.formatAsReport(results[0]);
				} else {
					return results
						.map(
							(r, i) =>
								`\n${"=".repeat(60)}\nReport ${i + 1} of ${results.length}\n${"=".repeat(60)}\n` +
								this.enhancedFormatter.formatAsReport(r),
						)
						.join("\n");
				}

			case "minimal":
				return results
					.map((r) => {
						const deps = r.extractedData?.dependency?.dependencies?.length || 0;
						const exports = r.extractedData?.dependency?.exports?.length || 0;
						const time = r.performanceMetrics?.parseTime || 0;
						const status = r.errors?.length ? "✗" : "✓";
						const fileName = r.filePath.split("/").pop() || r.filePath;
						return `${fileName}: ${deps}/${exports} (${time}ms) ${status}`;
					})
					.join("\n");

			default:
				throw new Error(
					`Unsupported format for AnalysisResult: ${options.format}`,
				);
		}
	}

	/**
	 * Type guard to check if data is IntegratedAnalysisData
	 */
	private isIntegratedData(
		data: FormattableData,
	): data is IntegratedAnalysisData | IntegratedAnalysisData[] {
		if (Array.isArray(data)) {
			return data.length > 0 && this.hasIntegratedStructure(data[0]);
		}
		return this.hasIntegratedStructure(data);
	}

	/**
	 * Check if object has IntegratedAnalysisData structure
	 */
	private hasIntegratedStructure(obj: any): boolean {
		return (
			obj &&
			typeof obj === "object" &&
			obj.core &&
			obj.views &&
			obj.metadata &&
			obj.detailed &&
			obj.core.file &&
			obj.views.summary &&
			obj.views.table
		);
	}

	/**
	 * Get available formats for given data type
	 */
	getAvailableFormats(data: FormattableData): string[] {
		const baseFormats = [
			"summary",
			"table",
			"tree",
			"csv",
			"json",
			"minimal",
			"report",
		];

		if (this.isIntegratedData(data)) {
			// All formats supported for integrated data
			return baseFormats;
		} else {
			// Limited formats for AnalysisResult (no minimal view optimization)
			return baseFormats;
		}
	}

	/**
	 * Validate format for given data type
	 */
	validateFormat(data: FormattableData, format: string): boolean {
		const availableFormats = this.getAvailableFormats(data);
		return availableFormats.includes(format);
	}

	/**
	 * Get format suggestions based on data type and size
	 */
	suggestFormat(data: FormattableData): {
		recommended: string;
		alternatives: string[];
		reason: string;
	} {
		const isIntegrated = this.isIntegratedData(data);
		const isArray = Array.isArray(data);
		const count = isArray ? data.length : 1;

		if (count === 1) {
			return {
				recommended: isIntegrated ? "report" : "report",
				alternatives: ["json", "tree"],
				reason:
					"Single file analysis - detailed report provides comprehensive view",
			};
		} else if (count <= 10) {
			return {
				recommended: "table",
				alternatives: ["summary", "csv"],
				reason: "Small batch - table format provides good overview",
			};
		} else if (count <= 100) {
			return {
				recommended: "summary",
				alternatives: ["csv", "minimal"],
				reason: "Medium batch - summary format is most readable",
			};
		} else {
			return {
				recommended: isIntegrated ? "minimal" : "csv",
				alternatives: ["csv", "json"],
				reason: "Large batch - minimal format reduces output size",
			};
		}
	}

	/**
	 * Create formatted output with metadata
	 */
	formatWithMetadata(
		data: FormattableData,
		options: UniversalFormatOptions,
	): {
		content: string;
		metadata: {
			format: string;
			dataType: string;
			itemCount: number;
			outputSize: number;
			processingTime: number;
		};
	} {
		const startTime = performance.now();
		const content = this.format(data, options);
		const processingTime = performance.now() - startTime;

		return {
			content,
			metadata: {
				format: options.format,
				dataType: this.isIntegratedData(data)
					? "IntegratedAnalysisData"
					: "AnalysisResult",
				itemCount: Array.isArray(data) ? data.length : 1,
				outputSize: content.length,
				processingTime,
			},
		};
	}

	/**
	 * Format with automatic optimization based on output size
	 */
	formatOptimized(
		data: FormattableData,
		preferredFormat: string,
		maxOutputSize?: number,
	): {
		content: string;
		actualFormat: string;
		optimized: boolean;
	} {
		const baseOptions: UniversalFormatOptions = {
			format: preferredFormat as any,
		};

		// Try preferred format first
		const result = this.formatWithMetadata(data, baseOptions);

		// If output is too large and we have a limit, try to optimize
		if (maxOutputSize && result.metadata.outputSize > maxOutputSize) {
			const suggestions = this.suggestFormat(data);
			const optimizedOptions: UniversalFormatOptions = {
				format: suggestions.recommended as any,
				compact: true,
			};

			const optimizedResult = this.formatWithMetadata(data, optimizedOptions);

			if (optimizedResult.metadata.outputSize < result.metadata.outputSize) {
				return {
					content: optimizedResult.content,
					actualFormat: suggestions.recommended,
					optimized: true,
				};
			}
		}

		return {
			content: result.content,
			actualFormat: preferredFormat,
			optimized: false,
		};
	}

	/**
	 * Get formatter statistics
	 */
	getFormatterStats(): {
		supportedFormats: string[];
		supportedDataTypes: string[];
		features: string[];
	} {
		return {
			supportedFormats: [
				"summary",
				"table",
				"tree",
				"csv",
				"json",
				"minimal",
				"report",
			],
			supportedDataTypes: ["AnalysisResult", "IntegratedAnalysisData"],
			features: [
				"Auto-detection of data types",
				"Format optimization for large datasets",
				"Backward compatibility",
				"Progress indicators",
				"Metadata generation",
				"Output size optimization",
			],
		};
	}
}
