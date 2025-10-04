/**
 * Method Analyzer
 *
 * Analyzes method definitions, complexity, parameters, and method interactions.
 * Implements the method-analysis scenario specification.
 */

import type Parser from "tree-sitter";
import { BaseScenarioAnalyzer, type AnalysisContext } from "../BaseScenarioAnalyzer";
import type { AnalysisResult } from "../types";

/**
 * Method metadata extracted from AST
 */
interface MethodInfo {
	name: string;
	className?: string;
	startLine: number;
	endLine: number;
	startColumn: number;
	endColumn: number;
	isStatic: boolean;
	isAsync: boolean;
	isPrivate: boolean;
	visibility: "public" | "private" | "protected";
	parameters: ParameterInfo[];
	returnType?: string;
	cyclomaticComplexity: number;
	linesOfCode: number;
	nestingDepth: number;
	numberOfStatements: number;
	bodyNode?: Parser.SyntaxNode | null;
}

interface ParameterInfo {
	name: string;
	type?: string;
	isOptional: boolean;
	hasDefault: boolean;
	defaultValue?: string;
}

/**
 * Method Analyzer Implementation
 */
export class MethodAnalyzer extends BaseScenarioAnalyzer {
	/**
	 * Main analysis method
	 */
	protected async analyze(context: AnalysisContext): Promise<AnalysisResult> {
		const result: AnalysisResult = this.createEmptyResult();

		// Only analyze supported languages
		const config = this.getConfig<{ languages: string[] }>();
		if (!config.languages?.includes(context.language)) {
			return result;
		}

		// Get AST from context
		const parseResult = context.parseResult;
		if (!parseResult?.tree) {
			return result;
		}

		const tree = parseResult.tree;

		// Extract method definitions
		const methods = this.extractMethods(tree, context);

		// Create nodes and edges
		for (const method of methods) {
			// Create method node
			const methodIdentifier = this.buildMethodIdentifier(
				context.filePath,
				method.className,
				method.name,
			);

			result.nodes.push({
				type: "method",
				identifier: methodIdentifier,
				properties: {
					name: method.name,
					className: method.className,
					methodName: method.name,
					sourceFile: context.filePath,
					language: context.language,
					// Signature
					parameters: method.parameters,
					returnType: method.returnType,
					// Metrics
					cyclomaticComplexity: method.cyclomaticComplexity,
					linesOfCode: method.linesOfCode,
					nestingDepth: method.nestingDepth,
					numberOfStatements: method.numberOfStatements,
					// Characteristics
					isStatic: method.isStatic,
					isAsync: method.isAsync,
					isPrivate: method.isPrivate,
					visibility: method.visibility,
					// Location
					startLine: method.startLine,
					endLine: method.endLine,
					startColumn: method.startColumn,
					endColumn: method.endColumn,
				},
			});

			// File → Method edge (defines)
			result.edges.push({
				type: "defines",
				from: context.filePath,
				to: methodIdentifier,
				properties: {},
			});

			// Class → Method edge (contains-method)
			if (method.className) {
				const classIdentifier = this.buildClassIdentifier(
					context.filePath,
					method.className,
				);

				result.edges.push({
					type: "contains-method",
					from: classIdentifier,
					to: methodIdentifier,
					properties: {
						visibility: method.visibility,
					},
				});
			}

			// Apply semantic tags
			const tags = this.generateSemanticTags(method);
			for (const tag of tags) {
				result.semanticTags?.push({
					nodeIdentifier: methodIdentifier,
					tag,
				});
			}
		}

		return result;
	}

	/**
	 * Extract methods from AST
	 */
	private extractMethods(tree: Parser.Tree, context: AnalysisContext): MethodInfo[] {
		const methods: MethodInfo[] = [];

		// Query for method definitions
		const methodQuery = `
			(method_definition
				name: (property_identifier) @method.name
				parameters: (formal_parameters) @method.params
				body: (statement_block) @method.body
			) @method.def
		`;

		try {
			// Manual tree traversal to find method definitions
			const traverse = (node: Parser.SyntaxNode) => {
				if (node.type === "method_definition") {
					const methodInfo = this.parseMethodDefinition(node, context);
					if (methodInfo) {
						methods.push(methodInfo);
					}
				}

				// Recursively traverse children
				for (let i = 0; i < node.childCount; i++) {
					const child = node.child(i);
					if (child) {
						traverse(child);
					}
				}
			};

			traverse(tree.rootNode);
		} catch (error) {
			console.warn("Failed to extract methods:", error);
		}

		return methods;
	}

