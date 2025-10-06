# 아키텍처 단일 진실 공급원 (Single Source of Truth)

**Version**: 2.1.0  
**Last Updated**: 2025-01-27  
**Status**: 🚨 **CRITICAL - 버전 불일치 해결 필요**

---

## 🎯 **단일 진실 공급원 정의**

이 문서는 dependency-linker 프로젝트의 **유일한 아키텍처 진실 공급원**입니다. 모든 아키텍처 관련 정보는 이 문서를 기준으로 합니다.

## 📋 **현재 상태 요약**

### ✅ **잘 관리되는 부분**
- **CLI 구조**: 13개 핵심 명령어로 정리됨
- **핸들러 시스템**: 모듈형 아키텍처로 구현됨
- **RDF 시스템**: 완전한 구현 및 문서화

### ❌ **심각한 문제점**

#### 1. **버전 불일치 (Critical)**
```
현재 상태:
- package.json: 2.1.0
- README.md: 2.1.0
- ARCHITECTURE.md: 3.0.0 ❌
- claudedocs/: 3.0.0 ❌
- features/: 3.0.0 ❌
```

#### 2. **아키텍처 문서 중복**
- **ARCHITECTURE.md**: QueryResultMap-centric
- **claudedocs/ARCHITECTURAL_RULES_AND_PRINCIPLES.md**: Query-Centric
- **docs/04-core-systems/**: 시스템별 분산 문서

#### 3. **문서 위치 혼재**
- 루트, docs/, claudedocs/, features/ 등 여러 위치에 분산

## 🎯 **해결 방안**

### 1. **버전 통일**
```bash
# 모든 문서를 2.1.0으로 통일
- package.json: 2.1.0 ✅
- README.md: 2.1.0 ✅  
- ARCHITECTURE.md: 2.1.0 (수정 필요)
- 모든 문서: 2.1.0 (수정 필요)
```

### 2. **아키텍처 문서 통합**
```
📁 통합된 아키텍처 문서 구조:
docs/
├── ARCHITECTURE.md (메인 아키텍처 문서)
├── 04-core-systems/
│   ├── README.md (시스템 개요)
│   ├── QUERY-SYSTEM-GUIDE.md
│   ├── RDF-ADDRESS-ARCHITECTURE.md
│   └── [기타 시스템별 문서]
└── 06-development/
    ├── CONVENTIONS.md
    └── module-organization.md
```

### 3. **단일 진실 공급원 확립**
- **메인 아키텍처**: `docs/ARCHITECTURE.md`
- **시스템별 세부사항**: `docs/04-core-systems/`
- **개발 가이드**: `docs/06-development/`

## 📊 **현재 아키텍처 상태**

### 🏗️ **핵심 아키텍처 (실제 구현 기준)**

#### 1. **계층화된 모듈형 아키텍처**
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

#### 2. **13개 CLI 명령어 구조**
```
기본 명령어:
- analyze, rdf, rdf-file

고급 기능 명령어:  
- unknown, query, cross-namespace, inference, context-documents

성능 및 분석 명령어:
- performance, markdown, typescript, namespace, benchmark
```

#### 3. **핸들러 기반 CLI 시스템**
- **HandlerFactory**: 싱글톤 패턴으로 핸들러 관리
- **모듈형 설계**: 각 핸들러가 독립적인 역할
- **의존성 주입**: 깔끔한 의존성 관리

## 🎯 **다음 단계**

### 1. **즉시 해결 필요 (Critical)**
- [ ] 모든 문서의 버전을 2.1.0으로 통일
- [ ] 중복된 아키텍처 문서 통합
- [ ] 단일 진실 공급원 문서 확립

### 2. **단기 개선 (High Priority)**
- [ ] 아키텍처 문서 구조 정리
- [ ] 문서 간 일관성 확보
- [ ] 버전 관리 프로세스 수립

### 3. **장기 개선 (Medium Priority)**
- [ ] 아키텍처 문서 자동화
- [ ] 문서 일관성 검증 도구
- [ ] 아키텍처 변경 추적 시스템

## 📝 **문서 관리 원칙**

### 1. **단일 진실 공급원**
- 모든 아키텍처 정보는 이 문서를 기준으로 함
- 다른 문서는 이 문서를 참조하도록 함

### 2. **버전 일관성**
- 모든 문서는 동일한 버전을 유지
- 버전 변경 시 모든 문서를 동시에 업데이트

### 3. **문서 구조화**
- 메인 아키텍처: `docs/ARCHITECTURE.md`
- 시스템별 세부사항: `docs/04-core-systems/`
- 개발 가이드: `docs/06-development/`

---

**⚠️ 주의**: 이 문서가 업데이트되면 모든 관련 문서를 검토하고 일관성을 확보해야 합니다.
