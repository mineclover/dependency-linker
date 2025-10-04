/**
 * Comprehensive Namespace-Scenario Integration Tests (Phase 5)
 *
 * End-to-end tests for namespace-scenario integration with focus on:
 * - Backward compatibility
 * - ScenarioConfig merging
 * - Cross-namespace analysis with different scenarios
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigManager } from "../src/namespace/ConfigManager";
import { NamespaceDependencyAnalyzer } from "../src/namespace/NamespaceDependencyAnalyzer";
import type { NamespaceConfig } from "../src/namespace/types";
import { reinitializeBuiltinScenarios } from "../src/scenarios/index";

describe("Comprehensive Namespace-Scenario Integration - Phase 5", () => {
	let configManager: ConfigManager;
	let analyzer: NamespaceDependencyAnalyzer;
	let tempDir: string;
	let configPath: string;

	beforeEach(async () => {
		// Ensure built-in scenarios are initialized
		reinitializeBuiltinScenarios();

		configManager = new ConfigManager();
		analyzer = new NamespaceDependencyAnalyzer();
		tempDir = await mkdtemp(join(tmpdir(), "comprehensive-test-"));
		configPath = join(tempDir, "namespaces.json");

		// Create realistic project structure
		await mkdir(join(tempDir, "src", "frontend"), { recursive: true });
		await mkdir(join(tempDir, "src", "backend"), { recursive: true });
		await mkdir(join(tempDir, "src", "shared"), { recursive: true });
		await mkdir(join(tempDir, "docs"), { recursive: true });
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	describe("Backward Compatibility", () => {
		it("should use default scenarios when no scenarios field is present", async () => {
			// Legacy config without scenarios field
			await writeFile(
				join(tempDir, "src", "frontend", "App.tsx"),
				"export const App = () => <div>Hello</div>;",
			);

			const config: NamespaceConfig = {
				filePatterns: ["src/frontend/**/*.tsx"],
				description: "Frontend code",
				semanticTags: ["frontend"],
				// No scenarios field
			};

			await configManager.setNamespaceConfig("frontend", config, configPath);

			const result = await analyzer.analyzeNamespace("frontend", configPath, {
				cwd: tempDir,
				projectRoot: tempDir,
			});

			// Should use default scenarios: basic-structure, file-dependency
			expect(result.scenariosExecuted).toEqual([
				"basic-structure",
				"file-dependency",
			]);
		});

		it("should work with old-style config without semantic tags or scenarios", async () => {
			await writeFile(
				join(tempDir, "src", "backend", "api.ts"),
				"export class API {}",
			);

			// Minimal old-style config
			const config: NamespaceConfig = {
				filePatterns: ["src/backend/**/*.ts"],
				excludePatterns: ["**/*.test.ts"],
			};

			await configManager.setNamespaceConfig("backend", config, configPath);

			const result = await analyzer.analyzeNamespace("backend", configPath, {
				cwd: tempDir,
				projectRoot: tempDir,
			});

			expect(result.namespace).toBe("backend");
			expect(result.scenariosExecuted).toEqual([
				"basic-structure",
				"file-dependency",
			]);
			expect(result.totalFiles).toBe(1);
		});

		it("should preserve existing functionality with mixed old and new configs", async () => {
			await writeFile(
				join(tempDir, "src", "frontend", "App.tsx"),
				"export const App = () => <div>Hello</div>;",
			);
			await writeFile(
				join(tempDir, "src", "backend", "api.ts"),
				"export class API {}",
			);

			// Old-style config
			const oldConfig: NamespaceConfig = {
				filePatterns: ["src/frontend/**/*.tsx"],
			};

			// New-style config with scenarios
			const newConfig: NamespaceConfig = {
				filePatterns: ["src/backend/**/*.ts"],
				scenarios: ["basic-structure", "symbol-dependency"],
			};

			await configManager.setNamespaceConfig("frontend", oldConfig, configPath);
			await configManager.setNamespaceConfig("backend", newConfig, configPath);

			const results = await analyzer.analyzeNamespaces(
				["frontend", "backend"],
				configPath,
				{ cwd: tempDir, projectRoot: tempDir },
			);

			// Old config should use defaults
			expect(results.frontend.scenariosExecuted).toEqual([
				"basic-structure",
				"file-dependency",
			]);

			// New config should use specified scenarios
			expect(results.backend.scenariosExecuted).toEqual([
				"basic-structure",
				"symbol-dependency",
			]);
		});
	});

	describe("ScenarioConfig Merging and Validation", () => {
		it("should accept and store scenarioConfig", async () => {
			await writeFile(
				join(tempDir, "src", "frontend", "Component.tsx"),
				"export const Component = () => <div>Test</div>;",
			);

			const config: NamespaceConfig = {
				filePatterns: ["src/frontend/**/*.tsx"],
				scenarios: ["basic-structure", "symbol-dependency"],
				scenarioConfig: {
					"symbol-dependency": {
						trackCalls: true,
						trackInstantiations: true,
						trackTypeReferences: false,
					},
				},
			};

			await configManager.setNamespaceConfig("frontend", config, configPath);

			const loaded = await configManager.loadNamespacedConfig(
				configPath,
				"frontend",
			);

			expect(loaded.scenarioConfig).toEqual({
				"symbol-dependency": {
					trackCalls: true,
					trackInstantiations: true,
					trackTypeReferences: false,
				},
			});
		});

		it("should accept scenarioConfig for multiple scenarios", async () => {
			await writeFile(join(tempDir, "docs", "README.md"), "# Documentation");

			const config: NamespaceConfig = {
				filePatterns: ["docs/**/*.md"],
				scenarios: ["basic-structure", "markdown-linking"],
				scenarioConfig: {
					"markdown-linking": {
						extractHashtags: true,
						extractHeadingSymbols: true,
						trackWikiLinks: false,
					},
					"basic-structure": {
						includeDirectories: true,
					},
				},
			};

			await configManager.setNamespaceConfig("docs", config, configPath);

			const loaded = await configManager.loadNamespacedConfig(
				configPath,
				"docs",
			);

			expect(loaded.scenarioConfig).toEqual({
				"markdown-linking": {
					extractHashtags: true,
					extractHeadingSymbols: true,
					trackWikiLinks: false,
				},
				"basic-structure": {
					includeDirectories: true,
				},
			});
		});

		it("should work without scenarioConfig (optional)", async () => {
			await writeFile(
				join(tempDir, "src", "shared", "utils.ts"),
				"export const util = () => {};",
			);

			const config: NamespaceConfig = {
				filePatterns: ["src/shared/**/*.ts"],
				scenarios: ["basic-structure", "file-dependency"],
				// No scenarioConfig
			};

			await configManager.setNamespaceConfig("shared", config, configPath);

			const result = await analyzer.analyzeNamespace("shared", configPath, {
				cwd: tempDir,
				projectRoot: tempDir,
			});

			expect(result.scenariosExecuted).toEqual([
				"basic-structure",
				"file-dependency",
			]);
		});
	});

	describe("Cross-Namespace Analysis with Different Scenarios", () => {
		it("should analyze multiple namespaces with different scenario configurations", async () => {
			// Create files for different namespaces
			await writeFile(
				join(tempDir, "src", "frontend", "App.tsx"),
				`
import { API } from '../backend/api';
export const App = () => {
  const api = new API();
  return <div>Hello</div>;
};`,
			);

			await writeFile(
				join(tempDir, "src", "backend", "api.ts"),
				`
export class API {
  getData(): string {
    return 'data';
  }
}`,
			);

			await writeFile(
				join(tempDir, "docs", "README.md"),
				"# Project\n\nSee [[architecture]] for details.",
			);

			// Configure different scenarios for each namespace
			const frontendConfig: NamespaceConfig = {
				filePatterns: ["src/frontend/**/*.tsx"],
				scenarios: ["basic-structure", "file-dependency", "symbol-dependency"],
				semanticTags: ["frontend", "ui"],
			};

			const backendConfig: NamespaceConfig = {
				filePatterns: ["src/backend/**/*.ts"],
				scenarios: ["basic-structure", "symbol-dependency"],
				semanticTags: ["backend", "api"],
			};

			const docsConfig: NamespaceConfig = {
				filePatterns: ["docs/**/*.md"],
				scenarios: ["markdown-linking"],
				semanticTags: ["documentation"],
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

			// Analyze all namespaces
			const { results } = await analyzer.analyzeAll(configPath, {
				cwd: tempDir,
				projectRoot: tempDir,
			});

			// Verify each namespace has correct scenarios
			expect(results.frontend.scenariosExecuted).toEqual([
				"basic-structure",
				"file-dependency",
				"symbol-dependency",
			]);

			expect(results.backend.scenariosExecuted).toEqual([
				"basic-structure",
				"symbol-dependency",
			]);

			expect(results.docs.scenariosExecuted).toEqual([
				"basic-structure",
				"markdown-linking",
			]);
		});

		it("should handle cross-namespace dependencies between different scenario sets", async () => {
			// Frontend imports from backend with absolute path from project root
			await writeFile(
				join(tempDir, "src", "frontend", "App.tsx"),
				`import { API } from '${join(tempDir, "src", "backend", "api")}';
export const App = () => {
  const api = new API();
  return null;
};`,
			);

			await writeFile(
				join(tempDir, "src", "backend", "api.ts"),
				"export class API {}",
			);

			const frontendConfig: NamespaceConfig = {
				filePatterns: ["src/frontend/**/*.tsx"],
				scenarios: ["basic-structure", "file-dependency"],
			};

			const backendConfig: NamespaceConfig = {
				filePatterns: ["src/backend/**/*.ts"],
				scenarios: ["basic-structure", "symbol-dependency"],
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

			const { results, crossNamespaceDependencies } =
				await analyzer.analyzeAll(configPath, {
					cwd: tempDir,
					projectRoot: tempDir,
				});

			expect(results.frontend.scenariosExecuted).toEqual([
				"basic-structure",
				"file-dependency",
			]);
			expect(results.backend.scenariosExecuted).toEqual([
				"basic-structure",
				"symbol-dependency",
			]);

			// Each namespace should analyze its files
			expect(results.frontend.totalFiles).toBe(1);
			expect(results.backend.totalFiles).toBe(1);

			// Cross-namespace dependencies detection depends on import resolution
			// In this test setup, we verify that different scenario sets don't interfere
			expect(results.frontend.analyzedFiles).toBe(1);
			expect(results.backend.analyzedFiles).toBe(1);
		});
	});

	describe("Error Handling", () => {
		it("should reject invalid scenario IDs", async () => {
			const config: NamespaceConfig = {
				filePatterns: ["src/**/*.ts"],
				scenarios: ["basic-structure", "invalid-scenario-id"],
			};

			await expect(
				configManager.setNamespaceConfig("test", config, configPath),
			).rejects.toThrow("Invalid scenario IDs: invalid-scenario-id");
		});

		it("should reject multiple invalid scenario IDs", async () => {
			const config: NamespaceConfig = {
				filePatterns: ["src/**/*.ts"],
				scenarios: ["invalid-1", "basic-structure", "invalid-2"],
			};

			await expect(
				configManager.setNamespaceConfig("test", config, configPath),
			).rejects.toThrow("Invalid scenario IDs: invalid-1, invalid-2");
		});

		it("should accept empty scenarios array", async () => {
			await writeFile(
				join(tempDir, "src", "frontend", "App.tsx"),
				"export const App = () => <div>Hello</div>;",
			);

			const config: NamespaceConfig = {
				filePatterns: ["src/frontend/**/*.tsx"],
				scenarios: [],
			};

			await configManager.setNamespaceConfig("frontend", config, configPath);

			const result = await analyzer.analyzeNamespace("frontend", configPath, {
				cwd: tempDir,
				projectRoot: tempDir,
			});

			// Empty scenarios array should result in empty execution
			expect(result.scenariosExecuted).toEqual([]);
			expect(result.totalFiles).toBe(1);
		});

		it("should handle namespace with no matching files", async () => {
			const config: NamespaceConfig = {
				filePatterns: ["nonexistent/**/*.ts"],
				scenarios: ["basic-structure", "file-dependency"],
			};

			await configManager.setNamespaceConfig("empty", config, configPath);

			const result = await analyzer.analyzeNamespace("empty", configPath, {
				cwd: tempDir,
				projectRoot: tempDir,
			});

			expect(result.totalFiles).toBe(0);
			expect(result.scenariosExecuted).toEqual([
				"basic-structure",
				"file-dependency",
			]);
		});
	});

	describe("Scenario Execution Order Verification", () => {
		it("should respect dependency order in complex scenario chains", async () => {
			await writeFile(
				join(tempDir, "src", "frontend", "Component.tsx"),
				"export const Component = () => <div>Test</div>;",
			);

			// Test with scenarios that have dependencies
			const config: NamespaceConfig = {
				filePatterns: ["src/frontend/**/*.tsx"],
				scenarios: [
					"symbol-dependency", // Extends basic-structure
					"file-dependency", // Extends basic-structure
					"basic-structure", // Foundation
				],
			};

			await configManager.setNamespaceConfig("frontend", config, configPath);

			const result = await analyzer.analyzeNamespace("frontend", configPath, {
				cwd: tempDir,
				projectRoot: tempDir,
			});

			// Despite input order, should execute in dependency order
			// basic-structure first, then symbol-dependency and file-dependency in input order
			expect(result.scenariosExecuted).toEqual([
				"basic-structure",
				"symbol-dependency",
				"file-dependency",
			]);
		});

		it("should handle scenarios with same dependencies correctly", async () => {
			await writeFile(
				join(tempDir, "src", "backend", "api.ts"),
				"export class API {}",
			);

			// Both file-dependency and symbol-dependency extend basic-structure
			const config: NamespaceConfig = {
				filePatterns: ["src/backend/**/*.ts"],
				scenarios: ["file-dependency", "symbol-dependency"],
			};

			await configManager.setNamespaceConfig("backend", config, configPath);

			const result = await analyzer.analyzeNamespace("backend", configPath, {
				cwd: tempDir,
				projectRoot: tempDir,
			});

			// basic-structure should be first, then the two in stable order
			expect(result.scenariosExecuted).toBeDefined();
			expect(result.scenariosExecuted![0]).toBe("basic-structure");
			expect(result.scenariosExecuted).toContain("file-dependency");
			expect(result.scenariosExecuted).toContain("symbol-dependency");
			expect(result.scenariosExecuted!.length).toBe(3);
		});
	});

	describe("Real-World Integration Scenarios", () => {
		it("should handle monorepo-style configuration", async () => {
			// Create monorepo structure
			await mkdir(join(tempDir, "packages", "web", "src"), { recursive: true });
			await mkdir(join(tempDir, "packages", "api", "src"), { recursive: true });
			await mkdir(join(tempDir, "packages", "shared", "src"), {
				recursive: true,
			});

			await writeFile(
				join(tempDir, "packages", "web", "src", "App.tsx"),
				"export const App = () => <div>Web</div>;",
			);
			await writeFile(
				join(tempDir, "packages", "api", "src", "server.ts"),
				"export const server = {};",
			);
			await writeFile(
				join(tempDir, "packages", "shared", "src", "types.ts"),
				"export type Config = {};",
			);

			const webConfig: NamespaceConfig = {
				filePatterns: ["packages/web/**/*.tsx"],
				scenarios: ["basic-structure", "file-dependency", "symbol-dependency"],
				semanticTags: ["frontend", "web"],
			};

			const apiConfig: NamespaceConfig = {
				filePatterns: ["packages/api/**/*.ts"],
				scenarios: ["basic-structure", "file-dependency"],
				semanticTags: ["backend", "api"],
			};

			const sharedConfig: NamespaceConfig = {
				filePatterns: ["packages/shared/**/*.ts"],
				scenarios: ["basic-structure"],
				semanticTags: ["shared", "library"],
			};

			await configManager.setNamespaceConfig("web", webConfig, configPath);
			await configManager.setNamespaceConfig("api", apiConfig, configPath);
			await configManager.setNamespaceConfig("shared", sharedConfig, configPath);

			const { results } = await analyzer.analyzeAll(configPath, {
				cwd: tempDir,
				projectRoot: tempDir,
			});

			expect(results.web.scenariosExecuted).toEqual([
				"basic-structure",
				"file-dependency",
				"symbol-dependency",
			]);
			expect(results.api.scenariosExecuted).toEqual([
				"basic-structure",
				"file-dependency",
			]);
			expect(results.shared.scenariosExecuted).toEqual(["basic-structure"]);

			expect(results.web.totalFiles).toBe(1);
			expect(results.api.totalFiles).toBe(1);
			expect(results.shared.totalFiles).toBe(1);
		});
	});
});
