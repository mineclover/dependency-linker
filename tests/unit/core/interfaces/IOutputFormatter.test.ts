import { AnalysisResult } from "../../../../src/models/AnalysisResult";
import { EnhancedOutputFormatter } from "../../../../src/cli/formatters/EnhancedOutputFormatter";

// Use existing OutputFormatter instead of creating mock interface
type OutputFormat = "json" | "compact" | "summary" | "table" | "csv" | "tree" | "report";

describe("OutputFormatter Integration Contract", () => {
	// Test actual implementation instead of mock interface
	const formatter = new EnhancedOutputFormatter();

	const createMockResult = (depCount: number = 2): AnalysisResult => ({
		filePath: "test.ts",
		language: "typescript",
		extractedData: {
			dependency: {
				dependencies: Array.from({ length: depCount }, (_, i) => ({
					source: `dep${i}`,
					specifiers: [],
					type: "import" as const,
					isTypeOnly: false,
					location: { line: i + 1, column: 0, endLine: i + 1, endColumn: 10 }
				})),
				totalCount: depCount,
				importCount: depCount,
				exportCount: 0,
				dynamicImportCount: 0,
				typeOnlyImportCount: 0
			}
		},
		interpretedData: {},
		performanceMetrics: {
			parseTime: 10,
			extractionTime: 5,
			interpretationTime: 2,
			totalTime: 17,
			memoryUsage: 1024,
			breakdown: {
				parser: {
					languageDetectionTime: 1,
					grammarLoadTime: 2,
					parseTime: 10,
					validationTime: 1,
					nodeCount: 100,
					maxDepth: 5,
					astMemoryUsage: 512
				},
				extractors: new Map(),
				interpreters: new Map(),
				io: {
					fileReadTime: 2,
					fileSize: 1024,
					diskReads: 1,
					cacheReads: 0,
					networkRequests: 0
				},
				cache: {
					lookupTime: 1,
					writeTime: 2,
					hits: 5,
					misses: 1,
					hitRate: 0.83,
					memorySaved: 512,
					timeSaved: 8
				}
			},
			resources: {
				cpuUsage: 10,
				memoryUsage: 1.5,
				fileHandles: 1,
				threadCount: 1,
				gc: {
					collections: 1,
					gcTime: 1,
					memoryReclaimed: 512
				}
			}
		},
		errors: [],
		metadata: {
			timestamp: new Date(),
			version: "2.0.0",
			config: {} as any,
			extractorsUsed: ["dependency"],
			interpretersUsed: [],
			fromCache: false,
			fileSize: 100,
			lastModified: new Date()
		}
	});

	// Helper function to get dependency count from result
	const getDependencyCount = (result: AnalysisResult): number => {
		return result.extractedData.dependency?.dependencies?.length || 0;
	};

	describe("Core Formatting Methods", () => {
		test("should format as JSON", () => {
			const result = createMockResult(2);
			const output = formatter.formatAsJSON(result);

			expect(output).toBeDefined();
			expect(() => JSON.parse(output)).not.toThrow();

			const parsed = JSON.parse(output);
			expect(parsed.filePath).toBe("test.ts");
		});

		test("should format as compact JSON", () => {
			const result = createMockResult(2);
			const output = formatter.formatAsJSON(result, true);

			expect(output).toBeDefined();
			expect(output.includes('\n')).toBe(false); // Compact should not have newlines
		});

		test("should format as table", () => {
			const result = createMockResult(2);
			const output = formatter.formatAsTable([result]);

			expect(output).toBeDefined();
			expect(output).toContain("test.ts");
		});

		test("should format as CSV", () => {
			const result = createMockResult(2);
			const output = formatter.formatAsCSV([result]);

			expect(output).toBeDefined();
			expect(output).toContain(","); // CSV should contain commas
		});

		test("should format as report", () => {
			const result = createMockResult(2);
			const output = formatter.formatAsReport(result);

			expect(output).toBeDefined();
			expect(output).toContain("test.ts");
		});
	});

	describe("Edge Cases", () => {
		test("should handle empty result", () => {
			const result = createMockResult(0);
			const output = formatter.formatAsJSON(result);

			expect(output).toBeDefined();
			expect(() => JSON.parse(output)).not.toThrow();
		});

		test("should handle large results", () => {
			const result = createMockResult(1000);
			const output = formatter.formatAsJSON(result);

			expect(output).toBeDefined();
			expect(() => JSON.parse(output)).not.toThrow();
		});
	});

	describe("Format Consistency", () => {
		test("should maintain consistent output format", () => {
			const result1 = createMockResult(5);
			const result2 = createMockResult(5);

			const output1 = formatter.formatAsJSON(result1);
			const output2 = formatter.formatAsJSON(result2);

			const parsed1 = JSON.parse(output1);
			const parsed2 = JSON.parse(output2);

			// Should have same structure
			expect(Object.keys(parsed1)).toEqual(Object.keys(parsed2));
		});
	});

	describe("Performance Requirements", () => {
		test("should format quickly for reasonable sized results", () => {
			const result = createMockResult(100);

			const startTime = Date.now();
			formatter.formatAsJSON(result);
			const endTime = Date.now();

			expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
		});
	});
});