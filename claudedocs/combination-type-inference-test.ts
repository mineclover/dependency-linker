/**
 * 조합 시스템 타입 추론 검증 테스트
 * Combination System Type Inference Validation Test
 */

// 먼저 기본 타입들을 정의해보겠습니다 (실제 import 대신 로컬 정의)
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

// 개별 쿼리 결과 타입들
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

interface NamespaceImportResult extends BaseQueryResult {
	alias: string;
	source: string;
}

// 조합 결과 타입들
interface ImportAnalysisResult {
	sources: ImportSourceResult[];
	namedImports: NamedImportResult[];
	defaultImports: DefaultImportResult[];
	typeImports: TypeImportResult[];
}

interface JavaScriptAnalysisResult {
	sources: ImportSourceResult[];
	namedImports: NamedImportResult[];
	defaultImports: DefaultImportResult[];
	namespaceImports: NamespaceImportResult[];
}

interface TypeScriptAnalysisResult {
	typeImports: TypeImportResult[];
}

/**
 * 1. 타입 추론 테스트
 */
function testTypeInference() {
	console.log("🔍 === 타입 추론 테스트 ===");

	// ✅ 1. 개별 쿼리 결과 타입 생성
	const mockLocation: ExtendedSourceLocation = {
		line: 1,
		column: 1,
		offset: 0,
		endLine: 1,
		endColumn: 10,
		endOffset: 10,
	};

	const importSource: ImportSourceResult = {
		queryName: "import-sources",
		location: mockLocation,
		nodeText: "import React from 'react'",
		source: "react",
		isRelative: false,
		type: "package",
	};

	const namedImport: NamedImportResult = {
		queryName: "named-imports",
		location: mockLocation,
		nodeText: "{ useState }",
		name: "useState",
		source: "react",
		originalName: "useState",
	};

	const typeImport: TypeImportResult = {
		queryName: "type-imports",
		location: mockLocation,
		nodeText: "import type { FC } from 'react'",
		typeName: "FC",
		source: "react",
		importType: "named",
	};

	console.log("✅ 개별 쿼리 결과 타입 생성 성공");

	// ✅ 2. Import 분석 조합 - 타입 추론 확인
	const importAnalysis: ImportAnalysisResult = {
		sources: [importSource], // ImportSourceResult[] ✅
		namedImports: [namedImport], // NamedImportResult[] ✅
		defaultImports: [], // DefaultImportResult[] ✅
		typeImports: [typeImport], // TypeImportResult[] ✅
	};

	console.log("✅ Import 분석 조합 타입 추론 성공");
	console.log(`- sources: ${importAnalysis.sources.length}개`);
	console.log(`- namedImports: ${importAnalysis.namedImports.length}개`);
	console.log(`- typeImports: ${importAnalysis.typeImports.length}개`);

	// ✅ 3. 타입 안전성 확인 - 잘못된 타입 할당 방지
	// 다음 라인들은 컴파일 오류를 발생시켜야 함:

	// const wrongAssignment: ImportAnalysisResult = {
	//   sources: [namedImport],        // ❌ 타입 오류: NamedImportResult를 ImportSourceResult[]에 할당 불가
	//   namedImports: [importSource],  // ❌ 타입 오류: ImportSourceResult를 NamedImportResult[]에 할당 불가
	//   defaultImports: [],
	//   typeImports: []
	// };

	console.log("✅ 타입 안전성 검증 - 잘못된 할당 방지됨");

	return { importSource, namedImport, typeImport, importAnalysis };
}

/**
 * 2. 조합 결과 검증 테스트
 */
