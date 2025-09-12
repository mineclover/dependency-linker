import type { AnalysisResult } from "../../models/AnalysisResult";
import type { OutputFormat } from "../../models/FileAnalysisRequest";

/**
 * Core interface for output formatting functionality
 * Defines the contract for formatting analysis results according to specified formats
 */
export interface IOutputFormatter {
	/**
	 * Formats analysis result according to specified output format
	 * @param result - Analysis result to format
	 * @param format - Target output format (json, text, csv, etc.)
	 * @returns Formatted string representation
	 * @throws UnsupportedFormatError if format is not supported
	 */
	format(result: AnalysisResult, format: OutputFormat): string;

	/**
	 * Gets header information for specific format (e.g., CSV header)
	 * @param format - Output format
	 * @returns Header string or empty string if not applicable
	 */
	getFormatHeader(format: OutputFormat): string;
}
