# 구체적 테스트 케이스

## 📋 개요

실제 **입력값**과 **예상 출력값**을 포함한 구체적인 테스트 케이스 모음입니다.

---

## 🔧 1. ConfigManager 테스트 케이스

### TC-CONFIG-001: 유효한 설정 파일 로드
```typescript
// Given (입력)
const configFile = {
  "parentPageId": "26748583-7460-81a4-a0d4-fc4f12a4ec4a",
  "databases": {
    "files": "a66d3c49-6cff-453f-afb9-852f43be893a",
    "docs": "751bc5ce-3771-4264-b18d-0375d2a0d951",
    "functions": "080b06e1-81f0-4964-8d3a-d6a9ee8be208"
  },
  "projectPath": "/Users/user/project",
  "environment": "development"
};

// When (실행)
const configManager = ConfigManager.getInstance();
const config = await configManager.loadConfig('./test-project');

// Then (기대결과)
expect(config).toEqual({
  parentPageId: "26748583-7460-81a4-a0d4-fc4f12a4ec4a",
  databases: {
    files: "a66d3c49-6cff-453f-afb9-852f43be893a",
    docs: "751bc5ce-3771-4264-b18d-0375d2a0d951", 
    functions: "080b06e1-81f0-4964-8d3a-d6a9ee8be208"
  },
  projectPath: "/Users/user/project",
  environment: "development",
  isValid: true
});
```

### TC-CONFIG-002: 잘못된 Parent Page ID
```typescript
// Given
const invalidConfigFile = {
  "parentPageId": "invalid-page-id",
  "databases": {},
  "projectPath": "/Users/user/project"
};

// When
const configManager = ConfigManager.getInstance();
const loadConfig = () => configManager.loadConfig('./test-invalid');

// Then
await expect(loadConfig).rejects.toThrow(
  "Invalid parentPageId format: invalid-page-id"
);
```

### TC-CONFIG-003: 환경별 설정 우선순위
```typescript
// Given
process.env.DEPLINK_ENVIRONMENT = "production";
const devConfig = { environment: "development", parentPageId: "dev-id" };
const prodConfig = { environment: "production", parentPageId: "prod-id" };

// When
const config = await configManager.loadEnvironmentConfig('./test-env');

// Then
expect(config.environment).toBe("production");
expect(config.parentPageId).toBe("prod-id");
```

---

## 🌐 2. NotionClient 테스트 케이스

### TC-NOTION-001: 페이지 생성 성공
```typescript
// Given
const pageData = {
  title: "Test Page",
  content: "# Hello World\n\nThis is test content.",
  databaseId: "a66d3c49-6cff-453f-afb9-852f43be893a",
  properties: {
    "File Path": { title: [{ text: { content: "src/test.ts" } }] },
    "File Type": { select: { name: "TypeScript" } },
    "Size": { number: 1024 }
  }
};

// When
const notionClient = new NotionClient(validApiKey);
const result = await notionClient.createPage(pageData);

// Then
expect(result).toMatchObject({
  id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
  url: expect.stringContaining('https://notion.so/'),
  properties: {
    "File Path": { title: [{ plain_text: "src/test.ts" }] },
    "File Type": { select: { name: "TypeScript" } },
    "Size": { number: 1024 }
  },
  created_time: expect.any(String),
  last_edited_time: expect.any(String)
});
```

### TC-NOTION-002: 페이지 업데이트 성공
```typescript
// Given
const existingPageId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const updateData = {
  content: "# Updated Content\n\nThis content has been modified.",
  properties: {
    "Size": { number: 2048 },
    "Last Modified": { date: { start: "2024-01-15" } }
  }
};

// When
const result = await notionClient.updatePage(existingPageId, updateData);

// Then
expect(result.properties.Size.number).toBe(2048);
expect(result.properties["Last Modified"].date.start).toBe("2024-01-15");
expect(result.last_edited_time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
```

