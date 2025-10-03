/**
 * Symbol Extractor
 *
 * Extracts symbols (classes, functions, methods) from source code files
 * using tree-sitter queries for detailed dependency analysis.
 */

import fs from "node:fs";
import path from "node:path";
import Parser from "tree-sitter";
import type { ParseResult } from "../parsers/base";
import { globalParserManager } from "../parsers/ParserManager";
import { globalTreeSitterQueryEngine } from "./TreeSitterQueryEngine";
import type { QueryMatch, SupportedLanguage } from "./types";
import {
	type ParameterInfo,
	type SourceLocation,
	type SymbolDependency,
	type SymbolDependencyType,
	type SymbolExtractionResult,
	type SymbolInfo,
	SymbolKind,
	generateSymbolNamePath,
	getParentSymbolPath,
} from "./symbol-types";

/**
 * Symbol Extractor Configuration
 */
export interface SymbolExtractorConfig {
	/** Project root directory */
	projectRoot: string;

	/** Include nested symbols (methods inside classes) */
	includeNested?: boolean;

	/** Maximum nesting depth */
	maxDepth?: number;

	/** Extract documentation comments */
	extractDocs?: boolean;
}

/**
 * Symbol Extractor
 * Extracts symbols from source code files using AST queries
 */
export class SymbolExtractor {
	private config: Required<SymbolExtractorConfig>;

	constructor(config: SymbolExtractorConfig) {
		this.config = {
			projectRoot: config.projectRoot,
			includeNested: config.includeNested ?? true,
			maxDepth: config.maxDepth ?? 10,
			extractDocs: config.extractDocs ?? true,
		};
	}

	/**
	 * Extract symbols from a file
	 *
	 * @param filePath - Absolute file path
	 * @param language - Programming language (optional, will detect from extension)
	 * @param sourceCode - Source code content (optional, will read from file if not provided)
	 * @returns Symbol extraction result
	 */
	async extractFromFile(
		filePath: string,
		language?: SupportedLanguage,
		sourceCode?: string,
	): Promise<SymbolExtractionResult> {
		// Read source code if not provided
		const content =
			sourceCode ?? (await fs.promises.readFile(filePath, "utf-8"));
		const relativePath = path.relative(this.config.projectRoot, filePath);

		// Parse the file to get AST
		const parseResult = await globalParserManager.analyzeFile(
			content,
			language || this.detectLanguage(filePath),
			relativePath,
		);

		return this.extractFromParseResult(parseResult, relativePath);
	}

	/**
	 * Extract symbols from a ParseResult
	 *
	 * @param parseResult - Parse result from parser
	 * @param filePath - Relative file path (optional, will use from parseResult if not provided)
	 * @returns Symbol extraction result
	 */
	async extractFromParseResult(
		parseResult: ParseResult,
		filePath?: string,
	): Promise<SymbolExtractionResult> {
		const relativePath = filePath || parseResult.metadata.filePath || "";
		const language = parseResult.metadata.language;

		const symbols = await this.extractSymbols(
			relativePath,
			parseResult,
			language,
		);
		const dependencies = await this.extractDependencies(
			symbols,
			parseResult,
			language,
		);

		return {
			filePath: relativePath,
			symbols,
			dependencies,
			language,
			timestamp: new Date(),
		};
	}

	/**
	 * Detect language from file extension
	 */
	private detectLanguage(filePath: string): SupportedLanguage {
		const ext = path.extname(filePath).toLowerCase();
		switch (ext) {
			case ".ts":
				return "typescript";
			case ".tsx":
				return "tsx";
			case ".js":
			case ".mjs":
			case ".cjs":
				return "javascript";
			case ".jsx":
				return "jsx";
			case ".py":
				return "python";
			case ".java":
				return "java";
			case ".go":
				return "go";
			default:
				return "unknown";
		}
	}

	/**
	 * Extract symbols from parse result
	 */
	private async extractSymbols(
		filePath: string,
		parseResult: ParseResult,
		language: SupportedLanguage,
	): Promise<SymbolInfo[]> {
		const symbols: SymbolInfo[] = [];

		// Extract based on language
		switch (language) {
			case "typescript":
			case "tsx":
				symbols.push(
					...(await this.extractTypeScriptSymbols(filePath, parseResult)),
				);
				break;
			case "javascript":
			case "jsx":
				symbols.push(
					...(await this.extractJavaScriptSymbols(filePath, parseResult)),
				);
				break;
			case "python":
				symbols.push(...(await this.extractPythonSymbols(filePath, parseResult)));
				break;
			case "java":
				symbols.push(...(await this.extractJavaSymbols(filePath, parseResult)));
				break;
			default:
				// Unsupported language
				break;
		}

		return symbols;
	}

