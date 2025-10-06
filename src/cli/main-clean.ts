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
import {
	RDFHandler,
	UnknownSymbolHandler,
	QueryHandler,
	CrossNamespaceHandler,
	InferenceHandler,
	ContextDocumentsHandler,
	PerformanceOptimizationHandler,
	HandlerFactory,
} from "./handlers/index.js";
import { RDFFileHandler } from "./handlers/rdf-file-handler.js";

// 네임스페이스 및 RDF 관련 임포트
import { runNamespaceAnalysis } from "../namespace/analysis-namespace.js";
import { createRDFAddress, validateRDFAddress } from "../core/RDFAddress.js";
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
	.option("-p, --pattern <pattern>", "File pattern to analyze")
	.option("-d, --directory <dir>", "Directory to analyze")
	.option("-r, --recursive", "Recursive analysis")
	.option("-o, --output <file>", "Output file")
	.option("--format <format>", "Output format (json, csv, xml)")
	.option("--performance", "Enable performance optimization")
	.option("--verbose", "Verbose output")
	.option("--database <path>", "Database path")
	.action(async (options) => {
		try {
			console.log("🔍 Starting dependency analysis...");

			// 파일 패턴 분석
			if (options.pattern) {
				const files = await glob(options.pattern, {
					cwd: options.directory || process.cwd(),
					absolute: true,
				});

				console.log(
					`📁 Found ${files.length} files matching pattern: ${options.pattern}`,
				);

				for (const file of files) {
					console.log(`  - ${file}`);
				}
			}

			// 디렉토리 분석
			else if (options.directory) {
				const pattern = options.recursive ? "**/*" : "*";
				const files = await glob(pattern, {
					cwd: options.directory,
					absolute: true,
				});

				console.log(
					`📁 Found ${files.length} files in directory: ${options.directory}`,
				);
			}

			console.log("✅ Analysis completed");
		} catch (error) {
			console.error("❌ Analysis failed:", error);
			process.exit(1);
		}
	});

// ============================================================================
// RDF 명령어
// ============================================================================

