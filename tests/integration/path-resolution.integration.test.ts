/**
 * Path Resolution Test - Simplified
 * Tests core path resolution functionality
 */

import {
	resolveAnalysisPath,
	toProjectRelativePath,
	validateAndResolveAnalysisPath,
	batchResolveAnalysisPaths,
} from "../../src/utils/PathUtils";
import { isAbsolute } from "node:path";

describe("Path Resolution", () => {
	describe("Basic Path Resolution", () => {
		test("should resolve relative paths to absolute", () => {
			const relativePath = "./src/test.ts";
			const resolved = resolveAnalysisPath(relativePath);

			expect(isAbsolute(resolved)).toBe(true);
			expect(resolved).toContain("src/test.ts");
		});

		test("should keep absolute paths unchanged", () => {
			const absolutePath = "/absolute/path/test.ts";
			const resolved = resolveAnalysisPath(absolutePath);

			expect(resolved).toBe(absolutePath);
		});
	});

	describe("Project Relative Paths", () => {
		test("should convert to project relative", () => {
			const absolutePath = process.cwd() + "/src/lib/index.ts";
			const relative = toProjectRelativePath(absolutePath);

			expect(relative).toBe("src/lib/index.ts");
		});

		test("should handle paths outside project", () => {
			const outsidePath = "/outside/project/file.ts";
			const relative = toProjectRelativePath(outsidePath);

			expect(relative).toBe(outsidePath); // Should remain unchanged
		});
	});

	describe("Path Validation", () => {
		test("should validate and resolve valid paths", () => {
			const result = validateAndResolveAnalysisPath("./src/test.ts");

			expect(result.isValid).toBe(true);
			expect(result.absolutePath).toBeDefined();
			expect(isAbsolute(result.absolutePath)).toBe(true);
		});

		test("should handle invalid paths gracefully", () => {
			const result = validateAndResolveAnalysisPath("");

			expect(result.isValid).toBe(false);
			expect(result.error).toBeDefined();
		});
	});

	describe("Batch Processing", () => {
		test("should process multiple paths", () => {
			const paths = ["./src/test1.ts", "./src/test2.ts", "./docs/readme.md"];
			const results = batchResolveAnalysisPaths(paths);

			expect(results).toHaveLength(3);
			results.forEach(result => {
				expect(result.input).toBeDefined();
				expect(result.absolutePath).toBeDefined();
				expect(isAbsolute(result.absolutePath)).toBe(true);
			});
		});

		test("should handle mixed valid and invalid paths", () => {
			const paths = ["./valid/path.ts", "", "./another/valid.ts"];
			const results = batchResolveAnalysisPaths(paths);

			expect(results).toHaveLength(3);
			expect(results[0].isValid).toBe(true);
			expect(results[1].isValid).toBe(false);
			expect(results[2].isValid).toBe(true);
		});
	});
});