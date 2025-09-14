import { AnalysisEngine } from "../../../../src/services/AnalysisEngine";
import { AnalysisResult } from "../../../../src/models/AnalysisResult";

// Test AnalysisEngine instead of old IFileAnalyzer interface
describe("AnalysisEngine Integration Contract", () => {
	let analysisEngine: AnalysisEngine;

	beforeEach(() => {
		analysisEngine = new AnalysisEngine();
	});

	describe("Core Analysis Methods", () => {
		test("should have core analysis methods", () => {
			expect(typeof analysisEngine.analyzeFile).toBe("function");
			expect(typeof analysisEngine.isEnabled).toBe("function");
			expect(typeof analysisEngine.setEnabled).toBe("function");
		});

		test("should be enabled by default", () => {
			expect(analysisEngine.isEnabled()).toBe(true);
		});

		test("should support enable/disable", () => {
			analysisEngine.setEnabled(false);
			expect(analysisEngine.isEnabled()).toBe(false);

			analysisEngine.setEnabled(true);
			expect(analysisEngine.isEnabled()).toBe(true);
		});
	});

	describe("Analysis Results", () => {
		test("should return proper AnalysisResult structure", async () => {
			// Create a simple test file
			const fs = require('fs');
			const path = require('path');
			const testFile = path.join(__dirname, 'temp-test.ts');
			fs.writeFileSync(testFile, 'import fs from "fs";\nexport const test = 1;');

			try {
				const result = await analysisEngine.analyzeFile(testFile);

				// Verify result structure
				expect(result).toBeDefined();
				expect(result.filePath).toBe(testFile);
				expect(result.language).toBeDefined();
				expect(result.extractedData).toBeDefined();
				expect(result.interpretedData).toBeDefined();
				expect(result.performanceMetrics).toBeDefined();
				expect(result.errors).toBeDefined();
				expect(result.metadata).toBeDefined();

				// Performance metrics should be present
				expect(typeof result.performanceMetrics.parseTime).toBe('number');
				expect(typeof result.performanceMetrics.totalTime).toBe('number');
				expect(result.performanceMetrics.totalTime).toBeGreaterThan(0);
			} finally {
				// Cleanup
				fs.unlinkSync(testFile);
			}
		});

		test("should handle non-existent files gracefully", async () => {
			const nonExistentFile = "/path/that/does/not/exist.ts";

			// The engine returns a result with errors instead of throwing
			const result = await analysisEngine.analyzeFile(nonExistentFile);
			expect(result).toBeDefined();
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].type).toBe("ParseError");
		});
	});

	describe("Configuration Support", () => {
		test("should accept analysis configuration", async () => {
			const fs = require('fs');
			const path = require('path');
			const testFile = path.join(__dirname, 'temp-config-test.ts');
			fs.writeFileSync(testFile, 'const test = 1;');

			try {
				const config = {
					useCache: false,
					extractors: ['dependency'],
					interpreters: []
				};

				const result = await analysisEngine.analyzeFile(testFile, config);
				expect(result).toBeDefined();
				expect(result.metadata.fromCache).toBe(false);
			} finally {
				fs.unlinkSync(testFile);
			}
		});
	});

	describe("Error Handling", () => {
		test("should handle malformed files", async () => {
			const fs = require('fs');
			const path = require('path');
			const testFile = path.join(__dirname, 'temp-malformed.ts');
			fs.writeFileSync(testFile, 'import from ;;; invalid syntax');

			try {
				const result = await analysisEngine.analyzeFile(testFile);
				// Should still return a result, possibly with errors
				expect(result).toBeDefined();
				expect(result.filePath).toBe(testFile);
			} finally {
				fs.unlinkSync(testFile);
			}
		});
	});

	describe("Performance Requirements", () => {
		test("should complete analysis within reasonable time", async () => {
			const fs = require('fs');
			const path = require('path');
			const testFile = path.join(__dirname, 'temp-perf-test.ts');
			fs.writeFileSync(testFile, 'import fs from "fs";\nconst x = 1;');

			try {
				const startTime = Date.now();
				const result = await analysisEngine.analyzeFile(testFile);
				const endTime = Date.now();

				expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
				expect(result.performanceMetrics.totalTime).toBeLessThan(1000); // 1 second internal time
			} finally {
				fs.unlinkSync(testFile);
			}
		});
	});
});