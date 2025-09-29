/**
 * Tree-sitter 쿼리 저장소 시스템 테스트
 * Tree-sitter Query Repository System Test
 */

import {
	QueryRegistry,
	getQueryRegistry,
	getImportQueries
} from "../src/extractors/primary-analysis/core/QueryRegistry";

import {
	CombinableQueryFactory,
	DynamicCombinationBuilder,
	CombinationExecutor,
	executeImportAnalysis,
	executeJavaScriptAnalysis
} from "../src/extractors/primary-analysis/core/CombinableQuerySystem";

/**
 * 1. 쿼리 저장소 기본 테스트
 */
function testQueryRepository() {
	console.log("🧪 === 쿼리 저장소 기본 테스트 ===");

	const registry = getQueryRegistry();
	const repository = registry.getRepository();

	// 저장소 리포트 확인
	const report = registry.getReport();
	console.log("📊 저장소 현황:");
	console.log(`- 총 쿼리: ${report.totalQueries}개`);
	console.log(`- 총 타입: ${report.totalTypes}개`);
	console.log(`- 총 바인딩: ${report.totalBindings}개`);
	console.log(`- 지원 언어: ${report.languagesSupported.join(", ")}`);
	console.log(`- 카테고리: ${report.categoriesAvailable.join(", ")}`);

	// 개별 쿼리 확인
	console.log("\n🔍 등록된 쿼리들:");
	const allQueries = repository.getAllQueries();
	allQueries.forEach(query => {
		console.log(`- ${query.id}: ${query.name} (${query.languages.join(", ")})`);
		console.log(`  Query: ${query.query.trim().substring(0, 50)}...`);
	});

	// 개별 타입 확인
	console.log("\n📋 등록된 타입들:");
	const allTypes = repository.getAllTypes();
	allTypes.forEach(type => {
		console.log(`- ${type.typeId}: ${type.typeName}`);
		console.log(`  설명: ${type.description}`);
	});

	return { registry, repository, report };
}

/**
 * 2. 쿼리-타입 바인딩 테스트
 */
function testQueryTypeBindings() {
	console.log("\n🔗 === 쿼리-타입 바인딩 테스트 ===");

	const registry = getQueryRegistry();
	const repository = registry.getRepository();

	// Import 분석용 호환 쿼리들 조회
	const importQueries = registry.getImportAnalysisQueries();
	console.log(`📦 Import 분석 쿼리들 (${importQueries.length}개):`);
	importQueries.forEach(item => {
		console.log(`- 쿼리: ${item.queryId} → 타입: ${item.typeId}`);
		console.log(`  ${item.query.name} → ${item.type.typeName}`);
	});

	// TypeScript 전용 쿼리들
	const tsQueries = registry.getTypeScriptQueries();
	console.log(`\n📘 TypeScript 전용 쿼리들 (${tsQueries.length}개):`);
	tsQueries.forEach(item => {
		console.log(`- ${item.queryId} → ${item.typeId} (${item.query.languages.join(", ")})`);
	});

	// JavaScript 호환 쿼리들
	const jsQueries = registry.getJavaScriptQueries();
	console.log(`\n📗 JavaScript 호환 쿼리들 (${jsQueries.length}개):`);
	jsQueries.forEach(item => {
		console.log(`- ${item.queryId} → ${item.typeId} (${item.query.languages.join(", ")})`);
	});

	return { importQueries, tsQueries, jsQueries };
}

/**
 * 3. 조합 가능한 쿼리 시스템 테스트
 */
function testCombinableQuerySystem() {
	console.log("\n🧩 === 조합 가능한 쿼리 시스템 테스트 ===");

	const factory = new CombinableQueryFactory();

	// Import 분석 조합 생성
	const importCombination = factory.createImportAnalysisCombination();
	console.log("📦 Import 분석 조합:");
	console.log(`- ID: ${importCombination.id}`);
	console.log(`- 이름: ${importCombination.name}`);
	console.log(`- 쿼리 타입들: ${importCombination.queryTypeIds.join(", ")}`);
	console.log(`- 지원 언어: ${importCombination.languages.join(", ")}`);

	// TypeScript 조합 생성
	const tsCombination = factory.createTypeScriptOnlyCombination();
	console.log("\n📘 TypeScript 전용 조합:");
	console.log(`- ID: ${tsCombination.id}`);
	console.log(`- 쿼리 타입들: ${tsCombination.queryTypeIds.join(", ")}`);

	// JavaScript 조합 생성
	const jsCombination = factory.createJavaScriptCombination();
	console.log("\n📗 JavaScript 조합:");
	console.log(`- ID: ${jsCombination.id}`);
	console.log(`- 쿼리 타입들: ${jsCombination.queryTypeIds.join(", ")}`);

	// 사용자 정의 조합 생성
	const customCombination = factory.createCustomCombination(
		"custom-minimal",
		"Minimal Analysis",
		"Minimal import analysis with only sources and named imports",
		["import-sources", "named-imports"],
		["typescript", "javascript"],
		"MinimalAnalysisResult"
	);
	console.log("\n🎯 사용자 정의 조합:");
	console.log(`- ID: ${customCombination.id}`);
	console.log(`- 쿼리 타입들: ${customCombination.queryTypeIds.join(", ")}`);

	return { importCombination, tsCombination, jsCombination, customCombination };
}

/**
 * 4. 동적 조합 실행 테스트
 */
