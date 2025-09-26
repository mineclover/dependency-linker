/**
 * Language Parser Contract
 * Interface for multi-language AST parsing support
 */

import { Parser } from "tree-sitter";

export interface ILanguageParser {
	/**
	 * Programming language identifier (e.g., 'typescript', 'go', 'java')
	 */
	readonly name: string;

	/**
	 * Parser version for compatibility tracking
	 */
	readonly version: string;

	/**
	 * File extensions this parser supports
	 */
	readonly extensions: string[];

	/**
	 * Tree-sitter language grammar
	 */
	readonly language: Parser.Language;

	/**
	 * Parse source code and return AST
	 * @param source Source code to parse
	 * @param options Parsing options
	 */
	parse(source: string, options?: ParseOptions): Parser.Tree;

	/**
	 * Parse source code from file
	 * @param filePath Path to source file
	 * @param options Parsing options
	 */
	parseFile(filePath: string, options?: ParseOptions): Promise<Parser.Tree>;

	/**
	 * Validate if this parser supports the given file
	 * @param filePath File path to check
	 */
	supportsFile(filePath: string): boolean;

	/**
	 * Get language-specific parsing configuration
	 */
	getConfig(): LanguageConfig;

	/**
	 * Initialize parser with specific settings
	 * @param config Language-specific configuration
	 */
	initialize(config?: LanguageConfig): void;

	/**
	 * Cleanup parser resources
	 */
	dispose(): void;
}

export interface ParseOptions {
	timeout?: number;
	includeComments?: boolean;
	preserveWhitespace?: boolean;
	errorRecovery?: boolean;
}

export interface LanguageConfig {
	features: LanguageFeatures;
	syntaxRules: SyntaxRules;
	optimization: OptimizationSettings;
}

export interface LanguageFeatures {
	supportsTypeAnnotations: boolean;
	supportsGenerics: boolean;
	supportsModules: boolean;
	supportsClasses: boolean;
	supportsInterfaces: boolean;
	supportsDecorators: boolean;
	supportsAsyncAwait: boolean;
}

export interface SyntaxRules {
	commentStyle: "line" | "block" | "both";
	stringDelimiters: string[];
	statementTerminator: string;
	blockDelimiters: { open: string; close: string };
	keywordStyle: "reserved" | "contextual";
}

export interface OptimizationSettings {
	lazyParsing: boolean;
	incrementalParsing: boolean;
	memoryLimit?: number;
	parseTimeout?: number;
}

/**
 * Registry for managing multiple language parsers
 */
export interface IParserRegistry {
	/**
	 * Register a new language parser
	 * @param parser Language parser to register
	 */
	register(parser: ILanguageParser): void;

	/**
	 * Unregister a language parser
	 * @param name Parser name to remove
	 */
	unregister(name: string): void;

	/**
	 * Get parser for specific language
	 * @param language Language identifier
	 */
	getParser(language: string): ILanguageParser | null;

	/**
	 * Get parser for file extension
	 * @param extension File extension (with dot)
	 */
	getParserByExtension(extension: string): ILanguageParser | null;

	/**
	 * Detect language from file path
	 * @param filePath Path to analyze
	 */
	detectLanguage(filePath: string): string | null;

	/**
	 * Get all registered parsers
	 */
	getAllParsers(): ILanguageParser[];

	/**
	 * Get all supported extensions
	 */
	getSupportedExtensions(): string[];

	/**
	 * Check if language is supported
	 * @param language Language identifier to check
	 */
	isLanguageSupported(language: string): boolean;

	/**
	 * Get registry statistics
	 */
	getStats(): RegistryStats;
}

export interface RegistryStats {
	registeredParsers: number;
	supportedLanguages: string[];
	supportedExtensions: string[];
	totalParseOperations: number;
	averageParseTime: number;
}

/**
 * Built-in language parser implementations
 */

export interface TypeScriptParser extends ILanguageParser {
	readonly name: "typescript";
	readonly extensions: [".ts", ".tsx", ".d.ts"];
}

export interface JavaScriptParser extends ILanguageParser {
	readonly name: "javascript";
	readonly extensions: [".js", ".jsx", ".mjs", ".cjs"];
}

export interface GoParser extends ILanguageParser {
	readonly name: "go";
	readonly extensions: [".go"];
}

export interface JavaParser extends ILanguageParser {
	readonly name: "java";
	readonly extensions: [".java"];
}

export interface PythonParser extends ILanguageParser {
	readonly name: "python";
	readonly extensions: [".py", ".pyi", ".pyx"];
}

export interface CSharpParser extends ILanguageParser {
	readonly name: "csharp";
	readonly extensions: [".cs", ".csx"];
}

export interface RustParser extends ILanguageParser {
	readonly name: "rust";
	readonly extensions: [".rs"];
}