	/**
	 * Extract TypeScript symbols
	 */
	private async extractTypeScriptSymbols(
		filePath: string,
		parseResult: ParseResult,
	): Promise<SymbolInfo[]> {
		const symbols: SymbolInfo[] = [];
		const tree = parseResult.tree;
		const language = parseResult.metadata.language;

		// Extract classes
		const classMatches = globalTreeSitterQueryEngine.executeQuery(
			"ts-class-definitions",
			`(class_declaration
				name: (type_identifier) @class_name
				type_parameters: (type_parameters)? @type_params
				(class_heritage)? @heritage
				body: (class_body) @class_body) @class`,
			tree,
			language,
		);

		for (const match of classMatches) {
			const symbol = this.matchToSymbolInfo(
				match,
				SymbolKind.Class,
				filePath,
				language,
			);
			if (symbol) {
				symbols.push(symbol);

				// Extract methods and properties within this class
				if (this.config.includeNested) {
					const nestedSymbols = await this.extractClassMembers(
						match,
						symbol.namePath,
						filePath,
						tree,
						language,
					);
					symbols.push(...nestedSymbols);
				}
			}
		}

		// Extract interfaces
		const interfaceMatches = globalTreeSitterQueryEngine.executeQuery(
			"ts-interface-definitions",
			`(interface_declaration
				name: (type_identifier) @interface_name
				type_parameters: (type_parameters)? @type_params
				body: (interface_body) @interface_body) @interface`,
			tree,
			language,
		);

		for (const match of interfaceMatches) {
			const symbol = this.matchToSymbolInfo(
				match,
				SymbolKind.Interface,
				filePath,
				language,
			);
			if (symbol) {
				symbols.push(symbol);
			}
		}

		// Extract top-level functions
		const functionMatches = globalTreeSitterQueryEngine.executeQuery(
			"ts-function-definitions",
			`(function_declaration
				name: (identifier) @function_name
				type_parameters: (type_parameters)? @type_params
				parameters: (formal_parameters) @params
				return_type: (type_annotation)? @return_type
				body: (statement_block) @function_body) @function`,
			tree,
			language,
		);

		for (const match of functionMatches) {
			const symbol = this.matchToSymbolInfo(
				match,
				SymbolKind.Function,
				filePath,
				language,
			);
			if (symbol) {
				symbols.push(symbol);
			}
		}

		// Extract type aliases
		const typeMatches = globalTreeSitterQueryEngine.executeQuery(
			"ts-type-definitions",
			`(type_alias_declaration
				name: (type_identifier) @type_name
				type_parameters: (type_parameters)? @type_params
				value: (_) @type_value) @type_def`,
			tree,
			language,
		);

		for (const match of typeMatches) {
			const symbol = this.matchToSymbolInfo(
				match,
				SymbolKind.Type,
				filePath,
				language,
			);
			if (symbol) {
				symbols.push(symbol);
			}
		}

		// Extract enums
		const enumMatches = globalTreeSitterQueryEngine.executeQuery(
			"ts-enum-definitions",
			`(enum_declaration
				name: (identifier) @enum_name
				body: (enum_body) @enum_body) @enum`,
			tree,
			language,
		);

		for (const match of enumMatches) {
			const symbol = this.matchToSymbolInfo(
				match,
				SymbolKind.Enum,
				filePath,
				language,
			);
			if (symbol) {
				symbols.push(symbol);
			}
		}

		// Extract arrow functions (exported const functions)
		const arrowFunctionMatches = globalTreeSitterQueryEngine.executeQuery(
			"ts-arrow-function-definitions",
			`(lexical_declaration
				(variable_declarator
					name: (identifier) @function_name
					value: (arrow_function
						parameters: (_) @params
						return_type: (type_annotation)? @return_type
						body: (_) @function_body))) @arrow_function`,
			tree,
			language,
		);

		for (const match of arrowFunctionMatches) {
			const symbol = this.matchToSymbolInfo(
				match,
				SymbolKind.Function,
				filePath,
				language,
			);
			if (symbol) {
				symbols.push(symbol);
			}
		}

		return symbols;
	}

