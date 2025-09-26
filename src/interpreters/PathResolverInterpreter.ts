/**
 * Path Resolver Interpreter
 * Resolves relative paths and aliases in extractedData to absolute project paths
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { DependencyExtractionResult } from "../extractors/DependencyExtractor";
import { createLogger } from "../utils/logger";
import { normalizePath, toProjectRelativePath } from "../utils/PathUtils";
import type { IDataInterpreter, InterpreterContext } from "./IDataInterpreter";

const logger = createLogger("PathResolverInterpreter");

/**
 * Resolved dependency information with absolute paths
 */
export interface ResolvedDependency {
	/** Original source path from extractedData */
	originalSource: string;
	/** Resolved absolute path */
	resolvedPath: string | null;
	/** Project-relative path */
	projectRelativePath: string | null;
	/** Resolution type */
	resolutionType:
		| "absolute"
		| "relative"
		| "alias"
		| "node_modules"
		| "builtin"
		| "unresolved";
	/** Whether the resolved file exists */
	exists: boolean;
	/** File extension */
	extension: string | null;
	/** Error message if resolution failed */
	error?: string;
}

/**
 * Path resolution analysis result
 */
export interface PathResolutionResult {
	/** Array of resolved dependencies */
	resolvedDependencies: ResolvedDependency[];
	/** Summary statistics */
	summary: {
		totalDependencies: number;
		resolvedCount: number;
		unresolvedCount: number;
		externalCount: number;
		internalCount: number;
		aliasCount: number;
		relativeCount: number;
	};
	/** Path mapping configuration (tsconfig paths, webpack aliases, etc.) */
	pathMappings: Record<string, string>;
	/** Base directories for resolution */
	resolutionBase: {
		projectRoot: string;
		sourceFileDir: string;
		nodeModulesPath: string[];
	};
}

/**
 * Configuration for path resolution
 */
export interface PathResolverConfig {
	/** Custom path aliases (e.g., from tsconfig.json) */
	aliases?: Record<string, string>;
	/** Additional resolution paths */
	resolutionPaths?: string[];
	/** Whether to resolve node_modules dependencies */
	resolveNodeModules?: boolean;
	/** File extensions to try when resolving */
	extensions?: string[];
	/** Whether to check file existence */
	checkExistence?: boolean;
}

/**
 * Path Resolver Interpreter
 * Analyzes dependency paths and resolves them to absolute project paths
 */
