/**
 * Symbol-level type definitions for fine-grained dependency tracking
 *
 * Provides types for extracting and managing symbols (classes, functions, methods)
 * from source code for detailed dependency analysis and context generation.
 */

import type { SupportedLanguage } from "./types";

/**
 * Symbol kind enumeration
 * Based on LSP SymbolKind but simplified for our use case
 */
export enum SymbolKind {
	Class = "class",
	Interface = "interface",
	Function = "function",
	Method = "method",
	Property = "property",
	Field = "field",
	Variable = "variable",
	Constant = "constant",
	Type = "type",
	Enum = "enum",
	EnumMember = "enum-member",
	Constructor = "constructor",
}

/**
 * Source code location information
 */
export interface SourceLocation {
	/** Starting line number (1-indexed) */
	startLine: number;
	/** Ending line number (1-indexed) */
	endLine: number;
	/** Starting column number (0-indexed) */
	startColumn: number;
	/** Ending column number (0-indexed) */
	endColumn: number;
}

/**
 * Parameter information for functions/methods
 */
export interface ParameterInfo {
	/** Parameter name */
	name: string;
	/** Type annotation (if available) */
	type?: string;
	/** Whether parameter is optional */
	optional?: boolean;
	/** Default value (if any) */
	defaultValue?: string;
}

/**
 * Complete symbol information extracted from AST
 */
export interface SymbolInfo {
	/** Symbol name (e.g., "MyClass", "calculateTotal") */
	name: string;

	/** Symbol kind */
	kind: SymbolKind;

	/** File path relative to project root */
	filePath: string;

	/**
	 * Symbol name path (Serena-compatible format)
	 * Examples:
	 * - Top-level class: "/MyClass"
	 * - Method: "/MyClass/myMethod"
	 * - Nested class: "/OuterClass/InnerClass"
	 * - Top-level function: "/myFunction"
	 */
	namePath: string;

	/** Source location */
	location: SourceLocation;

	/** Programming language */
	language: SupportedLanguage;

	/** Full signature (for functions/methods) */
	signature?: string;

	/** Parent symbol name path (for methods, nested classes) */
	parentSymbol?: string;

	/** Type parameters (for generics) */
	typeParameters?: string[];

	/** Return type (for functions/methods) */
	returnType?: string;

	/** Parameters (for functions/methods) */
	parameters?: ParameterInfo[];

	/** Access modifier */
	visibility?: "public" | "private" | "protected" | "internal";

	/** Whether symbol is static */
	isStatic?: boolean;

	/** Whether symbol is async */
	isAsync?: boolean;

	/** Whether symbol is abstract */
	isAbstract?: boolean;

	/** Whether symbol is exported */
	isExported?: boolean;

	/** JSDoc/docstring comment */
	documentation?: string;

	/** Raw AST node text */
	text?: string;
}

/**
 * Symbol dependency type enumeration
 */
export enum SymbolDependencyType {
	/** Function/method call */
	Call = "call",

	/** Class instantiation (new keyword) */
	Instantiation = "instantiation",

	/** Property/field access */
	PropertyAccess = "property-access",

	/** Type reference (in type annotations) */
	TypeReference = "type-reference",

	/** Class inheritance (extends) */
	Extends = "extends",

	/** Interface implementation */
	Implements = "implements",

	/** Import statement */
	Import = "import",

	/** Generic type parameter */
	TypeParameter = "type-parameter",
}

/**
 * Symbol dependency relationship
 */
export interface SymbolDependency {
	/** Source symbol name path */
	from: string;

	/** Target symbol name path */
	to: string;

	/** Dependency type */
	type: SymbolDependencyType;

	/** Location where dependency occurs */
	location: {
		line: number;
		column: number;
	};

	/** Context (e.g., the line of code where dependency occurs) */
	context?: string;

	/** Target file path (for cross-file dependencies) */
	targetFile?: string;
}

/**
 * Symbol extraction result containing symbols and their dependencies
 */
export interface SymbolExtractionResult {
	/** File path */
	filePath: string;

	/** Extracted symbols */
	symbols: SymbolInfo[];

	/** Symbol dependencies */
	dependencies: SymbolDependency[];

	/** Programming language */
	language: SupportedLanguage;

	/** Extraction timestamp */
	timestamp: Date;
}

/**
 * Symbol query filter options
 */
export interface SymbolQueryOptions {
	/** Filter by symbol kinds */
	kinds?: SymbolKind[];

	/** Filter by visibility */
	visibility?: ("public" | "private" | "protected" | "internal")[];

	/** Include only exported symbols */
	exportedOnly?: boolean;

	/** Include nested symbols (e.g., methods inside classes) */
	includeNested?: boolean;

	/** Maximum nesting depth */
	maxDepth?: number;
}

/**
 * Check if a symbol is a container (can have nested symbols)
 */
export function isContainerSymbol(kind: SymbolKind): boolean {
	return kind === SymbolKind.Class || kind === SymbolKind.Interface;
}

/**
 * Check if a symbol is callable (function or method)
 */
export function isCallableSymbol(kind: SymbolKind): boolean {
	return (
		kind === SymbolKind.Function ||
		kind === SymbolKind.Method ||
		kind === SymbolKind.Constructor
	);
}

/**
 * Generate a symbol name path from file path and symbol hierarchy
 *
 * @param symbols - Array of symbol names from outermost to innermost
 * @returns Serena-compatible name path (e.g., "/OuterClass/InnerClass/method")
 */
export function generateSymbolNamePath(symbols: string[]): string {
	return `/${symbols.join("/")}`;
}

/**
 * Parse a symbol name path into components
 *
 * @param namePath - Symbol name path (e.g., "/MyClass/myMethod")
 * @returns Array of symbol names
 */
export function parseSymbolNamePath(namePath: string): string[] {
	return namePath.split("/").filter((s) => s.length > 0);
}

/**
 * Get parent symbol name path
 *
 * @param namePath - Symbol name path
 * @returns Parent name path, or null if top-level
 */
export function getParentSymbolPath(namePath: string): string | null {
	const parts = parseSymbolNamePath(namePath);
	if (parts.length <= 1) {
		return null;
	}
	return generateSymbolNamePath(parts.slice(0, -1));
}

/**
 * Get symbol name from name path
 *
 * @param namePath - Symbol name path
 * @returns Symbol name (last component)
 */
export function getSymbolName(namePath: string): string {
	const parts = parseSymbolNamePath(namePath);
	return parts[parts.length - 1] || "";
}