### TC-NOTION-003: API 레이트 리밋 처리
```typescript
// Given
const apiQueue = new ApiQueue({ maxConcurrent: 1, delayMs: 100 });
const requests = Array(10).fill(null).map((_, i) => 
  () => notionClient.createPage({ title: `Page ${i}` })
);

// When
const startTime = Date.now();
const results = await Promise.all(
  requests.map(req => apiQueue.add(req))
);
const endTime = Date.now();

// Then
expect(results).toHaveLength(10);
expect(results.every(r => r.id)).toBe(true);
expect(endTime - startTime).toBeGreaterThan(900); // 최소 9 * 100ms 지연
expect(endTime - startTime).toBeLessThan(2000); // 과도한 지연 없음
```

### TC-NOTION-004: 네트워크 오류 재시도
```typescript
// Given
const mockFailThenSucceed = jest.fn()
  .mockRejectedValueOnce(new Error('Network timeout'))
  .mockRejectedValueOnce(new Error('Connection refused'))
  .mockResolvedValueOnce({ id: 'success-page-id' });

// When
const retryableClient = new NotionClient(validApiKey, { 
  maxRetries: 3, 
  retryDelay: 100 
});
const result = await retryableClient.createPage({ title: "Test" });

// Then
expect(mockFailThenSucceed).toHaveBeenCalledTimes(3);
expect(result.id).toBe('success-page-id');
```

---

## 📁 3. FileExplorer 테스트 케이스

### TC-FILE-001: 기본 파일 탐색
```typescript
// Given
const projectStructure = {
  'src/': {
    'main.ts': 'import { helper } from "./utils/helper";',
    'utils/': {
      'helper.ts': 'export const helper = () => "test";'
    }
  },
  'package.json': '{"name": "test-project"}',
  'node_modules/': {
    'chalk/': { /* ... */ }
  }
};
await createTestProject('./test-project', projectStructure);

// When
const explorer = new FileExplorer('./test-project');
const files = await explorer.exploreFiles();

// Then
expect(files).toEqual([
  {
    path: 'src/main.ts',
    fullPath: '/full/path/to/test-project/src/main.ts',
    type: 'typescript',
    size: 42,
    lastModified: expect.any(Date),
    dependencies: {
      internal: ['src/utils/helper.ts'],
      external: []
    }
  },
  {
    path: 'src/utils/helper.ts', 
    fullPath: '/full/path/to/test-project/src/utils/helper.ts',
    type: 'typescript',
    size: 38,
    lastModified: expect.any(Date),
    dependencies: {
      internal: [],
      external: []
    }
  },
  {
    path: 'package.json',
    fullPath: '/full/path/to/test-project/package.json',
    type: 'json',
    size: 25,
    lastModified: expect.any(Date),
    dependencies: null
  }
]);
```

### TC-FILE-002: .gitignore 필터링
```typescript
// Given
const gitignoreContent = `
node_modules/
*.log
.env
build/
dist/
`;
const projectFiles = [
  'src/main.ts',
  'node_modules/chalk/index.js',
  'debug.log', 
  '.env',
  'build/output.js',
  'README.md'
];
await createTestProject('./test-filtered', { '.gitignore': gitignoreContent });

// When
const explorer = new FileExplorer('./test-filtered');
const files = await explorer.exploreFiles();

// Then
const filePaths = files.map(f => f.path);
expect(filePaths).toEqual(['src/main.ts', 'README.md']);
expect(filePaths).not.toContain('node_modules/chalk/index.js');
expect(filePaths).not.toContain('debug.log');
expect(filePaths).not.toContain('.env');
expect(filePaths).not.toContain('build/output.js');
```

### TC-FILE-003: 의존성 추출 정확도
```typescript
// Given
const sourceCode = `
import { Component } from 'react';
import { Button } from '../components/Button';
import utils from './utils/index';
const chalk = require('chalk');
import type { User } from '../types/User';

// Dynamic import
const loadModule = () => import('../dynamic/loader');
`;

// When
const dependencies = await FileExplorer.extractDependencies(sourceCode, 'src/main.tsx');

// Then
expect(dependencies).toEqual({
  internal: [
    'src/components/Button.tsx', // 자동 확장자 추론
    'src/utils/index.ts',
    'src/types/User.ts',
    'src/dynamic/loader.ts'
  ],
  external: [
    'react',
    'chalk'
  ],
  dynamic: [
    'src/dynamic/loader.ts'
  ],
  typeOnly: [
    'src/types/User.ts'
  ]
});
```

