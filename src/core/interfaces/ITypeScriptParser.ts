import type { ParseOptions, ParseResult } from "../types/ParseTypes";

/**
 * Core interface for TypeScript parsing functionality
 * Defines the contract for parsing TypeScript source code and extracting AST information
 */
export interface ITypeScriptParser {
	/**
	 * Parses TypeScript source code and extracts AST information
	 * @param source - TypeScript source code as string
	 * @param options - Parse options including timeout and features
	 * @returns Promise resolving to parse result with AST data
	 * @throws ParseTimeoutError if parsing exceeds timeout
	 * @throws SyntaxError if source has invalid syntax
	 */
	parseSource(source: string, options?: ParseOptions): Promise<ParseResult>;

	/**
	 * Parses TypeScript file and extracts AST information
	 * @param filePath - Path to TypeScript file
	 * @param options - Parse options including timeout and features
	 * @returns Promise resolving to parse result with AST data
	 * @throws FileNotFoundError if file doesn't exist
	 * @throws ParseTimeoutError if parsing exceeds timeout
	 */
	parseFile(filePath: string, options?: ParseOptions): Promise<ParseResult>;
}
