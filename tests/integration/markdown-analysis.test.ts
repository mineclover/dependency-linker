/**
 * Integration tests for Markdown Analysis Pipeline
 * Tests the full workflow: MarkdownParser → MarkdownLinkExtractor → LinkDependencyInterpreter
 */

import { MarkdownParser } from "../../src/parsers/MarkdownParser";
import { MarkdownLinkExtractor } from "../../src/extractors/MarkdownLinkExtractor";
import { LinkDependencyInterpreter } from "../../src/interpreters/LinkDependencyInterpreter";
import { join } from "node:path";
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from "node:fs";

describe("Markdown Analysis Integration", () => {
	let parser: MarkdownParser;
	let extractor: MarkdownLinkExtractor;
	let interpreter: LinkDependencyInterpreter;
	let tempDir: string;

	beforeEach(() => {
		parser = new MarkdownParser();
		extractor = new MarkdownLinkExtractor();
		interpreter = new LinkDependencyInterpreter();
		tempDir = join(__dirname, "temp-integration");

		// Create temp directory
		if (!existsSync(tempDir)) {
			mkdirSync(tempDir, { recursive: true });
		}
	});

	afterEach(() => {
		// Clean up temp files
		try {
			if (existsSync(tempDir)) {
				const files = require("node:fs").readdirSync(tempDir);
				for (const file of files) {
					unlinkSync(join(tempDir, file));
				}
			}
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("Full Analysis Pipeline", () => {
		it("should analyze a complete markdown document", async () => {
			const markdownContent = `
# Project Documentation

Welcome to our project! Here are some useful links:

## External Resources
- [GitHub Repository](https://github.com/user/project)
- [Documentation Site](https://docs.example.com)
- Contact us at [support@example.com](mailto:support@example.com)

## Internal Documentation
- [Getting Started](./docs/getting-started.md)
- [API Reference](./docs/api/index.md)
- [Contributing Guide](../CONTRIBUTING.md)

## Images
![Project Logo](./assets/logo.png "Our amazing logo")
![External Banner](https://cdn.example.com/banner.jpg)

## Reference Links
Check out our [main docs][docs] and [API guide][api].

[docs]: ./docs/README.md "Main documentation"
[api]: ./docs/api.md "API documentation"

## Broken Links
- [Missing File](./missing.md)
- [Bad Link](./nonexistent/file.txt)
			`.trim();

			const filePath = join(tempDir, "test.md");
			writeFileSync(filePath, markdownContent);

			// Create some referenced files
			const docsDir = join(tempDir, "docs");
			mkdirSync(docsDir, { recursive: true });
			writeFileSync(join(docsDir, "README.md"), "# Documentation");
			writeFileSync(join(docsDir, "api.md"), "# API");

			const assetsDir = join(tempDir, "assets");
			mkdirSync(assetsDir, { recursive: true });
			writeFileSync(join(assetsDir, "logo.png"), "fake-png-content");

			// Step 1: Parse markdown
			const parseResult = await parser.parse(filePath);
			expect(parseResult.errors).toHaveLength(0);
			expect(parseResult.language).toBe("markdown");

			// Step 2: Extract link dependencies
			const dependencies = await extractor.extract(parseResult.ast, filePath);
			expect(dependencies.length).toBeGreaterThan(0);

			// Verify different link types were extracted
			const externalLinks = dependencies.filter((d) => d.isExternal);
			const internalLinks = dependencies.filter((d) => d.isInternal);
			const images = dependencies.filter((d) => d.type === "image");

			expect(externalLinks.length).toBeGreaterThan(0);
			expect(internalLinks.length).toBeGreaterThan(0);
			expect(images.length).toBeGreaterThan(0);

			// Step 3: Analyze dependencies
			const analysisResult = await interpreter.interpret(dependencies);

			// Verify analysis results
			expect(analysisResult.summary.totalLinks).toBe(dependencies.length);
			expect(analysisResult.summary.externalLinks).toBe(externalLinks.length);
			expect(analysisResult.summary.internalLinks).toBe(internalLinks.length);
			expect(analysisResult.summary.imageLinks).toBe(images.length);

			// Should detect broken links
			expect(analysisResult.summary.brokenLinks).toBeGreaterThan(0);
			expect(analysisResult.issues.length).toBeGreaterThan(0);

			// Should have recommendations
			expect(analysisResult.recommendations.length).toBeGreaterThan(0);
		});

		it("should handle documents with only external links", async () => {
			const markdownContent = `
# External Resources

- [Google](https://google.com)
- [GitHub](https://github.com)
- [Stack Overflow](https://stackoverflow.com)
			`.trim();

			const filePath = join(tempDir, "external.md");
			writeFileSync(filePath, markdownContent);

			const parseResult = await parser.parse(filePath);
			const dependencies = await extractor.extract(parseResult.ast, filePath);
			const analysisResult = await interpreter.interpret(dependencies);

			expect(analysisResult.summary.externalLinks).toBe(3);
			expect(analysisResult.summary.internalLinks).toBe(0);
			expect(analysisResult.summary.brokenLinks).toBe(0);
		});

		it("should handle documents with only internal links", async () => {
			const markdownContent = `
# Internal Navigation

- [Section 1](#section-1)
- [Section 2](#section-2)
- [Other Doc](./other.md)
			`.trim();

			const filePath = join(tempDir, "internal.md");
			writeFileSync(filePath, markdownContent);
			writeFileSync(join(tempDir, "other.md"), "# Other");

			const parseResult = await parser.parse(filePath);
			const dependencies = await extractor.extract(parseResult.ast, filePath);
			const analysisResult = await interpreter.interpret(dependencies);

			expect(analysisResult.summary.internalLinks).toBeGreaterThan(0);
			expect(analysisResult.summary.externalLinks).toBe(0);
		});

		it("should analyze documents with reference links", async () => {
			const markdownContent = `
# Reference Style Links

Check out [Google][google] and [GitHub][github].

Also see our [documentation][docs].

[google]: https://google.com "Google Search"
[github]: https://github.com "GitHub"
[docs]: ./docs/index.md "Our Documentation"
			`.trim();

			const filePath = join(tempDir, "references.md");
			writeFileSync(filePath, markdownContent);

			// Create referenced file
			const docsDir = join(tempDir, "docs");
			mkdirSync(docsDir, { recursive: true });
			writeFileSync(join(docsDir, "index.md"), "# Documentation Index");

			const parseResult = await parser.parse(filePath);
			const dependencies = await extractor.extract(parseResult.ast, filePath);
			const analysisResult = await interpreter.interpret(dependencies);

			expect(analysisResult.summary.referenceLinks).toBeGreaterThan(0);
			expect(analysisResult.summary.externalLinks).toBe(2);
			expect(analysisResult.summary.internalLinks).toBe(1);
		});

		it("should detect and report accessibility issues", async () => {
			const markdownContent = `
# Images

![Good image](./good.png "Has alt text")
![](./bad.png)
![Bad image](./bad2.png "")
			`.trim();

			const filePath = join(tempDir, "accessibility.md");
			writeFileSync(filePath, markdownContent);

			const parseResult = await parser.parse(filePath);
			const dependencies = await extractor.extract(parseResult.ast, filePath);

			const interpreterWithAccessibility = new LinkDependencyInterpreter({
				accessibilityChecks: true,
				validateFiles: false,
			});
			const analysisResult =
				await interpreterWithAccessibility.interpret(dependencies);

			const accessibilityIssues = analysisResult.issues.filter(
				(issue) => issue.type === "accessibility_issue",
			);
			expect(accessibilityIssues.length).toBeGreaterThan(0);
		});

		it("should perform security analysis", async () => {
			const markdownContent = `
# Security Test

Safe links:
- [GitHub](https://github.com)
- [Our Docs](./docs.md)

Suspicious links:
- [Suspicious](https://suspicious-domain.com/malware)
- [Another Bad One](https://malicious-site.evil)
			`.trim();

			const filePath = join(tempDir, "security.md");
			writeFileSync(filePath, markdownContent);

			const parseResult = await parser.parse(filePath);
			const dependencies = await extractor.extract(parseResult.ast, filePath);

			const secureInterpreter = new LinkDependencyInterpreter({
				securityChecks: true,
				blockedDomains: ["suspicious-domain.com", "malicious-site.evil"],
			});
			const analysisResult = await secureInterpreter.interpret(dependencies);

			expect(analysisResult.metadata.securityWarnings).toBeGreaterThan(0);
			const securityIssues = analysisResult.issues.filter(
				(issue) => issue.type === "security_risk",
			);
			expect(securityIssues.length).toBeGreaterThan(0);
		});

		it("should handle complex nested documents", async () => {
			const markdownContent = `
# Complex Document

## Lists with Links

1. First item with [external link](https://example.com)
2. Second item with [internal link](./file.md)
   - Nested [image link](./images/nested.png)
   - Another [nested external](https://nested.example.com)

## Blockquotes

> This quote contains a [quoted link](https://quoted.example.com)
> And an [internal quoted link](./quoted.md)

## Tables

| Column 1 | Column 2 |
|----------|----------|
| [Table Link 1](https://table1.example.com) | [Table Link 2](./table.md) |

## Code Blocks

\`\`\`markdown
This [code link](./code.md) should not be extracted
\`\`\`

Regular [text link](./text.md) should be extracted.
			`.trim();

			const filePath = join(tempDir, "complex.md");
			writeFileSync(filePath, markdownContent);

			const parseResult = await parser.parse(filePath);
			const dependencies = await extractor.extract(parseResult.ast, filePath);
			const analysisResult = await interpreter.interpret(dependencies);

			// Should extract links from various contexts but not from code blocks
			expect(dependencies.length).toBeGreaterThan(5);
			expect(analysisResult.summary.totalLinks).toBeGreaterThan(5);

			// Should not extract links from code blocks
			const codeLinks = dependencies.filter((d) =>
				d.source.includes("code.md"),
			);
			expect(codeLinks).toHaveLength(0);

			// Should extract the regular text link
			const textLinks = dependencies.filter((d) =>
				d.source.includes("text.md"),
			);
			expect(textLinks).toHaveLength(1);
		});

		it("should provide comprehensive analysis metrics", async () => {
			const markdownContent = `
# Metrics Test

Links spread across multiple lines:

Line 5: [Link 1](https://example1.com)

Line 7: [Link 2](https://example2.com)

Line 9: [Link 3](./local.md)

Line 11: [Link 4](https://example3.com)

Line 13: [Link 5](./another.md)
			`.trim();

			const filePath = join(tempDir, "metrics.md");
			writeFileSync(filePath, markdownContent);

			const parseResult = await parser.parse(filePath);
			const dependencies = await extractor.extract(parseResult.ast, filePath);
			const analysisResult = await interpreter.interpret(dependencies);

			// Check comprehensive metrics
			expect(analysisResult.metadata.analysisTime).toBeGreaterThan(0);
			expect(analysisResult.summary.linkDensity).toBeGreaterThan(0);
			expect(analysisResult.summary.uniqueDomains).toBeGreaterThan(0);

			// Should provide actionable recommendations
			expect(analysisResult.recommendations).toBeDefined();
			expect(Array.isArray(analysisResult.recommendations)).toBe(true);
		});
	});

	describe("Error Handling", () => {
		it("should handle malformed markdown gracefully", async () => {
			const malformedContent = `
# Malformed Markdown

[Incomplete link](incomplete
![Broken image](broken
			`.trim();

			const filePath = join(tempDir, "malformed.md");
			writeFileSync(filePath, malformedContent);

			const parseResult = await parser.parse(filePath);
			const dependencies = await extractor.extract(parseResult.ast, filePath);
			const analysisResult = await interpreter.interpret(dependencies);

			// Should handle gracefully without crashing
			expect(analysisResult).toBeDefined();
			expect(Array.isArray(analysisResult.dependencies)).toBe(true);
			expect(Array.isArray(analysisResult.issues)).toBe(true);
		});

		it("should handle empty documents", async () => {
			const emptyContent = "";
			const filePath = join(tempDir, "empty.md");
			writeFileSync(filePath, emptyContent);

			const parseResult = await parser.parse(filePath);
			const dependencies = await extractor.extract(parseResult.ast, filePath);
			const analysisResult = await interpreter.interpret(dependencies);

			expect(analysisResult.summary.totalLinks).toBe(0);
			expect(analysisResult.dependencies).toHaveLength(0);
			expect(analysisResult.issues).toHaveLength(0);
		});

		it("should handle documents with only whitespace", async () => {
			const whitespaceContent = "   \n\n   \t\t\n   ";
			const filePath = join(tempDir, "whitespace.md");
			writeFileSync(filePath, whitespaceContent);

			const parseResult = await parser.parse(filePath);
			const dependencies = await extractor.extract(parseResult.ast, filePath);
			const analysisResult = await interpreter.interpret(dependencies);

			expect(analysisResult.summary.totalLinks).toBe(0);
			expect(analysisResult.dependencies).toHaveLength(0);
		});
	});

	describe("Performance", () => {
		it("should handle large documents efficiently", async () => {
			// Generate a large document with many links
			const lines = [];
			lines.push("# Large Document Test");
			lines.push("");

			for (let i = 0; i < 1000; i++) {
				lines.push(`## Section ${i}`);
				lines.push(
					`This is section ${i} with a [link ${i}](https://example${i % 10}.com).`,
				);
				lines.push(`![Image ${i}](./images/image${i}.png)`);
				lines.push("");
			}

			const largeContent = lines.join("\n");
			const filePath = join(tempDir, "large.md");
			writeFileSync(filePath, largeContent);

			const startTime = Date.now();

			const parseResult = await parser.parse(filePath);
			const dependencies = await extractor.extract(parseResult.ast, filePath);
			const analysisResult = await interpreter.interpret(dependencies);

			const totalTime = Date.now() - startTime;

			// Should complete within reasonable time (adjust threshold as needed)
			expect(totalTime).toBeLessThan(5000); // 5 seconds

			// Should extract all links correctly
			expect(dependencies.length).toBeGreaterThan(1500); // ~2000 links expected
			expect(analysisResult.summary.totalLinks).toBe(dependencies.length);
		});
	});
});