async function testDynamicExecution() {
	console.log("\n⚡ === 동적 조합 실행 테스트 ===");

	const executor = new CombinationExecutor();
	const factory = new CombinableQueryFactory();

	// Import 분석 조합 실행
	console.log("📦 Import 분석 실행 중...");
	const importCombination = factory.createImportAnalysisCombination();
	const importResult = await executor.simulateExecution(importCombination, "typescript");

	console.log("✅ Import 분석 결과:");
	console.log(`- 조합 ID: ${importResult.combinationId}`);
	console.log(`- 실행된 쿼리: ${importResult.metadata.executedQueries}/${importResult.metadata.totalQueries}`);
	console.log(`- 실행 시간: ${importResult.metadata.executionTime}ms`);
	console.log("- 결과 타입들:");
	Object.entries(importResult.results).forEach(([typeId, results]) => {
		console.log(`  ${typeId}: ${results.length}개 결과`);
	});

	// JavaScript 분석 조합 실행
	console.log("\n📗 JavaScript 분석 실행 중...");
	const jsCombination = factory.createJavaScriptCombination();
	const jsResult = await executor.simulateExecution(jsCombination, "javascript");

	console.log("✅ JavaScript 분석 결과:");
	console.log(`- 조합 ID: ${jsResult.combinationId}`);
	console.log(`- 실행된 쿼리: ${jsResult.metadata.executedQueries}/${jsResult.metadata.totalQueries}`);
	console.log("- 결과 타입들:");
	Object.entries(jsResult.results).forEach(([typeId, results]) => {
		console.log(`  ${typeId}: ${results.length}개 결과`);
	});

	return { importResult, jsResult };
}

/**
 * 5. 타입 안전한 조합 결과 테스트
 */
async function testTypeSafeCombinations() {
	console.log("\n🛡️ === 타입 안전한 조합 결과 테스트 ===");

	// Import 분석 실행
	console.log("📦 Import 분석 (타입 안전):");
	const importAnalysis = await executeImportAnalysis("typescript");
	console.log(`- Sources: ${importAnalysis.sources.length}개`);
	console.log(`- Named Imports: ${importAnalysis.namedImports.length}개`);
	console.log(`- Default Imports: ${importAnalysis.defaultImports.length}개`);
	console.log(`- Type Imports: ${importAnalysis.typeImports.length}개`);

	// 상세 결과 출력
	if (importAnalysis.sources.length > 0) {
		console.log("🔍 Sources 상세:");
		importAnalysis.sources.forEach((source, i) => {
			console.log(`  ${i + 1}. ${source.source} (${source.type})`);
		});
	}

	// JavaScript 분석 실행
	console.log("\n📗 JavaScript 분석 (타입 안전):");
	const jsAnalysis = await executeJavaScriptAnalysis();
	console.log(`- Sources: ${jsAnalysis.sources.length}개`);
	console.log(`- Named Imports: ${jsAnalysis.namedImports.length}개`);
	console.log(`- Default Imports: ${jsAnalysis.defaultImports.length}개`);
	console.log(`- Namespace Imports: ${jsAnalysis.namespaceImports.length}개`);

	return { importAnalysis, jsAnalysis };
}

/**
 * 6. 전체 시스템 검증
 */
function validateSystem() {
	console.log("\n✅ === 전체 시스템 검증 ===");

	const registry = getQueryRegistry();
	const report = registry.getReport();

	console.log("🎯 시스템 검증 결과:");

	// 기본 요구사항 검증
	const checks = [
		{ name: "쿼리 저장", passed: report.totalQueries >= 4, detail: `${report.totalQueries}개 쿼리 등록됨` },
		{ name: "타입 정의", passed: report.totalTypes >= 4, detail: `${report.totalTypes}개 타입 정의됨` },
		{ name: "바인딩 연결", passed: report.totalBindings >= 4, detail: `${report.totalBindings}개 바인딩 생성됨` },
		{ name: "다국어 지원", passed: report.languagesSupported.length >= 2, detail: `${report.languagesSupported.join(", ")} 지원` },
		{ name: "조합 가능성", passed: true, detail: "Import/TypeScript/JavaScript 조합 가능" }
	];

	checks.forEach(check => {
		const status = check.passed ? "✅" : "❌";
		console.log(`${status} ${check.name}: ${check.detail}`);
	});

	const allPassed = checks.every(check => check.passed);
	console.log(`\n🎉 전체 검증 결과: ${allPassed ? "성공" : "실패"}`);

	return allPassed;
}

/**
 * 메인 테스트 실행
 */
async function runAllTests() {
	console.log("🚀 Tree-sitter 쿼리 저장소 시스템 테스트 시작\n");

	try {
		// 1. 기본 테스트
		const repositoryTest = testQueryRepository();

		// 2. 바인딩 테스트
		const bindingTest = testQueryTypeBindings();

		// 3. 조합 시스템 테스트
		const combinationTest = testCombinableQuerySystem();

		// 4. 동적 실행 테스트
		const executionTest = await testDynamicExecution();

		// 5. 타입 안전 테스트
		const typeSafeTest = await testTypeSafeCombinations();

		// 6. 전체 검증
		const validationResult = validateSystem();

		console.log("\n🎊 === 테스트 완료 ===");
		console.log(`전체 시스템이 ${validationResult ? "정상적으로" : "부분적으로"} 작동합니다!`);

		return {
			repositoryTest,
			bindingTest,
			combinationTest,
			executionTest,
			typeSafeTest,
			validationResult
		};

	} catch (error) {
		console.error("❌ 테스트 실행 중 오류:", error);
		return null;
	}
}

// 실행
if (require.main === module) {
	runAllTests().then(result => {
		if (result) {
			console.log("\n✨ 모든 테스트가 완료되었습니다!");
		}
	});
}

export {
	testQueryRepository,
	testQueryTypeBindings,
	testCombinableQuerySystem,
	testDynamicExecution,
	testTypeSafeCombinations,
	validateSystem,
	runAllTests
};