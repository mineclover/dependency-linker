# 라이브러리 재구조화 분석

## 📋 라이브러리 핵심 목적 정의

### 🎯 Primary Purpose
**AST 분석 결과를 기반으로 언어별 쿼리를 작성하고, 이를 조합하여 사용할 수 있는 타입 안전한 쿼리 시스템**

### 🔑 Core Requirements
1. **QueryResultMap 중심 설계**: 모든 쿼리 결과가 타입 안전하게 관리됨
2. **언어별 쿼리 지원**: TypeScript, JavaScript, Go, Java 등 언어별 특화 쿼리
3. **쿼리 조합 시스템**: 사용자 정의 키 매핑으로 유연한 쿼리 조합
4. **확장 가능한 구조**: 새로운 언어/쿼리 타입 쉽게 추가 가능
5. **타입 안전성**: 컴파일 타임 타입 검증과 런타임 검증

## 🔍 현재 구조 분석

### 필요 기능 (Keep)
```
src/
├── extractors/primary-analysis/           # ✅ 핵심 - 함수형 쿼리 시스템
│   ├── queries/ImportQueries.ts          # ✅ QueryResultMap 중심 시스템
│   ├── core/QueryEngine.ts               # ✅ 쿼리 실행 엔진
│   ├── results/QueryResults.ts           # ✅ 타입 정의
│   └── __tests__/                        # ✅ 테스트
├── parsers/                               # ✅ 필요 - 언어별 AST 파서
│   ├── TypeScriptParser.ts               # ✅ TypeScript 지원
│   ├── JavaScriptParser.ts               # ✅ JavaScript 지원
│   ├── GoParser.ts                       # ✅ Go 지원
│   └── JavaParser.ts                     # ✅ Java 지원
└── types/TreeSitterTypes.ts              # ✅ Tree-sitter 타입 정의
```

### 불필요 기능 (Remove)
```
src/
├── api/                                   # ❌ 복잡한 API 레이어 - 단순화 필요
├── services/analysis-engine/              # ❌ 과도한 추상화
├── services/integration/                  # ❌ 복잡한 통합 레이어
├── interpreters/                          # ❌ 별도 해석 레이어 - 쿼리에 통합
├── models/                                # ❌ 복잡한 모델 시스템
├── extractors/enhanced-export/            # ❌ 별도 추출기 - 쿼리로 통합
├── lib/                                   # ❌ 레거시 라이브러리 함수들
└── examples/                              # ❌ 문서로 이전
```

### 레거시 시스템 (Remove)
- `services/AnalysisEngine` - 클래스 기반 구 시스템
- `extractors/enhanced-export` - 별도 추출기 (쿼리로 통합)
- `interpreters/` - 별도 해석 레이어 (불필요)
- `api/cache` - 복잡한 캐시 시스템 (단순화)

## 🏗️ 새로운 구조 설계

### 📁 New src/ Structure
```
src/
├── core/                                  # 핵심 시스템
│   ├── QueryEngine.ts                    # 쿼리 실행 엔진
│   ├── QueryResultMap.ts                 # 중앙 타입 관리
│   ├── ASTProvider.ts                    # AST 제공자
│   └── types.ts                          # 공통 타입 정의
├── parsers/                               # 언어별 파서
│   ├── typescript/                       # TypeScript 전용
│   │   ├── parser.ts                     # AST 파서
│   │   └── index.ts                      # 익스포트
│   ├── javascript/                       # JavaScript 전용
│   ├── go/                               # Go 전용
│   ├── java/                             # Java 전용
│   └── index.ts                          # 통합 익스포트
├── queries/                               # 언어별 쿼리 그룹
│   ├── typescript/                       # TypeScript 쿼리들
│   │   ├── imports.ts                    # import 관련 쿼리
│   │   ├── exports.ts                    # export 관련 쿼리
│   │   ├── classes.ts                    # 클래스 관련 쿼리
│   │   ├── functions.ts                  # 함수 관련 쿼리
│   │   ├── types.ts                      # 타입 관련 쿼리
│   │   └── index.ts                      # 통합 익스포트
│   ├── javascript/                       # JavaScript 쿼리들
│   ├── go/                               # Go 쿼리들
│   ├── java/                             # Java 쿼리들
│   ├── common/                           # 공통 쿼리들
│   │   ├── comments.ts                   # 주석 쿼리
│   │   ├── identifiers.ts                # 식별자 쿼리
│   │   └── index.ts
│   └── index.ts                          # 전체 쿼리 통합
├── results/                               # 결과 타입 정의
│   ├── base.ts                           # BaseQueryResult
│   ├── imports.ts                        # Import 관련 결과 타입
│   ├── exports.ts                        # Export 관련 결과 타입
│   ├── classes.ts                        # 클래스 관련 결과 타입
│   ├── functions.ts                      # 함수 관련 결과 타입
│   └── index.ts                          # 통합 익스포트
├── mappers/                               # 쿼리 매핑 시스템
│   ├── CustomKeyMapper.ts                # 사용자 정의 키 매핑
│   ├── LanguageMapper.ts                 # 언어별 매핑
│   ├── PredefinedMappings.ts             # 사전 정의 매핑
│   └── index.ts
├── utils/                                 # 유틸리티
│   ├── tree-sitter.ts                    # Tree-sitter 헬퍼
│   ├── ast-helpers.ts                    # AST 헬퍼
│   └── validation.ts                     # 검증 헬퍼
└── index.ts                               # 메인 엔트리포인트
```

