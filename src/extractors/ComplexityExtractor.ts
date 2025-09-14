/**
 * ComplexityExtractor - Built-in extractor for complexity analysis
 * Calculates cyclomatic complexity, cognitive complexity, and nesting depth
 */

import type Parser from "tree-sitter";
import type {
	ExtractorConfiguration,
	ExtractorMetadata,
	IDataExtractor,
	OutputSchema,
	ValidationResult,
} from "./IDataExtractor";

export interface ComplexityInfo {
	functionName: string;
	cyclomaticComplexity: number;
	cognitiveComplexity: number;
	maxNestingDepth: number;
	linesOfCode: number;
	location: {
		line: number;
		column: number;
		endLine: number;
		endColumn: number;
	};
}

export interface ComplexityExtractionResult {
	complexities: ComplexityInfo[];
	overallMetrics: {
		totalFunctions: number;
		averageCyclomaticComplexity: number;
		averageCognitiveComplexity: number;
		averageNestingDepth: number;
		averageLinesOfCode: number;
		maxCyclomaticComplexity: number;
		maxCognitiveComplexity: number;
		maxNestingDepth: number;
		highComplexityFunctions: number; // Cyclomatic > 10
		veryHighComplexityFunctions: number; // Cyclomatic > 20
	};
}

export class ComplexityExtractor
	implements IDataExtractor<ComplexityExtractionResult>
{
	public readonly name = "ComplexityExtractor";
	public readonly version = "1.0.0";
	public readonly description = "Extracts complexity metrics from source code";

	private readonly cyclomaticComplexityNodes = [
		"if_statement",
		"while_statement",
		"for_statement",
		"for_in_statement",
		"for_of_statement",
		"do_statement",
		"switch_statement",
		"case",
		"catch_clause",
		"conditional_expression",
		"logical_expression", // && and ||
	];

	private readonly cognitiveComplexityNodes = [
		"if_statement",
		"while_statement",
		"for_statement",
		"for_in_statement",
		"for_of_statement",
		"do_statement",
		"switch_statement",
		"catch_clause",
		"conditional_expression",
		"logical_expression",
	];

	private readonly nestingNodes = [
		"if_statement",
		"while_statement",
		"for_statement",
		"for_in_statement",
		"for_of_statement",
		"do_statement",
		"switch_statement",
		"try_statement",
		"function_expression",
		"arrow_function",
	];

	extract(tree: Parser.Tree, sourceCode: string): ComplexityExtractionResult {
		const complexities: ComplexityInfo[] = [];
		const cursor = tree.walk();

		const visit = (node: Parser.SyntaxNode) => {
			// Analyze function declarations and expressions
			if (this.isFunctionNode(node)) {
				const complexity = this.analyzeFunctionComplexity(node, sourceCode);
				if (complexity) {
					complexities.push(complexity);
				}
			}

			// Recursively visit children
			for (let i = 0; i < node.childCount; i++) {
				visit(node.child(i)!);
			}
		};

		visit(cursor.currentNode);

		// Calculate overall metrics
		const overallMetrics = this.calculateOverallMetrics(complexities);

		return {
			complexities,
			overallMetrics,
		};
	}

	private isFunctionNode(node: Parser.SyntaxNode): boolean {
		return [
			"function_declaration",
			"function_expression",
			"arrow_function",
			"method_definition",
		].includes(node.type);
	}

	private analyzeFunctionComplexity(
		node: Parser.SyntaxNode,
		sourceCode: string,
	): ComplexityInfo | null {
		const functionName = this.getFunctionName(node);
		if (!functionName) return null;

		const cyclomaticComplexity = this.calculateCyclomaticComplexity(node);
		const cognitiveComplexity = this.calculateCognitiveComplexity(node);
		const maxNestingDepth = this.calculateMaxNestingDepth(node);
		const linesOfCode = this.calculateLinesOfCode(node, sourceCode);

		return {
			functionName,
			cyclomaticComplexity,
			cognitiveComplexity,
			maxNestingDepth,
			linesOfCode,
			location: {
				line: node.startPosition.row + 1,
				column: node.startPosition.column,
				endLine: node.endPosition.row + 1,
				endColumn: node.endPosition.column,
			},
		};
	}

	private getFunctionName(node: Parser.SyntaxNode): string | null {
		// Try to get function name from different node types
		const nameNode = node.childForFieldName("name");
		if (nameNode) {
			return nameNode.text;
		}

		// For method definitions, get property name
		if (node.type === "method_definition") {
			const propertyNode = node.childForFieldName("property");
			if (propertyNode) {
				return propertyNode.text;
			}
		}

		// For arrow functions and anonymous functions, use a placeholder
		if (node.type === "arrow_function" || node.type === "function_expression") {
			// Try to find assignment target
			const parent = node.parent;
			if (parent?.type === "variable_declarator") {
				const nameNode = parent.childForFieldName("name");
				if (nameNode) {
					return nameNode.text;
				}
			}
			return "<anonymous>";
		}

		return null;
	}

	private calculateCyclomaticComplexity(node: Parser.SyntaxNode): number {
		let complexity = 1; // Base complexity

		const visit = (current: Parser.SyntaxNode) => {
			// Increment for cyclomatic complexity decision points
			if (this.cyclomaticComplexityNodes.includes(current.type)) {
				complexity++;

				// Special case: logical expressions (&&, ||) add complexity
				if (current.type === "logical_expression") {
					const operator = current.childForFieldName("operator");
					if (operator && (operator.text === "&&" || operator.text === "||")) {
						complexity++;
					}
				}
			}

			// Special case: switch cases add complexity individually
			if (current.type === "case") {
				complexity++;
			}

			// Recursively visit children
			for (let i = 0; i < current.childCount; i++) {
				visit(current.child(i)!);
			}
		};

		// Only analyze the function body, not nested functions
		const bodyNode = node.childForFieldName("body");
		if (bodyNode) {
			visit(bodyNode);
		}

		return complexity;
	}

	private calculateCognitiveComplexity(node: Parser.SyntaxNode): number {
		let complexity = 0;
		let nestingLevel = 0;

		const visit = (current: Parser.SyntaxNode, isNested = false) => {
			// Increment nesting for certain structures
			let currentNesting = nestingLevel;
			if (this.nestingNodes.includes(current.type)) {
				if (isNested) {
					currentNesting++;
				}
				nestingLevel = currentNesting;
			}

			// Add complexity for cognitive complexity structures
			if (this.cognitiveComplexityNodes.includes(current.type)) {
				complexity += 1 + currentNesting;
			}

			// Special handling for logical operators (binary complexity)
			if (current.type === "logical_expression") {
				const operator = current.childForFieldName("operator");
				if (operator && (operator.text === "&&" || operator.text === "||")) {
					complexity++;
				}
			}

			// Recursively visit children with nesting context
			for (let i = 0; i < current.childCount; i++) {
				visit(current.child(i)!, true);
			}

			// Reset nesting level when exiting nesting structures
			if (this.nestingNodes.includes(current.type)) {
				nestingLevel = Math.max(0, nestingLevel - 1);
			}
		};

		const bodyNode = node.childForFieldName("body");
		if (bodyNode) {
			visit(bodyNode);
		}

		return complexity;
	}

	private calculateMaxNestingDepth(node: Parser.SyntaxNode): number {
		let maxDepth = 0;
		let currentDepth = 0;

		const visit = (current: Parser.SyntaxNode) => {
			// Increment depth for nesting structures
			if (this.nestingNodes.includes(current.type)) {
				currentDepth++;
				maxDepth = Math.max(maxDepth, currentDepth);
			}

			// Recursively visit children
			for (let i = 0; i < current.childCount; i++) {
				visit(current.child(i)!);
			}

			// Decrement depth when exiting nesting structure
			if (this.nestingNodes.includes(current.type)) {
				currentDepth--;
			}
		};

		const bodyNode = node.childForFieldName("body");
		if (bodyNode) {
			visit(bodyNode);
		}

		return maxDepth;
	}

	private calculateLinesOfCode(
		node: Parser.SyntaxNode,
		sourceCode: string,
	): number {
		const startLine = node.startPosition.row;
		const endLine = node.endPosition.row;
		return endLine - startLine + 1;
	}

	private calculateOverallMetrics(
		complexities: ComplexityInfo[],
	): ComplexityExtractionResult["overallMetrics"] {
		if (complexities.length === 0) {
			return {
				totalFunctions: 0,
				averageCyclomaticComplexity: 0,
				averageCognitiveComplexity: 0,
				averageNestingDepth: 0,
				averageLinesOfCode: 0,
				maxCyclomaticComplexity: 0,
				maxCognitiveComplexity: 0,
				maxNestingDepth: 0,
				highComplexityFunctions: 0,
				veryHighComplexityFunctions: 0,
			};
		}

		const totalFunctions = complexities.length;
		const cyclomaticSum = complexities.reduce(
			(sum, c) => sum + c.cyclomaticComplexity,
			0,
		);
		const cognitiveSum = complexities.reduce(
			(sum, c) => sum + c.cognitiveComplexity,
			0,
		);
		const nestingSum = complexities.reduce(
			(sum, c) => sum + c.maxNestingDepth,
			0,
		);
		const locSum = complexities.reduce((sum, c) => sum + c.linesOfCode, 0);

		const maxCyclomaticComplexity = Math.max(
			...complexities.map((c) => c.cyclomaticComplexity),
		);
		const maxCognitiveComplexity = Math.max(
			...complexities.map((c) => c.cognitiveComplexity),
		);
		const maxNestingDepth = Math.max(
			...complexities.map((c) => c.maxNestingDepth),
		);

		const highComplexityFunctions = complexities.filter(
			(c) => c.cyclomaticComplexity > 10,
		).length;
		const veryHighComplexityFunctions = complexities.filter(
			(c) => c.cyclomaticComplexity > 20,
		).length;

		return {
			totalFunctions,
			averageCyclomaticComplexity:
				Math.round((cyclomaticSum / totalFunctions) * 100) / 100,
			averageCognitiveComplexity:
				Math.round((cognitiveSum / totalFunctions) * 100) / 100,
			averageNestingDepth:
				Math.round((nestingSum / totalFunctions) * 100) / 100,
			averageLinesOfCode: Math.round((locSum / totalFunctions) * 100) / 100,
			maxCyclomaticComplexity,
			maxCognitiveComplexity,
			maxNestingDepth,
			highComplexityFunctions,
			veryHighComplexityFunctions,
		};
	}

	supports(language: string): boolean {
		return ["typescript", "javascript", "tsx", "jsx"].includes(
			language.toLowerCase(),
		);
	}

	getConfiguration(): ExtractorConfiguration {
		return {
			enabled: true,
			priority: 1,
			timeout: 30000,
			memoryLimit: 100 * 1024 * 1024, // 100MB
			languages: ["typescript", "javascript", "tsx", "jsx"],
			defaultOptions: {
				includeLocations: true,
				includeComments: false,
				maxDepth: 10,
			},
			errorHandling: "lenient",
			logLevel: "info",
		};
	}

	getName(): string {
		return this.name;
	}

	getVersion(): string {
		return this.version;
	}

	validate(data: ComplexityExtractionResult): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		if (!data.complexities || !Array.isArray(data.complexities)) {
			errors.push("Complexities must be an array");
		}

		if (!data.overallMetrics) {
			errors.push("Overall metrics are required");
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
			quality: {
				completeness: errors.length === 0 ? 1.0 : 0.5,
				accuracy: 1.0,
				consistency: 1.0,
				confidence: 0.9,
			},
		};
	}

	getMetadata(): ExtractorMetadata {
		return {
			name: this.name,
			version: this.version,
			description: this.description,
			supportedLanguages: ["typescript", "javascript", "tsx", "jsx"],
			outputTypes: ["ComplexityExtractionResult"],
			dependencies: [],
			performance: {
				averageTimePerNode: 0.1,
				memoryUsage: "medium",
				timeComplexity: "linear",
				maxRecommendedFileSize: 1024 * 1024, // 1MB
			},
			author: "TypeScript Dependency Linker",
			license: "MIT",
		};
	}

	configure(options: ExtractorConfiguration): void {
		// Configuration handled via constructor or setter methods
	}

	getOutputSchema(): OutputSchema {
		return {
			type: "object",
			properties: {
				complexities: {
					type: "array",
					description: "Array of function complexity information",
				},
				overallMetrics: {
					type: "object",
					description: "Overall complexity metrics for the file",
				},
			},
			required: ["complexities", "overallMetrics"],
			version: "1.0.0",
		};
	}

	dispose(): void {
		// No resources to clean up
	}
}
