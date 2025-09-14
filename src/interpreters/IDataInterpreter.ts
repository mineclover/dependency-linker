/**
 * Interface for data interpretation plugins
 * Processes extracted data to generate analysis insights and results
 */

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
	metadata: Record<string, any>;

	/** Configuration options */
	options?: Record<string, any>;

	/** Available related data from other extractors/interpreters */
	relatedData?: Record<string, any>;

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
	packageInfo?: any;

	/** Build configuration */
	buildConfig?: any;

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
	default?: any;

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
	enum?: any[];

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

export interface ISecurityAnalysisInterpreter
	extends IDataInterpreter<SecurityData, SecurityAnalysisResult> {
	/**
	 * Analyzes security vulnerabilities
	 */
	analyzeVulnerabilities(data: SecurityData): VulnerabilityReport;

	/**
	 * Checks for security best practices
	 */
	checkSecurityPractices(data: SecurityData): SecurityPracticeReport;

	/**
	 * Generates security recommendations
	 */
	generateSecurityRecommendations(data: SecurityData): SecurityRecommendation[];
}

export interface IQualityAnalysisInterpreter
	extends IDataInterpreter<QualityData, QualityAnalysisResult> {
	/**
	 * Analyzes code quality metrics
	 */
	analyzeCodeQuality(data: QualityData): CodeQualityReport;

	/**
	 * Detects code smells and anti-patterns
	 */
	detectCodeSmells(data: QualityData): CodeSmell[];

	/**
	 * Generates quality improvement suggestions
	 */
	generateQualityRecommendations(data: QualityData): QualityRecommendation[];
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
	location: any;
}

export interface ExportInfo {
	/** Export name */
	name: string;

	/** Export type */
	type: string;

	/** Source location */
	location: any;
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

export interface SecurityData {
	/** Dependencies with known vulnerabilities */
	vulnerableDependencies: VulnerableDependency[];

	/** Sensitive data usage patterns */
	sensitiveDataUsage: SensitiveDataPattern[];

	/** Authentication and authorization patterns */
	authPatterns: AuthPattern[];

	/** Network communication patterns */
	networkPatterns: NetworkPattern[];
}

export interface VulnerableDependency {
	/** Package name */
	name: string;

	/** Package version */
	version: string;

	/** Vulnerability details */
	vulnerabilities: Vulnerability[];
}

export interface Vulnerability {
	/** Vulnerability ID */
	id: string;

	/** Severity level */
	severity: "low" | "medium" | "high" | "critical";

	/** Description */
	description: string;

	/** Affected versions */
	affectedVersions: string[];

	/** Fix version */
	fixVersion?: string;
}

export interface SensitiveDataPattern {
	/** Pattern type */
	type: "password" | "api-key" | "token" | "personal-data";

	/** Pattern description */
	description: string;

	/** Source location */
	location: any;

	/** Risk level */
	risk: "low" | "medium" | "high";
}

export interface AuthPattern {
	/** Authentication method */
	method: string;

	/** Security strength */
	strength: "weak" | "medium" | "strong";

	/** Implementation details */
	details: Record<string, any>;
}

export interface NetworkPattern {
	/** Communication type */
	type: "http" | "https" | "websocket" | "tcp" | "udp";

	/** Endpoints */
	endpoints: string[];

	/** Security considerations */
	security: string[];
}

export interface QualityData {
	/** Complexity metrics */
	complexity: ComplexityMetrics;

	/** Code structure information */
	structure: StructureInfo;

	/** Maintainability metrics */
	maintainability: MaintainabilityMetrics;

	/** Test coverage information */
	testCoverage?: TestCoverageInfo;
}

export interface ComplexityMetrics {
	/** Cyclomatic complexity */
	cyclomatic: number;

	/** Cognitive complexity */
	cognitive: number;

	/** Nesting depth */
	nestingDepth: number;

	/** Function complexities */
	functions: FunctionComplexity[];
}

export interface FunctionComplexity {
	/** Function name */
	name: string;

	/** Complexity score */
	complexity: number;

	/** Lines of code */
	linesOfCode: number;
}

export interface StructureInfo {
	/** Number of classes */
	classCount: number;

	/** Number of functions */
	functionCount: number;

	/** Number of interfaces */
	interfaceCount: number;

