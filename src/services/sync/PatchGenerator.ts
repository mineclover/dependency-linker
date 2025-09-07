/**
 * Patch Generator - 변경사항 패치 생성 및 적용
 * 체계적인 변경사항 적용을 위한 패치 시스템
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { join, dirname, basename, relative } from 'path';
import { logger, stringUtils, arrayUtils, asyncUtils } from '../../shared/utils/index.js';
import type { Block, BlockDiff, DiffResult, SyncAction } from './BlockDiffer.js';

export interface Patch {
  /** 패치 고유 ID */
  id: string;
  /** 패치 이름 */
  name: string;
  /** 패치 설명 */
  description: string;
  /** 패치 타입 */
  type: PatchType;
  /** 대상 파일들 */
  targetFiles: string[];
  /** 변경 작업들 */
  operations: PatchOperation[];
  /** 패치 메타데이터 */
  metadata: PatchMetadata;
  /** 의존성 패치들 */
  dependencies?: string[];
  /** 검증 규칙들 */
  validations?: ValidationRule[];
}

export type PatchType = 'content' | 'structure' | 'dependency' | 'configuration' | 'migration' | 'hotfix';

export interface PatchOperation {
  /** 작업 ID */
  id: string;
  /** 작업 타입 */
  type: OperationType;
  /** 대상 파일 */
  targetFile: string;
  /** 작업 데이터 */
  data: OperationData;
  /** 조건부 실행 조건 */
  condition?: string;
  /** 우선순위 */
  priority: number;
  /** 롤백 정보 */
  rollbackData?: unknown;
}

export type OperationType = 
  | 'insert' | 'replace' | 'delete' | 'move' | 'rename'
  | 'create_file' | 'delete_file' | 'copy_file'
  | 'update_metadata' | 'set_permissions';

export interface OperationData {
  /** 대상 위치 */
  position?: number | string;
  /** 새 내용 */
  content?: string;
  /** 검색 패턴 */
  pattern?: string;
  /** 교체 내용 */
  replacement?: string;
  /** 추가 옵션 */
  options?: Record<string, unknown>;
}

export interface PatchMetadata {
  /** 생성 시간 */
  createdAt: string;
  /** 생성자 */
  author: string;
  /** 버전 */
  version: string;
  /** 태그 */
  tags: string[];
  /** 우선순위 */
  priority: number;
  /** 백업 필요 여부 */
  requiresBackup: boolean;
  /** 테스트 필요 여부 */
  requiresTesting: boolean;
  /** 예상 실행 시간 (초) */
  estimatedDuration?: number;
}

export interface ValidationRule {
  /** 검증 타입 */
  type: 'syntax' | 'semantic' | 'dependency' | 'performance' | 'security';
  /** 검증 설명 */
  description: string;
  /** 검증 함수 */
  validator: (files: string[]) => Promise<ValidationResult>;
  /** 필수 여부 */
  required: boolean;
}

export interface ValidationResult {
  /** 검증 통과 여부 */
  passed: boolean;
  /** 오류 메시지 */
  errors: string[];
  /** 경고 메시지 */
  warnings: string[];
  /** 제안사항 */
  suggestions: string[];
}

export interface PatchApplicationResult {
  /** 성공 여부 */
  success: boolean;
  /** 적용된 작업 수 */
  appliedOperations: number;
  /** 실패한 작업들 */
  failedOperations: PatchOperation[];
  /** 생성된 백업 파일들 */
  backupFiles: string[];
  /** 실행 시간 (밀리초) */
  executionTime: number;
  /** 로그 메시지들 */
  logs: string[];
  /** 롤백 정보 */
  rollbackInfo?: RollbackInfo;
}

export interface RollbackInfo {
  /** 롤백 패치 ID */
  rollbackPatchId: string;
  /** 롤백 패치 경로 */
  rollbackPatchPath: string;
  /** 백업 파일 경로들 */
  backupPaths: string[];
}

