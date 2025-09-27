/**
 * DataIntegrator - Unified Data Integration Service
 * 데이터 통합 및 출력 최적화를 위한 통합 서비스
 */

import type { OptimizationStrategy } from "../../config/IntegrationConfig";
import type { AnalysisResult } from "../../models/AnalysisResult";
import type {
	AnalysisInsights,
	CoreAnalysisInfo,
	CSVView,
	DataIntegrationConfig,
	DataQualityAssessment,
	DetailedAnalysisInfo,
	IntegratedAnalysisData,
	IntegratedMetadata,
	MergedCodeStructure,
	MergedComplexityMetrics,
	MergedDependencyInfo,
	MinimalView,
	OutputViews,
	Recommendation,
	SummaryView,
	TableView,
	TreeNode,
	TreeView,
} from "../../models/IntegratedData";

export interface IDataIntegrator {
	/**
	 * 분석 결과를 통합된 데이터 구조로 변환
	 */
	integrate(
		result: AnalysisResult,
		config?: DataIntegrationConfig,
	): Promise<IntegratedAnalysisData>;

	/**
	 * 여러 분석 결과를 배치로 통합
	 */
	integrateBatch(
		results: AnalysisResult[],
		config?: DataIntegrationConfig,
	): Promise<IntegratedAnalysisData[]>;

	/**
	 * 통합 품질 검증
	 */
	validateIntegration(data: IntegratedAnalysisData): Promise<boolean>;
}

export class DataIntegrator implements IDataIntegrator {
	private defaultConfig: DataIntegrationConfig = {
		enabledViews: ["summary", "table", "tree", "csv", "minimal"],
		detailLevel: "standard",
		optimizationMode: "balanced",
		sizeLimits: {
			maxStringLength: 1000,
			maxArrayLength: 100,
			maxDepth: 10,
		},
	};

