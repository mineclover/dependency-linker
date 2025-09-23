/**
 * Markdown Link Dependency Extractor
 * Implements IDataExtractor for extracting link dependencies from Markdown AST
 */

import { dirname, extname, resolve } from "node:path";
import type { MarkdownAST, MarkdownNode } from "../parsers/MarkdownParser";
import { LinkType } from "../parsers/MarkdownParser";
import type {
	ExtractorConfiguration,
	ExtractorMetadata,
	ExtractorOptions,
	IDataExtractor,
	OutputSchema,
	ValidationResult,
} from "./IDataExtractor";

/**
 * Link dependency information extracted from markdown
 */
export interface MarkdownLinkDependency {
	source: string;
	type: LinkType;
	isExternal: boolean;
	isRelative: boolean;
	isInternal: boolean;
	extension?: string;
	title?: string;
	alt?: string;
	line: number;
	column: number;
	resolvedPath?: string;
}

/**
 * Configuration options for markdown link extraction
 */
export interface MarkdownLinkExtractionOptions {
	baseDir?: string;
	includeImages?: boolean;
	includeExternalLinks?: boolean;
	includeInternalLinks?: boolean;
	resolveRelativePaths?: boolean;
	followReferenceLinks?: boolean;
	excludePatterns?: RegExp[];
	includePatterns?: RegExp[];
}

/**
 * Markdown link dependency extractor
 */