export interface PatchGeneratorOptions {
  /** 백업 디렉토리 */
  backupDir?: string;
  /** 패치 저장 디렉토리 */
  patchDir?: string;
  /** 자동 백업 생성 */
  autoBackup?: boolean;
  /** 검증 활성화 */
  enableValidation?: boolean;
  /** 최대 롤백 보존 기간 (일) */
  maxRollbackAge?: number;
  /** 병렬 실행 제한 */
  maxConcurrency?: number;
}

/**
 * 패치 생성 및 적용 시스템
 */
export class PatchGenerator {
  private readonly options: Required<PatchGeneratorOptions>;
  private readonly patches: Map<string, Patch> = new Map();

  constructor(
    private readonly projectRoot: string,
    options: PatchGeneratorOptions = {}
  ) {
    this.options = {
      backupDir: join(projectRoot, '.deplink', 'backups'),
      patchDir: join(projectRoot, '.deplink', 'patches'),
      autoBackup: true,
      enableValidation: true,
      maxRollbackAge: 30,
      maxConcurrency: 3,
      ...options
    };
  }

  /**
   * Block diff로부터 패치 생성
   */
  async generatePatchFromDiff(diffResult: DiffResult, options: {
    name: string;
    description?: string;
    type?: PatchType;
    author?: string;
  }): Promise<Patch> {
    const operations: PatchOperation[] = [];
    let operationId = 0;

    for (const action of diffResult.syncActions) {
      operations.push(this.syncActionToPatchOperation(action, operationId++));
    }

    const patch: Patch = {
      id: this.generatePatchId(),
      name: options.name,
      description: options.description || '자동 생성된 블록 차이 패치',
      type: options.type || 'content',
      targetFiles: [],
      operations,
      metadata: {
        createdAt: new Date().toISOString(),
        author: options.author || 'system',
        version: '1.0.0',
        tags: ['auto-generated', 'block-diff'],
        priority: 5,
        requiresBackup: true,
        requiresTesting: false,
        estimatedDuration: operations.length * 2
      }
    };

    // 대상 파일 목록 추출
    patch.targetFiles = arrayUtils.unique(
      operations.map(op => op.targetFile).filter(Boolean)
    );

    this.patches.set(patch.id, patch);
    await this.savePatch(patch);

    logger.info(`패치 생성 완료: ${patch.name} (${operations.length}개 작업)`, '📦');

    return patch;
  }

  /**
   * 커스텀 패치 생성
   */
  async createCustomPatch(
    name: string,
    description: string,
    operations: Partial<PatchOperation>[],
    options: Partial<PatchMetadata> = {}
  ): Promise<Patch> {
    const patch: Patch = {
      id: this.generatePatchId(),
      name,
      description,
      type: 'content',
      targetFiles: [],
      operations: operations.map((op, index) => ({
        id: `op_${index}`,
        type: op.type || 'replace',
        targetFile: op.targetFile || '',
        data: op.data || {},
        priority: op.priority || index,
        ...op
      })),
      metadata: {
        createdAt: new Date().toISOString(),
        author: 'user',
        version: '1.0.0',
        tags: [],
        priority: 5,
        requiresBackup: true,
        requiresTesting: false,
        ...options
      }
    };

    // 대상 파일 목록 추출
    patch.targetFiles = arrayUtils.unique(
      patch.operations.map(op => op.targetFile).filter(Boolean)
    );

    this.patches.set(patch.id, patch);
    await this.savePatch(patch);

    logger.info(`커스텀 패치 생성: ${patch.name}`, '🎨');

    return patch;
  }

