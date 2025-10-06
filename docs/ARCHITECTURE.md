# Dependency Linker Architecture

**Version**: 2.1.0  
**Last Updated**: 2025-01-27  
**Status**: ✅ **Single Source of Truth**

---

## 🎯 **아키텍처 개요**

dependency-linker는 **계층화된 모듈형 아키텍처**를 채택한 다국어 의존성 분석 도구입니다. 13개의 핵심 CLI 명령어를 통해 강력한 의존성 분석 기능을 제공합니다.

## 🏗️ **핵심 아키텍처 원칙**

### 1. **계층화된 구조**
```
CLI Layer (사용자 인터페이스)
    ↓
API Layer (외부 인터페이스)
    ↓
Core Layer (핵심 비즈니스 로직)
    ↓
Data Layer (데이터 저장 및 관리)
    ↓
Parser Layer (언어별 파싱)
```

### 2. **모듈형 설계**
- **단일 책임 원칙**: 각 모듈이 명확한 역할을 가짐
- **의존성 주입**: HandlerFactory를 통한 핸들러 관리
- **인터페이스 분리**: 명확한 API 경계

### 3. **확장성**
- **새로운 언어 지원**: ParserFactory를 통한 쉬운 확장
- **새로운 CLI 명령어**: Handler 패턴을 통한 쉬운 추가
- **새로운 분석 시나리오**: ScenarioRegistry를 통한 확장

## 📋 **13개 CLI 명령어 구조**

### 기본 명령어
- **analyze** - 파일 및 디렉토리 분석
- **rdf** - RDF 주소 생성, 검색, 검증, 통계
- **rdf-file** - RDF 기반 파일 위치 반환 및 파일 열기

### 고급 기능 명령어
- **unknown** - Unknown Symbol 등록, 검색, 추론
- **query** - SQL, GraphQL, 자연어 쿼리 실행
- **cross-namespace** - 네임스페이스 간 의존성 분석
- **inference** - 계층적, 전이적 추론 실행
- **context-documents** - 파일, 심볼, 프로젝트 컨텍스트 문서 생성

### 성능 및 분석 명령어
- **performance** - 성능 분석, 캐시 관리, 모니터링, 최적화
- **markdown** - Markdown 파일 분석, 링크 추적, 헤딩 추출
- **typescript** - TypeScript 파일/프로젝트 분석, 벤치마크
- **namespace** - 네임스페이스 분석, 최적화, 통계
- **benchmark** - 성능 벤치마크 실행

## 🎯 **핵심 컴포넌트**

### 1. **CLI 핸들러 시스템**
```typescript
// HandlerFactory - 싱글톤 패턴으로 핸들러 관리
class HandlerFactory {
  static getRDFHandler(): RDFHandler
  static getUnknownHandler(): UnknownSymbolHandler
  static getQueryHandler(): QueryHandler
  // ... 기타 핸들러들
}
```

### 2. **RDF 주소 시스템**
```typescript
// RDF 주소 형식: <projectName>/<filePath>#<NodeType>:<SymbolName>
interface RDFAddress {
  projectName: string;
  filePath: string;
  nodeType: NodeType;
  symbolName: string;
}
```

### 3. **그래프 데이터베이스**
```typescript
// SQLite 기반 그래프 데이터베이스
class GraphDatabase {
  async addNode(node: GraphNode): Promise<number>
  async addRelationship(relationship: GraphRelationship): Promise<number>
  async queryNodes(query: string): Promise<GraphNode[]>
}
```

## 🔄 **데이터 흐름**

### 1. **분석 프로세스**
```
파일 입력 → 파서 → 심볼 추출 → RDF 주소 생성 → 그래프 데이터베이스 저장
```

### 2. **쿼리 프로세스**
```
사용자 쿼리 → QueryEngine → GraphQueryEngine → 결과 반환
```

### 3. **CLI 프로세스**
```
CLI 명령어 → Handler → Core Logic → Database → 결과 출력
```

