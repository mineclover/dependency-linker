/**
 * Dependency Graph Builder
 * 의존성 그래프 생성 및 관리
 */

import { resolve } from "node:path";
import { analyzeDependencies } from "../api/analysis";
import type { SupportedLanguage } from "../core/types";
import { PathResolver } from "./PathResolver";
import type {
	DependencyGraph,
	DependencyNode,
	FileDependency,
	GraphBuildOptions,
	GraphBuildResult,
} from "./types";

/**
 * 의존성 그래프 빌더 클래스
 */
export class DependencyGraphBuilder {
	private graph: DependencyGraph;
	private pathResolver: PathResolver;
	private options: Required<GraphBuildOptions>;
	private processedFiles = new Set<string>();
	private errors: GraphBuildResult["errors"] = [];

	constructor(options: GraphBuildOptions) {
		this.options = {
			includePatterns: ["**/*.{ts,tsx,js,jsx,java,py,go}"],
			excludePatterns: [
				"**/node_modules/**",
				"**/dist/**",
				"**/*.test.*",
				"**/*.spec.*",
			],
			maxDepth: 10,
			includeExternalDependencies: false,
			pathResolution: {},
			parallel: true,
			onProgress: () => {},
			...options,
		};

		this.pathResolver = new PathResolver({
			projectRoot: this.options.projectRoot,
			basePath: this.options.projectRoot,
			...this.options.pathResolution,
		});

		this.graph = {
			projectRoot: this.options.projectRoot,
			nodes: new Map(),
			edges: [],
			metadata: {
				totalFiles: 0,
				analyzedFiles: 0,
				totalDependencies: 0,
				circularDependencies: [],
				unresolvedDependencies: [],
				createdAt: new Date(),
				analysisTime: 0,
			},
		};
	}

	/**
	 * 의존성 그래프 빌드
	 */
	async build(): Promise<GraphBuildResult> {
		const startTime = performance.now();

		try {
			// 1. 진입점에서 시작하여 의존성 트리 탐색
			await this.analyzeEntryPoints();

			// 2. 그래프 메타데이터 업데이트
			this.updateMetadata();

			// 3. 순환 의존성 검사
			this.detectCircularDependencies();

			const endTime = performance.now();
			this.graph.metadata.analysisTime = endTime - startTime;

			const analysis = await this.analyzeGraph();

			return {
				graph: this.graph,
				analysis,
				processedFiles: this.processedFiles.size,
				processingTime: this.graph.metadata.analysisTime,
				errors: this.errors,
			};
		} catch (error) {
			throw new Error(`Graph build failed: ${error}`);
		}
	}

	/**
	 * 진입점 파일들 분석
	 */
	private async analyzeEntryPoints(): Promise<void> {
		const tasks = this.options.entryPoints.map((entryPoint) =>
			this.analyzeFile(resolve(this.options.projectRoot, entryPoint), 0),
		);

		if (this.options.parallel) {
			await Promise.allSettled(tasks);
		} else {
			for (const task of tasks) {
				await task;
			}
		}
	}

	/**
	 * 단일 파일 분석
	 */
	private async analyzeFile(filePath: string, depth: number): Promise<void> {
		// 깊이 제한 체크
		if (depth >= this.options.maxDepth) {
			return;
		}

		// 이미 처리된 파일 체크
		if (this.processedFiles.has(filePath)) {
			return;
		}

		this.processedFiles.add(filePath);
		this.options.onProgress?.(this.processedFiles.size, 0, filePath);

		try {
			// 1. 파일 분석
			const dependency = await this.analyzeFileDependencies(filePath);

			// 2. 노드 생성
			const node = this.createNode(dependency);
			this.graph.nodes.set(filePath, node);

			// 3. 의존성 파일들 해결 및 분석
			await this.processDependencies(dependency, depth);
		} catch (error) {
			this.errors.push({
				filePath,
				error: error instanceof Error ? error.message : String(error),
				type: "analysis",
			});
		}
	}