export class PathResolverInterpreter
	implements IDataInterpreter<DependencyExtractionResult, PathResolutionResult>
{
	private readonly defaultExtensions = [
		".ts",
		".tsx",
		".js",
		".jsx",
		".mjs",
		".cjs",
		".json",
	];

	interpret(
		data: DependencyExtractionResult,
		context: InterpreterContext,
	): PathResolutionResult {
		logger.debug("Starting path resolution analysis", {
			dependencyCount: data.dependencies?.length || 0,
			sourceFile: context.filePath,
		});

		const config = this.getConfig(context);
		const resolutionBase = this.getResolutionBase(context);
		const pathMappings = this.loadPathMappingsSync(resolutionBase.projectRoot);

		const resolvedDependencies: ResolvedDependency[] = [];

		// Process each dependency
		for (const dependency of data.dependencies || []) {
			const resolved = this.resolveDependencyPathSync(
				dependency.source,
				resolutionBase,
				pathMappings,
				config,
			);
			resolvedDependencies.push(resolved);
		}

		// Generate summary
		const summary = this.generateSummary(resolvedDependencies);

		const result: PathResolutionResult = {
			resolvedDependencies,
			summary,
			pathMappings,
			resolutionBase,
		};

		logger.debug("Path resolution completed", {
			resolvedCount: summary.resolvedCount,
			unresolvedCount: summary.unresolvedCount,
		});

		return result;
	}

	/**
	 * Resolves a single dependency path (synchronous version)
	 */
	private resolveDependencyPathSync(
		source: string,
		resolutionBase: PathResolutionResult["resolutionBase"],
		pathMappings: Record<string, string>,
		config: PathResolverConfig,
	): ResolvedDependency {
		const resolved: ResolvedDependency = {
			originalSource: source,
			resolvedPath: null,
			projectRelativePath: null,
			resolutionType: "unresolved",
			exists: false,
			extension: null,
		};

		try {
			// 1. Check if it's a built-in Node.js module
			if (this.isBuiltinModule(source)) {
				resolved.resolutionType = "builtin";
				return resolved;
			}

			// 2. Check if it's an absolute path
			if (path.isAbsolute(source)) {
				resolved.resolutionType = "absolute";
				resolved.resolvedPath = normalizePath(source);
				resolved.projectRelativePath = toProjectRelativePath(
					source,
					resolutionBase.projectRoot,
				);
			}
			// 3. Check for alias resolution (before node_modules to allow path mappings to override)
			else if (this.tryResolveAliasSync(source, pathMappings, resolutionBase)) {
				const aliasResult = this.tryResolveAliasSync(
					source,
					pathMappings,
					resolutionBase,
				);
				if (aliasResult) {
					resolved.resolutionType = "alias";
					// Try to resolve with extensions for alias paths
					resolved.resolvedPath = this.resolveWithExtensionsSync(
						aliasResult,
						config.extensions || this.defaultExtensions,
					);
					if (resolved.resolvedPath) {
						resolved.projectRelativePath = toProjectRelativePath(
							resolved.resolvedPath,
							resolutionBase.projectRoot,
						);
					}
				}
			}
			// 4. Check if it's a node_modules dependency
			else if (this.isNodeModuleDependency(source)) {
				resolved.resolutionType = "node_modules";
				if (config.resolveNodeModules) {
					resolved.resolvedPath = this.resolveNodeModulePathSync(
						source,
						resolutionBase.nodeModulesPath,
					);
				}
			}
			// 5. Resolve relative path
			else {
				resolved.resolutionType = "relative";
				const absolutePath = path.resolve(resolutionBase.sourceFileDir, source);

				// Always try extension resolution first
				try {
					resolved.resolvedPath = this.resolveWithExtensionsSync(
						absolutePath,
						config.extensions || this.defaultExtensions,
					);
				} catch {
					// If extension resolution fails due to file system errors, ignore the error
					// We'll provide a fallback path below
				}

				// If extension resolution didn't find a file, provide a reasonable fallback
				if (!resolved.resolvedPath) {
					const extensions = config.extensions || this.defaultExtensions;
					resolved.resolvedPath =
						extensions.length > 0 ? absolutePath + extensions[0] : absolutePath;
				}

				if (resolved.resolvedPath) {
					resolved.projectRelativePath = toProjectRelativePath(
						resolved.resolvedPath,
						resolutionBase.projectRoot,
					);
				}
			}

			// Check if resolved path exists
			if (resolved.resolvedPath && config.checkExistence !== false) {
				try {
					resolved.exists = this.fileExistsSync(resolved.resolvedPath);
				} catch {
					// If file existence check fails, mark as not existing but keep the resolved path
					resolved.exists = false;
				}
			}

			// Extract extension
			if (resolved.resolvedPath) {
				resolved.extension = path.extname(resolved.resolvedPath) || null;
			}

			// Determine if internal or external
			if (
				resolved.projectRelativePath &&
				!resolved.projectRelativePath.startsWith("..")
			) {
				resolved.resolutionType =
					resolved.resolutionType === "unresolved"
						? "relative"
						: resolved.resolutionType;
			}
		} catch (error) {
			resolved.error = error instanceof Error ? error.message : String(error);
			logger.warn("Failed to resolve dependency path", {
				source,
				error: resolved.error,
			});
		}

		return resolved;
	}

	/**
	 * Generate summary statistics
	 */
	private generateSummary(
		resolvedDependencies: ResolvedDependency[],
	): PathResolutionResult["summary"] {
		const summary = {
			totalDependencies: resolvedDependencies.length,
			resolvedCount: 0,
			unresolvedCount: 0,
			externalCount: 0,
			internalCount: 0,
			aliasCount: 0,
			relativeCount: 0,
		};

		for (const dep of resolvedDependencies) {
			// A dependency is considered "resolved" only if it has a path AND the file exists
			// For external/builtin modules, we don't check existence, so they're always resolved if they have a path
			const isExternalOrBuiltin =
				dep.resolutionType === "node_modules" ||
				dep.resolutionType === "builtin";
			if (dep.resolvedPath && (isExternalOrBuiltin || dep.exists)) {
				summary.resolvedCount++;
			} else {
				summary.unresolvedCount++;
			}

			switch (dep.resolutionType) {
				case "alias":
					summary.aliasCount++;
					break;
				case "relative":
					summary.relativeCount++;
					break;
				case "node_modules":
				case "builtin":
					summary.externalCount++;
					break;
				default:
					if (
						dep.projectRelativePath &&
						!dep.projectRelativePath.startsWith("..")
					) {
						summary.internalCount++;
					} else {
						summary.externalCount++;
					}
			}
		}

		return summary;
	}

	/**
	 * Get resolution base directories
	 */
	private getResolutionBase(
		context: InterpreterContext,
	): PathResolutionResult["resolutionBase"] {
		const projectRoot =
			context.projectContext?.rootPath || path.dirname(context.filePath);
		const sourceFileDir = path.dirname(context.filePath);

		const nodeModulesPath = [path.join(projectRoot, "node_modules")];

		// Add parent node_modules paths
		let currentDir = sourceFileDir;
		while (
			currentDir !== projectRoot &&
			currentDir !== path.dirname(currentDir)
		) {
			currentDir = path.dirname(currentDir);
			nodeModulesPath.push(path.join(currentDir, "node_modules"));
		}

		return {
			projectRoot,
			sourceFileDir,
			nodeModulesPath,
		};
	}

	/**
	 * Get interpreter configuration
	 */
	private getConfig(context: InterpreterContext): PathResolverConfig {
		const interpreterOptions = context.options?.interpreterOptions as any;
		return {
			resolveNodeModules: true,
			checkExistence: true,
			extensions: this.defaultExtensions,
			...interpreterOptions?.["path-resolver"],
		};
	}

	/**
	 * Check if module is a Node.js built-in
	 */
	private isBuiltinModule(source: string): boolean {
		const builtins = [
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

		// Handle node: protocol
		const moduleName = source.startsWith("node:") ? source.slice(5) : source;
		return builtins.includes(moduleName);
	}

	/**
	 * Check if dependency is from node_modules
	 */
	private isNodeModuleDependency(source: string): boolean {
		// Not a relative or absolute path, and not a built-in
		return (
			!source.startsWith(".") &&
			!path.isAbsolute(source) &&
			!this.isBuiltinModule(source)
		);
	}

	/**
	 * Check if file exists (sync)
	 */
	private fileExistsSync(filePath: string): boolean {
		try {
			fs.accessSync(filePath);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Load path mappings from tsconfig.json (sync)
	 */
	private loadPathMappingsSync(projectRoot: string): Record<string, string> {
		const pathMappings: Record<string, string> = {};

		// Try to load from tsconfig.json
		const tsconfigPath = path.join(projectRoot, "tsconfig.json");
		if (this.fileExistsSync(tsconfigPath)) {
			try {
				const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
				const paths = tsconfig.compilerOptions?.paths;
				if (paths) {
					for (const [alias, targets] of Object.entries(paths)) {
						if (Array.isArray(targets) && targets.length > 0) {
							// Remove trailing /* from alias and target
							const cleanAlias = alias.replace(/\/\*$/, "");
							const cleanTarget = (targets[0] as string).replace(/\/\*$/, "");
							pathMappings[cleanAlias] = cleanTarget;
						}
					}
				}
			} catch (error) {
				logger.warn("Failed to parse tsconfig.json", { error });
			}
		}

		return pathMappings;
	}

	/**
	 * Try to resolve alias paths (sync)
	 */
	private tryResolveAliasSync(
		source: string,
		pathMappings: Record<string, string>,
		resolutionBase: PathResolutionResult["resolutionBase"],
	): string | null {
		for (const [alias, targetPath] of Object.entries(pathMappings)) {
			// For aliases like "@" (from "@/*"), we need to match "@/..." patterns
			// Check if source starts with alias followed by "/" or if alias and source are exact match
			if (source === alias || source.startsWith(`${alias}/`)) {
				let relativePart = source.slice(alias.length);

				// Remove leading slash if present since we'll be joining paths
				if (relativePart.startsWith("/")) {
					relativePart = relativePart.slice(1);
				}

				const resolvedPath = path.resolve(
					resolutionBase.projectRoot,
					targetPath,
					relativePart,
				);
				return resolvedPath;
			}
		}
		return null;
	}

	/**
	 * Try to resolve path with different extensions (sync)
	 */
	private resolveWithExtensionsSync(
		basePath: string,
		extensions: string[],
	): string | null {
		let lastError: Error | null = null;

		// Try exact path first
		try {
			if (this.fileExistsSync(basePath)) {
				return basePath;
			}
		} catch (error) {
			lastError = error as Error;
			// Continue trying with extensions
		}

		// Try with extensions
		for (const ext of extensions) {
			const pathWithExt = basePath + ext;
			try {
				if (this.fileExistsSync(pathWithExt)) {
					return pathWithExt;
				}
			} catch (error) {
				lastError = error as Error;
				// Continue trying other extensions
			}
		}

		// Try index files
		for (const ext of extensions) {
			const indexPath = path.join(basePath, `index${ext}`);
			try {
				if (this.fileExistsSync(indexPath)) {
					return indexPath;
				}
			} catch (error) {
				lastError = error as Error;
				// Continue trying other index files
			}
		}

		// If we got here and we have a permission or access error,
		// re-throw it so the caller can handle it appropriately
		if (
			lastError &&
			(lastError.message.includes("Permission denied") ||
				lastError.message.includes("EACCES") ||
				lastError.message.includes("EPERM"))
		) {
			throw lastError;
		}

		return null;
	}

	/**
	 * Resolve node_modules path (sync)
	 */
	private resolveNodeModulePathSync(
		source: string,
		nodeModulesPaths: string[],
	): string | null {
		for (const nodeModulesPath of nodeModulesPaths) {
			const modulePath = path.join(nodeModulesPath, source);
			if (this.fileExistsSync(modulePath)) {
				return modulePath;
			}
			// Try with package.json main field
			const packageJsonPath = path.join(
				nodeModulesPath,
				source,
				"package.json",
			);
			if (this.fileExistsSync(packageJsonPath)) {
				try {
					const packageJson = JSON.parse(
						fs.readFileSync(packageJsonPath, "utf8"),
					);
					if (packageJson.main) {
						const mainPath = path.join(
							nodeModulesPath,
							source,
							packageJson.main,
						);
						if (this.fileExistsSync(mainPath)) {
							return mainPath;
						}
					}
				} catch {
					// Ignore package.json parsing errors
				}
			}
		}
		return null;
	}

	// IDataInterpreter interface methods
	supports(dataType: string): boolean {
		return dataType === "dependency";
	}

	getName(): string {
		return "path-resolver";
	}

	getVersion(): string {
		return "1.0.0";
	}

	validate(input: DependencyExtractionResult): {
		isValid: boolean;
		errors: string[];
		warnings: string[];
	} {
		const errors: string[] = [];
		const warnings: string[] = [];

		if (!input) {
			errors.push("Input data is required");
		} else if (!input.dependencies) {
			errors.push("Dependencies array is required");
		} else if (input.dependencies.length === 0) {
			warnings.push("No dependencies found to resolve");
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		};
	}

	getOutputSchema(): any {
		return {
			type: "object",
			properties: {
				resolvedDependencies: {
					type: "array",
					items: {
						type: "object",
						properties: {
							originalSource: { type: "string" },
							resolvedPath: { type: ["string", "null"] },
							projectRelativePath: { type: ["string", "null"] },
							resolutionType: { type: "string" },
							exists: { type: "boolean" },
							extension: { type: ["string", "null"] },
							error: { type: "string" },
						},
					},
				},
				summary: {
					type: "object",
					properties: {
						totalDependencies: { type: "number" },
						resolvedCount: { type: "number" },
						unresolvedCount: { type: "number" },
						externalCount: { type: "number" },
						internalCount: { type: "number" },
						aliasCount: { type: "number" },
						relativeCount: { type: "number" },
					},
				},
			},
		};
	}

	getMetadata(): any {
		return {
			name: this.getName(),
			version: this.getVersion(),
			description: "Resolves dependency paths to absolute project paths",
			author: "Dependency Linker",
			supportedDataTypes: this.getSupportedDataTypes(),
			dependencies: this.getDependencies(),
		};
	}

	configure(_options: any): void {
		// Configuration is handled through context options
	}

	getConfiguration(): any {
		return {};
	}

	getSupportedDataTypes(): string[] {
		return ["dependency"];
	}

	getDependencies(): any[] {
		return [];
	}

	dispose(): void {
		// No resources to dispose
	}
}
