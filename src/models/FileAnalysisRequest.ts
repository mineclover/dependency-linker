/**
 * File Analysis Request Model
 * Represents a request to analyze a single TypeScript file
 */

export type OutputFormat =
	| "json"
	| "text"
	| "compact"
	| "summary"
	| "csv"
	| "deps-only"
	| "table"
	| "tree"
	| "minimal"
	| "report";

export interface AnalysisOptions {
	/** Output format */
	format: OutputFormat;
	/** Include source location information */
	includeSources: boolean;
	/** Maximum time for parsing in milliseconds */
	parseTimeout: number;
}

export interface FileAnalysisRequest {
	/** Absolute or relative path to the TypeScript file */
	filePath: string;
	/** Optional configuration for analysis */
	options?: Partial<AnalysisOptions>;
}

/**
 * Default analysis options
 */
export const DEFAULT_ANALYSIS_OPTIONS: AnalysisOptions = {
	format: "json",
	includeSources: false,
	parseTimeout: 5000,
};

/**
 * Validates a file analysis request
 * @param request The request to validate
 * @returns Validation result with error messages if invalid
 */
export function validateFileAnalysisRequest(request: FileAnalysisRequest): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (!request.filePath || typeof request.filePath !== "string") {
		errors.push("filePath is required and must be a string");
	} else if (request.filePath.trim().length === 0) {
		errors.push("filePath cannot be empty");
	}

	if (request.options) {
		const { format, includeSources, parseTimeout } = request.options;

		if (
			format !== undefined &&
			![
				"json",
				"text",
				"compact",
				"summary",
				"csv",
				"deps-only",
				"table",
			].includes(format)
		) {
			errors.push(
				"format must be one of: json, text, compact, summary, csv, deps-only, table",
			);
		}

		if (includeSources !== undefined && typeof includeSources !== "boolean") {
			errors.push("includeSources must be a boolean");
		}

		if (parseTimeout !== undefined) {
			if (typeof parseTimeout !== "number" || parseTimeout <= 0) {
				errors.push("parseTimeout must be a positive number");
			}
			if (parseTimeout > 60000) {
				errors.push("parseTimeout cannot exceed 60 seconds");
			}
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Normalizes analysis options by filling in defaults
 * @param options Partial options to normalize
 * @returns Complete options with defaults applied
 */
export function normalizeAnalysisOptions(
	options?: Partial<AnalysisOptions>,
): AnalysisOptions {
	return {
		format: options?.format ?? DEFAULT_ANALYSIS_OPTIONS.format,
		includeSources:
			options?.includeSources ?? DEFAULT_ANALYSIS_OPTIONS.includeSources,
		parseTimeout:
			options?.parseTimeout ?? DEFAULT_ANALYSIS_OPTIONS.parseTimeout,
	};
}

/**
 * Checks if a file path appears to be a TypeScript file
 * @param filePath The file path to check
 * @returns True if the file extension suggests TypeScript
 */
export function isTypeScriptFile(filePath: string): boolean {
	const validExtensions = [".ts", ".tsx"];
	return validExtensions.some((ext) => filePath.toLowerCase().endsWith(ext));
}
