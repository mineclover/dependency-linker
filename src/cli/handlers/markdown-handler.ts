/**
 * 마크다운 분석 핸들러
 * 마크다운 관련 CLI 명령어들을 처리
 */

import { MarkdownRDFIntegration } from "../../parsers/markdown/MarkdownRDFIntegration.js";
import { MarkdownLinkTracker } from "../../parsers/markdown/MarkdownLinkTracker.js";
import { MarkdownParser } from "../../parsers/markdown/MarkdownParser.js";
import { MarkdownTagCollector } from "../../parsers/markdown/MarkdownTagCollector.js";
import { MarkdownTagHeadingMapper } from "../../parsers/markdown/MarkdownTagHeadingMapper.js";
import { MarkdownTagConventionManager } from "../../parsers/markdown/MarkdownTagConventionManager.js";
import { MarkdownTagDocumentGenerator } from "../../parsers/markdown/MarkdownTagDocumentGenerator.js";
import { MarkdownTagTypeValidator } from "../../parsers/markdown/MarkdownTagTypeValidator.js";
import { MarkdownTagTypeDocumentationGenerator } from "../../parsers/markdown/MarkdownTagTypeDocumentation.js";
import {
	exampleMarkdown,
	exampleHeadings,
	markdownFiles,
} from "../examples/markdown-examples.js";
import {
	exampleTags,
	exampleTagRelationships,
} from "../examples/tag-examples.js";

/**
 * 마크다운 분석 실행
 */
export async function runMarkdownAnalysis(name: string): Promise<void> {
	try {
		console.log(`📝 Markdown analysis for namespace: ${name}`);
		console.log("Analyzing markdown files...");

		const integration = new MarkdownRDFIntegration();

		const result = await integration.analyzeMarkdownWithRDF(
			exampleMarkdown,
			"test-project",
			"docs/example.md",
		);

		console.log("=".repeat(50));
		console.log(`📊 Markdown Analysis Results:`);
		console.log(`   File: ${(result as any).filePath}`);
		console.log(`   Project: ${(result as any).projectName}`);
		console.log(`   Relationships: ${(result as any).relationships.length}`);

		if ((result as any).relationships.length > 0) {
			console.log(`\n📋 Relationships:`);
			(result as any).relationships?.forEach((rel: any, index: any) => {
				console.log(`   ${index + 1}. ${rel.tag} → ${rel.heading}`);
				console.log(`      Type: ${rel.relationshipType}`);
				console.log(`      Description: ${(rel as any).context?.description}`);
			});
		}

		console.log(`\n📊 Statistics:`);
		if ((result as any).statistics) {
			console.log(`   By Type:`, (result as any).statistics.tagsByType || {});
			console.log(
				`   By Category:`,
				(result as any).statistics.tagsByCategory || {},
			);
			console.log(
				`   Most Used:`,
				(result as any).statistics.mostUsedTags?.slice(0, 5) || [],
			);
		} else {
			console.log(`   Statistics not available`);
		}

		console.log(`\n✅ Markdown analysis completed for namespace: ${name}`);
	} catch (error) {
		console.error(`❌ Markdown analysis failed for namespace ${name}:`, error);
		throw error;
	}
}

/**
 * 링크 추적 실행
 */
export async function runLinkTracking(name: string): Promise<void> {
	try {
		console.log(`🔗 Link tracking for namespace: ${name}`);
		console.log("Tracking markdown links...");

		const tracker = new MarkdownLinkTracker(process.cwd());

		const results = await tracker.trackProjectLinks(
			markdownFiles as any,
			[] as any, // projectRoot
		);

		console.log("=".repeat(50));
		console.log(`📊 Link Tracking Results:`);
		console.log(`   Files analyzed: ${results.length}`);

		results.forEach((result, index) => {
			console.log(`\n📄 File ${index + 1}: ${(result as any).sourceFile}`);
			console.log(`   Target files: ${(result as any).targetFiles.length}`);
			console.log(`   Relationships: ${(result as any).relationships.length}`);
			console.log(`   Broken links: ${(result as any).brokenLinks.length}`);
			console.log(`   External links: ${(result as any).externalLinks.length}`);
		});

		console.log(`\n✅ Link tracking completed for namespace: ${name}`);
	} catch (error) {
		console.error(`❌ Link tracking failed for namespace ${name}:`, error);
		throw error;
	}
}

/**
 * 헤딩 추출 실행
 */
