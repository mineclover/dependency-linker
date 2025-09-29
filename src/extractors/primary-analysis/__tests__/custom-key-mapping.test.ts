/**
 * 사용자 정의 키 매핑 시스템 테스트
 */

import {
	executeQueriesWithCustomKeys,
	executeConditionalQueriesWithCustomKeys,
	createCustomKeyMapper,
	predefinedCustomMappings,
	type CustomKeyMappingResult,
} from "../queries/ImportQueries";
import type { QueryExecutionContext, QueryMatch } from "../core/QueryEngine";

// 모킹된 테스트 데이터
const createMockData = (): { mockMatches: QueryMatch<any>[]; mockContext: QueryExecutionContext } => {
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

describe("사용자 정의 키 매핑 시스템", () => {
	describe("executeQueriesWithCustomKeys", () => {
		it("기본 사용자 정의 키 매핑이 올바르게 동작해야 함", () => {
			const { mockMatches, mockContext } = createMockData();

			const customMapping = {
				sources: "import-sources",
				defaultImports: "default-imports",
			} as const;

			const result = executeQueriesWithCustomKeys(customMapping, mockMatches, mockContext);

			// 결과 구조 검증
			expect(result).toHaveProperty("sources");
			expect(result).toHaveProperty("defaultImports");
			expect(Array.isArray(result.sources)).toBe(true);
			expect(Array.isArray(result.defaultImports)).toBe(true);

			// 키 이름 검증
			const resultKeys = Object.keys(result);
			expect(resultKeys).toEqual(["sources", "defaultImports"]);
		});

		it("복잡한 매핑이 올바르게 동작해야 함", () => {
			const { mockMatches, mockContext } = createMockData();

			const complexMapping = {
				allSources: "import-sources",
				namedImports: "named-imports",
				defaults: "default-imports",
				types: "type-imports",
			} as const;

			const result = executeQueriesWithCustomKeys(complexMapping, mockMatches, mockContext);

			// 모든 키 존재 확인
			expect(result).toHaveProperty("allSources");
			expect(result).toHaveProperty("namedImports");
			expect(result).toHaveProperty("defaults");
			expect(result).toHaveProperty("types");

			// 모든 값이 배열인지 확인
			Object.values(result).forEach(value => {
				expect(Array.isArray(value)).toBe(true);
			});
		});
	});

	describe("executeConditionalQueriesWithCustomKeys", () => {
		it("조건부 실행이 올바르게 동작해야 함", () => {
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

			const result = executeConditionalQueriesWithCustomKeys(mapping, conditions, mockMatches, mockContext);

			// 포함되어야 할 키들
			expect(result).toHaveProperty("sources");
			expect(result).toHaveProperty("named");
			expect(result).toHaveProperty("types");

			// 제외되어야 할 키
			expect(result).not.toHaveProperty("defaults");

			// 포함된 모든 값이 배열인지 확인
			Object.values(result).forEach(value => {
				expect(Array.isArray(value)).toBe(true);
			});
		});
	});

	describe("createCustomKeyMapper", () => {
		it("매퍼가 올바르게 생성되고 실행되어야 함", () => {
			const { mockMatches, mockContext } = createMockData();

			const mapping = {
				importSources: "import-sources",
				typeImports: "type-imports",
			} as const;

			const mapper = createCustomKeyMapper(mapping);

			// 매퍼 메서드 확인
			expect(typeof mapper.execute).toBe("function");
			expect(typeof mapper.executeConditional).toBe("function");
			expect(typeof mapper.getMapping).toBe("function");
			expect(typeof mapper.getUserKeys).toBe("function");
			expect(typeof mapper.getQueryKeys).toBe("function");

			// 매퍼 정보 확인
			expect(mapper.getMapping()).toEqual(mapping);
			expect(mapper.getUserKeys()).toEqual(["importSources", "typeImports"]);
			expect(mapper.getQueryKeys()).toEqual(["import-sources", "type-imports"]);

			// 실행 결과 확인
			const result = mapper.execute(mockMatches, mockContext);
			expect(result).toHaveProperty("importSources");
			expect(result).toHaveProperty("typeImports");
			expect(Array.isArray(result.importSources)).toBe(true);
			expect(Array.isArray(result.typeImports)).toBe(true);
		});
	});

	describe("predefinedCustomMappings", () => {
		it("사전 정의된 매핑들이 올바르게 정의되어야 함", () => {
			// React 분석 매핑 확인
			expect(predefinedCustomMappings.reactAnalysis).toBeDefined();
			expect(predefinedCustomMappings.reactAnalysis).toHaveProperty("sources");
			expect(predefinedCustomMappings.reactAnalysis).toHaveProperty("namedImports");
			expect(predefinedCustomMappings.reactAnalysis).toHaveProperty("defaultImports");
			expect(predefinedCustomMappings.reactAnalysis).toHaveProperty("typeImports");

			// JavaScript 모듈 분석 매핑 확인
			expect(predefinedCustomMappings.jsModuleAnalysis).toBeDefined();
			expect(predefinedCustomMappings.jsModuleAnalysis).toHaveProperty("sources");
			expect(predefinedCustomMappings.jsModuleAnalysis).toHaveProperty("namedImports");
			expect(predefinedCustomMappings.jsModuleAnalysis).toHaveProperty("defaultImports");
			expect(predefinedCustomMappings.jsModuleAnalysis).not.toHaveProperty("typeImports");

			// 타입 분석 매핑 확인
			expect(predefinedCustomMappings.typeAnalysis).toBeDefined();
			expect(predefinedCustomMappings.typeAnalysis).toHaveProperty("types");
			expect(predefinedCustomMappings.typeAnalysis).toHaveProperty("sources");
		});

		it("사전 정의된 매핑을 사용하여 쿼리를 실행할 수 있어야 함", () => {
			const { mockMatches, mockContext } = createMockData();

			const result = executeQueriesWithCustomKeys(
				predefinedCustomMappings.reactAnalysis,
				mockMatches,
				mockContext
			);

			// React 분석 결과 구조 확인
			expect(result).toHaveProperty("sources");
			expect(result).toHaveProperty("namedImports");
			expect(result).toHaveProperty("defaultImports");
			expect(result).toHaveProperty("typeImports");

			// 모든 값이 배열인지 확인
			Object.values(result).forEach(value => {
				expect(Array.isArray(value)).toBe(true);
			});
		});
	});

	describe("타입 추론 확인", () => {
		it("다양한 매핑 조합의 타입 추론이 올바르게 동작해야 함", () => {
			const { mockMatches, mockContext } = createMockData();

			// 단일 키 매핑
			const mapping1 = { sources: "import-sources" } as const;
			const result1 = executeQueriesWithCustomKeys(mapping1, mockMatches, mockContext);
			expect(Object.keys(result1)).toEqual(["sources"]);
			expect(Array.isArray(result1.sources)).toBe(true);

			// 다중 키 매핑
			const mapping2 = { sources: "import-sources", named: "named-imports" } as const;
			const result2 = executeQueriesWithCustomKeys(mapping2, mockMatches, mockContext);
			expect(Object.keys(result2)).toEqual(["sources", "named"]);
			expect(Array.isArray(result2.sources)).toBe(true);
			expect(Array.isArray(result2.named)).toBe(true);

			// 복잡한 매핑
			const mapping3 = {
				allImportSources: "import-sources",
				allNamedImports: "named-imports",
				allDefaultImports: "default-imports",
				allTypeImports: "type-imports"
			} as const;
			const result3 = executeQueriesWithCustomKeys(mapping3, mockMatches, mockContext);
			expect(Object.keys(result3)).toEqual([
				"allImportSources",
				"allNamedImports",
				"allDefaultImports",
				"allTypeImports"
			]);

			// 모든 결과가 배열인지 확인
			Object.values(result3).forEach(value => {
				expect(Array.isArray(value)).toBe(true);
			});
		});
	});
});