	/**
	 * 파일의 의존성 분석
	 */
	private async analyzeFileDependencies(
		filePath: string,
	): Promise<FileDependency> {
		try {
			const language = this.detectLanguage(filePath);
			const resolver = this.pathResolver.withBasePath(filePath);

			// 의존성 분석 실행
			const analysis = await analyzeDependencies("", language, filePath);

			// 경로 해결
			const allImports = [
				...analysis.internal,
				...analysis.external,
				...analysis.builtin,
			];

			const resolvedPaths = await Promise.allSettled(
				allImports.map(async (importPath) => {
					const result = await resolver.resolvePath(importPath);
					return result;
				}),
			);

			const internalDeps: string[] = [];
			const externalDeps: string[] = [];
			const builtinDeps: string[] = [];

			resolvedPaths.forEach((result, index) => {
				if (result.status === "fulfilled") {
					const { resolvedPath, resolutionType } = result.value;
					const originalImport = allImports[index];

					switch (resolutionType) {
						case "relative":
						case "absolute":
						case "alias":
							if (resolvedPath.startsWith(this.options.projectRoot)) {
								internalDeps.push(resolvedPath);
							} else {
								externalDeps.push(originalImport);
							}
							break;
						case "external":
							externalDeps.push(originalImport);
							break;
						case "builtin":
							builtinDeps.push(originalImport);
							break;
					}
				}
			});

			return {
				filePath,
				language,
				directDependencies: allImports,
				internalDependencies: internalDeps,
				externalDependencies: externalDeps,
				builtinDependencies: builtinDeps,
				analyzedAt: new Date(),
				exists: true,
			};
		} catch (error) {
			this.errors.push({
				filePath,
				error: error instanceof Error ? error.message : String(error),
				type: "parse",
			});

			// 빈 의존성 정보 반환
			return {
				filePath,
				language: this.detectLanguage(filePath),
				directDependencies: [],
				internalDependencies: [],
				externalDependencies: [],
				builtinDependencies: [],
				analyzedAt: new Date(),
				exists: false,
			};
		}
	}

	/**
	 * 노드 생성
	 */
	private createNode(dependency: FileDependency): DependencyNode {
		return {
			id: dependency.filePath,
			filePath: dependency.filePath,
			language: dependency.language,
			type: "internal",
			exists: dependency.exists,
			dependency,
		};
	}

	/**
	 * 의존성 처리
	 */
	private async processDependencies(
		dependency: FileDependency,
		depth: number,
	): Promise<void> {
		// 1. 엣지 생성
		this.createEdges(dependency);

		// 2. 내부 의존성 재귀 분석
		const internalTasks = dependency.internalDependencies.map((depPath) =>
			this.analyzeFile(depPath, depth + 1),
		);

		// 3. 외부 의존성 노드 생성 (분석하지 않음)
		if (this.options.includeExternalDependencies) {
			this.createExternalNodes(dependency);
		}

		// 4. 내부 의존성 처리
		if (this.options.parallel) {
			await Promise.allSettled(internalTasks);
		} else {
			for (const task of internalTasks) {
				await task;
			}
		}
	}

	/**
	 * 엣지 생성
	 */
	private createEdges(dependency: FileDependency): void {
		// 내부 의존성 엣지
		dependency.internalDependencies.forEach((depPath) => {
			this.graph.edges.push({
				from: dependency.filePath,
				to: depPath,
				type: "import",
			});
		});

		// 외부 의존성 엣지 (옵션에 따라)
		if (this.options.includeExternalDependencies) {
			dependency.externalDependencies.forEach((depPath) => {
				this.graph.edges.push({
					from: dependency.filePath,
					to: depPath,
					type: "import",
				});
			});
		}
	}

