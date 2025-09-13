/**
 * Advanced Directory Analysis Service
 * Handles complex directory traversal with edge case support
 */

import * as fs from "fs/promises";
import * as path from "path";
// import { glob } from "glob";
import { createLogger } from "../utils/logger";
import type { Logger } from "../api/types";

export interface DirectoryAnalysisOptions {
	followSymlinks: boolean;
	ignorePatterns: string[];
	maxDepth?: number;
	includeHidden: boolean;
	parallelism: number;
	timeout?: number;
}

export interface DirectoryError {
	code: 'ENOENT' | 'EACCES' | 'EISDIR' | 'ENOTDIR' | 'EMFILE' | 'ENFILE' | 'ELOOP';
	message: string;
	path: string;
	syscall?: string;
	errno?: number;
}

export interface DirectoryContext {
	operation: 'read' | 'scan' | 'access' | 'resolve';
	currentPath: string;
	parentPath?: string;
	options: DirectoryAnalysisOptions;
}

export interface DirectoryErrorResponse {
	handled: boolean;
	action: 'retry' | 'skip' | 'abort' | 'fallback';
	fallbackPath?: string;
	retryDelay?: number;
	userMessage?: string;
}

export interface DirectoryAccessResult {
	accessible: boolean;
	readable: boolean;
	writable: boolean;
	executable: boolean;
	isDirectory: boolean;
	isSymlink: boolean;
	permissions: string;
	error?: DirectoryError;
}

export interface GlobOptions {
	cwd?: string;
	absolute?: boolean;
	dot?: boolean;
	ignore?: string[];
	followSymlinks?: boolean;
}

/**
 * Advanced directory analyzer with edge case handling
 */
export class DirectoryAnalyzer {
	private logger: Logger;
	private visitedPaths = new Set<string>();
	private symlinkDepthMap = new Map<string, number>();

	constructor(logger?: Logger) {
		this.logger = logger || createLogger("DirectoryAnalyzer");
	}

