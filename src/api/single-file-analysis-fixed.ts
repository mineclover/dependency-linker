/**
 * Fixed Single File Analysis API
 * Graph Database 기반 수정된 단일 파일 분석 API
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

export interface FixedSingleFileAnalysisResult {
	/** 파일 정보 */
	file: {
		path: string;
		name: string;
		extension: string;
		language: SupportedLanguage;
		size: number;
		lastModified: Date;
	};
	/** 의존성 정보 */
	dependencies: {
		/** 내부 파일 의존성 */
		internalFiles: Array<{
			path: string;
			exists: boolean;
			imports: string[];
			relationshipType: string;
		}>;
		/** 외부 라이브러리 의존성 */
		libraries: Array<{
			name: string;
			version?: string;
			isInstalled: boolean;
			isDevDependency: boolean;
			isPeerDependency: boolean;
			isOptionalDependency: boolean;
			imports: string[];
			relationshipType: string;
		}>;
		/** 내장 모듈 의존성 */
		builtins: Array<{
			name: string;
			imports: string[];
			relationshipType: string;
		}>;
	};
	/** Graph DB 통계 */
	graphStats: {
		/** 총 노드 수 */
		totalNodes: number;
		/** 총 관계 수 */
		totalRelationships: number;
		/** 파일 노드 수 */
		fileNodes: number;
		/** 라이브러리 노드 수 */
		libraryNodes: number;
		/** 의존성 관계 수 */
		dependencyRelationships: number;
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
		/** 파일 해시 */
		fileHash: string;
		/** Graph DB 쿼리 시간 */
		queryTime: number;
		/** 통계 */
		statistics: {
			totalDependencies: number;
			internalDependencies: number;
			externalDependencies: number;
			brokenDependencies: number;
		};
	};
}

export interface FixedAnalysisOptions {
	/** 마크다운 링크 검증 활성화 */
	validateMarkdownLinks?: boolean;
	/** 라이브러리 정보 추적 활성화 */
	trackLibraries?: boolean;
	/** 상세 정보 포함 */
	includeDetails?: boolean;
	/** Graph DB 통계 포함 */
	includeGraphStats?: boolean;
	/** 출력 형식 */
	outputFormat?: "json" | "csv" | "markdown";
}

/**
 * 수정된 단일 파일 의존성 분석
 */
