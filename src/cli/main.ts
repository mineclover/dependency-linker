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
import { RDFHandler, UnknownSymbolHandler, QueryHandler, CrossNamespaceHandler, InferenceHandler, HandlerFactory } from "./handlers/index.js";

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
// Unknown Symbol 관리 명령어
// ============================================================================

program
	.command("unknown")
	.description("Unknown Symbol 관리")
	.option("-r, --register", "Unknown Symbol 등록")
	.option("-f, --file <file>", "파일 경로")
	.option("-s, --symbol <symbol>", "심볼 이름")
	.option("-t, --type <type>", "심볼 타입")
	.option("--imported", "Import된 심볼")
	.option("--alias", "Alias 심볼")
	.option("--original <name>", "원본 심볼 이름")
	.option("--from <file>", "Import된 파일")
	.option("-q, --query <query>", "검색 쿼리")
	.option("--candidates", "동등성 후보 검색")
	.option("--equivalence", "동등성 관계 생성")
	.option("--unknown-id <id>", "Unknown Symbol ID")
	.option("--known-id <id>", "Known Symbol ID")
	.option("--confidence <number>", "신뢰도 (0-1)")
	.option("--match-type <type>", "매칭 타입")
	.option("--infer", "추론 규칙 적용")
	.option("--list", "동등성 관계 조회")
	.option("--stats", "통계 생성")
	.action(async (options) => {
		const handler = new UnknownSymbolHandler();
		try {
			// Unknown Symbol 등록
			if (options.register) {
				if (!options.file || !options.symbol) {
					console.log("❌ Please specify --file and --symbol");
					process.exit(1);
				}
				await handler.registerUnknownSymbol({
					file: options.file,
					symbol: options.symbol,
					type: options.type,
					isImported: options.imported,
					isAlias: options.alias,
					originalName: options.original,
					importedFrom: options.from
				});
			}
			// Unknown Symbol 검색
			else if (options.query) {
				await handler.searchUnknownSymbols({
					query: options.query,
					type: options.type,
					file: options.file
				});
			}
			// 동등성 후보 검색
			else if (options.candidates) {
				if (!options.symbol) {
					console.log("❌ Please specify --symbol");
					process.exit(1);
				}
				await handler.searchEquivalenceCandidates({
					symbol: options.symbol,
					type: options.type,
					file: options.file
				});
			}
			// 동등성 관계 생성
			else if (options.equivalence) {
				if (!options.unknownId || !options.knownId) {
					console.log("❌ Please specify --unknown-id and --known-id");
					process.exit(1);
				}
				await handler.createEquivalenceRelation({
					unknownId: options.unknownId,
					knownId: options.knownId,
					confidence: options.confidence ? parseFloat(options.confidence) : undefined,
					matchType: options.matchType
				});
			}
			// 추론 규칙 적용
			else if (options.infer) {
				if (!options.symbol) {
					console.log("❌ Please specify --symbol");
					process.exit(1);
				}
				await handler.applyInferenceRules({
					symbol: options.symbol,
					type: options.type,
					file: options.file
				});
			}
			// 동등성 관계 조회
			else if (options.list) {
				await handler.listEquivalenceRelations({
					symbol: options.symbol,
					type: options.type,
					file: options.file
				});
			}
			// 통계 생성
			else if (options.stats) {
				await handler.generateStatistics();
			}
			else {
				console.log("❌ Please specify an Unknown Symbol operation (--register, --query, --candidates, --equivalence, --infer, --list, --stats)");
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
// 프로그램 실행
// ============================================================================

program.parse();
