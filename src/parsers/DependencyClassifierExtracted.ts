/**
 * Dependency Classifier (Extracted from Main Project)
 * Enhanced dependency classification system
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { DependencyInfo } from "../models/DependencyInfo";

export interface LibraryInfo {
	name: string;
	version?: string;
	packageManager:
		| "npm"
		| "yarn"
		| "pnpm"
		| "bun"
		| "pip"
		| "cargo"
		| "go mod"
		| "unknown";
	registryUrl?: string;
	description?: string;
	license?: string;
	homepage?: string;
	repository?: string;
	category:
		| "Framework"
		| "Library"
		| "Utility"
		| "Tool"
		| "Type Definition"
		| "Testing"
		| "Build Tool";
	isDevDependency: boolean;
	bundleSize?: string;
}

export interface ClassifiedDependency extends DependencyInfo {
	classification: "local" | "library";
	libraryInfo?: LibraryInfo;
	resolvedPath?: string;
}

export interface PackageJsonInfo {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	optionalDependencies?: Record<string, string>;
}

export class DependencyClassifierExtracted {
	private packageInfo: PackageJsonInfo | null = null;
	private projectRoot: string;

	constructor(projectPath?: string) {
		this.projectRoot = projectPath || process.cwd();
		this.loadPackageManifests();
	}

	/**
	 * Load package.json
	 */
	private loadPackageManifests(): void {
		try {
			const packageJsonPath = path.join(this.projectRoot, "package.json");
			if (fs.existsSync(packageJsonPath)) {
				this.packageInfo = JSON.parse(
					fs.readFileSync(packageJsonPath, "utf-8"),
				);
			}
		} catch (error) {
			console.warn("Failed to load package manifests:", error);
		}
	}

	/**
	 * Classify dependencies
	 */
	classifyDependencies(dependencies: DependencyInfo[]): ClassifiedDependency[] {
		return dependencies.map((dep) => this.classifyDependency(dep));
	}

	/**
	 * Classify individual dependency
	 */
	private classifyDependency(dependency: DependencyInfo): ClassifiedDependency {
		const isLocal = this.isLocalDependency(dependency.source);

		if (isLocal) {
			return {
				...dependency,
				classification: "local",
				resolvedPath: this.resolveLocalPath(dependency.source),
			};
		} else {
			const libraryInfo = this.extractLibraryInfo(dependency.source);
			return {
				...dependency,
				classification: "library",
				libraryInfo,
			};
		}
	}

	/**
	 * Check if dependency is local
	 */
	private isLocalDependency(source: string): boolean {
		// Relative paths
		if (source.startsWith("./") || source.startsWith("../")) {
			return true;
		}

		// Absolute paths
		if (source.startsWith("/")) {
			return true;
		}

		// File extensions (local files)
		if (
			source.includes(".") &&
			(source.endsWith(".ts") ||
				source.endsWith(".js") ||
				source.endsWith(".tsx") ||
				source.endsWith(".jsx"))
		) {
			return true;
		}

		// Project internal module patterns
		const projectPatterns = [
			/^src\//,
			/^lib\//,
			/^components\//,
			/^utils\//,
			/^services\//,
			/^@\//, // Vue/Nuxt alias
			/^~\//, // Home directory alias
			/^\$lib/, // SvelteKit alias
		];

		return projectPatterns.some((pattern) => pattern.test(source));
	}

	/**
	 * Resolve local path
	 */
	private resolveLocalPath(source: string): string {
		try {
			if (path.isAbsolute(source)) {
				return source;
			}
			return path.resolve(this.projectRoot, source);
		} catch (_error) {
			return source;
		}
	}

	/**
	 * Extract library information
	 */
	private extractLibraryInfo(source: string): LibraryInfo {
		const packageName = this.extractPackageName(source);
		const packageManager = this.detectPackageManager();

		// Extract info from package.json
		let version: string | undefined;
		let isDevDependency = false;

		if (this.packageInfo) {
			version =
				this.packageInfo.dependencies?.[packageName] ||
				this.packageInfo.devDependencies?.[packageName] ||
				this.packageInfo.peerDependencies?.[packageName];

			isDevDependency = !!this.packageInfo.devDependencies?.[packageName];
		}

		const category = this.categorizeLibrary(packageName);
		const registryUrl = this.getRegistryUrl(packageName, packageManager);

		const libraryInfo: LibraryInfo = {
			name: packageName,
			packageManager,
			category,
			isDevDependency,
		};

		if (version) {
			libraryInfo.version = version;
		}

		if (registryUrl) {
			libraryInfo.registryUrl = registryUrl;
		}

		return libraryInfo;
	}

	/**
	 * Extract package name
	 */
	private extractPackageName(source: string): string {
		// Scoped package (@org/package)
		const scopeMatch = source.match(/^@[^/]+\/[^/]+/);
		if (scopeMatch) {
			return scopeMatch[0];
		}

		// Regular package name
		const parts = source.split("/");
		return parts[0];
	}

	/**
	 * Detect package manager
	 */
	private detectPackageManager(): LibraryInfo["packageManager"] {
		if (fs.existsSync(path.join(this.projectRoot, "bun.lockb"))) return "bun";
		if (fs.existsSync(path.join(this.projectRoot, "pnpm-lock.yaml")))
			return "pnpm";
		if (fs.existsSync(path.join(this.projectRoot, "yarn.lock"))) return "yarn";
		if (fs.existsSync(path.join(this.projectRoot, "package-lock.json")))
			return "npm";

		return "npm"; // default
	}

	/**
	 * Categorize library
	 */
	private categorizeLibrary(packageName: string): LibraryInfo["category"] {
		// Frameworks
		const frameworks = [
			"react",
			"vue",
			"angular",
			"svelte",
			"next",
			"nuxt",
			"gatsby",
			"express",
		];
		if (frameworks.some((fw) => packageName.includes(fw))) {
			return "Framework";
		}

		// Type definitions
		if (packageName.startsWith("@types/")) {
			return "Type Definition";
		}

		// Testing tools
		const testingTools = [
			"jest",
			"mocha",
			"chai",
			"cypress",
			"playwright",
			"vitest",
		];
		if (testingTools.some((tool) => packageName.includes(tool))) {
			return "Testing";
		}

		// Build tools
		const buildTools = [
			"webpack",
			"vite",
			"rollup",
			"parcel",
			"esbuild",
			"babel",
			"tsc",
		];
		if (buildTools.some((tool) => packageName.includes(tool))) {
			return "Build Tool";
		}

		// Utilities
		const utilities = [
			"lodash",
			"axios",
			"moment",
			"uuid",
			"chalk",
			"commander",
		];
		if (utilities.some((util) => packageName.includes(util))) {
			return "Utility";
		}

		// Tools
		const tools = ["eslint", "prettier", "husky", "lint-staged", "nodemon"];
		if (tools.some((tool) => packageName.includes(tool))) {
			return "Tool";
		}

		return "Library";
	}

	/**
	 * Get registry URL
	 */
	private getRegistryUrl(
		packageName: string,
		packageManager: LibraryInfo["packageManager"],
	): string | undefined {
		switch (packageManager) {
			case "npm":
			case "yarn":
			case "pnpm":
			case "bun":
				return `https://www.npmjs.com/package/${packageName}`;
			default:
				return undefined;
		}
	}

	/**
	 * Get classification statistics
	 */
	getClassificationStats(classifiedDeps: ClassifiedDependency[]): {
		total: number;
		local: number;
		libraries: number;
		byPackageManager: Record<string, number>;
		byCategory: Record<string, number>;
		devDependencies: number;
	} {
		const stats = {
			total: classifiedDeps.length,
			local: 0,
			libraries: 0,
			byPackageManager: {} as Record<string, number>,
			byCategory: {} as Record<string, number>,
			devDependencies: 0,
		};

		for (const dep of classifiedDeps) {
			if (dep.classification === "local") {
				stats.local++;
			} else {
				stats.libraries++;

				if (dep.libraryInfo) {
					const pm = dep.libraryInfo.packageManager;
					stats.byPackageManager[pm] = (stats.byPackageManager[pm] || 0) + 1;

					const category = dep.libraryInfo.category;
					stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

					if (dep.libraryInfo.isDevDependency) {
						stats.devDependencies++;
					}
				}
			}
		}

		return stats;
	}
}

/**
 * Convenience function: classify dependencies
 */
export function classifyDependencies(
	dependencies: DependencyInfo[],
	projectPath?: string,
): ClassifiedDependency[] {
	const classifier = new DependencyClassifierExtracted(projectPath);
	return classifier.classifyDependencies(dependencies);
}
