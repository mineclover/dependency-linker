/**
 * Temporary MD File Manager
 * 임시 마크다운 파일 워크플로우 관리
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { logger, pathUtils, stringUtils } from '../../shared/utils/index.js';

export interface TempFileOptions {
  /** 파일 접두사 */
  prefix?: string;
  /** 파일 확장자 (기본: .md) */
  extension?: string;
  /** 자동 삭제 시간 (밀리초, 기본: 1시간) */
  autoDeleteAfter?: number;
  /** 백업 생성 여부 */
  createBackup?: boolean;
  /** 메타데이터 저장 여부 */
  includeMetadata?: boolean;
}

export interface TempFileMetadata {
  /** 생성 시간 */
  createdAt: string;
  /** 마지막 수정 시간 */
  modifiedAt: string;
  /** 생성 목적 */
  purpose: string;
  /** 연관된 프로젝트 파일들 */
  relatedFiles: string[];
  /** 태그 */
  tags: string[];
  /** 자동 삭제 예정 시간 */
  expiresAt?: string;
}

export interface TempWorkflowResult {
  /** 임시 파일 경로 */
  tempFilePath: string;
  /** 원본 파일 경로들 */
  sourceFiles: string[];
  /** 생성된 콘텐츠 */
  content: string;
  /** 메타데이터 */
  metadata: TempFileMetadata;
}

export interface WorkflowTemplate {
  /** 템플릿 이름 */
  name: string;
  /** 템플릿 설명 */
  description: string;
  /** 마크다운 템플릿 */
  template: string;
  /** 필수 변수들 */
  requiredVariables: string[];
  /** 옵션 변수들 */
  optionalVariables: string[];
}

/**
 * 임시 MD 파일 워크플로우 관리자
 */
export class TempFileManager {
  private readonly tempDir: string;
  private readonly metadataDir: string;
  private readonly templates: Map<string, WorkflowTemplate> = new Map();
  
  constructor(
    private readonly projectRoot: string,
    private readonly options: TempFileOptions = {}
  ) {
    this.tempDir = join(projectRoot, '.deplink', 'temp');
    this.metadataDir = join(projectRoot, '.deplink', 'metadata');
    
    this.ensureDirectories();
    this.initializeTemplates();
    this.startCleanupTimer();
  }

