/**
 * Single File Analysis to Graph Database
 * 단일 파일 경로(절대경로)를 받아서 의존성 분석 후 그래프 DB에 적재하는 API
 */

import { existsSync, statSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { analyzeDependencies } from '../api/analysis';
import { createGraphAnalysisSystem } from '../database';
import type { SupportedLanguage, ParseResult } from '../core/types';
import type { StorageResult, GraphAnalysisSystem } from '../database';

/**
 * 단일 파일 분석 옵션
 */
export interface SingleFileAnalysisOptions {
  /**
   * 그래프 데이터베이스 경로 (기본: 파일과 동일 디렉토리의 .dependency-linker/graph.db)
   */
  dbPath?: string;

  /**
   * 프로젝트 루트 경로 (기본: 파일의 디렉토리)
   */
  projectRoot?: string;

  /**
   * 프로젝트 이름 (기본: 'Single File Analysis')
   */
  projectName?: string;

  /**
   * 추론 관계 계산 활성화 여부 (기본: true)
   */
  enableInference?: boolean;

  /**
   * 기존 파일 데이터 삭제 후 재분석 여부 (기본: true)
   */
  replaceExisting?: boolean;

  /**
   * 언어 자동 감지 여부 (false인 경우 language 옵션 필수)
   */
  autoDetectLanguage?: boolean;

  /**
   * 명시적 언어 지정 (autoDetectLanguage가 false인 경우 필수)
   */
  language?: SupportedLanguage;
}

/**
 * 단일 파일 분석 결과
 */
export interface SingleFileAnalysisResult {
  /**
   * 분석된 파일 경로 (절대경로)
   */
  filePath: string;

  /**
   * 감지된 언어
   */
  language: SupportedLanguage;

  /**
   * 파싱 결과 (imports, exports, declarations 등)
   */
  parseResult: ParseResult;

  /**
   * 그래프 저장 결과
   */
  storageResult: StorageResult;

  /**
   * 추론 관계 개수 (enableInference가 true인 경우)
   */
  inferenceCount?: number;

  /**
   * 분석 통계
   */
  stats: {
    /**
     * 생성된 노드 수
     */
    nodesCreated: number;

    /**
     * 생성된 엣지 수
     */
    edgesCreated: number;

    /**
     * 처리 시간 (ms)
     */
    processingTime: number;
  };
}

/**
 * 단일 파일 분석 에러
 */
export class SingleFileAnalysisError extends Error {
  constructor(
    message: string,
    public code: string,
    public filePath?: string
  ) {
    super(message);
    this.name = 'SingleFileAnalysisError';
  }
}

/**
 * 단일 파일 분석 클래스
 */
export class SingleFileAnalyzer {
  private graphSystem?: GraphAnalysisSystem;
  private shouldCloseGraphSystem = false;

  /**
   * 기존 GraphAnalysisSystem 인스턴스를 재사용하는 생성자
   */
  constructor(graphSystem?: GraphAnalysisSystem) {
    if (graphSystem) {
      this.graphSystem = graphSystem;
      this.shouldCloseGraphSystem = false;
    }
  }

  /**
   * 단일 파일 분석 및 그래프 DB 적재
   *
   * @param filePath - 분석할 파일의 절대경로
   * @param options - 분석 옵션
   * @returns 분석 결과
   *
   * @throws {SingleFileAnalysisError} 파일 검증 실패 또는 분석 실패 시
   *
   * @example
   * ```typescript
   * const analyzer = new SingleFileAnalyzer();
   * const result = await analyzer.analyze('/absolute/path/to/file.ts');
   * console.log(`Nodes: ${result.stats.nodesCreated}, Edges: ${result.stats.edgesCreated}`);
   * await analyzer.close();
   * ```
   */
  async analyze(
    filePath: string,
    options: SingleFileAnalysisOptions = {}
  ): Promise<SingleFileAnalysisResult> {
    const startTime = Date.now();

    // 옵션 기본값 설정
    const {
      dbPath,
      projectRoot,
      projectName = 'Single File Analysis',
      enableInference = true,
      replaceExisting = true,
      autoDetectLanguage = true,
      language: explicitLanguage,
    } = options;

    try {
      // 1. 파일 경로 검증
      this.validateFilePath(filePath);

      // 2. 언어 감지
      const language = autoDetectLanguage
        ? this.detectLanguage(filePath)
        : explicitLanguage || this.detectLanguage(filePath);

      // 3. GraphAnalysisSystem 초기화 (없는 경우)
      if (!this.graphSystem) {
        const rootPath = projectRoot || dirname(filePath);
        this.graphSystem = createGraphAnalysisSystem({
          projectRoot: rootPath,
          projectName,
          dbPath,
        });
        this.shouldCloseGraphSystem = true;
      }

      // 4. 기존 파일 데이터 삭제 (replaceExisting이 true인 경우)
      if (replaceExisting) {
        await this.removeExistingFileData(filePath);
      }

      // 5. 파일 분석
      const parseResult = await analyzeDependencies('', language, filePath);

      // 6. 그래프 DB에 저장
      const storageResult = await this.graphSystem.store([
        {
          filePath,
          language,
          result: parseResult,
        },
      ]);

      // 7. 추론 관계 계산
      let inferenceCount: number | undefined;
      if (enableInference) {
        inferenceCount = await this.graphSystem.computeInferences();
      }

      // 8. 통계 계산
      const processingTime = Date.now() - startTime;

      return {
        filePath,
        language,
        parseResult,
        storageResult,
        inferenceCount,
        stats: {
          nodesCreated: storageResult.nodesCreated,
          edgesCreated: storageResult.edgesCreated,
          processingTime,
        },
      };
    } catch (error) {
      if (error instanceof SingleFileAnalysisError) {
        throw error;
      }

      throw new SingleFileAnalysisError(
        `Failed to analyze file: ${error instanceof Error ? error.message : String(error)}`,
        'ANALYSIS_FAILED',
        filePath
      );
    }
  }

  /**
   * 여러 파일 분석 (배치 처리)
   *
   * @param filePaths - 분석할 파일들의 절대경로 배열
   * @param options - 분석 옵션
   * @returns 각 파일의 분석 결과 배열
   *
   * @example
   * ```typescript
   * const analyzer = new SingleFileAnalyzer();
   * const results = await analyzer.analyzeMultiple([
   *   '/path/to/file1.ts',
   *   '/path/to/file2.ts'
   * ]);
   * await analyzer.close();
   * ```
   */
  async analyzeMultiple(
    filePaths: string[],
    options: SingleFileAnalysisOptions = {}
  ): Promise<SingleFileAnalysisResult[]> {
    const results: SingleFileAnalysisResult[] = [];

    // 첫 번째 파일에서 GraphAnalysisSystem 초기화
    if (filePaths.length === 0) {
      return results;
    }

    // replaceExisting을 false로 설정하여 한 번에 처리
    const batchOptions = { ...options, replaceExisting: false };

    for (const filePath of filePaths) {
      try {
        const result = await this.analyze(filePath, batchOptions);
        results.push(result);
      } catch (error) {
        console.warn(`Failed to analyze ${filePath}:`, error);
        // 개별 파일 실패는 전체 배치를 중단하지 않음
      }
    }

    return results;
  }

  /**
   * 그래프 DB 연결 종료
   */
  async close(): Promise<void> {
    if (this.graphSystem && this.shouldCloseGraphSystem) {
      await this.graphSystem.close();
      this.graphSystem = undefined;
    }
  }

  /**
   * 파일 경로 검증
   */
  private validateFilePath(filePath: string): void {
    // 절대경로 확인
    if (!isAbsolute(filePath)) {
      throw new SingleFileAnalysisError(
        `File path must be absolute: ${filePath}`,
        'INVALID_PATH',
        filePath
      );
    }

    // 파일 존재 확인
    if (!existsSync(filePath)) {
      throw new SingleFileAnalysisError(
        `File does not exist: ${filePath}`,
        'FILE_NOT_FOUND',
        filePath
      );
    }

    // 파일 타입 확인 (디렉토리가 아닌지)
    const stats = statSync(filePath);
    if (!stats.isFile()) {
      throw new SingleFileAnalysisError(
        `Path is not a file: ${filePath}`,
        'NOT_A_FILE',
        filePath
      );
    }

    // 지원되는 파일 확장자 확인
    const supportedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.java', '.py', '.go'];
    const hasValidExtension = supportedExtensions.some(ext => filePath.endsWith(ext));

    if (!hasValidExtension) {
      throw new SingleFileAnalysisError(
        `Unsupported file type. Supported: ${supportedExtensions.join(', ')}`,
        'UNSUPPORTED_FILE_TYPE',
        filePath
      );
    }
  }

  /**
   * 파일 확장자로부터 언어 감지
   */
  private detectLanguage(filePath: string): SupportedLanguage {
    if (filePath.endsWith('.tsx')) return 'tsx';
    if (filePath.endsWith('.ts')) return 'typescript';
    if (filePath.endsWith('.jsx')) return 'jsx';
    if (filePath.endsWith('.js')) return 'javascript';
    if (filePath.endsWith('.java')) return 'java';
    if (filePath.endsWith('.py')) return 'python';
    if (filePath.endsWith('.go')) return 'go';

    // 기본값
    return 'typescript';
  }

  /**
   * 기존 파일 데이터 삭제
   */
  private async removeExistingFileData(filePath: string): Promise<void> {
    if (!this.graphSystem) {
      return;
    }

    // FileDependencyAnalyzer의 cleanup 로직 사용
    // 해당 파일의 모든 노드와 엣지 삭제
    const db = (this.graphSystem as any).db;
    if (db) {
      await db.run(
        `DELETE FROM edges WHERE start_node_id IN (
          SELECT id FROM nodes WHERE source_file = ?
        ) OR end_node_id IN (
          SELECT id FROM nodes WHERE source_file = ?
        )`,
        filePath,
        filePath
      );

      await db.run(`DELETE FROM nodes WHERE source_file = ?`, filePath);
    }
  }
}

/**
 * 단일 파일 분석 헬퍼 함수
 *
 * @param filePath - 분석할 파일의 절대경로
 * @param options - 분석 옵션
 * @returns 분석 결과
 *
 * @example
 * ```typescript
 * // 기본 사용
 * const result = await analyzeSingleFile('/absolute/path/to/file.ts');
 *
 * // 옵션 지정
 * const result = await analyzeSingleFile('/absolute/path/to/file.ts', {
 *   projectName: 'My Project',
 *   dbPath: '/custom/path/to/graph.db',
 *   enableInference: true
 * });
 *
 * console.log(`Analyzed: ${result.filePath}`);
 * console.log(`Language: ${result.language}`);
 * console.log(`Nodes created: ${result.stats.nodesCreated}`);
 * console.log(`Edges created: ${result.stats.edgesCreated}`);
 * console.log(`Time: ${result.stats.processingTime}ms`);
 * ```
 */
export async function analyzeSingleFile(
  filePath: string,
  options?: SingleFileAnalysisOptions
): Promise<SingleFileAnalysisResult> {
  const analyzer = new SingleFileAnalyzer();

  try {
    return await analyzer.analyze(filePath, options);
  } finally {
    await analyzer.close();
  }
}

/**
 * 여러 파일 분석 헬퍼 함수
 *
 * @param filePaths - 분석할 파일들의 절대경로 배열
 * @param options - 분석 옵션
 * @returns 각 파일의 분석 결과 배열
 *
 * @example
 * ```typescript
 * const results = await analyzeMultipleFiles([
 *   '/absolute/path/to/file1.ts',
 *   '/absolute/path/to/file2.ts',
 *   '/absolute/path/to/file3.ts'
 * ]);
 *
 * results.forEach(result => {
 *   console.log(`File: ${result.filePath}`);
 *   console.log(`Nodes: ${result.stats.nodesCreated}`);
 * });
 * ```
 */
export async function analyzeMultipleFiles(
  filePaths: string[],
  options?: SingleFileAnalysisOptions
): Promise<SingleFileAnalysisResult[]> {
  const analyzer = new SingleFileAnalyzer();

  try {
    return await analyzer.analyzeMultiple(filePaths, options);
  } finally {
    await analyzer.close();
  }
}