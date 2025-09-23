/**
 * Type-safe wrappers for Tree-sitter AST nodes
 * Provides enhanced type safety and utility methods
 */

import type {
	TreeSitterNode,
	TreeSitterTree,
	TypeScript,
} from "./TreeSitterTypes";

/**
 * Generic AST wrapper that provides type-safe access to tree-sitter nodes
 */
export abstract class ASTWrapper<T extends TreeSitterNode = TreeSitterNode> {
	protected constructor(protected readonly node: T) {}

	get type(): string {
		return this.node.type;
	}

	get text(): string {
		return this.node.text;
	}

	get startPosition() {
		return this.node.startPosition;
	}

	get endPosition() {
		return this.node.endPosition;
	}

	get startIndex(): number {
		return this.node.startIndex;
	}

	get endIndex(): number {
		return this.node.endIndex;
	}

	get isNamed(): boolean {
		return this.node.isNamed;
	}

	get isMissing(): boolean {
		return this.node.isMissing;
	}

	get hasError(): boolean {
		const node = this.node as any;
		if (!node.hasError) return false;
		try {
			return typeof node.hasError === "function"
				? node.hasError()
				: Boolean(node.hasError);
		} catch {
			return false;
		}
	}

	get parent(): ASTWrapper | null {
		return this.node.parent ? ASTWrapper.wrap(this.node.parent) : null;
	}

	get children(): ASTWrapper[] {
		return this.node.children.map((child) => ASTWrapper.wrap(child));
	}

	get namedChildren(): ASTWrapper[] {
		return this.node.namedChildren.map((child) => ASTWrapper.wrap(child));
	}

	/**
	 * Factory method to create appropriate wrapper instances
	 */
	static wrap(node: TreeSitterNode): ASTWrapper {
		switch (node.type) {
			case "program":
			case "source_file":
				return new ProgramWrapper(node as TypeScript.ProgramNode);
			case "function_declaration":
				return new FunctionDeclarationWrapper(
					node as TypeScript.FunctionDeclarationNode,
				);
			case "class_declaration":
				return new ClassDeclarationWrapper(
					node as TypeScript.ClassDeclarationNode,
				);
			case "interface_declaration":
				return new InterfaceDeclarationWrapper(
					node as TypeScript.InterfaceDeclarationNode,
				);
			case "variable_declaration":
				return new VariableDeclarationWrapper(
					node as TypeScript.VariableDeclarationNode,
				);
			case "import_statement":
				return new ImportStatementWrapper(
					node as TypeScript.ImportStatementNode,
				);
			case "export_statement":
				return new ExportStatementWrapper(
					node as TypeScript.ExportStatementNode,
				);
			case "call_expression":
				return new CallExpressionWrapper(node as TypeScript.CallExpressionNode);
			case "member_expression":
				return new MemberExpressionWrapper(
					node as TypeScript.MemberExpressionNode,
				);
			case "binary_expression":
				return new BinaryExpressionWrapper(
					node as TypeScript.BinaryExpressionNode,
				);
			case "arrow_function":
				return new ArrowFunctionWrapper(node as TypeScript.ArrowFunctionNode);
			case "identifier":
				return new IdentifierWrapper(node as TypeScript.IdentifierNode);
			case "string":
				return new StringLiteralWrapper(node as TypeScript.StringNode);
			case "number":
				return new NumberLiteralWrapper(node as TypeScript.NumberNode);
			default:
				return new GenericWrapper(node);
		}
	}

	/**
	 * Type-safe field access
	 */
	protected getField<K extends keyof T>(fieldName: K): ASTWrapper | null {
		const fieldNode = this.node.childForFieldName(fieldName as string);
		return fieldNode ? ASTWrapper.wrap(fieldNode) : null;
	}

	/**
	 * Get child by index with wrapper
	 */
	child(index: number): ASTWrapper | null {
		const childNode = this.node.child(index);
		return childNode ? ASTWrapper.wrap(childNode) : null;
	}

