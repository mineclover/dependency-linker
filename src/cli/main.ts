/**
 * Clean CLI Entry Point
 * 핸들러 기반 아키텍처로 구성된 깔끔한 CLI
 */

import { Command } from "commander";
import { glob } from "glob";

// 핸들러 임포트
import {
	runMarkdownAnalysis,
	runLinkTracking,
	runHeadingExtraction,
	runTagCollection,
	runTagHeadingMapping,
	runTagDocumentGeneration,
	runTagTypeValidation,
	runTagTypeDocumentGeneration,
} from "./handlers/markdown-handler.js";
import {
	runTypeScriptAnalysis,
	runTypeScriptProjectAnalysis,
	runTypeScriptPerformanceBenchmark,
} from "./handlers/typescript-handler.js";
import { RDFHandler, UnknownSymbolHandler, QueryHandler, CrossNamespaceHandler, InferenceHandler, ContextDocumentsHandler, PerformanceOptimizationHandler, HandlerFactory } from "./handlers/index.js";
import { RDFFileHandler } from "./handlers/rdf-file-handler.js";

// 네임스페이스 및 RDF 관련 임포트
import {
	runNamespaceAnalysis,
} from "../namespace/analysis-namespace.js";
import {
	createRDFAddress,
	validateRDFAddress,
} from "../core/RDFAddress.js";
import { RDFDatabaseAPI } from "../api/rdf-database-integration.js";

// 네임스페이스 최적화
import { NamespaceOptimizer } from "../cli/namespace-optimizer.js";

const program = new Command();

program
	.name("dependency-linker")
	.description("Advanced dependency analysis tool")
	.version("2.1.0");

// ============================================================================
// 기본 분석 명령어
// ============================================================================

program
	.command("analyze")
	.description("Analyze files for dependencies")
	.option("-p, --pattern <pattern>", "File pattern to analyze", "src/**/*.ts")
	.option("-d, --directory <dir>", "Directory to analyze", ".")
	.option("-t, --type <type>", "Analysis type", "fixed")
	.option("--performance", "Enable performance optimizations")
	.option("--max-concurrency <num>", "Max concurrent files", "4")
	.option("--batch-size <num>", "Batch size for processing", "10")
	.option("--memory-limit <mb>", "Memory limit in MB", "1024")
	.option("-o, --output <file>", "Output file")
	.option("--format <format>", "Output format", "json")
	.option("--include-statistics", "Include detailed statistics")
	.action(async (options) => {
		try {
			console.log("🔍 Running analysis...\n");

			// 파일 패턴으로 파일 찾기
			const files = await glob(options.pattern, { cwd: options.directory });

			if (files.length === 0) {
				console.log("❌ No files found matching the pattern");
				return;
			}

			console.log(`📁 Found ${files.length} files to analyze`);

			// TypeScript 프로젝트 분석 실행
			await runTypeScriptProjectAnalysis(options.pattern, {
				performance: options.performance,
				maxConcurrency: options.maxConcurrency,
				batchSize: options.batchSize,
				memoryLimit: options.memoryLimit,
				output: options.output,
				format: options.format,
				includeStatistics: options.includeStatistics,
			});

			console.log(`\n✅ Analysis completed`);
		} catch (error) {
			console.error("❌ Analysis failed:", error);
			process.exit(1);
		}
	});

// ============================================================================
// 마크다운 분석 명령어
// ============================================================================

program
	.command("markdown")
	.description("Markdown analysis commands")
	.option("-n, --name <namespace>", "Namespace name")
	.option("-a, --action <action>", "Action to perform", "analysis")
	.action(async (options) => {
		if (!options.name) {
			console.log("❌ Please specify --name <namespace>");
			process.exit(1);
		}

		try {
			switch (options.action) {
				case "analysis":
					await runMarkdownAnalysis(options.name);
					break;
				case "links":
					await runLinkTracking(options.name);
					break;
				case "headings":
					await runHeadingExtraction(options.name);
					break;
				case "tags":
					await runTagCollection(options.name);
					break;
				case "mapping":
					await runTagHeadingMapping(options.name);
					break;
				case "document":
					await runTagDocumentGeneration(options.name);
					break;
				case "validation":
					await runTagTypeValidation(options.name);
					break;
				case "type-doc":
					await runTagTypeDocumentGeneration(options.name);
					break;
				default:
					console.log(
						"❌ Unknown action. Available: analysis, links, headings, tags, mapping, document, validation, type-doc",
					);
					process.exit(1);
			}
		} catch (error) {
			console.error(`❌ Markdown ${options.action} failed:`, error);
			process.exit(1);
		}
	});

// ============================================================================
// TypeScript 분석 명령어
// ============================================================================

