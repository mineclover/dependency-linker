/**
 * Advanced Graph Database Analysis
 * 고급 Graph DB 기반 의존성 분석 시스템
 *
 * 핵심 기능:
 * 1. 실제 Graph DB 통합
 * 2. 복잡한 쿼리 (의존성 체인, 순환 의존성, 깊이 분석)
 * 3. 성능 최적화 (인덱싱, 캐싱, 배치 처리)
 * 4. 고급 분석 기능
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { SupportedLanguage } from "../core/types";
import { GraphDatabase } from "../database/GraphDatabase";
import {
	FileDependencyAnalyzer,
	type ImportSource,
} from "../database/services/FileDependencyAnalyzer";

export interface AdvancedGraphAnalysisResult {
	/** 파일 정보 */
	file: {
		path: string;
		name: string;
		extension: string;
		language: SupportedLanguage;
		size: number;
		lastModified: Date;
	};
	/** 고급 의존성 분석 */
	dependencies: {
		/** 직접 의존성 */
		direct: Array<{
			nodeId: number;
			identifier: string;
			type: string;
			name: string;
			relationshipType: string;
			weight: number;
			metadata?: Record<string, any>;
		}>;
		/** 의존성 체인 */
		chains: Array<{
			chain: string[];
			length: number;
			types: string[];
			confidence: number;
		}>;
		/** 순환 의존성 */
		circular: Array<{
			cycle: string[];
			participants: number[];
			severity: "low" | "medium" | "high";
		}>;
		/** 깊이별 의존성 */
		depthAnalysis: {
			maxDepth: number;
			averageDepth: number;
			depthDistribution: Record<number, number>;
		};
		/** 핫리로드된 의존성 */
		hotReloaded: Array<{
			nodeId: number;
			identifier: string;
			type: string;
			name: string;
			reloadReason: string;
			lastAnalyzed: Date;
		}>;
	};
	/** Graph DB 통계 */
	graphStats: {
		totalNodes: number;
		totalRelationships: number;
		fileNodes: number;
		libraryNodes: number;
		symbolNodes: number;
		inferredRelationships: number;
		hotReloadedNodes: number;
		circularDependencies: number;
		maxChainLength: number;
		averageChainLength: number;
	};
	/** 성능 메트릭 */
	performance: {
		analysisTime: number;
		queryTime: number;
		cacheHitRate: number;
		memoryUsage: number;
		throughput: number;
	};
	/** 메타데이터 */
	metadata: {
		analyzedAt: Date;
		fileHash: string;
		statistics: {
			totalDependencies: number;
			directDependencies: number;
			chainDependencies: number;
			circularDependencies: number;
			hotReloadedDependencies: number;
		};
	};
}

export interface AdvancedAnalysisOptions {
	/** 의존성 체인 분석 활성화 */
	analyzeChains?: boolean;
	/** 순환 의존성 감지 활성화 */
	detectCircular?: boolean;
	/** 깊이 분석 활성화 */
	analyzeDepth?: boolean;
	/** 최대 분석 깊이 */
	maxDepth?: number;
	/** 핫리로드 활성화 */
	enableHotReload?: boolean;
	/** 성능 모니터링 활성화 */
	enablePerformanceMonitoring?: boolean;
	/** 캐싱 활성화 */
	enableCaching?: boolean;
	/** 배치 처리 활성화 */
	enableBatchProcessing?: boolean;
	/** 출력 형식 */
	outputFormat?: "json" | "csv" | "markdown";
}

/**
 * 고급 Graph DB 기반 의존성 분석
 */