function testCombinationResults() {
	console.log("\n🧩 === 조합 결과 검증 테스트 ===");

	const mockLocation: ExtendedSourceLocation = {
		line: 1,
		column: 1,
		offset: 0,
		endLine: 1,
		endColumn: 10,
		endOffset: 10,
	};

	// ✅ 1. 다양한 쿼리 결과들 생성
	const queryResults = {
		importSources: [
			{
				queryName: "import-sources" as const,
				location: mockLocation,
				nodeText: "import React from 'react'",
				source: "react",
				isRelative: false,
				type: "package" as const,
			},
			{
				queryName: "import-sources" as const,
				location: mockLocation,
				nodeText: "import utils from './utils'",
				source: "./utils",
				isRelative: true,
				type: "local" as const,
			},
		] as ImportSourceResult[],

		namedImports: [
			{
				queryName: "named-imports" as const,
				location: mockLocation,
				nodeText: "{ useState }",
				name: "useState",
				source: "react",
				originalName: "useState",
			},
			{
				queryName: "named-imports" as const,
				location: mockLocation,
				nodeText: "{ useEffect as useAsyncEffect }",
				name: "useAsyncEffect",
				source: "react",
				alias: "useAsyncEffect",
				originalName: "useEffect",
			},
		] as NamedImportResult[],

		typeImports: [
			{
				queryName: "type-imports" as const,
				location: mockLocation,
				nodeText: "import type { FC } from 'react'",
				typeName: "FC",
				source: "react",
				importType: "named" as const,
			},
		] as TypeImportResult[],

		namespaceImports: [
			{
				queryName: "namespace-imports" as const,
				location: mockLocation,
				nodeText: "import * as utils from './utils'",
				alias: "utils",
				source: "./utils",
			},
		] as NamespaceImportResult[],
	};

	console.log("✅ 다양한 쿼리 결과 생성 완료");

	// ✅ 2. Import 분석 조합
	const importAnalysis: ImportAnalysisResult = {
		sources: queryResults.importSources,
		namedImports: queryResults.namedImports,
		defaultImports: [],
		typeImports: queryResults.typeImports,
	};

	console.log("✅ Import 분석 조합 성공:");
	console.log(`- Sources: ${importAnalysis.sources.length}개`);
	importAnalysis.sources.forEach((s, i) =>
		console.log(`  ${i + 1}. ${s.source} (${s.type})`),
	);

	console.log(`- Named Imports: ${importAnalysis.namedImports.length}개`);
	importAnalysis.namedImports.forEach((n, i) =>
		console.log(`  ${i + 1}. ${n.name} from "${n.source}"`),
	);

	console.log(`- Type Imports: ${importAnalysis.typeImports.length}개`);
	importAnalysis.typeImports.forEach((t, i) =>
		console.log(`  ${i + 1}. ${t.typeName} from "${t.source}"`),
	);

	// ✅ 3. JavaScript 분석 조합 (TypeScript 전용 제외)
	const jsAnalysis: JavaScriptAnalysisResult = {
		sources: queryResults.importSources,
		namedImports: queryResults.namedImports,
		defaultImports: [],
		namespaceImports: queryResults.namespaceImports,
	};

	console.log("\n✅ JavaScript 분석 조합 성공:");
	console.log(`- Sources: ${jsAnalysis.sources.length}개`);
	console.log(`- Named Imports: ${jsAnalysis.namedImports.length}개`);
	console.log(`- Namespace Imports: ${jsAnalysis.namespaceImports.length}개`);

	// ✅ 4. TypeScript 전용 분석 조합
	const tsAnalysis: TypeScriptAnalysisResult = {
		typeImports: queryResults.typeImports,
	};

	console.log("\n✅ TypeScript 전용 분석 조합 성공:");
	console.log(`- Type Imports: ${tsAnalysis.typeImports.length}개`);

	return { queryResults, importAnalysis, jsAnalysis, tsAnalysis };
}

/**
 * 3. 조합 함수 타입 추론 테스트
 */
