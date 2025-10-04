/**
 * Namespace-Scenario Integration Tests (Phase 2)
 *
 * Tests for scenario execution order calculation and integration with NamespaceDependencyAnalyzer
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigManager } from "../src/namespace/ConfigManager";
import { NamespaceDependencyAnalyzer } from "../src/namespace/NamespaceDependencyAnalyzer";
import type { NamespaceConfig } from "../src/namespace/types";
import { reinitializeBuiltinScenarios } from "../src/scenarios/index";

describe("Namespace-Scenario Integration - Phase 2", () => {
	let configManager: ConfigManager;
	let analyzer: NamespaceDependencyAnalyzer;
	let tempDir: string;
	let configPath: string;

	beforeEach(async () => {
		// Ensure built-in scenarios are initialized
		reinitializeBuiltinScenarios();

		configManager = new ConfigManager();
		analyzer = new NamespaceDependencyAnalyzer();
		tempDir = await mkdtemp(join(tmpdir(), "namespace-scenario-test-"));
		configPath = join(tempDir, "namespaces.json");

		// Create test project structure
		await mkdir(join(tempDir, "src"), { recursive: true });
		await mkdir(join(tempDir, "tests"), { recursive: true });
		await mkdir(join(tempDir, "docs"), { recursive: true });
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	describe("Scenario Execution Order Calculation", () => {
		it("should calculate execution order for namespace with explicit scenarios", async () => {
			// Create test file
			await writeFile(
				join(tempDir, "src", "index.ts"),
				"export const hello = 'world';",
			);

			const config: NamespaceConfig = {
				filePatterns: ["src/**/*.ts"],
				scenarios: ["symbol-dependency", "basic-structure"], // Out of order
			};

			await configManager.setNamespaceConfig("source", config, configPath);

			const result = await analyzer.analyzeNamespace("source", configPath, {
				cwd: tempDir,
				projectRoot: tempDir,
			});

			// Should include scenariosExecuted in correct dependency order
			expect(result.scenariosExecuted).toBeDefined();
			expect(result.scenariosExecuted).toEqual([
				"basic-structure", // Dependency first
				"symbol-dependency", // Then dependent
			]);
		});

		it("should use default scenarios when not specified (backward compatibility)", async () => {
			// Create test file
			await writeFile(
				join(tempDir, "src", "index.ts"),
				"export const hello = 'world';",
			);

			const config: NamespaceConfig = {
				filePatterns: ["src/**/*.ts"],
				// No scenarios specified
			};

			await configManager.setNamespaceConfig("source", config, configPath);

			const result = await analyzer.analyzeNamespace("source", configPath, {
				cwd: tempDir,
				projectRoot: tempDir,
			});

			// Should use default scenarios
			expect(result.scenariosExecuted).toEqual([
				"basic-structure",
				"file-dependency",
			]);
		});

		it("should handle single scenario with dependencies", async () => {
			await writeFile(
				join(tempDir, "docs", "README.md"),
				"# Hello World\n[Link](./other.md)",
			);

			const config: NamespaceConfig = {
				filePatterns: ["docs/**/*.md"],
				scenarios: ["markdown-linking"], // Single scenario (extends basic-structure)
			};

			await configManager.setNamespaceConfig("docs", config, configPath);

			const result = await analyzer.analyzeNamespace("docs", configPath, {
				cwd: tempDir,
				projectRoot: tempDir,
			});

			// markdown-linking extends basic-structure
			expect(result.scenariosExecuted).toEqual([
				"basic-structure",
				"markdown-linking",
			]);
		});

		it("should resolve dependency chains correctly", async () => {
			await writeFile(join(tempDir, "src", "code.ts"), "export class Test {}");

			const config: NamespaceConfig = {
				filePatterns: ["src/**/*.ts"],
				scenarios: [
					"symbol-dependency", // Extends basic-structure only
				],
			};

			await configManager.setNamespaceConfig("source", config, configPath);

			const result = await analyzer.analyzeNamespace("source", configPath, {
				cwd: tempDir,
				projectRoot: tempDir,
			});

			// symbol-dependency extends basic-structure (not file-dependency)
			expect(result.scenariosExecuted).toEqual([
				"basic-structure",
				"symbol-dependency",
			]);
		});
	});

	describe("Multiple Namespaces with Different Scenarios", () => {
		it("should apply different scenarios to different namespaces", async () => {
			// Create files for different namespaces
			await writeFile(
				join(tempDir, "src", "app.ts"),
				"export const app = 'test';",
			);
			await writeFile(
				join(tempDir, "tests", "app.test.ts"),
				"import { app } from '../src/app';",
			);
			await writeFile(
				join(tempDir, "docs", "guide.md"),
				"# Guide\n[API](./api.md)",
			);

			// Configure different scenarios for each namespace
			const sourceConfig: NamespaceConfig = {
				filePatterns: ["src/**/*.ts"],
				scenarios: ["basic-structure", "symbol-dependency"],
			};

			const testConfig: NamespaceConfig = {
				filePatterns: ["tests/**/*.ts"],
				scenarios: ["basic-structure", "file-dependency"],
			};

			const docsConfig: NamespaceConfig = {
				filePatterns: ["docs/**/*.md"],
				scenarios: ["markdown-linking"],
			};

			await configManager.setNamespaceConfig(
				"source",
				sourceConfig,
				configPath,
			);
			await configManager.setNamespaceConfig("test", testConfig, configPath);
			await configManager.setNamespaceConfig("docs", docsConfig, configPath);

			// Analyze all namespaces
			const results = await analyzer.analyzeNamespaces(
				["source", "test", "docs"],
				configPath,
				{ cwd: tempDir, projectRoot: tempDir },
			);

			// Check each namespace has correct scenarios
			// symbol-dependency extends basic-structure only
			expect(results.source.scenariosExecuted).toEqual([
				"basic-structure",
				"symbol-dependency",
			]);

			expect(results.test.scenariosExecuted).toEqual([
				"basic-structure",
				"file-dependency",
			]);

			// markdown-linking extends basic-structure
			expect(results.docs.scenariosExecuted).toEqual([
				"basic-structure",
				"markdown-linking",
			]);
		});

		it("should track scenarios in analyzeAll", async () => {
			await writeFile(
				join(tempDir, "src", "app.ts"),
				"export const app = 'test';",
			);
			await writeFile(join(tempDir, "docs", "guide.md"), "# Guide");

			const sourceConfig: NamespaceConfig = {
				filePatterns: ["src/**/*.ts"],
				scenarios: ["basic-structure", "file-dependency"],
			};

			const docsConfig: NamespaceConfig = {
				filePatterns: ["docs/**/*.md"],
				scenarios: ["markdown-linking"],
			};

			await configManager.setNamespaceConfig(
				"source",
				sourceConfig,
				configPath,
			);
			await configManager.setNamespaceConfig("docs", docsConfig, configPath);

			const { results } = await analyzer.analyzeAll(configPath, {
				cwd: tempDir,
				projectRoot: tempDir,
			});

			expect(results.source.scenariosExecuted).toEqual([
				"basic-structure",
				"file-dependency",
			]);

			// markdown-linking extends basic-structure
			expect(results.docs.scenariosExecuted).toEqual([
				"basic-structure",
				"markdown-linking",
			]);
		});
	});

	describe("analyzeNamespaceWithGraph", () => {
		it("should include scenario execution order in result", async () => {
			await writeFile(
				join(tempDir, "src", "index.ts"),
				"export const test = 42;",
			);

			const config: NamespaceConfig = {
				filePatterns: ["src/**/*.ts"],
				scenarios: ["basic-structure", "symbol-dependency"],
			};

			await configManager.setNamespaceConfig("test", config, configPath);

			const { result, graph } = await analyzer.analyzeNamespaceWithGraph(
				"test",
				configPath,
				{ cwd: tempDir, projectRoot: tempDir },
			);

			// symbol-dependency extends basic-structure only
			expect(result.scenariosExecuted).toEqual([
				"basic-structure",
				"symbol-dependency",
			]);
			expect(graph).toBeDefined();
		});
	});

	describe("Empty Namespace Handling", () => {
		it("should include scenarios even when no files match", async () => {
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

	describe("Backward Compatibility", () => {
		it("should work with namespaces created before scenario support", async () => {
			await writeFile(
				join(tempDir, "src", "legacy.ts"),
				"export const legacy = true;",
			);

			// Old-style config without scenarios
			const config: NamespaceConfig = {
				filePatterns: ["src/**/*.ts"],
				semanticTags: ["legacy"],
			};

			await configManager.setNamespaceConfig("legacy", config, configPath);

			const result = await analyzer.analyzeNamespace("legacy", configPath, {
				cwd: tempDir,
				projectRoot: tempDir,
			});

			// Should use default scenarios
			expect(result.scenariosExecuted).toEqual([
				"basic-structure",
				"file-dependency",
			]);
			expect(result.totalFiles).toBe(1);
		});

		it("should preserve existing functionality when scenarios are not used", async () => {
			await writeFile(
				join(tempDir, "src", "old.ts"),
				"export const old = 'style';",
			);

			const config: NamespaceConfig = {
				filePatterns: ["src/**/*.ts"],
				excludePatterns: ["**/*.test.ts"],
				description: "Old style namespace",
				semanticTags: ["source"],
			};

			await configManager.setNamespaceConfig("old", config, configPath);

			const result = await analyzer.analyzeNamespace("old", configPath, {
				cwd: tempDir,
				projectRoot: tempDir,
			});

			// All old fields should work
			expect(result.namespace).toBe("old");
			expect(result.totalFiles).toBe(1);
			// Default scenarios applied
			expect(result.scenariosExecuted).toEqual([
				"basic-structure",
				"file-dependency",
			]);
		});
	});
});
