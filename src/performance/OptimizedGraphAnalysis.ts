/**
 * Optimized Graph Analysis System
 * 최적화된 Graph DB 기반 의존성 분석 시스템
 *
 * 핵심 기능:
 * 1. 고급 캐싱 시스템 통합
 * 2. 배치 처리 시스템 통합
 * 3. 시각화 시스템 통합
 * 4. 성능 모니터링
 * 5. 메모리 최적화
 */

import * as path from "node:path";
import * as fs from "node:fs/promises";
import { GraphDatabase } from "../database/GraphDatabase.js";
import {
	FileDependencyAnalyzer,
	type ImportSource,
} from "../database/services/FileDependencyAnalyzer.js";
import { AdvancedCache } from "../cache/AdvancedCache.js";
import { FileBatchProcessor } from "../batch/BatchProcessor.js";
import { DependencyGraphVisualizer } from "../visualization/DependencyGraphVisualizer.js";
import type { SupportedLanguage } from "../core/types.js";

export interface OptimizedAnalysisOptions {
	/** 캐싱 활성화 */
	enableCaching?: boolean;
	/** 배치 처리 활성화 */
	enableBatchProcessing?: boolean;
	/** 시각화 활성화 */
	enableVisualization?: boolean;
	/** 성능 모니터링 활성화 */
	enableMonitoring?: boolean;
	/** 최대 동시 처리 수 */
	maxConcurrency?: number;
	/** 배치 크기 */
	batchSize?: number;
	/** 캐시 크기 제한 (바이트) */
	cacheSizeLimit?: number;
	/** 메모리 제한 (바이트) */
	memoryLimit?: number;
	/** 시각화 출력 형식 */
	visualizationFormat?: "svg" | "html" | "json" | "dot";
	/** 시각화 출력 경로 */
	visualizationOutput?: string;
}

export interface OptimizedAnalysisResult {
	/** 분석 결과 */
	analysis: {
		totalFiles: number;
		processedFiles: number;
		failedFiles: number;
		totalDependencies: number;
		directDependencies: number;
		transitiveDependencies: number;
		circularDependencies: number;
	};
	/** 성능 메트릭 */
	performance: {
		totalTime: number;
		averageTimePerFile: number;
		throughput: number;
		memoryUsage: number;
		cacheHitRate: number;
		cpuUsage: number;
	};
	/** 캐시 통계 */
	cache: {
		totalHits: number;
		totalMisses: number;
		hitRate: number;
		totalSize: number;
		entryCount: number;
	};
	/** 시각화 결과 */
	visualization?: {
		format: string;
		outputPath: string;
		fileSize: number;
		nodeCount: number;
		edgeCount: number;
	};
	/** 메타데이터 */
	metadata: {
		analyzedAt: Date;
		projectRoot: string;
		projectName: string;
		options: OptimizedAnalysisOptions;
	};
}

/**
 * 최적화된 Graph DB 기반 의존성 분석 시스템
 */
export class OptimizedGraphAnalysis {
	private database: GraphDatabase;
	private cache: AdvancedCache<any>;
	private batchProcessor: FileBatchProcessor;
	private visualizer: DependencyGraphVisualizer;
	private options: Required<OptimizedAnalysisOptions>;
	private startTime: number;

