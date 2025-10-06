/**
 * CLI 통합 테스트
 * 모든 CLI 기능이 정상적으로 작동하는지 테스트
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { GraphDatabase } from '../../src/database/GraphDatabase';

const execAsync = promisify(exec);

// 테스트용 데이터베이스 경로
const TEST_DB_PATH = 'test-dependency-linker.db';
const TEST_PROJECT_ROOT = path.join(__dirname, '../fixtures/test-project');

describe('CLI 통합 테스트', () => {
  let testDb: GraphDatabase;

  beforeAll(async () => {
    // 테스트용 데이터베이스 초기화
    testDb = new GraphDatabase(TEST_DB_PATH);
    await testDb.initialize();
    
    // 테스트용 프로젝트 디렉토리 생성
    if (!fs.existsSync(TEST_PROJECT_ROOT)) {
      fs.mkdirSync(TEST_PROJECT_ROOT, { recursive: true });
    }
  });

  afterAll(async () => {
    // 테스트용 데이터베이스 정리
    if (testDb) {
      await testDb.close();
    }
    
    // 테스트용 파일들 정리
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    
    if (fs.existsSync(TEST_PROJECT_ROOT)) {
      fs.rmSync(TEST_PROJECT_ROOT, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    // 각 테스트 전에 데이터베이스 초기화
    await testDb.initialize();
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
    // 구현
    return null;
  }
}
`;
      fs.writeFileSync(testFile, testContent);

      // analyze 명령어 실행
      const { stdout, stderr } = await execAsync(
        `npm run cli -- analyze --pattern "${testFile}" --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Analysis completed');
    });

    it('JavaScript 파일 분석이 정상적으로 작동해야 함', async () => {
      // 테스트용 JavaScript 파일 생성
      const testFile = path.join(TEST_PROJECT_ROOT, 'calculator.js');
      const testContent = `
/**
 * Calculator
 * @semantic-tags: utility-module, math-domain, public-api
 */
