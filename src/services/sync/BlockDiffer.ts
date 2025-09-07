/**
 * Block Differ - 블록 레벨 차이 분석 및 동기화
 * Notion 블록과 로컬 콘텐츠 간의 세밀한 차이 분석
 */

import { readFileSync } from 'fs';
import { logger, stringUtils, arrayUtils } from '../../shared/utils/index.js';

export interface Block {
  /** 블록 고유 ID */
  id: string;
  /** 블록 타입 */
  type: BlockType;
  /** 블록 내용 */
  content: string;
  /** 블록 메타데이터 */
  metadata?: BlockMetadata;
  /** 하위 블록들 */
  children?: Block[];
  /** 부모 블록 ID */
  parentId?: string;
  /** 블록 순서 */
  order: number;
}

export interface BlockMetadata {
  /** 생성 시간 */
  createdAt?: string;
  /** 마지막 수정 시간 */
  lastModifiedAt?: string;
  /** 해시 값 (변경 감지용) */
  hash?: string;
  /** 원본 소스 위치 */
  sourceLocation?: {
    file: string;
    startLine: number;
    endLine: number;
  };
  /** 추가 속성 */
  properties?: Record<string, unknown>;
}

export type BlockType = 
  | 'heading_1' | 'heading_2' | 'heading_3'
  | 'paragraph' | 'bulleted_list_item' | 'numbered_list_item'
  | 'code' | 'quote' | 'callout' | 'divider'
  | 'table' | 'table_row' | 'table_cell'
  | 'toggle' | 'to_do'
  | 'image' | 'file' | 'bookmark'
  | 'embed' | 'video' | 'audio'
  | 'equation' | 'breadcrumb'
  | 'column_list' | 'column'
  | 'synced_block';

export interface BlockDiff {
  /** 차이 타입 */
  type: DiffType;
  /** 원본 블록 (변경/삭제 시) */
  originalBlock?: Block;
  /** 새 블록 (추가/변경 시) */
  newBlock?: Block;
  /** 변경 위치 */
  position: number;
  /** 변경 설명 */
  description: string;
  /** 신뢰도 점수 (0-1) */
  confidence: number;
}

export type DiffType = 'added' | 'removed' | 'modified' | 'moved' | 'reordered';

export interface DiffResult {
  /** 전체 차이 목록 */
  diffs: BlockDiff[];
  /** 변경 통계 */
  stats: DiffStats;
  /** 동기화 액션들 */
  syncActions: SyncAction[];
}

export interface DiffStats {
  /** 추가된 블록 수 */
  added: number;
  /** 삭제된 블록 수 */
  removed: number;
  /** 수정된 블록 수 */
  modified: number;
  /** 이동된 블록 수 */
  moved: number;
  /** 재정렬된 블록 수 */
  reordered: number;
  /** 전체 변경률 (0-1) */
  changeRatio: number;
}

export interface SyncAction {
  /** 액션 타입 */
  type: 'create' | 'update' | 'delete' | 'move' | 'reorder';
  /** 대상 블록 ID */
  blockId: string;
  /** 액션 데이터 */
  data: unknown;
  /** 우선순위 */
  priority: number;
  /** 의존성 (이 액션보다 먼저 실행되어야 할 액션들) */
  dependencies?: string[];
}

export interface BlockParser {
  /** 파일을 블록으로 파싱 */
  parseFile(filePath: string): Promise<Block[]>;
  /** 마크다운을 블록으로 파싱 */
  parseMarkdown(content: string): Block[];
  /** 블록을 마크다운으로 변환 */
  blocksToMarkdown(blocks: Block[]): string;
}

/**
 * 블록 레벨 차이 분석기
 */
export class BlockDiffer {
  private readonly options: BlockDifferOptions;

  constructor(options: BlockDifferOptions = {}) {
    this.options = {
      ignoreWhitespace: true,
      ignoreCase: false,
      minSimilarity: 0.8,
      maxBlockSize: 10000,
      enableSemanticAnalysis: false,
      ...options
    };
  }

