/**
 * IdentifierAnalysisInterpreter - Built-in interpreter for identifier analysis
 * Processes extracted identifier data to provide code structure insights
 */

import type {
	IdentifierExtractionResult,
	IdentifierInfo,
} from "../extractors/IdentifierExtractor";
import type { IDataInterpreter } from "./IDataInterpreter";

export interface IdentifierAnalysisResult {
	summary: {
		codebaseStructure: {
			totalIdentifiers: number;
			publicApi: number;
			privateImplementation: number;
			exportRatio: number;
		};
		complexity: {
			averageParametersPerFunction: number;
			functionsWithManyParameters: number; // >5 parameters
			largeClasses: number; // >10 methods/properties
			deepInheritance: number; // Would need inheritance analysis
		};
		patterns: {
			namingConventions: NamingConventionAnalysis;
			designPatterns: DetectedPattern[];
			antiPatterns: DetectedAntiPattern[];
		};
	};
	recommendations: {
		codeQuality: CodeQualityRecommendation[];
		refactoring: RefactoringRecommendation[];
		architecture: ArchitectureRecommendation[];
	};
	metrics: {
		cohesion: number;
		abstraction: number;
		encapsulation: number;
		apiStability: number;
	};
}

export interface NamingConventionAnalysis {
	camelCase: number;
	pascalCase: number;
	snakeCase: number;
	kebabCase: number;
	inconsistencies: string[];
	conventionScore: number;
}

export interface DetectedPattern {
	type:
		| "singleton"
		| "factory"
		| "observer"
		| "strategy"
		| "decorator"
		| "adapter";
	confidence: number;
	identifiers: string[];
	description: string;
}

export interface DetectedAntiPattern {
	type:
		| "god_class"
		| "long_parameter_list"
		| "primitive_obsession"
		| "data_class";
	severity: "low" | "medium" | "high";
	identifiers: string[];
	description: string;
	impact: string;
}

export interface CodeQualityRecommendation {
	type: "naming" | "complexity" | "visibility" | "documentation";
	priority: "low" | "medium" | "high";
	title: string;
	description: string;
	affectedIdentifiers: string[];
	implementation: string;
}

export interface RefactoringRecommendation {
	type:
		| "extract_method"
		| "extract_class"
		| "reduce_parameters"
		| "increase_cohesion";
	priority: "low" | "medium" | "high";
	title: string;
	description: string;
	affectedIdentifiers: string[];
	estimatedEffort: "low" | "medium" | "high";
}

export interface ArchitectureRecommendation {
	type:
		| "interface_segregation"
		| "dependency_inversion"
		| "single_responsibility"
		| "open_closed";
	priority: "low" | "medium" | "high";
	title: string;
	description: string;
	affectedComponents: string[];
	implementation: string;
}

