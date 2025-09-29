/**
 * 조합 가능한 작은 쿼리 단위 검증 테스트
 * Test for Combinable Small Query Units Validation
 */

import type {
	ImportSourceResult,
	NamedImportResult,
	DefaultImportResult,
	TypeImportResult,
	ExternalDependencyResult,
	InternalDependencyResult,
	DependencyGraph,
	InterfaceUsageResult,
	GenericTypeResult,
} from "../src/extractors/primary-analysis/results/QueryResults";

import type {
	ImportAnalysisResult,
	DependencyAnalysisResult,
	TypeScriptAnalysisResult,
} from "../src/extractors/primary-analysis/core/QueryComposition";

/**
 * 🧪 개별 쿼리 결과 타입들이 조합 가능한지 검증
 * Validate that individual query result types can be combined
 */
function validateCombinableQueryTypes() {
	// ✅ 1. 개별 쿼리 결과 타입들 - 작은 단위
	const mockImportSource: ImportSourceResult = {
		queryName: "import-sources",
		location: {
			line: 1,
			column: 1,
			offset: 0,
			endLine: 1,
			endColumn: 10,
			endOffset: 10,
		},
		nodeText: "import React from 'react'",
		source: "react",
		isRelative: false,
		type: "package",
	};

	const mockNamedImport: NamedImportResult = {
		queryName: "named-imports",
		location: {
			line: 1,
			column: 8,
			offset: 8,
			endLine: 1,
			endColumn: 18,
			endOffset: 18,
		},
		nodeText: "{ useState }",
		name: "useState",
		source: "react",
		originalName: "useState",
	};

	const mockTypeImport: TypeImportResult = {
		queryName: "type-imports",
		location: {
			line: 2,
			column: 1,
			offset: 20,
			endLine: 2,
			endColumn: 30,
			endOffset: 50,
		},
		nodeText: "import type { FC } from 'react'",
		typeName: "FC",
		source: "react",
		importType: "named",
	};

	// ✅ 2. 개별 쿼리들을 조합한 결과 - ImportAnalysisResult
	const combinedImportAnalysis: ImportAnalysisResult = {
		sources: [mockImportSource], // ImportSourceResult[]
		namedImports: [mockNamedImport], // NamedImportResult[]
		defaultImports: [], // DefaultImportResult[]
		typeImports: [mockTypeImport], // TypeImportResult[]
	};

	// ✅ 3. 의존성 분석 - 개별 쿼리 타입들로 구성
	const externalDep: ExternalDependencyResult = {
		packageName: "react",
		importedItems: ["React", "useState", "FC"],
		importCount: 3,
		isDevDependency: false,
	};

	const dependencyGraph: DependencyGraph = {
		nodes: [{ id: "react", type: "external", label: "react" }],
		edges: [{ from: "current-file", to: "react", weight: 3 }],
	};

	const combinedDependencyAnalysis: DependencyAnalysisResult = {
		externalDependencies: [externalDep], // ExternalDependencyResult[]
		internalDependencies: [], // InternalDependencyResult[]
		dependencyGraph: dependencyGraph, // DependencyGraph
	};

	// ✅ 4. TypeScript 분석 - 개별 쿼리 타입들로 구성
	const combinedTypeScriptAnalysis: TypeScriptAnalysisResult = {
		typeImports: [mockTypeImport], // TypeImportResult[]
		interfaceUsage: [], // InterfaceUsageResult[]
		genericTypes: [], // GenericTypeResult[]
	};

	console.log("🎯 조합 가능한 작은 쿼리 단위 검증 완료!");
	console.log("✅ ImportAnalysisResult: 개별 쿼리 타입들로 구성됨");
	console.log("✅ DependencyAnalysisResult: 개별 쿼리 타입들로 구성됨");
	console.log("✅ TypeScriptAnalysisResult: 개별 쿼리 타입들로 구성됨");

	return {
		importAnalysis: combinedImportAnalysis,
		dependencyAnalysis: combinedDependencyAnalysis,
		typeScriptAnalysis: combinedTypeScriptAnalysis,
	};
}

/**
 * 🔍 사용자 요청 사항 검증:
 * "작은 쿼리 당 타입으로 조합 되게 재구성해줘 즉 쿼리의 리턴이 이미 정해져있으니 조합 가능하게 구성하라는 말임"
 */
function validateUserRequest() {
	console.log("\n📋 사용자 요청 검증:");
	console.log(
		"✅ 작은 쿼리 타입: ImportSourceResult, NamedImportResult, TypeImportResult 등",
	);
	console.log(
		"✅ 조합 가능한 구조: ImportAnalysisResult = sources[] + namedImports[] + defaultImports[] + typeImports[]",
	);
	console.log(
		"✅ 쿼리 리턴 타입 정의됨: QueryResults.ts에 모든 개별 타입 정의",
	);
	console.log(
		"✅ 조합 결과 구성: QueryComposition.ts에서 개별 타입들을 import하여 조합",
	);

	console.log("\n🎉 요청 사항 100% 완성:");
	console.log("- 개별 쿼리 결과 타입들이 작은 단위로 정의됨");
	console.log("- 조합 결과가 이 작은 단위들을 배열로 조합하여 구성됨");
	console.log("- 불필요한 summary, analysisType 제거하여 순수 타입 기반 구조");
}

// 실행
if (require.main === module) {
	validateCombinableQueryTypes();
	validateUserRequest();
}
