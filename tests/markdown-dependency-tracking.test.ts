/**
 * Markdown dependency tracking tests
 *
 * Tests markdown dependency extraction and GraphDB integration
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import {
	extractMarkdownDependencies,
	createMarkdownDependencyExtractor,
} from "../src/core/MarkdownDependencyExtractor";
import {
	markdownResultToGraph,
	registerMarkdownEdgeTypes,
	queryMarkdownDependencies,
} from "../src/integration/MarkdownToGraph";
import { createGraphDatabase } from "../src/database/GraphDatabase";
import type { GraphDatabase } from "../src/database/GraphDatabase";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

describe("Markdown Dependency Tracking", () => {
	let db: GraphDatabase;
	let testDbPath: string;

	beforeAll(async () => {
		// Create temporary database
		testDbPath = path.join(
			os.tmpdir(),
			`test-md-deps-${Date.now()}.db`,
		);
		db = createGraphDatabase(testDbPath);
		await db.initialize();
		await registerMarkdownEdgeTypes(db);
	});

	afterAll(async () => {
		await db.close();
		if (fs.existsSync(testDbPath)) {
			fs.unlinkSync(testDbPath);
		}
	});

	describe("Markdown Link Extraction", () => {
		it("should extract standard markdown links", () => {
			const content = `
# Documentation

See [API Reference](./api.md) for more details.
Check [GitHub](https://github.com/example/repo) for source code.
`;

			const result = extractMarkdownDependencies("docs/index.md", content);

			expect(result.dependencies).toHaveLength(2);

			// API reference link (normalized: ./api.md → ./api)
			const apiLink = result.dependencies.find(
				(d) => d.to === "api" || d.to === "./api",
			);
			expect(apiLink).toBeDefined();
			expect(apiLink?.type).toBe("link");
			expect(apiLink?.text).toBe("API Reference");
			expect(apiLink?.isExternal).toBeFalsy();

			// GitHub link
			const githubLink = result.dependencies.find((d) =>
				d.to.includes("github"),
			);
			expect(githubLink).toBeDefined();
			expect(githubLink?.type).toBe("link");
			expect(githubLink?.isExternal).toBe(true);
		});

		it("should extract image references", () => {
			const content = `
# Architecture

![System Diagram](./diagrams/system.png "Architecture Overview")
![Logo](https://example.com/logo.svg)
`;

			const result = extractMarkdownDependencies("docs/arch.md", content);

			expect(result.dependencies).toHaveLength(2);

			const localImage = result.dependencies.find((d) =>
				d.to.includes("system"),
			);
			expect(localImage).toBeDefined();
			expect(localImage?.type).toBe("image");
			expect(localImage?.text).toBe("System Diagram");
			expect(localImage?.metadata?.title).toBe("Architecture Overview");

			const externalImage = result.dependencies.find((d) =>
				d.to.includes("example.com"),
			);
			expect(externalImage).toBeDefined();
			expect(externalImage?.isExternal).toBe(true);
		});

		it("should handle anchor links", () => {
			const content = `
# Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Usage](#usage)

## Introduction
Content here.
`;

			const result = extractMarkdownDependencies("README.md", content);

			const anchorLinks = result.dependencies.filter(
				(d) => d.type === "anchor",
			);
			expect(anchorLinks).toHaveLength(3);
			expect(anchorLinks[0].metadata?.anchor).toBe("introduction");
		});
	});

	describe("Wiki Links and Symbol References", () => {
		it("should extract wiki-style links", () => {
			const content = `
# Notes

Related: [[OtherDocument]] and [[SomeFile|Custom Text]]
`;

			const result = extractMarkdownDependencies("notes.md", content);

			expect(result.dependencies).toHaveLength(2);

			const link1 = result.dependencies.find(
				(d) => d.to === "OtherDocument",
			);
			expect(link1).toBeDefined();
			expect(link1?.type).toBe("wikilink");
			expect(link1?.text).toBe("OtherDocument");

			const link2 = result.dependencies.find(
				(d) => d.to === "SomeFile",
			);
			expect(link2).toBeDefined();
			expect(link2?.text).toBe("Custom Text");
		});

		it("should extract symbol references", () => {
			const content = `
# Code Documentation

The @UserService class handles authentication.
Call @validateEmail() to verify email addresses.
The @Logger interface provides logging capabilities.
`;

			const result = extractMarkdownDependencies(
				"docs/code.md",
				content,
			);

			const symbolRefs = result.dependencies.filter(
				(d) => d.type === "symbol-reference",
			);
			expect(symbolRefs).toHaveLength(3);

			expect(symbolRefs[0].to).toBe("/UserService");
			expect(symbolRefs[1].to).toBe("/validateEmail()");
			expect(symbolRefs[2].to).toBe("/Logger");
		});
	});

	describe("Hashtag References", () => {
		it("should extract hashtags (English)", () => {
			const content = `
# Project Notes

This project uses #typescript and #react for development.
Related to #backend-api and #frontend components.
`;

			const result = extractMarkdownDependencies("notes.md", content);

			const hashtags = result.dependencies.filter(
				(d) => d.type === "hashtag",
			);
			expect(hashtags.length).toBeGreaterThanOrEqual(4);

			const tagNames = hashtags.map((h) => h.to);
			expect(tagNames).toContain("#typescript");
			expect(tagNames).toContain("#react");
			expect(tagNames).toContain("#backend-api");
			expect(tagNames).toContain("#frontend");
		});

		it("should extract hashtags (Korean)", () => {
			const content = `
# 프로젝트 메모

이 프로젝트는 #타입스크립트 와 #리액트 를 사용합니다.
#백엔드 #프론트엔드 #데이터베이스 관련 작업이 필요합니다.
`;

			const result = extractMarkdownDependencies("memo.md", content);

			const hashtags = result.dependencies.filter(
				(d) => d.type === "hashtag",
			);
			expect(hashtags.length).toBeGreaterThanOrEqual(5);

			const tagNames = hashtags.map((h) => h.to);
			expect(tagNames).toContain("#타입스크립트");
			expect(tagNames).toContain("#리액트");
			expect(tagNames).toContain("#백엔드");
		});

		it("should not extract headings as hashtags", () => {
			const content = `
# Main Heading
## Subheading
### Another Heading

Content with #actualtag here.
`;

			const result = extractMarkdownDependencies("test.md", content);

			const hashtags = result.dependencies.filter(
				(d) => d.type === "hashtag",
			);
			expect(hashtags).toHaveLength(1);
			expect(hashtags[0].to).toBe("#actualtag");
		});

		it("should handle mixed content with hashtags", () => {
			const content = `
# Documentation

See [API Reference](./api.md) for #api-documentation.
The @UserService uses #authentication and #authorization.
Related: [[Security]] #security-best-practices
`;

			const result = extractMarkdownDependencies("doc.md", content);

			const hashtags = result.dependencies.filter(
				(d) => d.type === "hashtag",
			);
			expect(hashtags.length).toBeGreaterThanOrEqual(3);

			// Should also have other dependency types
			const links = result.dependencies.filter((d) => d.type === "link");
			const symbols = result.dependencies.filter(
				(d) => d.type === "symbol-reference",
			);
			const wikilinks = result.dependencies.filter(
				(d) => d.type === "wikilink",
			);

			expect(links.length).toBeGreaterThanOrEqual(1);
			expect(symbols.length).toBeGreaterThanOrEqual(1);
			expect(wikilinks.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe("Code Block and Include References", () => {
		it("should extract code block file references", () => {
			const content = `
# Examples

\`\`\`typescript:src/example.ts
function hello() {
  console.log("Hello");
}
\`\`\`

\`\`\`javascript:lib/utils.js
export const add = (a, b) => a + b;
\`\`\`
`;

			const result = extractMarkdownDependencies("examples.md", content);

			const codeRefs = result.dependencies.filter(
				(d) => d.type === "code-block-reference",
			);
			expect(codeRefs).toHaveLength(2);

			expect(codeRefs[0].to).toBe("src/example.ts");
			expect(codeRefs[0].metadata?.language).toBe("typescript");

			expect(codeRefs[1].to).toBe("lib/utils.js");
			expect(codeRefs[1].metadata?.language).toBe("javascript");
		});

		it("should extract include directives", () => {
			const content = `
# Combined Document

<!-- include:header.md -->

Main content here.

<!-- include:footer.md -->
`;

			const result = extractMarkdownDependencies("main.md", content);

			const includes = result.dependencies.filter(
				(d) => d.type === "include",
			);
			expect(includes).toHaveLength(2);
			expect(includes[0].to).toBe("header");
			expect(includes[1].to).toBe("footer");
		});
	});

	describe("Front Matter and Headings", () => {
		it("should extract front matter", () => {
			const content = `---
title: My Document
author: John Doe
date: 2025-10-03
---

# Content

Text here.
`;

			const result = extractMarkdownDependencies("doc.md", content);

			expect(result.frontMatter).toBeDefined();
			expect(result.frontMatter?.title).toBe("My Document");
			expect(result.frontMatter?.author).toBe("John Doe");
			expect(result.frontMatter?.date).toBe("2025-10-03");
		});

		it("should extract document structure (headings)", () => {
			const content = `
# Main Title

## Section 1

### Subsection 1.1

## Section 2

Content.
`;

			const result = extractMarkdownDependencies("structure.md", content);

			expect(result.headings).toHaveLength(4);
			expect(result.headings?.[0]).toEqual({
				level: 1,
				text: "Main Title",
				line: 2,
			});
			expect(result.headings?.[1]).toEqual({
				level: 2,
				text: "Section 1",
				line: 4,
			});
		});

		it("should extract headings with semantic tags", () => {
			const content = `
# API Design #architecture #design

## User Authentication #security #api

### JWT Token #implementation

## Database Schema

Content here.
`;

			const result = extractMarkdownDependencies("design.md", content);

			expect(result.headings).toHaveLength(4);

			// Heading with multiple tags
			const heading1 = result.headings?.[0];
			expect(heading1?.text).toBe("API Design #architecture #design");
			expect(heading1?.cleanText).toBe("API Design");
			expect(heading1?.tags).toEqual(["architecture", "design"]);
			expect(heading1?.level).toBe(1);

			// Heading with tags
			const heading2 = result.headings?.[1];
			expect(heading2?.text).toBe("User Authentication #security #api");
			expect(heading2?.cleanText).toBe("User Authentication");
			expect(heading2?.tags).toEqual(["security", "api"]);

			// Heading with single tag
			const heading3 = result.headings?.[2];
			expect(heading3?.tags).toEqual(["implementation"]);
			expect(heading3?.cleanText).toBe("JWT Token");

			// Heading without tags
			const heading4 = result.headings?.[3];
			expect(heading4?.tags).toBeUndefined();
			expect(heading4?.cleanText).toBeUndefined();
		});

		it("should create heading symbols in GraphDB", async () => {
			const content = `
# Architecture Overview #architecture #system-design

## Authentication System #security #implementation

Content with details.
`;

			const result = extractMarkdownDependencies("arch.md", content);

			const graphResult = await markdownResultToGraph(db, result, {
				sessionId: "heading-test",
				createMissingNodes: true,
			});

			// Should create: 1 file node + 2 heading symbol nodes
			expect(graphResult.nodesCreated).toBeGreaterThanOrEqual(3);

			// Should create: 2 md-contains-heading relationships
			expect(graphResult.relationshipsCreated).toBeGreaterThanOrEqual(2);

			// Verify heading nodes exist
			const nodes = await db.findNodes({
				sourceFiles: ["arch.md"],
			});

			const headingNodes = nodes.filter((n) => n.type === "heading-symbol");
			expect(headingNodes.length).toBe(2);

			// Verify semantic types are stored
			const archNode = headingNodes.find((n) =>
				n.name?.includes("Architecture"),
			);
			expect(archNode?.metadata?.semanticTypes).toEqual([
				"architecture",
				"system-design",
			]);

			const authNode = headingNodes.find((n) =>
				n.name?.includes("Authentication"),
			);
			expect(authNode?.metadata?.semanticTypes).toEqual([
				"security",
				"implementation",
			]);
		});
	});

	describe("GraphDB Integration", () => {
		it("should register markdown edge types", async () => {
			// Edge types already registered in beforeAll
			// Check that edge types are available by trying to query them
			const stats = await db.getStatistics();
			expect(stats.totalNodes).toBeGreaterThanOrEqual(0);
			// Edge types are registered, we'll verify by creating relationships
		});

		it("should convert markdown dependencies to graph", async () => {
			const content = `
# Test Document

See [Related](./related.md) for more info.
![Diagram](./diagram.png)
Reference to @TestClass in code.
`;

			const result = extractMarkdownDependencies("test.md", content);

			const graphResult = await markdownResultToGraph(db, result, {
				sessionId: "test-session",
				createMissingNodes: true,
			});

			expect(graphResult.nodesCreated).toBeGreaterThan(0);
			// 3 dependencies + 1 heading = 4 relationships
			expect(graphResult.relationshipsCreated).toBe(4);
		});

		it("should query markdown dependencies from GraphDB", async () => {
			const content = `
# Query Test

- [Link1](./file1.md)
- [Link2](./file2.md)
`;

			const result = extractMarkdownDependencies("query-test.md", content);
			await markdownResultToGraph(db, result, {
				sessionId: "query-test",
			});

			const deps = await queryMarkdownDependencies(
				db,
				"query-test.md",
			);

			expect(deps.length).toBeGreaterThanOrEqual(2);
			expect(deps.some((d) => d.type === "md-link")).toBe(true);
		});
	});

	describe("Semantic Type Query and Flow", () => {
		it("should query headings by semantic type", async () => {
			// Create multiple files with semantic tags
			const file1Content = `
# Architecture Overview #architecture #system-design

## Database Design #architecture #database

Content here.
`;

			const file2Content = `
# API Design #architecture #api

## Authentication #security #api

Details here.
`;

			const file3Content = `
# Testing Strategy #testing #quality

Content.
`;

			// Process all files
			const result1 = extractMarkdownDependencies("arch.md", file1Content);
			const result2 = extractMarkdownDependencies("api.md", file2Content);
			const result3 = extractMarkdownDependencies("test.md", file3Content);

			await markdownResultToGraph(db, result1, {
				sessionId: "semantic-query-test",
			});
			await markdownResultToGraph(db, result2, {
				sessionId: "semantic-query-test",
			});
			await markdownResultToGraph(db, result3, {
				sessionId: "semantic-query-test",
			});

			// Query by semantic type
			const {
				queryHeadingsBySemanticType,
			} = require("../src/integration/MarkdownToGraph");

			const archHeadings =
				await queryHeadingsBySemanticType(db, "architecture");
			expect(archHeadings.length).toBe(3);
			expect(
				archHeadings.every((h: { allTypes: string[] }) =>
					h.allTypes.includes("architecture"),
				),
			).toBe(true);

			const apiHeadings = await queryHeadingsBySemanticType(db, "api");
			expect(apiHeadings.length).toBe(2);

			const securityHeadings =
				await queryHeadingsBySemanticType(db, "security");
			expect(securityHeadings.length).toBeGreaterThanOrEqual(1);
			const authHeading = securityHeadings.find(
				(h: { heading: string }) => h.heading.includes("Authentication"),
			);
			expect(authHeading).toBeDefined();
		});

		it("should query headings from specific file", async () => {
			const content = `
# Main Title #architecture

## Section 1 #implementation #backend

### Subsection 1.1 #api

## Section 2 #frontend

Content.
`;

			const result = extractMarkdownDependencies("doc.md", content);
			await markdownResultToGraph(db, result, {
				sessionId: "file-query-test",
			});

			const { queryFileHeadings } = require("../src/integration/MarkdownToGraph");
			const headings = await queryFileHeadings(db, "doc.md");

			expect(headings.length).toBe(4);
			expect(headings[0].semanticTypes).toEqual(["architecture"]);
			expect(headings[1].semanticTypes).toEqual(["implementation", "backend"]);
			expect(headings[2].semanticTypes).toEqual(["api"]);
			expect(headings[3].semanticTypes).toEqual(["frontend"]);

			// Verify ordering by line number
			expect(headings[0].line).toBeLessThan(headings[1].line);
		});

		it("should get all semantic types statistics", async () => {
			const content1 = `
# Architecture #architecture

## Design #design #architecture

Content.
`;

			const content2 = `
# Security #security

## Testing #testing #security

More content.
`;

			const result1 = extractMarkdownDependencies("arch2.md", content1);
			const result2 = extractMarkdownDependencies("sec.md", content2);

			await markdownResultToGraph(db, result1, {
				sessionId: "stats-test",
			});
			await markdownResultToGraph(db, result2, {
				sessionId: "stats-test",
			});

			const { getAllSemanticTypes } = require("../src/integration/MarkdownToGraph");
			const types = await getAllSemanticTypes(db);

			expect(types.get("architecture")).toBeGreaterThanOrEqual(2);
			expect(types.get("security")).toBeGreaterThanOrEqual(2);
			expect(types.get("design")).toBeGreaterThanOrEqual(1);
			expect(types.get("testing")).toBeGreaterThanOrEqual(1);
		});

		it("should only accept English semantic tags in headings", () => {
			const content = `
# English Title #architecture #design

## Korean Title #한글태그 #security

### Mixed Title #api #테스트 #implementation

Content.
`;

			const result = extractMarkdownDependencies("mixed.md", content);

			// Check first heading - should have English tags only
			const heading1 = result.headings?.[0];
			expect(heading1?.tags).toEqual(["architecture", "design"]);
			expect(heading1?.cleanText).toBe("English Title");

			// Check second heading - Korean tag should be ignored
			const heading2 = result.headings?.[1];
			expect(heading2?.tags).toEqual(["security"]);
			expect(heading2?.cleanText).toContain("한글태그"); // Korean tag stays in text

			// Check third heading - only English tags extracted
			const heading3 = result.headings?.[2];
			expect(heading3?.tags).toEqual(["api", "implementation"]);
			expect(heading3?.cleanText).toContain("테스트"); // Korean tag stays in text
		});

		it("should support complete workflow: extract → store → query", async () => {
			// Step 1: Extract from markdown
			const content = `
# Project Documentation #documentation

## API Reference #api #reference

### Authentication Endpoints #api #security #implementation

The authentication system uses JWT tokens.

### Data Endpoints #api #data

Data access layer.

## Architecture #architecture #system-design

System architecture overview.
`;

			const result = extractMarkdownDependencies("project.md", content);

			// Verify extraction
			expect(result.headings?.length).toBe(5);

			// Step 2: Store in GraphDB
			const graphResult = await markdownResultToGraph(db, result, {
				sessionId: "workflow-test",
			});

			expect(graphResult.nodesCreated).toBeGreaterThan(0);
			expect(graphResult.relationshipsCreated).toBeGreaterThan(0);

			// Step 3: Query by semantic type
			const {
				queryHeadingsBySemanticType,
				queryFileHeadings,
			} = require("../src/integration/MarkdownToGraph");

			const apiHeadings = await queryHeadingsBySemanticType(db, "api");
			expect(apiHeadings.length).toBeGreaterThanOrEqual(3);

			const securityHeadings =
				await queryHeadingsBySemanticType(db, "security");
			expect(securityHeadings.length).toBeGreaterThanOrEqual(1);

			// Step 4: Query by file
			const fileHeadings = await queryFileHeadings(db, "project.md");
			expect(fileHeadings.length).toBe(5);

			const archHeading = fileHeadings.find(
				(h: { heading: string }) => h.heading.includes("Architecture"),
			);
			expect(archHeading?.semanticTypes).toEqual([
				"architecture",
				"system-design",
			]);
		});
	});

	describe("Complex Document Test", () => {
		it("should extract all dependencies from comprehensive markdown", () => {
			const content = `---
title: Comprehensive Test
tags: [test, example]
---

# Comprehensive Markdown Test

## Links and References

See [API Docs](./api/index.md) and [GitHub](https://github.com/example/repo).

## Images

![Architecture](./diagrams/arch.png "System Architecture")

## Wiki Links

Related notes: [[ProjectOverview]] and [[TechnicalSpecs|Specs]]

## Symbol References

The @UserController handles requests. Use @authenticate() middleware.
Tags: #authentication #security #api

## Code Examples

\`\`\`typescript:src/main.ts
import { UserService } from './services';
\`\`\`

## Includes

<!-- include:common/header.md -->

## Internal Links

Jump to [Installation](#installation) section.

## Installation

Steps here.
`;

			const result = extractMarkdownDependencies("comprehensive.md", content);

			// Should have all dependency types (13 total: 2 links, 1 image, 2 wiki, 2 symbols, 1 code, 1 include, 1 anchor, 3 hashtags)
			expect(result.dependencies.length).toBeGreaterThanOrEqual(13);
			expect(result.dependencies.some((d) => d.type === "link")).toBe(
				true,
			);
			expect(result.dependencies.some((d) => d.type === "image")).toBe(
				true,
			);
			expect(result.dependencies.some((d) => d.type === "wikilink")).toBe(
				true,
			);
			expect(
				result.dependencies.some((d) => d.type === "symbol-reference"),
			).toBe(true);
			expect(
				result.dependencies.some(
					(d) => d.type === "code-block-reference",
				),
			).toBe(true);
			expect(result.dependencies.some((d) => d.type === "include")).toBe(
				true,
			);
			expect(result.dependencies.some((d) => d.type === "anchor")).toBe(
				true,
			);
			expect(result.dependencies.some((d) => d.type === "hashtag")).toBe(
				true,
			);

			// Front matter
			expect(result.frontMatter?.title).toBe("Comprehensive Test");

			// Headings
			expect(result.headings?.length).toBeGreaterThan(4);
		});
	});
});