  /**
   * 두 블록 집합 간의 차이 분석
   */
  async diff(originalBlocks: Block[], newBlocks: Block[]): Promise<DiffResult> {
    logger.info('블록 레벨 차이 분석 시작', '🔍');

    // 1. 블록 전처리
    const processedOriginal = this.preprocessBlocks(originalBlocks);
    const processedNew = this.preprocessBlocks(newBlocks);

    // 2. 블록 매칭
    const matchings = await this.matchBlocks(processedOriginal, processedNew);

    // 3. 차이 생성
    const diffs = this.generateDiffs(matchings, processedOriginal, processedNew);

    // 4. 통계 계산
    const stats = this.calculateStats(diffs, processedOriginal.length, processedNew.length);

    // 5. 동기화 액션 생성
    const syncActions = this.generateSyncActions(diffs);

    logger.info(`차이 분석 완료: ${diffs.length}개 변경사항`, '✅');

    return {
      diffs,
      stats,
      syncActions
    };
  }

  /**
   * 블록 전처리
   */
  private preprocessBlocks(blocks: Block[]): Block[] {
    return blocks.map((block, index) => {
      let content = block.content;

      // 공백 처리
      if (this.options.ignoreWhitespace) {
        content = content.trim().replace(/\s+/g, ' ');
      }

      // 대소문자 처리
      if (this.options.ignoreCase) {
        content = content.toLowerCase();
      }

      // 해시 생성
      const hash = this.generateBlockHash(content, block.type);

      return {
        ...block,
        content,
        order: index,
        metadata: {
          ...block.metadata,
          hash
        }
      };
    });
  }

  /**
   * 블록 매칭
   */
  private async matchBlocks(
    originalBlocks: Block[], 
    newBlocks: Block[]
  ): Promise<Map<string, string>> {
    const matchings = new Map<string, string>();

    // 1. 정확한 해시 매칭
    const originalByHash = new Map<string, Block>();
    const newByHash = new Map<string, Block>();

    for (const block of originalBlocks) {
      if (block.metadata?.hash) {
        originalByHash.set(block.metadata.hash, block);
      }
    }

    for (const block of newBlocks) {
      if (block.metadata?.hash) {
        newByHash.set(block.metadata.hash, block);
      }
    }

    // 정확한 해시 매칭
    for (const [hash, newBlock] of newByHash) {
      if (originalByHash.has(hash)) {
        const originalBlock = originalByHash.get(hash)!;
        matchings.set(originalBlock.id, newBlock.id);
        originalByHash.delete(hash);
        newByHash.delete(hash);
      }
    }

    // 2. 유사도 기반 매칭
    const unmatchedOriginal = Array.from(originalByHash.values());
    const unmatchedNew = Array.from(newByHash.values());

    if (unmatchedOriginal.length > 0 && unmatchedNew.length > 0) {
      await this.performSimilarityMatching(unmatchedOriginal, unmatchedNew, matchings);
    }

    return matchings;
  }

  /**
   * 유사도 기반 매칭
   */
  private async performSimilarityMatching(
    originalBlocks: Block[],
    newBlocks: Block[],
    matchings: Map<string, string>
  ): Promise<void> {
    const similarityMatrix: number[][] = [];

    // 유사도 행렬 계산
    for (let i = 0; i < originalBlocks.length; i++) {
      similarityMatrix[i] = [];
      for (let j = 0; j < newBlocks.length; j++) {
        const similarity = this.calculateBlockSimilarity(
          originalBlocks[i],
          newBlocks[j]
        );
        similarityMatrix[i][j] = similarity;
      }
    }

    // 최적 매칭 찾기 (Hungarian algorithm의 간단한 버전)
    const used = new Set<number>();
    
    for (let i = 0; i < originalBlocks.length; i++) {
      let bestMatch = -1;
      let bestSimilarity = this.options.minSimilarity || 0.8;

      for (let j = 0; j < newBlocks.length; j++) {
        if (!used.has(j) && similarityMatrix[i][j] > bestSimilarity) {
          bestMatch = j;
          bestSimilarity = similarityMatrix[i][j];
        }
      }

      if (bestMatch !== -1) {
        matchings.set(originalBlocks[i].id, newBlocks[bestMatch].id);
        used.add(bestMatch);
      }
    }
  }