---

## 🔄 4. Sync Workflow 테스트 케이스

### TC-SYNC-001: 첫 번째 동기화
```typescript
// Given
const freshProject = {
  'src/main.ts': 'console.log("Hello World");',
  'README.md': '# Test Project',
  '.deplink-db.json': '{"files":{},"lastSync":null}'
};
await createTestProject('./fresh-sync', freshProject);

// When
const syncService = new SyncWorkflowService('./fresh-sync');
const result = await syncService.syncToNotion();

// Then
expect(result).toMatchObject({
  summary: {
    uploaded: 2,
    updated: 0,
    failed: 0,
    skipped: 0,
    totalTime: expect.any(Number)
  },
  files: [
    {
      path: 'src/main.ts',
      action: 'uploaded',
      notionPageId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      success: true
    },
    {
      path: 'README.md', 
      action: 'uploaded',
      notionPageId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      success: true
    }
  ]
});

// 로컬 DB 업데이트 확인
const localDb = JSON.parse(
  await fs.readFile('./fresh-sync/.deplink-db.json', 'utf8')
);
expect(Object.keys(localDb.files)).toHaveLength(2);
expect(localDb.lastSync).toBeTruthy();
```

### TC-SYNC-002: 증분 업데이트
```typescript
// Given
const existingDb = {
  files: {
    'src/main.ts': {
      notionPageId: 'existing-page-id',
      lastModified: '2024-01-10T10:00:00.000Z',
      hash: 'old-hash-123'
    }
  },
  lastSync: '2024-01-10T10:00:00.000Z'
};
// 파일 수정 시뮬레이션
await fs.writeFile('./test-sync/src/main.ts', 'console.log("Updated content");');
await fs.writeFile('./test-sync/.deplink-db.json', JSON.stringify(existingDb));

// When
const syncService = new SyncWorkflowService('./test-sync');
const result = await syncService.syncToNotion();

// Then
expect(result.summary.uploaded).toBe(0);
expect(result.summary.updated).toBe(1);
expect(result.files[0]).toMatchObject({
  path: 'src/main.ts',
  action: 'updated',
  notionPageId: 'existing-page-id',
  success: true,
  oldHash: 'old-hash-123',
  newHash: expect.not.stringMatching('old-hash-123')
});
```

### TC-SYNC-003: 드라이런 모드
```typescript
// Given
const projectWithChanges = {
  'src/new.ts': 'export const newFunction = () => {};',
  'src/modified.ts': 'export const modified = "updated";'
};

// When
const syncService = new SyncWorkflowService('./test-dry');
const preview = await syncService.syncToNotion({ dryRun: true });

// Then
expect(preview).toMatchObject({
  dryRun: true,
  plannedOperations: {
    upload: [
      { path: 'src/new.ts', reason: 'new file' }
    ],
    update: [
      { path: 'src/modified.ts', reason: 'content changed' }
    ],
    skip: [],
    delete: []
  },
  estimatedTime: expect.any(Number),
  apiCallsRequired: 2
});

// 실제 변경 없음 확인
const dbBefore = await fs.readFile('./test-dry/.deplink-db.json', 'utf8');
const dbAfter = await fs.readFile('./test-dry/.deplink-db.json', 'utf8');
expect(dbBefore).toBe(dbAfter);
```

---

## 🔧 5. Git Integration 테스트 케이스

### TC-GIT-001: Pre-commit 훅 설치
```typescript
// Given
await initGitRepo('./test-git');

// When
const gitManager = new GitHookManager('./test-git');
const result = await gitManager.installHooks();

// Then
expect(result).toMatchObject({
  success: true,
  installed: ['pre-commit', 'post-commit'],
  backups: [] // 기존 훅이 없으므로 백업 없음
});

// 파일 존재 확인
const preCommitHook = await fs.readFile('./test-git/.git/hooks/pre-commit', 'utf8');
expect(preCommitHook).toContain('#!/bin/sh');
expect(preCommitHook).toContain('bun run workflow:status');

// 실행 권한 확인
const stats = await fs.stat('./test-git/.git/hooks/pre-commit');
expect(stats.mode & 0o111).toBeTruthy(); // 실행 권한 있음
```

