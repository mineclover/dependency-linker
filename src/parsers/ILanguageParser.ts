/**
 * Interface for language-specific parsers
 * Handles AST generation and syntax validation for different programming languages
 */

export interface ILanguageParser {
	/**
	 * Parses a file and returns AST with metadata
	 * @param filePath Path to the file to parse
	 * @param content Optional file content (if not provided, reads from filePath)
	 * @returns Promise resolving to parse result
	 */
	parse(filePath: string, content?: string): Promise<ParseResult>;

	/**
	 * Checks if this parser supports the given language
	 * @param language Language identifier (e.g., 'typescript', 'javascript', 'go')
	 * @returns True if language is supported
	 */
	supports(language: string): boolean;

	/**
	 * Detects the language from file path and/or content
	 * @param filePath File path for extension-based detection
	 * @param content Optional file content for content-based detection
	 * @returns Detected language identifier
	 */
	detectLanguage(filePath: string, content?: string): string;

	/**
	 * Gets the underlying grammar/parser instance
	 * @returns The tree-sitter grammar or parser instance
	 */
	getGrammar(): any;

	/**
	 * Validates syntax without full parsing
	 * @param content Source code content to validate
	 * @returns Syntax validation result
	 */
	validateSyntax(content: string): SyntaxValidationResult;

	/**
	 * Gets parser metadata
	 * @returns Parser information
	 */
	getMetadata(): ParserMetadata;

	/**
	 * Configures the parser with options
	 * @param options Parser-specific configuration options
	 */
	configure(options: ParserOptions): void;

	/**
	 * Gets the current parser configuration
	 * @returns Current parser options
	 */
	getConfiguration(): ParserOptions;

	/**
	 * Cleans up parser resources
	 */
	dispose(): void;
}

export interface ParseResult {
	/** Generated AST */
	ast: any;

	/** Detected or specified language */
	language: string;

	/** Time taken to parse in milliseconds */
	parseTime: number;

	/** Whether result came from cache */
	cacheHit: boolean;

	/** Parse errors (syntax errors, etc.) */
	errors: ParseError[];

	/** Parse warnings */
	warnings: ParseWarning[];

	/** Additional parse metadata */
	metadata: ParseMetadata;
}

export interface ParseError {
	/** Error type */
	type: "syntax" | "grammar" | "encoding" | "timeout" | "memory";

	/** Error message */
	message: string;

	/** Location in source code */
	location: SourceLocation;

	/** Error severity */
	severity: "error" | "warning" | "info";

	/** Recovery suggestions */
	suggestions?: string[];
}

export interface ParseWarning {
	/** Warning message */
	message: string;

	/** Location in source code */
	location: SourceLocation;

	/** Warning code for filtering */
	code: string;
}

export interface SourceLocation {
	/** Line number (1-based) */
	line: number;

	/** Column number (1-based) */
	column: number;

	/** End line number (1-based, if range) */
	endLine?: number;

	/** End column number (1-based, if range) */
	endColumn?: number;

	/** Character offset from beginning of file */
	offset?: number;

	/** Length of the location span */
	length?: number;
}

export interface ParseMetadata {
	/** Number of AST nodes created */
	nodeCount: number;

	/** Maximum nesting depth */
	maxDepth: number;

	/** File size in bytes */
	fileSize: number;

	/** File encoding detected */
	encoding: string;

	/** Parser version used */
	parserVersion: string;

	/** Grammar version used */
	grammarVersion: string;

	/** Memory used during parsing */
	memoryUsage: number;

	/** Whether parsing was incremental */
	incremental: boolean;

	/** Performance timing breakdown */
	timings: ParseTimings;
}

export interface ParseTimings {
	/** Time to detect language */
	languageDetection: number;

	/** Time to load grammar */
	grammarLoad: number;

	/** Time to read file */
	fileRead: number;

	/** Time for actual parsing */
	parsing: number;

	/** Time for AST validation */
	validation: number;

	/** Time for cache operations */
	cache: number;
}

export interface SyntaxValidationResult {
	/** Whether syntax is valid */
	isValid: boolean;

	/** Syntax errors found */
	errors: ParseError[];

	/** Validation time in milliseconds */
	validationTime: number;

	/** Character position of first error */
	firstErrorPosition?: number;
}

export interface ParserMetadata {
	/** Parser name */
	name: string;

	/** Parser version */
	version: string;

	/** Supported languages */
	supportedLanguages: string[];

	/** Supported file extensions */
	supportedExtensions: string[];

	/** Parser capabilities */
	capabilities: ParserCapabilities;

	/** Performance characteristics */
	performance: ParserPerformance;
}

export interface ParserCapabilities {
	/** Supports incremental parsing */
	incrementalParsing: boolean;