	/**
	 * Extract class members (methods and properties)
	 */
	private async extractClassMembers(
		classMatch: QueryMatch,
		parentNamePath: string,
		filePath: string,
		tree: Parser.Tree,
		language: SupportedLanguage,
	): Promise<SymbolInfo[]> {
		const members: SymbolInfo[] = [];

		// Find class body node
		const classBodyCapture = classMatch.captures.find(
			(c: { name: string }) => c.name === "class_body",
		);

		if (!classBodyCapture) {
			return members;
		}

		const classBodyNode = classBodyCapture.node;

		// Extract methods from class body
		const methodQuery = `
			(method_definition
				name: [
					(property_identifier) @method_name
					(computed_property_name) @computed_name
				]
				parameters: (formal_parameters) @params
				return_type: (type_annotation)? @return_type
				body: (statement_block) @method_body) @method
		`;

		// Execute query on class body node subtree
		const methodMatches = this.executeQueryOnNode(
			classBodyNode,
			methodQuery,
			language,
		);

		for (const match of methodMatches) {
			const symbol = this.matchToSymbolInfo(
				match,
				SymbolKind.Method,
				filePath,
				language,
				parentNamePath,
			);
			if (symbol) {
				members.push(symbol);
			}
		}

		// Extract properties
		const propertyQuery = `
			(public_field_definition
				name: (property_identifier) @property_name
				type: (type_annotation)? @property_type
				value: (_)? @property_value) @property
		`;

		const propertyMatches = this.executeQueryOnNode(
			classBodyNode,
			propertyQuery,
			language,
		);

		for (const match of propertyMatches) {
			const symbol = this.matchToSymbolInfo(
				match,
				SymbolKind.Property,
				filePath,
				language,
				parentNamePath,
			);
			if (symbol) {
				members.push(symbol);
			}
		}

		return members;
	}

	/**
	 * Execute query on a specific node (for extracting nested symbols)
	 */
	private executeQueryOnNode(
		node: Parser.SyntaxNode,
		queryString: string,
		language: SupportedLanguage,
	): QueryMatch[] {
		try {
			const parser = globalParserManager["getParser"](language);
			const parserInstance = parser.getParser();
			const parserLanguage = parserInstance.getLanguage();
			const query = new Parser.Query(parserLanguage, queryString);

			// Use query.matches() to get properly grouped matches
			const matches = query.matches(node);

			if (matches.length === 0) {
				return [];
			}

			// Convert tree-sitter matches to QueryMatch format
			return matches.map((match) => ({
				queryName: "nested-query",
				captures: match.captures.map((c) => ({
					name: c.name,
					node: c.node,
				})),
			}));
		} catch (error) {
			console.warn(`Query execution failed on node:`, error);
			return [];
		}
	}

	/**
	 * Extract JavaScript symbols
	 */
	private async extractJavaScriptSymbols(
		filePath: string,
		parseResult: ParseResult,
	): Promise<SymbolInfo[]> {
		// JavaScript uses similar queries to TypeScript (excluding type-specific symbols)
		return this.extractTypeScriptSymbols(filePath, parseResult);
	}

	/**
	 * Extract Python symbols
	 */
	private async extractPythonSymbols(
		filePath: string,
		parseResult: ParseResult,
	): Promise<SymbolInfo[]> {
		const symbols: SymbolInfo[] = [];

		// TODO: Implement using QueryEngine with python-function-definitions, python-class-definitions, etc.
		// Similar structure to TypeScript extraction

		return symbols;
	}

	/**
	 * Extract Java symbols
	 */
	private async extractJavaSymbols(
		filePath: string,
		parseResult: ParseResult,
	): Promise<SymbolInfo[]> {
		const symbols: SymbolInfo[] = [];

		// TODO: Implement using QueryEngine with java-class-declarations, java-method-declarations, etc.
		// Similar structure to TypeScript extraction

		return symbols;
	}

	/**
	 * Extract symbol dependencies
	 */
	private async extractDependencies(
		symbols: SymbolInfo[],
		parseResult: ParseResult,
		language: SupportedLanguage,
	): Promise<SymbolDependency[]> {
		const dependencies: SymbolDependency[] = [];

		// TODO: Implement dependency extraction
		// - Method calls
		// - Class instantiations
		// - Property accesses
		// - Type references
		// - Inheritance relationships

		return dependencies;
	}

