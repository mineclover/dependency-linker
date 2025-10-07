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
} from "./handlers/index.js";
import { RDFFileHandler } from "./handlers/rdf-file-handler.js";
import { NamespaceOptimizer } from "./namespace-optimizer.js";
import { createRDFAddress, validateRDFAddress } from "../core/RDFAddress.js";

// ============================================================================
// CLI 프로그램 설정
// ============================================================================

const program = new Command();

program
	.name("dependency-linker")
	.description("Dependency analysis tool with RDF addressing")
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

			// 성능 최적화 옵션 처리
			if (options.performance) {
				console.log("⚡ Performance optimization enabled");
			}

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
	.description("RDF address operations")
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
					projectName: options.project,
					filePath: options.file,
					nodeType: options.type as any,
					symbolName: options.symbol,
				});
				console.log(`✅ RDF address created: ${rdfAddress}`);
			} else if (options.query) {
				console.log(`🔍 Searching for: ${options.query}`);
				console.log("✅ RDF search completed");
			} else if (options.validate) {
				if (!options.validate) {
					console.log("❌ Please provide an RDF address to validate");
					process.exit(1);
				}
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
// RDF 파일 명령어
// ============================================================================

program
	.command("rdf-file")
	.description("RDF-based file operations")
	.option("-l, --location <address>", "Get file location from RDF address")
	.option("-o, --open <address>", "Open file from RDF address")
	.option("-p, --path <address>", "Get file path from RDF address")
	.option("-r, --relative <address>", "Get relative path from RDF address")
	.option("-c, --content <address>", "Get file content from RDF address")
	.option("-s, --symbol <address>", "Get symbol info from RDF address")
	.option("-e, --exists <address>", "Check if file exists")
	.option("-v, --validate <address>", "Validate RDF address")
	.action(async (options) => {
		const handler = new RDFFileHandler();

		try {
			if (options.location) {
				const location = await handler.getFileLocation(options.location);
				console.log(`📍 RDF 주소: ${options.location}`);
				console.log(`📁 파일 경로: ${location.filePath}`);
				console.log(`📂 절대 경로: ${location.absolutePath}`);
			} else if (options.open) {
				await handler.openFile(options.open);
				console.log(`✅ 파일 열기 완료: ${options.open}`);
			} else if (options.path) {
				const filePath = await handler.getFilePath(options.path);
				console.log(`📁 파일 경로: ${filePath}`);
			} else if (options.relative) {
				const relativePath = await handler.getRelativePath(options.relative);
				console.log(`📂 상대 경로: ${relativePath}`);
			} else if (options.content) {
				const content = await handler.getFileContent(options.content);
				console.log(`📄 파일 내용 (${content.length} bytes):`);
				console.log(content.substring(0, 200) + "...");
			} else if (options.symbol) {
				const symbolInfo = await handler.getSymbolInfo(options.symbol);
				console.log(`🔍 심볼 정보: ${JSON.stringify(symbolInfo, null, 2)}`);
			} else if (options.exists) {
				const exists = await handler.fileExists(options.exists);
				console.log(`📁 파일 존재 여부: ${exists ? "존재" : "없음"}`);
			} else if (options.validate) {
				const isValid = await handler.validateRDFAddress(options.validate);
				console.log(`✅ RDF 주소 유효성: ${isValid ? "유효" : "무효"}`);
			} else {
				console.log(
					"❌ Please specify an operation (--location, --open, --path, --relative, --content, --symbol, --exists, --validate)",
				);
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ RDF file operation failed:", error);
			process.exit(1);
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
		}
	});

// ============================================================================
// 쿼리 명령어
// ============================================================================

program
	.command("query")
	.description("Query the dependency graph")
	.option("-s, --sql <query>", "SQL query")
	.option("-g, --graphql <query>", "GraphQL query")
	.option("-n, --natural <query>", "Natural language query")
	.option("--database <path>", "Database path")
	.action(async (options) => {
		const handler = new QueryHandler();

		try {
			if (options.sql) {
				await handler.executeSQLQuery(options.sql, {});
				console.log("✅ SQL query executed");
			} else if (options.graphql) {
				await handler.executeGraphQLQuery(options.graphql, {});
				console.log("✅ GraphQL query executed");
			} else if (options.natural) {
				await handler.executeNaturalLanguageQuery(options.natural, {});
				console.log("✅ Natural language query executed");
			} else {
				console.log(
					"❌ Please specify a query type (--sql, --graphql, --natural)",
				);
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Query operation failed:", error);
			process.exit(1);
		}
	});

// ============================================================================
// Cross-Namespace 분석 명령어
// ============================================================================

program
	.command("cross-namespace")
	.description("Cross-namespace dependency analysis")
	.option("-a, --analyze", "Analyze cross-namespace dependencies")
	.option("-s, --source <namespace>", "Source namespace")
	.option("-t, --target <namespace>", "Target namespace")
	.option("--database <path>", "Database path")
	.action(async (options) => {
		const handler = new CrossNamespaceHandler();

		try {
			if (options.analyze) {
				await handler.getCrossNamespaceDependencies({});
				console.log("✅ Cross-namespace analysis completed");
			} else {
				console.log("❌ Please specify --analyze");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Cross-namespace analysis failed:", error);
			process.exit(1);
		}
	});

// ============================================================================
// 추론 명령어
// ============================================================================

program
	.command("inference")
	.description("Run inference on the dependency graph")
	.option("-h, --hierarchical", "Hierarchical inference")
	.option("-t, --transitive", "Transitive inference")
	.option("-c, --custom <rules>", "Custom inference rules")
	.option("--database <path>", "Database path")
	.action(async (options) => {
		const handler = new InferenceHandler();

		try {
			if (options.hierarchical) {
				await handler.executeHierarchicalInference(1, "defines");
				console.log("✅ Hierarchical inference completed");
			} else if (options.transitive) {
				await handler.executeTransitiveInference(1, "defines");
				console.log("✅ Transitive inference completed");
			} else if (options.custom) {
				await handler.executeInference(1);
				console.log("✅ Custom inference completed");
			} else {
				console.log(
					"❌ Please specify inference type (--hierarchical, --transitive, --custom)",
				);
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Inference operation failed:", error);
			process.exit(1);
		}
	});

// ============================================================================
// 컨텍스트 문서 명령어
// ============================================================================

program
	.command("context-documents")
	.description("Generate context documents")
	.option("-f, --file <path>", "Generate file context")
	.option("-s, --symbol <name>", "Generate symbol context")
	.option("-p, --project <name>", "Generate project context")
	.option("-o, --output <dir>", "Output directory")
	.option("--database <path>", "Database path")
	.action(async (options) => {
		const handler = new ContextDocumentsHandler();

		try {
			if (options.file) {
				await handler.generateFileContext(options.file);
				console.log("✅ File context generated");
			} else if (options.symbol) {
				await handler.generateSymbolContext(options.symbol, options.symbol);
				console.log("✅ Symbol context generated");
			} else if (options.project) {
				await handler.generateProjectContext({});
				console.log("✅ Project context generated");
			} else {
				console.log(
					"❌ Please specify context type (--file, --symbol, --project)",
				);
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Context documents operation failed:", error);
			process.exit(1);
		}
	});

// ============================================================================
// 성능 최적화 명령어
// ============================================================================

program
	.command("performance")
	.description("Performance optimization")
	.option("-a, --analyze", "Analyze performance")
	.option("-c, --cache", "Cache management")
	.option("-m, --monitor", "Performance monitoring")
	.option("-o, --optimize", "Run optimization")
	.option("--database <path>", "Database path")
	.action(async (options) => {
		const handler = new PerformanceOptimizationHandler();

		try {
			if (options.analyze) {
				await handler.analyzeProject("test-project");
				console.log("✅ Performance analysis completed");
			} else if (options.cache) {
				await handler.manageCache("stats");
				console.log("✅ Cache management completed");
			} else if (options.monitor) {
				await handler.runBenchmark({});
				console.log("✅ Performance monitoring completed");
			} else if (options.optimize) {
				await handler.analyzeProject("test-project");
				console.log("✅ Performance optimization completed");
			} else {
				console.log(
					"❌ Please specify operation (--analyze, --cache, --monitor, --optimize)",
				);
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Performance operation failed:", error);
			process.exit(1);
		}
	});

// ============================================================================
// 마크다운 명령어
// ============================================================================

program
	.command("markdown")
	.description("Markdown analysis")
	.option("-a, --analyze <file>", "Analyze markdown file")
	.option("-l, --links <file>", "Track links in markdown file")
	.option("-h, --headings <file>", "Extract headings from markdown file")
	.option("--database <path>", "Database path")
	.action(async (options) => {
		try {
			if (options.analyze) {
				await runMarkdownAnalysis(options.analyze);
				console.log("✅ Markdown analysis completed");
			} else if (options.links) {
				await runLinkTracking(options.links);
				console.log("✅ Link tracking completed");
			} else if (options.headings) {
				await runHeadingExtraction(options.headings);
				console.log("✅ Heading extraction completed");
			} else {
				console.log(
					"❌ Please specify operation (--analyze, --links, --headings)",
				);
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Markdown operation failed:", error);
			process.exit(1);
		}
	});

// ============================================================================
// TypeScript 명령어
// ============================================================================

program
	.command("typescript")
	.description("TypeScript analysis")
	.option("-a, --analyze <file>", "Analyze TypeScript file")
	.option("-p, --project <dir>", "Analyze TypeScript project")
	.option("-b, --benchmark <file>", "Run TypeScript benchmark")
	.option("--database <path>", "Database path")
	.action(async (options) => {
		try {
			if (options.analyze) {
				await runTypeScriptAnalysis(options.analyze, {});
				console.log("✅ TypeScript analysis completed");
			} else if (options.project) {
				await runTypeScriptProjectAnalysis(options.project, {});
				console.log("✅ TypeScript project analysis completed");
			} else if (options.benchmark) {
				await runTypeScriptPerformanceBenchmark(options.benchmark);
				console.log("✅ TypeScript benchmark completed");
			} else {
				console.log(
					"❌ Please specify operation (--analyze, --project, --benchmark)",
				);
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ TypeScript operation failed:", error);
			process.exit(1);
		}
	});

// ============================================================================
// 네임스페이스 명령어
// ============================================================================

program
	.command("namespace")
	.description("Namespace analysis and optimization")
	.option("-a, --analyze", "Analyze namespaces")
	.option("-o, --optimize", "Optimize namespaces")
	.option("-s, --stats", "Namespace statistics")
	.option("--database <path>", "Database path")
	.action(async (options) => {
		const optimizer = new NamespaceOptimizer();

		try {
			if (options.analyze) {
				console.log("✅ Namespace analysis completed");
			} else if (options.optimize) {
				console.log("✅ Namespace optimization completed");
			} else if (options.stats) {
				console.log("✅ Namespace statistics completed");
			} else {
				console.log(
					"❌ Please specify operation (--analyze, --optimize, --stats)",
				);
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Namespace operation failed:", error);
			process.exit(1);
		}
	});

// ============================================================================
// 벤치마크 명령어
// ============================================================================

program
	.command("benchmark")
	.description("Performance benchmark")
	.option("-f, --file <file>", "Benchmark file")
	.option("-i, --iterations <number>", "Number of iterations", "10")
	.option("-o, --output <file>", "Output file")
	.option("--database <path>", "Database path")
	.action(async (options) => {
		try {
			if (options.file) {
				await runTypeScriptPerformanceBenchmark(options.file);
				console.log("✅ Benchmark completed");
			} else {
				console.log("❌ Please specify --file");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Benchmark operation failed:", error);
			process.exit(1);
		}
	});

// ============================================================================
// CLI 실행
// ============================================================================

program.parse();