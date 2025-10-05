# Core Specification

## 개요
Dependency Linker의 핵심 구성 요소 정의: RDF 주소 체계, Edge Type, 추론 규칙

---

## 1. RDF 주소 체계 (RDF Addressing)

### 1.1 파일 노드 패턴
```
{project-name}/{source-file}
```

**예시:**
- `my-project/src/components/Button.tsx`
- `my-project/docs/README.md`
- `my-project/tests/Button.test.ts`

### 1.2 심볼 노드 패턴
```
{project-name}/{source-file}#{Type}:{Name}
```

**Type 종류:**
- `Class`: 클래스
- `Interface`: 인터페이스
- `Function`: 함수
- `Variable`: 변수
- `Type`: 타입 별칭
- `Method`: 메서드
- `Property`: 속성
- `Enum`: 열거형
- `Namespace`: 네임스페이스

**예시:**
- `my-project/src/components/Button.tsx#Class:Button`
- `my-project/src/utils/helpers.ts#Function:formatDate`
- `my-project/src/types/index.ts#Interface:User`
- `my-project/src/components/Button.tsx#Method:handleClick`

### 1.3 라이브러리 식별자 패턴
```
{library-name}
```

**예시:**
- `react`
- `lodash`
- `@types/node`

### 1.4 Unknown Symbol 패턴
```
{project-name}/{source-file}#Unknown:{imported-name}
```

**예시:**
- `my-project/src/App.tsx#Unknown:SomeExternalComponent`
- `my-project/src/utils.ts#Unknown:unresolvedFunction`

---

## 2. Edge Type 정의

### 2.1 구조적 관계 (Structural)
| Edge Type | 설명 | 전이성 | 상속성 | 방향성 | 우선순위 |
|-----------|------|--------|--------|--------|----------|
| `contains` | 포함 관계 (A contains B) | ✅ | ✅ | ✅ | 0 |
| `declares` | 선언 관계 (A declares B) | ❌ | ✅ | ✅ | 0 |

### 2.2 의존성 관계 (Dependency)
| Edge Type | 설명 | 전이성 | 상속성 | 방향성 | 우선순위 |
|-----------|------|--------|--------|--------|----------|
| `depends_on` | 의존성 관계 | ✅ | ❌ | ✅ | 1 |
| `imports` | Import 관계 | ❌ | ❌ | ✅ | 1 |
| `exports` | Export 관계 | ❌ | ❌ | ✅ | 1 |

### 2.3 상속 관계 (Inheritance)
| Edge Type | 설명 | 전이성 | 상속성 | 방향성 | 우선순위 |
|-----------|------|--------|--------|--------|----------|
| `extends` | 상속 관계 | ✅ | ✅ | ✅ | 2 |
| `implements` | 구현 관계 | ❌ | ❌ | ✅ | 2 |

### 2.4 참조 관계 (Reference)
| Edge Type | 설명 | 전이성 | 상속성 | 방향성 | 우선순위 |
|-----------|------|--------|--------|--------|----------|
| `references` | 참조 관계 | ❌ | ❌ | ✅ | 3 |
| `uses` | 사용 관계 | ❌ | ❌ | ✅ | 3 |
| `calls` | 호출 관계 | ❌ | ❌ | ✅ | 3 |

### 2.5 링크 관계 (Linking)
| Edge Type | 설명 | 전이성 | 상속성 | 방향성 | 우선순위 |
|-----------|------|--------|--------|--------|----------|
| `links_to` | 링크 관계 | ❌ | ❌ | ✅ | 4 |
| `relates_to` | 관련 관계 | ❌ | ❌ | ✅ | 4 |

### 2.6 테스트 관계 (Testing)
| Edge Type | 설명 | 전이성 | 상속성 | 방향성 | 우선순위 |
|-----------|------|--------|--------|--------|----------|
| `tests` | 테스트 관계 | ❌ | ❌ | ✅ | 5 |
| `mocks` | 모킹 관계 | ❌ | ❌ | ✅ | 5 |

### 2.7 문서 관계 (Documentation)
| Edge Type | 설명 | 전이성 | 상속성 | 방향성 | 우선순위 |
|-----------|------|--------|--------|--------|----------|
| `documents` | 문서화 관계 | ❌ | ❌ | ✅ | 6 |
| `describes` | 설명 관계 | ❌ | ❌ | ✅ | 6 |

---

## 3. 추론 규칙 정의

### 3.1 전이적 추론 (Transitive Inference)

#### 규칙 1: 의존성 전이
```
IF A depends_on B AND B depends_on C
THEN A depends_on C
```

**적용 Edge Types:**
- `depends_on`
- `extends`
- `contains`

#### 규칙 2: 상속 전이
```
IF A extends B AND B extends C
THEN A extends C
```

**적용 Edge Types:**
- `extends`
- `implements`

### 3.2 계층적 추론 (Hierarchical Inference)

#### 규칙 3: 포함 계층
```
IF A contains B AND B contains C
THEN A contains C (계층적)
```

