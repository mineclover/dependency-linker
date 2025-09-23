/**
 * PathResolverInterpreter Tests
 */

import { PathResolverInterpreter, type PathResolutionResult, type ResolvedDependency } from "../../../src/interpreters/PathResolverInterpreter";
import type { DependencyExtractionResult } from "../../../src/extractors/DependencyExtractor";
import type { InterpreterContext } from "../../../src/interpreters/IDataInterpreter";
import type { AnalysisResult } from "../../../src/models/AnalysisResult";
import { createAnalysisResult } from "../../../src/models/AnalysisResult";
import * as path from "node:path";
import * as fs from "node:fs";
import { jest } from "@jest/globals";

// Mock fs module
jest.mock("node:fs", () => ({
	promises: {
		access: jest.fn(),
		readFile: jest.fn(),
	},
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe("PathResolverInterpreter", () => {
	let interpreter: PathResolverInterpreter;
	let mockProjectRoot: string;
	let mockSourceFile: string;
	let mockContext: InterpreterContext;

	beforeEach(() => {
		interpreter = new PathResolverInterpreter();
		mockProjectRoot = "/Users/test/project";
		mockSourceFile = "/Users/test/project/src/components/Button.tsx";

		// Mock file system
		mockFs.promises.access.mockReset();
		mockFs.promises.readFile.mockReset();

		mockContext = {
			filePath: mockSourceFile,
			language: "typescript",
			metadata: {},
			timestamp: new Date(),
			projectContext: {
				rootPath: mockProjectRoot,
				projectType: "application"
			}
		};
	});

	describe("Basic path resolution", () => {
		it("should resolve relative paths correctly", async () => {
			const extractedData: DependencyExtractionResult = {
				dependencies: [
					{
						source: "./utils/helpers",
						specifiers: [],
						type: "import",
						isTypeOnly: false,
						location: { line: 1, column: 0, endLine: 1, endColumn: 20 }
					},
					{
						source: "../shared/constants",
						specifiers: [],
						type: "import",
						isTypeOnly: false,
						location: { line: 2, column: 0, endLine: 2, endColumn: 25 }
					}
				],
				totalCount: 2,
				importCount: 2,
				exportCount: 0,
				dynamicImportCount: 0,
				typeOnlyImportCount: 0
			};

			// Mock file existence
			mockFs.promises.access.mockImplementation(async (filePath: any) => {
				const resolvedPaths = [
					"/Users/test/project/src/components/utils/helpers.ts",
					"/Users/test/project/src/shared/constants.ts"
				];
				if (resolvedPaths.includes(filePath as string)) {
					return Promise.resolve();
				}
				throw new Error("File not found");
			});

			const result = await interpreter.interpret(extractedData, mockContext);

			expect(result.resolvedDependencies).toHaveLength(2);
			expect(result.resolvedDependencies[0].originalSource).toBe("./utils/helpers");
			expect(result.resolvedDependencies[0].resolutionType).toBe("relative");
			expect(result.resolvedDependencies[0].resolvedPath).toBe("/Users/test/project/src/components/utils/helpers.ts");
			expect(result.resolvedDependencies[0].exists).toBe(true);

			expect(result.resolvedDependencies[1].originalSource).toBe("../shared/constants");
			expect(result.resolvedDependencies[1].resolutionType).toBe("relative");
			expect(result.resolvedDependencies[1].resolvedPath).toBe("/Users/test/project/src/shared/constants.ts");
		});

		it("should identify Node.js built-in modules", async () => {
			const extractedData: DependencyExtractionResult = {
				dependencies: [
					{
						source: "fs",
						specifiers: [],
						type: "import",
						isTypeOnly: false,
						location: { line: 1, column: 0, endLine: 1, endColumn: 10 }
					},
					{
						source: "node:path",
						specifiers: [],
						type: "import",
						isTypeOnly: false,
						location: { line: 2, column: 0, endLine: 2, endColumn: 15 }
					}
				],
				totalCount: 2,
				importCount: 2,
				exportCount: 0,
				dynamicImportCount: 0,
				typeOnlyImportCount: 0
			};

			const result = await interpreter.interpret(extractedData, mockContext);

			expect(result.resolvedDependencies).toHaveLength(2);
			expect(result.resolvedDependencies[0].resolutionType).toBe("builtin");
			expect(result.resolvedDependencies[1].resolutionType).toBe("builtin");
			expect(result.summary.externalCount).toBe(2);
		});

		it("should identify node_modules dependencies", async () => {
			const extractedData: DependencyExtractionResult = {
				dependencies: [
					{
						source: "react",
						specifiers: [],
						type: "import",
						isTypeOnly: false,
						location: { line: 1, column: 0, endLine: 1, endColumn: 12 }
					},
					{
						source: "@types/node",
						specifiers: [],
						type: "import",
						isTypeOnly: true,
						location: { line: 2, column: 0, endLine: 2, endColumn: 18 }
					}
				],
				totalCount: 2,
				importCount: 2,
				exportCount: 0,
				dynamicImportCount: 0,
				typeOnlyImportCount: 1
			};

			const result = await interpreter.interpret(extractedData, mockContext);

			expect(result.resolvedDependencies).toHaveLength(2);
			expect(result.resolvedDependencies[0].resolutionType).toBe("node_modules");
			expect(result.resolvedDependencies[1].resolutionType).toBe("node_modules");
			expect(result.summary.externalCount).toBe(2);
		});
	});

	describe("Alias resolution", () => {
		it("should resolve TypeScript path aliases", async () => {
			const extractedData: DependencyExtractionResult = {
				dependencies: [
					{
						source: "@/components/Header",
						specifiers: [],
						type: "import",
						isTypeOnly: false,
						location: { line: 1, column: 0, endLine: 1, endColumn: 25 }
					},
					{
						source: "@utils/format",
						specifiers: [],
						type: "import",
						isTypeOnly: false,
						location: { line: 2, column: 0, endLine: 2, endColumn: 20 }
					}
				],
				totalCount: 2,
				importCount: 2,
				exportCount: 0,
				dynamicImportCount: 0,
				typeOnlyImportCount: 0
			};

			// Mock tsconfig.json
			const mockTsconfig = {
				compilerOptions: {
					paths: {
						"@/*": ["src/*"],
						"@utils/*": ["src/utils/*"]
					}
				}
			};

			(mockFs.promises.readFile as jest.Mock).mockImplementation(async (filePath: any) => {
				if (filePath === "/Users/test/project/tsconfig.json") {
					return JSON.stringify(mockTsconfig);
				}
				throw new Error("File not found");
			});

			mockFs.promises.access.mockImplementation(async (filePath: any) => {
				const validPaths = [
					"/Users/test/project/tsconfig.json",
					"/Users/test/project/src/components/Header.tsx",
					"/Users/test/project/src/utils/format.ts"
				];
				if (validPaths.includes(filePath as string)) {
					return Promise.resolve();
				}
				throw new Error("File not found");
			});

			const result = await interpreter.interpret(extractedData, mockContext);

			expect(result.resolvedDependencies).toHaveLength(2);
			expect(result.resolvedDependencies[0].resolutionType).toBe("alias");
			expect(result.resolvedDependencies[0].resolvedPath).toBe("/Users/test/project/src/components/Header.tsx");
			expect(result.resolvedDependencies[1].resolutionType).toBe("alias");
			expect(result.resolvedDependencies[1].resolvedPath).toBe("/Users/test/project/src/utils/format.ts");

			expect(result.pathMappings).toEqual({
				"@": "src",
				"@utils": "src/utils"
			});
		});
	});

	describe("File extension resolution", () => {
		it("should try different extensions when file not found", async () => {
			const extractedData: DependencyExtractionResult = {
				dependencies: [
					{
						source: "./utils/api",
						specifiers: [],
						type: "import",
						isTypeOnly: false,
						location: { line: 1, column: 0, endLine: 1, endColumn: 15 }
					}
				],
				totalCount: 1,
				importCount: 1,
				exportCount: 0,
				dynamicImportCount: 0,
				typeOnlyImportCount: 0
			};

			mockFs.promises.access.mockImplementation(async (filePath: any) => {
				// Only .ts file exists, not the exact path
				if (filePath === "/Users/test/project/src/components/utils/api.ts") {
					return Promise.resolve();
				}
				throw new Error("File not found");
			});

			const result = await interpreter.interpret(extractedData, mockContext);

			expect(result.resolvedDependencies).toHaveLength(1);
			expect(result.resolvedDependencies[0].resolvedPath).toBe("/Users/test/project/src/components/utils/api.ts");
			expect(result.resolvedDependencies[0].extension).toBe(".ts");
			expect(result.resolvedDependencies[0].exists).toBe(true);
		});

		it("should resolve index files", async () => {
			const extractedData: DependencyExtractionResult = {
				dependencies: [
					{
						source: "./utils",
						specifiers: [],
						type: "import",
						isTypeOnly: false,
						location: { line: 1, column: 0, endLine: 1, endColumn: 12 }
					}
				],
				totalCount: 1,
				importCount: 1,
				exportCount: 0,
				dynamicImportCount: 0,
				typeOnlyImportCount: 0
			};

			mockFs.promises.access.mockImplementation(async (filePath: any) => {
				// Only index.ts exists in the utils directory
				if (filePath === "/Users/test/project/src/components/utils/index.ts") {
					return Promise.resolve();
				}
				throw new Error("File not found");
			});

			const result = await interpreter.interpret(extractedData, mockContext);

			expect(result.resolvedDependencies).toHaveLength(1);
			expect(result.resolvedDependencies[0].resolvedPath).toBe("/Users/test/project/src/components/utils/index.ts");
			expect(result.resolvedDependencies[0].exists).toBe(true);
		});
	});

	describe("Summary generation", () => {
		it("should generate accurate summary statistics", async () => {
			const extractedData: DependencyExtractionResult = {
				dependencies: [
					{
						source: "./relative",
						specifiers: [],
						type: "import",
						isTypeOnly: false,
						location: { line: 1, column: 0, endLine: 1, endColumn: 15 }
					},
					{
						source: "react",
						specifiers: [],
						type: "import",
						isTypeOnly: false,
						location: { line: 2, column: 0, endLine: 2, endColumn: 12 }
					},
					{
						source: "fs",
						specifiers: [],
						type: "import",
						isTypeOnly: false,
						location: { line: 3, column: 0, endLine: 3, endColumn: 10 }
					},
					{
						source: "./nonexistent",
						specifiers: [],
						type: "import",
						isTypeOnly: false,
						location: { line: 4, column: 0, endLine: 4, endColumn: 18 }
					}
				],
				totalCount: 4,
				importCount: 4,
				exportCount: 0,
				dynamicImportCount: 0,
				typeOnlyImportCount: 0
			};

			mockFs.promises.access.mockImplementation(async (filePath: any) => {
				// Only the relative file exists
				if (filePath === "/Users/test/project/src/components/relative.ts") {
					return Promise.resolve();
				}
				throw new Error("File not found");
			});

			const result = await interpreter.interpret(extractedData, mockContext);

			expect(result.summary.totalDependencies).toBe(4);
			expect(result.summary.resolvedCount).toBe(1); // Only ./relative resolves
			expect(result.summary.unresolvedCount).toBe(3); // Others don't resolve to files
			expect(result.summary.externalCount).toBe(2); // react and fs
			expect(result.summary.relativeCount).toBe(2); // ./relative and ./nonexistent
		});
	});

	describe("Error handling", () => {
		it("should handle malformed tsconfig.json gracefully", async () => {
			const extractedData: DependencyExtractionResult = {
				dependencies: [
					{
						source: "@/test",
						specifiers: [],
						type: "import",
						isTypeOnly: false,
						location: { line: 1, column: 0, endLine: 1, endColumn: 10 }
					}
				],
				totalCount: 1,
				importCount: 1,
				exportCount: 0,
				dynamicImportCount: 0,
				typeOnlyImportCount: 0
			};

			(mockFs.promises.readFile as jest.Mock).mockImplementation(async (filePath: any) => {
				if (filePath === "/Users/test/project/tsconfig.json") {
					return "{ invalid json }";
				}
				throw new Error("File not found");
			});

			mockFs.promises.access.mockImplementation(async () => {
				return Promise.resolve();
			});

			const result = await interpreter.interpret(extractedData, mockContext);

			expect(result.resolvedDependencies).toHaveLength(1);
			expect(result.pathMappings).toEqual({}); // Should be empty due to parse error
		});

		it("should handle file system errors gracefully", async () => {
			const extractedData: DependencyExtractionResult = {
				dependencies: [
					{
						source: "./problematic",
						specifiers: [],
						type: "import",
						isTypeOnly: false,
						location: { line: 1, column: 0, endLine: 1, endColumn: 15 }
					}
				],
				totalCount: 1,
				importCount: 1,
				exportCount: 0,
				dynamicImportCount: 0,
				typeOnlyImportCount: 0
			};

			mockFs.promises.access.mockRejectedValue(new Error("Permission denied"));

			const result = await interpreter.interpret(extractedData, mockContext);

			expect(result.resolvedDependencies).toHaveLength(1);
			expect(result.resolvedDependencies[0].exists).toBe(false);
			expect(result.resolvedDependencies[0].resolvedPath).toBeTruthy(); // Should still try to resolve path
		});
	});

	describe("Configuration", () => {
		it("should respect custom extensions configuration", async () => {
			// Mock context with custom configuration
			mockContext.options = {
				interpreterOptions: {
					"path-resolver": {
						extensions: [".vue", ".js"]
					}
				}
			};

			const extractedData: DependencyExtractionResult = {
				dependencies: [
					{
						source: "./component",
						specifiers: [],
						type: "import",
						isTypeOnly: false,
						location: { line: 1, column: 0, endLine: 1, endColumn: 15 }
					}
				],
				totalCount: 1,
				importCount: 1,
				exportCount: 0,
				dynamicImportCount: 0,
				typeOnlyImportCount: 0
			};

			mockFs.promises.access.mockImplementation(async (filePath: any) => {
				if (filePath === "/Users/test/project/src/components/component.vue") {
					return Promise.resolve();
				}
				throw new Error("File not found");
			});

			const result = await interpreter.interpret(extractedData, mockContext);

			expect(result.resolvedDependencies[0].resolvedPath).toBe("/Users/test/project/src/components/component.vue");
			expect(result.resolvedDependencies[0].extension).toBe(".vue");
		});

		it("should respect resolveNodeModules configuration", async () => {
			mockContext.options = {
				interpreterOptions: {
					"path-resolver": {
						resolveNodeModules: false
					}
				}
			};

			const extractedData: DependencyExtractionResult = {
				dependencies: [
					{
						source: "react",
						specifiers: [],
						type: "import",
						isTypeOnly: false,
						location: { line: 1, column: 0, endLine: 1, endColumn: 12 }
					}
				],
				totalCount: 1,
				importCount: 1,
				exportCount: 0,
				dynamicImportCount: 0,
				typeOnlyImportCount: 0
			};

			const result = await interpreter.interpret(extractedData, mockContext);

			expect(result.resolvedDependencies[0].resolutionType).toBe("node_modules");
			expect(result.resolvedDependencies[0].resolvedPath).toBeNull(); // Should not resolve when disabled
		});
	});
});