import { ChunkResult } from './ConversionTypes.js';

/**
 * Content chunking utility for handling Notion's size constraints
 * Handles 2000 character limit per block and 100 blocks per request
 */
export class ContentChunker {
  private static readonly DEFAULT_CHUNK_SIZE = 2000;
  private static readonly MAX_BLOCKS_PER_REQUEST = 100;

  /**
   * Chunk content respecting size limits and structure
   */
  chunkContent(content: string, maxSize: number = ContentChunker.DEFAULT_CHUNK_SIZE): ChunkResult {
    if (content.length <= maxSize) {
      return {
        chunks: [content],
        totalChunks: 1,
        metadata: {
          originalLength: content.length,
          averageChunkSize: content.length,
        },
      };
    }

    const chunks: string[] = [];
    let currentPosition = 0;

    while (currentPosition < content.length) {
      const chunk = this.extractChunk(content, currentPosition, maxSize);
      chunks.push(chunk.content);
      currentPosition = chunk.nextPosition;
    }

    return {
      chunks,
      totalChunks: chunks.length,
      metadata: {
        originalLength: content.length,
        averageChunkSize: Math.round(content.length / chunks.length),
      },
    };
  }

  /**
   * Chunk blocks array respecting Notion's 100 block limit
   */
  chunkBlocks(blocks: any[]): any[][] {
    if (blocks.length <= ContentChunker.MAX_BLOCKS_PER_REQUEST) {
      return [blocks];
    }

    const chunks: any[][] = [];
    for (let i = 0; i < blocks.length; i += ContentChunker.MAX_BLOCKS_PER_REQUEST) {
      chunks.push(blocks.slice(i, i + ContentChunker.MAX_BLOCKS_PER_REQUEST));
    }

    return chunks;
  }

  /**
   * Chunk markdown content preserving structure
   */
  chunkMarkdownContent(markdown: string, maxSize: number = ContentChunker.DEFAULT_CHUNK_SIZE): ChunkResult {
    const lines = markdown.split('\n');
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentSize = 0;

    for (const line of lines) {
      const lineLength = line.length + 1; // +1 for newline

      // If adding this line would exceed limit, finalize current chunk
      if (currentSize + lineLength > maxSize && currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
        currentChunk = [line];
        currentSize = lineLength;
      } else {
        currentChunk.push(line);
        currentSize += lineLength;
      }
    }

    // Add final chunk if it has content
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n'));
    }

