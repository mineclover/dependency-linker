/**
 * Analysis Namespace
 * 네임스페이스 기반 분석 설정 및 실행 관리
 */

import fs from "fs";
import path from "path";
import { glob } from "glob";
import {
	analyzeFileTypeSafe,
	checkCompliance,
	generateAnalysisReport,
	type AnalysisConfig,
	type AnalysisReport,
	type ComplianceRule,
	DEFAULT_COMPLIANCE_RULES,
} from "../api/type-safe-analysis.js";
import { analyzeMarkdownFileWithRDF } from "../api/markdown-analysis.js";

// ===== NAMESPACE CONFIGURATION =====

export interface NamespaceConfig {
	name: string;
	description: string;
	patterns: {
		include: string[];
		exclude: string[];
	};
	analysis: {
		enabled: boolean;
		options: {
			enableParallelExecution: boolean;
			enableCaching: boolean;
		};
	};
	queries: {
		/** 활성화된 쿼리 카테고리 */
		categories: QueryCategory[];
		/** 커스텀 쿼리 설정 */
		custom: {
			enabled: boolean;
			queryIds: string[];
		};
		/** 쿼리 실행 옵션 */
		options: {
			enableParallelExecution: boolean;
			enableCaching: boolean;
			maxConcurrency: number;
		};
	};
	compliance: {
		enabled: boolean;
		rules: string[]; // Rule IDs
		customRules?: ComplianceRule[];
	};
	rdf?: {
		enabled: boolean;
		storeToDatabase?: boolean;
		databasePath?: string;
		includeMetadata?: boolean;
		trackRelationships?: boolean;
	};
	output: {
		format: "json" | "csv" | "table";
		destination: string;
		includeMetadata: boolean;
		includeStatistics: boolean;
	};
	schedule?: {
		enabled: boolean;
		interval: number; // milliseconds
		cron?: string;
	};
}

export type QueryCategory =
	| "basic-analysis"
	| "symbol-definitions"
	| "dependency-tracking"
	| "advanced-analysis";

// ===== QUERY CATEGORY MAPPING =====

export const QUERY_CATEGORY_MAPPING: Record<QueryCategory, string[]> = {
	"basic-analysis": [
		"ts-import-sources",
		"ts-export-declarations",
		"ts-export-assignments",
	],
	"symbol-definitions": [
		"ts-class-definitions",
		"ts-interface-definitions",
		"ts-function-definitions",
		"ts-method-definitions",
		"ts-type-definitions",
		"ts-enum-definitions",
		"ts-variable-definitions",
		"ts-arrow-function-definitions",
		"ts-property-definitions",
	],
	"dependency-tracking": [
		"ts-call-expressions",
		"ts-new-expressions",
		"ts-member-expressions",
		"ts-type-references",
		"ts-extends-clause",
		"ts-implements-clause",
	],
	"advanced-analysis": [
		"ts-named-imports",
		"ts-default-imports",
		"ts-type-imports",
	],
};

export interface ProjectNamespaces {
	projectName: string;
	rootPath: string;
	namespaces: Record<string, NamespaceConfig>;
	globalSettings: {
		defaultLanguage: string;
		maxConcurrency: number;
		cacheEnabled: boolean;
	};
}

// ===== NAMESPACE MANAGER =====

export class AnalysisNamespaceManager {
	private configPath: string;
	private projectConfig: ProjectNamespaces | null = null;

	constructor(configPath: string = "./dependency-linker.config.json") {
		this.configPath = configPath;
	}

	/**
	 * 설정 로드
	 */
	async loadConfig(): Promise<ProjectNamespaces> {
		if (this.projectConfig) {
			return this.projectConfig;
		}

		if (fs.existsSync(this.configPath)) {
			try {
				const configContent = fs.readFileSync(this.configPath, "utf-8");
				this.projectConfig = JSON.parse(configContent);
				return this.projectConfig!;
			} catch (error) {
				console.warn(
					`⚠️  Failed to load config from ${this.configPath}:`,
					error,
				);
			}
		}

		// 기본 설정 생성
		this.projectConfig = this.createDefaultConfig();
		await this.saveConfig();
		return this.projectConfig;
	}

	/**
	 * 설정 저장
	 */
	async saveConfig(): Promise<void> {
		if (!this.projectConfig) return;

		try {
			fs.writeFileSync(
				this.configPath,
				JSON.stringify(this.projectConfig, null, 2),
			);
		} catch (error) {
			console.error(`❌ Failed to save config to ${this.configPath}:`, error);
		}
	}

	/**
	 * 네임스페이스 추가
	 */
	async addNamespace(namespace: NamespaceConfig): Promise<void> {
		const config = await this.loadConfig();
		config.namespaces[namespace.name] = namespace;
		await this.saveConfig();
	}