export async function analyzeSingleFileFixed(
	filePath: string,
	projectRoot: string,
	projectName: string = "unknown-project",
	options: FixedAnalysisOptions = {},
): Promise<FixedSingleFileAnalysisResult> {
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
			const { dependencies, graphStats } = await queryDependenciesFromGraph(
				database,
				filePath,
				options.includeGraphStats !== false,
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
			`Single file analysis failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Graph DB에서 의존성 정보 조회 (수정된 버전)
 */
async function queryDependenciesFromGraph(
	database: GraphDatabase,
	filePath: string,
	includeGraphStats: boolean = true,
): Promise<{
	dependencies: FixedSingleFileAnalysisResult["dependencies"];
	graphStats: FixedSingleFileAnalysisResult["graphStats"];
}> {
	try {
		// 파일 노드 찾기
		const fileNodes = await database.findNodes({
			sourceFiles: [filePath],
		});

		if (fileNodes.length === 0) {
			return {
				dependencies: {
					internalFiles: [],
					libraries: [],
					builtins: [],
				},
				graphStats: {
					totalNodes: 0,
					totalRelationships: 0,
					fileNodes: 0,
					libraryNodes: 0,
					dependencyRelationships: 0,
				},
			};
		}

		const fileNode = fileNodes[0];

		// 의존성 관계 조회 (수정된 API 사용)
		const dependencyNodes = await database.findNodeDependencies(fileNode.id!, [
			"imports_file",
			"imports_library",
			"uses",
		]);

		// 의존성 분류
		const internalFiles: FixedSingleFileAnalysisResult["dependencies"]["internalFiles"] =
			[];
		const libraries: FixedSingleFileAnalysisResult["dependencies"]["libraries"] =
			[];
		const builtins: FixedSingleFileAnalysisResult["dependencies"]["builtins"] =
			[];

		for (const dep of dependencyNodes) {
			// 관계 타입 추출 (metadata에서)
			const relationshipType = dep.metadata?.relationshipType || "unknown";

			if (dep.type === "file") {
				// 내부 파일 의존성
				const exists = await checkFileExists(dep.sourceFile);
				internalFiles.push({
					path: dep.sourceFile,
					exists,
					imports: extractImportsFromMetadata(dep.metadata),
					relationshipType,
				});
			} else if (dep.type === "library") {
				// 외부 라이브러리 의존성
				const metadata = dep.metadata || {};
				libraries.push({
					name: dep.name,
					version: metadata.version,
					isInstalled: metadata.isInstalled || false,
					isDevDependency: metadata.isDevDependency || false,
					isPeerDependency: metadata.isPeerDependency || false,
					isOptionalDependency: metadata.isOptionalDependency || false,
					imports: extractImportsFromMetadata(metadata),
					relationshipType,
				});
			} else if (dep.type === "builtin") {
				// 내장 모듈 의존성
				builtins.push({
					name: dep.name,
					imports: extractImportsFromMetadata(dep.metadata),
					relationshipType,
				});
			}
		}

		// Graph DB 통계 조회
		let graphStats: FixedSingleFileAnalysisResult["graphStats"] = {
			totalNodes: 0,
			totalRelationships: 0,
			fileNodes: 0,
			libraryNodes: 0,
			dependencyRelationships: 0,
		};

		if (includeGraphStats) {
			try {
				// 전체 노드 수 조회
				const allNodes = await database.findNodes({});
				graphStats.totalNodes = allNodes.length;

				// 파일 노드 수 조회
				const fileNodes = await database.findNodes({ type: "file" });
				graphStats.fileNodes = fileNodes.length;

				// 라이브러리 노드 수 조회
				const libraryNodes = await database.findNodes({ type: "library" });
				graphStats.libraryNodes = libraryNodes.length;

				// 의존성 관계 수 조회 (간접적으로 계산)
				graphStats.dependencyRelationships = dependencyNodes.length;

				// 전체 관계 수는 추정값 사용 (실제 API가 없을 경우)
				graphStats.totalRelationships = graphStats.dependencyRelationships * 2; // 추정값
			} catch (statsError) {
				console.warn("Graph stats collection failed:", statsError);
				// 통계 수집 실패 시 기본값 유지
			}
		}

		return {
			dependencies: {
				internalFiles,
				libraries,
				builtins,
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
 * 파일 정보 수집
 */
async function getFileInfo(
	filePath: string,
): Promise<FixedSingleFileAnalysisResult["file"]> {
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
): Promise<FixedSingleFileAnalysisResult["markdownLinks"]> {
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
	dependencies: FixedSingleFileAnalysisResult["dependencies"],
	markdownLinks: FixedSingleFileAnalysisResult["markdownLinks"],
	startTime: number,
	queryTime: number,
): Promise<FixedSingleFileAnalysisResult["metadata"]> {
	try {
		// 파일 해시 계산
		const crypto = await import("crypto");
		const fileHash = crypto.createHash("sha256").update(content).digest("hex");

		// 통계 계산
		const totalDependencies =
			dependencies.internalFiles.length +
			dependencies.libraries.length +
			dependencies.builtins.length;

		const internalDependencies = dependencies.internalFiles.length;
		const externalDependencies =
			dependencies.libraries.length + dependencies.builtins.length;

		const brokenDependencies = dependencies.internalFiles.filter(
			(f) => !f.exists,
		).length;

		return {
			analyzedAt: new Date(),
			analysisTime: Date.now() - startTime,
			fileHash,
			queryTime,
			statistics: {
				totalDependencies,
				internalDependencies,
				externalDependencies,
				brokenDependencies,
			},
		};
	} catch (error) {
		throw new Error(
			`Metadata generation failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * 파일 존재 확인
 */
async function checkFileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

/**
 * 메타데이터에서 import 정보 추출
 */
function extractImportsFromMetadata(metadata: any): string[] {
	if (!metadata || !metadata.importedItems) {
		return [];
	}

	try {
		return metadata.importedItems.map((item: any) => item.name);
	} catch {
		return [];
	}
}
