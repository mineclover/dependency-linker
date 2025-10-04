# Features 중복 정의 점검 리포트

**점검 일자**: 2025-10-05
**점검 범위**: features/ 디렉토리 전체 (10개 features)

---

## 📊 전체 Features 목록

```
features/
├── 1. context-documents/              ✅ 고유
├── 2. cross-namespace/                ✅ 고유
├── 3. dependency-analysis/            ✅ 고유
├── 4. inference-system/               ✅ 새로 추가 (2025-10-05)
├── 5. namespace-management/           ✅ 고유
├── 6. namespace-scenario-integration/ ✅ 고유
├── 7. query-and-inference/            ⚠️ 중복 발견
├── 8. rdf-addressing/                 ✅ 새로 추가 (2025-10-05)
├── 9. scenario-system/                ✅ 고유
└── 10. unknown-symbol-system/         ✅ 새로 추가 (2025-10-05)
```

---

## 🔴 중복 발견: `query-and-inference` vs `inference-system`

### 문제점

**`query-and-inference/README.md`**:
- **Category**: Core Feature
- **Status**: ✅ Query Ready, 🚧 Inference In Development
- **Components**:
  1. Query System (GraphDB 조회)
  2. Inference System (간접 의존성 추론)

**`inference-system/README.md`**:
- **Category**: Core Feature
- **Status**: 🚧 In Development
- **Target Version**: 3.2.0
- **Focus**: 3가지 추론 타입 (Hierarchical, Transitive, Inheritable)

### 중복 내용

| 기능 | query-and-inference | inference-system | 중복 여부 |
|------|---------------------|------------------|----------|
| **Query System** | ✅ 포함 (네임스페이스별 조회) | ❌ 없음 | ❌ 중복 아님 |
| **Hierarchical Inference** | ✅ 포함 (간략) | ✅ 포함 (상세) | 🔴 **중복** |
| **Transitive Inference** | ✅ 포함 (간략) | ✅ 포함 (상세) | 🔴 **중복** |
| **Inheritable Inference** | ❌ 언급만 | ✅ 포함 (상세) | 🟡 부분 중복 |
| **LLM Context 구성** | ✅ 포함 | ✅ 포함 | 🔴 **중복** |

### 세부 비교

#### 1. Hierarchical Inference (계층적 추론)

**query-and-inference**:
```markdown
- Parent type → includes children
- "imports" → imports_library + imports_file
```

**inference-system**:
```typescript
// 계층적 추론 (Hierarchical)
//    imports → imports_file, imports_package

const allImports = await engine.queryHierarchical('imports', {
  includeChildren: true
});
```

**결론**: **동일한 개념, inference-system이 더 상세**

#### 2. Transitive Inference (전이적 추론)

**query-and-inference**:
```markdown
- A→B, B→C ⇒ A→C
- 전체 의존성 트리
```

**inference-system**:
```typescript
// 전이적 추론 (Transitive)
//    A → B → C ⇒ A → C (간접 의존성)

const transitiveDeps = await engine.queryTransitive(nodeId, 'depends_on', {
  maxPathLength: 10
});
```

**결론**: **동일한 개념, inference-system이 더 상세**

#### 3. LLM Context 자동 구성

**query-and-inference**:
```markdown
## 📊 Step 5: JSON Output for Inference Testing

{
  "targetFile": "src/namespace/NamespaceGraphDB.ts",
  "dependencies": {
    "totalNodes": 2,
    "uniqueFiles": 2,
    "files": [...]
  }
}
```

**inference-system**:
```typescript
// 예제 1: LLM 컨텍스트 자동 구성
async function buildLLMContext(targetFile: string) {
  // 1. 타겟 파일의 노드 찾기
  const nodes = await db.findNodes({ sourceFiles: [targetFile] });

  // 2. 전이적 의존성 추론 (최대 3단계)
  const deps = await engine.queryTransitive(targetNode.id, 'depends_on', {
    maxPathLength: 3,
    direction: 'outgoing'
  });

  // 3. 고유한 파일 목록 추출
  const files = new Set<string>();
  for (const dep of deps) {
    const node = await db.getNode(dep.targetNodeId);
    if (node.sourceFile) files.add(node.sourceFile);
  }

  return contexts;
}
```

**결론**: **동일한 목적, inference-system이 구현 수준까지 상세**

---

## 🎯 해결 방안

### Option 1: `query-and-inference` 분리 (권장)

**변경 사항**:
1. `query-and-inference`를 **`query-system`**으로 이름 변경
2. Inference 관련 내용 모두 제거
3. Query System에만 집중 (GraphDB 조회, 네임스페이스별 필터링)

**결과**:
```
features/
├── query-system/           # Query만 (변경)
│   ├── README.md           # Query Commands, GraphDB API
│   └── (Inference 내용 제거)
├── inference-system/       # Inference만 (유지)
│   ├── README.md           # 3가지 추론 타입
│   └── todos.md
```

**장점**:
- 명확한 책임 분리 (Query vs Inference)
- 중복 제거
- 각 시스템의 역할 명확화

---

### Option 2: `query-and-inference` 삭제 (aggressive)

**변경 사항**:
1. `query-and-inference/` 디렉토리 삭제
2. Query 기능은 `dependency-analysis`에 흡수
3. Inference 기능은 `inference-system`에 통합

