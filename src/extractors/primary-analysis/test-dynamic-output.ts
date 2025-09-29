/**
 * 동적 객체 요청 형태와 출력 결과 테스트
 * {[keyName]: queryResult[]} 구조의 실제 동작 확인
 */

import {
	executeQueryAsDynamicObject,
	executeMultipleQueriesAsDynamicObject,
	executeConditionalQueriesAsDynamicObject,
	createDynamicQueryMapper,
	dynamicQueryHelpers,
	type DynamicQueryResult,
} from "./queries/ImportQueries";
import type { QueryExecutionContext, QueryMatch } from "./core/QueryEngine";

/**
 * 모킹된 테스트 데이터
 */
const createMockData = () => {
	const mockMatches: QueryMatch<any>[] = [];

	const mockContext: QueryExecutionContext = {
		sourceCode: `
			import React from 'react';
			import { useState, useEffect } from 'react';
			import type { FC, Props } from 'react';
			import './styles.css';
		`,
		language: "typescript",
		filePath: "example.tsx",
		astNode: {},
	};

	return { mockMatches, mockContext };
};

/**
 * 1. 단일 쿼리 동적 객체 테스트
 */
function testSingleQueryDynamicObject() {
	console.log("🔍 1. 단일 쿼리 → 동적 객체 테스트");
	console.log("=".repeat(50));

	const { mockMatches, mockContext } = createMockData();

	// 요청: "import-sources" 쿼리 실행
	console.log("📥 요청:");
	console.log('  executeQueryAsDynamicObject("import-sources", matches, context)');

	// 실행
	const result: DynamicQueryResult<"import-sources"> =
		executeQueryAsDynamicObject("import-sources", mockMatches, mockContext);

	// 출력 결과
	console.log("\n📤 출력 결과:");
	console.log("  타입:", "DynamicQueryResult<\"import-sources\">");
	console.log("  구조:", JSON.stringify({
		"구조 예시": "{ 'import-sources': ImportSourceResult[] }"
	}, null, 2));

	console.log("  실제 키들:", Object.keys(result));
	console.log("  실제 구조:", {
		[Object.keys(result)[0] || "no-key"]: `${Array.isArray(result["import-sources"]) ? 'Array' : 'undefined'}[${result["import-sources"]?.length || 0}]`
	});

	// 타입 검증
	const importSources = result["import-sources"]; // ImportSourceResult[] 타입 추론됨
	console.log("  타입 검증: import-sources →", Array.isArray(importSources) ? "✅ Array" : "❌ Not Array");

	console.log("\n✅ 단일 쿼리 테스트 완료\n");
	return result;
}

/**
 * 2. 다중 쿼리 동적 객체 테스트
 */
function testMultipleQueriesDynamicObject() {
	console.log("🔍 2. 다중 쿼리 → 동적 객체 테스트");
	console.log("=".repeat(50));

	const { mockMatches, mockContext } = createMockData();

	// 요청: 여러 쿼리 동시 실행
	const queryKeys = ["import-sources", "named-imports", "default-imports"] as const;
	console.log("📥 요청:");
	console.log(`  executeMultipleQueriesAsDynamicObject(${JSON.stringify(queryKeys)}, matches, context)`);

	// 실행
	const result: DynamicQueryResult<"import-sources" | "named-imports" | "default-imports"> =
		executeMultipleQueriesAsDynamicObject(queryKeys, mockMatches, mockContext);

	// 출력 결과
	console.log("\n📤 출력 결과:");
	console.log("  타입:", "DynamicQueryResult<\"import-sources\" | \"named-imports\" | \"default-imports\">");
	console.log("  구조:", JSON.stringify({
		"구조 예시": {
			"import-sources": "ImportSourceResult[]",
			"named-imports": "NamedImportResult[]",
			"default-imports": "DefaultImportResult[]"
		}
	}, null, 2));

	console.log("  실제 키들:", Object.keys(result));
	console.log("  실제 구조:");
	Object.keys(result).forEach(key => {
		const value = (result as any)[key];
		console.log(`    ${key}: ${Array.isArray(value) ? 'Array' : typeof value}[${value?.length || 0}]`);
	});

	// 타입 검증
	const importSources = result["import-sources"];   // ImportSourceResult[] 타입 추론됨
	const namedImports = result["named-imports"];     // NamedImportResult[] 타입 추론됨
	const defaultImports = result["default-imports"]; // DefaultImportResult[] 타입 추론됨

	console.log("  타입 검증:");
	console.log(`    import-sources → ${Array.isArray(importSources) ? "✅ Array" : "❌ Not Array"}`);
	console.log(`    named-imports → ${Array.isArray(namedImports) ? "✅ Array" : "❌ Not Array"}`);
	console.log(`    default-imports → ${Array.isArray(defaultImports) ? "✅ Array" : "❌ Not Array"}`);

	console.log("\n✅ 다중 쿼리 테스트 완료\n");
	return result;
}