### TC-GIT-002: 기존 훅 백업
```typescript
// Given
const existingHook = '#!/bin/sh\necho "Existing hook"';
await fs.writeFile('./test-git/.git/hooks/pre-commit', existingHook);

// When
const gitManager = new GitHookManager('./test-git');
const result = await gitManager.installHooks({ backup: true });

// Then
expect(result.backups).toContain('pre-commit.backup');

const backupContent = await fs.readFile('./test-git/.git/hooks/pre-commit.backup', 'utf8');
expect(backupContent).toBe(existingHook);

const newHook = await fs.readFile('./test-git/.git/hooks/pre-commit', 'utf8');
expect(newHook).toContain('bun run workflow:status');
```

### TC-GIT-003: Git 상태 감지
```typescript
// Given
await initGitRepo('./test-git-status');
await fs.writeFile('./test-git-status/new-file.ts', 'export const test = 1;');
await fs.writeFile('./test-git-status/modified.ts', 'updated content');
await execCommand('git add new-file.ts', { cwd: './test-git-status' });

// When
const gitManager = new GitHookManager('./test-git-status');
const status = await gitManager.getGitStatus();

// Then
expect(status).toMatchObject({
  staged: ['new-file.ts'],
  modified: ['modified.ts'],
  untracked: [],
  needsSync: ['new-file.ts', 'modified.ts'], // 둘 다 Notion 동기화 필요
  branch: 'main',
  hasUncommittedChanges: true
});
```

### TC-GIT-004: 자동 동기화 트리거
```typescript
// Given
const autoSyncConfig = { autoSync: true, syncOnCommit: true };
await setupGitProject('./test-auto-sync', autoSyncConfig);

// When
await execCommand('git add . && git commit -m "Test commit"', { 
  cwd: './test-auto-sync' 
});

// Then
// Post-commit 훅이 실행되어 동기화가 자동으로 진행됨
const syncLog = await fs.readFile('./test-auto-sync/.deplink-sync.log', 'utf8');
expect(syncLog).toContain('Auto-sync triggered by commit');
expect(syncLog).toContain('Sync completed successfully');

// Notion에 페이지가 생성되었는지 확인
const localDb = JSON.parse(
  await fs.readFile('./test-auto-sync/.deplink-db.json', 'utf8')
);
expect(Object.keys(localDb.files).length).toBeGreaterThan(0);
```

---

## 📋 6. Schema Manager 테스트 케이스

### TC-SCHEMA-001: 유효한 스키마 검증
```typescript
// Given
const validSchema = {
  version: "2.1.0",
  databases: {
    files: {
      title: "Project Files",
      description: "Track all project files",
      properties: {
        "Name": { type: "title" },
        "File Path": { type: "rich_text" },
        "Type": { 
          type: "select",
          options: ["TypeScript", "JavaScript", "Markdown", "JSON"]
        },
        "Size": { type: "number", format: "number" },
        "Functions": { 
          type: "relation", 
          database: "functions",
          dual_property: "Files"
        }
      }
    },
    functions: {
      title: "Functions",
      properties: {
        "Name": { type: "title" },
        "Files": { 
          type: "relation", 
          database: "files",
          dual_property: "Functions"
        }
      }
    }
  }
};

// When
const schemaManager = new SchemaManager();
const validation = await schemaManager.validateSchema(validSchema);

// Then
expect(validation).toMatchObject({
  valid: true,
  errors: [],
  warnings: [],
  databases: {
    files: { valid: true, propertyCount: 5 },
    functions: { valid: true, propertyCount: 2 }
  },
  relationships: [
    { 
      from: "files.Functions", 
      to: "functions.Files", 
      type: "dual_relation",
      valid: true 
    }
  ]
});
```