  /**
   * 패치 적용
   */
  async applyPatch(patchId: string): Promise<PatchApplicationResult> {
    const patch = this.patches.get(patchId);
    if (!patch) {
      throw new Error(`패치를 찾을 수 없음: ${patchId}`);
    }

    logger.info(`패치 적용 시작: ${patch.name}`, '🚀');
    const startTime = Date.now();

    const result: PatchApplicationResult = {
      success: false,
      appliedOperations: 0,
      failedOperations: [],
      backupFiles: [],
      executionTime: 0,
      logs: []
    };

    try {
      // 1. 사전 검증
      if (this.options.enableValidation && patch.validations) {
        const validationResult = await this.validatePatch(patch);
        if (!validationResult.passed) {
          throw new Error(`패치 검증 실패: ${validationResult.errors.join(', ')}`);
        }
      }

      // 2. 백업 생성
      if (this.options.autoBackup || patch.metadata.requiresBackup) {
        result.backupFiles = await this.createBackups(patch.targetFiles);
        result.logs.push(`백업 생성: ${result.backupFiles.length}개 파일`);
      }

      // 3. 작업 정렬 (우선순위 순)
      const sortedOperations = [...patch.operations].sort((a, b) => a.priority - b.priority);

      // 4. 작업 실행
      const operationChunks = arrayUtils.chunk(sortedOperations, this.options.maxConcurrency);
      
      for (const chunk of operationChunks) {
        const chunkResults = await Promise.allSettled(
          chunk.map(operation => this.applyOperation(operation))
        );

        for (let i = 0; i < chunkResults.length; i++) {
          const chunkResult = chunkResults[i];
          const operation = chunk[i];

          if (chunkResult.status === 'fulfilled') {
            result.appliedOperations++;
            result.logs.push(`작업 완료: ${operation.id} (${operation.type})`);
          } else {
            result.failedOperations.push(operation);
            result.logs.push(`작업 실패: ${operation.id} - ${chunkResult.reason}`);
          }
        }
      }

      // 5. 롤백 정보 생성
      if (result.appliedOperations > 0) {
        result.rollbackInfo = await this.generateRollbackInfo(patch, result.backupFiles);
      }

      result.success = result.failedOperations.length === 0;
      result.executionTime = Date.now() - startTime;

      const status = result.success ? '✅' : '❌';
      logger.info(
        `패치 적용 ${result.success ? '완료' : '실패'}: ${result.appliedOperations}/${patch.operations.length} 작업 성공`,
        status
      );

    } catch (error) {
      result.logs.push(`패치 적용 오류: ${error}`);
      logger.error(`패치 적용 실패: ${error}`);
    }

    return result;
  }

  /**
   * 패치 롤백
   */
  async rollbackPatch(rollbackInfo: RollbackInfo): Promise<boolean> {
    logger.info('패치 롤백 시작', '↩️');

    try {
      // 백업 파일들 복원
      for (const backupPath of rollbackInfo.backupPaths) {
        if (existsSync(backupPath)) {
          const originalPath = backupPath.replace(/\.backup\.\d+$/, '');
          const content = readFileSync(backupPath, 'utf8');
          writeFileSync(originalPath, content, 'utf8');
          logger.debug(`파일 복원: ${originalPath}`);
        }
      }

      logger.info('패치 롤백 완료', '✅');
      return true;

    } catch (error) {
      logger.error(`패치 롤백 실패: ${error}`);
      return false;
    }
  }

  /**
   * SyncAction을 PatchOperation으로 변환
   */
  private syncActionToPatchOperation(action: SyncAction, id: number): PatchOperation {
    const operation: PatchOperation = {
      id: `sync_op_${id}`,
      type: this.mapSyncActionType(action.type),
      targetFile: '', // 실제 구현에서는 블록의 파일 정보에서 가져와야 함
      data: action.data,
      priority: action.priority
    };

    return operation;
  }

  /**
   * SyncAction 타입을 PatchOperation 타입으로 매핑
   */
  private mapSyncActionType(syncType: string): OperationType {
    switch (syncType) {
      case 'create': return 'insert';
      case 'update': return 'replace';
      case 'delete': return 'delete';
      case 'move': return 'move';
      default: return 'replace';
    }
  }

