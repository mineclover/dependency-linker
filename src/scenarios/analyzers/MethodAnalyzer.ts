/**
 * Method Analyzer
 *
 * Analyzes method definitions, complexity, parameters, and method interactions.
 * Implements the method-analysis scenario specification.
 */

import type Parser from "tree-sitter";
import {
	BaseScenarioAnalyzer,
	type AnalysisContext,
} from "../BaseScenarioAnalyzer";
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
 * Method call information extracted from AST
 */
interface MethodCallInfo {
	callerIdentifier: string;
	calleeMethodName: string;
	calleeClassName?: string;
	lineNumber: number;
	callType: "direct" | "this" | "super" | "member";
}

/**
 * Field information extracted from AST
 */
interface FieldInfo {
	name: string;
	className?: string;
	type?: string;
	isStatic: boolean;
	isReadonly: boolean;
	isPrivate: boolean;
	visibility: "public" | "private" | "protected";
	hasInitializer: boolean;
	startLine: number;
	endLine: number;
}

/**
 * Field access information extracted from AST
 */
interface FieldAccessInfo {
	methodIdentifier: string;
	fieldName: string;
	fieldClassName?: string;
	lineNumber: number;
	accessType: "this" | "super" | "static" | "member";
	isWrite: boolean; // true for assignments, false for reads
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

		// Extract field definitions
		const fields = this.extractFields(tree, context);

		// Track all method calls and field accesses across all methods
		const methodCalls: MethodCallInfo[] = [];
		const fieldAccesses: FieldAccessInfo[] = [];

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

