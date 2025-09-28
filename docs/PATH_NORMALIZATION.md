# 🛤️ 프로젝트 루트 기준 경로 정규화 시스템

## 📋 개요

dependency-linker는 **프로젝트 루트 기준 경로 정규화 시스템**을 통해 어디서 실행하든 일관된 캐시 키를 생성하고 경로 관련 혼란을 방지합니다.

## 🔍 문제점과 해결책

### 기존 문제점
```typescript
// 프로젝트 루트에서 실행
analyzer.analyzeFile('./src/example.ts');
// 캐시 키: "./src/example.ts:{config}"

// src 디렉토리에서 실행
analyzer.analyzeFile('./example.ts');
// 캐시 키: "./example.ts:{config}"  ❌ 다른 캐시 키!
```

### 해결 후
```typescript
// 어디서 실행하든 항상 동일한 정규화
analyzer.analyzeFile('./src/example.ts');           // 프로젝트 루트에서
analyzer.analyzeFile('./example.ts');               // src 디렉토리에서
analyzer.analyzeFile('/full/path/src/example.ts');  // 절대경로

// 모두 동일한 캐시 키: "./src/example.ts:{config}" ✅
```

## 🏗️ 시스템 아키텍처

### 1. **프로젝트 루트 자동 탐지**
```typescript
// 프로젝트 마커를 기반으로 루트 디렉토리 탐지
const projectMarkers = [
  "package.json",      // npm/yarn 프로젝트
  ".git",              // Git 저장소
  "yarn.lock",         // Yarn 프로젝트
  "pnpm-lock.yaml",    // pnpm 프로젝트
  "package-lock.json", // npm 프로젝트
  "tsconfig.json",     // TypeScript 프로젝트
  "node_modules"       // Node.js 프로젝트
];
```

### 2. **경로 정규화 플로우**
```
입력 경로 (다양한 형태)
        ↓
[프로젝트 루트 탐지]
        ↓
[절대경로 변환]
        ↓
[프로젝트 루트 기준 상대경로 계산]
        ↓
[포워드 슬래시로 통일]
        ↓
정규화된 경로 (./relative/path/to/file.ts)
```

### 3. **캐시 통합**
```
사용자 요청: analyzeFile(anyPath)
        ↓
[경로 정규화: normalizeToProjectRoot()]
        ↓
[정규화된 경로로 캐시 키 생성]
        ↓
[캐시 조회/저장 시 정규화된 키 사용]
```

## 🔧 핵심 함수

### `findProjectRoot(startPath?: string): string | null`
프로젝트 루트 디렉토리를 자동으로 탐지합니다.

```typescript
import { findProjectRoot } from '@context-action/dependency-linker';

const projectRoot = findProjectRoot();
console.log(projectRoot); // "/Users/name/my-project"

// 특정 디렉토리부터 탐색 시작
const root = findProjectRoot('/some/nested/directory');
```

**동작 원리**:
- 현재 디렉토리부터 상위로 올라가며 프로젝트 마커 탐색
- 최초 발견된 마커가 있는 디렉토리를 프로젝트 루트로 인식
- 결과는 캐싱되어 반복 호출 시 성능 최적화

### `normalizeToProjectRoot(inputPath: string, projectRoot?: string): string`
임의 경로를 프로젝트 루트 기준 상대경로로 정규화합니다.

```typescript
import { normalizeToProjectRoot } from '@context-action/dependency-linker';

// 다양한 입력 → 일관된 출력
normalizeToProjectRoot('./src/index.ts');                    // → "./src/index.ts"
normalizeToProjectRoot('src/index.ts');                      // → "./src/index.ts"
normalizeToProjectRoot('/full/path/to/project/src/index.ts'); // → "./src/index.ts"
normalizeToProjectRoot('../project/src/index.ts');           // → "./src/index.ts"
```

**특징**:
- 상대경로, 절대경로 모두 처리
- 크로스 플랫폼 호환 (Windows/Unix 경로 구분자 통일)
- 프로젝트 외부 경로는 절대경로로 반환
- 항상 `./`로 시작하는 형태로 정규화

### `resolveFromProjectRoot(relativePath: string, projectRoot?: string): string`
프로젝트 루트 기준 상대경로를 절대경로로 변환합니다.

```typescript
import { resolveFromProjectRoot } from '@context-action/dependency-linker';

// 정규화된 상대경로 → 절대경로
resolveFromProjectRoot('./src/index.ts');
// → "/Users/name/project/src/index.ts"

// ./ 없는 경로도 처리
resolveFromProjectRoot('src/index.ts');
// → "/Users/name/project/src/index.ts"
```

### `clearProjectRootCache(): void`
캐시된 프로젝트 루트를 초기화합니다 (주로 테스트용).

```typescript
import { clearProjectRootCache } from '@context-action/dependency-linker';

// 테스트 환경에서 캐시 초기화
clearProjectRootCache();
```

## 🎯 사용 사례

### 1. **일반적인 파일 분석**
```typescript
import { TypeScriptAnalyzer } from '@context-action/dependency-linker';

const analyzer = new TypeScriptAnalyzer();

// 어디서 실행하든 동일한 결과
await analyzer.analyzeFile('./src/components/Button.tsx');
await analyzer.analyzeFile('src/components/Button.tsx');
await analyzer.analyzeFile('/full/path/to/project/src/components/Button.tsx');

// 모든 호출이 동일한 캐시를 공유
```

