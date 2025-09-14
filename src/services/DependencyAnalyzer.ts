/**
 * DependencyAnalyzer service
 * High-level service for analyzing dependencies in files using the new plugin architecture
 */

import * as path from "node:path";
import { DependencyExtractor } from "../extractors/DependencyExtractor";
import { DependencyAnalysisInterpreter } from "../interpreters/DependencyAnalysisInterpreter";
import type { AnalysisConfig } from "../models/AnalysisConfig";
import type { AnalysisResult } from "../models/AnalysisResult";
import type { DependencyInfo } from "../models/DependencyInfo";
import { AnalysisEngine } from "./AnalysisEngine";

export interface ClassifiedDependency extends DependencyInfo {
	isNodeBuiltin: boolean;
	isScopedPackage: boolean;
	packageName: string;
	extension?: string;
}

export interface DependencyStats {
	total: number;
	external: number;
	relative: number;
	internal: number;
	nodeBuiltins: number;
	scopedPackages: number;
}

export interface PackageUsage {
	packageName: string;
	count: number;
	sources: string[];
}

export interface DependencyOptimization {
	type: "combine_imports" | "barrel_export" | "deep_import_warning";
	message: string;
	packageName?: string;
	sources?: string[];
}

export interface DependencyValidation {
	warnings: DependencyWarning[];
	errors: DependencyError[];
}

export interface DependencyWarning {
	type:
		| "node_builtin"
		| "missing_extension"
		| "deep_relative"
		| "circular_potential";
	message: string;
	source: string;
}

export interface DependencyError {
	type: "invalid_path" | "missing_dependency";
	message: string;
	source: string;
}

const NODE_BUILTINS = new Set([
	"assert",
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
	"https",
	"module",
	"net",
	"os",
	"path",
	"punycode",
	"querystring",
	"readline",
	"repl",
	"stream",
	"string_decoder",
	"sys",
	"timers",
	"tls",
	"tty",
	"url",
	"util",
	"vm",
	"zlib",
]);

export class DependencyAnalyzer {
	private analysisEngine: AnalysisEngine;

	constructor() {
		this.analysisEngine = new AnalysisEngine();

		// Register dependency-specific extractors and interpreters
		this.analysisEngine.registerExtractor(
			"dependency",
			new DependencyExtractor(),
		);
		this.analysisEngine.registerInterpreter(
			"dependency-analysis",
			new DependencyAnalysisInterpreter(),
		);
	}

	/**
	 * Analyze dependencies in a file
	 */
	async analyze(
		filePath: string,
		config?: Partial<AnalysisConfig>,
	): Promise<AnalysisResult> {
		const analysisConfig: AnalysisConfig = {
			useCache: true,
			cacheTtl: 300000, // 5 minutes
			extractors: ["dependency"],
			interpreters: ["dependency-analysis"],
			...config,
		};

		return this.analysisEngine.analyzeFile(filePath, analysisConfig);
	}

	/**
	 * Analyze dependencies in multiple files
	 */
	async analyzeBatch(
		filePaths: string[],
		config?: Partial<AnalysisConfig>,
	): Promise<AnalysisResult[]> {
		const results = await Promise.all(
			filePaths.map((filePath) => this.analyze(filePath, config)),
		);
		return results;
	}

	/**
	 * Get dependency statistics for a file
	 */
	async getStats(filePath: string): Promise<{
		totalDependencies: number;
		externalDependencies: number;
		relativeDependencies: number;
		internalDependencies: number;
		uniqueModules: number;
	}> {
		const result = await this.analyze(filePath);
		const dependencies = result.extractedData?.dependencies || [];

		const external = dependencies.filter(
			(d: DependencyInfo) => d.type === "external",
		).length;
		const relative = dependencies.filter(
			(d: DependencyInfo) => d.type === "relative",
		).length;
		const internal = dependencies.filter(
			(d: DependencyInfo) => d.type === "internal",
		).length;
		const uniqueModules = new Set(
			dependencies.map((d: DependencyInfo) => d.source),
		).size;

		return {
			totalDependencies: dependencies.length,
			externalDependencies: external,
			relativeDependencies: relative,
			internalDependencies: internal,
			uniqueModules,
		};
	}

	/**
	 * Classify a single dependency
	 */
	classifyDependency(dependency: DependencyInfo): ClassifiedDependency {
		const { source } = dependency;
		const isNodeBuiltin = NODE_BUILTINS.has(source.split("/")[0]);
		const isScopedPackage = source.startsWith("@");
		const packageName = this.getPackageName(source);
		const extension = this.getFileExtension(source);

		return {
			...dependency,
			isNodeBuiltin,
			isScopedPackage,
			packageName,
			extension,
		};
	}

	/**
	 * Classify multiple dependencies
	 */
	async classifyDependencies(
		dependencies: DependencyInfo[],
	): Promise<ClassifiedDependency[]> {
		return dependencies.map((dep) => this.classifyDependency(dep));
	}

	/**
	 * Get classification statistics
	 */
	getClassificationStats(
		dependencies: ClassifiedDependency[],
	): DependencyStats {
		const stats: DependencyStats = {
			total: dependencies.length,
			external: 0,
			relative: 0,
			internal: 0,
			nodeBuiltins: 0,
			scopedPackages: 0,
		};

		for (const dep of dependencies) {
			switch (dep.type) {
				case "external":
					stats.external++;
					break;
				case "relative":
					stats.relative++;
					break;
				case "internal":
					stats.internal++;
					break;
			}

			if (dep.isNodeBuiltin) {
				stats.nodeBuiltins++;
			}
			if (dep.isScopedPackage) {
				stats.scopedPackages++;
			}
		}

		return stats;
	}

