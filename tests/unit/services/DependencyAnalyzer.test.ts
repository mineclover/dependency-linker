/**
 * Unit tests for DependencyAnalyzer
 */

import {
	DependencyAnalyzer,
	ClassifiedDependency,
	DependencyStats,
} from "../../../src/services/DependencyAnalyzer";
import { DependencyInfo } from "../../../src/models/DependencyInfo";
import { SourceLocation } from "../../../src/models/SourceLocation";

describe("DependencyAnalyzer", () => {
	let analyzer: DependencyAnalyzer;

	beforeEach(() => {
		analyzer = new DependencyAnalyzer();
	});

	describe("classifyDependency", () => {
		test("should classify external dependency", () => {
			const dependency: DependencyInfo = {
				source: "lodash",
				type: "external",
				location: { line: 1, column: 0, offset: 0 },
			};

			const result = analyzer.classifyDependency(dependency);

			expect(result.source).toBe("lodash");
			expect(result.type).toBe("external");
			expect(result.isNodeBuiltin).toBe(false);
			expect(result.isScopedPackage).toBe(false);
			expect(result.packageName).toBe("lodash");
			expect(result.extension).toBeUndefined();
		});

		test("should classify Node.js built-in dependency", () => {
			const dependency: DependencyInfo = {
				source: "fs",
				type: "external",
				location: { line: 1, column: 0, offset: 0 },
			};

			const result = analyzer.classifyDependency(dependency);

			expect(result.source).toBe("fs");
			expect(result.type).toBe("external");
			expect(result.isNodeBuiltin).toBe(true);
			expect(result.isScopedPackage).toBe(false);
			expect(result.packageName).toBe("fs");
		});

		test("should classify scoped package dependency", () => {
			const dependency: DependencyInfo = {
				source: "@types/node",
				type: "external",
				location: { line: 1, column: 0, offset: 0 },
			};

			const result = analyzer.classifyDependency(dependency);

			expect(result.source).toBe("@types/node");
			expect(result.type).toBe("external");
			expect(result.isNodeBuiltin).toBe(false);
			expect(result.isScopedPackage).toBe(true);
			expect(result.packageName).toBe("@types/node");
		});

		test("should classify relative dependency with extension", () => {
			const dependency: DependencyInfo = {
				source: "./utils.ts",
				type: "relative",
				location: { line: 1, column: 0, offset: 0 },
			};

			const result = analyzer.classifyDependency(dependency);

			expect(result.source).toBe("./utils.ts");
			expect(result.type).toBe("relative");
			expect(result.isNodeBuiltin).toBe(false);
			expect(result.isScopedPackage).toBe(false);
			expect(result.packageName).toBe("."); // getPackageName splits on '/' and returns first part
			expect(result.extension).toBe(".ts");
		});

		test("should classify internal dependency", () => {
			const dependency: DependencyInfo = {
				source: "src/models/User",
				type: "internal",
				location: { line: 1, column: 0, offset: 0 },
			};

			const result = analyzer.classifyDependency(dependency);

			expect(result.source).toBe("src/models/User");
			expect(result.type).toBe("internal");
			expect(result.isNodeBuiltin).toBe(false);
			expect(result.isScopedPackage).toBe(false);
			expect(result.packageName).toBe("src"); // getPackageName splits on '/' and returns first part
		});
	});

	describe("classifyDependencies", () => {
		test("should classify multiple dependencies", async () => {
			const dependencies: DependencyInfo[] = [
				{
					source: "lodash",
					type: "external",
					location: { line: 1, column: 0, offset: 0 },
				},
				{
					source: "./utils.ts",
					type: "relative",
					location: { line: 2, column: 0, offset: 0 },
				},
				{
					source: "fs",
					type: "external",
					location: { line: 3, column: 0, offset: 0 },
				},
			];

			const results = await analyzer.classifyDependencies(dependencies);

			expect(results).toHaveLength(3);
			expect(results[0].source).toBe("lodash");
			expect(results[0].isNodeBuiltin).toBe(false);
			expect(results[1].source).toBe("./utils.ts");
			expect(results[1].extension).toBe(".ts");
			expect(results[2].source).toBe("fs");
			expect(results[2].isNodeBuiltin).toBe(true);
		});

		test("should handle empty dependencies array", async () => {
			const results = await analyzer.classifyDependencies([]);
			expect(results).toHaveLength(0);
		});
	});

	describe("getClassificationStats", () => {
		test("should calculate correct statistics", () => {
			const dependencies: ClassifiedDependency[] = [
				{
					source: "lodash",
					type: "external",
					location: { line: 1, column: 0, offset: 0 },
					isNodeBuiltin: false,
					isScopedPackage: false,
					packageName: "lodash",
				},
				{
					source: "fs",
					type: "external",
					location: { line: 2, column: 0, offset: 0 },
					isNodeBuiltin: true,
					isScopedPackage: false,
					packageName: "fs",
				},
				{
					source: "./utils.ts",
					type: "relative",
					location: { line: 3, column: 0, offset: 0 },
					isNodeBuiltin: false,
					isScopedPackage: false,
					packageName: "./utils.ts",
					extension: ".ts",
				},
				{
					source: "@types/node",
					type: "external",
					location: { line: 4, column: 0, offset: 0 },
					isNodeBuiltin: false,
					isScopedPackage: true,
					packageName: "@types/node",
				},
				{
					source: "src/models",
					type: "internal",
					location: { line: 5, column: 0, offset: 0 },
					isNodeBuiltin: false,
					isScopedPackage: false,
					packageName: "src/models",
				},
			];

			const stats = analyzer.getClassificationStats(dependencies);

			expect(stats.total).toBe(5);
			expect(stats.external).toBe(3);
			expect(stats.internal).toBe(1);
			expect(stats.relative).toBe(1);
			expect(stats.nodeBuiltins).toBe(1);
			expect(stats.scopedPackages).toBe(1);
			expect(stats.uniquePackages).toBe(3); // lodash, fs, @types/node
		});

		test("should handle empty dependencies", () => {
			const stats = analyzer.getClassificationStats([]);

			expect(stats.total).toBe(0);
			expect(stats.external).toBe(0);
			expect(stats.internal).toBe(0);
			expect(stats.relative).toBe(0);
			expect(stats.nodeBuiltins).toBe(0);
			expect(stats.scopedPackages).toBe(0);
			expect(stats.uniquePackages).toBe(0);
		});
	});

	describe("groupByPackage", () => {
		test("should group dependencies by package name", () => {
			const dependencies: ClassifiedDependency[] = [
				{
					source: "lodash/map",
					type: "external",
					location: { line: 1, column: 0, offset: 0 },
					isNodeBuiltin: false,
					isScopedPackage: false,
					packageName: "lodash",
				},
				{
					source: "lodash/filter",
					type: "external",
					location: { line: 2, column: 0, offset: 0 },
					isNodeBuiltin: false,
					isScopedPackage: false,
					packageName: "lodash",
				},
				{
					source: "fs",
					type: "external",
					location: { line: 3, column: 0, offset: 0 },
					isNodeBuiltin: true,
					isScopedPackage: false,
					packageName: "fs",
				},
			];

			const groups = analyzer.groupByPackage(dependencies);

			expect(groups.size).toBe(2);
			expect(groups.get("lodash")).toHaveLength(2);
			expect(groups.get("fs")).toHaveLength(1);
		});
	});

	describe("getTopPackages", () => {
		test("should return most frequently used packages", () => {
			const dependencies: ClassifiedDependency[] = [
				{
					source: "lodash/map",
					type: "external",
					location: { line: 1, column: 0, offset: 0 },
					isNodeBuiltin: false,
					isScopedPackage: false,
					packageName: "lodash",
				},
				{
					source: "lodash/filter",
					type: "external",
					location: { line: 2, column: 0, offset: 0 },
					isNodeBuiltin: false,
					isScopedPackage: false,
					packageName: "lodash",
				},
				{
					source: "fs",
					type: "external",
					location: { line: 3, column: 0, offset: 0 },
					isNodeBuiltin: true,
					isScopedPackage: false,
					packageName: "fs",
				},
			];

			const topPackages = analyzer.getTopPackages(dependencies, 5);

			expect(topPackages).toHaveLength(2);
			expect(topPackages[0].package).toBe("lodash");
			expect(topPackages[0].count).toBe(2);
			expect(topPackages[0].isNodeBuiltin).toBe(false);
			expect(topPackages[1].package).toBe("fs");
			expect(topPackages[1].count).toBe(1);
			expect(topPackages[1].isNodeBuiltin).toBe(true);
		});

		test("should limit results correctly", () => {
			const dependencies: ClassifiedDependency[] = [
				{
					source: "a",
					type: "external",
					location: { line: 1, column: 0, offset: 0 },
					isNodeBuiltin: false,
					isScopedPackage: false,
					packageName: "a",
				},
				{
					source: "b",
					type: "external",
					location: { line: 2, column: 0, offset: 0 },
					isNodeBuiltin: false,
					isScopedPackage: false,
					packageName: "b",
				},
				{
					source: "c",
					type: "external",
					location: { line: 3, column: 0, offset: 0 },
					isNodeBuiltin: false,
					isScopedPackage: false,
					packageName: "c",
				},
			];

			const topPackages = analyzer.getTopPackages(dependencies, 2);
			expect(topPackages).toHaveLength(2);
		});

		test("should ignore non-external dependencies", () => {
			const dependencies: ClassifiedDependency[] = [
				{
					source: "./utils",
					type: "relative",
					location: { line: 1, column: 0, offset: 0 },
					isNodeBuiltin: false,
					isScopedPackage: false,
					packageName: "./utils",
				},
				{
					source: "internal/module",
					type: "internal",
					location: { line: 2, column: 0, offset: 0 },
					isNodeBuiltin: false,
					isScopedPackage: false,
					packageName: "internal/module",
				},
			];

			const topPackages = analyzer.getTopPackages(dependencies);
			expect(topPackages).toHaveLength(0);
		});
	});

	describe("detectPotentialCircularDependencies", () => {
		test("should detect relative dependencies as potential circular", () => {
			const dependencies: ClassifiedDependency[] = [
				{
					source: "./sibling.ts",
					type: "relative",
					location: { line: 1, column: 0, offset: 0 },
					isNodeBuiltin: false,
					isScopedPackage: false,
					packageName: "./sibling.ts",
				},
				{
					source: "../parent.ts",
					type: "relative",
					location: { line: 2, column: 0, offset: 0 },
					isNodeBuiltin: false,
					isScopedPackage: false,
					packageName: "../parent.ts",
				},
				{
					source: "lodash",
					type: "external",
					location: { line: 3, column: 0, offset: 0 },
					isNodeBuiltin: false,
					isScopedPackage: false,
					packageName: "lodash",
				},
			];

			const circular =
				analyzer.detectPotentialCircularDependencies(dependencies);

			expect(circular).toHaveLength(2);
			expect(circular).toContain("./sibling.ts");
			expect(circular).toContain("../parent.ts");
		});
	});

	describe("suggestOptimizations", () => {
		test("should suggest combining multiple imports from same package", () => {
			const dependencies: ClassifiedDependency[] = Array.from(
				{ length: 4 },
				(_, i) => ({
					source: `lodash/${i}`,
					type: "external" as const,
					location: { line: i + 1, column: 0, offset: 0 },
					isNodeBuiltin: false,
					isScopedPackage: false,
					packageName: "lodash",
				}),
			);

			const suggestions = analyzer.suggestOptimizations(dependencies);

			expect(suggestions.length).toBeGreaterThan(0);
			expect(suggestions[0]).toContain("combining");
			expect(suggestions[0]).toContain("lodash");
		});

		test("should suggest barrel exports for many internal imports", () => {
			const dependencies: ClassifiedDependency[] = Array.from(
				{ length: 6 },
				(_, i) => ({
					source: `internal/module${i}`,
					type: "internal" as const,
					location: { line: i + 1, column: 0, offset: 0 },
					isNodeBuiltin: false,
					isScopedPackage: false,
					packageName: `internal/module${i}`,
				}),
			);

			const suggestions = analyzer.suggestOptimizations(dependencies);

			expect(suggestions.some((s) => s.includes("barrel exports"))).toBe(true);
		});

		test("should warn about deep relative imports", () => {
			const dependencies: ClassifiedDependency[] = [
				{
					source: "../../../deep/nested/module.ts",
					type: "relative",
					location: { line: 1, column: 0, offset: 0 },
					isNodeBuiltin: false,
					isScopedPackage: false,
					packageName: "../../../deep/nested/module.ts",
				},
			];

			const suggestions = analyzer.suggestOptimizations(dependencies);

			expect(suggestions.some((s) => s.includes("deep relative paths"))).toBe(
				true,
			);
		});
	});

	describe("validateDependencies", () => {
		test("should warn about Node.js built-ins", () => {
			const dependencies: ClassifiedDependency[] = [
				{
					source: "fs",
					type: "external",
					location: { line: 1, column: 0, offset: 0 },
					isNodeBuiltin: true,
					isScopedPackage: false,
					packageName: "fs",
				},
			];

			const warnings = analyzer.validateDependencies(dependencies);

			expect(warnings.some((w) => w.includes("Node.js built-in modules"))).toBe(
				true,
			);
		});

		test("should warn about relative imports without extensions", () => {
			const dependencies: ClassifiedDependency[] = [
				{
					source: "module", // No './' and no extension
					type: "relative",
					location: { line: 1, column: 0, offset: 0 },
					isNodeBuiltin: false,
					isScopedPackage: false,
					packageName: "module",
					// No extension property means it's undefined
				},
			];

			const warnings = analyzer.validateDependencies(dependencies);

			expect(warnings.some((w) => w.includes("missing file extensions"))).toBe(
				true,
			);
		});
	});

	describe("generateReport", () => {
		test("should generate comprehensive report", () => {
			const dependencies: ClassifiedDependency[] = [
				{
					source: "lodash",
					type: "external",
					location: { line: 1, column: 0, offset: 0 },
					isNodeBuiltin: false,
					isScopedPackage: false,
					packageName: "lodash",
				},
				{
					source: "fs",
					type: "external",
					location: { line: 2, column: 0, offset: 0 },
					isNodeBuiltin: true,
					isScopedPackage: false,
					packageName: "fs",
				},
			];

			const report = analyzer.generateReport(dependencies);

			expect(report).toContain("# Dependency Analysis Report");
			expect(report).toContain("## Statistics");
			expect(report).toContain("Total Dependencies: 2");
			expect(report).toContain("External Packages: 2");
			expect(report).toContain("## Most Used Packages");
			expect(report).toContain("## Warnings");
			expect(report).toContain("Node.js built-in modules");
		});

		test("should handle empty dependencies in report", () => {
			const report = analyzer.generateReport([]);

			expect(report).toContain("# Dependency Analysis Report");
			expect(report).toContain("Total Dependencies: 0");
		});
	});

	describe("private methods", () => {
		test("extractExtension should work correctly", () => {
			// Access private method through any cast for testing
			const extractExtension = (analyzer as any).extractExtension.bind(
				analyzer,
			);

			expect(extractExtension("./file.ts")).toBe(".ts");
			expect(extractExtension("./file.test.js")).toBe(".js");
			expect(extractExtension("./folder/file.tsx")).toBe(".tsx");
			expect(extractExtension("./noextension")).toBeUndefined();
			expect(extractExtension("lodash")).toBeUndefined();
			expect(extractExtension("./folder.name/file")).toBeUndefined();
		});

		test("resolvePath should work correctly", () => {
			// Access private method through any cast for testing
			const resolvePath = (analyzer as any).resolvePath.bind(analyzer);

			expect(resolvePath("/base/path.ts", "./relative.ts")).toBe("relative.ts");
			expect(resolvePath("/base/path.ts", "../parent.ts")).toBe("../parent.ts");
			expect(resolvePath("/base/path.ts", "absolute")).toBe("absolute");
		});
	});
});