class Calculator {
  add(a, b) {
    return a + b;
  }
}
`;
      fs.writeFileSync(testFile, testContent);

      // analyze 명령어 실행
      const { stdout, stderr } = await execAsync(
        `npm run cli -- analyze --pattern "${testFile}" --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Analysis completed');
    });

    it('성능 최적화 옵션이 정상적으로 작동해야 함', async () => {
      const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
      
      const { stdout, stderr } = await execAsync(
        `npm run cli -- analyze --pattern "${testFile}" --performance --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Performance optimization enabled');
    });
  });

  describe('rdf 명령어', () => {
    it('RDF 주소 생성이 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- rdf --create --project "test-project" --file "src/UserService.ts" --type "class" --symbol "UserService" --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('RDF address created');
    });

    it('RDF 주소 검색이 정상적으로 작동해야 함', async () => {
      // 먼저 RDF 주소 생성
      await execAsync(
        `npm run cli -- rdf --create --project "test-project" --file "src/UserService.ts" --type "class" --symbol "UserService" --database "${TEST_DB_PATH}"`
      );

      // RDF 주소 검색
      const { stdout, stderr } = await execAsync(
        `npm run cli -- rdf --query "UserService" --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('UserService');
    });

    it('RDF 주소 검증이 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- rdf --validate --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('RDF validation completed');
    });

    it('RDF 통계가 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- rdf --stats --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('RDF statistics');
    });
  });

  describe('rdf-file 명령어', () => {
    it('파일 위치 정보 반환이 정상적으로 작동해야 함', async () => {
      const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
      const testContent = `export class UserService {}`;
      fs.writeFileSync(testFile, testContent);

      const { stdout, stderr } = await execAsync(
        `npm run cli -- rdf-file --location "test-project/${path.relative(process.cwd(), testFile)}#class:UserService" --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('RDF 주소:');
      expect(stdout).toContain('파일 경로:');
    });

    it('파일 경로 반환이 정상적으로 작동해야 함', async () => {
      const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
      const testContent = `export class UserService {}`;
      fs.writeFileSync(testFile, testContent);

      const { stdout, stderr } = await execAsync(
        `npm run cli -- rdf-file --path "test-project/${path.relative(process.cwd(), testFile)}#class:UserService" --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('파일 경로:');
    });

    it('파일 존재 여부 확인이 정상적으로 작동해야 함', async () => {
      const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
      const testContent = `export class UserService {}`;
      fs.writeFileSync(testFile, testContent);

      const { stdout, stderr } = await execAsync(
        `npm run cli -- rdf-file --exists "test-project/${path.relative(process.cwd(), testFile)}#class:UserService" --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('파일 존재 여부:');
    });

    it('RDF 주소 유효성 검증이 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- rdf-file --validate "test-project/src/UserService.ts#class:UserService" --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('RDF 주소 유효성:');
    });
  });

  describe('unknown 명령어', () => {
    it('Unknown Symbol 등록이 정상적으로 작동해야 함', async () => {
      const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
      const testContent = `export class UserService {}`;
      fs.writeFileSync(testFile, testContent);

      const { stdout, stderr } = await execAsync(
        `npm run cli -- unknown --register "processUser" "${testFile}" --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Unknown symbol registered');
    });

    it('Unknown Symbol 검색이 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- unknown --search "processUser" --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Unknown symbol search');
    });

    it('추론 실행이 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- unknown --infer --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Inference completed');
    });
  });

  describe('query 명령어', () => {
    it('SQL 쿼리가 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- query --sql "SELECT * FROM nodes LIMIT 1" --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Query executed');
    });

    it('GraphQL 쿼리가 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- query --graphql "{ nodes { id name type } }" --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('GraphQL query executed');
    });

    it('자연어 쿼리가 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- query --natural "find all classes" --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Natural language query executed');
    });
  });

  describe('cross-namespace 명령어', () => {
    it('네임스페이스 간 의존성 분석이 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- cross-namespace --analyze "auth" "user" --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Cross-namespace analysis completed');
    });

    it('순환 의존성 검출이 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- cross-namespace --circular --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Circular dependency detection completed');
    });

    it('의존성 통계가 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- cross-namespace --stats --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Dependency statistics');
    });
  });

  describe('inference 명령어', () => {
    it('계층적 추론이 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- inference --hierarchical 1 --edge-type imports --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Hierarchical inference completed');
    });

    it('전이적 추론이 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- inference --transitive 1 --edge-type depends_on --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Transitive inference completed');
    });

    it('추론 실행이 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- inference --execute 1 --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Inference execution completed');
    });
  });

  describe('context-documents 명령어', () => {
    it('파일 컨텍스트 문서 생성이 정상적으로 작동해야 함', async () => {
      const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
      const testContent = `export class UserService {}`;
      fs.writeFileSync(testFile, testContent);

      const { stdout, stderr } = await execAsync(
        `npm run cli -- context-documents --file "${testFile}" --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Context document generated');
    });

    it('심볼 컨텍스트 문서 생성이 정상적으로 작동해야 함', async () => {
      const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
      const testContent = `export class UserService {}`;
      fs.writeFileSync(testFile, testContent);

      const { stdout, stderr } = await execAsync(
        `npm run cli -- context-documents --symbol "${testFile}" --symbol-path "UserService" --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Symbol context document generated');
    });

    it('프로젝트 컨텍스트 문서 생성이 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- context-documents --project --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Project context document generated');
    });
  });

  describe('performance 명령어', () => {
    it('성능 분석이 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- performance --analyze "test-project" --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Performance analysis completed');
    });

    it('캐시 관리가 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- performance --cache stats --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Cache statistics');
    });

    it('배치 처리 관리가 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- performance --batch stats --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Batch processing statistics');
    });

    it('성능 모니터링이 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- performance --monitor --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Performance monitoring started');
    });

    it('메모리 최적화가 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- performance --optimize-memory --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Memory optimization completed');
    });

    it('성능 벤치마크가 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- performance --benchmark --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Performance benchmark completed');
    });

    it('성능 통계가 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- performance --stats --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Performance statistics');
    });
  });

  describe('markdown 명령어', () => {
    it('Markdown 파일 분석이 정상적으로 작동해야 함', async () => {
      const testFile = path.join(TEST_PROJECT_ROOT, 'README.md');
      const testContent = `# Test Project\n\nThis is a test project.`;
      fs.writeFileSync(testFile, testContent);

      const { stdout, stderr } = await execAsync(
        `npm run cli -- markdown --analyze "${testFile}" --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Markdown analysis completed');
    });

    it('링크 추적이 정상적으로 작동해야 함', async () => {
      const testFile = path.join(TEST_PROJECT_ROOT, 'README.md');
      const testContent = `# Test Project\n\n[Link](https://example.com)`;
      fs.writeFileSync(testFile, testContent);

      const { stdout, stderr } = await execAsync(
        `npm run cli -- markdown --track-links "${testFile}" --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Link tracking completed');
    });

    it('헤딩 추출이 정상적으로 작동해야 함', async () => {
      const testFile = path.join(TEST_PROJECT_ROOT, 'README.md');
      const testContent = `# Test Project\n\n## Section 1\n\n### Subsection`;
      fs.writeFileSync(testFile, testContent);

      const { stdout, stderr } = await execAsync(
        `npm run cli -- markdown --extract-headings "${testFile}" --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Heading extraction completed');
    });
  });

  describe('typescript 명령어', () => {
    it('TypeScript 파일 분석이 정상적으로 작동해야 함', async () => {
      const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
      const testContent = `export class UserService {}`;
      fs.writeFileSync(testFile, testContent);

      const { stdout, stderr } = await execAsync(
        `npm run cli -- typescript --analyze "${testFile}" --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('TypeScript analysis completed');
    });

    it('TypeScript 프로젝트 분석이 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- typescript --project "${TEST_PROJECT_ROOT}" --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('TypeScript project analysis completed');
    });

    it('성능 벤치마크가 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- typescript --benchmark --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('TypeScript benchmark completed');
    });
  });

  describe('namespace 명령어', () => {
    it('네임스페이스 분석이 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- namespace --analyze --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Namespace analysis completed');
    });

    it('네임스페이스 최적화가 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- namespace --optimize --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Namespace optimization completed');
    });

    it('네임스페이스 통계가 정상적으로 작동해야 함', async () => {
      const { stdout, stderr } = await execAsync(
        `npm run cli -- namespace --stats --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Namespace statistics');
    });
  });

  describe('benchmark 명령어', () => {
    it('성능 벤치마크가 정상적으로 작동해야 함', async () => {
      const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
      const testContent = `export class UserService {}`;
      fs.writeFileSync(testFile, testContent);

      const { stdout, stderr } = await execAsync(
        `npm run cli -- benchmark --file "${testFile}" --iterations 3 --database "${TEST_DB_PATH}"`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Benchmark completed');
    });
  });
});
