/**
 * Enhanced Export Extractor
 *
 * Extracts detailed export information including:
 * - Function exports (export function myFunc())
 * - Class exports (export class MyClass)
 * - Variable exports (export const myVar = 'value')
 * - Class internal methods and properties
 * - Default exports
 *
 * @author Enhanced Dependency Linker
 * @version 1.0.0
 */

import type Parser from "tree-sitter";
import { DependencyExtractor } from "./DependencyExtractor";
import type {
	ExtractorConfiguration,
	ExtractorMetadata,
	ExtractorOptions,
	IDataExtractor,
	OutputSchema,
	ValidationResult,
} from "./IDataExtractor";

// Enhanced export information types
export interface ExportMethodInfo {
	name: string; // Method/function name
	exportType: ExportType; // Type classification
	declarationType: DeclarationType; // How it's declared
	location: SourceLocation; // Source location
	parentClass?: string; // Parent class name (for class methods)
	isAsync?: boolean; // Is async function
	isStatic?: boolean; // Is static method (for class methods)
	visibility?: "public" | "private" | "protected"; // Visibility (for class methods)
	parameters?: ParameterInfo[]; // Function parameters
	returnType?: string; // Return type (if available)
}

export type ExportType =
	| "function" // export function myFunc()
	| "class" // export class MyClass
	| "variable" // export const/let/var
	| "type" // export type/interface
	| "enum" // export enum
	| "default" // export default
	| "class_method" // class method inside exported class
	| "class_property" // class property inside exported class
	| "re_export"; // export { foo } from 'module'

export type DeclarationType =
	| "named_export" // export function foo() {}
	| "default_export" // export default function() {}
	| "assignment_export" // export const foo = () => {}
	| "class_member" // method/property inside class
	| "re_export"; // export from other module

export interface ParameterInfo {
	name: string;
	type?: string;
	optional?: boolean;
	defaultValue?: string;
}

export interface SourceLocation {
	line: number;
	column: number;
	endLine?: number;
	endColumn?: number;
}

// Enhanced extraction result
export interface EnhancedExportExtractionResult {
	exportMethods: ExportMethodInfo[]; // All exported items with detailed info
	statistics: ExportStatistics; // Summary statistics
	classes: ClassExportInfo[]; // Detailed class information
}

export interface ExportStatistics {
	totalExports: number;
	functionExports: number;
	classExports: number;
	variableExports: number;
	typeExports: number;
	defaultExports: number;
	classMethodsExports: number;
	classPropertiesExports: number;
}

export interface ClassExportInfo {
	className: string;
	location: SourceLocation;
	methods: ClassMethodInfo[];
	properties: ClassPropertyInfo[];
	isDefaultExport: boolean;
	superClass?: string;
	implementsInterfaces?: string[];
}

export interface ClassMethodInfo {
	name: string;
	isStatic: boolean;
	isAsync: boolean;
	visibility: "public" | "private" | "protected";
	parameters: ParameterInfo[];
	returnType?: string;
	location: SourceLocation;
}

export interface ClassPropertyInfo {
	name: string;
	isStatic: boolean;
	visibility: "public" | "private" | "protected";
	type?: string;
	initialValue?: string;
	location: SourceLocation;
}

