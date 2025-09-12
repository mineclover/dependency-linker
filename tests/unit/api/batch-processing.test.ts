/**
 * Batch Processing Interface Contract Tests
 * Tests for advanced batch processing functionality
 */

import {
	BatchAnalyzer,
	BatchAnalyzerOptions,
	ResourceMetrics,
} from "../../../src/api/BatchAnalyzer";
import { TypeScriptAnalyzer } from "../../../src/api/TypeScriptAnalyzer";
import {
	BatchAnalysisOptions,
	BatchResult,
	CancellationToken,
	LogLevel,
} from "../../../src/api/types";
import { AnalysisResult } from "../../../src/models/AnalysisResult";
import {
	BatchError,
	OperationCancelledError,
	ResourceError,
	ErrorUtils,
} from "../../../src/api/errors";
import path from "path";
import fs from "fs";
import os from "os";

describe("Batch Processing Interface Contract", () => {
	let tempDir: string;
	let testFiles: string[] = [];
	let batchAnalyzer: BatchAnalyzer;
	let mockAnalyzer: TypeScriptAnalyzer;

	beforeEach(() => {
		// Create temporary directory and test files
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "batch-test-"));

		// Create test TypeScript files
		const testContents = [
			`import { readFile } from 'fs/promises';
export const test1 = 'value1';`,
			`import * as path from 'path';
export const test2 = 'value2';`,
			`import { SomeType } from './types';
export interface Test3 { value: string; }`,
			`// Empty file with just comments
/* Comment block */`,
			`export const test5 = {
  prop: 'value'
};`,
		];

		testFiles = testContents.map((content, index) => {
			const filePath = path.join(tempDir, `test${index + 1}.ts`);
			fs.writeFileSync(filePath, content);
			return filePath;
		});

		// Create batch analyzer with default settings
		batchAnalyzer = new BatchAnalyzer();
	});

	afterEach(() => {
		// Clean up
		batchAnalyzer?.dispose();
		try {
			if (fs.existsSync(tempDir)) {
				fs.rmSync(tempDir, { recursive: true, force: true });
			}
		} catch (error) {
			// Ignore cleanup errors
		}
	});

	describe("BatchAnalyzer constructor contract", () => {
		it("should accept optional TypeScriptAnalyzer parameter", () => {
			const customAnalyzer = new TypeScriptAnalyzer();
			const batch = new BatchAnalyzer(customAnalyzer);

			expect(batch).toBeInstanceOf(BatchAnalyzer);
			batch.dispose();
		});

		it("should accept BatchAnalyzerOptions parameter", () => {
			const options: BatchAnalyzerOptions = {
				maxConcurrency: 3,
				adaptiveConcurrency: true,
				memoryLimit: 256,
				enableResourceMonitoring: true,
			};

			const batch = new BatchAnalyzer(undefined, options);
			expect(batch).toBeInstanceOf(BatchAnalyzer);

			const metrics = batch.getResourceMetrics();
			expect(metrics).toHaveProperty("memoryUsage");
			expect(metrics).toHaveProperty("activeOperations");

			batch.dispose();
		});

		it("should use default analyzer when none provided", () => {
			const batch = new BatchAnalyzer();
			expect(batch).toBeInstanceOf(BatchAnalyzer);
			batch.dispose();
		});
	});

	describe("processBatch method contract", () => {
		it("should accept filePaths array and return Promise<BatchResult>", async () => {
			const result = batchAnalyzer.processBatch(testFiles.slice(0, 2));
			expect(result).toBeInstanceOf(Promise);

			const batchResult = await result;
			expect(batchResult).toHaveProperty("results");
			expect(batchResult).toHaveProperty("summary");
			expect(batchResult).toHaveProperty("errors");
			expect(batchResult).toHaveProperty("totalTime");

			expect(Array.isArray(batchResult.results)).toBe(true);
			expect(Array.isArray(batchResult.errors)).toBe(true);
			expect(typeof batchResult.totalTime).toBe("number");
			expect(batchResult.summary).toHaveProperty("totalFiles");
			expect(batchResult.summary).toHaveProperty("successfulFiles");
			expect(batchResult.summary).toHaveProperty("failedFiles");
		});

		it("should accept optional BatchAnalysisOptions parameter", async () => {
			const options: BatchAnalysisOptions = {
				concurrency: 2,
				failFast: false,
				continueOnError: true,
				includeTypeImports: false,
				onProgress: jest.fn(),
			};

			const result = await batchAnalyzer.processBatch(
				testFiles.slice(0, 3),
				options,
			);
			expect(result.results.length).toBeGreaterThan(0);
			expect(options.onProgress).toHaveBeenCalledWith(
				expect.any(Number),
				expect.any(Number),
			);
		});

		it("should accept optional CancellationToken parameter", async () => {
			let cancellationRequested = false;
			const cancellationToken: CancellationToken = {
				isCancellationRequested: cancellationRequested,
				cancellationPromise: new Promise<void>((resolve) => {
					setTimeout(() => {
						cancellationRequested = true;
						resolve();
					}, 10);
				}),
				onCancellationRequested: (callback: () => void) => {
					setTimeout(() => {
						cancellationRequested = true;
						callback();
					}, 10);
				},
				cancel: () => {
					cancellationRequested = true;
				},
				throwIfCancellationRequested: () => {
					if (cancellationRequested) {
						throw new Error("Operation cancelled");
					}
				},
			};

			// Process should handle cancellation gracefully
			try {
				await batchAnalyzer.processBatch(testFiles, {}, cancellationToken);
			} catch (error) {
				if (error instanceof OperationCancelledError) {
					expect(error.code).toBe("OPERATION_CANCELLED");
				}
			}
		});

		it("should handle empty filePaths array", async () => {
			const result = await batchAnalyzer.processBatch([]);
			expect(result.results).toHaveLength(0);
			expect(result.errors).toHaveLength(0);
			expect(result.summary.totalFiles).toBe(0);
			expect(result.totalTime).toBeGreaterThanOrEqual(0);
		});

		it("should process multiple files correctly", async () => {
			const result = await batchAnalyzer.processBatch(testFiles);

			expect(result.results.length).toBeGreaterThan(0);
			expect(result.summary.totalFiles).toBe(testFiles.length);
			expect(result.summary.successfulFiles + result.summary.failedFiles).toBe(
				testFiles.length,
			);

			// Verify result structure
			result.results.forEach((fileResult) => {
				expect(fileResult).toHaveProperty("filePath");
				expect(fileResult).toHaveProperty("success");
				expect(fileResult).toHaveProperty("dependencies");
				expect(fileResult).toHaveProperty("imports");
				expect(fileResult).toHaveProperty("exports");
			});
		});
	});

	describe("Processing strategies contract", () => {
		it("should support fail-fast strategy", async () => {
			const invalidFile = path.join(tempDir, "invalid.js");
			fs.writeFileSync(invalidFile, "const x = 42;"); // JavaScript file - should fail

			const mixedFiles = [testFiles[0], invalidFile, testFiles[1]];
			const options: BatchAnalysisOptions = {
				failFast: true,
			};

			try {
				const result = await batchAnalyzer.processBatch(mixedFiles, options);
				// If no error thrown, check that processing stopped early
				expect(result.summary.totalFiles).toBeLessThanOrEqual(
					mixedFiles.length,
				);
			} catch (error) {
				expect(error).toBeInstanceOf(BatchError);
			}
		});

		it("should support collect-all strategy", async () => {
			const invalidFile = path.join(tempDir, "invalid.js");
			fs.writeFileSync(invalidFile, "const x = 42;");

			const mixedFiles = [testFiles[0], invalidFile, testFiles[1]];
			const options: BatchAnalysisOptions = {
				continueOnError: true,
			};

			const result = await batchAnalyzer.processBatch(mixedFiles, options);
			expect(result.summary.totalFiles).toBe(mixedFiles.length);
			expect(result.results.length + result.errors.length).toBe(
				mixedFiles.length,
			);
		});

		it("should support best-effort strategy (default)", async () => {
			const result = await batchAnalyzer.processBatch(testFiles);
			expect(result.summary.totalFiles).toBe(testFiles.length);
			expect(result.results.length).toBeGreaterThan(0);
		});
	});

	describe("Resource monitoring contract", () => {
		it("should provide resource metrics", () => {
			const metrics = batchAnalyzer.getResourceMetrics();

			expect(metrics).toHaveProperty("memoryUsage");
			expect(metrics).toHaveProperty("cpuUsage");
			expect(metrics).toHaveProperty("activeOperations");
			expect(metrics).toHaveProperty("queuedOperations");
			expect(metrics).toHaveProperty("completedOperations");
			expect(metrics).toHaveProperty("errorOperations");

			expect(typeof metrics.memoryUsage).toBe("number");
			expect(typeof metrics.cpuUsage).toBe("number");
			expect(typeof metrics.activeOperations).toBe("number");
		});

		it("should support adaptive concurrency", async () => {
			const adaptiveBatch = new BatchAnalyzer(undefined, {
				maxConcurrency: 5,
				adaptiveConcurrency: true,
				memoryLimit: 256, // Higher limit to avoid exhaustion
			});

			try {
				const initialMetrics = adaptiveBatch.getResourceMetrics();
				expect(initialMetrics.activeOperations).toBe(0);

				const options: BatchAnalysisOptions = {
					continueOnError: true,
					failFast: false,
				};

				const result = await adaptiveBatch.processBatch(testFiles, options);
				expect(result.results.length).toBeGreaterThan(0);
			} finally {
				adaptiveBatch.dispose();
			}
		});

		it("should handle resource exhaustion", async () => {
			const lowMemoryBatch = new BatchAnalyzer(undefined, {
				memoryLimit: 1, // Very low limit
				enableResourceMonitoring: true,
			});

			try {
				// Create many files to potentially trigger resource limits
				const manyFiles = Array(20)
					.fill(0)
					.map((_, index) => {
						const filePath = path.join(tempDir, `stress${index}.ts`);
						fs.writeFileSync(filePath, `export const stress${index} = 'data';`);
						return filePath;
					});

				try {
					await lowMemoryBatch.processBatch(manyFiles);
				} catch (error) {
					if (error instanceof ResourceError) {
						expect(error.code).toBe("RESOURCE_ERROR");
						expect(error.details).toHaveProperty("currentUsage");
					}
				}
			} finally {
				lowMemoryBatch.dispose();
			}
		});
	});

	describe("Event handling contract", () => {
		it("should support onProgress callback", async () => {
			const progressCallback = jest.fn();
			const options: BatchAnalysisOptions = {
				onProgress: progressCallback,
			};

			await batchAnalyzer.processBatch(testFiles, options);

			expect(progressCallback).toHaveBeenCalledWith(
				expect.any(Number),
				expect.any(Number),
			);

			// Should be called multiple times for multiple files
			expect(progressCallback.mock.calls.length).toBeGreaterThan(0);
		});

		it("should support onFileComplete callback", async () => {
			const fileCompleteCallback = jest.fn();
			const options: BatchAnalysisOptions = {
				onFileComplete: fileCompleteCallback,
			};

			await batchAnalyzer.processBatch([testFiles[0]], options);

			expect(fileCompleteCallback).toHaveBeenCalledWith(
				testFiles[0],
				expect.objectContaining({
					filePath: testFiles[0],
					success: expect.any(Boolean),
				}),
			);
		});

		it("should support onFileError callback", async () => {
			const fileErrorCallback = jest.fn();
			const options: BatchAnalysisOptions = {
				onFileError: fileErrorCallback,
				continueOnError: true,
			};

			const invalidFile = path.join(tempDir, "error.js");
			fs.writeFileSync(invalidFile, "invalid javascript");

			await batchAnalyzer.processBatch([testFiles[0], invalidFile], options);

			if (fileErrorCallback.mock.calls.length > 0) {
				expect(fileErrorCallback).toHaveBeenCalledWith(
					expect.any(String),
					expect.any(Error),
				);
			}
		});
	});

	describe("Concurrency control contract", () => {
		it("should respect concurrency limits", async () => {
			const concurrencyBatch = new BatchAnalyzer(undefined, {
				maxConcurrency: 2,
			});

			const startTime = Date.now();
			const result = await concurrencyBatch.processBatch(testFiles, {
				concurrency: 1, // Override to test sequential processing
			});
			const endTime = Date.now();

			expect(result.results.length).toBe(testFiles.length);
			expect(endTime - startTime).toBeGreaterThan(0);

			concurrencyBatch.dispose();
		});

		it("should handle concurrent batch operations", async () => {
			const batch1Promise = batchAnalyzer.processBatch([
				testFiles[0],
				testFiles[1],
			]);
			const batch2Promise = batchAnalyzer.processBatch([
				testFiles[2],
				testFiles[3],
			]);

			const [result1, result2] = await Promise.all([
				batch1Promise,
				batch2Promise,
			]);

			expect(result1.results.length).toBe(2);
			expect(result2.results.length).toBe(2);
			expect(result1.summary.totalFiles).toBe(2);
			expect(result2.summary.totalFiles).toBe(2);
		});
	});

	describe("Error handling contract", () => {
		it("should handle non-existent files gracefully", async () => {
			const nonExistentFile = path.join(tempDir, "nonexistent.ts");
			const mixedFiles = [testFiles[0], nonExistentFile];

			const options: BatchAnalysisOptions = {
				continueOnError: true,
				failFast: false,
			};

			const result = await batchAnalyzer.processBatch(mixedFiles, options);

			expect(result.summary.totalFiles).toBe(2);
			expect(result.results.length).toBe(2); // Both files should be processed

			// Find the result for the non-existent file
			const nonExistentResult = result.results.find(
				(r) => r.filePath === nonExistentFile,
			);
			expect(nonExistentResult).toBeDefined();
			expect(nonExistentResult?.success).toBe(false);
			expect(nonExistentResult?.error?.code).toBe("FILE_NOT_FOUND");
		});

		it("should aggregate errors correctly in BatchError", async () => {
			const invalidFiles = ["invalid1.js", "invalid2.js"].map((name) => {
				const filePath = path.join(tempDir, name);
				fs.writeFileSync(filePath, "const x = 42;");
				return filePath;
			});

			const options: BatchAnalysisOptions = {
				failFast: true,
			};

			try {
				await batchAnalyzer.processBatch(
					[testFiles[0], ...invalidFiles],
					options,
				);
			} catch (error) {
				if (error instanceof BatchError) {
					expect(error.code).toBe("BATCH_ERROR");
					expect(error.details).toHaveProperty("errors");
					expect(error.details).toHaveProperty("partialResults");
				}
			}
		});

		it("should provide meaningful error details", async () => {
			const malformedFile = path.join(tempDir, "malformed.ts");
			fs.writeFileSync(malformedFile, "import { incomplete from"); // Syntax error

			const result = await batchAnalyzer.processBatch([malformedFile], {
				continueOnError: true,
			});

			if (result.errors.length > 0) {
				const error = result.errors[0];
				expect(error).toHaveProperty("filePath");
				expect(error).toHaveProperty("code");
				expect(error).toHaveProperty("message");
				expect(error).toHaveProperty("details");

				expect(error.filePath).toBe(malformedFile);
				expect(typeof error.code).toBe("string");
				expect(typeof error.message).toBe("string");
			}
		});
	});

	describe("Disposal and cleanup contract", () => {
		it("should dispose cleanly without errors", () => {
			const batch = new BatchAnalyzer();
			expect(() => batch.dispose()).not.toThrow();

			// Multiple disposal calls should be safe
			expect(() => batch.dispose()).not.toThrow();
		});

		it("should clean up resources on disposal", () => {
			const batch = new BatchAnalyzer(undefined, {
				enableResourceMonitoring: true,
			});

			const initialMetrics = batch.getResourceMetrics();
			expect(initialMetrics).toBeDefined();

			batch.dispose();

			// After disposal, should still be able to get metrics but resources cleaned up
			const finalMetrics = batch.getResourceMetrics();
			expect(finalMetrics.activeOperations).toBe(0);
		});
	});

	describe("Method signature validation", () => {
		it("should have correct processBatch method signature", () => {
			expect(typeof batchAnalyzer.processBatch).toBe("function");
			expect(batchAnalyzer.processBatch.length).toBe(1); // Only filePaths is required (options and cancellationToken are optional)
		});

		it("should have correct getResourceMetrics method signature", () => {
			expect(typeof batchAnalyzer.getResourceMetrics).toBe("function");
			expect(batchAnalyzer.getResourceMetrics.length).toBe(0);
		});

		it("should have correct dispose method signature", () => {
			expect(typeof batchAnalyzer.dispose).toBe("function");
			expect(batchAnalyzer.dispose.length).toBe(0);
		});
	});

	describe("Performance characteristics", () => {
		it("should complete batch processing within reasonable time", async () => {
			const startTime = Date.now();
			const result = await batchAnalyzer.processBatch(testFiles);
			const endTime = Date.now();

			const totalTime = endTime - startTime;
			const averageTimePerFile = totalTime / testFiles.length;

			expect(result.totalTime).toBeGreaterThan(0);
			expect(result.totalTime).toBeLessThan(totalTime + 1000); // Allow some overhead
			expect(averageTimePerFile).toBeLessThan(5000); // Should be under 5s per file
		});

		it("should handle large batch sizes efficiently", async () => {
			// Create more test files for performance testing
			const largeTestFiles = Array(15)
				.fill(0)
				.map((_, index) => {
					const filePath = path.join(tempDir, `perf${index}.ts`);
					fs.writeFileSync(
						filePath,
						`
import { test${index} } from './module${index}';
export const value${index} = '${index}';
export interface Interface${index} {
  prop${index}: string;
}
        `.trim(),
					);
					return filePath;
				});

			const startTime = Date.now();
			const result = await batchAnalyzer.processBatch(largeTestFiles);
			const endTime = Date.now();

			expect(result.results.length).toBe(largeTestFiles.length);
			expect(result.summary.successfulFiles).toBe(largeTestFiles.length);

			const totalTime = endTime - startTime;
			const averageTimePerFile = totalTime / largeTestFiles.length;
			expect(averageTimePerFile).toBeLessThan(1000); // Should average under 1s per file
		});
	});
});
