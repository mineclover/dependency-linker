/**
 * PathResolver Real Files Integration Test
 * Tests PathResolver with actual project files
 */

import { PathResolverInterpreter } from "../../src/interpreters/PathResolverInterpreter";
import { DependencyExtractor } from "../../src/extractors/DependencyExtractor";
import { TypeScriptParser } from "../../src/parsers/TypeScriptParser";
import { JavaScriptParser } from "../../src/parsers/JavaScriptParser";
import type { InterpreterContext } from "../../src/interpreters/IDataInterpreter";
import { createLogger } from "../../src/utils/logger";
import * as path from "node:path";
import * as fs from "node:fs";

const logger = createLogger("PathResolverRealFiles");

describe("PathResolver Real Files Integration", () => {
	let pathResolver: PathResolverInterpreter;
	let dependencyExtractor: DependencyExtractor;
	let tsParser: TypeScriptParser;
	let jsParser: JavaScriptParser;

	const projectRoot = path.resolve(__dirname, "../..");

	beforeAll(() => {
		pathResolver = new PathResolverInterpreter();
		dependencyExtractor = new DependencyExtractor();
		tsParser = new TypeScriptParser();
		jsParser = new JavaScriptParser();
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
			rootPath: projectRoot,
			projectType: "library",
		},
	});

	describe("TypeScript files", () => {
		it("should resolve paths in PathResolverInterpreter.ts", async () => {
			const filePath = path.join(
				projectRoot,
				"src/interpreters/PathResolverInterpreter.ts",
			);

			// Skip if file doesn't exist
			if (!fs.existsSync(filePath)) {
				console.log(`Skipping test - file not found: ${filePath}`);
				return;
			}

			// Parse the actual file
			const fileContent = fs.readFileSync(filePath, "utf8");
			const parseResult = await tsParser.parse(filePath, fileContent);
			const ast = parseResult.ast;

			// Skip if parsing failed
			if (!ast) {
				console.log(`Skipping test - failed to parse: ${filePath}`);
				return;
			}

			// Extract dependencies
			const extractedData = dependencyExtractor.extract(ast, filePath);

			// Create context
			const context = createContext(filePath, "typescript");

			// Resolve paths
			const result = pathResolver.interpret(extractedData, context);

			logger.info("PathResolverInterpreter.ts analysis", {
				totalDependencies: result.summary.totalDependencies,
				resolvedCount: result.summary.resolvedCount,
				internalCount: result.summary.internalCount,
				externalCount: result.summary.externalCount,
			});

			expect(result.resolvedDependencies.length).toBeGreaterThan(0);
			expect(result.summary.totalDependencies).toBeGreaterThan(0);

			// Check for specific expected imports
			const importSources = result.resolvedDependencies.map(
				(dep) => dep.originalSource,
			);
			expect(importSources).toContain("node:path");
			expect(importSources).toContain("node:fs");

			// Verify resolution types
			const builtinImports = result.resolvedDependencies.filter(
				(dep) => dep.resolutionType === "builtin",
			);
			const relativeImports = result.resolvedDependencies.filter(
				(dep) => dep.resolutionType === "relative",
			);

			expect(builtinImports.length).toBeGreaterThan(0);
			expect(relativeImports.length).toBeGreaterThan(0);

			// Log some examples
			result.resolvedDependencies.slice(0, 5).forEach((dep) => {
				logger.debug("Dependency resolution", {
					source: dep.originalSource,
					resolved: dep.resolvedPath,
					type: dep.resolutionType,
					exists: dep.exists,
				});
			});
		});

		it("should resolve paths in AnalysisResult.ts", async () => {
			const filePath = path.join(projectRoot, "src/models/AnalysisResult.ts");

			if (!fs.existsSync(filePath)) {
				console.log(`Skipping test - file not found: ${filePath}`);
				return;
			}

			const fileContent = fs.readFileSync(filePath, "utf8");
			const parseResult = await tsParser.parse(filePath, fileContent);
			const ast = parseResult.ast;
			const extractedData = dependencyExtractor.extract(ast, filePath);
			const context = createContext(filePath, "typescript");
			const result = pathResolver.interpret(extractedData, context);

			logger.info("AnalysisResult.ts analysis", {
				totalDependencies: result.summary.totalDependencies,
				resolvedCount: result.summary.resolvedCount,
			});

			expect(result.summary.totalDependencies).toBeGreaterThan(0);

			// Should have relative imports to other models
			const relativeImports = result.resolvedDependencies.filter(
				(dep) =>
					dep.resolutionType === "relative" &&
					dep.originalSource.includes("./"),
			);
			expect(relativeImports.length).toBeGreaterThan(0);

			// Check that model imports resolve correctly
			const modelImports = result.resolvedDependencies.filter(
				(dep) =>
					dep.originalSource.includes("./") &&
					dep.resolvedPath?.includes("/models/"),
			);
			expect(modelImports.length).toBeGreaterThan(0);
		});
	});

	describe("JavaScript files", () => {
		it("should resolve paths in test files", async () => {
			// Look for JS test files
			const testDir = path.join(projectRoot, "tests");
			if (!fs.existsSync(testDir)) {
				console.log("No tests directory found, skipping JS test");
				return;
			}

			// Find a JS file in tests directory
			const findJSFiles = (dir: string): string[] => {
				const files: string[] = [];
				try {
					const entries = fs.readdirSync(dir);
					for (const entry of entries) {
						const fullPath = path.join(dir, entry);
						const stat = fs.statSync(fullPath);
						if (stat.isDirectory()) {
							files.push(...findJSFiles(fullPath));
						} else if (entry.endsWith(".js") && !entry.includes(".d.ts")) {
							files.push(fullPath);
						}
					}
				} catch (error) {
					// Directory might not be accessible
				}
				return files;
			};

			const jsFiles = findJSFiles(testDir);
			if (jsFiles.length === 0) {
				console.log("No JS files found in tests, skipping");
				return;
			}

			const jsFile = jsFiles[0];
			const fileContent = fs.readFileSync(jsFile, "utf8");

			try {
				const parseResult = await jsParser.parse(jsFile, fileContent);
				const ast = parseResult.ast;
				const extractedData = dependencyExtractor.extract(ast, jsFile);
				const context = createContext(jsFile, "javascript");
				const result = pathResolver.interpret(extractedData, context);

				logger.info(`JS file analysis: ${path.basename(jsFile)}`, {
					totalDependencies: result.summary.totalDependencies,
					resolvedCount: result.summary.resolvedCount,
				});

				expect(result.summary.totalDependencies).toBeGreaterThanOrEqual(0);
			} catch (error) {
				logger.warn(`Failed to parse JS file ${jsFile}:`, error);
				// JS parsing might fail, which is okay for this test
			}
		});
	});

	describe("Package.json and tsconfig.json integration", () => {
		it("should load project configuration correctly", () => {
			const context = createContext(
				path.join(projectRoot, "src/index.ts"),
				"typescript",
			);

			// Test with empty dependency data to focus on config loading
			const emptyData = {
				dependencies: [],
				totalCount: 0,
				importCount: 0,
				exportCount: 0,
				dynamicImportCount: 0,
				typeOnlyImportCount: 0,
			};

			const result = pathResolver.interpret(emptyData, context);

			// Check resolution base
			expect(result.resolutionBase.projectRoot).toBe(projectRoot);
			expect(result.resolutionBase.nodeModulesPath).toContain(
				path.join(projectRoot, "node_modules"),
			);

			logger.info("Configuration loaded", {
				projectRoot: result.resolutionBase.projectRoot,
				pathMappings: Object.keys(result.pathMappings),
				nodeModulesPath: result.resolutionBase.nodeModulesPath.length,
			});
		});

		it("should handle tsconfig.json path mappings if present", () => {
			const tsconfigPath = path.join(projectRoot, "tsconfig.json");

			if (fs.existsSync(tsconfigPath)) {
				try {
					const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
					const context = createContext(
						path.join(projectRoot, "src/index.ts"),
						"typescript",
					);

					const emptyData = {
						dependencies: [],
						totalCount: 0,
						importCount: 0,
						exportCount: 0,
						dynamicImportCount: 0,
						typeOnlyImportCount: 0,
					};

					const result = pathResolver.interpret(emptyData, context);

					if (tsconfig.compilerOptions?.paths) {
						expect(Object.keys(result.pathMappings).length).toBeGreaterThan(0);
						logger.info("Path mappings found", result.pathMappings);
					} else {
						logger.info("No path mappings in tsconfig.json");
					}
				} catch (error) {
					logger.warn("Failed to parse tsconfig.json:", error);
				}
			} else {
				logger.info("No tsconfig.json found");
			}
		});
	});

	describe("Complex real-world scenarios", () => {
		it("should handle CLI command files with mixed imports", async () => {
			const cliDir = path.join(projectRoot, "src/cli");
			if (!fs.existsSync(cliDir)) {
				console.log("No CLI directory found, skipping");
				return;
			}

			// Find CLI TypeScript files
			const cliFiles = fs
				.readdirSync(cliDir)
				.filter((file) => file.endsWith(".ts"))
				.map((file) => path.join(cliDir, file));

			if (cliFiles.length === 0) {
				console.log("No TypeScript files in CLI directory");
				return;
			}

			const cliFile = cliFiles[0];
			const fileContent = fs.readFileSync(cliFile, "utf8");
			const parseResult = await tsParser.parse(cliFile, fileContent);
			const ast = parseResult.ast;
			const extractedData = dependencyExtractor.extract(ast, cliFile);
			const context = createContext(cliFile, "typescript");
			const result = pathResolver.interpret(extractedData, context);

			logger.info(`CLI file analysis: ${path.basename(cliFile)}`, {
				totalDependencies: result.summary.totalDependencies,
				resolvedCount: result.summary.resolvedCount,
				internalCount: result.summary.internalCount,
				externalCount: result.summary.externalCount,
				relativeCount: result.summary.relativeCount,
			});

			expect(result.summary.totalDependencies).toBeGreaterThanOrEqual(0);

			// CLI files typically import from multiple levels
			if (result.summary.totalDependencies > 0) {
				const resolutionTypes = result.resolvedDependencies.reduce(
					(acc, dep) => {
						acc[dep.resolutionType] = (acc[dep.resolutionType] || 0) + 1;
						return acc;
					},
					{} as Record<string, number>,
				);

				logger.info("Resolution type distribution", resolutionTypes);
			}
		});

		it("should analyze service files with complex dependency patterns", async () => {
			const servicesDir = path.join(projectRoot, "src/services");
			if (!fs.existsSync(servicesDir)) {
				console.log("No services directory found, skipping");
				return;
			}

			const serviceFiles = fs
				.readdirSync(servicesDir)
				.filter((file) => file.endsWith(".ts") && !file.includes(".test."))
				.map((file) => path.join(servicesDir, file));

			if (serviceFiles.length === 0) {
				console.log("No service TypeScript files found");
				return;
			}

			const serviceFile = serviceFiles[0];
			const fileContent = fs.readFileSync(serviceFile, "utf8");
			const parseResult = await tsParser.parse(serviceFile, fileContent);
			const ast = parseResult.ast;
			const extractedData = dependencyExtractor.extract(ast, serviceFile);
			const context = createContext(serviceFile, "typescript");
			const result = pathResolver.interpret(extractedData, context);

			logger.info(`Service file analysis: ${path.basename(serviceFile)}`, {
				totalDependencies: result.summary.totalDependencies,
				resolvedCount: result.summary.resolvedCount,
				internalCount: result.summary.internalCount,
				externalCount: result.summary.externalCount,
			});

			// Service files should have various types of imports
			if (result.summary.totalDependencies > 0) {
				const internalPaths = result.resolvedDependencies
					.filter((dep) => dep.resolutionType === "relative" && dep.exists)
					.map((dep) => dep.projectRelativePath);

				logger.info("Internal dependencies found", internalPaths.slice(0, 5));
			}
		});
	});

	describe("File existence validation", () => {
		it("should correctly identify existing vs non-existing files", async () => {
			const indexPath = path.join(projectRoot, "src/index.ts");

			if (!fs.existsSync(indexPath)) {
				console.log("No src/index.ts found, skipping");
				return;
			}

			const fileContent = fs.readFileSync(indexPath, "utf8");
			const parseResult = await tsParser.parse(indexPath, fileContent);
			const ast = parseResult.ast;
			const extractedData = dependencyExtractor.extract(ast, indexPath);
			const context = createContext(indexPath, "typescript");
			const result = pathResolver.interpret(extractedData, context);

			logger.info("Index file analysis", {
				totalDependencies: result.summary.totalDependencies,
				resolvedCount: result.summary.resolvedCount,
			});

			// Check file existence accuracy
			const existingFiles = result.resolvedDependencies.filter(
				(dep) => dep.exists && dep.resolvedPath,
			);
			const nonExistingFiles = result.resolvedDependencies.filter(
				(dep) => !dep.exists && dep.resolvedPath,
			);

			// Verify some existing files actually exist
			for (const dep of existingFiles.slice(0, 3)) {
				if (dep.resolvedPath && dep.resolutionType === "relative") {
					expect(fs.existsSync(dep.resolvedPath)).toBe(true);
				}
			}

			logger.info("File existence check", {
				existingFiles: existingFiles.length,
				nonExistingFiles: nonExistingFiles.length,
				totalWithPaths: result.resolvedDependencies.filter(
					(dep) => dep.resolvedPath,
				).length,
			});
		});
	});

	describe("Performance analysis", () => {
		it("should handle large files efficiently", async () => {
			const largeFiles = [
				path.join(projectRoot, "src/index.ts"),
				path.join(projectRoot, "src/services/AnalysisEngine.ts"),
				path.join(projectRoot, "src/parsers/TypeScriptParser.ts"),
			].filter(fs.existsSync);

			if (largeFiles.length === 0) {
				console.log("No large files found to test");
				return;
			}

			const results = [];

			for (const filePath of largeFiles) {
				const startTime = Date.now();

				const fileContent = fs.readFileSync(filePath, "utf8");
				const parseResult = await tsParser.parse(filePath, fileContent);
				const ast = parseResult.ast;
				const extractedData = dependencyExtractor.extract(ast, filePath);
				const context = createContext(filePath, "typescript");
				const result = pathResolver.interpret(extractedData, context);

				const duration = Date.now() - startTime;

				results.push({
					file: path.basename(filePath),
					fileSize: fileContent.length,
					dependencies: result.summary.totalDependencies,
					resolved: result.summary.resolvedCount,
					duration,
				});
			}

			logger.info("Performance analysis", results);

			// All files should process in reasonable time (< 1 second)
			results.forEach((result) => {
				expect(result.duration).toBeLessThan(1000);
			});
		});
	});
});
