# PathInfo 마이그레이션 가이드

## 📋 개요

이 가이드는 기존 `filePath` 기반 코드를 새로운 `PathInfo` 시스템으로 점진적으로 마이그레이션하는 방법을 설명합니다.

## 🎯 마이그레이션 전략

### 단계별 접근법

1. **호환성 확인** - 기존 코드가 계속 작동하는지 확인
2. **점진적 도입** - 새로운 기능부터 PathInfo 사용
3. **선택적 전환** - 복잡한 경로 처리 부분 우선 전환
4. **완전 전환** - 모든 코드를 PathInfo로 통일

## 🔄 호환성 보장

### 기존 코드는 수정 없이 계속 작동

```typescript
// ✅ 기존 코드 - 계속 작동함
const result = await analyzeMarkdownFile('./README.md');
console.log(result.filePath); // "/absolute/path/to/README.md"

// ✅ 새로운 기능 - 추가로 사용 가능
console.log(result.pathInfo.relative); // "README.md"
console.log(result.pathInfo.depth);    // 0
```

## 📝 단계별 마이그레이션

### 1단계: 안전성 검증

기존 코드와 새로운 PathInfo가 일치하는지 확인:

```typescript
function validateMigration(result: AnalysisResult) {
  // 기존 방식
  const legacyRelative = path.relative(process.cwd(), result.filePath);

  // 새로운 방식
  const newRelative = result.pathInfo.relative;

  // 일치성 검증
  if (legacyRelative !== newRelative) {
    console.warn('Path mismatch detected:', { legacyRelative, newRelative });
  }
}
```

### 2단계: 헬퍼 함수 생성

기존 코드와 새로운 코드를 연결하는 헬퍼 함수:

```typescript
// 호환성 헬퍼 함수
function getPathInfo(result: AnalysisResult): PathInfo {
  // PathInfo가 있으면 사용
  if (result.pathInfo) {
    return result.pathInfo;
  }

  // 없으면 기존 filePath에서 생성
  return createPathInfo(result.filePath);
}

// 사용법
const pathInfo = getPathInfo(result);
console.log(pathInfo.relative);
console.log(pathInfo.depth);
```

### 3단계: 점진적 전환

새로운 기능부터 PathInfo 사용:

```typescript
// Before: 수동 경로 처리
function sortResultsByPath(results: AnalysisResult[]) {
  return results.sort((a, b) => {
    const relativeA = path.relative(process.cwd(), a.filePath);
    const relativeB = path.relative(process.cwd(), b.filePath);

    const depthA = relativeA.split('/').length - 1;
    const depthB = relativeB.split('/').length - 1;

    if (depthA !== depthB) {
      return depthA - depthB;
    }
    return relativeA.localeCompare(relativeB);
  });
}

// After: PathInfo 사용
function sortResultsByPath(results: AnalysisResult[]) {
  return results.sort((a, b) =>
    comparePathInfo(getPathInfo(a), getPathInfo(b))
  );
}
```

## 🛠️ 일반적인 마이그레이션 패턴

### 패턴 1: 파일명 추출

```typescript
// Before
const fileName = path.basename(result.filePath);
const baseName = path.basename(result.filePath, path.extname(result.filePath));
const extension = path.extname(result.filePath);

// After
const pathInfo = getPathInfo(result);
const fileName = pathInfo.fileName;
const baseName = pathInfo.baseName;
const extension = pathInfo.extension;
```

### 패턴 2: 상대 경로 계산

```typescript
// Before
const relativePath = path.relative(process.cwd(), result.filePath);
const directory = path.dirname(relativePath);

// After
const pathInfo = getPathInfo(result);
const relativePath = pathInfo.relative;
const directory = pathInfo.relativeDirectory;
```

### 패턴 3: 깊이 계산

```typescript
// Before
const relativePath = path.relative(process.cwd(), result.filePath);
const depth = relativePath.split('/').length - 1;

// After
const pathInfo = getPathInfo(result);
const depth = pathInfo.depth;
```

### 패턴 4: 디렉토리 그룹핑

