/**
 * Performance Test - Simplified
 * Tests core performance functionality
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { AnalysisEngine } from "../../src/services/analysis-engine";

describe("Performance", () => {
	let engine: AnalysisEngine;

	beforeEach(() => {
		engine = new AnalysisEngine();
	});

	afterEach(async () => {
		await engine.shutdown();
	});

	describe("Batch Processing Performance", () => {
		test("should handle batch analysis efficiently", async () => {
			const files = ["file1.ts", "file2.ts", "file3.ts"];
			const start = Date.now();
			const results = await engine.analyzeBatch(files);
			const duration = Date.now() - start;

			expect(results).toHaveLength(files.length);
			expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
		});
	});

	describe("Performance Metrics", () => {
		test("should provide performance metrics", async () => {
			const metrics = engine.getPerformanceMetrics();
			expect(metrics).toHaveProperty("totalAnalyses");
			expect(metrics).toHaveProperty("successfulAnalyses");
			expect(metrics).toHaveProperty("failedAnalyses");
		});

		test("should reset performance metrics", async () => {
			engine.resetPerformanceMetrics();
			const metrics = engine.getPerformanceMetrics();
			expect(metrics.totalAnalyses).toBe(0);
		});
	});
});