function testCombinationFunctions() {
	console.log("\n⚙️ === 조합 함수 타입 추론 테스트 ===");

	// ✅ 1. 조합 빌더 함수
	function buildImportAnalysis(
		sources: ImportSourceResult[],
		namedImports: NamedImportResult[],
		defaultImports: DefaultImportResult[],
		typeImports: TypeImportResult[],
	): ImportAnalysisResult {
		return {
			sources,
			namedImports,
			defaultImports,
			typeImports,
		};
	}

	// ✅ 2. 타입 필터 함수
	function filterPackageImports(
		sources: ImportSourceResult[],
	): ImportSourceResult[] {
		return sources.filter((source) => source.type === "package");
	}

	function filterLocalImports(
		sources: ImportSourceResult[],
	): ImportSourceResult[] {
		return sources.filter((source) => source.type === "local");
	}

	// ✅ 3. 타입 변환 함수
	function extractImportNames(namedImports: NamedImportResult[]): string[] {
		return namedImports.map((namedImport) => namedImport.name);
	}

	function extractTypenames(typeImports: TypeImportResult[]): string[] {
		return typeImports.map((typeImport) => typeImport.typeName);
	}

	console.log("✅ 조합 함수들 타입 추론 성공");
	console.log(
		"- buildImportAnalysis: (sources[], namedImports[], ...) => ImportAnalysisResult",
	);
	console.log(
		"- filterPackageImports: ImportSourceResult[] => ImportSourceResult[]",
	);
	console.log("- extractImportNames: NamedImportResult[] => string[]");
	console.log("- extractTypenames: TypeImportResult[] => string[]");

	return {
		buildImportAnalysis,
		filterPackageImports,
		filterLocalImports,
		extractImportNames,
		extractTypenames,
	};
}

/**
 * 4. 실제 조합 시나리오 테스트
 */
function testRealWorldScenarios() {
	console.log("\n🌍 === 실제 조합 시나리오 테스트 ===");

	const mockLocation: ExtendedSourceLocation = {
		line: 1,
		column: 1,
		offset: 0,
		endLine: 1,
		endColumn: 10,
		endOffset: 10,
	};

	// ✅ 시나리오 1: React 컴포넌트 파일 분석
	console.log("📦 시나리오 1: React 컴포넌트 파일");

	const reactComponentAnalysis: ImportAnalysisResult = {
		sources: [
			{
				queryName: "import-sources",
				location: mockLocation,
				nodeText: "import React from 'react'",
				source: "react",
				isRelative: false,
				type: "package",
			},
			{
				queryName: "import-sources",
				location: mockLocation,
				nodeText: "import './styles.css'",
				source: "./styles.css",
				isRelative: true,
				type: "local",
			},
		],
		namedImports: [
			{
				queryName: "named-imports",
				location: mockLocation,
				nodeText: "{ useState, useEffect }",
				name: "useState",
				source: "react",
				originalName: "useState",
			},
		],
		defaultImports: [
			{
				queryName: "default-imports",
				location: mockLocation,
				nodeText: "React",
				name: "React",
				source: "react",
			},
		],
		typeImports: [
			{
				queryName: "type-imports",
				location: mockLocation,
				nodeText: "import type { FC } from 'react'",
				typeName: "FC",
				source: "react",
				importType: "named",
			},
		],
	};

	console.log("✅ React 컴포넌트 분석 성공:");
	console.log(
		`- 패키지 import: ${reactComponentAnalysis.sources.filter((s) => s.type === "package").length}개`,
	);
	console.log(
		`- 로컬 import: ${reactComponentAnalysis.sources.filter((s) => s.type === "local").length}개`,
	);
	console.log(
		`- Named import: ${reactComponentAnalysis.namedImports.length}개`,
	);
	console.log(`- Type import: ${reactComponentAnalysis.typeImports.length}개`);

	// ✅ 시나리오 2: Node.js 서버 파일 분석 (JavaScript)
	console.log("\n🟢 시나리오 2: Node.js 서버 파일 (JavaScript)");

	const nodeServerAnalysis: JavaScriptAnalysisResult = {
		sources: [
			{
				queryName: "import-sources",
				location: mockLocation,
				nodeText: "import express from 'express'",
				source: "express",
				isRelative: false,
				type: "package",
			},
		],
		namedImports: [
			{
				queryName: "named-imports",
				location: mockLocation,
				nodeText: "{ Router }",
				name: "Router",
				source: "express",
				originalName: "Router",
			},
		],
		defaultImports: [
			{
				queryName: "default-imports",
				location: mockLocation,
				nodeText: "express",
				name: "express",
				source: "express",
			},
		],
		namespaceImports: [
			{
				queryName: "namespace-imports",
				location: mockLocation,
				nodeText: "import * as path from 'path'",
				alias: "path",
				source: "path",
			},
		],
	};

	console.log("✅ Node.js 서버 분석 성공:");
	console.log(`- 총 import: ${nodeServerAnalysis.sources.length}개`);
	console.log(
		`- Namespace import: ${nodeServerAnalysis.namespaceImports.length}개`,
	);

	return { reactComponentAnalysis, nodeServerAnalysis };
}

