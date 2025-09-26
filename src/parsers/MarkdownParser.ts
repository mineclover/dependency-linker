/**
 * Markdown Language Parser
 * Implements ILanguageParser for parsing Markdown files and extracting link dependencies
 */

import { promises as fs } from "node:fs";
import { extname } from "node:path";
import type { AST } from "../extractors/IDataExtractor";
import type { TreeSitterLanguage } from "../types/TreeSitterTypes";
import type {
	ILanguageParser,
	ParseError,
	ParseMetadata,
	ParseResult,
	ParserMetadata,
	ParserOptions,
	ParseWarning,
	SyntaxValidationResult,
} from "./ILanguageParser";

/**
 * Markdown-specific AST node types
 */
export interface MarkdownAST {
	type: "document";
	children: MarkdownNode[];
	sourceMap?: SourceMap;
}

export interface MarkdownNode {
	type: string;
	children?: MarkdownNode[];
	value?: string;
	url?: string;
	title?: string;
	alt?: string;
	identifier?: string;
	label?: string;
	position?: NodePosition;
}

export interface NodePosition {
	start: { line: number; column: number; offset: number };
	end: { line: number; column: number; offset: number };
}

export interface SourceMap {
	[key: number]: {
		line: number;
		column: number;
		source: string;
	};
}

/**
 * Link types found in Markdown
 */
export enum LinkType {
	INLINE = "inline",
	REFERENCE = "reference",
	AUTOLINK = "autolink",
	IMAGE = "image",
	IMAGE_REFERENCE = "image_reference",
}

/**
 * Markdown link information
 */
export interface MarkdownLink {
	type: LinkType;
	url: string;
	text?: string;
	title?: string;
	alt?: string;
	identifier?: string;
	position: NodePosition;
	isRelative: boolean;
	isInternal: boolean;
	isExternal: boolean;
	extension?: string;
}

/**
 * Markdown Parser implementation
 */
/**
 * Extended metadata for markdown parsing
 */
export interface MarkdownParseMetadata extends ParseMetadata {
	links: MarkdownLink[];
	headings: { text: string; level: number; position: NodePosition }[];
	codeBlocks: { language: string; content: string; position: NodePosition }[];
}

/**
 * Extended parser options for markdown
 */
export interface MarkdownParserOptions extends ParserOptions {
	enableSourceMap?: boolean;
	validateLinks?: boolean;
	extractCodeBlocks?: boolean;
}

/**
 * Extended syntax validation result with warnings
 */
export interface MarkdownSyntaxValidationResult extends SyntaxValidationResult {
	warnings?: ParseWarning[];
}

/**
 * Extended parser metadata with features
 */
export interface MarkdownParserMetadata extends ParserMetadata {
	features: string[];
}

export class MarkdownParser implements ILanguageParser {
	private options: MarkdownParserOptions;

	constructor(options: MarkdownParserOptions = {}) {
		this.options = {
			maxFileSize: 1024 * 1024, // 1MB default
			timeout: 5000,
			enableErrorRecovery: true,
			includeLocations: true,
			encoding: "utf-8",
			enableSourceMap: true, // Default to true
			validateLinks: false,
			extractCodeBlocks: true,
			...options,
		};
	}

