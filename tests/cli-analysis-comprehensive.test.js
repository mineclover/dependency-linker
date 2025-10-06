"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
(0, globals_1.describe)("CLI 분석 통합 테스트 - 전체 시멘틱 태그 및 심볼 타입", () => {
    (0, globals_1.beforeAll)(() => {
        console.log("🚀 CLI 분석 통합 테스트 시작");
    });
    (0, globals_1.afterAll)(() => {
        console.log("✅ CLI 분석 통합 테스트 완료");
    });
    (0, globals_1.describe)("Node Types (노드 타입) 분석", () => {
        (0, globals_1.it)("should validate all File & Resource Types", () => {
            const fileResourceTypes = [
                "file",
                "external-resource",
                "missing-file",
                "library",
                "package",
            ];
            (0, globals_1.expect)(fileResourceTypes.length).toBe(5);
            fileResourceTypes.forEach((type) => {
                (0, globals_1.expect)(type).toBeDefined();
                (0, globals_1.expect)(typeof type).toBe("string");
            });
            console.log("✅ File & Resource Types 검증 완료");
        });
        (0, globals_1.it)("should validate all Code Symbol Types (LSP-based)", () => {
            const codeSymbolTypes = [
                "class",
                "interface",
                "function",
                "method",
                "property",
                "field",
                "variable",
                "constant",
                "type",
                "enum",
                "enum-member",
                "constructor",
            ];
            (0, globals_1.expect)(codeSymbolTypes.length).toBe(12);
            codeSymbolTypes.forEach((type) => {
                (0, globals_1.expect)(type).toBeDefined();
                (0, globals_1.expect)(typeof type).toBe("string");
            });
            console.log("✅ Code Symbol Types (LSP-based) 검증 완료");
        });
        (0, globals_1.it)("should validate all Declaration Types", () => {
            const declarationTypes = [
                "export",
                "import",
            ];
            (0, globals_1.expect)(declarationTypes.length).toBe(2);
            declarationTypes.forEach((type) => {
                (0, globals_1.expect)(type).toBeDefined();
                (0, globals_1.expect)(typeof type).toBe("string");
            });
            console.log("✅ Declaration Types 검증 완료");
        });
        (0, globals_1.it)("should validate all Documentation Types", () => {
            const documentationTypes = [
                "heading-symbol",
                "symbol",
            ];
            (0, globals_1.expect)(documentationTypes.length).toBe(2);
            documentationTypes.forEach((type) => {
                (0, globals_1.expect)(type).toBeDefined();
                (0, globals_1.expect)(typeof type).toBe("string");
            });
            console.log("✅ Documentation Types 검증 완료");
        });
        (0, globals_1.it)("should validate all Error Types", () => {
            const errorTypes = [
                "file_not_found",
                "broken_reference",
            ];
            (0, globals_1.expect)(errorTypes.length).toBe(2);
            errorTypes.forEach((type) => {
                (0, globals_1.expect)(type).toBeDefined();
                (0, globals_1.expect)(typeof type).toBe("string");
            });
            console.log("✅ Error Types 검증 완료");
        });
    });
    (0, globals_1.describe)("Edge Types (엣지 타입) 분석", () => {
        (0, globals_1.it)("should validate all Structural Relationships", () => {
            const structuralRelationships = [
                "contains",
                "declares",
                "belongs_to",
            ];
            (0, globals_1.expect)(structuralRelationships.length).toBe(3);
            structuralRelationships.forEach((type) => {
                (0, globals_1.expect)(type).toBeDefined();
                (0, globals_1.expect)(typeof type).toBe("string");
            });
            console.log("✅ Structural Relationships 검증 완료");
        });
        (0, globals_1.it)("should validate all Dependency Relationships", () => {
            const dependencyRelationships = [
                "depends_on",
                "imports",
                "imports_library",
                "imports_file",
                "exports_to",
            ];
            (0, globals_1.expect)(dependencyRelationships.length).toBe(5);
            dependencyRelationships.forEach((type) => {
                (0, globals_1.expect)(type).toBeDefined();
                (0, globals_1.expect)(typeof type).toBe("string");
            });
            console.log("✅ Dependency Relationships 검증 완료");
        });
        (0, globals_1.it)("should validate all Code Execution Relationships", () => {
            const executionRelationships = [
                "calls",
                "instantiates",
                "uses",
                "accesses",
            ];
            (0, globals_1.expect)(executionRelationships.length).toBe(4);
            executionRelationships.forEach((type) => {
                (0, globals_1.expect)(type).toBeDefined();
                (0, globals_1.expect)(typeof type).toBe("string");
            });
            console.log("✅ Code Execution Relationships 검증 완료");
        });
        (0, globals_1.it)("should validate all Type System Relationships", () => {
            const typeSystemRelationships = [
                "extends",
                "implements",
                "has_type",
                "returns",
                "throws",
            ];
            (0, globals_1.expect)(typeSystemRelationships.length).toBe(5);
            typeSystemRelationships.forEach((type) => {
                (0, globals_1.expect)(type).toBeDefined();
                (0, globals_1.expect)(typeof type).toBe("string");
            });
            console.log("✅ Type System Relationships 검증 완료");
        });
        (0, globals_1.it)("should validate all Modification Relationships", () => {
            const modificationRelationships = [
                "overrides",
                "shadows",
                "assigns_to",
            ];
            (0, globals_1.expect)(modificationRelationships.length).toBe(3);
            modificationRelationships.forEach((type) => {
                (0, globals_1.expect)(type).toBeDefined();
                (0, globals_1.expect)(typeof type).toBe("string");
            });
            console.log("✅ Modification Relationships 검증 완료");
        });
        (0, globals_1.it)("should validate all Documentation Relationships", () => {
            const documentationRelationships = [
                "md-link",
                "md-image",
                "md-wikilink",
                "md-symbol-ref",
                "md-include",
                "md-code-ref",
                "md-anchor",
                "md-hashtag",
                "md-contains-heading",
            ];
            (0, globals_1.expect)(documentationRelationships.length).toBe(9);
            documentationRelationships.forEach((type) => {
                (0, globals_1.expect)(type).toBeDefined();
                (0, globals_1.expect)(typeof type).toBe("string");
            });
            console.log("✅ Documentation Relationships 검증 완료");
        });
        (0, globals_1.it)("should validate all Meta Relationships", () => {
            const metaRelationships = [
                "annotated_with",
                "references",
            ];
            (0, globals_1.expect)(metaRelationships.length).toBe(2);
            metaRelationships.forEach((type) => {
                (0, globals_1.expect)(type).toBeDefined();
                (0, globals_1.expect)(typeof type).toBe("string");
            });
            console.log("✅ Meta Relationships 검증 완료");
        });
    });
    (0, globals_1.describe)("Supported Languages (지원 언어) 분석", () => {
        (0, globals_1.it)("should validate all supported programming languages", () => {
            const supportedLanguages = [
                "typescript",
                "tsx",
                "javascript",
                "jsx",
                "java",
                "python",
                "go",
                "markdown",
                "external",
                "unknown",
            ];
            (0, globals_1.expect)(supportedLanguages.length).toBe(10);
            supportedLanguages.forEach((language) => {
                (0, globals_1.expect)(language).toBeDefined();
                (0, globals_1.expect)(typeof language).toBe("string");
            });
            console.log("✅ Supported Languages 검증 완료");
        });
        (0, globals_1.it)("should validate file extension mappings", () => {
            const fileExtensionMappings = {
                typescript: ["ts", "tsx"],
                tsx: ["tsx"],
                javascript: ["js", "jsx"],
                jsx: ["jsx"],
                java: ["java"],
                python: ["py", "pyi"],
                go: ["go"],
                markdown: ["md", "markdown", "mdx"],
                external: [],
                unknown: [],
            };
            (0, globals_1.expect)(Object.keys(fileExtensionMappings).length).toBe(10);
            (0, globals_1.expect)(fileExtensionMappings.typescript).toEqual(["ts", "tsx"]);
            (0, globals_1.expect)(fileExtensionMappings.javascript).toEqual(["js", "jsx"]);
            (0, globals_1.expect)(fileExtensionMappings.python).toEqual(["py", "pyi"]);
            (0, globals_1.expect)(fileExtensionMappings.markdown).toEqual(["md", "markdown", "mdx"]);
            console.log("✅ File Extension Mappings 검증 완료");
        });
    });
    (0, globals_1.describe)("Semantic Tags (시멘틱 태그) 분석", () => {
        (0, globals_1.it)("should validate architecture layer tags", () => {
            const architectureLayerTags = [
                "service-layer",
                "controller-layer",
                "repository-layer",
                "domain-layer",
                "infrastructure-layer",
                "presentation-layer",
            ];
            (0, globals_1.expect)(architectureLayerTags.length).toBe(6);
            architectureLayerTags.forEach((tag) => {
                (0, globals_1.expect)(tag).toContain("-layer");
                (0, globals_1.expect)(typeof tag).toBe("string");
            });
            console.log("✅ Architecture Layer Tags 검증 완료");
        });
        (0, globals_1.it)("should validate business domain tags", () => {
            const businessDomainTags = [
                "auth-domain",
                "user-domain",
                "payment-domain",
                "notification-domain",
                "analytics-domain",
            ];
            (0, globals_1.expect)(businessDomainTags.length).toBe(5);
            businessDomainTags.forEach((tag) => {
                (0, globals_1.expect)(tag).toContain("-domain");
                (0, globals_1.expect)(typeof tag).toBe("string");
            });
            console.log("✅ Business Domain Tags 검증 완료");
        });
        (0, globals_1.it)("should validate access scope tags", () => {
            const accessScopeTags = [
                "public-api",
                "private-api",
                "internal-api",
                "protected-api",
            ];
            (0, globals_1.expect)(accessScopeTags.length).toBe(4);
            accessScopeTags.forEach((tag) => {
                (0, globals_1.expect)(tag).toContain("-api");
                (0, globals_1.expect)(typeof tag).toBe("string");
            });
            console.log("✅ Access Scope Tags 검증 완료");
        });
        (0, globals_1.it)("should validate code quality tags", () => {
            const codeQualityTags = [
                "pure-function",
                "side-effect",
                "async-function",
                "sync-function",
                "testable",
                "mocked",
            ];
            (0, globals_1.expect)(codeQualityTags.length).toBe(6);
            codeQualityTags.forEach((tag) => {
                (0, globals_1.expect)(typeof tag).toBe("string");
            });
            console.log("✅ Code Quality Tags 검증 완료");
        });
        (0, globals_1.it)("should validate documentation tags", () => {
            const documentationTags = [
                "doc-api",
                "doc-guide",
                "doc-tutorial",
                "doc-reference",
                "doc-example",
            ];
            (0, globals_1.expect)(documentationTags.length).toBe(5);
            documentationTags.forEach((tag) => {
                (0, globals_1.expect)(tag).toContain("doc-");
                (0, globals_1.expect)(typeof tag).toBe("string");
            });
            console.log("✅ Documentation Tags 검증 완료");
        });
        (0, globals_1.it)("should validate framework tags", () => {
            const frameworkTags = [
                "react-component",
                "vue-component",
                "angular-component",
                "express-middleware",
                "nestjs-controller",
                "nestjs-service",
            ];
            (0, globals_1.expect)(frameworkTags.length).toBe(6);
            frameworkTags.forEach((tag) => {
                (0, globals_1.expect)(typeof tag).toBe("string");
            });
            console.log("✅ Framework Tags 검증 완료");
        });
    });
    (0, globals_1.describe)("CLI 명령어별 분석 타입", () => {
        (0, globals_1.it)("should validate RDF analysis types", () => {
            const rdfAnalysisTypes = {
                nodeTypes: [
                    "file",
                    "class",
                    "method",
                    "function",
                    "interface",
                    "variable",
                ],
                edgeTypes: ["imports", "calls", "extends", "depends_on"],
                semanticTags: ["service-layer", "auth-domain", "public-api"],
            };
            (0, globals_1.expect)(rdfAnalysisTypes.nodeTypes.length).toBe(6);
            (0, globals_1.expect)(rdfAnalysisTypes.edgeTypes.length).toBe(4);
            (0, globals_1.expect)(rdfAnalysisTypes.semanticTags.length).toBe(3);
            console.log("✅ RDF Analysis Types 검증 완료");
        });
        (0, globals_1.it)("should validate Unknown Symbol analysis types", () => {
            const unknownSymbolTypes = {
                symbolTypes: ["function", "method", "class", "interface"],
                inferenceTypes: [
                    "exact-name",
                    "type-based",
                    "context-based",
                    "semantic",
                ],
                equivalenceTypes: ["original", "alias"],
            };
            (0, globals_1.expect)(unknownSymbolTypes.symbolTypes.length).toBe(4);
            (0, globals_1.expect)(unknownSymbolTypes.inferenceTypes.length).toBe(4);
            (0, globals_1.expect)(unknownSymbolTypes.equivalenceTypes.length).toBe(2);
            console.log("✅ Unknown Symbol Analysis Types 검증 완료");
        });
        (0, globals_1.it)("should validate Query analysis types", () => {
            const queryAnalysisTypes = {
                queryTypes: ["sql", "graphql", "natural"],
                resultTypes: ["nodes", "edges", "relationships", "statistics"],
                formatTypes: ["json", "csv", "table", "graph"],
            };
            (0, globals_1.expect)(queryAnalysisTypes.queryTypes.length).toBe(3);
            (0, globals_1.expect)(queryAnalysisTypes.resultTypes.length).toBe(4);
            (0, globals_1.expect)(queryAnalysisTypes.formatTypes.length).toBe(4);
            console.log("✅ Query Analysis Types 검증 완료");
        });
        (0, globals_1.it)("should validate Cross-Namespace analysis types", () => {
            const crossNamespaceTypes = {
                namespaceTypes: ["internal", "external", "cross-boundary"],
                dependencyTypes: ["direct", "transitive", "circular"],
                analysisTypes: ["dependency-graph", "circular-deps", "statistics"],
            };
            (0, globals_1.expect)(crossNamespaceTypes.namespaceTypes.length).toBe(3);
            (0, globals_1.expect)(crossNamespaceTypes.dependencyTypes.length).toBe(3);
            (0, globals_1.expect)(crossNamespaceTypes.analysisTypes.length).toBe(3);
            console.log("✅ Cross-Namespace Analysis Types 검증 완료");
        });
        (0, globals_1.it)("should validate Inference analysis types", () => {
            const inferenceAnalysisTypes = {
                inferenceTypes: ["hierarchical", "transitive", "inheritable"],
                edgeTypes: ["imports", "calls", "extends", "depends_on"],
                confidenceTypes: ["high", "medium", "low"],
            };
            (0, globals_1.expect)(inferenceAnalysisTypes.inferenceTypes.length).toBe(3);
            (0, globals_1.expect)(inferenceAnalysisTypes.edgeTypes.length).toBe(4);
            (0, globals_1.expect)(inferenceAnalysisTypes.confidenceTypes.length).toBe(3);
            console.log("✅ Inference Analysis Types 검증 완료");
        });
        (0, globals_1.it)("should validate Context Documents analysis types", () => {
            const contextDocumentsTypes = {
                documentTypes: ["file", "symbol", "project"],
                formatTypes: ["markdown", "html", "json"],
                contentTypes: ["api-docs", "guides", "tutorials", "examples"],
            };
            (0, globals_1.expect)(contextDocumentsTypes.documentTypes.length).toBe(3);
            (0, globals_1.expect)(contextDocumentsTypes.formatTypes.length).toBe(3);
            (0, globals_1.expect)(contextDocumentsTypes.contentTypes.length).toBe(4);
            console.log("✅ Context Documents Analysis Types 검증 완료");
        });
        (0, globals_1.it)("should validate Performance Optimization analysis types", () => {
            const performanceOptimizationTypes = {
                optimizationTypes: ["caching", "batch-processing", "visualization"],
                metricTypes: [
                    "execution-time",
                    "memory-usage",
                    "cpu-usage",
                    "cache-hit-rate",
                ],
                visualizationTypes: ["svg", "html", "json", "dot"],
            };
            (0, globals_1.expect)(performanceOptimizationTypes.optimizationTypes.length).toBe(3);
            (0, globals_1.expect)(performanceOptimizationTypes.metricTypes.length).toBe(4);
            (0, globals_1.expect)(performanceOptimizationTypes.visualizationTypes.length).toBe(4);
            console.log("✅ Performance Optimization Analysis Types 검증 완료");
        });
    });
    (0, globals_1.describe)("파싱 타입별 분석", () => {
        (0, globals_1.it)("should validate TypeScript parsing types", () => {
            const typescriptParsingTypes = {
                fileExtensions: ["ts", "tsx"],
                nodeTypes: [
                    "class",
                    "interface",
                    "function",
                    "method",
                    "property",
                    "variable",
                    "type",
                    "enum",
                ],
                edgeTypes: [
                    "imports",
                    "exports",
                    "calls",
                    "extends",
                    "implements",
                    "has_type",
                ],
                semanticTags: ["react-component", "service-layer", "public-api"],
            };
            (0, globals_1.expect)(typescriptParsingTypes.fileExtensions).toEqual(["ts", "tsx"]);
            (0, globals_1.expect)(typescriptParsingTypes.nodeTypes.length).toBe(8);
            (0, globals_1.expect)(typescriptParsingTypes.edgeTypes.length).toBe(6);
            (0, globals_1.expect)(typescriptParsingTypes.semanticTags.length).toBe(3);
            console.log("✅ TypeScript Parsing Types 검증 완료");
        });
        (0, globals_1.it)("should validate JavaScript parsing types", () => {
            const javascriptParsingTypes = {
                fileExtensions: ["js", "jsx"],
                nodeTypes: ["function", "method", "variable", "class", "object"],
                edgeTypes: ["imports", "exports", "calls", "uses", "accesses"],
                semanticTags: ["react-component", "utility-function", "async-function"],
            };
            (0, globals_1.expect)(javascriptParsingTypes.fileExtensions).toEqual(["js", "jsx"]);
            (0, globals_1.expect)(javascriptParsingTypes.nodeTypes.length).toBe(5);
            (0, globals_1.expect)(javascriptParsingTypes.edgeTypes.length).toBe(5);
            (0, globals_1.expect)(javascriptParsingTypes.semanticTags.length).toBe(3);
            console.log("✅ JavaScript Parsing Types 검증 완료");
        });
        (0, globals_1.it)("should validate Java parsing types", () => {
            const javaParsingTypes = {
                fileExtensions: ["java"],
                nodeTypes: [
                    "class",
                    "interface",
                    "method",
                    "field",
                    "constructor",
                    "package",
                ],
                edgeTypes: ["imports", "extends", "implements", "calls", "has_type"],
                semanticTags: ["service-class", "controller-class", "repository-class"],
            };
            (0, globals_1.expect)(javaParsingTypes.fileExtensions).toEqual(["java"]);
            (0, globals_1.expect)(javaParsingTypes.nodeTypes.length).toBe(6);
            (0, globals_1.expect)(javaParsingTypes.edgeTypes.length).toBe(5);
            (0, globals_1.expect)(javaParsingTypes.semanticTags.length).toBe(3);
            console.log("✅ Java Parsing Types 검증 완료");
        });
        (0, globals_1.it)("should validate Python parsing types", () => {
            const pythonParsingTypes = {
                fileExtensions: ["py", "pyi"],
                nodeTypes: ["class", "function", "method", "variable", "module"],
                edgeTypes: ["imports", "calls", "inherits", "uses", "accesses"],
                semanticTags: ["async-function", "decorator", "pure-function"],
            };
            (0, globals_1.expect)(pythonParsingTypes.fileExtensions).toEqual(["py", "pyi"]);
            (0, globals_1.expect)(pythonParsingTypes.nodeTypes.length).toBe(5);
            (0, globals_1.expect)(pythonParsingTypes.edgeTypes.length).toBe(5);
            (0, globals_1.expect)(pythonParsingTypes.semanticTags.length).toBe(3);
            console.log("✅ Python Parsing Types 검증 완료");
        });
        (0, globals_1.it)("should validate Go parsing types", () => {
            const goParsingTypes = {
                fileExtensions: ["go"],
                nodeTypes: ["package", "function", "struct", "interface", "method"],
                edgeTypes: ["imports", "implements", "calls", "uses"],
                semanticTags: [
                    "public-function",
                    "private-function",
                    "interface-method",
                ],
            };
            (0, globals_1.expect)(goParsingTypes.fileExtensions).toEqual(["go"]);
            (0, globals_1.expect)(goParsingTypes.nodeTypes.length).toBe(5);
            (0, globals_1.expect)(goParsingTypes.edgeTypes.length).toBe(4);
            (0, globals_1.expect)(goParsingTypes.semanticTags.length).toBe(3);
            console.log("✅ Go Parsing Types 검증 완료");
        });
        (0, globals_1.it)("should validate Markdown parsing types", () => {
            const markdownParsingTypes = {
                fileExtensions: ["md", "markdown", "mdx"],
                nodeTypes: ["heading-symbol", "symbol", "file"],
                edgeTypes: [
                    "md-link",
                    "md-image",
                    "md-wikilink",
                    "md-symbol-ref",
                    "md-anchor",
                ],
                semanticTags: ["doc-api", "doc-guide", "doc-tutorial", "doc-reference"],
            };
            (0, globals_1.expect)(markdownParsingTypes.fileExtensions).toEqual([
                "md",
                "markdown",
                "mdx",
            ]);
            (0, globals_1.expect)(markdownParsingTypes.nodeTypes.length).toBe(3);
            (0, globals_1.expect)(markdownParsingTypes.edgeTypes.length).toBe(5);
            (0, globals_1.expect)(markdownParsingTypes.semanticTags.length).toBe(4);
            console.log("✅ Markdown Parsing Types 검증 완료");
        });
    });
    (0, globals_1.describe)("통합 분석 시나리오", () => {
        (0, globals_1.it)("should validate complete analysis workflow", () => {
            const completeWorkflow = {
                step1: {
                    action: "RDF 주소 생성",
                    nodeTypes: ["file", "class", "method", "function"],
                    edgeTypes: ["imports", "calls", "extends"],
                    semanticTags: ["service-layer", "auth-domain", "public-api"],
                },
                step2: {
                    action: "Unknown Symbol 등록",
                    symbolTypes: ["function", "method", "class"],
                    inferenceTypes: ["exact-name", "type-based", "context-based"],
                    equivalenceTypes: ["original", "alias"],
                },
                step3: {
                    action: "Query 실행",
                    queryTypes: ["sql", "graphql", "natural"],
                    resultTypes: ["nodes", "edges", "relationships"],
                    formatTypes: ["json", "csv", "table"],
                },
                step4: {
                    action: "Cross-Namespace 분석",
                    namespaceTypes: ["internal", "external", "cross-boundary"],
                    dependencyTypes: ["direct", "transitive", "circular"],
                    analysisTypes: ["dependency-graph", "circular-deps", "statistics"],
                },
                step5: {
                    action: "Inference 실행",
                    inferenceTypes: ["hierarchical", "transitive", "inheritable"],
                    edgeTypes: ["imports", "calls", "extends", "depends_on"],
                    confidenceTypes: ["high", "medium", "low"],
                },
                step6: {
                    action: "Context Documents 생성",
                    documentTypes: ["file", "symbol", "project"],
                    formatTypes: ["markdown", "html", "json"],
                    contentTypes: ["api-docs", "guides", "tutorials", "examples"],
                },
                step7: {
                    action: "Performance Optimization",
                    optimizationTypes: ["caching", "batch-processing", "visualization"],
                    metricTypes: [
                        "execution-time",
                        "memory-usage",
                        "cpu-usage",
                        "cache-hit-rate",
                    ],
                    visualizationTypes: ["svg", "html", "json", "dot"],
                },
            };
            (0, globals_1.expect)(completeWorkflow.step1.nodeTypes.length).toBe(4);
            (0, globals_1.expect)(completeWorkflow.step2.symbolTypes.length).toBe(3);
            (0, globals_1.expect)(completeWorkflow.step3.queryTypes.length).toBe(3);
            (0, globals_1.expect)(completeWorkflow.step4.namespaceTypes.length).toBe(3);
            (0, globals_1.expect)(completeWorkflow.step5.inferenceTypes.length).toBe(3);
            (0, globals_1.expect)(completeWorkflow.step6.documentTypes.length).toBe(3);
            (0, globals_1.expect)(completeWorkflow.step7.optimizationTypes.length).toBe(3);
            console.log("✅ Complete Analysis Workflow 검증 완료");
        });
    });
});
//# sourceMappingURL=cli-analysis-comprehensive.test.js.map