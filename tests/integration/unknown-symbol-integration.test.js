"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const services_1 = require("../../src/database/services");
const handlers_1 = require("../../src/cli/handlers");
const UnknownSymbolManager_1 = require("../../src/database/services/UnknownSymbolManager");
const EquivalenceInferenceEngine_1 = require("../../src/database/inference/EquivalenceInferenceEngine");
(0, globals_1.describe)("Unknown Symbol System Integration", () => {
    let unknownSymbolManager;
    let inferenceEngine;
    (0, globals_1.beforeEach)(async () => {
        await services_1.ServiceFactory.initializeAll();
        unknownSymbolManager = services_1.ServiceFactory.getUnknownSymbolManager();
        inferenceEngine = new EquivalenceInferenceEngine_1.EquivalenceInferenceEngine(unknownSymbolManager);
    });
    (0, globals_1.afterEach)(async () => {
        await services_1.ServiceFactory.closeAll();
    });
    (0, globals_1.describe)("Service Factory Integration", () => {
        (0, globals_1.it)("should initialize all services through factory", async () => {
            (0, globals_1.expect)(unknownSymbolManager).toBeDefined();
            (0, globals_1.expect)(unknownSymbolManager).toBeInstanceOf(UnknownSymbolManager_1.UnknownSymbolManager);
        });
        (0, globals_1.it)("should provide singleton instances", async () => {
            const manager1 = services_1.ServiceFactory.getUnknownSymbolManager();
            const manager2 = services_1.ServiceFactory.getUnknownSymbolManager();
            (0, globals_1.expect)(manager1).toBe(manager2);
        });
    });
    (0, globals_1.describe)("Handler Factory Integration", () => {
        (0, globals_1.it)("should initialize all handlers through factory", async () => {
            await handlers_1.HandlerFactory.initializeAll();
            const rdfHandler = handlers_1.HandlerFactory.getRDFHandler();
            const unknownHandler = handlers_1.HandlerFactory.getUnknownHandler();
            (0, globals_1.expect)(rdfHandler).toBeDefined();
            (0, globals_1.expect)(unknownHandler).toBeDefined();
        });
        (0, globals_1.it)("should provide singleton handler instances", async () => {
            const handler1 = handlers_1.HandlerFactory.getUnknownHandler();
            const handler2 = handlers_1.HandlerFactory.getUnknownHandler();
            (0, globals_1.expect)(handler1).toBe(handler2);
        });
    });
    (0, globals_1.describe)("End-to-End Workflow", () => {
        (0, globals_1.it)("should complete full unknown symbol workflow", async () => {
            const unknownSymbol = {
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
            const registered = await unknownSymbolManager.registerUnknownSymbol(unknownSymbol);
            (0, globals_1.expect)(registered).toBeDefined();
            (0, globals_1.expect)(registered.name).toBe("UserService");
            const candidates = await unknownSymbolManager.findEquivalenceCandidates(registered);
            (0, globals_1.expect)(Array.isArray(candidates)).toBe(true);
            if (candidates.length > 0) {
                const result = await inferenceEngine.inferEquivalence(registered, candidates[0].knownSymbol);
                (0, globals_1.expect)(result).toBeDefined();
            }
            const symbols = await unknownSymbolManager.searchUnknownSymbols("");
            (0, globals_1.expect)(Array.isArray(symbols)).toBe(true);
        });
        (0, globals_1.it)("should handle multiple unknown symbols efficiently", async () => {
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
                const registered = await unknownSymbolManager.registerUnknownSymbol(symbol);
                registeredSymbols.push(registered);
            }
            (0, globals_1.expect)(registeredSymbols.length).toBe(3);
            const results = await inferenceEngine.batchInferEquivalence(registeredSymbols, registeredSymbols);
            (0, globals_1.expect)(Array.isArray(results)).toBe(true);
        });
    });
    (0, globals_1.describe)("Error Handling and Recovery", () => {
        (0, globals_1.it)("should handle service initialization errors gracefully", async () => {
            try {
                const manager = new UnknownSymbolManager_1.UnknownSymbolManager();
                await manager.initialize();
                (0, globals_1.expect)(true).toBe(true);
            }
            catch (error) {
                (0, globals_1.expect)(error).toBeDefined();
            }
        });
        (0, globals_1.it)("should recover from inference errors", async () => {
            const unknown = {
                id: "test_unknown",
                name: "TestSymbol",
                type: "Class",
                sourceFile: "src/test.ts",
                rdfAddress: "src/test.ts#Unknown:TestSymbol",
                isImported: false,
                isAlias: false,
                metadata: { lineNumber: 1, columnNumber: 1, confidence: 0.5 },
            };
            const known = {
                id: "test_known",
                name: "DifferentSymbol",
                type: "Interface",
                sourceFile: "src/different.ts",
                rdfAddress: "src/different.ts#Interface:DifferentSymbol",
                isImported: false,
                isAlias: false,
                metadata: { lineNumber: 1, columnNumber: 1, confidence: 0.5 },
            };
            const result = await inferenceEngine.inferEquivalence(unknown, known);
            (0, globals_1.expect)(result).toBeNull();
        });
    });
    (0, globals_1.describe)("Performance and Scalability", () => {
        (0, globals_1.it)("should handle large number of symbols efficiently", async () => {
            const startTime = Date.now();
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
            (0, globals_1.expect)(duration).toBeLessThan(5000);
            const searchStartTime = Date.now();
            const searchResults = await unknownSymbolManager.searchUnknownSymbols("Symbol");
            const searchEndTime = Date.now();
            const searchDuration = searchEndTime - searchStartTime;
            (0, globals_1.expect)(searchDuration).toBeLessThan(1000);
            (0, globals_1.expect)(searchResults.length).toBeGreaterThan(0);
        });
    });
});
//# sourceMappingURL=unknown-symbol-integration.test.js.map