	/**
	 * Parse markdown file and extract link dependencies
	 */
	async parse(
		filePath: string,
		content?: string,
	): Promise<ParseResult & { metadata: MarkdownParseMetadata }> {
		const startTime = Date.now();
		const errors: ParseError[] = [];
		const warnings: ParseWarning[] = [];

		try {
			// Read file content if not provided
			const fileReadStart = Date.now();
			if (!content) {
				content = await fs.readFile(filePath, { encoding: "utf-8" });
			}
			const fileReadTime = Date.now() - fileReadStart;

			// Ensure content is defined
			if (typeof content !== "string") {
				throw new Error("Failed to read file content as string");
			}

			// Check file size limit
			if (
				this.options.maxFileSize &&
				content.length > this.options.maxFileSize
			) {
				throw new Error(
					`File size exceeds limit: ${content.length} > ${this.options.maxFileSize}`,
				);
			}

			// Parse markdown content
			const parseStart = Date.now();
			const ast = this.parseMarkdown(content, filePath);
			const parseTime = Date.now() - parseStart;

			// Count AST nodes for metadata
			const nodeCount = this.countNodes(ast);
			const maxDepth = this.calculateMaxDepth(ast);

			// Extract markdown-specific metadata
			const extractedData = this.extractMarkdownData(ast);

			// Validate syntax
			const validationStart = Date.now();
			const validation = this.validateSyntax(content);
			const validationTime = Date.now() - validationStart;
			errors.push(...validation.errors);

			const totalTime = Date.now() - startTime;

			// Create extended metadata with markdown-specific data
			const metadata: MarkdownParseMetadata = {
				nodeCount,
				maxDepth,
				fileSize: content.length,
				encoding: this.options.encoding || "utf-8",
				parserVersion: "1.0.0",
				grammarVersion: "markdown-1.0",
				memoryUsage: process.memoryUsage().heapUsed,
				incremental: false,
				timings: {
					languageDetection: 0, // No language detection needed for markdown
					grammarLoad: 0, // No grammar loading for markdown
					fileRead: fileReadTime,
					parsing: parseTime,
					validation: validationTime,
					cache: 0, // No cache operations in this implementation
				},
				links: extractedData.links,
				headings: extractedData.headings,
				codeBlocks: extractedData.codeBlocks,
			};

			return {
				ast: ast as AST,
				language: "markdown",
				parseTime: totalTime,
				cacheHit: false,
				errors,
				warnings,
				metadata,
			};
		} catch (error) {
			const totalTime = Date.now() - startTime;
			errors.push({
				type: "PARSE_ERROR" as any,
				message: error instanceof Error ? error.message : "Unknown parse error",
				location: { line: 1, column: 1, offset: 0 },
				severity: "error",
			});

			return {
				ast: { type: "document", children: [] } as AST,
				language: "markdown",
				parseTime: totalTime,
				cacheHit: false,
				errors,
				warnings,
				metadata: {
					nodeCount: 0,
					maxDepth: 0,
					fileSize: 0,
					encoding: this.options.encoding || "utf-8",
					parserVersion: "1.0.0",
					grammarVersion: "markdown-1.0",
					memoryUsage: process.memoryUsage().heapUsed,
					incremental: false,
					timings: {
						languageDetection: 0,
						grammarLoad: 0,
						fileRead: 0,
						parsing: totalTime,
						validation: 0,
						cache: 0,
					},
					links: [],
					headings: [],
					codeBlocks: [],
				},
			};
		}
	}

	/**
	 * Check if this parser supports the given language
	 */
	supports(language: string): boolean {
		return ["markdown", "md"].includes(language.toLowerCase());
	}

	/**
	 * Detect language from file path
	 */
	detectLanguage(filePath: string, content?: string): string {
		const ext = extname(filePath).toLowerCase();
		if ([".md", ".markdown", ".mdown", ".mkd"].includes(ext)) {
			return "markdown";
		}

		// Content-based detection
		if (content) {
			// Check for common markdown patterns
			const markdownPatterns = [
				/^#{1,6}\s+/m, // Headers
				/^\*\s+/m, // Unordered lists
				/^\d+\.\s+/m, // Ordered lists
				/\[.*?\]\(.*?\)/, // Links
				/!\[.*?\]\(.*?\)/, // Images
				/```[\s\S]*?```/, // Code blocks
				/^>\s+/m, // Blockquotes
			];

			const score = markdownPatterns.reduce((acc, pattern) => {
				return acc + (pattern.test(content) ? 1 : 0);
			}, 0);

			if (score >= 2) {
				return "markdown";
			}
		}

		return "unknown";
	}

	/**
	 * Count total nodes in AST
	 */
	private countNodes(ast: MarkdownAST): number {
		let count = 1; // Count root node
		const traverse = (node: MarkdownNode) => {
			count++;
			if (node.children) {
				node.children.forEach(traverse);
			}
		};
		ast.children.forEach(traverse);
		return count;
	}

