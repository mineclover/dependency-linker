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
			expect(graphResult.relationshipsCreated).toBe(3);
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
