/**
 * Path Resolution Utilities
 * Helper functions for resolving and transforming dependency paths
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createLogger } from "./logger";
import { normalizePath, toProjectRelativePath } from "./PathUtils";

const logger = createLogger("PathResolutionUtils");

/**
 * Path resolution context
 */
/**
 * Context configuration for path resolution operations
 *
 * Provides all necessary information for resolving relative and aliased imports
 * within a project structure. Used by path resolution utilities to determine
 * the correct absolute paths for dependencies.
 *
 * @example
 * ```typescript
 * const context: PathResolutionContext = {
 *   projectRoot: "/Users/dev/my-project",
 *   sourceFileDir: "/Users/dev/my-project/src/components",
 *   aliases: {
 *     "@": "src",
 *     "@utils": "src/utils",
 *     "@components/*": "src/components/*"
 *   },
 *   extensions: [".ts", ".tsx", ".js", ".jsx", ".json"]
 * };
 *
 * // Usage with resolution functions
 * const resolved = await resolveDependencyPath("@/helpers/api", context);
 * ```
 *
 * @since 2.0.0
 */
export interface PathResolutionContext {
	/** Absolute path to the project root directory */
	projectRoot: string;

	/** Absolute path to the directory containing the source file being analyzed */
	sourceFileDir: string;

	/**
	 * Optional path aliases mapping (from tsconfig.json or similar)
	 *
	 * Maps alias patterns to their actual paths relative to project root.
	 * Supports wildcards like "@components/*" -> "src/components/*"
	 */
	aliases?: Record<string, string>;

	/**
	 * Optional file extensions to try when resolving imports
	 *
	 * Default extensions include common TypeScript/JavaScript file types.
	 * Extensions are tried in order when a file is not found.
	 */
	extensions?: string[];
}

/**
 * Batch resolve multiple dependency paths
 */
/**
 * Resolves multiple dependency paths in parallel for improved performance
 *
 * Efficiently processes multiple import paths using concurrent resolution,
 * returning a map of original paths to their resolved absolute paths.
 * Failed resolutions are mapped to null values.
 *
 * @param sources - Array of import paths to resolve
 * @param context - Resolution context containing project paths and configuration
 *
 * @returns Promise resolving to Map where keys are original paths and values are resolved paths (or null)
 *
 * @example
 * ```typescript
 * const sources = ["./Button", "@/utils/api", "../hooks/useAuth"];
 * const context = createResolutionContext(analysisResult);
 *
 * const results = await batchResolvePaths(sources, context);
 *
 * // Process results
 * for (const [original, resolved] of results) {
 *   if (resolved) {
 *     console.log(`${original} -> ${resolved}`);
 *   } else {
 *     console.warn(`Failed to resolve: ${original}`);
 *   }
 * }
 *
 * // Extract successfully resolved paths
 * const resolved = Array.from(results.values()).filter(Boolean);
 * ```
 *
 * @since 2.0.0
 */
export async function batchResolvePaths(
	sources: string[],
	context: PathResolutionContext,
): Promise<Map<string, string | null>> {
	const results = new Map<string, string | null>();

	const resolvePromises = sources.map(async (source) => {
		const resolved = await resolveDependencyPath(source, context);
		results.set(source, resolved);
	});

	await Promise.all(resolvePromises);
	return results;
}

/**
 * Resolve a single dependency path to absolute path
 */
/**
 * Resolves a dependency import path to an absolute file system path
 *
 * Attempts multiple resolution strategies in order:
 * 1. Absolute paths (returned as-is after normalization)
 * 2. Alias resolution (using tsconfig paths or custom aliases)
 * 3. Relative resolution (relative to source file directory)
 * 4. Project-relative resolution (relative to project root)
 *
 * Each resolution attempt includes extension resolution and index file checking.
 *
 * @param source - The import path to resolve (e.g., "./utils", "@/components/Button", "../helpers")
 * @param context - Resolution context containing project paths and configuration
 *
 * @returns Promise resolving to absolute file path if found, null if resolution fails
 *
 * @example
 * ```typescript
 * const context = {
 *   projectRoot: "/project",
 *   sourceFileDir: "/project/src/components",
 *   aliases: { "@": "src" },
 *   extensions: [".ts", ".tsx", ".js"]
 * };
 *
 * // Relative path resolution
 * const result1 = await resolveDependencyPath("./Button", context);
 * // Returns: "/project/src/components/Button.tsx" (if exists)
 *
 * // Alias resolution
 * const result2 = await resolveDependencyPath("@/utils/helper", context);
 * // Returns: "/project/src/utils/helper.ts" (if exists)
 *
 * // Parent directory resolution
 * const result3 = await resolveDependencyPath("../hooks/useAuth", context);
 * // Returns: "/project/src/hooks/useAuth.ts" (if exists)
 * ```
 *
 * @since 2.0.0
 */
