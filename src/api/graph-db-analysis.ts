/**
 * Graph Database Based Analysis System
 * Graph DB 기반 의존성 분석 시스템
 *
 * 핵심 개념:
 * 1. 수집: Graph DB에 저장 (import 기반 분석이 기본)
 * 2. 분석: Graph DB 데이터 기반으로 관계 추론
 * 3. 핫리로드: 필요할 때 특정 파일만 재분석
 * 4. 관계 기반 추론: 직접 탐색 안되는 것들을 매칭
 */

import * as path from "node:path";
import * as fs from "node:fs/promises";
import {
	FileDependencyAnalyzer,
	type ImportSource,
} from "../database/services/FileDependencyAnalyzer";
import {
	GraphDatabase,
	type GraphNode,
	type GraphRelationship,
} from "../database/GraphDatabase";
import type { SupportedLanguage } from "../core/types";

export interface GraphDBAnalysisResult {
	/** 파일 정보 */
	file: {
		path: string;
		name: string;
		extension: string;
		language: SupportedLanguage;
		size: number;
		lastModified: Date;
	};
	/** Graph DB 기반 의존성 분석 */
	dependencies: {
		/** 직접 의존성 (import 기반) */
		direct: Array<{
			nodeId: number;
			identifier: string;
			type: string;
			name: string;
			relationshipType: string;
			weight?: number;
			metadata?: Record<string, any>;
		}>;
		/** 추론된 의존성 (관계 기반 추론) */
		inferred: Array<{
			nodeId: number;
			identifier: string;
			type: string;
			name: string;
			inferenceType: string;
			confidence: number;
			path: string[];
		}>;
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
	};
	/** 메타데이터 */
	metadata: {
		analyzedAt: Date;
		analysisTime: number;
		queryTime: number;
		fileHash: string;
		statistics: {
			totalDependencies: number;
			directDependencies: number;
			inferredDependencies: number;
			hotReloadedDependencies: number;
		};
	};
}

export interface GraphDBAnalysisOptions {
	/** 핫리로드 활성화 */
	enableHotReload?: boolean;
	/** 관계 기반 추론 활성화 */
	enableInference?: boolean;
	/** 추론 깊이 */
	inferenceDepth?: number;
	/** 핫리로드 임계값 (밀리초) */
	hotReloadThreshold?: number;
	/** Graph DB 통계 포함 */
	includeGraphStats?: boolean;
	/** 출력 형식 */
	outputFormat?: "json" | "csv" | "markdown";
}

/**
 * Graph DB 기반 의존성 분석
 */
