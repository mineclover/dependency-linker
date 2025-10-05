/**
 * Graph Database Based Analysis
 * Graph DB를 활용한 진정한 의존성 분석 시스템
 */

import * as path from "node:path";
import * as fs from "node:fs/promises";
import { FileDependencyAnalyzer } from "../database/services/FileDependencyAnalyzer";
import {
	GraphDatabase,
	type GraphNode,
	type GraphRelationship,
} from "../database/GraphDatabase";
import { MarkdownLinkTracker } from "../parsers/markdown/MarkdownLinkTracker";
import type { SupportedLanguage } from "../core/types";

export interface GraphBasedAnalysisResult {
	/** 파일 정보 */
	file: {
		path: string;
		name: string;
		extension: string;
		language: SupportedLanguage;
		size: number;
		lastModified: Date;
	};
	/** Graph DB 기반 의존성 정보 */
	dependencies: {
		/** 직접 의존성 (1단계) */
		direct: Array<{
			nodeId: number;
			identifier: string;
			type: string;
			name: string;
			relationshipType: string;
			weight?: number;
			metadata?: Record<string, any>;
		}>;
		/** 간접 의존성 (2단계 이상) */
		transitive: Array<{
			nodeId: number;
			identifier: string;
			type: string;
			name: string;
			depth: number;
			path: string[];
		}>;
		/** 순환 의존성 */
		circular: Array<{
			cycle: string[];
			participants: number[];
		}>;
		/** 의존성 체인 */
		chains: Array<{
			chain: string[];
			length: number;
			types: string[];
		}>;
	};
	/** Graph DB 통계 */
	graphStats: {
		/** 전체 노드 수 */
		totalNodes: number;
		/** 전체 관계 수 */
		totalRelationships: number;
		/** 파일 노드 수 */
		fileNodes: number;
		/** 라이브러리 노드 수 */
		libraryNodes: number;
		/** 함수/클래스 노드 수 */
		symbolNodes: number;
		/** 의존성 관계 수 */
		dependencyRelationships: number;
		/** 평균 의존성 깊이 */
		averageDepth: number;
		/** 최대 의존성 깊이 */
		maxDepth: number;
	};
	/** 마크다운 링크 정보 (마크다운 파일인 경우) */
	markdownLinks?: {
		internal: Array<{
			text: string;
			url: string;
			exists: boolean;
		}>;
		external: Array<{
			text: string;
			url: string;
			status: "unknown" | "accessible" | "broken" | "redirected" | "timeout";
			statusCode?: number;
			responseTime?: number;
		}>;
		anchors: Array<{
			text: string;
			anchorId: string;
			isValid: boolean;
		}>;
	};
	/** 메타데이터 */
	metadata: {
		/** 분석 시간 */
		analyzedAt: Date;
		/** 분석 소요 시간 */
		analysisTime: number;
		/** Graph DB 쿼리 시간 */
		queryTime: number;
		/** 파일 해시 */
		fileHash: string;
		/** 통계 */
		statistics: {
			totalDependencies: number;
			directDependencies: number;
			transitiveDependencies: number;
			circularDependencies: number;
			brokenDependencies: number;
		};
	};
}

export interface GraphAnalysisOptions {
	/** 마크다운 링크 검증 활성화 */
	validateMarkdownLinks?: boolean;
	/** 라이브러리 정보 추적 활성화 */
	trackLibraries?: boolean;
	/** 상세 정보 포함 */
	includeDetails?: boolean;
	/** Graph DB 통계 포함 */
	includeGraphStats?: boolean;
	/** 간접 의존성 분석 깊이 */
	maxDepth?: number;
	/** 순환 의존성 감지 활성화 */
	detectCircularDependencies?: boolean;
	/** 출력 형식 */
	outputFormat?: "json" | "csv" | "markdown";
}

/**
 * Graph DB 기반 단일 파일 의존성 분석
 */