export async function resolveDependencyPath(
	source: string,
	context: PathResolutionContext,
): Promise<string | null> {
	try {
		// 1. If already absolute, normalize and return
		if (path.isAbsolute(source)) {
			return normalizePath(source);
		}

		// 2. Try alias resolution first
		if (context.aliases) {
			const aliasResolved = tryResolveWithAlias(
				source,
				context.aliases,
				context.projectRoot,
			);
			if (aliasResolved) {
				const withExtension = await tryResolveWithExtensions(
					aliasResolved,
					context.extensions,
				);
				if (withExtension) {
					return withExtension;
				}
			}
		}

		// 3. Resolve relative to source file directory
		const relativePath = path.resolve(context.sourceFileDir, source);
		const withExtension = await tryResolveWithExtensions(
			relativePath,
			context.extensions,
		);
		if (withExtension) {
			return withExtension;
		}

		// 4. Try relative to project root
		const projectRelative = path.resolve(context.projectRoot, source);
		const projectWithExtension = await tryResolveWithExtensions(
			projectRelative,
			context.extensions,
		);
		if (projectWithExtension) {
			return projectWithExtension;
		}

		logger.debug("Could not resolve dependency path", {
			source,
			context: context.sourceFileDir,
		});
		return null;
	} catch (error) {
		logger.warn("Error resolving dependency path", { source, error });
		return null;
	}
}

/**
 * Try to resolve path with alias substitution
 */
/**
 * Attempts to resolve an import path using configured path aliases
 *
 * Supports various alias patterns including exact matches, prefix matches,
 * and wildcard patterns commonly used in TypeScript projects.
 *
 * @param source - The import path to resolve (e.g., "@/components/Button", "@utils/api")
 * @param aliases - Record of alias patterns to their target paths
 * @param projectRoot - Absolute path to the project root directory
 *
 * @returns Resolved absolute path if alias matches, null if no alias applies
 *
 * @example
 * ```typescript
 * const aliases = {
 *   "@": "src",
 *   "@utils": "src/utils",
 *   "@components/*": "src/components/*"
 * };
 *
 * // Exact alias match
 * const result1 = tryResolveWithAlias("@utils", aliases, "/project");
 * // Returns: "/project/src/utils"
 *
 * // Prefix match
 * const result2 = tryResolveWithAlias("@/components/Button", aliases, "/project");
 * // Returns: "/project/src/components/Button"
 *
 * // Wildcard match
 * const result3 = tryResolveWithAlias("@components/shared/Modal", aliases, "/project");
 * // Returns: "/project/src/components/shared/Modal"
 *
 * // No match
 * const result4 = tryResolveWithAlias("./relative", aliases, "/project");
 * // Returns: null
 * ```
 *
 * @since 2.0.0
 */
export function tryResolveWithAlias(
	source: string,
	aliases: Record<string, string>,
	projectRoot: string,
): string | null {
	for (const [alias, targetPath] of Object.entries(aliases)) {
		// Handle exact match
		if (source === alias) {
			return path.resolve(projectRoot, targetPath);
		}

		// Handle prefix match with path separator
		if (source.startsWith(`${alias}/`)) {
			const relativePart = source.slice(alias.length + 1);
			return path.resolve(projectRoot, targetPath, relativePart);
		}

		// Handle wildcard aliases (e.g., "@/*" -> "src/*")
		if (alias.endsWith("/*") && source.startsWith(`${alias.slice(0, -2)}/`)) {
			const aliasPrefix = alias.slice(0, -2);
			const relativePart = source.slice(aliasPrefix.length + 1);
			const targetBase = targetPath.endsWith("/*")
				? targetPath.slice(0, -2)
				: targetPath;
			return path.resolve(projectRoot, targetBase, relativePart);
		}
	}

	return null;
}

/**
 * Try to resolve path with different extensions
 */