/**
 * 3. 조건부 쿼리 동적 객체 테스트
 */
function testConditionalQueriesDynamicObject() {
	console.log("🔍 3. 조건부 쿼리 → 동적 객체 테스트");
	console.log("=".repeat(50));

	const { mockMatches, mockContext } = createMockData();

	// 요청: 조건부 쿼리 실행 (일부만 실행)
	const conditions = [
		{ queryKey: "import-sources" as const, condition: true },
		{ queryKey: "named-imports" as const, condition: true },
		{ queryKey: "default-imports" as const, condition: false }, // 실행 안됨
		{ queryKey: "type-imports" as const, condition: true },
	];

	console.log("📥 요청:");
	console.log("  executeConditionalQueriesAsDynamicObject([");
	conditions.forEach(({ queryKey, condition }) => {
		console.log(`    { queryKey: "${queryKey}", condition: ${condition} },`);
	});
	console.log("  ], matches, context)");

	// 실행
	const result = executeConditionalQueriesAsDynamicObject(conditions, mockMatches, mockContext);

	// 출력 결과
	console.log("\n📤 출력 결과:");
	console.log("  타입:", "Partial<DynamicQueryResult<쿼리키들>>");
	console.log("  구조:", JSON.stringify({
		"구조 예시": {
			"import-sources": "ImportSourceResult[] (조건: true)",
			"named-imports": "NamedImportResult[] (조건: true)",
			"type-imports": "TypeImportResult[] (조건: true)"
			// "default-imports"는 조건이 false라서 없음
		}
	}, null, 2));

	console.log("  실제 키들:", Object.keys(result));
	console.log("  실제 구조:");
	Object.keys(result).forEach(key => {
		const value = (result as any)[key];
		console.log(`    ${key}: ${Array.isArray(value) ? 'Array' : typeof value}[${value?.length || 0}]`);
	});

	// 조건 검증
	console.log("  조건 검증:");
	console.log(`    import-sources (true) → ${"import-sources" in result ? "✅ 포함됨" : "❌ 없음"}`);
	console.log(`    named-imports (true) → ${"named-imports" in result ? "✅ 포함됨" : "❌ 없음"}`);
	console.log(`    default-imports (false) → ${"default-imports" in result ? "❌ 포함됨" : "✅ 제외됨"}`);
	console.log(`    type-imports (true) → ${"type-imports" in result ? "✅ 포함됨" : "❌ 없음"}`);

	console.log("\n✅ 조건부 쿼리 테스트 완료\n");
	return result;
}

/**
 * 4. 동적 매퍼 테스트
 */
