/**
 * Markdown dependency extractor
 *
 * Extracts dependencies from markdown documents including:
 * - Standard links and images
 * - Wiki-style links
 * - Symbol references
 * - Code block file references
 * - Include directives
 */

import type {
	MarkdownDependency,
	MarkdownDependencyType,
	MarkdownExtractionResult,
	MarkdownLocation,
} from "./markdown-types";
import {
	MARKDOWN_PATTERNS,
	extractFrontMatter,
	isAnchorLink,
	isExternalUrl,
	normalizeMarkdownPath,
	parseUrl,
} from "./markdown-types";
import type { SupportedLanguage } from "./types";

/**
 * Extract all dependencies from markdown content
 */
export function extractMarkdownDependencies(
	filePath: string,
	content: string,
): MarkdownExtractionResult {
	const dependencies: MarkdownDependency[] = [];

	// Extract front matter
	const { frontMatter, contentWithoutFrontMatter } =
		extractFrontMatter(content);

	// Split into lines for location tracking
	const lines = contentWithoutFrontMatter.split("\n");

	// Extract headings
	const headings = extractHeadings(contentWithoutFrontMatter);

	// Extract different types of dependencies
	dependencies.push(...extractLinks(filePath, lines));
	dependencies.push(...extractImages(filePath, lines));
	dependencies.push(...extractWikiLinks(filePath, lines));
	dependencies.push(...extractSymbolReferences(filePath, lines));
	dependencies.push(...extractIncludes(filePath, lines));
	dependencies.push(...extractCodeBlockReferences(filePath, lines));
	dependencies.push(...extractHashtags(filePath, lines));

	return {
		filePath,
		dependencies,
		frontMatter,
		headings,
		language: "markdown" as SupportedLanguage,
		timestamp: new Date(),
	};
}

/**
 * Extract headings from markdown content with semantic tags
 */
function extractHeadings(content: string): Array<{
	level: number;
	text: string;
	line: number;
	tags?: string[];
	cleanText?: string;
}> {
	const headings: Array<{
		level: number;
		text: string;
		line: number;
		tags?: string[];
		cleanText?: string;
	}> = [];
	const lines = content.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const match = /^(#{1,6})\s+(.+)$/.exec(line);
		if (match) {
			const fullText = match[2].trim();

			// Extract semantic tags from heading text (English only)
			const tags: string[] = [];
			MARKDOWN_PATTERNS.SEMANTIC_TAG.lastIndex = 0;
			let tagMatch: RegExpExecArray | null;

			while (
				(tagMatch = MARKDOWN_PATTERNS.SEMANTIC_TAG.exec(fullText)) !== null
			) {
				tags.push(tagMatch[1]);
			}

			// Remove semantic tags to get clean text
			const cleanText = fullText
				.replace(MARKDOWN_PATTERNS.SEMANTIC_TAG, "")
				.trim()
				.replace(/\s+/g, " "); // Normalize whitespace

			headings.push({
				level: match[1].length,
				text: fullText,
				line: i + 1,
				tags: tags.length > 0 ? tags : undefined,
				cleanText: tags.length > 0 ? cleanText : undefined,
			});
		}
	}

	return headings;
}

/**
 * Extract standard markdown links
 */
function extractLinks(filePath: string, lines: string[]): MarkdownDependency[] {
	return extractPattern(
		filePath,
		lines,
		MARKDOWN_PATTERNS.LINK,
		(match, lineNum, col) => {
			const text = match[1];
			const url = match[2];
			const title = match[3];

			// Skip external URLs
			if (isExternalUrl(url)) {
				return {
					from: filePath,
					to: url,
					type: "link" as MarkdownDependencyType,
					location: { line: lineNum, column: col },
					text,
					isExternal: true,
					metadata: { title },
				};
			}

			// Handle anchor-only links
			if (isAnchorLink(url)) {
				return {
					from: filePath,
					to: filePath, // Self-reference
					type: "anchor" as MarkdownDependencyType,
					location: { line: lineNum, column: col },
					text,
					metadata: { anchor: url.substring(1), title },
				};
			}

			// Parse path and anchor
			const { path, anchor } = parseUrl(url);
			const normalizedPath = normalizeMarkdownPath(path);

			return {
				from: filePath,
				to: normalizedPath,
				type: "link" as MarkdownDependencyType,
				location: { line: lineNum, column: col },
				text,
				metadata: { anchor, title },
			};
		},
	);
}

/**
 * Extract image references
 */