	/**
	 * Calculate maximum depth of AST
	 */
	private calculateMaxDepth(ast: MarkdownAST): number {
		const traverse = (node: MarkdownNode, depth: number): number => {
			let maxDepth = depth;
			if (node.children) {
				for (const child of node.children) {
					const childDepth = traverse(child, depth + 1);
					maxDepth = Math.max(maxDepth, childDepth);
				}
			}
			return maxDepth;
		};

		let maxDepth = 0;
		for (const child of ast.children) {
			const childDepth = traverse(child, 1);
			maxDepth = Math.max(maxDepth, childDepth);
		}
		return maxDepth;
	}

	/**
	 * Extract markdown-specific data from AST
	 */
	private extractMarkdownData(ast: MarkdownAST): {
		links: MarkdownLink[];
		headings: { text: string; level: number; position: NodePosition }[];
		codeBlocks: { language: string; content: string; position: NodePosition }[];
	} {
		const links: MarkdownLink[] = [];
		const headings: { text: string; level: number; position: NodePosition }[] =
			[];
		const codeBlocks: {
			language: string;
			content: string;
			position: NodePosition;
		}[] = [];

		const traverse = (node: MarkdownNode) => {
			// Extract links and images
			if (node.type === "link" || node.type === "image") {
				const linkType =
					node.type === "image" ? LinkType.IMAGE : LinkType.INLINE;
				const url = node.url || "";

				// Determine if link is relative/internal/external
				const isExternal = /^https?:\/\//.test(url);
				const isRelative =
					!isExternal &&
					(url.startsWith("./") ||
						url.startsWith("../") ||
						!url.startsWith("/"));
				const isInternal = !isExternal;

				links.push({
					type: linkType,
					url: url,
					text: node.value,
					title: node.title,
					alt: node.alt,
					position: node.position || {
						start: { line: 0, column: 0, offset: 0 },
						end: { line: 0, column: 0, offset: 0 },
					},
					isRelative,
					isInternal,
					isExternal,
					extension: isExternal ? undefined : url.split(".").pop(),
				});
			}

			// Extract headings
			if (node.type === "heading") {
				// Determine heading level from the original line content
				const text = node.value || "";
				const level = 1; // Default to h1, could be enhanced to detect actual level

				headings.push({
					text,
					level,
					position: node.position || {
						start: { line: 0, column: 0, offset: 0 },
						end: { line: 0, column: 0, offset: 0 },
					},
				});
			}

			// Extract code blocks
			if (node.type === "code_block") {
				const language = node.value || "";
				const content = ""; // Could extract actual code content if needed

				codeBlocks.push({
					language,
					content,
					position: node.position || {
						start: { line: 0, column: 0, offset: 0 },
						end: { line: 0, column: 0, offset: 0 },
					},
				});
			}

			// Recursively traverse children
			if (node.children) {
				node.children.forEach(traverse);
			}
		};

		ast.children.forEach(traverse);

		return { links, headings, codeBlocks };
	}

	/**
	 * Parse markdown content into AST
	 */
	private parseMarkdown(content: string, _filePath: string): MarkdownAST {
		const lines = content.split("\n");
		const children: MarkdownNode[] = [];
		let currentPosition = 0;
		const sourceMap: SourceMap = {};
		let inCodeBlock = false;
		let codeBlockStart = -1;
		let codeBlockLanguage = "";

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const lineStart = currentPosition;
			const lineEnd = currentPosition + line.length;

			// Generate source map if enabled
			if (this.options.enableSourceMap) {
				sourceMap[i + 1] = {
					line: i + 1,
					column: 1,
					source: line,
				};
			}

			// Handle code block boundaries
			if (line.startsWith("```")) {
				if (!inCodeBlock) {
					// Start of code block
					inCodeBlock = true;
					codeBlockStart = i;
					codeBlockLanguage = line.substring(3).trim();
				} else {
					// End of code block
					inCodeBlock = false;
					children.push({
						type: "code_block",
						value: codeBlockLanguage,
						position: {
							start: { line: codeBlockStart + 1, column: 1, offset: 0 },
							end: { line: i + 1, column: line.length + 1, offset: lineEnd },
						},
					});
					codeBlockLanguage = "";
				}
			} else if (!inCodeBlock) {
				// Parse regular markdown elements only when not in code block
				const nodes = this.parseLine(line, i + 1, lineStart, lineEnd);
				children.push(...nodes);
			}

			currentPosition = lineEnd + 1; // +1 for newline
		}

