/**
 * RDF Namespace Analyzer
 * 네임스페이스 기반 RDF 주소 생성 및 분석
 */

import { RDFDatabaseAPI } from "../api/rdf-database-integration";
import { analyzeFileWithRDF } from "../api/rdf-analysis";
import type { NamespaceConfig, RDFConfig } from "./types";
import type { RDFAnalysisResult, SupportedLanguage } from "../core/types";
import type { NodeType } from "../core/RDFAddress";
import fs from "fs";
import path from "path";

// ===== RDF NAMESPACE TYPES =====

/**
 * RDF 네임스페이스 분석 결과
 */
export interface RDFNamespaceAnalysisResult {
	namespace: string;
	projectName: string;
	config: NamespaceConfig;
	rdfConfig: RDFConfig;
	analysisResults: RDFAnalysisResult[];
	statistics: {
		totalFiles: number;
		totalSymbols: number;
		totalRDFAddresses: number;
		nodeTypeCount: Record<NodeType, number>;
		namespaceCount: Record<string, number>;
		fileCount: number;
		errorCount: number;
	};
	errors: string[];
	warnings: string[];
}

/**
 * RDF 네임스페이스 분석 옵션
 */
export interface RDFNamespaceAnalysisOptions {
	/** 데이터베이스 경로 */
	databasePath?: string;
	/** RDF 주소 저장 여부 */
	storeToDatabase?: boolean;
	/** 메타데이터 포함 여부 */
	includeMetadata?: boolean;
	/** 관계 추적 여부 */
	trackRelationships?: boolean;
	/** 병렬 처리 여부 */
	parallel?: boolean;
	/** 최대 동시 처리 수 */
	maxConcurrency?: number;
}

// ===== RDF NAMESPACE ANALYZER =====

/**
 * RDF 네임스페이스 분석기
 */
export class RDFNamespaceAnalyzer {
	private dbApi: RDFDatabaseAPI | null = null;
	private options: RDFNamespaceAnalysisOptions;

	constructor(options: RDFNamespaceAnalysisOptions = {}) {
		this.options = {
			databasePath: "./dependency-linker.db",
			storeToDatabase: true,
			includeMetadata: true,
			trackRelationships: true,
			parallel: true,
			maxConcurrency: 4,
			...options,
		};
	}

	/**
	 * RDF 네임스페이스 분석 실행
	 */
	async analyzeNamespace(
		namespace: string,
		config: NamespaceConfig,
		files: string[],
	): Promise<RDFNamespaceAnalysisResult> {
		const startTime = Date.now();
		const errors: string[] = [];
		const warnings: string[] = [];
		const analysisResults: RDFAnalysisResult[] = [];

		// RDF 설정 확인
		const rdfConfig = config.rdf || {
			enabled: false,
			storeToDatabase: this.options.storeToDatabase,
			databasePath: this.options.databasePath,
			includeMetadata: this.options.includeMetadata,
			trackRelationships: this.options.trackRelationships,
		};

		if (!rdfConfig.enabled) {
			warnings.push("RDF analysis is disabled for this namespace");
			return this.createEmptyResult(
				namespace,
				config,
				rdfConfig,
				errors,
				warnings,
			);
		}

		// 데이터베이스 초기화
		if (rdfConfig.storeToDatabase) {
			try {
				this.dbApi = new RDFDatabaseAPI(rdfConfig.databasePath);
				await this.dbApi.initialize();
			} catch (error) {
				errors.push(`Failed to initialize database: ${error}`);
				return this.createEmptyResult(
					namespace,
					config,
					rdfConfig,
					errors,
					warnings,
				);
			}
		}

		// 프로젝트 이름 설정
		const projectName = config.projectName || "dependency-linker";

		// 파일 분석
		try {
			if (this.options.parallel) {
				await this.analyzeFilesInParallel(
					files,
					projectName,
					analysisResults,
					errors,
					warnings,
				);
			} else {
				await this.analyzeFilesSequentially(
					files,
					projectName,
					analysisResults,
					errors,
					warnings,
				);
			}
		} catch (error) {
			errors.push(`Analysis failed: ${error}`);
		}

		// 통계 생성
		const statistics = this.generateStatistics(analysisResults);

		// 데이터베이스 정리
		if (this.dbApi) {
			await this.dbApi.close();
			this.dbApi = null;
		}

		const endTime = Date.now();
		console.log(`RDF Namespace Analysis completed in ${endTime - startTime}ms`);

		return {
			namespace,
			projectName,
			config,
			rdfConfig,
			analysisResults,
			statistics,
			errors,
			warnings,
		};
	}