	/**
	 * 네임스페이스 제거
	 */
	async removeNamespace(name: string): Promise<void> {
		const config = await this.loadConfig();
		delete config.namespaces[name];
		await this.saveConfig();
	}

	/**
	 * 네임스페이스 업데이트
	 */
	async updateNamespace(
		name: string,
		updates: Partial<NamespaceConfig>,
	): Promise<void> {
		const config = await this.loadConfig();
		if (config.namespaces[name]) {
			config.namespaces[name] = { ...config.namespaces[name], ...updates };
			await this.saveConfig();
		}
	}

	/**
	 * 네임스페이스 실행
	 */
	async runNamespace(name: string): Promise<AnalysisReport> {
		const config = await this.loadConfig();
		const namespace = config.namespaces[name];

		if (!namespace) {
			throw new Error(`Namespace '${name}' not found`);
		}

		if (!namespace.analysis.enabled) {
			throw new Error(`Analysis is disabled for namespace '${name}'`);
		}

		console.log(`🚀 Running analysis for namespace: ${name}`);
		console.log(`📝 Description: ${namespace.description}`);

		// 파일 패턴 적용
		const files = await this.getFilesForNamespace(namespace);
		console.log(`📁 Found ${files.length} files to analyze`);

		// 분석 실행
		const analysisConfig = this.namespaceToAnalysisConfig(namespace);
		const report = await this.runAnalysisForFiles(
			files,
			analysisConfig,
			namespace,
		);

		// 출력
		await this.outputNamespaceReport(report, namespace);

		return report;
	}

	/**
	 * 모든 네임스페이스 실행
	 */
	async runAllNamespaces(): Promise<Record<string, AnalysisReport>> {
		const config = await this.loadConfig();
		const results: Record<string, AnalysisReport> = {};

		for (const [name, namespace] of Object.entries(config.namespaces)) {
			if (namespace.analysis.enabled) {
				try {
					console.log(`\n🔄 Running namespace: ${name}`);
					results[name] = await this.runNamespace(name);
				} catch (error) {
					console.error(`❌ Failed to run namespace ${name}:`, error);
				}
			}
		}

		return results;
	}

	/**
	 * 스케줄된 분석 실행
	 */
	async runScheduledAnalysis(): Promise<void> {
		const config = await this.loadConfig();

		for (const [name, namespace] of Object.entries(config.namespaces)) {
			if (namespace.schedule?.enabled) {
				try {
					console.log(`⏰ Running scheduled analysis for namespace: ${name}`);
					await this.runNamespace(name);
				} catch (error) {
					console.error(`❌ Scheduled analysis failed for ${name}:`, error);
				}
			}
		}
	}

	/**
	 * 네임스페이스별 파일 목록 가져오기
	 */
	private async getFilesForNamespace(
		namespace: NamespaceConfig,
	): Promise<string[]> {
		const files: string[] = [];

		// Include 패턴 적용
		for (const pattern of namespace.patterns.include) {
			const matchedFiles = await glob(pattern);
			files.push(...matchedFiles);
		}

		// Exclude 패턴 적용
		const excludedFiles = new Set<string>();
		for (const pattern of namespace.patterns.exclude) {
			const matchedFiles = await glob(pattern);
			matchedFiles.forEach((file) => excludedFiles.add(file));
		}

		return files.filter((file) => !excludedFiles.has(file));
	}

	/**
	 * 네임스페이스를 분석 설정으로 변환
	 */
	private namespaceToAnalysisConfig(
		namespace: NamespaceConfig,
	): AnalysisConfig {
		return {
			filePatterns: namespace.patterns.include,
			languages: ["typescript"],
			analysisOptions: namespace.analysis.options,
			output: namespace.output,
			compliance: {
				enabled: namespace.compliance.enabled,
				rules: this.getComplianceRules(namespace),
			},
		};
	}

	/**
	 * 규정 준수 규칙 가져오기
	 */
	private getComplianceRules(namespace: NamespaceConfig): ComplianceRule[] {
		const rules: ComplianceRule[] = [];

		// 기본 규칙 추가
		for (const ruleId of namespace.compliance.rules) {
			const defaultRule = DEFAULT_COMPLIANCE_RULES.find((r) => r.id === ruleId);
			if (defaultRule) {
				rules.push(defaultRule);
			}
		}

		// 커스텀 규칙 추가
		if (namespace.compliance.customRules) {
			rules.push(...namespace.compliance.customRules);
		}

		return rules;
	}

