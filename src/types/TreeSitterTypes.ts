/**
 * TypeScript type definitions for Tree-sitter AST nodes
 * Provides type-safe wrappers for tree-sitter parsing
 */

// Base tree-sitter node interface
export interface TreeSitterPosition {
	readonly row: number;
	readonly column: number;
}

export interface TreeSitterPoint {
	readonly startPosition: TreeSitterPosition;
	readonly endPosition: TreeSitterPosition;
	readonly startIndex: number;
	readonly endIndex: number;
}

export interface TreeSitterNode extends TreeSitterPoint {
	readonly type: string;
	readonly text: string;
	readonly isNamed: boolean;
	readonly isMissing: boolean;
	readonly hasChanges: boolean;
	readonly hasError: boolean;
	readonly childCount: number;
	readonly namedChildCount: number;
	readonly firstChild: TreeSitterNode | null;
	readonly lastChild: TreeSitterNode | null;
	readonly firstNamedChild: TreeSitterNode | null;
	readonly lastNamedChild: TreeSitterNode | null;
	readonly nextSibling: TreeSitterNode | null;
	readonly nextNamedSibling: TreeSitterNode | null;
	readonly previousSibling: TreeSitterNode | null;
	readonly previousNamedSibling: TreeSitterNode | null;
	readonly parent: TreeSitterNode | null;

	child(index: number): TreeSitterNode | null;
	namedChild(index: number): TreeSitterNode | null;
	childForFieldName(fieldName: string): TreeSitterNode | null;
	children: TreeSitterNode[];
	namedChildren: TreeSitterNode[];
	descendantForIndex(index: number): TreeSitterNode;
	descendantForPosition(position: TreeSitterPosition): TreeSitterNode;
	walk(): TreeSitterTreeCursor;
	toString(): string;
}

export interface TreeSitterTreeCursor {
	readonly nodeType: string;
	readonly nodeText: string;
	readonly nodeIsNamed: boolean;
	readonly nodeIsMissing: boolean;
	readonly startPosition: TreeSitterPosition;
	readonly endPosition: TreeSitterPosition;
	readonly startIndex: number;
	readonly endIndex: number;
	readonly currentNode: TreeSitterNode;

	gotoFirstChild(): boolean;
	gotoNextSibling(): boolean;
	gotoParent(): boolean;
	gotoFirstChildForIndex(index: number): boolean;
}

export interface TreeSitterTree {
	readonly rootNode: TreeSitterNode;
	readonly language: TreeSitterLanguage;
	copy(): TreeSitterTree;
	edit(edit: TreeSitterInputEdit): void;
	getChangedRanges(other: TreeSitterTree): TreeSitterRange[];
	getIncludedRanges(): TreeSitterRange[];
	printDotGraph(): string;
}

export interface TreeSitterLanguage {
	readonly version: number;
	readonly fieldCount: number;
	readonly nodeTypeCount: number;
	fieldNameForId(fieldId: number): string | null;
	fieldIdForName(fieldName: string): number | null;
	nodeTypeForId(typeId: number): string | null;
	nodeTypeIdForName(typeName: string): number | null;
	nodeKindForId(kindId: number): string | null;
	nodeKindIdForName(kind: string): number | null;
	nodeKindIsNamed(kindId: number): boolean;
	nodeKindIsVisible(kindId: number): boolean;
}

export interface TreeSitterParser {
	parse(
		input: string | TreeSitterInput,
		oldTree?: TreeSitterTree,
	): TreeSitterTree | null;
	reset(): void;
	setLanguage(language: TreeSitterLanguage): void;
	getLanguage(): TreeSitterLanguage | null;
	setTimeoutMicros(timeoutMicros: number): void;
	getTimeoutMicros(): number;
}

export type TreeSitterInput = (
	startIndex: number,
	endIndex?: number,
) => string | null;

export interface TreeSitterInputEdit {
	startIndex: number;
	oldEndIndex: number;
	newEndIndex: number;
	startPosition: TreeSitterPosition;
	oldEndPosition: TreeSitterPosition;
	newEndPosition: TreeSitterPosition;
}

export interface TreeSitterRange {
	startIndex: number;
	endIndex: number;
	startPosition: TreeSitterPosition;
	endPosition: TreeSitterPosition;
}

