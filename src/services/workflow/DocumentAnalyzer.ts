/**
 * Document analysis utilities
 * Handles content analysis, metadata extraction, and reporting
 */

import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import type { 
  DocumentFile,
  DocumentType,
  ContentTag,
  DOCUMENT_TYPE_MAPPING,
  CONTENT_TAGS
} from './WorkflowTypes.js';
import type { FrontMatterData } from '../../shared/types/index.js';

export class DocumentAnalyzer {

  /**
   * Infer document type from filename
   */
  static inferDocumentType(filename: string): DocumentType {
    const lower = filename.toLowerCase();
    
    for (const [key, value] of Object.entries(DOCUMENT_TYPE_MAPPING)) {
      if (lower.includes(key)) {
        return value;
      }
    }
    
    return 'Other';
  }

  /**
   * Infer content tags from filename and content
   */
  static inferTags(filename: string, content: string): ContentTag[] {
    const tags: ContentTag[] = [];
    const searchText = (filename.toLowerCase() + ' ' + content.toLowerCase());
    
    for (const [keyword, tag] of Object.entries(CONTENT_TAGS)) {
      if (searchText.includes(keyword)) {
        if (!tags.includes(tag)) {
          tags.push(tag);
        }
      }
    }
    
    return tags.length > 0 ? tags : ['Other'];
  }

  /**
   * Count words in content
   */
  static countWords(content: string): number {
    // Remove front-matter and markdown syntax
    const cleanContent = content
      .replace(/^---[\s\S]*?---/, '')
      .replace(/[#*`_~\[\]]/g, '');
    
    return cleanContent
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length;
  }

  /**
   * Calculate reading time in minutes
   */
  static calculateReadingTime(content: string): number {
    const wordCount = DocumentAnalyzer.countWords(content);
    return Math.ceil(wordCount / 200); // Assuming 200 words per minute
  }

  /**
   * Analyze document content for metadata extraction
   */
  static async analyzeDocument(filePath: string): Promise<{
    wordCount: number;
    readingTime: number;
    documentType: DocumentType;
    suggestedTags: ContentTag[];
    hasCodeBlocks: boolean;
    hasImages: boolean;
    hasTables: boolean;
    sections: string[];
    frontMatter: FrontMatterData;
  }> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const filename = path.basename(filePath);
      
      // Parse front-matter
      const parsed = matter(content);
      const bodyContent = parsed.content;
      
      const wordCount = DocumentAnalyzer.countWords(bodyContent);
      const readingTime = DocumentAnalyzer.calculateReadingTime(bodyContent);
      const documentType = DocumentAnalyzer.inferDocumentType(filename);
      const suggestedTags = DocumentAnalyzer.inferTags(filename, bodyContent);
      
      // Analyze content structure
      const hasCodeBlocks = /```/.test(bodyContent);
      const hasImages = /!\[.*?\]\(.*?\)/.test(bodyContent);
      const hasTables = /\|.*\|/.test(bodyContent);
      
      // Extract sections (headers)
      const sections = bodyContent
        .split('\n')
        .filter(line => line.trim().startsWith('#'))
        .map(line => line.replace(/^#+\s*/, '').trim())
        .filter(section => section.length > 0);

      return {
        wordCount,
        readingTime,
        documentType,
        suggestedTags,
        hasCodeBlocks,
        hasImages,
        hasTables,
        sections,
        frontMatter: parsed.data
      };
    } catch (error) {
      throw new Error(`Failed to analyze document ${filePath}: ${error}`);
    }
  }

  /**
   * Batch analyze multiple documents
   */
  static async batchAnalyzeDocuments(filePaths: string[]): Promise<Map<string, any>> {
    const results = new Map();
    
    await Promise.allSettled(
      filePaths.map(async (filePath) => {
        try {
          const analysis = await DocumentAnalyzer.analyzeDocument(filePath);
          results.set(filePath, analysis);
        } catch (error) {
          results.set(filePath, { error: error instanceof Error ? error.message : 'Unknown error' });
        }
      })
    );
    
    return results;
  }

  /**
   * Generate documentation summary report
   */
  static async generateDocumentationReport(documentFiles: DocumentFile[]): Promise<{
    totalDocs: number;
    totalWords: number;
    totalReadingTime: number;
    documentTypes: Map<DocumentType, number>;
    contentTags: Map<ContentTag, number>;
    largestDoc: { name: string; words: number } | null;
    averageWords: number;
    structureAnalysis: {
      docsWithCode: number;
      docsWithImages: number;
      docsWithTables: number;
      avgSections: number;
    };
  }> {
    let totalWords = 0;
    let totalReadingTime = 0;
    const documentTypes = new Map<DocumentType, number>();
    const contentTags = new Map<ContentTag, number>();
    let largestDoc: { name: string; words: number } | null = null;
    
    // Structure analysis counters
    let docsWithCode = 0;
    let docsWithImages = 0;
    let docsWithTables = 0;
    let totalSections = 0;

    for (const docFile of documentFiles) {
      try {
        const analysis = await DocumentAnalyzer.analyzeDocument(docFile.path);
        
        totalWords += analysis.wordCount;
        totalReadingTime += analysis.readingTime;
        totalSections += analysis.sections.length;
        
        // Track document types
        documentTypes.set(
          analysis.documentType,
          (documentTypes.get(analysis.documentType) || 0) + 1
        );
        
        // Track content tags
        analysis.suggestedTags.forEach(tag => {
          contentTags.set(tag, (contentTags.get(tag) || 0) + 1);
        });
        
        // Track largest document
        if (!largestDoc || analysis.wordCount > largestDoc.words) {
          largestDoc = { name: docFile.name, words: analysis.wordCount };
        }
        
        // Structure analysis
        if (analysis.hasCodeBlocks) docsWithCode++;
        if (analysis.hasImages) docsWithImages++;
        if (analysis.hasTables) docsWithTables++;
        
      } catch (error) {
        console.warn(`Failed to analyze ${docFile.name}: ${error}`);
      }
    }

    return {
      totalDocs: documentFiles.length,
      totalWords,
      totalReadingTime,
      documentTypes,
      contentTags,
      largestDoc,
      averageWords: documentFiles.length > 0 ? Math.round(totalWords / documentFiles.length) : 0,
      structureAnalysis: {
        docsWithCode,
        docsWithImages,
        docsWithTables,
        avgSections: documentFiles.length > 0 ? Math.round(totalSections / documentFiles.length) : 0
      }
    };
  }

  /**
   * Analyze content complexity
   */
  static analyzeComplexity(content: string): {
    complexity: 'simple' | 'moderate' | 'complex';
    factors: {
      wordCount: number;
      sentenceCount: number;
      avgWordsPerSentence: number;
      codeBlocks: number;
      links: number;
      lists: number;
    };
  } {
    const wordCount = DocumentAnalyzer.countWords(content);
    
    // Count sentences (rough approximation)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length;
    
    const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
    
    // Count structural elements
    const codeBlocks = (content.match(/```/g) || []).length / 2; // Pairs of ```
    const links = (content.match(/\[.*?\]\(.*?\)/g) || []).length;
    const lists = (content.match(/^\s*[-*+]\s/gm) || []).length;
    