	/**
	 * Get named child by index with wrapper
	 */
	namedChild(index: number): ASTWrapper | null {
		const childNode = this.node.namedChild(index);
		return childNode ? ASTWrapper.wrap(childNode) : null;
	}

	/**
	 * Find children by type
	 */
	findChildrenByType(type: string): ASTWrapper[] {
		return this.children.filter((child) => child.type === type);
	}

	/**
	 * Find first child by type
	 */
	findChildByType(type: string): ASTWrapper | null {
		return this.children.find((child) => child.type === type) || null;
	}

	/**
	 * Traverse all descendants
	 */
	traverse(visitor: (node: ASTWrapper) => boolean | undefined): void {
		const shouldContinue = visitor(this);
		if (shouldContinue === false) return;

		for (const child of this.children) {
			child.traverse(visitor);
		}
	}

	/**
	 * Convert to JSON representation
	 */
	toJSON(): any {
		return {
			type: this.type,
			text: this.text,
			startPosition: this.startPosition,
			endPosition: this.endPosition,
			children: this.children.map((child) => child.toJSON()),
		};
	}

	/**
	 * Get raw tree-sitter node
	 */
	getRawNode(): TreeSitterNode {
		return this.node;
	}
}

/**
 * Generic wrapper for unspecialized node types
 */
export class GenericWrapper extends ASTWrapper {}

/**
 * Wrapper for program/source_file nodes
 */
export class ProgramWrapper extends ASTWrapper<TypeScript.ProgramNode> {
	get statements(): ASTWrapper[] {
		return this.namedChildren;
	}

	get imports(): ImportStatementWrapper[] {
		return this.findChildrenByType(
			"import_statement",
		) as ImportStatementWrapper[];
	}

	get exports(): ExportStatementWrapper[] {
		return this.findChildrenByType(
			"export_statement",
		) as ExportStatementWrapper[];
	}

	get functions(): FunctionDeclarationWrapper[] {
		return this.findChildrenByType(
			"function_declaration",
		) as FunctionDeclarationWrapper[];
	}

	get classes(): ClassDeclarationWrapper[] {
		return this.findChildrenByType(
			"class_declaration",
		) as ClassDeclarationWrapper[];
	}

	get interfaces(): InterfaceDeclarationWrapper[] {
		return this.findChildrenByType(
			"interface_declaration",
		) as InterfaceDeclarationWrapper[];
	}
}

/**
 * Wrapper for function declaration nodes
 */
export class FunctionDeclarationWrapper extends ASTWrapper<TypeScript.FunctionDeclarationNode> {
	get name(): IdentifierWrapper | null {
		return this.getField("name") as IdentifierWrapper | null;
	}

	get parameters(): ASTWrapper[] {
		const parametersNode = this.findChildByType("formal_parameters");
		return parametersNode?.namedChildren || [];
	}

	get returnType(): ASTWrapper | null {
		return this.findChildByType("type_annotation");
	}

	get body(): ASTWrapper | null {
		return this.getField("body");
	}

	get isAsync(): boolean {
		return this.text.includes("async");
	}

	get isGenerator(): boolean {
		return this.text.includes("function*");
	}
}

/**
 * Wrapper for class declaration nodes
 */
export class ClassDeclarationWrapper extends ASTWrapper<TypeScript.ClassDeclarationNode> {
	get name(): IdentifierWrapper | null {
		return this.getField("name") as IdentifierWrapper | null;
	}

	get superClass(): ASTWrapper | null {
		return this.getField("superClass");
	}

	get implements(): ASTWrapper[] {
		const implementsClause = this.findChildByType("implements_clause");
		return implementsClause?.namedChildren || [];
	}

	get body(): ASTWrapper | null {
		return this.getField("body");
	}

	get methods(): ASTWrapper[] {
		const body = this.body;
		return body?.findChildrenByType("method_definition") || [];
	}

	get properties(): ASTWrapper[] {
		const body = this.body;
		return body?.findChildrenByType("property_definition") || [];
	}
}

/**
 * Wrapper for interface declaration nodes
 */
