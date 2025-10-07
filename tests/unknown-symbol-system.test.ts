import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
	UnknownSymbolManager,
	UnknownSymbol,
} from "../src/database/services/UnknownSymbolManager";
import { EquivalenceInferenceEngine } from "../src/database/inference/EquivalenceInferenceEngine";
import { UnknownSymbolHandler } from "../src/cli/handlers/unknown-handler";

describe("Unknown Symbol System", () => {
	let unknownSymbolManager: UnknownSymbolManager;
	let inferenceEngine: EquivalenceInferenceEngine;
	let handler: UnknownSymbolHandler;

	beforeEach(async () => {
		unknownSymbolManager = new UnknownSymbolManager();
		inferenceEngine = new EquivalenceInferenceEngine(unknownSymbolManager);
		handler = new UnknownSymbolHandler();

		await unknownSymbolManager.initialize();
	});

	afterEach(async () => {
		await unknownSymbolManager.close();
	});

	describe("Unknown Symbol Manager", () => {
		it("should register unknown symbol", async () => {
			const symbol: Omit<UnknownSymbol, "id"> = {
				name: "User",
				type: "Class",
				sourceFile: "src/types.ts",
				rdfAddress: "src/types.ts#Unknown:User",
				isImported: false,
				isAlias: false,
				metadata: {
					lineNumber: 10,
					columnNumber: 5,
					confidence: 0.8,
				},
			};

			const registered =
				await unknownSymbolManager.registerUnknownSymbol(symbol);

			expect(registered).toBeDefined();
			expect(registered.name).toBe("User");
			expect(registered.type).toBe("Class");
			expect(registered.sourceFile).toBe("src/types.ts");
			expect(registered.id).toBeDefined();
		});

		it("should find equivalence candidates", async () => {
			// Unknown Symbol 등록
			const unknownSymbol: Omit<UnknownSymbol, "id"> = {
				name: "User",
				type: "Class",
				sourceFile: "src/types.ts",
				rdfAddress: "src/types.ts#Unknown:User",
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

			// 동등성 후보 검색
			const candidates =
				await unknownSymbolManager.findEquivalenceCandidates(registered);

			expect(candidates).toBeDefined();
			expect(Array.isArray(candidates)).toBe(true);
		});

		it("should create equivalence relation", async () => {
			// Unknown Symbol 등록
			const unknownSymbol: Omit<UnknownSymbol, "id"> = {
				name: "User",
				type: "Class",
				sourceFile: "src/types.ts",
				rdfAddress: "src/types.ts#Unknown:User",
				isImported: true,
				isAlias: false,
				metadata: {
					lineNumber: 10,
					columnNumber: 5,
					confidence: 0.8,
				},
			};

			const unknown =
				await unknownSymbolManager.registerUnknownSymbol(unknownSymbol);

			// Known Symbol 등록
			const knownSymbol: Omit<UnknownSymbol, "id"> = {
				name: "User",
				type: "Class",
				sourceFile: "src/models/User.ts",
				rdfAddress: "src/models/User.ts#Class:User",
				isImported: false,
				isAlias: false,
				metadata: {
					lineNumber: 15,
					columnNumber: 8,
					confidence: 0.9,
				},
			};

			const known =
				await unknownSymbolManager.registerUnknownSymbol(knownSymbol);

			// 동등성 관계 생성
			const relation = await unknownSymbolManager.createEquivalenceRelation(
				unknown,
				known,
				0.9,
				"exact_match",
			);

			expect(relation).toBeDefined();
			expect(relation.unknownId).toBe(unknown.id);
			expect(relation.knownId).toBe(known.id);
			expect(relation.confidence).toBe(0.9);
			expect(relation.matchType).toBe("exact_match");
		});

		it("should search unknown symbols", async () => {
			// 여러 Unknown Symbol 등록
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
			];

			for (const symbol of symbols) {
				await unknownSymbolManager.registerUnknownSymbol(symbol);
			}

			// 검색
			const results = await unknownSymbolManager.searchUnknownSymbols("User");

			expect(results).toBeDefined();
			expect(Array.isArray(results)).toBe(true);
			expect(results.length).toBeGreaterThan(0);
		});
	});

	describe("Equivalence Inference Engine", () => {
		it("should infer equivalence with exact name match", async () => {
			const unknown: UnknownSymbol = {
				id: "unknown_1",
				name: "User",
				type: "Class",
				sourceFile: "src/types.ts",
				rdfAddress: "src/types.ts#Unknown:User",
				isImported: true,
				isAlias: false,
				metadata: { lineNumber: 10, columnNumber: 5, confidence: 0.8 },
			};

			const known: UnknownSymbol = {
				id: "known_1",
				name: "User",
				type: "Class",
				sourceFile: "src/models/User.ts",
				rdfAddress: "src/models/User.ts#Class:User",
				isImported: false,
				isAlias: false,
				metadata: { lineNumber: 15, columnNumber: 8, confidence: 0.9 },
			};

			const result = await inferenceEngine.inferEquivalence(unknown, known);

			expect(result).toBeDefined();
			expect(result?.confidence).toBeGreaterThan(0.5);
			expect(result?.rule).toBe("exact_name_match");
		});

		it("should infer equivalence with type-based match", async () => {
			const unknown: UnknownSymbol = {
				id: "unknown_2",
				name: "user",
				type: "Class",
				sourceFile: "src/types.ts",
				rdfAddress: "src/types.ts#Unknown:user",
				isImported: true,
				isAlias: false,
				metadata: { lineNumber: 10, columnNumber: 5, confidence: 0.8 },
			};

			const known: UnknownSymbol = {
				id: "known_2",
				name: "User",
				type: "Class",
				sourceFile: "src/models/User.ts",
				rdfAddress: "src/models/User.ts#Class:User",
				isImported: false,
				isAlias: false,
				metadata: { lineNumber: 15, columnNumber: 8, confidence: 0.9 },
			};

			const result = await inferenceEngine.inferEquivalence(unknown, known);

			expect(result).toBeDefined();
			expect(result?.confidence).toBeGreaterThan(0.5);
			expect(result?.rule).toBe("type_based_match");
		});

		it("should infer equivalence with context-based match", async () => {
			const unknown: UnknownSymbol = {
				id: "unknown_3",
				name: "UserService",
				type: "Class",
				sourceFile: "src/services/UserService.ts",
				rdfAddress: "src/services/UserService.ts#Unknown:UserService",
				isImported: true,
				isAlias: false,
				metadata: { lineNumber: 10, columnNumber: 5, confidence: 0.8 },
			};

			const known: UnknownSymbol = {
				id: "known_3",
				name: "UserService",
				type: "Class",
				sourceFile: "src/services/UserService.ts",
				rdfAddress: "src/services/UserService.ts#Class:UserService",
				isImported: false,
				isAlias: false,
				metadata: { lineNumber: 15, columnNumber: 8, confidence: 0.9 },
			};

			const result = await inferenceEngine.inferEquivalence(unknown, known);

			expect(result).toBeDefined();
			expect(result?.confidence).toBeGreaterThan(0.5);
			expect(result?.rule).toBe("context_based_match");
		});

		it("should validate inference result", async () => {
			const unknown: UnknownSymbol = {
				id: "unknown_4",
				name: "User",
				type: "Class",
				sourceFile: "src/types.ts",
				rdfAddress: "src/types.ts#Unknown:User",
				isImported: true,
				isAlias: false,
				metadata: { lineNumber: 10, columnNumber: 5, confidence: 0.8 },
			};

			const known: UnknownSymbol = {
				id: "known_4",
				name: "User",
				type: "Class",
				sourceFile: "src/models/User.ts",
				rdfAddress: "src/models/User.ts#Class:User",
				isImported: false,
				isAlias: false,
				metadata: { lineNumber: 15, columnNumber: 8, confidence: 0.9 },
			};

			const result = await inferenceEngine.inferEquivalence(unknown, known);

			if (result) {
				const isValid = await inferenceEngine.validateInferenceResult(result);
				expect(isValid).toBe(true);
			}
		});
	});

	describe("Unknown Symbol Handler", () => {
		it("should register unknown symbol via handler", async () => {
			const options = {
				file: "src/types.ts",
				symbol: "User",
				type: "Class",
				isImported: false,
				isAlias: false,
			};

			// Mock console.log to capture output
			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			await handler.registerUnknownSymbol(options);

			expect(consoleSpy).toHaveBeenCalledWith("✅ Unknown Symbol 등록 완료:");
			expect(consoleSpy).toHaveBeenCalledWith("  - 이름: User");
			expect(consoleSpy).toHaveBeenCalledWith("  - 타입: Class");
			expect(consoleSpy).toHaveBeenCalledWith("  - 파일: src/types.ts");

			consoleSpy.mockRestore();
		});

		it("should search unknown symbols via handler", async () => {
			// 먼저 Unknown Symbol 등록
			await handler.registerUnknownSymbol({
				file: "src/types.ts",
				symbol: "User",
				type: "Class",
			});

			// Mock console.log to capture output
			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			await handler.searchUnknownSymbols({
				query: "User",
				type: "Class",
				file: "src/types.ts",
			});

			expect(consoleSpy).toHaveBeenCalledWith(
				"🔍 Unknown Symbol 검색 결과 (100개):",
			);

			consoleSpy.mockRestore();
		});

		it("should generate statistics via handler", async () => {
			// 먼저 Unknown Symbol 등록
			await handler.registerUnknownSymbol({
				file: "src/types.ts",
				symbol: "User",
				type: "Class",
			});

			await handler.registerUnknownSymbol({
				file: "src/types.ts",
				symbol: "Post",
				type: "Class",
			});

			// Mock console.log to capture output
			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			await handler.generateStatistics();

			expect(consoleSpy).toHaveBeenCalledWith("📊 Unknown Symbol 통계:");
			expect(consoleSpy).toHaveBeenCalledWith("  - 총 Unknown Symbol: 2개");

			consoleSpy.mockRestore();
		});
	});

	describe("Integration Tests", () => {
		it("should complete full workflow: register -> search -> infer -> create relation", async () => {
			// 1. Unknown Symbol 등록
			const unknown = await unknownSymbolManager.registerUnknownSymbol({
				name: "User",
				type: "Class",
				sourceFile: "src/types.ts",
				rdfAddress: "src/types.ts#Unknown:User",
				isImported: true,
				isAlias: false,
				metadata: { lineNumber: 10, columnNumber: 5, confidence: 0.8 },
			});

			// 2. Known Symbol 등록
			const known = await unknownSymbolManager.registerUnknownSymbol({
				name: "User",
				type: "Class",
				sourceFile: "src/models/User.ts",
				rdfAddress: "src/models/User.ts#Class:User",
				isImported: false,
				isAlias: false,
				metadata: { lineNumber: 15, columnNumber: 8, confidence: 0.9 },
			});

			// 3. 동등성 추론
			const inferenceResult = await inferenceEngine.inferEquivalence(
				unknown,
				known,
			);
			expect(inferenceResult).toBeDefined();
			expect(inferenceResult?.confidence).toBeGreaterThan(0.5);

			// 4. 동등성 관계 생성
			const relation = await unknownSymbolManager.createEquivalenceRelation(
				unknown,
				known,
				inferenceResult?.confidence || 0.8,
				inferenceResult?.rule || "inferred",
			);

			expect(relation).toBeDefined();
			expect(relation.unknownId).toBe(unknown.id);
			expect(relation.knownId).toBe(known.id);

			// 5. 동등성 관계 조회
			const relations = await unknownSymbolManager.getEquivalenceRelations(
				unknown.id,
			);
			expect(relations.length).toBeGreaterThan(0);
			expect(relations[0].id).toBe(relation.id);
		});

		it("should handle batch inference", async () => {
			// 여러 Unknown Symbol 등록
			const unknownSymbols = [
				{
					name: "User",
					type: "Class",
					sourceFile: "src/types.ts",
					rdfAddress: "src/types.ts#Unknown:User",
					isImported: true,
					isAlias: false,
					metadata: { lineNumber: 10, columnNumber: 5, confidence: 0.8 },
				},
				{
					name: "Post",
					type: "Class",
					sourceFile: "src/types.ts",
					rdfAddress: "src/types.ts#Unknown:Post",
					isImported: true,
					isAlias: false,
					metadata: { lineNumber: 20, columnNumber: 5, confidence: 0.8 },
				},
			];

			const unknowns = [];
			for (const symbol of unknownSymbols) {
				const registered =
					await unknownSymbolManager.registerUnknownSymbol(symbol);
				unknowns.push(registered);
			}

			// 여러 Known Symbol 등록
			const knownSymbols = [
				{
					name: "User",
					type: "Class",
					sourceFile: "src/models/User.ts",
					rdfAddress: "src/models/User.ts#Class:User",
					isImported: false,
					isAlias: false,
					metadata: { lineNumber: 15, columnNumber: 8, confidence: 0.9 },
				},
				{
					name: "Post",
					type: "Class",
					sourceFile: "src/models/Post.ts",
					rdfAddress: "src/models/Post.ts#Class:Post",
					isImported: false,
					isAlias: false,
					metadata: { lineNumber: 25, columnNumber: 8, confidence: 0.9 },
				},
			];

			const knowns = [];
			for (const symbol of knownSymbols) {
				const registered =
					await unknownSymbolManager.registerUnknownSymbol(symbol);
				knowns.push(registered);
			}

			// 배치 추론
			const results = await inferenceEngine.batchInferEquivalence(
				unknowns,
				knowns,
			);

			expect(results).toBeDefined();
			expect(Array.isArray(results)).toBe(true);
			expect(results.length).toBeGreaterThan(0);
		});
	});
});
