# Contributing Guide

개발 환경 설정과 워크플로우 가이드

## 📋 목차
- [개발 환경 설정](#개발-환경-설정)
- [프로젝트 구조](#프로젝트-구조)
- [개발 워크플로우](#개발-워크플로우)
- [테스트](#테스트)
- [빌드 및 배포](#빌드-및-배포)
- [코드 스타일](#코드-스타일)

## 🛠️ 개발 환경 설정

### 필수 요구사항
- Node.js 18 이상
- npm 또는 yarn
- TypeScript 5.0 이상

### 초기 설정
```bash
# 저장소 클론
git clone https://github.com/your-org/dependency-linker.git
cd dependency-linker

# 의존성 설치
npm install

# 빌드
npm run build

# 테스트 실행
npm test
```

## 📁 프로젝트 구조

```
dependency-linker/
├── src/                    # 소스 코드
│   ├── api/               # High-level API
│   ├── cli/               # CLI 도구
│   ├── core/              # 핵심 엔진
│   ├── database/          # GraphDB
│   │   ├── types/         # 타입 레지스트리
│   │   └── inference/     # 추론 엔진
│   ├── graph/             # 그래프 빌더
│   ├── integration/       # 통합 (Markdown 등)
│   ├── mappers/           # 커스텀 키 매핑
│   ├── namespace/         # Namespace 시스템
│   ├── parsers/           # 언어별 파서
│   ├── queries/           # Tree-sitter 쿼리
│   ├── results/           # 결과 타입
│   └── utils/             # 유틸리티
├── tests/                 # 테스트
│   ├── database/          # DB 테스트
│   └── integration/       # 통합 테스트
├── docs/                  # 문서
│   ├── README.md          # 메인 문서
│   ├── pipeline-overview.md
│   ├── implementation-status.md
│   ├── type-system.md
│   └── semantic-tags.md
├── examples/              # 예제 코드
├── scripts/               # 개발 스크립트
└── dist/                  # 빌드 결과 (gitignore)
```

## 🔄 개발 워크플로우

### 1. Feature Branch 생성
```bash
git checkout -b feature/your-feature-name
```

### 2. 개발 시작
```bash
# 자동 빌드 모드
npm run dev

# 다른 터미널에서 테스트 watch
npm run test:watch
```

### 3. 코드 작성
- TypeScript strict mode 준수
- 타입 안전성 유지 (no `any`)
- JSDoc 주석 작성

### 4. 테스트 작성
```typescript
// tests/your-feature.test.ts
describe('YourFeature', () => {
  it('should work correctly', () => {
    // Given
    const input = ...;

    // When
    const result = yourFeature(input);

    // Then
    expect(result).toBe(expected);
  });
});
```

### 5. 코드 검증
```bash
# 린트 체크
npm run lint

# 타입 체크
npm run typecheck

# 포맷 체크
npm run format:check

# 모든 테스트
npm test
```

### 6. 커밋
```bash
git add .
git commit -m "feat: Add your feature

Detailed description of the changes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 커밋 메시지 규칙
- `feat:` 새로운 기능
- `fix:` 버그 수정
- `docs:` 문서 변경
- `refactor:` 리팩토링
- `test:` 테스트 추가/수정
- `chore:` 빌드, 설정 변경

## 🧪 테스트

### 테스트 실행
```bash
# 전체 테스트
npm test

# 병렬 실행 (빠름)
npm run test:parallel

# 커버리지 포함
npm run test:coverage

# 단위 테스트만
npm run test:unit

# 통합 테스트만
npm run test:integration

# Watch 모드
npm run test:watch
```

### 테스트 작성 가이드
1. **Given-When-Then 패턴** 사용
2. **의미있는 테스트명** 작성
3. **독립적인 테스트** 작성 (테스트 순서에 의존 X)
4. **Mock 최소화** (실제 동작 테스트 선호)

## 🏗️ 빌드 및 배포

### 로컬 빌드
```bash
# 일반 빌드
npm run build

# 클린 빌드
npm run build:clean
```

### 빌드 프로세스
1. TypeScript 컴파일 (`tsc`)
2. Schema 파일 복사 (`cp src/database/schema.sql dist/database/`)
3. 타입 선언 파일 생성 (`.d.ts`)
4. Source map 생성

### 배포 전 체크리스트
- [ ] 모든 테스트 통과
- [ ] 타입 체크 통과
- [ ] 린트 체크 통과
- [ ] 버전 업데이트 (`package.json`)
- [ ] CHANGELOG 업데이트
- [ ] 문서 업데이트

## 🎨 코드 스타일

### TypeScript 규칙
- **Strict mode** 활성화
- **No `any`** 타입 사용 금지
- **Explicit return types** 명시적 반환 타입
- **Interface over Type** 가능하면 interface 사용

### Biome 설정
프로젝트는 Biome를 사용합니다:
```bash
# 자동 수정
npm run lint:fix

# 포맷팅
npm run format
```

### 네이밍 규칙
- **파일명**: kebab-case (예: `dependency-graph.ts`)
- **클래스**: PascalCase (예: `DependencyGraph`)
- **함수/변수**: camelCase (예: `analyzeDependencies`)
- **상수**: UPPER_SNAKE_CASE (예: `MAX_DEPTH`)
- **타입/인터페이스**: PascalCase (예: `GraphNode`)

### 주석 작성
```typescript
/**
 * Analyzes dependencies in a file
 *
 * @param filePath - Absolute path to the file
 * @param options - Analysis options
 * @returns Analysis result with graph statistics
 *
 * @example
 * ```typescript
 * const result = await analyzeDependencies('/path/to/file.ts', {
 *   includeExternal: true
 * });
 * ```
 */
export async function analyzeDependencies(
  filePath: string,
  options: AnalysisOptions
): Promise<AnalysisResult> {
  // Implementation
}
```

## 📚 참고 문서

### 핵심 문서
- [Pipeline Overview](docs/pipeline-overview.md) - 4단계 파이프라인 구조
- [Type System](docs/type-system.md) - 노드/엣지 타입 시스템
- [Semantic Tags](docs/semantic-tags.md) - 시맨틱 태그 가이드
- [Implementation Status](docs/implementation-status.md) - 구현 상태

### API 문서
- [API Reference](docs/API.md) - 전체 API 문서
- [Custom Key Mapper](docs/CustomKeyMapper-Guide.md) - 커스텀 키 매핑
- [Query Workflow](docs/query-workflow-guide.md) - 쿼리 워크플로우

## 🐛 디버깅

### 로깅
```typescript
// 개발 환경에서만 로깅
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}
```

### 진단 도구
```bash
# 진단 CLI
npm run diagnostic

# 타입 검증
npm run validate-types
```

## 🤝 기여 프로세스

1. **Issue 생성** - 버그나 기능 제안
2. **토론** - 구현 방법 논의
3. **Branch 생성** - feature/xxx 또는 fix/xxx
4. **개발 및 테스트**
5. **Pull Request** - 상세한 설명과 함께
6. **코드 리뷰** - 피드백 반영
7. **Merge** - 승인 후 병합

## 📞 도움 받기

- **Issues**: GitHub Issues에서 질문
- **Discussions**: 아이디어 공유 및 토론
- **Documentation**: docs/ 디렉토리 참고

---

**Happy Coding!** 🚀