	constructor(options: OptimizedAnalysisOptions = {}) {
		this.options = {
			enableCaching: options.enableCaching !== false,
			enableBatchProcessing: options.enableBatchProcessing !== false,
			enableVisualization: options.enableVisualization !== false,
			enableMonitoring: options.enableMonitoring !== false,
			maxConcurrency: options.maxConcurrency || 4,
			batchSize: options.batchSize || 10,
			cacheSizeLimit: options.cacheSizeLimit || 100 * 1024 * 1024, // 100MB
			memoryLimit: options.memoryLimit || 1024 * 1024 * 1024, // 1GB
			visualizationFormat: options.visualizationFormat || "svg",
			visualizationOutput: options.visualizationOutput || "./output/graph.svg",
		};

		// 데이터베이스 초기화
		this.database = new GraphDatabase(".dependency-linker/graph.db");

		// 캐시 초기화
		if (this.options.enableCaching) {
			this.cache = new AdvancedCache({
				maxSize: this.options.cacheSizeLimit,
				maxEntries: 1000,
				defaultTTL: 3600000, // 1시간
			});
		} else {
			this.cache = new AdvancedCache();
		}

		// 배치 처리기 초기화
		if (this.options.enableBatchProcessing) {
			this.batchProcessor = new FileBatchProcessor(
				async (filePath: string) => await this.processFile(filePath),
				{
					maxConcurrency: this.options.maxConcurrency,
					batchSize: this.options.batchSize,
					enableCaching: this.options.enableCaching,
					enableMonitoring: this.options.enableMonitoring,
					memoryLimit: this.options.memoryLimit,
				},
			);
		} else {
			this.batchProcessor = new FileBatchProcessor(
				async (filePath: string) => await this.processFile(filePath),
			);
		}

		// 시각화기 초기화
		if (this.options.enableVisualization) {
			this.visualizer = new DependencyGraphVisualizer({
				format: this.options.visualizationFormat,
				performance: {
					maxNodes: 1000,
					maxEdges: 5000,
					enableClustering: true,
					enableSimplification: true,
				},
			});
		} else {
			this.visualizer = new DependencyGraphVisualizer();
		}

		// 시작 시간 기록
		this.startTime = Date.now();
	}

	/**
	 * 최적화된 분석 실행
	 */
	async analyzeProject(
		projectRoot: string,
		projectName: string = "unknown-project",
		filePatterns: string[] = ["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx"],
	): Promise<OptimizedAnalysisResult> {
		this.startTime = Date.now();

		try {
			// 데이터베이스 초기화
			await this.database.initialize();

			// 파일 목록 수집
			const files = await this.collectFiles(projectRoot, filePatterns);

			// 배치 처리 또는 개별 처리
			const results = this.options.enableBatchProcessing
				? await this.processBatch(files, projectRoot, projectName)
				: await this.processFilesIndividually(files, projectRoot, projectName);

			// 시각화 생성
			let visualization: any;
			
			if (this.options.enableVisualization) {
				visualization = await this.generateVisualization();
			}

			// 결과 생성
			const result = await this.generateResult(
				files,
				results,
				visualization,
				projectRoot,
				projectName,
			);

			return result;
		} finally {
			// 정리
			await this.cleanup();
		}
	}

