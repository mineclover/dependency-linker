# Query System Guide

## 개요
Dependency Linker의 쿼리 시스템은 Tree-sitter 기반 AST 파싱을 통해 TypeScript/JavaScript 코드에서 심볼과 의존성을 추출하는 핵심 기능입니다.

---

## 1. 쿼리 시스템 아키텍처

### 1.1 시스템 구성
```
┌─────────────────────────────────────────────────────────────┐
│                    Query System Architecture                │
├─────────────────────────────────────────────────────────────┤
│  Source Code → Tree-sitter Parser → AST → Query Engine     │
│                     ↓                                      │
│  Query Results → Symbol Extraction → Dependency Analysis   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 핵심 컴포넌트
- **Tree-sitter Query Engine**: AST 파싱 및 쿼리 실행
- **Query Registry**: 쿼리 등록 및 관리
- **Query Processor**: 쿼리 결과 처리 및 변환
- **Query Bridge**: Tree-sitter와 기존 시스템 연결

---

## 2. 쿼리 카테고리

### 2.1 Basic Analysis (기본 분석)
**목적**: Import/Export 기본 관계 분석

**포함 쿼리**:
- `ts-import-sources`: Import 소스 경로 추출
- `ts-export-declarations`: Export 선언 추출  
- `ts-export-assignments`: Export 할당 추출

**사용 사례**:
```typescript
// ts-import-sources 쿼리 결과
{
  "queryName": "ts-import-sources",
  "location": { "line": 6, "column": 25 },
  "nodeText": "\"react\"",
  "source": "react"
}

// ts-export-declarations 쿼리 결과  
{
  "queryName": "ts-export-declarations",
  "location": { "line": 25, "column": 14 },
  "nodeText": "export const myFunction",
  "exportName": "myFunction"
}
```

### 2.2 Symbol Definitions (심볼 정의)
**목적**: 클래스, 함수, 인터페이스 등 심볼 정의 분석

**포함 쿼리**:
- `ts-class-definitions`: 클래스 정의
- `ts-interface-definitions`: 인터페이스 정의
- `ts-function-definitions`: 함수 정의
- `ts-method-definitions`: 메서드 정의
- `ts-type-definitions`: 타입 정의
- `ts-enum-definitions`: 열거형 정의
- `ts-variable-definitions`: 변수 정의
- `ts-arrow-function-definitions`: 화살표 함수 정의
- `ts-property-definitions`: 프로퍼티 정의

**사용 사례**:
```typescript
// ts-class-definitions 쿼리 결과
{
  "queryName": "ts-class-definitions",
  "location": { "line": 10, "column": 6 },
  "nodeText": "class MyClass extends BaseClass",
  "class_name": "MyClass",
  "base_class": "BaseClass"
}
```

### 2.3 Dependency Tracking (의존성 추적)
**목적**: 함수 호출, 참조, 상속 등 의존성 관계 분석

**포함 쿼리**:
- `ts-call-expressions`: 함수/메서드 호출
- `ts-new-expressions`: 클래스 인스턴스화
- `ts-member-expressions`: 속성 접근
- `ts-type-references`: 타입 참조
- `ts-extends-clause`: 상속 관계
- `ts-implements-clause`: 구현 관계

**사용 사례**:
```typescript
// ts-call-expressions 쿼리 결과
{
  "queryName": "ts-call-expressions",
  "location": { "line": 15, "column": 4 },
  "nodeText": "obj.method(arg1, arg2)",
  "function_name": "method",
  "object": "obj"
}
```

### 2.4 Advanced Analysis (고급 분석)
**목적**: 네임드 import, 타입 import 등 고급 분석

**포함 쿼리**:
- `ts-named-imports`: 네임드 import
- `ts-default-imports`: 기본 import
- `ts-type-imports`: 타입 import

**사용 사례**:
```typescript
// ts-named-imports 쿼리 결과
{
  "queryName": "ts-named-imports",
  "location": { "line": 3, "column": 9 },
  "nodeText": "{ useState, useEffect }",
  "name": "useState"
}
```

---

## 3. Namespace 기반 쿼리 구성

### 3.1 Namespace Config 구조
```typescript
interface NamespaceConfig {
  queries: {
    categories: QueryCategory[];           // 활성화된 쿼리 카테고리
    custom: {                             // 커스텀 쿼리 설정
      enabled: boolean;
      queryIds: string[];
    };
    options: {                            // 쿼리 실행 옵션
      enableParallelExecution: boolean;
      enableCaching: boolean;
      maxConcurrency: number;
    };
  };
}
```

### 3.2 쿼리 카테고리 선택
```json
{
  "namespaces": {
    "source": {
      "queries": {
        "categories": [
          "basic-analysis",
          "symbol-definitions", 
          "dependency-tracking"
        ],
        "custom": {
          "enabled": false,
          "queryIds": []
        },
        "options": {
          "enableParallelExecution": true,
          "enableCaching": true,
          "maxConcurrency": 4
        }
      }
    }
  }
}
```

---

## 4. CLI 명령어

### 4.1 쿼리 카테고리 확인
```bash
node dist/cli/main.js namespace --queries
```

**출력 예시**:
```
🔍 Available Query Categories:
==================================================
📊 Basic Analysis (basic-analysis)
   Description: Import/Export 기본 분석
   Query Count: 3 queries