			// Extract method calls from this method
			if (method.bodyNode) {
				const calls = this.extractMethodCalls(
					method.bodyNode,
					methodIdentifier,
					method.className,
					context,
				);
				methodCalls.push(...calls);

				// Extract field accesses from this method
				const accesses = this.extractFieldAccesses(
					method.bodyNode,
					methodIdentifier,
					method.className,
					context,
				);
				fieldAccesses.push(...accesses);
			}
		}

		// Create calls-method edges
		for (const call of methodCalls) {
			const calleeIdentifier = this.buildMethodIdentifier(
				context.filePath,
				call.calleeClassName,
				call.calleeMethodName,
			);

			result.edges.push({
				type: "calls-method",
				from: call.callerIdentifier,
				to: calleeIdentifier,
				properties: {
					lineNumber: call.lineNumber,
					callType: call.callType,
				},
			});
		}

		// Create accesses-field edges
		for (const access of fieldAccesses) {
			const fieldIdentifier = this.buildFieldIdentifier(
				context.filePath,
				access.fieldClassName,
				access.fieldName,
			);

			result.edges.push({
				type: "accesses-field",
				from: access.methodIdentifier,
				to: fieldIdentifier,
				properties: {
					lineNumber: access.lineNumber,
					accessType: access.accessType,
					isWrite: access.isWrite,
				},
			});
		}

		// Create field nodes and edges
		for (const field of fields) {
			const fieldIdentifier = this.buildFieldIdentifier(
				context.filePath,
				field.className,
				field.name,
			);

			result.nodes.push({
				type: "field",
				identifier: fieldIdentifier,
				properties: {
					name: field.name,
					className: field.className,
					fieldName: field.name,
					sourceFile: context.filePath,
					language: context.language,
					type: field.type,
					isStatic: field.isStatic,
					isReadonly: field.isReadonly,
					isPrivate: field.isPrivate,
					visibility: field.visibility,
					hasInitializer: field.hasInitializer,
					startLine: field.startLine,
					endLine: field.endLine,
				},
			});

			// File → Field edge (defines)
			result.edges.push({
				type: "defines",
				from: context.filePath,
				to: fieldIdentifier,
				properties: {},
			});

			// Class → Field edge (if part of a class)
			if (field.className) {
				const classIdentifier = this.buildClassIdentifier(
					context.filePath,
					field.className,
				);

				result.edges.push({
					type: "defines",
					from: classIdentifier,
					to: fieldIdentifier,
					properties: {
						visibility: field.visibility,
					},
				});
			}
		}

		return result;
	}

	/**
	 * Extract methods from AST
	 */
	private extractMethods(
		tree: Parser.Tree,
		context: AnalysisContext,
	): MethodInfo[] {
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
	 * Extract fields from AST
	 */
	private extractFields(
		tree: Parser.Tree,
		context: AnalysisContext,
	): FieldInfo[] {
		const fields: FieldInfo[] = [];

		try {
			// Manual tree traversal to find field definitions
			const traverse = (node: Parser.SyntaxNode) => {
				if (
					node.type === "field_definition" ||
					node.type === "public_field_definition" ||
					node.type === "property_declaration" ||
					node.type === "class_property"
				) {
					const fieldInfo = this.parseFieldDefinition(node, context);
					if (fieldInfo) {
						fields.push(fieldInfo);
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
			console.warn("Failed to extract fields:", error);
		}

		return fields;
	}

	/**
	 * Parse field definition node
	 */
	private parseFieldDefinition(
		node: Parser.SyntaxNode,
		context: AnalysisContext,
	): FieldInfo | null {
		try {
			// Extract field name - try both "property" and "name" field names
			let nameNode = node.childForFieldName("property");
			if (!nameNode) {
				nameNode = node.childForFieldName("name");
			}
			if (!nameNode) return null;
			const fieldName = nameNode.text;

			// Extract type
			const typeNode = node.childForFieldName("type");
			const fieldType = this.cleanTypeAnnotation(typeNode?.text);

			// Check modifiers
			let isStatic = false;
			let isReadonly = false;
			let isPrivate = false;
			let visibility: "public" | "private" | "protected" = "public";

			// Look for modifiers in children
			for (let i = 0; i < node.childCount; i++) {
				const child = node.child(i);
				if (!child) continue;

				if (child.type === "accessibility_modifier") {
					const modText = child.text;
					visibility = modText as "public" | "private" | "protected";
					isPrivate = modText === "private";
				} else if (child.text === "static") {
					isStatic = true;
				} else if (child.text === "readonly") {
					isReadonly = true;
				}
			}

			// Check for initializer
			const valueNode = node.childForFieldName("value");
			const hasInitializer = !!valueNode;

			// Extract class name from parent context
			let className: string | undefined;
			let parent = node.parent;
			while (parent) {
				if (
					parent.type === "class_declaration" ||
					parent.type === "class_body"
				) {
					const classDecl =
						parent.type === "class_body" ? parent.parent : parent;
					const classNameNode = classDecl?.childForFieldName("name");
					if (classNameNode) {
						className = classNameNode.text;
						break;
					}
				}
				parent = parent.parent;
			}

			return {
				name: fieldName,
				className,
				type: fieldType,
				isStatic,
				isReadonly,
				isPrivate,
				visibility,
				hasInitializer,
				startLine: node.startPosition.row + 1,
				endLine: node.endPosition.row + 1,
			};
		} catch (error) {
			console.warn("Failed to parse field definition:", error);
			return null;
		}
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
			const parameters = paramsNode
				? this.parseParameters(paramsNode, context)
				: [];

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
				if (
					!child ||
					(child.type !== "required_parameter" &&
						child.type !== "optional_parameter")
				) {
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
	private cleanTypeAnnotation(
		typeText: string | undefined,
	): string | undefined {
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
	 * Build field identifier
	 * Format: filePath:ClassName.fieldName or filePath:fieldName
	 */
	private buildFieldIdentifier(
		filePath: string,
		className: string | undefined,
		fieldName: string,
	): string {
		if (className) {
			return `${filePath}:${className}.${fieldName}`;
		}
		return `${filePath}:${fieldName}`;
	}

	/**
	 * Extract method calls from method body
	 */
	private extractMethodCalls(
		bodyNode: Parser.SyntaxNode,
		callerIdentifier: string,
		callerClassName: string | undefined,
		context: AnalysisContext,
	): MethodCallInfo[] {
		const calls: MethodCallInfo[] = [];

		const traverse = (node: Parser.SyntaxNode) => {
			// Look for call expressions
			if (node.type === "call_expression") {
				const callInfo = this.parseCallExpression(
					node,
					callerIdentifier,
					callerClassName,
				);
				if (callInfo) {
					calls.push(callInfo);
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
		return calls;
	}

	/**
	 * Parse call expression to extract call information
	 */
	private parseCallExpression(
		node: Parser.SyntaxNode,
		callerIdentifier: string,
		callerClassName: string | undefined,
	): MethodCallInfo | null {
		try {
			const functionNode = node.childForFieldName("function");
			if (!functionNode) return null;

			const lineNumber = node.startPosition.row + 1;

			// Check different call patterns
			if (functionNode.type === "member_expression") {
				// this.method(), super.method(), obj.method()
				const objectNode = functionNode.childForFieldName("object");
				const propertyNode = functionNode.childForFieldName("property");

				if (!objectNode || !propertyNode) return null;

				const objectText = objectNode.text;
				const methodName = propertyNode.text;

				if (objectText === "this") {
					// this.method() - same class method call
					return {
						callerIdentifier,
						calleeMethodName: methodName,
						calleeClassName: callerClassName,
						lineNumber,
						callType: "this",
					};
				} else if (objectText === "super") {
					// super.method() - parent class method call
					// TODO: Resolve parent class name
					return {
						callerIdentifier,
						calleeMethodName: methodName,
						calleeClassName: undefined, // Parent class not known yet
						lineNumber,
						callType: "super",
					};
				} else {
					// obj.method() - external object method call
					return {
						callerIdentifier,
						calleeMethodName: methodName,
						calleeClassName: undefined, // External class not known
						lineNumber,
						callType: "member",
					};
				}
			} else if (functionNode.type === "identifier") {
				// Direct call: method()
				const methodName = functionNode.text;

				return {
					callerIdentifier,
					calleeMethodName: methodName,
					calleeClassName: callerClassName, // Assume same class
					lineNumber,
					callType: "direct",
				};
			}

			return null;
		} catch (error) {
			console.warn("Failed to parse call expression:", error);
			return null;
		}
	}

	/**
	 * Extract field accesses from method body
	 */
	private extractFieldAccesses(
		bodyNode: Parser.SyntaxNode,
		methodIdentifier: string,
		methodClassName: string | undefined,
		context: AnalysisContext,
	): FieldAccessInfo[] {
		const accesses: FieldAccessInfo[] = [];

		const traverse = (node: Parser.SyntaxNode) => {
			// Look for member expressions (this.field, super.field, obj.field)
			if (node.type === "member_expression") {
				const accessInfo = this.parseFieldAccess(
					node,
					methodIdentifier,
					methodClassName,
				);
				if (accessInfo) {
					accesses.push(accessInfo);
				}
			}

			// Look for assignment expressions to detect writes
			if (node.type === "assignment_expression") {
				const leftNode = node.childForFieldName("left");
				if (leftNode?.type === "member_expression") {
					const accessInfo = this.parseFieldAccess(
						leftNode,
						methodIdentifier,
						methodClassName,
						true, // isWrite
					);
					if (accessInfo) {
						accesses.push(accessInfo);
					}
				}
			}

			// Look for update expressions (++, --) to detect writes
			if (node.type === "update_expression") {
				const argumentNode = node.childForFieldName("argument");
				if (argumentNode?.type === "member_expression") {
					const accessInfo = this.parseFieldAccess(
						argumentNode,
						methodIdentifier,
						methodClassName,
						true, // isWrite
					);
					if (accessInfo) {
						accesses.push(accessInfo);
					}
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
		return accesses;
	}

	/**
	 * Parse member expression to extract field access information
	 */
	private parseFieldAccess(
		node: Parser.SyntaxNode,
		methodIdentifier: string,
		methodClassName: string | undefined,
		isWrite = false,
	): FieldAccessInfo | null {
		try {
			const objectNode = node.childForFieldName("object");
			const propertyNode = node.childForFieldName("property");

			if (!objectNode || !propertyNode) return null;

			const objectText = objectNode.text;
			const fieldName = propertyNode.text;
			const lineNumber = node.startPosition.row + 1;

			// Filter out method calls (they have call_expression parent)
			if (node.parent?.type === "call_expression") {
				return null;
			}

			if (objectText === "this") {
				// this.field - same class field access
				return {
					methodIdentifier,
					fieldName,
					fieldClassName: methodClassName,
					lineNumber,
					accessType: "this",
					isWrite,
				};
			} else if (objectText === "super") {
				// super.field - parent class field access
				return {
					methodIdentifier,
					fieldName,
					fieldClassName: undefined, // Parent class not known yet
					lineNumber,
					accessType: "super",
					isWrite,
				};
			} else if (objectText[0]?.toUpperCase() === objectText[0]) {
				// ClassName.field - static field access
				return {
					methodIdentifier,
					fieldName,
					fieldClassName: objectText, // Assume class name
					lineNumber,
					accessType: "static",
					isWrite,
				};
			} else {
				// obj.field - member field access
				return {
					methodIdentifier,
					fieldName,
					fieldClassName: undefined, // External class not known
					lineNumber,
					accessType: "member",
					isWrite,
				};
			}
		} catch (error) {
			console.warn("Failed to parse field access:", error);
			return null;
		}
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
		const config = this.getConfig<{
			complexityThreshold: { medium: number };
		}>();
		if (
			method.cyclomaticComplexity > (config.complexityThreshold?.medium || 10)
		) {
			tags.push("high-complexity");
		}

		// Entry methods
		if (["main", "init", "setup", "start"].includes(method.name)) {
			tags.push("entry-method");
		}

		return tags;
	}
}