	/**
	 * Group dependencies by package
	 */
	groupByPackage(
		dependencies: ClassifiedDependency[],
	): Map<string, ClassifiedDependency[]> {
		const groups = new Map<string, ClassifiedDependency[]>();

		for (const dep of dependencies) {
			const packageName = dep.packageName;
			if (!groups.has(packageName)) {
				groups.set(packageName, []);
			}
			groups.get(packageName)?.push(dep);
		}

		return groups;
	}

	/**
	 * Get top packages by usage
	 */
	getTopPackages(
		dependencies: ClassifiedDependency[],
		limit: number = 10,
	): PackageUsage[] {
		const externalDeps = dependencies.filter((dep) => dep.type === "external");
		const packageCounts = new Map<
			string,
			{ count: number; sources: string[] }
		>();

		for (const dep of externalDeps) {
			const packageName = dep.packageName;
			if (!packageCounts.has(packageName)) {
				packageCounts.set(packageName, { count: 0, sources: [] });
			}
			const info = packageCounts.get(packageName)!;
			info.count++;
			info.sources.push(dep.source);
		}

		return Array.from(packageCounts.entries())
			.map(([packageName, info]) => ({
				packageName,
				count: info.count,
				sources: info.sources,
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, limit);
	}

	/**
	 * Detect potential circular dependencies
	 */
	detectPotentialCircularDependencies(
		dependencies: ClassifiedDependency[],
	): ClassifiedDependency[] {
		return dependencies.filter((dep) => dep.type === "relative");
	}

	/**
	 * Suggest optimizations
	 */
	suggestOptimizations(
		dependencies: ClassifiedDependency[],
	): DependencyOptimization[] {
		const optimizations: DependencyOptimization[] = [];
		const packageGroups = this.groupByPackage(dependencies);

		// Suggest combining imports from the same package
		for (const [packageName, deps] of packageGroups) {
			if (deps.length >= 3 && deps[0].type === "external") {
				optimizations.push({
					type: "combine_imports",
					message: `Consider combining multiple imports from ${packageName} into a single import statement`,
					packageName,
					sources: deps.map((d) => d.source),
				});
			}
		}

		// Suggest barrel exports for many internal imports
		const internalDeps = dependencies.filter((d) => d.type === "internal");
		if (internalDeps.length >= 5) {
			optimizations.push({
				type: "barrel_export",
				message:
					"Consider using barrel exports (index.ts files) to simplify internal imports",
				sources: internalDeps.map((d) => d.source),
			});
		}

		// Warn about deep relative imports
		const deepRelative = dependencies.filter(
			(d) =>
				d.type === "relative" && (d.source.match(/\.\.\//g) || []).length >= 3,
		);
		for (const dep of deepRelative) {
			optimizations.push({
				type: "deep_import_warning",
				message: `Deep relative import detected: ${dep.source}. Consider restructuring or using absolute imports`,
				sources: [dep.source],
			});
		}

		return optimizations;
	}

	/**
	 * Validate dependencies
	 */
	validateDependencies(
		dependencies: ClassifiedDependency[],
	): DependencyValidation {
		const warnings: DependencyWarning[] = [];
		const errors: DependencyError[] = [];

		for (const dep of dependencies) {
			// Warn about Node.js built-ins
			if (dep.isNodeBuiltin) {
				warnings.push({
					type: "node_builtin",
					message: `Using Node.js built-in module: ${dep.source}`,
					source: dep.source,
				});
			}

			// Warn about relative imports without extensions
			if (
				dep.type === "relative" &&
				!dep.extension &&
				!dep.source.startsWith("./") &&
				!dep.source.startsWith("../")
			) {
				warnings.push({
					type: "missing_extension",
					message: `Import may be ambiguous: ${dep.source}`,
					source: dep.source,
				});
			}

			// Warn about deep relative imports
			const upLevels = (dep.source.match(/\.\.\//g) || []).length;
			if (upLevels >= 3) {
				warnings.push({
					type: "deep_relative",
					message: `Deep relative import: ${dep.source} (${upLevels} levels up)`,
					source: dep.source,
				});
			}

			// Potential circular dependency warning
			if (dep.type === "relative") {
				warnings.push({
					type: "circular_potential",
					message: `Potential circular dependency: ${dep.source}`,
					source: dep.source,
				});
			}
		}

		return { warnings, errors };
	}

	/**
	 * Generate comprehensive dependency report
	 */
	generateReport(dependencies: ClassifiedDependency[]): {
		stats: DependencyStats;
		topPackages: PackageUsage[];
		optimizations: DependencyOptimization[];
		validation: DependencyValidation;
		circularRisks: ClassifiedDependency[];
	} {
		const stats = this.getClassificationStats(dependencies);
		const topPackages = this.getTopPackages(dependencies);
		const optimizations = this.suggestOptimizations(dependencies);
		const validation = this.validateDependencies(dependencies);
		const circularRisks =
			this.detectPotentialCircularDependencies(dependencies);

		return {
			stats,
			topPackages,
			optimizations,
			validation,
			circularRisks,
		};
	}

	/**
	 * Extract package name from source
	 */
	private getPackageName(source: string): string {
		if (source.startsWith("./") || source.startsWith("../")) {
			return source.split("/")[0] || ".";
		}
		if (source.startsWith("@")) {
			// Scoped package
			const parts = source.split("/");
			return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : source;
		}
		// Regular package
		return source.split("/")[0];
	}

	/**
	 * Extract file extension from source
	 */
	private getFileExtension(source: string): string | undefined {
		const ext = path.extname(source);
		return ext || undefined;
	}

	/**
	 * Clear cache for dependency analysis
	 */
	async clearCache(): Promise<void> {
		this.analysisEngine.clearCache();
	}
}