// Language-specific node types
export namespace TypeScript {
	export type NodeType =
		| "program"
		| "source_file"
		| "function_declaration"
		| "class_declaration"
		| "interface_declaration"
		| "type_alias_declaration"
		| "enum_declaration"
		| "variable_declaration"
		| "import_statement"
		| "export_statement"
		| "expression_statement"
		| "if_statement"
		| "for_statement"
		| "while_statement"
		| "return_statement"
		| "try_statement"
		| "catch_clause"
		| "finally_clause"
		| "arrow_function"
		| "call_expression"
		| "member_expression"
		| "binary_expression"
		| "assignment_expression"
		| "ternary_expression"
		| "object_type"
		| "union_type"
		| "intersection_type"
		| "function_type"
		| "generic_type"
		| "type_parameters"
		| "type_parameter"
		| "type_annotation"
		| "jsx_element"
		| "jsx_self_closing_element"
		| "jsx_opening_element"
		| "jsx_closing_element"
		| "jsx_text"
		| "jsx_expression"
		| "jsx_attribute"
		| "identifier"
		| "string"
		| "number"
		| "boolean"
		| "null"
		| "undefined"
		| "comment"
		| "block_statement"
		| "class_body"
		| "parameter"
		| "variable_declarator"
		| "import_specifier"
		| "export_specifier"
		| "ERROR"
		| "MISSING";

	export interface TypedNode<T extends NodeType = NodeType>
		extends TreeSitterNode {
		readonly type: T;
	}

	// Specific node types with typed children
	export interface ProgramNode extends TypedNode<"program"> {
		readonly statements: StatementNode[];
	}

	export interface FunctionDeclarationNode
		extends TypedNode<"function_declaration"> {
		readonly name: IdentifierNode;
		readonly parameters: ParameterNode[];
		readonly returnType?: TypeAnnotationNode;
		readonly body: BlockStatementNode;
	}

	export interface ClassDeclarationNode extends TypedNode<"class_declaration"> {
		readonly name: IdentifierNode;
		readonly superClass?: ExpressionNode;
		readonly implements?: TypeNode[];
		readonly body: ClassBodyNode;
	}

	export interface InterfaceDeclarationNode
		extends TypedNode<"interface_declaration"> {
		readonly name: IdentifierNode;
		readonly extends?: TypeNode[];
		readonly body: ObjectTypeNode;
	}

	export interface VariableDeclarationNode
		extends TypedNode<"variable_declaration"> {
		readonly kind: "var" | "let" | "const";
		readonly declarations: VariableDeclaratorNode[];
	}

	export interface ImportStatementNode extends TypedNode<"import_statement"> {
		readonly source: StringNode;
		readonly specifiers: ImportSpecifierNode[];
	}

	export interface ExportStatementNode extends TypedNode<"export_statement"> {
		readonly declaration?: DeclarationNode;
		readonly specifiers?: ExportSpecifierNode[];
		readonly source?: StringNode;
	}

	// Expression nodes
	export interface CallExpressionNode extends TypedNode<"call_expression"> {
		readonly function: ExpressionNode;
		readonly arguments: ExpressionNode[];
		readonly typeArguments?: TypeNode[];
	}

	export interface MemberExpressionNode extends TypedNode<"member_expression"> {
		readonly object: ExpressionNode;
		readonly property: ExpressionNode;
		readonly computed: boolean;
	}

	export interface BinaryExpressionNode extends TypedNode<"binary_expression"> {
		readonly left: ExpressionNode;
		readonly operator: string;
		readonly right: ExpressionNode;
	}

	export interface ArrowFunctionNode extends TypedNode<"arrow_function"> {
		readonly parameters: ParameterNode[];
		readonly returnType?: TypeAnnotationNode;
		readonly body: ExpressionNode | BlockStatementNode;
	}

	// Type nodes
	export interface TypeAnnotationNode extends TypedNode<"type_annotation"> {
		readonly typeNode: TypeNode;
	}

	export interface UnionTypeNode extends TypedNode<"union_type"> {
		readonly types: TypeNode[];
	}

	export interface IntersectionTypeNode extends TypedNode<"intersection_type"> {
		readonly types: TypeNode[];
	}