	/** Supports error recovery */
	errorRecovery: boolean;

	/** Supports syntax highlighting */
	syntaxHighlighting: boolean;

	/** Supports code folding */
	codeFolding: boolean;

	/** Maximum file size that can be parsed */
	maxFileSize: number;

	/** Memory limit for parsing */
	memoryLimit: number;
}

export interface ParserPerformance {
	/** Average parsing speed (lines per second) */
	averageSpeed: number;

	/** Memory usage per KB of source */
	memoryPerKB: number;

	/** Time complexity characteristics */
	timeComplexity: "linear" | "logarithmic" | "quadratic";

	/** Whether parser is thread-safe */
	threadSafe: boolean;
}

export interface ParserOptions {
	/** Maximum file size to parse */
	maxFileSize?: number;

	/** Memory limit for parsing */
	memoryLimit?: number;

	/** Timeout for parsing operations */
	timeout?: number;

	/** Whether to enable error recovery */
	enableErrorRecovery?: boolean;

	/** Whether to enable incremental parsing */
	enableIncremental?: boolean;

	/** Whether to include detailed location info */
	includeLocations?: boolean;

	/** Whether to include trivia (whitespace, comments) */
	includeTrivia?: boolean;

	/** Custom grammar options */
	grammarOptions?: Record<string, any>;

	/** Encoding to use for file reading */
	encoding?: string;

	/** Language override (skip detection) */
	language?: string;
}

/**
 * Base interface for language-specific parser implementations
 */
export interface ILanguageSpecificParser extends ILanguageParser {
	/**
	 * Gets the specific language this parser handles
	 */
	getLanguage(): string;

	/**
	 * Gets language-specific AST node types
	 */
	getNodeTypes(): string[];

	/**
	 * Traverses AST with language-specific visitor pattern
	 */
	traverse(ast: any, visitor: ASTVisitor): void;

	/**
	 * Converts AST to language-specific intermediate representation
	 */
	toIR(ast: any): any;

	/**
	 * Gets language-specific syntax patterns
	 */
	getSyntaxPatterns(): SyntaxPattern[];
}

export interface ASTVisitor {
	/** Called when entering a node */
	enter?(node: any, parent?: any): undefined | boolean;

	/** Called when leaving a node */
	leave?(node: any, parent?: any): undefined | boolean;

	/** Called for specific node types */
	[nodeType: string]:
		| ((node: any, parent?: any) => undefined | boolean)
		| undefined;
}

export interface SyntaxPattern {
	/** Pattern name */
	name: string;

	/** Tree-sitter query pattern */
	pattern: string;

	/** Pattern description */
	description: string;

	/** Pattern category */
	category:
		| "import"
		| "export"
		| "function"
		| "class"
		| "variable"
		| "type"
		| "comment";
}

/**
 * Parser registry interface for managing multiple language parsers
 */
export interface IParserRegistry {
	/**
	 * Registers a language parser
	 */
	register(parser: ILanguageParser): void;

	/**
	 * Unregisters a language parser
	 */
	unregister(language: string): boolean;

	/**
	 * Gets a parser for the specified language
	 */
	getParser(language: string): ILanguageParser | undefined;

	/**
	 * Gets all registered parsers
	 */
	getAllParsers(): Map<string, ILanguageParser>;

	/**
	 * Detects language and returns appropriate parser
	 */
	detectAndGetParser(
		filePath: string,
		content?: string,
	): ILanguageParser | undefined;

	/**
	 * Gets supported languages
	 */
	getSupportedLanguages(): string[];

	/**
	 * Checks if a language is supported
	 */
	isSupported(language: string): boolean;

	/**
	 * Clears all registered parsers
	 */
	clear(): void;
}

/**
 * Parser factory interface
 */
export interface IParserFactory {
	/**
	 * Creates a parser for the specified language
	 */
	createParser(
		language: string,
		options?: ParserOptions,
	): ILanguageParser | undefined;

	/**
	 * Gets available parser types
	 */
	getAvailableLanguages(): string[];

	/**
	 * Checks if a language can be parsed
	 */
	canParse(language: string): boolean;
}

/**
 * Parser cache interface for performance optimization
 */
export interface IParserCache {
	/**
	 * Gets cached parse result
	 */
	get(key: string): ParseResult | undefined;

	/**
	 * Stores parse result in cache
	 */
	set(key: string, result: ParseResult, ttl?: number): void;

	/**
	 * Checks if key exists in cache
	 */
	has(key: string): boolean;

	/**
	 * Removes entry from cache
	 */
	delete(key: string): boolean;

	/**
	 * Clears all cache entries
	 */
	clear(): void;

	/**
	 * Gets cache statistics
	 */
	getStats(): {
		size: number;
		hits: number;
		misses: number;
		hitRate: number;
	};
}
