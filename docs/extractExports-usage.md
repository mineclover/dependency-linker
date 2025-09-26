# extractExports 기본 사용법

`extractExports`는 TypeScript/JavaScript 파일에서 모든 export 정보를 추출하는 핵심 기능입니다.

## 기본 사용법

### 1. 간단한 파일 분석

```javascript
const { EnhancedExportExtractor, NewTypeScriptParser } = require('@context-action/dependency-linker');

async function analyzeExports() {
  // 파서와 추출기 초기화
  const parser = new NewTypeScriptParser();
  const extractor = new EnhancedExportExtractor();

  // TypeScript 코드
  const code = `
  export function getUserData(id: string) {
    return { id, name: 'User' };
  }

  export class UserManager {
    private users = new Map();

    addUser(user: any) {
      this.users.set(user.id, user);
    }
  }

  export const API_VERSION = '1.0.0';
  export type User = { id: string; name: string };
  `;

  // AST 파싱 (비동기)
  const ast = await parser.parse(code, 'example.ts');

  // Export 정보 추출
  const result = extractor.extractExports(ast, 'example.ts');

  console.log('Functions:', result.exportMethods.filter(m => m.type === 'function'));
  console.log('Classes:', result.classes);
  console.log('Variables:', result.exportMethods.filter(m => m.type === 'variable'));
  console.log('Types:', result.exportMethods.filter(m => m.type === 'type'));
}

analyzeExports().catch(console.error);
```

### 2. 파일에서 직접 분석

```javascript
const { analyzeTypeScriptFile } = require('@context-action/dependency-linker');

// 파일 경로로 직접 분석
const result = await analyzeTypeScriptFile('./src/components/Button.tsx');

// Export 정보 접근
const exports = result.exports;
console.log('Total exports:', exports.length);
```

## 반환 결과 구조

```typescript
interface EnhancedExportExtractionResult {
  exportMethods: ExportMethodInfo[];  // 모든 export 항목
  classes: ClassExportInfo[];         // 클래스 상세 정보
  statistics: ExportStatistics;       // 통계 정보
}

interface ExportMethodInfo {
  name: string;                       // export 이름
  type: 'function' | 'class' | 'variable' | 'type' | 'interface' | 'enum';
  isDefault: boolean;                 // default export 여부
  location: SourceLocation;           // 소스 위치
  signature?: string;                 // 함수/메서드 시그니처
  visibility?: 'public' | 'private' | 'protected';
}

interface ClassExportInfo {
  name: string;                       // 클래스 이름
  methods: ExportMethodInfo[];        // 클래스 메서드들
  properties: ExportMethodInfo[];     // 클래스 프로퍼티들
  isAbstract: boolean;               // 추상 클래스 여부
  location: SourceLocation;          // 소스 위치
}
```

## 실제 사용 예시

### React 컴포넌트 분석

```javascript
const reactCode = `
import React from 'react';

interface Props {
  title: string;
  onClick?: () => void;
}

export default function Button({ title, onClick }: Props) {
  return <button onClick={onClick}>{title}</button>;
}

export const ButtonVariant = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary'
} as const;

export type ButtonProps = Props;
`;

const result = extractor.extractExports(parser.parse(reactCode, 'Button.tsx'), 'Button.tsx');

// Default export 찾기
const defaultExport = result.exportMethods.find(m => m.isDefault);
console.log('Default export:', defaultExport?.name); // "Button"

// Named exports 찾기
const namedExports = result.exportMethods.filter(m => !m.isDefault);
console.log('Named exports:', namedExports.map(e => e.name)); // ["ButtonVariant", "ButtonProps"]
```

### API 모듈 분석

```javascript
const apiCode = `
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async get(path: string) {
    return fetch(\`\${this.baseUrl}\${path}\`);
  }

  private authenticate() {
    // private method
  }
}

export async function fetchUserData(id: string) {
  const client = new ApiClient('/api');
  return client.get(\`/users/\${id}\`);
}

export const CONFIG = {
  timeout: 5000,
  retries: 3
};
`;

const result = extractor.extractExports(parser.parse(apiCode, 'api.ts'), 'api.ts');

// 클래스 상세 정보
const apiClass = result.classes[0];
console.log('Class name:', apiClass.name);
console.log('Public methods:', apiClass.methods.filter(m => m.visibility === 'public'));
console.log('Private methods:', apiClass.methods.filter(m => m.visibility === 'private'));

// 통계 정보
console.log('Export statistics:', result.statistics);
```

## 고급 사용법

### 프로젝트 전체 Export 분석

```javascript
const { analyzeDirectory } = require('@context-action/dependency-linker');

// 디렉터리 전체 분석
const projectAnalysis = await analyzeDirectory('./src', {
  extensions: ['.ts', '.tsx'],
  includeExports: true
});

// 모든 파일의 export 정보 수집
const allExports = projectAnalysis.files.flatMap(file => file.exports || []);

// Export 통계
const exportStats = {
  totalExports: allExports.length,
  functions: allExports.filter(e => e.type === 'function').length,
  classes: allExports.filter(e => e.type === 'class').length,
  types: allExports.filter(e => e.type === 'type').length,
  defaultExports: allExports.filter(e => e.isDefault).length
};

console.log('Project export statistics:', exportStats);
```

## 주요 특징

1. **완전한 TypeScript 지원**: 모든 export 유형 지원
2. **클래스 상세 분석**: 메서드, 프로퍼티, 가시성 정보 포함
3. **소스 위치 추적**: 정확한 라인/컬럼 정보
4. **Re-export 지원**: `export { x } from './module'` 패턴 지원
5. **통계 정보**: export 유형별 통계 제공

## 오류 처리

```javascript
try {
  const result = extractor.extractExports(ast, filePath);
  console.log('Exports extracted successfully:', result.exportMethods.length);
} catch (error) {
  console.error('Export extraction failed:', error.message);
  // 파싱 오류나 파일 접근 오류 처리
}
```

이 기본 사용법을 통해 TypeScript/JavaScript 프로젝트의 export 구조를 완전히 분석할 수 있습니다.