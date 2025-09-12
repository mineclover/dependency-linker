import type { DependencyInfo } from "../../models/DependencyInfo";
import type { ExportInfo } from "../../models/ExportInfo";
import type { ImportInfo } from "../../models/ImportInfo";

/**
 * Options for TypeScript parsing operations
 */
export interface ParseOptions {
	/** Maximum time in milliseconds for parsing (default: 5000) */
	timeout?: number;

	/** Include source location information in results (default: false) */
	includeSourceLocations?: boolean;

	/** Include type-only imports in results (default: true) */
	includeTypeImports?: boolean;
}

/**
 * Result of TypeScript parsing operations
 */
export interface ParseResult {
	/** Array of all dependencies found in the file */
	dependencies: DependencyInfo[];

	/** Array of all import statements */
	imports: ImportInfo[];

	/** Array of all export statements */
	exports: ExportInfo[];

	/** Whether parsing encountered errors */
	hasParseErrors: boolean;
}

/**
 * Validation result for file analysis
 */
export interface ValidationResult {
	/** Whether validation passed */
	isValid: boolean;

	/** File path that was validated */
	filePath: string;

	/** Whether file can be analyzed */
	canAnalyze: boolean;

	/** Array of validation error messages */
	errors: string[];

	/** File information if valid */
	fileInfo?:
		| {
				size: number;
				extension: string;
				lastModified: Date;
		  }
		| undefined;
}
