/**
 * Analysis CLI
 * 명령줄 인터페이스를 통한 분석 실행
 */

import { Command } from "commander";
import fs from "fs";
import path from "path";
import { glob } from "glob";
import {
	analyzeFileTypeSafe,
	extractSymbolsTypeSafe,
	checkCompliance,
	generateAnalysisReport,
	type AnalysisConfig,
	type AnalysisReport,
	type ComplianceRule,
	DEFAULT_COMPLIANCE_RULES,
} from "../api/type-safe-analysis.js";
import { analyzeFile } from "../api/analysis.js";

// ===== CLI COMMAND DEFINITIONS =====

const program = new Command();

program
	.name("dependency-analyzer")
	.description("TypeScript dependency analysis tool")
	.version("2.1.0");

// ===== ANALYZE COMMAND =====

program
	.command("analyze")
	.description("Analyze TypeScript files for symbols and dependencies")
	.option("-p, --pattern <pattern>", "File pattern to analyze", "**/*.ts")
	.option("-d, --directory <dir>", "Directory to analyze", ".")
	.option("-o, --output <file>", "Output file path")
	.option("-f, --format <format>", "Output format", "json")
	.option("--include-metadata", "Include metadata in output", false)
	.option("--include-statistics", "Include statistics in output", true)
	.option("--compliance", "Run compliance checks", false)
	.option("--config <file>", "Configuration file path")
	.action(async (options) => {
		try {
			console.log("🔍 Starting analysis...\n");

			// 설정 로드
			const config = await loadConfig(options.config);

			// 파일 패턴 적용
			if (options.pattern) {
				config.filePatterns = [options.pattern];
			}
			if (options.directory) {
				config.filePatterns = config.filePatterns.map((pattern) =>
					path.join(options.directory, pattern),
				);
			}

			// 분석 실행
			const report = await runAnalysis(config);

			// 출력
			await outputReport(report, options);

			console.log("\n✅ Analysis completed successfully!");
			console.log(
				`📊 Found ${report.summary.totalSymbols} symbols in ${report.summary.totalFiles} files`,
			);
			console.log(`📤 Exported symbols: ${report.summary.exportedSymbols}`);
			console.log(
				`📋 Compliance score: ${report.summary.complianceScore.toFixed(1)}%`,
			);
		} catch (error) {
			console.error("❌ Analysis failed:", error);
			process.exit(1);
		}
	});

// ===== WATCH COMMAND =====

program
	.command("watch")
	.description("Watch files for changes and run analysis automatically")
	.option("-p, --pattern <pattern>", "File pattern to watch", "**/*.ts")
	.option("-d, --directory <dir>", "Directory to watch", ".")
	.option("-i, --interval <ms>", "Check interval in milliseconds", "1000")
	.option("--config <file>", "Configuration file path")
	.action(async (options) => {
		try {
			console.log("👀 Starting file watcher...\n");

			const config = await loadConfig(options.config);
			const interval = parseInt(options.interval);

			let lastAnalysis = new Date(0);
			const fileTimestamps = new Map<string, Date>();

			setInterval(async () => {
				try {
					const files = await glob(options.pattern, { cwd: options.directory });
					let hasChanges = false;

					for (const file of files) {
						const fullPath = path.join(options.directory, file);
						const stats = fs.statSync(fullPath);
						const lastModified = stats.mtime;

						if (
							!fileTimestamps.has(fullPath) ||
							fileTimestamps.get(fullPath)! < lastModified
						) {
							fileTimestamps.set(fullPath, lastModified);
							hasChanges = true;
						}
					}

					if (hasChanges) {
						console.log(`🔄 Files changed, running analysis...`);
						const report = await runAnalysis(config);
						console.log(
							`📊 Analysis completed: ${report.summary.totalSymbols} symbols found`,
						);
						lastAnalysis = new Date();
					}
				} catch (error) {
					console.error("❌ Watch analysis failed:", error);
				}
			}, interval);

			console.log(
				`👀 Watching ${options.pattern} in ${options.directory} (interval: ${interval}ms)`,
			);
		} catch (error) {
			console.error("❌ Watch failed:", error);
			process.exit(1);
		}
	});

// ===== COMPLIANCE COMMAND =====