### TC-SCHEMA-002: 잘못된 프로퍼티 타입
```typescript
// Given
const invalidSchema = {
  version: "2.1.0",
  databases: {
    files: {
      properties: {
        "Name": { type: "title" },
        "Invalid": { type: "unknown_type" },
        "Relation": { 
          type: "relation",
          database: "nonexistent"
        }
      }
    }
  }
};

// When
const validation = await schemaManager.validateSchema(invalidSchema);

// Then
expect(validation).toMatchObject({
  valid: false,
  errors: [
    {
      path: "databases.files.properties.Invalid.type",
      message: "Unknown property type: unknown_type",
      code: "INVALID_PROPERTY_TYPE"
    },
    {
      path: "databases.files.properties.Relation.database", 
      message: "Referenced database 'nonexistent' not found",
      code: "INVALID_RELATION_TARGET"
    }
  ]
});
```

### TC-SCHEMA-003: 데이터베이스 생성
```typescript
// Given
const createSchema = {
  databases: {
    test_files: {
      title: "Test Files Database",
      properties: {
        "Name": { type: "title" },
        "Status": { 
          type: "select",
          options: [
            { name: "Active", color: "green" },
            { name: "Inactive", color: "red" }
          ]
        }
      }
    }
  }
};

// When
const creator = new DatabaseCreator(notionClient);
const result = await creator.createFromSchema(createSchema, parentPageId);

// Then
expect(result).toMatchObject({
  success: true,
  created: {
    test_files: {
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      title: "Test Files Database",
      properties: {
        "Name": { type: "title" },
        "Status": { 
          type: "select",
          select: {
            options: [
              { name: "Active", color: "green" },
              { name: "Inactive", color: "red" }
            ]
          }
        }
      }
    }
  },
  errors: []
});
```

---

## ⚡ 7. 성능 테스트 케이스

### TC-PERF-001: 대용량 파일 처리
```typescript
// Given
const largeProject = await generateLargeProject({
  fileCount: 1000,
  avgFileSize: 5000,
  dependencyDepth: 3
});

// When
const startTime = performance.now();
const explorer = new FileExplorer('./large-project');
const files = await explorer.exploreFiles();
const endTime = performance.now();

// Then
const processingTime = endTime - startTime;
expect(files).toHaveLength(1000);
expect(processingTime).toBeLessThan(10000); // 10초 이내
expect(process.memoryUsage().heapUsed).toBeLessThan(500 * 1024 * 1024); // 500MB 이내

// 파일당 평균 처리 시간
const avgTimePerFile = processingTime / 1000;
expect(avgTimePerFile).toBeLessThan(10); // 파일당 10ms 이내
```

### TC-PERF-002: 동시 API 요청 처리
```typescript
// Given
const concurrentRequests = 50;
const apiQueue = new ApiQueue({
  maxConcurrent: 5,
  delayMs: 100,
  retryAttempts: 3
});

const requests = Array(concurrentRequests).fill(null).map((_, i) => 
  () => notionClient.createPage({
    title: `Concurrent Page ${i}`,
    content: `Test content for page ${i}`
  })
);

// When
const startTime = performance.now();
const results = await Promise.all(
  requests.map(req => apiQueue.add(req))
);
const endTime = performance.now();

// Then
expect(results).toHaveLength(concurrentRequests);
expect(results.every(r => r.success)).toBe(true);

// 동시성 제어 확인
const totalTime = endTime - startTime;
const minExpectedTime = (concurrentRequests / 5 - 1) * 100; // 5개씩 처리, 100ms 지연
expect(totalTime).toBeGreaterThan(minExpectedTime);
expect(totalTime).toBeLessThan(minExpectedTime + 5000); // 과도한 지연 없음
```

### TC-PERF-003: 메모리 사용량 모니터링
```typescript
// Given
const initialMemory = process.memoryUsage().heapUsed;
const testFiles = Array(100).fill(null).map((_, i) => ({
  path: `file-${i}.ts`,
  content: 'x'.repeat(10000) // 10KB 파일
}));

// When
const syncService = new SyncWorkflowService();
for (const file of testFiles) {
  await syncService.processFile(file);
  
  // 메모리 사용량 체크 (매 10개 파일마다)
  if ((testFiles.indexOf(file) + 1) % 10 === 0) {
    const currentMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = currentMemory - initialMemory;
    
    // 메모리 누수 없음 확인
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB 이내
  }
}

// Then
const finalMemory = process.memoryUsage().heapUsed;
const totalMemoryIncrease = finalMemory - initialMemory;
expect(totalMemoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB 이내

// 가비지 컬렉션 후 메모리 정리 확인
global.gc && global.gc();
await new Promise(resolve => setTimeout(resolve, 100));
const afterGcMemory = process.memoryUsage().heapUsed;
expect(afterGcMemory).toBeLessThan(finalMemory);
```