/**
 * Attempts to resolve a base path by trying different file extensions and index files
 *
 * Implements Node.js-style module resolution by testing various file extensions
 * and index file patterns. Useful for resolving imports that omit file extensions.
 *
 * Resolution order:
 * 1. Exact path as provided
 * 2. Path with each extension appended
 * 3. Index files in directory with each extension
 *
 * @param basePath - The base file path to resolve (without extension)
 * @param extensions - Array of file extensions to try (defaults to common web extensions)
 *
 * @returns Promise resolving to the first existing file path, or null if none found
 *
 * @example
 * ```typescript
 * // Try to resolve "./components/Button" -> "./components/Button.tsx"
 * const result1 = await tryResolveWithExtensions("/project/src/components/Button");
 * // Tests: Button, Button.ts, Button.tsx, Button.js, Button.jsx, Button.json
 * // Then: Button/index.ts, Button/index.tsx, etc.
 *
 * // Custom extensions
 * const result2 = await tryResolveWithExtensions(
 *   "/project/src/utils/api",
 *   [".ts", ".js"]
 * );
 *
 * // Directory resolution to index file
 * const result3 = await tryResolveWithExtensions("/project/src/components");
 * // May resolve to: "/project/src/components/index.ts"
 * ```
 *
 * @since 2.0.0
 */
export async function tryResolveWithExtensions(
	basePath: string,
	extensions: string[] = [".ts", ".tsx", ".js", ".jsx", ".json"],
): Promise<string | null> {
	// Try exact path first
	if (await fileExists(basePath)) {
		return basePath;
	}

	// Try with each extension
	for (const ext of extensions) {
		const pathWithExt = basePath + ext;
		if (await fileExists(pathWithExt)) {
			return pathWithExt;
		}
	}

	// Try index files
	for (const ext of extensions) {
		const indexPath = path.join(basePath, `index${ext}`);
		if (await fileExists(indexPath)) {
			return indexPath;
		}
	}

	return null;
}

/**
 * Convert absolute paths to project-relative paths in dependency data
 */
/**
 * Converts absolute file paths to project-relative paths in nested data structures
 *
 * Recursively processes objects, arrays, and strings to convert absolute paths
 * to paths relative to the project root. Useful for making analysis results
 * portable and easier to read.
 *
 * @param data - The data structure to process (objects, arrays, primitives)
 * @param projectRoot - Absolute path to the project root directory
 * @param pathFields - Array of field names that are likely to contain file paths
 *
 * @returns New data structure with absolute paths converted to relative paths
 *
 * @example
 * ```typescript
 * const analysisData = {
 *   source: "/project/src/components/Button.tsx",
 *   dependencies: [
 *     { path: "/project/src/utils/helper.ts" },
 *     { external: "react" }  // non-path data unchanged
 *   ],
 *   metadata: { count: 5 }
 * };
 *
 * const converted = convertToProjectRelativePaths(
 *   analysisData,
 *   "/project",
 *   ["source", "path"]
 * );
 *
 * // Result:
 * // {
 * //   source: "src/components/Button.tsx",
 * //   dependencies: [
 * //     { path: "src/utils/helper.ts" },
 * //     { external: "react" }
 * //   ],
 * //   metadata: { count: 5 }
 * // }
 * ```
 *
 * @since 2.0.0
 */
export function convertToProjectRelativePaths<T extends Record<string, any>>(
	data: T,
	projectRoot: string,
	pathFields: string[] = ["source", "path", "filePath"],
): T {
	const converted = { ...data };

	function convertValue(value: any): any {
		if (typeof value === "string" && path.isAbsolute(value)) {
			// Check if this looks like a file path
			if (
				pathFields.some(
					(field) => typeof value === "string" && value.includes(field),
				)
			) {
				return toProjectRelativePath(value, projectRoot);
			}
		} else if (Array.isArray(value)) {
			return value.map(convertValue);
		} else if (value && typeof value === "object") {
			return convertObjectPaths(value, projectRoot, pathFields);
		}
		return value;
	}

	return convertValue(converted);
}

/**
 * Convert paths in object recursively
 */
function convertObjectPaths<T extends Record<string, any>>(
	obj: T,
	projectRoot: string,
	pathFields: string[],
): T {
	const converted = { ...obj } as T;

	for (const [key, value] of Object.entries(obj)) {
		if (
			pathFields.includes(key) &&
			typeof value === "string" &&
			path.isAbsolute(value)
		) {
			(converted as any)[key] = toProjectRelativePath(value, projectRoot);
		} else if (Array.isArray(value)) {
			(converted as any)[key] = value.map((item) =>
				typeof item === "object" && item !== null
					? convertObjectPaths(item, projectRoot, pathFields)
					: item,
			);
		} else if (value && typeof value === "object") {
			(converted as any)[key] = convertObjectPaths(
				value,
				projectRoot,
				pathFields,
			);
		}
	}

	return converted;
}

/**
 * Extract unique file extensions from dependency sources
 */
