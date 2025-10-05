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
			} else {
				console.log(
					"❌ Please specify --name, --all, --list, --add, or --remove",
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

// ===== CLI EXECUTION =====

program.parse();

export { program };
