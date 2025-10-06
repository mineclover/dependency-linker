/**
 * CLI 통합 테스트 (간단 버전)
 * 실제 구현된 CLI 명령어들만 테스트
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// 테스트용 데이터베이스 경로
const TEST_DB_PATH = 'test-dependency-linker.db';
const TEST_PROJECT_ROOT = path.join(__dirname, '../fixtures/test-project');

describe('CLI 통합 테스트 (간단 버전)', () => {
  beforeAll(async () => {
    // 테스트용 프로젝트 디렉토리 생성
    if (!fs.existsSync(TEST_PROJECT_ROOT)) {
      fs.mkdirSync(TEST_PROJECT_ROOT, { recursive: true });
    }
  });

  afterAll(async () => {
    // 테스트용 파일들 정리
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    
    if (fs.existsSync(TEST_PROJECT_ROOT)) {
      fs.rmSync(TEST_PROJECT_ROOT, { recursive: true, force: true });
    }
  });

  describe('analyze 명령어', () => {
    it('TypeScript 파일 분석이 정상적으로 작동해야 함', async () => {
      // 테스트용 TypeScript 파일 생성
      const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
      const testContent = `
/**
 * User Service
 * @semantic-tags: service-layer, auth-domain, public-api
 */
export class UserService {
  async authenticateUser(email: string, password: string): Promise<User | null> {
    return null;
  }
}
`;
      fs.writeFileSync(testFile, testContent);

      // analyze 명령어 실행
      const { stdout, stderr } = await execAsync(
        `npm run cli -- analyze --pattern "${testFile}"`
      );

      // stderr에 경고가 있을 수 있지만 정상 동작 확인
      expect(stdout).toContain('Analysis completed');
    }, 30000);

    it('성능 최적화 옵션이 정상적으로 작동해야 함', async () => {
      const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
      
      const { stdout, stderr } = await execAsync(
        `npm run cli -- analyze --pattern "${testFile}" --performance`
      );

      // stderr에 경고가 있을 수 있지만 정상 동작 확인
      expect(stdout).toContain('Performance optimization enabled');
    }, 30000);
  });

  describe('rdf 명령어', () => {
    it('RDF 주소 생성이 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- rdf --create --project "test-project" --file "src/UserService.ts" --type "class" --symbol "UserService"`
      );

      // stderr에 경고가 있을 수 있지만 정상 동작 확인
      expect(stdout).toContain('RDF address created');
    }, 30000);

    it('RDF 주소 검색이 정상적으로 작동해야 함', async () => {
      // 먼저 RDF 주소 생성
      await execAsync(
        `npm run cli -- rdf --create --project "test-project" --file "src/UserService.ts" --type "class" --symbol "UserService"`
      );

      // RDF 주소 검색
      const { stdout, stderr } = await execAsync(
        `npm run cli -- rdf --query "UserService"`
      );

      // stderr에 경고가 있을 수 있지만 정상 동작 확인
      expect(stdout).toContain('UserService');
    }, 30000);

    it('RDF 주소 검증이 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- rdf --validate`
      );

      // stderr에 경고가 있을 수 있지만 정상 동작 확인
      expect(stdout).toContain('RDF validation completed');
    }, 30000);

    it('RDF 통계가 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- rdf --stats`
      );

      // stderr에 경고가 있을 수 있지만 정상 동작 확인
      expect(stdout).toContain('RDF statistics');
    }, 30000);
  });

  describe('rdf-file 명령어', () => {
    it('파일 위치 정보 반환이 정상적으로 작동해야 함', async () => {
      const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
      const testContent = `export class UserService {}`;
      fs.writeFileSync(testFile, testContent);

      const { stdout, stderr } = await execAsync(
        `npm run cli -- rdf-file --location "test-project/${path.relative(process.cwd(), testFile)}#class:UserService"`
      );

      // stderr에 경고가 있을 수 있지만 정상 동작 확인
      expect(stdout).toContain('RDF 주소:');
      expect(stdout).toContain('파일 경로:');
    }, 30000);

    it('파일 경로 반환이 정상적으로 작동해야 함', async () => {
      const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
      const testContent = `export class UserService {}`;
      fs.writeFileSync(testFile, testContent);

      const { stdout, stderr } = await execAsync(
        `npm run cli -- rdf-file --path "test-project/${path.relative(process.cwd(), testFile)}#class:UserService"`
      );

      // stderr에 경고가 있을 수 있지만 정상 동작 확인
      expect(stdout).toContain('파일 경로:');
    }, 30000);

    it('파일 존재 여부 확인이 정상적으로 작동해야 함', async () => {
      const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
      const testContent = `export class UserService {}`;
      fs.writeFileSync(testFile, testContent);

      const { stdout, stderr } = await execAsync(
        `npm run cli -- rdf-file --exists "test-project/${path.relative(process.cwd(), testFile)}#class:UserService"`
      );

      // stderr에 경고가 있을 수 있지만 정상 동작 확인
      expect(stdout).toContain('파일 존재 여부:');
    }, 30000);

    it('RDF 주소 유효성 검증이 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- rdf-file --validate "test-project/src/UserService.ts#class:UserService"`
      );

      // stderr에 경고가 있을 수 있지만 정상 동작 확인
      expect(stdout).toContain('RDF 주소 유효성:');
    }, 30000);
  });

  describe('markdown 명령어', () => {
    it('Markdown 파일 분석이 정상적으로 작동해야 함', async () => {
      const testFile = path.join(TEST_PROJECT_ROOT, 'README.md');
      const testContent = `# Test Project\n\nThis is a test project.`;
      fs.writeFileSync(testFile, testContent);

      const { stdout, stderr } = await execAsync(
        `npm run cli -- markdown --analyze "${testFile}"`
      );

      // stderr에 경고가 있을 수 있지만 정상 동작 확인
      expect(stdout).toContain('Markdown analysis completed');
    }, 30000);
  });

  describe('typescript 명령어', () => {
    it('TypeScript 파일 분석이 정상적으로 작동해야 함', async () => {
      const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
      const testContent = `export class UserService {}`;
      fs.writeFileSync(testFile, testContent);

      const { stdout, stderr } = await execAsync(
        `npm run cli -- typescript --analyze "${testFile}"`
      );

      // stderr에 경고가 있을 수 있지만 정상 동작 확인
      expect(stdout).toContain('TypeScript analysis completed');
    }, 30000);
  });

  describe('namespace 명령어', () => {
    it('네임스페이스 분석이 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- namespace --analyze`
      );

      // stderr에 경고가 있을 수 있지만 정상 동작 확인
      expect(stdout).toContain('Namespace analysis completed');
    }, 30000);
  });

  describe('benchmark 명령어', () => {
    it('성능 벤치마크가 정상적으로 작동해야 함', async () => {
      const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
      const testContent = `export class UserService {}`;
      fs.writeFileSync(testFile, testContent);

      const { stdout, stderr } = await execAsync(
        `npm run cli -- benchmark --file "${testFile}" --iterations 3`
      );

      // stderr에 경고가 있을 수 있지만 정상 동작 확인
      expect(stdout).toContain('Benchmark completed');
    }, 30000);
  });
});