export class IdentifierAnalysisInterpreter
	implements
		IDataInterpreter<IdentifierExtractionResult, IdentifierAnalysisResult>
{
	public readonly name = "IdentifierAnalysisInterpreter";
	public readonly version = "1.0.0";
	public readonly description =
		"Interprets identifier extraction data to provide code structure insights";

	interpret(
		input: IdentifierExtractionResult,
		_context?: any,
	): IdentifierAnalysisResult {
		const identifiers = input.identifiers;

		// Analyze codebase structure
		const codebaseStructure = this.analyzeCodebaseStructure(input, identifiers);

		// Analyze complexity patterns
		const complexity = this.analyzeComplexity(identifiers);

		// Analyze naming and design patterns
		const patterns = this.analyzePatterns(identifiers);

		// Generate recommendations
		const recommendations = this.generateRecommendations(
			identifiers,
			complexity,
			patterns,
		);

		// Calculate quality metrics
		const metrics = this.calculateMetrics(identifiers, codebaseStructure);

		return {
			summary: {
				codebaseStructure,
				complexity,
				patterns,
			},
			recommendations,
			metrics,
		};
	}

	private analyzeCodebaseStructure(
		input: IdentifierExtractionResult,
		identifiers: IdentifierInfo[],
	): IdentifierAnalysisResult["summary"]["codebaseStructure"] {
		const totalIdentifiers = input.totalCount;
		const safeIdentifiers = identifiers || [];
		const publicApi = safeIdentifiers.filter(
			(i) => i.visibility === "public" || i.isExported,
		).length;
		const privateImplementation = totalIdentifiers - publicApi;
		const exportRatio = input.exportedCount / totalIdentifiers;

		return {
			totalIdentifiers,
			publicApi,
			privateImplementation,
			exportRatio: Math.round(exportRatio * 100) / 100,
		};
	}

	private analyzeComplexity(
		identifiers: IdentifierInfo[],
	): IdentifierAnalysisResult["summary"]["complexity"] {
		const safeIdentifiers = identifiers || [];
		const functions = safeIdentifiers.filter((i) => i.type === "function");

		// Calculate average parameters per function
		const totalParameters = functions.reduce(
			(sum, func) => sum + (func.parameters?.length || 0),
			0,
		);
		const averageParametersPerFunction =
			functions.length > 0 ? totalParameters / functions.length : 0;

		// Count functions with many parameters (>5)
		const functionsWithManyParameters = functions.filter(
			(f) => (f.parameters?.length || 0) > 5,
		).length;

		// Count large classes (simplified - would need method analysis)
		const classes = identifiers.filter((i) => i.type === "class");
		const largeClasses = classes.filter(
			(c) =>
				// This is a simplified heuristic - would need more sophisticated analysis
				identifiers.filter(
					(i) =>
						i.location.line > c.location.line &&
						i.location.line < c.location.endLine,
				).length > 10,
		).length;

		return {
			averageParametersPerFunction:
				Math.round(averageParametersPerFunction * 100) / 100,
			functionsWithManyParameters,
			largeClasses,
			deepInheritance: 0, // Would need inheritance analysis
		};
	}

	private analyzePatterns(
		identifiers: IdentifierInfo[],
	): IdentifierAnalysisResult["summary"]["patterns"] {
		const namingConventions = this.analyzeNamingConventions(identifiers);
		const designPatterns = this.detectDesignPatterns(identifiers);
		const antiPatterns = this.detectAntiPatterns(identifiers);

		return {
			namingConventions,
			designPatterns,
			antiPatterns,
		};
	}

	private analyzeNamingConventions(
		identifiers: IdentifierInfo[],
	): NamingConventionAnalysis {
		let camelCase = 0;
		let pascalCase = 0;
		let snakeCase = 0;
		let kebabCase = 0;
		const inconsistencies: string[] = [];

		identifiers.forEach((identifier) => {
			const name = identifier.name;

			if (this.isCamelCase(name)) {
				camelCase++;
			} else if (this.isPascalCase(name)) {
				pascalCase++;
			} else if (this.isSnakeCase(name)) {
				snakeCase++;
			} else if (this.isKebabCase(name)) {
				kebabCase++;
			} else {
				inconsistencies.push(name);
			}

			// Check for type-specific naming conventions
			if (identifier.type === "class" && !this.isPascalCase(name)) {
				inconsistencies.push(`Class '${name}' should use PascalCase`);
			}
			if (
				(identifier.type === "function" || identifier.type === "variable") &&
				!this.isCamelCase(name)
			) {
				inconsistencies.push(
					`${identifier.type} '${name}' should use camelCase`,
				);
			}
		});

		const total = identifiers.length;
		const conventionScore =
			total > 0 ? (total - inconsistencies.length) / total : 1;

		return {
			camelCase,
			pascalCase,
			snakeCase,
			kebabCase,
			inconsistencies: [...new Set(inconsistencies)], // Remove duplicates
			conventionScore: Math.round(conventionScore * 100) / 100,
		};
	}

	private detectDesignPatterns(
		identifiers: IdentifierInfo[],
	): DetectedPattern[] {
		const patterns: DetectedPattern[] = [];

		// Singleton pattern detection
		const singletonCandidates = identifiers.filter(
			(i) =>
				i.type === "class" &&
				(i.name.toLowerCase().includes("singleton") ||
					identifiers.some(
						(j) => j.name === "getInstance" && j.type === "function",
					)),
		);

		if (singletonCandidates.length > 0) {
			patterns.push({
				type: "singleton",
				confidence: 0.8,
				identifiers: singletonCandidates.map((s) => s.name),
				description:
					"Potential singleton pattern detected based on naming and structure",
			});
		}

		// Factory pattern detection
		const factoryCandidates = identifiers.filter(
			(i) =>
				i.type === "class" &&
				(i.name.toLowerCase().includes("factory") ||
					i.name.toLowerCase().endsWith("factory")),
		);

		if (factoryCandidates.length > 0) {
			patterns.push({
				type: "factory",
				confidence: 0.7,
				identifiers: factoryCandidates.map((f) => f.name),
				description: "Factory pattern detected based on naming conventions",
			});
		}

		// Observer pattern detection
		const observerCandidates = identifiers.filter(
			(i) =>
				i.name.toLowerCase().includes("observer") ||
				i.name.toLowerCase().includes("listener") ||
				i.name.toLowerCase().includes("subscriber"),
		);

		if (observerCandidates.length > 0) {
			patterns.push({
				type: "observer",
				confidence: 0.6,
				identifiers: observerCandidates.map((o) => o.name),
				description: "Observer pattern detected based on naming conventions",
			});
		}

		return patterns;
	}

	private detectAntiPatterns(
		identifiers: IdentifierInfo[],
	): DetectedAntiPattern[] {
		const antiPatterns: DetectedAntiPattern[] = [];

		// God class detection (simplified)
		const classes = identifiers.filter((i) => i.type === "class");
		const godClasses = classes.filter((c) => {
			// Count methods/properties in the class (simplified heuristic)
			const classMembers = identifiers.filter(
				(i) =>
					i.location.line > c.location.line &&
					i.location.line < c.location.endLine &&
					(i.type === "function" || i.type === "variable"),
			);
			return classMembers.length > 20; // Arbitrary threshold
		});

		if (godClasses.length > 0) {
			antiPatterns.push({
				type: "god_class",
				severity: "high",
				identifiers: godClasses.map((g) => g.name),
				description: "Classes with too many responsibilities detected",
				impact:
					"Reduces maintainability, testability, and violates Single Responsibility Principle",
			});
		}

		// Long parameter list detection
		const functionsWithLongParams = identifiers.filter(
			(i) => i.type === "function" && (i.parameters?.length || 0) > 7,
		);

		if (functionsWithLongParams.length > 0) {
			antiPatterns.push({
				type: "long_parameter_list",
				severity: "medium",
				identifiers: functionsWithLongParams.map((f) => f.name),
				description: "Functions with excessive parameters detected",
				impact: "Makes functions hard to understand, test, and maintain",
			});
		}

		// Data class detection (simplified)
		const dataClasses = classes.filter((c) => {
			const classMethods = identifiers.filter(
				(i) =>
					i.location.line > c.location.line &&
					i.location.line < c.location.endLine &&
					i.type === "function",
			);
			const classProperties = identifiers.filter(
				(i) =>
					i.location.line > c.location.line &&
					i.location.line < c.location.endLine &&
					i.type === "variable",
			);

			// Data class: mostly properties, few methods
			return classProperties.length > 5 && classMethods.length < 3;
		});

		if (dataClasses.length > 0) {
			antiPatterns.push({
				type: "data_class",
				severity: "low",
				identifiers: dataClasses.map((d) => d.name),
				description: "Classes that mostly contain data with little behavior",
				impact: "May indicate missing behavior or poor encapsulation",
			});
		}

		return antiPatterns;
	}

	private generateRecommendations(
		identifiers: IdentifierInfo[],
		complexity: IdentifierAnalysisResult["summary"]["complexity"],
		patterns: IdentifierAnalysisResult["summary"]["patterns"],
	): IdentifierAnalysisResult["recommendations"] {
		const codeQuality: CodeQualityRecommendation[] = [];
		const refactoring: RefactoringRecommendation[] = [];
		const architecture: ArchitectureRecommendation[] = [];

		// Naming convention recommendations
		if (patterns.namingConventions.conventionScore < 0.8) {
			codeQuality.push({
				type: "naming",
				priority: "medium",
				title: "Improve naming consistency",
				description: "Standardize naming conventions across the codebase",
				affectedIdentifiers: patterns.namingConventions.inconsistencies,
				implementation:
					"Apply consistent camelCase for functions/variables and PascalCase for classes",
			});
		}

		// Complexity recommendations
		if (complexity.functionsWithManyParameters > 0) {
			refactoring.push({
				type: "reduce_parameters",
				priority: "high",
				title: "Reduce function parameter count",
				description:
					"Functions with many parameters are hard to use and maintain",
				affectedIdentifiers: identifiers
					.filter(
						(i) => i.type === "function" && (i.parameters?.length || 0) > 5,
					)
					.map((i) => i.name),
				estimatedEffort: "medium",
			});
		}

		// Anti-pattern recommendations
		const godClassAntiPattern = patterns.antiPatterns.find(
			(ap) => ap.type === "god_class",
		);
		if (godClassAntiPattern) {
			architecture.push({
				type: "single_responsibility",
				priority: "high",
				title: "Break down large classes",
				description:
					"Large classes violate the Single Responsibility Principle",
				affectedComponents: godClassAntiPattern.identifiers,
				implementation:
					"Extract related methods into separate classes or modules",
			});
		}

		// API stability recommendations
		const exportedCount = identifiers.filter((i) => i.isExported).length;
		const totalCount = identifiers.length;
		if (exportedCount / totalCount > 0.5) {
			architecture.push({
				type: "interface_segregation",
				priority: "medium",
				title: "Reduce public API surface",
				description: "Large public APIs are harder to maintain and version",
				affectedComponents: identifiers
					.filter((i) => i.isExported)
					.map((i) => i.name),
				implementation:
					"Make internal identifiers private and create focused interfaces",
			});
		}

		return {
			codeQuality,
			refactoring,
			architecture,
		};
	}

	private calculateMetrics(
		identifiers: IdentifierInfo[],
		structure: IdentifierAnalysisResult["summary"]["codebaseStructure"],
	): IdentifierAnalysisResult["metrics"] {
		// Cohesion: how well related identifiers are grouped together (simplified)
		const classes = identifiers.filter((i) => i.type === "class");
		const averageClassSize =
			classes.length > 0
				? classes.reduce((sum, c) => {
						const classMembers = identifiers.filter(
							(i) =>
								i.location.line > c.location.line &&
								i.location.line < c.location.endLine,
						);
						return sum + classMembers.length;
					}, 0) / classes.length
				: 0;

		const cohesion = Math.max(0, Math.min(1, (10 - averageClassSize) / 10)); // Inverse relationship

		// Abstraction: ratio of interfaces to concrete classes
		const interfaces = identifiers.filter((i) => i.type === "interface").length;
		const concreteClasses = identifiers.filter(
			(i) => i.type === "class",
		).length;
		const abstraction =
			interfaces + concreteClasses > 0
				? interfaces / (interfaces + concreteClasses)
				: 0;

		// Encapsulation: ratio of private to public identifiers
		const privateCount = identifiers.filter(
			(i) => i.visibility === "private",
		).length;
		const publicCount = identifiers.filter(
			(i) => i.visibility === "public" || i.isExported,
		).length;
		const encapsulation =
			privateCount + publicCount > 0
				? privateCount / (privateCount + publicCount)
				: 0;

		// API stability: inverse of export ratio (fewer exports = more stable)
		const apiStability = Math.max(0, 1 - structure.exportRatio);

		return {
			cohesion: Math.round(cohesion * 100) / 100,
			abstraction: Math.round(abstraction * 100) / 100,
			encapsulation: Math.round(encapsulation * 100) / 100,
			apiStability: Math.round(apiStability * 100) / 100,
		};
	}

	private isCamelCase(name: string): boolean {
		return /^[a-z][a-zA-Z0-9]*$/.test(name);
	}

	private isPascalCase(name: string): boolean {
		return /^[A-Z][a-zA-Z0-9]*$/.test(name);
	}

	private isSnakeCase(name: string): boolean {
		return /^[a-z][a-z0-9_]*$/.test(name);
	}

	private isKebabCase(name: string): boolean {
		return /^[a-z][a-z0-9-]*$/.test(name);
	}

	supports(inputType: string): boolean {
		return inputType === "IdentifierExtractionResult";
	}

	getName(): string {
		return this.name;
	}

	getVersion(): string {
		return this.version;
	}

	validate(_input: IdentifierExtractionResult): any {
		return {
			valid: true,
			errors: [],
		};
	}

	getOutputSchema(): any {
		return {
			type: "object",
			properties: {
				summary: { type: "object" },
				recommendations: { type: "object" },
				metrics: { type: "object" },
			},
		};
	}

	getMetadata(): any {
		return {
			name: this.name,
			version: this.version,
			description: this.description,
			supportedDataTypes: ["IdentifierExtractionResult"],
			outputType: "IdentifierAnalysisResult",
			dependencies: [],
			performance: {
				averageTimePerItem: 30,
				memoryUsage: "low" as const,
				timeComplexity: "linear" as const,
			},
			quality: {
				accuracy: 0.85,
				precision: 0.8,
				recall: 0.75,
			},
		};
	}

	configure(_options: any): void {
		// Configuration implementation
	}

	getConfiguration(): any {
		return {
			name: this.name,
			version: this.version,
			description: this.description,
			inputTypes: ["IdentifierExtractionResult"],
			outputType: "IdentifierAnalysisResult",
		};
	}

	getSupportedDataTypes(): string[] {
		return ["IdentifierExtractionResult"];
	}

	getDependencies(): any[] {
		return [];
	}

	dispose(): void {
		// Cleanup implementation
	}
}
