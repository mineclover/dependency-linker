/**
 * Notion ID Tracking Service
 * Front matter와 주석을 통해 파일과 Notion 페이지 ID를 추적하는 서비스
 */

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface NotionIdMapping {
  filePath: string;
  notionId: string;
  lastModified: Date;
  trackingMethod: 'frontmatter' | 'comment' | 'none';
}

export interface IdExtractionResult {
  notionId?: string;
  trackingMethod: 'frontmatter' | 'comment' | 'none';
  position?: {
    line: number;
    column: number;
  };
}

export interface IdInsertionOptions {
  method: 'frontmatter' | 'comment' | 'auto';
  position?: 'top' | 'bottom' | 'existing';
  preserveExisting?: boolean;
}

export class NotionIdTrackingService {
  private mappingCache: Map<string, NotionIdMapping> = new Map();

  /**
   * 파일에서 Notion ID 추출
   */
  extractNotionId(filePath: string): IdExtractionResult {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const ext = path.extname(filePath).toLowerCase();

      if (ext === '.md') {
        return this.extractFromMarkdown(content);
      } else {
        return this.extractFromCode(content, ext);
      }
    } catch (error) {
      console.warn(`Failed to extract Notion ID from ${filePath}:`, error);
      return { trackingMethod: 'none' };
    }
  }

  /**
   * 마크다운 파일에서 Notion ID 추출
   */
  private extractFromMarkdown(content: string): IdExtractionResult {
    try {
      const parsed = matter(content);
      const frontMatterData = parsed.data;

      // 다양한 front matter 키 확인
      const possibleKeys = ['notionId', 'notion_id', 'notion-id', 'id'];
      
      for (const key of possibleKeys) {
        if (frontMatterData[key]) {
          return {
            notionId: frontMatterData[key],
            trackingMethod: 'frontmatter'
          };
        }
      }

      // Front matter에 없으면 주석에서 찾기
      const commentResult = this.extractFromCodeComment(content, '.md');
      if (commentResult.notionId) {
        return commentResult;
      }

      return { trackingMethod: 'none' };
    } catch {
      return { trackingMethod: 'none' };
    }
  }

  /**
   * 코드 파일에서 Notion ID 추출
   */
  private extractFromCode(content: string, ext: string): IdExtractionResult {
    return this.extractFromCodeComment(content, ext);
  }

  /**
   * 주석에서 Notion ID 추출
   */
  private extractFromCodeComment(content: string, ext: string): IdExtractionResult {
    // 파일 타입별 주석 패턴
    const patterns = this.getCommentPatterns(ext);
    
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          return {
            notionId: match[1],
            trackingMethod: 'comment',
            position: {
              line: i + 1,
              column: match.index || 0
            }
          };
        }
      }
    }

    return { trackingMethod: 'none' };
  }

  /**
   * 파일에 Notion ID 삽입
   */
  insertNotionId(filePath: string, notionId: string, options: IdInsertionOptions = { method: 'auto' }): boolean {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const ext = path.extname(filePath).toLowerCase();
      
      // 기존 ID 확인
      const existing = this.extractNotionId(filePath);
      if (existing.notionId && options.preserveExisting) {
        console.log(`Preserving existing Notion ID in ${filePath}: ${existing.notionId}`);
        return true;
      }

      let newContent: string;
      const method = options.method === 'auto' ? this.determineInsertionMethod(ext) : options.method;

      if (method === 'frontmatter' && ext === '.md') {
        newContent = this.insertIntoFrontMatter(content, notionId);
      } else {
        newContent = this.insertIntoComment(content, notionId, ext, options.position);
      }

      writeFileSync(filePath, newContent, 'utf-8');

      // 캐시 업데이트
      this.updateCache(filePath, notionId, method);
      
      console.log(`✅ Inserted Notion ID into ${filePath}: ${notionId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to insert Notion ID into ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Front matter에 Notion ID 삽입
   */
  private insertIntoFrontMatter(content: string, notionId: string): string {
    try {
      const parsed = matter(content);
      
      // Notion ID 추가 또는 업데이트
      parsed.data.notionId = notionId;
      
      // front matter가 없었다면 생성
      if (Object.keys(parsed.data).length === 1) {
        // 처음 생성하는 경우 추가 메타데이터도 포함
        parsed.data.updated = new Date().toISOString().split('T')[0];
      }

      return matter.stringify(parsed.content, parsed.data);
    } catch {
      // Front matter 파싱 실패 시 수동으로 추가
      const frontMatterBlock = `---\nnotionId: ${notionId}\nupdated: ${new Date().toISOString().split('T')[0]}\n---\n\n`;
      return frontMatterBlock + content;
    }
  }

  /**
   * 주석으로 Notion ID 삽입
   */
  private insertIntoComment(content: string, notionId: string, ext: string, position: string = 'bottom'): string {
    const commentFormat = this.getCommentFormat(ext);
    const notionComment = this.formatNotionComment(notionId, commentFormat);

    // 기존 Notion ID 주석 제거
    const existingResult = this.extractFromCodeComment(content, ext);
    if (existingResult.notionId && existingResult.position) {
      const lines = content.split('\n');
      // 기존 주석이 있는 줄 제거
      lines.splice(existingResult.position.line - 1, 1);
      content = lines.join('\n');
    }

    const lines = content.split('\n');

    switch (position) {
      case 'top':
        lines.unshift(notionComment);
        break;
      
      case 'existing':
        // 기존 위치가 있다면 그 위치에, 없다면 bottom
        if (existingResult.position) {
          lines.splice(existingResult.position.line - 1, 0, notionComment);
        } else {
          lines.push('', notionComment);
        }
        break;
      
      case 'bottom':
      default:
        // 마지막에 빈 줄이 없다면 추가
        if (lines[lines.length - 1].trim() !== '') {
          lines.push('');
        }
        lines.push(notionComment);
        break;
    }

    return lines.join('\n');
  }

  /**
   * 주석 패턴 반환
   */
  private getCommentPatterns(ext: string): RegExp[] {
    const basePatterns = [
      // 기본 notion-id 패턴들
      /notion[_-]?id:\s*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i,
      /notion[_-]?id:\s*([a-f0-9]{32})/i, // 대시 없는 형태
    ];

    switch (ext) {
      case '.js':
      case '.ts':
      case '.jsx':
      case '.tsx':
      case '.java':
      case '.c':
      case '.cpp':
      case '.cs':
        return [
          ...basePatterns.map(p => new RegExp(`\\/\\/\\s*${p.source}`, 'i')),
          ...basePatterns.map(p => new RegExp(`\\/\\*\\s*${p.source}\\s*\\*\\/`, 'i')),
        ];
      
      case '.py':
      case '.sh':
      case '.yaml':
      case '.yml':
        return basePatterns.map(p => new RegExp(`#\\s*${p.source}`, 'i'));
      
      case '.html':
      case '.xml':
      case '.md':
        return [
          ...basePatterns.map(p => new RegExp(`<!--\\s*${p.source}\\s*-->`, 'i')),
          ...basePatterns.map(p => new RegExp(`#\\s*${p.source}`, 'i')), // 마크다운의 경우
        ];
      
      default:
        return [
          ...basePatterns.map(p => new RegExp(`\\/\\/\\s*${p.source}`, 'i')),
          ...basePatterns.map(p => new RegExp(`#\\s*${p.source}`, 'i')),
        ];
    }
  }

  /**
   * 주석 형식 반환
   */
  private getCommentFormat(ext: string): 'line' | 'block' | 'hash' | 'html' {
    switch (ext) {
      case '.js':
      case '.ts':
      case '.jsx':
      case '.tsx':
      case '.java':
      case '.c':
      case '.cpp':
      case '.cs':
        return 'line';
      
      case '.py':
      case '.sh':
      case '.yaml':
      case '.yml':
        return 'hash';
      
      case '.html':
      case '.xml':
        return 'html';
      
      case '.md':
        return 'html'; // 마크다운은 HTML 주석 사용
      
      default:
        return 'line';
    }
  }

  /**
   * Notion ID 주석 포맷팅
   */
  private formatNotionComment(notionId: string, format: 'line' | 'block' | 'hash' | 'html'): string {
    const timestamp = new Date().toISOString().split('T')[0];
    
    switch (format) {
      case 'line':
        return `// notion-id: ${notionId} (tracked: ${timestamp})`;
      
      case 'block':
        return `/* notion-id: ${notionId} (tracked: ${timestamp}) */`;
      
      case 'hash':
        return `# notion-id: ${notionId} (tracked: ${timestamp})`;
      
      case 'html':
        return `<!-- notion-id: ${notionId} (tracked: ${timestamp}) -->`;
      
      default:
        return `// notion-id: ${notionId} (tracked: ${timestamp})`;
    }
  }

  /**
   * 삽입 방법 결정 (자동)
   */
  private determineInsertionMethod(ext: string): 'frontmatter' | 'comment' {
    return ext === '.md' ? 'frontmatter' : 'comment';
  }

  /**
   * 캐시 업데이트
   */
  private updateCache(filePath: string, notionId: string, method: 'frontmatter' | 'comment'): void {
    this.mappingCache.set(filePath, {
      filePath,
      notionId,
      lastModified: new Date(),
      trackingMethod: method
    });
  }

  /**
   * 여러 파일에서 Notion ID 일괄 추출
   */
  batchExtractNotionIds(filePaths: string[]): Map<string, IdExtractionResult> {
    const results = new Map<string, IdExtractionResult>();
    
    for (const filePath of filePaths) {
      const result = this.extractNotionId(filePath);
      results.set(filePath, result);
      
      // 유효한 ID가 있다면 캐시에 저장
      if (result.notionId) {
        this.updateCache(filePath, result.notionId, result.trackingMethod);
      }
    }
    
    return results;
  }

  /**
   * 여러 파일에 Notion ID 일괄 삽입
   */
  batchInsertNotionIds(mappings: Map<string, string>, options: IdInsertionOptions = { method: 'auto' }): { success: string[]; failed: string[] } {
    const success: string[] = [];
    const failed: string[] = [];
    
    for (const [filePath, notionId] of mappings) {
      if (this.insertNotionId(filePath, notionId, options)) {
        success.push(filePath);
      } else {
        failed.push(filePath);
      }
    }
    
    return { success, failed };
  }

  /**
   * 캐시에서 매핑 조회
   */
  getCachedMapping(filePath: string): NotionIdMapping | undefined {
    return this.mappingCache.get(filePath);
  }

  /**
   * 모든 캐시된 매핑 반환
   */
  getAllCachedMappings(): Map<string, NotionIdMapping> {
    return new Map(this.mappingCache);
  }

  /**
   * 특정 Notion ID를 가진 파일 찾기 (grep 지원용)
   */
  findFilesByNotionId(notionId: string, searchPaths: string[]): string[] {
    const foundFiles: string[] = [];
    
    for (const [filePath, mapping] of this.mappingCache) {
      if (mapping.notionId === notionId) {
        foundFiles.push(filePath);
      }
    }
    
    // 캐시에 없는 경우 실제 파일에서 검색
    if (foundFiles.length === 0) {
      for (const searchPath of searchPaths) {
        const result = this.extractNotionId(searchPath);
        if (result.notionId === notionId) {
          foundFiles.push(searchPath);
          // 캐시에 추가
          this.updateCache(searchPath, notionId, result.trackingMethod);
        }
      }
    }
    
    return foundFiles;
  }

  /**
   * 통계 정보 반환
   */
  getTrackingStats(): {
    totalTracked: number;
    byMethod: { frontmatter: number; comment: number; none: number };
    byExtension: Map<string, number>;
  } {
    const stats = {
      totalTracked: this.mappingCache.size,
      byMethod: { frontmatter: 0, comment: 0, none: 0 },
      byExtension: new Map<string, number>()
    };

    for (const mapping of this.mappingCache.values()) {
      stats.byMethod[mapping.trackingMethod]++;
      
      const ext = path.extname(mapping.filePath);
      const count = stats.byExtension.get(ext) || 0;
      stats.byExtension.set(ext, count + 1);
    }

    return stats;
  }
}