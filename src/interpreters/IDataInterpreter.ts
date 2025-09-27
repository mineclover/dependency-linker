/**
 * Interface for data interpretation plugins
 * Processes extracted data to generate analysis insights and results
 */

import type { SourceLocation } from "../models/SourceLocation";

export interface IDataInterpreter<TInput, TOutput> {
	/**
	 * Interprets extracted data and generates analysis results
	 * @param data Input data to interpret
	 * @param context Interpretation context
	 * @returns Interpreted analysis results
	 */
	interpret(data: TInput, context: InterpreterContext): TOutput;

	/**
	 * Checks if this interpreter supports the given data type
	 * @param dataType Type identifier of the data
	 * @returns True if data type is supported
	 */
	supports(dataType: string): boolean;

	/**
	 * Gets the unique name of this interpreter
	 * @returns Interpreter name
	 */
	getName(): string;

	/**
	 * Gets the version of this interpreter
	 * @returns Version string
	 */
	getVersion(): string;

	/**
	 * Validates input data before interpretation
	 * @param input Input data to validate
	 * @returns Validation result
	 */
	validate(input: TInput): ValidationResult;

	/**
	 * Validates output data after interpretation
	 * @param output Output data to validate
	 * @returns Validation result
	 */
	validateOutput?(output: TOutput): ValidationResult;

	/**
	 * Gets the output schema for this interpreter
	 * @returns JSON schema describing the output format
	 */
	getOutputSchema(): OutputSchema;

	/**
	 * Gets metadata about this interpreter
	 * @returns Interpreter metadata
	 */
	getMetadata(): InterpreterMetadata;

	/**
	 * Configures the interpreter with options
	 * @param options Configuration options
	 */
	configure(options: InterpreterConfiguration): void;

	/**
	 * Gets the current configuration
	 * @returns Current configuration
	 */
	getConfiguration(): InterpreterConfiguration;

	/**
	 * Gets the data types this interpreter can process
	 * @returns Array of supported input data types
	 */
	getSupportedDataTypes(): string[];

	/**
	 * Gets dependencies on other interpreters or data
	 * @returns Array of dependency specifications
	 */
	getDependencies(): InterpreterDependency[];

	/**
	 * Cleans up interpreter resources
	 */
	dispose(): void;
}

export interface InterpretationOptions {
	/** Analysis context */
	context?: Record<string, any>;
	/** Configuration options */
	options?: Record<string, any>;
	/** Processing hints */
	hints?: string[];
}

export interface InterpreterContext {
	/** File path being analyzed */
	filePath: string;

	/** Programming language */
	language: string;

	/** Analysis metadata */
	metadata: Record<string, unknown>;

	/** Configuration options */
	options?: Record<string, unknown>;

	/** Available related data from other extractors/interpreters */
	relatedData?: Record<string, unknown>;

	/** Analysis timestamp */
	timestamp: Date;

	/** Project context information */
	projectContext?: ProjectContext;
}

export interface ProjectContext {
	/** Project root directory */
	rootPath: string;

	/** Project type (library, application, etc.) */
	projectType: string;

	/** Package.json or equivalent configuration */
	packageInfo?: Record<string, unknown>;

	/** Build configuration */
	buildConfig?: Record<string, unknown>;

	/** Git information */
	gitInfo?: GitContext;

	/** Environment information */
	environment?: string;
}

export interface GitContext {
	/** Current branch */
	branch: string;

	/** Latest commit hash */
	commit: string;

	/** Repository URL */
	remoteUrl?: string;

	/** Whether working directory is clean */
	isClean: boolean;
}

export interface ValidationResult {
	/** Whether the input is valid */
	isValid: boolean;

	/** Validation errors */
	errors: string[];

	/** Validation warnings */
	warnings: string[];

	/** Data quality assessment */
	quality?: DataQuality;
}

export interface DataQuality {
	/** Completeness score (0-1) */
	completeness: number;

	/** Accuracy score (0-1) */
	accuracy: number;

	/** Consistency score (0-1) */
	consistency: number;

	/** Freshness score (0-1) */
	freshness: number;

	/** Overall quality score (0-1) */
	overall: number;
}

export interface OutputSchema {
	/** Schema type */
	type: string;

	/** Schema properties */
	properties: Record<string, SchemaProperty>;

