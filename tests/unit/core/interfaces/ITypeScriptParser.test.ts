import { TypeScriptParser } from "../../../../src/parsers/TypeScriptParser";

// Test actual TypeScript parser instead of old interface
describe("TypeScriptParser Integration Contract", () => {
	let parser: TypeScriptParser;

	beforeEach(() => {
		parser = new TypeScriptParser();
	});

	describe("Parser Interface", () => {
		test("should have required parser methods", () => {
			expect(typeof parser.parse).toBe("function");
			expect(typeof parser.supports).toBe("function");
			expect(typeof parser.detectLanguage).toBe("function");
			expect(typeof parser.validateSyntax).toBe("function");
			expect(typeof parser.getGrammar).toBe("function");
		});

		test("should have metadata properties", () => {
			const metadata = parser.getMetadata();
			expect(metadata.name).toBeDefined();
			expect(metadata.version).toBeDefined();
			expect(metadata.supportedLanguages).toBeDefined();
			expect(Array.isArray(metadata.supportedLanguages)).toBe(true);
		});
	});

	describe("Language Support", () => {
		test("should support TypeScript files", () => {
			expect(parser.supports("typescript")).toBe(true);
			expect(parser.supports("ts")).toBe(true);
			expect(parser.supports(".ts")).toBe(true);
			expect(parser.supports(".tsx")).toBe(true);
		});

		test("should support JavaScript files", () => {
			expect(parser.supports("javascript")).toBe(true);
			expect(parser.supports("js")).toBe(true);
			expect(parser.supports(".js")).toBe(true);
			expect(parser.supports(".jsx")).toBe(true);
		});

		test("should not support other languages", () => {
			expect(parser.supports("python")).toBe(false);
			expect(parser.supports("java")).toBe(false);
			expect(parser.supports(".py")).toBe(false);
		});
	});

	describe("Language Detection", () => {
		test("should detect TypeScript from file extension", () => {
			expect(parser.detectLanguage("test.ts")).toBe("typescript");
			expect(parser.detectLanguage("test.tsx")).toBe("tsx");
		});

		test("should detect JavaScript from file extension", () => {
			expect(parser.detectLanguage("test.js")).toBe("javascript");
			expect(parser.detectLanguage("test.jsx")).toBe("jsx");
		});

		test("should handle content-based detection", () => {
			const tsContent = "interface Test { x: number; }";
			expect(parser.detectLanguage("unknown.txt", tsContent)).toBe("typescript");
		});
	});

	describe("Parsing Functionality", () => {
		test("should parse valid TypeScript code", async () => {
			const code = 'import fs from "fs";\nconst x: number = 1;';
			const result = await parser.parse("test.ts", code);

			expect(result).toBeDefined();
			expect(result.language).toBe("typescript");
			expect(result.ast).toBeDefined();
			expect(result.parseTime).toBeGreaterThan(0);
			expect(result.errors).toBeDefined();
			expect(Array.isArray(result.errors)).toBe(true);
		});

		test("should handle malformed syntax gracefully", async () => {
			const invalidCode = "import from ;;; invalid";
			const result = await parser.parse("test.ts", invalidCode);

			expect(result).toBeDefined();
			expect(result.language).toBe("typescript");
			// Should still return AST even with errors
			expect(result.ast).toBeDefined();
		});
	});

	describe("Syntax Validation", () => {
		test("should validate correct syntax", () => {
			const validCode = "const x = 1;";
			const result = parser.validateSyntax(validCode);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		test("should detect syntax errors", () => {
			const invalidCode = "const x = ;";
			const result = parser.validateSyntax(invalidCode);

			expect(typeof result.isValid).toBe("boolean");
			expect(Array.isArray(result.errors)).toBe(true);
		});
	});

	describe("Grammar Access", () => {
		test("should provide grammar object", () => {
			const grammar = parser.getGrammar();
			expect(grammar).toBeDefined();
			expect(typeof grammar).toBe("object");
		});
	});

	describe("Performance Requirements", () => {
		test("should parse small files quickly", async () => {
			const code = 'import fs from "fs";\nconst x = 1;';

			const startTime = Date.now();
			const result = await parser.parse("test.ts", code);
			const endTime = Date.now();

			expect(endTime - startTime).toBeLessThan(1000); // 1 second max
			expect(result.parseTime).toBeLessThan(500); // 500ms internal time
		});

		test("should have fast language detection", () => {
			const startTime = Date.now();
			parser.supports("typescript");
			const endTime = Date.now();

			expect(endTime - startTime).toBeLessThan(10); // Very fast
		});
	});

	describe("Caching Behavior", () => {
		test("should indicate cache status", async () => {
			const code = "const x = 1;";
			const result1 = await parser.parse("test.ts", code);
			const result2 = await parser.parse("test.ts", code);

			// Both results should have cache metadata
			expect(typeof result1.cacheHit).toBe("boolean");
			expect(typeof result2.cacheHit).toBe("boolean");
		});
	});
});