	/**
	 * 외부 의존성 노드 생성
	 */
	private createExternalNodes(dependency: FileDependency): void {
		// 외부 패키지 노드
		dependency.externalDependencies.forEach((extDep) => {
			if (!this.graph.nodes.has(extDep)) {
				this.graph.nodes.set(extDep, {
					id: extDep,
					filePath: extDep,
					type: "external",
					exists: true,
				});
			}
		});

		// 내장 모듈 노드
		dependency.builtinDependencies.forEach((builtinDep) => {
			if (!this.graph.nodes.has(builtinDep)) {
				this.graph.nodes.set(builtinDep, {
					id: builtinDep,
					filePath: builtinDep,
					type: "builtin",
					exists: true,
				});
			}
		});
	}

	/**
	 * 언어 감지
	 */
	private detectLanguage(filePath: string): SupportedLanguage {
		if (filePath.endsWith(".tsx")) return "tsx";
		if (filePath.endsWith(".ts")) return "typescript";
		if (filePath.endsWith(".jsx")) return "jsx";
		if (filePath.endsWith(".js")) return "javascript";
		if (filePath.endsWith(".java")) return "java";
		if (filePath.endsWith(".py")) return "python";
		if (filePath.endsWith(".go")) return "go";
		return "typescript"; // 기본값
	}

	/**
	 * 메타데이터 업데이트
	 */
	private updateMetadata(): void {
		this.graph.metadata.totalFiles = this.graph.nodes.size;
		this.graph.metadata.analyzedFiles = Array.from(
			this.graph.nodes.values(),
		).filter((node) => node.type === "internal").length;
		this.graph.metadata.totalDependencies = this.graph.edges.length;
	}

	/**
	 * 순환 의존성 검사
	 */
	private detectCircularDependencies(): void {
		const visited = new Set<string>();
		const recursionStack = new Set<string>();
		const cycles: string[][] = [];

		const dfs = (nodeId: string, path: string[]): void => {
			if (recursionStack.has(nodeId)) {
				// 순환 의존성 발견
				const cycleStart = path.indexOf(nodeId);
				const cycle = path.slice(cycleStart).concat(nodeId);
				cycles.push(cycle);
				return;
			}

			if (visited.has(nodeId)) {
				return;
			}

			visited.add(nodeId);
			recursionStack.add(nodeId);

			// 의존성 탐색
			const dependencies = this.graph.edges
				.filter((edge) => edge.from === nodeId)
				.map((edge) => edge.to);

			for (const depId of dependencies) {
				if (this.graph.nodes.has(depId)) {
					dfs(depId, [...path, nodeId]);
				}
			}

			recursionStack.delete(nodeId);
		};

		// 모든 내부 노드에서 DFS 시작
		for (const [nodeId, node] of this.graph.nodes) {
			if (node.type === "internal" && !visited.has(nodeId)) {
				dfs(nodeId, []);
			}
		}

		this.graph.metadata.circularDependencies = cycles;
	}

	/**
	 * 그래프 분석
	 */
	private async analyzeGraph() {
		// 이 부분은 다음 단계에서 구현
		return {
			circularDependencies: {
				cycles: this.graph.metadata.circularDependencies,
				totalCycles: this.graph.metadata.circularDependencies.length,
				maxDepth: Math.max(
					...this.graph.metadata.circularDependencies.map(
						(cycle) => cycle.length,
					),
					0,
				),
			},
			dependencyDepth: {
				maxDepth: 0,
				averageDepth: 0,
				depthDistribution: {},
			},
			hubFiles: [],
			isolatedFiles: [],
			unresolvedDependencies: [],
		};
	}

	/**
	 * 현재 그래프 반환
	 */
	getGraph(): DependencyGraph {
		return this.graph;
	}
}

/**
 * 의존성 그래프 빌더 팩토리 함수
 */
export function createDependencyGraphBuilder(
	options: GraphBuildOptions,
): DependencyGraphBuilder {
	return new DependencyGraphBuilder(options);
}

/**
 * 간단한 그래프 빌드 함수
 */
export async function buildDependencyGraph(
	projectRoot: string,
	entryPoints: string[],
): Promise<GraphBuildResult> {
	const builder = createDependencyGraphBuilder({
		projectRoot,
		entryPoints,
	});

	return builder.build();
}