  /**
   * 개별 작업 적용
   */
  private async applyOperation(operation: PatchOperation): Promise<void> {
    const { type, targetFile, data } = operation;

    if (!existsSync(targetFile)) {
      if (type !== 'create_file') {
        throw new Error(`대상 파일이 존재하지 않음: ${targetFile}`);
      }
    }

    switch (type) {
      case 'insert':
        await this.insertContent(targetFile, data);
        break;

      case 'replace':
        await this.replaceContent(targetFile, data);
        break;

      case 'delete':
        await this.deleteContent(targetFile, data);
        break;

      case 'create_file':
        await this.createFile(targetFile, data);
        break;

      case 'delete_file':
        await this.deleteFile(targetFile);
        break;

      case 'update_metadata':
        await this.updateMetadata(targetFile, data);
        break;

      default:
        throw new Error(`지원하지 않는 작업 타입: ${type}`);
    }
  }

  /**
   * 내용 삽입
   */
  private async insertContent(filePath: string, data: OperationData): Promise<void> {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const position = typeof data.position === 'number' 
      ? data.position 
      : parseInt(data.position as string, 10);

    if (data.content) {
      lines.splice(position, 0, data.content);
      writeFileSync(filePath, lines.join('\n'), 'utf8');
    }
  }

  /**
   * 내용 교체
   */
  private async replaceContent(filePath: string, data: OperationData): Promise<void> {
    let content = readFileSync(filePath, 'utf8');

    if (data.pattern && data.replacement) {
      const regex = new RegExp(data.pattern, data.options?.flags || 'g');
      content = content.replace(regex, data.replacement);
      writeFileSync(filePath, content, 'utf8');
    }
  }

  /**
   * 내용 삭제
   */
  private async deleteContent(filePath: string, data: OperationData): Promise<void> {
    const content = readFileSync(filePath, 'utf8');

    if (data.pattern) {
      const regex = new RegExp(data.pattern, data.options?.flags || 'g');
      const newContent = content.replace(regex, '');
      writeFileSync(filePath, newContent, 'utf8');
    }
  }

  /**
   * 파일 생성
   */
  private async createFile(filePath: string, data: OperationData): Promise<void> {
    const content = data.content || '';
    writeFileSync(filePath, content, 'utf8');
  }

  /**
   * 파일 삭제
   */
  private async deleteFile(filePath: string): Promise<void> {
    if (existsSync(filePath)) {
      require('fs').unlinkSync(filePath);
    }
  }

  /**
   * 메타데이터 업데이트
   */
  private async updateMetadata(filePath: string, data: OperationData): Promise<void> {
    // 파일 권한, 시간 등 메타데이터 업데이트 로직
    if (data.options?.permissions) {
      require('fs').chmodSync(filePath, parseInt(data.options.permissions, 8));
    }
  }

  /**
   * 백업 생성
   */
  private async createBackups(files: string[]): Promise<string[]> {
    const backupFiles: string[] = [];
    const timestamp = Date.now();

    for (const file of files) {
      if (existsSync(file)) {
        const backupPath = join(
          this.options.backupDir,
          `${basename(file)}.backup.${timestamp}`
        );

        // 백업 디렉토리 생성
        const backupDir = dirname(backupPath);
        if (!existsSync(backupDir)) {
          require('fs').mkdirSync(backupDir, { recursive: true });
        }

        // 파일 복사
        const content = readFileSync(file, 'utf8');
        writeFileSync(backupPath, content, 'utf8');
        backupFiles.push(backupPath);
      }
    }

    return backupFiles;
  }

