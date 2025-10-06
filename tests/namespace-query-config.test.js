"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = __importDefault(require("fs"));
const analysis_namespace_js_1 = require("../dist/namespace/analysis-namespace.js");
(0, globals_1.describe)("Namespace Query Configuration", () => {
    let manager;
    let testConfigPath;
    (0, globals_1.beforeEach)(() => {
        testConfigPath = "./test-namespace-config.json";
        manager = new analysis_namespace_js_1.AnalysisNamespaceManager(testConfigPath);
    });
    (0, globals_1.afterEach)(() => {
        if (fs_1.default.existsSync(testConfigPath)) {
            fs_1.default.unlinkSync(testConfigPath);
        }
    });
    (0, globals_1.describe)("Query Category Mapping", () => {
        (0, globals_1.it)("should have all required query categories", () => {
            const expectedCategories = [
                "basic-analysis",
                "symbol-definitions",
                "dependency-tracking",
                "advanced-analysis",
            ];
            expectedCategories.forEach((category) => {
                (0, globals_1.expect)(analysis_namespace_js_1.QUERY_CATEGORY_MAPPING).toHaveProperty(category);
                (0, globals_1.expect)(Array.isArray(analysis_namespace_js_1.QUERY_CATEGORY_MAPPING[category])).toBe(true);
                (0, globals_1.expect)(analysis_namespace_js_1.QUERY_CATEGORY_MAPPING[category].length).toBeGreaterThan(0);
            });
        });
        (0, globals_1.it)("should have correct query counts for each category", () => {
            (0, globals_1.expect)(analysis_namespace_js_1.QUERY_CATEGORY_MAPPING["basic-analysis"]).toHaveLength(3);
            (0, globals_1.expect)(analysis_namespace_js_1.QUERY_CATEGORY_MAPPING["symbol-definitions"]).toHaveLength(9);
            (0, globals_1.expect)(analysis_namespace_js_1.QUERY_CATEGORY_MAPPING["dependency-tracking"]).toHaveLength(6);
            (0, globals_1.expect)(analysis_namespace_js_1.QUERY_CATEGORY_MAPPING["advanced-analysis"]).toHaveLength(3);
        });
        (0, globals_1.it)("should have unique query IDs across categories", () => {
            const allQueries = Object.values(analysis_namespace_js_1.QUERY_CATEGORY_MAPPING).flat();
            const uniqueQueries = [...new Set(allQueries)];
            (0, globals_1.expect)(allQueries).toHaveLength(uniqueQueries.length);
        });
    });
    (0, globals_1.describe)("Query Category Information", () => {
        (0, globals_1.it)("should return correct category information", () => {
            const categories = manager.getQueryCategories();
            (0, globals_1.expect)(categories).toHaveProperty("basic-analysis");
            (0, globals_1.expect)(categories).toHaveProperty("symbol-definitions");
            (0, globals_1.expect)(categories).toHaveProperty("dependency-tracking");
            (0, globals_1.expect)(categories).toHaveProperty("advanced-analysis");
            Object.values(categories).forEach((category) => {
                (0, globals_1.expect)(category).toHaveProperty("name");
                (0, globals_1.expect)(category).toHaveProperty("description");
                (0, globals_1.expect)(category).toHaveProperty("queryCount");
                (0, globals_1.expect)(typeof category.name).toBe("string");
                (0, globals_1.expect)(typeof category.description).toBe("string");
                (0, globals_1.expect)(typeof category.queryCount).toBe("number");
                (0, globals_1.expect)(category.queryCount).toBeGreaterThan(0);
            });
        });
        (0, globals_1.it)("should have correct query counts in category info", () => {
            const categories = manager.getQueryCategories();
            (0, globals_1.expect)(categories["basic-analysis"].queryCount).toBe(3);
            (0, globals_1.expect)(categories["symbol-definitions"].queryCount).toBe(9);
            (0, globals_1.expect)(categories["dependency-tracking"].queryCount).toBe(6);
            (0, globals_1.expect)(categories["advanced-analysis"].queryCount).toBe(3);
        });
    });
    (0, globals_1.describe)("Query Selection for Categories", () => {
        (0, globals_1.it)("should return correct queries for single category", () => {
            const basicQueries = manager.getQueriesForCategories(["basic-analysis"]);
            (0, globals_1.expect)(basicQueries).toEqual(analysis_namespace_js_1.QUERY_CATEGORY_MAPPING["basic-analysis"]);
        });
        (0, globals_1.it)("should return correct queries for multiple categories", () => {
            const categories = [
                "basic-analysis",
                "symbol-definitions",
            ];
            const queries = manager.getQueriesForCategories(categories);
            const expectedQueries = [
                ...analysis_namespace_js_1.QUERY_CATEGORY_MAPPING["basic-analysis"],
                ...analysis_namespace_js_1.QUERY_CATEGORY_MAPPING["symbol-definitions"],
            ];
            (0, globals_1.expect)(queries).toEqual(expectedQueries);
        });
        (0, globals_1.it)("should remove duplicates when combining categories", () => {
            const categories = [
                "basic-analysis",
                "symbol-definitions",
                "dependency-tracking",
            ];
            const queries = manager.getQueriesForCategories(categories);
            const uniqueQueries = [...new Set(queries)];
            (0, globals_1.expect)(queries).toHaveLength(uniqueQueries.length);
        });
        (0, globals_1.it)("should return empty array for empty categories", () => {
            const queries = manager.getQueriesForCategories([]);
            (0, globals_1.expect)(queries).toEqual([]);
        });
    });
    (0, globals_1.describe)("Namespace Query Configuration", () => {
        (0, globals_1.it)("should create namespace with default query configuration", async () => {
            const config = await manager.loadConfig();
            (0, globals_1.expect)(config.namespaces).toHaveProperty("source");
            (0, globals_1.expect)(config.namespaces).toHaveProperty("tests");
            const sourceNamespace = config.namespaces.source;
            (0, globals_1.expect)(sourceNamespace.queries).toBeDefined();
            (0, globals_1.expect)(sourceNamespace.queries.categories).toContain("basic-analysis");
            (0, globals_1.expect)(sourceNamespace.queries.categories).toContain("symbol-definitions");
            (0, globals_1.expect)(sourceNamespace.queries.categories).toContain("dependency-tracking");
        });
        (0, globals_1.it)("should get active queries for namespace", async () => {
            const activeQueries = await manager.getActiveQueriesForNamespace("source");
            (0, globals_1.expect)(Array.isArray(activeQueries)).toBe(true);
            (0, globals_1.expect)(activeQueries.length).toBeGreaterThan(0);
            (0, globals_1.expect)(activeQueries).toContain("ts-import-sources");
            (0, globals_1.expect)(activeQueries).toContain("ts-export-declarations");
            (0, globals_1.expect)(activeQueries).toContain("ts-export-assignments");
        });
        (0, globals_1.it)("should return empty array for non-existent namespace", async () => {
            const activeQueries = await manager.getActiveQueriesForNamespace("non-existent");
            (0, globals_1.expect)(activeQueries).toEqual([]);
        });
        (0, globals_1.it)("should handle namespace without queries configuration", async () => {
            const customConfig = {
                projectName: "test-project",
                rootPath: process.cwd(),
                namespaces: {
                    "no-queries": {
                        name: "no-queries",
                        description: "Namespace without queries",
                        patterns: {
                            include: ["src/**/*.ts"],
                            exclude: [],
                        },
                        analysis: {
                            enabled: true,
                            options: {
                                enableParallelExecution: true,
                                enableCaching: true,
                            },
                        },
                        compliance: {
                            enabled: true,
                            rules: [],
                        },
                        output: {
                            format: "json",
                            destination: "./reports/no-queries.json",
                            includeMetadata: true,
                            includeStatistics: true,
                        },
                    },
                },
                globalSettings: {
                    defaultLanguage: "typescript",
                    maxConcurrency: 4,
                    cacheEnabled: true,
                },
            };
            fs_1.default.writeFileSync(testConfigPath, JSON.stringify(customConfig, null, 2));
            const customManager = new analysis_namespace_js_1.AnalysisNamespaceManager(testConfigPath);
            const activeQueries = await customManager.getActiveQueriesForNamespace("no-queries");
            (0, globals_1.expect)(activeQueries).toEqual([]);
        });
    });
    (0, globals_1.describe)("Custom Query Configuration", () => {
        (0, globals_1.it)("should include custom queries when enabled", async () => {
            const customConfig = {
                projectName: "test-project",
                rootPath: process.cwd(),
                namespaces: {
                    "custom-queries": {
                        name: "custom-queries",
                        description: "Namespace with custom queries",
                        patterns: {
                            include: ["src/**/*.ts"],
                            exclude: [],
                        },
                        analysis: {
                            enabled: true,
                            options: {
                                enableParallelExecution: true,
                                enableCaching: true,
                            },
                        },
                        queries: {
                            categories: ["basic-analysis"],
                            custom: {
                                enabled: true,
                                queryIds: ["custom-query-1", "custom-query-2"],
                            },
                            options: {
                                enableParallelExecution: true,
                                enableCaching: true,
                                maxConcurrency: 2,
                            },
                        },
                        compliance: {
                            enabled: true,
                            rules: [],
                        },
                        output: {
                            format: "json",
                            destination: "./reports/custom-queries.json",
                            includeMetadata: true,
                            includeStatistics: true,
                        },
                    },
                },
                globalSettings: {
                    defaultLanguage: "typescript",
                    maxConcurrency: 4,
                    cacheEnabled: true,
                },
            };
            fs_1.default.writeFileSync(testConfigPath, JSON.stringify(customConfig, null, 2));
            const customManager = new analysis_namespace_js_1.AnalysisNamespaceManager(testConfigPath);
            const activeQueries = await customManager.getActiveQueriesForNamespace("custom-queries");
            (0, globals_1.expect)(activeQueries).toContain("ts-import-sources");
            (0, globals_1.expect)(activeQueries).toContain("ts-export-declarations");
            (0, globals_1.expect)(activeQueries).toContain("ts-export-assignments");
            (0, globals_1.expect)(activeQueries).toContain("custom-query-1");
            (0, globals_1.expect)(activeQueries).toContain("custom-query-2");
        });
        (0, globals_1.it)("should exclude custom queries when disabled", async () => {
            const customConfig = {
                projectName: "test-project",
                rootPath: process.cwd(),
                namespaces: {
                    "no-custom-queries": {
                        name: "no-custom-queries",
                        description: "Namespace without custom queries",
                        patterns: {
                            include: ["src/**/*.ts"],
                            exclude: [],
                        },
                        analysis: {
                            enabled: true,
                            options: {
                                enableParallelExecution: true,
                                enableCaching: true,
                            },
                        },
                        queries: {
                            categories: ["basic-analysis"],
                            custom: {
                                enabled: false,
                                queryIds: ["custom-query-1", "custom-query-2"],
                            },
                            options: {
                                enableParallelExecution: true,
                                enableCaching: true,
                                maxConcurrency: 2,
                            },
                        },
                        compliance: {
                            enabled: true,
                            rules: [],
                        },
                        output: {
                            format: "json",
                            destination: "./reports/no-custom-queries.json",
                            includeMetadata: true,
                            includeStatistics: true,
                        },
                    },
                },
                globalSettings: {
                    defaultLanguage: "typescript",
                    maxConcurrency: 4,
                    cacheEnabled: true,
                },
            };
            fs_1.default.writeFileSync(testConfigPath, JSON.stringify(customConfig, null, 2));
            const customManager = new analysis_namespace_js_1.AnalysisNamespaceManager(testConfigPath);
            const activeQueries = await customManager.getActiveQueriesForNamespace("no-custom-queries");
            (0, globals_1.expect)(activeQueries).toContain("ts-import-sources");
            (0, globals_1.expect)(activeQueries).toContain("ts-export-declarations");
            (0, globals_1.expect)(activeQueries).toContain("ts-export-assignments");
            (0, globals_1.expect)(activeQueries).not.toContain("custom-query-1");
            (0, globals_1.expect)(activeQueries).not.toContain("custom-query-2");
        });
    });
    (0, globals_1.describe)("Query Performance Options", () => {
        (0, globals_1.it)("should have correct default performance options", async () => {
            const config = await manager.loadConfig();
            const sourceNamespace = config.namespaces.source;
            (0, globals_1.expect)(sourceNamespace.queries.options.enableParallelExecution).toBe(true);
            (0, globals_1.expect)(sourceNamespace.queries.options.enableCaching).toBe(true);
            (0, globals_1.expect)(sourceNamespace.queries.options.maxConcurrency).toBe(4);
        });
        (0, globals_1.it)("should allow custom performance options", async () => {
            const customConfig = {
                projectName: "test-project",
                rootPath: process.cwd(),
                namespaces: {
                    "performance-test": {
                        name: "performance-test",
                        description: "Namespace with custom performance options",
                        patterns: {
                            include: ["src/**/*.ts"],
                            exclude: [],
                        },
                        analysis: {
                            enabled: true,
                            options: {
                                enableParallelExecution: true,
                                enableCaching: true,
                            },
                        },
                        queries: {
                            categories: ["basic-analysis"],
                            custom: {
                                enabled: false,
                                queryIds: [],
                            },
                            options: {
                                enableParallelExecution: false,
                                enableCaching: false,
                                maxConcurrency: 1,
                            },
                        },
                        compliance: {
                            enabled: true,
                            rules: [],
                        },
                        output: {
                            format: "json",
                            destination: "./reports/performance-test.json",
                            includeMetadata: true,
                            includeStatistics: true,
                        },
                    },
                },
                globalSettings: {
                    defaultLanguage: "typescript",
                    maxConcurrency: 4,
                    cacheEnabled: true,
                },
            };
            fs_1.default.writeFileSync(testConfigPath, JSON.stringify(customConfig, null, 2));
            const customManager = new analysis_namespace_js_1.AnalysisNamespaceManager(testConfigPath);
            const config = await customManager.loadConfig();
            const performanceNamespace = config.namespaces["performance-test"];
            (0, globals_1.expect)(performanceNamespace.queries.options.enableParallelExecution).toBe(false);
            (0, globals_1.expect)(performanceNamespace.queries.options.enableCaching).toBe(false);
            (0, globals_1.expect)(performanceNamespace.queries.options.maxConcurrency).toBe(1);
        });
    });
});
//# sourceMappingURL=namespace-query-config.test.js.map