	/** File size metrics */
	fileSize: FileSizeMetrics;
}

export interface FileSizeMetrics {
	/** Total lines */
	totalLines: number;

	/** Code lines */
	codeLines: number;

	/** Comment lines */
	commentLines: number;

	/** Blank lines */
	blankLines: number;
}

export interface MaintainabilityMetrics {
	/** Maintainability index */
	index: number;

	/** Code duplication percentage */
	duplication: number;

	/** Comment ratio */
	commentRatio: number;

	/** Technical debt ratio */
	technicalDebt: number;
}

export interface TestCoverageInfo {
	/** Line coverage percentage */
	lineCoverage: number;

	/** Branch coverage percentage */
	branchCoverage: number;

	/** Function coverage percentage */
	functionCoverage: number;

	/** Uncovered lines */
	uncoveredLines: number[];
}

/**
 * Common analysis result types
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

export interface SecurityAnalysisResult {
	/** Overall security score */
	securityScore: number;

	/** Vulnerability report */
	vulnerabilities: VulnerabilityReport;

	/** Security practice compliance */
	practiceCompliance: SecurityPracticeReport;

	/** Security recommendations */
	recommendations: SecurityRecommendation[];

	/** Risk assessment */
	riskAssessment: SecurityRiskAssessment;
}

export interface VulnerabilityReport {
	/** Critical vulnerabilities */
	critical: Vulnerability[];

	/** High severity vulnerabilities */
	high: Vulnerability[];

	/** Medium severity vulnerabilities */
	medium: Vulnerability[];

	/** Low severity vulnerabilities */
	low: Vulnerability[];

	/** Total vulnerability count */
	totalCount: number;
}

export interface SecurityPracticeReport {
	/** Practices correctly implemented */
	compliant: string[];

	/** Practices not implemented */
	nonCompliant: string[];

	/** Compliance percentage */
	compliancePercentage: number;
}

export interface SecurityRecommendation {
	/** Recommendation category */
	category: "vulnerability" | "practice" | "configuration";

	/** Priority level */
	priority: "low" | "medium" | "high" | "critical";

	/** Recommendation title */
	title: string;

	/** Detailed description */
	description: string;

	/** Implementation steps */
	steps: string[];

	/** Resources for more information */
	resources: string[];
}

export interface SecurityRiskAssessment {
	/** Overall risk level */
	riskLevel: "low" | "medium" | "high" | "critical";

	/** Risk factors */
	riskFactors: RiskFactor[];

	/** Risk mitigation status */
	mitigationStatus: "none" | "partial" | "complete";
}

export interface RiskFactor {
	/** Risk factor name */
	name: string;

	/** Risk impact */
	impact: "low" | "medium" | "high";

	/** Risk likelihood */
	likelihood: "low" | "medium" | "high";

	/** Risk description */
	description: string;
}

export interface QualityAnalysisResult {
	/** Overall quality score */
	qualityScore: number;

	/** Code quality report */
	codeQuality: CodeQualityReport;

	/** Code smells detected */
	codeSmells: CodeSmell[];

	/** Quality recommendations */
	recommendations: QualityRecommendation[];

	/** Quality trends */
	trends: QualityTrend[];
}

export interface CodeQualityReport {
	/** Maintainability score */
	maintainability: number;

	/** Readability score */
	readability: number;

	/** Testability score */
	testability: number;

	/** Modularity score */
	modularity: number;

	/** Technical debt hours */
	technicalDebtHours: number;
}

export interface CodeSmell {
	/** Smell type */
	type: string;

	/** Smell description */
	description: string;

	/** Severity level */
	severity: "minor" | "major" | "critical";

	/** Location in code */
	location: any;

	/** Suggested fixes */
	fixes: string[];
}

export interface QualityRecommendation {
	/** Recommendation category */
	category: "complexity" | "duplication" | "naming" | "structure" | "testing";

	/** Priority level */
	priority: "low" | "medium" | "high";

	/** Recommendation title */
	title: string;

	/** Detailed description */
	description: string;

	/** Implementation effort */
	effort: "low" | "medium" | "high";

	/** Expected benefit */
	benefit: string[];
}

export interface QualityTrend {
	/** Metric name */
	metric: string;

	/** Trend direction */
	direction: "improving" | "stable" | "declining";

	/** Change percentage */
	change: number;

	/** Time period */
	period: string;
}
