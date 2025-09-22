/**
 * Cross-Platform Path Utilities
 * Handles path normalization, validation, and platform-specific operations
 */

import * as path from "node:path";
import type { Logger } from "../api/types";
import { createLogger } from "./logger";

const logger: Logger = createLogger("PathUtils");

/**
 * Normalize path for cross-platform compatibility
 * @param inputPath Path to normalize
 * @param targetPlatform Target platform (defaults to current)
 * @returns Normalized path
 */
export function normalizePath(
	inputPath: string,
	targetPlatform?: NodeJS.Platform,
): string {
	if (!inputPath || typeof inputPath !== "string") {
		return "";
	}

	const platform = targetPlatform || process.platform;

	// Handle empty or root paths
	if (inputPath.trim() === "") {
		return "";
	}

	// Handle relative path indicators
	if (inputPath === "." || inputPath === "./") {
		return ".";
	}

	if (inputPath === ".." || inputPath === "../") {
		return "..";
	}

	let normalized = inputPath;

	// Platform-specific normalization
	switch (platform) {
		case "win32":
			normalized = normalizeWindowsPath(normalized);
			break;
		case "linux":
		case "darwin":
		case "freebsd":
		case "openbsd":
		case "sunos":
		case "aix":
			normalized = normalizePosixPath(normalized);
			break;
		default:
			// Default to POSIX-style for unknown platforms
			normalized = normalizePosixPath(normalized);
			break;
	}

	// Apply standard Node.js path normalization
	try {
		normalized = path.normalize(normalized);
	} catch (error) {
		logger.warn(`Path normalization failed for: ${inputPath}`, error);
		return inputPath; // Return original if normalization fails
	}

	// Handle special characters and encoding
	normalized = handleSpecialCharacters(normalized, platform);

	// Resolve Unicode normalization
	normalized = normalizeUnicode(normalized);

	return normalized;
}

/**
 * Normalize Windows-specific path issues
 * @param inputPath Path to normalize
 * @returns Windows-normalized path
 */
