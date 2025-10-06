"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const UnknownSymbolManager_1 = require("../src/database/services/UnknownSymbolManager");
const EquivalenceInferenceEngine_1 = require("../src/database/inference/EquivalenceInferenceEngine");
const unknown_handler_1 = require("../src/cli/handlers/unknown-handler");
(0, globals_1.describe)("Unknown Symbol System", () => {
    let unknownSymbolManager;
    let inferenceEngine;
    let handler;
    (0, globals_1.beforeEach)(async () => {
        unknownSymbolManager = new UnknownSymbolManager_1.UnknownSymbolManager();
        inferenceEngine = new EquivalenceInferenceEngine_1.EquivalenceInferenceEngine(unknownSymbolManager);
        handler = new unknown_handler_1.UnknownSymbolHandler();
        await unknownSymbolManager.initialize();
    });
    (0, globals_1.afterEach)(async () => {
        await unknownSymbolManager.close();
    });
    (0, globals_1.describe)("Unknown Symbol Manager", () => {
        (0, globals_1.it)("should register unknown symbol", async () => {
            const symbol = {
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
            const registered = await unknownSymbolManager.registerUnknownSymbol(symbol);
            (0, globals_1.expect)(registered).toBeDefined();
            (0, globals_1.expect)(registered.name).toBe("User");
            (0, globals_1.expect)(registered.type).toBe("Class");
            (0, globals_1.expect)(registered.sourceFile).toBe("src/types.ts");
            (0, globals_1.expect)(registered.id).toBeDefined();
        });
        (0, globals_1.it)("should find equivalence candidates", async () => {
            const unknownSymbol = {
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
            const registered = await unknownSymbolManager.registerUnknownSymbol(unknownSymbol);
            const candidates = await unknownSymbolManager.findEquivalenceCandidates(registered);
            (0, globals_1.expect)(candidates).toBeDefined();
            (0, globals_1.expect)(Array.isArray(candidates)).toBe(true);
        });
        (0, globals_1.it)("should create equivalence relation", async () => {
            const unknownSymbol = {
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
            const unknown = await unknownSymbolManager.registerUnknownSymbol(unknownSymbol);
            const knownSymbol = {
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
            const known = await unknownSymbolManager.registerUnknownSymbol(knownSymbol);
            const relation = await unknownSymbolManager.createEquivalenceRelation(unknown, known, 0.9, "exact_match");
            (0, globals_1.expect)(relation).toBeDefined();
            (0, globals_1.expect)(relation.unknownId).toBe(unknown.id);
            (0, globals_1.expect)(relation.knownId).toBe(known.id);
            (0, globals_1.expect)(relation.confidence).toBe(0.9);
            (0, globals_1.expect)(relation.matchType).toBe("exact_match");
        });
        (0, globals_1.it)("should search unknown symbols", async () => {
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
            const results = await unknownSymbolManager.searchUnknownSymbols("User");
            (0, globals_1.expect)(results).toBeDefined();
            (0, globals_1.expect)(Array.isArray(results)).toBe(true);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)("Equivalence Inference Engine", () => {
        (0, globals_1.it)("should infer equivalence with exact name match", async () => {
            const unknown = {
                id: "unknown_1",
                name: "User",
                type: "Class",
                sourceFile: "src/types.ts",
                rdfAddress: "src/types.ts#Unknown:User",
                isImported: true,
                isAlias: false,
                metadata: { lineNumber: 10, columnNumber: 5, confidence: 0.8 },
            };
            const known = {
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
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result?.confidence).toBeGreaterThan(0.5);
            (0, globals_1.expect)(result?.rule).toBe("exact_name_match");
        });
        (0, globals_1.it)("should infer equivalence with type-based match", async () => {
            const unknown = {
                id: "unknown_2",
                name: "user",
                type: "Class",
                sourceFile: "src/types.ts",
                rdfAddress: "src/types.ts#Unknown:user",
                isImported: true,
                isAlias: false,
                metadata: { lineNumber: 10, columnNumber: 5, confidence: 0.8 },
            };
            const known = {
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
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result?.confidence).toBeGreaterThan(0.5);
            (0, globals_1.expect)(result?.rule).toBe("type_based_match");
        });
        (0, globals_1.it)("should infer equivalence with context-based match", async () => {
            const unknown = {
                id: "unknown_3",
                name: "UserService",
                type: "Class",
                sourceFile: "src/services/UserService.ts",
                rdfAddress: "src/services/UserService.ts#Unknown:UserService",
                isImported: true,
                isAlias: false,
                metadata: { lineNumber: 10, columnNumber: 5, confidence: 0.8 },
            };
            const known = {
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
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result?.confidence).toBeGreaterThan(0.5);
            (0, globals_1.expect)(result?.rule).toBe("context_based_match");
        });
        (0, globals_1.it)("should validate inference result", async () => {
            const unknown = {
                id: "unknown_4",
                name: "User",
                type: "Class",
                sourceFile: "src/types.ts",
                rdfAddress: "src/types.ts#Unknown:User",
                isImported: true,
                isAlias: false,
                metadata: { lineNumber: 10, columnNumber: 5, confidence: 0.8 },
            };
            const known = {
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
                (0, globals_1.expect)(isValid).toBe(true);
            }
        });
    });
    (0, globals_1.describe)("Unknown Symbol Handler", () => {
        (0, globals_1.it)("should register unknown symbol via handler", async () => {
            const options = {
                file: "src/types.ts",
                symbol: "User",
                type: "Class",
                isImported: false,
                isAlias: false,
            };
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();
            await handler.registerUnknownSymbol(options);
            (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith("✅ Unknown Symbol 등록 완료:");
            (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith("  - 이름: User");
            (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith("  - 타입: Class");
            (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith("  - 파일: src/types.ts");
            consoleSpy.mockRestore();
        });
        (0, globals_1.it)("should search unknown symbols via handler", async () => {
            await handler.registerUnknownSymbol({
                file: "src/types.ts",
                symbol: "User",
                type: "Class",
            });
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();
            await handler.searchUnknownSymbols({
                query: "User",
                type: "Class",
                file: "src/types.ts",
            });
            (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith("🔍 Unknown Symbol 검색 결과");
            consoleSpy.mockRestore();
        });
        (0, globals_1.it)("should generate statistics via handler", async () => {
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
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();
            await handler.generateStatistics();
            (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith("📊 Unknown Symbol 통계:");
            (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith("  - 총 Unknown Symbol: 2개");
            consoleSpy.mockRestore();
        });
    });
    (0, globals_1.describe)("Integration Tests", () => {
        (0, globals_1.it)("should complete full workflow: register -> search -> infer -> create relation", async () => {
            const unknown = await unknownSymbolManager.registerUnknownSymbol({
                name: "User",
                type: "Class",
                sourceFile: "src/types.ts",
                rdfAddress: "src/types.ts#Unknown:User",
                isImported: true,
                isAlias: false,
                metadata: { lineNumber: 10, columnNumber: 5, confidence: 0.8 },
            });
            const known = await unknownSymbolManager.registerUnknownSymbol({
                name: "User",
                type: "Class",
                sourceFile: "src/models/User.ts",
                rdfAddress: "src/models/User.ts#Class:User",
                isImported: false,
                isAlias: false,
                metadata: { lineNumber: 15, columnNumber: 8, confidence: 0.9 },
            });
            const inferenceResult = await inferenceEngine.inferEquivalence(unknown, known);
            (0, globals_1.expect)(inferenceResult).toBeDefined();
            (0, globals_1.expect)(inferenceResult?.confidence).toBeGreaterThan(0.5);
            const relation = await unknownSymbolManager.createEquivalenceRelation(unknown, known, inferenceResult?.confidence || 0.8, inferenceResult?.rule || "inferred");
            (0, globals_1.expect)(relation).toBeDefined();
            (0, globals_1.expect)(relation.unknownId).toBe(unknown.id);
            (0, globals_1.expect)(relation.knownId).toBe(known.id);
            const relations = await unknownSymbolManager.getEquivalenceRelations(unknown.id);
            (0, globals_1.expect)(relations.length).toBeGreaterThan(0);
            (0, globals_1.expect)(relations[0].id).toBe(relation.id);
        });
        (0, globals_1.it)("should handle batch inference", async () => {
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
                const registered = await unknownSymbolManager.registerUnknownSymbol(symbol);
                unknowns.push(registered);
            }
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
                const registered = await unknownSymbolManager.registerUnknownSymbol(symbol);
                knowns.push(registered);
            }
            const results = await inferenceEngine.batchInferEquivalence(unknowns, knowns);
            (0, globals_1.expect)(results).toBeDefined();
            (0, globals_1.expect)(Array.isArray(results)).toBe(true);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
        });
    });
});
//# sourceMappingURL=unknown-symbol-system.test.js.map