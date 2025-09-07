/**
 * DocumentUploadService - Markdown/Documentation 파일 파싱 및 Notion 업로드
 */

import { readFile, stat } from 'fs/promises';
import { basename, extname, relative, join } from 'path';
import { Client } from '@notionhq/client';
import { logger } from '../../shared/utils/index.js';

interface DocumentMetadata {
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  lastModified: Date;
  wordCount: number;
  headingCount: number;
  codeBlockCount: number;
}

interface DocumentSection {
  level: number;
  title: string;
  content: string;
  lineStart: number;
  lineEnd: number;
}

interface DocumentLink {
  type: 'internal' | 'external' | 'relative';
  url: string;
  text: string;
  line: number;
}

interface CodeBlock {
  language?: string;
  content: string;
  line: number;
}

export interface DocumentParseResult {
  metadata: DocumentMetadata;
  sections: DocumentSection[];
  links: DocumentLink[];
  codeBlocks: CodeBlock[];
  frontMatter?: Record<string, any>;
}

export class DocumentUploadService {
  constructor(
    private readonly notionClient: Client,
    private readonly projectRoot: string = process.cwd()
  ) {}

  /**
   * 문서 파일 파싱 및 Notion 업로드
   */
  async parseAndUploadDocument(filePath: string, databaseId: string): Promise<string | null> {
    try {
      logger.info(`📄 Starting document parsing: ${filePath}`);
      
      const parseResult = await this.parseDocument(filePath);
      if (!parseResult) {
        logger.warning(`❌ Failed to parse document: ${filePath}`);
        return null;
      }

      const pageId = await this.uploadToNotion(filePath, parseResult, databaseId);
      if (pageId) {
        logger.info(`✅ Document uploaded successfully: ${filePath} → ${pageId}`);
      }

      return pageId;
    } catch (error) {
      logger.error(`❌ Error processing document ${filePath}: ` + (error instanceof Error ? error.message : String(error)));
      return null;
    }
  }

  /**
   * 문서 파일 파싱
   */
  async parseDocument(filePath: string): Promise<DocumentParseResult | null> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const stats = await stat(filePath);
      const extension = extname(filePath).toLowerCase();

      if (!['.md', '.markdown', '.rst', '.txt'].includes(extension)) {
        logger.warning(`❌ Unsupported document format: ${extension}`);
        return null;
      }

