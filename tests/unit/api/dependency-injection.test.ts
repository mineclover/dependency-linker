/**
 * Dependency Injection Pattern Tests
 * Tests for dependency injection capabilities in the API layer
 */

import { TypeScriptAnalyzer } from "../../../src/api/TypeScriptAnalyzer";
import { IFileAnalyzer } from "../../../src/core/interfaces/IFileAnalyzer";
import { ITypeScriptParser } from "../../../src/core/interfaces/ITypeScriptParser";
import { IOutputFormatter } from "../../../src/core/interfaces/IOutputFormatter";
import { AnalysisResult } from "../../../src/models/AnalysisResult";
import { ValidationResult } from "../../../src/core/types/ParseTypes";
import { ParseResult, ParseOptions } from "../../../src/core/types/ParseTypes";
import {
	FileAnalysisRequest,
	OutputFormat,
} from "../../../src/models/FileAnalysisRequest";
import { AnalyzerOptions, Logger, LogLevel } from "../../../src/api/types";
import path from "path";
import fs from "fs";
import os from "os";

describe("Dependency Injection Pattern Tests", () => {
	let tempDir: string;
	let testFilePath: string;

	beforeEach(() => {
		// Create temporary test file
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "di-test-"));
		testFilePath = path.join(tempDir, "test.ts");

		const testContent = `
import { readFile } from 'fs/promises';
import * as path from 'path';

export interface TestInterface {
  name: string;
  value: number;
}

export const testFunction = async (): Promise<TestInterface> => {
  const data = await readFile('test.txt');
  return { name: 'test', value: 42 };
};
    `.trim();

		fs.writeFileSync(testFilePath, testContent);
	});

	afterEach(() => {
		// Clean up
		try {
			if (fs.existsSync(tempDir)) {
				fs.rmSync(tempDir, { recursive: true, force: true });
			}
		} catch (error) {
			// Ignore cleanup errors
		}
	});

	describe("Constructor dependency injection contract", () => {
		it("should accept empty dependencies object", () => {
			const analyzer = new TypeScriptAnalyzer({}, {});
			expect(analyzer).toBeInstanceOf(TypeScriptAnalyzer);
		});

		it("should accept IFileAnalyzer dependency injection", async () => {
			const mockFileAnalyzer: IFileAnalyzer = {
				async analyzeFile(
					request: FileAnalysisRequest,
				): Promise<AnalysisResult> {
					return {
						filePath: request.filePath,
						success: true,
						imports: [
							{
								source: "mocked-import",
								specifiers: [
									{ type: "default", imported: "Mock", local: "Mock" },
								],
								location: { line: 1, column: 1, offset: 0 },
								isTypeOnly: false,
							},
						],
						exports: [
							{
								name: "mockedExport",
								type: "named",
								location: { line: 5, column: 1, offset: 100 },
								isTypeOnly: false,
							},
						],
						dependencies: [
							{
								source: "mocked-dependency",
								type: "external",
								location: { line: 1, column: 1, offset: 0 },
							},
						],
						parseTime: 50,
					};
				},

				async validateFile(filePath: string): Promise<ValidationResult> {
					return {
						isValid: true,
						filePath,
						canAnalyze: true,
						errors: [],
						fileInfo: {
							size: 1000,
							extension: ".ts",
							lastModified: new Date(),
						},
					};
				},
			};

			const analyzer = new TypeScriptAnalyzer(
				{},
				{
					fileAnalyzer: mockFileAnalyzer,
				},
			);

			const result = await analyzer.analyzeFile(testFilePath);

			// Should use the mocked file analyzer
			expect(result.dependencies[0].source).toBe("mocked-dependency");
			expect(result.imports[0].source).toBe("mocked-import");
			expect(result.exports[0].name).toBe("mockedExport");
		});

		it("should accept ITypeScriptParser dependency injection", async () => {
			const mockParser: ITypeScriptParser = {
				async parseSource(
					source: string,
					options?: ParseOptions,
				): Promise<ParseResult> {
					return {
						imports: [
							{
								source: "parser-mock",
								specifiers: [
									{ type: "namespace", imported: "ParserMock", local: "PM" },
								],
								location: { line: 1, column: 1, offset: 0 },
								isTypeOnly: false,
							},
						],
						exports: [
							{
								name: "parseResult",
								type: "named",
								location: { line: 3, column: 1, offset: 50 },
								isTypeOnly: false,
							},
						],
						dependencies: [
							{
								source: "parser-dependency",
								type: "external",
								location: { line: 1, column: 1, offset: 0 },
							},
						],
						hasParseErrors: false,
					};
				},

				async parseFile(
					filePath: string,
					options?: ParseOptions,
				): Promise<ParseResult> {
					return this.parseSource(`// Mock content for ${filePath}`, options);
				},
			};

			const analyzer = new TypeScriptAnalyzer(
				{},
				{
					parser: mockParser,
				},
			);

			// Test with source analysis which uses parser directly
			const result = await analyzer.analyzeSource("const test = 1;");

			expect(result.dependencies[0].source).toBe("parser-dependency");
			expect(result.imports[0].source).toBe("parser-mock");
			expect(result.exports[0].name).toBe("parseResult");
		});

		it("should accept IOutputFormatter dependency injection", async () => {
			const mockFormatter: IOutputFormatter = {
				format(result: AnalysisResult, format: OutputFormat): string {
					return `MOCK: ${format} - ${result.filePath} - ${result.dependencies.length} deps`;
				},

				getFormatHeader(format: OutputFormat): string {
					return `MOCK_HEADER: ${format}`;
				},
			};

			const analyzer = new TypeScriptAnalyzer(
				{},
				{
					formatter: mockFormatter,
				},
			);

			const result = await analyzer.analyzeFile(testFilePath);
			const formatted = analyzer.formatResult(result, "json");

			expect(formatted).toContain("MOCK: json");
			expect(formatted).toContain(testFilePath);
		});

		it("should accept Logger dependency injection", async () => {
			const mockLogs: Array<{ level: string; message: string; meta?: any }> =
				[];
			const mockLogger: Logger = {
				info: (message: string, meta?: any) =>
					mockLogs.push({ level: "info", message, meta }),
				warn: (message: string, meta?: any) =>
					mockLogs.push({ level: "warn", message, meta }),
				error: (message: string, meta?: any) =>
					mockLogs.push({ level: "error", message, meta }),
				debug: (message: string, meta?: any) =>
					mockLogs.push({ level: "debug", message, meta }),
			};

			const analyzer = new TypeScriptAnalyzer(
				{ logLevel: LogLevel.DEBUG },
				{ logger: mockLogger },
			);

			await analyzer.analyzeFile(testFilePath);

			// Should have used the custom logger
			expect(mockLogs.length).toBeGreaterThan(0);
			const initLog = mockLogs.find((log) =>
				log.message.includes("TypeScript Analyzer initialized"),
			);
			expect(initLog).toBeDefined();
		});

		it("should accept multiple dependency injections simultaneously", async () => {
			const mockFileAnalyzer: IFileAnalyzer = {
				async analyzeFile(
					request: FileAnalysisRequest,
				): Promise<AnalysisResult> {
					return {
						filePath: request.filePath,
						success: true,
						imports: [],
						exports: [],
						dependencies: [
							{
								source: "multi-mock",
								type: "external",
								location: { line: 1, column: 1, offset: 0 },
							},
						],
						parseTime: 25,
					};
				},
				async validateFile(filePath: string): Promise<ValidationResult> {
					return { isValid: true, filePath, canAnalyze: true, errors: [] };
				},
			};

			const mockFormatter: IOutputFormatter = {
				format: () => "MULTI-MOCK FORMAT",
				getFormatHeader: () => "MULTI-MOCK HEADER",
			};

			const mockLogs: string[] = [];
			const mockLogger: Logger = {
				info: (msg: string) => mockLogs.push(`INFO: ${msg}`),
				warn: (msg: string) => mockLogs.push(`WARN: ${msg}`),
				error: (msg: string) => mockLogs.push(`ERROR: ${msg}`),
				debug: (msg: string) => mockLogs.push(`DEBUG: ${msg}`),
			};

			const analyzer = new TypeScriptAnalyzer(
				{},
				{
					fileAnalyzer: mockFileAnalyzer,
					formatter: mockFormatter,
					logger: mockLogger,
				},
			);

			const result = await analyzer.analyzeFile(testFilePath);
			const formatted = analyzer.formatResult(result, "json");

			// All mocks should be used
			expect(result.dependencies[0].source).toBe("multi-mock");
			expect(formatted).toBe("MULTI-MOCK FORMAT");
			expect(
				mockLogs.some((log) => log.includes("TypeScript Analyzer initialized")),
			).toBe(true);
		});
	});

	describe("Dependency interaction patterns", () => {
		it("should maintain separation of concerns between dependencies", async () => {
			let fileAnalyzerCalled = false;
			let parserCalled = false;
			let formatterCalled = false;

			const mockFileAnalyzer: IFileAnalyzer = {
				async analyzeFile(
					request: FileAnalysisRequest,
				): Promise<AnalysisResult> {
					fileAnalyzerCalled = true;
					return {
						filePath: request.filePath,
						success: true,
						imports: [],
						exports: [],
						dependencies: [],
						parseTime: 10,
					};
				},
				async validateFile(filePath: string): Promise<ValidationResult> {
					return { isValid: true, filePath, canAnalyze: true, errors: [] };
				},
			};

			const mockParser: ITypeScriptParser = {
				async parseSource(
					source: string,
					options?: ParseOptions,
				): Promise<ParseResult> {
					parserCalled = true;
					return {
						imports: [],
						exports: [],
						dependencies: [],
						hasParseErrors: false,
					};
				},
				async parseFile(
					filePath: string,
					options?: ParseOptions,
				): Promise<ParseResult> {
					return this.parseSource("", options);
				},
			};

			const mockFormatter: IOutputFormatter = {
				format(result: AnalysisResult, format: OutputFormat): string {
					formatterCalled = true;
					return "formatted";
				},
				getFormatHeader: () => "",
			};

			const analyzer = new TypeScriptAnalyzer(
				{},
				{
					fileAnalyzer: mockFileAnalyzer,
					parser: mockParser,
					formatter: mockFormatter,
				},
			);

			// Test file analysis (should use file analyzer)
			await analyzer.analyzeFile(testFilePath);
			expect(fileAnalyzerCalled).toBe(true);

			// Test source analysis (should use parser directly)
			await analyzer.analyzeSource("const x = 1;");
			expect(parserCalled).toBe(true);

			// Test formatting (should use formatter)
			const result = await analyzer.analyzeFile(testFilePath);
			analyzer.formatResult(result, "json");
			expect(formatterCalled).toBe(true);
		});

		it("should handle dependency method failures gracefully", async () => {
			const mockFileAnalyzer: IFileAnalyzer = {
				async analyzeFile(
					request: FileAnalysisRequest,
				): Promise<AnalysisResult> {
					throw new Error("Mock file analyzer error");
				},
				async validateFile(filePath: string): Promise<ValidationResult> {
					return { isValid: true, filePath, canAnalyze: true, errors: [] };
				},
			};

			const analyzer = new TypeScriptAnalyzer(
				{},
				{
					fileAnalyzer: mockFileAnalyzer,
				},
			);

			await expect(analyzer.analyzeFile(testFilePath)).rejects.toThrow(
				"Internal error in analyzeFile",
			);
		});

		it("should propagate dependency configuration correctly", async () => {
			let receivedRequest: FileAnalysisRequest | null = null;

			const mockFileAnalyzer: IFileAnalyzer = {
				async analyzeFile(
					request: FileAnalysisRequest,
				): Promise<AnalysisResult> {
					receivedRequest = request;
					return {
						filePath: request.filePath,
						success: true,
						imports: [],
						exports: [],
						dependencies: [],
						parseTime: 10,
					};
				},
				async validateFile(filePath: string): Promise<ValidationResult> {
					return { isValid: true, filePath, canAnalyze: true, errors: [] };
				},
			};

			const analyzer = new TypeScriptAnalyzer(
				{},
				{
					fileAnalyzer: mockFileAnalyzer,
				},
			);

			await analyzer.analyzeFile(testFilePath, {
				format: "csv",
				includeSources: true,
				parseTimeout: 5000,
			});

			expect(receivedRequest).not.toBeNull();
			expect(receivedRequest!.filePath).toBe(testFilePath);
			expect(receivedRequest!.options?.format).toBe("csv");
			expect(receivedRequest!.options?.includeSources).toBe(true);
			expect(receivedRequest!.options?.parseTimeout).toBe(5000);
		});
	});

	describe("Default vs injected dependency behavior", () => {
		it("should use default dependencies when none injected", async () => {
			const analyzer = new TypeScriptAnalyzer();

			// Should work with real dependencies
			const result = await analyzer.analyzeFile(testFilePath);
			expect(result.success).toBe(true);
			expect(result.filePath).toBe(testFilePath);
			expect(result.dependencies.length).toBeGreaterThan(0); // Should find fs/promises and path
		});

		it("should prefer injected dependencies over defaults", async () => {
			const mockFileAnalyzer: IFileAnalyzer = {
				async analyzeFile(
					request: FileAnalysisRequest,
				): Promise<AnalysisResult> {
					return {
						filePath: request.filePath,
						success: true,
						imports: [],
						exports: [],
						dependencies: [
							{
								source: "injected-dependency",
								type: "external",
								location: { line: 1, column: 1, offset: 0 },
							},
						],
						parseTime: 1,
					};
				},
				async validateFile(filePath: string): Promise<ValidationResult> {
					return { isValid: true, filePath, canAnalyze: true, errors: [] };
				},
			};

			const analyzer = new TypeScriptAnalyzer(
				{},
				{
					fileAnalyzer: mockFileAnalyzer,
				},
			);

			const result = await analyzer.analyzeFile(testFilePath);

			// Should use injected dependency behavior, not real parsing
			expect(result.dependencies).toHaveLength(1);
			expect(result.dependencies[0].source).toBe("injected-dependency");
			expect(result.parseTime).toBe(1);
		});

		it("should allow partial dependency injection", async () => {
			const mockFormatter: IOutputFormatter = {
				format: () => "PARTIAL INJECTION",
				getFormatHeader: () => "PARTIAL HEADER",
			};

			const analyzer = new TypeScriptAnalyzer(
				{},
				{
					formatter: mockFormatter,
					// fileAnalyzer and parser will use defaults
				},
			);

			const result = await analyzer.analyzeFile(testFilePath);
			const formatted = analyzer.formatResult(result, "json");

			// Should use real parsing but mock formatting
			expect(result.success).toBe(true);
			expect(result.dependencies.length).toBeGreaterThan(0); // Real parsing
			expect(formatted).toBe("PARTIAL INJECTION"); // Mock formatting
		});
	});

	describe("Dependency lifecycle management", () => {
		it("should maintain dependency instances throughout analyzer lifecycle", async () => {
			let callCount = 0;
			const mockFileAnalyzer: IFileAnalyzer = {
				async analyzeFile(
					request: FileAnalysisRequest,
				): Promise<AnalysisResult> {
					callCount++;
					return {
						filePath: request.filePath,
						success: true,
						imports: [],
						exports: [],
						dependencies: [],
						parseTime: callCount * 10, // Different each time to verify same instance
					};
				},
				async validateFile(filePath: string): Promise<ValidationResult> {
					return { isValid: true, filePath, canAnalyze: true, errors: [] };
				},
			};

			const analyzer = new TypeScriptAnalyzer(
				{
					enableCache: false, // Disable caching to ensure multiple calls
				},
				{
					fileAnalyzer: mockFileAnalyzer,
				},
			);

			const result1 = await analyzer.analyzeFile(testFilePath);
			const result2 = await analyzer.analyzeFile(testFilePath);

			// Should use the same injected instance
			expect(callCount).toBe(2);
			expect(result1.parseTime).toBe(10);
			expect(result2.parseTime).toBe(20);
		});

		it("should not modify injected dependencies", async () => {
			const originalMethods = {
				analyzeFile: jest.fn().mockResolvedValue({
					filePath: testFilePath,
					success: true,
					imports: [],
					exports: [],
					dependencies: [],
					parseTime: 15,
				}),
				validateFile: jest.fn().mockResolvedValue({
					isValid: true,
					filePath: testFilePath,
					canAnalyze: true,
					errors: [],
				}),
			};

			const mockFileAnalyzer: IFileAnalyzer = {
				analyzeFile: originalMethods.analyzeFile,
				validateFile: originalMethods.validateFile,
			};

			const analyzer = new TypeScriptAnalyzer(
				{},
				{
					fileAnalyzer: mockFileAnalyzer,
				},
			);

			await analyzer.analyzeFile(testFilePath);
			await analyzer.validateFile(testFilePath);

			// Verify the injected dependency methods were called but not modified
			expect(originalMethods.analyzeFile).toHaveBeenCalledTimes(1);
			expect(originalMethods.validateFile).toHaveBeenCalledTimes(1);
			expect(mockFileAnalyzer.analyzeFile).toBe(originalMethods.analyzeFile);
			expect(mockFileAnalyzer.validateFile).toBe(originalMethods.validateFile);
		});
	});

	describe("Method signature validation for dependency injection", () => {
		it("should accept constructor with both parameters optional", () => {
			// Test various constructor call patterns
			expect(() => new TypeScriptAnalyzer()).not.toThrow();
			expect(() => new TypeScriptAnalyzer({})).not.toThrow();
			expect(() => new TypeScriptAnalyzer({}, {})).not.toThrow();
			expect(() => new TypeScriptAnalyzer(undefined, {})).not.toThrow();
			expect(() => new TypeScriptAnalyzer({}, undefined)).not.toThrow();
		});

		it("should have correct constructor signature", () => {
			expect(TypeScriptAnalyzer.length).toBe(0); // Both parameters are optional
			// Verify constructor accepts both parameters
			const analyzer1 = new TypeScriptAnalyzer();
			const analyzer2 = new TypeScriptAnalyzer({});
			const analyzer3 = new TypeScriptAnalyzer({}, {});
			expect(analyzer1).toBeInstanceOf(TypeScriptAnalyzer);
			expect(analyzer2).toBeInstanceOf(TypeScriptAnalyzer);
			expect(analyzer3).toBeInstanceOf(TypeScriptAnalyzer);
		});

		it("should validate dependency interface compliance at runtime", async () => {
			// Test with object that doesn't implement full interface
			const incompleteDependency = {
				analyzeFile: async () => ({
					success: false,
					filePath: "",
					dependencies: [],
					imports: [],
					exports: [],
					parseTime: 0,
				}),
				// Missing validateFile method
			};

			// TypeScript should catch this at compile time, but test runtime behavior
			const analyzer = new TypeScriptAnalyzer(
				{},
				{
					fileAnalyzer: incompleteDependency as any,
				},
			);

			// Should work for analyzeFile
			const result = await analyzer.analyzeFile(testFilePath);
			expect(result).toBeDefined();

			// Should fail for validateFile since method is missing
			await expect(analyzer.validateFile(testFilePath)).rejects.toThrow();
		});
	});

	describe("Integration patterns with dependency injection", () => {
		it("should support decorator pattern through dependency injection", async () => {
			// Create a decorator that adds logging to file analyzer
			class LoggingFileAnalyzerDecorator implements IFileAnalyzer {
				private logs: string[] = [];

				constructor(private wrapped: IFileAnalyzer) {}

				async analyzeFile(
					request: FileAnalysisRequest,
				): Promise<AnalysisResult> {
					this.logs.push(`Analyzing: ${request.filePath}`);
					const result = await this.wrapped.analyzeFile(request);
					this.logs.push(
						`Completed: ${request.filePath} - ${result.success ? "SUCCESS" : "FAILURE"}`,
					);
					return result;
				}

				async validateFile(filePath: string): Promise<ValidationResult> {
					this.logs.push(`Validating: ${filePath}`);
					const result = await this.wrapped.validateFile(filePath);
					this.logs.push(
						`Validated: ${filePath} - ${result.isValid ? "VALID" : "INVALID"}`,
					);
					return result;
				}

				getLogs(): string[] {
					return [...this.logs];
				}
			}

			// Base implementation
			const baseAnalyzer: IFileAnalyzer = {
				async analyzeFile(
					request: FileAnalysisRequest,
				): Promise<AnalysisResult> {
					return {
						filePath: request.filePath,
						success: true,
						imports: [],
						exports: [],
						dependencies: [],
						parseTime: 50,
					};
				},
				async validateFile(filePath: string): Promise<ValidationResult> {
					return { isValid: true, filePath, canAnalyze: true, errors: [] };
				},
			};

			const decorator = new LoggingFileAnalyzerDecorator(baseAnalyzer);
			const analyzer = new TypeScriptAnalyzer(
				{},
				{
					fileAnalyzer: decorator,
				},
			);

			await analyzer.analyzeFile(testFilePath);
			await analyzer.validateFile(testFilePath);

			const logs = decorator.getLogs();
			expect(logs).toContain(`Analyzing: ${testFilePath}`);
			expect(logs).toContain(`Completed: ${testFilePath} - SUCCESS`);
			expect(logs).toContain(`Validating: ${testFilePath}`);
			expect(logs).toContain(`Validated: ${testFilePath} - VALID`);
		});

		it("should support factory pattern for dependency creation", async () => {
			// Factory for creating configured dependencies
			class DependencyFactory {
				static createTestAnalyzer(testMode: boolean): IFileAnalyzer {
					if (testMode) {
						return {
							async analyzeFile(
								request: FileAnalysisRequest,
							): Promise<AnalysisResult> {
								return {
									filePath: request.filePath,
									success: true,
									imports: [],
									exports: [],
									dependencies: [
										{
											source: "test-dependency",
											type: "external",
											location: { line: 1, column: 1, offset: 0 },
										},
									],
									parseTime: 0,
								};
							},
							async validateFile(filePath: string): Promise<ValidationResult> {
								return {
									isValid: true,
									filePath,
									canAnalyze: true,
									errors: [],
									fileInfo: {
										size: 0,
										extension: ".ts",
										lastModified: new Date(),
									},
								};
							},
						};
					} else {
						// Return production analyzer (would be actual implementation)
						return {
							async analyzeFile(
								request: FileAnalysisRequest,
							): Promise<AnalysisResult> {
								return {
									filePath: request.filePath,
									success: true,
									imports: [],
									exports: [],
									dependencies: [
										{
											source: "prod-dependency",
											type: "external",
											location: { line: 1, column: 1, offset: 0 },
										},
									],
									parseTime: 100,
								};
							},
							async validateFile(filePath: string): Promise<ValidationResult> {
								return {
									isValid: true,
									filePath,
									canAnalyze: true,
									errors: [],
								};
							},
						};
					}
				}
			}

			// Test mode
			const testAnalyzer = new TypeScriptAnalyzer(
				{},
				{
					fileAnalyzer: DependencyFactory.createTestAnalyzer(true),
				},
			);

			const testResult = await testAnalyzer.analyzeFile(testFilePath);
			expect(testResult.dependencies[0].source).toBe("test-dependency");
			expect(testResult.parseTime).toBe(0);

			// Production mode
			const prodAnalyzer = new TypeScriptAnalyzer(
				{},
				{
					fileAnalyzer: DependencyFactory.createTestAnalyzer(false),
				},
			);

			const prodResult = await prodAnalyzer.analyzeFile(testFilePath);
			expect(prodResult.dependencies[0].source).toBe("prod-dependency");
			expect(prodResult.parseTime).toBe(100);
		});
	});
});
