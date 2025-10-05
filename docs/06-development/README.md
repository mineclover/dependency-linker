# Development

개발 관련 문서 및 컨벤션입니다.

## 📚 문서 목록

- **[Conventions](./CONVENTIONS.md)** - 개발 컨벤션
- **[Testing Strategy](./testing-strategy.md)** - 테스트 전략
- **[Module Organization](./module-organization.md)** - 모듈 구조
- **[Analyzer Ownership Pattern](./analyzer-ownership-pattern.md)** - 분석기 소유권 패턴
- **[Graph Maintenance Conventions](./graph-maintenance-conventions.md)** - 그래프 유지보수
- **[Identifier Strategy](./identifier-strategy.md)** - 식별자 전략

## 🛠️ 개발 가이드

### 코드 컨벤션
- **TypeScript**: 엄격한 타입 체크
- **네이밍**: PascalCase, camelCase 규칙
- **구조**: 모듈별 명확한 분리
- **문서화**: JSDoc 주석 필수

### 테스트 전략
- **단위 테스트**: Jest 기반
- **통합 테스트**: 전체 시스템 테스트
- **성능 테스트**: 대용량 파일 처리
- **호환성 테스트**: 다국어 지원

### 아키텍처 패턴
- **소유권 패턴**: 분석기별 책임 분리
- **그래프 유지보수**: 안전한 데이터베이스 관리
- **식별자 전략**: 고유성 보장

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

### 명세서 및 참조
- **[Specifications](../07-specifications/README.md)** - 명세서
- **[Core Specification](../07-specifications/CORE-SPECIFICATION.md)** - 핵심 명세
- **[Query Specification](../07-specifications/QUERY-SPECIFICATION.md)** - 쿼리 명세
- **[Glossary](../08-reference/GLOSSARY.md)** - 용어집
