/**
 * Integration tests for Output Formatting system
 */

import { UniversalFormatter } from "../../src/cli/formatters/UniversalFormatter";
import { IntegratedOutputFormatter } from "../../src/cli/formatters/IntegratedOutputFormatter";
import { AnalysisEngine } from "../../src/services/AnalysisEngine";
import { DataIntegrator } from "../../src/services/integration/DataIntegrator";
import type { DataIntegrationConfig } from "../../src/models/IntegratedData";
import path from "node:path";

describe("Output Formatting Integration Tests", () => {
	let analysisEngine: AnalysisEngine;
	let dataIntegrator: DataIntegrator;
	let universalFormatter: UniversalFormatter;
	let integratedFormatter: IntegratedOutputFormatter;
	let testFile: string;

	beforeEach(() => {
		analysisEngine = new AnalysisEngine({
			useCache: false,
			timeout: 5000,
			extractors: ["dependency", "identifier", "complexity"],
			interpreters: ["dependency-analysis", "identifier-analysis"],
		});
		dataIntegrator = new DataIntegrator();
		universalFormatter = new UniversalFormatter();
		integratedFormatter = new IntegratedOutputFormatter();
		testFile = path.join(__dirname, "../fixtures/typescript/simple-component.tsx");
	});

	describe("Universal Formatter", () => {
		it("should auto-detect and format AnalysisResult", async () => {
			const result = await analysisEngine.analyzeFile(testFile, {
				useCache: false,
				timeout: 5000,
				extractors: ["dependency", "identifier"],
				interpreters: ["dependency-analysis"],
			});

			const formats = ["summary", "table", "tree", "csv", "json", "minimal", "report"];

			for (const format of formats) {
				const output = universalFormatter.format(result, { format: format as any });
				expect(output).toBeDefined();
				expect(typeof output).toBe("string");
				expect(output.length).toBeGreaterThan(0);

				// Format-specific validations
				if (format === "json") {
					expect(() => JSON.parse(output)).not.toThrow();
				}
				if (format === "csv") {
					expect(output).toContain(",");
				}
				if (format === "minimal") {
					expect(output.split("\n").length).toBe(1); // Should be one line
				}
			}
		});

		it("should auto-detect and format IntegratedAnalysisData", async () => {
			const result = await analysisEngine.analyzeFile(testFile, {
				useCache: false,
				timeout: 5000,
				extractors: ["dependency", "identifier", "complexity"],
				interpreters: ["dependency-analysis", "identifier-analysis"],
			});

			const config: DataIntegrationConfig = {
				enabledViews: ["summary", "table", "tree", "csv", "minimal"],
				detailLevel: "comprehensive",
				optimizationMode: "balanced",
				sizeLimits: {
					maxStringLength: 1000,
					maxArrayLength: 100,
					maxDepth: 10
				}
			};

			const integratedData = await dataIntegrator.integrate(result, config);
			const formats = ["summary", "table", "tree", "csv", "json", "minimal", "report"];

			for (const format of formats) {
				const output = universalFormatter.format(integratedData, { format: format as any });
				expect(output).toBeDefined();
				expect(typeof output).toBe("string");
				expect(output.length).toBeGreaterThan(0);

				// Integrated data should generally produce richer output
				if (format === "report") {
					expect(output).toContain("Analysis Report");
					expect(output).toContain("Performance Metrics");
				}
			}
		});

		it("should handle arrays of data", async () => {
			const result1 = await analysisEngine.analyzeFile(testFile, {
				useCache: false,
				timeout: 5000,
				extractors: ["dependency"],
				interpreters: ["dependency-analysis"],
			});

			const result2 = await analysisEngine.analyzeFile(testFile, {
				useCache: false,
				timeout: 5000,
				extractors: ["identifier"],
				interpreters: ["identifier-analysis"],
			});

			const results = [result1, result2];

			const output = universalFormatter.format(results, { format: "summary" });
			expect(output).toBeDefined();
			expect(output.split("\n").length).toBeGreaterThanOrEqual(2); // At least two lines for two results
		});

		it("should provide format suggestions", async () => {
			const result = await analysisEngine.analyzeFile(testFile, {
				useCache: false,
				timeout: 5000,
				extractors: ["dependency"],
				interpreters: ["dependency-analysis"],
			});

			// Single result
			const singleSuggestion = universalFormatter.suggestFormat(result);
			expect(["json", "summary", "report", "table"].includes(singleSuggestion.recommended)).toBe(true);
			expect(singleSuggestion.alternatives).toContain("json");
			expect(singleSuggestion.reason.toLowerCase()).toContain("single file");

			// Multiple results
			const multiSuggestion = universalFormatter.suggestFormat([result, result, result]);
			expect(multiSuggestion.recommended).toBe("table");
			expect(multiSuggestion.alternatives).toContain("summary");
		});

		it("should optimize output for large datasets", async () => {
			const result = await analysisEngine.analyzeFile(testFile, {
				useCache: false,
				timeout: 5000,
				extractors: ["dependency"],
				interpreters: ["dependency-analysis"],
			});

			// Create a large dataset simulation
			const largeDataset = Array(150).fill(result);

			const optimized = universalFormatter.formatOptimized(largeDataset, "report", 5000);
			expect(optimized.optimized).toBeDefined();
			expect(optimized.actualFormat).toBeDefined();
			expect(optimized.content.length).toBeLessThanOrEqual(10000);
		});

		it("should generate metadata about formatting", async () => {
			const result = await analysisEngine.analyzeFile(testFile, {
				useCache: false,
				timeout: 5000,
				extractors: ["dependency"],
				interpreters: ["dependency-analysis"],
			});

			const withMetadata = universalFormatter.formatWithMetadata(result, { format: "json" });
			expect(withMetadata.content).toBeDefined();
			expect(withMetadata.metadata.format).toBe("json");
			expect(withMetadata.metadata.dataType).toBe("AnalysisResult");
			expect(withMetadata.metadata.itemCount).toBe(1);
			expect(withMetadata.metadata.outputSize).toBeGreaterThan(0);
			expect(withMetadata.metadata.processingTime).toBeGreaterThan(0);
		});
	});

	describe("Integrated Output Formatter", () => {
		it("should format all supported formats", async () => {
			const result = await analysisEngine.analyzeFile(testFile, {
				useCache: false,
				timeout: 5000,
				extractors: ["dependency", "identifier", "complexity"],
				interpreters: ["dependency-analysis", "identifier-analysis"],
			});

			const config: DataIntegrationConfig = {
				enabledViews: ["summary", "table", "tree", "csv", "minimal"],
				detailLevel: "comprehensive",
				optimizationMode: "balanced",
				sizeLimits: {
					maxStringLength: 1000,
					maxArrayLength: 100,
					maxDepth: 10
				}
			};

			const integratedData = await dataIntegrator.integrate(result, config);
			const formats = ["summary", "table", "tree", "csv", "json", "minimal", "report"];

			for (const format of formats) {
				const output = integratedFormatter.format(integratedData, {
					format: format as any,
					includeHeaders: true,
					showMetrics: true
				});
				expect(output).toBeDefined();
				expect(typeof output).toBe("string");
				expect(output.length).toBeGreaterThan(0);
			}
		});

		it("should handle format-specific options", async () => {
			const result = await analysisEngine.analyzeFile(testFile, {
				useCache: false,
				timeout: 5000,
				extractors: ["dependency", "identifier"],
				interpreters: ["dependency-analysis"],
			});

			const config: DataIntegrationConfig = {
				enabledViews: ["summary", "table", "csv"],
				detailLevel: "standard",
				optimizationMode: "balanced",
				sizeLimits: {
					maxStringLength: 1000,
					maxArrayLength: 100,
					maxDepth: 10
				}
			};

			const integratedData = await dataIntegrator.integrate(result, config);

			// Test CSV with and without headers
			const csvWithHeaders = integratedFormatter.format(integratedData, {
				format: "csv",
				includeHeaders: true
			});
			const csvWithoutHeaders = integratedFormatter.format(integratedData, {
				format: "csv",
				includeHeaders: false
			});

			expect(csvWithHeaders).toContain("File,Language,Dependencies");
			expect(csvWithoutHeaders).not.toContain("File,Language,Dependencies");

			// Test JSON compact vs pretty
			const jsonCompact = integratedFormatter.format(integratedData, {
				format: "json",
				compact: true
			});
			const jsonPretty = integratedFormatter.format(integratedData, {
				format: "json",
				compact: false
			});

			expect(jsonCompact.length).toBeLessThan(jsonPretty.length);
			expect(jsonPretty).toContain("\n  "); // Should have indentation
		});

		it("should format multiple data items correctly", async () => {
			const result = await analysisEngine.analyzeFile(testFile, {
				useCache: false,
				timeout: 5000,
				extractors: ["dependency"],
				interpreters: ["dependency-analysis"],
			});

			const config: DataIntegrationConfig = {
				enabledViews: ["summary", "table"],
				detailLevel: "standard",
				optimizationMode: "speed",
				sizeLimits: {
					maxStringLength: 1000,
					maxArrayLength: 100,
					maxDepth: 10
				}
			};

			const integratedData1 = await dataIntegrator.integrate(result, config);
			const integratedData2 = await dataIntegrator.integrate(result, config);

			const multipleData = [integratedData1, integratedData2];

			// Test different formats with multiple items
			const summaryOutput = integratedFormatter.format(multipleData, { format: "summary" });
			expect(summaryOutput.split("\n").length).toBeGreaterThanOrEqual(2);

			const tableOutput = integratedFormatter.format(multipleData, { format: "table" });
			expect(tableOutput).toContain("┌"); // ASCII table borders
			expect(tableOutput).toContain("│"); // ASCII table separators

			const reportOutput = integratedFormatter.format(multipleData, { format: "report" });
			expect(reportOutput).toContain("Report 1 of 2");
			expect(reportOutput).toContain("Report 2 of 2");
		});

		it("should create proper ASCII tables", async () => {
			const result = await analysisEngine.analyzeFile(testFile, {
				useCache: false,
				timeout: 5000,
				extractors: ["dependency"],
				interpreters: ["dependency-analysis"],
			});

			const config: DataIntegrationConfig = {
				enabledViews: ["table"],
				detailLevel: "standard",
				optimizationMode: "balanced",
				sizeLimits: {
					maxStringLength: 1000,
					maxArrayLength: 100,
					maxDepth: 10
				}
			};

			const integratedData = await dataIntegrator.integrate(result, config);

			const tableOutput = integratedFormatter.format(integratedData, {
				format: "table",
				maxWidth: 100
			});

			// Verify ASCII table structure
			expect(tableOutput).toContain("┌");  // Top left corner
			expect(tableOutput).toContain("┐");  // Top right corner
			expect(tableOutput).toContain("└");  // Bottom left corner
			expect(tableOutput).toContain("┘");  // Bottom right corner
			expect(tableOutput).toContain("│");  // Vertical separators
			expect(tableOutput).toContain("─");  // Horizontal separators
		});

		it("should format tree structures correctly", async () => {
			const result = await analysisEngine.analyzeFile(testFile, {
				useCache: false,
				timeout: 5000,
				extractors: ["dependency", "identifier"],
				interpreters: ["dependency-analysis", "identifier-analysis"],
			});

			const config: DataIntegrationConfig = {
				enabledViews: ["tree"],
				detailLevel: "comprehensive",
				optimizationMode: "accuracy",
				sizeLimits: {
					maxStringLength: 1000,
					maxArrayLength: 100,
					maxDepth: 10
				}
			};

			const integratedData = await dataIntegrator.integrate(result, config);

			const treeOutput = integratedFormatter.format(integratedData, { format: "tree" });

			// Verify tree structure characters
			expect(treeOutput).toContain("└──");  // Last item connector
			expect(treeOutput).toContain("├──");  // Middle item connector
		});
	});

	describe("Format Validation", () => {
		it("should validate formats for different data types", async () => {
			const result = await analysisEngine.analyzeFile(testFile, {
				useCache: false,
				timeout: 5000,
				extractors: ["dependency"],
				interpreters: ["dependency-analysis"],
			});

			// Test with AnalysisResult
			expect(universalFormatter.validateFormat(result, "json")).toBe(true);
			expect(universalFormatter.validateFormat(result, "summary")).toBe(true);
			expect(universalFormatter.validateFormat(result, "invalid")).toBe(false);

			// Test available formats
			const availableFormats = universalFormatter.getAvailableFormats(result);
			expect(availableFormats).toContain("json");
			expect(availableFormats).toContain("summary");
			expect(availableFormats).toContain("minimal");
		});

		it("should provide comprehensive formatter statistics", () => {
			const stats = universalFormatter.getFormatterStats();
			expect(stats.supportedFormats).toContain("json");
			expect(stats.supportedFormats).toContain("report");
			expect(stats.supportedDataTypes).toContain("AnalysisResult");
			expect(stats.supportedDataTypes).toContain("IntegratedAnalysisData");
			expect(stats.features).toContain("Auto-detection of data types");
		});
	});

	describe("Performance and Memory", () => {
		it("should format large datasets efficiently", async () => {
			const result = await analysisEngine.analyzeFile(testFile, {
				useCache: false,
				timeout: 5000,
				extractors: ["dependency"],
				interpreters: ["dependency-analysis"],
			});

			const config: DataIntegrationConfig = {
				enabledViews: ["summary", "minimal"],
				detailLevel: "standard",
				optimizationMode: "speed",
				sizeLimits: {
					maxStringLength: 100,
					maxArrayLength: 20,
					maxDepth: 5
				}
			};

			const integratedData = await dataIntegrator.integrate(result, config);

			// Simulate large dataset
			const largeDataset = Array(100).fill(integratedData);

			const startTime = performance.now();
			const output = universalFormatter.format(largeDataset, { format: "minimal" });
			const endTime = performance.now();

			expect(output).toBeDefined();
			expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
			expect(output.split("\n").length).toBe(100); // One line per item for minimal format
		});

		it("should handle memory constraints gracefully", async () => {
			const result = await analysisEngine.analyzeFile(testFile, {
				useCache: false,
				timeout: 5000,
				extractors: ["dependency"],
				interpreters: ["dependency-analysis"],
			});

			const config: DataIntegrationConfig = {
				enabledViews: ["summary"],
				detailLevel: "standard",
				optimizationMode: "speed",
				sizeLimits: {
					maxStringLength: 50,   // Very restrictive
					maxArrayLength: 5,     // Very restrictive
					maxDepth: 2           // Very shallow
				}
			};

			const integratedData = await dataIntegrator.integrate(result, config);

			// Should not throw errors even with very restrictive limits
			const output = universalFormatter.format(integratedData, { format: "json" });
			expect(output).toBeDefined();
			expect(() => JSON.parse(output)).not.toThrow();
		});
	});
});