export async function analyzeFileWithGraphDB(
	filePath: string,
	projectRoot: string,
	projectName: string = "unknown-project",
	options: GraphAnalysisOptions = {},
): Promise<GraphBasedAnalysisResult> {
	const startTime = Date.now();
	const queryStartTime = Date.now();

	try {
		// 파일 정보 수집
		const fileInfo = await getFileInfo(filePath);

		// 데이터베이스 초기화
		const database = new GraphDatabase();
		await database.initialize();

		try {
			// 분석기 초기화
			const analyzer = new FileDependencyAnalyzer(
				database,
				projectRoot,
				projectName,
			);

			// 파일 내용 읽기
			const content = await fs.readFile(filePath, "utf-8");

			// 파일 분석 실행 (Graph DB에 데이터 저장)
			await analyzer.analyzeFile(filePath);

			// Graph DB에서 의존성 정보 조회
			const { dependencies, graphStats } = await queryDependenciesFromGraphDB(
				database,
				filePath,
				options,
			);

			// 마크다운 링크 분석 (마크다운 파일인 경우)
			let markdownLinks;
			if (
				fileInfo.language === "markdown" &&
				options.validateMarkdownLinks !== false
			) {
				markdownLinks = await analyzeMarkdownLinks(
					filePath,
					content,
					projectRoot,
				);
			}

			// 메타데이터 생성
			const metadata = await generateMetadata(
				filePath,
				content,
				dependencies,
				markdownLinks,
				startTime,
				Date.now() - queryStartTime,
			);

			return {
				file: fileInfo,
				dependencies,
				graphStats,
				markdownLinks,
				metadata,
			};
		} finally {
			// 데이터베이스 정리
			await database.close();
		}
	} catch (error) {
		throw new Error(
			`Graph-based analysis failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Graph DB에서 의존성 정보 조회 (Graph DB 중심)
 */
async function queryDependenciesFromGraphDB(
	database: GraphDatabase,
	filePath: string,
	options: GraphAnalysisOptions,
): Promise<{
	dependencies: GraphBasedAnalysisResult["dependencies"];
	graphStats: GraphBasedAnalysisResult["graphStats"];
}> {
	try {
		// 파일 노드 찾기
		const fileNodes = await database.findNodes({
			sourceFiles: [filePath],
		});

		if (fileNodes.length === 0) {
			return {
				dependencies: {
					direct: [],
					transitive: [],
					circular: [],
					chains: [],
				},
				graphStats: {
					totalNodes: 0,
					totalRelationships: 0,
					fileNodes: 0,
					libraryNodes: 0,
					symbolNodes: 0,
					dependencyRelationships: 0,
					averageDepth: 0,
					maxDepth: 0,
				},
			};
		}

		const fileNode = fileNodes[0];

		// 직접 의존성 조회
		const directDependencies = await database.findNodeDependencies(
			fileNode.id!,
			["imports_file", "imports_library", "uses"],
		);

		// 간접 의존성 분석 (재귀적)
		const transitiveDependencies = await analyzeTransitiveDependencies(
			database,
			fileNode.id!,
			options.maxDepth || 3,
		);

		// 순환 의존성 감지
		const circularDependencies =
			options.detectCircularDependencies !== false
				? await detectCircularDependencies(database, fileNode.id!)
				: [];

		// 의존성 체인 분석
		const dependencyChains = await analyzeDependencyChains(
			database,
			fileNode.id!,
			options.maxDepth || 3,
		);

		// Graph DB 통계 조회
		const graphStats = await getGraphStatistics(
			database,
			options.includeGraphStats !== false,
		);

		return {
			dependencies: {
				direct: directDependencies.map((dep) => ({
					nodeId: dep.id!,
					identifier: dep.identifier,
					type: dep.type,
					name: dep.name,
					relationshipType: dep.metadata?.relationshipType || "unknown",
					weight: dep.metadata?.weight || 1,
					metadata: dep.metadata,
				})),
				transitive: transitiveDependencies,
				circular: circularDependencies,
				chains: dependencyChains,
			},
			graphStats,
		};
	} catch (error) {
		throw new Error(
			`Graph database query failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * 간접 의존성 분석 (재귀적)
 */
async function analyzeTransitiveDependencies(
	database: GraphDatabase,
	nodeId: number,
	maxDepth: number,
	visited: Set<number> = new Set(),
	currentDepth: number = 0,
): Promise<GraphBasedAnalysisResult["dependencies"]["transitive"]> {
	if (currentDepth >= maxDepth || visited.has(nodeId)) {
		return [];
	}

	visited.add(nodeId);
	const result: GraphBasedAnalysisResult["dependencies"]["transitive"] = [];

	try {
		// 직접 의존성 조회
		const directDeps = await database.findNodeDependencies(nodeId, [
			"imports_file",
			"imports_library",
			"uses",
		]);

		for (const dep of directDeps) {
			// 간접 의존성으로 추가
			result.push({
				nodeId: dep.id!,
				identifier: dep.identifier,
				type: dep.type,
				name: dep.name,
				depth: currentDepth + 1,
				path: [], // TODO: 경로 추적 구현
			});

			// 재귀적으로 더 깊은 의존성 분석
			const deeperDeps = await analyzeTransitiveDependencies(
				database,
				dep.id!,
				maxDepth,
				new Set(visited),
				currentDepth + 1,
			);
			result.push(...deeperDeps);
		}
	} catch (error) {
		console.warn(
			`Transitive dependency analysis failed for node ${nodeId}:`,
			error,
		);
	}

	return result;
}

/**
 * 순환 의존성 감지
 */
async function detectCircularDependencies(
	database: GraphDatabase,
	nodeId: number,
): Promise<GraphBasedAnalysisResult["dependencies"]["circular"]> {
	// TODO: 순환 의존성 감지 알고리즘 구현
	// DFS 기반 사이클 감지
	return [];
}

/**
 * 의존성 체인 분석
 */
async function analyzeDependencyChains(
	database: GraphDatabase,
	nodeId: number,
	maxDepth: number,
): Promise<GraphBasedAnalysisResult["dependencies"]["chains"]> {
	// TODO: 의존성 체인 분석 구현
	// BFS 기반 체인 탐색
	return [];
}

/**
 * Graph DB 통계 조회
 */
async function getGraphStatistics(
	database: GraphDatabase,
	includeStats: boolean,
): Promise<GraphBasedAnalysisResult["graphStats"]> {
	if (!includeStats) {
		return {
			totalNodes: 0,
			totalRelationships: 0,
			fileNodes: 0,
			libraryNodes: 0,
			symbolNodes: 0,
			dependencyRelationships: 0,
			averageDepth: 0,
			maxDepth: 0,
		};
	}

	try {
		// 전체 노드 수 조회
		const allNodes = await database.findNodes({});

		// 파일 노드 수 조회
		const fileNodes = await database.findNodes({ type: "file" });

		// 라이브러리 노드 수 조회
		const libraryNodes = await database.findNodes({ type: "library" });

		// 심볼 노드 수 조회 (함수, 클래스 등)
		const symbolNodes =
			(await database
				.findNodes({
					type: "function",
				})
				.then((nodes) => nodes.length)) +
			(await database
				.findNodes({
					type: "class",
				})
				.then((nodes) => nodes.length));

		return {
			totalNodes: allNodes.length,
			totalRelationships: 0, // TODO: 실제 관계 수 조회
			fileNodes: fileNodes.length,
			libraryNodes: libraryNodes.length,
			symbolNodes: symbolNodes,
			dependencyRelationships: 0, // TODO: 의존성 관계 수 조회
			averageDepth: 0, // TODO: 평균 깊이 계산
			maxDepth: 0, // TODO: 최대 깊이 계산
		};
	} catch (error) {
		console.warn("Graph statistics collection failed:", error);
		return {
			totalNodes: 0,
			totalRelationships: 0,
			fileNodes: 0,
			libraryNodes: 0,
			symbolNodes: 0,
			dependencyRelationships: 0,
			averageDepth: 0,
			maxDepth: 0,
		};
	}
}

/**
 * 파일 정보 수집
 */
async function getFileInfo(
	filePath: string,
): Promise<GraphBasedAnalysisResult["file"]> {
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
 * 마크다운 링크 분석
 */
async function analyzeMarkdownLinks(
	filePath: string,
	content: string,
	projectRoot: string,
): Promise<GraphBasedAnalysisResult["markdownLinks"]> {
	try {
		const linkTracker = new MarkdownLinkTracker(projectRoot);
		const result = await linkTracker.trackLinks(filePath, "project");

		return {
			internal: result.internal.map((link: any) => ({
				text: link.text,
				url: link.url,
				exists: true, // TODO: 실제 파일 존재 확인
			})),
			external: result.external.map((link: any) => ({
				text: link.text,
				url: link.url,
				status: link.validation?.status || "unknown",
				statusCode: link.validation?.statusCode,
				responseTime: link.validation?.responseTime,
			})),
			anchors: result.anchors.map((link: any) => ({
				text: link.text,
				anchorId: link.anchorId,
				isValid: link.isValid,
			})),
		};
	} catch (error) {
		console.warn("Markdown link analysis failed:", error);
		return {
			internal: [],
			external: [],
			anchors: [],
		};
	}
}

/**
 * 메타데이터 생성
 */
async function generateMetadata(
	filePath: string,
	content: string,
	dependencies: GraphBasedAnalysisResult["dependencies"],
	markdownLinks: GraphBasedAnalysisResult["markdownLinks"],
	startTime: number,
	queryTime: number,
): Promise<GraphBasedAnalysisResult["metadata"]> {
	try {
		// 파일 해시 계산
		const crypto = await import("crypto");
		const fileHash = crypto.createHash("sha256").update(content).digest("hex");

		// 통계 계산
		const totalDependencies =
			dependencies.direct.length + dependencies.transitive.length;

		const directDependencies = dependencies.direct.length;
		const transitiveDependencies = dependencies.transitive.length;
		const circularDependencies = dependencies.circular.length;

		const brokenDependencies = 0; // TODO: 깨진 의존성 감지

		return {
			analyzedAt: new Date(),
			analysisTime: Date.now() - startTime,
			fileHash,
			queryTime,
			statistics: {
				totalDependencies,
				directDependencies,
				transitiveDependencies,
				circularDependencies,
				brokenDependencies,
			},
		};
	} catch (error) {
		throw new Error(
			`Metadata generation failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