export function extractFileExtensions(sources: string[]): string[] {
	const extensions = new Set<string>();

	for (const source of sources) {
		const ext = path.extname(source);
		if (ext) {
			extensions.add(ext);
		}
	}

	return Array.from(extensions).sort();
}

/**
 * Group dependencies by resolution type
 */
/**
 * Groups dependency import paths by their type for categorized analysis
 *
 * Classifies import paths into different categories based on their patterns:
 * - Relative: paths starting with ./ or ../
 * - Absolute: paths starting with / (absolute file system paths)
 * - Node modules: external packages (no path prefix)
 * - Built-in: Node.js built-in modules (with or without node: prefix)
 *
 * @param sources - Array of import paths to categorize
 *
 * @returns Object with categorized arrays of import paths
 *
 * @example
 * ```typescript
 * const imports = [
 *   "./components/Button",     // relative
 *   "../hooks/useAuth",        // relative
 *   "/absolute/path/file",     // absolute
 *   "react",                   // nodeModules
 *   "@types/node",             // nodeModules
 *   "fs",                      // builtin
 *   "node:path"                // builtin
 * ];
 *
 * const grouped = groupDependenciesByType(imports);
 *
 * // Result:
 * // {
 * //   relative: ["./components/Button", "../hooks/useAuth"],
 * //   absolute: ["/absolute/path/file"],
 * //   nodeModules: ["react", "@types/node"],
 * //   builtin: ["fs", "node:path"]
 * // }
 *
 * // Use for analysis
 * console.log(`External dependencies: ${grouped.nodeModules.length}`);
 * console.log(`Internal files: ${grouped.relative.length}`);
 * ```
 *
 * @since 2.0.0
 */
export function groupDependenciesByType(sources: string[]): {
	relative: string[];
	absolute: string[];
	nodeModules: string[];
	builtin: string[];
} {
	const groups = {
		relative: [] as string[],
		absolute: [] as string[],
		nodeModules: [] as string[],
		builtin: [] as string[],
	};

	const builtinModules = [
		"assert",
		"async_hooks",
		"buffer",
		"child_process",
		"cluster",
		"console",
		"constants",
		"crypto",
		"dgram",
		"dns",
		"domain",
		"events",
		"fs",
		"http",
		"http2",
		"https",
		"inspector",
		"module",
		"net",
		"os",
		"path",
		"perf_hooks",
		"process",
		"punycode",
		"querystring",
		"readline",
		"repl",
		"stream",
		"string_decoder",
		"sys",
		"timers",
		"tls",
		"trace_events",
		"tty",
		"url",
		"util",
		"v8",
		"vm",
		"worker_threads",
		"zlib",
	];

	for (const source of sources) {
		const moduleName = source.startsWith("node:") ? source.slice(5) : source;

		if (builtinModules.includes(moduleName) || source.startsWith("node:")) {
			groups.builtin.push(source);
		} else if (path.isAbsolute(source)) {
			groups.absolute.push(source);
		} else if (source.startsWith("./") || source.startsWith("../")) {
			groups.relative.push(source);
		} else {
			groups.nodeModules.push(source);
		}
	}

	return groups;
}

/**
 * Validate if a path is within project boundaries
 */
