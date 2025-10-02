/**
 * Dependency Analysis to Graph Integration
 * 기존 의존성 분석 시스템과 그래프 데이터베이스 연동
 */

import { join } from "node:path";
import { analyzeDependencies } from "../api/analysis";
import type { SupportedLanguage } from "../core/types";
import type { ParseResult, StorageResult } from "../database";
import { createGraphAnalysisSystem } from "../database";

export interface IntegrationOptions {
	projectRoot: string;
	projectName?: string;
	entryFiles?: string[];
	includePatterns?: string[];
	excludePatterns?: string[];
	enableInference?: boolean;
	dbPath?: string;
}

export interface IntegrationResult {
	analysisResults: Array<{
		filePath: string;
		language: SupportedLanguage;
		result: { internal: string[]; external: string[]; builtin: string[] };
	}>;
	storageResult: StorageResult;
	inferenceCount?: number;
	stats: {
		totalFiles: number;
		totalNodes: number;
		totalEdges: number;
		processingTime: number;
	};
}

/**
 * 의존성 분석과 그래프 저장 통합 클래스
 */
export class DependencyToGraph {
	private options: Required<IntegrationOptions>;
	private graphSystem: ReturnType<typeof createGraphAnalysisSystem>;

	constructor(options: IntegrationOptions) {
		this.options = {
			projectName: "Dependency Analysis",
			entryFiles: ["src/**/*.{ts,tsx,js,jsx}"],
			includePatterns: ["**/*.{ts,tsx,js,jsx,java,py,go}"],
			excludePatterns: [
				"**/node_modules/**",
				"**/dist/**",
				"**/build/**",
				"**/*.test.*",
				"**/*.spec.*",
				"**/*.d.ts",
			],
			enableInference: true,
			dbPath: join(options.projectRoot, ".dependency-linker", "graph.db"),
			...options,
		};

		this.graphSystem = createGraphAnalysisSystem({
			projectRoot: this.options.projectRoot,
			projectName: this.options.projectName,
			dbPath: this.options.dbPath,
		});
	}

	/**
	 * 전체 프로젝트 분석 및 그래프 저장
	 */
	async analyzeAndStore(): Promise<IntegrationResult> {
		const startTime = Date.now();

		try {
			// 1. 파일 목록 수집
			const files = await this.collectFiles();

			// 2. 각 파일 분석 (ParseResult 형식으로)
			const parseResults = await this.analyzeFiles(files);

			// 3. 그래프 데이터베이스에 저장
			const storageResult = await this.graphSystem.store(parseResults);

			// 4. 추론 관계 계산
			let inferenceCount = 0;
			if (this.options.enableInference) {
				inferenceCount = await this.graphSystem.computeInferences();
			}

			// 5. 통계 수집
			const stats = await this.graphSystem.getStats();

			const processingTime = Date.now() - startTime;

			// 6. ParseResult를 DependencyResult로 변환 (반환용)
			const analysisResults = parseResults.map((pr) => ({
				filePath: pr.filePath,
				language: pr.language,
				result: {
					internal: (pr.result.metadata?.internalDeps as string[]) || [],
					external: (pr.result.metadata?.externalDeps as string[]) || [],
					builtin: (pr.result.metadata?.builtinDeps as string[]) || [],
				},
			}));

			return {
				analysisResults,
				storageResult,
				inferenceCount: this.options.enableInference
					? inferenceCount
					: undefined,
				stats: {
					totalFiles: parseResults.length,
					totalNodes: stats.totalNodes,
					totalEdges: stats.totalRelationships,
					processingTime,
				},
			};
		} catch (error) {
			throw new Error(`Integration failed: ${error}`);
		}
	}

	/**
	 * 단일 파일 분석 및 업데이트
	 */
	async analyzeSingleFile(filePath: string): Promise<{
		result: { internal: string[]; external: string[]; builtin: string[] };
		storageResult: StorageResult;
		inferenceCount?: number;
	}> {
		const language = this.detectLanguage(filePath);

		// 파일 읽기
		const { readFileSync } = await import("node:fs");
		const sourceCode = readFileSync(filePath, "utf-8");

		// 파일 분석
		const result = await analyzeDependencies(sourceCode, language, filePath);

		// 그래프 저장 - 의존성을 ParseResult 형식으로 변환
		const parseResult: ParseResult = {
			imports: [...result.internal, ...result.external, ...result.builtin],
			metadata: {
				internalDeps: result.internal, // 배열 저장 (수정)
				externalDeps: result.external, // 배열 저장 (수정)
				builtinDeps: result.builtin, // 배열 저장 (수정)
			},
		};

		const storageResult = await this.graphSystem.store([
			{
				filePath,
				language,
				result: parseResult,
			},
		]);

		// 추론 관계 업데이트
		let inferenceCount = 0;
		if (this.options.enableInference) {
			inferenceCount = await this.graphSystem.computeInferences();
		}

		return {
			result,
			storageResult,
			inferenceCount: this.options.enableInference ? inferenceCount : undefined,
		};
	}

