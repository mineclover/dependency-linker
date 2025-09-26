/**
 * PathResolutionUtils Tests
 */

import {
	batchResolvePaths,
	resolveDependencyPath,
	tryResolveWithAlias,
	tryResolveWithExtensions,
	convertToProjectRelativePaths,
	extractFileExtensions,
	groupDependenciesByType,
	isWithinProject,
	findCommonBasePath,
	createResolutionContext,
	loadTsconfigPaths,
	loadPackageDependencies,
	type PathResolutionContext,
} from "../../../src/utils/PathResolutionUtils";
import * as fs from "node:fs";
import * as path from "node:path";
import { jest } from "@jest/globals";

// Mock fs module
jest.mock("node:fs", () => ({
	promises: {
		access: jest.fn(),
		readFile: jest.fn(),
	},
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe("PathResolutionUtils", () => {
	const mockProjectRoot = "/Users/test/project";
	const mockSourceFileDir = "/Users/test/project/src/components";

	beforeEach(() => {
		mockFs.promises.access.mockReset();
		mockFs.promises.readFile.mockReset();
	});

	describe("resolveDependencyPath", () => {
		const context: PathResolutionContext = {
			projectRoot: mockProjectRoot,
			sourceFileDir: mockSourceFileDir,
			extensions: [".ts", ".tsx", ".js"],
		};

		it("should resolve absolute paths", async () => {
			const absolutePath = "/Users/test/project/src/utils/helper.ts";

			const result = await resolveDependencyPath(absolutePath, context);

			expect(result).toBe(absolutePath);
		});

		it("should resolve relative paths", async () => {
			mockFs.promises.access.mockImplementation(async (filePath: string) => {
				if (filePath === "/Users/test/project/src/components/utils/helper.ts") {
					return Promise.resolve();
				}
				throw new Error("File not found");
			});

			const result = await resolveDependencyPath("./utils/helper", context);

			expect(result).toBe("/Users/test/project/src/components/utils/helper.ts");
		});

		it("should try extensions when file not found", async () => {
			mockFs.promises.access.mockImplementation(async (filePath: string) => {
				if (filePath === "/Users/test/project/src/components/api.tsx") {
					return Promise.resolve();
				}
				throw new Error("File not found");
			});

			const result = await resolveDependencyPath("./api", context);

			expect(result).toBe("/Users/test/project/src/components/api.tsx");
		});

		it("should resolve with aliases", async () => {
			const contextWithAlias: PathResolutionContext = {
				...context,
				aliases: {
					"@": "src",
					"@utils": "src/utils",
				},
			};

			mockFs.promises.access.mockImplementation(async (filePath: string) => {
				if (filePath === "/Users/test/project/src/components/Button.ts") {
					return Promise.resolve();
				}
				throw new Error("File not found");
			});

			const result = await resolveDependencyPath(
				"@/components/Button",
				contextWithAlias,
			);

			expect(result).toBe("/Users/test/project/src/components/Button.ts");
		});

		it("should return null when file cannot be resolved", async () => {
			mockFs.promises.access.mockRejectedValue(new Error("File not found"));

			const result = await resolveDependencyPath("./nonexistent", context);

			expect(result).toBeNull();
		});
	});

	describe("batchResolvePaths", () => {
		it("should resolve multiple paths in parallel", async () => {
			const context: PathResolutionContext = {
				projectRoot: mockProjectRoot,
				sourceFileDir: mockSourceFileDir,
				extensions: [".ts"],
			};

			const sources = ["./utils/a", "./utils/b", "./utils/c"];

			mockFs.promises.access.mockImplementation(async (filePath: string) => {
				const validPaths = [
					"/Users/test/project/src/components/utils/a.ts",
					"/Users/test/project/src/components/utils/b.ts",
				];
				if (validPaths.includes(filePath as string)) {
					return Promise.resolve();
				}
				throw new Error("File not found");
			});

			const result = await batchResolvePaths(sources, context);

			expect(result.size).toBe(3);
			expect(result.get("./utils/a")).toBe(
				"/Users/test/project/src/components/utils/a.ts",
			);
			expect(result.get("./utils/b")).toBe(
				"/Users/test/project/src/components/utils/b.ts",
			);
			expect(result.get("./utils/c")).toBeNull();
		});
	});

	describe("tryResolveWithAlias", () => {
		const aliases = {
			"@": "src",
			"@utils": "src/utils",
			"@components/*": "src/components/*",
		};

		it("should resolve exact alias match", () => {
			const result = tryResolveWithAlias("@utils", aliases, mockProjectRoot);
			expect(result).toBe("/Users/test/project/src/utils");
		});

		it("should resolve alias with path", () => {
			const result = tryResolveWithAlias(
				"@/components/Button",
				aliases,
				mockProjectRoot,
			);
			expect(result).toBe("/Users/test/project/src/components/Button");
		});

		it("should resolve wildcard aliases", () => {
			const result = tryResolveWithAlias(
				"@components/shared/Modal",
				aliases,
				mockProjectRoot,
			);
			expect(result).toBe("/Users/test/project/src/components/shared/Modal");
		});

		it("should return null for no match", () => {
			const result = tryResolveWithAlias(
				"unknown/path",
				aliases,
				mockProjectRoot,
			);
			expect(result).toBeNull();
		});
	});

	describe("tryResolveWithExtensions", () => {
		it("should return exact path if exists", async () => {
			mockFs.promises.access.mockImplementation(async (filePath: string) => {
				if (filePath === "/Users/test/project/exact.ts") {
					return Promise.resolve();
				}
				throw new Error("File not found");
			});

			const result = await tryResolveWithExtensions(
				"/Users/test/project/exact.ts",
			);
			expect(result).toBe("/Users/test/project/exact.ts");
		});

		it("should try with extensions", async () => {
			mockFs.promises.access.mockImplementation(async (filePath: string) => {
				if (filePath === "/Users/test/project/file.tsx") {
					return Promise.resolve();
				}
				throw new Error("File not found");
			});

			const result = await tryResolveWithExtensions(
				"/Users/test/project/file",
				[".ts", ".tsx"],
			);
			expect(result).toBe("/Users/test/project/file.tsx");
		});

		it("should try index files", async () => {
			mockFs.promises.access.mockImplementation(async (filePath: string) => {
				if (filePath === "/Users/test/project/dir/index.ts") {
					return Promise.resolve();
				}
				throw new Error("File not found");
			});

			const result = await tryResolveWithExtensions("/Users/test/project/dir", [
				".ts",
			]);
			expect(result).toBe("/Users/test/project/dir/index.ts");
		});

		it("should return null if no resolution", async () => {
			mockFs.promises.access.mockRejectedValue(new Error("File not found"));

			const result = await tryResolveWithExtensions(
				"/Users/test/project/nonexistent",
			);
			expect(result).toBeNull();
		});
	});

	describe("convertToProjectRelativePaths", () => {
		it("should convert absolute paths to relative", () => {
			const data = {
				source: "/Users/test/project/src/utils/helper.ts",
				dependencies: [
					{ path: "/Users/test/project/src/components/Button.tsx" },
					{ external: "react" },
				],
			};

			const result = convertToProjectRelativePaths(data, mockProjectRoot, [
				"source",
				"path",
			]);

			expect(result.source).toBe("src/utils/helper.ts");
			expect(result.dependencies[0].path).toBe("src/components/Button.tsx");
			expect(result.dependencies[1].external).toBe("react"); // Should not change
		});

		it("should handle nested objects", () => {
			const data = {
				nested: {
					source: "/Users/test/project/src/index.ts",
					other: "value",
				},
			};

			const result = convertToProjectRelativePaths(data, mockProjectRoot, [
				"source",
			]);

			expect(result.nested.source).toBe("src/index.ts");
			expect(result.nested.other).toBe("value");
		});
	});

	describe("extractFileExtensions", () => {
		it("should extract unique extensions from sources", () => {
			const sources = [
				"./helper.ts",
				"./component.tsx",
				"./style.css",
				"./another.ts",
				"no-extension",
			];

			const result = extractFileExtensions(sources);

			expect(result).toEqual([".css", ".ts", ".tsx"]);
		});
	});

	describe("groupDependenciesByType", () => {
		it("should group dependencies by type correctly", () => {
			const sources = [
				"./relative.ts",
				"../parent.js",
				"/absolute/path.ts",
				"react",
				"@types/node",
				"fs",
				"node:path",
			];

			const result = groupDependenciesByType(sources);

			expect(result.relative).toEqual(["./relative.ts", "../parent.js"]);
			expect(result.absolute).toEqual(["/absolute/path.ts"]);
			expect(result.nodeModules).toEqual(["react", "@types/node"]);
			expect(result.builtin).toEqual(["fs", "node:path"]);
		});
	});

	describe("isWithinProject", () => {
		it("should return true for paths within project", () => {
			const result = isWithinProject(
				"/Users/test/project/src/index.ts",
				mockProjectRoot,
			);
			expect(result).toBe(true);
		});

		it("should return false for paths outside project", () => {
			const result = isWithinProject(
				"/Users/other/project/index.ts",
				mockProjectRoot,
			);
			expect(result).toBe(false);
		});

		it("should return false for parent directory access", () => {
			const result = isWithinProject("/Users/test/index.ts", mockProjectRoot);
			expect(result).toBe(false);
		});
	});

	describe("findCommonBasePath", () => {
		it("should find common base path", () => {
			const paths = [
				"/Users/test/project/src/components/Button.tsx",
				"/Users/test/project/src/components/Modal.tsx",
				"/Users/test/project/src/utils/helper.ts",
			];

			const result = findCommonBasePath(paths);
			expect(result).toBe("/Users/test/project/src");
		});

		it("should handle single path", () => {
			const paths = ["/Users/test/project/src/index.ts"];
			const result = findCommonBasePath(paths);
			expect(result).toBe("/Users/test/project/src");
		});

		it("should handle empty array", () => {
			const result = findCommonBasePath([]);
			expect(result).toBe("");
		});
	});

	describe("createResolutionContext", () => {
		it("should create resolution context from analysis result", () => {
			const analysisResult = {
				pathInfo: {
					projectRoot: mockProjectRoot,
					absolute: "/Users/test/project/src/components/Button.tsx",
				},
			};

			const result = createResolutionContext(analysisResult);

			expect(result.projectRoot).toBe(mockProjectRoot);
			expect(result.sourceFileDir).toBe("/Users/test/project/src/components");
			expect(result.extensions).toEqual([
				".ts",
				".tsx",
				".js",
				".jsx",
				".mjs",
				".cjs",
				".json",
			]);
		});

		it("should accept custom aliases and extensions", () => {
			const analysisResult = {
				pathInfo: {
					projectRoot: mockProjectRoot,
					absolute: "/Users/test/project/src/index.ts",
				},
			};

			const aliases = { "@": "src" };
			const extensions = [".vue", ".js"];

			const result = createResolutionContext(
				analysisResult,
				aliases,
				extensions,
			);

			expect(result.aliases).toBe(aliases);
			expect(result.extensions).toBe(extensions);
		});
	});

	describe("loadTsconfigPaths", () => {
		it("should load path mappings from tsconfig.json", async () => {
			const mockTsconfig = {
				compilerOptions: {
					paths: {
						"@/*": ["src/*"],
						"@utils/*": ["src/utils/*"],
						"@components": ["src/components"],
					},
				},
			};

			mockFs.promises.access.mockResolvedValue(undefined);
			mockFs.promises.readFile.mockResolvedValue(JSON.stringify(mockTsconfig));

			const result = await loadTsconfigPaths(mockProjectRoot);

			expect(result).toEqual({
				"@": "src",
				"@utils": "src/utils",
				"@components": "src/components",
			});
		});

		it("should handle missing tsconfig.json", async () => {
			mockFs.promises.access.mockRejectedValue(new Error("File not found"));

			const result = await loadTsconfigPaths(mockProjectRoot);

			expect(result).toEqual({});
		});

		it("should handle malformed tsconfig.json", async () => {
			mockFs.promises.access.mockResolvedValue(undefined);
			mockFs.promises.readFile.mockResolvedValue("{ invalid json }");

			const result = await loadTsconfigPaths(mockProjectRoot);

			expect(result).toEqual({});
		});
	});

	describe("loadPackageDependencies", () => {
		it("should load dependencies from package.json", async () => {
			const mockPackageJson = {
				dependencies: {
					react: "^18.0.0",
					lodash: "^4.17.21",
				},
				devDependencies: {
					"@types/react": "^18.0.0",
					typescript: "^5.0.0",
				},
				peerDependencies: {
					"react-dom": "^18.0.0",
				},
			};

			mockFs.promises.access.mockResolvedValue(undefined);
			mockFs.promises.readFile.mockResolvedValue(
				JSON.stringify(mockPackageJson),
			);

			const result = await loadPackageDependencies(mockProjectRoot);

			expect(result.size).toBe(5);
			expect(result.has("react")).toBe(true);
			expect(result.has("lodash")).toBe(true);
			expect(result.has("@types/react")).toBe(true);
			expect(result.has("typescript")).toBe(true);
			expect(result.has("react-dom")).toBe(true);
		});

		it("should handle missing package.json", async () => {
			mockFs.promises.access.mockRejectedValue(new Error("File not found"));

			const result = await loadPackageDependencies(mockProjectRoot);

			expect(result.size).toBe(0);
		});

		it("should handle malformed package.json", async () => {
			mockFs.promises.access.mockResolvedValue(undefined);
			mockFs.promises.readFile.mockResolvedValue("{ invalid json }");

			const result = await loadPackageDependencies(mockProjectRoot);

			expect(result.size).toBe(0);
		});
	});
});