export function isWithinProject(
	absolutePath: string,
	projectRoot: string,
): boolean {
	const relativePath = path.relative(projectRoot, absolutePath);
	return !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

/**
 * Find common base path for multiple paths
 */
export function findCommonBasePath(paths: string[]): string {
	if (paths.length === 0) return "";
	if (paths.length === 1) return path.dirname(paths[0]);

	const normalizedPaths = paths.map((p) => path.resolve(p));
	const pathParts = normalizedPaths.map((p) => p.split(path.sep));

	const commonParts: string[] = [];
	const minLength = Math.min(...pathParts.map((parts) => parts.length));

	for (let i = 0; i < minLength; i++) {
		const part = pathParts[0][i];
		if (pathParts.every((parts) => parts[i] === part)) {
			commonParts.push(part);
		} else {
			break;
		}
	}

	return commonParts.join(path.sep) || path.sep;
}

/**
 * Create resolution context from analysis result
 */
/**
 * Creates a PathResolutionContext from an analysis result with optional overrides
 *
 * Convenience factory function that extracts necessary path information from
 * an analysis result and creates a properly configured resolution context.
 *
 * @param analysisResult - Analysis result containing path information
 * @param aliases - Optional path aliases (if not provided, no alias resolution will be performed)
 * @param extensions - Optional file extensions (defaults to common web development extensions)
 *
 * @returns Configured PathResolutionContext ready for use with resolution functions
 *
 * @example
 * ```typescript
 * // Basic usage with analysis result
 * const context = createResolutionContext(analysisResult);
 *
 * // With custom aliases from tsconfig.json
 * const aliases = await loadTsconfigPaths(projectRoot);
 * const contextWithAliases = createResolutionContext(analysisResult, aliases);
 *
 * // With custom extensions for specific project needs
 * const customContext = createResolutionContext(
 *   analysisResult,
 *   { "@": "src" },
 *   [".vue", ".ts", ".js"]
 * );
 *
 * // Use with resolution functions
 * const resolved = await resolveDependencyPath("@/components/Button", customContext);
 * ```
 *
 * @since 2.0.0
 */
export function createResolutionContext(
	analysisResult: { pathInfo: { projectRoot: string; absolute: string } },
	aliases?: Record<string, string>,
	extensions?: string[],
): PathResolutionContext {
	return {
		projectRoot: analysisResult.pathInfo.projectRoot,
		sourceFileDir: path.dirname(analysisResult.pathInfo.absolute),
		aliases,
		extensions: extensions || [
			".ts",
			".tsx",
			".js",
			".jsx",
			".mjs",
			".cjs",
			".json",
		],
	};
}

/**
 * Check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.promises.access(filePath);
		return true;
	} catch {
		return false;
	}
}

/**
 * Load tsconfig.json path mappings
 */
/**
 * Loads path mappings from TypeScript configuration file
 *
 * Reads tsconfig.json and extracts path aliases from the compilerOptions.paths
 * configuration, converting TypeScript path patterns to a simple alias mapping
 * suitable for use with path resolution functions.
 *
 * @param projectRoot - Absolute path to the project root directory containing tsconfig.json
 *
 * @returns Promise resolving to record of alias patterns mapped to their target paths
 *
 * @example
 * ```typescript
 * // Load path mappings from tsconfig.json
 * const aliases = await loadTsconfigPaths("/project/root");
 *
 * // Given tsconfig.json with:
 * // {
 * //   "compilerOptions": {
 * //     "paths": {
 * //       "@/*": ["src/*"],
 * //       "@utils/*": ["src/utils/*"],
 * //       "@components": ["src/components"]
 * //     }
 * //   }
 * // }
 *
 * // Returns:
 * // {
 * //   "@": "src",
 * //   "@utils": "src/utils",
 * //   "@components": "src/components"
 * // }
 *
 * // Use with resolution context
 * const context = createResolutionContext(analysisResult, aliases);
 * const resolved = await resolveDependencyPath("@/components/Button", context);
 * ```
 *
 * @since 2.0.0
 */
export async function loadTsconfigPaths(
	projectRoot: string,
): Promise<Record<string, string>> {
	const tsconfigPath = path.join(projectRoot, "tsconfig.json");
	const pathMappings: Record<string, string> = {};

	try {
		if (await fileExists(tsconfigPath)) {
			const content = await fs.promises.readFile(tsconfigPath, "utf8");
			const tsconfig = JSON.parse(content);
			const paths = tsconfig.compilerOptions?.paths;

			if (paths && typeof paths === "object") {
				for (const [alias, targets] of Object.entries(paths)) {
					if (Array.isArray(targets) && targets.length > 0) {
						// Remove trailing /* from alias and target
						const cleanAlias = alias.replace(/\/\*$/, "");
						const cleanTarget = (targets[0] as string).replace(/\/\*$/, "");
						pathMappings[cleanAlias] = cleanTarget;
					}
				}
			}
		}
	} catch (error) {
		logger.warn("Failed to load tsconfig.json paths", { error, tsconfigPath });
	}

	return pathMappings;
}

/**
 * Load package.json dependencies for validation
 */
export async function loadPackageDependencies(
	projectRoot: string,
): Promise<Set<string>> {
	const packageJsonPath = path.join(projectRoot, "package.json");
	const dependencies = new Set<string>();

	try {
		if (await fileExists(packageJsonPath)) {
			const content = await fs.promises.readFile(packageJsonPath, "utf8");
			const packageJson = JSON.parse(content);

			// Collect all types of dependencies
			const depTypes = [
				"dependencies",
				"devDependencies",
				"peerDependencies",
				"optionalDependencies",
			];
			for (const depType of depTypes) {
				if (packageJson[depType] && typeof packageJson[depType] === "object") {
					for (const dep of Object.keys(packageJson[depType])) {
						dependencies.add(dep);
					}
				}
			}
		}
	} catch (error) {
		logger.warn("Failed to load package.json dependencies", {
			error,
			packageJsonPath,
		});
	}

	return dependencies;
}