  /**
   * 필요한 디렉토리 생성
   */
  private ensureDirectories(): void {
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }
    if (!existsSync(this.metadataDir)) {
      mkdirSync(this.metadataDir, { recursive: true });
    }
  }

  /**
   * 기본 템플릿 초기화
   */
  private initializeTemplates(): void {
    const defaultTemplates: WorkflowTemplate[] = [
      {
        name: 'context-analysis',
        description: '컨텍스트 분석 템플릿',
        template: `# Context Analysis: {{title}}

## Overview
{{overview}}

## Source Files
{{#each sourceFiles}}
- {{this}}
{{/each}}

## Dependencies
{{dependencies}}

## Key Components
{{components}}

## Analysis Results
{{analysis}}

## Recommendations
{{recommendations}}

---
*Generated on {{timestamp}}*
`,
        requiredVariables: ['title', 'sourceFiles'],
        optionalVariables: ['overview', 'dependencies', 'components', 'analysis', 'recommendations']
      },
      {
        name: 'feature-spec',
        description: '기능 명세 템플릿',
        template: `# Feature Specification: {{title}}

## Description
{{description}}

## Requirements
{{requirements}}

## Implementation Files
{{#each implementationFiles}}
- {{this}}
{{/each}}

## API Design
{{apiDesign}}

## Testing Strategy
{{testingStrategy}}

## Documentation Updates
{{documentation}}

---
*Created on {{timestamp}}*
`,
        requiredVariables: ['title', 'description'],
        optionalVariables: ['requirements', 'implementationFiles', 'apiDesign', 'testingStrategy', 'documentation']
      },
      {
        name: 'refactoring-plan',
        description: '리팩토링 계획 템플릿',
        template: `# Refactoring Plan: {{title}}

## Current State
{{currentState}}

## Target State
{{targetState}}

## Files to Modify
{{#each filesToModify}}
- {{this}}
{{/each}}

## Breaking Changes
{{breakingChanges}}

## Migration Strategy
{{migrationStrategy}}

## Testing Plan
{{testingPlan}}

## Rollback Plan
{{rollbackPlan}}

---
*Planned on {{timestamp}}*
`,
        requiredVariables: ['title', 'currentState', 'targetState'],
        optionalVariables: ['filesToModify', 'breakingChanges', 'migrationStrategy', 'testingPlan', 'rollbackPlan']
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.name, template);
    });
  }

  /**
   * 정리 타이머 시작
   */
  private startCleanupTimer(): void {
    // 1시간마다 정리 작업 실행
    setInterval(() => {
      this.cleanupExpiredFiles();
    }, 60 * 60 * 1000);
  }

  /**
   * 임시 파일 생성
   */
  async createTempFile(
    content: string,
    purpose: string,
    relatedFiles: string[] = [],
    options: Partial<TempFileOptions> = {}
  ): Promise<TempWorkflowResult> {
    const mergedOptions = { ...this.options, ...options };
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const prefix = mergedOptions.prefix || 'temp';
    const extension = mergedOptions.extension || '.md';
    
    const filename = `${prefix}-${timestamp}${extension}`;
    const tempFilePath = join(this.tempDir, filename);

    // 메타데이터 생성
    const metadata: TempFileMetadata = {
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      purpose,
      relatedFiles,
      tags: [],
      expiresAt: mergedOptions.autoDeleteAfter 
        ? new Date(Date.now() + mergedOptions.autoDeleteAfter).toISOString()
        : undefined
    };

    // 메타데이터가 포함된 콘텐츠 생성
    let finalContent = content;
    if (mergedOptions.includeMetadata) {
      const metadataYaml = this.generateMetadataYaml(metadata);
      finalContent = `---\n${metadataYaml}\n---\n\n${content}`;
    }

    // 파일 작성
    writeFileSync(tempFilePath, finalContent, 'utf8');

    // 메타데이터 파일 저장
    const metadataPath = join(this.metadataDir, `${filename}.json`);
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

    // 백업 생성
    if (mergedOptions.createBackup) {
      await this.createBackup(tempFilePath, content);
    }

    logger.info(`임시 파일 생성: ${filename}`, '📄');

    return {
      tempFilePath,
      sourceFiles: relatedFiles,
      content: finalContent,
      metadata
    };
  }

  /**
   * 템플릿 기반 임시 파일 생성
   */
  async createFromTemplate(
    templateName: string,
    variables: Record<string, any>,
    purpose: string,
    relatedFiles: string[] = []
  ): Promise<TempWorkflowResult> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`템플릿을 찾을 수 없습니다: ${templateName}`);
    }

    // 필수 변수 검증
    const missingVariables = template.requiredVariables.filter(
      variable => !(variable in variables)
    );
    
    if (missingVariables.length > 0) {
      throw new Error(`필수 변수가 누락되었습니다: ${missingVariables.join(', ')}`);
    }

    // 템플릿 변수 치환
    const content = this.processTemplate(template.template, {
      ...variables,
      timestamp: new Date().toISOString()
    });

    return this.createTempFile(content, purpose, relatedFiles, {
      prefix: templateName,
      includeMetadata: true
    });
  }

  /**
   * 컨텍스트 분석 워크플로우
   */
  async createContextAnalysis(
    title: string,
    sourceFiles: string[],
    analysis: string,
    overview?: string
  ): Promise<TempWorkflowResult> {
    const dependencies = await this.analyzeDependencies(sourceFiles);
    const components = await this.extractComponents(sourceFiles);

    return this.createFromTemplate('context-analysis', {
      title,
      sourceFiles,
      analysis,
      overview: overview || '컨텍스트 분석 문서',
      dependencies,
      components,
      recommendations: this.generateRecommendations(analysis)
    }, `컨텍스트 분석: ${title}`, sourceFiles);
  }

  /**
   * 기능 명세 워크플로우
   */
  async createFeatureSpec(
    title: string,
    description: string,
    implementationFiles: string[],
    requirements?: string
  ): Promise<TempWorkflowResult> {
    return this.createFromTemplate('feature-spec', {
      title,
      description,
      implementationFiles,
      requirements: requirements || '요구사항 정의 필요',
      apiDesign: 'API 설계 예정',
      testingStrategy: '테스트 전략 수립 필요',
      documentation: '문서 업데이트 계획'
    }, `기능 명세: ${title}`, implementationFiles);
  }

  /**
   * 리팩토링 계획 워크플로우
   */
  async createRefactoringPlan(
    title: string,
    currentState: string,
    targetState: string,
    filesToModify: string[]
  ): Promise<TempWorkflowResult> {
    return this.createFromTemplate('refactoring-plan', {
      title,
      currentState,
      targetState,
      filesToModify,
      breakingChanges: '호환성 영향 분석 필요',
      migrationStrategy: '단계별 마이그레이션 계획',
      testingPlan: '테스트 계획 수립',
      rollbackPlan: '롤백 전략 준비'
    }, `리팩토링 계획: ${title}`, filesToModify);
  }

  /**
   * 임시 파일 목록 조회
   */
  listTempFiles(): Array<{
    filename: string;
    path: string;
    metadata: TempFileMetadata;
    size: number;
    age: number;
  }> {
    const files = readdirSync(this.tempDir)
      .filter(file => !file.startsWith('.'))
      .map(filename => {
        const filePath = join(this.tempDir, filename);
        const metadataPath = join(this.metadataDir, `${filename}.json`);
        
        let metadata: TempFileMetadata;
        try {
          metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
        } catch {
          // 메타데이터 파일이 없거나 손상된 경우 기본값 사용
          const stat = statSync(filePath);
          metadata = {
            createdAt: stat.birthtime.toISOString(),
            modifiedAt: stat.mtime.toISOString(),
            purpose: 'Unknown',
            relatedFiles: [],
            tags: []
          };
        }

        const stat = statSync(filePath);
        const age = Date.now() - stat.birthtime.getTime();

        return {
          filename,
          path: filePath,
          metadata,
          size: stat.size,
          age
        };
      })
      .sort((a, b) => b.metadata.createdAt.localeCompare(a.metadata.createdAt));

    return files;
  }

  /**
   * 임시 파일 삭제
   */
  deleteTempFile(filename: string): boolean {
    const filePath = join(this.tempDir, filename);
    const metadataPath = join(this.metadataDir, `${filename}.json`);

    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
      if (existsSync(metadataPath)) {
        unlinkSync(metadataPath);
      }
      
      logger.info(`임시 파일 삭제: ${filename}`, '🗑️');
      return true;
    } catch (error) {
      logger.error(`임시 파일 삭제 실패: ${filename} - ${error}`);
      return false;
    }
  }

  /**
   * 만료된 파일 정리
   */
  cleanupExpiredFiles(): number {
    const now = new Date();
    const files = this.listTempFiles();
    let cleanedCount = 0;

    for (const file of files) {
      let shouldDelete = false;

      // 만료 시간 확인
      if (file.metadata.expiresAt) {
        const expiresAt = new Date(file.metadata.expiresAt);
        if (now > expiresAt) {
          shouldDelete = true;
        }
      }

      // 기본 자동 삭제 시간 (1시간) 확인
      const autoDeleteAfter = this.options.autoDeleteAfter || (60 * 60 * 1000);
      if (file.age > autoDeleteAfter) {
        shouldDelete = true;
      }

      if (shouldDelete) {
        this.deleteTempFile(file.filename);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`만료된 임시 파일 ${cleanedCount}개 삭제 완료`, '🧹');
    }

    return cleanedCount;
  }

  /**
   * 백업 생성
   */
  private async createBackup(filePath: string, content: string): Promise<void> {
    const backupDir = join(dirname(filePath), 'backups');
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    const filename = basename(filePath, extname(filePath));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(backupDir, `${filename}-${timestamp}.bak`);

    writeFileSync(backupPath, content, 'utf8');
  }

  /**
   * 메타데이터 YAML 생성
   */
  private generateMetadataYaml(metadata: TempFileMetadata): string {
    const yamlLines = [
      `created_at: "${metadata.createdAt}"`,
      `modified_at: "${metadata.modifiedAt}"`,
      `purpose: "${metadata.purpose}"`,
      `related_files:`
    ];

    metadata.relatedFiles.forEach(file => {
      yamlLines.push(`  - "${file}"`);
    });

    yamlLines.push(`tags:`);
    metadata.tags.forEach(tag => {
      yamlLines.push(`  - "${tag}"`);
    });

    if (metadata.expiresAt) {
      yamlLines.push(`expires_at: "${metadata.expiresAt}"`);
    }

    return yamlLines.join('\n');
  }

  /**
   * 템플릿 처리
   */
  private processTemplate(template: string, variables: Record<string, any>): string {
    let result = template;

    // 단순 변수 치환
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }

    // 배열 처리 (each 헬퍼)
    result = result.replace(/{{#each (\w+)}}([\s\S]*?){{\/each}}/g, (match, arrayName, template) => {
      const array = variables[arrayName];
      if (!Array.isArray(array)) {
        return '';
      }

      return array.map(item => {
        return template.replace(/{{this}}/g, String(item));
      }).join('');
    });

    return result;
  }

  /**
   * 의존성 분석
   */
  private async analyzeDependencies(sourceFiles: string[]): Promise<string> {
    const dependencies = new Set<string>();

    for (const filePath of sourceFiles) {
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf8');
        
        // import 문 추출
        const importMatches = content.match(/import.*?from\s+['"]([^'"]+)['"]/g) || [];
        importMatches.forEach(match => {
          const moduleMatch = match.match(/from\s+['"]([^'"]+)['"]/);
          if (moduleMatch) {
            dependencies.add(moduleMatch[1]);
          }
        });

        // require 문 추출
        const requireMatches = content.match(/require\(['"]([^'"]+)['"]\)/g) || [];
        requireMatches.forEach(match => {
          const moduleMatch = match.match(/require\(['"]([^'"]+)['"]\)/);
          if (moduleMatch) {
            dependencies.add(moduleMatch[1]);
          }
        });
      }
    }

    return Array.from(dependencies).map(dep => `- ${dep}`).join('\n');
  }

  /**
   * 컴포넌트 추출
   */
  private async extractComponents(sourceFiles: string[]): Promise<string> {
    const components = new Set<string>();

    for (const filePath of sourceFiles) {
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf8');
        
        // 클래스명 추출
        const classMatches = content.match(/class\s+(\w+)/g) || [];
        classMatches.forEach(match => {
          const className = match.replace('class ', '');
          components.add(`Class: ${className}`);
        });

        // 함수명 추출
        const functionMatches = content.match(/function\s+(\w+)/g) || [];
        functionMatches.forEach(match => {
          const functionName = match.replace('function ', '');
          components.add(`Function: ${functionName}`);
        });

        // export 문 추출
        const exportMatches = content.match(/export\s+(?:class|function|const|let|var)\s+(\w+)/g) || [];
        exportMatches.forEach(match => {
          const exportName = match.split(/\s+/).pop();
          if (exportName) {
            components.add(`Export: ${exportName}`);
          }
        });
      }
    }

    return Array.from(components).map(comp => `- ${comp}`).join('\n');
  }

  /**
   * 추천사항 생성
   */
  private generateRecommendations(analysis: string): string {
    const recommendations = [
      '코드 리뷰 및 품질 검사 수행',
      '테스트 커버리지 확인 및 개선',
      '문서화 상태 점검',
      '성능 최적화 기회 탐색',
      '보안 취약점 검사'
    ];

    // 분석 내용에 따른 맞춤 추천사항 추가
    if (analysis.toLowerCase().includes('performance')) {
      recommendations.push('성능 프로파일링 및 최적화 우선 고려');
    }

    if (analysis.toLowerCase().includes('security')) {
      recommendations.push('보안 감사 및 취약점 점검 필수');
    }

    if (analysis.toLowerCase().includes('test')) {
      recommendations.push('테스트 전략 재검토 및 커버리지 개선');
    }

    return recommendations.map(rec => `- ${rec}`).join('\n');
  }

  /**
   * 커스텀 템플릿 추가
   */
  addTemplate(template: WorkflowTemplate): void {
    this.templates.set(template.name, template);
    logger.info(`새 템플릿 추가: ${template.name}`, '📋');
  }

  /**
   * 템플릿 목록 조회
   */
  listTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 정리 작업 실행
   */
  cleanup(): void {
    this.cleanupExpiredFiles();
  }

  /**
   * 통계 정보 조회
   */
  getStats() {
    const files = this.listTempFiles();
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const avgAge = files.length > 0 
      ? files.reduce((sum, file) => sum + file.age, 0) / files.length 
      : 0;

    return {
      totalFiles: files.length,
      totalSize,
      averageAge: avgAge,
      templates: this.templates.size,
      oldestFile: files.length > 0 ? Math.max(...files.map(f => f.age)) : 0,
      newestFile: files.length > 0 ? Math.min(...files.map(f => f.age)) : 0
    };
  }
}

export default TempFileManager;