	/**
	 * 파일 목록 수집
	 */
	private async collectFiles(
		projectRoot: string,
		_patterns: string[],
	): Promise<string[]> {
		const files: string[] = [];

		try {
			// 간단한 파일 검색 (실제로는 glob 패턴 지원 필요)
			const entries = await fs.readdir(projectRoot, {
				withFileTypes: true,
				recursive: true,
			});

			for (const entry of entries) {
				if (entry.isFile()) {
					const filePath = path.join(projectRoot, entry.name);
					const ext = path.extname(filePath).toLowerCase();

					if (
						ext === ".ts" ||
						ext === ".js" ||
						ext === ".tsx" ||
						ext === ".jsx"
					) {
						files.push(filePath);
					}
				}
			}
		} catch (error) {
			console.warn(
				`File collection failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		return files;
	}

	/**
	 * 배치 처리
	 */
	private async processBatch(
		files: string[],
		_projectRoot: string,
		_projectName: string,
	): Promise<Map<string, any>> {
		// 배치 처리기에 파일 추가
		for (const file of files) {
			await this.batchProcessor.addJob(file, file, 0);
		}

		// 진행률 모니터링
		if (this.options.enableMonitoring) {
			this.batchProcessor.on("progress", (progress) => {
				console.log(
					`Progress: ${progress.percentage.toFixed(1)}% (${progress.completed}/${progress.total})`,
				);
			});
		}

		// 배치 처리 실행
		const results = await this.batchProcessor.process();
		return results;
	}

	/**
	 * 개별 파일 처리
	 */
	private async processFilesIndividually(
		files: string[],
		_projectRoot: string,
		_projectName: string,
	): Promise<Map<string, any>> {
		const results = new Map<string, any>();

		for (const file of files) {
			try {
				const result = await this.processFile(file);
				results.set(file, result);
			} catch (error) {
				console.warn(`Failed to process file ${file}:`, error);
			}
		}

		return results;
	}

	/**
	 * 개별 파일 처리
	 */
	private async processFile(filePath: string): Promise<any> {
		// 캐시 확인
		if (this.options.enableCaching && this.cache) {
			const cached = await this.cache.get(filePath);
			if (cached) {
				return cached;
			}
		}

		// 파일 분석
		const analyzer = new FileDependencyAnalyzer(
			this.database,
			path.dirname(filePath),
			"unknown-project",
		);

		// 언어 감지
		const language = this.detectLanguage(filePath);

		// 파일 내용 읽기
		const content = await fs.readFile(filePath, "utf-8");

		// import 소스 추출
		const importSources: ImportSource[] = [];
		const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
		let match: RegExpExecArray | null;
		
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

		await analyzer.analyzeFile(filePath, language, importSources);

		// 결과 생성
		const result = {
			filePath,
			analyzedAt: new Date(),
			success: true,
		};

		// 캐시 저장
		if (this.options.enableCaching && this.cache) {
			await this.cache.set(filePath, result);
		}

		return result;
	}

	/**
	 * 시각화 생성
	 */
	private async generateVisualization(): Promise<any> {
		if (!this.visualizer) {
			return null;
		}

		try {
			const result = await this.visualizer.visualizeFromDatabase(
				this.database,
				this.options.visualizationOutput,
			);

			return {
				format: result.format,
				outputPath: this.options.visualizationOutput,
				fileSize: result.metadata.fileSize,
				nodeCount: result.metadata.nodeCount,
				edgeCount: result.metadata.edgeCount,
			};
		} catch (error) {
			console.warn(
				`Visualization failed: ${error instanceof Error ? error.message : String(error)}`,
			);
			return null;
		}
	}

	/**
	 * 결과 생성
	 */
	private async generateResult(
		files: string[],
		results: Map<string, any>,
		visualization: any,
		projectRoot: string,
		projectName: string,
	): Promise<OptimizedAnalysisResult> {
		const totalTime = Date.now() - this.startTime;
		const processedFiles = results.size;
		const failedFiles = files.length - processedFiles;

		// 성능 메트릭 계산
		const performance = {
			totalTime,
			averageTimePerFile: processedFiles > 0 ? totalTime / processedFiles : 0,
			throughput: processedFiles / (totalTime / 1000), // files per second
			memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
			cacheHitRate: this.cache ? this.cache.getStats().hitRate : 0,
			cpuUsage: 0, // TODO: CPU 사용률 측정
		};

		// 캐시 통계
		const cacheStats = this.cache
			? this.cache.getStats()
			: {
					totalHits: 0,
					totalMisses: 0,
					hitRate: 0,
					totalSize: 0,
					entryCount: 0,
				};

		return {
			analysis: {
				totalFiles: files.length,
				processedFiles,
				failedFiles,
				totalDependencies: 0, // TODO: 실제 의존성 수 계산
				directDependencies: 0, // TODO: 직접 의존성 수 계산
				transitiveDependencies: 0, // TODO: 간접 의존성 수 계산
				circularDependencies: 0, // TODO: 순환 의존성 수 계산
			},
			performance,
			cache: cacheStats,
			visualization,
			metadata: {
				analyzedAt: new Date(),
				projectRoot,
				projectName,
				options: this.options,
			},
		};
	}

	/**
	 * 정리
	 */
	private async cleanup(): Promise<void> {
		try {
			// 데이터베이스 정리
			await this.database.close();

			// 캐시 정리
			if (this.cache) {
				await this.cache.saveToFile();
				this.cache.destroy();
			}

			// 배치 처리기 정리
			if (this.batchProcessor) {
				this.batchProcessor.destroy();
			}
		} catch (error) {
			console.warn(
				`Cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * 성능 통계 조회
	 */
	getPerformanceStats(): any {
		return {
			processing: this.batchProcessor ? this.batchProcessor.getStats() : null,
			cache: this.cache ? this.cache.getStats() : null,
			memory: process.memoryUsage(),
			uptime: process.uptime(),
		};
	}

	/**
	 * 캐시 관리
	 */
	async clearCache(): Promise<void> {
		if (this.cache) {
			await this.cache.clear();
		}
	}

	async saveCache(): Promise<boolean> {
		if (this.cache) {
			return await this.cache.saveToFile();
		}
		return false;
	}

	async loadCache(): Promise<boolean> {
		if (this.cache) {
			return await this.cache.loadFromFile();
		}
		return false;
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
			case ".markdown":
				return "markdown";
			default:
				return "typescript"; // 기본값
		}
	}
}
