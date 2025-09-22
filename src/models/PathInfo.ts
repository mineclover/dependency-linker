/**
 * Comprehensive path information for analyzed files
 */

import { resolve, relative, dirname, basename, extname, sep, isAbsolute } from 'node:path';

/**
 * Detailed path information for AnalysisResult
 */
export interface PathInfo {
	/** Original input path as provided */
	input: string;

	/** Absolute path (normalized) */
	absolute: string;

	/** Relative path from project root */
	relative: string;

	/** Directory containing the file (absolute) */
	directory: string;

	/** Directory containing the file (relative to project root) */
	relativeDirectory: string;

	/** File name with extension */
	fileName: string;

	/** File name without extension */
	baseName: string;

	/** File extension (including dot) */
	extension: string;

	/** Project root directory */
	projectRoot: string;

	/** Whether the file is within the project root */
	isWithinProject: boolean;

	/** Depth level from project root (0 for root level files) */
	depth: number;

	/** Platform-specific path separator used */
	separator: string;

	/** Whether the original input was absolute */
	wasAbsolute: boolean;
}

/**
 * Create PathInfo from input path and optional project root
 */
export function createPathInfo(
	inputPath: string,
	projectRoot?: string
): PathInfo {
	const normalizedProjectRoot = projectRoot || process.cwd();
	
	// Normalize paths for cross-platform compatibility
	const normalizedInput = inputPath.replace(/[/\\]/g, sep);
	const normalizedProjectRootPath = normalizedProjectRoot.replace(/[/\\]/g, sep);
	
	const absolutePath = resolve(normalizedProjectRootPath, normalizedInput);
	const relativePath = relative(normalizedProjectRootPath, absolutePath);

	// Check if file is within project (use platform-specific path separator)
	const isWithinProject = !relativePath.startsWith('..' + sep) && !relativePath.startsWith('../');

	// Calculate depth using platform-specific separator
	const platformSeparator = process.platform === 'win32' ? '\\' : '/';
	
	// Calculate depth correctly by normalizing the path separators
	let depth = 0;
	if (isWithinProject && relativePath !== '.' && relativePath !== '') {
		// Normalize all separators to count directory levels properly
		const normalizedForDepth = relativePath.replace(/[/\\]/g, '/');
		const pathSegments = normalizedForDepth.split('/').filter(segment => segment !== '' && segment !== '.');
		depth = pathSegments.length - 1; // Subtract 1 because the last segment is the filename
	}

	// Determine if input was absolute (cross-platform)
	const wasAbsolute = isAbsolute(inputPath);

	// Get relative directory with proper cross-platform handling
	const relativeDir = isWithinProject 
		? (dirname(relativePath) || '.').replace(/[/\\]/g, platformSeparator)
		: dirname(absolutePath);

	return {
		input: inputPath,
		absolute: absolutePath,
		relative: relativePath.replace(/[/\\]/g, platformSeparator),
		directory: dirname(absolutePath),
		relativeDirectory: relativeDir === '.' ? '.' : relativeDir,
		fileName: basename(absolutePath),
		baseName: basename(absolutePath, extname(absolutePath)),
		extension: extname(absolutePath),
		projectRoot: normalizedProjectRootPath,
		isWithinProject,
		depth,
		separator: platformSeparator,
		wasAbsolute
	};
}

/**
 * Create PathInfo with validation
 */
export function createValidatedPathInfo(
	inputPath: string,
	projectRoot?: string,
	options?: {
		mustExist?: boolean;
		allowedExtensions?: string[];
	}
): PathInfo & { isValid: boolean; validationError?: string } {
	const pathInfo = createPathInfo(inputPath, projectRoot);
	const { mustExist = false, allowedExtensions } = options || {};

	let isValid = true;
	let validationError: string | undefined;

	// Check file existence if required
	if (mustExist) {
		try {
			const fs = require('node:fs');
			if (!fs.existsSync(pathInfo.absolute)) {
				isValid = false;
				validationError = `File does not exist: ${pathInfo.absolute}`;
			}
		} catch (error) {
			isValid = false;
			validationError = `Cannot check file existence: ${error instanceof Error ? error.message : 'Unknown error'}`;
		}
	}

	// Check allowed extensions
	if (isValid && allowedExtensions && allowedExtensions.length > 0) {
		if (!allowedExtensions.includes(pathInfo.extension)) {
			isValid = false;
			validationError = `Extension '${pathInfo.extension}' not allowed. Allowed: ${allowedExtensions.join(', ')}`;
		}
	}

	return {
		...pathInfo,
		isValid,
		validationError
	};
}

/**
 * Batch create PathInfo for multiple paths
 */
export function createBatchPathInfo(
	inputPaths: string[],
	projectRoot?: string
): PathInfo[] {
	return inputPaths.map(path => createPathInfo(path, projectRoot));
}

/**
 * Compare PathInfo objects for sorting
 */
export function comparePathInfo(a: PathInfo, b: PathInfo): number {
	// First sort by depth (shallower first)
	if (a.depth !== b.depth) {
		return a.depth - b.depth;
	}

	// Then sort by relative path alphabetically
	return a.relative.localeCompare(b.relative);
}

/**
 * Group PathInfo objects by directory
 */
export function groupPathInfoByDirectory(pathInfos: PathInfo[]): Map<string, PathInfo[]> {
	const groups = new Map<string, PathInfo[]>();

	for (const pathInfo of pathInfos) {
		// Handle cases where pathInfo might not have relativeDirectory
		// Use platform-specific separator for proper directory handling
		const separator = pathInfo.separator || (process.platform === 'win32' ? '\\' : '/');
		const dir = pathInfo?.relativeDirectory || 
			pathInfo?.relative?.split(/[/\\]/).slice(0, -1).join(separator) || '.';
		
		if (!groups.has(dir)) {
			groups.set(dir, []);
		}
		groups.get(dir)!.push(pathInfo);
	}

	// Sort files within each directory
	for (const [dir, files] of groups) {
		files.sort((a, b) => a.fileName.localeCompare(b.fileName));
	}

	return groups;
}

/**
 * Filter PathInfo objects by criteria
 */
export function filterPathInfo(
	pathInfos: PathInfo[],
	criteria: {
		extensions?: string[];
		withinProject?: boolean;
		maxDepth?: number;
		directories?: string[];
		exclude?: string[];
	}
): PathInfo[] {
	const {
		extensions,
		withinProject,
		maxDepth,
		directories,
		exclude = []
	} = criteria;

	return pathInfos.filter(pathInfo => {
		// Check within project constraint
		if (withinProject !== undefined && pathInfo.isWithinProject !== withinProject) {
			return false;
		}

		// Check max depth
		if (maxDepth !== undefined && pathInfo.depth > maxDepth) {
			return false;
		}

		// Check extensions
		if (extensions && !extensions.includes(pathInfo.extension)) {
			return false;
		}

		// Check directories (normalize separators for cross-platform comparison)
		if (directories) {
			const normalizedRelativeDir = pathInfo.relativeDirectory.replace(/[/\\]/g, '/');
			const normalizedDirs = directories.map(dir => dir.replace(/[/\\]/g, '/'));
			if (!normalizedDirs.includes(normalizedRelativeDir)) {
				return false;
			}
		}

		// Check exclusions (normalize separators for pattern matching)
		if (exclude.some(pattern => {
			const normalizedPattern = pattern.replace(/[/\\]/g, '/');
			const normalizedRelative = pathInfo.relative.replace(/[/\\]/g, '/');
			return normalizedRelative.includes(normalizedPattern);
		})) {
			return false;
		}

		return true;
	});
}