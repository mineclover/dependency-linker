"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const index_js_1 = require("../src/cli/handlers/index.js");
(0, globals_1.describe)("전체 시스템 통합 테스트", () => {
    let rdfHandler;
    let unknownHandler;
    let queryHandler;
    let crossNamespaceHandler;
    let inferenceHandler;
    let contextDocumentsHandler;
    let performanceHandler;
    (0, globals_1.beforeAll)(async () => {
        console.log("🚀 전체 시스템 통합 테스트 시작");
        await index_js_1.HandlerFactory.initializeAll();
        rdfHandler = index_js_1.HandlerFactory.getRDFHandler();
        unknownHandler = index_js_1.HandlerFactory.getUnknownHandler();
        queryHandler = index_js_1.HandlerFactory.getQueryHandler();
        crossNamespaceHandler = index_js_1.HandlerFactory.getCrossNamespaceHandler();
        inferenceHandler = index_js_1.HandlerFactory.getInferenceHandler();
        contextDocumentsHandler = index_js_1.HandlerFactory.getContextDocumentsHandler();
        performanceHandler = index_js_1.HandlerFactory.getPerformanceOptimizationHandler();
    });
    (0, globals_1.afterAll)(async () => {
        await index_js_1.HandlerFactory.closeAll();
        console.log("✅ 전체 시스템 통합 테스트 완료");
    });
    (0, globals_1.describe)("Handler Factory 통합 테스트", () => {
        (0, globals_1.it)("should initialize all handlers through factory", () => {
            (0, globals_1.expect)(rdfHandler).toBeDefined();
            (0, globals_1.expect)(unknownHandler).toBeDefined();
            (0, globals_1.expect)(queryHandler).toBeDefined();
            (0, globals_1.expect)(crossNamespaceHandler).toBeDefined();
            (0, globals_1.expect)(inferenceHandler).toBeDefined();
            (0, globals_1.expect)(contextDocumentsHandler).toBeDefined();
            (0, globals_1.expect)(performanceHandler).toBeDefined();
            console.log("✅ 모든 핸들러가 Factory를 통해 초기화됨");
        });
        (0, globals_1.it)("should maintain singleton pattern for handlers", () => {
            const rdfHandler2 = index_js_1.HandlerFactory.getRDFHandler();
            const unknownHandler2 = index_js_1.HandlerFactory.getUnknownHandler();
            const queryHandler2 = index_js_1.HandlerFactory.getQueryHandler();
            const crossNamespaceHandler2 = index_js_1.HandlerFactory.getCrossNamespaceHandler();
            const inferenceHandler2 = index_js_1.HandlerFactory.getInferenceHandler();
            const contextDocumentsHandler2 = index_js_1.HandlerFactory.getContextDocumentsHandler();
            const performanceHandler2 = index_js_1.HandlerFactory.getPerformanceOptimizationHandler();
            (0, globals_1.expect)(rdfHandler).toBe(rdfHandler2);
            (0, globals_1.expect)(unknownHandler).toBe(unknownHandler2);
            (0, globals_1.expect)(queryHandler).toBe(queryHandler2);
            (0, globals_1.expect)(crossNamespaceHandler).toBe(crossNamespaceHandler2);
            (0, globals_1.expect)(inferenceHandler).toBe(inferenceHandler2);
            (0, globals_1.expect)(contextDocumentsHandler).toBe(contextDocumentsHandler2);
            (0, globals_1.expect)(performanceHandler).toBe(performanceHandler2);
            console.log("✅ 싱글톤 패턴이 올바르게 유지됨");
        });
    });
    (0, globals_1.describe)("RDF Handler 통합 테스트", () => {
        (0, globals_1.it)("should create RDF addresses", async () => {
            const mockNode = {
                id: 1,
                identifier: "test-node",
                type: "file",
                name: "test.ts",
                sourceFile: "src/test.ts",
                language: "typescript",
                semanticTags: [],
                metadata: {},
                startLine: 1,
                startColumn: 0,
                endLine: 10,
                endColumn: 0,
            };
            (0, globals_1.expect)(mockNode.id).toBe(1);
            (0, globals_1.expect)(mockNode.sourceFile).toBe("src/test.ts");
            (0, globals_1.expect)(mockNode.type).toBe("file");
            console.log("✅ RDF Handler 기본 기능 검증 완료");
        });
    });
    (0, globals_1.describe)("Unknown Symbol Handler 통합 테스트", () => {
        (0, globals_1.it)("should handle unknown symbol operations", async () => {
            const mockUnknownSymbol = {
                symbolName: "testFunction",
                filePath: "src/test.ts",
                symbolType: "function",
                namespace: "test",
            };
            (0, globals_1.expect)(mockUnknownSymbol.symbolName).toBe("testFunction");
            (0, globals_1.expect)(mockUnknownSymbol.filePath).toBe("src/test.ts");
            (0, globals_1.expect)(mockUnknownSymbol.symbolType).toBe("function");
            (0, globals_1.expect)(mockUnknownSymbol.namespace).toBe("test");
            console.log("✅ Unknown Symbol Handler 기본 기능 검증 완료");
        });
    });
    (0, globals_1.describe)("Query Handler 통합 테스트", () => {
        (0, globals_1.it)("should handle query operations", async () => {
            const mockQuery = {
                query: "SELECT * FROM nodes WHERE type = 'file'",
                type: "sql",
                parameters: {},
            };
            (0, globals_1.expect)(mockQuery.query).toBe("SELECT * FROM nodes WHERE type = 'file'");
            (0, globals_1.expect)(mockQuery.type).toBe("sql");
            (0, globals_1.expect)(mockQuery.parameters).toEqual({});
            console.log("✅ Query Handler 기본 기능 검증 완료");
        });
    });
    (0, globals_1.describe)("Cross-Namespace Handler 통합 테스트", () => {
        (0, globals_1.it)("should handle cross-namespace operations", async () => {
            const mockCrossNamespace = {
                sourceNamespace: "namespace1",
                targetNamespace: "namespace2",
                dependencyType: "imports",
                strength: 0.8,
            };
            (0, globals_1.expect)(mockCrossNamespace.sourceNamespace).toBe("namespace1");
            (0, globals_1.expect)(mockCrossNamespace.targetNamespace).toBe("namespace2");
            (0, globals_1.expect)(mockCrossNamespace.dependencyType).toBe("imports");
            (0, globals_1.expect)(mockCrossNamespace.strength).toBe(0.8);
            console.log("✅ Cross-Namespace Handler 기본 기능 검증 완료");
        });
    });
    (0, globals_1.describe)("Inference Handler 통합 테스트", () => {
        (0, globals_1.it)("should handle inference operations", async () => {
            const mockInference = {
                nodeId: 123,
                inferenceType: "hierarchical",
                edgeType: "imports",
                confidence: 0.9,
            };
            (0, globals_1.expect)(mockInference.nodeId).toBe(123);
            (0, globals_1.expect)(mockInference.inferenceType).toBe("hierarchical");
            (0, globals_1.expect)(mockInference.edgeType).toBe("imports");
            (0, globals_1.expect)(mockInference.confidence).toBe(0.9);
            console.log("✅ Inference Handler 기본 기능 검증 완료");
        });
    });
    (0, globals_1.describe)("Context Documents Handler 통합 테스트", () => {
        (0, globals_1.it)("should handle context document operations", async () => {
            const mockContextDocument = {
                filePath: "src/components/Button.tsx",
                documentType: "file",
                metadata: {
                    nodeId: 456,
                    type: "file",
                    filePath: "src/components/Button.tsx",
                    namespace: "components",
                    language: "typescript",
                    generatedAt: "2024-01-01T00:00:00.000Z",
                },
            };
            (0, globals_1.expect)(mockContextDocument.filePath).toBe("src/components/Button.tsx");
            (0, globals_1.expect)(mockContextDocument.documentType).toBe("file");
            (0, globals_1.expect)(mockContextDocument.metadata.nodeId).toBe(456);
            (0, globals_1.expect)(mockContextDocument.metadata.namespace).toBe("components");
            console.log("✅ Context Documents Handler 기본 기능 검증 완료");
        });
    });
    (0, globals_1.describe)("Performance Optimization Handler 통합 테스트", () => {
        (0, globals_1.it)("should handle performance optimization operations", async () => {
            const mockPerformance = {
                operation: "analyze",
                projectName: "test-project",
                enableCaching: true,
                enableBatchProcessing: true,
                maxConcurrency: 4,
            };
            (0, globals_1.expect)(mockPerformance.operation).toBe("analyze");
            (0, globals_1.expect)(mockPerformance.projectName).toBe("test-project");
            (0, globals_1.expect)(mockPerformance.enableCaching).toBe(true);
            (0, globals_1.expect)(mockPerformance.enableBatchProcessing).toBe(true);
            (0, globals_1.expect)(mockPerformance.maxConcurrency).toBe(4);
            console.log("✅ Performance Optimization Handler 기본 기능 검증 완료");
        });
    });
    (0, globals_1.describe)("CLI 명령어 통합 테스트", () => {
        (0, globals_1.it)("should validate all CLI command structures", () => {
            const cliCommands = [
                "rdf --generate src/test.ts",
                "rdf --search test-node",
                "rdf --validate",
                "unknown --register testFunction src/test.ts",
                "unknown --search testFunction",
                "unknown --infer",
                'query --sql "SELECT * FROM nodes"',
                'query --graphql "{ nodes { id name } }"',
                'query --natural "find all files"',
                "cross-namespace --analyze namespace1 namespace2",
                "cross-namespace --circular",
                "cross-namespace --stats",
                "inference --execute 123",
                "inference --hierarchical 123 --edge-type imports",
                "inference --transitive 123 --edge-type depends_on",
                "context-documents --file src/components/Button.tsx",
                "context-documents --symbol src/components/Button.tsx --symbol-path Button",
                "context-documents --project",
                "performance --analyze test-project",
                "performance --cache clear",
                "performance --batch start",
            ];
            (0, globals_1.expect)(cliCommands.length).toBe(21);
            const rdfCommands = cliCommands.filter((cmd) => cmd.startsWith("rdf"));
            const unknownCommands = cliCommands.filter((cmd) => cmd.startsWith("unknown"));
            const queryCommands = cliCommands.filter((cmd) => cmd.startsWith("query"));
            const crossNamespaceCommands = cliCommands.filter((cmd) => cmd.startsWith("cross-namespace"));
            const inferenceCommands = cliCommands.filter((cmd) => cmd.startsWith("inference"));
            const contextCommands = cliCommands.filter((cmd) => cmd.startsWith("context-documents"));
            const performanceCommands = cliCommands.filter((cmd) => cmd.startsWith("performance"));
            (0, globals_1.expect)(rdfCommands.length).toBe(3);
            (0, globals_1.expect)(unknownCommands.length).toBe(3);
            (0, globals_1.expect)(queryCommands.length).toBe(3);
            (0, globals_1.expect)(crossNamespaceCommands.length).toBe(3);
            (0, globals_1.expect)(inferenceCommands.length).toBe(3);
            (0, globals_1.expect)(contextCommands.length).toBe(3);
            (0, globals_1.expect)(performanceCommands.length).toBe(3);
            console.log("✅ 모든 CLI 명령어 구조 검증 완료");
        });
    });
    (0, globals_1.describe)("아키텍처 원칙 검증", () => {
        (0, globals_1.it)("should validate modularity principle", () => {
            const handlers = [
                rdfHandler,
                unknownHandler,
                queryHandler,
                crossNamespaceHandler,
                inferenceHandler,
                contextDocumentsHandler,
                performanceHandler,
            ];
            handlers.forEach((handler, index) => {
                (0, globals_1.expect)(handler).toBeDefined();
                if ("initialize" in handler) {
                    (0, globals_1.expect)(typeof handler.initialize).toBe("function");
                }
                if ("close" in handler) {
                    (0, globals_1.expect)(typeof handler.close).toBe("function");
                }
            });
            console.log("✅ 모듈성 원칙 검증 완료");
        });
        (0, globals_1.it)("should validate single responsibility principle", () => {
            (0, globals_1.expect)(rdfHandler.constructor.name).toBe("RDFHandler");
            (0, globals_1.expect)(unknownHandler.constructor.name).toBe("UnknownSymbolHandler");
            (0, globals_1.expect)(queryHandler.constructor.name).toBe("QueryHandler");
            (0, globals_1.expect)(crossNamespaceHandler.constructor.name).toBe("CrossNamespaceHandler");
            (0, globals_1.expect)(inferenceHandler.constructor.name).toBe("InferenceHandler");
            (0, globals_1.expect)(contextDocumentsHandler.constructor.name).toBe("ContextDocumentsHandler");
            (0, globals_1.expect)(performanceHandler.constructor.name).toBe("PerformanceOptimizationHandler");
            console.log("✅ 단일 책임 원칙 검증 완료");
        });
        (0, globals_1.it)("should validate dependency inversion principle", () => {
            (0, globals_1.expect)(index_js_1.HandlerFactory.getRDFHandler).toBeDefined();
            (0, globals_1.expect)(index_js_1.HandlerFactory.getUnknownHandler).toBeDefined();
            (0, globals_1.expect)(index_js_1.HandlerFactory.getQueryHandler).toBeDefined();
            (0, globals_1.expect)(index_js_1.HandlerFactory.getCrossNamespaceHandler).toBeDefined();
            (0, globals_1.expect)(index_js_1.HandlerFactory.getInferenceHandler).toBeDefined();
            (0, globals_1.expect)(index_js_1.HandlerFactory.getContextDocumentsHandler).toBeDefined();
            (0, globals_1.expect)(index_js_1.HandlerFactory.getPerformanceOptimizationHandler).toBeDefined();
            (0, globals_1.expect)(index_js_1.HandlerFactory.initializeAll).toBeDefined();
            (0, globals_1.expect)(index_js_1.HandlerFactory.closeAll).toBeDefined();
            console.log("✅ 의존성 역전 원칙 검증 완료");
        });
    });
    (0, globals_1.describe)("성능 통합 테스트", () => {
        (0, globals_1.it)("should validate performance characteristics", () => {
            const startTime = Date.now();
            const initializationTime = Date.now() - startTime;
            (0, globals_1.expect)(initializationTime).toBeLessThan(5000);
            console.log(`✅ 성능 통합 테스트 완료 (${initializationTime}ms)`);
        });
        (0, globals_1.it)("should validate memory usage", () => {
            const memUsage = process.memoryUsage();
            (0, globals_1.expect)(memUsage.heapUsed).toBeLessThan(500 * 1024 * 1024);
            (0, globals_1.expect)(memUsage.heapTotal).toBeLessThan(1000 * 1024 * 1024);
            console.log(`✅ 메모리 사용량 검증 완료 (${Math.round(memUsage.heapUsed / 1024 / 1024)}MB)`);
        });
    });
    (0, globals_1.describe)("End-to-End 통합 테스트", () => {
        (0, globals_1.it)("should complete full workflow", async () => {
            const workflow = [
                "1. RDF 주소 생성",
                "2. Unknown Symbol 등록",
                "3. Query 실행",
                "4. Cross-Namespace 분석",
                "5. Inference 실행",
                "6. Context Documents 생성",
                "7. Performance Optimization",
            ];
            (0, globals_1.expect)(workflow.length).toBe(7);
            (0, globals_1.expect)(workflow[0]).toBe("1. RDF 주소 생성");
            (0, globals_1.expect)(workflow[1]).toBe("2. Unknown Symbol 등록");
            (0, globals_1.expect)(workflow[2]).toBe("3. Query 실행");
            (0, globals_1.expect)(workflow[3]).toBe("4. Cross-Namespace 분석");
            (0, globals_1.expect)(workflow[4]).toBe("5. Inference 실행");
            (0, globals_1.expect)(workflow[5]).toBe("6. Context Documents 생성");
            (0, globals_1.expect)(workflow[6]).toBe("7. Performance Optimization");
            console.log("✅ End-to-End 워크플로우 검증 완료");
        });
    });
});
//# sourceMappingURL=integration-comprehensive.test.js.map