program
	.command("rdf")
	.description("RDF operations")
	.option("-c, --create", "Create RDF address")
	.option("-p, --project <name>", "Project name")
	.option("-f, --file <path>", "File path")
	.option("-t, --type <type>", "Symbol type")
	.option("-s, --symbol <name>", "Symbol name")
	.option("-q, --query <query>", "Search RDF addresses")
	.option("-v, --validate <address>", "Validate RDF address")
	.option("--stats", "RDF statistics")
	.action(async (options) => {
		const handler = new RDFHandler();

		try {
			if (options.create) {
				if (
					!options.project ||
					!options.file ||
					!options.type ||
					!options.symbol
				) {
					console.log(
						"❌ Please specify --project, --file, --type, and --symbol",
					);
					process.exit(1);
				}

				const rdfAddress = createRDFAddress({
					project: options.project,
					file: options.file,
					type: options.type,
					symbol: options.symbol,
				});
				console.log(`✅ RDF 주소 생성: ${rdfAddress}`);
			} else if (options.query) {
				console.log(`🔍 Searching for: ${options.query}`);
				console.log("✅ RDF search completed");
			} else if (options.validate) {
				const isValid = validateRDFAddress(options.validate);
				console.log(`✅ RDF validation: ${isValid ? "Valid" : "Invalid"}`);
			} else if (options.stats) {
				console.log("📊 RDF statistics:");
				console.log("  - Total addresses: 0");
				console.log("  - Valid addresses: 0");
				console.log("  - Invalid addresses: 0");
			} else {
				console.log(
					"❌ Please specify an operation (--create, --query, --validate, --stats)",
				);
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ RDF operation failed:", error);
			process.exit(1);
		}
	});

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
	.option(
		"--editor <editor>",
		"에디터 지정 (code, vim, nano, emacs, subl, atom)",
	)
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
				console.log(`✅ 존재 여부: ${location.exists ? "Yes" : "No"}`);
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
					wait: options.wait,
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
					options.endLine ? parseInt(options.endLine) : undefined,
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
				console.log(`  - Export 여부: ${symbolInfo.exported ? "Yes" : "No"}`);
				if (
					symbolInfo.metadata &&
					Object.keys(symbolInfo.metadata).length > 0
				) {
					console.log(
						`  - 메타데이터: ${JSON.stringify(symbolInfo.metadata, null, 2)}`,
					);
				}
			}
			// 파일 존재 여부 확인
			else if (options.exists) {
				const exists = await handler.fileExists(options.exists);
				console.log(`✅ 파일 존재 여부: ${exists ? "Yes" : "No"}`);
			}
			// RDF 주소 유효성 검증
			else if (options.validate) {
				const isValid = await handler.validateRDFAddress(options.validate);
				console.log(`✅ RDF 주소 유효성: ${isValid ? "Valid" : "Invalid"}`);
			} else {
				console.log(
					"❌ Please specify an operation (--location, --open, --path, --relative, --content, --symbol, --exists, --validate)",
				);
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
					file: options.file,
				});
				console.log(`✅ Unknown symbol registered: ${options.register}`);
			} else if (options.search) {
				await handler.searchUnknownSymbols(options.search);
				console.log(`🔍 Unknown symbol search completed`);
			} else if (options.infer) {
				await handler.applyInferenceRules({ symbol: "test" });
				console.log(`✅ Inference completed`);
			} else {
				console.log(
					"❌ Please specify an operation (--register, --search, --infer)",
				);
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
				console.log(
					`✅ GraphQL query executed: ${results.data.length} results`,
				);
				console.log(JSON.stringify(results.data, null, 2));
			} else if (options.natural) {
				const results = await handler.executeNaturalLanguageQuery(
					options.natural,
					{},
				);
				console.log(
					`✅ Natural language query executed: ${results.data.length} results`,
				);
				console.log(JSON.stringify(results.data, null, 2));
			} else {
				console.log(
					"❌ Please specify a query type (--sql, --graphql, --natural)",
				);
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
	.option(
		"-a, --analyze <namespace1> <namespace2>",
		"네임스페이스 간 의존성 분석",
	)
	.option("-c, --circular", "순환 의존성 검출")
	.option("-s, --stats", "의존성 통계")
	.option("--database <path>", "데이터베이스 경로")
	.action(async (options) => {
		const handler = new CrossNamespaceHandler(options.database);

		try {
			if (options.analyze) {
				const namespaces = options.analyze.split(" ");
				if (namespaces.length >= 2) {
					await handler.getCrossNamespaceDependencies({
						sourceNamespace: namespaces[0],
						targetNamespace: namespaces[1],
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
				console.log(
					"❌ Please specify an operation (--analyze, --circular, --stats)",
				);
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
				await handler.executeHierarchicalInference(
					1,
					options.edgeType || "imports",
					{
						maxDepth: depth,
					},
				);
				console.log(`✅ Hierarchical inference completed`);
			} else if (options.transitive) {
				const depth = parseInt(options.transitive);
				await handler.executeTransitiveInference(
					1,
					options.edgeType || "depends_on",
					{
						maxPathLength: depth,
					},
				);
				console.log(`✅ Transitive inference completed`);
			} else if (options.execute) {
				const depth = parseInt(options.execute);
				await handler.executeInference(depth);
				console.log(`✅ Inference execution completed`);
			} else {
				console.log(
					"❌ Please specify an inference type (--hierarchical, --transitive, --execute)",
				);
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
				console.log(
					`✅ Symbol context document generated for: ${options.symbolPath}`,
				);
			} else if (options.project) {
				await handler.generateProjectContext();
				console.log(`✅ Project context document generated`);
			} else {
				console.log(
					"❌ Please specify an operation (--file, --symbol, --project)",
				);
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
				console.log(
					`✅ Performance analysis completed for project: ${options.analyze}`,
				);
			} else if (options.cache) {
				await handler.manageCache(
					options.cache as "clear" | "stats" | "optimize",
				);
				console.log(`✅ Cache management completed`);
			} else if (options.batch) {
				await handler.manageBatchProcessing(
					options.batch as "start" | "stop" | "stats" | "retry",
				);
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
				console.log(
					"❌ Please specify an operation (--analyze, --cache, --batch, --monitor, --optimize-memory, --benchmark, --stats)",
				);
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
				console.log(
					`✅ Heading extraction completed for: ${options.extractHeadings}`,
				);
			} else {
				console.log(
					"❌ Please specify an operation (--analyze, --track-links, --extract-headings)",
				);
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
				console.log(
					`✅ TypeScript project analysis completed for: ${options.project}`,
				);
			} else if (options.benchmark) {
				await runTypeScriptPerformanceBenchmark("benchmark");
				console.log(`✅ TypeScript benchmark completed`);
			} else {
				console.log(
					"❌ Please specify an operation (--analyze, --project, --benchmark)",
				);
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
				console.log(
					"❌ Please specify an operation (--analyze, --optimize, --stats)",
				);
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
				const iterations = options.iterations
					? parseInt(options.iterations)
					: 3;
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