	/**
	 * 파일들에 대한 분석 실행
	 */
	private async runAnalysisForFiles(
		files: string[],
		config: AnalysisConfig,
		namespace: NamespaceConfig,
	): Promise<AnalysisReport> {
		const allSymbols: any[] = [];
		const allCompliance: any[] = [];

		// 각 파일 분석
		for (const file of files) {
			try {
				if (!fs.existsSync(file)) {
					console.warn(`⚠️  File not found: ${file}`);
					continue;
				}

				const sourceCode = fs.readFileSync(file, "utf-8");
				
				// 마크다운 파일 감지
				if (this.isMarkdownFile(file)) {
					// 마크다운 파일은 RDF 분석 사용
					const rdfResult = await analyzeMarkdownFileWithRDF(
						sourceCode,
						file,
						"unknown-project",
					);
					
					// RDF 심볼을 일반 심볼 형식으로 변환
					const convertedSymbols = rdfResult.symbols.map(symbol => ({
						name: symbol.symbolName,
						type: symbol.nodeType,
						filePath: file,
						lineNumber: symbol.metadata.lineNumber,
						columnNumber: symbol.metadata.columnNumber,
						metadata: symbol.metadata,
					}));
					
					allSymbols.push(...convertedSymbols);
				} else {
					// 일반 파일은 기존 분석 사용
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
				}
			} catch (error) {
				console.warn(`⚠️  Failed to analyze ${file}:`, error);
			}
		}

		// 규정 준수 검사
		if (config.compliance.enabled) {
			allCompliance.push(
				...checkCompliance(allSymbols, config.compliance.rules),
			);
		}

		// 리포트 생성
		return generateAnalysisReport(config, allSymbols, allCompliance);
	}

	/**
	 * 마크다운 파일인지 확인
	 */
	private isMarkdownFile(filePath: string): boolean {
		const ext = path.extname(filePath).toLowerCase();
		return ['.md', '.markdown', '.mdx'].includes(ext);
	}

	/**
	 * 네임스페이스 리포트 출력
	 */
	private async outputNamespaceReport(
		report: AnalysisReport,
		namespace: NamespaceConfig,
	): Promise<void> {
		const outputPath = path.resolve(namespace.output.destination);
		const outputDir = path.dirname(outputPath);

		// 출력 디렉토리 생성
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		let content: string;

		switch (namespace.output.format) {
			case "json":
				content = JSON.stringify(report, null, 2);
				break;
			case "csv":
				content = this.generateCSV(report);
				break;
			case "table":
				content = this.generateTable(report);
				break;
			default:
				content = JSON.stringify(report, null, 2);
		}

		fs.writeFileSync(outputPath, content);
		console.log(`📄 Report saved to ${outputPath}`);
	}