    return {
      chunks,
      totalChunks: chunks.length,
      metadata: {
        originalLength: markdown.length,
        averageChunkSize: Math.round(markdown.length / chunks.length),
      },
    };
  }

  /**
   * Chunk code content preserving syntax
   */
  chunkCodeContent(code: string, maxSize: number = ContentChunker.DEFAULT_CHUNK_SIZE): ChunkResult {
    // Try to split on function/class boundaries first
    const structuralBreaks = this.findStructuralBreaks(code);
    
    if (structuralBreaks.length > 0) {
      return this.chunkByStructure(code, structuralBreaks, maxSize);
    }

    // Fallback to line-based chunking
    return this.chunkMarkdownContent(code, maxSize);
  }

  /**
   * Extract a single chunk from content
   */
  private extractChunk(content: string, startPos: number, maxSize: number): {
    content: string;
    nextPosition: number;
  } {
    if (startPos + maxSize >= content.length) {
      return {
        content: content.substring(startPos),
        nextPosition: content.length,
      };
    }

    // Find the best break point near the limit
    let endPos = startPos + maxSize;
    const searchWindow = Math.min(200, maxSize * 0.1); // 10% window for finding break

    // Look for natural break points in reverse order of preference
    const breakPoints = this.findBreakPoints(content, endPos - searchWindow, endPos);
    
    if (breakPoints.length > 0) {
      endPos = breakPoints[0]; // Use the best break point
    }

    return {
      content: content.substring(startPos, endPos),
      nextPosition: endPos,
    };
  }

  /**
   * Find good break points for text chunking
   */
  private findBreakPoints(content: string, start: number, end: number): number[] {
    const breakPoints: Array<{ pos: number; priority: number }> = [];

    // Search for break points in the window
    for (let i = start; i <= end && i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];
      const prevChar = content[i - 1];

      // Double newline (paragraph break) - highest priority
      if (char === '\n' && nextChar === '\n') {
        breakPoints.push({ pos: i + 2, priority: 1 });
      }
      // Single newline - high priority
      else if (char === '\n' && prevChar !== '\n') {
        breakPoints.push({ pos: i + 1, priority: 2 });
      }
      // Sentence end - medium priority
      else if ((char === '.' || char === '!' || char === '?') && nextChar === ' ') {
        breakPoints.push({ pos: i + 2, priority: 3 });
      }
      // Word boundary - low priority
      else if (char === ' ' && nextChar !== ' ') {
        breakPoints.push({ pos: i + 1, priority: 4 });
      }
    }

    // Sort by priority (lower number = higher priority) and return positions
    return breakPoints
      .sort((a, b) => a.priority - b.priority)
      .map(bp => bp.pos);
  }

  /**
   * Find structural breaks in code (functions, classes, etc.)
   */
  private findStructuralBreaks(code: string): number[] {
    const breaks: number[] = [];
    const lines = code.split('\n');
    let position = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Look for function/class/interface declarations
      if (this.isStructuralBreak(trimmed)) {
        breaks.push(position);
      }

      position += line.length + 1; // +1 for newline
    }

    return breaks;
  }

  /**
   * Check if a line represents a structural break
   */
  private isStructuralBreak(line: string): boolean {
    const patterns = [
      /^(export\s+)?(function|class|interface|type|const|let|var)\s+\w+/,
      /^(public|private|protected)\s+(function|class)/,
      /^\/\*\*/, // JSDoc comments
      /^\/\/\s*=+/, // Comment separators
      /^#\s+/, // Markdown headers
    ];

    return patterns.some(pattern => pattern.test(line));
  }

  /**
   * Chunk content by structural breaks
   */
  private chunkByStructure(content: string, breaks: number[], maxSize: number): ChunkResult {
    const chunks: string[] = [];
    let lastBreak = 0;

    for (const breakPoint of breaks) {
      const chunkContent = content.substring(lastBreak, breakPoint);
      
      if (chunkContent.length > maxSize) {
        // If chunk is still too large, fall back to regular chunking
        const subChunks = this.chunkContent(chunkContent, maxSize);
        chunks.push(...subChunks.chunks);
      } else {
        chunks.push(chunkContent);
      }
      
      lastBreak = breakPoint;
    }

    // Handle remaining content
    if (lastBreak < content.length) {
      const remaining = content.substring(lastBreak);
      if (remaining.length > maxSize) {
        const subChunks = this.chunkContent(remaining, maxSize);
        chunks.push(...subChunks.chunks);
      } else {
        chunks.push(remaining);
      }
    }

    return {
      chunks,
      totalChunks: chunks.length,
      metadata: {
        originalLength: content.length,
        averageChunkSize: Math.round(content.length / chunks.length),
      },
    };
  }

  /**
   * Estimate optimal chunk size based on content type
   */
  static estimateOptimalChunkSize(content: string, contentType: 'text' | 'code' | 'markdown' = 'text'): number {
    const baseSize = ContentChunker.DEFAULT_CHUNK_SIZE;
    
    switch (contentType) {
      case 'code':
        // Code benefits from larger chunks to preserve structure
        return Math.min(baseSize * 1.5, 3000);
      
      case 'markdown':
        // Markdown can be chunked more aggressively
        return Math.min(baseSize * 1.2, 2500);
      
      default:
        return baseSize;
    }
  }

  /**
   * Merge small chunks if they're under a threshold
   */
  optimizeChunks(chunks: string[], minSize: number = 500): string[] {
    if (chunks.length <= 1) return chunks;

    const optimized: string[] = [];
    let buffer = '';

    for (const chunk of chunks) {
      if (buffer.length + chunk.length <= ContentChunker.DEFAULT_CHUNK_SIZE) {
        buffer += (buffer ? '\n\n' : '') + chunk;
      } else {
        if (buffer) {
          optimized.push(buffer);
        }
        buffer = chunk;
      }
    }

    if (buffer) {
      optimized.push(buffer);
    }

    return optimized;
  }
}