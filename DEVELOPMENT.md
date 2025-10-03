# Development Environment Guide

개발 환경 구조와 유지관리 가이드

## 📋 목차
- [디렉토리 구조](#디렉토리-구조)
- [빌드 시스템](#빌드-시스템)
- [개발 도구](#개발-도구)
- [데이터베이스 스키마 관리](#데이터베이스-스키마-관리)
- [문서 관리](#문서-관리)
- [버전 관리](#버전-관리)

## 📁 디렉토리 구조

### 소스 코드 구조
```
src/
├── api/                    # High-level API
│   ├── analysis.ts         # 파일 분석 API
│   └── exports.ts          # Public exports
│
├── cli/                    # CLI 도구
│   ├── namespace-analyzer.ts  # Namespace 분석 CLI
│   └── analyze-file.ts     # 단일 파일 분석 CLI
│
├── core/                   # 핵심 엔진
│   ├── QueryEngine.ts      # 쿼리 실행 엔진
│   ├── TreeSitterQueryEngine.ts  # Tree-sitter 쿼리 엔진
│   ├── QueryBridge.ts      # 쿼리 브릿지
│   ├── types.ts            # 핵심 타입
│   └── symbol-types.ts     # 심볼 타입
│
├── database/               # GraphDB
│   ├── GraphDatabase.ts    # 메인 DB 클래스
│   ├── schema.sql          # DB 스키마
│   ├── types/              # 타입 레지스트리
│   │   ├── TypeRegistry.ts # 타입 정의
│   │   └── index.ts        # Exports
│   └── inference/          # 추론 엔진
│       ├── EdgeTypeRegistry.ts  # 엣지 타입 레지스트리
│       └── InferenceEngine.ts   # 추론 엔진
│
├── graph/                  # 그래프 빌더
│   ├── DependencyGraphBuilder.ts  # 그래프 생성
│   └── types.ts            # 그래프 타입
│
├── integration/            # 외부 통합
│   └── MarkdownToGraph.ts  # Markdown 통합
│
├── mappers/                # 커스텀 키 매핑
│   ├── CustomKeyMapper.ts  # 커스텀 매퍼
│   └── predefined/         # 사전 정의 매핑
│
├── namespace/              # Namespace 시스템
│   ├── ConfigManager.ts    # 설정 관리
│   ├── FilePatternMatcher.ts  # 패턴 매칭
│   ├── NamespaceDependencyAnalyzer.ts  # 분석기
│   ├── NamespaceGraphDB.ts # GraphDB 통합
│   └── types.ts            # 타입 정의
│
├── parsers/                # 언어별 파서
│   ├── base.ts             # 베이스 파서
│   ├── ParserFactory.ts    # 파서 팩토리
│   ├── ParserManager.ts    # 파서 관리
│   └── typescript/         # TypeScript 파서
│
├── queries/                # Tree-sitter 쿼리
│   ├── registry/           # 쿼리 레지스트리
│   └── processors/         # 결과 프로세서
│
├── results/                # 결과 타입
│   └── types.ts            # 결과 타입 정의
│
└── utils/                  # 유틸리티
    └── path-utils.ts       # 경로 유틸
```

### 테스트 구조
```
tests/
├── database/               # DB 테스트
│   ├── edge-type-workflows.test.ts
│   ├── inference-engine.test.ts
│   └── graph-analysis.test.ts
│
├── integration/            # 통합 테스트
│   └── SingleFileAnalysis.test.ts
│
├── core-functionality.test.ts
├── essential-parser-tests.test.ts
└── markdown-dependency-tracking.test.ts
```

### 문서 구조
```
docs/
├── README.md               # 메인 문서
├── pipeline-overview.md    # 파이프라인 개요
├── implementation-status.md # 구현 상태
├── type-system.md          # 타입 시스템
├── semantic-tags.md        # 시맨틱 태그 가이드
├── API.md                  # API 레퍼런스
├── GLOSSARY.md             # 용어집
└── [feature-specific].md   # 기능별 문서
```

## 🏗️ 빌드 시스템

### 빌드 프로세스
```bash
npm run build
```

**실행 단계**:
1. **TypeScript 컴파일** (`tsc`)
   - `src/**/*.ts` → `dist/**/*.js`
   - 타입 선언 파일 생성 (`.d.ts`)
   - Source map 생성 (`.js.map`)

2. **Schema 파일 복사** (`copy:schema`)
   - `src/database/schema.sql` → `dist/database/schema.sql`
   - GraphDatabase 초기화에 필요

3. **Build Info 생성**
   - `dist/.tsbuildinfo` - 증분 빌드 정보

### 빌드 설정

#### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",           // ECMAScript 2020
    "module": "commonjs",         // CommonJS 모듈
    "outDir": "./dist",           // 출력 디렉토리
    "rootDir": "./src",           // 소스 디렉토리
    "strict": true,               // Strict 모드
    "declaration": true,          // .d.ts 생성
    "sourceMap": true,            // Source map 생성
    "incremental": true           // 증분 빌드
  }
}
```

### 클린 빌드
```bash
npm run build:clean
```
- `dist/` 디렉토리 완전 삭제
- 새로 빌드 (증분 빌드 정보 초기화)

## 🛠️ 개발 도구

### 필수 도구
```bash
# TypeScript 컴파일러
tsc

# Biome (린트 + 포맷)
biome

# Jest (테스트)
jest

# Tree-sitter (파서)
tree-sitter
```

### npm Scripts

#### 개발
```bash
npm run dev              # Watch 모드 (자동 재컴파일)
```

#### 테스트
```bash
npm test                 # 전체 테스트 (순차)
npm run test:parallel    # 병렬 테스트 (빠름)
npm run test:watch       # Watch 모드
npm run test:coverage    # 커버리지 포함
npm run test:unit        # 단위 테스트만
npm run test:integration # 통합 테스트만
```

#### 코드 품질
```bash
npm run lint             # 린트 체크
npm run lint:fix         # 자동 수정
npm run format           # 포맷팅
npm run format:check     # 포맷 체크만
npm run typecheck        # 타입 체크
```

#### CLI 도구
```bash
npm run namespace        # Namespace 분석기
npm run start            # 단일 파일 분석기
npm run diagnostic       # 진단 도구
npm run validate-types   # 타입 검증
```

## 🗄️ 데이터베이스 스키마 관리

### 스키마 파일 위치
- **소스**: `src/database/schema.sql`
- **빌드**: `dist/database/schema.sql` (자동 복사)

### 스키마 수정 프로세스
1. **수정**: `src/database/schema.sql` 편집
2. **빌드**: `npm run build` (자동 복사됨)
3. **테스트**: DB 관련 테스트 실행
4. **마이그레이션**: 필요시 마이그레이션 스크립트 작성

### 스키마 구조
```sql
-- Core Tables
CREATE TABLE IF NOT EXISTS nodes (...)
CREATE TABLE IF NOT EXISTS edges (...)

-- Type System
CREATE TABLE IF NOT EXISTS edge_types (...)

-- Inference Cache
CREATE TABLE IF NOT EXISTS edge_inference_cache (...)

-- Project Metadata
CREATE TABLE IF NOT EXISTS projects (...)
CREATE TABLE IF NOT EXISTS analysis_sessions (...)
```

### DB 파일 위치
- **기본**: `.dependency-linker/graph.db`
- **테스트**: `.tmp/*.db`
- **시나리오**: `scenarios/.dependency-linker/graph.db`

## 📚 문서 관리

### 문서 카테고리

#### 1. 아키텍처 문서
- `pipeline-overview.md` - 전체 파이프라인
- `type-system.md` - 타입 시스템
- `module-organization.md` - 모듈 구조

#### 2. 구현 가이드
- `implementation-status.md` - 구현 상태
- `semantic-tags.md` - 시맨틱 태그
- `edge-type-management.md` - 엣지 타입 관리

#### 3. API 문서
- `API.md` - API 레퍼런스
- `CustomKeyMapper-Guide.md` - 커스텀 키 매핑
- `query-workflow-guide.md` - 쿼리 워크플로우

#### 4. 개발자 가이드
- `CONTRIBUTING.md` - 기여 가이드
- `DEVELOPMENT.md` - 개발 환경 (본 문서)
- `GLOSSARY.md` - 용어집

### 문서 업데이트 규칙
1. **코드 변경 시**: 관련 문서 동시 업데이트
2. **새 기능**: 해당 기능 문서 작성
3. **버전 표시**: `*Last Updated: YYYY-MM-DD*`

## 🔖 버전 관리

### Semantic Versioning
- **MAJOR** (X.0.0): Breaking changes
- **MINOR** (x.Y.0): 새 기능 (하위 호환)
- **PATCH** (x.y.Z): 버그 수정

### 버전 업데이트 프로세스
1. **package.json** 버전 변경
2. **CHANGELOG.md** 업데이트
3. **Git tag** 생성
4. **npm publish**

### Git 워크플로우

#### Branch 전략
- `main` - 안정 버전
- `feature/*` - 새 기능
- `fix/*` - 버그 수정
- `docs/*` - 문서 변경

#### 커밋 규칙
```
<type>: <subject>

<body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types**:
- `feat:` 새 기능
- `fix:` 버그 수정
- `docs:` 문서
- `refactor:` 리팩토링
- `test:` 테스트
- `chore:` 빌드/설정

## 🔍 디버깅 가이드

### 로그 레벨
```typescript
// 개발 환경
if (process.env.NODE_ENV === 'development') {
  console.log('[DEBUG]', data);
}

// 에러
console.error('[ERROR]', error);

// 경고
console.warn('[WARN]', message);
```

### 일반적인 문제

#### 1. 빌드 실패
```bash
# 클린 빌드 시도
npm run build:clean

# node_modules 재설치
rm -rf node_modules package-lock.json
npm install
```

#### 2. 테스트 실패
```bash
# 단일 테스트 실행
npm test -- tests/specific.test.ts

# 디버그 모드
node --inspect-brk node_modules/.bin/jest --runInBand
```

#### 3. 스키마 관련 에러
```bash
# 스키마 재복사
npm run copy:schema

# DB 파일 삭제 후 재생성
rm -rf .dependency-linker
npm run namespace -- analyze-all
```

## 🚀 배포 준비

### Pre-publish 체크리스트
- [ ] 모든 테스트 통과
- [ ] 타입 체크 통과
- [ ] 린트 에러 없음
- [ ] 문서 업데이트
- [ ] CHANGELOG 업데이트
- [ ] 버전 번호 업데이트
- [ ] Git tag 생성

### 배포 명령
```bash
# 로컬 테스트
npm pack

# 실제 배포
npm publish
```

## 💡 Best Practices

### 코드 작성
1. **타입 안전성**: `any` 사용 금지
2. **명시적 타입**: 반환 타입 명시
3. **불변성**: 가능하면 `const` 사용
4. **에러 처리**: 적절한 에러 처리

### 테스트 작성
1. **Given-When-Then** 패턴
2. **독립적** 테스트
3. **의미있는** 테스트명
4. **충분한** 커버리지

### 문서 작성
1. **최신 상태** 유지
2. **명확한** 설명
3. **예제** 포함
4. **링크** 검증

---

**참고**: 이 문서는 프로젝트와 함께 진화합니다. 개선 사항이 있으면 PR을 보내주세요!