## 🎯 **지원 언어**

### 파서 시스템
- **TypeScript/JavaScript**: `.ts`, `.tsx`, `.js`, `.jsx`
- **Java**: `.java`
- **Python**: `.py`, `.pyi`
- **Go**: `.go`
- **Markdown**: `.md`, `.markdown`, `.mdx`

### 언어별 파서
```typescript
// ParserFactory를 통한 언어별 파서 관리
const parser = ParserFactory.getParser('typescript');
const ast = parser.parse(sourceCode);
```

## 🚀 **성능 최적화**

### 1. **캐싱 시스템**
- **AdvancedCache**: 성능 향상을 위한 캐싱
- **RDFCache**: RDF 주소 캐싱
- **QueryCache**: 쿼리 결과 캐싱

### 2. **배치 처리**
- **BatchProcessor**: 대용량 파일 처리
- **병렬 처리**: 여러 파일 동시 분석
- **메모리 관리**: 효율적인 리소스 사용

### 3. **성능 모니터링**
- **PerformanceMonitor**: 실시간 성능 추적
- **메트릭 수집**: 실행 시간, 메모리 사용량
- **최적화 제안**: 성능 개선 방안 제시

## 🔧 **확장성**

### 1. **새로운 언어 추가**
```typescript
// 1. 언어별 파서 구현
class RustParser extends BaseParser {
  parse(sourceCode: string): ASTNode {
    // Rust 파싱 로직
  }
}

// 2. ParserFactory에 등록
ParserFactory.registerParser('rust', new RustParser());
```

### 2. **새로운 CLI 명령어 추가**
```typescript
// 1. 핸들러 구현
class CustomHandler {
  async execute(options: any): Promise<void> {
    // 커스텀 로직
  }
}

// 2. CLI에 등록
program
  .command('custom')
  .action(async (options) => {
    const handler = new CustomHandler();
    await handler.execute(options);
  });
```

## 📊 **품질 보증**

### 1. **타입 안전성**
- **TypeScript**: 완전한 타입 안전성
- **Zero `any` Types**: 모든 타입 명시
- **인터페이스 분리**: 명확한 타입 경계

### 2. **테스트 커버리지**
- **단위 테스트**: 각 모듈별 테스트
- **통합 테스트**: 전체 시스템 테스트
- **성능 테스트**: 벤치마크 및 성능 검증

### 3. **코드 품질**
- **Linting**: Biome을 통한 코드 품질 관리
- **포맷팅**: 일관된 코드 스타일
- **문서화**: 완전한 API 문서

## 🎯 **미래 계획**

### 1. **새로운 언어 지원**
- **Rust**: Use declarations, struct definitions
- **C++**: Include directives, class definitions
- **C#**: Using directives, class definitions

### 2. **고급 기능**
- **Incremental Analysis**: 변경된 파일만 재분석
- **Cross-File Analysis**: 파일 간 의존성 추적
- **Semantic Analysis**: 의미론적 이해

### 3. **성능 최적화**
- **Tree-sitter Query Caching**: 쿼리 캐싱
- **Result Streaming**: 대용량 결과 스트리밍
- **Memory Management**: 메모리 사용량 최적화

---

## 📚 **관련 문서**

- **[CLI 명령어 참조](../02-user-guides/CLI-COMMAND-REFERENCE.md)** - 모든 CLI 명령어 가이드
- **[완전한 기능 가이드](../02-user-guides/COMPLETE-FEATURE-GUIDE.md)** - 모든 기능 설명
- **[RDF 시스템 가이드](../02-user-guides/RDF-FILE-SYSTEM-GUIDE.md)** - RDF 기반 파일 시스템
- **[개발 가이드](../06-development/README.md)** - 개발 및 기여 가이드

---

**⚠️ 주의**: 이 문서는 dependency-linker의 **단일 진실 공급원**입니다. 모든 아키텍처 관련 정보는 이 문서를 기준으로 합니다.