```typescript
// Before
const grouped = new Map<string, AnalysisResult[]>();
results.forEach(result => {
  const relativePath = path.relative(process.cwd(), result.filePath);
  const dir = path.dirname(relativePath);

  if (!grouped.has(dir)) {
    grouped.set(dir, []);
  }
  grouped.get(dir)!.push(result);
});

// After
const pathInfos = results.map(r => getPathInfo(r));
const grouped = groupPathInfoByDirectory(pathInfos);
```

### 패턴 5: 조건부 필터링

```typescript
// Before
const filtered = results.filter(result => {
  const relativePath = path.relative(process.cwd(), result.filePath);
  const depth = relativePath.split('/').length - 1;
  const extension = path.extname(result.filePath);

  return depth <= 2 && extension === '.md';
});

// After
const pathInfos = results.map(r => getPathInfo(r));
const filtered = filterPathInfo(pathInfos, {
  maxDepth: 2,
  extensions: ['.md']
});
```

## 🔧 고급 마이그레이션 시나리오

### 시나리오 1: 복잡한 경로 로직

```typescript
// Before: 복잡한 수동 처리
function analyzeFileStructure(results: AnalysisResult[]) {
  const stats = {
    totalFiles: results.length,
    byDepth: {} as Record<number, number>,
    byExtension: {} as Record<string, number>,
    byDirectory: {} as Record<string, number>
  };

  results.forEach(result => {
    const relativePath = path.relative(process.cwd(), result.filePath);
    const depth = relativePath.split('/').length - 1;
    const extension = path.extname(result.filePath);
    const directory = path.dirname(relativePath);

    stats.byDepth[depth] = (stats.byDepth[depth] || 0) + 1;
    stats.byExtension[extension] = (stats.byExtension[extension] || 0) + 1;
    stats.byDirectory[directory] = (stats.byDirectory[directory] || 0) + 1;
  });

  return stats;
}

// After: PathInfo 활용
function analyzeFileStructure(results: AnalysisResult[]) {
  const pathInfos = results.map(r => getPathInfo(r));

  const stats = {
    totalFiles: pathInfos.length,
    byDepth: {} as Record<number, number>,
    byExtension: {} as Record<string, number>,
    byDirectory: {} as Record<string, number>
  };

  pathInfos.forEach(info => {
    stats.byDepth[info.depth] = (stats.byDepth[info.depth] || 0) + 1;
    stats.byExtension[info.extension] = (stats.byExtension[info.extension] || 0) + 1;
    stats.byDirectory[info.relativeDirectory] = (stats.byDirectory[info.relativeDirectory] || 0) + 1;
  });

  return stats;
}
```

### 시나리오 2: 커스텀 정렬 함수

```typescript
// Before: 복잡한 비교 로직
function customSort(results: AnalysisResult[]) {
  return results.sort((a, b) => {
    const relativeA = path.relative(process.cwd(), a.filePath);
    const relativeB = path.relative(process.cwd(), b.filePath);

    const depthA = relativeA.split('/').length - 1;
    const depthB = relativeB.split('/').length - 1;

    // 먼저 깊이로 정렬
    if (depthA !== depthB) {
      return depthA - depthB;
    }

    // 같은 깊이면 디렉토리로 정렬
    const dirA = path.dirname(relativeA);
    const dirB = path.dirname(relativeB);

    if (dirA !== dirB) {
      return dirA.localeCompare(dirB);
    }

    // 같은 디렉토리면 파일명으로 정렬
    const fileA = path.basename(a.filePath);
    const fileB = path.basename(b.filePath);

    return fileA.localeCompare(fileB);
  });
}

// After: PathInfo와 커스텀 비교 함수
function customSort(results: AnalysisResult[]) {
  return results.sort((a, b) => {
    const infoA = getPathInfo(a);
    const infoB = getPathInfo(b);

    // 먼저 깊이로 정렬
    if (infoA.depth !== infoB.depth) {
      return infoA.depth - infoB.depth;
    }

    // 같은 깊이면 디렉토리로 정렬
    if (infoA.relativeDirectory !== infoB.relativeDirectory) {
      return infoA.relativeDirectory.localeCompare(infoB.relativeDirectory);
    }

    // 같은 디렉토리면 파일명으로 정렬
    return infoA.fileName.localeCompare(infoB.fileName);
  });
}
```

