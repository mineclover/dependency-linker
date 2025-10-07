/**
 * TypeScript 분석 핸들러
 * TypeScript 관련 CLI 명령어들을 처리
 */

import { analyzeFileWithAdvancedGraph } from "../../api/advanced-graph-analysis";
import { analyzeFileWithGraphDB as analyzeFileWithGraphBased } from "../../api/graph-based-analysis";
import { analyzeFileWithGraphDB } from "../../api/graph-db-analysis";
import {
	analyzeFilesWithPerformance,
	DEFAULT_PERFORMANCE_CONFIG,
} from "../../api/performance-analysis.js";
import {
	analyzeFilesRobust,
	generateRobustAnalysisReport,
} from "../../api/robust-analysis.js";
import { analyzeFileWithSimpleGraph } from "../../api/simple-graph-analysis";
import { analyzeSingleFileFixed } from "../../api/single-file-analysis-fixed";
import { PerformanceHelper } from "../../core/PerformanceMonitor.js";

/**
 * TypeScript 파일 분석 실행
 */
export async function runTypeScriptAnalysis(
	filePath: string,
	options: {
		analysisType?: string;
		performance?: boolean;
		maxConcurrency?: string;
		batchSize?: string;
		memoryLimit?: string;
		output?: string;
		format?: string;
		includeStatistics?: boolean;
	},
): Promise<void> {
	try {
		console.log(`🔍 TypeScript analysis for: ${filePath}`);

		let result: any;

		switch (options.analysisType) {
			case "simple":
				result = await analyzeFileWithSimpleGraph(filePath, "typescript");
				break;

			case "graph-db":
				result = await analyzeFileWithGraphDB(
					filePath,
					process.cwd(),
					"typescript-project",
					{
						includeGraphStats: options.includeStatistics !== false,
						enableHotReload: true,
					},
				);
				break;

			case "advanced":
				result = await analyzeFileWithAdvancedGraph(
					filePath,
					process.cwd(),
					"typescript-project",
					{
						analyzeChains: true,
						detectCircular: true,
						analyzeDepth: true,
						maxDepth: 5,
						enableHotReload: true,
						enablePerformanceMonitoring: true,
						enableCaching: true,
						enableBatchProcessing: true,
					},
				);
				break;

			case "graph-based":
				result = await analyzeFileWithGraphBased(
					filePath,
					process.cwd(),
					"typescript-project",
					{
						includeGraphStats: options.includeStatistics !== false,
					},
				);
				break;

			default:
				result = await analyzeSingleFileFixed(filePath, "typescript");
				break;
		}

		// 결과 출력
		console.log("=".repeat(50));
		console.log(`📊 TypeScript Analysis Results:`);
		console.log(`   File: ${result.file.path}`);
		console.log(`   Language: ${result.file.language}`);
		console.log(`   Size: ${result.file.size} bytes`);
		console.log(
			`   Last Modified: ${result.file.lastModified.toLocaleString("ko-KR")}`,
		);

		if (result.dependencies) {
			console.log(`\n🔗 Dependencies:`);
			if (result.dependencies.internalFiles) {
				console.log(
					`   Internal Files: ${result.dependencies.internalFiles.length}`,
				);
			}
			if (result.dependencies.libraries) {
				console.log(`   Libraries: ${result.dependencies.libraries.length}`);
			}
			if (result.dependencies.builtins) {
				console.log(`   Builtins: ${result.dependencies.builtins.length}`);
			}
		}

		if (result.metadata) {
			console.log(`\n📊 Metadata:`);
			console.log(
				`   Analyzed At: ${result.metadata.analyzedAt.toISOString()}`,
			);
			console.log(
				`   File Hash: ${result.metadata.fileHash.substring(0, 16)}...`,
			);
		}

		// 출력 파일 저장
		if (options.output) {
			const outputPath = require("node:path").resolve(options.output);
			const outputDir = require("node:path").dirname(outputPath);
			const fs = require("node:fs");

			if (!fs.existsSync(outputDir)) {
				fs.mkdirSync(outputDir, { recursive: true });
			}

			let content: string;
			switch (options.format || "json") {
				case "csv":
					content = generateCSVOutput(result);
					break;
				case "markdown":
					content = generateMarkdownOutput(result);
					break;
				default:
					content = JSON.stringify(result, null, 2);
					break;
			}

			fs.writeFileSync(outputPath, content, "utf-8");
			console.log(`\n💾 Results saved to: ${outputPath}`);
		}

		console.log(`\n✅ TypeScript analysis completed for: ${filePath}`);
	} catch (error) {
		console.error(`❌ TypeScript analysis failed for ${filePath}:`, error);
		throw error;
	}
}

/**
 * TypeScript 프로젝트 분석 실행
 */
