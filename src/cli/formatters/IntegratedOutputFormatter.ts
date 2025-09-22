/**
 * Integrated Output Formatter
 * Enhanced formatter that works with IntegratedAnalysisData for optimized output
 */

import type { AnalysisResult } from "../../models/AnalysisResult";
import type {
	IntegratedAnalysisData,
	TreeNode,
} from "../../models/IntegratedData";

export interface OutputOptions {
	format: "summary" | "table" | "tree" | "csv" | "json" | "minimal" | "report";
	includeHeaders?: boolean;
	compact?: boolean;
	maxWidth?: number;
	showMetrics?: boolean;
}

export class IntegratedOutputFormatter {
	/**
	 * Format integrated data based on specified format
	 */
	format(
		data: IntegratedAnalysisData | IntegratedAnalysisData[],
		options: OutputOptions,
	): string {
		const dataArray = Array.isArray(data) ? data : [data];

		switch (options.format) {
			case "summary":
				return this.formatSummary(dataArray, options);
			case "table":
				return this.formatTable(dataArray, options);
			case "tree":
				return dataArray.length === 1
					? this.formatTree(dataArray[0], options)
					: this.formatMultipleAsTree(dataArray, options);
			case "csv":
				return this.formatCSV(dataArray, options);
			case "json":
				return this.formatJSON(data, options);
			case "minimal":
				return this.formatMinimal(dataArray, options);
			case "report":
				return dataArray.length === 1
					? this.formatReport(dataArray[0], options)
					: this.formatMultipleAsReport(dataArray, options);
			default:
				throw new Error(`Unsupported format: ${options.format}`);
		}
	}

	/**
	 * Format as summary (one line per file)
	 */
	private formatSummary(
		data: IntegratedAnalysisData[],
		_options: OutputOptions,
	): string {
		return data
			.map((item) => {
				const view = item.views.summary;
				let issues = "";
				if (view.issues && view.issues.length > 0) {
					issues = ` (${view.issues.length} issues)`;
				}

				return `${view.fileName} | ${view.depCount} deps, ${view.importCount} imports, ${view.exportCount} exports | ${view.parseTime}ms | ${view.status}${issues}`;
			})
			.join("\n");
	}

	/**
	 * Format as ASCII table
	 */
	private formatTable(
		data: IntegratedAnalysisData[],
		options: OutputOptions,
	): string {
		if (data.length === 0) {
			return "No data to display";
		}

		const headers = [
			"File",
			"Lang",
			"Deps",
			"Imports",
			"Exports",
			"Functions",
			"Classes",
			"Time",
			"Memory",
			"Status",
		];
		const rows = data.map((item) => {
			const view = item.views.table;
			return [
				this.truncateString(view.file, 25),
				view.lang,
				view.deps,
				view.imports,
				view.exports,
				view.functions,
				view.classes,
				view.time,
				view.memory,
				view.status,
			];
		});

		return this.buildAsciiTable(headers, rows, options);
	}

	/**
	 * Format as tree structure
	 */
	private formatTree(
		data: IntegratedAnalysisData,
		_options: OutputOptions,
	): string {
		return this.renderTreeNode(data.views.tree.root, "", true);
	}

	/**
	 * Format multiple files as tree structures
	 */
	private formatMultipleAsTree(
		data: IntegratedAnalysisData[],
		options: OutputOptions,
	): string {
		return data
			.map((item, index) => {
				let output = `\n${index + 1}. ${this.formatTree(item, options)}`;
				if (index < data.length - 1) {
					output += `\n${"─".repeat(50)}`;
				}
				return output;
			})
			.join("\n");
	}

	/**
	 * Format as CSV
	 */
	private formatCSV(
		data: IntegratedAnalysisData[],
		options: OutputOptions,
	): string {
		const lines: string[] = [];

		if (options.includeHeaders !== false) {
			const headers = [
				"File",
				"Language",
				"Dependencies",
				"Imports",
				"Exports",
				"Functions",
				"Classes",
				"Interfaces",
				"Variables",
				"Cyclomatic Complexity",
				"Lines of Code",
				"Parse Time",
				"Total Time",
				"Memory Usage",
				"Status",
				"Errors",
				"Warnings",
			];
			lines.push(headers.map((h) => this.escapeCSV(h)).join(","));
		}

		data.forEach((item) => {
			const view = item.views.csv;
			const row = [
				view.file,
				view.language,
				view.dependencies,
				view.imports,
				view.exports,
				view.functions,
				view.classes,
				view.interfaces,
				view.variables,
				view.cyclomaticComplexity,
				view.linesOfCode,
				view.parseTime,
				view.totalTime,
				view.memoryUsage,
				view.status,
				view.errors,
				view.warnings,
			];
			lines.push(row.map((v) => this.escapeCSV(String(v))).join(","));
		});

		return lines.join("\n");
	}