program
	.command("compliance")
	.description("Check code compliance against defined rules")
	.option("-p, --pattern <pattern>", "File pattern to analyze", "**/*.ts")
	.option("-d, --directory <dir>", "Directory to analyze", ".")
	.option("-r, --rules <file>", "Custom compliance rules file")
	.option("--severity <level>", "Minimum severity level", "info")
	.action(async (options) => {
		try {
			console.log("📋 Running compliance checks...\n");

			const config = await loadConfig();
			config.compliance.enabled = true;

			// 커스텀 규칙 로드
			if (options.rules) {
				const customRules = await loadCustomRules(options.rules);
				config.compliance.rules = [...DEFAULT_COMPLIANCE_RULES, ...customRules];
			}

			const report = await runAnalysis(config);

			// 심각도별 필터링
			const severityLevels = ["info", "warning", "error"];
			const minSeverityIndex = severityLevels.indexOf(options.severity);
			const filteredCompliance = report.compliance.filter((result) => {
				const rule = config.compliance.rules.find(
					(r) => r.id === result.ruleId,
				);
				if (!rule) return false;
				const severityIndex = severityLevels.indexOf(rule.severity);
				return severityIndex >= minSeverityIndex;
			});

			// 결과 출력
			console.log("📋 Compliance Results:");
			console.log("=".repeat(50));

			for (const result of filteredCompliance) {
				const rule = config.compliance.rules.find(
					(r) => r.id === result.ruleId,
				);
				const status = result.passed ? "✅" : "❌";
				const severity = rule?.severity.toUpperCase() || "UNKNOWN";

				console.log(`${status} [${severity}] ${rule?.name || result.ruleId}`);
				console.log(`   ${result.message}`);

				if (result.affectedSymbols.length > 0) {
					console.log(`   Affected: ${result.affectedSymbols.join(", ")}`);
				}

				if (result.suggestions && result.suggestions.length > 0) {
					console.log(`   Suggestions:`);
					result.suggestions.forEach((suggestion) => {
						console.log(`     • ${suggestion}`);
					});
				}
				console.log();
			}

			const passedCount = filteredCompliance.filter((r) => r.passed).length;
			const totalCount = filteredCompliance.length;
			console.log(
				`📊 Compliance Score: ${passedCount}/${totalCount} (${((passedCount / totalCount) * 100).toFixed(1)}%)`,
			);
		} catch (error) {
			console.error("❌ Compliance check failed:", error);
			process.exit(1);
		}
	});

// ===== HELPER FUNCTIONS =====

async function loadConfig(configPath?: string): Promise<AnalysisConfig> {
	const defaultConfig: AnalysisConfig = {
		filePatterns: ["**/*.ts"],
		languages: ["typescript"],
		analysisOptions: {
			enableParallelExecution: true,
			enableCaching: true,
		},
		output: {
			format: "json",
			includeMetadata: true,
			includeStatistics: true,
		},
		compliance: {
			enabled: false,
			rules: DEFAULT_COMPLIANCE_RULES,
		},
	};

	if (configPath && fs.existsSync(configPath)) {
		try {
			const configContent = fs.readFileSync(configPath, "utf-8");
			const customConfig = JSON.parse(configContent);
			return { ...defaultConfig, ...customConfig };
		} catch (error) {
			console.warn(
				`⚠️  Failed to load config from ${configPath}, using defaults`,
			);
		}
	}

	return defaultConfig;
}

async function loadCustomRules(rulesPath: string): Promise<ComplianceRule[]> {
	try {
		const rulesContent = fs.readFileSync(rulesPath, "utf-8");
		return JSON.parse(rulesContent);
	} catch (error) {
		console.warn(`⚠️  Failed to load custom rules from ${rulesPath}`);
		return [];
	}
}

async function runAnalysis(config: AnalysisConfig): Promise<AnalysisReport> {
	const allSymbols: any[] = [];
	const allCompliance: any[] = [];

	// 파일 찾기
	const files: string[] = [];
	for (const pattern of config.filePatterns) {
		const matchedFiles = await glob(pattern);
		files.push(...matchedFiles);
	}

	console.log(`📁 Found ${files.length} files to analyze`);

	// 각 파일 분석
	for (const file of files) {
		try {
			if (!fs.existsSync(file)) {
				console.warn(`⚠️  File not found: ${file}`);
				continue;
			}

			const sourceCode = fs.readFileSync(file, "utf-8");
			const { symbols, errors } = await analyzeFileTypeSafe(
				sourceCode,
				"typescript",
				file,
				config.analysisOptions,
			);

			if (errors.length > 0) {
				console.warn(`⚠️  Analysis errors for ${file}:`, errors);
			}

			allSymbols.push(...symbols);
		} catch (error) {
			console.warn(`⚠️  Failed to analyze ${file}:`, error);
		}
	}

	// 규정 준수 검사
	if (config.compliance.enabled) {
		allCompliance.push(...checkCompliance(allSymbols, config.compliance.rules));
	}

	// 리포트 생성
	return generateAnalysisReport(config, allSymbols, allCompliance);
}

async function outputReport(
	report: AnalysisReport,
	options: any,
): Promise<void> {
	if (!options.output) {
		// 콘솔 출력
		console.log("\n📊 Analysis Report:");
		console.log("=".repeat(50));
		console.log(`📁 Files analyzed: ${report.summary.totalFiles}`);
		console.log(`🔍 Total symbols: ${report.summary.totalSymbols}`);
		console.log(`📤 Exported symbols: ${report.summary.exportedSymbols}`);
		console.log(
			`📋 Compliance score: ${report.summary.complianceScore.toFixed(1)}%`,
		);

		if (options.includeStatistics) {
			console.log("\n📈 Statistics:");
			console.log("By type:", report.statistics.byType);
			console.log(
				"By file:",
				Object.keys(report.statistics.byFile).slice(0, 5),
				"...",
			);
		}

		return;
	}

	// 파일 출력
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

	fs.writeFileSync(options.output, content);
	console.log(`📄 Report saved to ${options.output}`);
}

function generateCSV(report: AnalysisReport): string {
	const headers = [
		"name",
		"type",
		"filePath",
		"startLine",
		"endLine",
		"isExported",
	];
	const rows = report.symbols.map((symbol) => [
		symbol.name,
		symbol.type,
		symbol.filePath,
		symbol.startLine.toString(),
		symbol.endLine.toString(),
		symbol.isExported.toString(),
	]);

	return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

// ===== CLI EXECUTION =====

// CLI 실행 로직은 main.ts에서 처리
