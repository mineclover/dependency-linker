"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const MarkdownDependencyExtractor_1 = require("../src/core/MarkdownDependencyExtractor");
const MarkdownToGraph_1 = require("../src/integration/MarkdownToGraph");
const GraphDatabase_1 = require("../src/database/GraphDatabase");
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const os = __importStar(require("node:os"));
(0, globals_1.describe)("Markdown Dependency Tracking", () => {
    let db;
    let testDbPath;
    (0, globals_1.beforeAll)(async () => {
        testDbPath = path.join(os.tmpdir(), `test-md-deps-${Date.now()}.db`);
        db = (0, GraphDatabase_1.createGraphDatabase)(testDbPath);
        await db.initialize();
        await (0, MarkdownToGraph_1.registerMarkdownEdgeTypes)(db);
    });
    (0, globals_1.afterAll)(async () => {
        await db.close();
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });
    (0, globals_1.describe)("Markdown Link Extraction", () => {
        (0, globals_1.it)("should extract standard markdown links", () => {
            const content = `
# Documentation

See [API Reference](./api.md) for more details.
Check [GitHub](https://github.com/example/repo) for source code.
`;
            const result = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("docs/index.md", content);
            (0, globals_1.expect)(result.dependencies).toHaveLength(2);
            const apiLink = result.dependencies.find((d) => d.to === "api" || d.to === "./api");
            (0, globals_1.expect)(apiLink).toBeDefined();
            (0, globals_1.expect)(apiLink?.type).toBe("link");
            (0, globals_1.expect)(apiLink?.text).toBe("API Reference");
            (0, globals_1.expect)(apiLink?.isExternal).toBeFalsy();
            const githubLink = result.dependencies.find((d) => d.to.includes("github"));
            (0, globals_1.expect)(githubLink).toBeDefined();
            (0, globals_1.expect)(githubLink?.type).toBe("link");
            (0, globals_1.expect)(githubLink?.isExternal).toBe(true);
        });
        (0, globals_1.it)("should extract image references", () => {
            const content = `
# Architecture

![System Diagram](./diagrams/system.png "Architecture Overview")
![Logo](https://example.com/logo.svg)
`;
            const result = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("docs/arch.md", content);
            (0, globals_1.expect)(result.dependencies).toHaveLength(2);
            const localImage = result.dependencies.find((d) => d.to.includes("system"));
            (0, globals_1.expect)(localImage).toBeDefined();
            (0, globals_1.expect)(localImage?.type).toBe("image");
            (0, globals_1.expect)(localImage?.text).toBe("System Diagram");
            (0, globals_1.expect)(localImage?.metadata?.title).toBe("Architecture Overview");
            const externalImage = result.dependencies.find((d) => d.to.includes("example.com"));
            (0, globals_1.expect)(externalImage).toBeDefined();
            (0, globals_1.expect)(externalImage?.isExternal).toBe(true);
        });
        (0, globals_1.it)("should handle anchor links", () => {
            const content = `
# Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Usage](#usage)

## Introduction
Content here.
`;
            const result = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("README.md", content);
            const anchorLinks = result.dependencies.filter((d) => d.type === "anchor");
            (0, globals_1.expect)(anchorLinks).toHaveLength(3);
            (0, globals_1.expect)(anchorLinks[0].metadata?.anchor).toBe("introduction");
        });
    });
    (0, globals_1.describe)("Wiki Links and Symbol References", () => {
        (0, globals_1.it)("should extract wiki-style links", () => {
            const content = `
# Notes

Related: [[OtherDocument]] and [[SomeFile|Custom Text]]
`;
            const result = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("notes.md", content);
            (0, globals_1.expect)(result.dependencies).toHaveLength(2);
            const link1 = result.dependencies.find((d) => d.to === "OtherDocument");
            (0, globals_1.expect)(link1).toBeDefined();
            (0, globals_1.expect)(link1?.type).toBe("wikilink");
            (0, globals_1.expect)(link1?.text).toBe("OtherDocument");
            const link2 = result.dependencies.find((d) => d.to === "SomeFile");
            (0, globals_1.expect)(link2).toBeDefined();
            (0, globals_1.expect)(link2?.text).toBe("Custom Text");
        });
        (0, globals_1.it)("should extract symbol references", () => {
            const content = `
# Code Documentation

The @UserService class handles authentication.
Call @validateEmail() to verify email addresses.
The @Logger interface provides logging capabilities.
`;
            const result = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("docs/code.md", content);
            const symbolRefs = result.dependencies.filter((d) => d.type === "symbol-reference");
            (0, globals_1.expect)(symbolRefs).toHaveLength(3);
            (0, globals_1.expect)(symbolRefs[0].to).toBe("/UserService");
            (0, globals_1.expect)(symbolRefs[1].to).toBe("/validateEmail()");
            (0, globals_1.expect)(symbolRefs[2].to).toBe("/Logger");
        });
    });
    (0, globals_1.describe)("Hashtag References", () => {
        (0, globals_1.it)("should extract hashtags (English)", () => {
            const content = `
# Project Notes

This project uses #typescript and #react for development.
Related to #backend-api and #frontend components.
`;
            const result = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("notes.md", content);
            const hashtags = result.dependencies.filter((d) => d.type === "hashtag");
            (0, globals_1.expect)(hashtags.length).toBeGreaterThanOrEqual(4);
            const tagNames = hashtags.map((h) => h.to);
            (0, globals_1.expect)(tagNames).toContain("#typescript");
            (0, globals_1.expect)(tagNames).toContain("#react");
            (0, globals_1.expect)(tagNames).toContain("#backend-api");
            (0, globals_1.expect)(tagNames).toContain("#frontend");
        });
        (0, globals_1.it)("should extract hashtags (Korean)", () => {
            const content = `
# 프로젝트 메모

이 프로젝트는 #타입스크립트 와 #리액트 를 사용합니다.
#백엔드 #프론트엔드 #데이터베이스 관련 작업이 필요합니다.
`;
            const result = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("memo.md", content);
            const hashtags = result.dependencies.filter((d) => d.type === "hashtag");
            (0, globals_1.expect)(hashtags.length).toBeGreaterThanOrEqual(5);
            const tagNames = hashtags.map((h) => h.to);
            (0, globals_1.expect)(tagNames).toContain("#타입스크립트");
            (0, globals_1.expect)(tagNames).toContain("#리액트");
            (0, globals_1.expect)(tagNames).toContain("#백엔드");
        });
        (0, globals_1.it)("should not extract headings as hashtags", () => {
            const content = `
# Main Heading
## Subheading
### Another Heading

Content with #actualtag here.
`;
            const result = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("test.md", content);
            const hashtags = result.dependencies.filter((d) => d.type === "hashtag");
            (0, globals_1.expect)(hashtags).toHaveLength(1);
            (0, globals_1.expect)(hashtags[0].to).toBe("#actualtag");
        });
        (0, globals_1.it)("should handle mixed content with hashtags", () => {
            const content = `
# Documentation

See [API Reference](./api.md) for #api-documentation.
The @UserService uses #authentication and #authorization.
Related: [[Security]] #security-best-practices
`;
            const result = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("doc.md", content);
            const hashtags = result.dependencies.filter((d) => d.type === "hashtag");
            (0, globals_1.expect)(hashtags.length).toBeGreaterThanOrEqual(3);
            const links = result.dependencies.filter((d) => d.type === "link");
            const symbols = result.dependencies.filter((d) => d.type === "symbol-reference");
            const wikilinks = result.dependencies.filter((d) => d.type === "wikilink");
            (0, globals_1.expect)(links.length).toBeGreaterThanOrEqual(1);
            (0, globals_1.expect)(symbols.length).toBeGreaterThanOrEqual(1);
            (0, globals_1.expect)(wikilinks.length).toBeGreaterThanOrEqual(1);
        });
    });
    (0, globals_1.describe)("Code Block and Include References", () => {
        (0, globals_1.it)("should extract code block file references", () => {
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
            const result = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("examples.md", content);
            const codeRefs = result.dependencies.filter((d) => d.type === "code-block-reference");
            (0, globals_1.expect)(codeRefs).toHaveLength(2);
            (0, globals_1.expect)(codeRefs[0].to).toBe("src/example.ts");
            (0, globals_1.expect)(codeRefs[0].metadata?.language).toBe("typescript");
            (0, globals_1.expect)(codeRefs[1].to).toBe("lib/utils.js");
            (0, globals_1.expect)(codeRefs[1].metadata?.language).toBe("javascript");
        });
        (0, globals_1.it)("should extract include directives", () => {
            const content = `
# Combined Document

<!-- include:header.md -->

Main content here.

<!-- include:footer.md -->
`;
            const result = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("main.md", content);
            const includes = result.dependencies.filter((d) => d.type === "include");
            (0, globals_1.expect)(includes).toHaveLength(2);
            (0, globals_1.expect)(includes[0].to).toBe("header");
            (0, globals_1.expect)(includes[1].to).toBe("footer");
        });
    });
    (0, globals_1.describe)("Front Matter and Headings", () => {
        (0, globals_1.it)("should extract front matter", () => {
            const content = `---
title: My Document
author: John Doe
date: 2025-10-03
---

# Content

Text here.
`;
            const result = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("doc.md", content);
            (0, globals_1.expect)(result.frontMatter).toBeDefined();
            (0, globals_1.expect)(result.frontMatter?.title).toBe("My Document");
            (0, globals_1.expect)(result.frontMatter?.author).toBe("John Doe");
            (0, globals_1.expect)(result.frontMatter?.date).toBe("2025-10-03");
        });
        (0, globals_1.it)("should extract document structure (headings)", () => {
            const content = `
# Main Title

## Section 1

### Subsection 1.1

## Section 2

Content.
`;
            const result = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("structure.md", content);
            (0, globals_1.expect)(result.headings).toHaveLength(4);
            (0, globals_1.expect)(result.headings?.[0]).toEqual({
                level: 1,
                text: "Main Title",
                line: 2,
            });
            (0, globals_1.expect)(result.headings?.[1]).toEqual({
                level: 2,
                text: "Section 1",
                line: 4,
            });
        });
        (0, globals_1.it)("should extract headings with semantic tags", () => {
            const content = `
# API Design #architecture #design

## User Authentication #security #api

### JWT Token #implementation

## Database Schema

Content here.
`;
            const result = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("design.md", content);
            (0, globals_1.expect)(result.headings).toHaveLength(4);
            const heading1 = result.headings?.[0];
            (0, globals_1.expect)(heading1?.text).toBe("API Design #architecture #design");
            (0, globals_1.expect)(heading1?.cleanText).toBe("API Design");
            (0, globals_1.expect)(heading1?.tags).toEqual(["architecture", "design"]);
            (0, globals_1.expect)(heading1?.level).toBe(1);
            const heading2 = result.headings?.[1];
            (0, globals_1.expect)(heading2?.text).toBe("User Authentication #security #api");
            (0, globals_1.expect)(heading2?.cleanText).toBe("User Authentication");
            (0, globals_1.expect)(heading2?.tags).toEqual(["security", "api"]);
            const heading3 = result.headings?.[2];
            (0, globals_1.expect)(heading3?.tags).toEqual(["implementation"]);
            (0, globals_1.expect)(heading3?.cleanText).toBe("JWT Token");
            const heading4 = result.headings?.[3];
            (0, globals_1.expect)(heading4?.tags).toBeUndefined();
            (0, globals_1.expect)(heading4?.cleanText).toBeUndefined();
        });
        (0, globals_1.it)("should create heading symbols in GraphDB", async () => {
            const content = `
# Architecture Overview #architecture #system-design

## Authentication System #security #implementation

Content with details.
`;
            const result = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("arch.md", content);
            const graphResult = await (0, MarkdownToGraph_1.markdownResultToGraph)(db, result, {
                sessionId: "heading-test",
                createMissingNodes: true,
            });
            (0, globals_1.expect)(graphResult.nodesCreated).toBeGreaterThanOrEqual(3);
            (0, globals_1.expect)(graphResult.relationshipsCreated).toBeGreaterThanOrEqual(2);
            const nodes = await db.findNodes({
                sourceFiles: ["arch.md"],
            });
            const headingNodes = nodes.filter((n) => n.type === "heading-symbol");
            (0, globals_1.expect)(headingNodes.length).toBe(2);
            const archNode = headingNodes.find((n) => n.name?.includes("Architecture"));
            (0, globals_1.expect)(archNode?.semanticTags).toEqual(["architecture", "system-design"]);
            const authNode = headingNodes.find((n) => n.name?.includes("Authentication"));
            (0, globals_1.expect)(authNode?.semanticTags).toEqual(["security", "implementation"]);
        });
    });
    (0, globals_1.describe)("GraphDB Integration", () => {
        (0, globals_1.it)("should register markdown edge types", async () => {
            const stats = await db.getStatistics();
            (0, globals_1.expect)(stats.totalNodes).toBeGreaterThanOrEqual(0);
        });
        (0, globals_1.it)("should convert markdown dependencies to graph", async () => {
            const content = `
# Test Document

See [Related](./related.md) for more info.
![Diagram](./diagram.png)
Reference to @TestClass in code.
`;
            const result = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("test.md", content);
            const graphResult = await (0, MarkdownToGraph_1.markdownResultToGraph)(db, result, {
                sessionId: "test-session",
                createMissingNodes: true,
            });
            (0, globals_1.expect)(graphResult.nodesCreated).toBeGreaterThan(0);
            (0, globals_1.expect)(graphResult.relationshipsCreated).toBe(4);
        });
        (0, globals_1.it)("should query markdown dependencies from GraphDB", async () => {
            const content = `
# Query Test

- [Link1](./file1.md)
- [Link2](./file2.md)
`;
            const result = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("query-test.md", content);
            await (0, MarkdownToGraph_1.markdownResultToGraph)(db, result, {
                sessionId: "query-test",
            });
            const deps = await (0, MarkdownToGraph_1.queryMarkdownDependencies)(db, "query-test.md");
            (0, globals_1.expect)(deps.length).toBeGreaterThanOrEqual(2);
            (0, globals_1.expect)(deps.some((d) => d.type === "md-link")).toBe(true);
        });
    });
    (0, globals_1.describe)("Semantic Type Query and Flow", () => {
        (0, globals_1.it)("should query headings by semantic type", async () => {
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
            const result1 = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("arch.md", file1Content);
            const result2 = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("api.md", file2Content);
            const result3 = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("test.md", file3Content);
            await (0, MarkdownToGraph_1.markdownResultToGraph)(db, result1, {
                sessionId: "semantic-query-test",
            });
            await (0, MarkdownToGraph_1.markdownResultToGraph)(db, result2, {
                sessionId: "semantic-query-test",
            });
            await (0, MarkdownToGraph_1.markdownResultToGraph)(db, result3, {
                sessionId: "semantic-query-test",
            });
            const { queryHeadingsBySemanticType, } = require("../src/integration/MarkdownToGraph");
            const archHeadings = await queryHeadingsBySemanticType(db, "architecture");
            (0, globals_1.expect)(archHeadings.length).toBe(3);
            (0, globals_1.expect)(archHeadings.every((h) => h.allTypes.includes("architecture"))).toBe(true);
            const apiHeadings = await queryHeadingsBySemanticType(db, "api");
            (0, globals_1.expect)(apiHeadings.length).toBe(2);
            const securityHeadings = await queryHeadingsBySemanticType(db, "security");
            (0, globals_1.expect)(securityHeadings.length).toBeGreaterThanOrEqual(1);
            const authHeading = securityHeadings.find((h) => h.heading.includes("Authentication"));
            (0, globals_1.expect)(authHeading).toBeDefined();
        });
        (0, globals_1.it)("should query headings from specific file", async () => {
            const content = `
# Main Title #architecture

## Section 1 #implementation #backend

### Subsection 1.1 #api

## Section 2 #frontend

Content.
`;
            const result = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("doc.md", content);
            await (0, MarkdownToGraph_1.markdownResultToGraph)(db, result, {
                sessionId: "file-query-test",
            });
            const { queryFileHeadings, } = require("../src/integration/MarkdownToGraph");
            const headings = await queryFileHeadings(db, "doc.md");
            (0, globals_1.expect)(headings.length).toBe(4);
            (0, globals_1.expect)(headings[0].semanticTypes).toEqual(["architecture"]);
            (0, globals_1.expect)(headings[1].semanticTypes).toEqual(["implementation", "backend"]);
            (0, globals_1.expect)(headings[2].semanticTypes).toEqual(["api"]);
            (0, globals_1.expect)(headings[3].semanticTypes).toEqual(["frontend"]);
            (0, globals_1.expect)(headings[0].line).toBeLessThan(headings[1].line);
        });
        (0, globals_1.it)("should get all semantic types statistics", async () => {
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
            const result1 = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("arch2.md", content1);
            const result2 = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("sec.md", content2);
            await (0, MarkdownToGraph_1.markdownResultToGraph)(db, result1, {
                sessionId: "stats-test",
            });
            await (0, MarkdownToGraph_1.markdownResultToGraph)(db, result2, {
                sessionId: "stats-test",
            });
            const { getAllSemanticTypes, } = require("../src/integration/MarkdownToGraph");
            const types = await getAllSemanticTypes(db);
            (0, globals_1.expect)(types.get("architecture")).toBeGreaterThanOrEqual(2);
            (0, globals_1.expect)(types.get("security")).toBeGreaterThanOrEqual(2);
            (0, globals_1.expect)(types.get("design")).toBeGreaterThanOrEqual(1);
            (0, globals_1.expect)(types.get("testing")).toBeGreaterThanOrEqual(1);
        });
        (0, globals_1.it)("should only accept English semantic tags in headings", () => {
            const content = `
# English Title #architecture #design

## Korean Title #한글태그 #security

### Mixed Title #api #테스트 #implementation

Content.
`;
            const result = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("mixed.md", content);
            const heading1 = result.headings?.[0];
            (0, globals_1.expect)(heading1?.tags).toEqual(["architecture", "design"]);
            (0, globals_1.expect)(heading1?.cleanText).toBe("English Title");
            const heading2 = result.headings?.[1];
            (0, globals_1.expect)(heading2?.tags).toEqual(["security"]);
            (0, globals_1.expect)(heading2?.cleanText).toContain("한글태그");
            const heading3 = result.headings?.[2];
            (0, globals_1.expect)(heading3?.tags).toEqual(["api", "implementation"]);
            (0, globals_1.expect)(heading3?.cleanText).toContain("테스트");
        });
        (0, globals_1.it)("should support complete workflow: extract → store → query", async () => {
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
            const result = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("project.md", content);
            (0, globals_1.expect)(result.headings?.length).toBe(5);
            const graphResult = await (0, MarkdownToGraph_1.markdownResultToGraph)(db, result, {
                sessionId: "workflow-test",
            });
            (0, globals_1.expect)(graphResult.nodesCreated).toBeGreaterThan(0);
            (0, globals_1.expect)(graphResult.relationshipsCreated).toBeGreaterThan(0);
            const { queryHeadingsBySemanticType, queryFileHeadings, } = require("../src/integration/MarkdownToGraph");
            const apiHeadings = await queryHeadingsBySemanticType(db, "api");
            (0, globals_1.expect)(apiHeadings.length).toBeGreaterThanOrEqual(3);
            const securityHeadings = await queryHeadingsBySemanticType(db, "security");
            (0, globals_1.expect)(securityHeadings.length).toBeGreaterThanOrEqual(1);
            const fileHeadings = await queryFileHeadings(db, "project.md");
            (0, globals_1.expect)(fileHeadings.length).toBe(5);
            const archHeading = fileHeadings.find((h) => h.heading.includes("Architecture"));
            (0, globals_1.expect)(archHeading?.semanticTypes).toEqual([
                "architecture",
                "system-design",
            ]);
        });
    });
    (0, globals_1.describe)("Complex Document Test", () => {
        (0, globals_1.it)("should extract all dependencies from comprehensive markdown", () => {
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
            const result = (0, MarkdownDependencyExtractor_1.extractMarkdownDependencies)("comprehensive.md", content);
            (0, globals_1.expect)(result.dependencies.length).toBeGreaterThanOrEqual(13);
            (0, globals_1.expect)(result.dependencies.some((d) => d.type === "link")).toBe(true);
            (0, globals_1.expect)(result.dependencies.some((d) => d.type === "image")).toBe(true);
            (0, globals_1.expect)(result.dependencies.some((d) => d.type === "wikilink")).toBe(true);
            (0, globals_1.expect)(result.dependencies.some((d) => d.type === "symbol-reference")).toBe(true);
            (0, globals_1.expect)(result.dependencies.some((d) => d.type === "code-block-reference")).toBe(true);
            (0, globals_1.expect)(result.dependencies.some((d) => d.type === "include")).toBe(true);
            (0, globals_1.expect)(result.dependencies.some((d) => d.type === "anchor")).toBe(true);
            (0, globals_1.expect)(result.dependencies.some((d) => d.type === "hashtag")).toBe(true);
            (0, globals_1.expect)(result.frontMatter?.title).toBe("Comprehensive Test");
            (0, globals_1.expect)(result.headings?.length).toBeGreaterThan(4);
        });
    });
});
//# sourceMappingURL=markdown-dependency-tracking.test.js.map