	/**
	 * Format as JSON
	 */
	private formatJSON(
		data: IntegratedAnalysisData | IntegratedAnalysisData[],
		options: OutputOptions,
	): string {
		const indent = options.compact ? 0 : 2;
		return JSON.stringify(data, null, indent);
	}

	/**
	 * Format as minimal output
	 */
	private formatMinimal(
		data: IntegratedAnalysisData[],
		_options: OutputOptions,
	): string {
		return data
			.map((item) => {
				const view = item.views.minimal;
				const status = view.ok ? "✓" : "✗";
				return `${view.name}: ${view.deps}/${view.exports} (${view.time}ms) ${status}`;
			})
			.join("\n");
	}

	/**
	 * Format as detailed report
	 */
	private formatReport(
		data: IntegratedAnalysisData,
		options: OutputOptions,
	): string {
		let output = "Analysis Report\n";
		output += "==============\n\n";

		// File information
		output += `File: ${data.core.file.name}\n`;
		output += `Path: ${data.core.file.path}\n`;
		output += `Language: ${data.core.language.detected} (${(data.core.language.confidence * 100).toFixed(1)}%)\n`;
		output += `Parser: ${data.core.language.parser}\n`;
		output += `Status: ${data.core.status.overall}\n`;

		if (data.core.status.message) {
			output += `Message: ${data.core.status.message}\n`;
		}
		output += "\n";

		// Performance metrics
		output += "Performance Metrics\n";
		output += "-------------------\n";
		output += `Parse Time: ${data.core.timing.parse}ms\n`;
		output += `Extract Time: ${data.core.timing.extract}ms\n`;
		output += `Interpret Time: ${data.core.timing.interpret}ms\n`;
		output += `Total Time: ${data.core.timing.total}ms\n`;
		output += `Memory Usage: ${this.formatBytes(data.core.memory.peak)}\n`;
		output += `Memory Efficiency: ${(data.core.memory.efficiency * 100).toFixed(1)}%\n`;
		output += "\n";

		// Dependencies
		const depCounts = data.core.counts.dependencies;
		output += `Dependencies (${depCounts.total})\n`;
		output += "-------------\n";
		output += `External: ${depCounts.external}\n`;
		output += `Internal: ${depCounts.internal}\n`;
		output += `Built-in: ${depCounts.builtin}\n`;
		output += "\n";

		// Code structure
		const identifierCounts = data.core.counts.identifiers;
		output += `Code Structure\n`;
		output += "--------------\n";
		output += `Functions: ${identifierCounts.functions}\n`;
		output += `Classes: ${identifierCounts.classes}\n`;
		output += `Interfaces: ${identifierCounts.interfaces}\n`;
		output += `Variables: ${identifierCounts.variables}\n`;
		output += `Types: ${identifierCounts.types}\n`;
		output += "\n";

		// Quality metrics
		if (options.showMetrics && data.detailed.complexity) {
			output += "Quality Metrics\n";
			output += "---------------\n";
			output += `Cyclomatic Complexity: ${data.detailed.complexity.file.cyclomaticComplexity}\n`;
			output += `Cognitive Complexity: ${data.detailed.complexity.file.cognitiveComplexity}\n`;
			output += `Maintainability Index: ${data.detailed.complexity.file.maintainabilityIndex}\n`;
			output += `Lines of Code: ${data.detailed.complexity.file.linesOfCode}\n`;
			output += `Documentation Coverage: ${(data.detailed.complexity.quality.documentationCoverage * 100).toFixed(1)}%\n`;
			output += "\n";
		}

		// Insights and recommendations
		if (data.detailed.insights.keyFindings.length > 0) {
			output += "Key Findings\n";
			output += "------------\n";
			data.detailed.insights.keyFindings.forEach((finding) => {
				output += `• ${finding}\n`;
			});
			output += "\n";
		}

		if (data.detailed.recommendations.length > 0) {
			output += "Recommendations\n";
			output += "---------------\n";
			data.detailed.recommendations.slice(0, 3).forEach((rec, index) => {
				output += `${index + 1}. ${rec.title} (${rec.priority})\n`;
				output += `   ${rec.description}\n`;
				if (rec.implementation.estimatedTime) {
					output += `   Estimated time: ${rec.implementation.estimatedTime}\n`;
				}
				output += "\n";
			});
		}

		// Data quality
		const quality = data.metadata.dataQuality;
		output += "Data Quality\n";
		output += "------------\n";
		output += `Overall Score: ${(quality.completeness * 100).toFixed(1)}%\n`;
		output += `Completeness: ${(quality.completeness * 100).toFixed(1)}%\n`;
		output += `Accuracy: ${(quality.accuracy * 100).toFixed(1)}%\n`;
		output += `Consistency: ${(quality.consistency * 100).toFixed(1)}%\n`;

		return output;
	}

	/**
	 * Format multiple files as reports
	 */
	private formatMultipleAsReport(
		data: IntegratedAnalysisData[],
		options: OutputOptions,
	): string {
		return data
			.map((item, index) => {
				let output = `\n${"=".repeat(60)}\n`;
				output += `Report ${index + 1} of ${data.length}\n`;
				output += `${"=".repeat(60)}\n`;
				output += this.formatReport(item, options);
				return output;
			})
			.join("\n");
	}

