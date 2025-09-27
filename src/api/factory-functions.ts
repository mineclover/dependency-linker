/**
 * Factory Functions for TypeScript File Analyzer
 * Simple function-based API for easy adoption
 */

import { type Dirent, promises as fsPromises, statSync } from "node:fs";
import {
	basename,
	dirname,
	extname,
	isAbsolute,
	join,
	relative,
	resolve,
	sep,
} from "node:path";
import { MarkdownLinkExtractor } from "../extractors/MarkdownLinkExtractor";
import { LinkDependencyInterpreter } from "../interpreters/LinkDependencyInterpreter";
import type { AnalysisResult } from "../models/AnalysisResult";
import { MarkdownParser } from "../parsers/MarkdownParser";
import { AnalysisEngine } from "../services/AnalysisEngine";
import { FileNotFoundError } from "./errors";
import { TypeScriptAnalyzer } from "./TypeScriptAnalyzer";
import type {
	AnalysisOptions,
	BatchAnalysisOptions,
	DirectoryOptions,
} from "./types";

// Singleton analyzer instance for factory functions
let sharedAnalyzer: TypeScriptAnalyzer | null = null;
let sharedMarkdownEngine: AnalysisEngine | null = null;

/**
 * Get or create shared analyzer instance
 */
function getAnalyzer(): TypeScriptAnalyzer {
	if (!sharedAnalyzer) {
		sharedAnalyzer = new TypeScriptAnalyzer({
			enableCache: true,
			cacheSize: 1000,
			defaultTimeout: 30000,
		});
	}
	return sharedAnalyzer;
}

/**
 * Reset the shared analyzer instance for test isolation
 * @internal Used for testing purposes only
 */
/**
 * Reset the shared analyzer instance for test isolation
 * @internal Used for testing purposes only
 */
export function resetSharedAnalyzer(): void {
	if (sharedAnalyzer) {
		// Clear caches but don't destroy the instance
		sharedAnalyzer.clearCache();
		// Note: We keep the analyzer instance alive to avoid recreation overhead
		// The cache clearing should be sufficient for test isolation
	}
}

/**
 * Get or create shared markdown analysis engine
 */
function getMarkdownEngine(): AnalysisEngine {
	if (!sharedMarkdownEngine) {
		sharedMarkdownEngine = new AnalysisEngine();

		// Register Markdown components via registries
		sharedMarkdownEngine.registerExtractor(
			"markdown-links",
			new MarkdownLinkExtractor({
				includeImages: true,
				includeExternalLinks: true,
				includeInternalLinks: true,
				resolveRelativePaths: true,
				followReferenceLinks: true,
			}),
		);

		sharedMarkdownEngine.registerInterpreter(
			"link-analysis",
			new LinkDependencyInterpreter({
				validateFiles: true,
				securityChecks: true,
				performanceChecks: true,
				accessibilityChecks: true,
			}),
		);
	}
	return sharedMarkdownEngine;
}

/**
 * Analyze a single TypeScript file
 * Simple function interface for file analysis
 *
 * @param filePath Path to the TypeScript file
 * @param options Optional analysis options
 * @returns Promise resolving to analysis result
 *
 * @example
 * ```typescript
 * const result = await analyzeTypeScriptFile('./src/index.ts');
 * console.log(result.dependencies);
 * ```
 */
export async function analyzeTypeScriptFile(
	filePath: string,
	options?: AnalysisOptions,
): Promise<AnalysisResult> {
	const analyzer = getAnalyzer();
	return analyzer.analyzeFile(filePath, options);
}

/**
 * Analyze a single Markdown file
 * Extracts link dependencies and performs comprehensive analysis
 *
 * @param filePath Path to the Markdown file
 * @param options Optional analysis options
 * @returns Promise resolving to analysis result
 *
 * @example
 * ```typescript
 * const result = await analyzeMarkdownFile('./docs/README.md');
 * console.log(result.extractedData['markdown-links']); // Link dependencies
 * console.log(result.interpretedData['link-analysis']); // Link analysis results
 * ```
 */
