# Enhanced Path Properties in AnalysisResult

## 📖 개요

AnalysisResult에 포괄적인 경로 정보를 제공하는 `PathInfo` 속성이 추가되었습니다. 이를 통해 파일 분석 결과에서 더 풍부하고 구조화된 경로 정보를 활용할 수 있습니다.

## 🎯 주요 기능

### PathInfo 인터페이스

```typescript
interface PathInfo {
  input: string;              // 원본 입력 경로
  absolute: string;           // 절대 경로 (정규화)
  relative: string;           // 프로젝트 루트 기준 상대 경로
  directory: string;          // 파일이 있는 디렉토리 (절대)
  relativeDirectory: string;  // 파일이 있는 디렉토리 (상대)
  fileName: string;           // 확장자 포함 파일명
  baseName: string;           // 확장자 제외 파일명
  extension: string;          // 파일 확장자 (.포함)
  projectRoot: string;        // 프로젝트 루트 디렉토리
  isWithinProject: boolean;   // 프로젝트 내 파일 여부
  depth: number;              // 프로젝트 루트로부터의 깊이
  separator: string;          // 플랫폼별 경로 구분자
  wasAbsolute: boolean;       // 원본 입력이 절대 경로였는지
}
```

### AnalysisResult 확장

```typescript
interface AnalysisResult {
  filePath: string;     // 기존 필드 (하위 호환성)
  pathInfo: PathInfo;   // 새로운 포괄적 경로 정보
  // ... 기타 필드들
}
```

## 🚀 사용법

### 기본 사용

```typescript
import { analyzeMarkdownFile } from './src/lib/index';

const result = await analyzeMarkdownFile('./docs/README.md');

// 기존 방식 (여전히 사용 가능)
console.log(result.filePath);

// 새로운 방식 (풍부한 정보)
console.log(result.pathInfo.relative);        // "docs/README.md"
console.log(result.pathInfo.fileName);        // "README.md"
console.log(result.pathInfo.baseName);        // "README"
console.log(result.pathInfo.extension);       // ".md"
console.log(result.pathInfo.depth);           // 1
console.log(result.pathInfo.isWithinProject); // true
```

### PathInfo 유틸리티 함수

#### 1. PathInfo 생성

```typescript
import { createPathInfo } from './src/lib/index';

const pathInfo = createPathInfo('./src/components/Button.tsx');
console.log(pathInfo.relative);  // "src/components/Button.tsx"
console.log(pathInfo.depth);     // 2
```

#### 2. 검증과 함께 생성

```typescript
import { createValidatedPathInfo } from './src/lib/index';

const result = createValidatedPathInfo('./src/utils.ts', undefined, {
  mustExist: true,
  allowedExtensions: ['.ts', '.tsx']
});

if (result.isValid) {
  console.log('Valid file:', result.relative);
} else {
  console.error('Invalid:', result.validationError);
}
```

#### 3. 배치 처리

```typescript
import { createBatchPathInfo } from './src/lib/index';

const paths = [
  './src/index.ts',
  './docs/README.md',
  './tests/utils.test.ts'
];

const pathInfos = createBatchPathInfo(paths);
pathInfos.forEach(info => {
  console.log(`${info.relative} (depth: ${info.depth})`);
});
```

## 🔧 고급 기능

### 1. 경로 기반 정렬

```typescript
import { comparePathInfo, getBatchMarkdownAnalysis } from './src/lib/index';

const results = await getBatchMarkdownAnalysis([
  './README.md',
  './docs/api.md',
  './src/README.md'
]);

// 깊이와 알파벳순으로 정렬
const sorted = results.sort((a, b) => comparePathInfo(a.pathInfo, b.pathInfo));
```

### 2. 디렉토리별 그룹핑

```typescript
import { groupPathInfoByDirectory, analyzeDirectory } from './src/lib/index';

const results = await analyzeDirectory('./src', { includeMarkdown: true });
const pathInfos = results.map(r => r.pathInfo).filter(Boolean);

const grouped = groupPathInfoByDirectory(pathInfos);

for (const [dir, files] of grouped) {
  console.log(`📁 ${dir}: ${files.length} files`);
  files.forEach(file => {
    console.log(`   - ${file.fileName}`);
  });
}
```

### 3. 조건부 필터링

```typescript
import { filterPathInfo, createBatchPathInfo } from './src/lib/index';

const allPaths = createBatchPathInfo([
  './src/components/Button.tsx',
  './src/utils/helpers.ts',
  './docs/README.md',
  './tests/Button.test.tsx'
]);

// TypeScript 파일만
const tsFiles = filterPathInfo(allPaths, {
  extensions: ['.ts', '.tsx']
});

// 얕은 깊이 파일만
const shallowFiles = filterPathInfo(allPaths, {
  maxDepth: 1
});

// 특정 디렉토리만
const srcFiles = filterPathInfo(allPaths, {
  directories: ['src/components', 'src/utils']
});

// 프로젝트 내 파일만
const projectFiles = filterPathInfo(allPaths, {
  withinProject: true
});
```

## 📊 성능과 호환성

### 하위 호환성

기존 `filePath` 필드는 완전히 유지되므로 기존 코드는 수정 없이 계속 작동합니다:

```typescript
// 기존 코드 - 계속 작동함
const result = await analyzeMarkdownFile('./README.md');
console.log(result.filePath); // "/absolute/path/to/README.md"

// 새로운 기능 - 선택적으로 사용
console.log(result.pathInfo.relative); // "README.md"
```

### 성능 특성

- PathInfo 생성은 경량 작업 (동기 처리)
- 배치 처리 시 효율적인 메모리 사용
- 파일 시스템 접근 최소화 (검증 옵션 사용 시에만)

## 🔄 마이그레이션 가이드

### 단계별 마이그레이션

#### 1단계: 점진적 도입

```typescript
// Before
function processAnalysisResult(result: AnalysisResult) {
  const fileName = path.basename(result.filePath);
  const extension = path.extname(result.filePath);
  const relative = path.relative(process.cwd(), result.filePath);
}

// After
function processAnalysisResult(result: AnalysisResult) {
  // PathInfo가 있으면 사용, 없으면 기존 방식 사용
  if (result.pathInfo) {
    const fileName = result.pathInfo.fileName;
    const extension = result.pathInfo.extension;
    const relative = result.pathInfo.relative;
  } else {
    // 기존 방식 (TypeScript 분석 등)
    const fileName = path.basename(result.filePath);
    const extension = path.extname(result.filePath);
    const relative = path.relative(process.cwd(), result.filePath);
  }
}
```

#### 2단계: 완전 전환

```typescript
// Before
const sorted = results.sort((a, b) => {
  const relativeA = path.relative(process.cwd(), a.filePath);
  const relativeB = path.relative(process.cwd(), b.filePath);
  return relativeA.localeCompare(relativeB);
});

// After
const sorted = results.sort((a, b) =>
  comparePathInfo(a.pathInfo, b.pathInfo)
);
```

## 📈 사용 사례

### 1. 프로젝트 구조 분석

```typescript
import { analyzeDirectory, filterPathInfo, groupPathInfoByDirectory } from './src/lib/index';

async function analyzeProjectStructure(projectDir: string) {
  const results = await analyzeDirectory(projectDir, {
    includeMarkdown: true
  });

  const pathInfos = results.map(r => r.pathInfo).filter(Boolean);

  // 깊이별 분포
  const depthDistribution = pathInfos.reduce((acc, info) => {
    acc[info.depth] = (acc[info.depth] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  // 파일 타입별 분포
  const extensionDistribution = pathInfos.reduce((acc, info) => {
    acc[info.extension] = (acc[info.extension] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalFiles: pathInfos.length,
    depthDistribution,
    extensionDistribution,
    groupedByDirectory: groupPathInfoByDirectory(pathInfos)
  };
}
```

### 2. 문서 네비게이션 생성

```typescript
async function generateDocNavigation() {
  const docs = await analyzeDirectory('./docs', {
    includeMarkdown: true
  });

  const pathInfos = docs.map(r => r.pathInfo).filter(Boolean);
  const grouped = groupPathInfoByDirectory(pathInfos);

  const navigation = Array.from(grouped.entries()).map(([dir, files]) => ({
    directory: dir,
    files: files.map(file => ({
      name: file.baseName,
      path: file.relative,
      url: `/${file.relative.replace('.md', '.html')}`
    }))
  }));

  return navigation;
}
```

### 3. 빌드 도구 통합

```typescript
async function optimizeBuildOrder() {
  const results = await analyzeDirectory('./src', {
    extensions: ['.ts', '.tsx']
  });

  const pathInfos = results.map(r => r.pathInfo).filter(Boolean);

  // 깊이가 얕은 파일부터 빌드 (의존성 순서)
  const buildOrder = pathInfos
    .sort(comparePathInfo)
    .map(info => info.relative);

  return buildOrder;
}
```

## 🐛 트러블슈팅

### 자주 발생하는 문제

#### 1. PathInfo가 undefined인 경우

**원인**: TypeScript 분석 결과는 아직 PathInfo를 포함하지 않음

**해결책**:
```typescript
function safeGetPathInfo(result: AnalysisResult): PathInfo {
  if (result.pathInfo) {
    return result.pathInfo;
  }

  // 수동으로 PathInfo 생성
  return createPathInfo(result.filePath);
}
```

#### 2. 프로젝트 외부 파일 처리

**원인**: `../` 경로나 절대 경로로 프로젝트 외부 파일 참조

**해결책**:
```typescript
const pathInfo = createPathInfo(filePath, customProjectRoot);

if (!pathInfo.isWithinProject) {
  console.log('외부 파일:', pathInfo.absolute);
}
```

## 🔗 관련 API

- [`createPathInfo()`](./api/path-utilities.md#createpathinfo)
- [`createValidatedPathInfo()`](./api/path-utilities.md#createvalidatedpathinfo)
- [`comparePathInfo()`](./api/path-utilities.md#comparepathinfo)
- [`groupPathInfoByDirectory()`](./api/path-utilities.md#grouppathinfobydirectory)
- [`filterPathInfo()`](./api/path-utilities.md#filterpathinfo)

## 📝 변경 이력

- **v1.0.0**: PathInfo 인터페이스 및 유틸리티 함수 추가
- **v1.0.0**: AnalysisResult에 pathInfo 속성 추가 (Markdown 분석 지원)
- **v1.0.0**: 하위 호환성을 위한 filePath 필드 유지