export async function runHeadingExtraction(name: string): Promise<void> {
	try {
		console.log(`📋 Heading extraction for namespace: ${name}`);
		console.log("Extracting markdown headings...");

		const parser = new MarkdownParser();

		const result = await parser.parseMarkdown(exampleMarkdown);

		console.log("=".repeat(50));
		console.log(`📊 Heading Extraction Results:`);
		console.log(`   Total headings: ${(result as any).headings?.length || 0}`);

		if ((result as any).headings?.length > 0) {
			console.log(`\n📋 Headings:`);
			(result as any).headings.forEach((heading: any, index: any) => {
				console.log(
					`   ${index + 1}. ${"#".repeat(heading.level)} ${heading.text}`,
				);
				console.log(`      Line: ${heading.line}, Column: ${heading.column}`);
			});
		}

		console.log(`\n📊 Statistics:`);
		console.log(
			`   By Level:`,
			(result as any).statistics?.headingsByLevel || {},
		);
		console.log(
			`   Average Depth: ${((result as any).statistics?.averageDepth || 0).toFixed(2)}`,
		);
		console.log(`   Max Depth: ${(result as any).statistics?.maxDepth || 0}`);

		console.log(`\n✅ Heading extraction completed for namespace: ${name}`);
	} catch (error) {
		console.error(`❌ Heading extraction failed for namespace ${name}:`, error);
		throw error;
	}
}

/**
 * 태그 수집 실행
 */
export async function runTagCollection(name: string): Promise<void> {
	try {
		console.log(`🏷️  Tag collection for namespace: ${name}`);
		console.log("Collecting markdown tags...");

		const collector = new MarkdownTagCollector();

		const result = await collector.collectTags(
			exampleMarkdown,
			"test-project",
			"docs/example.md",
		);

		console.log("=".repeat(50));
		console.log(`📊 Tag Collection Results:`);
		console.log(`   File: ${(result as any).filePath}`);
		console.log(`   Project: ${(result as any).projectName}`);
		console.log(`   Relationships: ${(result as any).relationships.length}`);

		if (result.tags.length > 0) {
			console.log(`\n🏷️  Tags:`);
			result.tags.forEach((tag, index) => {
				console.log(`   ${index + 1}. ${tag.name} (${tag.type})`);
				console.log(
					`      Location: Line ${tag.location.line}, Column ${tag.location.column}`,
				);
				console.log(
					`      Category: ${(tag.metadata as any)?.category || "uncategorized"}`,
				);
				console.log(`      Priority: ${(tag.metadata as any)?.priority || 1}`);
			});
		}

		if ((result as any).relationships.length > 0) {
			console.log(`\n🔗 Relationships:`);
			(result as any).relationships?.forEach((rel: any, index: any) => {
				console.log(`   ${index + 1}. ${rel.tag} → ${rel.heading}`);
				console.log(`      Type: ${rel.relationshipType}`);
				console.log(`      Description: ${(rel as any).context?.description}`);
			});
		}

		console.log(`\n📊 Statistics:`);
		console.log(`   By Type:`, (result as any).statistics.tagsByType);
		console.log(`   By Category:`, (result as any).statistics.tagsByCategory);
		console.log(
			`   Most Used:`,
			(result as any).statistics.mostUsedTags.slice(0, 5),
		);

		console.log(`\n✅ Tag collection completed for namespace: ${name}`);
	} catch (error) {
		console.error(`❌ Tag collection failed for namespace ${name}:`, error);
		throw error;
	}
}

/**
 * 태그-헤딩 매핑 실행
 */
export async function runTagHeadingMapping(name: string): Promise<void> {
	try {
		console.log(`🗺️  Tag-heading mapping for namespace: ${name}`);
		console.log("Mapping tag-heading relationships...");

		const mapper = new MarkdownTagHeadingMapper();

		const result = await mapper.mapTagHeadingRelationships(
			exampleHeadings as any,
			exampleTags as any,
			"test-project",
		);

		console.log("=".repeat(50));
		console.log(`📊 Tag-Heading Mapping Results:`);
		console.log(`   File: ${(result as any).filePath}`);
		console.log(`   Project: ${(result as any).projectName}`);

		if (result.relationships.length > 0) {
			console.log(`\n🗺️  Relationships:`);
			result.relationships.forEach((rel, index) => {
				console.log(`   ${index + 1}. ${rel.tag} → ${rel.heading}`);
				console.log(`      Type: ${(rel as any).relationshipType}`);
				console.log(`      Description: ${(rel as any).context?.description}`);
			});
		}

		console.log(`\n📊 Statistics:`);
		console.log(
			`   Tags with Headings: ${(result as any).statistics.tagsWithHeadings}`,
		);
		console.log(
			`   Headings with Tags: ${(result as any).statistics.headingsWithTags}`,
		);
		console.log(`   Orphaned Tags: ${(result as any).statistics.orphanedTags}`);
		console.log(
			`   Orphaned Headings: ${(result as any).statistics.orphanedHeadings}`,
		);

		console.log(`\n✅ Tag-heading mapping completed for namespace: ${name}`);
	} catch (error) {
		console.error(
			`❌ Tag-heading mapping failed for namespace ${name}:`,
			error,
		);
		throw error;
	}
}

