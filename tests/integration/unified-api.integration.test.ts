
/**
 * Test unified API - TypeScript and Markdown analysis together
 */

import { analyzeTypeScriptFile, analyzeMarkdownFile } from "../../src/lib/index";

describe("Unified API Integration Tests", () => {
	test("should analyze TypeScript and Markdown files together", async () => {
		// Test TypeScript analysis
		const tsResult = await analyzeTypeScriptFile("src/api/TypeScriptAnalyzer.ts");

		// Verify TypeScript analysis results
		expect(tsResult.filePath).toContain("TypeScriptAnalyzer.ts");
		expect(tsResult.language).toBe("typescript");
		expect(tsResult.performanceMetrics.parseTime).toBeGreaterThan(0);
		expect(tsResult.errors).toBeDefined();

		// Test Markdown analysis
		const mdResult = await analyzeMarkdownFile("README.md");

		// Verify Markdown analysis results
		expect(mdResult.filePath).toContain("README.md");
		expect(mdResult.language).toBe("markdown");
		expect(mdResult.performanceMetrics.parseTime).toBeGreaterThan(0);
		expect(mdResult.errors).toBeDefined();

		// Verify interface consistency
		const tsKeys = Object.keys(tsResult).sort();
		const mdKeys = Object.keys(mdResult).sort();
		expect(tsKeys).toEqual(mdKeys);

		// Verify both have required properties
		expect(tsResult).toHaveProperty("pathInfo");
		expect(mdResult).toHaveProperty("pathInfo");
		expect(tsResult).toHaveProperty("extractedData");
		expect(mdResult).toHaveProperty("extractedData");
		expect(tsResult).toHaveProperty("interpretedData");
		expect(mdResult).toHaveProperty("interpretedData");
		expect(tsResult).toHaveProperty("performanceMetrics");
		expect(mdResult).toHaveProperty("performanceMetrics");
	});
});
