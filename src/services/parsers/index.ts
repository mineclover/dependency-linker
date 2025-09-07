/**
 * 언어별 파서 모듈 엔트리 포인트
 * Language-specific Parser Module Entry Point
 */

// 공통 인터페이스 및 기본 클래스
export * from './common/parserInterfaces';

// 언어별 파서
export * from './typescript/typescriptParser';
export * from './python/pythonParser';
export * from './go/goParser';
export * from './rust/rustParser';

// 파서 팩토리
export * from './parserFactory';

// 편의 함수들
import { parserFactory } from './parserFactory';

/**
 * 파일 분석 편의 함수
 */
export const analyzeFile = async (filePath: string) => {
  return parserFactory.analyzeFile(filePath);
};

/**
 * 텍스트 분석 편의 함수
 */
export const analyzeText = async (content: string, language: string, filePath?: string) => {
  return parserFactory.analyzeText(content, language, filePath);
};

/**
 * 언어 감지 편의 함수
 */
export const detectLanguage = (filePath: string) => {
  return parserFactory.detectLanguage(filePath);
};

/**
 * 지원 언어 목록
 */
export const getSupportedLanguages = () => {
  return parserFactory.getSupportedLanguages();
};

/**
 * 배치 분석 편의 함수
 */
export const analyzeBatch = async (filePaths: string[]) => {
  return parserFactory.analyzeBatch(filePaths);
};