function extractImages(
	filePath: string,
	lines: string[],
): MarkdownDependency[] {
	return extractPattern(
		filePath,
		lines,
		MARKDOWN_PATTERNS.IMAGE,
		(match, lineNum, col) => {
			const alt = match[1];
			const url = match[2];
			const title = match[3];

			// Keep external images too
			const isExt = isExternalUrl(url);

			return {
				from: filePath,
				to: isExt ? url : normalizeMarkdownPath(url),
				type: "image" as MarkdownDependencyType,
				location: { line: lineNum, column: col },
				text: alt,
				isExternal: isExt,
				metadata: { title },
			};
		},
	);
}

/**
 * Extract wiki-style links
 */
function extractWikiLinks(
	filePath: string,
	lines: string[],
): MarkdownDependency[] {
	return extractPattern(
		filePath,
		lines,
		MARKDOWN_PATTERNS.WIKI_LINK,
		(match, lineNum, col) => {
			const target = match[1];
			const text = match[2] || target;

			return {
				from: filePath,
				to: normalizeMarkdownPath(target),
				type: "wikilink" as MarkdownDependencyType,
				location: { line: lineNum, column: col },
				text,
			};
		},
	);
}

/**
 * Extract symbol references (@ClassName, @function())
 */
function extractSymbolReferences(
	filePath: string,
	lines: string[],
): MarkdownDependency[] {
	return extractPattern(
		filePath,
		lines,
		MARKDOWN_PATTERNS.SYMBOL_REF,
		(match, lineNum, col) => {
			const symbol = match[1];

			return {
				from: filePath,
				to: `/${symbol}`, // Serena-compatible name path
				type: "symbol-reference" as MarkdownDependencyType,
				location: { line: lineNum, column: col },
				text: symbol,
			};
		},
	);
}

/**
 * Extract include directives
 */
function extractIncludes(
	filePath: string,
	lines: string[],
): MarkdownDependency[] {
	return extractPattern(
		filePath,
		lines,
		MARKDOWN_PATTERNS.INCLUDE,
		(match, lineNum, col) => {
			const path = match[1];

			return {
				from: filePath,
				to: normalizeMarkdownPath(path),
				type: "include" as MarkdownDependencyType,
				location: { line: lineNum, column: col },
			};
		},
	);
}

/**
 * Extract code block file references
 */
function extractCodeBlockReferences(
	filePath: string,
	lines: string[],
): MarkdownDependency[] {
	return extractPattern(
		filePath,
		lines,
		MARKDOWN_PATTERNS.CODE_BLOCK,
		(match, lineNum, col) => {
			const language = match[1];
			const file = match[2];

			return {
				from: filePath,
				to: file.trim(),
				type: "code-block-reference" as MarkdownDependencyType,
				location: { line: lineNum, column: col },
				metadata: { language },
			};
		},
	);
}

/**
 * Extract hashtags (#tag, #태그)
 */
function extractHashtags(
	filePath: string,
	lines: string[],
): MarkdownDependency[] {
	const dependencies: MarkdownDependency[] = [];
	const seenTags = new Set<string>(); // Track unique tags per file

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const lineNum = i + 1;

		// Skip heading lines (they start with # and have space)
		if (/^#{1,6}\s/.test(line.trim())) {
			continue;
		}

		// Reset regex
		MARKDOWN_PATTERNS.HASHTAG.lastIndex = 0;

		let match: RegExpExecArray | null;
		while ((match = MARKDOWN_PATTERNS.HASHTAG.exec(line)) !== null) {
			const tag = match[1];
			const tagKey = `${lineNum}:${tag}`; // Make unique per line to avoid duplicates

			if (!seenTags.has(tagKey)) {
				seenTags.add(tagKey);

				dependencies.push({
					from: filePath,
					to: `#${tag}`, // Keep # prefix for tag identifier
					type: "hashtag" as MarkdownDependencyType,
					location: { line: lineNum, column: match.index },
					text: tag,
					context: line.trim(),
				});
			}
		}
	}

	return dependencies;
}

/**
 * Generic pattern extraction helper
 */
function extractPattern(
	filePath: string,
	lines: string[],
	pattern: RegExp,
	createDependency: (
		match: RegExpExecArray,
		lineNum: number,
		col: number,
	) => MarkdownDependency | null,
): MarkdownDependency[] {
	const dependencies: MarkdownDependency[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const lineNum = i + 1;

		// Reset regex
		pattern.lastIndex = 0;

		let match: RegExpExecArray | null;
		while ((match = pattern.exec(line)) !== null) {
			const dep = createDependency(match, lineNum, match.index);
			if (dep) {
				// Add context (the full line)
				dep.context = line.trim();
				dependencies.push(dep);
			}
		}
	}

	return dependencies;
}

/**
 * Create a markdown dependency extractor instance
 */
export function createMarkdownDependencyExtractor() {
	return {
		extract: extractMarkdownDependencies,
	};
}
