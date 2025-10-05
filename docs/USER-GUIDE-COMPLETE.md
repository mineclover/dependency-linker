# Dependency Linker - 완전한 사용법 가이드

**Purpose**: Dependency Linker를 처음 사용하는 사용자를 위한 단계별 사용법 가이드

---

## 📋 목차

1. [🚀 시작하기](#-시작하기)
2. [🔧 기본 사용법](#-기본-사용법)
3. [📁 Namespace 설정](#-namespace-설정)
4. [🧠 추론 시스템 사용](#-추론-시스템-사용)
5. [⚡ 성능 최적화](#-성능-최적화)
6. [🔍 고급 기능](#-고급-기능)
7. [🛠️ 문제 해결](#️-문제-해결)
8. [📚 예제 모음](#-예제-모음)

---

## 🚀 시작하기

### 1. 설치

```bash
# npm으로 설치
npm install @context-action/dependency-linker

# 또는 yarn으로 설치
yarn add @context-action/dependency-linker

# 또는 pnpm으로 설치
pnpm add @context-action/dependency-linker
```

### 2. 기본 설정

```typescript
// 기본 import
import { 
  GraphDatabase, 
  analyzeFile, 
  InferenceEngine,
  initializeAnalysisSystem 
} from '@context-action/dependency-linker';

// 분석 시스템 초기화
initializeAnalysisSystem();
```

### 3. 첫 번째 분석

```typescript
// 간단한 파일 분석
const sourceCode = `
import React from 'react';
import { useState } from 'react';

export const App = () => {
  const [count, setCount] = useState(0);
  return <div>Count: {count}</div>;
};
`;

const result = await analyzeFile(sourceCode, 'typescript', 'src/App.tsx');
console.log(`파싱된 노드: ${result.parseMetadata.nodeCount}개`);
console.log(`실행 시간: ${result.performanceMetrics.totalExecutionTime}ms`);
```

---

## 🔧 기본 사용법

### 1. 데이터베이스 초기화

```typescript
import { GraphDatabase } from '@context-action/dependency-linker';

// 데이터베이스 생성
const db = new GraphDatabase('my-project.db');

// 초기화
await db.initialize();

console.log('✅ 데이터베이스 초기화 완료');
```

### 2. 파일 분석 및 저장

```typescript
// 파일 분석
const result = await analyzeFile(sourceCode, 'typescript', 'src/User.ts');

// 노드 저장
const nodeId = await db.upsertNode({
  identifier: 'my-project/src/User.ts#Class:User',
  type: 'Class',
  name: 'User',
  sourceFile: 'src/User.ts',
  language: 'typescript',
  semanticTags: ['model', 'entity']
});

console.log(`저장된 노드 ID: ${nodeId}`);
```

### 3. 관계 생성

```typescript
// 두 노드 간의 관계 생성
const relationshipId = await db.upsertRelationship({
  fromNodeId: userNodeId,
  toNodeId: serviceNodeId,
  type: 'imports',
  properties: { importPath: './UserService' },
  weight: 1.0
});

console.log(`생성된 관계 ID: ${relationshipId}`);
```

### 4. 데이터 조회

```typescript
// 모든 클래스 노드 조회
const classes = await db.findNodes({ nodeTypes: ['Class'] });
console.log(`발견된 클래스: ${classes.length}개`);

// 특정 파일의 노드들 조회
const fileNodes = await db.findNodes({ 
  sourceFiles: ['src/User.ts'] 
});

// 관계 조회
const relationships = await db.findRelationships({ 
  types: ['imports'] 
});
console.log(`발견된 임포트: ${relationships.length}개`);
```

---

## 📁 Namespace 설정

### 1. 설정 파일 생성

`deps.config.json` 파일을 생성합니다:

```json
{
  "namespaces": {
    "source": {
      "projectName": "my-project",
      "filePatterns": ["src/**/*.ts", "src/**/*.tsx"],
      "excludePatterns": ["src/**/*.test.ts", "src/**/*.spec.ts"],
      "description": "Source code files",
      "semanticTags": ["source", "production"],
      "scenarios": ["basic-structure", "file-dependency"]
    },
    "tests": {
      "filePatterns": ["tests/**/*.ts", "**/*.test.ts", "**/*.spec.ts"],
      "excludePatterns": ["node_modules/**"],
      "description": "Test files",
      "semanticTags": ["test", "quality-assurance"],
      "scenarios": ["method-analysis", "symbol-dependency"]
    },
    "docs": {
      "filePatterns": ["docs/**/*.md", "README.md"],
      "description": "Documentation files",
      "semanticTags": ["documentation", "markdown"]
    }
  },
  "default": "source"
}
```

### 2. 프로그래밍 방식 설정

```typescript
import { ConfigManager } from '@context-action/dependency-linker';

const configManager = new ConfigManager();

// 네임스페이스 설정
await configManager.setNamespaceConfig('source', {
  projectName: 'my-project',
  filePatterns: ['src/**/*.ts', 'src/**/*.tsx'],
  excludePatterns: ['src/**/*.test.ts'],
  semanticTags: ['source', 'production'],
  scenarios: ['basic-structure', 'file-dependency']
}, 'deps.config.json');

console.log('✅ 네임스페이스 설정 완료');
```

### 3. CLI 사용

```bash
# 네임스페이스 목록 조회
npm run cli namespace list

# 특정 네임스페이스 분석
npm run cli analyze-namespace --namespace=source

# 모든 네임스페이스 분석
npm run cli analyze-all

# 크로스 네임스페이스 의존성 분석
npm run cli cross-namespace --detailed
```

### 4. 네임스페이스 분석

```typescript
import { NamespaceDependencyAnalyzer } from '@context-action/dependency-linker';

const analyzer = new NamespaceDependencyAnalyzer();

// 특정 네임스페이스 분석
const result = await analyzer.analyzeNamespace('source', {
  baseDir: './src',
  configPath: './deps.config.json'
});

console.log(`분석된 파일: ${result.files.length}개`);
console.log(`발견된 관계: ${result.graph.edges.size}개`);
```

---

## 🧠 추론 시스템 사용

### 1. 기본 추론 엔진

```typescript
import { InferenceEngine } from '@context-action/dependency-linker';

// 추론 엔진 초기화
const engine = new InferenceEngine(db, {
  enableCache: true,
  cacheSyncStrategy: 'lazy',
  defaultMaxPathLength: 10,
  enableCycleDetection: true
});

console.log('✅ 추론 엔진 초기화 완료');
```

### 2. 계층적 추론

```typescript
// 모든 imports 관계 조회 (imports_file, imports_package 포함)
const imports = await engine.queryHierarchical('imports', {
  includeChildren: true,
  maxDepth: 3
});

console.log(`발견된 임포트: ${imports.length}개`);

// 각 관계의 상세 정보
imports.forEach(rel => {
  console.log(`${rel.fromNodeId} → ${rel.toNodeId} (${rel.type})`);
});
```

### 3. 전이적 추론

```typescript
// A→B→C 체인에서 A→C 관계 추론
const transitive = await engine.queryTransitive(nodeId, 'depends_on', {
  maxPathLength: 10,
  detectCycles: true,
  includeIntermediate: false
});

console.log(`전이적 의존성: ${transitive.length}개`);

// 경로 정보 확인
transitive.forEach(rel => {
  console.log(`경로: ${rel.path.edgeIds.join(' → ')} (깊이: ${rel.path.depth})`);
});
```

### 4. 상속 가능한 추론

```typescript
// File contains Class, Class declares Method → File declares Method
const inheritable = await engine.queryInheritable(nodeId, 'contains', 'declares', {
  maxDepth: 5,
  includeIntermediate: false
});

console.log(`상속된 관계: ${inheritable.length}개`);
```

### 5. 모든 추론 실행

```typescript
// 특정 노드에 대한 모든 추론 실행
const allInferences = await engine.inferAll(nodeId);

console.log(`계층적: ${allInferences.hierarchical.length}개`);
console.log(`전이적: ${allInferences.transitive.length}개`);
console.log(`상속 가능: ${allInferences.inheritable.length}개`);
```

---

## ⚡ 성능 최적화

### 1. 최적화된 추론 엔진

```typescript
import { OptimizedInferenceEngine } from '@context-action/dependency-linker';

// 최적화된 추론 엔진 초기화
const optimizedEngine = new OptimizedInferenceEngine(db, {
  enableLRUCache: true,
  cacheSize: 2000,
  enablePerformanceMonitoring: true,
  enableIncrementalInference: true
});

console.log('✅ 최적화된 추론 엔진 초기화 완료');
```

### 2. 성능 모니터링

```typescript
// 캐시 통계 조회
const cacheStats = optimizedEngine.getLRUCacheStatistics();
console.log(`캐시 크기: ${cacheStats.size}/${cacheStats.maxSize}`);
console.log(`히트율: ${(cacheStats.hitRate * 100).toFixed(2)}%`);
console.log(`미스율: ${(cacheStats.missRate * 100).toFixed(2)}%`);

// 성능 메트릭 조회
const metrics = optimizedEngine.getPerformanceMetrics();
const queryTime = metrics.get('queryTime');
console.log(`평균 쿼리 시간: ${queryTime?.average}ms`);
console.log(`최대 쿼리 시간: ${queryTime?.max}ms`);
```

### 3. 배치 처리

```typescript
import { BatchProcessor } from '@context-action/dependency-linker';

// 배치 처리기 초기화
const processor = new BatchProcessor({
  batchSize: 100,
  concurrency: 4,
  timeout: 30000,
  retryCount: 3,
  retryDelay: 1000
});

// 파일 목록
const files = [
  { content: sourceCode1, language: 'typescript', path: 'src/App.tsx' },
  { content: sourceCode2, language: 'typescript', path: 'src/User.ts' },
  // ... 더 많은 파일들
];

// 배치 처리 실행
const result = await processor.process(files, async (file) => {
  return await analyzeFile(file.content, file.language, file.path);
});

console.log(`처리 완료: ${result.statistics.successful}/${result.statistics.total}`);
console.log(`처리 속도: ${result.statistics.throughput.toFixed(2)} files/sec`);
console.log(`실행 시간: ${result.statistics.executionTime}ms`);
```

### 4. 병렬 배치 처리

```typescript
import { ParallelBatchProcessor } from '@context-action/dependency-linker';

// 병렬 배치 처리기 초기화
const parallelProcessor = new ParallelBatchProcessor({
  batchSize: 50,
  concurrency: 8  // CPU 코어 수에 맞춰 조정
});

// 병렬 처리 실행
const result = await parallelProcessor.processParallel(files, async (file) => {
  return await analyzeFile(file.content, file.language, file.path);
});

console.log(`병렬 처리 완료: ${result.statistics.successful}개 성공`);
```

### 5. 스트리밍 배치 처리

```typescript
import { StreamingBatchProcessor } from '@context-action/dependency-linker';

// 스트리밍 배치 처리기 초기화
const streamingProcessor = new StreamingBatchProcessor();

// 스트리밍 처리 실행
const result = await streamingProcessor.processStreaming(
  files,
  async (file) => await analyzeFile(file.content, file.language, file.path),
  (batch, batchIndex) => {
    console.log(`배치 ${batchIndex} 완료: ${batch.length}개 항목`);
  }
);
```

---

## 🔍 고급 기능

### 1. 커스텀 쿼리 매핑

```typescript
// 커스텀 키 매핑 정의
const customMapping = {
  'my_imports': 'ts-import-sources',
  'my_functions': 'ts-function-definitions',
  'my_classes': 'ts-class-definitions'
};

// 커스텀 매핑으로 분석
const result = await analyzeFile(sourceCode, 'typescript', 'src/App.tsx', {
  mapping: customMapping
});

console.log('임포트:', result.customResults?.my_imports);
console.log('함수:', result.customResults?.my_functions);
console.log('클래스:', result.customResults?.my_classes);
```

### 2. 사용자 정의 추론 규칙

```typescript
import { CustomInferenceRuleEngine } from '@context-action/dependency-linker';

// 사용자 정의 규칙 생성
const customRule = {
  condition: {
    nodeType: 'Class',
    hasProperty: 'isAbstract',
    propertyValue: true
  },
  action: {
    type: 'create_relationship',
    relationshipType: 'can_be_extended',
    targetNodeType: 'Class'
  }
};

// 규칙 엔진 초기화
const ruleEngine = new CustomInferenceRuleEngine(db);
await ruleEngine.addRule(customRule);

// 규칙 실행
await ruleEngine.executeRules();
```

### 3. 실시간 추론

```typescript
import { RealTimeInferenceSystem } from '@context-action/dependency-linker';

// 실시간 추론 시스템 초기화
const realTimeEngine = new RealTimeInferenceSystem(db);

// 변경 이벤트 리스너
realTimeEngine.on('nodeAdded', async (nodeId) => {
  console.log(`새 노드 추가: ${nodeId}`);
  await realTimeEngine.processNodeAddition(nodeId);
});

realTimeEngine.on('relationshipAdded', async (relId) => {
  console.log(`새 관계 추가: ${relId}`);
  await realTimeEngine.processRelationshipAddition(relId);
});

// 실시간 모니터링 시작
await realTimeEngine.startMonitoring();
```

### 4. 고급 쿼리 시스템

```typescript
import { AdvancedQueryLanguage } from '@context-action/dependency-linker';

// GraphQL 쿼리
const graphqlQuery = `
  query GetDependencies($nodeId: ID!) {
    node(id: $nodeId) {
      dependencies {
        type
        target {
          name
          type
        }
      }
    }
  }
`;

const result = await queryEngine.executeGraphQL(graphqlQuery, { nodeId: 1 });

// 자연어 쿼리
const naturalQuery = "Find all classes that extend BaseClass and are used in test files";
const naturalResult = await queryEngine.executeNaturalLanguage(naturalQuery);
```

---

## 🛠️ 문제 해결

### 1. 일반적인 오류

#### `DependencyLinkerError` 처리

```typescript
import { ErrorHandler, ERROR_CODES } from '@context-action/dependency-linker';

try {
  const result = await analyzeFile(sourceCode, 'typescript', 'src/App.tsx');
} catch (error) {
  if (error instanceof DependencyLinkerError) {
    console.error(`에러 코드: ${error.code}`);
    console.error(`메시지: ${error.message}`);
    console.error(`컨텍스트: ${JSON.stringify(error.context)}`);
  } else {
    ErrorHandler.handle(error, 'analyzeFile', ERROR_CODES.OPERATION_FAILED);
  }
}
```

#### 안전한 실행

```typescript
// 안전한 비동기 실행
const result = await ErrorHandler.safeExecute(
  () => analyzeFile(sourceCode, 'typescript', 'src/App.tsx'),
  'analyzeFile',
  ERROR_CODES.OPERATION_FAILED
);

// 재시도 로직
const result = await ErrorHandler.retry(
  () => analyzeFile(sourceCode, 'typescript', 'src/App.tsx'),
  'analyzeFile',
  3,    // 최대 재시도 횟수
  1000  // 재시도 간격 (ms)
);
```

### 2. 성능 문제 해결

#### 메모리 사용량 모니터링

```typescript
// 메모리 사용량 확인
const memUsage = process.memoryUsage();
console.log(`메모리 사용량: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);

// 캐시 크기 조정
const optimizedEngine = new OptimizedInferenceEngine(db, {
  cacheSize: 1000,  // 캐시 크기 줄이기
  enablePerformanceMonitoring: true
});
```

#### 배치 크기 조정

```typescript
// 작은 배치 크기로 조정
const processor = new BatchProcessor({
  batchSize: 50,     // 배치 크기 줄이기
  concurrency: 2,    // 동시 처리 수 줄이기
  timeout: 60000     // 타임아웃 늘리기
});
```

### 3. 데이터베이스 문제 해결

#### 연결 문제

```typescript
try {
  await db.initialize();
} catch (error) {
  console.error('데이터베이스 초기화 실패:', error.message);
  
  // 데이터베이스 파일 확인
  const fs = require('fs');
  if (fs.existsSync('my-project.db')) {
    console.log('데이터베이스 파일 존재');
  } else {
    console.log('데이터베이스 파일 없음');
  }
}
```

#### 쿼리 최적화

```typescript
// 인덱스 확인
const indexes = await db.query(`
  SELECT name FROM sqlite_master 
  WHERE type='index' AND tbl_name='nodes'
`);

console.log('인덱스:', indexes);

// 쿼리 실행 계획 확인
const explain = await db.query(`EXPLAIN QUERY PLAN 
  SELECT * FROM nodes WHERE type = 'Class'
`);

console.log('실행 계획:', explain);
```

---

## 📚 예제 모음

### 1. React 컴포넌트 분석

```typescript
const reactCode = `
import React, { useState, useEffect } from 'react';
import { UserService } from './services/UserService';

interface User {
  id: number;
  name: string;
  email: string;
}

export const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const userData = await UserService.getUsers();
        setUsers(userData);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <ul>
          {users.map(user => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
`;

const result = await analyzeFile(reactCode, 'typescript', 'src/UserList.tsx');

console.log('=== React 컴포넌트 분석 결과 ===');
console.log(`파싱된 노드: ${result.parseMetadata.nodeCount}개`);
console.log(`실행 시간: ${result.performanceMetrics.totalExecutionTime}ms`);

// 임포트 분석
const imports = await analyzeImports(reactCode, 'typescript', 'src/UserList.tsx');
console.log('임포트 소스:', imports.sources);
console.log('네임드 임포트:', imports.named);
console.log('기본 임포트:', imports.defaults);
console.log('타입 임포트:', imports.types);
```

### 2. Express.js API 분석

```typescript
const expressCode = `
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { UserController } = require('./controllers/UserController');
const { AuthMiddleware } = require('./middleware/AuthMiddleware');
const { ErrorHandler } = require('./utils/ErrorHandler');

const app = express();

// 미들웨어 설정
app.use(helmet());
app.use(cors());
app.use(express.json());

// 라우트 설정
app.get('/api/users', AuthMiddleware.authenticate, UserController.getUsers);
app.post('/api/users', AuthMiddleware.authenticate, UserController.createUser);
app.put('/api/users/:id', AuthMiddleware.authenticate, UserController.updateUser);
app.delete('/api/users/:id', AuthMiddleware.authenticate, UserController.deleteUser);

// 에러 핸들링
app.use(ErrorHandler.handle);

module.exports = app;
`;

const result = await analyzeFile(expressCode, 'javascript', 'src/app.js');

console.log('=== Express.js API 분석 결과 ===');
console.log(`파싱된 노드: ${result.parseMetadata.nodeCount}개`);

// 의존성 분석
const deps = await analyzeDependencies(expressCode, 'javascript', 'src/app.js');
console.log('내부 의존성:', deps.internal);
console.log('외부 의존성:', deps.external);
console.log('내장 모듈:', deps.builtin);
```

### 3. Python 클래스 분석

```typescript
const pythonCode = `
from typing import List, Optional
from dataclasses import dataclass
from abc import ABC, abstractmethod

@dataclass
class User:
    id: int
    name: str
    email: str
    is_active: bool = True

    def __str__(self) -> str:
        return f"User({self.id}, {self.name})"

class UserRepository(ABC):
    @abstractmethod
    def find_by_id(self, user_id: int) -> Optional[User]:
        pass

    @abstractmethod
    def find_all(self) -> List[User]:
        pass

    @abstractmethod
    def save(self, user: User) -> User:
        pass

class InMemoryUserRepository(UserRepository):
    def __init__(self):
        self._users: List[User] = []

    def find_by_id(self, user_id: int) -> Optional[User]:
        return next((user for user in self._users if user.id == user_id), None)

    def find_all(self) -> List[User]:
        return self._users.copy()

    def save(self, user: User) -> User:
        self._users.append(user)
        return user
`;

const result = await analyzeFile(pythonCode, 'python', 'src/user.py');

console.log('=== Python 클래스 분석 결과 ===');
console.log(`파싱된 노드: ${result.parseMetadata.nodeCount}개`);

// 함수 정의 분석
const functions = result.queryResults['python-function-definitions'] || [];
console.log('함수 정의:', functions.length);

// 클래스 정의 분석
const classes = result.queryResults['python-class-definitions'] || [];
console.log('클래스 정의:', classes.length);
```

### 4. Java 서비스 분석

```typescript
const javaCode = `
package com.example.service;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import com.example.model.User;
import com.example.repository.UserRepository;
import java.util.List;
import java.util.Optional;

@Service
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
    
    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }
    
    public User createUser(User user) {
        return userRepository.save(user);
    }
    
    public User updateUser(Long id, User userDetails) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setName(userDetails.getName());
        user.setEmail(userDetails.getEmail());
        
        return userRepository.save(user);
    }
    
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }
}
`;

const result = await analyzeFile(javaCode, 'java', 'src/main/java/com/example/service/UserService.java');

console.log('=== Java 서비스 분석 결과 ===');
console.log(`파싱된 노드: ${result.parseMetadata.nodeCount}개`);

// 클래스 선언 분석
const classes = result.queryResults['java-class-declarations'] || [];
console.log('클래스 선언:', classes.length);

// 메서드 선언 분석
const methods = result.queryResults['java-method-declarations'] || [];
console.log('메서드 선언:', methods.length);
```

### 5. 종합 프로젝트 분석

```typescript
import { 
  GraphDatabase, 
  analyzeFile, 
  InferenceEngine,
  BatchProcessor,
  ConfigManager 
} from '@context-action/dependency-linker';

async function analyzeProject() {
  console.log('🚀 프로젝트 분석 시작');
  
  // 1. 데이터베이스 초기화
  const db = new GraphDatabase('project-analysis.db');
  await db.initialize();
  
  // 2. 추론 엔진 초기화
  const engine = new InferenceEngine(db, {
    enableCache: true,
    cacheSyncStrategy: 'lazy'
  });
  
  // 3. 파일 목록 (실제 프로젝트에서 가져오기)
  const files = [
    { content: reactCode, language: 'typescript', path: 'src/UserList.tsx' },
    { content: expressCode, language: 'javascript', path: 'src/app.js' },
    { content: pythonCode, language: 'python', path: 'src/user.py' },
    { content: javaCode, language: 'java', path: 'src/main/java/UserService.java' }
  ];
  
  // 4. 배치 처리로 모든 파일 분석
  const processor = new BatchProcessor({
    batchSize: 2,
    concurrency: 2,
    timeout: 30000
  });
  
  const result = await processor.process(files, async (file) => {
    const analysisResult = await analyzeFile(file.content, file.language, file.path);
    
    // 노드 저장
    const nodeId = await db.upsertNode({
      identifier: `project/${file.path}#File:${file.path}`,
      type: 'File',
      name: file.path,
      sourceFile: file.path,
      language: file.language
    });
    
    return { ...analysisResult, nodeId };
  });
  
  console.log('📊 분석 결과:');
  console.log(`- 처리된 파일: ${result.statistics.successful}개`);
  console.log(`- 처리 속도: ${result.statistics.throughput.toFixed(2)} files/sec`);
  console.log(`- 실행 시간: ${result.statistics.executionTime}ms`);
  
  // 5. 추론 실행
  const allNodes = await db.findNodes({});
  console.log(`- 저장된 노드: ${allNodes.length}개`);
  
  // 6. 관계 분석
  const relationships = await db.findRelationships({});
  console.log(`- 저장된 관계: ${relationships.length}개`);
  
  // 7. 추론 실행
  if (allNodes.length > 0) {
    const inferences = await engine.inferAll(allNodes[0].id);
    console.log(`- 계층적 추론: ${inferences.hierarchical.length}개`);
    console.log(`- 전이적 추론: ${inferences.transitive.length}개`);
    console.log(`- 상속 가능한 추론: ${inferences.inheritable.length}개`);
  }
  
  await db.close();
  console.log('✅ 프로젝트 분석 완료');
}

// 실행
analyzeProject().catch(console.error);
```

---

## 🎯 결론

Dependency Linker는 다양한 프로그래밍 언어와 프로젝트 구조를 지원하는 강력한 의존성 분석 도구입니다:

### ✅ 완성된 기능들
- **멀티 언어 지원**: TypeScript, JavaScript, Python, Java, Go
- **고성능 분석**: Tree-sitter 기반 정확한 파싱
- **강력한 추론**: 계층적, 전이적, 상속 가능한 추론
- **유연한 설정**: Namespace 기반 구성
- **성능 최적화**: LRU 캐싱, 배치 처리, 병렬화

### 🚀 사용 시나리오
- **코드베이스 분석**: 대규모 프로젝트의 의존성 파악
- **리팩토링 지원**: 변경 영향도 분석
- **아키텍처 검증**: 설계 원칙 준수 확인
- **문서화**: 자동 의존성 다이어그램 생성
- **품질 관리**: 순환 의존성 탐지

### 📚 다음 단계
1. **고급 기능 탐색**: 사용자 정의 추론 규칙, 실시간 분석
2. **성능 튜닝**: 프로젝트 크기에 맞는 최적화 설정
3. **통합**: CI/CD 파이프라인에 의존성 분석 통합
4. **시각화**: 의존성 그래프 시각화 도구 연동

**Dependency Linker로 더 나은 코드베이스를 구축하세요!** 🎉

---

**Last Updated**: 2025-01-27
**Version**: 2.1.0
**Maintainer**: Development Team
**Status**: ✅ Complete
