# EnhancedExportExtractor - 사용 가이드

## 개요

`EnhancedExportExtractor`는 TypeScript/JavaScript 코드에서 export 정보를 상세하게 추출하는 고급 분석 도구입니다. 함수, 클래스, 변수, 타입 등 다양한 export 유형을 분류하고 클래스 내부 메서드와 프로퍼티까지 포함한 포괄적인 분석을 제공합니다.

## 주요 기능

- ✅ **포괄적인 Export 분석**: 함수, 클래스, 변수, 타입, enum, default export 지원
- ✅ **클래스 내부 분석**: 메서드와 프로퍼티의 가시성, 정적 여부, 비동기 여부 분석
- ✅ **계층적 정보**: 클래스-메서드 관계, 상속 정보 제공
- ✅ **상세한 메타데이터**: 소스 위치, 매개변수, 반환 타입 정보
- ✅ **통계 정보**: Export 유형별 개수 및 요약 통계

## 설치 및 가져오기

```typescript
import {
  EnhancedExportExtractor,
  type EnhancedExportExtractionResult,
  type ExportMethodInfo,
  type ExportStatistics,
  type ClassExportInfo
} from '@context-action/dependency-linker';

// 또는 상대 경로로
import { EnhancedExportExtractor } from './src/extractors/EnhancedExportExtractor';
```

## 기본 사용법

### 1. 기본 설정

```typescript
import { TypeScriptParser } from './src/parsers/TypeScriptParser';
import { EnhancedExportExtractor } from './src/extractors/EnhancedExportExtractor';

// 파서와 추출기 초기화
const parser = new TypeScriptParser();
const extractor = new EnhancedExportExtractor();
```

### 2. 파일 분석

```typescript
async function analyzeFile(filePath: string, sourceCode?: string) {
  try {
    // 1. 파일 파싱
    const parseResult = await parser.parse(filePath, sourceCode);

    // 2. 파싱 오류 검사
    if (!parseResult.ast || parseResult.errors.length > 0) {
      console.error('파싱 실패:', parseResult.errors);
      return null;
    }

    // 3. Export 정보 추출
    const exportResult = extractor.extractExports(parseResult.ast, filePath);

    return exportResult;

  } catch (error) {
    console.error('분석 오류:', error);
    return null;
  }
}
```

### 3. 결과 처리

```typescript
const result = await analyzeFile('./src/example.ts');

if (result) {
  // 통계 정보 출력
  console.log('📊 Export 통계:');
  console.log(`전체: ${result.statistics.totalExports}`);
  console.log(`함수: ${result.statistics.functionExports}`);
  console.log(`클래스: ${result.statistics.classExports}`);
  console.log(`클래스 메서드: ${result.statistics.classMethodsExports}`);

  // 개별 Export 정보 출력
  result.exportMethods.forEach(exp => {
    console.log(`${exp.name} (${exp.exportType})`);
    if (exp.parentClass) {
      console.log(`  └─ 클래스: ${exp.parentClass}`);
    }
  });
}
```

## 상세 사용 예시

### 예시 1: 간단한 함수와 클래스 분석

```typescript
const sourceCode = `
export function calculateSum(a: number, b: number): number {
  return a + b;
}

export class Calculator {
  private value: number = 0;

  public add(num: number): void {
    this.value += num;
  }

  public getValue(): number {
    return this.value;
  }
}

export const PI = 3.14159;
`;

const result = await analyzeFile('calculator.ts', sourceCode);

// 결과 예시:
// {
//   exportMethods: [
//     { name: 'calculateSum', exportType: 'function', ... },
//     { name: 'Calculator', exportType: 'class', ... },
//     { name: 'add', exportType: 'class_method', parentClass: 'Calculator', ... },
//     { name: 'getValue', exportType: 'class_method', parentClass: 'Calculator', ... },
//     { name: 'PI', exportType: 'variable', ... }
//   ],
//   statistics: {
//     totalExports: 5,
//     functionExports: 1,
//     classExports: 1,
//     classMethodsExports: 2,
//     variableExports: 1,
//     ...
//   },
//   classes: [
//     {
//       className: 'Calculator',
//       methods: [...],
//       properties: [...]
//     }
//   ]
// }
```

### 예시 2: 복잡한 클래스 분석

```typescript
const sourceCode = `
export abstract class BaseService {
  protected static instances = new Map();

  protected constructor(protected name: string) {}

  public abstract process(): Promise<void>;

  public static getInstance<T extends BaseService>(this: new(name: string) => T): T {
    // ...
  }
}

export class UserService extends BaseService {
  private users: User[] = [];

  constructor() {
    super('UserService');
  }

  public async process(): Promise<void> {
    // 비동기 처리
  }

  private validateUser(user: User): boolean {
    return user.id !== '';
  }
}
`;

const result = await analyzeFile('services.ts', sourceCode);

// 클래스 상세 정보 접근
result?.classes.forEach(cls => {
  console.log(`클래스: ${cls.className}`);

  if (cls.superClass) {
    console.log(`  상속: ${cls.superClass}`);
  }

  cls.methods.forEach(method => {
    const modifiers = [];
    if (method.isStatic) modifiers.push('static');
    if (method.isAsync) modifiers.push('async');

    console.log(`  메서드: ${modifiers.join(' ')} ${method.visibility} ${method.name}`);
  });

  cls.properties.forEach(prop => {
    console.log(`  프로퍼티: ${prop.visibility} ${prop.name}`);
  });
});
```

### 예시 3: Export 유형별 필터링

