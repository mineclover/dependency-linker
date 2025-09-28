/**
 * PathUtils Tests - Project Root Path Normalization System
 */

import {
	findProjectRoot,
	normalizeToProjectRoot,
	resolveFromProjectRoot,
	clearProjectRootCache,
} from "../../../src/utils/PathUtils";
import * as fs from "node:fs";
import * as path from "node:path";
import { jest } from "@jest/globals";
import type { PathLike } from "node:fs";

// Mock fs module
jest.mock("node:fs", () => ({
	existsSync: jest.fn(),
	lstatSync: jest.fn(() => ({ isDirectory: () => true })),
	realpathSync: jest.fn((p: PathLike) => p.toString()),
}));

// Mock process.cwd()
const originalCwd = process.cwd;
const mockCwd = jest.fn();
Object.defineProperty(process, 'cwd', { value: mockCwd });

const mockFs = fs as jest.Mocked<typeof fs>;

describe("PathUtils - Project Root Path Normalization", () => {
	const testProjectRoot = "/Users/test/my-project";
	const testWorkingDir = "/Users/test/my-project/src/components";

	beforeEach(() => {
		// Clear cache before each test
		clearProjectRootCache();

		// Reset mocks
		mockFs.existsSync.mockReset();
		mockFs.lstatSync.mockReset();
		mockFs.realpathSync.mockReset();
		mockCwd.mockReset();

		// Default setup
		mockCwd.mockReturnValue(testWorkingDir);
	});

	afterAll(() => {
		// Restore original process.cwd
		Object.defineProperty(process, 'cwd', { value: originalCwd });
	});

	describe("findProjectRoot", () => {
		it("should find project root with package.json", () => {
			mockFs.existsSync.mockImplementation((filePath: PathLike) => {
				return filePath.toString() === path.join(testProjectRoot, "package.json");
			});

			const result = findProjectRoot(testWorkingDir);

			expect(result).toBe(testProjectRoot);
		});

		it("should find project root with .git directory", () => {
			mockFs.existsSync.mockImplementation((filePath: PathLike) => {
				return filePath.toString() === path.join(testProjectRoot, ".git");
			});

			const result = findProjectRoot(testWorkingDir);

			expect(result).toBe(testProjectRoot);
		});

		it("should find project root with tsconfig.json", () => {
			mockFs.existsSync.mockImplementation((filePath: PathLike) => {
				return filePath.toString() === path.join(testProjectRoot, "tsconfig.json");
			});

			const result = findProjectRoot(testWorkingDir);

			expect(result).toBe(testProjectRoot);
		});

		it("should prioritize package.json over other markers", () => {
			mockFs.existsSync.mockImplementation((filePath: PathLike) => {
				// Both package.json and .git exist, should prefer package.json
				const pathStr = filePath.toString();
				return pathStr === path.join(testProjectRoot, "package.json") ||
					   pathStr === path.join(testProjectRoot, ".git");
			});

			const result = findProjectRoot(testWorkingDir);

			expect(result).toBe(testProjectRoot);
			// Verify package.json was checked first
			expect(mockFs.existsSync).toHaveBeenCalledWith(
				path.join(testProjectRoot, "package.json")
			);
		});

		it("should traverse up directories to find project root", () => {
			const deepDir = "/Users/test/my-project/src/components/ui/buttons";

			mockFs.existsSync.mockImplementation((filePath: PathLike) => {
				return filePath.toString() === path.join(testProjectRoot, "package.json");
			});

			const result = findProjectRoot(deepDir);

			expect(result).toBe(testProjectRoot);
		});

		it("should return current working directory if no project root found", () => {
			mockFs.existsSync.mockReturnValue(false);
			mockCwd.mockReturnValue("/some/random/directory");

			const result = findProjectRoot();

			expect(result).toBe("/some/random/directory");
		});

		it("should return null if no project root found and no working directory", () => {
			mockFs.existsSync.mockReturnValue(false);

			const result = findProjectRoot("/non/existent/path");

			expect(result).toBeNull();
		});

		it("should cache project root for performance", () => {
			mockFs.existsSync.mockImplementation((filePath: PathLike) => {
				return filePath.toString() === path.join(testProjectRoot, "package.json");
			});

			// First call
			const result1 = findProjectRoot(testWorkingDir);
			const firstCallCount = mockFs.existsSync.mock.calls.length;

			// Second call should use cache
			const result2 = findProjectRoot(testWorkingDir);
			const secondCallCount = mockFs.existsSync.mock.calls.length;

			expect(result1).toBe(testProjectRoot);
			expect(result2).toBe(testProjectRoot);
			expect(secondCallCount).toBe(firstCallCount); // No additional fs calls
		});

		it("should clear cache when requested", () => {
			mockFs.existsSync.mockImplementation((filePath: PathLike) => {
				return filePath.toString() === path.join(testProjectRoot, "package.json");
			});

			// First call
			findProjectRoot(testWorkingDir);
			const firstCallCount = mockFs.existsSync.mock.calls.length;

			// Clear cache
			clearProjectRootCache();

			// Second call should make fs calls again
			findProjectRoot(testWorkingDir);
			const secondCallCount = mockFs.existsSync.mock.calls.length;

			expect(secondCallCount).toBeGreaterThan(firstCallCount);
		});
	});

	describe("normalizeToProjectRoot", () => {
		beforeEach(() => {
			// Setup project root detection
			mockFs.existsSync.mockImplementation((filePath: PathLike) => {
				return filePath.toString() === path.join(testProjectRoot, "package.json");
			});
		});

		it("should normalize absolute path within project", () => {
			const inputPath = "/Users/test/my-project/src/components/Button.tsx";
			const result = normalizeToProjectRoot(inputPath);

			expect(result).toBe("./src/components/Button.tsx");
		});

		it("should normalize relative path from project root", () => {
			const inputPath = "./src/utils/helper.ts";
			const result = normalizeToProjectRoot(inputPath);

			expect(result).toBe("./src/utils/helper.ts");
		});

		it("should normalize relative path without leading dot", () => {
			const inputPath = "src/types/index.ts";
			const result = normalizeToProjectRoot(inputPath);

			expect(result).toBe("./src/types/index.ts");
		});

		it("should handle paths from subdirectories", () => {
			const inputPath = "../utils/config.ts";
			const projectRoot = testProjectRoot;

			const result = normalizeToProjectRoot(inputPath, projectRoot);

			// This should resolve relative to project root
			expect(result).toBe("./utils/config.ts");
		});

		it("should return absolute path for files outside project", () => {
			const inputPath = "/usr/local/lib/node_modules/react/index.js";
			const result = normalizeToProjectRoot(inputPath);

			expect(result).toBe("/usr/local/lib/node_modules/react/index.js");
		});

		it("should use provided project root parameter", () => {
			const customProjectRoot = "/custom/project/root";
			const inputPath = "/custom/project/root/src/index.ts";

			const result = normalizeToProjectRoot(inputPath, customProjectRoot);

			expect(result).toBe("./src/index.ts");
		});

		it("should normalize Windows paths to forward slashes", () => {
			const inputPath = "/Users/test/my-project/src\\components\\Button.tsx";
			const result = normalizeToProjectRoot(inputPath);

			expect(result).toBe("./src/components/Button.tsx");
		});

		it("should handle complex relative paths", () => {
			const inputPath = "../../../my-project/src/components/../utils/helper.ts";
			const result = normalizeToProjectRoot(inputPath);

			expect(result).toBe("./src/utils/helper.ts");
		});
	});

	describe("resolveFromProjectRoot", () => {
		beforeEach(() => {
			// Setup project root detection
			mockFs.existsSync.mockImplementation((filePath: PathLike) => {
				return filePath.toString() === path.join(testProjectRoot, "package.json");
			});
		});

		it("should resolve relative path to absolute", () => {
			const relativePath = "./src/components/Button.tsx";
			const result = resolveFromProjectRoot(relativePath);

			expect(result).toBe("/Users/test/my-project/src/components/Button.tsx");
		});

		it("should handle path without leading dot", () => {
			const relativePath = "src/utils/helper.ts";
			const result = resolveFromProjectRoot(relativePath);

			expect(result).toBe("/Users/test/my-project/src/utils/helper.ts");
		});

		it("should use provided project root parameter", () => {
			const customProjectRoot = "/custom/project/root";
			const relativePath = "./src/index.ts";

			const result = resolveFromProjectRoot(relativePath, customProjectRoot);

			expect(result).toBe("/custom/project/root/src/index.ts");
		});

		it("should normalize path separators", () => {
			const relativePath = "./src\\components\\Button.tsx";
			const result = resolveFromProjectRoot(relativePath);

			expect(result).toBe("/Users/test/my-project/src/components/Button.tsx");
		});
	});

	describe("round-trip consistency", () => {
		beforeEach(() => {
			// Setup project root detection
			mockFs.existsSync.mockImplementation((filePath: PathLike) => {
				return filePath.toString() === path.join(testProjectRoot, "package.json");
			});
		});

		it("should maintain consistency between normalize and resolve", () => {
			const originalPaths = [
				"/Users/test/my-project/src/index.ts",
				"./src/components/Button.tsx",
				"src/utils/helper.ts",
				"/Users/test/my-project/docs/README.md",
			];

			originalPaths.forEach((originalPath) => {
				const normalized = normalizeToProjectRoot(originalPath);

				// Only test round-trip for paths within project
				if (normalized.startsWith("./")) {
					const resolved = resolveFromProjectRoot(normalized);
					const renormalized = normalizeToProjectRoot(resolved);

					expect(renormalized).toBe(normalized);
				}
			});
		});
	});

	describe("cache performance and consistency", () => {
		beforeEach(() => {
			mockFs.existsSync.mockImplementation((filePath: PathLike) => {
				return filePath.toString() === path.join(testProjectRoot, "package.json");
			});
		});

		it("should produce consistent results with and without cache", () => {
			const testPath = "/Users/test/my-project/src/components/Modal.tsx";

			// First call (no cache)
			clearProjectRootCache();
			const result1 = normalizeToProjectRoot(testPath);

			// Second call (with cache)
			const result2 = normalizeToProjectRoot(testPath);

			// Third call after clearing cache
			clearProjectRootCache();
			const result3 = normalizeToProjectRoot(testPath);

			expect(result1).toBe(result2);
			expect(result2).toBe(result3);
			expect(result1).toBe("./src/components/Modal.tsx");
		});

		it("should handle multiple different paths consistently", () => {
			const testPaths = [
				"/Users/test/my-project/src/index.ts",
				"/Users/test/my-project/src/components/Button.tsx",
				"/Users/test/my-project/tests/unit/example.test.ts",
				"/Users/test/my-project/docs/api.md",
			];

			const expectedResults = [
				"./src/index.ts",
				"./src/components/Button.tsx",
				"./tests/unit/example.test.ts",
				"./docs/api.md",
			];

			testPaths.forEach((testPath, index) => {
				const result = normalizeToProjectRoot(testPath);
				expect(result).toBe(expectedResults[index]);
			});
		});
	});

	describe("edge cases and error handling", () => {
		it("should handle empty string input", () => {
			const result = normalizeToProjectRoot("");
			expect(result).toBe("");
		});

		it("should handle root directory path", () => {
			const result = normalizeToProjectRoot("/");
			expect(result).toBe("/");
		});

		it("should handle same directory references", () => {
			mockFs.existsSync.mockImplementation((filePath: PathLike) => {
				return filePath.toString() === path.join(testProjectRoot, "package.json");
			});

			const result = normalizeToProjectRoot("./");
			expect(result).toBe("./");
		});

		it("should handle non-existent project root gracefully", () => {
			mockFs.existsSync.mockReturnValue(false);
			mockCwd.mockReturnValue("/some/directory");

			const inputPath = "/some/directory/file.ts";
			const result = normalizeToProjectRoot(inputPath);

			// Should normalize relative to current working directory
			expect(result).toBe("./file.ts");
		});
	});
});