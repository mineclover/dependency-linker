/**
 * Interface for data extraction plugins
 * Extracts specific types of data from AST nodes
 */

import type { SourceLocation } from "../models/ExtractedData";

export interface IDataExtractor<T> {
	/**
	 * Extracts data from an AST
	 * @param ast The parsed AST to extract data from
	 * @param filePath File path for context
	 * @param options Optional extraction options
	 * @returns Extracted data of type T
	 */
	extract(ast: any, filePath: string, options?: ExtractorOptions): T;

	/**
	 * Checks if this extractor supports the given language
	 * @param language Language identifier
	 * @returns True if language is supported
	 */
	supports(language: string): boolean;

	/**
	 * Gets the unique name of this extractor
	 * @returns Extractor name
	 */
	getName(): string;

	/**
	 * Gets the version of this extractor
	 * @returns Version string
	 */
	getVersion(): string;

	/**
	 * Validates extracted data
	 * @param data Data to validate
	 * @returns Validation result
	 */
	validate(data: T): ValidationResult;

	/**
	 * Gets metadata about this extractor
	 * @returns Extractor metadata
	 */
	getMetadata(): ExtractorMetadata;

	/**
	 * Configures the extractor with options
	 * @param options Configuration options
	 */
	configure(options: ExtractorConfiguration): void;

	/**
	 * Gets the current configuration
	 * @returns Current configuration
	 */
	getConfiguration(): ExtractorConfiguration;

	/**
	 * Gets the output schema for this extractor
	 * @returns JSON schema describing the output format
	 */
	getOutputSchema(): OutputSchema;

	/**
	 * Cleans up extractor resources
	 */
	dispose(): void;
}

export interface ExtractorOptions {
	/** Include source locations in extracted data */
	includeLocations?: boolean;

	/** Include comments and documentation */
	includeComments?: boolean;

	/** Maximum depth to traverse */
	maxDepth?: number;

	/** Filter patterns to include/exclude */
	filters?: ExtractorFilters;

	/** Custom options specific to the extractor */
	custom?: Record<string, any>;
}

export interface ExtractorFilters {
	/** Include only items matching these patterns */
	include?: string[];

	/** Exclude items matching these patterns */
	exclude?: string[];

	/** Filter by visibility (public, private, protected) */
	visibility?: ("public" | "private" | "protected")[];

	/** Filter by item type */
	types?: string[];
}

export interface ValidationResult {
	/** Whether the data is valid */
	isValid: boolean;

	/** Validation errors */
	errors: string[];

	/** Validation warnings */
	warnings: string[];

	/** Data quality metrics */
	quality?: DataQualityMetrics;
}

export interface DataQualityMetrics {
	/** Completeness score (0-1) */
	completeness: number;

	/** Accuracy score (0-1) */
	accuracy: number;

	/** Consistency score (0-1) */
	consistency: number;

	/** Confidence score (0-1) */
	confidence: number;
}

export interface ExtractorMetadata {
	/** Extractor name */
	name: string;

	/** Extractor version */
	version: string;

	/** Description of what this extractor does */
	description: string;

	/** Supported languages */
	supportedLanguages: string[];

	/** Data types this extractor produces */
	outputTypes: string[];

	/** Dependencies on other extractors */
	dependencies: string[];

	/** Performance characteristics */
	performance: ExtractorPerformance;

	/** Author information */
	author?: string;

	/** License information */
	license?: string;

	/** Home page or repository URL */
	homepage?: string;
}

export interface ExtractorPerformance {
	/** Average extraction time per AST node */
	averageTimePerNode: number;

	/** Memory usage characteristics */
	memoryUsage: "low" | "medium" | "high";

	/** Time complexity */
	timeComplexity: "constant" | "linear" | "logarithmic" | "quadratic";

	/** Recommended maximum file size */
	maxRecommendedFileSize: number;
}

export interface ExtractorConfiguration {
	/** Whether the extractor is enabled */
	enabled?: boolean;

	/** Priority for execution order */
	priority?: number;

	/** Timeout for extraction in milliseconds */
	timeout?: number;

	/** Memory limit for extraction */
	memoryLimit?: number;

	/** Languages to process */
	languages?: string[];

	/** Default options to use */
	defaultOptions?: ExtractorOptions;

	/** Error handling strategy */
	errorHandling?: "strict" | "lenient" | "ignore";

	/** Logging level for this extractor */
	logLevel?: "debug" | "info" | "warn" | "error" | "none";
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
	/** Minimum value (for numbers) */
	minimum?: number;

	/** Maximum value (for numbers) */
	maximum?: number;

	/** Minimum length (for strings/arrays) */
	minLength?: number;

	/** Maximum length (for strings/arrays) */
	maxLength?: number;

	/** Pattern (for strings) */
	pattern?: string;

	/** Enum values */
	enum?: any[];

	/** Format (for strings) */
	format?: string;
}

/**
 * Specialized extractor interfaces for common data types
 */

