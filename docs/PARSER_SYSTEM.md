# Parser System Documentation

## 개요

Multi-language AST 파서 시스템으로, Tree-sitter를 기반으로 TypeScript, Java, Python, Go를 지원합니다. 테스트 격리와 실제 사용 최적화를 모두 고려한 이중 전략 설계입니다.

## 아키텍처

### 핵심 컴포넌트

```
ParserSystem
├── ParserFactory (테스트용 - 매번 새 인스턴스)
├── ParserManager (실제 사용용 - 인스턴스 재사용)
├── Individual Parsers (언어별 파서)
│   ├── TypeScriptParser (TS/TSX 지원)
│   ├── JavaParser
│   ├── PythonParser
│   └── GoParser
└── Query Integration (Tree-sitter 쿼리 시스템)
```

### 설계 철학

1. **테스트 격리**: `ParserFactory`는 매번 새로운 파서 인스턴스를 생성하여 테스트 간 상태 오염 방지
2. **실제 사용 최적화**: `ParserManager`는 파서 인스턴스를 재사용하여 10-15배 성능 향상
3. **언어 통합**: 모든 언어에 대해 일관된 인터페이스 제공

## 사용법

### 기본 사용 (테스트/개발)

```typescript
import { parseCode } from './src/parsers';

// 단일 파일 파싱
const result = await parseCode(sourceCode, 'typescript', 'app.tsx');

// 결과 구조
interface ParseResult {
  tree: Tree;
  context: QueryExecutionContext;
  metadata: {
    language: SupportedLanguage;
    filePath?: string;
    parseTime: number;
    nodeCount: number;
  };
}
```

### 최적화된 사용 (실제 운영)

```typescript
import { globalParserManager } from './src/parsers/ParserManager';

// 단일 파일 분석
const result = await globalParserManager.analyzeFile(
  sourceCode,
  'typescript',
  'app.tsx'
);

// 여러 파일 배치 처리
const results = await globalParserManager.analyzeFiles([
  { content: tsCode, language: 'typescript', filePath: 'app.tsx' },
  { content: javaCode, language: 'java', filePath: 'Service.java' },
  { content: pyCode, language: 'python', filePath: 'script.py' }
]);

// 프로젝트 전체 분석
const analysis = await globalParserManager.analyzeProject(projectFiles);
```

### 쿼리 시스템 통합

```typescript
import { executeTreeSitterQuery } from './src/core/QueryBridge';

// Tree-sitter 쿼리 실행
const matches = await executeTreeSitterQuery('ts-import-sources', context);

// 커스텀 키 매핑
import { createCustomKeyMapper } from './src/mappers/CustomKeyMapper';

const mapper = createCustomKeyMapper({
  '임포트': 'ts-import-sources',
  '함수정의': 'ts-function-declarations'
});

const results = await mapper.execute(matches, context);
```

## 지원 언어

### TypeScript/JavaScript
- **확장자**: `.ts`, `.tsx`, `.js`, `.jsx`
- **특징**: JSX 자동 감지, React 컴포넌트 파싱 최적화
- **쿼리**: import/export, 함수, 클래스, 인터페이스

### Java
- **확장자**: `.java`
- **특징**: 클래스, 메서드, 패키지 구조 분석
- **쿼리**: import, 클래스 선언, 메서드 정의

### Python
- **확장자**: `.py`, `.pyi`
- **특징**: 동적 타입, 데코레이터, 비동기 함수 지원
- **쿼리**: import, 함수, 클래스, 비동기 함수

### Go
- **확장자**: `.go`
- **특징**: 패키지 시스템, 구조체, 인터페이스
- **쿼리**: import, 함수, 구조체, 인터페이스

## 성능 특성

### 테스트 환경
- **첫 파싱**: 2-5ms (파서 초기화 포함)
- **후속 파싱**: 0.1-0.5ms (매번 새 인스턴스)
- **격리 보장**: 100% (테스트 간 상태 오염 없음)

