/**
 * NotionContentManager - 페이지 컨텐츠 관리 전용 서비스
 * 
 * 역할:
 * - Notion 페이지 본문 컨텐츠 생성/수정
 * - 마크다운을 Notion 블록으로 변환
 * - 코드 블록, 이미지, 링크 등 다양한 컨텐츠 처리
 * - 페이지 블록 구조 관리
 */

import { Client } from '@notionhq/client';
import { logger } from '../../shared/utils/index.js';

export interface NotionBlock {
  type: string;
  [blockType: string]: any;
}

export interface DocumentContent {
  title?: string;
  sections: DocumentSection[];
  metadata?: ContentMetadata;
}

export interface DocumentSection {
  level: number;
  title: string;
  content: string;
  blocks?: NotionBlock[];
}

export interface ContentMetadata {
  wordCount?: number;
  codeBlocks?: CodeBlock[];
  links?: Link[];
  images?: Image[];
}

export interface CodeBlock {
  language?: string;
  content: string;
  line?: number;
}

export interface Link {
  type: 'internal' | 'external' | 'relative';
  url: string;
  text: string;
}

export interface Image {
  url: string;
  caption?: string;
  alt?: string;
}

export interface ContentTemplate {
  name: string;
  sections: TemplateSection[];
}

export interface TemplateSection {
  type: 'heading' | 'paragraph' | 'code' | 'divider' | 'callout' | 'toggle';
  content?: string;
  level?: number;
  language?: string;
  calloutType?: 'info' | 'warning' | 'error' | 'success';
}

export class NotionContentManager {
  constructor(private readonly notion: Client) {}

