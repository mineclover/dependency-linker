/**
 * Context Assembly System - Document Management Service
 * Collects related documents for context engineering and analysis
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import { logger, ProjectDetector } from '../../shared/utils/index.js';
import type { 
  FileId, 
  RelativePath, 
  DependencyGraph,
  DocumentMetadata,
  DocumentLink 
} from '../../shared/types/index.js';

export interface ContextOptions {
  includePatterns: string[];
  excludePatterns: string[];
  maxDepth: number;
  maxFiles: number;
  followSymlinks: boolean;
  includeHidden: boolean;
  languages: string[];
  documentTypes: string[];
}

export interface ContextFile {
  id: FileId;
  path: string;
  relativePath: RelativePath;
  type: 'source' | 'documentation' | 'config' | 'test' | 'asset';
  language?: string;
  size: number;
  lastModified: Date;
  content?: string;
  summary?: string;
  dependencies: FileId[];
  dependents: FileId[];
  tags: string[];
  importance: number; // 0-1 scale
}

export interface ContextCluster {
  id: string;
  name: string;
  description: string;
  files: ContextFile[];
  relationships: Array<{
    from: FileId;
    to: FileId;
    type: 'imports' | 'references' | 'documents' | 'tests' | 'configures';
    strength: number; // 0-1 scale
  }>;
  centralFiles: FileId[]; // Most important files in cluster
  entryPoints: FileId[]; // Entry points to cluster
}

export interface AssemblyResult {
  projectInfo: {
    name: string;
    type: string;
    rootPath: string;
    totalFiles: number;
    languages: string[];
  };
  clusters: ContextCluster[];
  globalFiles: ContextFile[]; // Files that don't belong to specific clusters
  relationships: DocumentLink[];
  summary: {
    totalFiles: number;
    totalClusters: number;
    coveragePercentage: number;
    complexity: 'low' | 'medium' | 'high';
    recommendations: string[];
  };
}

export class ContextAssembler {
  private options: ContextOptions;
  private projectRoot: string;
  private fileCache = new Map<string, ContextFile>();

  constructor(projectRoot: string, options: Partial<ContextOptions> = {}) {
    this.projectRoot = projectRoot;
    this.options = {
      includePatterns: ['**/*.{ts,js,tsx,jsx,py,java,go,rs,cpp,c,h}', '**/*.md', '**/*.json', '**/*.yaml', '**/*.yml'],
      excludePatterns: ['node_modules/**', '.git/**', 'dist/**', 'build/**', 'coverage/**', '*.log'],
      maxDepth: 10,
      maxFiles: 1000,
      followSymlinks: false,
      includeHidden: false,
      languages: ['typescript', 'javascript', 'python', 'java', 'go', 'rust'],
      documentTypes: ['md', 'txt', 'rst', 'adoc'],
      ...options
    };
  }

  /**
   * Assemble complete project context
   */
  async assembleContext(): Promise<AssemblyResult> {
    logger.info('Starting context assembly...', '🔍');

    try {
      // Discover project info
      const detection = await ProjectDetector.autoDetectProject(this.projectRoot);
      const projectInfo = {
        name: detection.projectInfo?.name || 'Unknown Project',
        type: detection.projectInfo?.type || 'unknown',
        rootPath: this.projectRoot,
        totalFiles: 0,
        languages: []
      };

      // Discover and analyze files
      const allFiles = await this.discoverFiles();
      logger.info(`Discovered ${allFiles.length} files`, '📁');

      // Load file contents and analyze
      const contextFiles = await this.analyzeFiles(allFiles);
      logger.info(`Analyzed ${contextFiles.length} context files`, '📊');

      // Build dependency relationships
      const relationships = await this.buildRelationships(contextFiles);
      logger.info(`Built ${relationships.length} relationships`, '🔗');

      // Create clusters
      const clusters = await this.createClusters(contextFiles, relationships);
      logger.info(`Created ${clusters.length} clusters`, '🗂️');

      // Identify global files (not in clusters)
      const globalFiles = this.identifyGlobalFiles(contextFiles, clusters);

      // Update project info
      projectInfo.totalFiles = contextFiles.length;
      projectInfo.languages = [...new Set(contextFiles.map(f => f.language).filter(Boolean))];

      // Generate summary
      const summary = this.generateSummary(contextFiles, clusters, relationships);

      logger.success('Context assembly completed');

      return {
        projectInfo,
        clusters,
        globalFiles,
        relationships,
        summary
      };

    } catch (error) {
      logger.error(`Context assembly failed: ${error}`);
      throw error;
    }
  }

  /**
   * Get context for specific files or patterns
   */
  async getContextForFiles(targetFiles: string[], radius: number = 2): Promise<{
    targetFiles: ContextFile[];
    relatedFiles: ContextFile[];
    relationships: DocumentLink[];
    contextSummary: string;
  }> {
    logger.info(`Getting context for ${targetFiles.length} files with radius ${radius}`, '🎯');

    const contextFiles = new Set<string>();
    const relationships: DocumentLink[] = [];

    // Add target files
    for (const filePath of targetFiles) {
      contextFiles.add(filePath);
    }

    // Expand context based on radius
    for (let level = 0; level < radius; level++) {
      const currentFiles = Array.from(contextFiles);
      
      for (const filePath of currentFiles) {
        const file = await this.analyzeFile(filePath);
        if (file) {
          // Add dependencies and dependents
          for (const dep of file.dependencies) {
            const depFile = await this.findFileById(dep);
            if (depFile) {
              contextFiles.add(depFile.path);
              relationships.push({
                sourceFile: file.id,
                targetDocument: dep,
                linkType: 'reference'
              });
            }
          }

          for (const dependent of file.dependents) {
            const depFile = await this.findFileById(dependent);
            if (depFile) {
              contextFiles.add(depFile.path);
              relationships.push({
                sourceFile: dependent,
                targetDocument: file.id,
                linkType: 'reference'
              });
            }
          }
        }
      }
    }

    // Load all context files
    const allContextFiles = await Promise.all(
      Array.from(contextFiles).map(filePath => this.analyzeFile(filePath))
    );

    const validContextFiles = allContextFiles.filter(Boolean) as ContextFile[];
    const targetContextFiles = validContextFiles.filter(f => targetFiles.includes(f.path));
    const relatedContextFiles = validContextFiles.filter(f => !targetFiles.includes(f.path));

    // Generate context summary
    const contextSummary = this.generateContextSummary(validContextFiles, relationships);

    return {
      targetFiles: targetContextFiles,
      relatedFiles: relatedContextFiles,
      relationships,
      contextSummary
    };
  }

  private async discoverFiles(): Promise<string[]> {
    const allFiles: string[] = [];

    for (const pattern of this.options.includePatterns) {
      try {
        const files = await glob(pattern, {
          cwd: this.projectRoot,
          absolute: false,
          ignore: this.options.excludePatterns,
          dot: this.options.includeHidden,
          followSymbolicLinks: this.options.followSymlinks,
          maxDepth: this.options.maxDepth
        });

        allFiles.push(...files);
      } catch (error) {
        logger.warning(`Failed to glob pattern ${pattern}: ${error}`);
      }
    }

    // Remove duplicates and limit
    const uniqueFiles = [...new Set(allFiles)];
    return uniqueFiles.slice(0, this.options.maxFiles);
  }

  private async analyzeFiles(filePaths: string[]): Promise<ContextFile[]> {
    const contextFiles: ContextFile[] = [];

    for (const filePath of filePaths) {
      try {
        const file = await this.analyzeFile(filePath);
        if (file) {
          contextFiles.push(file);
          this.fileCache.set(filePath, file);
        }
      } catch (error) {
        logger.debug(`Failed to analyze file ${filePath}: ${error}`);
      }
    }

    return contextFiles;
  }

  private async analyzeFile(filePath: string): Promise<ContextFile | null> {
    // Check cache first
    if (this.fileCache.has(filePath)) {
      return this.fileCache.get(filePath)!;
    }

    try {
      const fullPath = path.resolve(this.projectRoot, filePath);
      const stats = await fs.stat(fullPath);
      
      if (!stats.isFile() || stats.size > 1024 * 1024) { // Skip files > 1MB
        return null;
      }

      const extension = path.extname(filePath).toLowerCase();
      const language = this.detectLanguage(extension);
      const type = this.detectFileType(filePath, extension);
      
      let content: string | undefined;
      let summary: string | undefined;
      
      // Read content for text files
      if (this.isTextFile(extension)) {
        try {
          content = await fs.readFile(fullPath, 'utf-8');
          summary = this.generateFileSummary(content, type);
        } catch (error) {
          logger.debug(`Failed to read file ${filePath}: ${error}`);
        }
      }

      const file: ContextFile = {
        id: this.generateFileId(filePath),
        path: fullPath,
        relativePath: filePath,
        type,
        language,
        size: stats.size,
        lastModified: stats.mtime,
        content,
        summary,
        dependencies: [],
        dependents: [],
        tags: this.generateTags(filePath, content),
        importance: this.calculateImportance(filePath, type, stats.size)
      };

      // Analyze dependencies for source files
      if (type === 'source' && content) {
        file.dependencies = await this.extractDependencies(content, language || 'unknown');
      }

      return file;

    } catch (error) {
      logger.debug(`Failed to analyze file ${filePath}: ${error}`);
      return null;
    }
  }

  private detectLanguage(extension: string): string | undefined {
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin'
    };

    return languageMap[extension];
  }

  private detectFileType(filePath: string, extension: string): ContextFile['type'] {
    const fileName = path.basename(filePath).toLowerCase();
    
    if (fileName.includes('test') || fileName.includes('spec') || filePath.includes('test/') || filePath.includes('__tests__/')) {
      return 'test';
    }
    
    if (extension === '.md' || extension === '.txt' || extension === '.rst') {
      return 'documentation';
    }
    
    if (['.json', '.yaml', '.yml', '.toml', '.ini', '.env'].includes(extension)) {
      return 'config';
    }
    
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'].includes(extension)) {
      return 'asset';
    }
    
    return 'source';
  }

  private isTextFile(extension: string): boolean {
    const textExtensions = [
      '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs',
      '.cpp', '.c', '.h', '.php', '.rb', '.swift', '.kt',
      '.md', '.txt', '.rst', '.json', '.yaml', '.yml', '.toml',
      '.html', '.css', '.scss', '.less', '.xml', '.sql'
    ];
    
    return textExtensions.includes(extension);
  }

  private generateFileId(filePath: string): FileId {
    // Create consistent file ID based on relative path
    return Buffer.from(filePath).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  private generateFileSummary(content: string, type: ContextFile['type']): string {
    const lines = content.split('\n');
    const firstFewLines = lines.slice(0, 5).join('\n');
    
    if (type === 'documentation') {
      // Extract title and first paragraph
      const titleMatch = firstFewLines.match(/^#\s+(.+)$/m);
      const title = titleMatch?.[1] || 'Untitled Document';
      return `${title}: ${firstFewLines.substring(0, 200)}...`;
    }
    
    if (type === 'source') {
      // Extract exports, classes, functions
      const exports = content.match(/export\s+(class|function|const|let|var|interface|type)\s+(\w+)/g) || [];
      const summary = exports.length > 0 
        ? `Exports: ${exports.map(e => e.split(/\s+/).pop()).join(', ')}`
        : 'Source file';
      return `${summary} (${lines.length} lines)`;
    }
    
    return `${type} file (${lines.length} lines)`;
  }

  private generateTags(filePath: string, content?: string): string[] {
    const tags: string[] = [];
    const fileName = path.basename(filePath);
    const dirName = path.dirname(filePath);
    
    // Add directory-based tags
    const pathParts = dirName.split('/').filter(p => p && p !== '.');
    tags.push(...pathParts.slice(-2)); // Last 2 directory levels
    
    // Add file-based tags
    if (fileName.includes('test')) tags.push('test');
    if (fileName.includes('spec')) tags.push('spec');
    if (fileName.includes('config')) tags.push('config');
    if (fileName.includes('util')) tags.push('utility');
    if (fileName.includes('helper')) tags.push('helper');
    if (fileName.includes('component')) tags.push('component');
    if (fileName.includes('service')) tags.push('service');
    if (fileName.includes('api')) tags.push('api');
    
    // Add content-based tags
    if (content) {
      if (content.includes('React') || content.includes('jsx')) tags.push('react');
      if (content.includes('Vue')) tags.push('vue');
      if (content.includes('Angular')) tags.push('angular');
      if (content.includes('express') || content.includes('fastify')) tags.push('server');
      if (content.includes('database') || content.includes('sql')) tags.push('database');
      if (content.includes('test') || content.includes('describe') || content.includes('it(')) tags.push('test');
    }
    
    return [...new Set(tags)];
  }

  private calculateImportance(filePath: string, type: ContextFile['type'], size: number): number {
    let importance = 0.5; // Base importance
    
    // Type-based importance
    switch (type) {
      case 'source': importance += 0.3; break;
      case 'documentation': importance += 0.2; break;
      case 'config': importance += 0.1; break;
      case 'test': importance += 0.1; break;
      default: importance += 0.0;
    }
    
    // File name patterns
    const fileName = path.basename(filePath).toLowerCase();
    if (fileName.includes('index') || fileName.includes('main') || fileName.includes('app')) {
      importance += 0.2;
    }
    if (fileName.includes('readme')) importance += 0.2;
    if (fileName.includes('package.json')) importance += 0.3;
    if (fileName.includes('tsconfig') || fileName.includes('webpack') || fileName.includes('vite.config')) {
      importance += 0.1;
    }
    
    // Size-based importance (moderate size files are often more important)
    const sizeKb = size / 1024;
    if (sizeKb > 1 && sizeKb < 50) importance += 0.1;
    if (sizeKb > 50) importance -= 0.1;
    
    return Math.min(1.0, Math.max(0.0, importance));
  }

  private async extractDependencies(content: string, language: string): Promise<FileId[]> {
    const dependencies: string[] = [];
    
    // Extract import/require statements based on language
    switch (language) {
      case 'typescript':
      case 'javascript':
        // ES6 imports
        const importMatches = content.match(/import\s+.*\s+from\s+['"`]([^'"`]+)['"`]/g) || [];
        dependencies.push(...importMatches.map(m => m.match(/['"`]([^'"`]+)['"`]/)![1]));
        
        // CommonJS requires
        const requireMatches = content.match(/require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g) || [];
        dependencies.push(...requireMatches.map(m => m.match(/['"`]([^'"`]+)['"`]/)![1]));
        break;
        
      case 'python':
        // Python imports
        const pythonImports = content.match(/(import|from)\s+(\w+(?:\.\w+)*)/g) || [];
        dependencies.push(...pythonImports.map(m => m.split(/\s+/).pop()!));
        break;
    }
    
    // Convert relative paths to file IDs
    const fileIds: FileId[] = [];
    for (const dep of dependencies) {
      if (dep.startsWith('.')) {
        // Relative import - try to resolve
        const resolvedPath = this.resolveRelativeImport(dep, language);
        if (resolvedPath) {
          fileIds.push(this.generateFileId(resolvedPath));
        }
      }
    }
    
    return fileIds;
  }

  private resolveRelativeImport(importPath: string, language: string): string | null {
    // This is a simplified resolver - in practice, you'd want to handle
    // tsconfig paths, node_modules resolution, etc.
    const extensions = language === 'typescript' ? ['.ts', '.tsx', '.js'] : ['.js', '.jsx'];
    
    for (const ext of extensions) {
      const candidatePath = importPath + ext;
      // In a real implementation, you'd check if this file exists
      return candidatePath;
    }
    
    return null;
  }

  private async buildRelationships(files: ContextFile[]): Promise<DocumentLink[]> {
    const relationships: DocumentLink[] = [];
    
    // Build dependency relationships
    for (const file of files) {
      for (const depId of file.dependencies) {
        const targetFile = files.find(f => f.id === depId);
        if (targetFile) {
          relationships.push({
            sourceFile: file.id,
            targetDocument: depId,
            linkType: 'reference'
          });
          
          // Add reverse relationship
          if (!targetFile.dependents.includes(file.id)) {
            targetFile.dependents.push(file.id);
          }
        }
      }
    }
    
    return relationships;
  }

  private async createClusters(files: ContextFile[], relationships: DocumentLink[]): Promise<ContextCluster[]> {
    // Simple clustering based on directory structure and relationships
    const clusters: ContextCluster[] = [];
    const clusteredFiles = new Set<FileId>();
    
    // Group by directory
    const dirGroups = new Map<string, ContextFile[]>();
    
    for (const file of files) {
      const dir = path.dirname(file.relativePath);
      const topLevelDir = dir.split('/')[0];
      
      if (!dirGroups.has(topLevelDir)) {
        dirGroups.set(topLevelDir, []);
      }
      dirGroups.get(topLevelDir)!.push(file);
    }
    
    // Create clusters from directory groups
    for (const [dirName, dirFiles] of dirGroups) {
      if (dirFiles.length > 1) {
        const clusterRelationships = relationships.filter(rel =>
          dirFiles.some(f => f.id === rel.sourceFile) &&
          dirFiles.some(f => f.id === rel.targetDocument)
        );
        
        const cluster: ContextCluster = {
          id: `cluster_${dirName}`,
          name: dirName.charAt(0).toUpperCase() + dirName.slice(1),
          description: `Files in ${dirName} directory`,
          files: dirFiles,
          relationships: clusterRelationships.map(rel => ({
            from: rel.sourceFile,
            to: rel.targetDocument,
            type: rel.linkType as any,
            strength: 0.8
          })),
          centralFiles: this.findCentralFiles(dirFiles, clusterRelationships),
          entryPoints: this.findEntryPoints(dirFiles)
        };
        
        clusters.push(cluster);
        dirFiles.forEach(f => clusteredFiles.add(f.id));
      }
    }
    
    return clusters;
  }

  private findCentralFiles(files: ContextFile[], relationships: DocumentLink[]): FileId[] {
    const connectionCounts = new Map<FileId, number>();
    
    for (const file of files) {
      connectionCounts.set(file.id, 0);
    }
    
    for (const rel of relationships) {
      connectionCounts.set(rel.sourceFile, (connectionCounts.get(rel.sourceFile) || 0) + 1);
      connectionCounts.set(rel.targetDocument, (connectionCounts.get(rel.targetDocument) || 0) + 1);
    }
    
    return Array.from(connectionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([fileId]) => fileId);
  }

  private findEntryPoints(files: ContextFile[]): FileId[] {
    return files
      .filter(f => 
        f.relativePath.includes('index') || 
        f.relativePath.includes('main') ||
        f.importance > 0.8
      )
      .map(f => f.id);
  }

  private identifyGlobalFiles(files: ContextFile[], clusters: ContextCluster[]): ContextFile[] {
    const clusteredFileIds = new Set<FileId>();
    
    for (const cluster of clusters) {
      cluster.files.forEach(f => clusteredFileIds.add(f.id));
    }
    
    return files.filter(f => !clusteredFileIds.has(f.id));
  }

  private generateSummary(files: ContextFile[], clusters: ContextCluster[], relationships: DocumentLink[]) {
    const totalFiles = files.length;
    const clusteredFiles = clusters.reduce((acc, cluster) => acc + cluster.files.length, 0);
    const coveragePercentage = totalFiles > 0 ? (clusteredFiles / totalFiles) * 100 : 0;
    
    let complexity: 'low' | 'medium' | 'high' = 'low';
    if (totalFiles > 100 || clusters.length > 10 || relationships.length > 200) {
      complexity = 'high';
    } else if (totalFiles > 30 || clusters.length > 5 || relationships.length > 50) {
      complexity = 'medium';
    }
    
    const recommendations: string[] = [];
    
    if (coveragePercentage < 70) {
      recommendations.push('Consider reorganizing files into clearer directory structures');
    }
    
    if (clusters.some(c => c.files.length > 20)) {
      recommendations.push('Some clusters are very large - consider breaking them down');
    }
    
    if (relationships.length < files.length * 0.5) {
      recommendations.push('Low connectivity detected - consider adding more explicit relationships');
    }
    
    return {
      totalFiles,
      totalClusters: clusters.length,
      coveragePercentage: Math.round(coveragePercentage),
      complexity,
      recommendations
    };
  }

  private generateContextSummary(files: ContextFile[], relationships: DocumentLink[]): string {
    const fileTypes = files.reduce((acc, f) => {
      acc[f.type] = (acc[f.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const languages = [...new Set(files.map(f => f.language).filter(Boolean))];
    
    let summary = `Context includes ${files.length} files: `;
    summary += Object.entries(fileTypes).map(([type, count]) => `${count} ${type}`).join(', ');
    summary += `. Languages: ${languages.join(', ')}.`;
    summary += ` Relationships: ${relationships.length} connections between files.`;
    
    return summary;
  }

  private async findFileById(fileId: FileId): Promise<ContextFile | null> {
    for (const [, file] of this.fileCache) {
      if (file.id === fileId) {
        return file;
      }
    }
    return null;
  }
}