## ⚠️ 주의사항

### 1. TypeScript 분석 결과

현재 TypeScript 분석 결과는 PathInfo를 포함하지 않습니다:

```typescript
function handleMixedResults(results: AnalysisResult[]) {
  results.forEach(result => {
    if (result.pathInfo) {
      // Markdown 분석 결과
      console.log('Markdown:', result.pathInfo.relative);
    } else {
      // TypeScript 분석 결과
      const relativePath = path.relative(process.cwd(), result.filePath);
      console.log('TypeScript:', relativePath);
    }
  });
}
```

### 2. 성능 고려사항

PathInfo 생성은 경량 작업이지만, 대량 처리 시 고려:

```typescript
// 비효율적: 반복적인 PathInfo 생성
results.forEach(result => {
  const pathInfo = getPathInfo(result);
  console.log(pathInfo.relative);
});

// 효율적: 한 번만 생성
const pathInfos = results.map(r => getPathInfo(r));
pathInfos.forEach(info => {
  console.log(info.relative);
});
```

### 3. 프로젝트 루트 설정

기본적으로 `process.cwd()`를 사용하지만, 다른 루트 필요 시:

```typescript
// 커스텀 프로젝트 루트
const pathInfo = createPathInfo(filePath, '/custom/project/root');
```

## 📊 마이그레이션 체크리스트

### ✅ 단계별 체크리스트

- [ ] **1단계: 호환성 확인**
  - [ ] 기존 코드 테스트 실행
  - [ ] 모든 테스트 통과 확인
  - [ ] 기존 API 동작 검증

- [ ] **2단계: 헬퍼 함수 구현**
  - [ ] `getPathInfo` 헬퍼 함수 생성
  - [ ] 타입 안전성 확보
  - [ ] 단위 테스트 작성

- [ ] **3단계: 점진적 전환**
  - [ ] 새로운 기능에 PathInfo 도입
  - [ ] 복잡한 경로 로직 우선 전환
  - [ ] 각 전환 후 테스트 검증

- [ ] **4단계: 전체 검토**
  - [ ] 코드 리뷰 수행
  - [ ] 성능 테스트 실행
  - [ ] 문서 업데이트

### 📈 마이그레이션 진행률 추적

```typescript
// 마이그레이션 진행률 측정
function measureMigrationProgress(codebase: string[]) {
  let legacyCount = 0;
  let modernCount = 0;

  codebase.forEach(file => {
    // 기존 방식 패턴 검색
    if (file.includes('path.relative(process.cwd()')) {
      legacyCount++;
    }

    // 새로운 방식 패턴 검색
    if (file.includes('pathInfo.relative')) {
      modernCount++;
    }
  });

  const total = legacyCount + modernCount;
  const progress = total > 0 ? (modernCount / total * 100).toFixed(1) : '0';

  console.log(`마이그레이션 진행률: ${progress}% (${modernCount}/${total})`);
}
```

## 🎯 마이그레이션 완료 후 혜택

### 코드 품질 향상
- **가독성**: 더 명확한 의도 표현
- **유지보수성**: 표준화된 경로 처리
- **타입 안전성**: TypeScript 완전 지원

### 개발 효율성
- **코드 재사용**: 공통 유틸리티 함수
- **버그 감소**: 검증된 경로 처리 로직
- **개발 속도**: 빠른 프로토타이핑

### 성능 개선
- **최적화된 알고리즘**: 더 효율적인 경로 계산
- **메모리 효율성**: 중복 계산 방지
- **확장성**: 대규모 프로젝트 지원

## 📞 지원 및 도움

### 마이그레이션 중 문제가 발생하면:

1. **문서 확인**: [Enhanced Path Properties 문서](./enhanced-path-properties.md)
2. **예제 참조**: [Before/After 비교](../comparison-before-after.ts)
3. **테스트 실행**: [테스트 스크립트](../test-enhanced-path-properties.ts)
4. **이슈 리포트**: GitHub Issues에 문제 보고

마이그레이션을 통해 더 강력하고 유지보수하기 쉬운 코드를 만들어보세요! 🚀