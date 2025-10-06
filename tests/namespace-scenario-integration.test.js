"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const promises_1 = require("node:fs/promises");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const ConfigManager_1 = require("../src/namespace/ConfigManager");
const NamespaceDependencyAnalyzer_1 = require("../src/namespace/NamespaceDependencyAnalyzer");
const index_1 = require("../src/scenarios/index");
(0, globals_1.describe)("Namespace-Scenario Integration - Phase 2", () => {
    let configManager;
    let analyzer;
    let tempDir;
    let configPath;
    (0, globals_1.beforeEach)(async () => {
        (0, index_1.reinitializeBuiltinScenarios)();
        configManager = new ConfigManager_1.ConfigManager();
        analyzer = new NamespaceDependencyAnalyzer_1.NamespaceDependencyAnalyzer();
        tempDir = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "namespace-scenario-test-"));
        configPath = (0, node_path_1.join)(tempDir, "namespaces.json");
        await (0, promises_1.mkdir)((0, node_path_1.join)(tempDir, "src"), { recursive: true });
        await (0, promises_1.mkdir)((0, node_path_1.join)(tempDir, "tests"), { recursive: true });
        await (0, promises_1.mkdir)((0, node_path_1.join)(tempDir, "docs"), { recursive: true });
    });
    (0, globals_1.afterEach)(async () => {
        await (0, promises_1.rm)(tempDir, { recursive: true, force: true });
    });
    (0, globals_1.describe)("Scenario Execution Order Calculation", () => {
        (0, globals_1.it)("should calculate execution order for namespace with explicit scenarios", async () => {
            await (0, promises_1.writeFile)((0, node_path_1.join)(tempDir, "src", "index.ts"), "export const hello = 'world';");
            const config = {
                filePatterns: ["src/**/*.ts"],
                scenarios: ["symbol-dependency", "basic-structure"],
            };
            await configManager.setNamespaceConfig("source", config, configPath);
            const result = await analyzer.analyzeNamespace("source", configPath, {
                cwd: tempDir,
                projectRoot: tempDir,
            });
            (0, globals_1.expect)(result.scenariosExecuted).toBeDefined();
            (0, globals_1.expect)(result.scenariosExecuted).toEqual([
                "basic-structure",
                "symbol-dependency",
            ]);
        });
        (0, globals_1.it)("should use default scenarios when not specified (backward compatibility)", async () => {
            await (0, promises_1.writeFile)((0, node_path_1.join)(tempDir, "src", "index.ts"), "export const hello = 'world';");
            const config = {
                filePatterns: ["src/**/*.ts"],
            };
            await configManager.setNamespaceConfig("source", config, configPath);
            const result = await analyzer.analyzeNamespace("source", configPath, {
                cwd: tempDir,
                projectRoot: tempDir,
            });
            (0, globals_1.expect)(result.scenariosExecuted).toEqual([
                "basic-structure",
                "file-dependency",
            ]);
        });
        (0, globals_1.it)("should handle single scenario with dependencies", async () => {
            await (0, promises_1.writeFile)((0, node_path_1.join)(tempDir, "docs", "README.md"), "# Hello World\n[Link](./other.md)");
            const config = {
                filePatterns: ["docs/**/*.md"],
                scenarios: ["markdown-linking"],
            };
            await configManager.setNamespaceConfig("docs", config, configPath);
            const result = await analyzer.analyzeNamespace("docs", configPath, {
                cwd: tempDir,
                projectRoot: tempDir,
            });
            (0, globals_1.expect)(result.scenariosExecuted).toEqual([
                "basic-structure",
                "markdown-linking",
            ]);
        });
        (0, globals_1.it)("should resolve dependency chains correctly", async () => {
            await (0, promises_1.writeFile)((0, node_path_1.join)(tempDir, "src", "code.ts"), "export class Test {}");
            const config = {
                filePatterns: ["src/**/*.ts"],
                scenarios: [
                    "symbol-dependency",
                ],
            };
            await configManager.setNamespaceConfig("source", config, configPath);
            const result = await analyzer.analyzeNamespace("source", configPath, {
                cwd: tempDir,
                projectRoot: tempDir,
            });
            (0, globals_1.expect)(result.scenariosExecuted).toEqual([
                "basic-structure",
                "symbol-dependency",
            ]);
        });
    });
    (0, globals_1.describe)("Multiple Namespaces with Different Scenarios", () => {
        (0, globals_1.it)("should apply different scenarios to different namespaces", async () => {
            await (0, promises_1.writeFile)((0, node_path_1.join)(tempDir, "src", "app.ts"), "export const app = 'test';");
            await (0, promises_1.writeFile)((0, node_path_1.join)(tempDir, "tests", "app.test.ts"), "import { app } from '../src/app';");
            await (0, promises_1.writeFile)((0, node_path_1.join)(tempDir, "docs", "guide.md"), "# Guide\n[API](./api.md)");
            const sourceConfig = {
                filePatterns: ["src/**/*.ts"],
                scenarios: ["basic-structure", "symbol-dependency"],
            };
            const testConfig = {
                filePatterns: ["tests/**/*.ts"],
                scenarios: ["basic-structure", "file-dependency"],
            };
            const docsConfig = {
                filePatterns: ["docs/**/*.md"],
                scenarios: ["markdown-linking"],
            };
            await configManager.setNamespaceConfig("source", sourceConfig, configPath);
            await configManager.setNamespaceConfig("test", testConfig, configPath);
            await configManager.setNamespaceConfig("docs", docsConfig, configPath);
            const results = await analyzer.analyzeNamespaces(["source", "test", "docs"], configPath, { cwd: tempDir, projectRoot: tempDir });
            (0, globals_1.expect)(results.source.scenariosExecuted).toEqual([
                "basic-structure",
                "symbol-dependency",
            ]);
            (0, globals_1.expect)(results.test.scenariosExecuted).toEqual([
                "basic-structure",
                "file-dependency",
            ]);
            (0, globals_1.expect)(results.docs.scenariosExecuted).toEqual([
                "basic-structure",
                "markdown-linking",
            ]);
        });
        (0, globals_1.it)("should track scenarios in analyzeAll", async () => {
            await (0, promises_1.writeFile)((0, node_path_1.join)(tempDir, "src", "app.ts"), "export const app = 'test';");
            await (0, promises_1.writeFile)((0, node_path_1.join)(tempDir, "docs", "guide.md"), "# Guide");
            const sourceConfig = {
                filePatterns: ["src/**/*.ts"],
                scenarios: ["basic-structure", "file-dependency"],
            };
            const docsConfig = {
                filePatterns: ["docs/**/*.md"],
                scenarios: ["markdown-linking"],
            };
            await configManager.setNamespaceConfig("source", sourceConfig, configPath);
            await configManager.setNamespaceConfig("docs", docsConfig, configPath);
            const { results } = await analyzer.analyzeAll(configPath, {
                cwd: tempDir,
                projectRoot: tempDir,
            });
            (0, globals_1.expect)(results.source.scenariosExecuted).toEqual([
                "basic-structure",
                "file-dependency",
            ]);
            (0, globals_1.expect)(results.docs.scenariosExecuted).toEqual([
                "basic-structure",
                "markdown-linking",
            ]);
        });
    });
    (0, globals_1.describe)("analyzeNamespaceWithGraph", () => {
        (0, globals_1.it)("should include scenario execution order in result", async () => {
            await (0, promises_1.writeFile)((0, node_path_1.join)(tempDir, "src", "index.ts"), "export const test = 42;");
            const config = {
                filePatterns: ["src/**/*.ts"],
                scenarios: ["basic-structure", "symbol-dependency"],
            };
            await configManager.setNamespaceConfig("test", config, configPath);
            const { result, graph } = await analyzer.analyzeNamespaceWithGraph("test", configPath, { cwd: tempDir, projectRoot: tempDir });
            (0, globals_1.expect)(result.scenariosExecuted).toEqual([
                "basic-structure",
                "symbol-dependency",
            ]);
            (0, globals_1.expect)(graph).toBeDefined();
        });
    });
    (0, globals_1.describe)("Empty Namespace Handling", () => {
        (0, globals_1.it)("should include scenarios even when no files match", async () => {
            const config = {
                filePatterns: ["nonexistent/**/*.ts"],
                scenarios: ["basic-structure", "file-dependency"],
            };
            await configManager.setNamespaceConfig("empty", config, configPath);
            const result = await analyzer.analyzeNamespace("empty", configPath, {
                cwd: tempDir,
                projectRoot: tempDir,
            });
            (0, globals_1.expect)(result.totalFiles).toBe(0);
            (0, globals_1.expect)(result.scenariosExecuted).toEqual([
                "basic-structure",
                "file-dependency",
            ]);
        });
    });
    (0, globals_1.describe)("Backward Compatibility", () => {
        (0, globals_1.it)("should work with namespaces created before scenario support", async () => {
            await (0, promises_1.writeFile)((0, node_path_1.join)(tempDir, "src", "legacy.ts"), "export const legacy = true;");
            const config = {
                filePatterns: ["src/**/*.ts"],
                semanticTags: ["legacy"],
            };
            await configManager.setNamespaceConfig("legacy", config, configPath);
            const result = await analyzer.analyzeNamespace("legacy", configPath, {
                cwd: tempDir,
                projectRoot: tempDir,
            });
            (0, globals_1.expect)(result.scenariosExecuted).toEqual([
                "basic-structure",
                "file-dependency",
            ]);
            (0, globals_1.expect)(result.totalFiles).toBe(1);
        });
        (0, globals_1.it)("should preserve existing functionality when scenarios are not used", async () => {
            await (0, promises_1.writeFile)((0, node_path_1.join)(tempDir, "src", "old.ts"), "export const old = 'style';");
            const config = {
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
            (0, globals_1.expect)(result.namespace).toBe("old");
            (0, globals_1.expect)(result.totalFiles).toBe(1);
            (0, globals_1.expect)(result.scenariosExecuted).toEqual([
                "basic-structure",
                "file-dependency",
            ]);
        });
    });
});
//# sourceMappingURL=namespace-scenario-integration.test.js.map