	/** Required properties */
	required: string[];

	/** Schema version */
	version: string;

	/** Additional schema metadata */
	metadata?: Record<string, any>;
}

export interface SchemaProperty {
	/** Property type */
	type: string;

	/** Property description */
	description?: string;

	/** Whether property is required */
	required?: boolean;

	/** Default value */
	default?: unknown;

	/** Value constraints */
	constraints?: PropertyConstraints;

	/** Nested properties (for objects) */
	properties?: Record<string, SchemaProperty>;

	/** Array item schema (for arrays) */
	items?: SchemaProperty;
}

export interface PropertyConstraints {
	/** Minimum value */
	minimum?: number;

	/** Maximum value */
	maximum?: number;

	/** Minimum length */
	minLength?: number;

	/** Maximum length */
	maxLength?: number;

	/** Pattern constraint */
	pattern?: string;

	/** Enumerated values */
	enum?: unknown[];

	/** Format specification */
	format?: string;
}

export interface InterpreterMetadata {
	/** Interpreter name */
	name: string;

	/** Interpreter version */
	version: string;

	/** Description of what this interpreter does */
	description: string;

	/** Supported input data types */
	supportedDataTypes: string[];

	/** Legacy: supported input types (for compatibility) */
	supportedInputTypes?: string[];

	/** Legacy: supported output types (for compatibility) */
	supportedOutputTypes?: string[];

	/** Output data type */
	outputType: string;

	/** Dependencies on other interpreters */
	dependencies: string[];

	/** Performance characteristics */
	performance: InterpreterPerformance;

	/** Quality characteristics */
	quality: InterpreterQuality;

	/** Author information */
	author?: string;

	/** License information */
	license?: string;

	/** Home page or repository URL */
	homepage?: string;
}

export interface InterpreterPerformance {
	/** Average processing time per data item */
	averageTimePerItem: number;

	/** Memory usage characteristics */
	memoryUsage: "low" | "medium" | "high";

	/** Time complexity */
	timeComplexity: "constant" | "linear" | "logarithmic" | "quadratic";

	/** Scalability characteristics */
	scalability: "excellent" | "good" | "fair" | "poor";

	/** Recommended maximum data size */
	maxRecommendedDataSize: number;
}

export interface InterpreterQuality {
	/** Accuracy of interpretations */
	accuracy: number;

	/** Consistency of results */
	consistency: number;

	/** Completeness of analysis */
	completeness: number;

	/** Reliability score */
	reliability: number;
}

export interface InterpreterConfiguration {
	/** Whether the interpreter is enabled */
	enabled?: boolean;

	/** Priority for execution order */
	priority?: number;

	/** Timeout for interpretation in milliseconds */
	timeout?: number;

	/** Memory limit for interpretation */
	memoryLimit?: number;

	/** Minimum confidence threshold for input data */
	minConfidence?: number;

	/** Data types to process */
	dataTypes?: string[];

	/** Default options to use */
	defaultOptions?: Record<string, any>;

	/** Error handling strategy */
	errorHandling?: "strict" | "lenient" | "ignore";

	/** Output format preferences */
	outputFormat?: "detailed" | "summary" | "minimal";

	/** Logging level for this interpreter */
	logLevel?: "debug" | "info" | "warn" | "error" | "none";
}

export interface InterpreterDependency {
	/** Type of dependency */
	type: "extractor" | "interpreter" | "data";

	/** Name of the dependency */
	name: string;

	/** Whether dependency is optional */
	optional: boolean;

	/** Version constraint */
	version?: string;
}

/**
 * Specialized interpreter interfaces for common analysis types
 */

export interface IDependencyAnalysisInterpreter
	extends IDataInterpreter<DependencyData, DependencyAnalysisResult> {
	/**
	 * Analyzes dependency patterns and relationships
	 */
	analyzeDependencyPatterns(data: DependencyData): DependencyPatternAnalysis;

	/**
	 * Detects circular dependencies
	 */
	detectCircularDependencies(data: DependencyData): CircularDependency[];

	/**
	 * Analyzes dependency health and risks
	 */
	analyzeDependencyHealth(data: DependencyData): DependencyHealthReport;

	/**
	 * Generates dependency optimization recommendations
	 */
	generateOptimizationRecommendations(
		data: DependencyData,
	): OptimizationRecommendation[];
}