export class InterfaceDeclarationWrapper extends ASTWrapper<TypeScript.InterfaceDeclarationNode> {
	get name(): IdentifierWrapper | null {
		return this.getField("name") as IdentifierWrapper | null;
	}

	get extends(): ASTWrapper[] {
		const extendsClause = this.findChildByType("extends_clause");
		return extendsClause?.namedChildren || [];
	}

	get body(): ASTWrapper | null {
		return this.getField("body");
	}

	get properties(): ASTWrapper[] {
		const body = this.body;
		return body?.findChildrenByType("property_signature") || [];
	}

	get methods(): ASTWrapper[] {
		const body = this.body;
		return body?.findChildrenByType("method_signature") || [];
	}
}

/**
 * Wrapper for variable declaration nodes
 */
export class VariableDeclarationWrapper extends ASTWrapper<TypeScript.VariableDeclarationNode> {
	get kind(): string {
		return (
			this.findChildByType("var")?.text ||
			this.findChildByType("let")?.text ||
			this.findChildByType("const")?.text ||
			"var"
		);
	}

	get declarations(): ASTWrapper[] {
		return this.findChildrenByType("variable_declarator");
	}
}

/**
 * Wrapper for import statement nodes
 */
export class ImportStatementWrapper extends ASTWrapper<TypeScript.ImportStatementNode> {
	get source(): StringLiteralWrapper | null {
		return this.getField("source") as StringLiteralWrapper | null;
	}

	get specifiers(): ASTWrapper[] {
		const importClause = this.findChildByType("import_clause");
		return importClause?.namedChildren || [];
	}

	get isTypeOnly(): boolean {
		return this.text.includes("import type");
	}

	get namespace(): ASTWrapper | null {
		return this.findChildByType("namespace_import");
	}

	get defaultImport(): ASTWrapper | null {
		return this.findChildByType("import_default_specifier");
	}

	get namedImports(): ASTWrapper[] {
		const namedImports = this.findChildByType("named_imports");
		return namedImports?.findChildrenByType("import_specifier") || [];
	}
}

/**
 * Wrapper for export statement nodes
 */
export class ExportStatementWrapper extends ASTWrapper<TypeScript.ExportStatementNode> {
	get declaration(): ASTWrapper | null {
		return this.getField("declaration");
	}

	get source(): StringLiteralWrapper | null {
		return this.getField("source") as StringLiteralWrapper | null;
	}

	get isDefault(): boolean {
		return this.text.includes("export default");
	}

	get isTypeOnly(): boolean {
		return this.text.includes("export type");
	}

	get specifiers(): ASTWrapper[] {
		const exportClause = this.findChildByType("export_clause");
		return exportClause?.findChildrenByType("export_specifier") || [];
	}
}

/**
 * Wrapper for call expression nodes
 */
export class CallExpressionWrapper extends ASTWrapper<TypeScript.CallExpressionNode> {
	get function(): ASTWrapper | null {
		return this.getField("function");
	}

	get arguments(): ASTWrapper[] {
		const argumentsNode = this.findChildByType("arguments");
		return argumentsNode?.namedChildren || [];
	}

	get typeArguments(): ASTWrapper[] {
		const typeArgs = this.findChildByType("type_arguments");
		return typeArgs?.namedChildren || [];
	}
}

/**
 * Wrapper for member expression nodes
 */
export class MemberExpressionWrapper extends ASTWrapper<TypeScript.MemberExpressionNode> {
	get object(): ASTWrapper | null {
		return this.getField("object");
	}

	get property(): ASTWrapper | null {
		return this.getField("property");
	}

	get computed(): boolean {
		return this.text.includes("[");
	}

	get optional(): boolean {
		return this.text.includes("?.");
	}
}

/**
 * Wrapper for binary expression nodes
 */
export class BinaryExpressionWrapper extends ASTWrapper<TypeScript.BinaryExpressionNode> {
	get left(): ASTWrapper | null {
		return this.getField("left");
	}