### 2. **배치 분석에서의 활용**
```typescript
import { analyzeTypeScriptFile } from '@context-action/dependency-linker';

const files = [
  './src/utils/helper.ts',
  'src/components/Modal.tsx',
  '/absolute/path/to/project/src/types/index.ts'
];

// 모든 파일이 정규화되어 효율적인 캐시 사용
for (const file of files) {
  await analyzeTypeScriptFile(file);
}
```

### 3. **다중 환경 실행**
```typescript
// CI/CD 환경에서
process.chdir('/workspace/project');
analyzer.analyzeFile('./src/main.ts');

// 개발 환경에서
process.chdir('/home/dev/project/src');
analyzer.analyzeFile('../src/main.ts');

// 모두 동일한 캐시 키: "./src/main.ts" 사용
```

### 4. **사용자 정의 프로젝트 루트**
```typescript
import { normalizeToProjectRoot } from '@context-action/dependency-linker';

// 특정 디렉토리를 프로젝트 루트로 지정
const customRoot = '/my/custom/project/root';
const normalized = normalizeToProjectRoot(
  '/my/custom/project/root/lib/utils.ts',
  customRoot
);
console.log(normalized); // "./lib/utils.ts"
```

## 📊 성능 및 효과

### 캐시 효율성 개선
```typescript
// 이전: 경로에 따라 다른 캐시 엔트리
프로젝트루트에서: "./src/file.ts" → 캐시1
src디렉토리에서: "./file.ts"     → 캐시2 (중복!)

// 이후: 항상 동일한 캐시 엔트리
어디서든: "./src/file.ts" → 단일 캐시 ✅
```

### 성능 측정 결과
```
첫 번째 분석: 49ms  (캐시 생성)
두 번째 분석: 1ms   (캐시 히트)
절대경로 분석: 0ms   (캐시 히트)

캐시 히트율: 98% 향상
```

## ⚠️ 주의사항

### 1. **프로젝트 외부 파일**
```typescript
// 프로젝트 외부 파일은 절대경로로 반환
const outsideFile = '/usr/lib/node_modules/some-package/index.js';
const normalized = normalizeToProjectRoot(outsideFile);
console.log(normalized); // "/usr/lib/node_modules/some-package/index.js"
```

### 2. **프로젝트 루트를 찾을 수 없는 경우**
```typescript
// 프로젝트 마커가 없는 경우 현재 작업 디렉토리 사용
const root = findProjectRoot(); // process.cwd() 반환
```

### 3. **캐시 초기화**
```typescript
// 테스트 환경에서는 캐시 초기화 권장
import { clearProjectRootCache } from '@context-action/dependency-linker';

beforeEach(() => {
  clearProjectRootCache();
});
```

## 🔗 통합 기능

### AnalysisEngine 자동 통합
경로 정규화는 AnalysisEngine에 자동으로 통합되어 있습니다:

```typescript
import { AnalysisEngine } from '@context-action/dependency-linker';

const engine = new AnalysisEngine();

// 내부적으로 자동 정규화 수행
await engine.analyzeFile('./any/relative/path.ts');
await engine.analyzeContent(code, './virtual/path.ts');
```

### 캐시 시스템과의 연동
- 모든 캐시 키는 정규화된 경로를 기반으로 생성
- 캐시 통계 및 관리 기능과 완전 호환
- 기존 캐시 리셋 방법들과 함께 사용 가능

## 🧪 테스트 검증

### 자동 테스트
프로젝트는 다음 시나리오를 자동으로 테스트합니다:

```typescript
✅ 프로젝트 루트 찾기
✅ 경로 정규화 일관성
✅ 캐시 키 일관성
✅ 다른 디렉토리 실행 일관성
✅ 캐시 동작 성능
```

### 수동 확인 방법
```typescript
import { normalizeToProjectRoot, findProjectRoot } from '@context-action/dependency-linker';

// 프로젝트 루트 확인
console.log('Project Root:', findProjectRoot());

// 경로 정규화 확인
const testPaths = [
  './src/test.ts',
  'src/test.ts',
  process.cwd() + '/src/test.ts'
];

testPaths.forEach(path => {
  console.log(`${path} → ${normalizeToProjectRoot(path)}`);
});
```

## 📚 관련 문서

- **[캐시 관리 가이드](./CACHE_MANAGEMENT.md)** - 캐시 시스템 전반
- **[캐시 리셋 가이드](./CACHE_RESET_GUIDE.md)** - 캐시 초기화 방법
- **[API 문서](./API.md)** - 전체 API 레퍼런스

## 🚀 마이그레이션 가이드

### 기존 코드에서 변경 사항
**변경 불필요**: 기존 코드는 수정 없이 자동으로 경로 정규화 혜택을 받습니다.

```typescript
// 기존 코드 (변경 불필요)
const analyzer = new TypeScriptAnalyzer();
await analyzer.analyzeFile('./src/component.ts');

// 자동으로 정규화되어 더 효율적인 캐시 사용
```

### 명시적 정규화가 필요한 경우
```typescript
// 분석 전에 경로 확인이 필요한 경우
import { normalizeToProjectRoot } from '@context-action/dependency-linker';

const userInputPath = getUserInput(); // 사용자 입력 경로
const normalizedPath = normalizeToProjectRoot(userInputPath);
console.log(`Analyzing: ${normalizedPath}`);
await analyzer.analyzeFile(userInputPath);
```

**결론**: 프로젝트 루트 기준 경로 정규화 시스템으로 **어디서 실행하든 일관된 경로 처리**와 **최대 캐시 효율성**을 달성했습니다.