/**
 * Dependency Graph Analysis API
 * 의존성 그래프 분석을 위한 고수준 API
 */

import { initializeAnalysisSystem } from "../api/analysis";
import { DependencyGraphBuilder } from "./DependencyGraphBuilder";
import { GraphAnalyzer } from "./GraphAnalyzer";
import type {
	DependencyGraph,
	GraphAnalysisResult,
	GraphBuildOptions,
	GraphBuildResult,
} from "./types";

/**
 * 의존성 분석기 클래스
 * 그래프 빌드와 분석을 통합한 고수준 인터페이스
 */
export class DependencyAnalyzer {
	private options: GraphBuildOptions;
	private graph?: DependencyGraph;
	private analyzer?: GraphAnalyzer;

	constructor(options: GraphBuildOptions) {
		this.options = options;

		// 분석 시스템 초기화
		initializeAnalysisSystem();
	}

	/**
	 * 의존성 그래프 빌드
	 */
	async buildGraph(): Promise<GraphBuildResult> {
		const builder = new DependencyGraphBuilder(this.options);
		const result = await builder.build();

		this.graph = result.graph;
		this.analyzer = new GraphAnalyzer(this.graph);

		return result;
	}

	/**
	 * 그래프 분석
	 */
	analyzeGraph(): GraphAnalysisResult {
		if (!this.analyzer) {
			throw new Error("Graph must be built before analysis. Call buildGraph() first.");
		}

		return this.analyzer.analyze();
	}

	/**
	 * 전체 분석 (빌드 + 분석)
	 */
	async analyze(): Promise<{
		buildResult: GraphBuildResult;
		analysisResult: GraphAnalysisResult;
	}> {
		const buildResult = await this.buildGraph();
		const analysisResult = this.analyzeGraph();

		return {
			buildResult,
			analysisResult,
		};
	}

	/**
	 * 특정 파일의 의존성 트리 조회
	 */
	getDependencyTree(filePath: string, maxDepth = 5): any {
		if (!this.analyzer) {
			throw new Error("Graph must be built before getting dependency tree. Call buildGraph() first.");
		}

		return this.analyzer.getDependencyTree(filePath, maxDepth);
	}

	/**
	 * 특정 파일에 의존하는 파일들 조회
	 */
	getDependents(filePath: string): string[] {
		if (!this.analyzer) {
			throw new Error("Graph must be built before getting dependents. Call buildGraph() first.");
		}

		return this.analyzer.getDependents(filePath);
	}

	/**
	 * 특정 파일이 의존하는 파일들 조회
	 */
	getDependencies(filePath: string): string[] {
		if (!this.analyzer) {
			throw new Error("Graph must be built before getting dependencies. Call buildGraph() first.");
		}

		return this.analyzer.getDependencies(filePath);
	}

	/**
	 * 두 파일 간의 의존성 경로 찾기
	 */
	findDependencyPath(from: string, to: string): string[] | null {
		if (!this.analyzer) {
			throw new Error("Graph must be built before finding dependency path. Call buildGraph() first.");
		}

		return this.analyzer.findDependencyPath(from, to);
	}

	/**
	 * 그래프 통계 조회
	 */
	getStatistics() {
		if (!this.analyzer) {
			throw new Error("Graph must be built before getting statistics. Call buildGraph() first.");
		}

		return this.analyzer.getStatistics();
	}

	/**
	 * 현재 그래프 반환
	 */
	getGraph(): DependencyGraph | undefined {
		return this.graph;
	}

	/**
	 * 옵션 업데이트
	 */
	updateOptions(newOptions: Partial<GraphBuildOptions>): void {
		this.options = { ...this.options, ...newOptions };
		// 그래프 재빌드 필요
		this.graph = undefined;
		this.analyzer = undefined;
	}
}

/**
 * 의존성 분석기 팩토리 함수
 */
export function createDependencyAnalyzer(options: GraphBuildOptions): DependencyAnalyzer {
	return new DependencyAnalyzer(options);
}

/**
 * 간단한 의존성 그래프 분석 함수
 */
export async function analyzeDependencyGraph(
	projectRoot: string,
	entryPoints: string[],
	options: Partial<GraphBuildOptions> = {},
): Promise<{
	buildResult: GraphBuildResult;
	analysisResult: GraphAnalysisResult;
}> {
	const analyzer = createDependencyAnalyzer({
		projectRoot,
		entryPoints,
		...options,
	});

	return analyzer.analyze();
}

/**
 * 프로젝트 전체 의존성 분석 (일반적인 설정)
 */
export async function analyzeProjectDependencies(
	projectRoot: string,
	entryPoints: string[] = ["src/index.ts", "src/main.ts", "index.ts"],
	options: Partial<GraphBuildOptions> = {},
): Promise<{
	buildResult: GraphBuildResult;
	analysisResult: GraphAnalysisResult;
	statistics: any;
}> {
	const analyzer = createDependencyAnalyzer({
		projectRoot,
		entryPoints,
		includePatterns: ["src/**/*.{ts,tsx,js,jsx}", "lib/**/*.{ts,tsx,js,jsx}"],
		excludePatterns: [
			"**/node_modules/**",
			"**/dist/**",
			"**/build/**",
			"**/*.test.*",
			"**/*.spec.*",
			"**/*.d.ts",
		],
		maxDepth: 15,
		includeExternalDependencies: true,
		...options,
	});

	const { buildResult, analysisResult } = await analyzer.analyze();
	const statistics = analyzer.getStatistics();

	return {
		buildResult,
		analysisResult,
		statistics,
	};
}

/**
 * 특정 파일의 영향도 분석
 */
export async function analyzeFileImpact(
	projectRoot: string,
	targetFile: string,
	options: Partial<GraphBuildOptions> = {},
): Promise<{
	dependents: string[];
	dependencies: string[];
	dependencyTree: any;
	impactLevel: "low" | "medium" | "high";
}> {
	const analyzer = createDependencyAnalyzer({
		projectRoot,
		entryPoints: [targetFile],
		maxDepth: 10,
		...options,
	});

	await analyzer.buildGraph();

	const dependents = analyzer.getDependents(targetFile);
	const dependencies = analyzer.getDependencies(targetFile);
	const dependencyTree = analyzer.getDependencyTree(targetFile);

	// 영향도 계산 (의존하는 파일 수 기준)
	let impactLevel: "low" | "medium" | "high";
	if (dependents.length === 0) {
		impactLevel = "low";
	} else if (dependents.length <= 5) {
		impactLevel = "medium";
	} else {
		impactLevel = "high";
	}

	return {
		dependents,
		dependencies,
		dependencyTree,
		impactLevel,
	};
}