import type { AnalysisResult } from "../../models/AnalysisResult";
import type { FileAnalysisRequest } from "../../models/FileAnalysisRequest";
import type { ValidationResult } from "../types/ParseTypes";

/**
 * Core interface for file analysis functionality
 * Defines the contract for analyzing TypeScript files and extracting dependencies
 */
export interface IFileAnalyzer {
	/**
	 * Analyzes a TypeScript file and returns detailed analysis results
	 * @param request - File analysis request with path and options
	 * @returns Promise resolving to analysis results
	 * @throws FileNotFoundError if file doesn't exist
	 * @throws InvalidFileTypeError if file is not TypeScript
	 * @throws ParseTimeoutError if parsing exceeds timeout
	 */
	analyzeFile(request: FileAnalysisRequest): Promise<AnalysisResult>;

	/**
	 * Validates if a file can be analyzed
	 * @param filePath - Path to the file to validate
	 * @returns Promise resolving to validation result
	 */
	validateFile(filePath: string): Promise<ValidationResult>;
}