	/**
	 * Build ASCII table
	 */
	private buildAsciiTable(
		headers: string[],
		rows: string[][],
		options: OutputOptions,
	): string {
		const maxWidth = options.maxWidth || 120;

		// Calculate column widths
		const columnWidths = headers.map((header, index) => {
			const maxContentWidth = Math.max(
				header.length,
				...rows.map((row) => String(row[index] || "").length),
			);
			return Math.min(
				maxContentWidth,
				Math.floor(maxWidth / headers.length) - 3,
			);
		});

		const totalWidth =
			columnWidths.reduce((sum, width) => sum + width, 0) +
			(headers.length - 1) * 3 +
			4;
		const separator = "─".repeat(totalWidth - 2);

		let output = `┌${separator}┐\n`;

		// Header row
		const headerCells = headers.map((header, index) => {
			return this.padString(header, columnWidths[index]);
		});
		output += `│ ${headerCells.join(" │ ")} │\n`;
		output += `├${separator}┤\n`;

		// Data rows
		rows.forEach((row) => {
			const cells = row.map((cell, index) => {
				return this.padString(String(cell || ""), columnWidths[index]);
			});
			output += `│ ${cells.join(" │ ")} │\n`;
		});

		output += `└${separator}┘`;
		return output;
	}

	/**
	 * Render tree node recursively
	 */
	private renderTreeNode(
		node: TreeNode,
		prefix: string = "",
		isLast: boolean = true,
	): string {
		const connector = isLast ? "└── " : "├── ";
		const valueStr = node.value !== undefined ? ` (${node.value})` : "";

		let output = `${prefix}${connector}${node.name}${valueStr}\n`;

		if (node.children && node.children.length > 0) {
			const newPrefix = prefix + (isLast ? "    " : "│   ");
			const children = node.children;
			children.forEach((child, index) => {
				const isChildLast = index === children.length - 1;
				output += this.renderTreeNode(child, newPrefix, isChildLast);
			});
		}

		return output;
	}

	/**
	 * Helper methods
	 */
	private truncateString(str: string, maxLength: number): string {
		if (str.length <= maxLength) return str;
		return `${str.substring(0, maxLength - 3)}...`;
	}

	private padString(str: string, width: number): string {
		return str.padEnd(width).substring(0, width);
	}

	private escapeCSV(value: string): string {
		if (value.includes(",") || value.includes('"') || value.includes("\n")) {
			return `"${value.replace(/"/g, '""')}"`;
		}
		return value;
	}

	private formatBytes(bytes: number): string {
		const units = ["B", "KB", "MB", "GB"];
		let size = bytes;
		let unitIndex = 0;

		while (size >= 1024 && unitIndex < units.length - 1) {
			size /= 1024;
			unitIndex++;
		}

		return `${size.toFixed(1)}${units[unitIndex]}`;
	}

	/**
	 * Format duration in human-readable format
	 */
	formatDuration(ms: number): string {
		if (ms < 1000) {
			return `${ms}ms`;
		} else if (ms < 60000) {
			return `${(ms / 1000).toFixed(1)}s`;
		} else {
			const minutes = Math.floor(ms / 60000);
			const seconds = Math.floor((ms % 60000) / 1000);
			return `${minutes}m ${seconds}s`;
		}
	}

	/**
	 * Create progress indicator
	 */
	createProgressIndicator(
		current: number,
		total: number,
		width: number = 40,
	): string {
		const percentage = Math.min(100, Math.max(0, (current / total) * 100));
		const filled = Math.round((percentage / 100) * width);
		const empty = width - filled;

		const bar = "█".repeat(filled) + "░".repeat(empty);
		return `[${bar}] ${percentage.toFixed(1)}% (${current}/${total})`;
	}

	/**
	 * Backward compatibility: format AnalysisResult using basic formatter
	 */
	formatLegacy(
		result: AnalysisResult | AnalysisResult[],
		format: string,
	): string {
		// This provides compatibility with the old formatter
		// In practice, you would migrate to use IntegratedAnalysisData
		const results = Array.isArray(result) ? result : [result];

		switch (format) {
			case "summary":
				return results
					.map((r) => {
						const deps = r.extractedData?.dependency?.dependencies?.length || 0;
						const exports = r.extractedData?.dependency?.exports?.length || 0;
						const time = r.performanceMetrics?.parseTime || 0;
						const status = r.errors?.length ? "FAIL" : "OK";
						const fileName =
							r.filePath?.split("/").pop() || r.filePath || "unknown";
						return `${fileName} | ${deps} deps, ${exports} exports | ${time}ms | ${status}`;
					})
					.join("\n");

			case "json":
				return JSON.stringify(result, null, 2);

			default:
				throw new Error(
					`Legacy format ${format} not supported. Please use IntegratedAnalysisData.`,
				);
		}
	}
}
