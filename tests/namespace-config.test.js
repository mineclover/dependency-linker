"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const promises_1 = require("node:fs/promises");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const ConfigManager_1 = require("../src/namespace/ConfigManager");
const index_1 = require("../src/scenarios/index");
(0, globals_1.describe)("Namespace Configuration - Phase 1", () => {
    let configManager;
    let tempDir;
    let configPath;
    (0, globals_1.beforeEach)(async () => {
        (0, index_1.reinitializeBuiltinScenarios)();
        configManager = new ConfigManager_1.ConfigManager();
        tempDir = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "namespace-config-test-"));
        configPath = (0, node_path_1.join)(tempDir, "namespaces.json");
    });
    (0, globals_1.afterEach)(async () => {
        await (0, promises_1.rm)(tempDir, { recursive: true, force: true });
    });
    (0, globals_1.describe)("NamespaceConfig Type Extensions", () => {
        (0, globals_1.it)("should accept scenarios field in NamespaceConfig", async () => {
            const config = {
                filePatterns: ["src/**/*.ts"],
                scenarios: ["basic-structure", "file-dependency"],
            };
            await configManager.setNamespaceConfig("test", config, configPath);
            const loaded = await configManager.loadNamespacedConfig(configPath, "test");
            (0, globals_1.expect)(loaded.scenarios).toEqual(["basic-structure", "file-dependency"]);
        });
        (0, globals_1.it)("should accept scenarioConfig field in NamespaceConfig", async () => {
            const config = {
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
            const loaded = await configManager.loadNamespacedConfig(configPath, "test");
            (0, globals_1.expect)(loaded.scenarioConfig).toEqual({
                "symbol-dependency": {
                    detectCalls: true,
                    detectInstantiation: true,
                },
            });
        });
        (0, globals_1.it)("should allow optional scenarios and scenarioConfig fields", async () => {
            const config = {
                filePatterns: ["src/**/*.ts"],
            };
            await configManager.setNamespaceConfig("test", config, configPath);
            const loaded = await configManager.loadNamespacedConfig(configPath, "test");
            (0, globals_1.expect)(loaded.scenarios).toBeUndefined();
            (0, globals_1.expect)(loaded.scenarioConfig).toBeUndefined();
        });
    });
    (0, globals_1.describe)("ConfigManager Scenario Validation", () => {
        (0, globals_1.it)("should validate scenario IDs when setting namespace config", async () => {
            const config = {
                filePatterns: ["src/**/*.ts"],
                scenarios: ["basic-structure", "file-dependency"],
            };
            await (0, globals_1.expect)(configManager.setNamespaceConfig("test", config, configPath)).resolves.not.toThrow();
        });
        (0, globals_1.it)("should reject invalid scenario IDs", async () => {
            const config = {
                filePatterns: ["src/**/*.ts"],
                scenarios: ["invalid-scenario", "another-invalid"],
            };
            await (0, globals_1.expect)(configManager.setNamespaceConfig("test", config, configPath)).rejects.toThrow("Invalid scenario IDs: invalid-scenario, another-invalid");
        });
        (0, globals_1.it)("should reject mixed valid and invalid scenario IDs", async () => {
            const config = {
                filePatterns: ["src/**/*.ts"],
                scenarios: ["basic-structure", "invalid-scenario"],
            };
            await (0, globals_1.expect)(configManager.setNamespaceConfig("test", config, configPath)).rejects.toThrow("Invalid scenario IDs: invalid-scenario");
        });
        (0, globals_1.it)("should allow empty scenarios array", async () => {
            const config = {
                filePatterns: ["src/**/*.ts"],
                scenarios: [],
            };
            await (0, globals_1.expect)(configManager.setNamespaceConfig("test", config, configPath)).resolves.not.toThrow();
        });
        (0, globals_1.it)("should validate all built-in scenarios", async () => {
            const builtinScenarios = [
                "basic-structure",
                "file-dependency",
                "symbol-dependency",
                "markdown-linking",
            ];
            for (const scenarioId of builtinScenarios) {
                (0, globals_1.expect)((0, index_1.hasScenario)(scenarioId)).toBe(true);
            }
            const config = {
                filePatterns: ["src/**/*.ts"],
                scenarios: builtinScenarios,
            };
            await (0, globals_1.expect)(configManager.setNamespaceConfig("test", config, configPath)).resolves.not.toThrow();
        });
    });
    (0, globals_1.describe)("Configuration File Persistence", () => {
        (0, globals_1.it)("should persist scenarios in config file", async () => {
            const config = {
                filePatterns: ["src/**/*.ts"],
                scenarios: ["basic-structure", "symbol-dependency"],
                scenarioConfig: {
                    "symbol-dependency": {
                        detectCalls: true,
                    },
                },
            };
            await configManager.setNamespaceConfig("test", config, configPath);
            const configFile = await configManager.loadConfig(configPath);
            (0, globals_1.expect)(configFile.namespaces.test.scenarios).toEqual([
                "basic-structure",
                "symbol-dependency",
            ]);
            (0, globals_1.expect)(configFile.namespaces.test.scenarioConfig).toEqual({
                "symbol-dependency": {
                    detectCalls: true,
                },
            });
        });
        (0, globals_1.it)("should support multiple namespaces with different scenarios", async () => {
            const frontendConfig = {
                filePatterns: ["packages/web/**/*.tsx"],
                scenarios: ["basic-structure", "symbol-dependency"],
            };
            const backendConfig = {
                filePatterns: ["packages/backend/**/*.ts"],
                scenarios: ["basic-structure", "file-dependency"],
            };
            const docsConfig = {
                filePatterns: ["docs/**/*.md"],
                scenarios: ["markdown-linking"],
            };
            await configManager.setNamespaceConfig("frontend", frontendConfig, configPath);
            await configManager.setNamespaceConfig("backend", backendConfig, configPath);
            await configManager.setNamespaceConfig("docs", docsConfig, configPath);
            const configFile = await configManager.loadConfig(configPath);
            (0, globals_1.expect)(configFile.namespaces.frontend.scenarios).toEqual([
                "basic-structure",
                "symbol-dependency",
            ]);
            (0, globals_1.expect)(configFile.namespaces.backend.scenarios).toEqual([
                "basic-structure",
                "file-dependency",
            ]);
            (0, globals_1.expect)(configFile.namespaces.docs.scenarios).toEqual([
                "markdown-linking",
            ]);
        });
    });
    (0, globals_1.describe)("Backward Compatibility", () => {
        (0, globals_1.it)("should support namespaces without scenarios field", async () => {
            const config = {
                filePatterns: ["src/**/*.ts"],
                semanticTags: ["source"],
            };
            await configManager.setNamespaceConfig("test", config, configPath);
            const loaded = await configManager.loadNamespacedConfig(configPath, "test");
            (0, globals_1.expect)(loaded.filePatterns).toEqual(["src/**/*.ts"]);
            (0, globals_1.expect)(loaded.semanticTags).toEqual(["source"]);
            (0, globals_1.expect)(loaded.scenarios).toBeUndefined();
        });
        (0, globals_1.it)("should preserve existing config fields when adding scenarios", async () => {
            const initialConfig = {
                filePatterns: ["src/**/*.ts"],
                excludePatterns: ["**/*.test.ts"],
                description: "Source files",
                semanticTags: ["source", "production"],
            };
            await configManager.setNamespaceConfig("test", initialConfig, configPath);
            const updatedConfig = {
                ...initialConfig,
                scenarios: ["basic-structure", "file-dependency"],
            };
            await configManager.setNamespaceConfig("test", updatedConfig, configPath);
            const loaded = await configManager.loadNamespacedConfig(configPath, "test");
            (0, globals_1.expect)(loaded.filePatterns).toEqual(["src/**/*.ts"]);
            (0, globals_1.expect)(loaded.excludePatterns).toEqual(["**/*.test.ts"]);
            (0, globals_1.expect)(loaded.description).toBe("Source files");
            (0, globals_1.expect)(loaded.semanticTags).toEqual(["source", "production"]);
            (0, globals_1.expect)(loaded.scenarios).toEqual(["basic-structure", "file-dependency"]);
        });
    });
});
//# sourceMappingURL=namespace-config.test.js.map