	/**
	 * Convert QueryMatch to SymbolInfo
	 */
	private matchToSymbolInfo(
		match: QueryMatch,
		kind: SymbolKind,
		filePath: string,
		language: SupportedLanguage,
		parentPath?: string,
	): SymbolInfo | null {
		// Extract name from captures
		const nameCapture = match.captures.find(
			(c: { name: string }) =>
				c.name === "class_name" ||
				c.name === "function_name" ||
				c.name === "method_name" ||
				c.name === "interface_name" ||
				c.name === "type_name" ||
				c.name === "enum_name" ||
				c.name === "var_name" ||
				c.name === "property_name",
		);

		if (!nameCapture) {
			return null;
		}

		const symbolName = nameCapture.node.text;
		const namePath = parentPath
			? `${parentPath}/${symbolName}`
			: generateSymbolNamePath([symbolName]);

		// Use the first capture node for location (usually the root match)
		const rootNode = match.captures[0]?.node || nameCapture.node;

		const location: SourceLocation = {
			startLine: rootNode.startPosition.row + 1,
			endLine: rootNode.endPosition.row + 1,
			startColumn: rootNode.startPosition.column,
			endColumn: rootNode.endPosition.column,
		};

		const symbol: SymbolInfo = {
			name: symbolName,
			kind,
			filePath,
			namePath,
			location,
			language,
			parentSymbol: parentPath,
		};

		// Extract additional information
		this.enrichSymbolInfo(symbol, match);

		return symbol;
	}

	/**
	 * Enrich symbol info with additional data from QueryMatch
	 */
	private enrichSymbolInfo(symbol: SymbolInfo, match: QueryMatch): void {
		// Extract parameters
		const paramsCapture = match.captures.find(
			(c: { name: string }) => c.name === "params",
		);
		if (paramsCapture) {
			symbol.parameters = this.extractParameters(paramsCapture.node.text);
		}

		// Extract return type
		const returnTypeCapture = match.captures.find(
			(c: { name: string }) => c.name === "return_type",
		);
		if (returnTypeCapture) {
			symbol.returnType = returnTypeCapture.node.text.replace(/^:\s*/, "");
		}

		// Extract type parameters
		const typeParamsCapture = match.captures.find(
			(c: { name: string }) => c.name === "type_params",
		);
		if (typeParamsCapture) {
			symbol.typeParameters = this.extractTypeParameters(
				typeParamsCapture.node.text,
			);
		}

		// Generate signature for callable symbols
		if (
			symbol.kind === SymbolKind.Function ||
			symbol.kind === SymbolKind.Method
		) {
			symbol.signature = this.generateSignature(symbol);
		}

		// Extract full text from the first capture (root node)
		if (match.captures.length > 0) {
			symbol.text = match.captures[0].node.text;
		}
	}

	/**
	 * Extract parameters from parameter list string
	 */
	private extractParameters(paramsText: string): ParameterInfo[] {
		// Simple extraction - can be enhanced with proper parsing
		const params: ParameterInfo[] = [];

		// Remove parentheses
		const cleaned = paramsText.replace(/^\(|\)$/g, "").trim();

		if (!cleaned) {
			return params;
		}

		// Split by comma (naive approach, doesn't handle nested structures)
		const parts = cleaned.split(",");

		for (const part of parts) {
			const trimmed = part.trim();
			if (!trimmed) continue;

			// Parse "name: type = default" or "name: type" or "name"
			const match = trimmed.match(/^(\w+)(?::\s*([^=]+))?(?:\s*=\s*(.+))?$/);

			if (match) {
				params.push({
					name: match[1],
					type: match[2]?.trim(),
					optional: !!match[3] || trimmed.includes("?"),
					defaultValue: match[3]?.trim(),
				});
			}
		}

		return params;
	}

	/**
	 * Extract type parameters from type parameter list
	 */
	private extractTypeParameters(typeParamsText: string): string[] {
		// Remove angle brackets and split
		const cleaned = typeParamsText.replace(/^<|>$/g, "").trim();

		if (!cleaned) {
			return [];
		}

		// Simple split by comma
		return cleaned.split(",").map((t) => t.trim());
	}

	/**
	 * Generate function/method signature
	 */
	private generateSignature(symbol: SymbolInfo): string {
		const typeParams = symbol.typeParameters?.length
			? `<${symbol.typeParameters.join(", ")}>`
			: "";

		const params = symbol.parameters
			? symbol.parameters
					.map((p) => {
						let param = p.name;
						if (p.type) param += `: ${p.type}`;
						if (p.defaultValue) param += ` = ${p.defaultValue}`;
						return param;
					})
					.join(", ")
			: "";

		const returnType = symbol.returnType ? `: ${symbol.returnType}` : "";

		return `${symbol.name}${typeParams}(${params})${returnType}`;
	}
}

/**
 * Create a symbol extractor instance
 */
export function createSymbolExtractor(
	config: SymbolExtractorConfig,
): SymbolExtractor {
	return new SymbolExtractor(config);
}
