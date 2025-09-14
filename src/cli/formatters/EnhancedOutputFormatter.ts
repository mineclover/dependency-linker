/**
 * Enhanced Output Formatter
 * Provides additional formatting options for CLI output
 */

import {
	getDependencies,
	getError,
	getExports,
	getImports,
	getParseTime,
	isSuccessful,
} from "../../lib/AnalysisResultHelper";
import type { AnalysisResult } from "../../models/AnalysisResult";

export interface TableColumn {
	header: string;
	key: string;
	width?: number;
	align?: "left" | "center" | "right";
	formatter?: (value: any) => string;
}

export class EnhancedOutputFormatter {
	/**
	 * Format as a table
	 */
	formatAsTable(results: AnalysisResult[], columns?: TableColumn[]): string {
		if (!Array.isArray(results)) {
			results = [results];
		}

		if (results.length === 0) {
			return "No results to display";
		}

		// Default columns for analysis results
		const defaultColumns: TableColumn[] = [
			{ header: "File", key: "filePath", width: 40 },
			{ header: "Deps", key: "dependencyCount", width: 6, align: "right" },
			{ header: "Imports", key: "importCount", width: 8, align: "right" },
			{ header: "Exports", key: "exportCount", width: 8, align: "right" },
			{
				header: "Time",
				key: "analysisTime",
				width: 8,
				align: "right",
				formatter: (val) => `${val}ms`,
			},
			{
				header: "Status",
				key: "success",
				width: 8,
				formatter: (val) => (val ? "✓" : "✗"),
			},
		];

		const tableColumns = columns || defaultColumns;

		// Prepare data
		const rows = results.map((result) => ({
			filePath: this.truncatePath(result.filePath || "", 38),
			dependencyCount: getDependencies(result).length,
			importCount: getImports(result).length,
			exportCount: getExports(result).length,
			analysisTime: getParseTime(result),
			success: isSuccessful(result),
		}));

		return this.buildTable(tableColumns, rows);
	}

	/**
	 * Build ASCII table
	 */
	private buildTable(columns: TableColumn[], rows: any[]): string {
		const totalWidth =
			columns.reduce((sum, col) => sum + (col.width || 10), 0) +
			columns.length +
			1;
		const separator = "─".repeat(totalWidth);

		let output = `┌${separator}┐\n`;

		// Header
		const headerCells = columns.map((col) => {
			const width = col.width || 10;
			const text = col.header.padEnd(width).substring(0, width);
			return text;
		});
		output += `│ ${headerCells.join(" │ ")} │\n`;
		output += `├${separator}┤\n`;

		// Rows
		rows.forEach((row) => {
			const cells = columns.map((col) => {
				const width = col.width || 10;
				let value = row[col.key];

				if (col.formatter) {
					value = col.formatter(value);
				}

				const text = String(value || "");

				if (col.align === "right") {
					return text.padStart(width).substring(0, width);
				} else if (col.align === "center") {
					const padding = Math.max(0, width - text.length);
					const leftPad = Math.floor(padding / 2);
					const rightPad = padding - leftPad;
					return " ".repeat(leftPad) + text + " ".repeat(rightPad);
				} else {
					return text.padEnd(width).substring(0, width);
				}
			});
			output += `│ ${cells.join(" │ ")} │\n`;
		});

		output += `└${separator}┘`;
		return output;
	}

	/**
	 * Format as tree structure for dependencies
	 */
	formatAsTree(result: AnalysisResult): string {
		const dependencies = getDependencies(result);
		if (dependencies.length === 0) {
			return "No dependencies found";
		}

		let output = `${result.filePath || "File"}\n`;

		// Group dependencies by type
		const external = dependencies.filter((d) => d.type !== "relative");
		const internal = dependencies.filter((d) => d.type === "relative");

		if (external.length > 0) {
			output += "├── External Dependencies\n";
			external.forEach((dep, index) => {
				const isLast = index === external.length - 1 && internal.length === 0;
				const prefix = isLast ? "└──" : "├──";
				output += `│   ${prefix} ${dep.source}\n`;
			});
		}

		if (internal.length > 0) {
			const prefix = external.length > 0 ? "└──" : "└──";
			output += `${prefix} Internal Dependencies\n`;
			internal.forEach((dep, index) => {
				const isLast = index === internal.length - 1;
				const depPrefix = isLast ? "    └──" : "    ├──";
				output += `${depPrefix} ${dep.source}\n`;
			});
		}

		return output;
	}