export interface IDependencyExtractor
	extends IDataExtractor<DependencyExtractionResult> {
	/**
	 * Extracts dependency information from AST
	 */
	extractDependencies(ast: any, filePath: string): DependencyExtractionResult;

	/**
	 * Classifies dependencies by type
	 */
	classifyDependencies(dependencies: string[]): DependencyClassification;

	/**
	 * Resolves dependency paths
	 */
	resolveDependencyPaths(
		dependencies: string[],
		filePath: string,
	): ResolvedDependency[];
}

export interface IIdentifierExtractor
	extends IDataExtractor<IdentifierExtractionResult> {
	/**
	 * Extracts all identifiers from AST
	 */
	extractIdentifiers(ast: any, filePath: string): IdentifierExtractionResult;

	/**
	 * Extracts only exported identifiers
	 */
	extractExports(ast: any, filePath: string): ExportInfo[];

	/**
	 * Extracts type definitions
	 */
	extractTypes(ast: any, filePath: string): TypeDefinition[];
}

export interface IComplexityExtractor
	extends IDataExtractor<ComplexityExtractionResult> {
	/**
	 * Calculates various complexity metrics
	 */
	calculateComplexity(ast: any, filePath: string): ComplexityExtractionResult;

	/**
	 * Calculates cyclomatic complexity
	 */
	calculateCyclomaticComplexity(ast: any): number;

	/**
	 * Calculates cognitive complexity
	 */
	calculateCognitiveComplexity(ast: any): number;
}

/**
 * Data structures for common extraction results
 */

export interface DependencyExtractionResult {
	/** External dependencies (npm packages, etc.) */
	external: string[];

	/** Internal dependencies (local files) */
	internal: string[];

	/** Development dependencies */
	devDependencies: string[];

	/** Peer dependencies */
	peerDependencies: string[];

	/** Import statements with details */
	imports: ImportStatement[];

	/** Export statements with details */
	exports: ExportStatement[];

	/** Dependency graph */
	dependencyGraph: DependencyGraph;
}

export interface ImportStatement {
	/** Source module/file */
	source: string;

	/** Import specifiers */
	specifiers: ImportSpecifier[];

	/** Import type */
	type: "default" | "named" | "namespace" | "side-effect" | "dynamic";

	/** Source location */
	location: SourceLocation;

	/** Whether import is type-only */
	isTypeOnly?: boolean;
}

export interface ExportStatement {
	/** Export name */
	name?: string;

	/** Export type */
	type: "default" | "named" | "re-export" | "namespace";

	/** Source module (for re-exports) */
	source?: string;

	/** Source location */
	location: SourceLocation;

	/** Whether export is type-only */
	isTypeOnly?: boolean;
}

export interface ImportSpecifier {
	/** Imported name */
	imported: string;

	/** Local name (if renamed) */
	local?: string;

	/** Specifier type */
	type: "default" | "named" | "namespace";
}

export interface DependencyGraph {
	/** Graph nodes (files/modules) */
	nodes: DependencyNode[];

	/** Graph edges (dependencies) */
	edges: DependencyEdge[];

	/** Circular dependencies */
	cycles: string[][];
}

export interface DependencyNode {
	/** Node identifier */
	id: string;

	/** File path */
	filePath: string;

	/** Node type */
	type: "internal" | "external" | "builtin";

	/** Additional metadata */
	metadata: Record<string, any>;
}

export interface DependencyEdge {
	/** Source node ID */
	from: string;

	/** Target node ID */
	to: string;

	/** Dependency type */
	type: "import" | "require" | "dynamic";

	/** Edge weight (usage frequency, etc.) */
	weight?: number;
}

export interface DependencyClassification {
	/** Production dependencies */
	production: string[];

	/** Development dependencies */
	development: string[];

	/** Built-in/standard library */
	builtin: string[];

	/** Unknown or unresolved */
	unknown: string[];
}

export interface ResolvedDependency {
	/** Original dependency string */
	original: string;

	/** Resolved file path */
	resolved: string;

	/** Resolution type */
	type: "file" | "package" | "builtin" | "unresolved";

	/** Resolution metadata */
	metadata?: Record<string, any>;
}

export interface IdentifierExtractionResult {
	/** Function definitions */
	functions: FunctionDefinition[];

	/** Class definitions */
	classes: ClassDefinition[];

	/** Interface definitions */
	interfaces: InterfaceDefinition[];

	/** Variable declarations */
	variables: VariableDeclaration[];

	/** Type definitions */
	types: TypeDefinition[];

	/** Constant definitions */
	constants: ConstantDefinition[];
}

export interface FunctionDefinition {
	/** Function name */
	name: string;

	/** Parameters */
	parameters: Parameter[];

	/** Return type */
	returnType?: string;

	/** Function modifiers */
	modifiers: string[];

	/** Source location */
	location: SourceLocation;

	/** Whether function is exported */
	isExported: boolean;

	/** Function body (if requested) */
	body?: string;
}

export interface ClassDefinition {
	/** Class name */
	name: string;

	/** Extended class */
	extends?: string;

	/** Implemented interfaces */
	implements: string[];

	/** Class methods */
	methods: MethodDefinition[];

	/** Class properties */
	properties: PropertyDefinition[];