	async integrate(
		result: AnalysisResult,
		config?: DataIntegrationConfig,
	): Promise<IntegratedAnalysisData> {
		const finalConfig = { ...this.defaultConfig, ...config };
		const startTime = performance.now();

		try {
			// 1. 핵심 정보 추출 및 통합
			const core = this.buildCoreInfo(result);

			// 2. 상세 분석 정보 통합
			const detailed = this.buildDetailedInfo(result);

			// 3. 출력별 최적화된 뷰 생성
			const views = this.buildOptimizedViews(result, finalConfig);

			// 4. 통합 메타데이터 생성
			const metadata = this.buildMetadata(result, finalConfig);

			const integrated: IntegratedAnalysisData = {
				core,
				detailed,
				views,
				metadata,
			};

			// Update integration timing
			integrated.core.timing.integrate = performance.now() - startTime;
			integrated.core.timing.total =
				integrated.core.timing.parse +
				integrated.core.timing.extract +
				integrated.core.timing.interpret +
				integrated.core.timing.integrate;

			// 5. 품질 검증
			await this.validateIntegration(integrated);

			return integrated;
		} catch (error) {
			throw new Error(
				`Data integration failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	async integrateBatch(
		results: AnalysisResult[],
		config?: DataIntegrationConfig,
	): Promise<IntegratedAnalysisData[]> {
		const finalConfig = { ...this.defaultConfig, ...config };
		const strategy = this.getOptimizationStrategy(finalConfig);

		// Use controlled concurrency for better performance
		const maxConcurrency = strategy.maxConcurrency;
		const chunks: AnalysisResult[][] = [];

		// Split into chunks for concurrent processing
		for (let i = 0; i < results.length; i += maxConcurrency) {
			chunks.push(results.slice(i, i + maxConcurrency));
		}

		const allResults: IntegratedAnalysisData[] = [];

		for (const chunk of chunks) {
			try {
				const chunkPromises = chunk.map((result) =>
					this.integrate(result, finalConfig),
				);
				const chunkResults = await Promise.all(chunkPromises);
				allResults.push(...chunkResults.filter(Boolean));
			} catch (_error) {
				console.warn(
					"Chunk processing failed, falling back to sequential processing for this chunk",
				);

				// Process chunk sequentially as fallback
				for (const result of chunk) {
					try {
						const integratedData = await this.integrate(result, finalConfig);
						allResults.push(integratedData);
					} catch (error) {
						console.warn(`Failed to integrate ${result.filePath}:`, error);
						// 부분 실패는 허용하고 계속 진행
					}
				}
			}
		}

		return allResults;
	}

	async validateIntegration(data: IntegratedAnalysisData): Promise<boolean> {
		try {
			// 필수 필드 존재 확인
			if (!data.core || !data.views || !data.metadata) {
				return false;
			}

			// 데이터 일관성 검증
			const isConsistent = this.validateDataConsistency(data);
			if (!isConsistent) {
				return false;
			}

			// 품질 점수 확인 (전체 품질 계산)
			const quality = data.metadata.dataQuality;
			const qualityScore =
				(quality.completeness +
					quality.accuracy +
					quality.consistency +
					quality.freshness +
					quality.validity) /
				5;
			return qualityScore >= 0.7; // 70% 이상의 품질 요구
		} catch (error) {
			console.error("Integration validation failed:", error);
			return false;
		}
	}

	private buildCoreInfo(result: AnalysisResult): CoreAnalysisInfo {
		const extractedData = result.extractedData || {};
		const dependencyData = extractedData.dependency || {};
		const identifierData = extractedData.identifier || {};

		return {
			file: {
				name: result.filePath.split("/").pop() || result.filePath,
				path: result.filePath,
				extension: this.getFileExtension(result.filePath),
				size: result.metadata?.fileSize,
			},
			language: {
				detected: result.language || "unknown",
				confidence: 0.95, // Default confidence
				parser: "tree-sitter", // Default parser
			},
			status: {
				overall:
					result.errors && result.errors.length > 0 ? "error" : "success",
				code: result.errors?.length ? "E001" : "S000",
				message: result.errors?.map((e) => e.message || String(e)).join("; "),
			},
			counts: {
				dependencies: {
					total: dependencyData.dependencies?.length || 0,
					external: dependencyData.external?.length || 0,
					internal: dependencyData.internal?.length || 0,
					builtin: dependencyData.builtin?.length || 0,
				},
				imports: {
					total: dependencyData.imports?.length || 0,
					named: dependencyData.namedImports?.length || 0,
					default: dependencyData.defaultImports?.length || 0,
					namespace: dependencyData.namespaceImports?.length || 0,
				},
				exports: {
					total: dependencyData.exports?.length || 0,
					named: dependencyData.namedExports?.length || 0,
					default: dependencyData.defaultExports?.length || 0,
					reexports: dependencyData.reexports?.length || 0,
				},
				identifiers: {
					functions: identifierData.functions?.length || 0,
					classes: identifierData.classes?.length || 0,
					interfaces: identifierData.interfaces?.length || 0,
					variables: identifierData.variables?.length || 0,
					types: identifierData.types?.length || 0,
				},
			},
			timing: {
				parse: result.performanceMetrics?.parseTime || 0,
				extract: result.performanceMetrics?.extractionTime || 0,
				interpret: result.performanceMetrics?.interpretationTime || 0,
				integrate: 0, // Will be set after integration
				total: result.performanceMetrics?.totalTime || 0,
			},
			memory: {
				peak: result.performanceMetrics?.memoryUsage || 0,
				current: process.memoryUsage().heapUsed,
				efficiency: 0.85, // Default efficiency score
			},
		};
	}

	private buildDetailedInfo(result: AnalysisResult): DetailedAnalysisInfo {
		return {
			dependencies: this.buildMergedDependencies(result),
			codeStructure: this.buildMergedCodeStructure(result),
			complexity: this.buildMergedComplexity(result),
			insights: this.buildAnalysisInsights(result),
			recommendations: this.buildRecommendations(result),
		};
	}

	private buildOptimizedViews(
		result: AnalysisResult,
		config: DataIntegrationConfig,
	): OutputViews {
		// Only build views that are enabled in the configuration
		const views: Partial<OutputViews> = {};

		if (config.enabledViews.includes("summary")) {
			views.summary = this.buildSummaryView(result);
		}

		if (config.enabledViews.includes("table")) {
			views.table = this.buildTableView(result);
		}

		if (config.enabledViews.includes("tree")) {
			views.tree = this.buildTreeView(result);
		}

		if (config.enabledViews.includes("csv")) {
			views.csv = this.buildCSVView(result);
		}

		if (config.enabledViews.includes("minimal")) {
			views.minimal = this.buildMinimalView(result);
		}

		// Views are optimized by only building requested ones

		return views as OutputViews;
	}

	private buildMetadata(
		result: AnalysisResult,
		config: DataIntegrationConfig,
	): IntegratedMetadata {
		return {
			integrationVersion: "1.0.0",
			integratedAt: new Date(),
			dataSources: {
				extractors: result.metadata?.extractorsUsed || [],
				interpreters: result.metadata?.interpretersUsed || [],
				versions: { integration: "1.0.0" },
			},
			integrationOptions: {
				includeLowConfidence: config.detailLevel !== "minimal",
				mergeStrategy: "balanced",
				conflictResolution: "merge",
				qualityThreshold: 0.7,
			},
			dataQuality: this.assessDataQuality(result),
			confidence: {
				overall: 0.9,
				parsing: result.errors?.length ? 0.7 : 0.95,
				extraction: 0.9,
				interpretation: 0.85,
				integration: 0.9,
			},
		};
	}

	private buildSummaryView(result: AnalysisResult): SummaryView {
		const dependencyData = result.extractedData?.dependency || {};
		return {
			fileName: result.filePath.split("/").pop() || result.filePath,
			depCount: dependencyData.dependencies?.length || 0,
			importCount: dependencyData.imports?.length || 0,
			exportCount: dependencyData.exports?.length || 0,
			parseTime: result.performanceMetrics?.parseTime || 0,
			status: result.errors?.length ? "Error" : "OK",
			language: result.language || "unknown",
			issues: result.errors?.slice(0, 3).map((e) => e.message || String(e)), // Limit to 3 issues
		};
	}

	private buildTableView(result: AnalysisResult): TableView {
		const dependencyData = result.extractedData?.dependency || {};
		const identifierData = result.extractedData?.identifier || {};
		const deps = dependencyData.dependencies?.length || 0;

		return {
			file: this.truncateString(
				result.filePath.split("/").pop() || result.filePath,
				30,
			),
			lang: result.language?.substring(0, 3).toUpperCase() || "UNK",
			deps: deps.toString(),
			imports: (dependencyData.imports?.length || 0).toString(),
			exports: (dependencyData.exports?.length || 0).toString(),
			functions: (identifierData.functions?.length || 0).toString(),
			classes: (identifierData.classes?.length || 0).toString(),
			time: `${result.performanceMetrics?.parseTime || 0}ms`,
			memory: this.formatMemory(result.performanceMetrics?.memoryUsage || 0),
			status: result.errors?.length ? "ERR" : "OK",
			issues: result.errors?.length ? "⚠" : "✓",
		};
	}

	private buildTreeView(result: AnalysisResult): TreeView {
		const dependencyData = result.extractedData?.dependency || {};
		const dependencies = dependencyData.dependencies || [];
		const exports = dependencyData.exports || [];

		const root: TreeNode = {
			type: "file",
			name: result.filePath.split("/").pop() || result.filePath,
			children: [
				{
					type: "section",
					name: "Dependencies",
					value: dependencies.length,
					children: dependencies.slice(0, 5).map((dep: any) => ({
						type: "item",
						name: dep.name || dep.source || String(dep),
						metadata: { type: "dependency" },
					})),
				},
				{
					type: "section",
					name: "Exports",
					value: exports.length,
					children: exports.slice(0, 5).map((exp: any) => ({
						type: "item",
						name: exp.name || exp.source || String(exp),
						metadata: { type: "export" },
					})),
				},
				{
					type: "section",
					name: "Metrics",
					children: [
						{
							type: "metric",
							name: "Parse Time",
							value: `${result.performanceMetrics?.parseTime || 0}ms`,
						},
						{
							type: "metric",
							name: "Memory",
							value: this.formatMemory(
								result.performanceMetrics?.memoryUsage || 0,
							),
						},
					],
				},
			],
		};

		return {
			root,
			summary: {
				totalNodes: this.countTreeNodes(root),
				maxDepth: this.calculateTreeDepth(root),
				sections: ["Dependencies", "Exports", "Metrics"],
			},
		};
	}

	private buildCSVView(result: AnalysisResult): CSVView {
		const dependencyData = result.extractedData?.dependency || {};
		const identifierData = result.extractedData?.identifier || {};
		const complexityData = result.extractedData?.complexity || {};

		return {
			file: result.filePath,
			language: result.language || "unknown",
			dependencies: dependencyData.dependencies?.length || 0,
			imports: dependencyData.imports?.length || 0,
			exports: dependencyData.exports?.length || 0,
			functions: identifierData.functions?.length || 0,
			classes: identifierData.classes?.length || 0,
			interfaces: identifierData.interfaces?.length || 0,
			variables: identifierData.variables?.length || 0,
			cyclomaticComplexity: complexityData.cyclomatic || 0,
			linesOfCode: complexityData.linesOfCode || 0,
			parseTime: result.performanceMetrics?.parseTime || 0,
			totalTime: result.performanceMetrics?.totalTime || 0,
			memoryUsage: result.performanceMetrics?.memoryUsage || 0,
			status: result.errors?.length ? "error" : "success",
			errors: result.errors?.length || 0,
			warnings: 0, // AnalysisResult doesn't have warnings array
		};
	}

	private buildMinimalView(result: AnalysisResult): MinimalView {
		const dependencyData = result.extractedData?.dependency || {};
		return {
			name: result.filePath.split("/").pop() || result.filePath,
			deps: dependencyData.dependencies?.length || 0,
			exports: dependencyData.exports?.length || 0,
			time: result.performanceMetrics?.parseTime || 0,
			ok: !result.errors?.length,
		};
	}

	// Helper methods for building complex structures
	private buildMergedDependencies(
		result: AnalysisResult,
	): MergedDependencyInfo {
		const dependencyData = result.extractedData?.dependency || {};

		return {
			external:
				dependencyData.external?.map((dep: any) => ({
					name: dep.name || dep.source || String(dep),
					type: "import" as const,
					usageCount: 1,
					locations: [],
					resolved: true,
				})) || [],
			internal:
				dependencyData.internal?.map((dep: any) => ({
					name: dep.name || dep.source || String(dep),
					type: "import" as const,
					usageCount: 1,
					locations: [],
					resolved: true,
				})) || [],
			builtin:
				dependencyData.builtin?.map((dep: any) => ({
					name: dep.name || dep.source || String(dep),
					type: "import" as const,
					usageCount: 1,
					locations: [],
					resolved: true,
				})) || [],
			graph: {
				nodes: (dependencyData.dependencies?.length || 0) + 1, // +1 for current file
				edges: dependencyData.dependencies?.length || 0,
				depth: 1,
				fanIn: 0,
				fanOut: dependencyData.dependencies?.length || 0,
				clusters: 1,
			},
			cycles: [],
			unused: [],
			security: [],
		};
	}

	private buildMergedCodeStructure(
		result: AnalysisResult,
	): MergedCodeStructure {
		const identifierData = result.extractedData?.identifier || {};
		const dependencyData = result.extractedData?.dependency || {};

		return {
			functions:
				identifierData.functions?.map((func: any) => ({
					name: func.name || "anonymous",
					signature: func.signature || "",
					complexity: func.complexity || 1,
					linesOfCode: func.linesOfCode || 0,
					parameters: func.parameters || 0,
					returnType: func.returnType,
					isExported: func.isExported || false,
					isAsync: func.isAsync || false,
					visibility: "public" as const,
					calls: [],
					calledBy: [],
					location: { line: func.line || 0, column: func.column || 0 },
				})) || [],
			classes:
				identifierData.classes?.map((cls: any) => ({
					name: cls.name || "Anonymous",
					methods: cls.methods || 0,
					properties: cls.properties || 0,
					extends: cls.extends,
					implements: cls.implements || [],
					isExported: cls.isExported || false,
					isAbstract: cls.isAbstract || false,
					complexity: cls.complexity || 1,
					cohesion: 0.8,
					coupling: 0.3,
					location: { line: cls.line || 0, column: cls.column || 0 },
				})) || [],
			interfaces:
				identifierData.interfaces?.map((iface: any) => ({
					name: iface.name || "Anonymous",
					methods: iface.methods || 0,
					properties: iface.properties || 0,
					extends: iface.extends || [],
					isExported: iface.isExported || false,
					usage: 1,
					location: { line: iface.line || 0, column: iface.column || 0 },
				})) || [],
			types:
				identifierData.types?.map((type: any) => ({
					name: type.name || "Anonymous",
					definition: type.definition || "",
					category: "object" as const,
					isExported: type.isExported || false,
					usage: 1,
					complexity: 1,
					location: { line: type.line || 0, column: type.column || 0 },
				})) || [],
			variables:
				identifierData.variables?.map((variable: any) => ({
					name: variable.name || "anonymous",
					type: variable.type,
					kind: variable.kind || ("let" as const),
					isExported: variable.isExported || false,
					scope: "global" as const,
					mutations: 0,
					location: { line: variable.line || 0, column: variable.column || 0 },
				})) || [],
			module: {
				type: "esmodule" as const,
				hasDefaultExport:
					dependencyData.exports?.some(
						(exp: any) => exp.name === "default" || exp.type === "default",
					) || false,
				namedExports: dependencyData.exports?.length || 0,
				reexports: 0,
				sideEffects: false,
				treeShakeable: true,
			},
			patterns: [],
		};
	}

	private buildMergedComplexity(
		result: AnalysisResult,
	): MergedComplexityMetrics {
		const complexityData = result.extractedData?.complexity || {};

		return {
			file: {
				cyclomaticComplexity: complexityData.cyclomatic || 1,
				cognitiveComplexity: complexityData.cognitive || 1,
				nestingDepth: complexityData.nestingDepth || 1,
				linesOfCode: complexityData.linesOfCode || 0,
				linesOfComments: complexityData.linesOfComments || 0,
				linesBlank: complexityData.linesBlank || 0,
				maintainabilityIndex: 75, // Default good score
				halstead: {
					length: complexityData.linesOfCode || 0,
					vocabulary: 50,
					volume: 100,
					difficulty: 10,
					effort: 1000,
					timeToImplement: 60,
					bugs: 0.1,
				},
			},
			functions: [],
			classes: [],
			quality: {
				duplicateLines: 0,
				duplicateBlocks: 0,
				codeSmells: [],
				documentationCoverage: 0.8,
			},
			maintainability: {
				index: 75,
				category: "high" as const,
				debt: {
					estimated: 30,
					rating: "A" as const,
					issues: [],
				},
				trends: [],
			},
		};
	}

	private buildAnalysisInsights(result: AnalysisResult): AnalysisInsights {
		const insights: string[] = [];
		const dependencyData = result.extractedData?.dependency || {};
		const dependencies = dependencyData.dependencies || [];

		if (dependencies.length > 20) {
			insights.push("High dependency count may indicate tight coupling");
		}

		if (result.errors && result.errors.length > 0) {
			insights.push("Parsing errors detected - code quality may be impacted");
		}

		const parseTime = result.performanceMetrics?.parseTime || 0;
		if (parseTime > 1000) {
			insights.push("Long parse time may indicate complex file structure");
		}

		return {
			keyFindings: insights,
			risks: [],
			opportunities: [],
			benchmarks: [],
		};
	}

	private buildRecommendations(result: AnalysisResult): Recommendation[] {
		const recommendations: Recommendation[] = [];
		const dependencyData = result.extractedData?.dependency || {};
		const dependencies = dependencyData.dependencies || [];

		if (dependencies.length > 15) {
			recommendations.push({
				id: "DEP001",
				type: "improvement",
				priority: "medium",
				title: "Consider reducing dependencies",
				description: "High dependency count may impact maintainability",
				rationale:
					"Fewer dependencies reduce update burden and security surface",
				implementation: {
					steps: [
						"Audit dependencies",
						"Remove unused dependencies",
						"Consider bundling",
					],
					estimatedTime: "2-4 hours",
					difficulty: "medium",
				},
				impact: {
					maintainability: "positive",
					security: "positive",
					effort: "medium",
					confidence: 0.8,
				},
			});
		}

		return recommendations;
	}

	// Quality assessment and utility methods
	private assessDataQuality(result: AnalysisResult): DataQualityAssessment {
		let completeness = 0.8; // Base score
		let accuracy = 0.9;
		const consistency = 0.85;
		const freshness = 1.0; // Always fresh as just analyzed
		let validity = 0.9;

		// Adjust based on errors
		if (result.errors && result.errors.length > 0) {
			accuracy *= 0.7;
			validity *= 0.8;
		}

		// Adjust based on data availability
		if (
			!result.extractedData ||
			Object.keys(result.extractedData).length === 0
		) {
			completeness *= 0.5;
		}

		const _overall =
			(completeness + accuracy + consistency + freshness + validity) / 5;

		return {
			completeness,
			accuracy,
			consistency,
			freshness,
			validity,
			issues:
				result.errors?.map((error) => ({
					type: "invalid" as const,
					severity: "medium" as const,
					description: error.message || String(error),
					affectedData: ["extractedData"],
				})) || [],
		};
	}

	private validateDataConsistency(data: IntegratedAnalysisData): boolean {
		try {
			// Check if core counts match view counts
			const coreDeps = data.core.counts.dependencies.total;

			// Only validate summary view if it exists
			if (data.views.summary) {
				const summaryDeps = data.views.summary.depCount;
				if (Math.abs(coreDeps - summaryDeps) > 1) {
					console.warn("Dependency count inconsistency detected");
					return false;
				}
			}

			return true;
		} catch (error) {
			console.error("Consistency validation failed:", error);
			return false;
		}
	}

	// Utility methods
	private getFileExtension(filePath: string): string {
		const parts = filePath.split(".");
		return parts.length > 1 ? parts[parts.length - 1] : "";
	}

	private truncateString(str: string, maxLength: number): string {
		if (str.length <= maxLength) return str;
		return `${str.substring(0, maxLength - 3)}...`;
	}

	private formatMemory(bytes: number): string {
		if (bytes === 0) return "0B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / k ** i).toFixed(1)) + sizes[i];
	}

	private countTreeNodes(node: TreeNode): number {
		let count = 1;
		if (node.children) {
			count += node.children.reduce(
				(sum, child) => sum + this.countTreeNodes(child),
				0,
			);
		}
		return count;
	}

	private calculateTreeDepth(node: TreeNode, currentDepth: number = 1): number {
		if (!node.children || node.children.length === 0) {
			return currentDepth;
		}
		return Math.max(
			...node.children.map((child) =>
				this.calculateTreeDepth(child, currentDepth + 1),
			),
		);
	}

	private getOptimizationStrategy(
		config: DataIntegrationConfig,
	): OptimizationStrategy {
		switch (config.optimizationMode) {
			case "speed":
				return {
					enableLazyLoading: true,
					enableViewCaching: true,
					enableDataCompression: false,
					enableMemoryPooling: false,
					maxConcurrency: 8,
					batchSize: 20,
				};
			case "accuracy":
				return {
					enableLazyLoading: false,
					enableViewCaching: false,
					enableDataCompression: false,
					enableMemoryPooling: true,
					maxConcurrency: 2,
					batchSize: 5,
				};
			default:
				return {
					enableLazyLoading: true,
					enableViewCaching: true,
					enableDataCompression: false,
					enableMemoryPooling: true,
					maxConcurrency: 4,
					batchSize: 10,
				};
		}
	}
}