## 🎨 언어별 쿼리 그루핑 전략

### 1. 언어별 디렉토리 구조
```typescript
// queries/typescript/imports.ts
export const importSourceQuery: TypedQueryFunction<"ts-import-sources"> = {
  name: "ts-import-sources",
  languages: ["typescript", "tsx"],
  // TypeScript 특화 import 쿼리
};

// queries/javascript/imports.ts
export const importSourceQuery: TypedQueryFunction<"js-import-sources"> = {
  name: "js-import-sources",
  languages: ["javascript", "jsx"],
  // JavaScript 특화 import 쿼리
};
```

### 2. 언어별 QueryResultMap 확장
```typescript
// results/index.ts
export interface BaseQueryResultMap {
  // 공통 쿼리들
  "comments": CommentResult;
  "identifiers": IdentifierResult;
}

export interface TypeScriptQueryResultMap extends BaseQueryResultMap {
  "ts-import-sources": ImportSourceResult;
  "ts-export-declarations": ExportDeclarationResult;
  "ts-class-definitions": ClassDefinitionResult;
  "ts-interface-definitions": InterfaceDefinitionResult;
  "ts-type-aliases": TypeAliasResult;
}

export interface JavaScriptQueryResultMap extends BaseQueryResultMap {
  "js-import-sources": ImportSourceResult;
  "js-export-declarations": ExportDeclarationResult;
  "js-function-declarations": FunctionDeclarationResult;
}

export interface GoQueryResultMap extends BaseQueryResultMap {
  "go-package-declarations": PackageDeclarationResult;
  "go-import-declarations": GoImportResult;
  "go-function-declarations": GoFunctionResult;
  "go-struct-definitions": StructDefinitionResult;
}
```

### 3. 통합 QueryResultMap
```typescript
// core/QueryResultMap.ts
export interface UnifiedQueryResultMap extends
  TypeScriptQueryResultMap,
  JavaScriptQueryResultMap,
  GoQueryResultMap,
  JavaQueryResultMap {
}

export type QueryKey = keyof UnifiedQueryResultMap;
export type LanguageQueryKey<L extends Language> =
  L extends "typescript" ? keyof TypeScriptQueryResultMap :
  L extends "javascript" ? keyof JavaScriptQueryResultMap :
  L extends "go" ? keyof GoQueryResultMap :
  keyof JavaQueryResultMap;
```

## 🔄 마이그레이션 계획

### Phase 1: 새 구조 생성
1. `src-new/` 디렉토리 생성
2. 핵심 시스템 구조 설정
3. 기본 타입 및 인터페이스 정의

### Phase 2: 핵심 기능 마이그레이션
1. QueryEngine 이전
2. 기존 함수형 쿼리 시스템 이전
3. TypeScript 쿼리들 언어별 구조로 재구성

### Phase 3: 언어별 확장
1. JavaScript 쿼리 추가
2. Go 쿼리 추가
3. Java 쿼리 추가

### Phase 4: 통합 및 정리
1. 사용자 정의 키 매핑 시스템 통합
2. 문서 업데이트
3. 구 src/ 디렉토리 제거

## 📊 예상 효과

### ✅ 장점
- **명확한 책임 분리**: 언어별, 기능별 명확한 구조
- **확장성**: 새 언어/쿼리 타입 쉽게 추가
- **타입 안전성**: 언어별 타입 분리로 더 정확한 타입 추론
- **유지보수성**: 단순하고 명확한 구조
- **성능**: 불필요한 추상화 제거로 성능 향상

### ⚠️ 주의사항
- **Breaking Changes**: 기존 API 일부 변경 필요
- **Migration Effort**: 기존 코드 마이그레이션 작업 필요
- **Documentation**: 새 구조에 맞는 문서 업데이트 필요

## 🎯 핵심 가치 제안

**"언어별 특화된 AST 쿼리를 타입 안전하게 조합할 수 있는 간단하고 강력한 시스템"**

1. **Simple**: 복잡한 추상화 제거, 직관적인 API
2. **Type-Safe**: 완전한 타입 안전성과 IntelliSense 지원
3. **Extensible**: 새 언어/쿼리 쉽게 추가 가능
4. **Composable**: 유연한 쿼리 조합 시스템
5. **Performance**: Tree-sitter 기반 고성능 AST 분석