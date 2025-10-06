# Core Systems

**Version**: 2.1.0  
**Last Updated**: 2025-01-27

핵심 시스템 및 아키텍처 문서들입니다.

## 📚 **문서 목록**

### 🏗️ **시스템 아키텍처**
- **[메인 아키텍처](../../ARCHITECTURE.md)** - 전체 시스템 아키텍처 (단일 진실 공급원)
- **[Query System Guide](./QUERY-SYSTEM-GUIDE.md)** - 쿼리 시스템 가이드
- **[Parser System](./PARSER_SYSTEM.md)** - 파서 시스템
- **[Pipeline Overview](./pipeline-overview.md)** - 파이프라인 개요

### 🔧 **핵심 시스템**
- **[Query Workflow Guide](./query-workflow-guide.md)** - 쿼리 워크플로우
- **[Type System](./type-system.md)** - 타입 시스템
- **[RDF Addressing](./rdf-addressing.md)** - RDF 주소 체계
- **[Unknown Node Inference](./unknown-node-inference.md)** - 알 수 없는 노드 추론

## 🏗️ **시스템 아키텍처**

### 파싱 시스템
- Tree-sitter 기반 AST 파싱
- 다국어 지원 (TypeScript, JavaScript, Java, Python, Go, Markdown)
- 강건한 파싱 (정규식 fallback)

### 쿼리 시스템
- 21개 TypeScript 쿼리
- 4개 카테고리 분류
- 네임스페이스 기반 쿼리 선택

### 그래프 데이터베이스
- SQLite 기반 관계 저장
- RDF 주소 체계
- 실시간 추론 시스템

## 📖 **관련 문서**

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
- **[Module Organization](../06-development/module-organization.md)** - 모듈 구조

### 명세서 및 참조
- **[Specifications](../07-specifications/README.md)** - 명세서
- **[Core Specification](../07-specifications/CORE-SPECIFICATION.md)** - 핵심 명세

---

**⚠️ 주의**: 메인 아키텍처 정보는 **[ARCHITECTURE.md](../../ARCHITECTURE.md)**를 참조하세요.