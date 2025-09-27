/**
 * Batch Analysis Test - Simplified
 * Tests core batch processing functionality
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { AnalysisEngine } from "../../src/services/analysis-engine";

describe("Batch Analysis", () => {
	let engine: AnalysisEngine;

	beforeEach(() => {
		engine = new AnalysisEngine();
	});

	afterEach(async () => {
		await engine.shutdown();
	});

	describe("Core Batch Processing", () => {
		test("should handle empty batch gracefully", async () => {
			const results = await engine.analyzeBatch([]);
			expect(results).toHaveLength(0);
			expect(Array.isArray(results)).toBe(true);
		});

		test("should return error results for non-existent files", async () => {
			const results = await engine.analyzeBatch(["non-existent.ts"]);
			expect(results).toHaveLength(1);
			expect(results[0].errors.length).toBeGreaterThan(0);
		});

		test("should maintain file order in results", async () => {
			const files = ["file1.ts", "file2.ts", "file3.ts"];
			const results = await engine.analyzeBatch(files);

			expect(results).toHaveLength(files.length);
			for (let i = 0; i < results.length; i++) {
				expect(results[i].filePath).toBe(files[i]);
			}
		});
	});

	describe("Performance", () => {
		test("should process batches efficiently", async () => {
			const files = ["file1.ts", "file2.ts"];
			const start = Date.now();
			const results = await engine.analyzeBatch(files);
			const duration = Date.now() - start;

			expect(results).toHaveLength(files.length);
			expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
		});

		test("should provide cache functionality", async () => {
			const stats = engine.getCacheStats();
			expect(stats).toHaveProperty("hitRate");
			expect(stats).toHaveProperty("totalHits");
			expect(stats).toHaveProperty("totalMisses");
		});
	});
});
