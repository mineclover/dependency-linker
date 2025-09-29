/**
 * Essential Parser Tests
 * 파서 시스템의 핵심 기능만 검증하는 필수 테스트
 */

import { parseCode } from "../src/parsers";
import { globalParserManager } from "../src/parsers/ParserManager";
import { createCustomKeyMapper } from "../src/mappers/CustomKeyMapper";

describe("Essential Parser System Tests", () => {
	describe("Multi-Language Support", () => {
		test("should parse all supported languages correctly", async () => {
			const testCases = [
				{
					language: "typescript" as const,
					code: `import React from 'react'; export const App = () => <div>Hello</div>;`,
					fileName: "App.tsx"
				},
				{
					language: "java" as const,
					code: `public class UserService { public void createUser(String name) {} }`,
					fileName: "UserService.java"
				},
				{
					language: "python" as const,
					code: `def calculate(x, y):\n    return x + y`,
					fileName: "calculator.py"
				},
				{
					language: "go" as const,
					code: `package main\nfunc main() { println("Hello") }`,
					fileName: "main.go"
				}
			];

			for (const testCase of testCases) {
				const result = await parseCode(testCase.code, testCase.language, testCase.fileName);

				// 기본 구조 검증
				expect(result.tree.rootNode).toBeDefined();
				expect(result.metadata.nodeCount).toBeGreaterThan(0);
				expect(result.metadata.parseTime).toBeGreaterThan(0);
				expect(result.metadata.language).toBe(testCase.language);

				console.log(`✅ ${testCase.language}: ${result.metadata.nodeCount} nodes (${result.metadata.parseTime.toFixed(2)}ms)`);
			}
		});

		test("should handle TypeScript vs TSX correctly", async () => {
			// TypeScript 코드 (JSX 없음)
			const tsCode = `export interface User { id: string; name: string; }`;
			const tsResult = await parseCode(tsCode, "typescript", "types.ts");

			// TSX 코드 (JSX 포함)
			const tsxCode = `import React from 'react'; export const App = () => <div>App</div>;`;
			const tsxResult = await parseCode(tsxCode, "typescript", "App.tsx");

			expect(tsResult.tree.rootNode).toBeDefined();
			expect(tsxResult.tree.rootNode).toBeDefined();
			expect(tsResult.metadata.nodeCount).toBeGreaterThan(0);
			expect(tsxResult.metadata.nodeCount).toBeGreaterThan(0);

			console.log(`📄 TS: ${tsResult.metadata.nodeCount} nodes`);
			console.log(`📄 TSX: ${tsxResult.metadata.nodeCount} nodes`);
		});
	});

	describe("Parser Manager Performance", () => {
		test("should efficiently reuse parser instances", async () => {
			const testFiles = Array.from({ length: 10 }, (_, i) => ({
				content: `export const value${i} = ${i};`,
				language: "typescript" as const,
				filePath: `file${i}.ts`
			}));

			const startTime = performance.now();
			const results = await globalParserManager.analyzeFiles(testFiles);
			const totalTime = performance.now() - startTime;

			expect(results).toHaveLength(10);
			results.forEach(result => {
				expect(result.result.tree.rootNode).toBeDefined();
				expect(result.result.metadata.nodeCount).toBeGreaterThan(0);
			});

			const stats = globalParserManager.getStats();
			expect(stats.typescript.filesProcessed).toBe(10);

			console.log(`🚀 Batch processing: 10 files in ${totalTime.toFixed(2)}ms`);
			console.log(`📊 Average: ${(totalTime / 10).toFixed(2)}ms per file`);

			// 정리
			globalParserManager.dispose();
		});

		test("should maintain parsing consistency", async () => {
			const testCode = `export const greeting = "Hello World";`;
			const iterations = 5;

			const results = [];
			for (let i = 0; i < iterations; i++) {
				const result = await globalParserManager.analyzeFile(testCode, "typescript", `test${i}.ts`);
				results.push(result.metadata.nodeCount);
			}

			// 모든 결과가 동일한 노드 수를 가져야 함 (일관성 검증)
			const firstNodeCount = results[0];
			results.forEach(nodeCount => {
				expect(nodeCount).toBe(firstNodeCount);
			});

			console.log(`🔄 Consistency test: ${iterations} iterations, ${firstNodeCount} nodes each`);

			// 정리
			globalParserManager.dispose();
		});
	});

	describe("Custom Key Mapper Integration", () => {
		test("should integrate with query system", async () => {
			const mapper = createCustomKeyMapper({
				'임포트': 'ts-import-sources',
				'함수': 'ts-function-declarations'
			});

			// 매퍼 기본 기능 검증
			expect(mapper.getUserKeys()).toEqual(['임포트', '함수']);
			expect(mapper.getQueryKeys()).toEqual(['ts-import-sources', 'ts-function-declarations']);

			const mockMatches = [
				{ queryName: 'ts-import-sources', captures: [] },
				{ queryName: 'ts-function-declarations', captures: [] }
			];

			const mockContext = {
				sourceCode: 'test',
				language: 'typescript' as const,
				filePath: 'test.ts',
				tree: {} as any
			};

			// 실행 가능성 검증 (실제 쿼리 실행은 복잡하므로 기본 구조만 확인)
			expect(() => mapper.execute(mockMatches, mockContext)).not.toThrow();

			console.log(`🔗 Mapper integration: ${mapper.getUserKeys().length} custom keys mapped`);
		});
	});

	describe("Error Handling", () => {
		test("should handle invalid syntax gracefully", async () => {
			const invalidCode = `import React from 'react'; export const App = () => <div><span></div>; // 잘못된 JSX`;

			// tree-sitter는 에러가 있어도 최선의 파싱을 시도함
			const result = await parseCode(invalidCode, "typescript", "invalid.tsx");

			// 파싱은 성공하지만 에러 노드가 포함될 수 있음
			expect(result.tree.rootNode).toBeDefined();
			expect(result.metadata.nodeCount).toBeGreaterThan(0);

			console.log(`⚠️ Invalid syntax handled: ${result.metadata.nodeCount} nodes`);
		});

		test("should handle unsupported language", async () => {
			await expect(async () => {
				await parseCode("test", "unsupported" as any);
			}).rejects.toThrow();

			console.log(`❌ Unsupported language properly rejected`);
		});
	});
});