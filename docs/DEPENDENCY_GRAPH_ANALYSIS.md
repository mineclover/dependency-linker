# Dependency Graph Analysis

의존성 그래프 분석을 위한 확장 모듈이 구현되었습니다. 기존 컨벤션에 맞춰 설계되어 기존 시스템과 자연스럽게 통합됩니다.

## 🏗️ 아키텍처

### 핵심 컴포넌트

1. **PathResolver** - Import 경로를 절대 경로로 변환
   - 상대 경로, alias 매핑, 확장자 해결
   - 내장 모듈, 외부 패키지 식별
   - tsconfig 경로 매핑 지원

2. **DependencyGraphBuilder** - 의존성 그래프 생성
   - 진입점에서 시작하여 의존성 트리 탐색
   - 순환 의존성 자동 검사
   - 병렬 처리로 성능 최적화

3. **GraphAnalyzer** - 그래프 분석 및 인사이트
   - 허브 파일, 고립된 파일 식별
   - 의존성 깊이 분석
   - 파일 간 의존성 경로 찾기

4. **High-level API** - 사용하기 쉬운 통합 인터페이스
   - `analyzeDependencyGraph()` - 전체 프로젝트 분석
   - `analyzeFileImpact()` - 특정 파일의 영향도 분석
   - `DependencyAnalyzer` - 고급 분석 기능

## 🚀 사용법

### 기본 사용법

```typescript
import { analyzeDependencyGraph } from '@context-action/dependency-linker';

// 프로젝트 의존성 그래프 분석
const { buildResult, analysisResult } = await analyzeDependencyGraph(
  "/path/to/project",
  ["src/index.ts"],
  {
    maxDepth: 10,
    includeExternalDependencies: false,
  }
);

console.log(`처리된 파일: ${buildResult.processedFiles}개`);
console.log(`순환 의존성: ${analysisResult.circularDependencies.totalCycles}개`);
console.log(`허브 파일: ${analysisResult.hubFiles.length}개`);
```

### 고급 사용법

```typescript
import { createDependencyAnalyzer } from '@context-action/dependency-linker';

const analyzer = createDependencyAnalyzer({
  projectRoot: "/path/to/project",
  entryPoints: ["src/index.ts", "src/main.ts"],
  includePatterns: ["src/**/*.{ts,tsx,js,jsx}"],
  excludePatterns: ["**/*.test.*", "**/node_modules/**"],
  maxDepth: 15,
  onProgress: (current, total, file) => {
    console.log(`진행: ${current}/${total} - ${file}`);
  }
});

// 그래프 빌드
await analyzer.buildGraph();

// 특정 파일의 의존성 트리 조회
const tree = analyzer.getDependencyTree("src/components/App.tsx", 3);

// 두 파일 간 의존성 경로 찾기
const path = analyzer.findDependencyPath(
  "src/index.ts",
  "src/utils/helpers.ts"
);

// 통계 정보
const stats = analyzer.getStatistics();
```

### 파일 영향도 분석

```typescript
import { analyzeFileImpact } from '@context-action/dependency-linker';

const impact = await analyzeFileImpact(
  "/path/to/project",
  "src/components/Button.tsx"
);

console.log(`영향도: ${impact.impactLevel}`);
console.log(`의존하는 파일: ${impact.dependents.length}개`);
console.log(`의존되는 파일: ${impact.dependencies.length}개`);
```

## 🎯 주요 기능

### 1. 경로 해결 (Path Resolution)
- **상대 경로**: `./components/Button` → `/project/src/components/Button.tsx`
- **Alias 매핑**: `@/utils/helper` → `/project/src/utils/helper.ts`
- **확장자 해결**: `.ts`, `.tsx`, `.js`, `.jsx` 자동 탐지
- **Index 파일**: `./components` → `./components/index.ts`

### 2. 의존성 분류
- **내부 의존성**: 프로젝트 내 파일들
- **외부 의존성**: npm 패키지들
- **내장 모듈**: Node.js 기본 모듈들
- **미해결 의존성**: 존재하지 않는 파일들

### 3. 그래프 분석
- **순환 의존성**: 순환 참조 탐지 및 경로 추적
- **허브 파일**: 많이 의존되는 중요한 파일들
- **고립된 파일**: 의존성이 없는 파일들
- **의존성 깊이**: 의존성 체인의 깊이 분석

### 4. 성능 최적화
- **병렬 처리**: 독립적인 파일들 동시 분석
- **깊이 제한**: 무한 루프 방지
- **진행 상황 추적**: 실시간 진행 상황 모니터링
- **에러 복구**: 개별 파일 오류가 전체 분석을 중단시키지 않음

## 📊 분석 결과

### DependencyGraph
```typescript
interface DependencyGraph {
  projectRoot: string;
  nodes: Map<string, DependencyNode>;  // 파일들
  edges: DependencyEdge[];             // 의존성 관계
  metadata: {
    totalFiles: number;
    analyzedFiles: number;
    totalDependencies: number;
    circularDependencies: string[][];
    unresolvedDependencies: string[];
    analysisTime: number;
  };
}
```

### GraphAnalysisResult
```typescript
interface GraphAnalysisResult {
  circularDependencies: {
    cycles: string[][];
    totalCycles: number;
    maxDepth: number;
  };
  dependencyDepth: {
    maxDepth: number;
    averageDepth: number;
    depthDistribution: Record<number, number>;
  };
  hubFiles: Array<{
    filePath: string;
    incomingDependencies: number;
    outgoingDependencies: number;
    hubScore: number;
  }>;
  isolatedFiles: string[];
  unresolvedDependencies: Array<{
    from: string;
    to: string;
    originalImport: string;
  }>;
}
```

## 🔧 설정 옵션

### GraphBuildOptions
```typescript
interface GraphBuildOptions {
  projectRoot: string;                    // 프로젝트 루트 경로
  entryPoints: string[];                  // 진입점 파일들
  includePatterns?: string[];             // 포함할 파일 패턴
  excludePatterns?: string[];             // 제외할 파일 패턴
  maxDepth?: number;                      // 최대 분석 깊이
  includeExternalDependencies?: boolean;  // 외부 의존성 포함 여부
  pathResolution?: {
    extensions?: string[];                // 해결할 확장자들
    aliasMap?: Record<string, string>;    // Alias 매핑
    useTsConfig?: boolean;               // tsconfig 경로 매핑 사용
  };
  parallel?: boolean;                     // 병렬 처리 여부
  onProgress?: (current: number, total: number, file: string) => void;
}
```

## 🎨 활용 사례

### 1. 리팩토링 영향도 분석
특정 파일을 수정할 때 영향을 받는 파일들을 미리 파악

### 2. 순환 의존성 해결
순환 참조를 자동으로 탐지하고 해결 방안 제시

### 3. 코드 품질 개선
허브 파일 식별로 중요한 파일들의 품질 관리

### 4. 번들 크기 최적화
의존성 트리 분석으로 불필요한 의존성 제거

### 5. 아키텍처 검증
프로젝트 구조가 설계된 대로 구현되었는지 확인

## 🔮 향후 확장 계획

1. **시각화 지원**: 의존성 그래프 시각화
2. **성능 분석**: 번들 크기 영향도 분석
3. **자동 수정**: 순환 의존성 자동 해결 제안
4. **통합 도구**: VS Code 확장, CLI 도구
5. **메트릭 수집**: 코드 복잡도, 응집도 분석

---

이 모듈은 기존의 Tree-sitter 기반 분석 시스템과 완전히 호환되며, 프로젝트 전체의 의존성 관계를 체계적으로 분석할 수 있는 강력한 도구를 제공합니다.