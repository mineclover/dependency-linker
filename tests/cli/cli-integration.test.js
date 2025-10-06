"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const GraphDatabase_1 = require("../../src/database/GraphDatabase");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const TEST_DB_PATH = 'test-dependency-linker.db';
const TEST_PROJECT_ROOT = path.join(__dirname, '../fixtures/test-project');
(0, globals_1.describe)('CLI 통합 테스트', () => {
    let testDb;
    (0, globals_1.beforeAll)(async () => {
        testDb = new GraphDatabase_1.GraphDatabase(TEST_DB_PATH);
        await testDb.initialize();
        if (!fs.existsSync(TEST_PROJECT_ROOT)) {
            fs.mkdirSync(TEST_PROJECT_ROOT, { recursive: true });
        }
    });
    (0, globals_1.afterAll)(async () => {
        if (testDb) {
            await testDb.close();
        }
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }
        if (fs.existsSync(TEST_PROJECT_ROOT)) {
            fs.rmSync(TEST_PROJECT_ROOT, { recursive: true, force: true });
        }
    });
    (0, globals_1.beforeEach)(async () => {
        await testDb.initialize();
    });
    (0, globals_1.describe)('analyze 명령어', () => {
        (0, globals_1.it)('TypeScript 파일 분석이 정상적으로 작동해야 함', async () => {
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
            const { stdout, stderr } = await execAsync(`npm run cli -- analyze --pattern "${testFile}" --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Analysis completed');
        });
        (0, globals_1.it)('JavaScript 파일 분석이 정상적으로 작동해야 함', async () => {
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
            const { stdout, stderr } = await execAsync(`npm run cli -- analyze --pattern "${testFile}" --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Analysis completed');
        });
        (0, globals_1.it)('성능 최적화 옵션이 정상적으로 작동해야 함', async () => {
            const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
            const { stdout, stderr } = await execAsync(`npm run cli -- analyze --pattern "${testFile}" --performance --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Performance optimization enabled');
        });
    });
    (0, globals_1.describe)('rdf 명령어', () => {
        (0, globals_1.it)('RDF 주소 생성이 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- rdf --create --project "test-project" --file "src/UserService.ts" --type "class" --symbol "UserService" --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('RDF address created');
        });
        (0, globals_1.it)('RDF 주소 검색이 정상적으로 작동해야 함', async () => {
            await execAsync(`npm run cli -- rdf --create --project "test-project" --file "src/UserService.ts" --type "class" --symbol "UserService" --database "${TEST_DB_PATH}"`);
            const { stdout, stderr } = await execAsync(`npm run cli -- rdf --query "UserService" --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('UserService');
        });
        (0, globals_1.it)('RDF 주소 검증이 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- rdf --validate --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('RDF validation completed');
        });
        (0, globals_1.it)('RDF 통계가 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- rdf --stats --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('RDF statistics');
        });
    });
    (0, globals_1.describe)('rdf-file 명령어', () => {
        (0, globals_1.it)('파일 위치 정보 반환이 정상적으로 작동해야 함', async () => {
            const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
            const testContent = `export class UserService {}`;
            fs.writeFileSync(testFile, testContent);
            const { stdout, stderr } = await execAsync(`npm run cli -- rdf-file --location "test-project/${path.relative(process.cwd(), testFile)}#class:UserService" --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('RDF 주소:');
            (0, globals_1.expect)(stdout).toContain('파일 경로:');
        });
        (0, globals_1.it)('파일 경로 반환이 정상적으로 작동해야 함', async () => {
            const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
            const testContent = `export class UserService {}`;
            fs.writeFileSync(testFile, testContent);
            const { stdout, stderr } = await execAsync(`npm run cli -- rdf-file --path "test-project/${path.relative(process.cwd(), testFile)}#class:UserService" --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('파일 경로:');
        });
        (0, globals_1.it)('파일 존재 여부 확인이 정상적으로 작동해야 함', async () => {
            const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
            const testContent = `export class UserService {}`;
            fs.writeFileSync(testFile, testContent);
            const { stdout, stderr } = await execAsync(`npm run cli -- rdf-file --exists "test-project/${path.relative(process.cwd(), testFile)}#class:UserService" --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('파일 존재 여부:');
        });
        (0, globals_1.it)('RDF 주소 유효성 검증이 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- rdf-file --validate "test-project/src/UserService.ts#class:UserService" --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('RDF 주소 유효성:');
        });
    });
    (0, globals_1.describe)('unknown 명령어', () => {
        (0, globals_1.it)('Unknown Symbol 등록이 정상적으로 작동해야 함', async () => {
            const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
            const testContent = `export class UserService {}`;
            fs.writeFileSync(testFile, testContent);
            const { stdout, stderr } = await execAsync(`npm run cli -- unknown --register "processUser" "${testFile}" --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Unknown symbol registered');
        });
        (0, globals_1.it)('Unknown Symbol 검색이 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- unknown --search "processUser" --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Unknown symbol search');
        });
        (0, globals_1.it)('추론 실행이 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- unknown --infer --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Inference completed');
        });
    });
    (0, globals_1.describe)('query 명령어', () => {
        (0, globals_1.it)('SQL 쿼리가 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- query --sql "SELECT * FROM nodes LIMIT 1" --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Query executed');
        });
        (0, globals_1.it)('GraphQL 쿼리가 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- query --graphql "{ nodes { id name type } }" --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('GraphQL query executed');
        });
        (0, globals_1.it)('자연어 쿼리가 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- query --natural "find all classes" --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Natural language query executed');
        });
    });
    (0, globals_1.describe)('cross-namespace 명령어', () => {
        (0, globals_1.it)('네임스페이스 간 의존성 분석이 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- cross-namespace --analyze "auth" "user" --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Cross-namespace analysis completed');
        });
        (0, globals_1.it)('순환 의존성 검출이 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- cross-namespace --circular --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Circular dependency detection completed');
        });
        (0, globals_1.it)('의존성 통계가 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- cross-namespace --stats --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Dependency statistics');
        });
    });
    (0, globals_1.describe)('inference 명령어', () => {
        (0, globals_1.it)('계층적 추론이 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- inference --hierarchical 1 --edge-type imports --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Hierarchical inference completed');
        });
        (0, globals_1.it)('전이적 추론이 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- inference --transitive 1 --edge-type depends_on --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Transitive inference completed');
        });
        (0, globals_1.it)('추론 실행이 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- inference --execute 1 --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Inference execution completed');
        });
    });
    (0, globals_1.describe)('context-documents 명령어', () => {
        (0, globals_1.it)('파일 컨텍스트 문서 생성이 정상적으로 작동해야 함', async () => {
            const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
            const testContent = `export class UserService {}`;
            fs.writeFileSync(testFile, testContent);
            const { stdout, stderr } = await execAsync(`npm run cli -- context-documents --file "${testFile}" --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Context document generated');
        });
        (0, globals_1.it)('심볼 컨텍스트 문서 생성이 정상적으로 작동해야 함', async () => {
            const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
            const testContent = `export class UserService {}`;
            fs.writeFileSync(testFile, testContent);
            const { stdout, stderr } = await execAsync(`npm run cli -- context-documents --symbol "${testFile}" --symbol-path "UserService" --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Symbol context document generated');
        });
        (0, globals_1.it)('프로젝트 컨텍스트 문서 생성이 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- context-documents --project --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Project context document generated');
        });
    });
    (0, globals_1.describe)('performance 명령어', () => {
        (0, globals_1.it)('성능 분석이 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- performance --analyze "test-project" --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Performance analysis completed');
        });
        (0, globals_1.it)('캐시 관리가 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- performance --cache stats --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Cache statistics');
        });
        (0, globals_1.it)('배치 처리 관리가 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- performance --batch stats --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Batch processing statistics');
        });
        (0, globals_1.it)('성능 모니터링이 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- performance --monitor --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Performance monitoring started');
        });
        (0, globals_1.it)('메모리 최적화가 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- performance --optimize-memory --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Memory optimization completed');
        });
        (0, globals_1.it)('성능 벤치마크가 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- performance --benchmark --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Performance benchmark completed');
        });
        (0, globals_1.it)('성능 통계가 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- performance --stats --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Performance statistics');
        });
    });
    (0, globals_1.describe)('markdown 명령어', () => {
        (0, globals_1.it)('Markdown 파일 분석이 정상적으로 작동해야 함', async () => {
            const testFile = path.join(TEST_PROJECT_ROOT, 'README.md');
            const testContent = `# Test Project\n\nThis is a test project.`;
            fs.writeFileSync(testFile, testContent);
            const { stdout, stderr } = await execAsync(`npm run cli -- markdown --analyze "${testFile}" --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Markdown analysis completed');
        });
        (0, globals_1.it)('링크 추적이 정상적으로 작동해야 함', async () => {
            const testFile = path.join(TEST_PROJECT_ROOT, 'README.md');
            const testContent = `# Test Project\n\n[Link](https://example.com)`;
            fs.writeFileSync(testFile, testContent);
            const { stdout, stderr } = await execAsync(`npm run cli -- markdown --track-links "${testFile}" --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Link tracking completed');
        });
        (0, globals_1.it)('헤딩 추출이 정상적으로 작동해야 함', async () => {
            const testFile = path.join(TEST_PROJECT_ROOT, 'README.md');
            const testContent = `# Test Project\n\n## Section 1\n\n### Subsection`;
            fs.writeFileSync(testFile, testContent);
            const { stdout, stderr } = await execAsync(`npm run cli -- markdown --extract-headings "${testFile}" --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Heading extraction completed');
        });
    });
    (0, globals_1.describe)('typescript 명령어', () => {
        (0, globals_1.it)('TypeScript 파일 분석이 정상적으로 작동해야 함', async () => {
            const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
            const testContent = `export class UserService {}`;
            fs.writeFileSync(testFile, testContent);
            const { stdout, stderr } = await execAsync(`npm run cli -- typescript --analyze "${testFile}" --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('TypeScript analysis completed');
        });
        (0, globals_1.it)('TypeScript 프로젝트 분석이 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- typescript --project "${TEST_PROJECT_ROOT}" --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('TypeScript project analysis completed');
        });
        (0, globals_1.it)('성능 벤치마크가 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- typescript --benchmark --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('TypeScript benchmark completed');
        });
    });
    (0, globals_1.describe)('namespace 명령어', () => {
        (0, globals_1.it)('네임스페이스 분석이 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- namespace --analyze --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Namespace analysis completed');
        });
        (0, globals_1.it)('네임스페이스 최적화가 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- namespace --optimize --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Namespace optimization completed');
        });
        (0, globals_1.it)('네임스페이스 통계가 정상적으로 작동해야 함', async () => {
            const { stdout, stderr } = await execAsync(`npm run cli -- namespace --stats --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Namespace statistics');
        });
    });
    (0, globals_1.describe)('benchmark 명령어', () => {
        (0, globals_1.it)('성능 벤치마크가 정상적으로 작동해야 함', async () => {
            const testFile = path.join(TEST_PROJECT_ROOT, 'UserService.ts');
            const testContent = `export class UserService {}`;
            fs.writeFileSync(testFile, testContent);
            const { stdout, stderr } = await execAsync(`npm run cli -- benchmark --file "${testFile}" --iterations 3 --database "${TEST_DB_PATH}"`);
            (0, globals_1.expect)(stderr).toBe('');
            (0, globals_1.expect)(stdout).toContain('Benchmark completed');
        });
    });
});
//# sourceMappingURL=cli-integration.test.js.map