	/**
	 * 파일별 의존성 조회
	 */
	async getFileDependencies(filePath: string) {
		return this.graphSystem.getFileDependencies(filePath);
	}

	/**
	 * 순환 의존성 조회
	 */
	async getCircularDependencies() {
		return this.graphSystem.getCircularDependencies();
	}

	/**
	 * 고급 그래프 쿼리
	 */
	async query(filter?: Parameters<typeof this.graphSystem.query>[0]) {
		return this.graphSystem.query(filter);
	}

	/**
	 * 프로젝트 통계
	 */
	async getProjectStats() {
		return this.graphSystem.getStats();
	}

	/**
	 * 모든 노드 리스트업 (유형별 그룹화)
	 */
	async listAllNodes() {
		return this.graphSystem.listAllNodes();
	}

	/**
	 * 특정 유형의 노드만 조회
	 */
	async listNodesByType(nodeType: string) {
		return this.graphSystem.listNodesByType(nodeType);
	}

	/**
	 * 연결 종료
	 */
	async close() {
		return this.graphSystem.close();
	}

	/**
	 * 파일 목록 수집
	 */
	private async collectFiles(): Promise<string[]> {
		const { glob } = await import("glob");
		const files: string[] = [];

		for (const pattern of this.options.includePatterns) {
			const matchedFiles = await glob(pattern, {
				cwd: this.options.projectRoot,
				ignore: this.options.excludePatterns,
				absolute: true,
			});
			files.push(...matchedFiles);
		}

		// 중복 제거
		return [...new Set(files)];
	}

	/**
	 * 파일들 분석
	 */
	private async analyzeFiles(files: string[]): Promise<
		Array<{
			filePath: string;
			language: SupportedLanguage;
			result: ParseResult;
		}>
	> {
		const results: Array<{
			filePath: string;
			language: SupportedLanguage;
			result: ParseResult;
		}> = [];

		// 병렬 처리로 성능 향상
		const BATCH_SIZE = 10;
		for (let i = 0; i < files.length; i += BATCH_SIZE) {
			const batch = files.slice(i, i + BATCH_SIZE);

			const batchPromises = batch.map(async (filePath) => {
				try {
					const language = this.detectLanguage(filePath);

					// 파일 읽기
					const { readFileSync } = await import("node:fs");
					const sourceCode = readFileSync(filePath, "utf-8");

					const depResult = await analyzeDependencies(
						sourceCode,
						language,
						filePath,
					);

					// 의존성을 ParseResult 형식으로 변환
					const parseResult: ParseResult = {
						imports: [
							...depResult.internal,
							...depResult.external,
							...depResult.builtin,
						],
						metadata: {
							internalDeps: depResult.internal, // 배열 저장 (수정)
							externalDeps: depResult.external, // 배열 저장 (수정)
							builtinDeps: depResult.builtin, // 배열 저장 (수정)
						},
					};

					return {
						filePath,
						language,
						result: parseResult,
					};
				} catch (error) {
					console.warn(`Failed to analyze ${filePath}: ${error}`);
					// 빈 결과 반환하여 계속 진행
					return {
						filePath,
						language: this.detectLanguage(filePath),
						result: {
							imports: [],
							exports: [],
							declarations: [],
							functionCalls: [],
							metadata: { error: String(error) },
						} as ParseResult,
					};
				}
			});

			const batchResults = await Promise.all(batchPromises);
			results.push(...batchResults);
		}

		return results;
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
}

/**
 * 간단한 통합 함수
 */
export async function analyzeProjectToGraph(
	projectRoot: string,
	options: Partial<IntegrationOptions> = {},
): Promise<IntegrationResult> {
	const integration = new DependencyToGraph({
		projectRoot,
		...options,
	});

	try {
		return await integration.analyzeAndStore();
	} finally {
		await integration.close();
	}
}

/**
 * 단일 파일 분석 함수
 */
export async function analyzeFileToGraph(
	projectRoot: string,
	filePath: string,
	options: Partial<IntegrationOptions> = {},
): Promise<{
	result: { internal: string[]; external: string[]; builtin: string[] };
	storageResult: StorageResult;
	inferenceCount?: number;
}> {
	const integration = new DependencyToGraph({
		projectRoot,
		...options,
	});

	try {
		return await integration.analyzeSingleFile(filePath);
	} finally {
		await integration.close();
	}
}
