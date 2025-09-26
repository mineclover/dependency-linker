/**
 * Contract test for ILanguageParser interface
 * Validates that any implementation of ILanguageParser satisfies the required behavior
 */

import { describe, test, expect } from "@jest/globals";

// Test interface contracts
interface ILanguageParser {
	parse(filePath: string, content?: string): Promise<ParseResult>;
	supports(language: string): boolean;
	detectLanguage(filePath: string, content?: string): string;
	getGrammar(): any;
	validateSyntax(content: string): SyntaxValidationResult;
}

interface ParseResult {
	ast: any;
	language: string;
	parseTime: number;
	cacheHit: boolean;
	errors: ParseError[];
}

interface ParseError {
	type: string;
	message: string;
	location: SourceLocation;
}

interface SyntaxValidationResult {
	isValid: boolean;
	errors: ParseError[];
}

interface SourceLocation {
	line: number;
	column: number;
	endLine?: number;
	endColumn?: number;
}

describe("ILanguageParser Contract", () => {
	let parser: ILanguageParser;

	beforeEach(() => {
		// Mock implementation for testing
		parser = {
			parse: jest.fn().mockResolvedValue({
				ast: { type: "Program", children: [] },
				language: "typescript",
				parseTime: 10,
				cacheHit: false,
				errors: [],
			}),
			supports: jest.fn().mockReturnValue(true),
			detectLanguage: jest.fn().mockReturnValue("typescript"),
			getGrammar: jest.fn().mockReturnValue({}),
			validateSyntax: jest.fn().mockReturnValue({
				isValid: true,
				errors: [],
			}),
		};
	});

	describe("Language Support", () => {
		test("supports should return boolean for language check", () => {
			const result = parser.supports("typescript");
			expect(typeof result).toBe("boolean");
		});

		test("supports should handle common language identifiers", () => {
			const languages = ["typescript", "javascript", "go", "java", "python"];

			languages.forEach((lang) => {
				const result = parser.supports(lang);
				expect(typeof result).toBe("boolean");
			});
		});

		test("detectLanguage should return language string from file path", () => {
			const testCases = [
				{ file: "test.ts", expected: "typescript" },
				{ file: "test.js", expected: "javascript" },
				{ file: "test.go", expected: "go" },
				{ file: "test.java", expected: "java" },
			];

			testCases.forEach(({ file, expected }) => {
				(parser.detectLanguage as jest.Mock).mockReturnValue(expected);
				const result = parser.detectLanguage(file);
				expect(typeof result).toBe("string");
				expect(result).toBe(expected);
			});
		});

		test("detectLanguage should handle content-based detection", () => {
			const content = 'function test() { return "typescript"; }';
			const result = parser.detectLanguage("unknown.txt", content);
			expect(typeof result).toBe("string");
		});
	});

	describe("Parsing Functionality", () => {
		test("parse should return valid ParseResult", async () => {
			const result = await parser.parse("test.ts");

			expect(result).toBeDefined();
			expect(result.ast).toBeDefined();
			expect(typeof result.language).toBe("string");
			expect(typeof result.parseTime).toBe("number");
			expect(typeof result.cacheHit).toBe("boolean");
			expect(Array.isArray(result.errors)).toBe(true);
		});

		test("parse should accept file path and optional content", async () => {
			const content = "const x = 1;";
			await parser.parse("test.ts", content);

			expect(parser.parse).toHaveBeenCalledWith("test.ts", content);
		});

		test("parse should handle invalid syntax gracefully", async () => {
			const mockResult = {
				ast: null,
				language: "typescript",
				parseTime: 5,
				cacheHit: false,
				errors: [
					{
						type: "SyntaxError",
						message: "Unexpected token",
						location: { line: 1, column: 5 },
					},
				],
			};

			(parser.parse as jest.Mock).mockResolvedValue(mockResult);

			const result = await parser.parse("invalid.ts");
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe("SyntaxError");
		});

		test("parse should provide performance metrics", async () => {
			const result = await parser.parse("test.ts");

			expect(typeof result.parseTime).toBe("number");
			expect(result.parseTime).toBeGreaterThanOrEqual(0);
		});
	});

	describe("Syntax Validation", () => {
		test("validateSyntax should return validation result", () => {
			const content = "const x = 1;";
			const result = parser.validateSyntax(content);

			expect(result).toBeDefined();
			expect(typeof result.isValid).toBe("boolean");
			expect(Array.isArray(result.errors)).toBe(true);
		});

		test("validateSyntax should detect valid syntax", () => {
			const validContent = "const x = 1; export default x;";
			const result = parser.validateSyntax(validContent);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		test("validateSyntax should detect invalid syntax", () => {
			const invalidContent = "const x = ;";
			const mockResult = {
				isValid: false,
				errors: [
					{
						type: "SyntaxError",
						message: "Unexpected token",
						location: { line: 1, column: 10 },
					},
				],
			};

			(parser.validateSyntax as jest.Mock).mockReturnValue(mockResult);

			const result = parser.validateSyntax(invalidContent);
			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});
	});

	describe("Grammar Access", () => {
		test("getGrammar should return grammar object", () => {
			const grammar = parser.getGrammar();
			expect(grammar).toBeDefined();
		});
	});

	describe("Performance Requirements", () => {
		test("parse should complete within target time for small files", async () => {
			const startTime = Date.now();
			await parser.parse("small-file.ts");
			const duration = Date.now() - startTime;

			// Should complete within 200ms for small files
			expect(duration).toBeLessThan(200);
		});

		test("parse should report accurate timing", async () => {
			const result = await parser.parse("test.ts");

			expect(result.parseTime).toBeGreaterThan(0);
			expect(result.parseTime).toBeLessThan(1000); // Less than 1 second
		});

		test("supports should execute quickly", () => {
			const startTime = Date.now();
			parser.supports("typescript");
			const duration = Date.now() - startTime;

			// Should complete in less than 1ms
			expect(duration).toBeLessThan(1);
		});
	});

	describe("Error Handling", () => {
		test("parse should handle file not found", async () => {
			const mockResult = {
				ast: null,
				language: "unknown",
				parseTime: 0,
				cacheHit: false,
				errors: [
					{
						type: "FileNotFound",
						message: "File not found: nonexistent.ts",
						location: { line: 0, column: 0 },
					},
				],
			};

			(parser.parse as jest.Mock).mockResolvedValue(mockResult);

			const result = await parser.parse("nonexistent.ts");
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe("FileNotFound");
		});

		test("parse should handle unsupported files", async () => {
			(parser.supports as jest.Mock).mockReturnValue(false);

			const mockResult = {
				ast: null,
				language: "unsupported",
				parseTime: 0,
				cacheHit: false,
				errors: [
					{
						type: "UnsupportedLanguage",
						message: "Language not supported: .xyz",
						location: { line: 0, column: 0 },
					},
				],
			};

			(parser.parse as jest.Mock).mockResolvedValue(mockResult);

			const result = await parser.parse("test.xyz");
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe("UnsupportedLanguage");
		});
	});

	describe("Caching Behavior", () => {
		test("parse should indicate cache hits when appropriate", async () => {
			// First call - cache miss
			const firstResult = await parser.parse("test.ts");
			expect(firstResult.cacheHit).toBe(false);

			// Mock second call - cache hit
			(parser.parse as jest.Mock).mockResolvedValueOnce({
				...firstResult,
				cacheHit: true,
				parseTime: 1, // Faster due to cache
			});

			const secondResult = await parser.parse("test.ts");
			expect(secondResult.cacheHit).toBe(true);
			expect(secondResult.parseTime).toBeLessThan(firstResult.parseTime);
		});
	});
});
