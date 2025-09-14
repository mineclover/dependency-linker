/**
 * Represents raw data extracted from AST by data extractors
 * This is the unprocessed output from language-specific extractors
 */

export interface ExtractedData {
	/** Type of extracted data */
	type: string;

	/** The raw extracted information */
	data: any;

	/** Extractor that produced this data */
	extractorName: string;

	/** Version of the extractor */
	extractorVersion: string;

	/** Language this data was extracted from */
	sourceLanguage: string;

	/** File path where data was extracted from */
	sourceFile: string;

	/** Extraction timestamp */
	extractedAt: Date;

	/** Additional metadata about the extraction */
	metadata: ExtractedDataMetadata;
}

export interface ExtractedDataMetadata {
	/** Number of items extracted */
	itemCount: number;

	/** Confidence level of the extraction (0-1) */
	confidence: number;

	/** Whether extraction was complete or partial */
	isComplete: boolean;

	/** Any warnings during extraction */
	warnings: string[];

	/** Performance metrics for this extraction */
	performance: {
		extractionTime: number;
		memoryUsed: number;
		astNodesProcessed: number;
	};

	/** Schema version for the extracted data */
	schemaVersion: string;

	/** Additional context-specific metadata */
	context: Record<string, any>;
}

/**
 * Common extracted data types for different languages
 */

export interface DependencyExtraction extends ExtractedData {
	type: "dependencies";
	data: {
		external: string[];
		internal: string[];
		devDependencies: string[];
		peerDependencies: string[];
		imports: ImportStatement[];
		exports: ExportStatement[];
	};
}

export interface IdentifierExtraction extends ExtractedData {
	type: "identifiers";
	data: {
		functions: FunctionIdentifier[];
		classes: ClassIdentifier[];
		interfaces: InterfaceIdentifier[];
		variables: VariableIdentifier[];
		types: TypeIdentifier[];
	};
}

export interface ComplexityExtraction extends ExtractedData {
	type: "complexity";
	data: {
		cyclomaticComplexity: number;
		cognitiveComplexity: number;
		nestingDepth: number;
		linesOfCode: number;
		maintainabilityIndex: number;
		functionComplexities: FunctionComplexity[];
	};
}

/**
 * Supporting interfaces for extracted data
 */

export interface ImportStatement {
	source: string;
	specifiers: ImportSpecifier[];
	importType: "default" | "named" | "namespace" | "side-effect";
	location: SourceLocation;
}

export interface ExportStatement {
	name?: string;
	exportType: "default" | "named" | "re-export";
	source?: string;
	location: SourceLocation;
}

export interface ImportSpecifier {
	imported: string;
	local?: string;
	type: "default" | "named" | "namespace";
}

export interface FunctionIdentifier {
	name: string;
	parameters: ParameterInfo[];
	returnType?: string;
	isAsync: boolean;
	isGenerator: boolean;
	visibility: "public" | "private" | "protected";
	location: SourceLocation;
}

export interface ClassIdentifier {
	name: string;
	extends?: string;
	implements: string[];
	methods: MethodInfo[];
	properties: PropertyInfo[];
	isAbstract: boolean;
	location: SourceLocation;
}

export interface InterfaceIdentifier {
	name: string;
	extends: string[];
	methods: MethodSignature[];
	properties: PropertySignature[];
	location: SourceLocation;
}

export interface VariableIdentifier {
	name: string;
	type?: string;
	isConst: boolean;
	isExported: boolean;
	location: SourceLocation;
}

export interface TypeIdentifier {
	name: string;
	definition: string;
	isExported: boolean;
	location: SourceLocation;
}

export interface FunctionComplexity {
	name: string;
	cyclomaticComplexity: number;
	cognitiveComplexity: number;
	nestingDepth: number;
	linesOfCode: number;
	location: SourceLocation;
}

export interface ParameterInfo {
	name: string;
	type?: string;
	isOptional: boolean;
	defaultValue?: string;
}

export interface MethodInfo {
	name: string;
	parameters: ParameterInfo[];
	returnType?: string;
	visibility: "public" | "private" | "protected";
	isStatic: boolean;
	isAbstract: boolean;
	isAsync: boolean;
	location: SourceLocation;
}