  /**
   * 블록 유사도 계산
   */
  private calculateBlockSimilarity(block1: Block, block2: Block): number {
    // 타입이 다르면 낮은 점수
    if (block1.type !== block2.type) {
      return 0.1;
    }

    // 내용 유사도 (Levenshtein distance 기반)
    const contentSimilarity = this.calculateStringSimilarity(
      block1.content,
      block2.content
    );

    // 위치 유사도 (상대적 위치 비교)
    const positionSimilarity = this.calculatePositionSimilarity(
      block1.order,
      block2.order,
      Math.max(block1.order, block2.order)
    );

    // 가중 평균
    return (contentSimilarity * 0.8) + (positionSimilarity * 0.2);
  }

  /**
   * 문자열 유사도 계산 (Jaro-Winkler 유사도)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    const matchDistance = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
    const str1Matches = new Array(str1.length).fill(false);
    const str2Matches = new Array(str2.length).fill(false);

    let matches = 0;
    let transpositions = 0;

    // 매칭 찾기
    for (let i = 0; i < str1.length; i++) {
      const start = Math.max(0, i - matchDistance);
      const end = Math.min(i + matchDistance + 1, str2.length);

      for (let j = start; j < end; j++) {
        if (str2Matches[j] || str1[i] !== str2[j]) continue;
        str1Matches[i] = true;
        str2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0.0;

    // 전치 계산
    let k = 0;
    for (let i = 0; i < str1.length; i++) {
      if (!str1Matches[i]) continue;
      while (!str2Matches[k]) k++;
      if (str1[i] !== str2[k]) transpositions++;
      k++;
    }

    // Jaro 유사도
    const jaro = (matches / str1.length + 
                  matches / str2.length + 
                  (matches - transpositions / 2) / matches) / 3;

    // Winkler 접두어 보너스
    let prefix = 0;
    for (let i = 0; i < Math.min(str1.length, str2.length, 4); i++) {
      if (str1[i] === str2[i]) prefix++;
      else break;
    }

    return jaro + (0.1 * prefix * (1 - jaro));
  }

  /**
   * 위치 유사도 계산
   */
  private calculatePositionSimilarity(pos1: number, pos2: number, maxPos: number): number {
    if (maxPos === 0) return 1.0;
    const distance = Math.abs(pos1 - pos2);
    return Math.max(0, 1 - (distance / maxPos));
  }

  /**
   * 차이 생성
   */
  private generateDiffs(
    matchings: Map<string, string>,
    originalBlocks: Block[],
    newBlocks: Block[]
  ): BlockDiff[] {
    const diffs: BlockDiff[] = [];
    const matchedOriginal = new Set(matchings.keys());
    const matchedNew = new Set(matchings.values());

    // 삭제된 블록들
    for (const originalBlock of originalBlocks) {
      if (!matchedOriginal.has(originalBlock.id)) {
        diffs.push({
          type: 'removed',
          originalBlock,
          position: originalBlock.order,
          description: `블록 삭제: ${stringUtils.truncate(originalBlock.content, 50)}`,
          confidence: 1.0
        });
      }
    }

    // 추가된 블록들
    for (const newBlock of newBlocks) {
      if (!matchedNew.has(newBlock.id)) {
        diffs.push({
          type: 'added',
          newBlock,
          position: newBlock.order,
          description: `블록 추가: ${stringUtils.truncate(newBlock.content, 50)}`,
          confidence: 1.0
        });
      }
    }

    // 변경된 블록들
    for (const [originalId, newId] of matchings) {
      const originalBlock = originalBlocks.find(b => b.id === originalId);
      const newBlock = newBlocks.find(b => b.id === newId);

      if (originalBlock && newBlock) {
        // 내용 변경 확인
        if (originalBlock.content !== newBlock.content || 
            originalBlock.type !== newBlock.type) {
          const similarity = this.calculateBlockSimilarity(originalBlock, newBlock);
          
          diffs.push({
            type: 'modified',
            originalBlock,
            newBlock,
            position: newBlock.order,
            description: `블록 수정: ${stringUtils.truncate(originalBlock.content, 30)} → ${stringUtils.truncate(newBlock.content, 30)}`,
            confidence: similarity
          });
        }

        // 위치 변경 확인
        if (originalBlock.order !== newBlock.order) {
          diffs.push({
            type: 'moved',
            originalBlock,
            newBlock,
            position: newBlock.order,
            description: `블록 이동: 위치 ${originalBlock.order} → ${newBlock.order}`,
            confidence: 0.9
          });
        }
      }
    }

    // 순서 기준으로 정렬
    return diffs.sort((a, b) => a.position - b.position);
  }