		return {
			type: "document",
			children,
			sourceMap: this.options.enableSourceMap ? sourceMap : undefined,
		};
	}

	/**
	 * Parse a single line of markdown
	 */
	private parseLine(
		line: string,
		lineNumber: number,
		startOffset: number,
		endOffset: number,
	): MarkdownNode[] {
		const nodes: MarkdownNode[] = [];

		// Headers
		const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
		if (headerMatch) {
			nodes.push({
				type: "heading",
				value: headerMatch[2],
				children: this.parseInlineElements(
					headerMatch[2],
					lineNumber,
					startOffset + headerMatch[1].length + 1,
				),
				position: {
					start: { line: lineNumber, column: 1, offset: startOffset },
					end: { line: lineNumber, column: line.length + 1, offset: endOffset },
				},
			});
			return nodes;
		}

		// Lists
		const listMatch = line.match(/^(\s*)([*\-+]|\d+\.)\s+(.+)$/);
		if (listMatch) {
			nodes.push({
				type: "list_item",
				value: listMatch[3],
				children: this.parseInlineElements(
					listMatch[3],
					lineNumber,
					startOffset + listMatch[0].length - listMatch[3].length,
				),
				position: {
					start: { line: lineNumber, column: 1, offset: startOffset },
					end: { line: lineNumber, column: line.length + 1, offset: endOffset },
				},
			});
			return nodes;
		}

		// Regular paragraph
		if (line.trim()) {
			nodes.push({
				type: "paragraph",
				value: line,
				children: this.parseInlineElements(line, lineNumber, startOffset),
				position: {
					start: { line: lineNumber, column: 1, offset: startOffset },
					end: { line: lineNumber, column: line.length + 1, offset: endOffset },
				},
			});
		}

		return nodes;
	}

	/**
	 * Parse inline elements (links, images, etc.)
	 */
	private parseInlineElements(
		text: string,
		lineNumber: number,
		startOffset: number,
	): MarkdownNode[] {
		const nodes: MarkdownNode[] = [];

		// Images: ![alt](url "title") - Parse images first to avoid conflict with links
		const imageRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
		let imageMatch: RegExpExecArray | null;
		const imagePositions: Array<{ start: number; end: number }> = [];

		imageMatch = imageRegex.exec(text);
		while (imageMatch !== null) {
			imagePositions.push({
				start: imageMatch.index,
				end: imageMatch.index + imageMatch[0].length,
			});

			nodes.push({
				type: "image",
				url: imageMatch[2],
				alt: imageMatch[1],
				title: imageMatch[3],
				position: {
					start: {
						line: lineNumber,
						column: imageMatch.index + 1,
						offset: startOffset + imageMatch.index,
					},
					end: {
						line: lineNumber,
						column: imageMatch.index + imageMatch[0].length + 1,
						offset: startOffset + imageMatch.index + imageMatch[0].length,
					},
				},
			});
			imageMatch = imageRegex.exec(text);
		}

		// Inline links: [text](url "title") - Skip positions that are already images
		const linkRegex = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
		let linkMatch: RegExpExecArray | null;

		linkMatch = linkRegex.exec(text);
		while (linkMatch !== null) {
			// Check if this link position overlaps with any image position
			const linkStart = linkMatch.index;
			const linkEnd = linkMatch.index + linkMatch[0].length;

			const isPartOfImage = imagePositions.some(
				(pos) =>
					(linkStart >= pos.start - 1 && linkStart < pos.end) ||
					(linkEnd > pos.start && linkEnd <= pos.end + 1),
			);

			if (!isPartOfImage) {
				nodes.push({
					type: "link",
					url: linkMatch[2],
					value: linkMatch[1],
					title: linkMatch[3],
					position: {
						start: {
							line: lineNumber,
							column: linkMatch.index + 1,
							offset: startOffset + linkMatch.index,
						},
						end: {
							line: lineNumber,
							column: linkMatch.index + linkMatch[0].length + 1,
							offset: startOffset + linkMatch.index + linkMatch[0].length,
						},
					},
				});
			}
			linkMatch = linkRegex.exec(text);
		}

		// Reference links: [text][ref]
		const refLinkRegex = /\[([^\]]*)\]\[([^\]]*)\]/g;
		let refLinkMatch: RegExpExecArray | null;

		refLinkMatch = refLinkRegex.exec(text);
		while (refLinkMatch !== null) {
			nodes.push({
				type: "link_reference",
				value: refLinkMatch[1],
				identifier: refLinkMatch[2],
				position: {
					start: {
						line: lineNumber,
						column: refLinkMatch.index + 1,
						offset: startOffset + refLinkMatch.index,
					},
					end: {
						line: lineNumber,
						column: refLinkMatch.index + refLinkMatch[0].length + 1,
						offset: startOffset + refLinkMatch.index + refLinkMatch[0].length,
					},
				},
			});
			refLinkMatch = refLinkRegex.exec(text);
		}

		return nodes;
	}

	/**
	 * Validate markdown syntax
	 */
	validateSyntax(content: string): MarkdownSyntaxValidationResult {
		const startTime = Date.now();
		const errors: ParseError[] = [];
		const warnings: ParseWarning[] = [];

		// Check for common markdown issues
		const lines = content.split("\n");
		let firstErrorPosition: number | undefined;

		lines.forEach((line, index) => {
			const lineNumber = index + 1;

			// Check for unclosed code blocks
			if (line.startsWith("```") && content.split("```").length % 2 === 0) {
				warnings.push({
					message: "Potentially unclosed code block",
					location: { line: lineNumber, column: 1, offset: 0 },
					code: "UNCLOSED_CODE_BLOCK",
				});
				if (firstErrorPosition === undefined) {
					firstErrorPosition = 0; // Could calculate actual position
				}
			}

			// Check for malformed links
			const malformedLinks = line.match(/\[[^\]]*\]\([^)]*$/g);
			if (malformedLinks) {
				errors.push({
					type: "MALFORMED_LINK" as any,
					message: "Malformed link syntax",
					location: { line: lineNumber, column: 1, offset: 0 },
					severity: "error",
				});
				if (firstErrorPosition === undefined) {
					firstErrorPosition = 0; // Could calculate actual position
				}
			}
		});

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
			validationTime: Date.now() - startTime,
			firstErrorPosition,
		};
	}

	/**
	 * Get parser metadata
	 */
	getMetadata(): MarkdownParserMetadata {
		return {
			name: "MarkdownParser",
			version: "1.0.0",
			supportedLanguages: ["markdown", "md"],
			supportedExtensions: [".md", ".markdown", ".mdown", ".mkd"],
			capabilities: {
				incrementalParsing: false,
				errorRecovery: true,
				syntaxHighlighting: false,
				codeFolding: false,
				maxFileSize: 1024 * 1024, // 1MB
				memoryLimit: 64 * 1024 * 1024, // 64MB
			},
			performance: {
				averageSpeed: 1000, // lines per second
				memoryPerKB: 0.5, // KB memory per KB source
				timeComplexity: "linear",
				threadSafe: true,
			},
			features: ["link_extraction", "syntax_validation"],
		};
	}

	/**
	 * Configure parser options
	 */
	configure(options: MarkdownParserOptions): void {
		this.options = { ...this.options, ...options };
	}

	/**
	 * Get current configuration
	 */
	getConfiguration(): MarkdownParserOptions {
		return { ...this.options };
	}

	/**
	 * Get grammar (not applicable for markdown)
	 */
	getGrammar(): TreeSitterLanguage | null {
		return null; // Markdown doesn't use tree-sitter grammar
	}

	/**
	 * Clean up resources
	 */
	dispose(): void {
		// No resources to clean up for markdown parser
	}
}