      return this.parseMarkdownContent(content, stats);
    } catch (error) {
      logger.error(`❌ Failed to parse document ${filePath}: ` + (error instanceof Error ? error.message : String(error)));
      return null;
    }
  }

  /**
   * Markdown 내용 파싱
   */
  private parseMarkdownContent(content: string, stats: any): DocumentParseResult {
    const lines = content.split('\n');
    let frontMatter: Record<string, any> | undefined;
    let contentStartIndex = 0;

    // Front Matter 파싱
    if (lines[0]?.trim() === '---') {
      const frontMatterEndIndex = lines.findIndex((line, index) => 
        index > 0 && line.trim() === '---'
      );
      
      if (frontMatterEndIndex > 0) {
        const frontMatterLines = lines.slice(1, frontMatterEndIndex);
        frontMatter = this.parseFrontMatter(frontMatterLines);
        contentStartIndex = frontMatterEndIndex + 1;
      }
    }

    const contentLines = lines.slice(contentStartIndex);
    const actualContent = contentLines.join('\n');

    // 섹션 파싱
    const sections = this.parseSections(contentLines, contentStartIndex);
    
    // 링크 파싱
    const links = this.parseLinks(contentLines, contentStartIndex);
    
    // 코드 블록 파싱
    const codeBlocks = this.parseCodeBlocks(contentLines, contentStartIndex);

    // 메타데이터 생성
    const metadata: DocumentMetadata = {
      title: frontMatter?.title || this.extractTitleFromContent(sections) || 'Untitled Document',
      description: frontMatter?.description || this.extractDescription(sections),
      tags: frontMatter?.tags || this.extractTags(actualContent),
      category: frontMatter?.category || 'Documentation',
      lastModified: stats.mtime,
      wordCount: this.countWords(actualContent),
      headingCount: sections.length,
      codeBlockCount: codeBlocks.length
    };

    return {
      metadata,
      sections,
      links,
      codeBlocks,
      frontMatter
    };
  }

  /**
   * Front Matter 파싱
   */
  private parseFrontMatter(lines: string[]): Record<string, any> {
    const frontMatter: Record<string, any> = {};
    
    for (const line of lines) {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        const cleanKey = key.trim();
        let cleanValue: any = value.trim();

        // 값 타입 처리
        if (cleanValue.startsWith('[') && cleanValue.endsWith(']')) {
          // 배열 처리
          cleanValue = cleanValue.slice(1, -1)
            .split(',')
            .map(item => item.trim().replace(/['"]/g, ''));
        } else if (cleanValue === 'true' || cleanValue === 'false') {
          // 불린 처리
          cleanValue = cleanValue === 'true';
        } else if (!isNaN(Number(cleanValue))) {
          // 숫자 처리
          cleanValue = Number(cleanValue);
        } else {
          // 문자열 따옴표 제거
          cleanValue = cleanValue.replace(/^['"]|['"]$/g, '');
        }

        frontMatter[cleanKey] = cleanValue;
      }
    }

    return frontMatter;
  }

  /**
   * 문서 섹션 파싱
   */
  private parseSections(lines: string[], startIndex: number): DocumentSection[] {
    const sections: DocumentSection[] = [];
    let currentSection: Partial<DocumentSection> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        // 이전 섹션 완료
        if (currentSection) {
          currentSection.lineEnd = startIndex + i - 1;
          currentSection.content = currentSection.content?.trim() || '';
          sections.push(currentSection as DocumentSection);
        }

        // 새 섹션 시작
        const [, hashes, title] = headingMatch;
        currentSection = {
          level: hashes.length,
          title: title.trim(),
          content: '',
          lineStart: startIndex + i,
          lineEnd: startIndex + i
        };
      } else if (currentSection) {
        // 섹션 내용 추가
        currentSection.content = (currentSection.content || '') + line + '\n';
      }
    }

    // 마지막 섹션 완료
    if (currentSection) {
      currentSection.lineEnd = startIndex + lines.length - 1;
      currentSection.content = currentSection.content?.trim() || '';
      sections.push(currentSection as DocumentSection);
    }

    return sections;
  }

  /**
   * 링크 파싱
   */
  private parseLinks(lines: string[], startIndex: number): DocumentLink[] {
    const links: DocumentLink[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Markdown 링크 [text](url) 형식
      const markdownLinks = line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
      for (const match of markdownLinks) {
        const [, text, url] = match;
        links.push({
          type: this.getLinkType(url),
          url,
          text,
          line: startIndex + i + 1
        });
      }

      // 일반 URL 형식
      const urlLinks = line.matchAll(/(https?:\/\/[^\s]+)/g);
      for (const match of urlLinks) {
        const url = match[1];
        links.push({
          type: 'external',
          url,
          text: url,
          line: startIndex + i + 1
        });
      }
    }

    return links;
  }

  /**
   * 코드 블록 파싱
   */
  private parseCodeBlocks(lines: string[], startIndex: number): CodeBlock[] {
    const codeBlocks: CodeBlock[] = [];
    let inCodeBlock = false;
    let currentBlock: Partial<CodeBlock> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          // 코드 블록 시작
          const language = line.slice(3).trim();
          currentBlock = {
            language: language || undefined,
            content: '',
            line: startIndex + i + 1
          };
          inCodeBlock = true;
        } else {
          // 코드 블록 종료
          if (currentBlock) {
            currentBlock.content = currentBlock.content?.slice(0, -1) || ''; // 마지막 개행 제거
            codeBlocks.push(currentBlock as CodeBlock);
          }
          currentBlock = null;
          inCodeBlock = false;
        }
      } else if (inCodeBlock && currentBlock) {
        currentBlock.content = (currentBlock.content || '') + line + '\n';
      }
    }

    return codeBlocks;
  }

  /**
   * 링크 타입 결정
   */
  private getLinkType(url: string): 'internal' | 'external' | 'relative' {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return 'external';
    } else if (url.startsWith('#')) {
      return 'internal';
    } else {
      return 'relative';
    }
  }

  /**
   * 제목 추출
   */
  private extractTitleFromContent(sections: DocumentSection[]): string | null {
    const firstHeading = sections.find(section => section.level === 1);
    return firstHeading?.title || null;
  }

  /**
   * 설명 추출
   */
  private extractDescription(sections: DocumentSection[]): string | undefined {
    for (const section of sections) {
      const content = section.content.trim();
      if (content && !content.startsWith('#')) {
        // 첫 번째 단락을 설명으로 사용 (최대 200자)
        const firstParagraph = content.split('\n\n')[0];
        return firstParagraph.length > 200 
          ? firstParagraph.substring(0, 197) + '...'
          : firstParagraph;
      }
    }
    return undefined;
  }

  /**
   * 태그 추출
   */
  private extractTags(content: string): string[] {
    const tags = new Set<string>();
    
    // #hashtag 형식 태그 추출
    const hashtagMatches = content.matchAll(/#(\w+)/g);
    for (const match of hashtagMatches) {
      tags.add(match[1]);
    }

    // 일반적인 키워드 추출 (예: API, React, TypeScript 등)
    const keywords = [
      'API', 'React', 'Vue', 'Angular', 'TypeScript', 'JavaScript',
      'Node.js', 'Express', 'FastAPI', 'Django', 'Flask',
      'MongoDB', 'PostgreSQL', 'MySQL', 'SQLite',
      'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
      'Testing', 'CI/CD', 'DevOps', 'Security'
    ];

    for (const keyword of keywords) {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        tags.add(keyword);
      }
    }

    return Array.from(tags).slice(0, 10); // 최대 10개
  }

  /**
   * 단어 수 계산
   */
  private countWords(content: string): number {
    // 코드 블록과 링크 제외하고 단어 수 계산
    const cleanContent = content
      .replace(/```[\s\S]*?```/g, '') // 코드 블록 제거
      .replace(/`[^`]+`/g, '') // 인라인 코드 제거
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 링크에서 텍스트만 남김
      .replace(/[#*_~`]/g, '') // 마크다운 문법 제거
      .trim();

    return cleanContent.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Notion에 업로드
   */
  private async uploadToNotion(
    filePath: string,
    parseResult: DocumentParseResult,
    databaseId: string
  ): Promise<string | null> {
    try {
      const relativePath = relative(this.projectRoot, filePath);
      const { metadata, sections, links, codeBlocks } = parseResult;

      // 페이지 속성 구성
      const properties = {
        'File Path': {
          title: [{ text: { content: relativePath } }]
        },
        'Title': {
          rich_text: [{ text: { content: metadata.title } }]
        },
        'Category': {
          select: { name: metadata.category || 'Documentation' }
        },
        'Word Count': {
          number: metadata.wordCount
        },
        'Heading Count': {
          number: metadata.headingCount
        },
        'Code Blocks': {
          number: metadata.codeBlockCount
        },
        'Last Modified': {
          date: { start: metadata.lastModified.toISOString().split('T')[0] }
        },
        'Status': {
          select: { name: 'Uploaded' }
        }
      };

      // 태그가 있는 경우 추가
      if (metadata.tags && metadata.tags.length > 0) {
        properties['Tags'] = {
          multi_select: metadata.tags.map(tag => ({ name: tag }))
        };
      }

      // 설명이 있는 경우 추가
      if (metadata.description) {
        properties['Description'] = {
          rich_text: [{ text: { content: metadata.description } }]
        };
      }

      // 페이지 내용 구성
      const content = this.buildNotionContent(parseResult);

      // Notion 페이지 생성
      const response = await this.notionClient.createPage({
        parent: { database_id: databaseId },
        properties,
        children: content
      });

      return response.id;
    } catch (error) {
      logger.error(`❌ Failed to upload to Notion: ` + (error instanceof Error ? error.message : String(error)));
      return null;
    }
  }

  /**
   * Notion 페이지 내용 구성
   */
  private buildNotionContent(parseResult: DocumentParseResult): any[] {
    const { sections, codeBlocks, links } = parseResult;
    const content: any[] = [];

    // 문서 개요
    if (parseResult.metadata.description) {
      content.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: parseResult.metadata.description } }]
        }
      });
    }

    // 메타데이터 요약
    content.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '📊 Document Summary' } }]
      }
    });

    content.push({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: `Word Count: ${parseResult.metadata.wordCount}` } }]
      }
    });

    content.push({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: `Sections: ${sections.length}` } }]
      }
    });

    content.push({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: `Code Blocks: ${codeBlocks.length}` } }]
      }
    });

    content.push({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: `Links: ${links.length}` } }]
      }
    });

    // 섹션별 내용
    if (sections.length > 0) {
      content.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '📝 Document Structure' } }]
        }
      });

      sections.slice(0, 5).forEach(section => { // 최대 5개 섹션만 표시
        content.push({
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [{ text: { content: `${'#'.repeat(section.level)} ${section.title}` } }]
          }
        });

        const preview = section.content.substring(0, 300);
        if (preview) {
          content.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ 
                text: { 
                  content: preview + (section.content.length > 300 ? '...' : '') 
                } 
              }]
            }
          });
        }
      });
    }

    // 코드 블록 정보
    if (codeBlocks.length > 0) {
      content.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '💻 Code Blocks' } }]
        }
      });

      const languages = [...new Set(codeBlocks.map(block => block.language).filter(Boolean))];
      if (languages.length > 0) {
        content.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: `Languages: ${languages.join(', ')}` } }]
          }
        });
      }
    }

    // 링크 정보
    if (links.length > 0) {
      content.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '🔗 Links' } }]
        }
      });

      const externalLinks = links.filter(link => link.type === 'external');
      const internalLinks = links.filter(link => link.type === 'internal');
      const relativeLinks = links.filter(link => link.type === 'relative');

      if (externalLinks.length > 0) {
        content.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: `External Links: ${externalLinks.length}` } }]
          }
        });
      }

      if (relativeLinks.length > 0) {
        content.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: `Relative Links: ${relativeLinks.length}` } }]
          }
        });
      }
    }

    return content;
  }

  /**
   * 배치 문서 업로드
   */
  async batchUploadDocuments(
    filePaths: string[],
    databaseId: string,
    batchSize: number = 5
  ): Promise<{ success: string[], failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    logger.info(`📄 Starting batch document upload: ${filePaths.length} files`);

    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      
      const promises = batch.map(async (filePath) => {
        const pageId = await this.parseAndUploadDocument(filePath, databaseId);
        return { filePath, pageId };
      });

      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        const filePath = batch[index];
        if (result.status === 'fulfilled' && result.value.pageId) {
          success.push(filePath);
        } else {
          failed.push(filePath);
        }
      });

      // 배치 간 짧은 대기 (API 레이트 리밋 방지)
      if (i + batchSize < filePaths.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info(`📄 Batch upload completed: ${success.length} success, ${failed.length} failed`);
    return { success, failed };
  }
}