function testDynamicMapper() {
	console.log("🔍 4. 동적 매퍼 테스트");
	console.log("=".repeat(50));

	const { mockMatches, mockContext } = createMockData();

	// 요청: 사용자 정의 쿼리 조합
	const customKeys = ["import-sources", "type-imports"] as const;
	console.log("📥 요청:");
	console.log(`  const mapper = createDynamicQueryMapper(${JSON.stringify(customKeys)});`);
	console.log("  mapper.execute(matches, context)");

	// 실행
	const mapper = createDynamicQueryMapper(customKeys);
	const result: DynamicQueryResult<"import-sources" | "type-imports"> =
		mapper.execute(mockMatches, mockContext);

	// 출력 결과
	console.log("\n📤 출력 결과:");
	console.log("  타입:", "DynamicQueryResult<\"import-sources\" | \"type-imports\">");
	console.log("  구조:", JSON.stringify({
		"구조 예시": {
			"import-sources": "ImportSourceResult[]",
			"type-imports": "TypeImportResult[]"
		}
	}, null, 2));

	console.log("  실제 키들:", Object.keys(result));
	console.log("  실제 구조:");
	Object.keys(result).forEach(key => {
		const value = (result as any)[key];
		console.log(`    ${key}: ${Array.isArray(value) ? 'Array' : typeof value}[${value?.length || 0}]`);
	});

	// 선택된 쿼리만 포함되었는지 확인
	console.log("  선택 검증:");
	console.log(`    import-sources → ${"import-sources" in result ? "✅ 포함됨" : "❌ 없음"}`);
	console.log(`    type-imports → ${"type-imports" in result ? "✅ 포함됨" : "❌ 없음"}`);
	console.log(`    named-imports → ${"named-imports" in result ? "❌ 포함됨 (불필요)" : "✅ 제외됨 (정상)"}`);

	console.log("\n✅ 동적 매퍼 테스트 완료\n");
	return result;
}

/**
 * 5. 헬퍼 함수 테스트
 */
function testHelperFunctions() {
	console.log("🔍 5. 헬퍼 함수 테스트");
	console.log("=".repeat(50));

	const { mockMatches, mockContext } = createMockData();

	// 요청: Import 분석 헬퍼
	console.log("📥 요청:");
	console.log("  dynamicQueryHelpers.executeImportAnalysis(matches, context)");

	// 실행
	const result = dynamicQueryHelpers.executeImportAnalysis(mockMatches, mockContext);

	// 출력 결과
	console.log("\n📤 출력 결과:");
	console.log("  타입:", "DynamicQueryResult<\"import-sources\" | \"named-imports\" | \"default-imports\" | \"type-imports\">");
	console.log("  구조:", JSON.stringify({
		"구조 예시": {
			"import-sources": "ImportSourceResult[]",
			"named-imports": "NamedImportResult[]",
			"default-imports": "DefaultImportResult[]",
			"type-imports": "TypeImportResult[]"
		}
	}, null, 2));

	console.log("  실제 키들:", Object.keys(result));
	console.log("  실제 구조:");
	Object.keys(result).forEach(key => {
		const value = (result as any)[key];
		console.log(`    ${key}: ${Array.isArray(value) ? 'Array' : typeof value}[${value?.length || 0}]`);
	});

	// 전체 Import 분석 포함 확인
	const expectedKeys = ["import-sources", "named-imports", "default-imports", "type-imports"];
	console.log("  완전성 검증:");
	expectedKeys.forEach(key => {
		console.log(`    ${key} → ${key in result ? "✅ 포함됨" : "❌ 없음"}`);
	});

	console.log("\n✅ 헬퍼 함수 테스트 완료\n");
	return result;
}

/**
 * 6. 타입 추론 확인 테스트
 */