```typescript
function filterExportsByType(result: EnhancedExportExtractionResult) {
  const functions = result.exportMethods.filter(exp => exp.exportType === 'function');
  const classes = result.exportMethods.filter(exp => exp.exportType === 'class');
  const classMethods = result.exportMethods.filter(exp => exp.exportType === 'class_method');
  const variables = result.exportMethods.filter(exp => exp.exportType === 'variable');

  return { functions, classes, classMethods, variables };
}

const result = await analyzeFile('./src/example.ts');
const filtered = filterExportsByType(result!);

console.log('🔧 함수들:');
filtered.functions.forEach(fn => {
  const params = fn.parameters?.map(p => `${p.name}${p.optional ? '?' : ''}`).join(', ');
  console.log(`  ${fn.name}(${params})`);
});

console.log('⚙️ 클래스 메서드들:');
filtered.classMethods.forEach(method => {
  console.log(`  ${method.parentClass}::${method.name} [${method.visibility}]`);
});
```

### 예시 4: 에러 처리 및 검증

```typescript
async function robustAnalyze(filePath: string, sourceCode?: string) {
  const extractor = new EnhancedExportExtractor();

  try {
    const parser = new TypeScriptParser();
    const parseResult = await parser.parse(filePath, sourceCode);

    // 파싱 검증
    if (!parseResult.ast) {
      throw new Error('AST 생성 실패');
    }

    if (parseResult.errors.length > 0) {
      console.warn('파싱 경고:', parseResult.errors);
    }

    // Export 추출
    const exportResult = extractor.extractExports(parseResult.ast, filePath);

    // 결과 검증
    const validation = extractor.validate(exportResult);
    if (!validation.isValid) {
      console.error('검증 실패:', validation.errors);
      return null;
    }

    if (validation.warnings.length > 0) {
      console.warn('검증 경고:', validation.warnings);
    }

    return exportResult;

  } catch (error) {
    console.error(`분석 실패 [${filePath}]:`, error);
    return null;
  }
}
```

## 타입 정보

### EnhancedExportExtractionResult

```typescript
interface EnhancedExportExtractionResult {
  exportMethods: ExportMethodInfo[];     // 모든 export 항목
  statistics: ExportStatistics;         // 통계 정보
  classes: ClassExportInfo[];           // 클래스 상세 정보
}
```

### ExportMethodInfo

```typescript
interface ExportMethodInfo {
  name: string;                          // 이름
  exportType: ExportType;                // 분류
  declarationType: DeclarationType;      // 선언 방식
  location: SourceLocation;              // 위치
  parentClass?: string;                  // 부모 클래스
  isAsync?: boolean;                     // 비동기 여부
  isStatic?: boolean;                    // 정적 여부
  visibility?: 'public' | 'private' | 'protected'; // 가시성
  parameters?: ParameterInfo[];          // 매개변수
  returnType?: string;                   // 반환 타입
}
```

### ExportType

```typescript
type ExportType =
  | 'function'          // 함수
  | 'class'             // 클래스
  | 'variable'          // 변수
  | 'type'              // 타입/인터페이스
  | 'enum'              // 열거형
  | 'default'           // 기본 export
  | 'class_method'      // 클래스 메서드
  | 'class_property'    // 클래스 프로퍼티
  | 're_export';        // 재export
```

## 설정 및 최적화

### 설정 옵션

```typescript
const extractor = new EnhancedExportExtractor();

// 설정 변경
extractor.configure({
  enabled: true,
  timeout: 10000,
  memoryLimit: 50 * 1024 * 1024,
  defaultOptions: {
    includeLocations: true,
    includeComments: false,
    maxDepth: 15
  }
});
```

### 성능 고려사항

- **메모리 사용량**: 대용량 파일 처리 시 메모리 제한 설정
- **타임아웃**: 복잡한 파일 분석 시 타임아웃 조정
- **캐싱**: 반복 분석 시 파서 결과 캐싱 활용

## 문제 해결

### 일반적인 문제

1. **파싱 실패**
   ```typescript
   if (parseResult.errors.length > 0) {
     console.log('구문 오류:', parseResult.errors.map(e => e.message));
   }
   ```

2. **빈 결과**
   ```typescript
   if (result.statistics.totalExports === 0) {
     console.log('Export가 발견되지 않았습니다.');
   }
   ```

3. **메모리 부족**
   ```typescript
   extractor.configure({
     memoryLimit: 100 * 1024 * 1024, // 100MB로 증가
     timeout: 30000 // 30초로 증가
   });
   ```

## 통합 예시

### CLI 도구 통합

```typescript
#!/usr/bin/env node
import { program } from 'commander';
import { TypeScriptParser } from './src/parsers/TypeScriptParser';
import { EnhancedExportExtractor } from './src/extractors/EnhancedExportExtractor';

program
  .argument('<file>', 'TypeScript file to analyze')
  .option('-j, --json', 'Output as JSON')
  .option('-s, --stats-only', 'Show only statistics')
  .action(async (file, options) => {
    const parser = new TypeScriptParser();
    const extractor = new EnhancedExportExtractor();

    const parseResult = await parser.parse(file);
    if (!parseResult.ast) {
      console.error('분석 실패');
      process.exit(1);
    }

    const result = extractor.extractExports(parseResult.ast, file);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else if (options.statsOnly) {
      console.log(result.statistics);
    } else {
      // 형식화된 출력
      console.log(`📊 ${file} 분석 결과:`);
      console.log(result.statistics);
    }
  });

program.parse();
```

---

*EnhancedExportExtractor는 @context-action/dependency-linker 패키지의 핵심 기능입니다. 최신 문서는 [GitHub 저장소](https://github.com/context-action/dependency-linker)에서 확인하세요.*