program
	.command("typescript")
	.description("TypeScript analysis commands")
	.option("-f, --file <file>", "File to analyze")
	.option("-p, --pattern <pattern>", "File pattern to analyze")
	.option("-t, --type <type>", "Analysis type", "fixed")
	.option("--performance", "Enable performance optimizations")
	.option("-o, --output <file>", "Output file")
	.option("--format <format>", "Output format", "json")
	.option("--include-statistics", "Include detailed statistics")
	.action(async (options) => {
		try {
			if (options.file) {
				// 단일 파일 분석
				await runTypeScriptAnalysis(options.file, {
					analysisType: options.type,
					performance: options.performance,
					output: options.output,
					format: options.format,
					includeStatistics: options.includeStatistics,
				});
			} else if (options.pattern) {
				// 패턴 기반 분석
				await runTypeScriptProjectAnalysis(options.pattern, {
					performance: options.performance,
					output: options.output,
					format: options.format,
					includeStatistics: options.includeStatistics,
				});
			} else {
				console.log("❌ Please specify either --file or --pattern");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ TypeScript analysis failed:", error);
			process.exit(1);
		}
	});

// ============================================================================
// 성능 벤치마크 명령어
// ============================================================================

program
	.command("benchmark")
	.description("Performance benchmark")
	.option("-n, --name <name>", "Benchmark name", "default")
	.option("-t, --type <type>", "Benchmark type", "typescript")
	.action(async (options) => {
		try {
			if (options.type === "typescript") {
				await runTypeScriptPerformanceBenchmark(options.name);
			} else {
				console.log("❌ Unknown benchmark type. Available: typescript");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Benchmark failed:", error);
			process.exit(1);
		}
	});

// ============================================================================
// 네임스페이스 관리 명령어
// ============================================================================

program
	.command("namespace")
	.description("Namespace management")
	.option("-l, --list", "List namespaces")
	.option("-n, --name <name>", "Namespace name")
	.option("-a, --all", "Run all namespaces")
	.option("-o, --optimize", "Optimize namespace")
	.action(async (options) => {
		try {
			if (options.list) {
				console.log("📋 Available namespaces:");
				console.log("   - source: Source code analysis");
				console.log("   - markdown: Markdown analysis");
				console.log("   - typescript: TypeScript analysis");
			} else if (options.name) {
				await runNamespaceAnalysis(options.name);
			} else if (options.all) {
				const namespaces = ["source", "markdown", "typescript"];
				for (const ns of namespaces) {
					console.log(`\n🔄 Running namespace: ${ns}`);
					await runNamespaceAnalysis(ns);
				}
			} else if (options.optimize) {
				console.log("🔧 Namespace optimization is not yet implemented");
			} else {
				console.log(
					"❌ Please specify an action: --list, --name, --all, or --optimize",
				);
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Namespace operation failed:", error);
			process.exit(1);
		}
	});

// ============================================================================
// RDF 관련 명령어
// ============================================================================

program
	.command("rdf")
	.description("RDF operations")
	.option("-c, --create", "Create RDF address")
	.option("-p, --project <project>", "Project name")
	.option("-f, --file <file>", "File path")
	.option("-t, --type <type>", "Node type")
	.option("-s, --symbol <symbol>", "Symbol name")
	.option("-q, --query <query>", "Search query")
	.option("-n, --namespace <namespace>", "Namespace name")
	.option("-v, --validate", "Validate RDF address")
	.option("-a, --address <address>", "RDF address to validate")
	.option("--uniqueness", "Check uniqueness")
	.option("--stats", "Show RDF statistics")
	.option("--by-type", "Group statistics by type")
	.option("--all", "Show all statistics")
	.action(async (options) => {
		const handler = new RDFHandler();
		try {
			// RDF 주소 생성
			if (options.create) {
				if (!options.project || !options.file || !options.type || !options.symbol) {
					console.log("❌ Please specify --project, --file, --type, and --symbol");
					process.exit(1);
				}
				await handler.createRDFAddress({
					project: options.project,
					file: options.file,
					type: options.type,
					symbol: options.symbol
				});
			}
			// RDF 주소 검색
			else if (options.query) {
				await handler.searchRDFAddresses({
					query: options.query,
					namespace: options.namespace,
					project: options.project,
					file: options.file,
					type: options.type
				});
			}
			// RDF 주소 검증
			else if (options.validate) {
				await handler.validateRDFAddress({
					address: options.address,
					namespace: options.namespace,
					uniqueness: options.uniqueness
				});
			}
			// RDF 통계
			else if (options.stats) {
				await handler.generateRDFStatistics({
					namespace: options.namespace,
					project: options.project,
					all: options.all,
					byType: options.byType
				});
			}
			else {
				console.log("❌ Please specify an RDF operation (--create, --query, --validate, --stats)");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ RDF operation failed:", error);
			process.exit(1);
		}
	});

// ============================================================================
// Query System 명령어
// ============================================================================

program
	.command("query")
	.description("Query System 관리")
	.option("-s, --sql <query>", "SQL 쿼리 실행")
	.option("-g, --graphql <query>", "GraphQL 쿼리 실행")
	.option("-n, --natural <query>", "자연어 쿼리 실행")
	.option("-a, --auto <query>", "자동 쿼리 타입 감지 및 실행")
	.option("-r, --realtime", "실시간 쿼리 등록")
	.option("--query-type <type>", "쿼리 타입 (SQL, GraphQL, NaturalLanguage)")
	.option("--client-id <id>", "클라이언트 ID")
	.option("--subscribe", "실시간 쿼리 구독")
	.option("--query-id <id>", "쿼리 ID")
	.option("--event-type <type>", "이벤트 타입 (data, error, complete)")
	.option("--stats", "쿼리 성능 통계")
	.option("--cache <action>", "캐시 관리 (clear, stats, optimize)")
	.option("--data-source <source>", "데이터 소스")
	.action(async (options) => {
		const handler = new QueryHandler();
		try {
			await handler.initialize();

			// SQL 쿼리 실행
			if (options.sql) {
				await handler.executeSQLQuery(options.sql, options.dataSource || {});
			}
			// GraphQL 쿼리 실행
			else if (options.graphql) {
				await handler.executeGraphQLQuery(options.graphql, options.dataSource || {});
			}
			// 자연어 쿼리 실행
			else if (options.natural) {
				await handler.executeNaturalLanguageQuery(options.natural, options.dataSource || {});
			}
			// 자동 쿼리 실행
			else if (options.auto) {
				await handler.executeQuery(options.auto, options.dataSource || {});
			}
			// 실시간 쿼리 등록
			else if (options.realtime) {
				if (!options.queryType || !options.clientId) {
					console.log("❌ Please specify --query-type and --client-id");
					process.exit(1);
				}
				await handler.registerRealtimeQuery(
					options.auto || options.sql || options.graphql || options.natural,
					options.queryType,
					options.clientId,
					options.dataSource || {}
				);
			}
			// 실시간 쿼리 구독
			else if (options.subscribe) {
				if (!options.queryId || !options.clientId || !options.eventType) {
					console.log("❌ Please specify --query-id, --client-id, and --event-type");
					process.exit(1);
				}
				await handler.subscribeToRealtimeQuery(
					options.queryId,
					options.clientId,
					options.eventType
				);
			}
			// 쿼리 통계
			else if (options.stats) {
				await handler.getQueryStatistics();
			}
			// 캐시 관리
			else if (options.cache) {
				await handler.manageCache(options.cache);
			}
			else {
				console.log("❌ Please specify a query operation (--sql, --graphql, --natural, --auto, --realtime, --subscribe, --stats, --cache)");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Query operation failed:", error);
			process.exit(1);
		} finally {
			await handler.close();
		}
	});

// ============================================================================
// Cross-Namespace Dependencies 명령어
// ============================================================================

program
	.command("cross-namespace")
	.description("Cross-Namespace Dependencies 관리")
	.option("-n, --namespace <name>", "단일 네임스페이스 분석")
	.option("-m, --multiple <names>", "다중 네임스페이스 분석 (쉼표로 구분)")
	.option("-a, --all", "전체 네임스페이스 분석")
	.option("-c, --cross", "Cross-Namespace 의존성 조회")
	.option("-s, --source <namespace>", "소스 네임스페이스 필터")
	.option("-t, --target <namespace>", "타겟 네임스페이스 필터")
	.option("--circular", "순환 의존성 조회")
	.option("--circular-namespace <name>", "특정 네임스페이스 순환 의존성 조회")
	.option("--stats", "통계 생성")
	.option("--include-cross", "Cross-Namespace 의존성 포함")
	.option("--include-circular", "순환 의존성 포함")
	.option("--include-graph", "그래프 통계 포함")
	.option("--config <path>", "설정 파일 경로")
	.option("--project-root <path>", "프로젝트 루트 경로")
	.option("--cwd <path>", "작업 디렉토리")
	.option("--max-concurrency <number>", "최대 동시 실행 수")
	.option("--enable-caching", "캐싱 활성화")
	.action(async (options) => {
		const handler = new CrossNamespaceHandler({
			configPath: options.config,
			projectRoot: options.projectRoot,
			cwd: options.cwd,
			maxConcurrency: options.maxConcurrency ? parseInt(options.maxConcurrency) : undefined,
			enableCaching: options.enableCaching,
		});

		try {
			await handler.initialize();

			// 단일 네임스페이스 분석
			if (options.namespace) {
				await handler.analyzeNamespace(options.namespace, {
					includeCrossDependencies: options.includeCross,
					includeCircularDependencies: options.includeCircular,
				});
			}
			// 다중 네임스페이스 분석
			else if (options.multiple) {
				const namespaces = options.multiple.split(",").map((n: string) => n.trim());
				await handler.analyzeNamespaces(namespaces, {
					includeCrossDependencies: options.includeCross,
					includeStatistics: options.stats,
				});
			}
			// 전체 네임스페이스 분석
			else if (options.all) {
				await handler.analyzeAll({
					includeGraph: options.includeGraph,
					includeCrossDependencies: options.includeCross,
					includeStatistics: options.stats,
				});
			}
			// Cross-Namespace 의존성 조회
			else if (options.cross) {
				await handler.getCrossNamespaceDependencies({
					sourceNamespace: options.source,
					targetNamespace: options.target,
					includeStatistics: options.stats,
				});
			}
			// 순환 의존성 조회
			else if (options.circular) {
				await handler.getCircularDependencies(options.circularNamespace, {
					includeStatistics: options.stats,
				});
			}
			// 통계 생성
			else if (options.stats) {
				await handler.generateStatistics({
					includeCrossDependencies: options.includeCross,
					includeCircularDependencies: options.includeCircular,
					includeGraphStatistics: options.includeGraph,
				});
			}
			else {
				console.log("❌ Please specify an operation (--namespace, --multiple, --all, --cross, --circular, --stats)");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Cross-Namespace operation failed:", error);
			process.exit(1);
		} finally {
			await handler.close();
		}
	});

// ============================================================================
// Inference System 명령어
// ============================================================================

program
	.command("inference")
	.description("Inference System 관리")
	.option("-e, --execute <nodeId>", "통합 추론 실행")
	.option("-h, --hierarchical <nodeId>", "계층적 추론 실행")
	.option("-t, --transitive <nodeId>", "전이적 추론 실행")
	.option("-i, --inheritable <nodeId>", "상속 가능한 추론 실행")
	.option("-o, --optimized <nodeId>", "최적화된 추론 실행")
	.option("-r, --realtime <nodeId>", "실시간 추론 실행")
	.option("-a, --all <nodeId>", "모든 추론 실행")
	.option("--edge-type <type>", "엣지 타입")
	.option("--rule-ids <ids>", "규칙 ID 목록 (쉼표로 구분)")
	.option("--include-children", "자식 노드 포함")
	.option("--max-depth <depth>", "최대 깊이")
	.option("--max-path-length <length>", "최대 경로 길이")
	.option("--include-intermediate", "중간 노드 포함")
	.option("--include-inherited", "상속된 관계 포함")
	.option("--max-inheritance-depth <depth>", "최대 상속 깊이")
	.option("--enable-caching", "캐싱 활성화")
	.option("--enable-parallel", "병렬 처리 활성화")
	.option("--max-concurrency <number>", "최대 동시 실행 수")
	.option("--enable-auto-inference", "자동 추론 활성화")
	.option("--use-custom-rules", "사용자 정의 규칙 사용")
	.option("--use-realtime", "실시간 추론 사용")
	.option("--use-optimized", "최적화된 추론 사용")
	.option("--use-legacy", "레거시 추론 사용")
	.option("--stats", "추론 통계 생성")
	.option("--cache <action>", "캐시 관리 (clear, stats, optimize)")
	.option("--database <path>", "데이터베이스 경로")
	.option("--enable-custom-rules", "사용자 정의 규칙 활성화")
	.option("--enable-realtime-inference", "실시간 추론 활성화")
	.option("--enable-optimized-inference", "최적화된 추론 활성화")
	.option("--enable-legacy-inference", "레거시 추론 활성화")
	.action(async (options) => {
		const handler = new InferenceHandler({
			databasePath: options.database,
			enableCustomRules: options.enableCustomRules,
			enableRealTimeInference: options.enableRealtimeInference,
			enableOptimizedInference: options.enableOptimizedInference,
			enableLegacyInference: options.enableLegacyInference,
			maxConcurrency: options.maxConcurrency ? parseInt(options.maxConcurrency) : undefined,
			enableCaching: options.enableCaching,
		});

		try {
			await handler.initialize();

			// 통합 추론 실행
			if (options.execute) {
				const nodeId = parseInt(options.execute);
				await handler.executeInference(nodeId, {
					ruleIds: options.ruleIds ? options.ruleIds.split(",") : undefined,
					useCustomRules: options.useCustomRules,
					useRealTime: options.useRealtime,
					useOptimized: options.useOptimized,
					useLegacy: options.useLegacy,
				});
			}
			// 계층적 추론 실행
			else if (options.hierarchical) {
				const nodeId = parseInt(options.hierarchical);
				if (!options.edgeType) {
					console.log("❌ Please specify --edge-type for hierarchical inference");
					process.exit(1);
				}
				await handler.executeHierarchicalInference(nodeId, options.edgeType, {
					includeChildren: options.includeChildren,
					maxDepth: options.maxDepth ? parseInt(options.maxDepth) : undefined,
				});
			}
			// 전이적 추론 실행
			else if (options.transitive) {
				const nodeId = parseInt(options.transitive);
				if (!options.edgeType) {
					console.log("❌ Please specify --edge-type for transitive inference");
					process.exit(1);
				}
				await handler.executeTransitiveInference(nodeId, options.edgeType, {
					maxPathLength: options.maxPathLength ? parseInt(options.maxPathLength) : undefined,
					includeIntermediate: options.includeIntermediate,
				});
			}
			// 상속 가능한 추론 실행
			else if (options.inheritable) {
				const nodeId = parseInt(options.inheritable);
				if (!options.edgeType) {
					console.log("❌ Please specify --edge-type for inheritable inference");
					process.exit(1);
				}
				await handler.executeInheritableInference(nodeId, options.edgeType, {
					includeInherited: options.includeInherited,
					maxInheritanceDepth: options.maxInheritanceDepth ? parseInt(options.maxInheritanceDepth) : undefined,
				});
			}
			// 최적화된 추론 실행
			else if (options.optimized) {
				const nodeId = parseInt(options.optimized);
				await handler.executeOptimizedInference(nodeId, {
					enableCaching: options.enableCaching,
					enableParallel: options.enableParallel,
					maxConcurrency: options.maxConcurrency ? parseInt(options.maxConcurrency) : undefined,
				});
			}
			// 실시간 추론 실행
			else if (options.realtime) {
				const nodeId = parseInt(options.realtime);
				await handler.executeRealTimeInference(nodeId, {
					ruleIds: options.ruleIds ? options.ruleIds.split(",") : undefined,
					enableAutoInference: options.enableAutoInference,
				});
			}
			// 모든 추론 실행
			else if (options.all) {
				const nodeId = parseInt(options.all);
				await handler.executeAllInferences(nodeId, {
					includeCustomRules: options.useCustomRules,
					includeRealTime: options.useRealtime,
					includeOptimized: options.useOptimized,
					includeLegacy: options.useLegacy,
				});
			}
			// 추론 통계
			else if (options.stats) {
				await handler.generateStatistics();
			}
			// 캐시 관리
			else if (options.cache) {
				await handler.manageCache(options.cache);
			}
			else {
				console.log("❌ Please specify an inference operation (--execute, --hierarchical, --transitive, --inheritable, --optimized, --realtime, --all, --stats, --cache)");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Inference operation failed:", error);
			process.exit(1);
		} finally {
			await handler.close();
		}
	});

// ============================================================================
// Context Documents 명령어
// ============================================================================

program
	.command("context-documents")
	.description("Context Documents 관리")
	.option("-f, --file <path>", "파일 컨텍스트 문서 생성")
	.option("-s, --symbol <path>", "심볼 컨텍스트 문서 생성")
	.option("-p, --project", "프로젝트 전체 컨텍스트 문서 생성")
	.option("-l, --list", "컨텍스트 문서 목록 조회")
	.option("-u, --update", "컨텍스트 문서 업데이트")
	.option("-c, --cleanup", "컨텍스트 문서 정리")
	.option("--stats", "컨텍스트 문서 통계 생성")
	.option("--symbol-path <path>", "심볼 경로")
	.option("--symbol-kind <kind>", "심볼 종류")
	.option("--include-files", "파일 문서 포함")
	.option("--include-symbols", "심볼 문서 포함")
	.option("--include-dependencies", "의존성 정보 포함")
	.option("--include-dependents", "의존자 정보 포함")
	.option("--include-metadata", "메타데이터 포함")
	.option("--overwrite-existing", "기존 문서 덮어쓰기")
	.option("--confirm", "작업 확인")
	.option("--project-root <path>", "프로젝트 루트 경로")
	.option("--database <path>", "데이터베이스 경로")
	.option("--output <path>", "출력 경로")
	.option("--enable-auto-generation", "자동 생성 활성화")
	.action(async (options) => {
		const handler = new ContextDocumentsHandler({
			projectRoot: options.projectRoot,
			databasePath: options.database,
			outputPath: options.output,
			enableAutoGeneration: options.enableAutoGeneration,
			includeDependencies: options.includeDependencies,
			includeDependents: options.includeDependents,
			includeMetadata: options.includeMetadata,
			overwriteExisting: options.overwriteExisting,
		});

		try {
			await handler.initialize();

			// 파일 컨텍스트 문서 생성
			if (options.file) {
				await handler.generateFileContext(options.file, {
					includeDependencies: options.includeDependencies,
					includeDependents: options.includeDependents,
					overwriteExisting: options.overwriteExisting,
				});
			}
			// 심볼 컨텍스트 문서 생성
			else if (options.symbol) {
				if (!options.symbolPath) {
					console.log("❌ Please specify --symbol-path for symbol context generation");
					process.exit(1);
				}
				await handler.generateSymbolContext(options.symbol, options.symbolPath, {
					symbolKind: options.symbolKind,
					overwriteExisting: options.overwriteExisting,
				});
			}
			// 프로젝트 전체 컨텍스트 문서 생성
			else if (options.project) {
				await handler.generateProjectContext({
					includeFiles: options.includeFiles,
					includeSymbols: options.includeSymbols,
					includeDependencies: options.includeDependencies,
					includeDependents: options.includeDependents,
					overwriteExisting: options.overwriteExisting,
				});
			}
			// 컨텍스트 문서 목록 조회
			else if (options.list) {
				await handler.listDocuments();
			}
			// 컨텍스트 문서 업데이트
			else if (options.update) {
				await handler.updateDocuments({
					includeFiles: options.includeFiles,
					includeSymbols: options.includeSymbols,
					includeDependencies: options.includeDependencies,
					includeDependents: options.includeDependents,
					overwriteExisting: options.overwriteExisting,
				});
			}
			// 컨텍스트 문서 정리
			else if (options.cleanup) {
				await handler.cleanupDocuments({
					includeFiles: options.includeFiles,
					includeSymbols: options.includeSymbols,
					confirm: options.confirm,
				});
			}
			// 컨텍스트 문서 통계
			else if (options.stats) {
				await handler.generateStatistics();
			}
			else {
				console.log("❌ Please specify an operation (--file, --symbol, --project, --list, --update, --cleanup, --stats)");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Context Documents operation failed:", error);
			process.exit(1);
		} finally {
			await handler.close();
		}
	});

// ============================================================================
// Performance Optimization 명령어
// ============================================================================

program
	.command("performance")
	.description("Performance Optimization 관리")
	.option("-a, --analyze <project>", "최적화된 프로젝트 분석")
	.option("-c, --cache <action>", "캐시 관리 (clear, stats, optimize)")
	.option("-b, --batch <action>", "배치 처리 관리 (start, stop, stats, retry)")
	.option("-m, --monitor", "성능 모니터링 시작")
	.option("-o, --optimize-memory", "메모리 최적화")
	.option("-r, --benchmark", "성능 벤치마크 실행")
	.option("--stats", "성능 통계 생성")
	.option("--file-patterns <patterns>", "파일 패턴 (쉼표로 구분)")
	.option("--max-concurrency <number>", "최대 동시 실행 수")
	.option("--batch-size <number>", "배치 크기")
	.option("--cache-size-limit <bytes>", "캐시 크기 제한")
	.option("--memory-limit <bytes>", "메모리 제한")
	.option("--visualization-format <format>", "시각화 형식 (svg, html, json, dot)")
	.option("--visualization-output <path>", "시각화 출력 경로")
	.option("--monitoring-interval <ms>", "모니터링 간격")
	.option("--include-memory", "메모리 정보 포함")
	.option("--include-cpu", "CPU 정보 포함")
	.option("--include-cache", "캐시 정보 포함")
	.option("--iterations <number>", "벤치마크 반복 횟수")
	.option("--project-root <path>", "프로젝트 루트 경로")
	.option("--database <path>", "데이터베이스 경로")
	.option("--enable-caching", "캐싱 활성화")
	.option("--enable-batch-processing", "배치 처리 활성화")
	.option("--enable-visualization", "시각화 활성화")
	.option("--enable-monitoring", "모니터링 활성화")
	.action(async (options) => {
		const handler = new PerformanceOptimizationHandler({
			projectRoot: options.projectRoot,
			databasePath: options.database,
			enableCaching: options.enableCaching,
			enableBatchProcessing: options.enableBatchProcessing,
			enableVisualization: options.enableVisualization,
			enableMonitoring: options.enableMonitoring,
			maxConcurrency: options.maxConcurrency ? parseInt(options.maxConcurrency) : undefined,
			batchSize: options.batchSize ? parseInt(options.batchSize) : undefined,
			cacheSizeLimit: options.cacheSizeLimit ? parseInt(options.cacheSizeLimit) : undefined,
			memoryLimit: options.memoryLimit ? parseInt(options.memoryLimit) : undefined,
			visualizationFormat: options.visualizationFormat,
			visualizationOutput: options.visualizationOutput,
		});

		try {
			await handler.initialize();

			// 최적화된 프로젝트 분석
			if (options.analyze) {
				await handler.analyzeProject(
					options.analyze,
					options.filePatterns ? options.filePatterns.split(",") : undefined,
					{
						enableCaching: options.enableCaching,
						enableBatchProcessing: options.enableBatchProcessing,
						enableVisualization: options.enableVisualization,
						enableMonitoring: options.enableMonitoring,
					},
				);
			}
			// 캐시 관리
			else if (options.cache) {
				await handler.manageCache(options.cache);
			}
			// 배치 처리 관리
			else if (options.batch) {
				await handler.manageBatchProcessing(options.batch, {
					filePaths: options.filePatterns ? options.filePatterns.split(",") : undefined,
					maxConcurrency: options.maxConcurrency ? parseInt(options.maxConcurrency) : undefined,
					batchSize: options.batchSize ? parseInt(options.batchSize) : undefined,
				});
			}
			// 성능 모니터링
			else if (options.monitor) {
				await handler.startMonitoring({
					interval: options.monitoringInterval ? parseInt(options.monitoringInterval) : undefined,
					includeMemory: options.includeMemory,
					includeCPU: options.includeCPU,
					includeCache: options.includeCache,
				});
			}
			// 메모리 최적화
			else if (options.optimizeMemory) {
				await handler.optimizeMemory();
			}
			// 성능 벤치마크
			else if (options.benchmark) {
				await handler.runBenchmark({
					iterations: options.iterations ? parseInt(options.iterations) : undefined,
					includeMemory: options.includeMemory,
					includeCPU: options.includeCPU,
					includeCache: options.includeCache,
				});
			}
			// 성능 통계
			else if (options.stats) {
				await handler.generateStatistics();
			}
			else {
				console.log("❌ Please specify an operation (--analyze, --cache, --batch, --monitor, --optimize-memory, --benchmark, --stats)");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Performance Optimization operation failed:", error);
			process.exit(1);
		} finally {
			await handler.close();
		}
	});

// ============================================================================
// ============================================================================
// RDF File 명령어
// ============================================================================

program
	.command("rdf-file")
	.description("RDF 주소 기반 파일 위치 반환 및 파일 열기")
	.option("-l, --location <rdf-address>", "RDF 주소로 파일 위치 반환")
	.option("-o, --open <rdf-address>", "RDF 주소로 파일 열기")
	.option("-p, --path <rdf-address>", "RDF 주소로 파일 경로 반환")
	.option("-r, --relative <rdf-address>", "RDF 주소로 상대 경로 반환")
	.option("-c, --content <rdf-address>", "RDF 주소로 파일 내용 반환")
	.option("-s, --symbol <rdf-address>", "RDF 주소로 심볼 정보 반환")
	.option("-e, --exists <rdf-address>", "RDF 주소로 파일 존재 여부 확인")
	.option("-v, --validate <rdf-address>", "RDF 주소 유효성 검증")
	.option("--editor <editor>", "에디터 지정 (code, vim, nano, emacs, subl, atom)")
	.option("--line <number>", "라인 번호")
	.option("--column <number>", "컬럼 번호")
	.option("--wait", "에디터 종료까지 대기")
	.option("--start-line <number>", "파일 내용 시작 라인")
	.option("--end-line <number>", "파일 내용 끝 라인")
	.option("--database <path>", "데이터베이스 경로")
	.action(async (options) => {
		const handler = new RDFFileHandler(options.database);

		try {
			// 파일 위치 반환
			if (options.location) {
				const location = await handler.getFileLocation(options.location);
				console.log(`📁 RDF 주소: ${location.rdfAddress}`);
				console.log(`📄 파일 경로: ${location.filePath}`);
				console.log(`📍 절대 경로: ${location.absolutePath}`);
				console.log(`📂 상대 경로: ${location.relativePath}`);
				console.log(`✅ 존재 여부: ${location.exists ? 'Yes' : 'No'}`);
				if (location.lineNumber) {
					console.log(`📏 라인 번호: ${location.lineNumber}`);
				}
				if (location.columnNumber) {
					console.log(`📐 컬럼 번호: ${location.columnNumber}`);
				}
			}
			// 파일 열기
			else if (options.open) {
				await handler.openFile(options.open, {
					editor: options.editor,
					line: options.line ? parseInt(options.line) : undefined,
					column: options.column ? parseInt(options.column) : undefined,
					wait: options.wait
				});
				console.log(`✅ 파일 열기 완료: ${options.open}`);
			}
			// 파일 경로 반환
			else if (options.path) {
				const filePath = await handler.getFilePath(options.path);
				console.log(`📄 파일 경로: ${filePath}`);
			}
			// 상대 경로 반환
			else if (options.relative) {
				const relativePath = await handler.getRelativePath(options.relative);
				console.log(`📂 상대 경로: ${relativePath}`);
			}
			// 파일 내용 반환
			else if (options.content) {
				const content = await handler.getFileContent(
					options.content,
					options.startLine ? parseInt(options.startLine) : undefined,
					options.endLine ? parseInt(options.endLine) : undefined
				);
				console.log(`📄 파일 내용:`);
				console.log(content);
			}
			// 심볼 정보 반환
			else if (options.symbol) {
				const symbolInfo = await handler.getSymbolInfo(options.symbol);
				console.log(`🔍 심볼 정보:`);
				console.log(`  - RDF 주소: ${symbolInfo.rdfAddress}`);
				console.log(`  - 파일 경로: ${symbolInfo.filePath}`);
				console.log(`  - 심볼 이름: ${symbolInfo.symbolName}`);
				console.log(`  - 심볼 타입: ${symbolInfo.symbolType}`);
				console.log(`  - 라인 번호: ${symbolInfo.lineNumber}`);
				console.log(`  - 컬럼 번호: ${symbolInfo.columnNumber}`);
				console.log(`  - Export 여부: ${symbolInfo.exported ? 'Yes' : 'No'}`);
				if (symbolInfo.metadata && Object.keys(symbolInfo.metadata).length > 0) {
					console.log(`  - 메타데이터: ${JSON.stringify(symbolInfo.metadata, null, 2)}`);
				}
			}
			// 파일 존재 여부 확인
			else if (options.exists) {
				const exists = await handler.fileExists(options.exists);
				console.log(`✅ 파일 존재 여부: ${exists ? 'Yes' : 'No'}`);
			}
			// RDF 주소 유효성 검증
			else if (options.validate) {
				const isValid = await handler.validateRDFAddress(options.validate);
				console.log(`✅ RDF 주소 유효성: ${isValid ? 'Valid' : 'Invalid'}`);
			}
			else {
				console.log("❌ Please specify an operation (--location, --open, --path, --relative, --content, --symbol, --exists, --validate)");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ RDF File operation failed:", error);
			process.exit(1);
		} finally {
			await handler.close();
		}
	});

// ============================================================================
// Unknown Symbol 관리 명령어
// ============================================================================
program
	.command("unknown")
	.description("Unknown Symbol 관리")
	.option("-r, --register <symbol>", "Unknown Symbol 등록")
	.option("-f, --file <file>", "파일 경로")
	.option("-s, --search <query>", "Unknown Symbol 검색")
	.option("-i, --infer", "추론 실행")
	.option("--database <path>", "데이터베이스 경로")
	.action(async (options) => {
		const handler = new UnknownSymbolHandler();

		try {
			if (options.register && options.file) {
				await handler.registerUnknownSymbol({
					symbol: options.register,
					file: options.file
				});
				console.log(`✅ Unknown symbol registered: ${options.register}`);
			} else if (options.search) {
				await handler.searchUnknownSymbols(options.search);
				console.log(`🔍 Unknown symbol search completed`);
			} else if (options.infer) {
				await handler.applyInferenceRules({ symbol: "test" });
				console.log(`✅ Inference completed`);
			} else {
				console.log("❌ Please specify an operation (--register, --search, --infer)");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Unknown Symbol operation failed:", error);
			process.exit(1);
		} finally {
			await handler.close();
		}
	});

// ============================================================================
// Query System 관리 명령어
// ============================================================================
program
	.command("query")
	.description("Query System 관리")
	.option("-s, --sql <query>", "SQL 쿼리 실행")
	.option("-g, --graphql <query>", "GraphQL 쿼리 실행")
	.option("-n, --natural <query>", "자연어 쿼리 실행")
	.option("--database <path>", "데이터베이스 경로")
	.action(async (options) => {
		const handler = new QueryHandler(options.database);

		try {
			if (options.sql) {
				const results = await handler.executeSQLQuery(options.sql, {});
				console.log(`✅ SQL query executed: ${results.data.length} results`);
				console.log(JSON.stringify(results.data, null, 2));
			} else if (options.graphql) {
				const results = await handler.executeGraphQLQuery(options.graphql, {});
				console.log(`✅ GraphQL query executed: ${results.data.length} results`);
				console.log(JSON.stringify(results.data, null, 2));
			} else if (options.natural) {
				const results = await handler.executeNaturalLanguageQuery(options.natural, {});
				console.log(`✅ Natural language query executed: ${results.data.length} results`);
				console.log(JSON.stringify(results.data, null, 2));
			} else {
				console.log("❌ Please specify a query type (--sql, --graphql, --natural)");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Query operation failed:", error);
			process.exit(1);
		} finally {
			await handler.close();
		}
	});

// ============================================================================
// Cross-Namespace Dependencies 관리 명령어
// ============================================================================
program
	.command("cross-namespace")
	.description("Cross-Namespace Dependencies 관리")
	.option("-a, --analyze <namespace1> <namespace2>", "네임스페이스 간 의존성 분석")
	.option("-c, --circular", "순환 의존성 검출")
	.option("-s, --stats", "의존성 통계")
	.option("--database <path>", "데이터베이스 경로")
	.action(async (options) => {
		const handler = new CrossNamespaceHandler(options.database);

		try {
			if (options.analyze) {
				const namespaces = options.analyze.split(' ');
				if (namespaces.length >= 2) {
					await handler.getCrossNamespaceDependencies({
						sourceNamespace: namespaces[0],
						targetNamespace: namespaces[1]
					});
					console.log(`✅ Cross-namespace analysis completed`);
				} else {
					console.log("❌ Please provide two namespace names for analysis");
					process.exit(1);
				}
			} else if (options.circular) {
				await handler.getCircularDependencies();
				console.log(`✅ Circular dependency detection completed`);
			} else if (options.stats) {
				await handler.generateStatistics();
				console.log(`✅ Dependency statistics completed`);
			} else {
				console.log("❌ Please specify an operation (--analyze, --circular, --stats)");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Cross-namespace operation failed:", error);
			process.exit(1);
		} finally {
			await handler.close();
		}
	});

// ============================================================================
// Inference System 관리 명령어
// ============================================================================
program
	.command("inference")
	.description("Inference System 관리")
	.option("-h, --hierarchical <depth>", "계층적 추론")
	.option("-t, --transitive <depth>", "전이적 추론")
	.option("-e, --execute <depth>", "추론 실행")
	.option("--edge-type <type>", "엣지 타입")
	.option("--database <path>", "데이터베이스 경로")
	.action(async (options) => {
		const handler = new InferenceHandler(options.database);

		try {
			if (options.hierarchical) {
				const depth = parseInt(options.hierarchical);
				await handler.executeHierarchicalInference(1, options.edgeType || 'imports', {
					maxDepth: depth
				});
				console.log(`✅ Hierarchical inference completed`);
			} else if (options.transitive) {
				const depth = parseInt(options.transitive);
				await handler.executeTransitiveInference(1, options.edgeType || 'depends_on', {
					maxPathLength: depth
				});
				console.log(`✅ Transitive inference completed`);
			} else if (options.execute) {
				const depth = parseInt(options.execute);
				await handler.executeInference(depth);
				console.log(`✅ Inference execution completed`);
			} else {
				console.log("❌ Please specify an inference type (--hierarchical, --transitive, --execute)");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Inference operation failed:", error);
			process.exit(1);
		} finally {
			await handler.close();
		}
	});

// ============================================================================
// Context Documents 관리 명령어
// ============================================================================
program
	.command("context-documents")
	.description("Context Documents 관리")
	.option("-f, --file <file>", "파일 컨텍스트 문서 생성")
	.option("-s, --symbol <file>", "심볼 컨텍스트 문서 생성")
	.option("--symbol-path <path>", "심볼 경로")
	.option("-p, --project", "프로젝트 컨텍스트 문서 생성")
	.option("--database <path>", "데이터베이스 경로")
	.action(async (options) => {
		const handler = new ContextDocumentsHandler(options.database);

		try {
			if (options.file) {
				await handler.generateFileContext(options.file);
				console.log(`✅ Context document generated for file: ${options.file}`);
			} else if (options.symbol && options.symbolPath) {
				await handler.generateSymbolContext(options.symbol, options.symbolPath);
				console.log(`✅ Symbol context document generated for: ${options.symbolPath}`);
			} else if (options.project) {
				await handler.generateProjectContext();
				console.log(`✅ Project context document generated`);
			} else {
				console.log("❌ Please specify an operation (--file, --symbol, --project)");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Context Documents operation failed:", error);
			process.exit(1);
		} finally {
			await handler.close();
		}
	});

// ============================================================================
// Performance Optimization 관리 명령어
// ============================================================================
program
	.command("performance")
	.description("Performance Optimization 관리")
	.option("-a, --analyze <project>", "성능 분석")
	.option("-c, --cache <operation>", "캐시 관리")
	.option("-b, --batch <operation>", "배치 처리 관리")
	.option("-m, --monitor", "성능 모니터링")
	.option("--optimize-memory", "메모리 최적화")
	.option("--benchmark", "성능 벤치마크")
	.option("-s, --stats", "성능 통계")
	.option("--database <path>", "데이터베이스 경로")
	.action(async (options) => {
		const handler = new PerformanceOptimizationHandler(options.database);

		try {
			if (options.analyze) {
				await handler.analyzeProject(options.analyze);
				console.log(`✅ Performance analysis completed for project: ${options.analyze}`);
			} else if (options.cache) {
				await handler.manageCache(options.cache as "clear" | "stats" | "optimize");
				console.log(`✅ Cache management completed`);
			} else if (options.batch) {
				await handler.manageBatchProcessing(options.batch as "start" | "stop" | "stats" | "retry");
				console.log(`✅ Batch processing management completed`);
			} else if (options.monitor) {
				await handler.startMonitoring();
				console.log(`✅ Performance monitoring started`);
			} else if (options.optimizeMemory) {
				await handler.optimizeMemory();
				console.log(`✅ Memory optimization completed`);
			} else if (options.benchmark) {
				await handler.runBenchmark();
				console.log(`✅ Performance benchmark completed`);
			} else if (options.stats) {
				await handler.generateStatistics();
				console.log(`✅ Performance statistics generated`);
			} else {
				console.log("❌ Please specify an operation (--analyze, --cache, --batch, --monitor, --optimize-memory, --benchmark, --stats)");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Performance operation failed:", error);
			process.exit(1);
		} finally {
			await handler.close();
		}
	});

// ============================================================================
// Markdown 분석 명령어
// ============================================================================
program
	.command("markdown")
	.description("Markdown analysis commands")
	.option("-a, --analyze <file>", "Markdown 파일 분석")
	.option("-t, --track-links <file>", "링크 추적")
	.option("-e, --extract-headings <file>", "헤딩 추출")
	.option("--database <path>", "데이터베이스 경로")
	.action(async (options) => {
		try {
			if (options.analyze) {
				await runMarkdownAnalysis(options.analyze);
				console.log(`✅ Markdown analysis completed for: ${options.analyze}`);
			} else if (options.trackLinks) {
				await runLinkTracking(options.trackLinks);
				console.log(`✅ Link tracking completed for: ${options.trackLinks}`);
			} else if (options.extractHeadings) {
				await runHeadingExtraction(options.extractHeadings);
				console.log(`✅ Heading extraction completed for: ${options.extractHeadings}`);
			} else {
				console.log("❌ Please specify an operation (--analyze, --track-links, --extract-headings)");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Markdown operation failed:", error);
			process.exit(1);
		}
	});

// ============================================================================
// TypeScript 분석 명령어
// ============================================================================
program
	.command("typescript")
	.description("TypeScript analysis commands")
	.option("-a, --analyze <file>", "TypeScript 파일 분석")
	.option("-p, --project <dir>", "TypeScript 프로젝트 분석")
	.option("-b, --benchmark", "성능 벤치마크")
	.option("--database <path>", "데이터베이스 경로")
	.action(async (options) => {
		try {
			if (options.analyze) {
				await runTypeScriptAnalysis(options.analyze, {});
				console.log(`✅ TypeScript analysis completed for: ${options.analyze}`);
			} else if (options.project) {
				await runTypeScriptProjectAnalysis(options.project, {});
				console.log(`✅ TypeScript project analysis completed for: ${options.project}`);
			} else if (options.benchmark) {
				await runTypeScriptPerformanceBenchmark("benchmark");
				console.log(`✅ TypeScript benchmark completed`);
			} else {
				console.log("❌ Please specify an operation (--analyze, --project, --benchmark)");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ TypeScript operation failed:", error);
			process.exit(1);
		}
	});

// ============================================================================
// Namespace 관리 명령어
// ============================================================================
program
	.command("namespace")
	.description("Namespace management")
	.option("-a, --analyze", "네임스페이스 분석")
	.option("-o, --optimize", "네임스페이스 최적화")
	.option("-s, --stats", "네임스페이스 통계")
	.option("--database <path>", "데이터베이스 경로")
	.action(async (options) => {
		try {
			if (options.analyze) {
				await runNamespaceAnalysis();
				console.log(`✅ Namespace analysis completed`);
			} else if (options.optimize) {
				const optimizer = new NamespaceOptimizer();
				await optimizer.optimizeNamespaces({} as any);
				console.log(`✅ Namespace optimization completed`);
			} else if (options.stats) {
				await runNamespaceAnalysis();
				console.log(`✅ Namespace statistics completed`);
			} else {
				console.log("❌ Please specify an operation (--analyze, --optimize, --stats)");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Namespace operation failed:", error);
			process.exit(1);
		}
	});

// ============================================================================
// Benchmark 명령어
// ============================================================================
program
	.command("benchmark")
	.description("Performance benchmark")
	.option("-f, --file <file>", "파일 벤치마크")
	.option("-i, --iterations <number>", "반복 횟수")
	.option("--database <path>", "데이터베이스 경로")
	.action(async (options) => {
		try {
			if (options.file) {
				const iterations = options.iterations ? parseInt(options.iterations) : 3;
				await runTypeScriptPerformanceBenchmark("benchmark");
				console.log(`✅ Benchmark completed for: ${options.file}`);
				console.log(`  - Iterations: ${iterations}`);
			} else {
				console.log("❌ Please specify a file (--file)");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Benchmark operation failed:", error);
			process.exit(1);
		}
	});

// 프로그램 실행
// ============================================================================

program.parse();
