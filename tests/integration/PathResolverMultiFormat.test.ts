/**
 * Multi-format Path Resolution Integration Tests
 * Tests PathResolver with TSX, TS, JS, JSX, and Markdown files
 */

import {
	PathResolverInterpreter,
	type PathResolutionResult,
} from "../../src/interpreters/PathResolverInterpreter";
import type { DependencyExtractionResult } from "../../src/extractors/DependencyExtractor";
import type { InterpreterContext } from "../../src/interpreters/IDataInterpreter";
import * as path from "node:path";
import * as fs from "node:fs";
import { jest } from "@jest/globals";

// Mock fs module
jest.mock("node:fs", () => ({
	accessSync: jest.fn(),
	readFileSync: jest.fn(),
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe("PathResolver Multi-Format Integration Tests", () => {
	let interpreter: PathResolverInterpreter;
	const mockProjectRoot = "/Users/test/project";

	beforeEach(() => {
		interpreter = new PathResolverInterpreter();
		mockFs.accessSync.mockReset();
		mockFs.readFileSync.mockReset();
	});

	// Helper function to create context
	const createContext = (
		filePath: string,
		language: string,
	): InterpreterContext => ({
		filePath,
		language,
		metadata: {},
		timestamp: new Date(),
		projectContext: {
			rootPath: mockProjectRoot,
			projectType: "application",
		},
	});

	// Helper function to create dependency data
	const createDependencyData = (
		dependencies: Array<{ source: string }>,
	): DependencyExtractionResult => ({
		dependencies: dependencies.map((dep, index) => ({
			source: dep.source,
			specifiers: [],
			type: "import",
			isTypeOnly: false,
			location: {
				line: index + 1,
				column: 0,
				endLine: index + 1,
				endColumn: dep.source.length + 10,
			},
		})),
		totalCount: dependencies.length,
		importCount: dependencies.length,
		exportCount: 0,
		dynamicImportCount: 0,
		typeOnlyImportCount: 0,
	});

	describe("TypeScript (.ts) files", () => {
		it("should resolve paths in TypeScript files", () => {
			const sourceFile = "/Users/test/project/src/services/UserService.ts";
			const context = createContext(sourceFile, "typescript");

			const dependencies = [
				{ source: "./types/User" },
				{ source: "../utils/api" },
				{ source: "@/components/UserCard" },
				{ source: "axios" },
			];

			// Mock file system
			mockFs.accessSync.mockImplementation((filePath: any) => {
				const validPaths = [
					"/Users/test/project/src/services/types/User.ts",
					"/Users/test/project/src/utils/api.ts",
					"/Users/test/project/src/components/UserCard.ts",
					"/Users/test/project/tsconfig.json",
				];
				if (!validPaths.includes(filePath)) {
					throw new Error("File not found");
				}
			});

			(mockFs.readFileSync as jest.Mock).mockImplementation((filePath: any) => {
				if (filePath === "/Users/test/project/tsconfig.json") {
					return JSON.stringify({
						compilerOptions: {
							paths: {
								"@/*": ["src/*"],
							},
						},
					});
				}
				return "";
			});

			const dependencyData = createDependencyData(dependencies);
			const result = interpreter.interpret(dependencyData, context);

			expect(result.resolvedDependencies).toHaveLength(4);

			// Relative path
			expect(result.resolvedDependencies[0].originalSource).toBe(
				"./types/User",
			);
			expect(result.resolvedDependencies[0].resolutionType).toBe("relative");
			expect(result.resolvedDependencies[0].resolvedPath).toBe(
				"/Users/test/project/src/services/types/User.ts",
			);

			// Parent relative path
			expect(result.resolvedDependencies[1].originalSource).toBe(
				"../utils/api",
			);
			expect(result.resolvedDependencies[1].resolutionType).toBe("relative");
			expect(result.resolvedDependencies[1].resolvedPath).toBe(
				"/Users/test/project/src/utils/api.ts",
			);

			// Alias path
			expect(result.resolvedDependencies[2].originalSource).toBe(
				"@/components/UserCard",
			);
			expect(result.resolvedDependencies[2].resolutionType).toBe("alias");
			expect(result.resolvedDependencies[2].resolvedPath).toBe(
				"/Users/test/project/src/components/UserCard.ts",
			);

			// Node module
			expect(result.resolvedDependencies[3].originalSource).toBe("axios");
			expect(result.resolvedDependencies[3].resolutionType).toBe(
				"node_modules",
			);
		});
	});

	describe("TypeScript React (.tsx) files", () => {
		it("should resolve paths in TSX files", () => {
			const sourceFile = "/Users/test/project/src/components/UserProfile.tsx";
			const context = createContext(sourceFile, "typescript");

			const dependencies = [
				{ source: "./UserCard" },
				{ source: "../hooks/useUser" },
				{ source: "@/types/User" },
				{ source: "react" },
				{ source: "@emotion/styled" },
			];

			// Mock file system
			mockFs.accessSync.mockImplementation((filePath: any) => {
				const validPaths = [
					"/Users/test/project/src/components/UserCard.tsx",
					"/Users/test/project/src/hooks/useUser.ts",
					"/Users/test/project/src/types/User.ts",
					"/Users/test/project/tsconfig.json",
				];
				if (!validPaths.includes(filePath)) {
					throw new Error("File not found");
				}
			});

			(mockFs.readFileSync as jest.Mock).mockImplementation((filePath: any) => {
				if (filePath === "/Users/test/project/tsconfig.json") {
					return JSON.stringify({
						compilerOptions: {
							paths: {
								"@/*": ["src/*"],
							},
						},
					});
				}
				return "";
			});

			const dependencyData = createDependencyData(dependencies);
			const result = interpreter.interpret(dependencyData, context);

			expect(result.resolvedDependencies).toHaveLength(5);

			// TSX component
			expect(result.resolvedDependencies[0].resolvedPath).toBe(
				"/Users/test/project/src/components/UserCard.tsx",
			);
			expect(result.resolvedDependencies[0].extension).toBe(".tsx");

			// Hook file
			expect(result.resolvedDependencies[1].resolvedPath).toBe(
				"/Users/test/project/src/hooks/useUser.ts",
			);
			expect(result.resolvedDependencies[1].extension).toBe(".ts");

			// Type alias
			expect(result.resolvedDependencies[2].resolutionType).toBe("alias");
			expect(result.resolvedDependencies[2].resolvedPath).toBe(
				"/Users/test/project/src/types/User.ts",
			);
		});
	});

	describe("JavaScript (.js) files", () => {
		it("should resolve paths in JavaScript files", () => {
			const sourceFile = "/Users/test/project/src/utils/helpers.js";
			const context = createContext(sourceFile, "javascript");

			const dependencies = [
				{ source: "./validation" },
				{ source: "../config/constants" },
				{ source: "lodash" },
				{ source: "node:fs" },
			];

			// Mock file system
			mockFs.accessSync.mockImplementation((filePath: any) => {
				const validPaths = [
					"/Users/test/project/src/utils/validation.js",
					"/Users/test/project/src/config/constants.js",
				];
				if (!validPaths.includes(filePath)) {
					throw new Error("File not found");
				}
			});

			const dependencyData = createDependencyData(dependencies);
			const result = interpreter.interpret(dependencyData, context);

			expect(result.resolvedDependencies).toHaveLength(4);

			// JavaScript files
			expect(result.resolvedDependencies[0].resolvedPath).toBe(
				"/Users/test/project/src/utils/validation.js",
			);
			expect(result.resolvedDependencies[1].resolvedPath).toBe(
				"/Users/test/project/src/config/constants.js",
			);

			// Node module
			expect(result.resolvedDependencies[2].resolutionType).toBe(
				"node_modules",
			);

			// Built-in module with node: protocol
			expect(result.resolvedDependencies[3].resolutionType).toBe("builtin");
		});
	});

	describe("JavaScript React (.jsx) files", () => {
		it("should resolve paths in JSX files", () => {
			const sourceFile = "/Users/test/project/src/components/App.jsx";
			const context = createContext(sourceFile, "javascript");

			const dependencies = [
				{ source: "./Header" },
				{ source: "./Footer" },
				{ source: "../pages/Home" },
				{ source: "react" },
				{ source: "prop-types" },
			];

			// Mock file system - JSX files exist
			mockFs.accessSync.mockImplementation((filePath: any) => {
				const validPaths = [
					"/Users/test/project/src/components/Header.jsx",
					"/Users/test/project/src/components/Footer.jsx",
					"/Users/test/project/src/pages/Home.jsx",
				];
				if (!validPaths.includes(filePath)) {
					throw new Error("File not found");
				}
			});

			const dependencyData = createDependencyData(dependencies);
			const result = interpreter.interpret(dependencyData, context);

			expect(result.resolvedDependencies).toHaveLength(5);

			// JSX components
			expect(result.resolvedDependencies[0].resolvedPath).toBe(
				"/Users/test/project/src/components/Header.jsx",
			);
			expect(result.resolvedDependencies[0].extension).toBe(".jsx");

			expect(result.resolvedDependencies[1].resolvedPath).toBe(
				"/Users/test/project/src/components/Footer.jsx",
			);
			expect(result.resolvedDependencies[2].resolvedPath).toBe(
				"/Users/test/project/src/pages/Home.jsx",
			);
		});
	});

	describe("Markdown (.md) files", () => {
		it("should handle imports in Markdown files (MDX-style)", () => {
			const sourceFile = "/Users/test/project/docs/api/README.md";
			const context = createContext(sourceFile, "markdown");

			const dependencies = [
				{ source: "./UserAPI.md" },
				{ source: "../examples/user-example.js" },
				{ source: "../../src/types/User.ts" },
			];

			// Mock file system
			mockFs.accessSync.mockImplementation((filePath: any) => {
				const validPaths = [
					"/Users/test/project/docs/api/UserAPI.md",
					"/Users/test/project/docs/examples/user-example.js",
					"/Users/test/project/src/types/User.ts",
				];
				if (!validPaths.includes(filePath)) {
					throw new Error("File not found");
				}
			});

			const dependencyData = createDependencyData(dependencies);
			const result = interpreter.interpret(dependencyData, context);

			expect(result.resolvedDependencies).toHaveLength(3);

			// Markdown file
			expect(result.resolvedDependencies[0].resolvedPath).toBe(
				"/Users/test/project/docs/api/UserAPI.md",
			);
			expect(result.resolvedDependencies[0].extension).toBe(".md");

			// JavaScript example
			expect(result.resolvedDependencies[1].resolvedPath).toBe(
				"/Users/test/project/docs/examples/user-example.js",
			);
			expect(result.resolvedDependencies[1].extension).toBe(".js");

			// TypeScript type
			expect(result.resolvedDependencies[2].resolvedPath).toBe(
				"/Users/test/project/src/types/User.ts",
			);
			expect(result.resolvedDependencies[2].extension).toBe(".ts");
		});
	});

	describe("Mixed file extensions", () => {
		it("should resolve mixed extensions with proper priority", () => {
			const sourceFile = "/Users/test/project/src/index.ts";
			const context = createContext(sourceFile, "typescript");

			const dependencies = [
				{ source: "./components/Button" }, // Could be .tsx or .ts
				{ source: "./utils/helpers" }, // Could be .js or .ts
				{ source: "./styles/main" }, // Could be .css or .scss
			];

			// Mock file system - different extensions available
			mockFs.accessSync.mockImplementation((filePath: any) => {
				const validPaths = [
					"/Users/test/project/src/components/Button.tsx", // TSX wins over TS
					"/Users/test/project/src/utils/helpers.ts", // TS available
					"/Users/test/project/src/styles/main.css", // CSS file
				];
				if (!validPaths.includes(filePath)) {
					throw new Error("File not found");
				}
			});

			const dependencyData = createDependencyData(dependencies);
			const result = interpreter.interpret(dependencyData, context);

			expect(result.resolvedDependencies).toHaveLength(3);

			// Should pick .tsx over .ts
			expect(result.resolvedDependencies[0].resolvedPath).toBe(
				"/Users/test/project/src/components/Button.tsx",
			);
			expect(result.resolvedDependencies[0].extension).toBe(".tsx");

			// Should find .ts
			expect(result.resolvedDependencies[1].resolvedPath).toBe(
				"/Users/test/project/src/utils/helpers.ts",
			);
			expect(result.resolvedDependencies[1].extension).toBe(".ts");

			// Should find .css (not in default extensions but exists)
			expect(result.resolvedDependencies[2].resolvedPath).toBeNull(); // CSS not in default extensions
		});
	});

	describe("Summary statistics for multi-format project", () => {
		it("should generate accurate statistics across different file types", () => {
			const sourceFile = "/Users/test/project/src/App.tsx";
			const context = createContext(sourceFile, "typescript");

			const dependencies = [
				{ source: "./components/Header.tsx" }, // Internal TSX
				{ source: "./utils/api.ts" }, // Internal TS
				{ source: "./styles/main.css" }, // Internal CSS (won't resolve)
				{ source: "../config/env.js" }, // Internal JS
				{ source: "react" }, // External npm
				{ source: "lodash" }, // External npm
				{ source: "fs" }, // Built-in
				{ source: "node:path" }, // Built-in with protocol
			];

			// Mock file system
			mockFs.accessSync.mockImplementation((filePath: any) => {
				const validPaths = [
					"/Users/test/project/src/components/Header.tsx",
					"/Users/test/project/src/utils/api.ts",
					"/Users/test/project/config/env.js",
				];
				if (!validPaths.includes(filePath)) {
					throw new Error("File not found");
				}
			});

			const dependencyData = createDependencyData(dependencies);
			const result = interpreter.interpret(dependencyData, context);

			expect(result.summary.totalDependencies).toBe(8);
			expect(result.summary.resolvedCount).toBe(3); // 3 files found
			expect(result.summary.unresolvedCount).toBe(5); // 5 not resolved (CSS + externals)
			expect(result.summary.externalCount).toBe(4); // 2 npm + 2 built-ins
			expect(result.summary.internalCount).toBe(3); // 3 project files found
			expect(result.summary.relativeCount).toBe(4); // 4 relative imports
		});
	});

	describe("Real-world complex scenario", () => {
		it("should handle a complex project structure with all file types", () => {
			const sourceFile =
				"/Users/test/project/src/features/user/UserDashboard.tsx";
			const context = createContext(sourceFile, "typescript");

			const dependencies = [
				// Component imports
				{ source: "./components/UserCard" },
				{ source: "./components/UserStats" },
				{ source: "../../shared/components/Layout" },

				// Hook and utility imports
				{ source: "../auth/hooks/useAuth" },
				{ source: "../../utils/formatting" },
				{ source: "../../api/userService" },

				// Type imports
				{ source: "../../types/User" },
				{ source: "./types/Dashboard" },

				// Alias imports
				{ source: "@/components/Loading" },
				{ source: "@/hooks/useLocalStorage" },

				// External libraries
				{ source: "react" },
				{ source: "react-router-dom" },
				{ source: "axios" },
				{ source: "@tanstack/react-query" },

				// Node built-ins
				{ source: "crypto" },
				{ source: "node:util" },
			];

			// Mock comprehensive file system
			mockFs.accessSync.mockImplementation((filePath: any) => {
				const validPaths = [
					// Components
					"/Users/test/project/src/features/user/components/UserCard.tsx",
					"/Users/test/project/src/features/user/components/UserStats.tsx",
					"/Users/test/project/src/shared/components/Layout.tsx",

					// Hooks and utilities
					"/Users/test/project/src/features/auth/hooks/useAuth.ts",
					"/Users/test/project/src/utils/formatting.ts",
					"/Users/test/project/src/api/userService.ts",

					// Types
					"/Users/test/project/src/types/User.ts",
					"/Users/test/project/src/features/user/types/Dashboard.ts",

					// Alias resolved
					"/Users/test/project/src/components/Loading.tsx",
					"/Users/test/project/src/hooks/useLocalStorage.ts",

					// Config
					"/Users/test/project/tsconfig.json",
				];
				if (!validPaths.includes(filePath)) {
					throw new Error("File not found");
				}
			});

			// Mock tsconfig with aliases
			(mockFs.readFileSync as jest.Mock).mockImplementation((filePath: any) => {
				if (filePath === "/Users/test/project/tsconfig.json") {
					return JSON.stringify({
						compilerOptions: {
							paths: {
								"@/*": ["src/*"],
								"@components/*": ["src/components/*"],
								"@hooks/*": ["src/hooks/*"],
							},
						},
					});
				}
				return "";
			});

			const dependencyData = createDependencyData(dependencies);
			const result = interpreter.interpret(dependencyData, context);

			expect(result.resolvedDependencies).toHaveLength(16);

			// Check resolution types
			const resolutionTypes = result.resolvedDependencies.reduce(
				(acc, dep) => {
					acc[dep.resolutionType] = (acc[dep.resolutionType] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>,
			);

			expect(resolutionTypes.relative).toBeGreaterThan(0);
			expect(resolutionTypes.alias).toBeGreaterThan(0);
			expect(resolutionTypes.node_modules).toBeGreaterThan(0);
			expect(resolutionTypes.builtin).toBeGreaterThan(0);

			// Check summary
			expect(result.summary.totalDependencies).toBe(16);
			expect(result.summary.internalCount).toBeGreaterThan(0);
			expect(result.summary.externalCount).toBeGreaterThan(0);
			expect(result.summary.aliasCount).toBeGreaterThan(0);

			// Check path mappings loaded
			expect(Object.keys(result.pathMappings)).toEqual([
				"@",
				"@components",
				"@hooks",
			]);
		});
	});
});
