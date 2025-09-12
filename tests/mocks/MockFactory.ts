/**
 * Mock Factory for Core Interface Integration Testing
 * Provides standardized mock implementations for all core service interfaces
 */

import { IFileAnalyzer } from "../../src/core/interfaces/IFileAnalyzer";
import { ITypeScriptParser } from "../../src/core/interfaces/ITypeScriptParser";
import { IOutputFormatter } from "../../src/core/interfaces/IOutputFormatter";
import { FileAnalysisRequest } from "../../src/models/FileAnalysisRequest";
import { AnalysisResult } from "../../src/models/AnalysisResult";
import { ValidationResult } from "../../src/core/types/ParseTypes";
import { ParseResult, ParseOptions } from "../../src/core/types/ParseTypes";
import { OutputFormat } from "../../src/models/FileAnalysisRequest";

export interface MockConfiguration {
	shouldSucceed?: boolean;
	delay?: number;
	errorToThrow?: Error;
	customResponse?: any;
}

export class MockFactory {
	/**
	 * Creates a mock IFileAnalyzer implementation
	 */
	static createFileAnalyzerMock(config: MockConfiguration = {}): IFileAnalyzer {
		return {
			async analyzeFile(request: FileAnalysisRequest): Promise<AnalysisResult> {
				if (config.delay) {
					await new Promise((resolve) => setTimeout(resolve, config.delay));
				}

				if (config.errorToThrow) {
					throw config.errorToThrow;
				}

				if (config.customResponse) {
					return config.customResponse;
				}

				if (config.shouldSucceed === false) {
					return {
						filePath: request.filePath,
						success: false,
						imports: [],
						exports: [],
						dependencies: [],
						parseTime: 50,
						error: {
							code: "PARSE_ERROR",
							message: "Mock analysis failure",
							details: "This is a mock error for testing purposes",
						},
					};
				}

				return {
					filePath: request.filePath,
					success: true,
					imports: [
						{
							source: "react",
							specifiers: [
								{ type: "default", imported: "React", local: "React" },
							],
							location: { line: 1, column: 1, offset: 0 },
							isTypeOnly: false,
						},
					],
					exports: [
						{
							name: "MockComponent",
							type: "named",
							location: { line: 10, column: 1, offset: 200 },
							isTypeOnly: false,
						},
					],
					dependencies: [
						{
							source: "react",
							type: "external",
							location: { line: 1, column: 1, offset: 0 },
						},
					],
					parseTime: 100,
				};
			},

			async validateFile(filePath: string): Promise<ValidationResult> {
				if (config.delay) {
					await new Promise((resolve) => setTimeout(resolve, config.delay));
				}

				if (config.errorToThrow) {
					throw config.errorToThrow;
				}

				return {
					isValid: config.shouldSucceed !== false,
					filePath,
					canAnalyze: config.shouldSucceed !== false,
					errors:
						config.shouldSucceed === false ? ["Mock validation error"] : [],
					fileInfo: {
						size: 1000,
						extension: filePath.endsWith(".ts") ? ".ts" : ".tsx",
						lastModified: new Date(),
					},
				};
			},
		};
	}

