/**
 * Markdown dependency type definitions
 *
 * Defines dependency types and extraction for markdown documents.
 * Supports standard markdown links, images, and custom reference syntax.
 */

import type { SupportedLanguage } from "./types";

/**
 * Markdown dependency types
 */
export enum MarkdownDependencyType {
	/** Standard markdown link: [text](path) */
	Link = "link",

	/** Image reference: ![alt](path) */
	Image = "image",

	/** Wiki-style link: [[path]] or [[path|text]] */
	WikiLink = "wikilink",

	/** Code block file reference: ```language:filepath */
	CodeBlockReference = "code-block-reference",

	/** Symbol reference in markdown: @ClassName or @function() */
	SymbolReference = "symbol-reference",

	/** File include directive: <!-- include:path --> */
	Include = "include",

	/** Custom anchor link: [text](#anchor) */
	Anchor = "anchor",

	/** Hashtag reference: #tag or #태그 (inline tags without spaces) */
	Hashtag = "hashtag",
}

/**
 * Markdown reference location
 */
export interface MarkdownLocation {
	/** Line number (1-indexed) */
	line: number;
	/** Column number (0-indexed) */
	column: number;
	/** Optional end position for multi-line references */
	endLine?: number;
	endColumn?: number;
}

/**
 * Markdown dependency relationship
 */
export interface MarkdownDependency {
	/** Source file path */
	from: string;

	/** Target path or symbol */
	to: string;

	/** Dependency type */
	type: MarkdownDependencyType;

	/** Location in source file */
	location: MarkdownLocation;

	/** Link text or alt text */
	text?: string;

	/** Context (surrounding text) */
	context?: string;

	/** Whether this is an external link (http/https) */
	isExternal?: boolean;

	/** Optional metadata */
	metadata?: {
		/** Title attribute */
		title?: string;
		/** Language for code blocks */
		language?: string;
		/** Anchor/hash fragment */
		anchor?: string;
	};
}

/**
 * Markdown extraction result
 */
export interface MarkdownExtractionResult {
	/** File path */
	filePath: string;

	/** Extracted dependencies */
	dependencies: MarkdownDependency[];

	/** Front matter metadata (if any) */
	frontMatter?: Record<string, unknown>;

	/** Document headings for structure */
	headings?: Array<{
		level: number;
		text: string;
		line: number;
		/** Semantic tags extracted from heading (#tag1 #tag2) */
		tags?: string[];
		/** Clean text without hashtags */
		cleanText?: string;
	}>;

	/** Language (always 'markdown') */
	language: SupportedLanguage;

	/** Extraction timestamp */
	timestamp: Date;
}

/**
 * Markdown reference patterns
 */
export const MARKDOWN_PATTERNS = {
	/** Standard link: [text](url "optional title") - but not images (![...]) */
	LINK: /(?<!!)\[([^\]]+)\]\(([^)]+?)(?:\s+"([^"]+)")?\)/g,

	/** Image: ![alt](url "optional title") */
	IMAGE: /!\[([^\]]*)\]\(([^)]+?)(?:\s+"([^"]+)")?\)/g,

	/** Wiki link: [[target]] or [[target|text]] */
	WIKI_LINK: /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,

	/** Symbol reference: @SymbolName or @function() - matches both class names and function calls */
	SYMBOL_REF: /@([A-Za-z][a-zA-Z0-9_.]*(?:\(\))?)/g,

	/** HTML comment include: <!-- include:path --> */
	INCLUDE: /<!--\s*include:\s*([^\s]+)\s*-->/g,

	/** Code block with file reference: ```lang:filepath */
	CODE_BLOCK: /```([a-z]+):([^\n]+)/g,

	/** Heading: # text */
	HEADING: /^(#{1,6})\s+(.+)$/gm,

	/** Hashtag: #tag or #태그 (inline tags without spaces, not headings) */
	HASHTAG: /#([A-Za-z가-힣][A-Za-z가-힣0-9_-]*)/g,

	/** Semantic tag: English-only tags for heading type classification */
	SEMANTIC_TAG: /#([A-Za-z][A-Za-z0-9_-]*)/g,
} as const;

/**
 * Check if a URL is external (http/https)
 */
export function isExternalUrl(url: string): boolean {
	return /^https?:\/\//i.test(url);
}

/**
 * Check if a URL is an anchor link (starts with #)
 */
export function isAnchorLink(url: string): boolean {
	return url.startsWith("#");
}

/**
 * Parse URL into path and anchor
 */
export function parseUrl(url: string): { path: string; anchor?: string } {
	const hashIndex = url.indexOf("#");
	if (hashIndex === -1) {
		return { path: url };
	}
	return {
		path: url.substring(0, hashIndex),
		anchor: url.substring(hashIndex + 1),
	};
}

/**
 * Normalize markdown path (handle relative paths, keep extensions)
 */
export function normalizeMarkdownPath(path: string): string {
	// Handle ./  and ../
	let normalized = path.replace(/^\.\//, "");

	return normalized;
}

/**
 * Extract front matter from markdown content
 */
export function extractFrontMatter(content: string): {
	frontMatter: Record<string, unknown> | undefined;
	contentWithoutFrontMatter: string;
} {
	const frontMatterRegex = /^---\n([\s\S]*?)\n---\n/;
	const match = content.match(frontMatterRegex);

	if (!match) {
		return { frontMatter: undefined, contentWithoutFrontMatter: content };
	}

	const frontMatterText = match[1];
	const contentWithoutFrontMatter = content.slice(match[0].length);

	// Simple YAML parsing (key: value pairs)
	const frontMatter: Record<string, unknown> = {};
	const lines = frontMatterText.split("\n");

	for (const line of lines) {
		const colonIndex = line.indexOf(":");
		if (colonIndex > 0) {
			const key = line.substring(0, colonIndex).trim();
			const value = line.substring(colonIndex + 1).trim();
			frontMatter[key] = value.replace(/^["']|["']$/g, ""); // Remove quotes
		}
	}

	return { frontMatter, contentWithoutFrontMatter };
}
