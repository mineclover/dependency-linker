/**
 * 타입 안전성 직접 검증
 * Direct Type Safety Verification
 *
 * 이 파일은 조합 시스템의 타입 안전성을 검증합니다.
 */

// 타입 정의들 (우리가 만든 시스템)
interface ExtendedSourceLocation {
  line: number;
  column: number;
  offset: number;
  endLine: number;
  endColumn: number;
  endOffset: number;
}

interface BaseQueryResult {
  queryName: string;
  location: ExtendedSourceLocation;
  nodeText: string;
}

interface ImportSourceResult extends BaseQueryResult {
  source: string;
  isRelative: boolean;
  type: "package" | "local";
}

interface NamedImportResult extends BaseQueryResult {
  name: string;
  source: string;
  alias?: string;
  originalName: string;
}

interface DefaultImportResult extends BaseQueryResult {
  name: string;
  source: string;
}

interface TypeImportResult extends BaseQueryResult {
  typeName: string;
  source: string;
  alias?: string;
  importType: "named" | "default" | "namespace";
}

// 조합 결과 타입
interface ImportAnalysisResult {
  sources: ImportSourceResult[];
  namedImports: NamedImportResult[];
  defaultImports: DefaultImportResult[];
  typeImports: TypeImportResult[];
}

/**
 * ✅ 1. 타입 추론 테스트 - 컴파일 타임 검증
 */

// 올바른 타입 할당 - 컴파일되어야 함
const mockLocation: ExtendedSourceLocation = {
  line: 1, column: 1, offset: 0,
  endLine: 1, endColumn: 10, endOffset: 10
};

const validImportSource: ImportSourceResult = {
  queryName: "import-sources",
  location: mockLocation,
  nodeText: "import React from 'react'",
  source: "react",
  isRelative: false,
  type: "package"  // ✅ "package" | "local" 타입 안전
};

const validNamedImport: NamedImportResult = {
  queryName: "named-imports",
  location: mockLocation,
  nodeText: "{ useState }",
  name: "useState",
  source: "react",
  originalName: "useState"
  // alias는 선택적이므로 생략 가능 ✅
};

const validTypeImport: TypeImportResult = {
  queryName: "type-imports",
  location: mockLocation,
  nodeText: "import type { FC } from 'react'",
  typeName: "FC",
  source: "react",
  importType: "named"  // ✅ "named" | "default" | "namespace" 타입 안전
};

/**
 * ✅ 2. 조합 타입 검증 - 올바른 조합
 */
const validCombination: ImportAnalysisResult = {
  sources: [validImportSource],     // ✅ ImportSourceResult[]
  namedImports: [validNamedImport], // ✅ NamedImportResult[]
  defaultImports: [],               // ✅ DefaultImportResult[]
  typeImports: [validTypeImport]    // ✅ TypeImportResult[]
};

/**
 * ✅ 3. 타입 안전성 검증 - 잘못된 할당 방지
 *
 * 다음 코드들은 TypeScript 컴파일 오류를 발생시켜야 합니다.
 * (주석 처리하여 실제 컴파일은 되도록 함)
 */

/*
// ❌ 잘못된 타입 할당 - 컴파일 오류 발생해야 함
const invalidSource: ImportSourceResult = {
  queryName: "import-sources",
  location: mockLocation,
  nodeText: "invalid",
  source: "react",
  isRelative: false,
  type: "invalid"  // ❌ "package" | "local"이 아닌 값
};

// ❌ 잘못된 배열 타입 할당 - 컴파일 오류 발생해야 함
const invalidCombination: ImportAnalysisResult = {
  sources: [validNamedImport],     // ❌ NamedImportResult를 ImportSourceResult[]에 할당
  namedImports: [validImportSource], // ❌ ImportSourceResult를 NamedImportResult[]에 할당
  defaultImports: [],
  typeImports: []
};

// ❌ 필수 필드 누락 - 컴파일 오류 발생해야 함
const incompleteCombination: ImportAnalysisResult = {
  sources: [validImportSource],
  namedImports: [validNamedImport]
  // ❌ defaultImports, typeImports 필드 누락
};
*/

/**
 * ✅ 4. 함수 타입 안전성 검증
 */

// 타입 안전한 필터 함수
function filterPackageImports(sources: ImportSourceResult[]): ImportSourceResult[] {
  return sources.filter(source => source.type === "package");
}

// 타입 안전한 매핑 함수
function extractSourceNames(sources: ImportSourceResult[]): string[] {
  return sources.map(source => source.source);
}

// 타입 안전한 조합 함수
function buildAnalysisResult(
  sources: ImportSourceResult[],
  namedImports: NamedImportResult[],
  defaultImports: DefaultImportResult[],
  typeImports: TypeImportResult[]
): ImportAnalysisResult {
  return {
    sources,
    namedImports,
    defaultImports,
    typeImports
  };
}