	/**
	 * Parse method definition node
	 */
	private parseMethodDefinition(
		node: Parser.SyntaxNode,
		context: AnalysisContext,
	): MethodInfo | null {
		try {
			// Extract method name
			const nameNode = node.childForFieldName("name");
			if (!nameNode) return null;
			const methodName = nameNode.text;

			// Extract parameters
			const paramsNode = node.childForFieldName("parameters");
			const parameters = paramsNode ? this.parseParameters(paramsNode, context) : [];

			// Extract body
			const bodyNode = node.childForFieldName("body");
			const complexity = bodyNode ? this.calculateComplexity(bodyNode) : 1;
			const loc = bodyNode
				? bodyNode.endPosition.row - bodyNode.startPosition.row + 1
				: 0;

			// Check modifiers
			let isStatic = false;
			let isAsync = false;
			let isPrivate = false;
			let visibility: "public" | "private" | "protected" = "public";

			// Look for modifiers in parent or siblings
			for (let i = 0; i < node.childCount; i++) {
				const child = node.child(i);
				if (!child) continue;

				if (child.type === "accessibility_modifier") {
					const modText = child.text;
					visibility = modText as "public" | "private" | "protected";
					isPrivate = modText === "private";
				} else if (child.text === "static") {
					isStatic = true;
				} else if (child.text === "async") {
					isAsync = true;
				}
			}

			// Extract class name from parent context
			let className: string | undefined;
			let parent = node.parent;
			while (parent) {
				if (parent.type === "class_declaration" || parent.type === "class") {
					const classNameNode = parent.childForFieldName("name");
					if (classNameNode) {
						className = classNameNode.text;
						break;
					}
				}
				parent = parent.parent;
			}

			return {
				name: methodName,
				className,
				startLine: node.startPosition.row + 1,
				endLine: node.endPosition.row + 1,
				startColumn: node.startPosition.column,
				endColumn: node.endPosition.column,
				isStatic,
				isAsync,
				isPrivate,
				visibility,
				parameters,
				returnType: this.extractReturnType(node),
				cyclomaticComplexity: complexity,
				linesOfCode: loc,
				nestingDepth: bodyNode ? this.calculateNestingDepth(bodyNode) : 0,
				numberOfStatements: bodyNode ? this.countStatements(bodyNode) : 0,
				bodyNode,
			};
		} catch (error) {
			console.warn("Failed to parse method definition:", error);
			return null;
		}
	}

	/**
	 * Parse method parameters
	 */
	private parseParameters(
		paramsNode: Parser.SyntaxNode,
		context: AnalysisContext,
	): ParameterInfo[] {
		const parameters: ParameterInfo[] = [];

		try {
			for (let i = 0; i < paramsNode.childCount; i++) {
				const child = paramsNode.child(i);
				if (!child || child.type !== "required_parameter" && child.type !== "optional_parameter") {
					continue;
				}

				const patternNode = child.childForFieldName("pattern");
				const typeNode = child.childForFieldName("type");

				if (patternNode) {
					parameters.push({
						name: patternNode.text,
						type: this.cleanTypeAnnotation(typeNode?.text),
						isOptional: child.type === "optional_parameter",
						hasDefault: false, // TODO: Detect default values
					});
				}
			}
		} catch (error) {
			console.warn("Failed to parse parameters:", error);
		}

		return parameters;
	}

	/**
	 * Extract return type from method definition
	 */
	private extractReturnType(node: Parser.SyntaxNode): string | undefined {
		const typeNode = node.childForFieldName("type");
		return this.cleanTypeAnnotation(typeNode?.text);
	}

