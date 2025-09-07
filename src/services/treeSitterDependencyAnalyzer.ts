/**
 * Tree-sitter 기반 종속성 분석 엔진 (언어별 파서 사용)
 * Tree-sitter Based Dependency Analysis Engine (Using Language-specific Parsers)
 */

import { readFileSync } from 'fs';
import path from 'path';
import { 
  parserFactory, 
  LanguageAnalysisResult, 
  DependencyInfo as ParserDependencyInfo,
  FunctionInfo as ParserFunctionInfo,
  ClassInfo as ParserClassInfo,
  BatchAnalysisResult
} from './parsers';

// Re-export types from the parser module for backward compatibility
export type DependencyInfo = ParserDependencyInfo;
export type FunctionInfo = ParserFunctionInfo;
export type ClassInfo = ParserClassInfo;
export type FileAnalysisResult = LanguageAnalysisResult;

/**
 * Tree-sitter 종속성 분석기 (언어별 파서 사용)
 * Simplified analyzer using the new parser factory system
 */
export class TreeSitterDependencyAnalyzer {
  
  /**
   * 파일 분석
   */
  async analyzeFile(filePath: string): Promise<FileAnalysisResult | null> {
    try {
      const result = await parserFactory.analyzeFile(filePath);
      return result;
    } catch (error) {
      console.error(`Failed to analyze file ${filePath}:`, error);
      return null;
    }
  }
  
  /**
   * 텍스트 직접 분석
   */
  async analyzeText(content: string, language: string, filePath?: string): Promise<FileAnalysisResult | null> {
    try {
      const result = await parserFactory.analyzeText(content, language, filePath);
      return result;
    } catch (error) {
      console.error(`Failed to analyze text for language ${language}:`, error);
      return null;
    }
  }
  
  /**
   * 언어 감지
   */
  detectLanguage(filePath: string): string | null {
    return parserFactory.detectLanguage(filePath);
  }
  
  /**
   * 지원하는 언어 목록
   */
  getSupportedLanguages(): string[] {
    return parserFactory.getSupportedLanguages();
  }
  
  /**
   * 지원하는 확장자 목록
   */
  getSupportedExtensions(): string[] {
    return parserFactory.getSupportedExtensions();
  }
  
  /**
   * 배치 파일 분석
   */
  async analyzeBatch(filePaths: string[]): Promise<BatchAnalysisResult> {
    return parserFactory.analyzeBatch(filePaths);
  }

  /**
   * 언어별 파서 정보
   */
  getParserInfo() {
    return parserFactory.getParserInfo();
  }

  /**
   * 파서 통계 정보
   */
  getStatistics() {
    return parserFactory.getParserStatistics();
  }

  /**
   * 언어별 파일 필터링
   */
  filterFilesByLanguage(filePaths: string[], language: string): string[] {
    return parserFactory.filterFilesByLanguage(filePaths, language);
  }
}

// 단일 인스턴스 export (기존 코드와의 호환성을 위해)
export const treeSitterAnalyzer = new TreeSitterDependencyAnalyzer();