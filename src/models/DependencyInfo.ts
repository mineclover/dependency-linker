/**
 * Dependency Information Model
 * Information about a dependency found in the file
 */

import type { SourceLocation } from "./SourceLocation";

export interface DependencyInfo {
	/** The module/package being imported from */
	source: string;
	/** Type of dependency */
	type: "external" | "internal" | "relative";
	/** Where in the file this dependency appears */
	location: SourceLocation;
}

/**
 * Classifies a dependency based on its source string
 * @param source The import/require source string
 * @returns The classified dependency type
 */
export function classifyDependencyType(source: string): DependencyInfo["type"] {
	// Relative imports (start with ./ or ../)
	if (source.startsWith("./") || source.startsWith("../")) {
		return "relative";
	}

	// Absolute paths (start with /)
	if (source.startsWith("/")) {
		return "internal";
	}

	// Check for common internal module patterns
	const internalPatterns = [
		/^src\//,
		/^lib\//,
		/^app\//,
		/^config\//,
		/^utils\//,
		/^common\//,
		/^shared\//,
		/^components\//,
		/^services\//,
		/^models\//,
		/^types\//,
		/^hooks\//,
		/^store\//,
		/^pages\//,
		/^views\//,
		/^routes\//,
		/^api\//,
		/^db\//,
		/^database\//,
		/^middleware\//,
		/^controllers\//,
	];

	for (const pattern of internalPatterns) {
		if (pattern.test(source)) {
			return "internal";
		}
	}

	// External packages (everything else)
	return "external";
}

/**
 * Determines if a dependency is a Node.js built-in module
 * @param source The dependency source
 * @returns True if it's a Node.js built-in module
 */
export function isNodeBuiltin(source: string): boolean {
	const builtins = [
		"assert",
		"buffer",
		"child_process",
		"cluster",
		"crypto",
		"dgram",
		"dns",
		"events",
		"fs",
		"http",
		"https",
		"net",
		"os",
		"path",
		"querystring",
		"readline",
		"stream",
		"string_decoder",
		"tls",
		"tty",
		"url",
		"util",
		"vm",
		"zlib",
		"constants",
		"domain",
		"punycode",
		"process",
		"v8",
		"async_hooks",
		"http2",
		"perf_hooks",
		"trace_events",
		"worker_threads",
		"inspector",
		"timers",
		"console",
		"module",
		"repl",
	];

	// Handle node: protocol
	if (source.startsWith("node:")) {
		const moduleName = source.substring(5);
		return builtins.includes(moduleName);
	}

	return builtins.includes(source);
}

/**
 * Determines if a dependency is a scoped package
 * @param source The dependency source
 * @returns True if it's a scoped package (e.g., @org/package)
 */
export function isScopedPackage(source: string): boolean {
	return source.startsWith("@") && source.includes("/");
}

/**
 * Extracts the package name from a dependency source
 * @param source The dependency source
 * @returns The package name (without sub-paths)
 */
export function getPackageName(source: string): string {
	if (isScopedPackage(source)) {
		// For scoped packages like @org/package/sub/path
		const parts = source.split("/");
		return `${parts[0]}/${parts[1]}`;
	}

	// For regular packages like package/sub/path
	return source.split("/")[0];
}

/**
 * Creates a dependency info object
 * @param source The dependency source
 * @param location The source location
 * @returns DependencyInfo object
 */
export function createDependencyInfo(
	source: string,
	location: SourceLocation,
): DependencyInfo {
	return {
		source,
		type: classifyDependencyType(source),
		location,
	};
}

/**
 * Validates a dependency info object
 * @param dependency The dependency to validate
 * @returns True if the dependency is valid
 */
export function isValidDependencyInfo(
	dependency: any,
): dependency is DependencyInfo {
	return (
		dependency &&
		typeof dependency === "object" &&
		typeof dependency.source === "string" &&
		dependency.source.length > 0 &&
		["external", "internal", "relative"].includes(dependency.type) &&
		dependency.location &&
		typeof dependency.location === "object"
	);
}

/**
 * Groups dependencies by type
 * @param dependencies Array of dependencies to group
 * @returns Dependencies grouped by type
 */
export function groupDependenciesByType(dependencies: DependencyInfo[]): {
	external: DependencyInfo[];
	internal: DependencyInfo[];
	relative: DependencyInfo[];
} {
	return dependencies.reduce(
		(groups, dep) => {
			groups[dep.type].push(dep);
			return groups;
		},
		{
			external: [] as DependencyInfo[],
			internal: [] as DependencyInfo[],
			relative: [] as DependencyInfo[],
		},
	);
}

/**
 * Gets unique dependency sources
 * @param dependencies Array of dependencies
 * @returns Array of unique source strings
 */
export function getUniqueSources(dependencies: DependencyInfo[]): string[] {
	return [...new Set(dependencies.map((dep) => dep.source))];
}

/**
 * Filters dependencies by type
 * @param dependencies Array of dependencies
 * @param type The type to filter by
 * @returns Dependencies matching the specified type
 */
export function filterByType(
	dependencies: DependencyInfo[],
	type: DependencyInfo["type"],
): DependencyInfo[] {
	return dependencies.filter((dep) => dep.type === type);
}

/**
 * Gets dependency statistics
 * @param dependencies Array of dependencies to analyze
 * @returns Statistics about the dependencies
 */
export function getDependencyStats(dependencies: DependencyInfo[]): {
	total: number;
	external: number;
	internal: number;
	relative: number;
	unique: number;
	nodeBuiltins: number;
	scopedPackages: number;
} {
	const grouped = groupDependenciesByType(dependencies);
	const uniqueSources = getUniqueSources(dependencies);

	const nodeBuiltins = dependencies.filter((dep) =>
		isNodeBuiltin(dep.source),
	).length;
	const scopedPackages = dependencies.filter((dep) =>
		isScopedPackage(dep.source),
	).length;

	return {
		total: dependencies.length,
		external: grouped.external.length,
		internal: grouped.internal.length,
		relative: grouped.relative.length,
		unique: uniqueSources.length,
		nodeBuiltins,
		scopedPackages,
	};
}
