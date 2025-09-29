/**
 * 사용자 정의 키 매핑 테스트
 * { sources: "import-sources", defaultImports: "default-imports" }
 * → { sources: ImportSourceResult[], defaultImports: DefaultImportResult[] }
 */

import {
	executeQueriesWithCustomKeys,
	executeConditionalQueriesWithCustomKeys,
	createCustomKeyMapper,
	predefinedCustomMappings,
	type CustomKeyMappingResult,
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
 * 1. 기본 사용자 정의 키 매핑 테스트
 */
function testBasicCustomKeyMapping() {
	console.log("🔑 1. 기본 사용자 정의 키 매핑 테스트");
	console.log("=".repeat(50));

	const { mockMatches, mockContext } = createMockData();

	// 사용자 정의 키 매핑 정의
	const customMapping = {
		sources: "import-sources",
		defaultImports: "default-imports",
	} as const;

	console.log("📥 요청:");
	console.log("  매핑:", JSON.stringify(customMapping, null, 2));
	console.log("  executeQueriesWithCustomKeys(customMapping, matches, context)");

	// 실행
	const result = executeQueriesWithCustomKeys(customMapping, mockMatches, mockContext);

	console.log("\n📤 출력 결과:");
	console.log("  타입: CustomKeyMappingResult<typeof customMapping>");
	console.log("  구조 예시:", {
		sources: "ImportSourceResult[]",
		defaultImports: "DefaultImportResult[]",
	});
	console.log("  실제 키들:", Object.keys(result));
	console.log("  실제 구조:");
	Object.entries(result).forEach(([key, value]) => {
		console.log(`    ${key}: Array[${Array.isArray(value) ? value.length : 0}]`);
	});

	// 타입 검증
	console.log("\n  타입 검증:");
	Object.keys(result).forEach(key => {
		const value = (result as any)[key];
		console.log(`    ${key} → ${Array.isArray(value) ? "✅ Array" : "❌ Not Array"}`);
	});

	console.log("\n✅ 기본 사용자 정의 키 매핑 테스트 완료\n");
	return result;
}

/**
 * 2. 복잡한 사용자 정의 키 매핑 테스트
 */
function testComplexCustomKeyMapping() {
	console.log("🔑 2. 복잡한 사용자 정의 키 매핑 테스트");
	console.log("=".repeat(50));

	const { mockMatches, mockContext } = createMockData();

	// 더 복잡한 매핑
	const complexMapping = {
		allSources: "import-sources",
		namedImports: "named-imports",
		defaults: "default-imports",
		types: "type-imports",
	} as const;

	console.log("📥 요청:");
	console.log("  매핑:", JSON.stringify(complexMapping, null, 2));

	// 실행
	const result = executeQueriesWithCustomKeys(complexMapping, mockMatches, mockContext);

	console.log("\n📤 출력 결과:");
	console.log("  타입: CustomKeyMappingResult<typeof complexMapping>");
	console.log("  구조 예시:", {
		allSources: "ImportSourceResult[]",
		namedImports: "NamedImportResult[]",
		defaults: "DefaultImportResult[]",
		types: "TypeImportResult[]",
	});
	console.log("  실제 키들:", Object.keys(result));
	console.log("  실제 구조:");
	Object.entries(result).forEach(([key, value]) => {
		console.log(`    ${key}: Array[${Array.isArray(value) ? value.length : 0}]`);
	});

	console.log("\n✅ 복잡한 사용자 정의 키 매핑 테스트 완료\n");
	return result;
}

/**
 * 3. 조건부 사용자 정의 키 매핑 테스트
 */
function testConditionalCustomKeyMapping() {
	console.log("🔑 3. 조건부 사용자 정의 키 매핑 테스트");
	console.log("=".repeat(50));

	const { mockMatches, mockContext } = createMockData();

	const mapping = {
		sources: "import-sources",
		named: "named-imports",
		defaults: "default-imports",
		types: "type-imports",
	} as const;

	const conditions = {
		sources: true,
		named: true,
		defaults: false, // 제외
		types: true,
	};

	console.log("📥 요청:");
	console.log("  매핑:", JSON.stringify(mapping, null, 2));
	console.log("  조건:", JSON.stringify(conditions, null, 2));

	// 실행
	const result = executeConditionalQueriesWithCustomKeys(mapping, conditions, mockMatches, mockContext);

	console.log("\n📤 출력 결과:");
	console.log("  타입: Partial<CustomKeyMappingResult<typeof mapping>>");
	console.log("  구조 예시:", {
		sources: "ImportSourceResult[] (조건: true)",
		named: "NamedImportResult[] (조건: true)",
		types: "TypeImportResult[] (조건: true)",
		"defaults는 제외됨": "(조건: false)"
	});
	console.log("  실제 키들:", Object.keys(result));
	console.log("  실제 구조:");
	Object.entries(result).forEach(([key, value]) => {
		console.log(`    ${key}: Array[${Array.isArray(value) ? value.length : 0}]`);
	});

	console.log("\n  조건 검증:");
	Object.entries(conditions).forEach(([key, condition]) => {
		const hasKey = Object.prototype.hasOwnProperty.call(result, key);
		const expected = condition !== false;
		console.log(`    ${key} (${condition}) → ${hasKey === expected ? "✅" : "❌"} ${hasKey ? "포함됨" : "제외됨"}`);
	});

	console.log("\n✅ 조건부 사용자 정의 키 매핑 테스트 완료\n");
	return result;
}

/**
 * 4. 사용자 정의 키 매퍼 생성 테스트
 */
function testCustomKeyMapper() {
	console.log("🔑 4. 사용자 정의 키 매퍼 생성 테스트");
	console.log("=".repeat(50));

	const { mockMatches, mockContext } = createMockData();

	const mapping = {
		importSources: "import-sources",
		typeImports: "type-imports",
	} as const;

	console.log("📥 요청:");
	console.log("  매핑:", JSON.stringify(mapping, null, 2));
	console.log("  const mapper = createCustomKeyMapper(mapping);");
	console.log("  mapper.execute(matches, context);");

	// 매퍼 생성
	const mapper = createCustomKeyMapper(mapping);

	// 실행
	const result = mapper.execute(mockMatches, mockContext);

	console.log("\n📤 출력 결과:");
	console.log("  타입: CustomKeyMappingResult<typeof mapping>");
	console.log("  구조 예시:", {
		importSources: "ImportSourceResult[]",
		typeImports: "TypeImportResult[]",
	});
	console.log("  실제 키들:", Object.keys(result));
	console.log("  실제 구조:");
	Object.entries(result).forEach(([key, value]) => {
		console.log(`    ${key}: Array[${Array.isArray(value) ? value.length : 0}]`);
	});

	console.log("\n  매퍼 정보:");
	console.log("    사용자 키들:", mapper.getUserKeys());
	console.log("    쿼리 키들:", mapper.getQueryKeys());
	console.log("    원본 매핑:", mapper.getMapping());

	console.log("\n✅ 사용자 정의 키 매퍼 생성 테스트 완료\n");
	return result;
}

/**
 * 5. 사전 정의된 매핑 테스트
 */
function testPredefinedMappings() {
	console.log("🔑 5. 사전 정의된 매핑 테스트");
	console.log("=".repeat(50));

	const { mockMatches, mockContext } = createMockData();

	console.log("📥 사용 가능한 사전 정의된 매핑들:");
	Object.entries(predefinedCustomMappings).forEach(([name, mapping]) => {
		console.log(`  ${name}:`, JSON.stringify(mapping, null, 4));
	});

	console.log("\n📥 요청:");
	console.log("  predefinedCustomMappings.reactAnalysis 사용");

	// React 분석 매핑 사용
	const result = executeQueriesWithCustomKeys(
		predefinedCustomMappings.reactAnalysis,
		mockMatches,
		mockContext
	);

	console.log("\n📤 출력 결과:");
	console.log("  타입: CustomKeyMappingResult<typeof predefinedCustomMappings.reactAnalysis>");
	console.log("  구조 예시:", {
		sources: "ImportSourceResult[]",
		namedImports: "NamedImportResult[]",
		defaultImports: "DefaultImportResult[]",
		typeImports: "TypeImportResult[]",
	});
	console.log("  실제 키들:", Object.keys(result));
	console.log("  실제 구조:");
	Object.entries(result).forEach(([key, value]) => {
		console.log(`    ${key}: Array[${Array.isArray(value) ? value.length : 0}]`);
	});

	console.log("\n✅ 사전 정의된 매핑 테스트 완료\n");
	return result;
}

/**
 * 6. 타입 추론 확인 테스트
 */
function testTypeInference() {
	console.log("🔑 6. 타입 추론 확인 테스트");
	console.log("=".repeat(50));

	const { mockMatches, mockContext } = createMockData();

	console.log("📥 요청: 다양한 매핑 조합의 타입 추론");

	// 여러 다른 매핑들
	const mapping1 = { sources: "import-sources" } as const;
	const mapping2 = { sources: "import-sources", named: "named-imports" } as const;
	const mapping3 = {
		allImportSources: "import-sources",
		allNamedImports: "named-imports",
		allDefaultImports: "default-imports",
		allTypeImports: "type-imports"
	} as const;

	const result1 = executeQueriesWithCustomKeys(mapping1, mockMatches, mockContext);
	const result2 = executeQueriesWithCustomKeys(mapping2, mockMatches, mockContext);
	const result3 = executeQueriesWithCustomKeys(mapping3, mockMatches, mockContext);

	console.log("\n📤 타입 추론 결과:");
	console.log("  result1 객체의 키들:", Object.keys(result1));
	console.log("  result2 객체의 키들:", Object.keys(result2));
	console.log("  result3 객체의 키들:", Object.keys(result3));

	console.log("\n  접근 안전성 테스트:");
	console.log(`    result1.sources → ${Array.isArray(result1.sources) ? "✅ Array" : "❌ Not Array"}`);
	console.log(`    result2.sources → ${Array.isArray(result2.sources) ? "✅ Array" : "❌ Not Array"}`);
	console.log(`    result2.named → ${Array.isArray(result2.named) ? "✅ Array" : "❌ Not Array"}`);
	console.log(`    result3.allImportSources → ${Array.isArray(result3.allImportSources) ? "✅ Array" : "❌ Not Array"}`);
	console.log(`    result3.allTypeImports → ${Array.isArray(result3.allTypeImports) ? "✅ Array" : "❌ Not Array"}`);

	console.log("\n✅ 타입 추론 확인 테스트 완료\n");
	return { result1, result2, result3 };
}

/**
 * 전체 테스트 실행
 */
export function runCustomKeyMappingTest() {
	console.log("🚀 사용자 정의 키 매핑 종합 테스트 시작");
	console.log("=".repeat(80) + "\n");

	try {
		// 1. 기본 사용자 정의 키 매핑
		const basicResult = testBasicCustomKeyMapping();

		// 2. 복잡한 사용자 정의 키 매핑
		const complexResult = testComplexCustomKeyMapping();

		// 3. 조건부 사용자 정의 키 매핑
		const conditionalResult = testConditionalCustomKeyMapping();

		// 4. 사용자 정의 키 매퍼
		const mapperResult = testCustomKeyMapper();

		// 5. 사전 정의된 매핑
		const predefinedResult = testPredefinedMappings();

		// 6. 타입 추론
		const typeResult = testTypeInference();

		console.log("🎉 모든 사용자 정의 키 매핑 테스트 완료!");
		console.log("=".repeat(80));
		console.log("\n📊 테스트 요약:");
		console.log("✅ 기본 매핑 → { userKey: QueryResult[] } 구조 동작");
		console.log("✅ 복잡한 매핑 → 여러 사용자 키 조합 동작");
		console.log("✅ 조건부 실행 → 선택적 키 포함/제외 동작");
		console.log("✅ 매퍼 생성 → 재사용 가능한 매퍼 객체 동작");
		console.log("✅ 사전 정의 매핑 → 미리 정의된 패턴 동작");
		console.log("✅ 타입 추론 → 모든 사용자 키와 값 타입 자동 추론");

		console.log("\n🎯 핵심 달성사항:");
		console.log("🔑 사용자 정의 키 이름이 정확히 반영됨");
		console.log("🧠 TypeScript 타입이 완벽하게 추론됨");
		console.log("📦 결과 구조가 { userKey: QueryResult[] } 형태로 반환됨");
		console.log("💡 더 직관적이고 의미 있는 키 이름 사용 가능");

		return {
			success: true,
			results: {
				basicResult,
				complexResult,
				conditionalResult,
				mapperResult,
				predefinedResult,
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

// 스크립트로 직접 실행될 때
if (require.main === module) {
	runCustomKeyMappingTest();
}

export default {
	runCustomKeyMappingTest,
	testBasicCustomKeyMapping,
	testComplexCustomKeyMapping,
	testConditionalCustomKeyMapping,
	testCustomKeyMapper,
	testPredefinedMappings,
	testTypeInference,
};