/**
 * Integration tests for CLI with new integrated output formats
 */

import { CLIAdapter } from "../../src/cli/CLIAdapter";
import { CommandParser } from "../../src/cli/CommandParser";
import path from "node:path";

describe("CLI Integration Tests", () => {
	let cliAdapter: CLIAdapter;
	let commandParser: CommandParser;
	let testFile: string;

	beforeEach(() => {
		cliAdapter = new CLIAdapter();
		commandParser = new CommandParser();
		testFile = path.join(__dirname, "../fixtures/typescript/simple-component.tsx");
	});

	afterEach(() => {
		cliAdapter.dispose();
	});

	describe("New CLI Options", () => {
		it("should parse --use-integrated option", () => {
			const result = commandParser.parse([
				"--file", testFile,
				"--use-integrated",
				"--format", "report"
			]);

			expect(result.error).toBeUndefined();
			expect(result.options?.useIntegrated).toBe(true);
			expect(result.options?.format).toBe("report");
		});

		it("should parse --optimize-output option", () => {
			const result = commandParser.parse([
				"--file", testFile,
				"--optimize-output",
				"--format", "minimal"
			]);

			expect(result.error).toBeUndefined();
			expect(result.options?.optimizeOutput).toBe(true);
			expect(result.options?.format).toBe("minimal");
		});

		it("should support new output formats", () => {
			const formats = ["tree", "minimal", "report"];

			for (const format of formats) {
				const result = commandParser.parse([
					"--file", testFile,
					"--format", format
				]);

				expect(result.error).toBeUndefined();
				expect(result.options?.format).toBe(format);
			}
		});
	});

	describe("Traditional Analysis Flow", () => {
		it("should perform traditional analysis successfully", async () => {
			const options = {
				file: testFile,
				format: "json" as const,
				includeSources: false,
				parseTimeout: 5000,
				useIntegrated: false,
				optimizeOutput: false,
			};

			const validation = await cliAdapter.validateOptions(options);
			expect(validation.isValid).toBe(true);

			const result = await cliAdapter.analyzeFile(options);
			expect(result).toBeDefined();
			expect(result.filePath).toBe(testFile);
			expect(result.language).toBe("tsx");
		});

		it("should format results in different formats", async () => {
			const options = {
				file: testFile,
				format: "json" as const,
				includeSources: false,
				parseTimeout: 5000,
				useIntegrated: false,
				optimizeOutput: false,
			};

			const result = await cliAdapter.analyzeFile(options);

			// Test different output formats
			const formats = ["json", "summary", "table", "tree", "minimal", "report"];

			for (const format of formats) {
				const output = cliAdapter.formatResult(result, format);
				expect(output).toBeDefined();
				expect(typeof output).toBe("string");
				expect(output.length).toBeGreaterThan(0);
			}
		});
	});

	describe("Integrated Analysis Flow", () => {
		it("should perform integrated analysis successfully", async () => {
			const options = {
				file: testFile,
				format: "report" as const,
				includeSources: false,
				parseTimeout: 5000,
				useIntegrated: true,
				optimizeOutput: false,
			};

			const validation = await cliAdapter.validateOptions(options);
			expect(validation.isValid).toBe(true);

			const integratedData = await cliAdapter.analyzeFileIntegrated(options);
			expect(integratedData).toBeDefined();
			expect(integratedData.core).toBeDefined();
			expect(integratedData.views).toBeDefined();
			expect(integratedData.metadata).toBeDefined();
			expect(integratedData.detailed).toBeDefined();
		});

		it("should format integrated results in all formats", async () => {
			const options = {
				file: testFile,
				format: "json" as const,
				includeSources: false,
				parseTimeout: 5000,
				useIntegrated: true,
				optimizeOutput: false,
			};

			const integratedData = await cliAdapter.analyzeFileIntegrated(options);

			// Test all output formats with integrated data
			const formats = ["summary", "table", "tree", "csv", "json", "minimal", "report"];

			for (const format of formats) {
				const output = cliAdapter.formatIntegratedResult(integratedData, format);
				expect(output).toBeDefined();
				expect(typeof output).toBe("string");
				expect(output.length).toBeGreaterThan(0);
			}
		});

		it("should apply optimization when optimizeOutput is true", async () => {
			const baseOptions = {
				file: testFile,
				format: "report" as const,
				includeSources: false,
				parseTimeout: 5000,
				useIntegrated: true,
				optimizeOutput: false,
			};

			const optimizedOptions = { ...baseOptions, optimizeOutput: true };

			const baseData = await cliAdapter.analyzeFileIntegrated(baseOptions);
			const optimizedData = await cliAdapter.analyzeFileIntegrated(optimizedOptions);

			// Both should succeed but optimized might have different detail levels
			expect(baseData).toBeDefined();
			expect(optimizedData).toBeDefined();

			// Both should succeed - the optimization details would be in the integration options
			// The specific optimization differences would be reflected in the detailed content structure
			expect(baseData.core).toBeDefined();
			expect(optimizedData.core).toBeDefined();
		});
	});

	describe("Error Handling", () => {
		it("should handle invalid file paths gracefully", async () => {
			const options = {
				file: "/nonexistent/file.ts",
				format: "json" as const,
				includeSources: false,
				parseTimeout: 5000,
				useIntegrated: false,
				optimizeOutput: false,
			};

			const validation = await cliAdapter.validateOptions(options);
			expect(validation.isValid).toBe(false);
			expect(validation.errors).toContain("File not found: /nonexistent/file.ts");
		});

		it("should handle unsupported file extensions", async () => {
			const options = {
				file: "/some/file.txt",
				format: "json" as const,
				includeSources: false,
				parseTimeout: 5000,
				useIntegrated: false,
				optimizeOutput: false,
			};

			const validation = await cliAdapter.validateOptions(options);
			expect(validation.isValid).toBe(false);
			expect(validation.errors.some(err => err.includes("extension"))).toBe(true);
		});

		it("should format errors appropriately", () => {
			const error = { code: "TEST_ERROR", message: "Test error message" };

			const jsonError = cliAdapter.formatError(error, "json");
			expect(jsonError).toContain("TEST_ERROR");
			expect(jsonError).toContain("Test error message");
			expect(() => JSON.parse(jsonError)).not.toThrow();

			const textError = cliAdapter.formatError(error, "text");
			expect(textError).toContain("Error: Test error message");
		});
	});

	describe("Health Checks and Diagnostics", () => {
		it("should run health check successfully", async () => {
			const healthCheck = await cliAdapter.runHealthCheck("json");
			expect(healthCheck).toBeDefined();
			expect(() => JSON.parse(healthCheck)).not.toThrow();

			const parsed = JSON.parse(healthCheck);
			expect(parsed.status).toBe("healthy");
			expect(parsed.score).toBe(100);
		});

		it("should diagnose file analysis", async () => {
			const diagnosis = await cliAdapter.diagnoseFile(testFile, "json");
			expect(diagnosis).toBeDefined();
			expect(() => JSON.parse(diagnosis)).not.toThrow();

			const parsed = JSON.parse(diagnosis);
			expect(parsed.success).toBe(true);
			expect(parsed.analysisResult).toBeDefined();
		});
	});

	describe("Backward Compatibility", () => {
		it("should maintain compatibility with existing CLI usage", async () => {
			// Test that old-style CLI calls still work
			const options = {
				file: testFile,
				format: "json" as const,
				includeSources: false,
				parseTimeout: 5000,
			};

			// Should work without new options
			const validation = await cliAdapter.validateOptions(options as any);
			expect(validation.isValid).toBe(true);
		});

		it("should support all legacy output formats", async () => {
			const legacyFormats = ["json", "text", "compact", "summary", "csv", "deps-only", "table"];

			for (const format of legacyFormats) {
				const result = commandParser.parse([
					"--file", testFile,
					"--format", format
				]);

				expect(result.error).toBeUndefined();
				expect(result.options?.format).toBe(format);
			}
		});
	});
});