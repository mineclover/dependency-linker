/**
 * AnalysisEngine Path Normalization Integration Tests
 */

import { AnalysisEngine } from "../../src/services/analysis-engine";
import { normalizeToProjectRoot } from "../../src/utils/PathUtils";
import * as fs from "node:fs";
import { jest } from "@jest/globals";
import type { PathLike } from "node:fs";

// Mock fs for project root detection
jest.mock("node:fs", () => ({
	existsSync: jest.fn(),
	lstatSync: jest.fn(() => ({ isDirectory: () => true })),
	realpathSync: jest.fn((p: PathLike) => p.toString()),
	readFileSync: jest.fn(),
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe("AnalysisEngine Path Normalization Integration", () => {
	let engine: AnalysisEngine;
	const testProjectRoot = "/Users/test/my-project";
	const sampleTypeScriptCode = `
import React from 'react';
import { Button } from './components/Button';
import { utils } from '../utils/helper';

export const App = () => {
	return <div>Hello World</div>;
};
	`;

	beforeEach(() => {
		// Clear any existing cache
		jest.clearAllMocks();

		// Setup project root detection
		mockFs.existsSync.mockImplementation((filePath: PathLike) => {
			const pathStr = filePath.toString();
			return pathStr.includes("package.json") && pathStr.includes(testProjectRoot);
		});

		mockFs.readFileSync.mockReturnValue(sampleTypeScriptCode);

		// Create engine instance
		engine = new AnalysisEngine();
	});

	afterEach(() => {
		if (engine) {
			engine.clearCache();
		}
	});

	describe("analyzeFile path normalization", () => {
		it("should normalize absolute paths to project-relative", async () => {
			const absolutePath = `${testProjectRoot}/src/components/Button.tsx`;
			const expectedNormalizedPath = "./src/components/Button.tsx";

			const result = await engine.analyzeFile(absolutePath);

			expect(result.success).toBe(true);
			expect(result.filePath).toBe(expectedNormalizedPath);
		});

		it("should maintain already normalized paths", async () => {
			const normalizedPath = "./src/components/Button.tsx";

			const result = await engine.analyzeFile(normalizedPath);

			expect(result.success).toBe(true);
			expect(result.filePath).toBe(normalizedPath);
		});

		it("should normalize paths without leading dot", async () => {
			const pathWithoutDot = "src/components/Button.tsx";
			const expectedNormalizedPath = "./src/components/Button.tsx";

			const result = await engine.analyzeFile(pathWithoutDot);

			expect(result.success).toBe(true);
			expect(result.filePath).toBe(expectedNormalizedPath);
		});

		it("should handle relative paths from different execution contexts", async () => {
			const relativePath = "../src/components/Button.tsx";

			// This should be normalized to project root regardless of execution context
			const result = await engine.analyzeFile(relativePath, undefined, testProjectRoot);

			expect(result.success).toBe(true);
			// Result should be normalized path format
			expect(result.filePath.startsWith(".")).toBe(true);
		});
	});

	describe("analyzeContent path normalization", () => {
		it("should normalize virtual file paths", async () => {
			const virtualPath = `${testProjectRoot}/src/virtual/Component.tsx`;
			const expectedNormalizedPath = "./src/virtual/Component.tsx";

			const result = await engine.analyzeContent(sampleTypeScriptCode, virtualPath);

			expect(result.success).toBe(true);
			expect(result.filePath).toBe(expectedNormalizedPath);
		});

		it("should handle already normalized virtual paths", async () => {
			const normalizedVirtualPath = "./src/virtual/Component.tsx";

			const result = await engine.analyzeContent(sampleTypeScriptCode, normalizedVirtualPath);

			expect(result.success).toBe(true);
			expect(result.filePath).toBe(normalizedVirtualPath);
		});
	});

	describe("cache key consistency", () => {
		it("should use same cache for different path formats of same file", async () => {
			const absolutePath = `${testProjectRoot}/src/components/Button.tsx`;
			const relativePath = "./src/components/Button.tsx";
			const pathWithoutDot = "src/components/Button.tsx";

			// First analysis
			const result1 = await engine.analyzeFile(absolutePath);

			// Second analysis with different path format - should hit cache
			const result2 = await engine.analyzeFile(relativePath);

			// Third analysis with another format - should hit cache
			const result3 = await engine.analyzeFile(pathWithoutDot);

			// All should return success and same normalized path
			expect(result1.success).toBe(true);
			expect(result2.success).toBe(true);
			expect(result3.success).toBe(true);

			expect(result1.filePath).toBe("./src/components/Button.tsx");
			expect(result2.filePath).toBe("./src/components/Button.tsx");
			expect(result3.filePath).toBe("./src/components/Button.tsx");

			// Verify cache efficiency
			const cacheStats = engine.getCacheStats();
			expect(cacheStats.hits).toBeGreaterThan(0);
		});

		it("should generate consistent cache keys for content analysis", async () => {
			const absolutePath = `${testProjectRoot}/src/virtual/Test.tsx`;
			const relativePath = "./src/virtual/Test.tsx";

			// First analysis
			const result1 = await engine.analyzeContent(sampleTypeScriptCode, absolutePath);

			// Second analysis with different path format - should hit cache
			const result2 = await engine.analyzeContent(sampleTypeScriptCode, relativePath);

			expect(result1.success).toBe(true);
			expect(result2.success).toBe(true);
			expect(result1.filePath).toBe(result2.filePath);

			// Verify cache was used
			const cacheStats = engine.getCacheStats();
			expect(cacheStats.hits).toBeGreaterThan(0);
		});
	});

	describe("cross-platform path handling", () => {
		it("should normalize Windows-style paths", async () => {
			const windowsStylePath = `${testProjectRoot}\\src\\components\\Button.tsx`;
			const expectedNormalizedPath = "./src/components/Button.tsx";

			const result = await engine.analyzeFile(windowsStylePath);

			expect(result.success).toBe(true);
			expect(result.filePath).toBe(expectedNormalizedPath);
		});

		it("should handle mixed path separators", async () => {
			const mixedPath = `${testProjectRoot}/src\\components/Button.tsx`;
			const expectedNormalizedPath = "./src/components/Button.tsx";

			const result = await engine.analyzeFile(mixedPath);

			expect(result.success).toBe(true);
			expect(result.filePath).toBe(expectedNormalizedPath);
		});
	});

	describe("project root configuration", () => {
		it("should respect custom project root parameter", async () => {
			const customProjectRoot = "/custom/project/root";
			const filePath = "/custom/project/root/src/index.ts";
			const expectedNormalizedPath = "./src/index.ts";

			const result = await engine.analyzeFile(filePath, undefined, customProjectRoot);

			expect(result.success).toBe(true);
			expect(result.filePath).toBe(expectedNormalizedPath);
		});

		it("should handle files outside project root", async () => {
			const outsideProjectPath = "/usr/local/lib/external.js";

			const result = await engine.analyzeFile(outsideProjectPath);

			expect(result.success).toBe(true);
			// Should keep absolute path for files outside project
			expect(result.filePath).toBe(outsideProjectPath);
		});
	});

	describe("performance and consistency", () => {
		it("should maintain performance with path normalization", async () => {
			const testPaths = [
				`${testProjectRoot}/src/index.ts`,
				`${testProjectRoot}/src/components/Button.tsx`,
				`${testProjectRoot}/src/utils/helper.ts`,
				`${testProjectRoot}/src/types/index.ts`,
			];

			const startTime = Date.now();

			// Analyze all files
			const results = await Promise.all(
				testPaths.map(path => engine.analyzeFile(path))
			);

			const endTime = Date.now();
			const totalTime = endTime - startTime;

			// All should succeed
			results.forEach(result => {
				expect(result.success).toBe(true);
				expect(result.filePath.startsWith("./")).toBe(true);
			});

			// Should complete in reasonable time (less than 1 second for 4 files)
			expect(totalTime).toBeLessThan(1000);
		});

		it("should produce consistent results across multiple runs", async () => {
			const testPath = `${testProjectRoot}/src/components/Modal.tsx`;

			// Run analysis multiple times
			const results = await Promise.all([
				engine.analyzeFile(testPath),
				engine.analyzeFile(testPath),
				engine.analyzeFile(testPath),
			]);

			// All should have same normalized path
			const normalizedPaths = results.map(r => r.filePath);
			expect(new Set(normalizedPaths).size).toBe(1);
			expect(normalizedPaths[0]).toBe("./src/components/Modal.tsx");

			// Verify cache efficiency
			const cacheStats = engine.getCacheStats();
			expect(cacheStats.hits).toBeGreaterThan(0);
		});
	});

	describe("error handling with path normalization", () => {
		it("should handle invalid paths gracefully", async () => {
			const invalidPaths = ["", "  ", null as any, undefined as any];

			for (const invalidPath of invalidPaths) {
				try {
					const result = await engine.analyzeFile(invalidPath);
					// If no error thrown, should have success false
					expect(result.success).toBe(false);
				} catch (error) {
					// Error is acceptable for invalid input
					expect(error).toBeDefined();
				}
			}
		});

		it("should maintain normalization even with analysis errors", async () => {
			const pathWithSyntaxError = `${testProjectRoot}/src/broken.ts`;
			const invalidCode = "invalid typescript syntax {{{";

			mockFs.readFileSync.mockReturnValueOnce(invalidCode);

			const result = await engine.analyzeFile(pathWithSyntaxError);

			// Path should still be normalized even if parsing fails
			expect(result.filePath).toBe("./src/broken.ts");
		});
	});
});