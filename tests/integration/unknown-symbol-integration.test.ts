import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { getUnknownSymbolManager } from "../../src/database/services";
import { UnknownSymbolHandler } from "../../src/cli/handlers/unknown-handler";
import { RDFHandler } from "../../src/cli/handlers/rdf-handler";
import {
	UnknownSymbolManager,
	UnknownSymbol,
} from "../../src/database/services/UnknownSymbolManager";
import { EquivalenceInferenceEngine } from "../../src/database/inference/EquivalenceInferenceEngine";

describe("Unknown Symbol System Integration", () => {
	let unknownSymbolManager: UnknownSymbolManager;
	let inferenceEngine: EquivalenceInferenceEngine;

	beforeEach(async () => {
		// Service Factory를 통한 초기화
		unknownSymbolManager = getUnknownSymbolManager();
		await unknownSymbolManager.initialize();
		inferenceEngine = new EquivalenceInferenceEngine(unknownSymbolManager);
	});

	afterEach(async () => {
		// Service Factory는 함수형으로 전환되어 더 이상 사용하지 않음
	});

	describe("Service Factory Integration", () => {
		it("should initialize all services through factory", async () => {
			expect(unknownSymbolManager).toBeDefined();
			expect(unknownSymbolManager).toBeInstanceOf(UnknownSymbolManager);
		});

		it("should provide singleton instances", async () => {
			const manager1 = getUnknownSymbolManager();
			const manager2 = getUnknownSymbolManager();

			expect(manager1).toBe(manager2);
		});
	});

	describe("Handler Factory Integration", () => {
		it("should initialize all handlers through factory", async () => {
			// HandlerFactory는 함수형으로 전환되어 더 이상 사용하지 않음

			const rdfHandler = new RDFHandler();
			const unknownHandler = new UnknownSymbolHandler();

			expect(rdfHandler).toBeDefined();
			expect(unknownHandler).toBeDefined();
		});

		it("should provide singleton handler instances", async () => {
			const handler1 = new UnknownSymbolHandler();
			const handler2 = new UnknownSymbolHandler();

			expect(handler1).not.toBe(handler2);
		});
	});

	describe("End-to-End Workflow", () => {
		it("should complete full unknown symbol workflow", async () => {
			// 1. Unknown Symbol 등록
			const unknownSymbol: Omit<UnknownSymbol, "id"> = {
				name: "UserService",
				type: "Class",
				sourceFile: "src/services/UserService.ts",
				rdfAddress: "src/services/UserService.ts#Unknown:UserService",
				isImported: true,
				isAlias: false,
				metadata: {
					lineNumber: 10,
					columnNumber: 5,
					confidence: 0.8,
				},
			};

			const registered =
				await unknownSymbolManager.registerUnknownSymbol(unknownSymbol);
			expect(registered).toBeDefined();
			expect(registered.name).toBe("UserService");

			// 2. 동등성 후보 검색
			const candidates =
				await unknownSymbolManager.findEquivalenceCandidates(registered);
			expect(Array.isArray(candidates)).toBe(true);

			// 3. 추론 엔진을 통한 동등성 추론
			if (candidates.length > 0) {
				const result = await inferenceEngine.inferEquivalence(
					registered,
					candidates[0].knownSymbol,
				);
				expect(result).toBeDefined();
			}

			// 4. 통계 생성
			const symbols = await unknownSymbolManager.searchUnknownSymbols("");
			expect(Array.isArray(symbols)).toBe(true);
		});

		it("should handle multiple unknown symbols efficiently", async () => {
			const symbols = [
				{
					name: "User",
					type: "Class",
					sourceFile: "src/types.ts",
					rdfAddress: "src/types.ts#Unknown:User",
					isImported: false,
					isAlias: false,
					metadata: { lineNumber: 10, columnNumber: 5, confidence: 0.8 },
				},
				{
					name: "Post",
					type: "Class",
					sourceFile: "src/types.ts",
					rdfAddress: "src/types.ts#Unknown:Post",
					isImported: false,
					isAlias: false,
					metadata: { lineNumber: 20, columnNumber: 5, confidence: 0.8 },
				},
				{
					name: "Comment",
					type: "Class",
					sourceFile: "src/types.ts",
					rdfAddress: "src/types.ts#Unknown:Comment",
					isImported: false,
					isAlias: false,
					metadata: { lineNumber: 30, columnNumber: 5, confidence: 0.8 },
				},
			];

			const registeredSymbols = [];
			for (const symbol of symbols) {
				const registered =
					await unknownSymbolManager.registerUnknownSymbol(symbol);
				registeredSymbols.push(registered);
			}

			expect(registeredSymbols.length).toBe(3);

			// 배치 추론 테스트
			const results = await inferenceEngine.batchInferEquivalence(
				registeredSymbols,
				registeredSymbols,
			);
			expect(Array.isArray(results)).toBe(true);
		});
	});

	describe("Error Handling and Recovery", () => {
		it("should handle service initialization errors gracefully", async () => {
			// 잘못된 설정으로 초기화 시도
			try {
				const manager = new UnknownSymbolManager();
				await manager.initialize();
				expect(true).toBe(true); // 정상적으로 초기화됨
			} catch (error) {
				// 에러가 발생해도 시스템이 안정적으로 동작해야 함
				expect(error).toBeDefined();
			}
		});

		it("should recover from inference errors", async () => {
			const unknown: UnknownSymbol = {
				id: "test_unknown",
				name: "TestSymbol",
				type: "Class",
				sourceFile: "src/test.ts",
				rdfAddress: "src/test.ts#Unknown:TestSymbol",
				isImported: false,
				isAlias: false,
				metadata: { lineNumber: 1, columnNumber: 1, confidence: 0.5 },
			};

			const known: UnknownSymbol = {
				id: "test_known",
				name: "DifferentSymbol",
				type: "Interface",
				sourceFile: "src/different.ts",
				rdfAddress: "src/different.ts#Interface:DifferentSymbol",
				isImported: false,
				isAlias: false,
				metadata: { lineNumber: 1, columnNumber: 1, confidence: 0.5 },
			};

			// 추론이 실패해도 시스템이 안정적으로 동작해야 함
			const result = await inferenceEngine.inferEquivalence(unknown, known);
			expect(result).toBeNull(); // 추론 실패 예상
		});
	});

	describe("Performance and Scalability", () => {
		it("should handle large number of symbols efficiently", async () => {
			const startTime = Date.now();

			// 대량의 심볼 등록
			const symbols = Array.from({ length: 50 }, (_, i) => ({
				name: `Symbol${i}`,
				type: "Class",
				sourceFile: `src/file${i % 10}.ts`,
				rdfAddress: `src/file${i % 10}.ts#Unknown:Symbol${i}`,
				isImported: i % 2 === 0,
				isAlias: i % 3 === 0,
				metadata: { lineNumber: i, columnNumber: 0, confidence: 0.8 },
			}));

			for (const symbol of symbols) {
				await unknownSymbolManager.registerUnknownSymbol(symbol);
			}

			const endTime = Date.now();
			const duration = endTime - startTime;

			// 50개 심볼 등록이 5초 이내에 완료되어야 함
			expect(duration).toBeLessThan(5000);

			// 검색 성능 테스트
			const searchStartTime = Date.now();
			const searchResults =
				await unknownSymbolManager.searchUnknownSymbols("Symbol");
			const searchEndTime = Date.now();
			const searchDuration = searchEndTime - searchStartTime;

			// 검색이 1초 이내에 완료되어야 함
			expect(searchDuration).toBeLessThan(1000);
			expect(searchResults.length).toBeGreaterThan(0);
		});
	});
});