	/**
	 * Clean type annotation (remove leading colon and whitespace)
	 */
	private cleanTypeAnnotation(typeText: string | undefined): string | undefined {
		if (!typeText) return undefined;
		// Remove leading ": " from type annotations
		return typeText.replace(/^\s*:\s*/, "").trim();
	}

	/**
	 * Calculate cyclomatic complexity
	 * CC = 1 + number of decision points
	 */
	private calculateComplexity(bodyNode: Parser.SyntaxNode): number {
		let complexity = 1; // Base complexity

		const traverse = (node: Parser.SyntaxNode) => {
			// Count decision points
			if (
				node.type === "if_statement" ||
				node.type === "for_statement" ||
				node.type === "while_statement" ||
				node.type === "do_statement" ||
				node.type === "case" ||
				node.type === "catch_clause" ||
				node.type === "ternary_expression"
			) {
				complexity++;
			}

			// Count logical operators (&&, ||)
			if (node.type === "binary_expression") {
				const operator = node.childForFieldName("operator");
				if (operator && (operator.text === "&&" || operator.text === "||")) {
					complexity++;
				}
			}

			// Recursively traverse children
			for (let i = 0; i < node.childCount; i++) {
				const child = node.child(i);
				if (child) {
					traverse(child);
				}
			}
		};

		traverse(bodyNode);
		return complexity;
	}

	/**
	 * Calculate maximum nesting depth
	 */
	private calculateNestingDepth(bodyNode: Parser.SyntaxNode): number {
		let maxDepth = 0;

		const traverse = (node: Parser.SyntaxNode, depth: number) => {
			maxDepth = Math.max(maxDepth, depth);

			// Increase depth for nesting structures
			let nextDepth = depth;
			if (
				node.type === "if_statement" ||
				node.type === "for_statement" ||
				node.type === "while_statement" ||
				node.type === "do_statement" ||
				node.type === "switch_statement"
			) {
				nextDepth = depth + 1;
			}

			// Recursively traverse children
			for (let i = 0; i < node.childCount; i++) {
				const child = node.child(i);
				if (child) {
					traverse(child, nextDepth);
				}
			}
		};

		traverse(bodyNode, 0);
		return maxDepth;
	}

	/**
	 * Count number of statements
	 */
	private countStatements(bodyNode: Parser.SyntaxNode): number {
		let count = 0;

		const traverse = (node: Parser.SyntaxNode) => {
			if (node.type.endsWith("_statement")) {
				count++;
			}

			// Recursively traverse children
			for (let i = 0; i < node.childCount; i++) {
				const child = node.child(i);
				if (child) {
					traverse(child);
				}
			}
		};

		traverse(bodyNode);
		return count;
	}

	/**
	 * Build method identifier
	 */
	private buildMethodIdentifier(
		filePath: string,
		className: string | undefined,
		methodName: string,
	): string {
		if (className) {
			return `${filePath}:${className}.${methodName}`;
		}
		return `${filePath}:${methodName}`;
	}

	/**
	 * Build class identifier
	 */
	private buildClassIdentifier(filePath: string, className: string): string {
		return `${filePath}:${className}`;
	}

	/**
	 * Generate semantic tags for method
	 */
	private generateSemanticTags(method: MethodInfo): string[] {
		const tags: string[] = [];

		// Constructor
		if (method.name === "constructor") {
			tags.push("constructor");
		}

		// Accessor patterns
		if (method.name.startsWith("get") && method.name.length > 3) {
			tags.push("accessor");
		}
		if (method.name.startsWith("set") && method.name.length > 3) {
			tags.push("accessor");
		}

		// Static method
		if (method.isStatic) {
			tags.push("static-method");
		}

		// Async method
		if (method.isAsync) {
			tags.push("async-method");
		}

		// High complexity
		const config = this.getConfig<{ complexityThreshold: { medium: number } }>();
		if (method.cyclomaticComplexity > (config.complexityThreshold?.medium || 10)) {
			tags.push("high-complexity");
		}

		// Entry methods
		if (["main", "init", "setup", "start"].includes(method.name)) {
			tags.push("entry-method");
		}

		return tags;
	}
}
