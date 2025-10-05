# Dependency Linker - 기능 개요

## 🎯 프로젝트 개요

Dependency Linker는 다양한 프로그래밍 언어로 작성된 코드베이스의 의존성 관계를 분석하고 시각화하는 강력한 도구입니다. Tree-sitter 기반의 정확한 파싱과 SQLite 기반의 그래프 데이터베이스를 통해 대규모 프로젝트에서도 효율적인 의존성 분석을 제공합니다.

## 🚀 핵심 기능

### 1. RDF Addressing 시스템
- **목적**: 노드 식별자를 RDF 스타일로 표준화
- **형식**: `project-name/source-file#Type:Name`
- **예시**: `my-project/src/UserService.ts#Class:UserService`

### 2. Unknown Symbol System (Dual-Node Pattern)
- **목적**: Import된 심볼의 모호성 해결
- **특징**: 
  - Original 노드와 Alias 노드 분리
  - `aliasOf` 관계로 연결
  - 점진적 분석 지원

### 3. Inference System (추론 시스템)
- **계층적 추론**: 부모-자식 관계 추론
- **전이적 추론**: A→B, B→C 이면 A→C 추론
- **상속 가능한 추론**: 속성 전파 추론

### 4. Type Management (타입 관리)
- **Flat Edge Type List**: 계층 구조 제거, 성능 최적화
- **동적 타입 관리**: 런타임에 타입 추가/제거
- **속성 기반 쿼리**: 타입별 속성으로 필터링

### 5. Performance Optimization (성능 최적화)
- **LRU 캐시**: 자주 사용되는 쿼리 결과 캐싱
- **Incremental Inference**: 변경된 부분만 재추론
- **Batch Operations**: 대량 데이터 처리 최적화
- **Index Optimization**: 데이터베이스 쿼리 최적화

### 6. Advanced Query System (고급 쿼리 시스템)
- **SQL 쿼리**: 표준 SQL 문법 지원
- **GraphQL 쿼리**: GraphQL 문법 지원
- **자연어 쿼리**: 자연어로 의존성 질의
- **실시간 쿼리**: WebSocket/SSE 기반 실시간 업데이트

### 7. Custom Inference Rules (사용자 정의 추론 규칙)
- **조건 기반 규칙**: 노드 속성, 관계 존재 등 조건 설정
- **액션 기반 규칙**: 관계 생성, 속성 업데이트 등 액션 실행
- **사용자 정의 함수**: 복잡한 비즈니스 로직 지원

### 8. Real-Time Inference (실시간 추론)
- **변경 감지**: 파일 변경 시 자동 추론 실행
- **디바운싱**: 연속된 변경사항을 효율적으로 처리
- **우선순위 큐**: 중요한 변경사항 우선 처리

## 📊 지원 언어

- **TypeScript/TSX**: 완전 지원
- **JavaScript/JSX**: 완전 지원
- **Java**: 기본 지원
- **Python**: 기본 지원

## 🛠️ 기술 스택

- **파싱**: Tree-sitter
- **데이터베이스**: SQLite
- **런타임**: Node.js
- **언어**: TypeScript
- **테스팅**: Jest (커스텀 테스트 프레임워크)

## 📈 성능 특징

- **대용량 처리**: 수만 개 파일 분석 가능
- **메모리 효율**: LRU 캐시로 메모리 사용량 최적화
- **빠른 쿼리**: 인덱스 최적화로 빠른 응답
- **증분 분석**: 변경된 파일만 재분석

## 🔧 사용 사례

1. **코드베이스 분석**: 대규모 프로젝트의 의존성 구조 파악
2. **리팩토링 지원**: 의존성 영향 범위 분석
3. **아키텍처 검증**: 설계 원칙 준수 여부 확인
4. **코드 품질 관리**: 순환 의존성, 복잡도 분석
5. **문서화 자동화**: 의존성 그래프 기반 문서 생성

## 📚 문서 구조

- **API 문서**: `docs/API.md`
- **사용자 가이드**: `docs/USER-GUIDE.md`
- **성능 최적화**: `docs/PERFORMANCE-OPTIMIZATION.md`
- **마이그레이션 가이드**: `docs/MIGRATION-GUIDE.md`

## 🧪 테스트 커버리지

- **단위 테스트**: 각 모듈별 기능 테스트
- **통합 테스트**: 전체 시스템 통합 테스트
- **성능 테스트**: 대용량 데이터 처리 테스트
- **스트레스 테스트**: 극한 상황 테스트

## 🚀 시작하기

```bash
# 설치
npm install

# 빌드
npm run build

# 테스트 실행
npm test

# 성능 테스트
node test-performance-optimization.js
```