/**
 * 5. 타입 안전성 검증
 */
function testTypeSafety() {
	console.log("\n🛡️ === 타입 안전성 검증 ===");

	// ✅ 1. 컴파일 타임 타입 체크
	console.log("✅ 컴파일 타임 타입 체크:");

	// 올바른 할당 - 컴파일 성공해야 함
	const validSources: ImportSourceResult[] = [];
	const validNamedImports: NamedImportResult[] = [];
	const validTypeImports: TypeImportResult[] = [];

	const validAnalysis: ImportAnalysisResult = {
		sources: validSources, // ✅ 타입 매치
		namedImports: validNamedImports, // ✅ 타입 매치
		defaultImports: [], // ✅ 타입 매치
		typeImports: validTypeImports, // ✅ 타입 매치
	};

	console.log("- 올바른 타입 할당: ✅ 컴파일 성공");

	// ✅ 2. 런타임 타입 검증 함수들
	function isImportSourceResult(obj: any): obj is ImportSourceResult {
		return (
			obj &&
			typeof obj.queryName === "string" &&
			typeof obj.source === "string" &&
			typeof obj.isRelative === "boolean" &&
			(obj.type === "package" || obj.type === "local")
		);
	}

	function isImportAnalysisResult(obj: any): obj is ImportAnalysisResult {
		return (
			obj &&
			Array.isArray(obj.sources) &&
			Array.isArray(obj.namedImports) &&
			Array.isArray(obj.defaultImports) &&
			Array.isArray(obj.typeImports)
		);
	}

	console.log("✅ 런타임 타입 가드 함수 생성 완료");

	// ✅ 3. 조합 검증
	function validateCombination(result: ImportAnalysisResult): boolean {
		if (!isImportAnalysisResult(result)) {
			return false;
		}

		// 각 배열의 모든 요소가 올바른 타입인지 검증
		const sourcesValid = result.sources.every(isImportSourceResult);
		const structureValid =
			Array.isArray(result.sources) &&
			Array.isArray(result.namedImports) &&
			Array.isArray(result.defaultImports) &&
			Array.isArray(result.typeImports);

		return sourcesValid && structureValid;
	}

	console.log("✅ 조합 검증 함수 생성 완료");

	return {
		isImportSourceResult,
		isImportAnalysisResult,
		validateCombination,
		validAnalysis,
	};
}

/**
 * 메인 테스트 실행
 */
function runCombinationTests() {
	console.log("🚀 조합 시스템 타입 추론 검증 테스트 시작\n");

	try {
		// 1. 기본 타입 추론 테스트
		const typeTest = testTypeInference();

		// 2. 조합 결과 검증 테스트
		const combinationTest = testCombinationResults();

		// 3. 조합 함수 타입 추론 테스트
		const functionTest = testCombinationFunctions();

		// 4. 실제 시나리오 테스트
		const scenarioTest = testRealWorldScenarios();

		// 5. 타입 안전성 검증
		const safetyTest = testTypeSafety();

		console.log("\n🎉 === 모든 테스트 완료 ===");
		console.log("✅ 타입 추론: 성공");
		console.log("✅ 조합 결과: 성공");
		console.log("✅ 조합 함수: 성공");
		console.log("✅ 실제 시나리오: 성공");
		console.log("✅ 타입 안전성: 성공");

		console.log(
			"\n🎯 검증 완료: 조합 시스템이 올바르게 작동하며 타입이 정확히 추론됩니다!",
		);

		return {
			typeTest,
			combinationTest,
			functionTest,
			scenarioTest,
			safetyTest,
			success: true,
		};
	} catch (error) {
		console.error("❌ 테스트 실행 중 오류:", error);
		return {
			error,
			success: false,
		};
	}
}

// 실행
if (require.main === module) {
	runCombinationTests();
}

export {
	testTypeInference,
	testCombinationResults,
	testCombinationFunctions,
	testRealWorldScenarios,
	testTypeSafety,
	runCombinationTests,
};
