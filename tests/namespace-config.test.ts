/**
 * Namespace Configuration Tests
 * Tests for NamespaceConfig type extensions and ConfigManager scenario validation
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigManager } from "../src/namespace/ConfigManager";
import type { NamespaceConfig } from "../src/namespace/types";
import {
	hasScenario,
	reinitializeBuiltinScenarios,
} from "../src/scenarios/index";

describe("Namespace Configuration - Phase 1", () => {
	let configManager: ConfigManager;
	let tempDir: string;
	let configPath: string;

	beforeEach(async () => {
		// Ensure built-in scenarios are initialized
		reinitializeBuiltinScenarios();

		configManager = new ConfigManager();
		tempDir = await mkdtemp(join(tmpdir(), "namespace-config-test-"));
		configPath = join(tempDir, "namespaces.json");
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	describe("NamespaceConfig Type Extensions", () => {
		it("should accept scenarios field in NamespaceConfig", async () => {
			const config: NamespaceConfig = {
				filePatterns: ["src/**/*.ts"],
				scenarios: ["basic-structure", "file-dependency"],
			};

			// Should not throw
			await configManager.setNamespaceConfig("test", config, configPath);

			const loaded = await configManager.loadNamespacedConfig(
				configPath,
				"test",
			);
			expect(loaded.scenarios).toEqual([
				"basic-structure",
				"file-dependency",
			]);
		});

		it("should accept scenarioConfig field in NamespaceConfig", async () => {
			const config: NamespaceConfig = {
				filePatterns: ["src/**/*.ts"],
				scenarios: ["symbol-dependency"],
				scenarioConfig: {
					"symbol-dependency": {
						detectCalls: true,
						detectInstantiation: true,
					},
				},
			};

			await configManager.setNamespaceConfig("test", config, configPath);

			const loaded = await configManager.loadNamespacedConfig(
				configPath,
				"test",
			);
			expect(loaded.scenarioConfig).toEqual({
				"symbol-dependency": {
					detectCalls: true,
					detectInstantiation: true,
				},
			});
		});

		it("should allow optional scenarios and scenarioConfig fields", async () => {
			const config: NamespaceConfig = {
				filePatterns: ["src/**/*.ts"],
				// No scenarios or scenarioConfig
			};

			await configManager.setNamespaceConfig("test", config, configPath);

			const loaded = await configManager.loadNamespacedConfig(
				configPath,
				"test",
			);
			expect(loaded.scenarios).toBeUndefined();
			expect(loaded.scenarioConfig).toBeUndefined();
		});
	});

	describe("ConfigManager Scenario Validation", () => {
		it("should validate scenario IDs when setting namespace config", async () => {
			const config: NamespaceConfig = {
				filePatterns: ["src/**/*.ts"],
				scenarios: ["basic-structure", "file-dependency"],
			};

			// Should not throw for valid scenarios
			await expect(
				configManager.setNamespaceConfig("test", config, configPath),
			).resolves.not.toThrow();
		});

		it("should reject invalid scenario IDs", async () => {
			const config: NamespaceConfig = {
				filePatterns: ["src/**/*.ts"],
				scenarios: ["invalid-scenario", "another-invalid"],
			};

			await expect(
				configManager.setNamespaceConfig("test", config, configPath),
			).rejects.toThrow(
				"Invalid scenario IDs: invalid-scenario, another-invalid",
			);
		});

		it("should reject mixed valid and invalid scenario IDs", async () => {
			const config: NamespaceConfig = {
				filePatterns: ["src/**/*.ts"],
				scenarios: ["basic-structure", "invalid-scenario"],
			};

			await expect(
				configManager.setNamespaceConfig("test", config, configPath),
			).rejects.toThrow("Invalid scenario IDs: invalid-scenario");
		});

		it("should allow empty scenarios array", async () => {
			const config: NamespaceConfig = {
				filePatterns: ["src/**/*.ts"],
				scenarios: [],
			};

			await expect(
				configManager.setNamespaceConfig("test", config, configPath),
			).resolves.not.toThrow();
		});

		it("should validate all built-in scenarios", async () => {
			const builtinScenarios = [
				"basic-structure",
				"file-dependency",
				"symbol-dependency",
				"markdown-linking",
			];

			for (const scenarioId of builtinScenarios) {
				expect(hasScenario(scenarioId)).toBe(true);
			}

			const config: NamespaceConfig = {
				filePatterns: ["src/**/*.ts"],
				scenarios: builtinScenarios,
			};

			await expect(
				configManager.setNamespaceConfig("test", config, configPath),
			).resolves.not.toThrow();
		});
	});

	describe("Configuration File Persistence", () => {
		it("should persist scenarios in config file", async () => {
			const config: NamespaceConfig = {
				filePatterns: ["src/**/*.ts"],
				scenarios: ["basic-structure", "symbol-dependency"],
				scenarioConfig: {
					"symbol-dependency": {
						detectCalls: true,
					},
				},
			};

			await configManager.setNamespaceConfig("test", config, configPath);

			// Read config file directly
			const configFile = await configManager.loadConfig(configPath);
			expect(configFile.namespaces.test.scenarios).toEqual([
				"basic-structure",
				"symbol-dependency",
			]);
			expect(configFile.namespaces.test.scenarioConfig).toEqual({
				"symbol-dependency": {
					detectCalls: true,
				},
			});
		});

		it("should support multiple namespaces with different scenarios", async () => {
			const frontendConfig: NamespaceConfig = {
				filePatterns: ["packages/web/**/*.tsx"],
				scenarios: ["basic-structure", "symbol-dependency"],
			};

			const backendConfig: NamespaceConfig = {
				filePatterns: ["packages/backend/**/*.ts"],
				scenarios: ["basic-structure", "file-dependency"],
			};

			const docsConfig: NamespaceConfig = {
				filePatterns: ["docs/**/*.md"],
				scenarios: ["markdown-linking"],
			};

			await configManager.setNamespaceConfig(
				"frontend",
				frontendConfig,
				configPath,
			);
			await configManager.setNamespaceConfig(
				"backend",
				backendConfig,
				configPath,
			);
			await configManager.setNamespaceConfig("docs", docsConfig, configPath);

			const configFile = await configManager.loadConfig(configPath);
			expect(configFile.namespaces.frontend.scenarios).toEqual([
				"basic-structure",
				"symbol-dependency",
			]);
			expect(configFile.namespaces.backend.scenarios).toEqual([
				"basic-structure",
				"file-dependency",
			]);
			expect(configFile.namespaces.docs.scenarios).toEqual([
				"markdown-linking",
			]);
		});
	});

	describe("Backward Compatibility", () => {
		it("should support namespaces without scenarios field", async () => {
			// Old-style config without scenarios
			const config: NamespaceConfig = {
				filePatterns: ["src/**/*.ts"],
				semanticTags: ["source"],
			};

			await configManager.setNamespaceConfig("test", config, configPath);

			const loaded = await configManager.loadNamespacedConfig(
				configPath,
				"test",
			);
			expect(loaded.filePatterns).toEqual(["src/**/*.ts"]);
			expect(loaded.semanticTags).toEqual(["source"]);
			expect(loaded.scenarios).toBeUndefined();
		});

		it("should preserve existing config fields when adding scenarios", async () => {
			const initialConfig: NamespaceConfig = {
				filePatterns: ["src/**/*.ts"],
				excludePatterns: ["**/*.test.ts"],
				description: "Source files",
				semanticTags: ["source", "production"],
			};

			await configManager.setNamespaceConfig(
				"test",
				initialConfig,
				configPath,
			);

			// Update with scenarios
			const updatedConfig: NamespaceConfig = {
				...initialConfig,
				scenarios: ["basic-structure", "file-dependency"],
			};

			await configManager.setNamespaceConfig(
				"test",
				updatedConfig,
				configPath,
			);

			const loaded = await configManager.loadNamespacedConfig(
				configPath,
				"test",
			);
			expect(loaded.filePatterns).toEqual(["src/**/*.ts"]);
			expect(loaded.excludePatterns).toEqual(["**/*.test.ts"]);
			expect(loaded.description).toBe("Source files");
			expect(loaded.semanticTags).toEqual(["source", "production"]);
			expect(loaded.scenarios).toEqual(["basic-structure", "file-dependency"]);
		});
	});
});
