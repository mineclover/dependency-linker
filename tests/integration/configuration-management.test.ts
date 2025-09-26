/**
 * Integration tests for Configuration Management
 */

import { IntegrationConfigManager } from "../../src/config/IntegrationConfig";
import { CLIAdapter } from "../../src/cli/CLIAdapter";
import { CommandParser, type CliOptions } from "../../src/cli/CommandParser";
import path from "node:path";

describe("Configuration Management Integration Tests", () => {
	let configManager: IntegrationConfigManager;
	let cliAdapter: CLIAdapter;
	let commandParser: CommandParser;
	let testFile: string;

	beforeEach(() => {
		configManager = new IntegrationConfigManager();
		cliAdapter = new CLIAdapter();
		commandParser = new CommandParser();
		testFile = path.join(
			__dirname,
			"../fixtures/typescript/simple-component.tsx",
		);
	});

	afterEach(() => {
		cliAdapter.dispose();
	});

	describe("Configuration Manager", () => {
		it("should provide built-in presets", () => {
			const presets = configManager.getPresets();

			expect(presets).toBeDefined();
			expect(presets.fast).toBeDefined();
			expect(presets.balanced).toBeDefined();
			expect(presets.comprehensive).toBeDefined();
			expect(presets.lightweight).toBeDefined();
			expect(presets.debug).toBeDefined();

			// Verify preset structure
			expect(presets.fast.name).toBe("fast");
			expect(presets.fast.description).toContain("Fast processing");
			expect(presets.fast.config).toBeDefined();
			expect(presets.fast.optimization).toBeDefined();
		});

		it("should generate configuration from CLI options", () => {
			const config = configManager.getConfigForCLI({
				preset: "fast",
				detailLevel: "comprehensive",
				maxStringLength: 500,
			});

			expect(config).toBeDefined();
			expect(config.detailLevel).toBe("comprehensive"); // Override should work
			expect(config.sizeLimits.maxStringLength).toBe(500); // Override should work
			expect(config.optimizationMode).toBe("speed"); // From fast preset
		});

		it("should validate configurations", () => {
			const validConfig = configManager.getPresetConfig("balanced");
			const validation = configManager.validateConfig(validConfig);

			expect(validation.isValid).toBe(true);
			expect(validation.errors).toHaveLength(0);
		});

		it("should detect invalid configurations", () => {
			const invalidConfig = {
				enabledViews: [], // Empty views should be invalid
				detailLevel: "standard" as const,
				optimizationMode: "balanced" as const,
				sizeLimits: {
					maxStringLength: -1, // Negative should be invalid
					maxArrayLength: 100,
					maxDepth: 10,
				},
			};

			const validation = configManager.validateConfig(invalidConfig);

			expect(validation.isValid).toBe(false);
			expect(validation.errors.length).toBeGreaterThan(0);
			expect(validation.errors.some((e) => e.includes("view"))).toBe(true);
			expect(validation.errors.some((e) => e.includes("positive"))).toBe(true);
		});

		it("should generate warnings for performance issues", () => {
			const config = configManager.getConfigForCLI({
				detailLevel: "comprehensive",
				enabledViews: ["summary", "table", "tree", "csv", "minimal"],
				maxStringLength: 15000, // Very large
			});

			const validation = configManager.validateConfig(config);

			expect(validation.isValid).toBe(true);
			expect(validation.warnings.length).toBeGreaterThan(0);
			expect(validation.warnings.some((w) => w.includes("performance"))).toBe(
				true,
			);
		});
	});

	describe("CLI Integration", () => {
		it("should parse preset option", () => {
			const result = commandParser.parse([
				"--file",
				testFile,
				"--use-integrated",
				"--preset",
				"fast",
				"--format",
				"json",
			]);

			expect(result.error).toBeUndefined();
			expect(result.options?.preset).toBe("fast");
			expect(result.options?.useIntegrated).toBe(true);
		});

		it("should parse detailed configuration options", () => {
			const result = commandParser.parse([
				"--file",
				testFile,
				"--use-integrated",
				"--detail-level",
				"comprehensive",
				"--optimization-mode",
				"accuracy",
				"--enabled-views",
				"summary,table,tree",
				"--max-string-length",
				"2000",
				"--max-array-length",
				"200",
				"--max-depth",
				"15",
			]);

			expect(result.error).toBeUndefined();
			expect(result.options?.detailLevel).toBe("comprehensive");
			expect(result.options?.optimizationMode).toBe("accuracy");
			expect(result.options?.enabledViews).toEqual([
				"summary",
				"table",
				"tree",
			]);
			expect(result.options?.maxStringLength).toBe(2000);
			expect(result.options?.maxArrayLength).toBe(200);
			expect(result.options?.maxDepth).toBe(15);
		});

		it("should validate invalid CLI options", () => {
			const invalidResults = [
				commandParser.parse(["--file", testFile, "--detail-level", "invalid"]),
				commandParser.parse([
					"--file",
					testFile,
					"--optimization-mode",
					"invalid",
				]),
				commandParser.parse([
					"--file",
					testFile,
					"--enabled-views",
					"invalid,views",
				]),
				commandParser.parse(["--file", testFile, "--max-string-length", "0"]),
				commandParser.parse(["--file", testFile, "--max-array-length", "-5"]),
			];

			for (const result of invalidResults) {
				expect(result.error).toBeDefined();
				expect(result.error?.exitCode).toBe(1);
			}
		});

		it("should use configuration manager in CLI adapter", async () => {
			const options = {
				file: testFile,
				format: "json",
				useIntegrated: true,
				preset: "fast",
			};

			const validation = cliAdapter.validateConfiguration(options);
			expect(validation.isValid).toBe(true);

			const config = cliAdapter.getEffectiveConfiguration(options);
			expect(config).toContain("fast");
			expect(config).toContain("Detail Level:");
			expect(config).toContain("Optimization Mode:");
		});

		it("should list presets through CLI adapter", () => {
			const textOutput = cliAdapter.listPresets("text");
			const jsonOutput = cliAdapter.listPresets("json");

			expect(textOutput).toContain("FAST");
			expect(textOutput).toContain("BALANCED");
			expect(textOutput).toContain("COMPREHENSIVE");

			const parsedJson = JSON.parse(jsonOutput);
			expect(parsedJson.fast).toBeDefined();
			expect(parsedJson.balanced).toBeDefined();
			expect(parsedJson.comprehensive).toBeDefined();
		});
	});

	describe("Integrated Analysis with Configuration", () => {
		it("should perform analysis with fast preset", async () => {
			const options = {
				file: testFile,
				format: "json",
				useIntegrated: true,
				preset: "fast",
			};

			const result = await cliAdapter.analyzeFileIntegrated(options);

			expect(result).toBeDefined();
			expect(result.core).toBeDefined();
			expect(result.views).toBeDefined();
			expect(result.metadata).toBeDefined();

			// Fast preset should have minimal views
			expect(result.views.summary).toBeDefined();
			expect(result.views.minimal).toBeDefined();
		});

		it("should perform analysis with comprehensive preset", async () => {
			const options = {
				file: testFile,
				format: "json",
				useIntegrated: true,
				preset: "comprehensive",
			};

			const result = await cliAdapter.analyzeFileIntegrated(options);

			expect(result).toBeDefined();
			expect(result.core).toBeDefined();
			expect(result.views).toBeDefined();

			// Comprehensive preset should have all views
			expect(result.views.summary).toBeDefined();
			expect(result.views.table).toBeDefined();
			expect(result.views.tree).toBeDefined();
			expect(result.views.csv).toBeDefined();
			expect(result.views.minimal).toBeDefined();
		});

		it("should respect custom view configuration", async () => {
			const options = {
				file: testFile,
				format: "json",
				useIntegrated: true,
				enabledViews: ["summary", "table"],
				detailLevel: "standard" as const,
				maxStringLength: 500,
			};

			const result = await cliAdapter.analyzeFileIntegrated(options);

			expect(result).toBeDefined();
			expect(result.views.summary).toBeDefined();
			expect(result.views.table).toBeDefined();

			// String length should be respected in output
			expect(result.views.summary.fileName.length).toBeLessThanOrEqual(500);
		});

		it("should handle configuration validation errors", async () => {
			const options = {
				file: testFile,
				format: "json",
				useIntegrated: true,
				enabledViews: [], // Invalid: empty views
				maxStringLength: -1, // Invalid: negative
			};

			await expect(cliAdapter.analyzeFileIntegrated(options)).rejects.toThrow();
		});

		it("should show configuration warnings", async () => {
			const consoleSpy = jest
				.spyOn(console, "warn")
				.mockImplementation(() => {});

			const options = {
				file: testFile,
				format: "json",
				useIntegrated: true,
				detailLevel: "comprehensive" as const,
				enabledViews: ["summary", "table", "tree", "csv", "minimal"], // Many views
				maxStringLength: 15000, // Very large
			};

			const result = await cliAdapter.analyzeFileIntegrated(options);

			expect(result).toBeDefined();
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Configuration warnings:"),
				expect.stringContaining("performance"),
			);

			consoleSpy.mockRestore();
		});
	});

	describe("Environment Variable Support", () => {
		it("should respect environment variables in command parser", () => {
			const originalEnv = process.env;

			// Set environment variables
			process.env.ANALYZE_FORMAT = "table";
			process.env.ANALYZE_INCLUDE_SOURCES = "true";
			process.env.ANALYZE_TIMEOUT = "10000";

			const envOptions = commandParser.parseEnvironment();

			expect(envOptions.format).toBe("table");
			expect(envOptions.includeSources).toBe(true);
			expect(envOptions.parseTimeout).toBe(10000);

			// Restore environment
			process.env = originalEnv;
		});

		it("should merge environment and CLI options correctly", () => {
			const originalEnv = process.env;

			// Set environment variables
			process.env.ANALYZE_FORMAT = "table";
			process.env.ANALYZE_INCLUDE_SOURCES = "true";

			const cliOptions: CliOptions = {
				file: testFile,
				format: "json", // Should override environment
				includeSources: false, // Should override environment
				parseTimeout: 5000,
				useIntegrated: false,
				optimizeOutput: false,
				help: false,
				version: false,
			};

			const merged = commandParser.mergeWithEnvironment(cliOptions);

			expect(merged.format).toBe("json"); // CLI wins
			expect(merged.includeSources).toBe(false); // CLI wins

			// Restore environment
			process.env = originalEnv;
		});
	});
});