	/**
	 * Format as detailed analysis report
	 */
	formatAsReport(result: AnalysisResult): string {
		let output = `Analysis Report\n`;
		output += `==============\n\n`;

		output += `File: ${result.filePath || "Unknown"}\n`;
		output += `Analysis Time: ${getParseTime(result)}ms\n`;
		output += `Status: ${isSuccessful(result) ? "Success" : "Failed"}\n`;

		const error = getError(result);
		if (error) {
			output += `Error: ${error.message}\n`;
		}

		output += `\n`;

		// Dependencies section
		const dependencies = getDependencies(result);
		if (dependencies.length > 0) {
			output += `Dependencies (${dependencies.length}):\n`;
			output += `${"-".repeat(20)}\n`;

			const external = dependencies.filter((d) => d.type !== "relative");
			const internal = dependencies.filter((d) => d.type === "relative");

			if (external.length > 0) {
				output += `\nExternal (${external.length}):\n`;
				external.forEach((dep) => {
					output += `  • ${dep.source}`;
					if (dep.type) {
						output += ` (${dep.type})`;
					}
					output += `\n`;
				});
			}

			if (internal.length > 0) {
				output += `\nInternal (${internal.length}):\n`;
				internal.forEach((dep) => {
					output += `  • ${dep.source}`;
					if (dep.type) {
						output += ` (${dep.type})`;
					}
					output += `\n`;
				});
			}
		}

		// Imports section
		const imports = getImports(result);
		if (imports.length > 0) {
			output += `\nImports (${imports.length}):\n`;
			output += `${"-".repeat(15)}\n`;
			imports.forEach((imp) => {
				output += `  • ${imp.source} (${imp.specifiers.map((s) => s.local).join(", ")})`;
				if (imp.source) {
					output += ` from "${imp.source}"`;
				}
				output += `\n`;
			});
		}

		// Exports section
		const exports = getExports(result);
		if (exports.length > 0) {
			output += `\nExports (${exports.length}):\n`;
			output += `${"-".repeat(15)}\n`;
			exports.forEach((exp) => {
				output += `  • ${exp.name} (${exp.type})`;
				if (exp.type) {
					output += ` (${exp.type})`;
				}
				output += `\n`;
			});
		}

		return output;
	}

	/**
	 * Format as minimal summary
	 */
	formatAsSummary(result: AnalysisResult): string {
		const deps = getDependencies(result).length;
		const imports = getImports(result).length;
		const exports = getExports(result).length;
		const time = getParseTime(result);
		const status = isSuccessful(result) ? "OK" : "FAIL";

		return (
			`${this.truncatePath(result.filePath || "", 30)} | ` +
			`${deps} deps, ${imports} imports, ${exports} exports | ` +
			`${time}ms | ${status}`
		);
	}

	/**
	 * Format for CSV export with proper escaping
	 */
	formatAsCSV(
		results: AnalysisResult[],
		includeHeader: boolean = true,
	): string {
		if (!Array.isArray(results)) {
			results = [results];
		}

		const lines: string[] = [];

		if (includeHeader) {
			lines.push(
				[
					"File Path",
					"Success",
					"Dependencies",
					"External Dependencies",
					"Internal Dependencies",
					"Imports",
					"Exports",
					"Analysis Time (ms)",
					"Error Message",
				]
					.map(this.escapeCSV)
					.join(","),
			);
		}

		results.forEach((result) => {
			const dependencies = getDependencies(result);
			const external = dependencies.filter((d) => d.type !== "relative").length;
			const internal = dependencies.filter((d) => d.type === "relative").length;
			const error = getError(result);

			lines.push(
				[
					result.filePath || "",
					isSuccessful(result) ? "TRUE" : "FALSE",
					dependencies.length,
					external,
					internal,
					getImports(result).length,
					getExports(result).length,
					getParseTime(result),
					error?.message || "",
				]
					.map((val) => this.escapeCSV(String(val)))
					.join(","),
			);
		});

		return lines.join("\n");
	}

	/**
	 * Format as JSON with proper structure
	 */
	formatAsJSON(
		results: AnalysisResult | AnalysisResult[],
		compact: boolean = false,
	): string {
		const indent = compact ? 0 : 2;
		return JSON.stringify(results, null, indent);
	}

	/**
	 * Escape CSV value
	 */
	private escapeCSV(value: string): string {
		if (value.includes(",") || value.includes('"') || value.includes("\n")) {
			return `"${value.replace(/"/g, '""')}"`;
		}
		return value;
	}

	/**
	 * Truncate file path for display
	 */
	private truncatePath(filePath: string, maxLength: number): string {
		if (filePath.length <= maxLength) {
			return filePath;
		}

		const parts = filePath.split("/");
		if (parts.length <= 2) {
			return "..." + filePath.substring(filePath.length - maxLength + 3);
		}

		// Try to keep the filename and some directory structure
		const filename = parts[parts.length - 1];
		const remaining = maxLength - filename.length - 3; // 3 for "..."

		if (remaining <= 0) {
			return "..." + filename.substring(filename.length - maxLength + 3);
		}

		let path = "";
		for (let i = 0; i < parts.length - 1; i++) {
			const part = parts[i];
			if (path.length + part.length + 1 <= remaining) {
				path += (path ? "/" : "") + part;
			} else {
				break;
			}
		}

		return path + "/.../" + filename;
	}

	/**
	 * Create progress bar
	 */
	createProgressBar(
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
	 * Format file size
	 */
	formatFileSize(bytes: number): string {
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
	 * Format duration
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
	 * Create aligned columns
	 */
	createColumns(
		data: Array<{ label: string; value: string }>,
		labelWidth: number = 20,
	): string {
		return data
			.map((item) => {
				const label = item.label.padEnd(labelWidth);
				return `${label}: ${item.value}`;
			})
			.join("\n");
	}
}
