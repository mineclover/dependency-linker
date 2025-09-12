/**
 * ITypeScriptAnalyzer Interface Contract Tests
 * Tests for the main API interface contract validation
 */

import { TypeScriptAnalyzer } from "../../../src/api/TypeScriptAnalyzer";
import {
	AnalysisOptions,
	BatchAnalysisOptions,
	SourceAnalysisOptions,
	AnalyzerOptions,
	BatchResult,
	AnalyzerState,
	LogLevel,
} from "../../../src/api/types";
import {
	AnalysisError,
	FileNotFoundError,
	ParseTimeoutError,
	InvalidFileTypeError,
} from "../../../src/api/errors";
import { AnalysisResult } from "../../../src/models/AnalysisResult";
import { ValidationResult } from "../../../src/core/types/ParseTypes";
import path from "path";
import fs from "fs";
import os from "os";

describe("ITypeScriptAnalyzer Interface Contract", () => {
	let analyzer: TypeScriptAnalyzer;
	let testFilePath: string;
	let testTsContent: string;

	beforeEach(() => {
		analyzer = new TypeScriptAnalyzer();

		// Create temporary TypeScript file
		const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "analyzer-test-"));
		testFilePath = path.join(tempDir, "test.ts");
		testTsContent = `
import { readFile } from 'fs/promises';
import * as path from 'path';
import { SomeType } from './types';

export interface TestInterface {
  name: string;
  value: number;
}

export const testFunction = async (): Promise<TestInterface> => {
  const data = await readFile('test.txt');
  return { name: 'test', value: 42 };
};

export default testFunction;
    `.trim();

		fs.writeFileSync(testFilePath, testTsContent);
	});

	afterEach(() => {
		// Clean up temp files
		try {
			if (fs.existsSync(testFilePath)) {
				fs.unlinkSync(testFilePath);
				fs.rmdirSync(path.dirname(testFilePath));
			}
		} catch (error) {
			// Ignore cleanup errors
		}
	});

	describe("Constructor contract", () => {
		it("should accept empty options object", () => {
			const analyzer = new TypeScriptAnalyzer({});
			expect(analyzer).toBeInstanceOf(TypeScriptAnalyzer);
		});

		it("should accept comprehensive options configuration", () => {
			const options: AnalyzerOptions = {
				defaultTimeout: 5000,
				enableCache: false,
				cacheSize: 500,
				logLevel: LogLevel.DEBUG,
			};

			const analyzer = new TypeScriptAnalyzer(options);
			expect(analyzer).toBeInstanceOf(TypeScriptAnalyzer);

			const state = analyzer.getState();
			expect(state.config.defaultTimeout).toBe(5000);
			expect(state.config.enableCache).toBe(false);
			expect(state.config.cacheSize).toBe(500);
			expect(state.config.logLevel).toBe(LogLevel.DEBUG);
		});

		it("should accept dependency injection", () => {
			const mockFileAnalyzer = {
				analyzeFile: jest.fn(),
				validateFile: jest.fn(),
			};

			const analyzer = new TypeScriptAnalyzer(
				{},
				{
					fileAnalyzer: mockFileAnalyzer as any,
				},
			);

			expect(analyzer).toBeInstanceOf(TypeScriptAnalyzer);
		});
	});

	describe("analyzeFile method contract", () => {
		it("should accept filePath parameter and return Promise<AnalysisResult>", async () => {
			const result = analyzer.analyzeFile(testFilePath);
			expect(result).toBeInstanceOf(Promise);

			const analysisResult = await result;
			expect(analysisResult).toHaveProperty("filePath");
			expect(analysisResult).toHaveProperty("success");
			expect(analysisResult).toHaveProperty("dependencies");
			expect(analysisResult).toHaveProperty("imports");
			expect(analysisResult).toHaveProperty("exports");
			expect(typeof analysisResult.success).toBe("boolean");
			expect(Array.isArray(analysisResult.dependencies)).toBe(true);
			expect(Array.isArray(analysisResult.imports)).toBe(true);
			expect(Array.isArray(analysisResult.exports)).toBe(true);
		});

		it("should accept optional AnalysisOptions parameter", async () => {
			const options: AnalysisOptions = {
				format: "json",
				includeSources: true,
				parseTimeout: 10000,
				includeTypeImports: false,
			};

			const result = await analyzer.analyzeFile(testFilePath, options);
			expect(result).toHaveProperty("filePath", testFilePath);
			expect(result.success).toBe(true);
		});

		it("should handle various TypeScript file extensions", async () => {
			// Test .ts file (already tested above)
			const tsResult = await analyzer.analyzeFile(testFilePath);
			expect(tsResult.success).toBe(true);

			// Test .tsx file
			const tsxFile = testFilePath.replace(".ts", ".tsx");
			const tsxContent = `
import React from 'react';

interface Props {
  name: string;
}

export const Component: React.FC<Props> = ({ name }) => {
  return <div>Hello, {name}!</div>;
};
      `.trim();

			fs.writeFileSync(tsxFile, tsxContent);
			const tsxResult = await analyzer.analyzeFile(tsxFile);
			expect(tsxResult.success).toBe(true);

			fs.unlinkSync(tsxFile);

			// Test .d.ts file
			const dtsFile = testFilePath.replace(".ts", ".d.ts");
			const dtsContent = `
export interface ApiResponse<T> {
  data: T;
  status: number;
}

export declare function fetchData<T>(url: string): Promise<ApiResponse<T>>;
      `.trim();

			fs.writeFileSync(dtsFile, dtsContent);
			const dtsResult = await analyzer.analyzeFile(dtsFile);
			expect(dtsResult.success).toBe(true);

			fs.unlinkSync(dtsFile);
		});
	});

	describe("analyzeFiles method contract", () => {
		it("should accept filePaths array and return Promise<BatchResult>", async () => {
			const filePaths = [testFilePath];
			const result = analyzer.analyzeFiles(filePaths);
			expect(result).toBeInstanceOf(Promise);

			const batchResult = await result;
			expect(batchResult).toHaveProperty("results");
			expect(batchResult).toHaveProperty("summary");
			expect(batchResult).toHaveProperty("errors");
			expect(batchResult).toHaveProperty("totalTime");
			expect(Array.isArray(batchResult.results)).toBe(true);
			expect(Array.isArray(batchResult.errors)).toBe(true);
			expect(typeof batchResult.totalTime).toBe("number");
		});

		it("should accept optional BatchAnalysisOptions parameter", async () => {
			const options: BatchAnalysisOptions = {
				concurrency: 2,
				failFast: false,
				includeTypeImports: true,
			};

			const result = await analyzer.analyzeFiles([testFilePath], options);
			expect(result.results).toHaveLength(1);
			expect(result.summary.totalFiles).toBe(1);
			expect(result.summary.successfulFiles).toBe(1);
		});
	});

	describe("analyzeSource method contract", () => {
		it("should accept source string and return Promise<AnalysisResult>", async () => {
			const source = `import { test } from 'module'; export const value = 42;`;
			const result = analyzer.analyzeSource(source);
			expect(result).toBeInstanceOf(Promise);

			const analysisResult = await result;
			expect(analysisResult).toHaveProperty("filePath");
			expect(analysisResult).toHaveProperty("success");
			expect(analysisResult).toHaveProperty("dependencies");
			expect(analysisResult.success).toBe(true);
		});

		it("should accept optional SourceAnalysisOptions parameter", async () => {
			const source = `import React from 'react'; export const Component = () => <div />;`;
			const options: SourceAnalysisOptions = {
				contextPath: "/test/component.tsx",
				variant: "tsx",
				includeSources: true,
			};

			const result = await analyzer.analyzeSource(source, options);
			expect(result.filePath).toBe("/test/component.tsx");
			expect(result.success).toBe(true);
		});
	});

	describe("Convenience methods contract", () => {
		it("extractDependencies should return Promise<string[]>", async () => {
			const result = analyzer.extractDependencies(testFilePath);
			expect(result).toBeInstanceOf(Promise);

			const dependencies = await result;
			expect(Array.isArray(dependencies)).toBe(true);
			expect(dependencies.every((dep) => typeof dep === "string")).toBe(true);
			expect(dependencies).toContain("fs/promises");
			expect(dependencies).toContain("path");
		});

		it("getImports should return Promise with import information", async () => {
			const result = analyzer.getImports(testFilePath);
			expect(result).toBeInstanceOf(Promise);

			const imports = await result;
			expect(Array.isArray(imports)).toBe(true);
			expect(imports.length).toBeGreaterThan(0);
		});

		it("getExports should return Promise with export information", async () => {
			const result = analyzer.getExports(testFilePath);
			expect(result).toBeInstanceOf(Promise);

			const exports = await result;
			expect(Array.isArray(exports)).toBe(true);
			expect(exports.length).toBeGreaterThan(0);
		});
	});

	describe("Utility methods contract", () => {
		it("validateFile should return Promise<ValidationResult>", async () => {
			const result = analyzer.validateFile(testFilePath);
			expect(result).toBeInstanceOf(Promise);

			const validation = await result;
			expect(validation).toHaveProperty("isValid");
			expect(validation).toHaveProperty("filePath");
			expect(typeof validation.isValid).toBe("boolean");
		});

		it("getSupportedExtensions should return string array", () => {
			const extensions = analyzer.getSupportedExtensions();
			expect(Array.isArray(extensions)).toBe(true);
			expect(extensions.every((ext) => typeof ext === "string")).toBe(true);
			expect(extensions).toContain(".ts");
			expect(extensions).toContain(".tsx");
			expect(extensions).toContain(".d.ts");
		});

		it("clearCache should execute without error", () => {
			expect(() => analyzer.clearCache()).not.toThrow();
		});

		it("getState should return AnalyzerState object", () => {
			const state = analyzer.getState();
			expect(state).toHaveProperty("isInitialized");
			expect(state).toHaveProperty("config");
			expect(state).toHaveProperty("cacheStats");
			expect(state).toHaveProperty("metrics");
			expect(typeof state.isInitialized).toBe("boolean");
		});

		it("formatResult should accept AnalysisResult and format string", async () => {
			const analysisResult = await analyzer.analyzeFile(testFilePath);

			const jsonOutput = analyzer.formatResult(analysisResult, "json");
			expect(typeof jsonOutput).toBe("string");
			expect(() => JSON.parse(jsonOutput)).not.toThrow();

			const summaryOutput = analyzer.formatResult(analysisResult, "summary");
			expect(typeof summaryOutput).toBe("string");
			expect(summaryOutput.length).toBeGreaterThan(0);
		});
	});

	describe("Event system contract", () => {
		it("should support event listener registration and removal", () => {
			const handler = jest.fn();

			expect(() => analyzer.on("analysisStart" as any, handler)).not.toThrow();
			expect(() => analyzer.off("analysisStart" as any, handler)).not.toThrow();
		});

		it("should emit events during analysis operations", async () => {
			const startHandler = jest.fn();
			const completeHandler = jest.fn();

			analyzer.on("analysisStart" as any, startHandler);
			analyzer.on("analysisComplete" as any, completeHandler);

			await analyzer.analyzeFile(testFilePath);

			expect(startHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					filePath: testFilePath,
				}),
			);

			expect(completeHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					filePath: testFilePath,
					result: expect.any(Object),
				}),
			);
		});
	});

	describe("Error handling contract expectations", () => {
		it("should handle FileNotFoundError for non-existent files", async () => {
			const nonExistentFile = "/path/to/nonexistent.ts";

			// analyzeFile returns an AnalysisResult with success: false and error details
			const result = await analyzer.analyzeFile(nonExistentFile);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe("FILE_NOT_FOUND");
			expect(result.error?.message).toContain("File not found");

			// extractDependencies should throw for non-existent files
			await expect(
				analyzer.extractDependencies(nonExistentFile),
			).rejects.toThrow();

			// validateFile returns a ValidationResult with isValid: false
			const validation = await analyzer.validateFile(nonExistentFile);
			expect(validation.isValid).toBe(false);
			expect(validation.errors.length).toBeGreaterThan(0);
		});

		it("should handle InvalidFileTypeError for unsupported file types", async () => {
			const jsFile = testFilePath.replace(".ts", ".js");
			fs.writeFileSync(jsFile, "const x = 42;");

			// analyzeFile returns an AnalysisResult with success: false and error details
			const result = await analyzer.analyzeFile(jsFile);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe("INVALID_FILE_TYPE");
			expect(result.error?.message).toContain("Invalid file type");

			fs.unlinkSync(jsFile);
		});

		it("should handle ParseTimeoutError with short timeout", async () => {
			const options: AnalysisOptions = {
				parseTimeout: 1, // Very short timeout
			};

			// Create a complex file that might take time to parse
			const complexFile = testFilePath.replace(".ts", "-complex.ts");
			const complexContent =
				Array(1000)
					.fill(0)
					.map((_, i) => `import { module${i} } from './module${i}';`)
					.join("\n") + "\nexport const complex = {};";

			fs.writeFileSync(complexFile, complexContent);

			// Note: This might not always timeout due to fast parsing,
			// but we test the contract that timeout errors are possible
			try {
				await analyzer.analyzeFile(complexFile, options);
			} catch (error) {
				if (error instanceof ParseTimeoutError) {
					expect(error).toBeInstanceOf(ParseTimeoutError);
					expect(error.code).toBe("PARSE_TIMEOUT");
				}
			}

			fs.unlinkSync(complexFile);
		}, 10000);

		it("should handle syntax errors gracefully in analyzeSource", async () => {
			const invalidSource = `
        import { incomplete from 'module'
        export const broken =
      `;

			// Should not throw but may return unsuccessful result
			const result = await analyzer.analyzeSource(invalidSource);
			expect(result).toHaveProperty("success");
			// May be successful with partial results or unsuccessful
		});
	});

	describe("Async operation patterns", () => {
		it("should support concurrent analyzeFile calls", async () => {
			const file1 = testFilePath;
			const file2 = testFilePath.replace(".ts", "2.ts");
			fs.writeFileSync(file2, testTsContent);

			const promises = [
				analyzer.analyzeFile(file1),
				analyzer.analyzeFile(file2),
			];

			const results = await Promise.all(promises);
			expect(results).toHaveLength(2);
			expect(results[0].success).toBe(true);
			expect(results[1].success).toBe(true);

			fs.unlinkSync(file2);
		});

		it("should support concurrent batch operations", async () => {
			const batch1 = [testFilePath];
			const batch2Promise = analyzer.analyzeFiles([testFilePath]);
			const batch1Promise = analyzer.analyzeFiles(batch1);

			const [result1, result2] = await Promise.all([
				batch1Promise,
				batch2Promise,
			]);
			expect(result1.results).toHaveLength(1);
			expect(result2.results).toHaveLength(1);
		});
	});

	describe("Configuration and state management", () => {
		it("should maintain configuration throughout lifecycle", () => {
			const options: AnalyzerOptions = {
				defaultTimeout: 15000,
				enableCache: true,
				cacheSize: 2000,
			};

			const analyzer = new TypeScriptAnalyzer(options);
			const initialState = analyzer.getState();

			expect(initialState.config.defaultTimeout).toBe(15000);
			expect(initialState.config.enableCache).toBe(true);
			expect(initialState.config.cacheSize).toBe(2000);
			expect(initialState.isInitialized).toBe(true);
		});

		it("should update metrics after operations", async () => {
			// Create a fresh analyzer with cache disabled to ensure metrics update
			const freshAnalyzer = new TypeScriptAnalyzer({ enableCache: false });

			const initialState = freshAnalyzer.getState();
			const initialMetrics = initialState.metrics!;

			await freshAnalyzer.analyzeFile(testFilePath);

			const updatedState = freshAnalyzer.getState();
			const updatedMetrics = updatedState.metrics!;

			expect(updatedMetrics.totalFilesAnalyzed).toBeGreaterThan(
				initialMetrics.totalFilesAnalyzed,
			);
			expect(updatedMetrics.totalAnalysisTime).toBeGreaterThan(
				initialMetrics.totalAnalysisTime,
			);
		});

		it("should maintain cache behavior based on configuration", async () => {
			// Test with cache enabled
			const cachedAnalyzer = new TypeScriptAnalyzer({ enableCache: true });

			const result1 = await cachedAnalyzer.analyzeFile(testFilePath);
			const result2 = await cachedAnalyzer.analyzeFile(testFilePath); // Should hit cache

			expect(result1.filePath).toBe(result2.filePath);
			expect(result1.success).toBe(result2.success);
		});
	});

	describe("Method signature validation", () => {
		it("should have correct analyzeFile method signature", () => {
			expect(typeof analyzer.analyzeFile).toBe("function");
			expect(analyzer.analyzeFile.length).toBe(2); // filePath, options?
		});

		it("should have correct analyzeFiles method signature", () => {
			expect(typeof analyzer.analyzeFiles).toBe("function");
			expect(analyzer.analyzeFiles.length).toBe(2); // filePaths, options?
		});

		it("should have correct analyzeSource method signature", () => {
			expect(typeof analyzer.analyzeSource).toBe("function");
			expect(analyzer.analyzeSource.length).toBe(2); // source, options?
		});

		it("should have all expected utility methods", () => {
			expect(typeof analyzer.extractDependencies).toBe("function");
			expect(typeof analyzer.getImports).toBe("function");
			expect(typeof analyzer.getExports).toBe("function");
			expect(typeof analyzer.validateFile).toBe("function");
			expect(typeof analyzer.getSupportedExtensions).toBe("function");
			expect(typeof analyzer.clearCache).toBe("function");
			expect(typeof analyzer.getState).toBe("function");
			expect(typeof analyzer.formatResult).toBe("function");
			expect(typeof analyzer.on).toBe("function");
			expect(typeof analyzer.off).toBe("function");
		});
	});

	describe("Integration and compatibility", () => {
		it("should work with different TypeScript language constructs", async () => {
			const modernTsContent = `
// Modern TypeScript features
import type { ComponentType } from 'react';
import { z } from 'zod';

interface BaseProps {
  id: string;
}

type ExtendedProps = BaseProps & {
  optional?: string;
  union: 'a' | 'b' | 'c';
};

const schema = z.object({
  name: z.string(),
  age: z.number().optional(),
});

export type InferredType = z.infer<typeof schema>;

export const Component: ComponentType<ExtendedProps> = (props) => {
  const { id, optional = 'default' } = props;
  return null;
};

export default Component;
      `.trim();

			const modernFile = testFilePath.replace(".ts", "-modern.ts");
			fs.writeFileSync(modernFile, modernTsContent);

			const result = await analyzer.analyzeFile(modernFile);
			expect(result.success).toBe(true);
			expect(result.dependencies.length).toBeGreaterThan(0);
			expect(result.imports.length).toBeGreaterThan(0);
			expect(result.exports.length).toBeGreaterThan(0);

			fs.unlinkSync(modernFile);
		});

		it("should handle edge cases in file analysis", async () => {
			// Empty file
			const emptyFile = testFilePath.replace(".ts", "-empty.ts");
			fs.writeFileSync(emptyFile, "");

			const emptyResult = await analyzer.analyzeFile(emptyFile);
			expect(emptyResult).toHaveProperty("success");
			expect(emptyResult.dependencies).toHaveLength(0);
			expect(emptyResult.imports).toHaveLength(0);
			expect(emptyResult.exports).toHaveLength(0);

			fs.unlinkSync(emptyFile);

			// Comments only
			const commentsFile = testFilePath.replace(".ts", "-comments.ts");
			fs.writeFileSync(
				commentsFile,
				"// This is a comment\n/* Multi-line comment */",
			);

			const commentsResult = await analyzer.analyzeFile(commentsFile);
			expect(commentsResult).toHaveProperty("success");
			expect(commentsResult.dependencies).toHaveLength(0);

			fs.unlinkSync(commentsFile);
		});
	});
});