/**
 * 태그 문서 생성 실행
 */
export async function runTagDocumentGeneration(name: string): Promise<void> {
	try {
		console.log(`📝 Tag document generation for namespace: ${name}`);
		console.log("Generating tag convention documentation...");

		const conventionManager = new MarkdownTagConventionManager();
		const documentGenerator = new MarkdownTagDocumentGenerator();

		// 태그 컨벤션 분석
		const analysisResults = await conventionManager.analyzeTags(
			{ tags: exampleTags, relationships: exampleTagRelationships } as any,
			"docs/example.md",
		);

		// 태그 컨벤션 문서 생성
		const document = await documentGenerator.generateTagConventionDocument(
			analysisResults as any, // analysisResults,
			{
				// outputDir: "./docs",
				format: "markdown",
				sections: [] as any, // {
				// tagList: true,
				// statistics: true,
				// usageGuide: true,
				// tagRelationships: true,
				// definitions: true,
				// },
				// style: {
				// 	tableStyle: "pipe",
				// 	codeBlockStyle: "fenced",
				// 	linkStyle: "inline",
				// },
			},
		);

		console.log("=".repeat(50));
		console.log(`📊 Tag Document Generation Results:`);
		console.log(`   Title: ${(document as any).title}`);
		console.log(`   File Path: ${(document as any).filePath}`);
		console.log(
			`   Generated At: ${(document as any).generatedAt.toLocaleString("ko-KR")}`,
		);
		console.log(`   File Size: ${(document as any).metadata.fileSize} bytes`);
		console.log(`   Tag Count: ${(document as any).metadata.tagCount}`);
		console.log(
			`   Convention Count: ${(document as any).metadata.conventionCount}`,
		);

		console.log(
			`\n✅ Tag document generation completed for namespace: ${name}`,
		);
	} catch (error) {
		console.error(
			`❌ Tag document generation failed for namespace ${name}:`,
			error,
		);
		throw error;
	}
}

/**
 * 태그 타입 검증 실행
 */
export async function runTagTypeValidation(name: string): Promise<void> {
	try {
		console.log(`🔍 Tag type validation for namespace: ${name}`);
		console.log("Validating tag types...");

		const validator = new MarkdownTagTypeValidator();

		const result = await (validator as any).validateTagTypes(
			exampleTags,
			"test-project",
		);

		console.log("=".repeat(50));
		console.log(`📊 Tag Type Validation Results:`);
		console.log(`   Total validations: ${result.validations.length}`);

		if (result.validations.length > 0) {
			console.log(`\n🔍 Validations:`);
			(result as any).validations?.forEach((validation: any, index: any) => {
				console.log(
					`   ${index + 1}. ${validation.tagName} (${validation.tagType})`,
				);
				console.log(`      Valid: ${validation.isValid ? "✅" : "❌"}`);
				console.log(
					`      Confidence: ${(validation.confidence * 100).toFixed(1)}%`,
				);

				if (validation.suggestions.length > 0) {
					console.log(`      Suggestions:`);
					(validation as any).suggestions?.forEach((suggestion: any) => {
						console.log(`         - ${suggestion}`);
					});
				}
			});
		}

		console.log(`\n📊 Statistics:`);
		console.log(`   Valid Tags: ${result.statistics.validTags}`);
		console.log(`   Invalid Tags: ${result.statistics.invalidTags}`);
		console.log(
			`   Validation Rate: ${(result.statistics.validationRate * 100).toFixed(1)}%`,
		);

		console.log(`\n✅ Tag type validation completed for namespace: ${name}`);
	} catch (error) {
		console.error(
			`❌ Tag type validation failed for namespace ${name}:`,
			error,
		);
		throw error;
	}
}

/**
 * 태그 타입 문서 생성 실행
 */
export async function runTagTypeDocumentGeneration(
	name: string,
): Promise<void> {
	try {
		console.log(`📝 Tag type document generation for namespace: ${name}`);
		console.log("Generating tag type documentation...");

		const validator = new MarkdownTagTypeValidator();
		const documentGenerator = new MarkdownTagTypeDocumentationGenerator();

		const result = await (validator as any).validateTagTypes(
			exampleTags,
			"test-project",
		);

		const document =
			await documentGenerator.generateTagTypeDocumentation(result);

		console.log("=".repeat(50));
		console.log(`📊 Tag Type Document Generation Results:`);
		console.log(`   Title: ${document.title}`);
		console.log(`   File Path: ${(document as any).filePath || "Unknown"}`);
		console.log(
			`   Generated At: ${document.generatedAt.toLocaleString("ko-KR")}`,
		);

		console.log(
			`\n✅ Tag type document generation completed for namespace: ${name}`,
		);
	} catch (error) {
		console.error(
			`❌ Tag type document generation failed for namespace ${name}:`,
			error,
		);
		throw error;
	}
}