	/**
	 * Process ignore patterns against a file path
	 * Supports glob patterns, regex patterns, and literal matching
	 * @param patterns Array of ignore patterns
	 * @param filePath Path to test against patterns
	 * @returns true if file should be ignored
	 */
	processIgnorePatterns(patterns: string[], filePath: string): boolean {
		if (!patterns || patterns.length === 0) return false;

		// Normalize path for consistent matching
		const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
		const fileName = path.basename(filePath);
		const dirName = path.dirname(filePath);

		for (const pattern of patterns) {
			if (this.matchesPattern(pattern, normalizedPath, fileName, dirName)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Resolve symlinks with circular reference detection
	 * @param linkPath Path to symlink
	 * @param followSymlinks Whether to follow symlinks
	 * @returns Resolved path or original path if not following symlinks
	 */
	async resolveSymlinks(linkPath: string, followSymlinks: boolean): Promise<string> {
		if (!followSymlinks) {
			return linkPath;
		}

		try {
			const stats = await fs.lstat(linkPath);
			
			if (!stats.isSymbolicLink()) {
				return linkPath;
			}

			// Check for circular references
			if (this.detectCircularReference(linkPath)) {
				this.logger.warn(`Circular symlink detected: ${linkPath}`);
				return linkPath; // Return original path to avoid infinite loops
			}

			// Track symlink depth to prevent deep chains
			const depth = this.symlinkDepthMap.get(linkPath) || 0;
			if (depth > 10) {
				this.logger.warn(`Deep symlink chain detected: ${linkPath} (depth: ${depth})`);
				return linkPath;
			}

			// Resolve the symlink
			const resolvedPath = await fs.realpath(linkPath);
			this.symlinkDepthMap.set(resolvedPath, depth + 1);
			
			return resolvedPath;
		} catch (error) {
			this.logger.warn(`Failed to resolve symlink: ${linkPath}`, error);
			return linkPath;
		}
	}

	/**
	 * Handle directory access errors with recovery strategies
	 * @param error Directory error
	 * @param context Operation context
	 * @returns Error response with action plan
	 */
	handleDirectoryError(error: DirectoryError, context: DirectoryContext): DirectoryErrorResponse {
		const { code, path: errorPath } = error;
		const { operation } = context;

		switch (code) {
			case 'ENOENT':
				return {
					handled: true,
					action: 'skip',
					userMessage: `Path does not exist: ${errorPath}`,
				};

			case 'EACCES':
				return {
					handled: true,
					action: operation === 'read' ? 'skip' : 'retry',
					retryDelay: 1000,
					userMessage: `Access denied: ${errorPath}`,
				};

			case 'EMFILE':
			case 'ENFILE':
				return {
					handled: true,
					action: 'retry',
					retryDelay: 2000,
					userMessage: `Too many open files, retrying: ${errorPath}`,
				};

			case 'ELOOP':
				return {
					handled: true,
					action: 'skip',
					userMessage: `Circular symlink detected: ${errorPath}`,
				};

			case 'EISDIR':
				return {
					handled: true,
					action: 'fallback',
					userMessage: `Expected file but found directory: ${errorPath}`,
				};

			case 'ENOTDIR':
				return {
					handled: true,
					action: 'skip',
					userMessage: `Expected directory but found file: ${errorPath}`,
				};

			default:
				return {
					handled: false,
					action: 'abort',
					userMessage: `Unhandled directory error: ${error.message}`,
				};
		}
	}

	/**
	 * Validate directory access permissions
	 * @param dirPath Path to directory
	 * @returns Access validation result
	 */
	async validateDirectoryAccess(dirPath: string): Promise<DirectoryAccessResult> {
		try {
			const stats = await fs.lstat(dirPath);
			const isSymlink = stats.isSymbolicLink();
			const isDirectory = isSymlink ? 
				(await fs.stat(dirPath)).isDirectory() : 
				stats.isDirectory();

			// Test access permissions
			const access = {
				readable: false,
				writable: false,
				executable: false,
			};

			try {
				await fs.access(dirPath, fs.constants.R_OK);
				access.readable = true;
			} catch {
				// Read access not available
			}

			try {
				await fs.access(dirPath, fs.constants.W_OK);
				access.writable = true;
			} catch {
				// Write access not available
			}

			try {
				await fs.access(dirPath, fs.constants.X_OK);
				access.executable = true;
			} catch {
				// Execute access not available
			}

			return {
				accessible: true,
				readable: access.readable,
				writable: access.writable,
				executable: access.executable,
				isDirectory,
				isSymlink,
				permissions: this.formatPermissions(stats.mode),
			};

		} catch (error: any) {
			return {
				accessible: false,
				readable: false,
				writable: false,
				executable: false,
				isDirectory: false,
				isSymlink: false,
				permissions: '',
				error: {
					code: error.code || 'UNKNOWN',
					message: error.message,
					path: dirPath,
					syscall: error.syscall,
					errno: error.errno,
				},
			};
		}
	}

	/**
	 * Resolve glob patterns with advanced options
	 * @param pattern Glob pattern
	 * @param options Glob options
	 * @returns Array of matching paths
	 */
	async resolveGlobPattern(pattern: string, options: GlobOptions = {}): Promise<string[]> {
		try {
			// Simplified glob matching without external dependency
			// In a full implementation, you'd use a proper glob library
			this.logger.warn(`Glob pattern resolution not fully implemented: ${pattern}`);
			return [];
		} catch (error) {
			this.logger.error(`Glob pattern resolution failed: ${pattern}`, error);
			return [];
		}
	}

	/**
	 * Detect circular references in symlink chains
	 * @param linkPath Current symlink path
	 * @returns true if circular reference detected
	 */
	private detectCircularReference(linkPath: string): boolean {
		try {
			const realPath = path.resolve(linkPath);
			
			if (this.visitedPaths.has(realPath)) {
				return true;
			}

			this.visitedPaths.add(realPath);
			return false;
		} catch {
			return false;
		}
	}

	/**
	 * Match file path against various pattern types
	 * @param pattern Pattern to match against
	 * @param normalizedPath Normalized file path
	 * @param fileName File name
	 * @param dirName Directory name
	 * @returns true if pattern matches
	 */
	private matchesPattern(pattern: string, normalizedPath: string, fileName: string, dirName: string): boolean {
		// Handle different pattern types
		if (pattern.startsWith('/') && pattern.endsWith('/')) {
			// Regex pattern
			try {
				const regex = new RegExp(pattern.slice(1, -1));
				return regex.test(normalizedPath);
			} catch {
				return false;
			}
		}

		// Glob patterns
		if (pattern.includes('*') || pattern.includes('?') || pattern.includes('[')) {
			return this.matchGlob(pattern, normalizedPath);
		}

		// Directory patterns (end with /)
		if (pattern.endsWith('/')) {
			const dirPattern = pattern.slice(0, -1);
			return dirName.includes(dirPattern) || normalizedPath.includes(`/${dirPattern}/`);
		}

		// Extension patterns
		if (pattern.startsWith('*.')) {
			const ext = pattern.slice(2);
			return fileName.endsWith(`.${ext}`);
		}

		// Literal matching
		return normalizedPath.includes(pattern) || fileName === pattern;
	}

	/**
	 * Match glob pattern against path
	 * @param pattern Glob pattern
	 * @param filePath File path to test
	 * @returns true if matches
	 */
	private matchGlob(pattern: string, filePath: string): boolean {
		// Simple glob matching implementation
		const regexPattern = pattern
			.replace(/\./g, '\\.')
			.replace(/\*/g, '.*')
			.replace(/\?/g, '.')
			.replace(/\[([^\]]+)\]/g, '[$1]');

		try {
			const regex = new RegExp(`^${regexPattern}$`);
			return regex.test(filePath) || regex.test(path.basename(filePath));
		} catch {
			return false;
		}
	}

	/**
	 * Format file permissions as string
	 * @param mode File mode bits
	 * @returns Formatted permission string
	 */
	private formatPermissions(mode: number): string {
		const perms = (mode & parseInt('777', 8)).toString(8);
		return perms.padStart(3, '0');
	}

	/**
	 * Clear internal state for new operations
	 */
	reset(): void {
		this.visitedPaths.clear();
		this.symlinkDepthMap.clear();
	}
}