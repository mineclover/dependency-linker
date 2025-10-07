/**
 * Simple Graph Database Based Analysis
 * Graph DB를 활용한 간단한 의존성 분석 시스템
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { SupportedLanguage } from "../core/types";
import { GraphDatabase } from "../database/GraphDatabase";
import {
	FileDependencyAnalyzer,
	type ImportSource,
} from "../database/services/FileDependencyAnalyzer";

export interface SimpleGraphAnalysisResult {
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
		/** 직접 의존성 */
		direct: Array<{
			identifier: string;
			type: string;
			name: string;
			relationshipType: string;
		}>;
		/** Graph DB 통계 */
		graphStats: {
			totalNodes: number;
			fileNodes: number;
			libraryNodes: number;
		};
	};
	/** 메타데이터 */
	metadata: {
		analyzedAt: Date;
		analysisTime: number;
		fileHash: string;
		statistics: {
			totalDependencies: number;
			directDependencies: number;
		};
	};
}

export interface SimpleGraphOptions {
	includeGraphStats?: boolean;
	outputFormat?: "json" | "csv" | "markdown";
}

/**
 * 간단한 Graph DB 기반 단일 파일 의존성 분석
 */
export async function analyzeFileWithSimpleGraph(
	filePath: string,
	projectRoot: string,
	projectName: string = "unknown-project",
	options: SimpleGraphOptions = {},
): Promise<SimpleGraphAnalysisResult> {
	const startTime = Date.now();

	try {
		// 파일 정보 수집
		const fileInfo = await getFileInfo(filePath);

		// 데이터베이스 초기화
		const database = new GraphDatabase(".dependency-linker/graph.db");
		await database.initialize();

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

			// Graph DB에서 의존성 정보 조회
			const dependencies = await queryDependenciesFromGraphDB(
				database,
				filePath,
				options.includeGraphStats !== false,
			);

			// 메타데이터 생성
			const metadata = await generateMetadata(
				filePath,
				startTime,
				dependencies.direct.length,
			);

			return {
				file: fileInfo,
				dependencies,
				metadata,
			};
		} finally {
			// 데이터베이스 정리
			await database.close();
		}
	} catch (error) {
		throw new Error(
			`Simple graph analysis failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Graph DB에서 의존성 정보 조회 (간단한 버전)
 */
async function queryDependenciesFromGraphDB(
	database: GraphDatabase,
	filePath: string,
	includeGraphStats: boolean,
): Promise<{
	direct: SimpleGraphAnalysisResult["dependencies"]["direct"];
	graphStats: SimpleGraphAnalysisResult["dependencies"]["graphStats"];
}> {
	try {
		// 파일 노드 찾기
		const fileNodes = await database.findNodes({
			sourceFiles: [filePath],
		});

		if (fileNodes.length === 0) {
			return {
				direct: [],
				graphStats: {
					totalNodes: 0,
					fileNodes: 0,
					libraryNodes: 0,
				},
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

		// Graph DB 통계 조회
		const graphStats = {
			totalNodes: 0,
			fileNodes: 0,
			libraryNodes: 0,
		};

		if (includeGraphStats) {
			try {
				// 전체 노드 수 조회
				const allNodes = await database.findNodes({});
				graphStats.totalNodes = allNodes.length;

				// 파일 노드 수 조회
				const fileNodes = await database.findNodes({ nodeTypes: ["file"] });
				graphStats.fileNodes = fileNodes.length;

				// 라이브러리 노드 수 조회
				const libraryNodes = await database.findNodes({
					nodeTypes: ["library"],
				});
				graphStats.libraryNodes = libraryNodes.length;
			} catch (statsError) {
				console.warn("Graph stats collection failed:", statsError);
			}
		}

		return {
			direct: directDependencies.map((dep) => ({
				identifier: dep.identifier,
				type: dep.type,
				name: dep.name,
				relationshipType: dep.metadata?.relationshipType || "unknown",
			})),
			graphStats,
		};
	} catch (error) {
		throw new Error(
			`Graph database query failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * 파일 정보 수집
 */
async function getFileInfo(
	filePath: string,
): Promise<SimpleGraphAnalysisResult["file"]> {
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
	directDependenciesCount: number,
): Promise<SimpleGraphAnalysisResult["metadata"]> {
	try {
		// 파일 내용 읽기
		const content = await fs.readFile(filePath, "utf-8");

		// 파일 해시 계산
		const crypto = await import("node:crypto");
		const fileHash = crypto.createHash("sha256").update(content).digest("hex");

		return {
			analyzedAt: new Date(),
			analysisTime: Date.now() - startTime,
			fileHash,
			statistics: {
				totalDependencies: directDependenciesCount,
				directDependencies: directDependenciesCount,
			},
		};
	} catch (error) {
		throw new Error(
			`Metadata generation failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