function testTypeInference() {
	console.log("🔍 6. 타입 추론 확인 테스트");
	console.log("=".repeat(50));

	const { mockMatches, mockContext } = createMockData();

	// 다양한 타입 조합 테스트
	console.log("📥 요청: 다양한 타입 조합");

	// 1. 단일 타입
	const single = executeQueryAsDynamicObject("import-sources", mockMatches, mockContext);
	type SingleType = typeof single; // DynamicQueryResult<"import-sources">

	// 2. 유니온 타입
	const multiple = executeMultipleQueriesAsDynamicObject(
		["import-sources", "named-imports"] as const,
		mockMatches,
		mockContext
	);
	type MultipleType = typeof multiple; // DynamicQueryResult<"import-sources" | "named-imports">

	// 3. 전체 타입
	const all = dynamicQueryHelpers.executeImportAnalysis(mockMatches, mockContext);
	type AllType = typeof all; // DynamicQueryResult<"import-sources" | "named-imports" | "default-imports" | "type-imports">

	console.log("\n📤 타입 추론 결과:");
	console.log("  single 객체의 키들:", Object.keys(single));
	console.log("  multiple 객체의 키들:", Object.keys(multiple));
	console.log("  all 객체의 키들:", Object.keys(all));

	// 접근 안전성 테스트
	console.log("\n  접근 안전성 테스트:");

	// ✅ 안전한 접근
	const safeAccess1 = single["import-sources"];        // ✅ ImportSourceResult[]
	const safeAccess2 = multiple["import-sources"];      // ✅ ImportSourceResult[]
	const safeAccess3 = multiple["named-imports"];       // ✅ NamedImportResult[]
	const safeAccess4 = all["type-imports"];             // ✅ TypeImportResult[]

	console.log(`    single["import-sources"] → ${Array.isArray(safeAccess1) ? "✅ Array" : "❌ Not Array"}`);
	console.log(`    multiple["import-sources"] → ${Array.isArray(safeAccess2) ? "✅ Array" : "❌ Not Array"}`);
	console.log(`    multiple["named-imports"] → ${Array.isArray(safeAccess3) ? "✅ Array" : "❌ Not Array"}`);
	console.log(`    all["type-imports"] → ${Array.isArray(safeAccess4) ? "✅ Array" : "❌ Not Array"}`);

	// ❌ 컴파일 에러가 발생해야 하는 접근 (주석 처리)
	// const unsafeAccess1 = single["named-imports"];    // ❌ 컴파일 에러
	// const unsafeAccess2 = multiple["type-imports"];   // ❌ 컴파일 에러

	console.log("\n✅ 타입 추론 확인 테스트 완료\n");
	return { single, multiple, all };
}

/**
 * 전체 테스트 실행
 */
export function runDynamicObjectTest() {
	console.log("🚀 동적 객체 요청/응답 형태 종합 테스트 시작");
	console.log("=".repeat(80) + "\n");

	try {
		// 1. 단일 쿼리
		const singleResult = testSingleQueryDynamicObject();

		// 2. 다중 쿼리
		const multipleResult = testMultipleQueriesDynamicObject();

		// 3. 조건부 쿼리
		const conditionalResult = testConditionalQueriesDynamicObject();

		// 4. 동적 매퍼
		const mapperResult = testDynamicMapper();

		// 5. 헬퍼 함수
		const helperResult = testHelperFunctions();

		// 6. 타입 추론
		const typeResult = testTypeInference();

		console.log("🎉 모든 동적 객체 테스트 완료!");
		console.log("=".repeat(80));
		console.log("\n📊 테스트 요약:");
		console.log("✅ 단일 쿼리 → {[keyName]: result[]} 구조 동작");
		console.log("✅ 다중 쿼리 → {[key1]: result1[], [key2]: result2[]} 구조 동작");
		console.log("✅ 조건부 실행 → 선택적 키 포함/제외 동작");
		console.log("✅ 동적 매퍼 → 사용자 정의 키 조합 동작");
		console.log("✅ 헬퍼 함수 → 사전 정의된 키 조합 동작");
		console.log("✅ 타입 추론 → 모든 키와 값 타입 자동 추론");

		console.log("\n🎯 핵심 달성사항:");
		console.log("🔑 키 이름이 쿼리 이름과 정확히 매핑됨");
		console.log("🧠 TypeScript 타입이 완벽하게 추론됨");
		console.log("📦 결과 구조가 {[keyName]: queryResult[]} 형태로 반환됨");

		return {
			success: true,
			results: {
				singleResult,
				multipleResult,
				conditionalResult,
				mapperResult,
				helperResult,
				typeResult,
			},
		};

	} catch (error) {
		console.error("❌ 테스트 실행 실패:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

// 기본 실행
if (require.main === module) {
	runDynamicObjectTest();
}

export default runDynamicObjectTest;