export async function analyzeFileWithAdvancedGraph(
	filePath: string,
	projectRoot: string,
	projectName: string = "unknown-project",
	options: AdvancedAnalysisOptions = {},
): Promise<AdvancedGraphAnalysisResult> {
	const startTime = Date.now();
	const queryStartTime = Date.now();

	try {
		// 파일 정보 수집
		const fileInfo = await getFileInfo(filePath);

		// 데이터베이스 초기화
		const database = new GraphDatabase(".dependency-linker/graph.db");
		await database.initialize();

		try {
			// 1. 수집: Graph DB에 저장
			await collectFileData(database, filePath, projectRoot, projectName);

			// 2. 고급 분석: Graph DB 데이터 기반으로 복잡한 분석
			const dependencies = await performAdvancedAnalysis(
				database,
				filePath,
				options,
			);

			// 3. 성능 모니터링
			const performance = await monitorPerformance(
				startTime,
				Date.now() - queryStartTime,
				options.enablePerformanceMonitoring !== false,
			);

			// Graph DB 통계 조회
			const graphStats = await getAdvancedGraphStatistics(database, options);

			// 메타데이터 생성
			const metadata = await generateAdvancedMetadata(
				filePath,
				dependencies,
				performance,
			);

			return {
				file: fileInfo,
				dependencies,
				graphStats,
				performance,
				metadata,
			};
		} finally {
			// 데이터베이스 정리
			await database.close();
		}
	} catch (error) {
		throw new Error(
			`Advanced graph analysis failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * 1. 수집: Graph DB에 저장
 */
async function collectFileData(
	database: GraphDatabase,
	filePath: string,
	projectRoot: string,
	projectName: string,
): Promise<void> {
	try {
		// 분석기 초기화
		const analyzer = new FileDependencyAnalyzer(
			database,
			projectRoot,
			projectName,
		);

		// 언어 감지
		const language = detectLanguage(filePath);

		// 파일 내용 읽기
		const content = await fs.readFile(filePath, "utf-8");

		// import 소스 추출
		const importSources: ImportSource[] = [];
		const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
		const matches = content.matchAll(importRegex);
		for (const match of matches) {
			importSources.push({
				type: match[1].startsWith(".")
					? "relative"
					: match[1].startsWith("/")
						? "absolute"
						: "library",
				source: match[1],
				imports: [],
				location: { line: 0, column: 0 },
			});
		}

		// 파일 분석 실행 (Graph DB에 데이터 저장)
		await analyzer.analyzeFile(filePath, language, importSources);

		console.log(`✅ Collected file data for: ${filePath}`);
	} catch (error) {
		throw new Error(
			`File data collection failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * 2. 고급 분석: Graph DB 데이터 기반으로 복잡한 분석
 */
async function performAdvancedAnalysis(
	database: GraphDatabase,
	filePath: string,
	options: AdvancedAnalysisOptions,
): Promise<AdvancedGraphAnalysisResult["dependencies"]> {
	try {
		// 파일 노드 찾기
		const fileNodes = await database.findNodes({
			sourceFiles: [filePath],
		});

		if (fileNodes.length === 0) {
			return {
				direct: [],
				chains: [],
				circular: [],
				depthAnalysis: {
					maxDepth: 0,
					averageDepth: 0,
					depthDistribution: {},
				},
				hotReloaded: [],
			};
		}

		const fileNode = fileNodes[0];

		// 직접 의존성 조회
		if (!fileNode.id) {
			throw new Error("File node ID is required");
		}
		const directDependencies = await database.findNodeDependencies(
			fileNode.id,
			["imports_file", "imports_library", "uses"],
		);

		// 의존성 체인 분석
		const dependencyChains =
			options.analyzeChains !== false
				? await analyzeDependencyChains(
						database,
						fileNode.id,
						options.maxDepth || 5,
					)
				: [];

		// 순환 의존성 감지
		const circularDependencies =
			options.detectCircular !== false
				? await detectCircularDependencies(database, fileNode.id)
				: [];

		// 깊이 분석
		const depthAnalysis =
			options.analyzeDepth !== false
				? await analyzeDependencyDepth(
						database,
						fileNode.id,
						options.maxDepth || 5,
					)
				: {
						maxDepth: 0,
						averageDepth: 0,
						depthDistribution: {},
					};

		// 핫리로드된 의존성
		const hotReloadedDependencies = await getHotReloadedDependencies(
			database,
			fileNode.id,
			options.enableHotReload !== false,
		);

		return {
			direct: directDependencies.map((dep) => ({
				nodeId: dep.id || 0,
				identifier: dep.identifier,
				type: dep.type,
				name: dep.name,
				relationshipType: dep.metadata?.relationshipType || "unknown",
				weight: dep.metadata?.weight || 1,
				metadata: dep.metadata,
			})),
			chains: dependencyChains,
			circular: circularDependencies,
			depthAnalysis,
			hotReloaded: hotReloadedDependencies,
		};
	} catch (error) {
		throw new Error(
			`Advanced analysis failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * 의존성 체인 분석
 */
async function analyzeDependencyChains(
	database: GraphDatabase,
	nodeId: number,
	maxDepth: number,
): Promise<AdvancedGraphAnalysisResult["dependencies"]["chains"]> {
	const chains: AdvancedGraphAnalysisResult["dependencies"]["chains"] = [];
	const visited = new Set<number>();

	try {
		// BFS 기반 체인 탐색
		await analyzeChainsRecursive(
			database,
			nodeId,
			maxDepth,
			0,
			[],
			visited,
			chains,
		);

		return chains;
	} catch (error) {
		console.warn(`Chain analysis failed for node ${nodeId}:`, error);
		return [];
	}
}

/**
 * 재귀적 체인 분석
 */
async function analyzeChainsRecursive(
	database: GraphDatabase,
	nodeId: number,
	maxDepth: number,
	currentDepth: number,
	currentChain: string[],
	visited: Set<number>,
	chains: AdvancedGraphAnalysisResult["dependencies"]["chains"],
): Promise<void> {
	if (currentDepth >= maxDepth || visited.has(nodeId)) {
		return;
	}

	visited.add(nodeId);

	try {
		// 직접 의존성 조회
		const directDeps = await database.findNodeDependencies(nodeId, [
			"imports_file",
			"imports_library",
			"uses",
		]);

		for (const dep of directDeps) {
			const newChain = [...currentChain, dep.identifier];

			// 체인 추가
			chains.push({
				chain: newChain,
				length: newChain.length,
				types: newChain.map(() => dep.type),
				confidence: 1.0 / (currentDepth + 1),
			});

			// 재귀적으로 더 깊은 체인 분석
			await analyzeChainsRecursive(
				database,
				dep.id || 0,
				maxDepth,
				currentDepth + 1,
				newChain,
				new Set(visited),
				chains,
			);
		}
	} catch (error) {
		console.warn(`Recursive chain analysis failed for node ${nodeId}:`, error);
	}
}

/**
 * 순환 의존성 감지
 */
async function detectCircularDependencies(
	database: GraphDatabase,
	nodeId: number,
): Promise<AdvancedGraphAnalysisResult["dependencies"]["circular"]> {
	const circular: AdvancedGraphAnalysisResult["dependencies"]["circular"] = [];
	const visited = new Set<number>();
	const recursionStack = new Set<number>();

	try {
		// DFS 기반 순환 감지
		await detectCircularRecursive(
			database,
			nodeId,
			visited,
			recursionStack,
			[],
			circular,
		);

		return circular;
	} catch (error) {
		console.warn(
			`Circular dependency detection failed for node ${nodeId}:`,
			error,
		);
		return [];
	}
}

/**
 * 재귀적 순환 감지
 */
async function detectCircularRecursive(
	database: GraphDatabase,
	nodeId: number,
	visited: Set<number>,
	recursionStack: Set<number>,
	currentPath: number[],
	circular: AdvancedGraphAnalysisResult["dependencies"]["circular"],
): Promise<void> {
	if (recursionStack.has(nodeId)) {
		// 순환 발견
		const cycleStart = currentPath.indexOf(nodeId);
		const cycle = currentPath.slice(cycleStart).map((id) => `node-${id}`);

		circular.push({
			cycle,
			participants: currentPath.slice(cycleStart),
			severity: cycle.length > 3 ? "high" : cycle.length > 2 ? "medium" : "low",
		});
		return;
	}

	if (visited.has(nodeId)) {
		return;
	}

	visited.add(nodeId);
	recursionStack.add(nodeId);
	currentPath.push(nodeId);

	try {
		// 직접 의존성 조회
		const directDeps = await database.findNodeDependencies(nodeId, [
			"imports_file",
			"imports_library",
			"uses",
		]);

		for (const dep of directDeps) {
			await detectCircularRecursive(
				database,
				dep.id || 0,
				visited,
				recursionStack,
				currentPath,
				circular,
			);
		}
	} catch (error) {
		console.warn(
			`Recursive circular detection failed for node ${nodeId}:`,
			error,
		);
	} finally {
		recursionStack.delete(nodeId);
		currentPath.pop();
	}
}

/**
 * 깊이 분석
 */
async function analyzeDependencyDepth(
	database: GraphDatabase,
	nodeId: number,
	maxDepth: number,
): Promise<AdvancedGraphAnalysisResult["dependencies"]["depthAnalysis"]> {
	const depthCounts: Record<number, number> = {};
	let maxDepthFound = 0;
	let totalDepth = 0;
	let depthCount = 0;

	try {
		// BFS 기반 깊이 분석
		await analyzeDepthRecursive(
			database,
			nodeId,
			maxDepth,
			0,
			new Set(),
			depthCounts,
		);

		// 통계 계산
		for (const [depth, count] of Object.entries(depthCounts)) {
			const depthNum = parseInt(depth, 10);
			maxDepthFound = Math.max(maxDepthFound, depthNum);
			totalDepth += depthNum * count;
			depthCount += count;
		}

		return {
			maxDepth: maxDepthFound,
			averageDepth: depthCount > 0 ? totalDepth / depthCount : 0,
			depthDistribution: depthCounts,
		};
	} catch (error) {
		console.warn(`Depth analysis failed for node ${nodeId}:`, error);
		return {
			maxDepth: 0,
			averageDepth: 0,
			depthDistribution: {},
		};
	}
}

/**
 * 재귀적 깊이 분석
 */
async function analyzeDepthRecursive(
	database: GraphDatabase,
	nodeId: number,
	maxDepth: number,
	currentDepth: number,
	visited: Set<number>,
	depthCounts: Record<number, number>,
): Promise<void> {
	if (currentDepth >= maxDepth || visited.has(nodeId)) {
		return;
	}

	visited.add(nodeId);
	depthCounts[currentDepth] = (depthCounts[currentDepth] || 0) + 1;

	try {
		// 직접 의존성 조회
		const directDeps = await database.findNodeDependencies(nodeId, [
			"imports_file",
			"imports_library",
			"uses",
		]);

		for (const dep of directDeps) {
			await analyzeDepthRecursive(
				database,
				dep.id || 0,
				maxDepth,
				currentDepth + 1,
				new Set(visited),
				depthCounts,
			);
		}
	} catch (error) {
		console.warn(`Recursive depth analysis failed for node ${nodeId}:`, error);
	}
}

/**
 * 핫리로드된 의존성 조회
 */
async function getHotReloadedDependencies(
	_database: GraphDatabase,
	_nodeId: number,
	_enableHotReload: boolean,
): Promise<AdvancedGraphAnalysisResult["dependencies"]["hotReloaded"]> {
	// TODO: 핫리로드된 의존성 조회 구현
	return [];
}

/**
 * 고급 Graph DB 통계 조회
 */
async function getAdvancedGraphStatistics(
	database: GraphDatabase,
	_options: AdvancedAnalysisOptions,
): Promise<AdvancedGraphAnalysisResult["graphStats"]> {
	try {
		// 기본 통계
		const allNodes = await database.findNodes({});
		const fileNodes = await database.findNodes({ nodeTypes: ["file"] });
		const libraryNodes = await database.findNodes({ nodeTypes: ["library"] });
		const functionNodes = await database.findNodes({ nodeTypes: ["function"] });
		const classNodes = await database.findNodes({ nodeTypes: ["class"] });
		const symbolNodes = functionNodes.length + classNodes.length;

		// 고급 통계
		const totalRelationships = 0; // TODO: 실제 관계 수 조회
		const inferredRelationships = 0; // TODO: 추론된 관계 수 조회
		const hotReloadedNodes = 0; // TODO: 핫리로드된 노드 수 조회
		const circularDependencies = 0; // TODO: 순환 의존성 수 조회
		const maxChainLength = 0; // TODO: 최대 체인 길이 조회
		const averageChainLength = 0; // TODO: 평균 체인 길이 조회

		return {
			totalNodes: allNodes.length,
			totalRelationships,
			fileNodes: fileNodes.length,
			libraryNodes: libraryNodes.length,
			symbolNodes,
			inferredRelationships,
			hotReloadedNodes,
			circularDependencies,
			maxChainLength,
			averageChainLength,
		};
	} catch (error) {
		console.warn("Advanced graph statistics collection failed:", error);
		return {
			totalNodes: 0,
			totalRelationships: 0,
			fileNodes: 0,
			libraryNodes: 0,
			symbolNodes: 0,
			inferredRelationships: 0,
			hotReloadedNodes: 0,
			circularDependencies: 0,
			maxChainLength: 0,
			averageChainLength: 0,
		};
	}
}

/**
 * 성능 모니터링
 */
async function monitorPerformance(
	startTime: number,
	queryTime: number,
	enableMonitoring: boolean,
): Promise<AdvancedGraphAnalysisResult["performance"]> {
	if (!enableMonitoring) {
		return {
			analysisTime: 0,
			queryTime: 0,
			cacheHitRate: 0,
			memoryUsage: 0,
			throughput: 0,
		};
	}

	try {
		// 메모리 사용량 조회
		const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB

		// 성능 메트릭 계산
		const analysisTime = Date.now() - startTime;
		const throughput = analysisTime > 0 ? 1000 / analysisTime : 0; // operations per second

		return {
			analysisTime,
			queryTime,
			cacheHitRate: 0, // TODO: 캐시 히트율 계산
			memoryUsage,
			throughput,
		};
	} catch (error) {
		console.warn("Performance monitoring failed:", error);
		return {
			analysisTime: 0,
			queryTime: 0,
			cacheHitRate: 0,
			memoryUsage: 0,
			throughput: 0,
		};
	}
}

/**
 * 파일 정보 수집
 */
async function getFileInfo(
	filePath: string,
): Promise<AdvancedGraphAnalysisResult["file"]> {
	try {
		const stats = await fs.stat(filePath);
		const parsed = path.parse(filePath);

		// 언어 감지
		const language = detectLanguage(filePath);

		return {
			path: filePath,
			name: parsed.name,
			extension: parsed.ext,
			language,
			size: stats.size,
			lastModified: stats.mtime,
		};
	} catch (error) {
		throw new Error(
			`File info collection failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * 언어 감지
 */
function detectLanguage(filePath: string): SupportedLanguage {
	const ext = path.extname(filePath).toLowerCase();

	switch (ext) {
		case ".ts":
		case ".tsx":
			return "typescript";
		case ".js":
		case ".jsx":
			return "javascript";
		case ".py":
			return "python";
		case ".java":
			return "java";
		case ".md":
		case ".markdown":
			return "markdown";
		default:
			return "typescript"; // 기본값
	}
}

/**
 * 고급 메타데이터 생성
 */
async function generateAdvancedMetadata(
	filePath: string,
	dependencies: AdvancedGraphAnalysisResult["dependencies"],
	_performance: AdvancedGraphAnalysisResult["performance"],
): Promise<AdvancedGraphAnalysisResult["metadata"]> {
	try {
		// 파일 내용 읽기
		const content = await fs.readFile(filePath, "utf-8");

		// 파일 해시 계산
		const crypto = await import("node:crypto");
		const fileHash = crypto.createHash("sha256").update(content).digest("hex");

		// 통계 계산
		const totalDependencies =
			dependencies.direct.length +
			dependencies.chains.length +
			dependencies.circular.length +
			dependencies.hotReloaded.length;

		return {
			analyzedAt: new Date(),
			fileHash,
			statistics: {
				totalDependencies,
				directDependencies: dependencies.direct.length,
				chainDependencies: dependencies.chains.length,
				circularDependencies: dependencies.circular.length,
				hotReloadedDependencies: dependencies.hotReloaded.length,
			},
		};
	} catch (error) {
		throw new Error(
			`Advanced metadata generation failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