/**
 * Common data types for interpreters
 */

export interface DependencyData {
	/** External dependencies */
	external: string[];

	/** Internal dependencies */
	internal: string[];

	/** Import statements */
	imports: ImportInfo[];

	/** Export statements */
	exports: ExportInfo[];

	/** Dependency graph */
	graph: DependencyGraph;
}

export interface ImportInfo {
	/** Source module */
	source: string;

	/** Import type */
	type: string;

	/** Import specifiers */
	specifiers: string[];

	/** Source location */
	location: SourceLocation;
}

export interface ExportInfo {
	/** Export name */
	name: string;

	/** Export type */
	type: string;

	/** Source location */
	location: SourceLocation;
}

export interface DependencyGraph {
	/** Graph nodes */
	nodes: GraphNode[];

	/** Graph edges */
	edges: GraphEdge[];
}

export interface GraphNode {
	/** Node ID */
	id: string;

	/** Node type */
	type: string;

	/** Node metadata */
	metadata: Record<string, any>;
}

export interface GraphEdge {
	/** Source node */
	from: string;

	/** Target node */
	to: string;

	/** Edge type */
	type: string;

	/** Edge weight */
	weight?: number;
}

/**
 * Analysis result types
 */
export interface DependencyAnalysisResult {
	/** Overall dependency health score */
	healthScore: number;

	/** Dependency pattern analysis */
	patterns: DependencyPatternAnalysis;

	/** Circular dependencies */
	circularDependencies: CircularDependency[];

	/** Dependency risks */
	risks: DependencyRisk[];

	/** Optimization recommendations */
	recommendations: OptimizationRecommendation[];

	/** Metrics summary */
	metrics: DependencyMetrics;
}

export interface DependencyPatternAnalysis {
	/** Common dependency patterns found */
	patterns: string[];

	/** Anti-patterns detected */
	antiPatterns: string[];

	/** Pattern compliance score */
	complianceScore: number;
}

export interface CircularDependency {
	/** Files involved in the cycle */
	cycle: string[];

	/** Cycle severity */
	severity: "low" | "medium" | "high";

	/** Suggested resolution */
	resolution: string;
}

export interface DependencyRisk {
	/** Risk type */
	type: "outdated" | "vulnerable" | "unused" | "bloated";

	/** Risk description */
	description: string;

	/** Risk severity */
	severity: "low" | "medium" | "high" | "critical";

	/** Affected dependencies */
	dependencies: string[];

	/** Mitigation suggestions */
	mitigation: string[];
}

export interface OptimizationRecommendation {
	/** Recommendation type */
	type: "reduce" | "update" | "replace" | "remove";

	/** Recommendation description */
	description: string;

	/** Expected impact */
	impact: "low" | "medium" | "high";

	/** Implementation effort */
	effort: "low" | "medium" | "high";

	/** Specific actions */
	actions: string[];
}

export interface DependencyMetrics {
	/** Total dependency count */
	totalCount: number;

	/** External dependency count */
	externalCount: number;

	/** Internal dependency count */
	internalCount: number;

	/** Depth of dependency tree */
	maxDepth: number;

	/** Average dependencies per file */
	averagePerFile: number;
}

export interface DependencyHealthReport {
	/** Overall health score (0-100) */
	healthScore: number;

	/** Health status */
	status: "healthy" | "warning" | "critical";

	/** Health issues found */
	issues: DependencyHealthIssue[];

	/** Health metrics */
	metrics: DependencyHealthMetrics;

	/** Recommendations for improvement */
	recommendations: string[];
}

export interface DependencyHealthIssue {
	/** Issue type */
	type: "outdated" | "vulnerable" | "unused" | "circular" | "missing";

	/** Issue description */
	description: string;

	/** Severity level */
	severity: "low" | "medium" | "high" | "critical";

	/** Affected dependencies */
	dependencies: string[];

	/** Suggested resolution */
	resolution: string;
}

export interface DependencyHealthMetrics {
	/** Percentage of up-to-date dependencies */
	upToDatePercentage: number;

	/** Number of security vulnerabilities */
	vulnerabilityCount: number;

	/** Number of unused dependencies */
	unusedCount: number;

	/** Number of circular dependencies */
	circularCount: number;

	/** Average age of dependencies in days */
	averageAge: number;
}