export interface PropertyInfo {
	name: string;
	type?: string;
	visibility: "public" | "private" | "protected";
	isStatic: boolean;
	isReadonly: boolean;
	location: SourceLocation;
}

export interface MethodSignature {
	name: string;
	parameters: ParameterInfo[];
	returnType?: string;
	location: SourceLocation;
}

export interface PropertySignature {
	name: string;
	type?: string;
	isOptional: boolean;
	location: SourceLocation;
}

export interface SourceLocation {
	line: number;
	column: number;
	endLine?: number;
	endColumn?: number;
	file?: string;
}

/**
 * Utility functions for working with ExtractedData
 */
/**
 * Validates extracted data structure
 */
export function validateExtractedData(data: any): data is ExtractedData {
	if (!data || typeof data !== "object") {
		return false;
	}

	const required = [
		"type",
		"data",
		"extractorName",
		"extractorVersion",
		"sourceLanguage",
		"sourceFile",
		"extractedAt",
		"metadata",
	];

	for (const field of required) {
		if (!(field in data)) {
			return false;
		}
	}

	return (
		typeof data.type === "string" &&
		typeof data.extractorName === "string" &&
		typeof data.extractorVersion === "string" &&
		typeof data.sourceLanguage === "string" &&
		typeof data.sourceFile === "string" &&
		data.extractedAt instanceof Date &&
		typeof data.metadata === "object"
	);
}

/**
 * Creates a template for extracted data
 */
export function createExtractedDataTemplate(
	type: string,
	extractorName: string,
	extractorVersion: string,
	sourceLanguage: string,
	sourceFile: string,
): Omit<ExtractedData, "data"> {
	return {
		type,
		extractorName,
		extractorVersion,
		sourceLanguage,
		sourceFile,
		extractedAt: new Date(),
		metadata: {
			itemCount: 0,
			confidence: 1.0,
			isComplete: true,
			warnings: [],
			performance: {
				extractionTime: 0,
				memoryUsed: 0,
				astNodesProcessed: 0,
			},
			schemaVersion: "1.0.0",
			context: {},
		},
	};
}

/**
 * Utility class for working with ExtractedData objects
 */
export class ExtractedDataUtils {
	/**
	 * Merges multiple extracted data objects of the same type
	 */
	static merge(dataList: ExtractedData[]): ExtractedData | null {
		if (dataList.length === 0) {
			return null;
		}

		if (dataList.length === 1) {
			return dataList[0];
		}

		const firstItem = dataList[0];
		const sameType = dataList.every((item) => item.type === firstItem.type);

		if (!sameType) {
			throw new Error("Cannot merge extracted data of different types");
		}

		const merged: ExtractedData = {
			...firstItem,
			sourceFile: `merged-${dataList.length}-files`,
			extractedAt: new Date(),
			data: {},
			metadata: {
				...firstItem.metadata,
				itemCount: 0,
				confidence: 0,
				isComplete: true,
				warnings: [],
				performance: {
					extractionTime: 0,
					memoryUsed: 0,
					astNodesProcessed: 0,
				},
				context: {
					mergedFrom: dataList.map((item) => item.sourceFile),
					mergedAt: new Date().toISOString(),
				},
			},
		};

		// Merge data based on type
		switch (firstItem.type) {
			case "dependencies":
				merged.data = ExtractedDataUtils.mergeDependencies(
					dataList as DependencyExtraction[],
				);
				break;
			case "identifiers":
				merged.data = ExtractedDataUtils.mergeIdentifiers(
					dataList as IdentifierExtraction[],
				);
				break;
			case "complexity":
				merged.data = ExtractedDataUtils.mergeComplexity(
					dataList as ComplexityExtraction[],
				);
				break;
			default:
				// Generic merge - combine arrays, sum numbers, merge objects
				merged.data = ExtractedDataUtils.genericMerge(
					dataList.map((item) => item.data),
				);
		}

		// Aggregate metadata
		merged.metadata.itemCount = dataList.reduce(
			(sum, item) => sum + item.metadata.itemCount,
			0,
		);
		merged.metadata.confidence =
			dataList.reduce((sum, item) => sum + item.metadata.confidence, 0) /
			dataList.length;
		merged.metadata.isComplete = dataList.every(
			(item) => item.metadata.isComplete,
		);
		merged.metadata.warnings = dataList.flatMap(
			(item) => item.metadata.warnings,
		);
		merged.metadata.performance.extractionTime = dataList.reduce(
			(sum, item) => sum + item.metadata.performance.extractionTime,
			0,
		);
		merged.metadata.performance.memoryUsed = Math.max(
			...dataList.map((item) => item.metadata.performance.memoryUsed),
		);
		merged.metadata.performance.astNodesProcessed = dataList.reduce(
			(sum, item) => sum + item.metadata.performance.astNodesProcessed,
			0,
		);

		return merged;
	}