export async function analyzeFileWithGraphDB(
	filePath: string,
	projectRoot: string,
	projectName: string = "unknown-project",
	options: GraphDBAnalysisOptions = {},
): Promise<GraphDBAnalysisResult> {
	const startTime = Date.now();
	const queryStartTime = Date.now();

	try {
		// 파일 정보 수집
		const fileInfo = await getFileInfo(filePath);

		// 데이터베이스 초기화
		const database = new GraphDatabase(".dependency-linker/graph.db");
		await database.initialize();

		try {
			// 1. 수집: Graph DB에 저장 (import 기반 분석이 기본)
			await collectFileData(database, filePath, projectRoot, projectName);

			// 2. 분석: Graph DB 데이터 기반으로 관계 추론
			const dependencies = await analyzeDependenciesFromGraphDB(
				database,
				filePath,
				options,
			);

			// 3. 핫리로드: 필요할 때 특정 파일만 재분석
			if (options.enableHotReload !== false) {
				await performHotReload(database, filePath, options);
			}

			// Graph DB 통계 조회
			const graphStats = await getGraphStatistics(
				database,
				options.includeGraphStats !== false,
			);

			// 메타데이터 생성
			const metadata = await generateMetadata(
				filePath,
				startTime,
				Date.now() - queryStartTime,
				dependencies,
			);

			return {
				file: fileInfo,
				dependencies,
				graphStats,
				metadata,
			};
		} finally {
			// 데이터베이스 정리
			await database.close();
		}
	} catch (error) {
		throw new Error(
			`Graph DB analysis failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * 1. 수집: Graph DB에 저장 (import 기반 분석이 기본)
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

		// 파일 분석 실행 (Graph DB에 데이터 저장)
		// 언어 감지
		const language = detectLanguage(filePath);

		// 파일 내용 읽기
		const content = await fs.readFile(filePath, "utf-8");

		// import 소스 추출
		const importSources: ImportSource[] = [];
		const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
		let match;
		while ((match = importRegex.exec(content)) !== null) {
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
 * 2. 분석: Graph DB 데이터 기반으로 관계 추론
 */
async function analyzeDependenciesFromGraphDB(
	database: GraphDatabase,
	filePath: string,
	options: GraphDBAnalysisOptions,
): Promise<GraphDBAnalysisResult["dependencies"]> {
	try {
		// 파일 노드 찾기
		const fileNodes = await database.findNodes({
			sourceFiles: [filePath],
		});

		if (fileNodes.length === 0) {
			return {
				direct: [],
				inferred: [],
				hotReloaded: [],
			};
		}

		const fileNode = fileNodes[0];

		// 직접 의존성 조회 (import 기반)
		const directDependencies = await database.findNodeDependencies(
			fileNode.id!,
			["imports_file", "imports_library", "uses"],
		);

		// 추론된 의존성 (관계 기반 추론)
		const inferredDependencies =
			options.enableInference !== false
				? await inferDependencies(
						database,
						fileNode.id!,
						options.inferenceDepth || 2,
					)
				: [];

		// 핫리로드된 의존성
		const hotReloadedDependencies = await getHotReloadedDependencies(
			database,
			fileNode.id!,
			options.hotReloadThreshold || 5000,
		);

		return {
			direct: directDependencies.map((dep) => ({
				nodeId: dep.id!,
				identifier: dep.identifier,
				type: dep.type,
				name: dep.name,
				relationshipType: dep.metadata?.relationshipType || "unknown",
				weight: dep.metadata?.weight || 1,
				metadata: dep.metadata,
			})),
			inferred: inferredDependencies,
			hotReloaded: hotReloadedDependencies,
		};
	} catch (error) {
		throw new Error(
			`Dependency analysis failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * 관계 기반 추론: 직접 탐색 안되는 것들을 매칭
 */
async function inferDependencies(
	database: GraphDatabase,
	nodeId: number,
	maxDepth: number,
): Promise<GraphDBAnalysisResult["dependencies"]["inferred"]> {
	const inferred: GraphDBAnalysisResult["dependencies"]["inferred"] = [];
	const visited = new Set<number>();

	try {
		// 재귀적으로 의존성 추론
		await inferDependenciesRecursive(
			database,
			nodeId,
			maxDepth,
			0,
			visited,
			inferred,
		);

		return inferred;
	} catch (error) {
		console.warn(`Dependency inference failed for node ${nodeId}:`, error);
		return [];
	}
}

/**
 * 재귀적 의존성 추론
 */
async function inferDependenciesRecursive(
	database: GraphDatabase,
	nodeId: number,
	maxDepth: number,
	currentDepth: number,
	visited: Set<number>,
	inferred: GraphDBAnalysisResult["dependencies"]["inferred"],
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
			// 추론된 의존성으로 추가
			inferred.push({
				nodeId: dep.id!,
				identifier: dep.identifier,
				type: dep.type,
				name: dep.name,
				inferenceType: "transitive",
				confidence: 1.0 / (currentDepth + 1),
				path: [], // TODO: 경로 추적 구현
			});

			// 재귀적으로 더 깊은 의존성 추론
			await inferDependenciesRecursive(
				database,
				dep.id!,
				maxDepth,
				currentDepth + 1,
				new Set(visited),
				inferred,
			);
		}
	} catch (error) {
		console.warn(`Recursive inference failed for node ${nodeId}:`, error);
	}
}

/**
 * 3. 핫리로드: 필요할 때 특정 파일만 재분석
 */
async function performHotReload(
	database: GraphDatabase,
	filePath: string,
	options: GraphDBAnalysisOptions,
): Promise<void> {
	try {
		// 파일 수정 시간 확인
		const stats = await fs.stat(filePath);
		const now = Date.now();
		const lastModified = stats.mtime.getTime();
		const timeDiff = now - lastModified;

		// 핫리로드 임계값 확인
		if (timeDiff < (options.hotReloadThreshold || 5000)) {
			console.log(`🔥 Hot reloading file: ${filePath}`);

			// 파일 재분석
			const analyzer = new FileDependencyAnalyzer(
				database,
				path.dirname(filePath),
				"unknown-project",
			);

			// 언어 감지
			const language = detectLanguage(filePath);

			// 파일 내용 읽기
			const content = await fs.readFile(filePath, "utf-8");

			// import 소스 추출
			const importSources: ImportSource[] = [];
			const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
			let match;
			while ((match = importRegex.exec(content)) !== null) {
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

			console.log(`✅ Hot reload completed for: ${filePath}`);
		}
	} catch (error) {
		console.warn(`Hot reload failed for ${filePath}:`, error);
	}
}

/**
 * 핫리로드된 의존성 조회
 */
async function getHotReloadedDependencies(
	database: GraphDatabase,
	nodeId: number,
	threshold: number,
): Promise<GraphDBAnalysisResult["dependencies"]["hotReloaded"]> {
	// TODO: 핫리로드된 의존성 조회 구현
	return [];
}

/**
 * Graph DB 통계 조회
 */
async function getGraphStatistics(
	database: GraphDatabase,
	includeStats: boolean,
): Promise<GraphDBAnalysisResult["graphStats"]> {
	if (!includeStats) {
		return {
			totalNodes: 0,
			totalRelationships: 0,
			fileNodes: 0,
			libraryNodes: 0,
			symbolNodes: 0,
			inferredRelationships: 0,
			hotReloadedNodes: 0,
		};
	}

	try {
		// 전체 노드 수 조회
		const allNodes = await database.findNodes({});

		// 파일 노드 수 조회
		const fileNodes = await database.findNodes({ nodeTypes: ["file"] });

		// 라이브러리 노드 수 조회
		const libraryNodes = await database.findNodes({ nodeTypes: ["library"] });

		// 심볼 노드 수 조회
		const functionNodes = await database.findNodes({ nodeTypes: ["function"] });
		const classNodes = await database.findNodes({ nodeTypes: ["class"] });
		const symbolNodes = functionNodes.length + classNodes.length;

		return {
			totalNodes: allNodes.length,
			totalRelationships: 0, // TODO: 실제 관계 수 조회
			fileNodes: fileNodes.length,
			libraryNodes: libraryNodes.length,
			symbolNodes: symbolNodes,
			inferredRelationships: 0, // TODO: 추론된 관계 수 조회
			hotReloadedNodes: 0, // TODO: 핫리로드된 노드 수 조회
		};
	} catch (error) {
		console.warn("Graph statistics collection failed:", error);
		return {
			totalNodes: 0,
			totalRelationships: 0,
			fileNodes: 0,
			libraryNodes: 0,
			symbolNodes: 0,
			inferredRelationships: 0,
			hotReloadedNodes: 0,
		};
	}
}

/**
 * 파일 정보 수집
 */
async function getFileInfo(
	filePath: string,
): Promise<GraphDBAnalysisResult["file"]> {
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
 * 메타데이터 생성
 */
async function generateMetadata(
	filePath: string,
	startTime: number,
	queryTime: number,
	dependencies: GraphDBAnalysisResult["dependencies"],
): Promise<GraphDBAnalysisResult["metadata"]> {
	try {
		// 파일 내용 읽기
		const content = await fs.readFile(filePath, "utf-8");

		// 파일 해시 계산
		const crypto = await import("crypto");
		const fileHash = crypto.createHash("sha256").update(content).digest("hex");

		// 통계 계산
		const totalDependencies =
			dependencies.direct.length +
			dependencies.inferred.length +
			dependencies.hotReloaded.length;

		return {
			analyzedAt: new Date(),
			analysisTime: Date.now() - startTime,
			queryTime,
			fileHash,
			statistics: {
				totalDependencies,
				directDependencies: dependencies.direct.length,
				inferredDependencies: dependencies.inferred.length,
				hotReloadedDependencies: dependencies.hotReloaded.length,
			},
		};
	} catch (error) {
		throw new Error(
			`Metadata generation failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
