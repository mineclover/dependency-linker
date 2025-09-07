/**
 * Pattern Matching Engine
 * 문서의 glob 패턴과 정규식을 통한 간접 참조 분석 엔진
 */

import * as path from 'path';
import { minimatch } from 'minimatch';
import { readFile } from 'fs/promises';
import type { PatternReference, FileMetadata, PatternMatch } from './dependencyCacheManager.js';
import { logger } from '../../shared/utils/index.js';

export interface PatternExtraction {
  patterns: ExtractedPattern[];
  context: string;
  confidence: number;
}

export interface ExtractedPattern {
  pattern: string;
  type: 'glob' | 'regex' | 'prefix' | 'suffix' | 'exact';
  scope: 'documentation' | 'configuration' | 'test' | 'build' | 'general';
  context: string;
  lineNumber: number;
  confidence: number;
}

export class PatternEngine {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * 문서에서 패턴 추출
   */
  async extractPatternsFromDocument(filePath: string): Promise<PatternExtraction> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const extension = path.extname(filePath).toLowerCase();
      
      let patterns: ExtractedPattern[] = [];
      
      switch (extension) {
        case '.md':
          patterns = this.extractFromMarkdown(content);
          break;
        case '.json':
          patterns = this.extractFromJSON(content);
          break;
        case '.yaml':
        case '.yml':
          patterns = this.extractFromYAML(content);
          break;
        case '.toml':
          patterns = this.extractFromTOML(content);
          break;
        case '.txt':
        case '.rst':
          patterns = this.extractFromPlainText(content);
          break;
        default:
          patterns = this.extractFromGenericText(content);
      }