	export interface FunctionTypeNode extends TypedNode<"function_type"> {
		readonly parameters: ParameterNode[];
		readonly returnType: TypeNode;
	}

	export interface GenericTypeNode extends TypedNode<"generic_type"> {
		readonly name: TypeNode;
		readonly typeArguments: TypeNode[];
	}

	// Utility types
	export interface IdentifierNode extends TypedNode<"identifier"> {
		readonly name: string;
	}

	export interface StringNode extends TypedNode<"string"> {
		readonly value: string;
	}

	export interface NumberNode extends TypedNode<"number"> {
		readonly value: number;
	}

	export interface BooleanNode extends TypedNode<"boolean"> {
		readonly value: boolean;
	}

	// Union types for common node categories
	export type StatementNode =
		| FunctionDeclarationNode
		| ClassDeclarationNode
		| InterfaceDeclarationNode
		| VariableDeclarationNode
		| ImportStatementNode
		| ExportStatementNode
		| ExpressionStatementNode
		| IfStatementNode
		| ForStatementNode
		| WhileStatementNode
		| ReturnStatementNode
		| TryStatementNode;

	export type ExpressionNode =
		| CallExpressionNode
		| MemberExpressionNode
		| BinaryExpressionNode
		| ArrowFunctionNode
		| IdentifierNode
		| StringNode
		| NumberNode
		| BooleanNode;

	export type DeclarationNode =
		| FunctionDeclarationNode
		| ClassDeclarationNode
		| InterfaceDeclarationNode
		| VariableDeclarationNode;

	export type TypeNode =
		| IdentifierNode
		| UnionTypeNode
		| IntersectionTypeNode
		| FunctionTypeNode
		| GenericTypeNode
		| ObjectTypeNode;

	// Additional node types (placeholders for completeness)
	export type ExpressionStatementNode = TypedNode<"expression_statement">;
	export type IfStatementNode = TypedNode<"if_statement">;
	export type ForStatementNode = TypedNode<"for_statement">;
	export type WhileStatementNode = TypedNode<"while_statement">;
	export type ReturnStatementNode = TypedNode<"return_statement">;
	export type TryStatementNode = TypedNode<"try_statement">;
	export type BlockStatementNode = TypedNode<"block_statement">;
	export type ClassBodyNode = TypedNode<"class_body">;
	export type ObjectTypeNode = TypedNode<"object_type">;
	export type ParameterNode = TypedNode<"parameter">;
	export type VariableDeclaratorNode = TypedNode<"variable_declarator">;
	export type ImportSpecifierNode = TypedNode<"import_specifier">;
	export type ExportSpecifierNode = TypedNode<"export_specifier">;
}

// Type guards for node type checking
export function isTypedNode<T extends TypeScript.NodeType>(
	node: TreeSitterNode,
	type: T,
): node is TypeScript.TypedNode<T> {
	return node.type === type;
}

export function isStatementNode(
	node: TreeSitterNode,
): node is TypeScript.StatementNode {
	const statementTypes = [
		"function_declaration",
		"class_declaration",
		"interface_declaration",
		"variable_declaration",
		"import_statement",
		"export_statement",
		"expression_statement",
		"if_statement",
		"for_statement",
		"while_statement",
		"return_statement",
		"try_statement",
	];
	return statementTypes.includes(node.type);
}

export function isExpressionNode(
	node: TreeSitterNode,
): node is TypeScript.ExpressionNode {
	const expressionTypes = [
		"call_expression",
		"member_expression",
		"binary_expression",
		"arrow_function",
		"identifier",
		"string",
		"number",
		"boolean",
	];
	return expressionTypes.includes(node.type);
}

export function isDeclarationNode(
	node: TreeSitterNode,
): node is TypeScript.DeclarationNode {
	const declarationTypes = [
		"function_declaration",
		"class_declaration",
		"interface_declaration",
		"variable_declaration",
	];
	return declarationTypes.includes(node.type);
}

export function isTypeNode(node: TreeSitterNode): node is TypeScript.TypeNode {
	const typeNodeTypes = [
		"identifier",
		"union_type",
		"intersection_type",
		"function_type",
		"generic_type",
		"object_type",
	];
	return typeNodeTypes.includes(node.type);
}
