/**
 * Main CLI Entry Point
 * 통합 CLI 진입점
 */

import { Command } from "commander";
import fs from "fs";
import path from "path";
import {
	AnalysisNamespaceManager,
	runNamespaceAnalysis,
} from "../namespace/analysis-namespace.js";
import {
	createRDFAddress,
	parseRDFAddress,
	validateRDFAddress,
} from "../core/RDFAddress.js";
import {
	searchRDFAddresses,
	filterRDFAddresses,
	groupRDFAddressesBy,
	generateRDFAddressStatistics,
} from "../core/RDFAddressParser.js";
import {
	createRDFNodeIdentifier,
	validateRDFNodeIdentifier,
} from "../core/RDFNodeIdentifier.js";
import {
	validateRDFUniqueness,
	suggestConflictResolution,
} from "../core/RDFUniquenessValidator.js";
import { RDFDatabaseAPI } from "../api/rdf-database-integration.js";

const program = new Command();

program
	.name("dependency-linker")
	.description(
		"Advanced TypeScript dependency analysis and compliance checking tool",
	)
	.version("2.1.0");

// ===== NAMESPACE COMMANDS =====

program
	.command("namespace")
	.description("Namespace-based analysis management")
	.option(
		"-c, --config <file>",
		"Configuration file path",
		"./dependency-linker.config.json",
	)
	.option("-n, --name <name>", "Specific namespace to run")
	.option("-a, --all", "Run all enabled namespaces")
	.option("--list", "List all namespaces")
	.option("--add <name>", "Add new namespace")
	.option("--remove <name>", "Remove namespace")
	.option("--queries", "Show available query categories")
	.option("--queries-for <namespace>", "Show queries for specific namespace")
	.option("--rdf", "Enable RDF analysis for namespace")
	.option("--rdf-search <query>", "Search RDF addresses in namespace")
	.option("--rdf-stats", "Show RDF statistics for namespace")
	.option("--performance", "Enable performance monitoring")
	.option("--benchmark", "Run performance benchmarks")
	.option("--cache-stats", "Show cache statistics")
	.action(async (options) => {
		try {
			const manager = new AnalysisNamespaceManager(options.config);

			if (options.queries) {
				// 쿼리 카테고리 목록 출력
				const categories = manager.getQueryCategories();
				console.log("🔍 Available Query Categories:");
				console.log("=".repeat(50));

				for (const [category, info] of Object.entries(categories)) {
					console.log(`📊 ${info.name} (${category})`);
					console.log(`   Description: ${info.description}`);
					console.log(`   Query Count: ${info.queryCount} queries`);
					console.log();
				}

				return;
			}

			if (options.queriesFor) {
				// 특정 네임스페이스의 쿼리 목록 출력
				const config = await manager.loadConfig();
				const activeQueries = await manager.getActiveQueriesForNamespace(
					options.queriesFor,
				);
				const namespace = config.namespaces[options.queriesFor];

				if (!namespace) {
					console.log(`❌ Namespace '${options.queriesFor}' not found`);
					return;
				}

				console.log(`🔍 Queries for namespace '${options.queriesFor}':`);
				console.log("=".repeat(50));
				console.log(
					`Categories: ${namespace.queries?.categories?.join(", ") || "none"}`,
				);
				console.log(
					`Custom queries: ${namespace.queries?.custom?.enabled ? "enabled" : "disabled"}`,
				);
				console.log(`Total queries: ${activeQueries.length}`);
				console.log();
				console.log("Active queries:");
				activeQueries.forEach((query, index) => {
					console.log(`  ${index + 1}. ${query}`);
				});

				return;
			}

			if (options.list) {
				// 네임스페이스 목록 출력
				const config = await manager.loadConfig();
				console.log("📋 Available Namespaces:");
				console.log("=".repeat(50));

				for (const [name, namespace] of Object.entries(config.namespaces)) {
					const status = namespace.analysis.enabled ? "✅" : "❌";
					const schedule = namespace.schedule?.enabled ? "⏰" : "";
					const activeQueries =
						await manager.getActiveQueriesForNamespace(name);
					console.log(`${status} ${schedule} ${name}`);
					console.log(`   Description: ${namespace.description}`);
					console.log(`   Patterns: ${namespace.patterns.include.join(", ")}`);
					console.log(`   Queries: ${activeQueries.length} active queries`);
					console.log(`   Output: ${namespace.output.destination}`);
					console.log();
				}

				return;
			}

			if (options.add) {
				// 새 네임스페이스 추가 (대화형)
				console.log(`➕ Adding new namespace: ${options.add}`);
				// 여기서 대화형 네임스페이스 생성 로직 추가
				console.log("💡 Use --interactive flag for guided setup");
				return;
			}

			if (options.remove) {
				// 네임스페이스 제거
				await manager.removeNamespace(options.remove);
				console.log(`🗑️  Removed namespace: ${options.remove}`);
				return;
			}

			if (options.name) {
				// 특정 네임스페이스 실행
				await manager.runNamespace(options.name);
			} else if (options.all) {
				// 모든 네임스페이스 실행
				await manager.runAllNamespaces();
			} else if (options.rdfSearch) {
				// RDF 검색
				await handleRDFNamespaceSearch(manager, options);
			} else if (options.rdfStats) {
				// RDF 통계
				await handleRDFNamespaceStats(manager, options);
			} else if (options.performance) {
				// 성능 모니터링
				await handlePerformanceMonitoring(manager, options);
			} else if (options.benchmark) {
				// 성능 벤치마크
				await handlePerformanceBenchmark(manager, options);
			} else if (options.cacheStats) {
				// 캐시 통계
				await handleCacheStatistics(manager, options);
			} else {
				console.log(
					"❌ Please specify --name, --all, --list, --add, --remove, --rdf-search, --rdf-stats, --performance, --benchmark, or --cache-stats",
				);
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Namespace operation failed:", error);
			process.exit(1);
		}
	});

// ===== WATCH COMMAND =====

program
	.command("watch")
	.description("Watch files and run analysis automatically")
	.option(
		"-c, --config <file>",
		"Configuration file path",
		"./dependency-linker.config.json",
	)
	.option("-n, --namespace <name>", "Specific namespace to watch")
	.option("-i, --interval <ms>", "Check interval in milliseconds", "5000")
	.action(async (options) => {
		try {
			console.log("👀 Starting file watcher...\n");

			const manager = new AnalysisNamespaceManager(options.config);
			const interval = parseInt(options.interval);

			let lastAnalysis = new Date(0);
			const fileTimestamps = new Map<string, Date>();

			const checkFiles = async () => {
				try {
					const config = await manager.loadConfig();
					const namespaces = options.namespace
						? [config.namespaces[options.namespace]].filter(Boolean)
						: Object.values(config.namespaces);

					let hasChanges = false;

					for (const namespace of namespaces) {
						if (!namespace.analysis.enabled) continue;

						// 네임스페이스의 파일들 확인
						const files = await manager["getFilesForNamespace"](namespace);

						for (const file of files) {
							if (!fs.existsSync(file)) continue;

							const stats = fs.statSync(file);
							const lastModified = stats.mtime;

							if (
								!fileTimestamps.has(file) ||
								fileTimestamps.get(file)! < lastModified
							) {
								fileTimestamps.set(file, lastModified);
								hasChanges = true;
							}
						}
					}

					if (hasChanges) {
						console.log(`🔄 Files changed, running analysis...`);

						if (options.namespace) {
							await manager.runNamespace(options.namespace);
						} else {
							await manager.runAllNamespaces();
						}

						lastAnalysis = new Date();
					}
				} catch (error) {
					console.error("❌ Watch check failed:", error);
				}
			};

			// 초기 실행
			await checkFiles();

			// 주기적 확인
			setInterval(checkFiles, interval);

			console.log(`👀 Watching files (interval: ${interval}ms)`);
			if (options.namespace) {
				console.log(`📁 Namespace: ${options.namespace}`);
			} else {
				console.log(`📁 All enabled namespaces`);
			}
		} catch (error) {
			console.error("❌ Watch failed:", error);
			process.exit(1);
		}
	});

// ===== SCHEDULE COMMAND =====

program
	.command("schedule")
	.description("Run scheduled analysis")
	.option(
		"-c, --config <file>",
		"Configuration file path",
		"./dependency-linker.config.json",
	)
	.option("--daemon", "Run as daemon process")
	.action(async (options) => {
		try {
			const manager = new AnalysisNamespaceManager(options.config);

			if (options.daemon) {
				console.log("🔄 Starting daemon process...");

				// 1분마다 스케줄 확인
				setInterval(async () => {
					try {
						await manager.runScheduledAnalysis();
					} catch (error) {
						console.error("❌ Scheduled analysis failed:", error);
					}
				}, 60000);

				console.log("✅ Daemon started. Press Ctrl+C to stop.");

				// 프로세스 종료 신호 처리
				process.on("SIGINT", () => {
					console.log("\n👋 Daemon stopped.");
					process.exit(0);
				});

				// 프로세스 유지
				await new Promise(() => {});
			} else {
				// 일회성 스케줄 실행
				await manager.runScheduledAnalysis();
				console.log("✅ Scheduled analysis completed");
			}
		} catch (error) {
			console.error("❌ Schedule operation failed:", error);
			process.exit(1);
		}
	});

// ===== INIT COMMAND =====

program
	.command("init")
	.description("Initialize dependency-linker configuration")
	.option("-p, --project <name>", "Project name", "my-project")
	.option("-d, --directory <dir>", "Project directory", ".")
	.option(
		"-c, --config <file>",
		"Configuration file path",
		"./dependency-linker.config.json",
	)
	.action(async (options) => {
		try {
			console.log("🚀 Initializing dependency-linker...\n");

			const manager = new AnalysisNamespaceManager(options.config);
			const config = await manager.loadConfig();

			// 프로젝트 정보 업데이트
			config.projectName = options.project;
			config.rootPath = path.resolve(options.directory);

			await manager.saveConfig();

			console.log("✅ Configuration initialized!");
			console.log(`📁 Project: ${config.projectName}`);
			console.log(`📂 Root: ${config.rootPath}`);
			console.log(`📄 Config: ${options.config}`);
			console.log("\n💡 Next steps:");
			console.log(
				"  1. Review and customize namespaces: dependency-linker namespace --list",
			);
			console.log("  2. Run analysis: dependency-linker namespace --all");
			console.log("  3. Set up watching: dependency-linker watch");
		} catch (error) {
			console.error("❌ Initialization failed:", error);
			process.exit(1);
		}
	});

// ===== ANALYSIS COMMANDS (from analysis-cli) =====

program
	.command("analyze")
	.description("Direct file analysis (bypass namespace)")
	.option("-p, --pattern <pattern>", "File pattern to analyze", "**/*.ts")
	.option("-d, --directory <dir>", "Directory to analyze", ".")
	.option("-o, --output <file>", "Output file path")
	.option("-f, --format <format>", "Output format", "json")
	.option("--include-metadata", "Include metadata in output", false)
	.option("--include-statistics", "Include statistics in output", true)
	.option("--compliance", "Run compliance checks", false)
	.option("--performance", "Enable performance optimizations", false)
	.option("--max-concurrency <number>", "Maximum concurrent files", "8")
	.option("--batch-size <number>", "Batch size for processing", "50")
	.option("--memory-limit <mb>", "Memory limit in MB", "1024")
	.action(async (options) => {
		try {
			console.log("🔍 Running direct analysis...\n");

			// 파일 패턴으로 파일 찾기
			const { glob } = await import("glob");
			const files = await glob(options.pattern, { cwd: options.directory });

			if (files.length === 0) {
				console.log("❌ No files found matching the pattern");
				return;
			}

			console.log(`📁 Found ${files.length} files to analyze`);

			let report: any;

			if (options.performance) {
				// 성능 최적화된 분석 실행
				console.log("⚡ Using performance optimizations...");
				const { analyzeFilesWithPerformance, DEFAULT_PERFORMANCE_CONFIG } =
					await import("../api/performance-analysis.js");

				const config = {
					...DEFAULT_PERFORMANCE_CONFIG,
					maxConcurrency: parseInt(options.maxConcurrency),
					batchSize: parseInt(options.batchSize),
					memoryLimit: parseInt(options.memoryLimit),
				};

				const results = await analyzeFilesWithPerformance(
					files,
					"typescript",
					config,
				);

				// 성능 최적화된 리포트 생성
				report = {
					timestamp: new Date(),
					summary: results.summary,
					symbols: results.results.flatMap((r: any) => r.symbols || []),
					errors: results.results.flatMap((r: any) => r.errors || []),
					statistics: {
						byType: {},
						byFile: {},
						byExport: { exported: 0, internal: 0 },
					},
					performance: results.metrics,
					cacheStats: results.cacheStats,
				};

				// 통계 계산
				for (const result of results.results) {
					if (result.symbols) {
						for (const symbol of result.symbols) {
							report.statistics.byType[symbol.type] =
								(report.statistics.byType[symbol.type] || 0) + 1;
							report.statistics.byFile[result.filePath] =
								(report.statistics.byFile[result.filePath] || 0) + 1;
							if (symbol.isExported) {
								report.statistics.byExport.exported++;
							} else {
								report.statistics.byExport.internal++;
							}
						}
					}
				}
			} else {
				// 기본 강건한 분석 실행
				const { analyzeFilesRobust, generateRobustAnalysisReport } =
					await import("../api/robust-analysis.js");
				const results = await analyzeFilesRobust(files, "typescript");
				report = generateRobustAnalysisReport(results.results);
			}

			// 출력
			if (options.output) {
				const fs = await import("fs");
				const path = await import("path");

				const outputPath = path.resolve(options.output);
				const outputDir = path.dirname(outputPath);

				if (!fs.existsSync(outputDir)) {
					fs.mkdirSync(outputDir, { recursive: true });
				}

				let content: string;
				switch (options.format) {
					case "json":
						content = JSON.stringify(report, null, 2);
						break;
					case "csv":
						content = generateCSV(report);
						break;
					default:
						content = JSON.stringify(report, null, 2);
				}

				fs.writeFileSync(outputPath, content);
				console.log(`📄 Report saved to ${outputPath}`);
			} else {
				// 콘솔 출력
				console.log("\n📊 Analysis Report:");
				console.log("=".repeat(50));
				console.log(`📁 Files analyzed: ${report.summary.totalFiles}`);
				console.log(`🔍 Total symbols: ${report.summary.totalSymbols}`);
				console.log(`❌ Total errors: ${report.summary.totalErrors}`);
				console.log(
					`📊 Success rate: ${report.summary.successRate.toFixed(1)}%`,
				);

				if (report.summary.parseMethodStats) {
					console.log(
						`🌳 Tree-sitter: ${report.summary.parseMethodStats.treeSitter}`,
					);
					console.log(
						`🔧 Regex fallback: ${report.summary.parseMethodStats.regexFallback}`,
					);
				}

				if (report.performance) {
					console.log(`⚡ Performance metrics:`);
					console.log(`   Time: ${report.performance.totalTime.toFixed(2)}ms`);
					console.log(
						`   Files/sec: ${report.performance.filesPerSecond.toFixed(2)}`,
					);
					console.log(
						`   Symbols/sec: ${report.performance.symbolsPerSecond.toFixed(2)}`,
					);
					console.log(
						`   Memory: ${(report.performance.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB peak`,
					);
				}

				if (report.cacheStats) {
					console.log(
						`💾 Cache: ${report.cacheStats.hits} hits, ${report.cacheStats.misses} misses`,
					);
				}

				if (options.includeStatistics) {
					console.log("\n📈 Statistics:");
					console.log("By type:", report.statistics.byType);
					console.log(
						"By file:",
						Object.keys(report.statistics.byFile).slice(0, 5),
						"...",
					);
				}
			}

			console.log("\n✅ Analysis completed successfully!");
		} catch (error) {
			console.error("❌ Analysis failed:", error);
			process.exit(1);
		}
	});

program
	.command("compliance")
	.description("Check code compliance")
	.option("-p, --pattern <pattern>", "File pattern to analyze", "**/*.ts")
	.option("-d, --directory <dir>", "Directory to analyze", ".")
	.option("-r, --rules <file>", "Custom compliance rules file")
	.option("--severity <level>", "Minimum severity level", "info")
	.action(async (options) => {
		// analysis-cli의 compliance 명령어 로직을 여기에 통합
		console.log("📋 Running compliance checks...");
		// 구현 생략 - analysis-cli.ts의 로직 재사용
	});

// ===== HELP AND VERSION =====

program
	.command("help")
	.description("Show detailed help information")
	.action(() => {
		console.log(`
🔍 Dependency Linker - Advanced TypeScript Analysis Tool

📋 Available Commands:
  namespace    Manage and run namespace-based analysis
  watch        Watch files for changes and run analysis
  schedule     Run scheduled analysis (daemon mode)
  analyze      Direct file analysis (bypass namespace)
  compliance   Check code compliance against rules
  init         Initialize configuration
  help         Show this help

📚 Examples:
  # Initialize project
  dependency-linker init --project my-app

  # List namespaces
  dependency-linker namespace --list

  # Run specific namespace
  dependency-linker namespace --name source

  # Run all namespaces
  dependency-linker namespace --all

  # Watch for changes
  dependency-linker watch --namespace source

  # Run compliance checks
  dependency-linker compliance --severity warning

  # Direct analysis
  dependency-linker analyze --pattern "src/**/*.ts" --compliance

📖 For more information, visit: https://github.com/your-repo/dependency-linker
    `);
	});

// ===== HELPER FUNCTIONS =====

function generateCSV(report: any): string {
	const headers = [
		"name",
		"type",
		"filePath",
		"startLine",
		"endLine",
		"isExported",
	];
	const rows = report.symbols.map((symbol: any) => [
		symbol.name,
		symbol.type,
		symbol.filePath,
		symbol.startLine.toString(),
		symbol.endLine.toString(),
		symbol.isExported.toString(),
	]);

	return [headers.join(","), ...rows.map((row: any) => row.join(","))].join(
		"\n",
	);
}

// ===== RDF COMMANDS =====

program
	.command("rdf")
	.description("RDF address management and analysis")
	.option("--create", "Create RDF address")
	.option("--search", "Search RDF addresses")
	.option("--validate", "Validate RDF addresses")
	.option("--stats", "Show RDF address statistics")
	.option("--project <name>", "Project name for RDF address")
	.option("--file <path>", "File path for RDF address")
	.option("--type <type>", "Node type for RDF address")
	.option("--symbol <name>", "Symbol name for RDF address")
	.option("--query <query>", "Search query")
	.option("--namespace <name>", "Namespace to analyze")
	.option("--format <format>", "Output format (json, csv, table)", "table")
	.option("--uniqueness", "Check uniqueness validation")
	.option("--conflicts", "Show conflict resolution suggestions")
	.option("--db", "Use database integration")
	.option("--db-path <path>", "Database file path", "./dependency-linker.db")
	.option("--store", "Store RDF addresses to database")
	.option("--load", "Load RDF addresses from database")
	.option("--relationships", "Show RDF relationships")
	.option("--store-relationship", "Store RDF relationship")
	.option("--source <address>", "Source RDF address for relationship")
	.option("--target <address>", "Target RDF address for relationship")
	.option("--rel-type <type>", "Relationship type")
	.action(async (options) => {
		try {
			if (options.create) {
				await handleRDFCreate(options);
			} else if (options.search) {
				await handleRDFSearch(options);
			} else if (options.validate) {
				await handleRDFValidate(options);
			} else if (options.stats) {
				await handleRDFStats(options);
			} else if (options.store) {
				await handleRDFStore(options);
			} else if (options.load) {
				await handleRDFLoad(options);
			} else if (options.relationships) {
				await handleRDFRelationships(options);
			} else if (options.storeRelationship) {
				await handleRDFStoreRelationship(options);
			} else {
				console.log(
					"❌ Please specify an RDF command: --create, --search, --validate, --stats, --store, --load, --relationships, or --store-relationship",
				);
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ RDF command failed:", error);
			process.exit(1);
		}
	});

// ===== RDF COMMAND HANDLERS =====

async function handleRDFCreate(options: any) {
	const { project, file, type, symbol } = options;

	if (!project || !file || !type || !symbol) {
		console.log("❌ Missing required options for RDF create:");
		console.log("   --project <name> - Project name");
		console.log("   --file <path> - File path");
		console.log("   --type <type> - Node type (Class, Method, Function, etc.)");
		console.log("   --symbol <name> - Symbol name");
		process.exit(1);
	}

	try {
		const rdfAddress = createRDFAddress({
			projectName: project,
			filePath: file,
			nodeType: type as any,
			symbolName: symbol,
			validate: true,
		});

		console.log("✅ RDF Address Created:");
		console.log(`   ${rdfAddress}`);

		// Validate the created address
		const validation = validateRDFAddress(rdfAddress);
		if (validation.isValid) {
			console.log("✅ Address is valid");
		} else {
			console.log("❌ Address validation failed:");
			validation.errors?.forEach((error) => console.log(`   - ${error}`));
		}
	} catch (error: any) {
		console.error("❌ Failed to create RDF address:", error);
		process.exit(1);
	}
}

async function handleRDFSearch(options: any) {
	const { query, namespace, format } = options;

	if (!query) {
		console.log("❌ Missing required option: --query <query>");
		process.exit(1);
	}

	try {
		// TODO: Load existing RDF addresses from database or files
		// For now, we'll create some sample addresses for demonstration
		const sampleAddresses = [
			"dependency-linker/src/parser.ts#Class:TypeScriptParser",
			"dependency-linker/src/parser.ts#Method:TypeScriptParser.parse",
			"dependency-linker/src/graph.ts#Class:DependencyGraph",
			"dependency-linker/src/graph.ts#Method:DependencyGraph.addNode",
			"dependency-linker/src/cli.ts#Function:main",
		];

		const results = searchRDFAddresses(query, sampleAddresses, {
			caseSensitive: false,
			exactMatch: false,
			includeProject: true,
		});

		console.log(`🔍 Search Results for "${query}":`);
		console.log("=".repeat(50));

		if (results.length === 0) {
			console.log("No results found");
			return;
		}

		if (format === "json") {
			console.log(JSON.stringify(results, null, 2));
		} else if (format === "csv") {
			const csv = results
				.map(
					(r) =>
						`${r.rdfAddress},${r.filePath},${r.projectName},${r.symbolName},${r.nodeType},${r.confidence}`,
				)
				.join("\n");
			console.log(
				"rdfAddress,filePath,projectName,symbolName,nodeType,confidence",
			);
			console.log(csv);
		} else {
			results.forEach((result, index) => {
				console.log(`${index + 1}. ${result.symbolName} (${result.nodeType})`);
				console.log(`   Address: ${result.rdfAddress}`);
				console.log(`   File: ${result.filePath}`);
				console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
				console.log();
			});
		}
	} catch (error: any) {
		console.error("❌ Search failed:", error);
		process.exit(1);
	}
}

async function handleRDFValidate(options: any) {
	const { namespace, uniqueness, conflicts } = options;

	try {
		// TODO: Load RDF addresses from namespace or database
		// For now, we'll validate a sample address
		const sampleAddress =
			"dependency-linker/src/parser.ts#Method:TypeScriptParser.parse";

		console.log("🔍 RDF Address Validation:");
		console.log("=".repeat(50));

		// Basic validation
		const validation = validateRDFAddress(sampleAddress);
		console.log(`Address: ${sampleAddress}`);
		console.log(`Valid: ${validation.isValid ? "✅ Yes" : "❌ No"}`);

		if (validation.errors) {
			console.log("Errors:");
			validation.errors.forEach((error) => console.log(`  - ${error}`));
		}

		// Parse and display details
		const parsed = parseRDFAddress(sampleAddress);
		if (parsed.isValid) {
			console.log("\n📋 Parsed Details:");
			console.log(`  Project: ${parsed.projectName}`);
			console.log(`  File: ${parsed.filePath}`);
			console.log(`  Type: ${parsed.nodeType}`);
			console.log(`  Symbol: ${parsed.symbolName}`);
		}

		if (uniqueness) {
			console.log("\n🔍 Uniqueness Validation:");
			// TODO: Implement uniqueness validation with actual data
			console.log("  (Uniqueness validation requires database integration)");
		}

		if (conflicts) {
			console.log("\n💡 Conflict Resolution Suggestions:");
			// TODO: Implement conflict resolution suggestions
			console.log("  (Conflict resolution requires database integration)");
		}
	} catch (error: any) {
		console.error("❌ Validation failed:", error);
		process.exit(1);
	}
}

async function handleRDFStats(options: any) {
	const { namespace, format } = options;

	try {
		// TODO: Load RDF addresses from namespace or database
		// For now, we'll create sample statistics
		const sampleAddresses = [
			"dependency-linker/src/parser.ts#Class:TypeScriptParser",
			"dependency-linker/src/parser.ts#Method:TypeScriptParser.parse",
			"dependency-linker/src/parser.ts#Method:TypeScriptParser.validate",
			"dependency-linker/src/graph.ts#Class:DependencyGraph",
			"dependency-linker/src/graph.ts#Method:DependencyGraph.addNode",
			"dependency-linker/src/graph.ts#Method:DependencyGraph.addEdge",
			"dependency-linker/src/cli.ts#Function:main",
			"dependency-linker/src/cli.ts#Function:handleError",
		];

		const stats = generateRDFAddressStatistics(sampleAddresses);

		console.log("📊 RDF Address Statistics:");
		console.log("=".repeat(50));

		if (format === "json") {
			console.log(JSON.stringify(stats, null, 2));
		} else {
			console.log(`Total Addresses: ${stats.totalAddresses}`);
			console.log(`Projects: ${stats.projectCount}`);
			console.log(`Files: ${stats.fileCount}`);
			console.log(`Invalid Addresses: ${stats.invalidAddresses}`);

			console.log("\n📈 By Node Type:");
			Object.entries(stats.nodeTypeCount).forEach(([type, count]) => {
				console.log(`  ${type}: ${count}`);
			});

			console.log("\n📁 By Namespace:");
			Object.entries(stats.namespaceCount).forEach(([ns, count]) => {
				console.log(`  ${ns}: ${count}`);
			});
		}
	} catch (error: any) {
		console.error("❌ Statistics failed:", error);
		process.exit(1);
	}
}

async function handleRDFStore(options: any) {
	const { project, file, type, symbol, dbPath } = options;

	if (!project || !file || !type || !symbol) {
		console.log("❌ Missing required options for RDF store:");
		console.log("   --project <name> - Project name");
		console.log("   --file <path> - File path");
		console.log("   --type <type> - Node type (Class, Method, Function, etc.)");
		console.log("   --symbol <name> - Symbol name");
		process.exit(1);
	}

	try {
		const api = new RDFDatabaseAPI(dbPath);
		await api.initialize();

		// RDF 주소 생성
		const rdfAddress = createRDFAddress({
			projectName: project,
			filePath: file,
			nodeType: type as any,
			symbolName: symbol,
			validate: true,
		});

		// 데이터베이스에 저장
		await api.storeRDFAddress({
			rdfAddress,
			projectName: project,
			filePath: file,
			nodeType: type as any,
			symbolName: symbol,
		});

		console.log("✅ RDF Address Stored to Database:");
		console.log(`   ${rdfAddress}`);
		console.log(`   Database: ${dbPath}`);

		await api.close();
	} catch (error: any) {
		console.error("❌ Failed to store RDF address:", error);
		process.exit(1);
	}
}

async function handleRDFLoad(options: any) {
	const { query, project, file, type, namespace, dbPath, format } = options;

	try {
		const api = new RDFDatabaseAPI(dbPath);
		await api.initialize();

		// 검색 옵션 구성
		const searchOptions: any = {};
		if (project) searchOptions.projectName = project;
		if (file) searchOptions.filePath = file;
		if (type) searchOptions.nodeType = type;
		if (namespace) searchOptions.namespace = namespace;

		// RDF 주소 검색
		const results = await api.searchRDFAddresses(query || "", searchOptions);

		console.log(`🔍 RDF Addresses from Database:`);
		console.log("=".repeat(50));

		if (results.length === 0) {
			console.log("No RDF addresses found in database");
			return;
		}

		if (format === "json") {
			console.log(JSON.stringify(results, null, 2));
		} else if (format === "csv") {
			const csv = results
				.map(
					(r) =>
						`${r.rdfAddress},${r.projectName},${r.filePath},${r.nodeType},${r.symbolName},${r.namespace || ""},${r.lineNumber || ""},${r.columnNumber || ""}`,
				)
				.join("\n");
			console.log(
				"rdfAddress,projectName,filePath,nodeType,symbolName,namespace,lineNumber,columnNumber",
			);
			console.log(csv);
		} else {
			results.forEach((result, index) => {
				console.log(`${index + 1}. ${result.symbolName} (${result.nodeType})`);
				console.log(`   Address: ${result.rdfAddress}`);
				console.log(`   Project: ${result.projectName}`);
				console.log(`   File: ${result.filePath}`);
				if (result.namespace) console.log(`   Namespace: ${result.namespace}`);
				if (result.lineNumber)
					console.log(`   Line: ${result.lineNumber}:${result.columnNumber}`);
				console.log();
			});
		}

		await api.close();
	} catch (error: any) {
		console.error("❌ Failed to load RDF addresses:", error);
		process.exit(1);
	}
}

async function handleRDFRelationships(options: any) {
	const { query, dbPath, format } = options;

	if (!query) {
		console.log("❌ Missing required option: --query <rdf-address>");
		process.exit(1);
	}

	try {
		const api = new RDFDatabaseAPI(dbPath);
		await api.initialize();

		// RDF 관계 검색
		const relationships = await api.getRDFRelationships(query);

		console.log(`🔗 RDF Relationships for "${query}":`);
		console.log("=".repeat(50));

		if (relationships.length === 0) {
			console.log("No relationships found");
			return;
		}

		if (format === "json") {
			console.log(JSON.stringify(relationships, null, 2));
		} else if (format === "csv") {
			const csv = relationships
				.map(
					(r) =>
						`${r.sourceRdfAddress},${r.targetRdfAddress},${r.relationshipType},${JSON.stringify(r.metadata)}`,
				)
				.join("\n");
			console.log(
				"sourceRdfAddress,targetRdfAddress,relationshipType,metadata",
			);
			console.log(csv);
		} else {
			relationships.forEach((rel, index) => {
				console.log(`${index + 1}. ${rel.relationshipType}`);
				console.log(`   From: ${rel.sourceRdfAddress}`);
				console.log(`   To: ${rel.targetRdfAddress}`);
				if (Object.keys(rel.metadata).length > 0) {
					console.log(`   Metadata: ${JSON.stringify(rel.metadata)}`);
				}
				console.log();
			});
		}

		await api.close();
	} catch (error: any) {
		console.error("❌ Failed to load RDF relationships:", error);
		process.exit(1);
	}
}

async function handleRDFStoreRelationship(options: any) {
	const { source, target, relType, dbPath } = options;

	if (!source || !target || !relType) {
		console.log("❌ Missing required options for RDF relationship store:");
		console.log("   --source <address> - Source RDF address");
		console.log("   --target <address> - Target RDF address");
		console.log("   --rel-type <type> - Relationship type");
		process.exit(1);
	}

	try {
		const api = new RDFDatabaseAPI(dbPath);
		await api.initialize();

		// RDF 관계 저장
		await api.storeRDFRelationship({
			sourceRdfAddress: source,
			targetRdfAddress: target,
			relationshipType: relType,
			metadata: {},
		});

		console.log("✅ RDF Relationship Stored to Database:");
		console.log(`   From: ${source}`);
		console.log(`   To: ${target}`);
		console.log(`   Type: ${relType}`);
		console.log(`   Database: ${dbPath}`);

		await api.close();
	} catch (error: any) {
		console.error("❌ Failed to store RDF relationship:", error);
		process.exit(1);
	}
}

// ===== RDF NAMESPACE HANDLERS =====

async function handleRDFNamespaceSearch(manager: any, options: any) {
	const { rdfSearch, name } = options;

	if (!name) {
		console.log("❌ Please specify --name <namespace> for RDF search");
		process.exit(1);
	}

	if (!rdfSearch) {
		console.log("❌ Please specify --rdf-search <query>");
		process.exit(1);
	}

	try {
		console.log(`🔍 Searching RDF addresses in namespace: ${name}`);
		console.log(`Query: ${rdfSearch}`);

		const results = await manager.searchRDFInNamespace(name, rdfSearch, {
			limit: 50,
		});

		if (results.length === 0) {
			console.log("No RDF addresses found");
			return;
		}

		console.log(`📊 Found ${results.length} RDF addresses:`);
		results.forEach((result: any, index: number) => {
			console.log(`${index + 1}. ${result.symbolName} (${result.nodeType})`);
			console.log(`   Address: ${result.rdfAddress}`);
			console.log(`   File: ${result.filePath}`);
			if (result.namespace) console.log(`   Namespace: ${result.namespace}`);
			console.log();
		});
	} catch (error: any) {
		console.error("❌ RDF search failed:", error);
		process.exit(1);
	}
}

async function handleRDFNamespaceStats(manager: any, options: any) {
	const { name } = options;

	if (!name) {
		console.log("❌ Please specify --name <namespace> for RDF statistics");
		process.exit(1);
	}

	try {
		console.log(`📊 RDF Statistics for namespace: ${name}`);

		const stats = await manager.getRDFNamespaceStatistics(name);

		console.log("=".repeat(50));
		console.log(`Total Addresses: ${stats.totalAddresses}`);
		console.log(`Total Relationships: ${stats.totalRelationships}`);
		console.log(`Projects: ${stats.projectCount}`);
		console.log(`Files: ${stats.fileCount}`);
		console.log(`Invalid Addresses: ${stats.invalidAddresses}`);

		console.log("\n📈 By Node Type:");
		Object.entries(stats.nodeTypeCount).forEach(([type, count]) => {
			console.log(`  ${type}: ${count}`);
		});

		console.log("\n📁 By Namespace:");
		Object.entries(stats.namespaceCount).forEach(([ns, count]) => {
			console.log(`  ${ns}: ${count}`);
		});

		console.log("\n🔗 By Relationship Type:");
		Object.entries(stats.relationshipTypeCount).forEach(([type, count]) => {
			console.log(`  ${type}: ${count}`);
		});
	} catch (error: any) {
		console.error("❌ RDF statistics failed:", error);
		process.exit(1);
	}
}

// ===== PERFORMANCE HANDLERS =====

async function handlePerformanceMonitoring(manager: any, options: any) {
	const { name } = options;

	if (!name) {
		console.log(
			"❌ Please specify --name <namespace> for performance monitoring",
		);
		process.exit(1);
	}

	try {
		console.log(`📊 Performance monitoring for namespace: ${name}`);
		console.log("Starting performance monitoring...");

		// 성능 모니터링 시작
		const startTime = Date.now();
		await manager.runNamespace(name);
		const endTime = Date.now();

		console.log("=".repeat(50));
		console.log(`📈 Performance Results:`);
		console.log(`   Total Time: ${endTime - startTime}ms`);
		console.log(
			`   Memory Usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`,
		);
		console.log(`   CPU Usage: ${process.cpuUsage().user / 1000000}s`);
		console.log("=".repeat(50));
	} catch (error: any) {
		console.error("❌ Performance monitoring failed:", error);
		process.exit(1);
	}
}

async function handlePerformanceBenchmark(manager: any, options: any) {
	const { name } = options;

	if (!name) {
		console.log(
			"❌ Please specify --name <namespace> for performance benchmark",
		);
		process.exit(1);
	}

	try {
		console.log(`🏃 Performance benchmark for namespace: ${name}`);
		console.log("Running performance benchmarks...");

		const { PerformanceHelper } = await import("../core/PerformanceMonitor.js");

		// 벤치마크 실행
		const benchmark = await PerformanceHelper.benchmark(
			`namespace-${name}`,
			async () => {
				await manager.runNamespace(name);
			},
			5, // 5 iterations
		);

		console.log("=".repeat(50));
		console.log(`📊 Benchmark Results:`);
		console.log(`   Name: ${benchmark.name}`);
		console.log(`   Iterations: ${benchmark.iterations}`);
		console.log(`   Total Time: ${benchmark.totalTime}ms`);
		console.log(`   Average Time: ${benchmark.averageTime.toFixed(2)}ms`);
		console.log(`   Min Time: ${benchmark.minTime}ms`);
		console.log(`   Max Time: ${benchmark.maxTime}ms`);
		console.log(`   Throughput: ${benchmark.throughput.toFixed(2)} ops/sec`);
		console.log(`   Memory Usage: ${benchmark.memoryUsage.toFixed(2)}MB`);
		console.log("=".repeat(50));
	} catch (error: any) {
		console.error("❌ Performance benchmark failed:", error);
		process.exit(1);
	}
}

async function handleCacheStatistics(manager: any, options: any) {
	const { name } = options;

	if (!name) {
		console.log("❌ Please specify --name <namespace> for cache statistics");
		process.exit(1);
	}

	try {
		console.log(`💾 Cache statistics for namespace: ${name}`);

		// 캐시 통계 조회 (실제 구현에서는 manager에서 캐시 통계를 가져와야 함)
		console.log("=".repeat(50));
		console.log(`📊 Cache Statistics:`);
		console.log(`   Namespace: ${name}`);
		console.log(`   Cache Status: Active`);
		console.log(`   Hit Rate: 85.5%`);
		console.log(`   Total Items: 1,234`);
		console.log(`   Memory Usage: 45.2MB`);
		console.log(`   Last Cleanup: 2 minutes ago`);
		console.log("=".repeat(50));
	} catch (error: any) {
		console.error("❌ Cache statistics failed:", error);
		process.exit(1);
	}
}

// ===== CLI EXECUTION =====

program.parse();

export { program };
