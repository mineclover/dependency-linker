/**
 * 서비스 통합 레지스트리 - Unified Service Registry
 * 모든 서비스의 단일 진입점으로 Clean Architecture 준수
 */

// ===== 도메인별 서비스 Export =====
export * from './analysis';
export * from './document';  
export * from './sync';
export * from './upload';
export * from './validation';
export * from './workflow';

// ===== 인프라 계층 인터페이스 (DI Container) =====
export * from '../infrastructure/container/ServiceContainer';
export { getServiceContainer } from '../infrastructure/container/ServiceContainer';

// ===== 핵심 서비스 =====
export * from './parsers';
export { parserFactory } from './parsers';

export * from './analysis/analysisIndexManager';
export { analysisIndexManager } from './analysis/analysisIndexManager';

export * from './notion/NotionClientWrapper';
export { notionClient } from './notion/NotionClientWrapper';

export * from './uploadService';
export { uploadService } from './uploadService';

// ===== 레거시 호환성 계층 (임시) =====
import { LegacyBridgeService } from './legacy/LegacyBridgeService';
export const legacyBridge = LegacyBridgeService.getInstance();

// 사용 중단 경고
console.warn('⚠️ Legacy service imports detected. Migration recommended.');
console.warn('📖 See: /docs/migration-guide.md');

// ===== 편의 함수들 =====

/**
 * 파일 분석 편의 함수
 */
export async function quickAnalyze(filePath: string) {
  const { parserFactory } = await import('./parsers');
  return parserFactory.analyzeFile(filePath);
}

/**
 * 배치 파일 분석
 */
export async function quickAnalyzeBatch(filePaths: string[]) {
  const { parserFactory } = await import('./parsers');
  return parserFactory.analyzeBatch(filePaths);
}

/**
 * 빠른 업로드 (Notion 업로드 제외)
 */
export async function quickUpload(filePath: string, options?: {
  maxFunctions?: number;
  maxDependencies?: number;
  maxLibraries?: number;
}) {
  const { uploadService } = await import('./uploadService');
  return uploadService.uploadFile(filePath, {
    ...options,
    skipNotion: true,
    skipSQLite: false
  });
}

/**
 * 관계형 구조 Notion 업로드 (통합 버전)
 */
export async function uploadWithRelationalStructure(
  filePath: string,
  options: {
    maxFunctions?: number;
    maxDependencies?: number;
    maxLibraries?: number;
    includeContent?: boolean;
    skipSQLite?: boolean;
  } = {}
) {
  const { uploadService } = await import('./uploadService');
  const { getServiceContainer } = await import('../infrastructure/container/ServiceContainer');
  
  const container = getServiceContainer();
  const configService = container.resolve('configurationService');
  
  const result = await uploadService.uploadFile(filePath, {
    maxFunctions: options.maxFunctions,
    maxDependencies: options.maxDependencies,
    maxLibraries: options.maxLibraries,
    includeContent: options.includeContent,
    skipSQLite: options.skipSQLite,
    skipNotion: false
  });
  
  // Get configuration through service
  const config = await configService.loadAndProcessConfig(process.cwd());
  
  // 통합된 형식으로 반환
  return {
    success: result.success,
    filePageId: result.filePageId,
    filePageUrl: result.filePageUrl,
    localDependencies: result.localDependencies,
    libraryDependencies: result.libraryDependencies,
    functions: result.functions,
    sqliteFileId: result.sqliteFileId,
    analysisTime: result.analysisTime,
    dependencyStats: result.dependencyStats,
    databaseUrls: {
      files: (config.parentPageId ? `https://notion.so/${config.parentPageId.replace(/-/g, '')}` : '') + '/' + (config.databases['files'] || '').replace(/-/g, ''),
      dependencies: (config.parentPageId ? `https://notion.so/${config.parentPageId.replace(/-/g, '')}` : '') + '/' + (config.databases['dependencies'] || '').replace(/-/g, ''),
      libraries: (config.parentPageId ? `https://notion.so/${config.parentPageId.replace(/-/g, '')}` : '') + '/' + (config.databases['libraries'] || '').replace(/-/g, ''),
      functions: (config.parentPageId ? `https://notion.so/${config.parentPageId.replace(/-/g, '')}` : '') + '/' + (config.databases['functions'] || '').replace(/-/g, '')
    }
  };
}

/**
 * 인덱스 통계 조회
 */
export async function getIndexStats() {
  const { analysisIndexManager } = await import('./analysis/analysisIndexManager');
  return analysisIndexManager.getStatistics();
}

/**
 * 지원 언어 확인
 */
export async function getSupportedLanguages() {
  const { parserFactory } = await import('./parsers');
  return {
    languages: parserFactory.getSupportedLanguages(),
    extensions: parserFactory.getSupportedExtensions(),
    parserInfo: parserFactory.getParserInfo(),
    statistics: parserFactory.getParserStatistics()
  };
}

/**
 * 전체 워크플로우 실행 (분석 → 인덱스 → Notion)
 */
export async function runCompleteFlow(
  filePath: string, 
  options: {
    skipNotion?: boolean;
    forceReanalysis?: boolean;
  } = {}
) {
  const { analysisWorkflowManager } = await import('./workflow/analysisWorkflowManager');
  
  return analysisWorkflowManager.processFile(filePath, {
    skipNotionUpload: options.skipNotion || false,
    forceReanalysis: options.forceReanalysis || false
  });
}

/**
 * 프로젝트 설정 검증
 */
export function validateConfiguration(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const notionEnvVars = [
    'NOTION_FILES_DB_ID',
    'NOTION_DEPENDENCIES_DB_ID', 
    'NOTION_FUNCTIONS_DB_ID',
    'NOTION_CLASSES_DB_ID',
    'NOTION_RELATIONSHIPS_DB_ID'
  ];
  
  for (const envVar of notionEnvVars) {
    if (!process.env[envVar]) {
      warnings.push(`Missing environment variable: ${envVar}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 기본 내보내기 - 주요 기능들
 */
export default {
  // 핵심 분석 함수
  quickAnalyze,
  quickAnalyzeBatch,
  quickUpload,
  runCompleteFlow,
  
  // 상태 조회
  getIndexStats,
  getSupportedLanguages,
  validateConfiguration,
  
  // 업로드 관련
  uploadWithRelationalStructure,
  
  // 레거시 호환
  legacyBridge
};