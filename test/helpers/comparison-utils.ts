/**
 * 문서 비교 유틸리티
 */

import * as fs from 'fs';
import { EnhancedMarkdownProcessor } from '../../src/shared/utils/markdownProcessor.js';

export interface ComparisonResult {
  identical: boolean;
  similarity: number;
  differences: {
    characterCount: { original: number; converted: number; diff: number };
    lineCount: { original: number; converted: number; diff: number };
    wordCount: { original: number; converted: number; diff: number };
    structuralDifferences: string[];
    contentChanges: ContentChange[];
  };
  metadata: {
    originalMetadata: any;
    convertedMetadata: any;
    metadataPreserved: boolean;
  };
}

export interface ContentChange {
  type: 'added' | 'removed' | 'modified';
  line: number;
  content: string;
  context?: string;
}

export class DocumentComparator {
  private processor: EnhancedMarkdownProcessor;

  constructor() {
    this.processor = new EnhancedMarkdownProcessor();
  }

  /**
   * 두 마크다운 문서를 비교
   */
  compare(originalPath: string, convertedPath: string): ComparisonResult {
    const original = fs.readFileSync(originalPath, 'utf-8');
    const converted = fs.readFileSync(convertedPath, 'utf-8');

    return this.compareContent(original, converted);
  }

  /**
   * 문자열 내용을 직접 비교
   */
  compareContent(original: string, converted: string): ComparisonResult {
    // 기본 통계
    const originalLines = original.split('\n');
    const convertedLines = converted.split('\n');
    
    const characterCount = {
      original: original.length,
      converted: converted.length,
      diff: converted.length - original.length
    };

    const lineCount = {
      original: originalLines.length,
      converted: convertedLines.length,
      diff: convertedLines.length - originalLines.length
    };

    // 메타데이터 추출 및 비교
    const originalParsed = this.processor.parse(original);
    const convertedParsed = this.processor.parse(converted);

    const originalWordCount = this.countWords(originalParsed.content);
    const convertedWordCount = this.countWords(convertedParsed.content);

    const wordCount = {
      original: originalWordCount,
      converted: convertedWordCount,
      diff: convertedWordCount - originalWordCount
    };

    // 내용 변경 사항 분석
    const contentChanges = this.findContentChanges(originalLines, convertedLines);
    
    // 구조적 차이 분석
    const structuralDifferences = this.findStructuralDifferences(originalParsed.content, convertedParsed.content);

    // 유사도 계산
    const similarity = this.calculateSimilarity(original, converted);

    // 메타데이터 보존 여부
    const metadataPreserved = this.compareMetadata(originalParsed.data, convertedParsed.data);

    return {
      identical: original === converted,
      similarity,
      differences: {
        characterCount,
        lineCount,
        wordCount,
        structuralDifferences,
        contentChanges
      },
      metadata: {
        originalMetadata: originalParsed.data,
        convertedMetadata: convertedParsed.data,
        metadataPreserved
      }
    };
  }

  /**
   * 내용 변경 사항 찾기 (간단한 diff 알고리즘)
   */
  private findContentChanges(originalLines: string[], convertedLines: string[]): ContentChange[] {
    const changes: ContentChange[] = [];
    
    // 단순 비교 - 더 정교한 diff 알고리즘을 위해서는 별도 라이브러리 사용 권장
    const maxLines = Math.max(originalLines.length, convertedLines.length);
    const minLines = Math.min(originalLines.length, convertedLines.length);

    // 공통 부분 비교
    for (let i = 0; i < minLines; i++) {
      if (originalLines[i] !== convertedLines[i]) {
        changes.push({
          type: 'modified',
          line: i + 1,
          content: convertedLines[i],
          context: originalLines[i]
        });
      }
    }

    // 추가된 라인들
    if (convertedLines.length > originalLines.length) {
      for (let i = minLines; i < convertedLines.length; i++) {
        changes.push({
          type: 'added',
          line: i + 1,
          content: convertedLines[i]
        });
      }
    }

    // 제거된 라인들  
    if (originalLines.length > convertedLines.length) {
      for (let i = minLines; i < originalLines.length; i++) {
        changes.push({
          type: 'removed',
          line: i + 1,
          content: originalLines[i]
        });
      }
    }

    return changes;
  }

  /**
   * 구조적 차이 찾기
   */
  private findStructuralDifferences(original: string, converted: string): string[] {
    const differences: string[] = [];
    
    // 헤딩 구조 비교
    const originalHeadings = this.extractHeadings(original);
    const convertedHeadings = this.extractHeadings(converted);
    
    if (originalHeadings.length !== convertedHeadings.length) {
      differences.push(`Heading count changed: ${originalHeadings.length} → ${convertedHeadings.length}`);
    }

    // 리스트 구조 비교
    const originalLists = this.extractLists(original);
    const convertedLists = this.extractLists(converted);
    
    if (originalLists.length !== convertedLists.length) {
      differences.push(`List count changed: ${originalLists.length} → ${convertedLists.length}`);
    }

    // 코드 블록 비교
    const originalCodeBlocks = this.extractCodeBlocks(original);
    const convertedCodeBlocks = this.extractCodeBlocks(converted);
    
    if (originalCodeBlocks.length !== convertedCodeBlocks.length) {
      differences.push(`Code block count changed: ${originalCodeBlocks.length} → ${convertedCodeBlocks.length}`);
    }

    return differences;
  }

  /**
   * 유사도 계산 (Jaccard similarity)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * 메타데이터 비교
   */
  private compareMetadata(original: any, converted: any): boolean {
    const originalKeys = Object.keys(original || {}).filter(key => 
      !['last_synced', 'local_doc_id', 'word_count', 'reading_time_minutes', 'auto_generated'].includes(key)
    );
    const convertedKeys = Object.keys(converted || {}).filter(key => 
      !['last_synced', 'local_doc_id', 'word_count', 'reading_time_minutes', 'auto_generated'].includes(key)
    );

    if (originalKeys.length !== convertedKeys.length) return false;

    for (const key of originalKeys) {
      if (original[key] !== converted[key]) return false;
    }

    return true;
  }

  /**
   * 단어 수 계산
   */
  private countWords(content: string): number {
    return content
      .replace(/[^\w\s가-힣]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0).length;
  }

  /**
   * 헤딩 추출
   */
  private extractHeadings(content: string): string[] {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings: string[] = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      headings.push(match[0]);
    }

    return headings;
  }

  /**
   * 리스트 추출
   */
  private extractLists(content: string): string[] {
    const listRegex = /^[\s]*[-*+]\s+(.+)$/gm;
    const lists: string[] = [];
    let match;

    while ((match = listRegex.exec(content)) !== null) {
      lists.push(match[0]);
    }

    return lists;
  }

  /**
   * 코드 블록 추출
   */
  private extractCodeBlocks(content: string): string[] {
    const codeBlockRegex = /```[\s\S]*?```/g;
    return content.match(codeBlockRegex) || [];
  }
}

export const comparator = new DocumentComparator();