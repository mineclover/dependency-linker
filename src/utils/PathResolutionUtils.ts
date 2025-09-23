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
export interface PathResolutionContext {
	projectRoot: string;
	sourceFileDir: string;
	aliases?: Record<string, string>;
	extensions?: string[];
}

/**
 * Batch resolve multiple dependency paths
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
