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
	.option("-s, --search <query>", "Search RDF addresses")
	.option("-f, --filter <filter>", "Filter RDF addresses")
	.option("-g, --group <field>", "Group RDF addresses by field")
	.option("-c, --create <address>", "Create RDF address")
	.option("-v, --validate <address>", "Validate RDF address")
	.option("--stats", "Show RDF statistics")
	.action(async (options) => {
		const api = new RDFDatabaseAPI();
		try {
			await api.initialize();

			if (options.search) {
				const results = await api.searchRDFAddresses(options.search);
				console.log(`🔍 Found ${results.length} RDF addresses:`);
				results.forEach((result, index) => {
					console.log(`   ${index + 1}. ${result.rdfAddress}`);
				});
			} else if (options.filter) {
				const results = await api.searchRDFAddresses(options.filter);
				console.log(`🔍 Filtered ${results.length} RDF addresses:`);
				results.forEach((result, index) => {
					console.log(`   ${index + 1}. ${result.rdfAddress}`);
				});
			} else if (options.group) {
				const results = await api.searchRDFAddresses("");
				console.log(`📊 Grouped RDF addresses by ${options.group}:`);
				console.log(`   Total: ${results.length} addresses`);
			} else if (options.create) {
				const address = createRDFAddress(options.create);
				console.log(`✅ Created RDF address: ${address}`);
			} else if (options.validate) {
				const isValid = validateRDFAddress(options.validate);
				console.log(
					`✅ RDF address validation: ${isValid ? "Valid" : "Invalid"}`,
				);
			} else if (options.stats) {
				const stats = await api.generateRDFStatistics();
				console.log("📊 RDF Statistics:");
				console.log(`   Total addresses: ${stats.totalAddresses || 0}`);
				console.log(`   Total relationships: ${stats.totalRelationships || 0}`);
				console.log(`   Projects: ${stats.projectCount || 0}`);
				console.log(`   Files: ${stats.fileCount || 0}`);
				console.log(`   By node type:`, stats.nodeTypeCount || {});
				console.log(`   By namespace:`, stats.namespaceCount || {});
				console.log(`   By relationship type:`, stats.relationshipTypeCount || {});
				console.log(`   Invalid addresses: ${stats.invalidAddresses || 0}`);
			} else {
				console.log("❌ Please specify an RDF operation");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ RDF operation failed:", error);
			process.exit(1);
		} finally {
			await api.close();
		}
	});

// ============================================================================
// 프로그램 실행
// ============================================================================

program.parse();