export async function analyzeMarkdownFile(
	filePath: string,
	options?: AnalysisOptions,
): Promise<AnalysisResult> {
	const startTime = Date.now();

	try {
		// Import path utilities
		const { resolveAnalysisPath } = await import("../utils/PathUtils");
		const { createPathInfo } = await import("../models/PathInfo");

		// Create Markdown parser with standard ParserOptions
		const parser = new MarkdownParser({
			maxFileSize: 1024 * 1024, // 1MB
			timeout: 5000,
			enableErrorRecovery: true,
			includeLocations: true,
			encoding: "utf-8",
		});

		// Create extractors and interpreters
		const linkExtractor = new MarkdownLinkExtractor({
			includeImages: true,
			includeExternalLinks: true,
			includeInternalLinks: true,
			resolveRelativePaths: true,
			followReferenceLinks: true,
		});

		const linkInterpreter = new LinkDependencyInterpreter({
			validateFiles: true,
			checkExternalLinks: true,
			securityChecks: true,
			performanceChecks: true,
			accessibilityChecks: true,
		});

		// Parse the markdown file
		const parseResult = await parser.parse(filePath);

		// Extract link dependencies
		const linkDependencies = linkExtractor.extract(parseResult.ast, filePath);

		// Interpret the dependencies
		const linkAnalysis = linkInterpreter.interpret(linkDependencies, {
			filePath,
			language: "markdown",
			metadata: {},
			timestamp: new Date(),
		});

		const totalTime = Date.now() - startTime;

		// Resolve absolute path for consistent AnalysisResult
		const resolvedPath = resolveAnalysisPath(filePath);

		// Create comprehensive path information
		const pathInfo = createPathInfo(filePath);

		// Return in AnalysisResult format
		return {
			filePath: resolvedPath, // Legacy field for backward compatibility
			pathInfo,
			language: "markdown",
			extractedData: {
				"markdown-links": linkDependencies,
				"markdown-content": {
					ast: parseResult.ast,
					metadata: parseResult.metadata,
				},
			},
			interpretedData: {
				"link-analysis": linkAnalysis,
			},
			performanceMetrics: {
				parseTime: parseResult.parseTime,
				extractionTime: 10, // Estimated extraction time
				interpretationTime: 15, // Estimated interpretation time
				totalTime,
				memoryUsage: process.memoryUsage().heapUsed,
			},
			errors: parseResult.errors.map((error) => ({
				type: "ParseError",
				message: error.message,
				severity: "error",
				source: "parser",
				context: {
					operation: "parsing",
					details: { location: error.location },
				},
				timestamp: new Date(),
				id: `parse-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			})),
			metadata: {
				timestamp: new Date(),
				version: "1.0.0",
				config: options || {},
				fileSize: statSync(resolvedPath).size,
				extractorsUsed: ["MarkdownLinkExtractor"],
				interpretersUsed: ["LinkDependencyInterpreter"],
				fromCache: parseResult.cacheHit,
			},
		};
	} catch (error) {
		const totalTime = Date.now() - startTime;

		// Import path utilities for error case too
		let resolvedPath: string;
		let pathInfo: any;
		try {
			const { resolveAnalysisPath } = await import("../utils/PathUtils");
			const { createPathInfo } = await import("../models/PathInfo");
			resolvedPath = resolveAnalysisPath(filePath);
			pathInfo = createPathInfo(filePath);
		} catch {
			// Fallback to basic resolution if utils import fails
			resolvedPath = resolve(filePath);
			pathInfo = {
				input: filePath,
				absolute: resolvedPath,
				relative: relative(process.cwd(), resolvedPath),
				directory: dirname(resolvedPath),
				relativeDirectory: dirname(relative(process.cwd(), resolvedPath)),
				fileName: basename(resolvedPath),
				baseName: basename(resolvedPath, extname(resolvedPath)),
				extension: extname(resolvedPath),
				projectRoot: process.cwd(),
				isWithinProject: !relative(process.cwd(), resolvedPath).startsWith(
					"..",
				),
				depth: 0,
				separator: sep,
				wasAbsolute: isAbsolute(filePath),
			};
		}

		return {
			filePath: resolvedPath, // Legacy field for backward compatibility
			pathInfo,
			language: "markdown",
			extractedData: {},
			interpretedData: {},
			performanceMetrics: {
				parseTime: 0,
				extractionTime: 0,
				interpretationTime: 0,
				totalTime,
				memoryUsage: process.memoryUsage().heapUsed,
			},
			errors: [
				{
					type: "InternalError",
					message: error instanceof Error ? error.message : "Unknown error",
					severity: "error",
					source: "engine",
					context: {
						operation: "analysis",
						details: { filePath },
					},
					timestamp: new Date(),
					id: `analysis-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				},
			],
			metadata: {
				timestamp: new Date(),
				version: "1.0.0",
				config: options || {},
				fileSize: 0,
				extractorsUsed: [],
				interpretersUsed: [],
				fromCache: false,
			},
		};
	}
}

/**
 * Extract only dependency names from a TypeScript file
 * Convenience function for quick dependency extraction
 *
 * @param filePath Path to the TypeScript file
 * @returns Promise resolving to array of dependency names
 *
 * @example
 * ```typescript
 * const deps = await extractDependencies('./src/index.ts');
 * console.log(deps); // ['react', 'lodash', './utils']
 * ```
 */
export async function extractDependencies(filePath: string): Promise<string[]> {
	const analyzer = getAnalyzer();
	return analyzer.extractDependencies(filePath);
}

/**
 * Extract only link URLs from a Markdown file
 * Convenience function for quick link extraction
 *
 * @param filePath Path to the Markdown file
 * @returns Promise resolving to array of link URLs
 *
 * @example
 * ```typescript
 * const links = await extractMarkdownLinks('./docs/README.md');
 * console.log(links); // ['https://github.com/user/repo', './docs/api.md']
 * ```
 */
export async function extractMarkdownLinks(
	filePath: string,
): Promise<string[]> {
	const result = await analyzeMarkdownFile(filePath);
	const linkData = result.extractedData["markdown-links"];

	if (!Array.isArray(linkData)) {
		return [];
	}

	return linkData.map((link: any) => link.source);
}

/**
 * Analyze multiple TypeScript files in batch
 * Efficiently processes multiple files with concurrency control
 *
 * @param filePaths Array of file paths to analyze
 * @param options Optional batch analysis options
 * @returns Promise resolving to array of analysis results
 *
 * @example
 * ```typescript
 * const results = await getBatchAnalysis([
 *   './src/index.ts',
 *   './src/utils.ts'
 * ], { concurrency: 3 });
 *
 * results.forEach(result => {
 *   if (result.success) {
 *     console.log(`${result.filePath}: ${result.dependencies.length} dependencies`);
 *   }
 * });
 * ```
 */
export async function getBatchAnalysis(
	filePaths: string[],
	options?: BatchAnalysisOptions,
): Promise<AnalysisResult[]> {
	const analyzer = getAnalyzer();
	const batchResult = await analyzer.analyzeFiles(filePaths, options);
	return batchResult.results;
}

/**
 * Analyze multiple Markdown files in batch
 * Efficiently processes multiple Markdown files with concurrency control
 *
 * @param filePaths Array of Markdown file paths to analyze
 * @param options Optional batch analysis options
 * @returns Promise resolving to array of analysis results
 *
 * @example
 * ```typescript
 * const results = await getBatchMarkdownAnalysis([
 *   './docs/README.md',
 *   './docs/api.md'
 * ], { concurrency: 3 });
 *
 * results.forEach(result => {
 *   const linkAnalysis = result.interpretedData['link-analysis'];
 *   console.log(`${result.filePath}: ${linkAnalysis.summary.totalLinks} links`);
 * });
 * ```
 */
export async function getBatchMarkdownAnalysis(
	filePaths: string[],
	options?: BatchAnalysisOptions,
): Promise<AnalysisResult[]> {
	const {
		concurrency = 5,
		continueOnError = true,
		onProgress,
		onFileError,
	} = options || {};

	const results: AnalysisResult[] = [];
	const chunks = [];

	// Create chunks for concurrent processing
	for (let i = 0; i < filePaths.length; i += concurrency) {
		chunks.push(filePaths.slice(i, i + concurrency));
	}

	let completed = 0;

	for (const chunk of chunks) {
		const promises = chunk.map(async (filePath) => {
			try {
				const result = await analyzeMarkdownFile(filePath);
				completed++;
				onProgress?.(completed, filePaths.length);
				return result;
			} catch (error) {
				const { createPathInfo } = require("../models/PathInfo");
				const errorResult = {
					filePath,
					pathInfo: createPathInfo(filePath),
					language: "markdown",
					extractedData: {},
					interpretedData: {},
					performanceMetrics: {
						parseTime: 0,
						extractionTime: 0,
						interpretationTime: 0,
						totalTime: 0,
						memoryUsage: 0,
					},
					errors: [
						{
							type: "InternalError" as const,
							message: error instanceof Error ? error.message : "Unknown error",
							severity: "error" as const,
							source: "engine" as const,
							context: {
								operation: "batch-analysis",
								input: filePath,
							},
							timestamp: new Date(),
							id: `batch-error-${Date.now()}`,
						},
					],
					metadata: {
						timestamp: new Date(),
						version: "2.0.0",
						config: {},
					},
				};

				completed++;
				onProgress?.(completed, filePaths.length);
				onFileError?.(
					filePath,
					error instanceof Error ? error : new Error("Unknown error"),
				);

				if (continueOnError) {
					return errorResult;
				} else {
					throw error;
				}
			}
		});

		const chunkResults = await Promise.all(promises);
		results.push(...chunkResults);
	}

	return results;
}

/**
 * Analyze all TypeScript files in a directory
 * Recursively scans directory and analyzes all TypeScript files
 *
 * @param dirPath Directory path to scan
 * @param options Directory scanning and analysis options
 * @returns Promise resolving to array of analysis results
 *
 * @example
 * ```typescript
 * const results = await analyzeDirectory('./src', {
 *   extensions: ['.ts', '.tsx'],
 *   maxDepth: 3,
 *   ignorePatterns: ['**\/node_modules/**', '**\/*.test.ts']
 * });
 *
 * console.log(`Analyzed ${results.length} files`);
 * ```
 */
export async function analyzeDirectory(
	dirPath: string,
	options?: DirectoryOptions & { includeMarkdown?: boolean },
): Promise<AnalysisResult[]> {
	const { includeMarkdown = false, ...directoryOptions } = options || {};

	// Collect TypeScript files
	const tsFiles = await collectTypeScriptFiles(dirPath, directoryOptions);

	// Collect Markdown files if requested
	let mdFiles: string[] = [];
	if (includeMarkdown) {
		mdFiles = await collectMarkdownFiles(dirPath, directoryOptions);
	}

	const allFiles = [...tsFiles, ...mdFiles];

	if (allFiles.length === 0) {
		return [];
	}

	// Convert directory options to batch options
	const batchOptions: BatchAnalysisOptions = {
		concurrency: 5,
		continueOnError: true,
	};

	const results: AnalysisResult[] = [];

	// Analyze TypeScript files
	if (tsFiles.length > 0) {
		const analyzer = getAnalyzer();
		const batchResult = await analyzer.analyzeFiles(tsFiles, batchOptions);
		results.push(...batchResult.results);
	}

	// Analyze Markdown files
	if (mdFiles.length > 0) {
		const markdownResults = await getBatchMarkdownAnalysis(
			mdFiles,
			batchOptions,
		);
		results.push(...markdownResults);
	}

	return results;
}

/**
 * Collect TypeScript files from directory based on options
 */
async function collectTypeScriptFiles(
	dirPath: string,
	options?: DirectoryOptions,
): Promise<string[]> {
	const {
		extensions = [".ts", ".tsx", ".d.ts"],
		maxDepth = 10,
		followSymlinks = false,
		ignorePatterns = ["**/node_modules/**", "**/dist/**", "**/coverage/**"],
	} = options || {};

	const files: string[] = [];

	try {
		await collectFilesRecursive(
			dirPath,
			files,
			extensions,
			maxDepth,
			0,
			followSymlinks,
			ignorePatterns,
		);
	} catch (error) {
		if (error instanceof Error && error.message.includes("ENOENT")) {
			throw new FileNotFoundError(dirPath, error);
		}
		throw error;
	}

	return files.sort();
}

/**
 * Collect Markdown files from directory based on options
 */
async function collectMarkdownFiles(
	dirPath: string,
	options?: DirectoryOptions,
): Promise<string[]> {
	const {
		extensions = [".md", ".markdown", ".mdown", ".mkd"],
		maxDepth = 10,
		followSymlinks = false,
		ignorePatterns = ["**/node_modules/**", "**/dist/**", "**/coverage/**"],
	} = options || {};

	const files: string[] = [];

	try {
		await collectFilesRecursive(
			dirPath,
			files,
			extensions,
			maxDepth,
			0,
			followSymlinks,
			ignorePatterns,
		);
	} catch (error) {
		if (error instanceof Error && error.message.includes("ENOENT")) {
			throw new FileNotFoundError(dirPath, error);
		}
		throw error;
	}

	return files.sort();
}

/**
 * Recursively collect files matching criteria
 */
async function collectFilesRecursive(
	dirPath: string,
	files: string[],
	extensions: string[],
	maxDepth: number,
	currentDepth: number,
	followSymlinks: boolean,
	ignorePatterns: string[],
): Promise<void> {
	if (currentDepth >= maxDepth) {
		return;
	}

	let entries: Dirent[];
	try {
		entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
	} catch (_error) {
		// Skip directories that can't be read
		return;
	}

	for (const entry of entries) {
		const fullPath = join(dirPath, entry.name);
		const relativePath = relative(process.cwd(), fullPath);

		// Check ignore patterns
		if (shouldIgnore(relativePath, ignorePatterns)) {
			continue;
		}

		if (entry.isFile()) {
			// Check if file has supported extension
			if (extensions.some((ext) => entry.name.endsWith(ext))) {
				files.push(fullPath);
			}
		} else if (
			entry.isDirectory() ||
			(followSymlinks && entry.isSymbolicLink())
		) {
			// Recurse into subdirectory
			await collectFilesRecursive(
				fullPath,
				files,
				extensions,
				maxDepth,
				currentDepth + 1,
				followSymlinks,
				ignorePatterns,
			);
		}
	}
}

/**
 * Check if path should be ignored based on patterns
 */
function shouldIgnore(filePath: string, ignorePatterns: string[]): boolean {
	const normalizedPath = filePath.replace(/\\/g, "/");

	return ignorePatterns.some((pattern) => {
		// Simple glob pattern matching
		if (pattern.includes("**")) {
			const regex = pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
			return new RegExp(`^${regex}$`).test(normalizedPath);
		} else if (pattern.includes("*")) {
			const regex = pattern.replace(/\*/g, "[^/]*");
			return new RegExp(`^${regex}$`).test(normalizedPath);
		} else {
			return normalizedPath.includes(pattern);
		}
	});
}

/**
 * Clear all shared analyzer caches
 * Useful for testing or when memory usage needs to be controlled
 */
export function clearFactoryCache(): void {
	if (sharedAnalyzer) {
		sharedAnalyzer.clearCache();
	}
	if (sharedMarkdownEngine) {
		// Clear markdown engine cache if available
		const cacheManager = (sharedMarkdownEngine as any).cacheManager;
		if (cacheManager && typeof cacheManager.clear === "function") {
			cacheManager.clear();
		}
	}
}

/**
 * Reset all shared analyzer instances
 * Creates new analyzer instances with default settings
 */
export function resetFactoryAnalyzers(): void {
	sharedAnalyzer = null;
	sharedMarkdownEngine = null;
}

/**
 * Get the current shared TypeScript analyzer instance
 * Mainly for testing and debugging purposes
 */
export function getFactoryAnalyzer(): TypeScriptAnalyzer {
	return getAnalyzer();
}

/**
 * Get the current shared Markdown analysis engine
 * Mainly for testing and debugging purposes
 */
export function getFactoryMarkdownEngine(): AnalysisEngine {
	return getMarkdownEngine();
}

// Maintain backward compatibility
export const resetFactoryAnalyzer = resetFactoryAnalyzers;