	/**
	 * CSV 형식 생성
	 */
	private generateCSV(report: AnalysisReport): string {
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

	/**
	 * 테이블 형식 생성
	 */
	private generateTable(report: AnalysisReport): string {
		const lines: string[] = [];

		lines.push("# Analysis Report");
		lines.push("");
		lines.push(`**Generated:** ${report.timestamp.toISOString()}`);
		lines.push(`**Files:** ${report.summary.totalFiles}`);
		lines.push(`**Symbols:** ${report.summary.totalSymbols}`);
		lines.push(`**Exported:** ${report.summary.exportedSymbols}`);
		lines.push(`**Compliance:** ${report.summary.complianceScore.toFixed(1)}%`);
		lines.push("");

		// 통계
		lines.push("## Statistics");
		lines.push("");
		lines.push("### By Type");
		for (const [type, count] of Object.entries(report.statistics.byType)) {
			lines.push(`- ${type}: ${count}`);
		}
		lines.push("");

		// 심볼 목록
		lines.push("## Symbols");
		lines.push("");
		for (const symbol of report.symbols) {
			const exportFlag = symbol.isExported ? " [EXPORTED]" : "";
			lines.push(
				`- **${symbol.name}** (${symbol.type})${exportFlag} - ${symbol.filePath}:${symbol.startLine}`,
			);
		}

		return lines.join("\n");
	}

	/**
	 * 쿼리 카테고리에서 쿼리 ID 목록 가져오기
	 */
	getQueriesForCategories(categories: QueryCategory[]): string[] {
		const queryIds: string[] = [];

		for (const category of categories) {
			const categoryQueries = QUERY_CATEGORY_MAPPING[category];
			if (categoryQueries) {
				queryIds.push(...categoryQueries);
			}
		}

		return [...new Set(queryIds)]; // 중복 제거
	}

	/**
	 * 네임스페이스에 대한 활성 쿼리 목록 가져오기
	 */
	async getActiveQueriesForNamespace(namespace: string): Promise<string[]> {
		const config = await this.loadConfig();
		const namespaceConfig = config.namespaces[namespace];
		if (!namespaceConfig || !namespaceConfig.queries) {
			return [];
		}

		const categoryQueries = this.getQueriesForCategories(
			namespaceConfig.queries.categories,
		);
		const customQueries = namespaceConfig.queries.custom.enabled
			? namespaceConfig.queries.custom.queryIds
			: [];

		return [...categoryQueries, ...customQueries];
	}

	/**
	 * 쿼리 카테고리 정보 가져오기
	 */
	getQueryCategories(): Record<
		QueryCategory,
		{ name: string; description: string; queryCount: number }
	> {
		return {
			"basic-analysis": {
				name: "Basic Analysis",
				description: "Import/Export 기본 분석",
				queryCount: QUERY_CATEGORY_MAPPING["basic-analysis"].length,
			},
			"symbol-definitions": {
				name: "Symbol Definitions",
				description: "심볼 정의 분석 (클래스, 함수, 인터페이스 등)",
				queryCount: QUERY_CATEGORY_MAPPING["symbol-definitions"].length,
			},
			"dependency-tracking": {
				name: "Dependency Tracking",
				description: "의존성 추적 분석 (호출, 참조, 상속 등)",
				queryCount: QUERY_CATEGORY_MAPPING["dependency-tracking"].length,
			},
			"advanced-analysis": {
				name: "Advanced Analysis",
				description: "고급 분석 (네임드 import, 타입 import 등)",
				queryCount: QUERY_CATEGORY_MAPPING["advanced-analysis"].length,
			},
		};
	}

	/**
	 * 기본 설정 생성
	 */
	private createDefaultConfig(): ProjectNamespaces {
		return {
			projectName: "dependency-linker-project",
			rootPath: process.cwd(),
			namespaces: {
				source: {
					name: "source",
					description: "Source code analysis",
					patterns: {
						include: ["src/**/*.ts"],
						exclude: ["src/**/*.test.ts", "src/**/*.spec.ts"],
					},
					analysis: {
						enabled: true,
						options: {
							enableParallelExecution: true,
							enableCaching: true,
						},
					},
					queries: {
						categories: [
							"basic-analysis",
							"symbol-definitions",
							"dependency-tracking",
						],
						custom: {
							enabled: false,
							queryIds: [],
						},
						options: {
							enableParallelExecution: true,
							enableCaching: true,
							maxConcurrency: 4,
						},
					},
					compliance: {
						enabled: true,
						rules: ["exported-symbols-naming", "async-function-naming"],
					},
					output: {
						format: "json",
						destination: "./reports/source-analysis.json",
						includeMetadata: true,
						includeStatistics: true,
					},
				},
				tests: {
					name: "tests",
					description: "Test code analysis",
					patterns: {
						include: ["tests/**/*.ts", "**/*.test.ts", "**/*.spec.ts"],
						exclude: [],
					},
					analysis: {
						enabled: true,
						options: {
							enableParallelExecution: true,
							enableCaching: true,
						},
					},
					queries: {
						categories: ["basic-analysis", "symbol-definitions"],
						custom: {
							enabled: false,
							queryIds: [],
						},
						options: {
							enableParallelExecution: true,
							enableCaching: true,
							maxConcurrency: 2,
						},
					},
					compliance: {
						enabled: true,
						rules: ["exported-symbols-naming"],
					},
					output: {
						format: "json",
						destination: "./reports/tests-analysis.json",
						includeMetadata: true,
						includeStatistics: true,
					},
				},
			},
			globalSettings: {
				defaultLanguage: "typescript",
				maxConcurrency: 4,
				cacheEnabled: true,
			},
		};
	}
}

// ===== NAMESPACE UTILITIES =====

/**
 * 네임스페이스 설정 생성 도우미
 */
export function createNamespaceConfig(
	name: string,
	description: string,
	includePatterns: string[],
	excludePatterns: string[] = [],
	options: Partial<NamespaceConfig> = {},
): NamespaceConfig {
	return {
		name,
		description,
		patterns: {
			include: includePatterns,
			exclude: excludePatterns,
		},
		analysis: {
			enabled: true,
			options: {
				enableParallelExecution: true,
				enableCaching: true,
			},
		},
		queries: {
			categories: ["basic-analysis", "symbol-definitions"],
			custom: {
				enabled: false,
				queryIds: [],
			},
			options: {
				enableParallelExecution: true,
				enableCaching: true,
				maxConcurrency: 4,
			},
		},
		compliance: {
			enabled: true,
			rules: ["exported-symbols-naming", "async-function-naming"],
		},
		output: {
			format: "json",
			destination: `./reports/${name}-analysis.json`,
			includeMetadata: true,
			includeStatistics: true,
		},
		...options,
	};
}

/**
 * 네임스페이스 실행 함수
 */
export async function runNamespaceAnalysis(
	configPath: string = "./dependency-linker.config.json",
	namespaceName?: string,
): Promise<void> {
	const manager = new AnalysisNamespaceManager(configPath);

	if (namespaceName) {
		// 특정 네임스페이스 실행
		await manager.runNamespace(namespaceName);
	} else {
		// 모든 네임스페이스 실행
		await manager.runAllNamespaces();
	}
}