	/**
	 * 병렬 파일 분석
	 */
	private async analyzeFilesInParallel(
		files: string[],
		projectName: string,
		analysisResults: RDFAnalysisResult[],
		errors: string[],
		warnings: string[],
	): Promise<void> {
		const maxConcurrency = this.options.maxConcurrency || 4;
		const chunks = this.chunkArray(files, maxConcurrency);

		for (const chunk of chunks) {
			const promises = chunk.map((file) =>
				this.analyzeSingleFile(
					file,
					projectName,
					analysisResults,
					errors,
					warnings,
				),
			);
			await Promise.all(promises);
		}
	}

	/**
	 * 순차 파일 분석
	 */
	private async analyzeFilesSequentially(
		files: string[],
		projectName: string,
		analysisResults: RDFAnalysisResult[],
		errors: string[],
		warnings: string[],
	): Promise<void> {
		for (const file of files) {
			await this.analyzeSingleFile(
				file,
				projectName,
				analysisResults,
				errors,
				warnings,
			);
		}
	}

	/**
	 * 단일 파일 분석
	 */
	private async analyzeSingleFile(
		filePath: string,
		projectName: string,
		analysisResults: RDFAnalysisResult[],
		errors: string[],
		warnings: string[],
	): Promise<void> {
		try {
			// 파일 읽기
			const sourceCode = await fs.promises.readFile(filePath, "utf-8");
			const language = this.detectLanguage(filePath);

			// RDF 분석 실행
			const result = await analyzeFileWithRDF(
				sourceCode,
				language,
				filePath,
				projectName,
			);

			// 데이터베이스에 저장
			if (this.dbApi && result.symbols.length > 0) {
				for (const symbol of result.symbols) {
					await this.dbApi.storeRDFSymbolExtractionResult(
						symbol,
						projectName,
						filePath,
					);
				}
			}

			analysisResults.push(result);
		} catch (error) {
			errors.push(`Failed to analyze ${filePath}: ${error}`);
		}
	}

	/**
	 * 언어 감지
	 */
	private detectLanguage(filePath: string): SupportedLanguage {
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
				return "markdown";
			default:
				return "unknown";
		}
	}

	/**
	 * 배열 청크 분할
	 */
	private chunkArray<T>(array: T[], size: number): T[][] {
		const chunks: T[][] = [];
		for (let i = 0; i < array.length; i += size) {
			chunks.push(array.slice(i, i + size));
		}
		return chunks;
	}

	/**
	 * 통계 생성
	 */
	private generateStatistics(
		analysisResults: RDFAnalysisResult[],
	): RDFNamespaceAnalysisResult["statistics"] {
		const nodeTypeCount: Record<NodeType, number> = {} as Record<
			NodeType,
			number
		>;
		const namespaceCount: Record<string, number> = {};
		let totalSymbols = 0;
		let totalRDFAddresses = 0;
		let errorCount = 0;

		for (const result of analysisResults) {
			totalSymbols += result.symbols.length;
			totalRDFAddresses += result.symbols.length;
			errorCount += result.errors.length;

			// NodeType별 통계
			for (const symbol of result.symbols) {
				nodeTypeCount[symbol.nodeType] =
					(nodeTypeCount[symbol.nodeType] || 0) + 1;
				if (symbol.namespace) {
					namespaceCount[symbol.namespace] =
						(namespaceCount[symbol.namespace] || 0) + 1;
				}
			}
		}

		return {
			totalFiles: analysisResults.length,
			totalSymbols,
			totalRDFAddresses,
			nodeTypeCount,
			namespaceCount,
			fileCount: analysisResults.length,
			errorCount,
		};
	}

	/**
	 * 빈 결과 생성
	 */
	private createEmptyResult(
		namespace: string,
		config: NamespaceConfig,
		rdfConfig: RDFConfig,
		errors: string[],
		warnings: string[],
	): RDFNamespaceAnalysisResult {
		return {
			namespace,
			projectName: config.projectName || "dependency-linker",
			config,
			rdfConfig,
			analysisResults: [],
			statistics: {
				totalFiles: 0,
				totalSymbols: 0,
				totalRDFAddresses: 0,
				nodeTypeCount: {} as Record<NodeType, number>,
				namespaceCount: {},
				fileCount: 0,
				errorCount: 0,
			},
			errors,
			warnings,
		};
	}

	/**
	 * RDF 네임스페이스 검색
	 */
	async searchRDFInNamespace(
		namespace: string,
		query: string,
		options: {
			nodeType?: NodeType;
			filePath?: string;
			limit?: number;
		} = {},
	): Promise<any[]> {
		if (!this.dbApi) {
			throw new Error("Database not initialized");
		}

		return await this.dbApi.searchRDFAddresses(query, {
			...options,
			limit: options.limit || 100,
		});
	}

	/**
	 * RDF 네임스페이스 통계
	 */
	async getRDFNamespaceStatistics(namespace: string): Promise<any> {
		if (!this.dbApi) {
			throw new Error("Database not initialized");
		}

		return await this.dbApi.generateRDFStatistics();
	}
}