  /**
   * 페이지에 컨텐츠 추가
   */
  async appendContent(
    pageId: string,
    content: string,
    contentType: 'markdown' | 'plain' | 'blocks' = 'markdown'
  ): Promise<void> {
    try {
      logger.debug(`📝 Appending content to page: ${pageId}`);
      
      let blocks: NotionBlock[];
      
      switch (contentType) {
        case 'markdown':
          blocks = this.convertMarkdownToBlocks(content);
          break;
        case 'blocks':
          blocks = JSON.parse(content);
          break;
        default:
          blocks = this.convertPlainTextToBlocks(content);
      }
      
      if (blocks.length === 0) return;
      
      // 블록을 100개씩 나누어 업로드 (API 제한)
      const chunks = this.chunkArray(blocks, 100);
      
      for (const chunk of chunks) {
        await this.notion.blocks.children.append({
          block_id: pageId,
          children: chunk
        });
        
        // API 레이트 리밋 방지
        await this.delay(200);
      }
      
      logger.success(`✅ Content appended: ${blocks.length} blocks`);
    } catch (error) {
      logger.error(`❌ Failed to append content: ` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 페이지 컨텐츠 완전 교체
   */
  async replaceContent(
    pageId: string,
    content: string,
    contentType: 'markdown' | 'plain' | 'blocks' = 'markdown'
  ): Promise<void> {
    try {
      logger.debug(`🔄 Replacing content in page: ${pageId}`);
      
      // 기존 블록 모두 삭제
      await this.clearPageContent(pageId);
      
      // 새 컨텐츠 추가
      await this.appendContent(pageId, content, contentType);
      
      logger.success(`✅ Content replaced in page: ${pageId}`);
    } catch (error) {
      logger.error(`❌ Failed to replace content: ` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 페이지의 모든 블록 삭제
   */
  async clearPageContent(pageId: string): Promise<void> {
    try {
      logger.debug(`🗑️ Clearing page content: ${pageId}`);
      
      const blocks = await this.getPageBlocks(pageId);
      
      // 블록을 병렬로 삭제
      await Promise.all(
        blocks.map(async (block) => {
          try {
            await this.notion.blocks.delete({ block_id: block.id });
          } catch (error) {
            logger.warning(`⚠️ Failed to delete block ${block.id}:`, error);
          }
        })
      );
      
      logger.success(`✅ Cleared ${blocks.length} blocks`);
    } catch (error) {
      logger.error(`❌ Failed to clear page content: ` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 페이지 블록 조회
   */
  async getPageBlocks(pageId: string): Promise<any[]> {
    try {
      const blocks: any[] = [];
      let cursor: string | undefined;
      
      do {
        const response = await this.notion.blocks.children.list({
          block_id: pageId,
          start_cursor: cursor
        });
        
        blocks.push(...response.results);
        cursor = response.next_cursor || undefined;
      } while (cursor);
      
      return blocks;
    } catch (error) {
      logger.error(`❌ Failed to get page blocks: ` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 문서 컨텐츠 구조화
   */
  async createStructuredContent(
    pageId: string,
    document: DocumentContent
  ): Promise<void> {
    try {
      logger.debug(`📚 Creating structured content: ${document.title || 'Untitled'}`);
      
      const blocks: NotionBlock[] = [];
      
      // 문서 제목 (이미 페이지 제목이 있다면 스킵)
      if (document.title) {
        blocks.push({
          type: 'heading_1',
          heading_1: {
            rich_text: [{ text: { content: document.title } }]
          }
        });
      }
      
      // 메타데이터 섹션
      if (document.metadata) {
        blocks.push(...this.createMetadataSection(document.metadata));
      }
      
      // 본문 섹션들
      for (const section of document.sections) {
        blocks.push(...this.createSectionBlocks(section));
      }
      
      // 블록 업로드
      await this.uploadBlocks(pageId, blocks);
      
      logger.success(`✅ Structured content created: ${blocks.length} blocks`);
    } catch (error) {
      logger.error(`❌ Failed to create structured content: ` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 템플릿 기반 컨텐츠 생성
   */
  async createFromTemplate(
    pageId: string,
    template: ContentTemplate,
    variables: Record<string, string> = {}
  ): Promise<void> {
    try {
      logger.debug(`📋 Creating content from template: ${template.name}`);
      
      const blocks: NotionBlock[] = [];
      
      for (const section of template.sections) {
        const processedSection = this.processTemplateSection(section, variables);
        blocks.push(...this.createTemplateBlocks(processedSection));
      }
      
      await this.uploadBlocks(pageId, blocks);
      
      logger.success(`✅ Template content created: ${template.name}`);
    } catch (error) {
      logger.error(`❌ Failed to create template content: ` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 코드 파일 컨텐츠 생성
   */
  async createCodeContent(
    pageId: string,
    filePath: string,
    codeContent: string,
    metadata: {
      language?: string;
      functions?: string[];
      imports?: string[];
      exports?: string[];
      complexity?: string;
    }
  ): Promise<void> {
    try {
      logger.debug(`💻 Creating code content for: ${filePath}`);
      
      const blocks: NotionBlock[] = [];
      
      // 파일 정보 헤더
      blocks.push({
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: `📄 ${filePath}` } }]
        }
      });
      
      // 메타데이터
      if (metadata.language) {
        blocks.push({
          type: 'paragraph',
          paragraph: {
            rich_text: [
              { text: { content: '언어: ' } },
              { text: { content: metadata.language, annotations: { code: true } } }
            ]
          }
        });
      }
      
      if (metadata.complexity) {
        blocks.push({
          type: 'paragraph',
          paragraph: {
            rich_text: [
              { text: { content: '복잡도: ' } },
              { text: { content: metadata.complexity, annotations: { bold: true } } }
            ]
          }
        });
      }
      
      // Imports 섹션
      if (metadata.imports && metadata.imports.length > 0) {
        blocks.push({
          type: 'heading_3',
          heading_3: {
            rich_text: [{ text: { content: '📥 Imports' } }]
          }
        });
        
        metadata.imports.forEach(imp => {
          blocks.push({
            type: 'bulleted_list_item',
            bulleted_list_item: {
              rich_text: [{ text: { content: imp, annotations: { code: true } } }]
            }
          });
        });
      }
      
      // Functions 섹션
      if (metadata.functions && metadata.functions.length > 0) {
        blocks.push({
          type: 'heading_3',
          heading_3: {
            rich_text: [{ text: { content: '⚡ Functions' } }]
          }
        });
        
        metadata.functions.forEach(func => {
          blocks.push({
            type: 'bulleted_list_item',
            bulleted_list_item: {
              rich_text: [{ text: { content: func, annotations: { code: true } } }]
            }
          });
        });
      }
      
      // 코드 블록
      if (codeContent && codeContent.trim()) {
        blocks.push({
          type: 'heading_3',
          heading_3: {
            rich_text: [{ text: { content: '📝 Source Code' } }]
          }
        });
        
        // 코드가 너무 길면 요약본만 표시
        const displayCode = codeContent.length > 10000 
          ? codeContent.substring(0, 10000) + '\n\n// ... (코드가 너무 길어 일부만 표시됩니다)'
          : codeContent;
        
        blocks.push({
          type: 'code',
          code: {
            language: metadata.language || 'plain text',
            rich_text: [{ text: { content: displayCode } }]
          }
        });
      }
      
      await this.uploadBlocks(pageId, blocks);
      
      logger.success(`✅ Code content created for: ${filePath}`);
    } catch (error) {
      logger.error(`❌ Failed to create code content: ` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  // === Private Methods ===

  private convertMarkdownToBlocks(markdown: string): NotionBlock[] {
    const blocks: NotionBlock[] = [];
    const lines = markdown.split('\n');
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i].trim();
      
      if (!line) {
        i++;
        continue;
      }
      
      // 헤딩
      const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        const type = `heading_${level}` as const;
        
        blocks.push({
          type,
          [type]: {
            rich_text: [{ text: { content: text } }]
          }
        });
        i++;
        continue;
      }
      
      // 코드 블록
      if (line.startsWith('```')) {
        const language = line.slice(3).trim() || 'plain text';
        i++;
        let codeContent = '';
        
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeContent += lines[i] + '\n';
          i++;
        }
        
        blocks.push({
          type: 'code',
          code: {
            language,
            rich_text: [{ text: { content: codeContent.slice(0, -1) } }] // 마지막 개행 제거
          }
        });
        i++; // ```를 건너뛰기
        continue;
      }
      
      // 불릿 포인트
      if (line.startsWith('- ') || line.startsWith('* ')) {
        blocks.push({
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ text: { content: line.slice(2) } }]
          }
        });
        i++;
        continue;
      }
      
      // 번호 목록
      const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
      if (numberedMatch) {
        blocks.push({
          type: 'numbered_list_item',
          numbered_list_item: {
            rich_text: [{ text: { content: numberedMatch[1] } }]
          }
        });
        i++;
        continue;
      }
      
      // 일반 문단
      let paragraphContent = line;
      i++;
      
      // 다음 빈 줄까지 문단에 포함
      while (i < lines.length && lines[i].trim() && !this.isSpecialLine(lines[i].trim())) {
        paragraphContent += ' ' + lines[i].trim();
        i++;
      }
      
      blocks.push({
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: paragraphContent } }]
        }
      });
    }
    
    return blocks;
  }

  private convertPlainTextToBlocks(text: string): NotionBlock[] {
    const lines = text.split('\n');
    const blocks: NotionBlock[] = [];
    
    for (const line of lines) {
      if (line.trim()) {
        blocks.push({
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: line } }]
          }
        });
      }
    }
    
    return blocks;
  }

  private isSpecialLine(line: string): boolean {
    return (
      line.startsWith('#') ||
      line.startsWith('-') ||
      line.startsWith('*') ||
      line.startsWith('```') ||
      /^\d+\./.test(line)
    );
  }

  private createMetadataSection(metadata: ContentMetadata): NotionBlock[] {
    const blocks: NotionBlock[] = [];
    
    blocks.push({
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '📊 Document Info' } }]
      }
    });
    
    if (metadata.wordCount) {
      blocks.push({
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: `단어 수: ${metadata.wordCount}` } }]
        }
      });
    }
    
    if (metadata.codeBlocks && metadata.codeBlocks.length > 0) {
      blocks.push({
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: `코드 블록: ${metadata.codeBlocks.length}개` } }]
        }
      });
    }
    
    if (metadata.links && metadata.links.length > 0) {
      blocks.push({
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: `링크: ${metadata.links.length}개` } }]
        }
      });
    }
    
    return blocks;
  }

  private createSectionBlocks(section: DocumentSection): NotionBlock[] {
    const blocks: NotionBlock[] = [];
    
    // 섹션 헤딩
    const headingType = `heading_${Math.min(section.level, 3)}` as const;
    blocks.push({
      type: headingType,
      [headingType]: {
        rich_text: [{ text: { content: section.title } }]
      }
    });
    
    // 사용자 정의 블록이 있으면 사용, 없으면 컨텐츠를 마크다운으로 변환
    if (section.blocks) {
      blocks.push(...section.blocks);
    } else if (section.content) {
      blocks.push(...this.convertMarkdownToBlocks(section.content));
    }
    
    return blocks;
  }

  private processTemplateSection(
    section: TemplateSection,
    variables: Record<string, string>
  ): TemplateSection {
    const processedSection = { ...section };
    
    if (processedSection.content) {
      // 변수 치환
      for (const [key, value] of Object.entries(variables)) {
        processedSection.content = processedSection.content.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
          value
        );
      }
    }
    
    return processedSection;
  }

  private createTemplateBlocks(section: TemplateSection): NotionBlock[] {
    const blocks: NotionBlock[] = [];
    
    switch (section.type) {
      case 'heading':
        const level = section.level || 2;
        const headingType = `heading_${Math.min(level, 3)}` as const;
        blocks.push({
          type: headingType,
          [headingType]: {
            rich_text: [{ text: { content: section.content || '' } }]
          }
        });
        break;
        
      case 'paragraph':
        blocks.push({
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: section.content || '' } }]
          }
        });
        break;
        
      case 'code':
        blocks.push({
          type: 'code',
          code: {
            language: section.language || 'plain text',
            rich_text: [{ text: { content: section.content || '' } }]
          }
        });
        break;
        
      case 'divider':
        blocks.push({
          type: 'divider',
          divider: {}
        });
        break;
        
      case 'callout':
        blocks.push({
          type: 'callout',
          callout: {
            icon: { emoji: this.getCalloutEmoji(section.calloutType) },
            rich_text: [{ text: { content: section.content || '' } }]
          }
        });
        break;
        
      case 'toggle':
        blocks.push({
          type: 'toggle',
          toggle: {
            rich_text: [{ text: { content: section.content || '' } }]
          }
        });
        break;
    }
    
    return blocks;
  }

  private getCalloutEmoji(type?: string): string {
    switch (type) {
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'success': return '✅';
      default: return '💡';
    }
  }

  private async uploadBlocks(pageId: string, blocks: NotionBlock[]): Promise<void> {
    if (blocks.length === 0) return;
    
    const chunks = this.chunkArray(blocks, 100);
    
    for (const chunk of chunks) {
      await this.notion.blocks.children.append({
        block_id: pageId,
        children: chunk
      });
      
      await this.delay(200);
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 코드 블록 생성 (테스트용)
   */
  async createCodeBlocks(codeContent: {
    language?: string;
    code: string;
    description?: string;
  }): Promise<NotionBlock[]> {
    const blocks: NotionBlock[] = [];

    // 설명이 있으면 추가
    if (codeContent.description) {
      blocks.push({
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: codeContent.description } }]
        }
      });
    }

    // 코드 블록 추가
    blocks.push({
      type: 'code',
      code: {
        language: codeContent.language || 'plain text',
        rich_text: [{ text: { content: codeContent.code } }]
      }
    });

    return blocks;
  }
}