### 실제 사용 환경
- **첫 파싱**: 2-5ms (파서 초기화 포함)
- **후속 파싱**: 0.05-0.1ms (인스턴스 재사용)
- **성능 향상**: 10-15배
- **메모리 효율**: 파서 인스턴스 공유로 메모리 절약

## 테스트 전략

### 필수 테스트 시나리오

1. **파서 인터페이스 일관성** (`query-interface-validation.test.ts`)
   - 모든 언어에 대한 일관된 결과 구조 보장
   - ParseResult 인터페이스 준수 검증

2. **파서 재사용 안전성** (`parser-reuse-validation.test.ts`)
   - 단일 파서 인스턴스로 여러 파일 처리 검증
   - 상태 일관성 및 에러 복구 테스트

3. **핵심 기능** (`core-functionality.test.ts`)
   - CustomKeyMapper 기본 동작 검증
   - 쿼리 레지스트리 통합 테스트

### 테스트 실행
```bash
# 필수 테스트만 실행
npm test -- query-interface-validation core-functionality parser-reuse-validation

# 전체 테스트
npm test
```

## API 레퍼런스

### ParserFactory
```typescript
class ParserFactory {
  // 언어별 새 파서 인스턴스 생성 (테스트용)
  createParser(language: SupportedLanguage): BaseParser;

  // 파일 확장자로 언어 자동 감지
  createParserForFile(filePath: string): BaseParser | null;

  // 지원 언어 목록
  getSupportedLanguages(): SupportedLanguage[];
}
```

### ParserManager
```typescript
class ParserManager {
  // 단일 파일 분석 (최적화됨)
  analyzeFile(content: string, language: SupportedLanguage, filePath?: string): Promise<ParseResult>;

  // 여러 파일 배치 처리
  analyzeFiles(files: AnalysisFile[]): Promise<AnalysisResult[]>;

  // 프로젝트 전체 분석
  analyzeProject(projectFiles: ProjectFile[]): Promise<ProjectAnalysis>;

  // 성능 통계
  getStats(): ParserStats;

  // 메모리 정리
  cleanup(maxIdleTime?: number): void;
}
```

### BaseParser
```typescript
abstract class BaseParser {
  // 소스 코드 파싱
  abstract parse(sourceCode: string, options?: ParserOptions): Promise<ParseResult>;

  // 파일 파싱
  abstract parseFile(filePath: string, options?: ParserOptions): Promise<ParseResult>;

  // 지원 확장자
  abstract getSupportedExtensions(): string[];
}
```

## 설정

### TypeScript 설정
```typescript
// tsconfig.json에서 strict 모드 활성화 권장
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true
  }
}
```

### 환경 변수
```bash
# 디버깅 모드 (상세한 파싱 로그)
DEBUG_PARSER=true

# 성능 모니터링
PARSER_STATS=true
```

## 문제해결

### 일반적인 문제

1. **"Failed to parse TypeScript code"**
   - JSX 코드인데 `.ts` 확장자 사용: `.tsx`로 변경 또는 올바른 언어 지정
   - 문법 오류: 소스 코드 검증

2. **테스트 격리 문제**
   - `ParserFactory` 사용 확인
   - Jest 설정에서 `--runInBand` 옵션 고려

3. **성능 이슈**
   - 실제 사용에서는 `ParserManager` 사용
   - 파서 인스턴스 재사용 확인

### 디버깅

```typescript
// 파싱 로그 활성화
process.env.DEBUG_PARSER = 'true';

// 성능 모니터링
const stats = globalParserManager.getStats();
console.log('Parser usage:', stats);
```

## 버전 호환성

- **Node.js**: 18.x 이상
- **TypeScript**: 5.x 이상
- **Tree-sitter**: 0.21.x
- **Jest**: 29.x (테스트)

## 라이선스

프로젝트 루트의 LICENSE 파일 참조