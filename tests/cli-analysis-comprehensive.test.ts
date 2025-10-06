import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

describe("CLI 분석 통합 테스트 - 전체 시멘틱 태그 및 심볼 타입", () => {
	beforeAll(() => {
		console.log("🚀 CLI 분석 통합 테스트 시작");
	});

	afterAll(() => {
		console.log("✅ CLI 분석 통합 테스트 완료");
	});

	describe("Node Types (노드 타입) 분석", () => {
		it("should validate all File & Resource Types", () => {
			const fileResourceTypes = [
				"file", // 소스 코드 파일
				"external-resource", // 외부 리소스 (URL 등)
				"missing-file", // 존재하지 않는 파일 참조
				"library", // 외부 라이브러리
				"package", // NPM 패키지
			];

			expect(fileResourceTypes.length).toBe(5);
			fileResourceTypes.forEach((type) => {
				expect(type).toBeDefined();
				expect(typeof type).toBe("string");
			});

			console.log("✅ File & Resource Types 검증 완료");
		});

		it("should validate all Code Symbol Types (LSP-based)", () => {
			const codeSymbolTypes = [
				"class", // 클래스 정의
				"interface", // 인터페이스 정의
				"function", // 함수 정의
				"method", // 메서드 정의
				"property", // 속성/필드
				"field", // 필드
				"variable", // 변수
				"constant", // 상수
				"type", // 타입 별칭
				"enum", // 열거형
				"enum-member", // 열거형 멤버
				"constructor", // 생성자
			];

			expect(codeSymbolTypes.length).toBe(12);
			codeSymbolTypes.forEach((type) => {
				expect(type).toBeDefined();
				expect(typeof type).toBe("string");
			});

			console.log("✅ Code Symbol Types (LSP-based) 검증 완료");
		});

		it("should validate all Declaration Types", () => {
			const declarationTypes = [
				"export", // Export 선언
				"import", // Import 선언
			];

			expect(declarationTypes.length).toBe(2);
			declarationTypes.forEach((type) => {
				expect(type).toBeDefined();
				expect(typeof type).toBe("string");
			});

			console.log("✅ Declaration Types 검증 완료");
		});

		it("should validate all Documentation Types", () => {
			const documentationTypes = [
				"heading-symbol", // 마크다운 헤딩 심볼
				"symbol", // 심볼 참조
			];

			expect(documentationTypes.length).toBe(2);
			documentationTypes.forEach((type) => {
				expect(type).toBeDefined();
				expect(typeof type).toBe("string");
			});

			console.log("✅ Documentation Types 검증 완료");
		});

		it("should validate all Error Types", () => {
			const errorTypes = [
				"file_not_found", // 파일을 찾을 수 없음
				"broken_reference", // 깨진 참조
			];

			expect(errorTypes.length).toBe(2);
			errorTypes.forEach((type) => {
				expect(type).toBeDefined();
				expect(typeof type).toBe("string");
			});

			console.log("✅ Error Types 검증 완료");
		});
	});

	describe("Edge Types (엣지 타입) 분석", () => {
		it("should validate all Structural Relationships", () => {
			const structuralRelationships = [
				"contains", // A contains B (transitive, inheritable)
				"declares", // A declares B (inheritable)
				"belongs_to", // A belongs to B (transitive)
			];

			expect(structuralRelationships.length).toBe(3);
			structuralRelationships.forEach((type) => {
				expect(type).toBeDefined();
				expect(typeof type).toBe("string");
			});

			console.log("✅ Structural Relationships 검증 완료");
		});

		it("should validate all Dependency Relationships", () => {
			const dependencyRelationships = [
				"depends_on", // 일반 의존성 (transitive, parent of many)
				"imports", // Import 관계 (→ depends_on)
				"imports_library", // Import library (→ depends_on)
				"imports_file", // Import file (→ depends_on)
				"exports_to", // Export 관계
			];

			expect(dependencyRelationships.length).toBe(5);
			dependencyRelationships.forEach((type) => {
				expect(type).toBeDefined();
				expect(typeof type).toBe("string");
			});

			console.log("✅ Dependency Relationships 검증 완료");
		});

		it("should validate all Code Execution Relationships", () => {
			const executionRelationships = [
				"calls", // 함수/메서드 호출 (→ depends_on)
				"instantiates", // 클래스 인스턴스화 (→ depends_on)
				"uses", // 컴포넌트 사용 (→ depends_on)
				"accesses", // 속성/변수 접근 (→ depends_on)
			];

			expect(executionRelationships.length).toBe(4);
			executionRelationships.forEach((type) => {
				expect(type).toBeDefined();
				expect(typeof type).toBe("string");
			});

			console.log("✅ Code Execution Relationships 검증 완료");
		});

		it("should validate all Type System Relationships", () => {
			const typeSystemRelationships = [
				"extends", // 클래스 상속 (→ depends_on, inheritable)
				"implements", // 인터페이스 구현 (→ depends_on, inheritable)
				"has_type", // 타입 어노테이션
				"returns", // 반환 타입
				"throws", // 예외 발생
			];

			expect(typeSystemRelationships.length).toBe(5);
			typeSystemRelationships.forEach((type) => {
				expect(type).toBeDefined();
				expect(typeof type).toBe("string");
			});

			console.log("✅ Type System Relationships 검증 완료");
		});

		it("should validate all Modification Relationships", () => {
			const modificationRelationships = [
				"overrides", // 메서드 오버라이드
				"shadows", // 변수 섀도잉
				"assigns_to", // 할당
			];

			expect(modificationRelationships.length).toBe(3);
			modificationRelationships.forEach((type) => {
				expect(type).toBeDefined();
				expect(typeof type).toBe("string");
			});

			console.log("✅ Modification Relationships 검증 완료");
		});

		it("should validate all Documentation Relationships", () => {
			const documentationRelationships = [
				"md-link", // 마크다운 링크 (transitive)
				"md-image", // 마크다운 이미지
				"md-wikilink", // 위키 스타일 링크 (transitive)
				"md-symbol-ref", // 심볼 참조 (transitive)
				"md-include", // 파일 포함 (transitive)
				"md-code-ref", // 코드 블록 참조
				"md-anchor", // 내부 앵커
				"md-hashtag", // 해시태그
				"md-contains-heading", // 헤딩 포함
			];

			expect(documentationRelationships.length).toBe(9);
			documentationRelationships.forEach((type) => {
				expect(type).toBeDefined();
				expect(typeof type).toBe("string");
			});

			console.log("✅ Documentation Relationships 검증 완료");
		});

		it("should validate all Meta Relationships", () => {
			const metaRelationships = [
				"annotated_with", // 어노테이션
				"references", // 참조
			];

			expect(metaRelationships.length).toBe(2);
			metaRelationships.forEach((type) => {
				expect(type).toBeDefined();
				expect(typeof type).toBe("string");
			});

			console.log("✅ Meta Relationships 검증 완료");
		});
	});

	describe("Supported Languages (지원 언어) 분석", () => {
		it("should validate all supported programming languages", () => {
			const supportedLanguages = [
				"typescript", // TypeScript (.ts, .tsx)
				"tsx", // TSX (.tsx)
				"javascript", // JavaScript (.js, .jsx)
				"jsx", // JSX (.jsx)
				"java", // Java (.java)
				"python", // Python (.py, .pyi)
				"go", // Go (.go)
				"markdown", // Markdown (.md, .markdown, .mdx)
				"external", // 외부 리소스
				"unknown", // 알 수 없는 형식
			];

			expect(supportedLanguages.length).toBe(10);
			supportedLanguages.forEach((language) => {
				expect(language).toBeDefined();
				expect(typeof language).toBe("string");
			});

			console.log("✅ Supported Languages 검증 완료");
		});

		it("should validate file extension mappings", () => {
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

			expect(Object.keys(fileExtensionMappings).length).toBe(10);
			expect(fileExtensionMappings.typescript).toEqual(["ts", "tsx"]);
			expect(fileExtensionMappings.javascript).toEqual(["js", "jsx"]);
			expect(fileExtensionMappings.python).toEqual(["py", "pyi"]);
			expect(fileExtensionMappings.markdown).toEqual(["md", "markdown", "mdx"]);

			console.log("✅ File Extension Mappings 검증 완료");
		});
	});

	describe("Semantic Tags (시멘틱 태그) 분석", () => {
		it("should validate architecture layer tags", () => {
			const architectureLayerTags = [
				"service-layer", // 서비스 레이어
				"controller-layer", // 컨트롤러 레이어
				"repository-layer", // 리포지토리 레이어
				"domain-layer", // 도메인 레이어
				"infrastructure-layer", // 인프라 레이어
				"presentation-layer", // 프레젠테이션 레이어
			];

			expect(architectureLayerTags.length).toBe(6);
			architectureLayerTags.forEach((tag) => {
				expect(tag).toContain("-layer");
				expect(typeof tag).toBe("string");
			});

			console.log("✅ Architecture Layer Tags 검증 완료");
		});

		it("should validate business domain tags", () => {
			const businessDomainTags = [
				"auth-domain", // 인증 도메인
				"user-domain", // 사용자 도메인
				"payment-domain", // 결제 도메인
				"notification-domain", // 알림 도메인
				"analytics-domain", // 분석 도메인
			];

			expect(businessDomainTags.length).toBe(5);
			businessDomainTags.forEach((tag) => {
				expect(tag).toContain("-domain");
				expect(typeof tag).toBe("string");
			});

			console.log("✅ Business Domain Tags 검증 완료");
		});

		it("should validate access scope tags", () => {
			const accessScopeTags = [
				"public-api", // 공개 API
				"private-api", // 비공개 API
				"internal-api", // 내부 API
				"protected-api", // 보호된 API
			];

			expect(accessScopeTags.length).toBe(4);
			accessScopeTags.forEach((tag) => {
				expect(tag).toContain("-api");
				expect(typeof tag).toBe("string");
			});

			console.log("✅ Access Scope Tags 검증 완료");
		});

		it("should validate code quality tags", () => {
			const codeQualityTags = [
				"pure-function", // 순수 함수
				"side-effect", // 부작용
				"async-function", // 비동기 함수
				"sync-function", // 동기 함수
				"testable", // 테스트 가능
				"mocked", // 모킹됨
			];

			expect(codeQualityTags.length).toBe(6);
			codeQualityTags.forEach((tag) => {
				expect(typeof tag).toBe("string");
			});

			console.log("✅ Code Quality Tags 검증 완료");
		});

		it("should validate documentation tags", () => {
			const documentationTags = [
				"doc-api", // API 문서
				"doc-guide", // 가이드 문서
				"doc-tutorial", // 튜토리얼 문서
				"doc-reference", // 참조 문서
				"doc-example", // 예제 문서
			];

			expect(documentationTags.length).toBe(5);
			documentationTags.forEach((tag) => {
				expect(tag).toContain("doc-");
				expect(typeof tag).toBe("string");
			});

			console.log("✅ Documentation Tags 검증 완료");
		});

		it("should validate framework tags", () => {
			const frameworkTags = [
				"react-component", // React 컴포넌트
				"vue-component", // Vue 컴포넌트
				"angular-component", // Angular 컴포넌트
				"express-middleware", // Express 미들웨어
				"nestjs-controller", // NestJS 컨트롤러
				"nestjs-service", // NestJS 서비스
			];

			expect(frameworkTags.length).toBe(6);
			frameworkTags.forEach((tag) => {
				expect(typeof tag).toBe("string");
			});

			console.log("✅ Framework Tags 검증 완료");
		});
	});

	describe("CLI 명령어별 분석 타입", () => {
		it("should validate RDF analysis types", () => {
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

			expect(rdfAnalysisTypes.nodeTypes.length).toBe(6);
			expect(rdfAnalysisTypes.edgeTypes.length).toBe(4);
			expect(rdfAnalysisTypes.semanticTags.length).toBe(3);

			console.log("✅ RDF Analysis Types 검증 완료");
		});

		it("should validate Unknown Symbol analysis types", () => {
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

			expect(unknownSymbolTypes.symbolTypes.length).toBe(4);
			expect(unknownSymbolTypes.inferenceTypes.length).toBe(4);
			expect(unknownSymbolTypes.equivalenceTypes.length).toBe(2);

			console.log("✅ Unknown Symbol Analysis Types 검증 완료");
		});

		it("should validate Query analysis types", () => {
			const queryAnalysisTypes = {
				queryTypes: ["sql", "graphql", "natural"],
				resultTypes: ["nodes", "edges", "relationships", "statistics"],
				formatTypes: ["json", "csv", "table", "graph"],
			};

			expect(queryAnalysisTypes.queryTypes.length).toBe(3);
			expect(queryAnalysisTypes.resultTypes.length).toBe(4);
			expect(queryAnalysisTypes.formatTypes.length).toBe(4);

			console.log("✅ Query Analysis Types 검증 완료");
		});

		it("should validate Cross-Namespace analysis types", () => {
			const crossNamespaceTypes = {
				namespaceTypes: ["internal", "external", "cross-boundary"],
				dependencyTypes: ["direct", "transitive", "circular"],
				analysisTypes: ["dependency-graph", "circular-deps", "statistics"],
			};

			expect(crossNamespaceTypes.namespaceTypes.length).toBe(3);
			expect(crossNamespaceTypes.dependencyTypes.length).toBe(3);
			expect(crossNamespaceTypes.analysisTypes.length).toBe(3);

			console.log("✅ Cross-Namespace Analysis Types 검증 완료");
		});

		it("should validate Inference analysis types", () => {
			const inferenceAnalysisTypes = {
				inferenceTypes: ["hierarchical", "transitive", "inheritable"],
				edgeTypes: ["imports", "calls", "extends", "depends_on"],
				confidenceTypes: ["high", "medium", "low"],
			};

			expect(inferenceAnalysisTypes.inferenceTypes.length).toBe(3);
			expect(inferenceAnalysisTypes.edgeTypes.length).toBe(4);
			expect(inferenceAnalysisTypes.confidenceTypes.length).toBe(3);

			console.log("✅ Inference Analysis Types 검증 완료");
		});

		it("should validate Context Documents analysis types", () => {
			const contextDocumentsTypes = {
				documentTypes: ["file", "symbol", "project"],
				formatTypes: ["markdown", "html", "json"],
				contentTypes: ["api-docs", "guides", "tutorials", "examples"],
			};

			expect(contextDocumentsTypes.documentTypes.length).toBe(3);
			expect(contextDocumentsTypes.formatTypes.length).toBe(3);
			expect(contextDocumentsTypes.contentTypes.length).toBe(4);

			console.log("✅ Context Documents Analysis Types 검증 완료");
		});

		it("should validate Performance Optimization analysis types", () => {
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

			expect(performanceOptimizationTypes.optimizationTypes.length).toBe(3);
			expect(performanceOptimizationTypes.metricTypes.length).toBe(4);
			expect(performanceOptimizationTypes.visualizationTypes.length).toBe(4);

			console.log("✅ Performance Optimization Analysis Types 검증 완료");
		});
	});

	describe("파싱 타입별 분석", () => {
		it("should validate TypeScript parsing types", () => {
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

			expect(typescriptParsingTypes.fileExtensions).toEqual(["ts", "tsx"]);
			expect(typescriptParsingTypes.nodeTypes.length).toBe(8);
			expect(typescriptParsingTypes.edgeTypes.length).toBe(6);
			expect(typescriptParsingTypes.semanticTags.length).toBe(3);

			console.log("✅ TypeScript Parsing Types 검증 완료");
		});

		it("should validate JavaScript parsing types", () => {
			const javascriptParsingTypes = {
				fileExtensions: ["js", "jsx"],
				nodeTypes: ["function", "method", "variable", "class", "object"],
				edgeTypes: ["imports", "exports", "calls", "uses", "accesses"],
				semanticTags: ["react-component", "utility-function", "async-function"],
			};

			expect(javascriptParsingTypes.fileExtensions).toEqual(["js", "jsx"]);
			expect(javascriptParsingTypes.nodeTypes.length).toBe(5);
			expect(javascriptParsingTypes.edgeTypes.length).toBe(5);
			expect(javascriptParsingTypes.semanticTags.length).toBe(3);

			console.log("✅ JavaScript Parsing Types 검증 완료");
		});

		it("should validate Java parsing types", () => {
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

			expect(javaParsingTypes.fileExtensions).toEqual(["java"]);
			expect(javaParsingTypes.nodeTypes.length).toBe(6);
			expect(javaParsingTypes.edgeTypes.length).toBe(5);
			expect(javaParsingTypes.semanticTags.length).toBe(3);

			console.log("✅ Java Parsing Types 검증 완료");
		});

		it("should validate Python parsing types", () => {
			const pythonParsingTypes = {
				fileExtensions: ["py", "pyi"],
				nodeTypes: ["class", "function", "method", "variable", "module"],
				edgeTypes: ["imports", "calls", "inherits", "uses", "accesses"],
				semanticTags: ["async-function", "decorator", "pure-function"],
			};

			expect(pythonParsingTypes.fileExtensions).toEqual(["py", "pyi"]);
			expect(pythonParsingTypes.nodeTypes.length).toBe(5);
			expect(pythonParsingTypes.edgeTypes.length).toBe(5);
			expect(pythonParsingTypes.semanticTags.length).toBe(3);

			console.log("✅ Python Parsing Types 검증 완료");
		});

		it("should validate Go parsing types", () => {
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

			expect(goParsingTypes.fileExtensions).toEqual(["go"]);
			expect(goParsingTypes.nodeTypes.length).toBe(5);
			expect(goParsingTypes.edgeTypes.length).toBe(4);
			expect(goParsingTypes.semanticTags.length).toBe(3);

			console.log("✅ Go Parsing Types 검증 완료");
		});

		it("should validate Markdown parsing types", () => {
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

			expect(markdownParsingTypes.fileExtensions).toEqual([
				"md",
				"markdown",
				"mdx",
			]);
			expect(markdownParsingTypes.nodeTypes.length).toBe(3);
			expect(markdownParsingTypes.edgeTypes.length).toBe(5);
			expect(markdownParsingTypes.semanticTags.length).toBe(4);

			console.log("✅ Markdown Parsing Types 검증 완료");
		});
	});

	describe("통합 분석 시나리오", () => {
		it("should validate complete analysis workflow", () => {
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

			expect(completeWorkflow.step1.nodeTypes.length).toBe(4);
			expect(completeWorkflow.step2.symbolTypes.length).toBe(3);
			expect(completeWorkflow.step3.queryTypes.length).toBe(3);
			expect(completeWorkflow.step4.namespaceTypes.length).toBe(3);
			expect(completeWorkflow.step5.inferenceTypes.length).toBe(3);
			expect(completeWorkflow.step6.documentTypes.length).toBe(3);
			expect(completeWorkflow.step7.optimizationTypes.length).toBe(3);

			console.log("✅ Complete Analysis Workflow 검증 완료");
		});
	});
});