function normalizeWindowsPath(inputPath: string): string {
	let normalized = inputPath;

	// Convert forward slashes to backslashes
	normalized = normalized.replace(/\//g, "\\");

	// Handle UNC paths
	if (normalized.startsWith("\\\\")) {
		// Preserve UNC path format
		return normalized;
	}

	// Handle drive letters
	if (/^[a-zA-Z]:\\/.test(normalized)) {
		// Ensure drive letter is uppercase
		normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
	}

	// Handle long path names (>260 chars)
	if (normalized.length > 260 && !normalized.startsWith("\\\\?\\")) {
		logger.warn(
			`Long path detected (${normalized.length} chars): ${normalized.substring(0, 50)}...`,
		);
		// Could prepend \\?\ for long path support, but this may cause compatibility issues
	}

	// Remove multiple consecutive backslashes (except for UNC)
	normalized = normalized.replace(/\\{2,}/g, "\\");

	// Handle trailing backslashes
	if (normalized.length > 3 && normalized.endsWith("\\")) {
		normalized = normalized.slice(0, -1);
	}

	return normalized;
}

/**
 * Normalize POSIX-style paths
 * @param inputPath Path to normalize
 * @returns POSIX-normalized path
 */
function normalizePosixPath(inputPath: string): string {
	let normalized = inputPath;

	// Convert backslashes to forward slashes
	normalized = normalized.replace(/\\/g, "/");

	// Remove multiple consecutive slashes
	normalized = normalized.replace(/\/+/g, "/");

	// Handle trailing slashes (preserve for directories if intended)
	if (normalized.length > 1 && normalized.endsWith("/")) {
		// Keep trailing slash for explicit directory indication
		// normalized = normalized.slice(0, -1);
	}

	return normalized;
}

/**
 * Handle special characters in paths
 * @param inputPath Path to process
 * @param platform Target platform
 * @returns Path with special characters handled
 */
function handleSpecialCharacters(
	inputPath: string,
	platform: NodeJS.Platform,
): string {
	let processed = inputPath;

	// Platform-specific special character handling
	switch (platform) {
		case "win32": {
			// Windows forbidden characters: < > : " | ? *
			// Also handle control characters (0-31)
			processed = processed.replace(/[<>:"|?*]/g, "_");
			// Replace control characters separately
			processed = processed.replace(/./g, (char) =>
				char.charCodeAt(0) <= 31 ? "_" : char,
			);

			// Handle reserved names
			const windowsReserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
			if (windowsReserved.test(path.basename(processed))) {
				logger.warn(
					`Windows reserved name detected: ${path.basename(processed)}`,
				);
			}
			break;
		}

		default:
			// POSIX systems - mainly handle null bytes
			processed = processed.replace(/./g, (char) =>
				char.charCodeAt(0) === 0 ? "_" : char,
			);
			break;
	}

	return processed;
}

/**
 * Normalize Unicode characters in path
 * @param inputPath Path to normalize
 * @returns Unicode-normalized path
 */
function normalizeUnicode(inputPath: string): string {
	try {
		// Use NFC (Canonical Composition) normalization
		// This combines characters where possible (é instead of e + ´)
		return inputPath.normalize("NFC");
	} catch (error) {
		logger.warn(`Unicode normalization failed for path: ${inputPath}`, error);
		return inputPath;
	}
}

/**
 * Resolve relative path components (.. and .)
 * @param inputPath Path to resolve
 * @returns Resolved path
 */
export function resolvePath(inputPath: string, basePath?: string): string {
	try {
		if (basePath) {
			return path.resolve(basePath, inputPath);
		}
		return path.resolve(inputPath);
	} catch (error) {
		logger.error(`Path resolution failed: ${inputPath}`, error);
		return inputPath;
	}
}

/**
 * Resolve path for AnalysisResult, ensuring consistent absolute path format
 * 
 * @param inputPath - Input file path (relative or absolute)
 * @param projectRoot - Optional project root directory (defaults to process.cwd())
 * @returns Normalized absolute path for AnalysisResult
 * 
 * @example
 * ```typescript
 * const resultPath = resolveAnalysisPath('./src/index.ts');
 * // Returns: '/Users/user/project/src/index.ts'
 * 
 * const resultPath = resolveAnalysisPath('../other/file.ts', '/Users/user/project/src');
 * // Returns: '/Users/user/project/other/file.ts'
 * ```
 */
export function resolveAnalysisPath(inputPath: string, projectRoot?: string): string {
	try {
		const basePath = projectRoot || process.cwd();
		
		// If already absolute, just normalize it
		if (path.isAbsolute(inputPath)) {
			return normalizePath(inputPath);
		}
		
		// Resolve relative path against project root
		const resolved = path.resolve(basePath, inputPath);
		return normalizePath(resolved);
	} catch (error) {
		logger.error(`Analysis path resolution failed: ${inputPath}`, error);
		// Fallback to basic resolution
		return normalizePath(path.resolve(inputPath));
	}
}

/**
 * Convert absolute path back to project-relative path for display purposes
 * 
 * @param absolutePath - Absolute file path
 * @param projectRoot - Project root directory (defaults to process.cwd())
 * @returns Relative path from project root
 * 
 * @example
 * ```typescript
 * const relativePath = toProjectRelativePath('/Users/user/project/src/index.ts');
 * // Returns: 'src/index.ts'
 * ```
 */
export function toProjectRelativePath(absolutePath: string, projectRoot?: string): string {
	try {
		const basePath = projectRoot || process.cwd();
		const relative = path.relative(basePath, absolutePath);
		
		// If the path goes outside project root, return the absolute path
		if (relative.startsWith('..')) {
			return absolutePath;
		}
		
		return normalizePath(relative);
	} catch (error) {
		logger.error(`Project relative path conversion failed: ${absolutePath}`, error);
		return absolutePath;
	}
}

/**
 * Validate and resolve path for AnalysisResult with additional checks
 * 
 * @param inputPath - Input file path
 * @param options - Path resolution options
 * @returns Resolved path information
 * 
 * @example
 * ```typescript
 * const pathInfo = validateAndResolveAnalysisPath('./src/index.ts', {
 *   mustExist: true,
 *   allowedExtensions: ['.ts', '.js']
 * });
 * 
 * if (pathInfo.isValid) {
 *   console.log(`Resolved: ${pathInfo.absolutePath}`);
 *   console.log(`Relative: ${pathInfo.relativePath}`);
 * }
 * ```
 */
export function validateAndResolveAnalysisPath(
	inputPath: string,
	options?: {
		projectRoot?: string;
		mustExist?: boolean;
		allowedExtensions?: string[];
		maxLength?: number;
	}
): {
	isValid: boolean;
	absolutePath: string;
	relativePath: string;
	error?: string;
	exists?: boolean;
	extension?: string;
} {
	const {
		projectRoot,
		mustExist = false,
		allowedExtensions,
		maxLength = 1000
	} = options || {};

	try {
		// Basic validation
		if (!inputPath || typeof inputPath !== 'string') {
			return {
				isValid: false,
				absolutePath: '',
				relativePath: '',
				error: 'Invalid input path'
			};
		}

		if (inputPath.length > maxLength) {
			return {
				isValid: false,
				absolutePath: inputPath,
				relativePath: inputPath,
				error: `Path too long (${inputPath.length} > ${maxLength})`
			};
		}

		// Path resolution
		const absolutePath = resolveAnalysisPath(inputPath, projectRoot);
		const relativePath = toProjectRelativePath(absolutePath, projectRoot);
		const extension = path.extname(absolutePath);

		// Extension validation
		if (allowedExtensions && allowedExtensions.length > 0) {
			if (!allowedExtensions.includes(extension)) {
				return {
					isValid: false,
					absolutePath,
					relativePath,
					extension,
					error: `Extension '${extension}' not allowed. Allowed: ${allowedExtensions.join(', ')}`
				};
			}
		}

		// Existence check
		let exists: boolean | undefined;
		if (mustExist) {
			try {
				const fs = require('node:fs');
				exists = fs.existsSync(absolutePath);
				if (!exists) {
					return {
						isValid: false,
						absolutePath,
						relativePath,
						extension,
						exists,
						error: `File does not exist: ${absolutePath}`
					};
				}
			} catch (fsError) {
				return {
					isValid: false,
					absolutePath,
					relativePath,
					extension,
					error: `File existence check failed: ${fsError instanceof Error ? fsError.message : 'Unknown error'}`
				};
			}
		}

		return {
			isValid: true,
			absolutePath,
			relativePath,
			extension,
			exists
		};

	} catch (error) {
		return {
			isValid: false,
			absolutePath: inputPath,
			relativePath: inputPath,
			error: `Path validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
		};
	}
}

/**
 * Batch resolve multiple paths for AnalysisResult
 * 
 * @param inputPaths - Array of input file paths
 * @param projectRoot - Optional project root directory
 * @returns Array of resolved path information
 * 
 * @example
 * ```typescript
 * const resolved = batchResolveAnalysisPaths([
 *   './src/index.ts',
 *   './docs/README.md',
 *   '../other/file.js'
 * ]);
 * 
 * resolved.forEach(pathInfo => {
 *   if (pathInfo.isValid) {
 *     console.log(`${pathInfo.relativePath} -> ${pathInfo.absolutePath}`);
 *   } else {
 *     console.error(`Error: ${pathInfo.error}`);
 *   }
 * });
 * ```
 */
export function batchResolveAnalysisPaths(
	inputPaths: string[],
	projectRoot?: string
): Array<{
	input: string;
	isValid: boolean;
	absolutePath: string;
	relativePath: string;
	error?: string;
}> {
	return inputPaths.map(inputPath => {
		try {
			const absolutePath = resolveAnalysisPath(inputPath, projectRoot);
			const relativePath = toProjectRelativePath(absolutePath, projectRoot);
			
			return {
				input: inputPath,
				isValid: true,
				absolutePath,
				relativePath
			};
		} catch (error) {
			return {
				input: inputPath,
				isValid: false,
				absolutePath: inputPath,
				relativePath: inputPath,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	});
}

/**
 * Check if path is absolute
 * @param inputPath Path to check
 * @returns true if path is absolute
 */
export function isAbsolute(inputPath: string): boolean {
	return path.isAbsolute(inputPath);
}

/**
 * Convert path to use forward slashes (useful for URLs and cross-platform compatibility)
 * @param inputPath Path to convert
 * @returns Path with forward slashes
 */
export function toForwardSlashes(inputPath: string): string {
	return inputPath.replace(/\\/g, "/");
}

/**
 * Convert path to use platform-specific separators
 * @param inputPath Path to convert
 * @param targetPlatform Target platform
 * @returns Path with platform-specific separators
 */
export function toPlatformSeparators(
	inputPath: string,
	targetPlatform?: NodeJS.Platform,
): string {
	const platform = targetPlatform || process.platform;

	if (platform === "win32") {
		return inputPath.replace(/\//g, "\\");
	} else {
		return inputPath.replace(/\\/g, "/");
	}
}

/**
 * Get safe filename by removing/replacing invalid characters
 * @param filename Filename to sanitize
 * @param platform Target platform
 * @returns Safe filename
 */
export function getSafeFilename(
	filename: string,
	platform?: NodeJS.Platform,
): string {
	const targetPlatform = platform || process.platform;
	let safe = filename;

	// Remove leading/trailing spaces and dots
	safe = safe.trim().replace(/^\.+|\.+$/g, "");

	if (targetPlatform === "win32") {
		// Windows restrictions
		safe = safe.replace(/[<>:"|?*]/g, "_");
		safe = safe.replace(/./g, (char) =>
			char.charCodeAt(0) <= 31 ? "_" : char,
		);
		safe = safe.replace(/[\s.]+$/g, ""); // Remove trailing spaces and dots

		// Handle reserved names
		const reserved = [
			"CON",
			"PRN",
			"AUX",
			"NUL",
			"COM1",
			"COM2",
			"COM3",
			"COM4",
			"COM5",
			"COM6",
			"COM7",
			"COM8",
			"COM9",
			"LPT1",
			"LPT2",
			"LPT3",
			"LPT4",
			"LPT5",
			"LPT6",
			"LPT7",
			"LPT8",
			"LPT9",
		];
		if (reserved.includes(safe.toUpperCase().split(".")[0])) {
			safe = `_${safe}`;
		}
	} else {
		// POSIX restrictions
		safe = safe.replace(/./g, (char) =>
			char.charCodeAt(0) === 0 ? "_" : char,
		); // No null bytes
		safe = safe.replace(/\//g, "_"); // No path separators
	}

	// Ensure filename is not empty
	if (safe.length === 0) {
		safe = "unnamed";
	}

	// Limit length to reasonable maximum
	if (safe.length > 255) {
		const ext = path.extname(safe);
		const name = path.basename(safe, ext);
		safe = name.substring(0, 255 - ext.length) + ext;
	}

	return safe;
}

/**
 * Join path segments using platform-appropriate separators
 * @param segments Path segments to join
 * @returns Joined path
 */
export function joinPath(...segments: string[]): string {
	return path.join(...segments);
}

/**
 * Get relative path from one location to another
 * @param from Source path
 * @param to Target path
 * @returns Relative path
 */
export function getRelativePath(from: string, to: string): string {
	return path.relative(from, to);
}

/**
 * Validate path for potential security issues
 * @param inputPath Path to validate
 * @returns Validation result
 */
export function validatePath(inputPath: string): {
	valid: boolean;
	issues: string[];
	sanitized?: string;
} {
	const issues: string[] = [];
	let sanitized = inputPath;

	// Check for path traversal attempts
	if (inputPath.includes("..")) {
		issues.push("Path traversal detected (..)");
	}

	// Check for null bytes
	if (inputPath.includes("\x00")) {
		issues.push("Null byte detected");
		sanitized = sanitized.replace(/./g, (char) =>
			char.charCodeAt(0) === 0 ? "" : char,
		);
	}

	// Check for excessively long paths
	if (inputPath.length > 4096) {
		issues.push("Path length exceeds maximum (4096 characters)");
	}

	// Check for suspicious patterns
	const suspiciousPatterns = [
		/\.\.[/\\]/, // Path traversal
		/[/\\]\.+[/\\]/, // Hidden directory traversal
		/^\/proc\//, // Linux /proc access
		/^\/dev\//, // Device file access
	];

	for (const pattern of suspiciousPatterns) {
		if (pattern.test(inputPath)) {
			issues.push(`Suspicious pattern detected: ${pattern.source}`);
		}
	}

	return {
		valid: issues.length === 0,
		issues,
		...(issues.length > 0 && { sanitized }),
	};
}

// Legacy class export removed - use individual functions instead