**적용 Edge Types:**
- `contains`
- `declares`

#### 규칙 4: 상속 계층
```
IF A extends B
THEN A inherits all relationships from B
```

**적용 Edge Types:**
- `extends`
- `implements`

### 3.3 상속 가능한 추론 (Inheritable Inference)

#### 규칙 5: 메서드 상속
```
IF A extends B AND B declares method M
THEN A declares method M (상속)
```

**적용 Edge Types:**
- `declares` (상속 가능)
- `contains` (상속 가능)

#### 규칙 6: 속성 상속
```
IF A extends B AND B contains property P
THEN A contains property P (상속)
```

**적용 Edge Types:**
- `contains` (상속 가능)
- `declares` (상속 가능)

### 3.4 복합 추론 (Composite Inference)

#### 규칙 7: 의존성 + 상속
```
IF A extends B AND B depends_on C
THEN A depends_on C (상속된 의존성)
```

#### 규칙 8: 참조 + 사용
```
IF A references B AND B uses C
THEN A indirectly_uses C
```

---

## 4. Edge Type 우선순위 체계

### 4.1 우선순위 레벨
- **Level 0**: 구조적 관계 (`contains`, `declares`)
- **Level 1**: 의존성 관계 (`depends_on`, `imports`, `exports`)
- **Level 2**: 상속 관계 (`extends`, `implements`)
- **Level 3**: 참조 관계 (`references`, `uses`, `calls`)
- **Level 4**: 링크 관계 (`links_to`, `relates_to`)
- **Level 5**: 테스트 관계 (`tests`, `mocks`)
- **Level 6**: 문서 관계 (`documents`, `describes`)

### 4.2 추론 적용 순서
1. **구조적 추론** (Level 0) - 기본 구조 파악
2. **의존성 추론** (Level 1) - 의존성 체인 분석
3. **상속 추론** (Level 2) - 상속 관계 분석
4. **참조 추론** (Level 3) - 사용 관계 분석
5. **링크 추론** (Level 4) - 관련성 분석
6. **테스트 추론** (Level 5) - 테스트 관계 분석
7. **문서 추론** (Level 6) - 문서화 관계 분석

---

## 5. 추론 제약 조건

### 5.1 전이성 제약
- **최대 깊이**: 10단계
- **순환 참조**: 자동 감지 및 중단
- **타임아웃**: 30초

### 5.2 상속성 제약
- **최대 계층**: 5단계
- **다중 상속**: 지원 (인터페이스)
- **상속 충돌**: 우선순위 기반 해결

### 5.3 성능 제약
- **배치 크기**: 100개씩 처리
- **캐시 크기**: 1000개 항목
- **메모리 제한**: 512MB

---

## 6. 확장 규칙

### 6.1 새로운 Edge Type 추가
1. **이름 규칙**: `snake_case` 사용
2. **속성 정의**: 전이성, 상속성, 방향성, 우선순위
3. **추론 규칙**: 기존 규칙과의 호환성 확인

### 6.2 새로운 추론 규칙 추가
1. **조건 정의**: IF 절 명확화
2. **결과 정의**: THEN 절 명확화
3. **성능 검증**: 최대 깊이 및 타임아웃 설정

### 6.3 RDF 패턴 확장
1. **새로운 Type**: 기존 Type과 구분되는 명명
2. **패턴 일관성**: 기존 패턴과의 호환성 유지
3. **파싱 규칙**: 정규식 패턴 업데이트

---

## 7. 검증 규칙

### 7.1 RDF 주소 검증
- **프로젝트명**: 영문자, 숫자, 하이픈, 언더스코어만 허용
- **파일 경로**: 상대 경로 형식 준수
- **심볼명**: 영문자, 숫자, 언더스코어만 허용

### 7.2 Edge Type 검증
- **이름 유일성**: 중복 불가
- **속성 일관성**: 전이성/상속성/방향성 조합 검증
- **우선순위**: 0-6 범위 내 값

### 7.3 추론 규칙 검증
- **논리 일관성**: 모순 없는 규칙 정의
- **성능 예측**: 최대 깊이 및 복잡도 계산
- **순환 참조**: 무한 루프 방지 메커니즘

---

## 8. 버전 관리

### 8.1 스키마 버전
- **현재 버전**: 2.1.0
- **호환성**: 하위 호환성 유지
- **마이그레이션**: 자동 변환 지원

### 8.2 변경 이력
- **v2.1.0**: Unknown Symbol 패턴 추가
- **v2.0.0**: 계층적 추론 도입
- **v1.0.0**: 기본 RDF 주소 체계

---

## 9. 참조

### 9.1 관련 문서
- [API Reference](./API-REFERENCE-COMPLETE.md)
- [User Guide](./USER-GUIDE-COMPLETE.md)
- [Feature Overview](./COMPREHENSIVE-FEATURE-GUIDE.md)

### 9.2 구현 파일
- `src/database/inference/EdgeTypeRegistry.ts`
- `src/database/inference/InferenceEngine.ts`
- `src/database/rdf/RDFAddressing.ts`