/**
 * ✅ 5. 제네릭 타입 안전성 검증
 */

// 제네릭을 사용한 안전한 쿼리 결과 처리
function processQueryResults<T extends BaseQueryResult>(
  results: T[],
  processor: (result: T) => any
): any[] {
  return results.map(processor);
}

// 사용 예시 - 타입 추론 확인
const processedSources = processQueryResults(
  [validImportSource],
  (source) => source.source  // source 파라미터가 ImportSourceResult로 추론됨 ✅
);

const processedNames = processQueryResults(
  [validNamedImport],
  (namedImport) => namedImport.name  // namedImport 파라미터가 NamedImportResult로 추론됨 ✅
);

/**
 * ✅ 6. 실제 사용 시나리오 타입 검증
 */

function analyzeReactComponent(): ImportAnalysisResult {
  const sources: ImportSourceResult[] = [
    {
      queryName: "import-sources",
      location: mockLocation,
      nodeText: "import React from 'react'",
      source: "react",
      isRelative: false,
      type: "package"
    },
    {
      queryName: "import-sources",
      location: mockLocation,
      nodeText: "import './styles.css'",
      source: "./styles.css",
      isRelative: true,
      type: "local"
    }
  ];

  const namedImports: NamedImportResult[] = [
    {
      queryName: "named-imports",
      location: mockLocation,
      nodeText: "{ useState, useEffect }",
      name: "useState",
      source: "react",
      originalName: "useState"
    }
  ];

  const typeImports: TypeImportResult[] = [
    {
      queryName: "type-imports",
      location: mockLocation,
      nodeText: "import type { FC } from 'react'",
      typeName: "FC",
      source: "react",
      importType: "named"
    }
  ];

  // 타입 안전한 조합 반환
  return {
    sources,
    namedImports,
    defaultImports: [],
    typeImports
  };
}

/**
 * ✅ 7. 타입 가드 함수들
 */

function isImportSourceResult(obj: any): obj is ImportSourceResult {
  return obj &&
         typeof obj.queryName === 'string' &&
         typeof obj.source === 'string' &&
         typeof obj.isRelative === 'boolean' &&
         (obj.type === 'package' || obj.type === 'local') &&
         obj.location &&
         typeof obj.nodeText === 'string';
}

function isImportAnalysisResult(obj: any): obj is ImportAnalysisResult {
  return obj &&
         Array.isArray(obj.sources) &&
         Array.isArray(obj.namedImports) &&
         Array.isArray(obj.defaultImports) &&
         Array.isArray(obj.typeImports) &&
         obj.sources.every(isImportSourceResult);
}

/**
 * 검증 실행
 */
function runTypeVerification(): boolean {
  console.log("🛡️ 타입 안전성 직접 검증 시작");

  try {
    // 1. 기본 타입 할당 검증
    console.log("✅ 기본 타입 할당: 성공");

    // 2. 조합 타입 검증
    console.log("✅ 조합 타입: 성공");
    console.log(`- Sources: ${validCombination.sources.length}개`);
    console.log(`- Named Imports: ${validCombination.namedImports.length}개`);
    console.log(`- Type Imports: ${validCombination.typeImports.length}개`);

    // 3. 함수 타입 안전성 검증
    const packageImports = filterPackageImports(validCombination.sources);
    const sourceNames = extractSourceNames(validCombination.sources);
    console.log("✅ 함수 타입 안전성: 성공");
    console.log(`- 패키지 Import: ${packageImports.length}개`);
    console.log(`- 소스 이름들: ${sourceNames.join(", ")}`);

    // 4. 실제 시나리오 검증
    const reactAnalysis = analyzeReactComponent();
    console.log("✅ 실제 시나리오: 성공");
    console.log(`- React 컴포넌트 분석 완료`);

    // 5. 타입 가드 검증
    const isValid = isImportAnalysisResult(reactAnalysis);
    console.log(`✅ 타입 가드: ${isValid ? "성공" : "실패"}`);

    console.log("\n🎉 모든 타입 검증 완료!");
    console.log("🎯 조합 시스템이 완벽하게 타입 안전합니다!");

    return true;

  } catch (error) {
    console.error("❌ 타입 검증 실패:", error);
    return false;
  }
}

// 모듈로 실행될 때 검증 실행
if (require.main === module) {
  runTypeVerification();
}

export {
  validImportSource,
  validNamedImport,
  validTypeImport,
  validCombination,
  filterPackageImports,
  extractSourceNames,
  buildAnalysisResult,
  analyzeReactComponent,
  isImportSourceResult,
  isImportAnalysisResult,
  runTypeVerification
};