export class MarkdownLinkExtractor
	implements IDataExtractor<MarkdownLinkDependency[]>
{
	private options: Required<MarkdownLinkExtractionOptions>;

	constructor(options: MarkdownLinkExtractionOptions = {}) {
		this.options = {
			baseDir: process.cwd(),
			includeImages: true,
			includeExternalLinks: true,
			includeInternalLinks: true,
			resolveRelativePaths: true,
			followReferenceLinks: true,
			excludePatterns: [],
			includePatterns: [],
			...options,
		};
	}

	/**
	 * Extract link dependencies from markdown AST
	 */
	extract(
		ast: MarkdownAST,
		filePath: string,
		_options?: ExtractorOptions,
	): MarkdownLinkDependency[] {
		const dependencies: MarkdownLinkDependency[] = [];
		const baseDir = this.options.baseDir || dirname(filePath);
		const referenceLinks = new Map<string, string>();

		// First pass: collect reference link definitions
		if (this.options.followReferenceLinks) {
			this.collectReferenceDefinitions(ast, referenceLinks);
		}

		// Second pass: extract all links
		const traverse = (node: MarkdownNode) => {
			// Process inline links
			if (node.type === "link" && node.url && node.position) {
				const dependency = this.createLinkDependency(
					node.url,
					LinkType.INLINE,
					node,
					baseDir,
					filePath,
				);

				if (this.shouldIncludeLink(dependency)) {
					dependencies.push(dependency);
				}
			}

			// Process images
			if (node.type === "image" && node.url && node.position) {
				if (this.options.includeImages) {
					const dependency = this.createLinkDependency(
						node.url,
						LinkType.IMAGE,
						node,
						baseDir,
						filePath,
					);

					if (this.shouldIncludeLink(dependency)) {
						dependencies.push(dependency);
					}
				}
			}

			// Process reference links
			if (node.type === "link_reference" && node.identifier && node.position) {
				if (this.options.followReferenceLinks) {
					const url = referenceLinks.get(node.identifier);
					if (url) {
						const dependency = this.createLinkDependency(
							url,
							LinkType.REFERENCE,
							node,
							baseDir,
							filePath,
						);

						if (this.shouldIncludeLink(dependency)) {
							dependencies.push(dependency);
						}
					}
				}
			}

			// Process image references
			if (node.type === "image_reference" && node.identifier && node.position) {
				if (this.options.includeImages && this.options.followReferenceLinks) {
					const url = referenceLinks.get(node.identifier);
					if (url) {
						const dependency = this.createLinkDependency(
							url,
							LinkType.IMAGE_REFERENCE,
							node,
							baseDir,
							filePath,
						);

						if (this.shouldIncludeLink(dependency)) {
							dependencies.push(dependency);
						}
					}
				}
			}

			// Traverse children
			if (node.children) {
				node.children.forEach(traverse);
			}
		};

		ast.children.forEach(traverse);
		return dependencies;
	}

	/**
	 * Collect reference link definitions from AST
	 */
	private collectReferenceDefinitions(
		ast: MarkdownAST,
		referenceLinks: Map<string, string>,
	): void {
		const traverse = (node: MarkdownNode) => {
			// Look for reference definitions: [id]: url "title"
			if (node.type === "definition" && node.identifier && node.url) {
				referenceLinks.set(node.identifier, node.url);
			}

			if (node.children) {
				node.children.forEach(traverse);
			}
		};

		ast.children.forEach(traverse);
	}

	/**
	 * Create link dependency object
	 */
	private createLinkDependency(
		url: string,
		type: LinkType,
		node: MarkdownNode,
		baseDir: string,
		_filePath: string,
	): MarkdownLinkDependency {
		const cleanUrl = url.trim();
		const isExternal = this.isExternalUrl(cleanUrl);
		const isRelative = this.isRelativeUrl(cleanUrl);
		const isInternal = isRelative && !cleanUrl.startsWith("//");

		let resolvedPath: string | undefined;
		if (this.options.resolveRelativePaths && isInternal) {
			try {
				resolvedPath = resolve(baseDir, cleanUrl);
			} catch {
				// Ignore resolution errors
			}
		}

		return {
			source: cleanUrl,
			type,
			isExternal,
			isRelative,
			isInternal,
			extension: isInternal ? extname(cleanUrl) || undefined : undefined,
			title: node.title,
			alt: node.alt,
			line: node.position?.start.line ?? 0,
			column: node.position?.start.column ?? 0,
			resolvedPath,
		};
	}

	/**
	 * Check if URL is external (http/https/mailto/etc.)
	 */
	private isExternalUrl(url: string): boolean {
		return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url);
	}

	/**
	 * Check if URL is relative (not absolute or external)
	 */
	private isRelativeUrl(url: string): boolean {
		return (
			!this.isExternalUrl(url) && !url.startsWith("/") && !url.startsWith("#")
		);
	}

	/**
	 * Check if link should be included based on options
	 */
	private shouldIncludeLink(dependency: MarkdownLinkDependency): boolean {
		// Check type filters
		if (dependency.isExternal && !this.options.includeExternalLinks) {
			return false;
		}

		if (dependency.isInternal && !this.options.includeInternalLinks) {
			return false;
		}

		// Check exclude patterns
		if (this.options.excludePatterns.length > 0) {
			const matches = this.options.excludePatterns.some((pattern) =>
				pattern.test(dependency.source),
			);
			if (matches) {
				return false;
			}
		}

		// Check include patterns
		if (this.options.includePatterns.length > 0) {
			const matches = this.options.includePatterns.some((pattern) =>
				pattern.test(dependency.source),
			);
			if (!matches) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Checks if this extractor supports the given language
	 */
	supports(language: string): boolean {
		return language === "markdown" || language === "md";
	}

	/**
	 * Gets the unique name of this extractor
	 */
	getName(): string {
		return "MarkdownLinkExtractor";
	}

	/**
	 * Gets the version of this extractor
	 */
	getVersion(): string {
		return "1.0.0";
	}

	/**
	 * Validates extracted data
	 */
	validate(data: MarkdownLinkDependency[]): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		if (!Array.isArray(data)) {
			errors.push("Data must be an array");
			return { isValid: false, errors, warnings };
		}

		data.forEach((dep, index) => {
			if (!dep.source) {
				errors.push(`Dependency at index ${index} missing source`);
			}
			if (typeof dep.line !== "number") {
				warnings.push(`Dependency at index ${index} missing line number`);
			}
		});

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
			quality: {
				completeness: warnings.length === 0 ? 1.0 : 0.8,
				accuracy: errors.length === 0 ? 1.0 : 0.0,
				consistency: 1.0,
				confidence: 0.9,
			},
		};
	}

	/**
	 * Get extractor metadata
	 */
	getMetadata(): ExtractorMetadata {
		return {
			name: "MarkdownLinkExtractor",
			version: "1.0.0",
			description: "Extracts link dependencies from Markdown AST",
			supportedLanguages: ["markdown", "md"],
			outputTypes: ["MarkdownLinkDependency[]"],
			dependencies: [],
			performance: {
				averageTimePerNode: 0.1,
				memoryUsage: "low",
				timeComplexity: "linear",
				maxRecommendedFileSize: 1048576, // 1MB
			},
		};
	}

	/**
	 * Configure extractor options
	 */
	configure(options: ExtractorConfiguration): void {
		if (options.defaultOptions?.custom) {
			this.options = { ...this.options, ...options.defaultOptions.custom };
		}
	}

	/**
	 * Get current configuration
	 */
	getConfiguration(): ExtractorConfiguration {
		return {
			enabled: true,
			priority: 100,
			timeout: 5000,
			memoryLimit: 64 * 1024 * 1024, // 64MB
			languages: ["markdown", "md"],
			defaultOptions: {
				custom: this.options,
			},
			errorHandling: "lenient",
			logLevel: "warn",
		};
	}

	/**
	 * Gets the output schema for this extractor
	 */
	getOutputSchema(): OutputSchema {
		return {
			type: "array",
			properties: {
				items: {
					type: "object",
					properties: {
						source: { type: "string", description: "Link source URL or path" },
						type: {
							type: "string",
							description: "Link type (url, image, etc.)",
						},
						isExternal: {
							type: "boolean",
							description: "Whether link is external",
						},
						line: { type: "number", description: "Line number in source" },
						column: { type: "number", description: "Column number in source" },
					},
				},
			},
			required: ["source", "type", "line", "column"],
			version: "1.0.0",
			metadata: {
				extractorName: "MarkdownLinkExtractor",
			},
		};
	}

	/**
	 * Cleans up extractor resources
	 */
	dispose(): void {
		// No resources to clean up for this extractor
	}
}
