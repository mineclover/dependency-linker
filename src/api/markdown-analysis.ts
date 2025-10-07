/**
 * Markdown Analysis API
 * 마크다운 파일 분석을 위한 API
 */

import type { LinkTrackingResult } from "../parsers/markdown/MarkdownLinkTracker";
import { MarkdownLinkTracker } from "../parsers/markdown/MarkdownLinkTracker";
import type { MarkdownParseResult } from "../parsers/markdown/MarkdownParser";
import { MarkdownParser } from "../parsers/markdown/MarkdownParser";
import type { MarkdownRDFResult } from "../parsers/markdown/MarkdownRDFIntegration";
import { MarkdownRDFIntegration } from "../parsers/markdown/MarkdownRDFIntegration";

// ===== MARKDOWN ANALYSIS API =====

/**
 * 마크다운 파일 분석
 */
export async function analyzeMarkdownFile(
	sourceCode: string,
	filePath: string,
	projectName: string,
): Promise<MarkdownParseResult> {
	const parser = new MarkdownParser();
	return await parser.parseMarkdown(sourceCode, filePath, projectName);
}

/**
 * 마크다운 파일 RDF 분석
 */
export async function analyzeMarkdownFileWithRDF(
	sourceCode: string,
	filePath: string,
	projectName: string,
): Promise<MarkdownRDFResult> {
	const integration = new MarkdownRDFIntegration();
	return await integration.analyzeMarkdownWithRDF(
		sourceCode,
		filePath,
		projectName,
	);
}

/**
 * 마크다운 파일 링크 추적
 */
export async function trackMarkdownLinks(
	filePath: string,
	projectName: string,
	projectRoot: string,
): Promise<LinkTrackingResult> {
	const tracker = new MarkdownLinkTracker(projectRoot);
	return await tracker.trackLinks(filePath, projectName);
}

/**
 * 마크다운 프로젝트 링크 추적
 */
export async function trackMarkdownProjectLinks(
	projectName: string,
	markdownFiles: string[],
	projectRoot: string,
): Promise<LinkTrackingResult[]> {
	const tracker = new MarkdownLinkTracker(projectRoot);
	return await tracker.trackProjectLinks(projectName, markdownFiles);
}

/**
 * 마크다운 헤딩 추출
 */
export async function extractMarkdownHeadings(
	sourceCode: string,
	filePath: string,
	projectName: string,
): Promise<{
	headings: Array<{
		level: number;
		text: string;
		anchorId: string;
		line: number;
	}>;
	totalCount: number;
}> {
	const parser = new MarkdownParser();
	const result = await parser.parseMarkdown(sourceCode, filePath, projectName);

	const headings = result.symbols
		.filter((symbol) => symbol.type === "heading")
		.map((symbol) => ({
			level: symbol.level || 1,
			text: symbol.name,
			anchorId: symbol.anchorId || "",
			line: symbol.location.line,
		}));

	return {
		headings,
		totalCount: headings.length,
	};
}

/**
 * 마크다운 링크 추출
 */
export async function extractMarkdownLinks(
	sourceCode: string,
	filePath: string,
	projectName: string,
): Promise<{
	links: Array<{
		text: string;
		url: string;
		type: "internal" | "external" | "anchor";
		line: number;
	}>;
	totalCount: number;
}> {
	const parser = new MarkdownParser();
	const result = await parser.parseMarkdown(sourceCode, filePath, projectName);

	const links = result.links.map((link) => ({
		text: link.text,
		url: link.url,
		type: link.type,
		line: link.location.line,
	}));

	return {
		links,
		totalCount: links.length,
	};
}

/**
 * 마크다운 파일 통계
 */
export async function getMarkdownFileStatistics(
	sourceCode: string,
	filePath: string,
	projectName: string,
): Promise<{
	headings: number;
	links: number;
	images: number;
	codeBlocks: number;
	totalSymbols: number;
	fileSize: number;
	lineCount: number;
}> {
	const parser = new MarkdownParser();
	const result = await parser.parseMarkdown(sourceCode, filePath, projectName);

	const headings = result.symbols.filter((s) => s.type === "heading").length;
	const images = result.symbols.filter((s) => s.type === "image").length;
	const codeBlocks = result.symbols.filter(
		(s) => s.type === "code_block",
	).length;
	const links = result.links.length;

	const lineCount = sourceCode.split("\n").length;
	const fileSize = Buffer.byteLength(sourceCode, "utf8");

	return {
		headings,
		links,
		images,
		codeBlocks,
		totalSymbols: result.symbols.length,
		fileSize,
		lineCount,
	};
}