	/**
	 * Creates a mock ITypeScriptParser implementation
	 */
	static createTypeScriptParserMock(
		config: MockConfiguration = {},
	): ITypeScriptParser {
		return {
			async parseSource(
				source: string,
				options?: ParseOptions,
			): Promise<ParseResult> {
				if (config.delay) {
					await new Promise((resolve) => setTimeout(resolve, config.delay));
				}

				if (config.errorToThrow) {
					throw config.errorToThrow;
				}

				if (config.customResponse) {
					return config.customResponse;
				}

				if (config.shouldSucceed === false) {
					return {
						imports: [],
						exports: [],
						dependencies: [],
						hasParseErrors: true,
					};
				}

				return {
					imports: [
						{
							source: "typescript",
							specifiers: [{ type: "namespace", imported: "ts", local: "ts" }],
							location: { line: 1, column: 1, offset: 0 },
							isTypeOnly: false,
						},
					],
					exports: [
						{
							name: "parseFunction",
							type: "named",
							location: { line: 5, column: 1, offset: 100 },
							isTypeOnly: false,
						},
					],
					dependencies: [
						{
							source: "typescript",
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
				if (config.delay) {
					await new Promise((resolve) => setTimeout(resolve, config.delay));
				}

				if (config.errorToThrow) {
					throw config.errorToThrow;
				}

				return this.parseSource(`// Mock content for ${filePath}`, options);
			},
		};
	}

	/**
	 * Creates a mock IOutputFormatter implementation
	 */
	static createOutputFormatterMock(
		config: MockConfiguration = {},
	): IOutputFormatter {
		return {
			format(result: AnalysisResult, format: OutputFormat): string {
				if (config.errorToThrow) {
					throw config.errorToThrow;
				}

				if (config.customResponse) {
					return config.customResponse;
				}

				switch (format) {
					case "json":
						return JSON.stringify(result, null, 2);
					case "csv":
						return "source,type,location\nreact,external,1:1";
					case "table":
						return "Source\tType\tLocation\nreact\texternal\t1:1";
					case "summary":
						return `Mock summary: ${result.dependencies.length} dependencies found`;
					case "compact":
						return JSON.stringify(result);
					case "deps-only":
						return result.dependencies.map((d) => d.source).join("\n");
					default:
						return "Mock formatted output";
				}
			},

			getFormatHeader(format: OutputFormat): string {
				if (config.errorToThrow) {
					throw config.errorToThrow;
				}

				switch (format) {
					case "csv":
						return "source,type,location";
					case "table":
						return "Source\tType\tLocation";
					default:
						return "";
				}
			},
		};
	}

	/**
	 * Creates a complete mock suite for integration testing
	 */
	static createMockSuite(config: MockConfiguration = {}) {
		return {
			fileAnalyzer: MockFactory.createFileAnalyzerMock(config),
			typeScriptParser: MockFactory.createTypeScriptParserMock(config),
			outputFormatter: MockFactory.createOutputFormatterMock(config),
		};
	}

	/**
	 * Creates error scenario mocks for testing error handling
	 */
	static createErrorScenarioMocks() {
		const timeoutError = new Error("Parse timeout");
		timeoutError.name = "ParseTimeoutError";

		const fileNotFoundError = new Error("File not found");
		fileNotFoundError.name = "FileNotFoundError";

		const syntaxError = new Error("Syntax error");
		syntaxError.name = "SyntaxError";

		return {
			timeout: MockFactory.createMockSuite({ errorToThrow: timeoutError }),
			fileNotFound: MockFactory.createMockSuite({
				errorToThrow: fileNotFoundError,
			}),
			syntaxError: MockFactory.createMockSuite({ errorToThrow: syntaxError }),
			failure: MockFactory.createMockSuite({ shouldSucceed: false }),
		};
	}

	/**
	 * Creates performance testing mocks with configurable delays
	 */
	static createPerformanceMocks(delayMs: number = 100) {
		return MockFactory.createMockSuite({ delay: delayMs });
	}

	/**
	 * Creates mocks with custom responses for specific test scenarios
	 */
	static createCustomMocks(customResponses: any) {
		return {
			fileAnalyzer: MockFactory.createFileAnalyzerMock({
				customResponse: customResponses.analysisResult,
			}),
			typeScriptParser: MockFactory.createTypeScriptParserMock({
				customResponse: customResponses.parseResult,
			}),
			outputFormatter: MockFactory.createOutputFormatterMock({
				customResponse: customResponses.formattedOutput,
			}),
		};
	}
}

/**
 * Utility functions for mock validation and testing
 */
export class MockTestUtils {
	/**
	 * Validates that a mock implementation conforms to interface contract
	 */
	static validateMockImplementation(
		mockInstance: any,
		expectedMethods: string[],
	): boolean {
		return expectedMethods.every(
			(method) => typeof mockInstance[method] === "function",
		);
	}

	/**
	 * Measures mock performance for testing
	 */
	static async measureMockPerformance<T>(
		mockFunction: () => Promise<T>,
		iterations: number = 100,
	): Promise<{ averageTime: number; minTime: number; maxTime: number }> {
		const times: number[] = [];

		for (let i = 0; i < iterations; i++) {
			const start = Date.now();
			await mockFunction();
			const end = Date.now();
			times.push(end - start);
		}

		return {
			averageTime: times.reduce((a, b) => a + b, 0) / times.length,
			minTime: Math.min(...times),
			maxTime: Math.max(...times),
		};
	}

	/**
	 * Creates test data for mock responses
	 */
	static createTestData() {
		return {
			sampleAnalysisResult: {
				filePath: "test.ts",
				success: true,
				imports: [
					{
						source: "react",
						specifiers: [{ type: "default", imported: "React" }],
						location: { line: 1, column: 1 },
					},
				],
				exports: [
					{
						name: "TestComponent",
						type: "named",
						location: { line: 10, column: 1 },
					},
				],
				dependencies: [
					{
						source: "react",
						type: "external",
						location: { line: 1, column: 1 },
					},
				],
				parseTime: 150,
			},
			sampleParseResult: {
				success: true,
				imports: [
					{
						source: "lodash",
						specifiers: [{ type: "named", imported: "map" }],
						location: { line: 2, column: 1 },
					},
				],
				exports: [
					{
						name: "utility",
						type: "named",
						location: { line: 8, column: 1 },
					},
				],
				errors: [],
				parseTime: 75,
			},
		};
	}
}
