# Semantic Tags System

추론 엔진을 위한 동적 노드 메타데이터 시스템

## 목차
- [개요](#개요)
  - [Type vs Semantic Tags](#type-vs-semantic-tags)
- [추출 룰 (Extraction Rules)](#추출-룰-extraction-rules)
  - [1. 파일 경로 기반 룰](#1-파일-경로-기반-룰)
  - [2. 파일 확장자 기반 룰](#2-파일-확장자-기반-룰)
  - [3. 이름 패턴 기반 룰](#3-이름-패턴-기반-룰)
  - [4. AST 구조 기반 룰](#4-ast-구조-기반-룰)
  - [5. 종속성 기반 룰](#5-종속성-기반-룰)
  - [6. 마크다운 헤딩 기반 룰](#6-마크다운-헤딩-기반-룰)
- [추론 활용 (Inference Use Cases)](#추론-활용-inference-use-cases)
- [룰 진화 전략](#룰-진화-전략)
- [추출 룰 구현 예시](#추출-룰-구현-예시)
- [태그 네이밍 가이드](#태그-네이밍-가이드)
- [데이터베이스 쿼리](#데이터베이스-쿼리)
- [Best Practices](#best-practices)

## 개요

### Type vs Semantic Tags

**Type (대상 식별) - 필수**
- 노드가 **무엇을 수식하는지** 식별
- 예: `file`, `class`, `method`, `function`, `interface`, `variable`
- 데이터베이스 필수 필드: `nodes.type`
- AST 파싱 시 자동 결정

**Semantic Tags (복합적 의미) - 선택적**
- **노드가 담고 있는 정보가 많을 때**
- **복합적인 의미를 가진 노드일 때**
- 추출 룰에 따라 **동적으로 생성**
- 분석, 검색, 추론에 활용
- 데이터베이스 선택적 필드: `nodes.semantic_tags` (JSON array)

```typescript
// 실제 노드 구조
{
  type: "class",              // 대상 식별 (필수): "이것은 클래스를 수식한다"
  name: "UserService",

  // 복합적 의미 표현 (선택적): "서비스 레이어의 인증 도메인 공개 API 클래스"
  semanticTags: [
    "service-layer",          // 아키텍처 레이어
    "auth-domain",            // 비즈니스 도메인
    "public-api"              // 접근 범위
  ]
}
```

**사용 시점**:
- Type만으로 충분한 경우: Semantic Tags 불필요
- 노드가 복잡한 정보를 담을 때: Semantic Tags 추가

## 추출 룰 (Extraction Rules)

Semantic Tags는 **추출 룰**에 따라 자동으로 생성됩니다.

### 1. 파일 경로 기반 룰

#### Namespace 기반 태그 할당 (권장)

**`deps.config.json` 설정을 통한 태그 할당**:

```json
{
  "namespaces": {
    "source": {
      "filePatterns": ["src/**/*.ts"],
      "semanticTags": ["source", "production"]
    },
    "tests": {
      "filePatterns": ["tests/**/*.ts"],
      "semanticTags": ["test", "quality-assurance"]
    },
    "configs": {
      "filePatterns": ["*.config.*"],
      "semanticTags": ["config", "infrastructure"]
    },
    "docs": {
      "filePatterns": ["docs/**/*.md"],
      "semanticTags": ["documentation", "knowledge"]
    }
  }
}
```

**분석 실행**:
```bash
# 단일 namespace 분석
npx namespace-analyzer analyze source --config deps.config.json

# 전체 namespace 분석
npx namespace-analyzer analyze-all --config deps.config.json
```

**결과**:
- `src/**/*.ts` 파일들 → `["source", "production"]` 태그 자동 부여
- `tests/**/*.ts` 파일들 → `["test", "quality-assurance"]` 태그 자동 부여

#### 프로그래밍 방식 태그 할당

```typescript
// Rule: Directory-based domain detection
if (filePath.includes("/auth/")) {
  tags.push("auth-domain");
}
if (filePath.includes("/database/")) {
  tags.push("database-domain");
}
if (filePath.includes("/shared/") || filePath.includes("/common/")) {
  tags.push("shared-utility");
}
if (filePath.includes("/test/") || filePath.includes("/__tests__/")) {
  tags.push("test-code");
}
```

### 2. 파일 확장자 기반 룰

```typescript
// Rule: File type detection
const ext = path.extname(filePath);
if (ext === ".ts" && !filePath.endsWith(".test.ts")) {
  tags.push("typescript");
}
if (ext === ".tsx") {
  tags.push("typescript", "react-component");
}
if (ext === ".test.ts" || ext === ".spec.ts") {
  tags.push("typescript", "test-code");
}
if (ext === ".md") {
  tags.push("documentation");
}
```

### 3. 이름 패턴 기반 룰

```typescript
// Rule: Architectural layer detection
if (name.endsWith("Service")) {
  tags.push("service-layer");
}
if (name.endsWith("Repository")) {
  tags.push("repository-layer");
}
if (name.endsWith("Controller")) {
  tags.push("controller-layer");
}
if (name.endsWith("Component") || /^[A-Z].*\.tsx$/.test(filePath)) {
  tags.push("ui-component");
}
```

### 4. AST 구조 기반 룰

```typescript
// Rule: Implementation characteristics
if (declaration.isAbstract) {
  tags.push("abstract-implementation");
}
if (declaration.isExported) {
  tags.push("public-api");
}
if (declaration.isAsync) {
  tags.push("async-operation");
}
if (declaration.decorators?.some(d => d.name === "Injectable")) {
  tags.push("dependency-injection");
}
```

### 5. 종속성 기반 룰

```typescript
// Rule: Framework/library detection
if (imports.some(i => i.from === "react")) {
  tags.push("react-code");
}
if (imports.some(i => i.from.startsWith("@nestjs"))) {
  tags.push("nestjs-code");
}
if (imports.some(i => i.from === "express")) {
  tags.push("express-code");
}
```

### 6. 마크다운 헤딩 기반 룰

```typescript
// Rule: Hashtag-based semantic types
// # API Design #architecture #specification
const hashtags = heading.text.match(/#(\w+)/g) || [];
tags.push(...hashtags.map(tag => tag.slice(1))); // ["architecture", "specification"]
```

## 추론 활용 (Inference Use Cases)

### 1. 아키텍처 레이어 분석

```typescript
// 서비스 레이어의 모든 노드 찾기
const serviceLayers = await db.findNodes({
  semanticTags: ["service-layer"]
});

// 공개 API 표면 분석
const publicAPIs = await db.findNodes({
  semanticTags: ["public-api"]
});
```

### 2. 도메인별 영향도 분석

```typescript
// auth 도메인의 모든 노드
const authNodes = await db.findNodes({
  semanticTags: ["auth-domain"]
});

// auth 도메인이 의존하는 다른 도메인 찾기
const authDependencies = await db.findEdges({
  startNodeIds: authNodes.map(n => n.id),
  edgeType: "depends_on"
});
```

### 3. 테스트 커버리지 분석

```typescript
// 테스트 코드 찾기
const testNodes = await db.findNodes({
  semanticTags: ["test-code"]
});

// 테스트되지 않은 public API 찾기
const publicAPIs = await db.findNodes({
  semanticTags: ["public-api"]
});
const untested = publicAPIs.filter(api =>
  !testNodes.some(test => test.name.includes(api.name))
);
```

### 4. 프레임워크별 코드 분류

```typescript
// React 컴포넌트 찾기
const reactComponents = await db.findNodes({
  semanticTags: ["react-component"]
});

// NestJS 서비스 찾기
const nestjsServices = await db.findNodes({
  semanticTags: ["nestjs-code", "service-layer"]
});
```

### 5. 문서 추론

```typescript
// 아키텍처 문서 찾기
const archDocs = await db.findNodes({
  type: "heading-symbol",
  semanticTags: ["architecture"]
});

// API 문서와 실제 API 매칭
const apiDocs = await db.findNodes({
  semanticTags: ["api-documentation"]
});
const apiImpls = await db.findNodes({
  semanticTags: ["public-api"]
});
```

## 룰 진화 전략

### 1. 점진적 룰 추가

```typescript
// Phase 1: 기본 룰
// - 파일 경로 기반
// - 확장자 기반
// - 이름 패턴 기반

// Phase 2: 고급 룰
// - AST 구조 분석
// - 종속성 분석
// - 호출 그래프 분석

// Phase 3: 학습 기반 룰
// - 패턴 학습을 통한 자동 룰 생성
// - 사용자 피드백 기반 룰 개선
```

### 2. 프로젝트별 커스텀 룰

```typescript
// Custom rule configuration
const customRules = [
  {
    name: "feature-module-detection",
    condition: (node) => node.filePath.match(/features\/(\w+)\//),
    tag: (node) => `feature-${node.filePath.match(/features\/(\w+)\//)[1]}`
  },
  {
    name: "legacy-code-detection",
    condition: (node) => node.metadata?.comments?.includes("@legacy"),
    tag: () => "legacy-code"
  }
];
```

### 3. 룰 검증 및 개선

```typescript
// Rule effectiveness analysis
const ruleStats = {
  "service-layer": {
    matched: 156,
    precision: 0.94,  // 정확하게 서비스 레이어를 찾은 비율
    recall: 0.89      // 모든 서비스 레이어를 찾은 비율
  }
};

// 낮은 정확도/재현율을 가진 룰 개선
if (ruleStats["service-layer"].precision < 0.9) {
  // 룰 조건 강화 필요
}
```

## 추출 룰 구현 예시

### TypeScript/JavaScript Analyzer

```typescript
export class TypeScriptSemanticAnalyzer {
  extractSemanticTags(node: ASTNode, context: AnalysisContext): string[] {
    const tags: string[] = [];

    // 1. File-based rules
    tags.push(...this.extractFileBasedTags(context.filePath));

    // 2. Name-based rules
    tags.push(...this.extractNameBasedTags(node.name));

    // 3. AST-based rules
    tags.push(...this.extractASTBasedTags(node));

    // 4. Dependency-based rules
    tags.push(...this.extractDependencyTags(context.imports));

    return tags;
  }

  private extractFileBasedTags(filePath: string): string[] {
    const tags: string[] = [];

    if (filePath.includes("/services/")) tags.push("service-layer");
    if (filePath.includes("/controllers/")) tags.push("controller-layer");
    if (filePath.includes("/shared/")) tags.push("shared-utility");

    return tags;
  }

  private extractNameBasedTags(name: string): string[] {
    const tags: string[] = [];

    if (name.endsWith("Service")) tags.push("service-layer");
    if (name.endsWith("Repository")) tags.push("repository-layer");
    if (name.startsWith("I") && /^I[A-Z]/.test(name)) tags.push("interface-definition");

    return tags;
  }
}
```

### Markdown Analyzer

```typescript
export class MarkdownSemanticAnalyzer {
  extractHeadingTags(heading: HeadingInfo): string[] {
    const tags: string[] = [];

    // 1. Hashtag extraction
    const hashtags = heading.text.match(/#(\w+)/g) || [];
    tags.push(...hashtags.map(tag => tag.slice(1)));

    // 2. Content-based inference
    if (heading.text.match(/API|Endpoint|Route/i)) {
      tags.push("api-documentation");
    }
    if (heading.text.match(/Architecture|Design|System/i)) {
      tags.push("architecture-documentation");
    }

    return tags;
  }
}
```

## 태그 네이밍 가이드

### 네이밍 규칙
- **소문자 + 하이픈**: `service-layer`, `auth-domain`, `public-api`
- **간결성**: 2-3 단어 이내 권장
- **명확성**: 추론 목적이 명확한 이름 사용
- **일관성**: 프로젝트 내 동일한 네이밍 패턴 유지

### 좋은 예시
```typescript
// ✅ 추론 목적이 명확
"service-layer"           // 아키텍처 레이어 추론
"auth-domain"             // 도메인 경계 추론
"public-api"              // API 표면 분석
"react-component"         // 프레임워크 종속성 추론
"test-code"               // 테스트 커버리지 분석
"async-operation"         // 비동기 플로우 분석
```

### 피해야 할 예시
```typescript
// ❌ 너무 일반적
"code"                    // 의미 없음
"file"                    // type과 중복
"important"               // 주관적

// ❌ Type과 중복
"class"                   // type 필드로 충분
"function"                // type 필드로 충분

// ❌ 추론 목적 불명확
"good-code"               // 무엇을 추론?
"new-feature"             // 시간이 지나면 의미 없음
```

## 데이터베이스 쿼리

### 태그 기반 검색

```typescript
// 단일 태그 검색
const nodes = await db.query(`
  SELECT * FROM nodes
  WHERE semantic_tags LIKE '%"service-layer"%'
`);

// 다중 태그 AND 검색
const nodes = await db.query(`
  SELECT * FROM nodes
  WHERE semantic_tags LIKE '%"auth-domain"%'
    AND semantic_tags LIKE '%"public-api"%'
`);

// 다중 태그 OR 검색
const nodes = await db.query(`
  SELECT * FROM nodes
  WHERE semantic_tags LIKE '%"service-layer"%'
     OR semantic_tags LIKE '%"controller-layer"%'
`);
```

### 태그 통계

```typescript
// 가장 많이 사용된 태그 분석
const tagStats = await db.query(`
  WITH tag_counts AS (
    SELECT
      json_each.value as tag,
      COUNT(*) as count
    FROM nodes, json_each(nodes.semantic_tags)
    GROUP BY tag
  )
  SELECT tag, count
  FROM tag_counts
  ORDER BY count DESC
  LIMIT 10
`);
```

## Best Practices

### 1. 룰 우선순위
```typescript
// 구체적인 룰을 먼저 적용
const rules = [
  specificRule1,  // 높은 우선순위
  specificRule2,
  generalRule1,   // 낮은 우선순위
  generalRule2
];
```

### 2. 태그 검증
```typescript
// 생성된 태그의 유효성 검증
function validateTag(tag: string): boolean {
  return /^[a-z0-9-]+$/.test(tag) && tag.length < 30;
}
```

### 3. 룰 문서화
```typescript
// 각 룰에 대한 명확한 문서화
const rules = [
  {
    name: "service-layer-detection",
    description: "Detects service layer classes by name suffix",
    pattern: /Service$/,
    tag: "service-layer",
    examples: ["UserService", "AuthService"]
  }
];
```

## 참고

- Semantic Tags는 **추출 룰의 산물**입니다
- 룰은 프로젝트와 함께 **진화**합니다
- 추론 엔진의 **요구사항에 따라 태그가 추가**됩니다
- 미리 정의된 카테고리보다 **실제 추론 시나리오가 우선**입니다

---

*Last Updated: 2025-10-03*