📊 Symbol Definitions (symbol-definitions)
   Description: 심볼 정의 분석 (클래스, 함수, 인터페이스 등)
   Query Count: 9 queries
```

### 4.2 네임스페이스별 쿼리 확인
```bash
node dist/cli/main.js namespace --queries-for source
```

**출력 예시**:
```
🔍 Queries for namespace 'source':
==================================================
Categories: basic-analysis, symbol-definitions, dependency-tracking
Custom queries: disabled
Total queries: 18 active queries

Active queries:
  1. ts-import-sources
  2. ts-export-declarations
  3. ts-export-assignments
  4. ts-class-definitions
  // ... 18개 쿼리
```

---

## 5. 성능 최적화

### 5.1 쿼리 실행 최적화
- **병렬 실행**: 독립적인 쿼리들을 동시 실행
- **캐싱**: 동일한 파일에 대한 중복 쿼리 방지
- **배치 처리**: 여러 파일을 배치로 처리

### 5.2 메모리 관리
- **쿼리 결과 캐싱**: LRU 캐시로 메모리 사용량 제한
- **AST 재사용**: 동일한 파일의 여러 쿼리에서 AST 재사용
- **가비지 컬렉션**: 사용하지 않는 쿼리 결과 정리

### 5.3 성능 모니터링
```typescript
// 성능 메트릭 예시
{
  "totalExecutionTime": 1250.5,
  "queryExecutionTime": 980.2,
  "filesProcessed": 120,
  "queriesExecuted": 18,
  "cacheHitRate": 0.85,
  "memoryUsage": "45.2MB"
}
```

---

## 6. 확장성

### 6.1 새로운 쿼리 추가
1. **쿼리 정의**: Tree-sitter 쿼리 문자열 작성
2. **프로세서 구현**: 쿼리 결과 처리 로직
3. **등록**: Query Registry에 쿼리 등록
4. **테스트**: 쿼리 정확성 검증

### 6.2 새로운 언어 지원
1. **파서 설정**: Tree-sitter 언어 파서 등록
2. **쿼리 작성**: 해당 언어의 AST 패턴에 맞는 쿼리 작성
3. **프로세서 구현**: 언어별 결과 처리 로직
4. **통합**: 기존 쿼리 시스템과 통합

---

## 7. 문제 해결

### 7.1 일반적인 문제
- **쿼리 결과가 0개**: Tree-sitter 파싱 오류, 쿼리 문법 오류
- **성능 저하**: 캐싱 비활성화, 병렬 실행 비활성화
- **메모리 부족**: 배치 크기 조정, 캐시 크기 제한

### 7.2 디버깅 방법
```bash
# 상세 로그 활성화
DEBUG=dependency-linker:* node dist/cli/main.js analyze

# 쿼리 실행 시간 측정
node dist/cli/main.js analyze --performance --verbose
```

---

## 8. 참조

### 8.1 관련 문서
- [Query Specification](../specifications/QUERY-SPECIFICATION.md)
- [Core Specification](../specifications/CORE-SPECIFICATION.md)
- [API Reference](./API.md)

### 8.2 구현 파일
- `src/queries/typescript/tree-sitter-queries.ts`: 쿼리 정의
- `src/namespace/analysis-namespace.ts`: Namespace 관리
- `src/core/QueryBridge.ts`: 쿼리 브리지
- `src/core/QueryEngine.ts`: 쿼리 엔진