      return {
        patterns,
        context: this.getDocumentContext(content),
        confidence: this.calculateOverallConfidence(patterns)
      };
    } catch (error) {
      logger.error(`패턴 추출 실패: ${filePath} - ${error}`);
      return { patterns: [], context: '', confidence: 0 };
    }
  }

  /**
   * 마크다운에서 패턴 추출
   */
  private extractFromMarkdown(content: string): ExtractedPattern[] {
    const patterns: ExtractedPattern[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // 코드 블록에서 파일 경로 패턴
      const codeBlockMatch = line.match(/```\w*\s*(.+)/);
      if (codeBlockMatch) {
        const potential = this.analyzePotentialPattern(codeBlockMatch[1]);
        if (potential) {
          patterns.push({
            ...potential,
            lineNumber,
            context: `code block: ${line.trim()}`
          });
        }
      }

      // 파일 참조 링크 [text](path)
      const linkMatches = line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
      for (const match of linkMatches) {
        const linkPath = match[2];
        const potential = this.analyzePotentialPattern(linkPath);
        if (potential) {
          patterns.push({
            ...potential,
            lineNumber,
            context: `markdown link: ${match[0]}`
          });
        }
      }

      // 인라인 코드에서 파일 경로 `path`
      const inlineCodeMatches = line.matchAll(/`([^`]+)`/g);
      for (const match of inlineCodeMatches) {
        const codePath = match[1];
        if (this.looksLikeFilePath(codePath)) {
          const potential = this.analyzePotentialPattern(codePath);
          if (potential) {
            patterns.push({
              ...potential,
              lineNumber,
              context: `inline code: ${match[0]}`
            });
          }
        }
      }

      // 직접적인 파일 경로 참조
      const pathMatches = line.matchAll(/\b([a-zA-Z0-9_\-\/]+\.[a-zA-Z0-9]+)\b/g);
      for (const match of pathMatches) {
        const potential = this.analyzePotentialPattern(match[1]);
        if (potential && potential.confidence > 0.5) {
          patterns.push({
            ...potential,
            lineNumber,
            context: `direct path reference: ${line.trim()}`
          });
        }
      }
    }

    return patterns;
  }

  /**
   * JSON에서 패턴 추출
   */
  private extractFromJSON(content: string): ExtractedPattern[] {
    const patterns: ExtractedPattern[] = [];

    try {
      const json = JSON.parse(content);
      
      // package.json의 scripts, files 등에서 패턴 추출
      if (json.scripts) {
        Object.entries(json.scripts).forEach(([key, value]) => {
          const scriptPatterns = this.extractPatternsFromScript(value as string);
          patterns.push(...scriptPatterns.map(p => ({
            ...p,
            scope: 'build' as const,
            context: `package.json script: ${key}`
          })));
        });
      }

      if (json.files) {
        json.files.forEach((file: string) => {
          const potential = this.analyzePotentialPattern(file);
          if (potential) {
            patterns.push({
              ...potential,
              scope: 'build',
              context: 'package.json files'
            });
          }
        });
      }

      // 구성 파일의 경로 패턴들
      this.extractPatternsFromObject(json, patterns, 'configuration');

    } catch (error) {
      // JSON 파싱 실패 시 텍스트로 처리
      return this.extractFromGenericText(content);
    }

    return patterns;
  }

  /**
   * YAML에서 패턴 추출
   */
  private extractFromYAML(content: string): ExtractedPattern[] {
    const patterns: ExtractedPattern[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // YAML 값에서 파일 경로 패턴 찾기
      const yamlValueMatch = line.match(/:\s*([^\s#]+)/);
      if (yamlValueMatch) {
        const value = yamlValueMatch[1];
        if (this.looksLikeFilePath(value) || this.looksLikeGlob(value)) {
          const potential = this.analyzePotentialPattern(value);
          if (potential) {
            patterns.push({
              ...potential,
              lineNumber,
              scope: 'configuration',
              context: `yaml value: ${line.trim()}`
            });
          }
        }
      }

      // 리스트 항목에서 패턴
      const listItemMatch = line.match(/^\s*-\s*(.+)/);
      if (listItemMatch) {
        const item = listItemMatch[1];
        if (this.looksLikeFilePath(item) || this.looksLikeGlob(item)) {
          const potential = this.analyzePotentialPattern(item);
          if (potential) {
            patterns.push({
              ...potential,
              lineNumber,
              scope: 'configuration',
              context: `yaml list item: ${line.trim()}`
            });
          }
        }
      }
    }

    return patterns;
  }

  /**
   * 스크립트에서 패턴 추출
   */
  private extractPatternsFromScript(script: string): ExtractedPattern[] {
    const patterns: ExtractedPattern[] = [];
    
    // 일반적인 파일 패턴들
    const filePatterns = script.match(/[a-zA-Z0-9_\-\/\*\?]+\.[a-zA-Z0-9\*]+/g);
    if (filePatterns) {
      filePatterns.forEach(pattern => {
        const potential = this.analyzePotentialPattern(pattern);
        if (potential) {
          patterns.push({
            ...potential,
            lineNumber: 0
          });
        }
      });
    }

    return patterns;
  }

  /**
   * 객체에서 재귀적으로 패턴 추출
   */
  private extractPatternsFromObject(obj: any, patterns: ExtractedPattern[], scope: ExtractedPattern['scope'], prefix = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'string') {
        if (this.looksLikeFilePath(value) || this.looksLikeGlob(value)) {
          const potential = this.analyzePotentialPattern(value);
          if (potential) {
            patterns.push({
              ...potential,
              scope,
              lineNumber: 0,
              context: `${scope} config: ${currentPath}`
            });
          }
        }
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'string' && (this.looksLikeFilePath(item) || this.looksLikeGlob(item))) {
            const potential = this.analyzePotentialPattern(item);
            if (potential) {
              patterns.push({
                ...potential,
                scope,
                lineNumber: 0,
                context: `${scope} config array: ${currentPath}[${index}]`
              });
            }
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        this.extractPatternsFromObject(value, patterns, scope, currentPath);
      }
    }
  }

  /**
   * 일반 텍스트에서 패턴 추출
   */
  private extractFromGenericText(content: string): ExtractedPattern[] {
    const patterns: ExtractedPattern[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // 파일 경로처럼 보이는 패턴들 찾기
      const pathMatches = line.matchAll(/\b([a-zA-Z0-9_\-\/\*\?]+\.[a-zA-Z0-9\*]+)\b/g);
      for (const match of pathMatches) {
        const potential = this.analyzePotentialPattern(match[1]);
        if (potential && potential.confidence > 0.6) {
          patterns.push({
            ...potential,
            lineNumber,
            context: `text reference: ${line.trim()}`
          });
        }
      }
    }

    return patterns;
  }

  /**
   * 플레인 텍스트에서 패턴 추출 (Markdown 전용)
   */
  private extractFromPlainText(content: string): ExtractedPattern[] {
    return this.extractFromGenericText(content);
  }

  /**
   * TOML에서 패턴 추출
   */
  private extractFromTOML(content: string): ExtractedPattern[] {
    // TOML 파싱은 복잡하므로 일단 텍스트 기반으로 처리
    return this.extractFromGenericText(content);
  }

  /**
   * 잠재적 패턴 분석
   */
  private analyzePotentialPattern(text: string): ExtractedPattern | null {
    const trimmed = text.trim().replace(/["']/g, '');
    
    if (!this.looksLikeFilePath(trimmed) && !this.looksLikeGlob(trimmed)) {
      return null;
    }

    let type: ExtractedPattern['type'] = 'exact';
    let confidence = 0.5;

    // 글롭 패턴 감지
    if (this.looksLikeGlob(trimmed)) {
      type = 'glob';
      confidence = 0.9;
    }
    // 정규식 패턴 감지
    else if (this.looksLikeRegex(trimmed)) {
      type = 'regex';
      confidence = 0.8;
    }
    // 접두사 패턴
    else if (trimmed.endsWith('*') || trimmed.endsWith('/')) {
      type = 'prefix';
      confidence = 0.7;
    }
    // 접미사 패턴
    else if (trimmed.startsWith('*') || trimmed.includes('*.')) {
      type = 'suffix';
      confidence = 0.7;
    }

    // 확장자 기반 신뢰도 조정
    const ext = path.extname(trimmed).toLowerCase();
    if (['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cpp', '.h'].includes(ext)) {
      confidence += 0.2;
    } else if (['.md', '.txt', '.json', '.yaml', '.yml'].includes(ext)) {
      confidence += 0.1;
    }

    // 스코프 결정
    let scope: ExtractedPattern['scope'] = 'general';
    if (trimmed.includes('test') || trimmed.includes('spec')) {
      scope = 'test';
    } else if (trimmed.includes('doc') || ext === '.md') {
      scope = 'documentation';
    } else if (trimmed.includes('config') || ['.json', '.yaml', '.yml', '.toml'].includes(ext)) {
      scope = 'configuration';
    } else if (trimmed.includes('build') || trimmed.includes('dist')) {
      scope = 'build';
    }

    return {
      pattern: trimmed,
      type,
      scope,
      context: '',
      lineNumber: 0,
      confidence: Math.min(confidence, 1.0)
    };
  }

  /**
   * 파일 경로처럼 보이는지 확인
   */
  private looksLikeFilePath(text: string): boolean {
    // 기본 파일 경로 패턴
    if (/^[a-zA-Z0-9_\-\.\/\\]+$/.test(text) && text.includes('.')) {
      return true;
    }

    // 상대/절대 경로
    if (text.startsWith('./') || text.startsWith('../') || text.startsWith('/')) {
      return true;
    }

    return false;
  }

  /**
   * 글롭 패턴처럼 보이는지 확인
   */
  private looksLikeGlob(text: string): boolean {
    return /[\*\?\[\]{}]/.test(text) && (text.includes('/') || text.includes('.'));
  }

  /**
   * 정규식 패턴처럼 보이는지 확인
   */
  private looksLikeRegex(text: string): boolean {
    return /[\^\$\(\)\|\+\{\}\\]/.test(text);
  }

  /**
   * 문서 컨텍스트 추출
   */
  private getDocumentContext(content: string): string {
    const lines = content.split('\n');
    
    // 제목 찾기
    for (const line of lines.slice(0, 10)) {
      if (line.startsWith('# ')) {
        return line.substring(2).trim();
      }
    }

    // 첫 번째 비어있지 않은 라인
    for (const line of lines.slice(0, 5)) {
      if (line.trim()) {
        return line.trim().substring(0, 100);
      }
    }

    return '';
  }

  /**
   * 전체 신뢰도 계산
   */
  private calculateOverallConfidence(patterns: ExtractedPattern[]): number {
    if (patterns.length === 0) return 0;
    
    const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    const patternVariety = new Set(patterns.map(p => p.type)).size / 4; // 4가지 타입
    
    return Math.min(avgConfidence * (1 + patternVariety * 0.2), 1.0);
  }

  /**
   * 패턴 매칭 테스트
   */
  testPatternMatch(pattern: ExtractedPattern, filePath: string): {
    isMatch: boolean;
    confidence: number;
    reason: string;
  } {
    const relativePath = path.relative(this.projectPath, filePath);
    
    switch (pattern.type) {
      case 'glob':
        const isGlobMatch = minimatch(relativePath, pattern.pattern);
        return {
          isMatch: isGlobMatch,
          confidence: isGlobMatch ? pattern.confidence : 0,
          reason: `glob pattern ${pattern.pattern} ${isGlobMatch ? 'matches' : 'does not match'} ${relativePath}`
        };

      case 'regex':
        try {
          const regex = new RegExp(pattern.pattern);
          const isRegexMatch = regex.test(relativePath);
          return {
            isMatch: isRegexMatch,
            confidence: isRegexMatch ? pattern.confidence * 0.9 : 0,
            reason: `regex pattern ${pattern.pattern} ${isRegexMatch ? 'matches' : 'does not match'} ${relativePath}`
          };
        } catch (error) {
          return {
            isMatch: false,
            confidence: 0,
            reason: `invalid regex pattern: ${pattern.pattern}`
          };
        }

      case 'prefix':
        const isPrefixMatch = relativePath.startsWith(pattern.pattern);
        return {
          isMatch: isPrefixMatch,
          confidence: isPrefixMatch ? pattern.confidence * 0.8 : 0,
          reason: `prefix pattern ${pattern.pattern} ${isPrefixMatch ? 'matches' : 'does not match'} ${relativePath}`
        };

      case 'suffix':
        const isSuffixMatch = relativePath.endsWith(pattern.pattern);
        return {
          isMatch: isSuffixMatch,
          confidence: isSuffixMatch ? pattern.confidence * 0.7 : 0,
          reason: `suffix pattern ${pattern.pattern} ${isSuffixMatch ? 'matches' : 'does not match'} ${relativePath}`
        };

      case 'exact':
        const isExactMatch = relativePath === pattern.pattern || path.basename(relativePath) === pattern.pattern;
        return {
          isMatch: isExactMatch,
          confidence: isExactMatch ? pattern.confidence : 0,
          reason: `exact pattern ${pattern.pattern} ${isExactMatch ? 'matches' : 'does not match'} ${relativePath}`
        };

      default:
        return {
          isMatch: false,
          confidence: 0,
          reason: `unknown pattern type: ${pattern.type}`
        };
    }
  }
}