---

## 🚨 8. 에러 처리 테스트 케이스

### TC-ERROR-001: 네트워크 연결 실패
```typescript
// Given
const networkFailureClient = new NotionClient('invalid-key', {
  timeout: 1000,
  maxRetries: 3,
  retryDelay: 500
});

// When
const startTime = Date.now();
const createPagePromise = networkFailureClient.createPage({
  title: "Test Page"
});

// Then
await expect(createPagePromise).rejects.toThrow(
  expect.objectContaining({
    code: 'NETWORK_ERROR',
    message: expect.stringContaining('timeout'),
    retries: 3,
    originalError: expect.any(Error)
  })
);

const endTime = Date.now();
const totalTime = endTime - startTime;
// 3번 재시도 + 지연 시간 확인
expect(totalTime).toBeGreaterThan(3 * 500); // 최소 1.5초
expect(totalTime).toBeLessThan(5000); // 최대 5초
```

### TC-ERROR-002: 부분 동기화 실패 복구
```typescript
// Given
const partialFailureFiles = [
  { path: 'success1.ts', shouldFail: false },
  { path: 'failure.ts', shouldFail: true },
  { path: 'success2.ts', shouldFail: false }
];

const mockClient = {
  createPage: jest.fn().mockImplementation((data) => {
    const filename = data.properties['File Path'].title[0].text.content;
    const shouldFail = partialFailureFiles.find(f => 
      filename.includes(f.path)
    )?.shouldFail;
    
    if (shouldFail) {
      throw new Error('Simulated API failure');
    }
    return { id: `page-${Date.now()}` };
  })
};

// When
const syncService = new SyncWorkflowService({
  notionClient: mockClient,
  continueOnError: true
});
const result = await syncService.syncFiles(partialFailureFiles);

// Then
expect(result).toMatchObject({
  summary: {
    uploaded: 2,
    failed: 1,
    errors: [
      {
        path: 'failure.ts',
        error: 'Simulated API failure',
        retryable: true
      }
    ]
  }
});

// 성공한 파일들은 로컬 DB에 저장됨
const localDb = await syncService.getLocalDatabase();
expect(localDb.files['success1.ts']).toBeDefined();
expect(localDb.files['success2.ts']).toBeDefined();
expect(localDb.files['failure.ts']).toBeUndefined();
```

### TC-ERROR-003: 데이터 무결성 검증
```typescript
// Given
const corruptedLocalDb = {
  files: {
    'test.ts': {
      notionPageId: 'invalid-page-id',
      lastModified: 'invalid-date',
      hash: null
    }
  }
};

// When
const validator = new DataIntegrityValidator();
const validation = await validator.validateLocalDatabase(corruptedLocalDb);

// Then
expect(validation).toMatchObject({
  valid: false,
  errors: [
    {
      path: 'files.test.ts.notionPageId',
      message: 'Invalid Notion page ID format',
      severity: 'error',
      fixable: false
    },
    {
      path: 'files.test.ts.lastModified',
      message: 'Invalid date format',
      severity: 'error', 
      fixable: true,
      suggestedFix: expect.any(String)
    },
    {
      path: 'files.test.ts.hash',
      message: 'Missing file hash',
      severity: 'warning',
      fixable: true,
      suggestedFix: 'Recalculate hash from file content'
    }
  ],
  fixableErrors: 2,
  autoFixAvailable: true
});
```

---

이렇게 구체적인 **입력값**, **실행 과정**, **기대 출력값**을 명시한 테스트 케이스들로 각 기능의 정확한 동작을 검증할 수 있습니다.