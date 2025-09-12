/**
 * Error Handling Integration Test
 * Tests error scenarios and graceful failure handling
 */

import * as fs from "fs";
import * as path from "path";
import { FileAnalyzer } from "../../src/services/FileAnalyzer";
import { FileAnalysisRequest } from "../../src/models/FileAnalysisRequest";

describe("Error Handling Integration", () => {
	let fileAnalyzer: FileAnalyzer;
	const testFilesDir = path.join(__dirname, "../fixtures");

	beforeAll(async () => {
		fileAnalyzer = new FileAnalyzer();

		// Create test fixtures directory
		await fs.promises.mkdir(testFilesDir, { recursive: true });
	});

	afterAll(async () => {
		// Clean up only temporary test files, not the permanent fixtures
		const tempFiles = [
			"invalid.txt",
			"large-test.ts",
			"syntax-errors.ts",
			"completely-invalid.ts",
			"unicode.ts",
			"timeout-test.ts",
			"potential-loop.ts",
			"memory-test.ts",
			"bad-config.ts",
			"partial-parse.ts",
		];
		for (const file of tempFiles) {
			const filePath = path.join(testFilesDir, file);
			try {
				await fs.promises.unlink(filePath);
			} catch (error) {
				// Ignore file not found errors
			}
		}
	});

	describe("File system errors", () => {
		test("should handle non-existent file", async () => {
			const nonExistentFile = path.join(testFilesDir, "does-not-exist.ts");

			const request: FileAnalysisRequest = {
				filePath: nonExistentFile,
				options: { format: "json" },
			};

			const result = await fileAnalyzer.analyzeFile(request);

			expect(result.success).toBe(false);
			expect(result.error).toMatchObject({
				code: "FILE_NOT_FOUND",
				message: expect.stringContaining("not found"),
			});
			expect(result.filePath).toBe(nonExistentFile);
		});

		test("should handle invalid file type", async () => {
			const invalidFile = path.join(testFilesDir, "invalid.txt");
			await fs.promises.writeFile(invalidFile, "This is not TypeScript");

			const request: FileAnalysisRequest = {
				filePath: invalidFile,
				options: { format: "json" },
			};

			const result = await fileAnalyzer.analyzeFile(request);

			expect(result.success).toBe(false);
			expect(result.error).toMatchObject({
				code: "INVALID_FILE_TYPE",
				message: expect.stringContaining("TypeScript"),
			});
		});

		test("should handle permission denied", async () => {
			// Create a file and remove read permissions (if possible)
			const restrictedFile = path.join(testFilesDir, "restricted.ts");
			await fs.promises.writeFile(
				restrictedFile,
				'export const test = "restricted";',
			);

			try {
				// Try to remove read permissions (may not work on all systems)
				await fs.promises.chmod(restrictedFile, 0o000);

				// Test if permission restriction actually works
				let canStillRead = false;
				try {
					await fs.promises.readFile(restrictedFile, "utf-8");
					canStillRead = true;
				} catch {
					// Permission restriction is working
				}

				const request: FileAnalysisRequest = {
					filePath: restrictedFile,
					options: { format: "json" },
				};

				const result = await fileAnalyzer.analyzeFile(request);

				if (canStillRead) {
					// System doesn't enforce permission restrictions, skip test
					expect(result.success).toBe(true);
				} else {
					// Permission restriction is working, expect failure
					expect(result.success).toBe(false);
					expect(result.error?.code).toMatch(
						/FILE_NOT_FOUND|PERMISSION_DENIED/,
					);
				}
			} finally {
				// Restore permissions for cleanup
				try {
					await fs.promises.chmod(restrictedFile, 0o644);
				} catch {
					// Ignore cleanup errors
				}
			}
		});

		test("should handle very large files", async () => {
			const largeFile = path.join(testFilesDir, "very-large.ts");

			// Generate a very large TypeScript file (>10MB)
			let content = "export interface LargeFile {\n";
			for (let i = 0; i < 100000; i++) {
				content += `  field${i}: string;\n`;
			}
			content += "}\n\nexport default {};";

			await fs.promises.writeFile(largeFile, content);

			const request: FileAnalysisRequest = {
				filePath: largeFile,
				options: {
					format: "json",
					parseTimeout: 10000, // 10 second timeout
				},
			};

			const result = await fileAnalyzer.analyzeFile(request);

			// Should either succeed or fail gracefully with timeout
			if (result.success === false) {
				expect(result.error?.code).toMatch(/TIMEOUT|PARSE_ERROR/);
			} else {
				expect(result.parseTime).toBeLessThan(10000);
			}
		});
	});

	describe("Parse errors", () => {
		test("should handle syntax errors gracefully", async () => {
			const syntaxErrorFile = path.join(testFilesDir, "syntax-errors.ts");
			await fs.promises.writeFile(
				syntaxErrorFile,
				`
// File with various syntax errors
import { test } from 'module';

const broken = function(
  // Missing closing parenthesis and brace

export const another = 'valid';

class BrokenClass {
  method() {
    return "unclosed string;
  }
  // Missing closing brace

interface ValidInterface {
  field: string;
}

export interface AnotherInterface {
  missing: 
  // Missing type
}

export default broken;
`,
			);

			const request: FileAnalysisRequest = {
				filePath: syntaxErrorFile,
				options: { format: "json" },
			};

			const result = await fileAnalyzer.analyzeFile(request);

			// Should not crash, might succeed with partial results or fail with parse error
			expect(result).toBeDefined();
			expect(result.filePath).toBe(syntaxErrorFile);

			if (result.success === false) {
				expect(result.error).toMatchObject({
					code: "PARSE_ERROR",
					message: expect.stringContaining("error"),
				});
			} else {
				// If it succeeded, should have extracted what it could
				expect(result.imports).toBeDefined();
				expect(result.exports).toBeDefined();
			}
		});

		test("should handle completely invalid TypeScript", async () => {
			const invalidTsFile = path.join(testFilesDir, "completely-invalid.ts");
			await fs.promises.writeFile(
				invalidTsFile,
				`
This is not TypeScript at all!
It's just plain text with some
random content that won't parse.

@#$%^&*(){}[]|\\:";'<>?,.

Binary data: \x00\x01\x02\x03
`,
			);

			const request: FileAnalysisRequest = {
				filePath: invalidTsFile,
				options: { format: "json" },
			};

			const result = await fileAnalyzer.analyzeFile(request);

			expect(result.success).toBe(false);
			expect(result.error).toMatchObject({
				code: "PARSE_ERROR",
				message: expect.any(String),
			});
		});

		test("should handle Unicode and special characters", async () => {
			const unicodeFile = path.join(testFilesDir, "unicode.ts");
			await fs.promises.writeFile(
				unicodeFile,
				`
// File with Unicode characters and emoji
export const message = "Hello 世界! 🌍";
export const japanese = "こんにちは";
export const arabic = "مرحبا";
export const emoji = "🚀 🎉 ⚡ 🔥";

// Mathematical symbols
export const symbols = "α β γ δ ∑ ∏ ∫ ∂";

// Special whitespace characters
export const spaces = "en\u2002space\u2003em\u2009thin";

export default { message, japanese, arabic, emoji, symbols, spaces };
`,
				"utf-8",
			);

			const request: FileAnalysisRequest = {
				filePath: unicodeFile,
				options: { format: "json" },
			};

			const result = await fileAnalyzer.analyzeFile(request);

			expect(result.success).toBe(true);
			expect(result.exports).toHaveLength(7); // 6 named + 1 default
		});
	});

	describe("Timeout handling", () => {
		test("should respect parseTimeout option", async () => {
			const timeoutFile = path.join(testFilesDir, "timeout-test.ts");

			// Create a moderately complex file
			let content = 'import React from "react";\n\n';
			for (let i = 0; i < 10000; i++) {
				content += `export const component${i} = () => <div>{${i}}</div>;\n`;
			}

			await fs.promises.writeFile(timeoutFile, content);

			const request: FileAnalysisRequest = {
				filePath: timeoutFile,
				options: {
					format: "json",
					parseTimeout: 100, // Very short timeout (100ms)
				},
			};

			const startTime = Date.now();
			const result = await fileAnalyzer.analyzeFile(request);
			const totalTime = Date.now() - startTime;

			if (result.success === false && result.error?.code === "TIMEOUT") {
				expect(totalTime).toBeLessThan(1000); // Should timeout quickly
				expect(result.error.message).toContain("timeout");
			} else {
				// If it succeeded, it should be within reasonable time
				expect(result.parseTime).toBeLessThan(5000);
			}
		});

		test("should handle infinite loop prevention", async () => {
			const loopFile = path.join(testFilesDir, "potential-loop.ts");
			await fs.promises.writeFile(
				loopFile,
				`
// Potential problematic patterns that might cause infinite loops
export interface A extends B {}
export interface B extends A {}

export type RecursiveType<T> = {
  self: RecursiveType<T>;
  value: T;
};

// Very deeply nested structure
export type Deep = {
  level1: {
    level2: {
      level3: {
        level4: {
          level5: {
            level6: {
              level7: {
                level8: {
                  level9: {
                    level10: string;
                  };
                };
              };
            };
          };
        };
      };
    };
  };
};

export default {};
`,
			);

			const request: FileAnalysisRequest = {
				filePath: loopFile,
				options: {
					format: "json",
					parseTimeout: 5000,
				},
			};

			const result = await fileAnalyzer.analyzeFile(request);

			// Should complete without hanging
			expect(result).toBeDefined();
			expect(result.filePath).toBe(loopFile);
		});
	});

	describe("Memory and resource limits", () => {
		test("should handle memory-intensive operations", async () => {
			const memoryFile = path.join(testFilesDir, "memory-intensive.ts");

			// Generate file with many large string literals
			let content = "export const data = {\n";
			for (let i = 0; i < 1000; i++) {
				const largeString = "x".repeat(1000);
				content += `  field${i}: "${largeString}",\n`;
			}
			content += "};\n\nexport default data;";

			await fs.promises.writeFile(memoryFile, content);

			const request: FileAnalysisRequest = {
				filePath: memoryFile,
				options: { format: "json" },
			};

			const result = await fileAnalyzer.analyzeFile(request);

			// Should not crash due to memory issues
			expect(result).toBeDefined();

			if (result.success) {
				expect(result.exports).toHaveLength(2); // data + default
			} else if (result.error) {
				expect(result.error.code).toMatch(/PARSE_ERROR|TIMEOUT|MEMORY_ERROR/);
			}
		});
	});

	describe("Configuration errors", () => {
		test("should handle invalid analysis options", async () => {
			const validFile = path.join(testFilesDir, "valid.ts");
			await fs.promises.writeFile(validFile, 'export const test = "valid";');

			const request: FileAnalysisRequest = {
				filePath: validFile,
				options: {
					format: "invalid" as any, // Invalid format
					parseTimeout: -1, // Invalid timeout
					includeSources: "maybe" as any, // Invalid boolean
				},
			};

			// Should handle invalid options gracefully
			const result = await fileAnalyzer.analyzeFile(request);

			expect(result).toBeDefined();

			if (result.success === false) {
				expect(result.error?.code).toMatch(/INVALID_OPTIONS|PARSE_ERROR/);
			} else {
				// Should use default values for invalid options
				expect(result.success).toBe(true);
			}
		});
	});

	describe("Recovery and partial results", () => {
		test("should provide partial results when possible", async () => {
			const partialFile = path.join(testFilesDir, "partial-success.ts");
			await fs.promises.writeFile(
				partialFile,
				`
// Valid imports at the start
import React from 'react';
import { useState } from 'react';

// Valid exports
export const validFunction = () => "working";

// Syntax error in the middle
const broken = function(
  // Missing closing parenthesis

// But more valid content after
export interface ValidInterface {
  field: string;
}

export default validFunction;
`,
			);

			const request: FileAnalysisRequest = {
				filePath: partialFile,
				options: { format: "json" },
			};

			const result = await fileAnalyzer.analyzeFile(request);

			// Even if parsing partially fails, should extract what it can
			expect(result).toBeDefined();
			expect(result.imports.length).toBeGreaterThan(0); // Should find React imports
			expect(result.exports.length).toBeGreaterThan(0); // Should find exports

			if (result.success === false) {
				expect(result.error).toBeDefined();
			}
		});
	});
});