    const factors = {
      wordCount,
      sentenceCount,
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
      codeBlocks: Math.floor(codeBlocks),
      links,
      lists
    };
    
    // Determine complexity
    let complexity: 'simple' | 'moderate' | 'complex';
    
    if (wordCount < 500 && codeBlocks <= 2 && links <= 5) {
      complexity = 'simple';
    } else if (wordCount < 2000 && codeBlocks <= 10 && avgWordsPerSentence < 25) {
      complexity = 'moderate';
    } else {
      complexity = 'complex';
    }
    
    return { complexity, factors };
  }

  /**
   * Extract key phrases from content
   */
  static extractKeyPhrases(content: string, maxPhrases: number = 10): string[] {
    // Remove front-matter, code blocks, and markdown syntax
    const cleanContent = content
      .replace(/^---[\s\S]*?---/, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[#*`_~\[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Simple key phrase extraction (this could be enhanced with NLP)
    const words = cleanContent
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !/^\d+$/.test(word))
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'will', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'more', 'very', 'what', 'know', 'just', 'first', 'into', 'over', 'think', 'also', 'back', 'after', 'would', 'good', 'year', 'work', 'well', 'want', 'through', 'when', 'come', 'could', 'them'].includes(word));
    
    // Count word frequency
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });
    
    // Sort by frequency and return top phrases
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxPhrases)
      .map(([word]) => word);
  }

  /**
   * Validate document structure
   */
  static validateDocumentStructure(content: string): {
    valid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // Check for basic structure
    if (!content.trim()) {
      issues.push('Document is empty');
      return { valid: false, issues, suggestions };
    }
    
    // Check for title/header
    if (!/^#\s/.test(content.trim())) {
      suggestions.push('Consider adding a main heading (# Title)');
    }
    
    // Check for sections
    const sections = (content.match(/^#+\s/gm) || []).length;
    if (sections === 0) {
      suggestions.push('Consider organizing content with headings');
    }
    
    // Check for unmatched code blocks
    const codeBlockMarkers = (content.match(/```/g) || []).length;
    if (codeBlockMarkers % 2 !== 0) {
      issues.push('Unmatched code block markers (```)');
    }
    
    // Check for broken links
    const links = content.match(/\[.*?\]\(.*?\)/g) || [];
    const brokenLinks = links.filter(link => {
      const urlMatch = link.match(/\((.*?)\)/);
      return urlMatch && !urlMatch[1].trim();
    });
    
    if (brokenLinks.length > 0) {
      issues.push(`${brokenLinks.length} broken links found`);
    }
    
    // Check line length
    const longLines = content.split('\n').filter(line => line.length > 120);
    if (longLines.length > content.split('\n').length * 0.2) {
      suggestions.push('Consider breaking up long lines for better readability');
    }
    
    return {
      valid: issues.length === 0,
      issues,
      suggestions
    };
  }
}