  /**
   * 통계 계산
   */
  private calculateStats(diffs: BlockDiff[], originalCount: number, newCount: number): DiffStats {
    const stats: DiffStats = {
      added: 0,
      removed: 0,
      modified: 0,
      moved: 0,
      reordered: 0,
      changeRatio: 0
    };

    for (const diff of diffs) {
      switch (diff.type) {
        case 'added':
          stats.added++;
          break;
        case 'removed':
          stats.removed++;
          break;
        case 'modified':
          stats.modified++;
          break;
        case 'moved':
          stats.moved++;
          break;
        case 'reordered':
          stats.reordered++;
          break;
      }
    }

    // 변경률 계산
    const totalChanges = stats.added + stats.removed + stats.modified;
    const totalBlocks = Math.max(originalCount, newCount);
    stats.changeRatio = totalBlocks > 0 ? totalChanges / totalBlocks : 0;

    return stats;
  }

  /**
   * 동기화 액션 생성
   */
  private generateSyncActions(diffs: BlockDiff[]): SyncAction[] {
    const actions: SyncAction[] = [];
    let actionId = 0;

    for (const diff of diffs) {
      let action: SyncAction;

      switch (diff.type) {
        case 'added':
          action = {
            type: 'create',
            blockId: diff.newBlock!.id,
            data: diff.newBlock,
            priority: 1,
          };
          break;

        case 'removed':
          action = {
            type: 'delete',
            blockId: diff.originalBlock!.id,
            data: null,
            priority: 3,
          };
          break;

        case 'modified':
          action = {
            type: 'update',
            blockId: diff.newBlock!.id,
            data: {
              content: diff.newBlock!.content,
              type: diff.newBlock!.type,
              metadata: diff.newBlock!.metadata
            },
            priority: 2,
          };
          break;

        case 'moved':
          action = {
            type: 'move',
            blockId: diff.newBlock!.id,
            data: {
              newPosition: diff.newBlock!.order,
              oldPosition: diff.originalBlock!.order
            },
            priority: 4,
          };
          break;

        case 'reordered':
          action = {
            type: 'reorder',
            blockId: diff.newBlock!.id,
            data: {
              newOrder: diff.newBlock!.order
            },
            priority: 5,
          };
          break;

        default:
          continue;
      }

      actions.push(action);
    }

    // 우선순위 순으로 정렬
    return actions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 블록 해시 생성
   */
  private generateBlockHash(content: string, type: BlockType): string {
    const data = `${type}:${content}`;
    // 간단한 해시 함수 (실제로는 crypto.createHash를 사용해야 함)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32비트 정수로 변환
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * 차이 요약 생성
   */
  generateSummary(result: DiffResult): string {
    const { stats } = result;
    const parts = [];

    if (stats.added > 0) {
      parts.push(`${stats.added}개 블록 추가`);
    }
    if (stats.removed > 0) {
      parts.push(`${stats.removed}개 블록 삭제`);
    }
    if (stats.modified > 0) {
      parts.push(`${stats.modified}개 블록 수정`);
    }
    if (stats.moved > 0) {
      parts.push(`${stats.moved}개 블록 이동`);
    }

    if (parts.length === 0) {
      return '변경사항 없음';
    }

    const changePercent = Math.round(stats.changeRatio * 100);
    return `${parts.join(', ')} (변경률: ${changePercent}%)`;
  }

  /**
   * 설정 업데이트
   */
  updateOptions(newOptions: Partial<BlockDifferOptions>): void {
    Object.assign(this.options, newOptions);
  }

  /**
   * 현재 설정 조회
   */
  getOptions(): BlockDifferOptions {
    return { ...this.options };
  }
}

export interface BlockDifferOptions {
  /** 공백 무시 여부 */
  ignoreWhitespace?: boolean;
  /** 대소문자 무시 여부 */
  ignoreCase?: boolean;
  /** 최소 유사도 임계값 */
  minSimilarity?: number;
  /** 최대 블록 크기 (바이트) */
  maxBlockSize?: number;
  /** 의미론적 분석 활성화 */
  enableSemanticAnalysis?: boolean;
}

/**
 * 마크다운 블록 파서
 */
export class MarkdownBlockParser implements BlockParser {
  async parseFile(filePath: string): Promise<Block[]> {
    const content = readFileSync(filePath, 'utf8');
    return this.parseMarkdown(content);
  }

  parseMarkdown(content: string): Block[] {
    const blocks: Block[] = [];
    const lines = content.split('\n');
    let blockId = 0;

    let currentBlock: Partial<Block> | null = null;
    let currentContent: string[] = [];

    const finishCurrentBlock = () => {
      if (currentBlock) {
        blocks.push({
          id: `block_${blockId++}`,
          type: currentBlock.type || 'paragraph',
          content: currentContent.join('\n').trim(),
          order: blocks.length,
          metadata: {
            createdAt: new Date().toISOString(),
            lastModifiedAt: new Date().toISOString()
          }
        });
        currentBlock = null;
        currentContent = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // 빈 줄 처리
      if (trimmedLine === '') {
        if (currentContent.length > 0) {
          currentContent.push('');
        }
        continue;
      }

      let blockType: BlockType | null = null;

      // 블록 타입 감지
      if (trimmedLine.startsWith('# ')) {
        blockType = 'heading_1';
      } else if (trimmedLine.startsWith('## ')) {
        blockType = 'heading_2';
      } else if (trimmedLine.startsWith('### ')) {
        blockType = 'heading_3';
      } else if (trimmedLine.startsWith('```')) {
        blockType = 'code';
      } else if (trimmedLine.startsWith('> ')) {
        blockType = 'quote';
      } else if (trimmedLine.startsWith('- [ ]') || trimmedLine.startsWith('- [x]')) {
        blockType = 'to_do';
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        blockType = 'bulleted_list_item';
      } else if (/^\d+\.\s/.test(trimmedLine)) {
        blockType = 'numbered_list_item';
      } else if (trimmedLine === '---') {
        blockType = 'divider';
      }

      // 새 블록 시작
      if (blockType && (!currentBlock || currentBlock.type !== blockType)) {
        finishCurrentBlock();
        currentBlock = { type: blockType };
      }

      // 현재 블록이 없으면 paragraph로 시작
      if (!currentBlock) {
        currentBlock = { type: 'paragraph' };
      }

      currentContent.push(line);
    }

    // 마지막 블록 처리
    finishCurrentBlock();

    return blocks;
  }

  blocksToMarkdown(blocks: Block[]): string {
    return blocks.map(block => {
      switch (block.type) {
        case 'heading_1':
          return `# ${block.content.replace(/^# /, '')}`;
        case 'heading_2':
          return `## ${block.content.replace(/^## /, '')}`;
        case 'heading_3':
          return `### ${block.content.replace(/^### /, '')}`;
        case 'code':
          return block.content.startsWith('```') ? block.content : `\`\`\`\n${block.content}\n\`\`\``;
        case 'quote':
          return block.content.split('\n').map(line => `> ${line}`).join('\n');
        case 'divider':
          return '---';
        default:
          return block.content;
      }
    }).join('\n\n');
  }
}

export default BlockDiffer;