export class EnhancedExportExtractor
	implements IDataExtractor<EnhancedExportExtractionResult>
{
	public readonly name = "EnhancedExportExtractor";
	public readonly version = "1.0.0";
	public readonly description =
		"Extracts detailed export information including functions, classes, variables, and class members";

	private dependencyExtractor = new DependencyExtractor();

	/**
	 * Extract enhanced export information from AST
	 */
	extractExports(
		ast: Parser.Tree,
		_filePath: string,
		_options?: ExtractorOptions,
	): EnhancedExportExtractionResult {
		const tree = ast as Parser.Tree;
		const exportMethods: ExportMethodInfo[] = [];
		const classes: ClassExportInfo[] = [];

		// Get the full source code for pattern matching as backup
		const sourceCode = tree.rootNode.text;

		// Traverse the AST to find all exports
		const visit = (node: Parser.SyntaxNode) => {
			// Handle different export types
			switch (node.type) {
				case "export_statement":
					this.processExportStatement(node, exportMethods, classes);
					break;
				case "function_declaration":
					if (this.hasExportModifier(node)) {
						this.processFunctionExport(node, exportMethods);
					}
					break;
				case "class_declaration":
					if (this.hasExportModifier(node)) {
						this.processClassExport(node, exportMethods, classes);
					}
					break;
				case "abstract_class_declaration":
					if (this.hasExportModifier(node)) {
						this.processClassExport(node, exportMethods, classes);
					}
					break;
				case "lexical_declaration":
				case "variable_statement":
					if (this.hasExportModifier(node)) {
						this.processVariableExport(node, exportMethods);
					}
					break;
				case "interface_declaration":
				case "type_alias_declaration":
				case "enum_declaration":
					if (this.hasExportModifier(node)) {
						this.processTypeExport(node, exportMethods);
					}
					break;
			}

			// Recursively visit children
			for (let i = 0; i < node.childCount; i++) {
				const child = node.child(i);
				if (child) {
					visit(child);
				}
			}
		};

		visit(tree.rootNode);

		// Backup pattern-based detection for variable exports that might be missed
		this.supplementVariableExports(sourceCode, exportMethods);

		// Calculate statistics
		const statistics = this.calculateStatistics(exportMethods, classes);

		return {
			exportMethods,
			statistics,
			classes,
		};
	}

	private processExportStatement(
		node: Parser.SyntaxNode,
		exportMethods: ExportMethodInfo[],
		classes: ClassExportInfo[],
	): void {
		// Direct text analysis combined with AST traversal for more reliable detection
		const nodeText = node.text;

		// Handle export default first
		if (nodeText.includes("export default")) {
			this.processDefaultExport(node, exportMethods, classes);
			return;
		}

		// Handle re-exports (contains 'from')
		if (nodeText.includes("from")) {
			this.processReExport(node, exportMethods);
			return;
		}

		// Check for different export patterns by looking at children
		let foundDeclaration = false;

		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (!child) continue;

			switch (child.type) {
				case "function_declaration":
					this.processFunctionExport(node, exportMethods);
					foundDeclaration = true;
					break;
				case "class_declaration":
				case "abstract_class_declaration":
					this.processClassExport(node, exportMethods, classes);
					foundDeclaration = true;
					break;
				case "lexical_declaration":
				case "variable_statement":
					this.processVariableExport(node, exportMethods);
					foundDeclaration = true;
					break;
				case "interface_declaration":
				case "type_alias_declaration":
				case "enum_declaration":
					this.processTypeExport(node, exportMethods);
					foundDeclaration = true;
					break;
				case "export_clause":
					// Handle export { foo, bar } patterns
					this.processNamedExports(child, exportMethods);
					foundDeclaration = true;
					break;
			}
		}

		// If no specific declaration was found, check for export clause patterns
		if (!foundDeclaration) {
			// Look for export specifiers anywhere in the node
			this.processVariableExport(node, exportMethods);
		}
	}

	/**
	 * Process named exports like: export { foo, bar as baz }
	 */
	private processNamedExports(
		exportClause: Parser.SyntaxNode,
		exportMethods: ExportMethodInfo[],
	): void {
		for (let i = 0; i < exportClause.childCount; i++) {
			const child = exportClause.child(i);
			if (child && child.type === "export_specifier") {
				const name = this.getVariableName(child);
				if (name) {
					const exportMethod: ExportMethodInfo = {
						name,
						exportType: "variable",
						declarationType: "named_export",
						location: this.getLocation(child),
					};
					exportMethods.push(exportMethod);
				}
			}
		}
	}

	/**
	 * Supplement variable exports using pattern matching for missed cases
	 */
	private supplementVariableExports(
		sourceCode: string,
		exportMethods: ExportMethodInfo[],
	): void {
		// Pattern for export const/let/var declarations
		const variableExportPattern =
			/export\s+(const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
		let match: RegExpExecArray | null;

		match = variableExportPattern.exec(sourceCode);
		while (match !== null) {
			const varName = match[2];
			// Check if we already have this variable
			const exists = exportMethods.some(
				(exp) => exp.name === varName && exp.exportType === "variable",
			);
			if (!exists) {
				exportMethods.push({
					name: varName,
					exportType: "variable",
					declarationType: "named_export",
					location: { line: 1, column: 0 }, // Approximate location
				});
			}
			match = variableExportPattern.exec(sourceCode);
		}

		// Pattern for export { ... } declarations
		const namedExportPattern = /export\s*\{\s*([^}]+)\s*\}/g;
		// Reset match variable for reuse
		match = namedExportPattern.exec(sourceCode);
		while (match !== null) {
			const exportList = match[1];
			// Parse individual exports like "internal as publicInternal"
			const exports = exportList.split(",").map((exp) => exp.trim());

			for (const exp of exports) {
				let exportName: string;
				if (exp.includes(" as ")) {
					// Handle alias: "internal as publicInternal"
					exportName = exp.split(" as ")[1].trim();
				} else {
					// Handle simple export: "foo"
					exportName = exp.trim();
				}

				// Check if we already have this export
				const exists = exportMethods.some(
					(method) => method.name === exportName,
				);
				if (
					!exists &&
					exportName &&
					/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(exportName)
				) {
					exportMethods.push({
						name: exportName,
						exportType: "variable",
						declarationType: "named_export",
						location: { line: 1, column: 0 }, // Approximate location
					});
				}
			}
			match = namedExportPattern.exec(sourceCode);
		}
	}

	private processFunctionExport(
		node: Parser.SyntaxNode,
		exportMethods: ExportMethodInfo[],
	): void {
		const functionNode = this.findFunctionNode(node);
		if (!functionNode) return;

		const name = this.getFunctionName(functionNode);
		if (!name) return;

		const exportMethod: ExportMethodInfo = {
			name,
			exportType: "function",
			declarationType: "named_export",
			location: this.getLocation(functionNode),
			isAsync: this.isAsyncFunction(functionNode),
			parameters: this.extractFunctionParameters(functionNode),
			returnType: this.extractReturnType(functionNode),
		};

		exportMethods.push(exportMethod);
	}

	private processClassExport(
		node: Parser.SyntaxNode,
		exportMethods: ExportMethodInfo[],
		classes: ClassExportInfo[],
	): void {
		const classNode = this.findClassNode(node);
		if (!classNode) return;

		this.processClassDeclaration(classNode, exportMethods, classes, true);
	}

	private processClassDeclaration(
		classNode: Parser.SyntaxNode,
		exportMethods: ExportMethodInfo[],
		classes: ClassExportInfo[],
		isExported: boolean,
	): void {
		const className = this.getClassName(classNode);
		if (!className) return;

		// Add class export info
		if (isExported) {
			const classExportMethod: ExportMethodInfo = {
				name: className,
				exportType: "class",
				declarationType: "named_export",
				location: this.getLocation(classNode),
			};
			exportMethods.push(classExportMethod);
		}

		// Extract class methods and properties
		const methods: ClassMethodInfo[] = [];
		const properties: ClassPropertyInfo[] = [];

		this.extractClassMembers(
			classNode,
			methods,
			properties,
			exportMethods,
			className,
			isExported,
		);

		const classInfo: ClassExportInfo = {
			className,
			location: this.getLocation(classNode),
			methods,
			properties,
			isDefaultExport: false, // TODO: detect default export
			superClass: this.getSuperClass(classNode),
			implementsInterfaces: this.getImplementedInterfaces(classNode),
		};

		classes.push(classInfo);
	}

	private processVariableExport(
		node: Parser.SyntaxNode,
		exportMethods: ExportMethodInfo[],
	): void {
		const variableNodes = this.findVariableNodes(node);

		for (const varNode of variableNodes) {
			const name = this.getVariableName(varNode);
			if (!name) continue;

			// Determine if this is a re-export (has 'from' clause) or named export
			const isReExport = node.text.includes("from");

			const exportMethod: ExportMethodInfo = {
				name,
				exportType: "variable",
				declarationType: isReExport ? "re_export" : "named_export",
				location: this.getLocation(varNode),
			};

			exportMethods.push(exportMethod);
		}
	}

	private processDefaultExport(
		node: Parser.SyntaxNode,
		exportMethods: ExportMethodInfo[],
		classes: ClassExportInfo[],
	): void {
		// Handle export default cases
		const defaultExportNode = this.findDefaultExportNode(node);
		if (!defaultExportNode) return;

		const exportType = this.getNodeExportType(defaultExportNode);
		const name = this.getDefaultExportName(defaultExportNode) || "default";

		const exportMethod: ExportMethodInfo = {
			name,
			exportType: "default" as ExportType,
			declarationType: "default_export",
			location: this.getLocation(defaultExportNode),
		};

		exportMethods.push(exportMethod);

		// If it's a class, process it but DON'T add duplicate class export method
		if (
			exportType === "class" &&
			(defaultExportNode.type === "class_declaration" ||
				defaultExportNode.type === "abstract_class_declaration")
		) {
			// Process class declaration for detailed class info
			this.processClassDeclaration(
				defaultExportNode,
				exportMethods,
				classes,
				false,
			);
			// Mark the class as default export
			const lastClass = classes[classes.length - 1];
			if (lastClass) {
				lastClass.isDefaultExport = true;
			}
		}
	}

	private processTypeExport(
		node: Parser.SyntaxNode,
		exportMethods: ExportMethodInfo[],
	): void {
		const typeNode = this.findTypeNode(node);
		if (!typeNode) return;

		const name = this.getTypeName(typeNode);
		if (!name) return;

		const exportMethod: ExportMethodInfo = {
			name,
			exportType: "type",
			declarationType: "named_export",
			location: this.getLocation(typeNode),
		};

		exportMethods.push(exportMethod);
	}

	private processReExport(
		node: Parser.SyntaxNode,
		exportMethods: ExportMethodInfo[],
	): void {
		// Handle export { foo, bar } from 'module'
		const specifiers = this.extractReExportSpecifiers(node);
		const _source = this.getReExportSource(node);

		for (const specifier of specifiers) {
			const exportMethod: ExportMethodInfo = {
				name: specifier,
				exportType: "re_export",
				declarationType: "re_export",
				location: this.getLocation(node),
			};

			exportMethods.push(exportMethod);
		}
	}

	private extractClassMembers(
		classNode: Parser.SyntaxNode,
		methods: ClassMethodInfo[],
		properties: ClassPropertyInfo[],
		exportMethods: ExportMethodInfo[],
		className: string,
		classIsExported: boolean,
	): void {
		const classBody = classNode.childForFieldName("body");
		if (!classBody) return;

		for (let i = 0; i < classBody.childCount; i++) {
			const member = classBody.child(i);
			if (!member) continue;

			if (this.isMethod(member)) {
				const methodInfo = this.extractMethodInfo(member, className);
				if (methodInfo) {
					methods.push(methodInfo);

					// Add to export methods if class is exported
					if (classIsExported) {
						const exportMethod: ExportMethodInfo = {
							name: methodInfo.name,
							exportType: "class_method",
							declarationType: "class_member",
							location: methodInfo.location,
							parentClass: className,
							isAsync: methodInfo.isAsync,
							isStatic: methodInfo.isStatic,
							visibility: methodInfo.visibility,
							parameters: methodInfo.parameters,
							returnType: methodInfo.returnType,
						};
						exportMethods.push(exportMethod);
					}
				}
			} else if (this.isProperty(member)) {
				const propertyInfo = this.extractPropertyInfo(member, className);
				if (propertyInfo) {
					properties.push(propertyInfo);

					// Add to export methods if class is exported
					if (classIsExported) {
						const exportMethod: ExportMethodInfo = {
							name: propertyInfo.name,
							exportType: "class_property",
							declarationType: "class_member",
							location: propertyInfo.location,
							parentClass: className,
							isStatic: propertyInfo.isStatic,
							visibility: propertyInfo.visibility,
						};
						exportMethods.push(exportMethod);
					}
				}
			}
		}
	}

	private findFunctionNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
		// Find function declaration within export statement
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (child?.type.includes("function")) {
				return child;
			}
		}
		return null;
	}

	private getFunctionName(functionNode: Parser.SyntaxNode): string | null {
		const nameNode = functionNode.childForFieldName("name");
		return nameNode?.text || null;
	}

	private isAsyncFunction(functionNode: Parser.SyntaxNode): boolean {
		return functionNode.text.includes("async");
	}

	private extractFunctionParameters(
		functionNode: Parser.SyntaxNode,
	): ParameterInfo[] {
		const parameters: ParameterInfo[] = [];
		const paramsNode = functionNode.childForFieldName("parameters");

		if (!paramsNode) return parameters;

		for (let i = 0; i < paramsNode.childCount; i++) {
			const param = paramsNode.child(i);
			if (
				param?.type === "required_parameter" ||
				param?.type === "optional_parameter"
			) {
				const name = param.childForFieldName("pattern")?.text || param.text;
				const isOptional = param.type === "optional_parameter";

				parameters.push({
					name,
					optional: isOptional,
				});
			}
		}

		return parameters;
	}

	private extractReturnType(
		functionNode: Parser.SyntaxNode,
	): string | undefined {
		const typeAnnotation = functionNode.childForFieldName("return_type");
		return typeAnnotation?.text;
	}

	private findClassNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (
				child?.type === "class_declaration" ||
				child?.type === "abstract_class_declaration"
			) {
				return child;
			}
		}
		return null;
	}

	private getClassName(classNode: Parser.SyntaxNode): string | null {
		const nameNode = classNode.childForFieldName("name");
		return nameNode?.text || null;
	}

	private getSuperClass(classNode: Parser.SyntaxNode): string | undefined {
		// Parse class declaration for extends clause
		// Expected syntax: export class UserService extends BaseService

		const text = classNode.text;
		const extendsMatch = text.match(/extends\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
		if (extendsMatch) {
			return extendsMatch[1];
		}

		// Alternative: traverse AST nodes
		let foundExtends = false;
		for (let i = 0; i < classNode.childCount; i++) {
			const child = classNode.child(i);
			if (!child) continue;

			// Look for extends keyword
			if (child.text === "extends") {
				foundExtends = true;
				continue;
			}

			// If we found extends, next identifier should be superclass
			if (foundExtends && child.type === "identifier") {
				return child.text;
			}

			// Handle extends clause node type
			if (child.type === "extends_clause" || child.type === "class_heritage") {
				for (let j = 0; j < child.childCount; j++) {
					const grandchild = child.child(j);
					if (grandchild && grandchild.type === "identifier") {
						return grandchild.text;
					}
				}
			}
		}

		return undefined;
	}

	private getImplementedInterfaces(
		_classNode: Parser.SyntaxNode,
	): string[] | undefined {
		// Implementation for extracting implemented interfaces
		return undefined;
	}

	private findVariableNodes(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
		const variables: Parser.SyntaxNode[] = [];

		// Handle different types of variable declarations and exports
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (!child) continue;

			// Handle direct variable declarations: export const/let/var name = value
			if (
				child.type === "lexical_declaration" ||
				child.type === "variable_statement"
			) {
				const declaratorList = child.childForFieldName("declarations");
				if (declaratorList) {
					for (let j = 0; j < declaratorList.childCount; j++) {
						const declarator = declaratorList.child(j);
						if (
							declarator &&
							(declarator.type === "variable_declarator" ||
								declarator.type.includes("declarator"))
						) {
							variables.push(declarator);
						}
					}
				}
			}
			// Handle export clause with specifiers: export { foo, bar as baz }
			else if (child.type === "export_clause") {
				for (let j = 0; j < child.childCount; j++) {
					const specifier = child.child(j);
					if (specifier && specifier.type === "export_specifier") {
						variables.push(specifier);
					}
				}
			}
			// Handle direct export specifier
			else if (child.type === "export_specifier") {
				variables.push(child);
			}
		}

		// If we didn't find any variables through structured traversal,
		// try a recursive search for export_specifiers
		if (variables.length === 0) {
			this.findExportSpecifiersRecursive(node, variables);
		}

		return variables;
	}

	/**
	 * Recursively find export specifiers in the node tree
	 */
	private findExportSpecifiersRecursive(
		node: Parser.SyntaxNode,
		variables: Parser.SyntaxNode[],
	): void {
		if (node.type === "export_specifier") {
			variables.push(node);
		}

		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (child) {
				this.findExportSpecifiersRecursive(child, variables);
			}
		}
	}

	private getVariableName(varNode: Parser.SyntaxNode): string | null {
		// Handle export specifier case: export { internal as publicInternal }
		if (varNode.type === "export_specifier") {
			// For alias exports, we want the exported name (after 'as')
			// Look for alias first (the "as" part)
			let foundAs = false;
			let exportedName: string | null = null;
			let originalName: string | null = null;

			for (let i = 0; i < varNode.childCount; i++) {
				const child = varNode.child(i);
				if (!child) continue;

				if (child.text === "as") {
					foundAs = true;
					continue;
				}

				if (child.type === "identifier") {
					if (!foundAs && !originalName) {
						// First identifier is the original name
						originalName = child.text;
					} else if (foundAs && !exportedName) {
						// Identifier after 'as' is the exported name
						exportedName = child.text;
					}
				}
			}

			// Return the exported name if aliased, otherwise the original name
			return exportedName || originalName;
		}

		// Handle variable declarator case: const API_URL = '...'
		const nameNode = varNode.childForFieldName("name");
		if (nameNode) {
			return nameNode.text;
		}

		// Try to find identifier in children
		for (let i = 0; i < varNode.childCount; i++) {
			const child = varNode.child(i);
			if (child && child.type === "identifier") {
				return child.text;
			}
		}

		return null;
	}

	private findDefaultExportNode(
		node: Parser.SyntaxNode,
	): Parser.SyntaxNode | null {
		// Find the actual exported node after 'default' keyword
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (!child) continue;

			// Skip 'export' and 'default' keywords
			if (child.text === "export" || child.text === "default") {
				continue;
			}

			// Return the actual declaration/expression being exported
			if (
				child.type === "class_declaration" ||
				child.type === "function_declaration" ||
				child.type === "identifier" ||
				child.type === "expression_statement"
			) {
				return child;
			}
		}
		return null;
	}

	private getNodeExportType(node: Parser.SyntaxNode): string {
		if (node.type === "function_declaration") return "function";
		if (node.type === "class_declaration") return "class";
		if (node.type === "interface_declaration") return "type";
		if (node.type === "type_alias_declaration") return "type";
		if (node.type === "enum_declaration") return "type";
		if (
			node.type === "lexical_declaration" ||
			node.type === "variable_statement"
		)
			return "variable";
		return "default";
	}

	private getDefaultExportName(node: Parser.SyntaxNode): string | null {
		const nameNode = node.childForFieldName("name");
		return nameNode?.text || null;
	}

	private extractReExportSpecifiers(node: Parser.SyntaxNode): string[] {
		const specifiers: string[] = [];

		// Look for export clause or export specifiers
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (!child) continue;

			if (child.type === "export_clause") {
				// Handle: export { foo, bar } from 'module'
				for (let j = 0; j < child.childCount; j++) {
					const specifier = child.child(j);
					if (specifier && specifier.type === "export_specifier") {
						const name = specifier.childForFieldName("name")?.text;
						if (name) {
							specifiers.push(name);
						}
					}
				}
			} else if (child.type === "export_specifier") {
				// Direct export specifier
				const name = child.childForFieldName("name")?.text;
				if (name) {
					specifiers.push(name);
				}
			} else if (child.text === "*") {
				// Handle: export * from 'module'
				specifiers.push("*");
			}
		}

		return specifiers;
	}

	private getReExportSource(node: Parser.SyntaxNode): string | null {
		const sourceNode = node.childForFieldName("source");
		return sourceNode?.text || null;
	}

	private findTypeNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (
				child?.type === "interface_declaration" ||
				child?.type === "type_alias_declaration" ||
				child?.type === "enum_declaration"
			) {
				return child;
			}
		}
		return null;
	}

	private getTypeName(typeNode: Parser.SyntaxNode): string | null {
		const nameNode = typeNode.childForFieldName("name");
		return nameNode?.text || null;
	}

	private hasExportModifier(node: Parser.SyntaxNode): boolean {
		// Check if node has export modifier by looking at parent or previous sibling
		let current: Parser.SyntaxNode | null = node;

		// Check if this node or its parent has export modifier
		while (current) {
			// Check previous siblings for export keyword
			let sibling = current.previousSibling;
			while (sibling) {
				if (sibling.type === "export" || sibling.text === "export") {
					return true;
				}
				sibling = sibling.previousSibling;
			}

			// Check parent
			current = current.parent;
			if (
				current &&
				(current.type === "export_statement" ||
					current.text.startsWith("export"))
			) {
				return true;
			}

			// Don't go too far up the tree
			if (
				current &&
				(current.type === "program" || current.type === "source_file")
			) {
				break;
			}
		}

		return false;
	}

	private isMethod(node: Parser.SyntaxNode): boolean {
		return (
			node.type === "method_definition" || node.type === "function_declaration"
		);
	}

	private isProperty(node: Parser.SyntaxNode): boolean {
		return (
			node.type === "property_definition" ||
			node.type === "field_definition" ||
			node.type === "public_field_definition" ||
			node.type === "private_field_definition" ||
			node.type === "protected_field_definition" ||
			node.type === "property_signature" ||
			// Handle property declarations in class body
			(node.type === "lexical_declaration" &&
				node.parent?.type === "class_body")
		);
	}

	private extractMethodInfo(
		node: Parser.SyntaxNode,
		_className: string,
	): ClassMethodInfo | null {
		const name = this.getMethodName(node);
		if (!name) return null;

		return {
			name,
			isStatic: this.isStaticMethod(node),
			isAsync: this.isAsyncFunction(node),
			visibility: this.getVisibility(node),
			parameters: this.extractFunctionParameters(node),
			returnType: this.extractReturnType(node),
			location: this.getLocation(node),
		};
	}

	private extractPropertyInfo(
		node: Parser.SyntaxNode,
		_className: string,
	): ClassPropertyInfo | null {
		let name: string | null = null;

		// Try different ways to get property name
		if (node.type === "lexical_declaration") {
			// Handle: private value: number = 0;
			const declarator = node.childForFieldName("declarations")?.child(0);
			name = declarator?.childForFieldName("name")?.text || null;
		} else {
			// Handle other property types
			name = this.getPropertyName(node);
		}

		if (!name) return null;

		return {
			name,
			isStatic: this.isStaticProperty(node),
			visibility: this.getVisibility(node),
			type: this.getPropertyType(node),
			initialValue: this.getPropertyInitialValue(node),
			location: this.getLocation(node),
		};
	}

	private getMethodName(node: Parser.SyntaxNode): string | null {
		const nameNode = node.childForFieldName("name");
		return nameNode?.text || null;
	}

	private isStaticMethod(node: Parser.SyntaxNode): boolean {
		return node.text.includes("static");
	}

	private isStaticProperty(node: Parser.SyntaxNode): boolean {
		return node.text.includes("static");
	}

	private getVisibility(
		node: Parser.SyntaxNode,
	): "public" | "private" | "protected" {
		const text = node.text;
		if (text.includes("private")) return "private";
		if (text.includes("protected")) return "protected";
		return "public";
	}

	private getPropertyName(node: Parser.SyntaxNode): string | null {
		const nameNode = node.childForFieldName("name");
		return nameNode?.text || null;
	}

	private getPropertyType(node: Parser.SyntaxNode): string | undefined {
		const typeNode = node.childForFieldName("type");
		return typeNode?.text;
	}

	private getPropertyInitialValue(node: Parser.SyntaxNode): string | undefined {
		const valueNode = node.childForFieldName("value");
		return valueNode?.text;
	}

	private getLocation(node: Parser.SyntaxNode): SourceLocation {
		return {
			line: node.startPosition.row + 1,
			column: node.startPosition.column,
			endLine: node.endPosition.row + 1,
			endColumn: node.endPosition.column,
		};
	}

	private calculateStatistics(
		exportMethods: ExportMethodInfo[],
		classes: ClassExportInfo[],
	): ExportStatistics {
		const stats: ExportStatistics = {
			totalExports: exportMethods.length,
			functionExports: 0,
			classExports: 0,
			variableExports: 0,
			typeExports: 0,
			defaultExports: 0,
			classMethodsExports: 0,
			classPropertiesExports: 0,
		};

		// Count from exportMethods
		for (const method of exportMethods) {
			switch (method.exportType) {
				case "function":
					stats.functionExports++;
					break;
				case "class":
					stats.classExports++;
					break;
				case "variable":
					stats.variableExports++;
					break;
				case "type":
					stats.typeExports++;
					break;
				case "default":
					stats.defaultExports++;
					break;
				case "class_method":
					stats.classMethodsExports++;
					break;
				case "class_property":
					stats.classPropertiesExports++;
					break;
			}
		}

		// For class counting, we need to be more careful:
		// 1. Regular class exports (export class Foo) -> count as classExports
		// 2. Default class exports (export default class Bar) -> count as classExports too
		// The key is to count actual exported classes, not duplicate entries

		// Count classes from the classes array which represents actual class declarations
		const regularClasses = classes.filter((cls) => !cls.isDefaultExport);
		const defaultClasses = classes.filter((cls) => cls.isDefaultExport);

		// Set the correct class count: regular classes + default classes
		stats.classExports = regularClasses.length + defaultClasses.length;

		return stats;
	}

	// IDataExtractor interface implementation
	extract(
		ast: Parser.Tree,
		filePath: string,
		options?: ExtractorOptions,
	): EnhancedExportExtractionResult {
		return this.extractExports(ast, filePath, options);
	}

	supports(language: string): boolean {
		return ["typescript", "javascript", "tsx", "jsx"].includes(
			language.toLowerCase(),
		);
	}

	getName(): string {
		return this.name;
	}

	getVersion(): string {
		return this.version;
	}

	validate(data: EnhancedExportExtractionResult): ValidationResult {
		const errors: string[] = [];

		if (!data.exportMethods || !Array.isArray(data.exportMethods)) {
			errors.push("exportMethods must be an array");
		}

		if (!data.statistics || typeof data.statistics !== "object") {
			errors.push("statistics must be an object");
		}

		if (!data.classes || !Array.isArray(data.classes)) {
			errors.push("classes must be an array");
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings: [],
		};
	}

	getMetadata(): ExtractorMetadata {
		return {
			name: this.name,
			version: this.version,
			description: this.description,
			supportedLanguages: ["typescript", "javascript", "tsx", "jsx"],
			outputTypes: ["EnhancedExportExtractionResult"],
			dependencies: [],
			performance: {
				averageTimePerNode: 0.12,
				memoryUsage: "medium",
				timeComplexity: "linear",
				maxRecommendedFileSize: 2 * 1024 * 1024, // 2MB
			},
			author: "Enhanced Dependency Linker",
			license: "MIT",
		};
	}

	configure(options: ExtractorConfiguration): void {
		// Configuration can be passed to underlying dependency extractor
		this.dependencyExtractor.configure(options);
	}

	getConfiguration(): ExtractorConfiguration {
		return this.dependencyExtractor.getConfiguration();
	}

	getOutputSchema(): OutputSchema {
		return {
			type: "object",
			properties: {
				exportMethods: {
					type: "array",
					description: "Array of export method information",
					items: {
						type: "object",
						properties: {
							name: { type: "string" },
							exportType: { type: "string" },
							declarationType: { type: "string" },
							location: { type: "object" },
							parentClass: { type: "string" },
							isAsync: { type: "boolean" },
							isStatic: { type: "boolean" },
							visibility: { type: "string" },
							parameters: { type: "array" },
							returnType: { type: "string" },
						},
					},
				},
				statistics: {
					type: "object",
					description: "Export statistics summary",
					properties: {
						totalExports: { type: "number" },
						functionExports: { type: "number" },
						classExports: { type: "number" },
						variableExports: { type: "number" },
						typeExports: { type: "number" },
						defaultExports: { type: "number" },
						classMethodsExports: { type: "number" },
						classPropertiesExports: { type: "number" },
					},
				},
				classes: {
					type: "array",
					description: "Detailed class information",
					items: {
						type: "object",
						properties: {
							className: { type: "string" },
							location: { type: "object" },
							methods: { type: "array" },
							properties: { type: "array" },
							isDefaultExport: { type: "boolean" },
						},
					},
				},
			},
			required: ["exportMethods", "statistics", "classes"],
			version: "1.0.0",
		};
	}

	dispose(): void {
		this.dependencyExtractor.dispose();
	}
}