	private static mergeDependencies(dataList: DependencyExtraction[]): any {
		const merged = {
			external: new Set<string>(),
			internal: new Set<string>(),
			devDependencies: new Set<string>(),
			peerDependencies: new Set<string>(),
			imports: [] as ImportStatement[],
			exports: [] as ExportStatement[],
		};

		for (const item of dataList) {
			item.data.external.forEach((dep) => merged.external.add(dep));
			item.data.internal.forEach((dep) => merged.internal.add(dep));
			item.data.devDependencies.forEach((dep) =>
				merged.devDependencies.add(dep),
			);
			item.data.peerDependencies.forEach((dep) =>
				merged.peerDependencies.add(dep),
			);
			merged.imports.push(...item.data.imports);
			merged.exports.push(...item.data.exports);
		}

		return {
			external: Array.from(merged.external),
			internal: Array.from(merged.internal),
			devDependencies: Array.from(merged.devDependencies),
			peerDependencies: Array.from(merged.peerDependencies),
			imports: merged.imports,
			exports: merged.exports,
		};
	}

	private static mergeIdentifiers(dataList: IdentifierExtraction[]): any {
		const merged = {
			functions: [] as FunctionIdentifier[],
			classes: [] as ClassIdentifier[],
			interfaces: [] as InterfaceIdentifier[],
			variables: [] as VariableIdentifier[],
			types: [] as TypeIdentifier[],
		};

		for (const item of dataList) {
			merged.functions.push(...item.data.functions);
			merged.classes.push(...item.data.classes);
			merged.interfaces.push(...item.data.interfaces);
			merged.variables.push(...item.data.variables);
			merged.types.push(...item.data.types);
		}

		return merged;
	}

	private static mergeComplexity(dataList: ComplexityExtraction[]): any {
		const functions: FunctionComplexity[] = [];
		let totalCyclomatic = 0;
		let totalCognitive = 0;
		let maxNesting = 0;
		let totalLoc = 0;
		let totalMaintainability = 0;

		for (const item of dataList) {
			totalCyclomatic += item.data.cyclomaticComplexity;
			totalCognitive += item.data.cognitiveComplexity;
			maxNesting = Math.max(maxNesting, item.data.nestingDepth);
			totalLoc += item.data.linesOfCode;
			totalMaintainability += item.data.maintainabilityIndex;
			functions.push(...item.data.functionComplexities);
		}

		return {
			cyclomaticComplexity: totalCyclomatic,
			cognitiveComplexity: totalCognitive,
			nestingDepth: maxNesting,
			linesOfCode: totalLoc,
			maintainabilityIndex: totalMaintainability / dataList.length,
			functionComplexities: functions,
		};
	}

	private static genericMerge(dataList: any[]): any {
		const merged: any = {};

		for (const data of dataList) {
			for (const [key, value] of Object.entries(data)) {
				if (Array.isArray(value)) {
					if (!merged[key]) merged[key] = [];
					merged[key].push(...value);
				} else if (typeof value === "number") {
					merged[key] = (merged[key] || 0) + value;
				} else if (typeof value === "object" && value !== null) {
					if (!merged[key]) merged[key] = {};
					Object.assign(merged[key], value);
				} else {
					merged[key] = value;
				}
			}
		}

		return merged;
	}
}