  /**
   * 패치 검증
   */
  private async validatePatch(patch: Patch): Promise<ValidationResult> {
    const result: ValidationResult = {
      passed: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    if (!patch.validations) {
      return result;
    }

    for (const rule of patch.validations) {
      try {
        const validationResult = await rule.validator(patch.targetFiles);
        
        if (!validationResult.passed) {
          result.passed = false;
          result.errors.push(...validationResult.errors);
        }
        
        result.warnings.push(...validationResult.warnings);
        result.suggestions.push(...validationResult.suggestions);

      } catch (error) {
        if (rule.required) {
          result.passed = false;
          result.errors.push(`검증 실행 실패: ${rule.description} - ${error}`);
        } else {
          result.warnings.push(`검증 건너뜀: ${rule.description} - ${error}`);
        }
      }
    }

    return result;
  }

  /**
   * 롤백 정보 생성
   */
  private async generateRollbackInfo(
    patch: Patch, 
    backupFiles: string[]
  ): Promise<RollbackInfo> {
    const rollbackPatch: Patch = {
      id: `rollback_${patch.id}`,
      name: `Rollback: ${patch.name}`,
      description: `${patch.name} 패치 롤백`,
      type: patch.type,
      targetFiles: patch.targetFiles,
      operations: [], // 롤백 작업들은 실제로는 백업 파일 복원
      metadata: {
        ...patch.metadata,
        createdAt: new Date().toISOString(),
        tags: [...patch.metadata.tags, 'rollback']
      }
    };

    const rollbackPatchPath = join(this.options.patchDir, `${rollbackPatch.id}.json`);
    await this.savePatch(rollbackPatch);

    return {
      rollbackPatchId: rollbackPatch.id,
      rollbackPatchPath,
      backupPaths: backupFiles
    };
  }

  /**
   * 패치 저장
   */
  private async savePatch(patch: Patch): Promise<void> {
    const patchPath = join(this.options.patchDir, `${patch.id}.json`);
    
    // 패치 디렉토리 생성
    if (!existsSync(this.options.patchDir)) {
      require('fs').mkdirSync(this.options.patchDir, { recursive: true });
    }

    writeFileSync(patchPath, JSON.stringify(patch, null, 2), 'utf8');
  }

  /**
   * 패치 로드
   */
  async loadPatch(patchId: string): Promise<Patch | null> {
    if (this.patches.has(patchId)) {
      return this.patches.get(patchId)!;
    }

    const patchPath = join(this.options.patchDir, `${patchId}.json`);
    if (existsSync(patchPath)) {
      const patchData = JSON.parse(readFileSync(patchPath, 'utf8'));
      this.patches.set(patchId, patchData);
      return patchData;
    }

    return null;
  }

  /**
   * 패치 목록 조회
   */
  async listPatches(): Promise<Patch[]> {
    const patches: Patch[] = [];

    if (existsSync(this.options.patchDir)) {
      const files = require('fs').readdirSync(this.options.patchDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const patchId = file.replace('.json', '');
          const patch = await this.loadPatch(patchId);
          if (patch) {
            patches.push(patch);
          }
        }
      }
    }

    return patches.sort((a, b) => 
      new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime()
    );
  }

  /**
   * 패치 ID 생성
   */
  private generatePatchId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `patch_${timestamp}_${random}`;
  }

  /**
   * 정리 작업 (오래된 백업 파일 삭제)
   */
  async cleanup(): Promise<void> {
    const maxAge = this.options.maxRollbackAge * 24 * 60 * 60 * 1000; // 밀리초
    const cutoffTime = Date.now() - maxAge;

    if (existsSync(this.options.backupDir)) {
      const files = require('fs').readdirSync(this.options.backupDir);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = join(this.options.backupDir, file);
        const stat = statSync(filePath);
        
        if (stat.mtime.getTime() < cutoffTime) {
          require('fs').unlinkSync(filePath);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logger.info(`오래된 백업 파일 ${deletedCount}개 삭제`, '🧹');
      }
    }
  }

  /**
   * 통계 정보 조회
   */
  async getStats() {
    const patches = await this.listPatches();
    const patchTypes = new Map<PatchType, number>();
    
    patches.forEach(patch => {
      patchTypes.set(patch.type, (patchTypes.get(patch.type) || 0) + 1);
    });

    let backupCount = 0;
    if (existsSync(this.options.backupDir)) {
      backupCount = require('fs').readdirSync(this.options.backupDir).length;
    }

    return {
      totalPatches: patches.length,
      patchTypes: Object.fromEntries(patchTypes),
      backupFiles: backupCount,
      oldestPatch: patches.length > 0 ? patches[patches.length - 1].metadata.createdAt : null,
      newestPatch: patches.length > 0 ? patches[0].metadata.createdAt : null
    };
  }
}

export default PatchGenerator;