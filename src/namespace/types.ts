/**
 * Namespace configuration types for file pattern-based dependency analysis
 */

/**
 * Namespace configuration with file patterns
 */
export interface NamespaceConfig {
	/** Project name for RDF addressing (e.g., "dependency-linker") - optional, defaults to package.json name */
	projectName?: string;
	/** File patterns to include (glob patterns) */
	filePatterns: string[];
	/** File patterns to exclude (glob patterns) */
	excludePatterns?: string[];
	/** Optional description of the namespace */
	description?: string;
	/** Semantic tags to apply to files in this namespace */
	semanticTags?: string[];
	/** Scenario IDs to run for this namespace */
	scenarios?: string[];
	/** Scenario-specific configuration */
	scenarioConfig?: Record<string, Record<string, unknown>>;
}

/**
 * Configuration file structure
 */
export interface ConfigFile {
	/** Available namespaces */
	namespaces: Record<string, NamespaceConfig>;
	/** Default namespace to use */
	default?: string;
}

/**
 * Namespace with matched files
 */
export interface NamespaceWithFiles {
	/** Namespace name */
	namespace: string;
	/** Namespace configuration */
	metadata: NamespaceConfig;
	/** Matched file paths */
	files: string[];
	/** Number of matched files */
	fileCount: number;
}

/**
 * Files categorized by namespace
 */
export interface CategorizedFiles {
	[namespace: string]: string[];
}

/**
 * List of available namespaces
 */
export interface NamespaceList {
	/** Available namespace names */
	namespaces: string[];
	/** Default namespace if set */
	default?: string;
}

/**
 * Namespace dependency analysis result
 */
export interface NamespaceDependencyResult {
	/** Namespace name */
	namespace: string;
	/** Total files analyzed */
	totalFiles: number;
	/** Successfully analyzed files */
	analyzedFiles: number;
	/** Failed files */
	failedFiles: string[];
	/** Analysis errors */
	errors: Array<{ file: string; error: string }>;
	/** Dependency graph statistics */
	graphStats: {
		nodes: number;
		edges: number;
		circularDependencies: number;
	};
	/** Scenarios executed for this namespace (in execution order) */
	scenariosExecuted?: string[];
}