	/** Class modifiers */
	modifiers: string[];

	/** Source location */
	location: SourceLocation;

	/** Whether class is exported */
	isExported: boolean;
}

export interface InterfaceDefinition {
	/** Interface name */
	name: string;

	/** Extended interfaces */
	extends: string[];

	/** Interface methods */
	methods: MethodSignature[];

	/** Interface properties */
	properties: PropertySignature[];

	/** Source location */
	location: SourceLocation;

	/** Whether interface is exported */
	isExported: boolean;
}

export interface VariableDeclaration {
	/** Variable name */
	name: string;

	/** Variable type */
	type?: string;

	/** Declaration kind */
	kind: "var" | "let" | "const";

	/** Initial value */
	initialValue?: string;

	/** Source location */
	location: SourceLocation;

	/** Whether variable is exported */
	isExported: boolean;
}

export interface TypeDefinition {
	/** Type name */
	name: string;

	/** Type definition */
	definition: string;

	/** Type category */
	category:
		| "primitive"
		| "object"
		| "union"
		| "intersection"
		| "generic"
		| "alias";

	/** Source location */
	location: SourceLocation;

	/** Whether type is exported */
	isExported: boolean;
}

export interface ConstantDefinition {
	/** Constant name */
	name: string;

	/** Constant value */
	value: any;

	/** Constant type */
	type?: string;

	/** Source location */
	location: SourceLocation;

	/** Whether constant is exported */
	isExported: boolean;
}

export interface Parameter {
	/** Parameter name */
	name: string;

	/** Parameter type */
	type?: string;

	/** Whether parameter is optional */
	isOptional: boolean;

	/** Default value */
	defaultValue?: string;

	/** Whether parameter is rest parameter */
	isRest: boolean;
}

export interface MethodDefinition {
	/** Method name */
	name: string;

	/** Method parameters */
	parameters: Parameter[];

	/** Return type */
	returnType?: string;

	/** Method modifiers */
	modifiers: string[];

	/** Visibility */
	visibility: "public" | "private" | "protected";

	/** Source location */
	location: SourceLocation;

	/** Method body (if requested) */
	body?: string;
}

export interface PropertyDefinition {
	/** Property name */
	name: string;

	/** Property type */
	type?: string;

	/** Property modifiers */
	modifiers: string[];

	/** Visibility */
	visibility: "public" | "private" | "protected";

	/** Initial value */
	initialValue?: string;

	/** Source location */
	location: SourceLocation;
}

export interface MethodSignature {
	/** Method name */
	name: string;

	/** Method parameters */
	parameters: Parameter[];

	/** Return type */
	returnType?: string;

	/** Source location */
	location: SourceLocation;
}

export interface PropertySignature {
	/** Property name */
	name: string;

	/** Property type */
	type?: string;

	/** Whether property is optional */
	isOptional: boolean;

	/** Whether property is readonly */
	isReadonly: boolean;

	/** Source location */
	location: SourceLocation;
}

export interface ComplexityExtractionResult {
	/** Cyclomatic complexity */
	cyclomaticComplexity: number;

	/** Cognitive complexity */
	cognitiveComplexity: number;

	/** Nesting depth */
	nestingDepth: number;

	/** Lines of code */
	linesOfCode: number;

	/** Maintainability index */
	maintainabilityIndex: number;

	/** Halstead metrics */
	halstead: HalsteadMetrics;

	/** Function-level complexity */
	functionComplexities: FunctionComplexityMetrics[];

	/** Class-level complexity */
	classComplexities: ClassComplexityMetrics[];
}

export interface HalsteadMetrics {
	/** Program length */
	length: number;

	/** Program vocabulary */
	vocabulary: number;

	/** Program volume */
	volume: number;

	/** Program difficulty */
	difficulty: number;

	/** Programming effort */
	effort: number;

	/** Time to implement */
	timeToImplement: number;

	/** Number of bugs */
	bugs: number;
}

export interface FunctionComplexityMetrics {
	/** Function name */
	name: string;

	/** Cyclomatic complexity */
	cyclomaticComplexity: number;

	/** Cognitive complexity */
	cognitiveComplexity: number;

	/** Nesting depth */
	nestingDepth: number;

	/** Lines of code */
	linesOfCode: number;

	/** Number of parameters */
	parameterCount: number;

	/** Source location */
	location: SourceLocation;
}

export interface ClassComplexityMetrics {
	/** Class name */
	name: string;

	/** Weighted methods per class */
	weightedMethodsPerClass: number;

	/** Number of methods */
	methodCount: number;

	/** Number of properties */
	propertyCount: number;

	/** Depth of inheritance */
	depthOfInheritance: number;

	/** Coupling between objects */
	couplingBetweenObjects: number;

	/** Source location */
	location: SourceLocation;
}

export interface ExportInfo {
	/** Export name */
	name?: string;

	/** Export type */
	type: "default" | "named" | "re-export";

	/** Local name (if different from export name) */
	localName?: string;

	/** Source module (for re-exports) */
	source?: string;

	/** Source location */
	location: SourceLocation;
}