export async function runTypeScriptProjectAnalysis(
	pattern: string,
	options: {
		performance?: boolean;
		maxConcurrency?: string;
		batchSize?: string;
		memoryLimit?: string;
		output?: string;
		format?: string;
		includeStatistics?: boolean;
	},
): Promise<void> {
	try {
		console.log(`🔍 TypeScript project analysis for pattern: ${pattern}`);

		const { glob } = await import("glob");
		const files = await glob(pattern, { cwd: process.cwd() });

		if (files.length === 0) {
			console.log("❌ No files found matching the pattern");
			return;
		}

		console.log(`📁 Found ${files.length} files to analyze`);

		let report: any;

		if (options.performance) {
			// 성능 최적화된 분석 실행
			console.log("⚡ Using performance optimizations...");

			const _config = {
				...DEFAULT_PERFORMANCE_CONFIG,
				maxConcurrency: parseInt(options.maxConcurrency || "4", 10),
				batchSize: parseInt(options.batchSize || "10", 10),
				memoryLimit: parseInt(options.memoryLimit || "1024", 10) * 1024 * 1024,
			};

			const results = await analyzeFilesWithPerformance(files, "typescript");
			report = results.summary;
		} else {
			// 기본 강건한 분석 실행
			const results = await analyzeFilesRobust(files, "typescript");
			report = generateRobustAnalysisReport(results.results);
		}

		// 결과 출력
		console.log("=".repeat(50));
		console.log(`📊 TypeScript Project Analysis Results:`);
		console.log(`   Files analyzed: ${report.statistics.totalFiles}`);
		console.log(`   Total symbols: ${report.statistics.totalSymbols}`);
		console.log(`   Total errors: ${report.statistics.totalErrors}`);
		console.log(
			`   Success rate: ${(report.statistics.successRate * 100).toFixed(1)}%`,
		);

		if (options.includeStatistics !== false) {
			console.log(`\n📈 Statistics:`);
			console.log(`By type:`, report.statistics.byType);
			console.log(`By export:`, report.statistics.byExport);
		}

		// 출력 파일 저장
		if (options.output) {
			const outputPath = require("node:path").resolve(options.output);
			const outputDir = require("node:path").dirname(outputPath);
			const fs = require("node:fs");

			if (!fs.existsSync(outputDir)) {
				fs.mkdirSync(outputDir, { recursive: true });
			}

			let content: string;
			switch (options.format || "json") {
				case "csv":
					content = generateCSVOutput(report);
					break;
				case "markdown":
					content = generateMarkdownOutput(report);
					break;
				default:
					content = JSON.stringify(report, null, 2);
					break;
			}

			fs.writeFileSync(outputPath, content, "utf-8");
			console.log(`\n💾 Results saved to: ${outputPath}`);
		}

		console.log(`\n✅ TypeScript project analysis completed`);
	} catch (error) {
		console.error(`❌ TypeScript project analysis failed:`, error);
		throw error;
	}
}

/**
 * TypeScript 성능 벤치마크 실행
 */
export async function runTypeScriptPerformanceBenchmark(
	name: string,
): Promise<void> {
	try {
		console.log(`🏃 TypeScript performance benchmark for namespace: ${name}`);
		console.log("Running performance benchmarks...");

		// 벤치마크 실행
		const benchmark = await PerformanceHelper.benchmark(
			`typescript-${name}`,
			async () => {
				// TypeScript 분석 시뮬레이션
				const { analyzeFilesRobust } = await import(
					"../../api/robust-analysis.js"
				);
				const files = ["src/**/*.ts", "src/**/*.tsx"];
				await analyzeFilesRobust(files, "typescript");
			},
		);

		console.log("=".repeat(50));
		console.log(`📊 TypeScript Performance Benchmark Results:`);
		console.log(`   Duration: ${(benchmark as any).duration || 0}ms`);
		console.log(
			`   Memory Usage: ${((benchmark as any).memoryUsage || 0).toFixed(2)}MB`,
		);
		console.log(
			`   CPU Usage: ${((benchmark as any).cpuUsage || 0).toFixed(2)}%`,
		);
		console.log(
			`   Throughput: ${((benchmark as any).throughput || 0).toFixed(2)} ops/sec`,
		);

		console.log(
			`\n✅ TypeScript performance benchmark completed for namespace: ${name}`,
		);
	} catch (error) {
		console.error(
			`❌ TypeScript performance benchmark failed for namespace ${name}:`,
			error,
		);
		throw error;
	}
}

/**
 * CSV 출력 생성
 */
function generateCSVOutput(result: any): string {
	const lines: string[] = [];
	lines.push("Type,Name,Path,Language,Size,LastModified");

	if (result.file) {
		lines.push(
			`File,${result.file.name},${result.file.path},${result.file.language},${result.file.size},${result.file.lastModified.toISOString()}`,
		);
	}

	if (result.dependencies?.internalFiles) {
		result.dependencies.internalFiles.forEach((dep: any) => {
			lines.push(
				`InternalFile,${dep.path},${dep.path},internal,0,${new Date().toISOString()}`,
			);
		});
	}

	if (result.dependencies?.libraries) {
		result.dependencies.libraries.forEach((lib: any) => {
			lines.push(
				`Library,${lib.name},${lib.name},library,0,${new Date().toISOString()}`,
			);
		});
	}

	return lines.join("\n");
}

/**
 * 마크다운 출력 생성
 */
function generateMarkdownOutput(result: any): string {
	const lines: string[] = [];
	lines.push("# TypeScript Analysis Report");
	lines.push("");
	lines.push(`**File:** ${result.file?.path || "Unknown"}`);
	lines.push(`**Language:** ${result.file?.language || "Unknown"}`);
	lines.push(`**Size:** ${result.file?.size || 0} bytes`);
	lines.push(
		`**Last Modified:** ${result.file?.lastModified?.toISOString() || "Unknown"}`,
	);
	lines.push("");

	if (result.dependencies) {
		lines.push("## Dependencies");
		lines.push("");

		if (result.dependencies.internalFiles?.length > 0) {
			lines.push("### Internal Files");
			result.dependencies.internalFiles.forEach((dep: any) => {
				lines.push(`- ${dep.path}`);
			});
			lines.push("");
		}

		if (result.dependencies.libraries?.length > 0) {
			lines.push("### Libraries");
			result.dependencies.libraries.forEach((lib: any) => {
				lines.push(`- ${lib.name}${lib.version ? ` (${lib.version})` : ""}`);
			});
			lines.push("");
		}
	}

	return lines.join("\n");
}
