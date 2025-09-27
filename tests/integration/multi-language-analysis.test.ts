/**
 * Multi-Language Analysis Test - Simplified
 * Tests core multi-language support functionality
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { AnalysisEngine } from "../../src/services/analysis-engine";

describe("Multi-Language Analysis", () => {
	let engine: AnalysisEngine;

	beforeEach(() => {
		engine = new AnalysisEngine();
	});

	afterEach(async () => {
		await engine.shutdown();
	});

	describe("Core Language Support", () => {
		test("should handle TypeScript content", async () => {
			const tsContent = `
				export interface User { id: number; name: string; }
				export class UserService { getUser(id: number): User | null { return null; } }
			`;

			const result = await engine.analyzeContent(tsContent, "test.ts");
			expect(result.filePath).toBe("test.ts");
			expect(result.extractedData).toBeDefined();
		});

		test("should handle JavaScript content", async () => {
			const jsContent = `
				const fs = require('fs');
				class Processor { process() { return true; } }
				module.exports = { Processor };
			`;

			const result = await engine.analyzeContent(jsContent, "test.js");
			expect(result.filePath).toBe("test.js");
			expect(result.extractedData).toBeDefined();
		});

		test("should handle Go content", async () => {
			const goContent = `
				package main
				import "fmt"
				func main() { fmt.Println("Hello") }
			`;

			const result = await engine.analyzeContent(goContent, "main.go");
			expect(result.filePath).toBe("main.go");
			expect(result.extractedData).toBeDefined();
		});

		test("should handle Java content", async () => {
			const javaContent = `
				package com.example;
				import java.util.List;
				public class Service { public void process() {} }
			`;

			const result = await engine.analyzeContent(javaContent, "Service.java");
			expect(result.filePath).toBe("Service.java");
			expect(result.extractedData).toBeDefined();
		});
	});

	describe("Batch Analysis", () => {
		test("should analyze multiple files of different languages", async () => {
			const files = ["test.ts", "test.js", "main.go", "Service.java"];
			const results = await engine.analyzeBatch(files);

			expect(results).toHaveLength(files.length);
			for (let i = 0; i < results.length; i++) {
				expect(results[i].filePath).toBe(files[i]);
			}
		});
	});

	describe("Error Handling", () => {
		test("should handle syntax errors gracefully", async () => {
			const invalidContent = "invalid {{{ syntax";
			const result = await engine.analyzeContent(invalidContent, "invalid.ts");

			expect(result.filePath).toBe("invalid.ts");
			expect(result.errors.length).toBeGreaterThan(0);
		});

		test("should handle empty files", async () => {
			const result = await engine.analyzeContent("", "empty.ts");
			expect(result.filePath).toBe("empty.ts");
		});
	});
});