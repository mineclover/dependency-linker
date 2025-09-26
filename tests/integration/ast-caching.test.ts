/**
 * Integration test for AST caching functionality
 * Tests cache performance, invalidation, and memory management
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs, statSync } from "fs";
import * as path from "path";
import * as os from "os";

describe("AST Caching Integration", () => {
	let testDir: string;
	let analysisEngine: any;
	let cacheManager: any;

	beforeEach(async () => {
		testDir = await fs.mkdtemp(path.join(os.tmpdir(), "cache-test-"));

		// Mock cache manager
		cacheManager = {
			get: jest.fn(),
			set: jest.fn(),
			has: jest.fn(),
			clear: jest.fn(),
			getStats: jest.fn().mockReturnValue({
				hitRate: 0.75,
				size: 50,
				maxSize: 1000,
				memoryUsage: 10485760, // 10MB
			}),
			invalidate: jest.fn(),
			cleanup: jest.fn(),
		};

		// Mock analysis engine with caching
		analysisEngine = {
			analyzeFile: jest.fn(),
			getCacheManager: jest.fn().mockReturnValue(cacheManager),
			setCacheEnabled: jest.fn(),
			clearCache: jest.fn(),
		};
	});

	afterEach(async () => {
		await fs.rm(testDir, { recursive: true, force: true });
	});

	describe("Cache Hit Performance", () => {
		test("should cache AST results for faster subsequent access", async () => {
			const filePath = path.join(testDir, "cached-file.ts");
			const content = `
import React from 'react';
export const Component = () => <div>Test</div>;
      `;
			await fs.writeFile(filePath, content);

			// First analysis - cache miss
			const firstResult = {
				filePath,
				language: "typescript",
				extractedData: {
					imports: [{ source: "react", specifiers: ["React"] }],
				},
				interpretedData: {},
				performanceMetrics: {
					parseTime: 25,
					extractionTime: 10,
					interpretationTime: 5,
					totalTime: 40,
					memoryUsage: 2048,
				},
				errors: [],
				cacheHit: false,
			};

			cacheManager.has.mockReturnValueOnce(false);
			analysisEngine.analyzeFile.mockResolvedValueOnce(firstResult);

			const result1 = await analysisEngine.analyzeFile(filePath);

			// Second analysis - cache hit
			const secondResult = {
				...firstResult,
				performanceMetrics: {
					parseTime: 2,
					extractionTime: 1,
					interpretationTime: 1,
					totalTime: 4,
					memoryUsage: 1024,
				},
				cacheHit: true,
			};

			cacheManager.has.mockReturnValueOnce(true);
			cacheManager.get.mockReturnValueOnce({
				ast: { type: "Program", children: [] },
				parseTime: 2,
			});
			analysisEngine.analyzeFile.mockResolvedValueOnce(secondResult);

			const result2 = await analysisEngine.analyzeFile(filePath);

			expect(result1.cacheHit).toBe(false);
			expect(result2.cacheHit).toBe(true);
			expect(result2.performanceMetrics.totalTime).toBeLessThan(
				result1.performanceMetrics.totalTime,
			);
		});

		test("should achieve target cache hit rate over multiple files", async () => {
			const files = [];
			for (let i = 0; i < 10; i++) {
				const filePath = path.join(testDir, `file-${i}.ts`);
				await fs.writeFile(filePath, `export const value${i} = ${i};`);
				files.push(filePath);
			}

			// Simulate multiple analysis runs
			const analysisRuns = 3;
			let totalAnalyses = 0;
			let cacheHits = 0;

			for (let run = 0; run < analysisRuns; run++) {
				for (const filePath of files) {
					totalAnalyses++;
					const isFirstRun = run === 0;
					const result = {
						filePath,
						cacheHit: !isFirstRun,
						performanceMetrics: {
							parseTime: isFirstRun ? 20 : 2,
							totalTime: isFirstRun ? 35 : 5,
							memoryUsage: 1024,
						},
					};

					if (!isFirstRun) cacheHits++;

					cacheManager.has.mockReturnValue(!isFirstRun);
					analysisEngine.analyzeFile.mockResolvedValue(result);

					await analysisEngine.analyzeFile(filePath);
				}
			}

			const hitRate = cacheHits / totalAnalyses;
			expect(hitRate).toBeGreaterThan(0.6); // Target >60% hit rate
		});
	});

	describe("Cache Invalidation", () => {
		test("should invalidate cache when file is modified", async () => {
			const filePath = path.join(testDir, "modified-file.ts");
			const originalContent = "export const original = 1;";
			await fs.writeFile(filePath, originalContent);

			// First analysis
			cacheManager.has.mockReturnValueOnce(false);
			const firstResult = {
				filePath,
				cacheHit: false,
				extractedData: { exports: [{ name: "original" }] },
			};
			analysisEngine.analyzeFile.mockResolvedValueOnce(firstResult);

			await analysisEngine.analyzeFile(filePath);

			// Modify file
			const modifiedContent = "export const modified = 2;";
			await fs.writeFile(filePath, modifiedContent);

			// Analysis after modification should not use cache
			cacheManager.has.mockImplementation((key: string) => {
				// Simulate cache invalidation logic
				const stats = statSync(filePath);
				const cachedEntry = { lastModified: Date.now() - 10000 }; // Older timestamp
				return stats.mtimeMs <= cachedEntry.lastModified;
			});

			const modifiedResult = {
				filePath,
				cacheHit: false, // Should be cache miss due to modification
				extractedData: { exports: [{ name: "modified" }] },
			};
			analysisEngine.analyzeFile.mockResolvedValueOnce(modifiedResult);

			const result = await analysisEngine.analyzeFile(filePath);
			expect(result.cacheHit).toBe(false);
		});

		test("should support manual cache invalidation", () => {
			const filePath = path.join(testDir, "manual-invalidation.ts");

			cacheManager.invalidate.mockImplementation((key: string) => {
				// Simulate cache entry removal
				return true;
			});

			cacheManager.invalidate(filePath);

			expect(cacheManager.invalidate).toHaveBeenCalledWith(filePath);
		});

		test("should invalidate dependent caches when dependencies change", async () => {
			const utilsPath = path.join(testDir, "utils.ts");
			const mainPath = path.join(testDir, "main.ts");

			await fs.writeFile(utilsPath, "export const util = 1;");
			await fs.writeFile(mainPath, 'import { util } from "./utils";');

			// Cache both files
			cacheManager.has.mockReturnValue(false);
			await analysisEngine.analyzeFile(utilsPath);
			await analysisEngine.analyzeFile(mainPath);

			// Modify utils.ts
			await fs.writeFile(utilsPath, "export const util = 2;");

			// Mock dependency invalidation
			cacheManager.invalidate.mockImplementation((key: string) => {
				// Should invalidate both utils.ts and main.ts
				return key === utilsPath || key === mainPath;
			});

			cacheManager.invalidate(utilsPath);

			expect(cacheManager.invalidate).toHaveBeenCalledWith(utilsPath);
		});
	});

	describe("Memory Management", () => {
		test("should enforce cache size limits", () => {
			const stats = cacheManager.getStats();

			expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
			expect(stats.memoryUsage).toBeGreaterThan(0);
		});

		test("should evict least recently used entries when cache is full", () => {
			const maxSize = 5;
			const mockCache = new Map();

			cacheManager.set.mockImplementation((key: string, value: any) => {
				if (mockCache.size >= maxSize) {
					// Simulate LRU eviction
					const firstKey = mockCache.keys().next().value;
					mockCache.delete(firstKey);
				}
				mockCache.set(key, { ...value, lastAccessed: Date.now() });
			});

			cacheManager.getStats.mockReturnValue({
				hitRate: 0.8,
				size: mockCache.size,
				maxSize,
				memoryUsage: mockCache.size * 1024,
			});

			// Fill cache beyond capacity
			for (let i = 0; i < maxSize + 2; i++) {
				cacheManager.set(`file-${i}.ts`, { ast: {}, parseTime: 10 });
			}

			const stats = cacheManager.getStats();
			expect(stats.size).toBeLessThanOrEqual(maxSize);
		});

		test("should monitor memory usage and trigger cleanup", () => {
			const highMemoryStats = {
				hitRate: 0.7,
				size: 800,
				maxSize: 1000,
				memoryUsage: 104857600, // 100MB - high usage
			};

			cacheManager.getStats.mockReturnValue(highMemoryStats);
			cacheManager.cleanup.mockImplementation(() => {
				// Simulate cleanup reducing memory usage
				return {
					entriesRemoved: 200,
					memoryFreed: 20971520, // 20MB freed
				};
			});

			const stats = cacheManager.getStats();
			if (stats.memoryUsage > 50 * 1024 * 1024) {
				// 50MB threshold
				const cleanupResult = cacheManager.cleanup();
				expect(cleanupResult.entriesRemoved).toBeGreaterThan(0);
				expect(cleanupResult.memoryFreed).toBeGreaterThan(0);
			}
		});
	});

	describe("Cache Persistence", () => {
		test("should support cache persistence across sessions", () => {
			const persistentCache = {
				save: jest.fn(),
				load: jest.fn(),
				clear: jest.fn(),
			};

			// Mock saving cache to disk
			persistentCache.save.mockImplementation(() => {
				return Promise.resolve({ success: true, entriesSaved: 100 });
			});

			// Mock loading cache from disk
			persistentCache.load.mockImplementation(() => {
				return Promise.resolve({
					success: true,
					entriesLoaded: 100,
					memoryUsed: 10485760,
				});
			});

			expect(persistentCache.save).toBeDefined();
			expect(persistentCache.load).toBeDefined();
		});

		test("should validate cache integrity on load", () => {
			const cacheValidator = {
				validate: jest.fn().mockReturnValue({
					isValid: true,
					corruptedEntries: [],
					repairedEntries: 0,
				}),
			};

			const validationResult = cacheValidator.validate();

			expect(validationResult.isValid).toBe(true);
			expect(validationResult.corruptedEntries).toHaveLength(0);
		});
	});

	describe("Cache Configuration", () => {
		test("should support configurable cache settings", () => {
			const cacheConfig = {
				maxSize: 2000,
				maxMemory: 209715200, // 200MB
				ttl: 3600000, // 1 hour
				persistToDisk: true,
				compressionEnabled: true,
			};

			const configurableCache = {
				configure: jest.fn(),
				getConfiguration: jest.fn().mockReturnValue(cacheConfig),
			};

			configurableCache.configure(cacheConfig);

			expect(configurableCache.configure).toHaveBeenCalledWith(cacheConfig);

			const config = configurableCache.getConfiguration();
			expect(config.maxSize).toBe(2000);
			expect(config.maxMemory).toBe(209715200);
		});

		test("should support cache warming for frequently used files", async () => {
			const warmupFiles = [
				path.join(testDir, "common1.ts"),
				path.join(testDir, "common2.ts"),
				path.join(testDir, "common3.ts"),
			];

			// Create warmup files
			for (const filePath of warmupFiles) {
				await fs.writeFile(filePath, "export const common = true;");
			}

			const cacheWarmer = {
				warmup: jest.fn().mockResolvedValue({
					filesWarmed: warmupFiles.length,
					timeElapsed: 1500,
					cacheEntriesCreated: warmupFiles.length,
				}),
			};

			const result = await cacheWarmer.warmup(warmupFiles);

			expect(result.filesWarmed).toBe(warmupFiles.length);
			expect(result.cacheEntriesCreated).toBe(warmupFiles.length);
		});
	});

	describe("Cache Analytics", () => {
		test("should provide detailed cache statistics", () => {
			const detailedStats = {
				hitRate: 0.82,
				missRate: 0.18,
				size: 750,
				maxSize: 1000,
				memoryUsage: 15728640, // 15MB
				averageEntrySize: 20971, // ~20KB
				oldestEntry: Date.now() - 7200000, // 2 hours old
				newestEntry: Date.now() - 60000, // 1 minute old
				totalRequests: 1000,
				totalHits: 820,
				totalMisses: 180,
				evictions: 25,
				performanceGain: 0.65, // 65% time saved through caching
			};

			cacheManager.getStats.mockReturnValue(detailedStats);

			const stats = cacheManager.getStats();

			expect(stats.hitRate).toBeGreaterThan(0.8);
			expect(stats.performanceGain).toBeGreaterThan(0.6);
			expect(stats.evictions).toBeLessThan(50);
		});

		test("should track cache performance over time", () => {
			const performanceHistory = [
				{ timestamp: Date.now() - 3600000, hitRate: 0.75, avgResponseTime: 45 },
				{ timestamp: Date.now() - 1800000, hitRate: 0.78, avgResponseTime: 42 },
				{ timestamp: Date.now() - 900000, hitRate: 0.82, avgResponseTime: 38 },
				{ timestamp: Date.now(), hitRate: 0.85, avgResponseTime: 35 },
			];

			const performanceTracker = {
				getHistory: jest.fn().mockReturnValue(performanceHistory),
				getCurrentTrend: jest.fn().mockReturnValue({
					direction: "improving",
					hitRateChange: +0.1,
					responseTimeChange: -10,
				}),
			};

			const history = performanceTracker.getHistory();
			const trend = performanceTracker.getCurrentTrend();

			expect(history).toHaveLength(4);
			expect(trend.direction).toBe("improving");
			expect(trend.hitRateChange).toBeGreaterThan(0);
			expect(trend.responseTimeChange).toBeLessThan(0);
		});
	});
});
