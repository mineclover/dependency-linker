/**
 * Mock Factory Integration Tests
 * Validates that mock implementations conform to interface contracts
 */

import { MockFactory, MockTestUtils } from "../mocks/MockFactory";

describe("Mock Factory Integration", () => {
	describe("Mock Implementation Validation", () => {
		it("should create valid FileAnalyzer mock", () => {
			const mock = MockFactory.createFileAnalyzerMock();
			const expectedMethods = ["analyzeFile", "validateFile"];

			expect(
				MockTestUtils.validateMockImplementation(mock, expectedMethods),
			).toBe(true);
		});

		it("should create valid TypeScriptParser mock", () => {
			const mock = MockFactory.createTypeScriptParserMock();
			const expectedMethods = ["parseSource", "parseFile"];

			expect(
				MockTestUtils.validateMockImplementation(mock, expectedMethods),
			).toBe(true);
		});

		it("should create valid OutputFormatter mock", () => {
			const mock = MockFactory.createOutputFormatterMock();
			const expectedMethods = ["format", "getFormatHeader"];

			expect(
				MockTestUtils.validateMockImplementation(mock, expectedMethods),
			).toBe(true);
		});
	});

	describe("Mock Suite Integration", () => {
		it("should create complete mock suite", () => {
			const suite = MockFactory.createMockSuite();

			expect(suite).toHaveProperty("fileAnalyzer");
			expect(suite).toHaveProperty("typeScriptParser");
			expect(suite).toHaveProperty("outputFormatter");

			expect(typeof suite.fileAnalyzer.analyzeFile).toBe("function");
			expect(typeof suite.typeScriptParser.parseSource).toBe("function");
			expect(typeof suite.outputFormatter.format).toBe("function");
		});

		it("should create error scenario mocks", () => {
			const errorMocks = MockFactory.createErrorScenarioMocks();

			expect(errorMocks).toHaveProperty("timeout");
			expect(errorMocks).toHaveProperty("fileNotFound");
			expect(errorMocks).toHaveProperty("syntaxError");
			expect(errorMocks).toHaveProperty("failure");
		});
	});

	describe("Mock Functionality", () => {
		it("should return expected data from FileAnalyzer mock", async () => {
			const mock = MockFactory.createFileAnalyzerMock();
			const result = await mock.analyzeFile({ filePath: "test.ts" });

			expect(result.success).toBe(true);
			expect(result.filePath).toBe("test.ts");
			expect(result.imports).toBeDefined();
			expect(result.exports).toBeDefined();
			expect(result.dependencies).toBeDefined();
			expect(typeof result.parseTime).toBe("number");
		});

		it("should handle error scenarios", async () => {
			const errorMock = MockFactory.createFileAnalyzerMock({
				errorToThrow: new Error("Test error"),
			});

			await expect(
				errorMock.analyzeFile({ filePath: "test.ts" }),
			).rejects.toThrow("Test error");
		});

		it("should handle failure scenarios", async () => {
			const failureMock = MockFactory.createFileAnalyzerMock({
				shouldSucceed: false,
			});

			const result = await failureMock.analyzeFile({ filePath: "test.ts" });
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});
	});

	describe("Performance Testing", () => {
		it("should measure mock performance", async () => {
			const mock = MockFactory.createFileAnalyzerMock();

			const performance = await MockTestUtils.measureMockPerformance(
				() => mock.analyzeFile({ filePath: "test.ts" }),
				10,
			);

			expect(performance.averageTime).toBeDefined();
			expect(performance.minTime).toBeDefined();
			expect(performance.maxTime).toBeDefined();
			expect(performance.averageTime).toBeGreaterThanOrEqual(0);
		});

		it("should respect delay configuration", async () => {
			const delayMock = MockFactory.createPerformanceMocks(50);
			const startTime = Date.now();

			await delayMock.fileAnalyzer.analyzeFile({ filePath: "test.ts" });

			const elapsedTime = Date.now() - startTime;
			expect(elapsedTime).toBeGreaterThanOrEqual(45); // Allow some tolerance
		});
	});

	describe("Custom Response Testing", () => {
		it("should return custom responses when configured", async () => {
			const customResponse = {
				filePath: "custom.ts",
				success: true,
				imports: [
					{
						source: "custom-lib",
						specifiers: [],
						location: { line: 1, column: 1 },
					},
				],
				exports: [],
				dependencies: [],
				parseTime: 999,
			};

			const customMocks = MockFactory.createCustomMocks({
				analysisResult: customResponse,
			});

			const result = await customMocks.fileAnalyzer.analyzeFile({
				filePath: "test.ts",
			});
			expect(result).toEqual(customResponse);
		});
	});
});