	get operator(): string {
		const operatorNode = this.children.find(
			(child) => !child.isNamed && child.text.match(/[+\-*/%=<>!&|^~]/),
		);
		return operatorNode?.text || "";
	}

	get right(): ASTWrapper | null {
		return this.getField("right");
	}
}

/**
 * Wrapper for arrow function nodes
 */
export class ArrowFunctionWrapper extends ASTWrapper<TypeScript.ArrowFunctionNode> {
	get parameters(): ASTWrapper[] {
		const parametersNode = this.findChildByType("formal_parameters");
		return parametersNode?.namedChildren || [];
	}

	get returnType(): ASTWrapper | null {
		return this.findChildByType("type_annotation");
	}

	get body(): ASTWrapper | null {
		return this.getField("body");
	}

	get isAsync(): boolean {
		return this.text.includes("async");
	}
}

/**
 * Wrapper for identifier nodes
 */
export class IdentifierWrapper extends ASTWrapper<TypeScript.IdentifierNode> {
	get name(): string {
		return this.text;
	}
}

/**
 * Wrapper for string literal nodes
 */
export class StringLiteralWrapper extends ASTWrapper<TypeScript.StringNode> {
	get value(): string {
		// Remove quotes and handle escape sequences
		const text = this.text;
		if (text.startsWith('"') && text.endsWith('"')) {
			return text.slice(1, -1);
		}
		if (text.startsWith("'") && text.endsWith("'")) {
			return text.slice(1, -1);
		}
		if (text.startsWith("`") && text.endsWith("`")) {
			return text.slice(1, -1);
		}
		return text;
	}

	get isTemplateLiteral(): boolean {
		return this.text.startsWith("`");
	}
}

/**
 * Wrapper for number literal nodes
 */
export class NumberLiteralWrapper extends ASTWrapper<TypeScript.NumberNode> {
	get value(): number {
		return parseFloat(this.text);
	}

	get isInteger(): boolean {
		return Number.isInteger(this.value);
	}

	get isFloat(): boolean {
		return !this.isInteger;
	}
}

/**
 * Root AST wrapper that provides the entry point for type-safe tree traversal
 */
export class TypeSafeAST {
	private readonly root: ASTWrapper;

	constructor(tree: TreeSitterTree) {
		this.root = ASTWrapper.wrap(tree.rootNode);
	}

	get rootNode(): ASTWrapper {
		return this.root;
	}

	get program(): ProgramWrapper | null {
		return this.root instanceof ProgramWrapper ? this.root : null;
	}

	/**
	 * Find all nodes of a specific type
	 */
	findAllNodesByType(type: string): ASTWrapper[] {
		const results: ASTWrapper[] = [];
		this.root.traverse((node) => {
			if (node.type === type) {
				results.push(node);
			}
			return true; // Continue traversal
		});
		return results;
	}

	/**
	 * Find all imports
	 */
	findAllImports(): ImportStatementWrapper[] {
		return this.findAllNodesByType(
			"import_statement",
		) as ImportStatementWrapper[];
	}

	/**
	 * Find all exports
	 */
	findAllExports(): ExportStatementWrapper[] {
		return this.findAllNodesByType(
			"export_statement",
		) as ExportStatementWrapper[];
	}

	/**
	 * Find all function declarations
	 */
	findAllFunctions(): FunctionDeclarationWrapper[] {
		return this.findAllNodesByType(
			"function_declaration",
		) as FunctionDeclarationWrapper[];
	}

	/**
	 * Find all class declarations
	 */
	findAllClasses(): ClassDeclarationWrapper[] {
		return this.findAllNodesByType(
			"class_declaration",
		) as ClassDeclarationWrapper[];
	}

	/**
	 * Find all interface declarations
	 */
	findAllInterfaces(): InterfaceDeclarationWrapper[] {
		return this.findAllNodesByType(
			"interface_declaration",
		) as InterfaceDeclarationWrapper[];
	}

	/**
	 * Convert to JSON representation
	 */
	toJSON(): any {
		return this.root.toJSON();
	}
}