**결과**:
```
features/
├── dependency-analysis/    # Dependency 분석 + Query
├── inference-system/       # Inference만
```

**장점**:
- Feature 개수 감소 (10 → 9)
- Query는 Dependency Analysis의 자연스러운 확장

**단점**:
- `dependency-analysis`의 범위가 커짐

---

### Option 3: 현재 상태 유지 + 문서 명확화

**변경 사항**:
1. `query-and-inference/README.md` 상단에 명시:
   ```markdown
   > ⚠️ **Note**: Inference 기능은 [inference-system](../inference-system/)으로 이동되었습니다.
   > 이 문서는 **Query System**에만 집중합니다.
   ```

2. Inference 관련 섹션에 링크 추가:
   ```markdown
   ## Inference System

   > 💡 자세한 내용은 [inference-system](../inference-system/)을 참고하세요.
   ```

**장점**:
- 최소한의 변경
- 기존 문서 유지

**단점**:
- 여전히 혼란 가능성 존재

---

## 📋 기타 잠재적 중복

### 1. `dependency-analysis` vs `namespace-scenario-integration`

**dependency-analysis**:
- 기본 의존성 분석
- `analyze`, `analyze-all` 명령어

**namespace-scenario-integration**:
- Namespace가 Scenario 선택
- 분석 방법 조합

**결론**: ❌ 중복 아님 (서로 다른 레벨의 추상화)
- `dependency-analysis`: 실행 레벨 (어떻게 분석하나)
- `namespace-scenario-integration`: 설정 레벨 (무엇을 분석하나)

---

### 2. `unknown-symbol-system` vs docs의 Unknown Node 문서

**features/unknown-symbol-system/README.md**:
- Feature 정의 문서
- 사용자 가이드
- 실전 예제

**docs/unknown-node-inference.md**:
- 기술 문서
- 구현 세부사항
- API 레퍼런스

**결론**: ❌ 중복 아님 (목적이 다름)
- features: 사용자 중심 (Why, What, How to use)
- docs: 개발자 중심 (How it works, Implementation)

---

### 3. `rdf-addressing` vs docs의 RDF 문서

**features/rdf-addressing/README.md**:
- Feature 정의 문서
- 핵심 가치
- 실전 예제

**docs/rdf-addressing.md**:
- 기술 문서
- RDF 형식 상세
- 마이그레이션 가이드

**결론**: ❌ 중복 아님 (목적이 다름)
- features: 사용자 중심
- docs: 개발자 중심

---

## 🎯 권장 조치 사항

### 즉시 조치 (High Priority)

1. **`query-and-inference` → `query-system` 변경**
   - [ ] 디렉토리 이름 변경
   - [ ] README.md에서 Inference 관련 내용 제거
   - [ ] Query System에만 집중하도록 재작성
   - [ ] features/index.md 업데이트

2. **Inference 내용 통합**
   - [ ] `query-and-inference`의 Inference 예제를 `inference-system`으로 이동
   - [ ] `test-inference.ts` 스크립트는 `inference-system`에서 참조

3. **문서 크로스 레퍼런스 추가**
   - [ ] `query-system` → `inference-system` 링크
   - [ ] `inference-system` → `query-system` 링크

---

### 중기 조치 (Medium Priority)

4. **Query System 범위 명확화**
   - [ ] GraphDB API 문서화
   - [ ] Query 패턴 예제 추가
   - [ ] Performance 가이드

5. **Feature 간 의존성 다이어그램 작성**
   ```
   dependency-analysis
        ↓ (uses)
   query-system
        ↓ (feeds into)
   inference-system
        ↓ (enables)
   context-documents (LLM context)
   ```

---

## 📊 변경 후 예상 구조

```
features/
├── 1. context-documents/              ✅ LLM 컨텍스트 문서 생성
├── 2. cross-namespace/                ✅ 네임스페이스 간 의존성
├── 3. dependency-analysis/            ✅ 기본 의존성 분석
├── 4. inference-system/               ✅ 3가지 추론 타입
├── 5. namespace-management/           ✅ 네임스페이스 관리
├── 6. namespace-scenario-integration/ ✅ 시나리오 조합
├── 7. query-system/                   ✅ GraphDB 조회 (변경)
├── 8. rdf-addressing/                 ✅ RDF 기반 식별
├── 9. scenario-system/                ✅ 시나리오 명세
└── 10. unknown-symbol-system/         ✅ Unknown 노드 & Alias
```

**변경 사항 요약**:
- `query-and-inference` → `query-system` (Inference 제거)
- Inference 내용은 `inference-system`으로 통합
- 각 feature의 역할과 범위 명확화

---

## 🔍 검증 체크리스트

변경 후 확인 사항:

- [ ] features/index.md에서 중복 제거 확인
- [ ] 각 feature의 "Related Documentation" 섹션 업데이트
- [ ] PIPELINE_INTEGRATION.md에서 참조 수정
- [ ] README.md (프로젝트 루트)에서 링크 수정
- [ ] CLI 명령어 문서와 일치 확인

---

**Last Updated**: 2025-10-05
**Reviewed By**: System Analysis
**Action Required**: Yes (query-and-inference 분리 필요)
