/**
 * Symbol Extractor
 *
 * Extracts symbols (classes, functions, methods) from source code files
 * using tree-sitter queries for detailed dependency analysis.
 */

import fs from "node:fs";
import path from "node:path";
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
	 * @param language - Programming language
	 * @param sourceCode - Source code content (optional, will read from file if not provided)
	 * @returns Symbol extraction result
	 */
	async extractFromFile(
		filePath: string,
		language: SupportedLanguage,
		sourceCode?: string,
	): Promise<SymbolExtractionResult> {
		const content =
			sourceCode ?? (await fs.promises.readFile(filePath, "utf-8"));
		const relativePath = path.relative(this.config.projectRoot, filePath);

		const symbols = await this.extractSymbols(
			relativePath,
			content,
			language,
		);
		const dependencies = await this.extractDependencies(
			symbols,
			content,
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
	 * Extract symbols from source code
	 */
	private async extractSymbols(
		filePath: string,
		content: string,
		language: SupportedLanguage,
	): Promise<SymbolInfo[]> {
		const symbols: SymbolInfo[] = [];

		// Extract based on language
		switch (language) {
			case "typescript":
			case "tsx":
				symbols.push(...(await this.extractTypeScriptSymbols(filePath, content)));
				break;
			case "javascript":
			case "jsx":
				symbols.push(...(await this.extractJavaScriptSymbols(filePath, content)));
				break;
			case "python":
				symbols.push(...(await this.extractPythonSymbols(filePath, content)));
				break;
			case "java":
				symbols.push(...(await this.extractJavaSymbols(filePath, content)));
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
		content: string,
	): Promise<SymbolInfo[]> {
		const symbols: SymbolInfo[] = [];

		// TODO: Implement using QueryEngine with ts-class-definitions, ts-function-definitions, etc.
		// For now, return empty array
		// This will be implemented after integrating with QueryEngine

		return symbols;
	}

	/**
	 * Extract JavaScript symbols
	 */
	private async extractJavaScriptSymbols(
		filePath: string,
		content: string,
	): Promise<SymbolInfo[]> {
		// JavaScript uses similar queries to TypeScript
		return this.extractTypeScriptSymbols(filePath, content);
	}

	/**
	 * Extract Python symbols
	 */
	private async extractPythonSymbols(
		filePath: string,
		content: string,
	): Promise<SymbolInfo[]> {
		const symbols: SymbolInfo[] = [];

		// TODO: Implement using QueryEngine with python-function-definitions, python-class-definitions, etc.

		return symbols;
	}

	/**
	 * Extract Java symbols
	 */
	private async extractJavaSymbols(
		filePath: string,
		content: string,
	): Promise<SymbolInfo[]> {
		const symbols: SymbolInfo[] = [];

		// TODO: Implement using QueryEngine with java-class-declarations, java-method-declarations, etc.

		return symbols;
	}

	/**
	 * Extract symbol dependencies
	 */
	private async extractDependencies(
		symbols: SymbolInfo[],
		content: string,
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
