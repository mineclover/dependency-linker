# Specifications

시스템 명세서 및 기술 문서들입니다.

## 📚 문서 목록

- **[Core Specification](./CORE-SPECIFICATION.md)** - 핵심 시스템 명세
- **[Query Specification](./QUERY-SPECIFICATION.md)** - 쿼리 시스템 명세
- **[CORE-SPECIFICATION.md](./CORE-SPECIFICATION.md)** - 핵심 명세 (중복)
- **[QUERY-SPECIFICATION.md](./QUERY-SPECIFICATION.md)** - 쿼리 명세 (중복)

## 📋 명세서 내용

### 핵심 시스템 명세
- **RDF 주소 체계**: 노드 식별자 표준화
- **엣지 타입**: 관계 타입 정의
- **추론 규칙**: 계층적, 전이적, 상속 가능한 추론
- **타입 관리**: 플랫 엣지 타입 리스트

### 쿼리 시스템 명세
- **21개 TypeScript 쿼리**: 완전한 쿼리 목록
- **4개 카테고리**: 기본 분석, 심볼 정의, 의존성 추적, 고급 분석
- **쿼리 매핑**: 카테고리별 쿼리 매핑
- **실행 옵션**: 병렬 처리, 캐싱, 동시성 제어

## 🔧 기술적 세부사항

### RDF 주소 체계
```
형식: project-name/source-file#Type:Name
예시: my-project/src/UserService.ts#Class:UserService
```

### 엣지 타입 속성
- **transitivity**: 전이성 (true/false)
- **inheritability**: 상속 가능성 (true/false)
- **directionality**: 방향성 (directed/undirected)
- **priority**: 우선순위 (0-100)

## 📖 관련 문서

### 핵심 시스템
- **[Core Systems](../04-core-systems/README.md)** - 핵심 시스템
- **[Query System Guide](../04-core-systems/QUERY-SYSTEM-GUIDE.md)** - 쿼리 시스템
- **[Parser System](../04-core-systems/PARSER_SYSTEM.md)** - 파서 시스템
- **[Type System](../04-core-systems/type-system.md)** - 타입 시스템

### API 및 사용법
- **[API Reference](../03-api-reference/README.md)** - API 문서
- **[User Guides](../02-user-guides/README.md)** - 사용자 가이드
- **[Getting Started](../01-getting-started/README.md)** - 시작하기

### 고급 기능
- **[Advanced Features](../05-advanced-features/README.md)** - 고급 기능
- **[Performance Optimization](../05-advanced-features/PERFORMANCE-OPTIMIZATION.md)** - 성능 최적화
- **[Namespace Scenario Guide](../05-advanced-features/namespace-scenario-guide.md)** - 네임스페이스 시나리오

### 개발 관련
- **[Development Guide](../06-development/README.md)** - 개발 가이드
- **[Conventions](../06-development/CONVENTIONS.md)** - 개발 컨벤션
- **[Testing Strategy](../06-development/testing-strategy.md)** - 테스트 전략

### 참조 자료
- **[Glossary](../08-reference/GLOSSARY.md)** - 용어집
- **[Package Exports](../08-reference/PACKAGE_EXPORTS.md)** - 패키지 익스포트