/**
 * Single File Analysis API
 * 단일 파일 기반 의존성 분석 API
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { SupportedLanguage } from "../core/types";
import { GraphDatabase } from "../database/GraphDatabase";
import {
	FileDependencyAnalyzer,
	type ImportSource,
} from "../database/services/FileDependencyAnalyzer";
import { MarkdownLinkTracker } from "../parsers/markdown/MarkdownLinkTracker";

export interface SingleFileAnalysisResult {
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
		}>;
		/** 내장 모듈 의존성 */
		builtins: Array<{
			name: string;
			imports: string[];
		}>;
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
		/** 통계 */
		statistics: {
			totalDependencies: number;
			internalDependencies: number;
			externalDependencies: number;
			brokenDependencies: number;
		};
	};
}

export interface AnalysisOptions {
	/** 마크다운 링크 검증 활성화 */
	validateMarkdownLinks?: boolean;
	/** 라이브러리 정보 추적 활성화 */
	trackLibraries?: boolean;
	/** 상세 정보 포함 */
	includeDetails?: boolean;
	/** 출력 형식 */
	outputFormat?: "json" | "csv" | "markdown";
}

/**
 * 단일 파일 의존성 분석
 */
export async function analyzeSingleFile(
	filePath: string,
	projectRoot: string,
	projectName: string = "unknown-project",
	options: AnalysisOptions = {},
): Promise<SingleFileAnalysisResult> {
	const startTime = Date.now();

	// 파일 정보 수집
	const fileInfo = await getFileInfo(filePath);

	// 데이터베이스 초기화
	const database = new GraphDatabase(".dependency-linker/graph.db");
	await database.initialize();

	// 분석기 초기화
	const analyzer = new FileDependencyAnalyzer(
		database,
		projectRoot,
		projectName,
	);

	// 파일 내용 읽기
	const content = await fs.readFile(filePath, "utf-8");

	// 의존성 분석
	const dependencies = await analyzeDependencies(
		filePath,
		analyzer,
		projectRoot,
	);

	// 마크다운 링크 분석 (마크다운 파일인 경우)
	let markdownLinks: any;
	if (
		fileInfo.language === "markdown" &&
		options.validateMarkdownLinks !== false
	) {
		markdownLinks = await analyzeMarkdownLinks(filePath, content, projectRoot);
	}

	// 메타데이터 생성
	const metadata = await generateMetadata(
		filePath,
		content,
		dependencies,
		markdownLinks,
		startTime,
	);

	// 데이터베이스 정리
	await database.close();

	return {
		file: fileInfo,
		dependencies,
		markdownLinks,
		metadata,
	};
}

/**
 * 파일 정보 수집
 */
async function getFileInfo(
	filePath: string,
): Promise<SingleFileAnalysisResult["file"]> {
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
 * 의존성 분석
 */
async function analyzeDependencies(
	filePath: string,
	analyzer: FileDependencyAnalyzer,
	_projectRoot: string,
): Promise<SingleFileAnalysisResult["dependencies"]> {
	// 파일 분석 실행
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

	// 데이터베이스에서 의존성 정보 조회
	const database = (analyzer as any).database; // private 접근

	// 파일 노드 찾기
	const fileNodes = await database.findNodes({
		sourceFiles: [filePath],
	});

	if (fileNodes.length === 0) {
		return {
			internalFiles: [],
			libraries: [],
			builtins: [],
		};
	}

	const fileNode = fileNodes[0];

	// 의존성 관계 조회
	if (!fileNode.id) {
		throw new Error("File node ID is required");
	}
	const dependencies = await database.findNodeDependencies(fileNode.id, [
		"imports_file",
		"imports_library",
		"uses",
	]);

	// 의존성 분류
	const internalFiles: SingleFileAnalysisResult["dependencies"]["internalFiles"] =
		[];
	const libraries: SingleFileAnalysisResult["dependencies"]["libraries"] = [];
	const builtins: SingleFileAnalysisResult["dependencies"]["builtins"] = [];

	for (const dep of dependencies) {
		if (dep.type === "file") {
			// 내부 파일 의존성
			const exists = await checkFileExists(dep.sourceFile);
			internalFiles.push({
				path: dep.sourceFile,
				exists,
				imports: extractImportsFromMetadata(dep.metadata),
			});
		} else if (dep.type === "library") {
			// 외부 라이브러리 의존성
			const metadata = dep.metadata as any;
			libraries.push({
				name: dep.name,
				version: metadata.version,
				isInstalled: metadata.isInstalled || false,
				isDevDependency: metadata.isDevDependency || false,
				isPeerDependency: metadata.isPeerDependency || false,
				isOptionalDependency: metadata.isOptionalDependency || false,
				imports: extractImportsFromMetadata(metadata),
			});
		} else if (dep.type === "builtin") {
			// 내장 모듈 의존성
			builtins.push({
				name: dep.name,
				imports: extractImportsFromMetadata(dep.metadata),
			});
		}
	}

	return {
		internalFiles,
		libraries,
		builtins,
	};
}

/**
 * 마크다운 링크 분석
 */
async function analyzeMarkdownLinks(
	filePath: string,
	_content: string,
	projectRoot: string,
): Promise<SingleFileAnalysisResult["markdownLinks"]> {
	const linkTracker = new MarkdownLinkTracker(projectRoot);
	const result = await linkTracker.trackLinks(filePath, "project");

	return {
		internal: result.targetFiles.map((link: any) => ({
			text: link.text,
			url: link.url,
			exists: true, // TODO: 실제 파일 존재 확인
		})),
		external: result.externalLinks.map((link: any) => ({
			text: link.text,
			url: link.url,
			status: link.validation?.status || "unknown",
			statusCode: link.validation?.statusCode,
			responseTime: link.validation?.responseTime,
		})),
		anchors: result.relationships.map((link: any) => ({
			text: link.text,
			anchorId: link.anchorId,
			isValid: link.isValid,
		})),
	};
}

/**
 * 메타데이터 생성
 */
async function generateMetadata(
	_filePath: string,
	content: string,
	dependencies: SingleFileAnalysisResult["dependencies"],
	_markdownLinks: SingleFileAnalysisResult["markdownLinks"],
	startTime: number,
): Promise<SingleFileAnalysisResult["metadata"]> {
	// 파일 해시 계산
	const crypto = await import("node:crypto");
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
		statistics: {
			totalDependencies,
			internalDependencies,
			externalDependencies,
			brokenDependencies,
		},
	};
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

	return metadata.importedItems.map((item: any) => item.name);
}
