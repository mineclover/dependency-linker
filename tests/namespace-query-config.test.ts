/**
 * Namespace Query Configuration Tests
 * 네임스페이스 쿼리 구성 테스트
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import fs from "fs";
import path from "path";
import {
	AnalysisNamespaceManager,
	QueryCategory,
	QUERY_CATEGORY_MAPPING,
	type NamespaceConfig,
} from "../dist/namespace/analysis-namespace.js";

describe("Namespace Query Configuration", () => {
	let manager: AnalysisNamespaceManager;
	let testConfigPath: string;

	beforeEach(() => {
		testConfigPath = "./test-namespace-config.json";
		manager = new AnalysisNamespaceManager(testConfigPath);
	});

	afterEach(() => {
		// 테스트 설정 파일 정리
		if (fs.existsSync(testConfigPath)) {
			fs.unlinkSync(testConfigPath);
		}
	});

	describe("Query Category Mapping", () => {
		it("should have all required query categories", () => {
			const expectedCategories: QueryCategory[] = [
				"basic-analysis",
				"symbol-definitions",
				"dependency-tracking",
				"advanced-analysis",
			];

			expectedCategories.forEach((category) => {
				expect(QUERY_CATEGORY_MAPPING).toHaveProperty(category);
				expect(Array.isArray(QUERY_CATEGORY_MAPPING[category])).toBe(true);
				expect(QUERY_CATEGORY_MAPPING[category].length).toBeGreaterThan(0);
			});
		});

		it("should have correct query counts for each category", () => {
			expect(QUERY_CATEGORY_MAPPING["basic-analysis"]).toHaveLength(3);
			expect(QUERY_CATEGORY_MAPPING["symbol-definitions"]).toHaveLength(9);
			expect(QUERY_CATEGORY_MAPPING["dependency-tracking"]).toHaveLength(6);
			expect(QUERY_CATEGORY_MAPPING["advanced-analysis"]).toHaveLength(3);
		});

		it("should have unique query IDs across categories", () => {
			const allQueries = Object.values(QUERY_CATEGORY_MAPPING).flat();
			const uniqueQueries = [...new Set(allQueries)];
			expect(allQueries).toHaveLength(uniqueQueries.length);
		});
	});

	describe("Query Category Information", () => {
		it("should return correct category information", () => {
			const categories = manager.getQueryCategories();

			expect(categories).toHaveProperty("basic-analysis");
			expect(categories).toHaveProperty("symbol-definitions");
			expect(categories).toHaveProperty("dependency-tracking");
			expect(categories).toHaveProperty("advanced-analysis");

			// 각 카테고리 정보 검증
			Object.values(categories).forEach((category) => {
				expect(category).toHaveProperty("name");
				expect(category).toHaveProperty("description");
				expect(category).toHaveProperty("queryCount");
				expect(typeof category.name).toBe("string");
				expect(typeof category.description).toBe("string");
				expect(typeof category.queryCount).toBe("number");
				expect(category.queryCount).toBeGreaterThan(0);
			});
		});

		it("should have correct query counts in category info", () => {
			const categories = manager.getQueryCategories();

			expect(categories["basic-analysis"].queryCount).toBe(3);
			expect(categories["symbol-definitions"].queryCount).toBe(9);
			expect(categories["dependency-tracking"].queryCount).toBe(6);
			expect(categories["advanced-analysis"].queryCount).toBe(3);
		});
	});

	describe("Query Selection for Categories", () => {
		it("should return correct queries for single category", () => {
			const basicQueries = manager.getQueriesForCategories(["basic-analysis"]);
			expect(basicQueries).toEqual(QUERY_CATEGORY_MAPPING["basic-analysis"]);
		});

		it("should return correct queries for multiple categories", () => {
			const categories: QueryCategory[] = [
				"basic-analysis",
				"symbol-definitions",
			];
			const queries = manager.getQueriesForCategories(categories);

			const expectedQueries = [
				...QUERY_CATEGORY_MAPPING["basic-analysis"],
				...QUERY_CATEGORY_MAPPING["symbol-definitions"],
			];

			expect(queries).toEqual(expectedQueries);
		});

		it("should remove duplicates when combining categories", () => {
			// 중복 쿼리가 있는 카테고리 조합 테스트
			const categories: QueryCategory[] = [
				"basic-analysis",
				"symbol-definitions",
				"dependency-tracking",
			];
			const queries = manager.getQueriesForCategories(categories);

			const uniqueQueries = [...new Set(queries)];
			expect(queries).toHaveLength(uniqueQueries.length);
		});

		it("should return empty array for empty categories", () => {
			const queries = manager.getQueriesForCategories([]);
			expect(queries).toEqual([]);
		});
	});

	describe("Namespace Query Configuration", () => {
		it("should create namespace with default query configuration", async () => {
			const config = await manager.loadConfig();
			expect(config.namespaces).toHaveProperty("source");
			expect(config.namespaces).toHaveProperty("tests");

			// source 네임스페이스 쿼리 구성 검증
			const sourceNamespace = config.namespaces.source;
			expect(sourceNamespace.queries).toBeDefined();
			expect(sourceNamespace.queries.categories).toContain("basic-analysis");
			expect(sourceNamespace.queries.categories).toContain(
				"symbol-definitions",
			);
			expect(sourceNamespace.queries.categories).toContain(
				"dependency-tracking",
			);
		});

		it("should get active queries for namespace", async () => {
			const activeQueries =
				await manager.getActiveQueriesForNamespace("source");
			expect(Array.isArray(activeQueries)).toBe(true);
			expect(activeQueries.length).toBeGreaterThan(0);

			// 기본 분석 쿼리가 포함되어야 함
			expect(activeQueries).toContain("ts-import-sources");
			expect(activeQueries).toContain("ts-export-declarations");
			expect(activeQueries).toContain("ts-export-assignments");
		});

		it("should return empty array for non-existent namespace", async () => {
			const activeQueries =
				await manager.getActiveQueriesForNamespace("non-existent");
			expect(activeQueries).toEqual([]);
		});

		it("should handle namespace without queries configuration", async () => {
			// queries 필드가 없는 네임스페이스 테스트
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
						// queries 필드 누락
						compliance: {
							enabled: true,
							rules: [],
						},
						output: {
							format: "json" as const,
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

			fs.writeFileSync(testConfigPath, JSON.stringify(customConfig, null, 2));
			const customManager = new AnalysisNamespaceManager(testConfigPath);
			const activeQueries =
				await customManager.getActiveQueriesForNamespace("no-queries");
			expect(activeQueries).toEqual([]);
		});
	});

	describe("Custom Query Configuration", () => {
		it("should include custom queries when enabled", async () => {
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
							format: "json" as const,
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

			fs.writeFileSync(testConfigPath, JSON.stringify(customConfig, null, 2));
			const customManager = new AnalysisNamespaceManager(testConfigPath);
			const activeQueries =
				await customManager.getActiveQueriesForNamespace("custom-queries");

			// 기본 분석 쿼리 + 커스텀 쿼리
			expect(activeQueries).toContain("ts-import-sources");
			expect(activeQueries).toContain("ts-export-declarations");
			expect(activeQueries).toContain("ts-export-assignments");
			expect(activeQueries).toContain("custom-query-1");
			expect(activeQueries).toContain("custom-query-2");
		});

		it("should exclude custom queries when disabled", async () => {
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
							format: "json" as const,
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

			fs.writeFileSync(testConfigPath, JSON.stringify(customConfig, null, 2));
			const customManager = new AnalysisNamespaceManager(testConfigPath);
			const activeQueries =
				await customManager.getActiveQueriesForNamespace("no-custom-queries");

			// 기본 분석 쿼리만 포함
			expect(activeQueries).toContain("ts-import-sources");
			expect(activeQueries).toContain("ts-export-declarations");
			expect(activeQueries).toContain("ts-export-assignments");
			expect(activeQueries).not.toContain("custom-query-1");
			expect(activeQueries).not.toContain("custom-query-2");
		});
	});

	describe("Query Performance Options", () => {
		it("should have correct default performance options", async () => {
			const config = await manager.loadConfig();
			const sourceNamespace = config.namespaces.source;

			expect(sourceNamespace.queries.options.enableParallelExecution).toBe(
				true,
			);
			expect(sourceNamespace.queries.options.enableCaching).toBe(true);
			expect(sourceNamespace.queries.options.maxConcurrency).toBe(4);
		});

		it("should allow custom performance options", async () => {
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
							format: "json" as const,
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

			fs.writeFileSync(testConfigPath, JSON.stringify(customConfig, null, 2));
			const customManager = new AnalysisNamespaceManager(testConfigPath);
			const config = await customManager.loadConfig();
			const performanceNamespace = config.namespaces["performance-test"];

			expect(performanceNamespace.queries.options.enableParallelExecution).toBe(
				false,
			);
			expect(performanceNamespace.queries.options.enableCaching).toBe(false);
			expect(performanceNamespace.queries.options.maxConcurrency).toBe(1);
		});
	});
});
