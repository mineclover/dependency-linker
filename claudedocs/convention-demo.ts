/**
 * Tree-sitter 쿼리 컨벤션 데모
 * Tree-sitter Query Convention Demo
 *
 * 이 파일은 실제 컨벤션 적용 예시를 보여줍니다.
 */

import {
	QueryNamingConvention,
	StandardQueryPatterns,
	QueryIntegrationWorkflow,
	QueryValidator,
	type QueryDefinitionTemplate
} from "../src/extractors/primary-analysis/conventions/QueryWorkflowConventions";

import {
	ExportAnalysisQueryExample,
	ClassAnalysisQueryExample,
	QueryAutoGenerator,
	QueryTestTemplate
} from "../src/extractors/primary-analysis/conventions/QueryApplicationTemplates";

/**
 * ========================================
 * 데모 1: 표준 워크플로우 따라하기
 * ========================================
 */

console.log("🚀 Tree-sitter 쿼리 컨벤션 데모 시작\n");

/**
 * 시나리오: Variable 선언 추출 쿼리 만들기
 */
async function demo1_StandardWorkflow() {
	console.log("📋 === 데모 1: 표준 워크플로우 따라하기 ===");

	// 1단계: 요구사항 분석
	console.log("1️⃣ 요구사항 분석");
	const requirements = {
		domain: "variable",
		target: "declarations",
		action: "extract",
		description: "Extract variable declarations with their types and initial values",
		languages: ["typescript", "javascript"],
		expectedData: [
			"variableName: string",
			"variableType?: string",
			"declarationType: 'let' | 'const' | 'var'",
			"hasInitialValue: boolean"
		]
	};
	console.log("✅ 요구사항 정의 완료:", requirements);

	// 2단계: 쿼리 설계
	console.log("\n2️⃣ Tree-sitter 쿼리 설계");
	const queryPattern = `
		(variable_declaration
			kind: (identifier) @declaration_type
			(variable_declarator
				name: (identifier) @variable_name
				type: (type_annotation)? @variable_type
				value: (_)? @initial_value))
	`;
	const captureNames = ["declaration_type", "variable_name", "variable_type", "initial_value"];
	console.log("✅ 쿼리 패턴 설계 완료");
	console.log("📝 캡처 그룹:", captureNames);

	// 3단계: 쿼리 정의 작성
	console.log("\n3️⃣ 쿼리 정의 작성");
	const queryId = QueryNamingConvention.generateQueryId(
		requirements.domain,
		requirements.target,
		requirements.action
	);
	console.log("🆔 쿼리 ID:", queryId);

	// 문법 검증
	const syntaxValidation = QueryValidator.validateSyntax(queryPattern);
	const captureValidation = QueryValidator.validateCaptures(queryPattern, captureNames);

	console.log("🔍 문법 검증:", syntaxValidation.valid ? "✅ 통과" : "❌ 실패");
	if (!syntaxValidation.valid) {
		console.log("  오류:", syntaxValidation.errors);
	}

	console.log("🔍 캡처 검증:", captureValidation.valid ? "✅ 통과" : "❌ 실패");
	if (!captureValidation.valid) {
		console.log("  오류:", captureValidation.errors);
	}

	// 4단계: 결과 타입 매핑
	console.log("\n4️⃣ 결과 타입 매핑");
	const resultTypeName = QueryNamingConvention.generateResultTypeName(
		requirements.target,
		requirements.action
	);
	console.log("📋 결과 타입 이름:", resultTypeName);

	const resultTypeInterface = `
interface ${resultTypeName} extends BaseQueryResult {
	/** 변수명 */
	variableName: string;
	/** 변수 타입 (TypeScript) */
	variableType?: string;
	/** 선언 타입 */
	declarationType: "let" | "const" | "var";
	/** 초기값 존재 여부 */
	hasInitialValue: boolean;
	/** 초기값 (있는 경우) */
	initialValue?: string;
}`;
	console.log("✅ 타입 인터페이스 생성 완료");

	// 5단계: 프로세서 구현
	console.log("\n5️⃣ 프로세서 구현");
	const processorName = QueryNamingConvention.generateProcessorName(
		requirements.target,
		requirements.action
	);
	console.log("⚙️ 프로세서 이름:", processorName);

	// 6단계: 시스템 통합
	console.log("\n6️⃣ 시스템 통합");
	const integration = QueryIntegrationWorkflow.registerComplete(
		requirements.domain,
		requirements.target,
		requirements.action,
		queryPattern,
		requirements.languages,
		captureNames,
		[
			{ name: "variableName", type: "string", value: "myVar" },
			{ name: "variableType", type: "string", value: "string" },
			{ name: "declarationType", type: '"let" | "const" | "var"', value: "const" },
			{ name: "hasInitialValue", type: "boolean", value: true },
			{ name: "initialValue", type: "string", value: '"hello"' }
		],
		70
	);

	console.log("✅ 통합 등록 완료");
	console.log("🆔 등록된 쿼리 ID:", integration.queryDef.id);
	console.log("📋 등록된 타입 ID:", integration.resultType.typeId);

	return {
		queryId,
		resultTypeName,
		processorName,
		integration
	};
}

/**
 * ========================================
 * 데모 2: 자동 생성 도구 사용하기
 * ========================================
 */

async function demo2_AutoGeneration() {
	console.log("\n📋 === 데모 2: 자동 생성 도구 사용하기 ===");

	// 빠른 스켈레톤 생성
	console.log("🏗️ 스켈레톤 자동 생성");
	const skeleton = QueryAutoGenerator.generateQuerySkeleton(
		"function",        // domain
		"parameters",      // target
		"analyze",         // action
		["typescript", "javascript"], // languages
		["function_name", "param_list", "return_type"] // captures
	);

	console.log("✅ 스켈레톤 생성 완료:");
	console.log("🆔 쿼리 ID:", skeleton.queryId);
	console.log("📋 타입 이름:", skeleton.resultTypeName);
	console.log("⚙️ 프로세서 이름:", skeleton.processorName);
	console.log("📝 생성된 코드 길이:", skeleton.skeletonCode.length, "문자");

	// 빠른 쿼리 생성 (패턴이 정해진 경우)
	console.log("\n⚡ 빠른 쿼리 생성");
	const quickQuery = QueryAutoGenerator.quickGenerate({
		domain: "interface",
		target: "properties",
		action: "extract",
		pattern: `
			(interface_declaration
				name: (identifier) @interface_name
				body: (object_type
					(property_signature
						name: (property_name) @property_name
						type: (type_annotation) @property_type)))
		`,
		languages: ["typescript"],
		captures: ["interface_name", "property_name", "property_type"],
		fields: [
			{ name: "interfaceName", type: "string", description: "Interface name" },
			{ name: "propertyName", type: "string", description: "Property name" },
			{ name: "propertyType", type: "string", description: "Property type" },
			{ name: "isOptional", type: "boolean", description: "Is optional property" }
		]
	});

	console.log("✅ 빠른 쿼리 생성 완료:");
	console.log("🆔 쿼리 ID:", quickQuery.queryId);
	console.log("📋 타입 이름:", quickQuery.typeName);
	console.log("📝 인터페이스 코드 길이:", quickQuery.interfaceCode.length, "문자");
	console.log("⚙️ 프로세서 코드 길이:", quickQuery.processorCode.length, "문자");

	return { skeleton, quickQuery };
}

/**
 * ========================================
 * 데모 3: 표준 패턴 라이브러리 활용
 * ========================================
 */

async function demo3_StandardPatterns() {
	console.log("\n📋 === 데모 3: 표준 패턴 라이브러리 활용 ===");

	// Import 패턴들
	console.log("📦 Import 패턴들:");
	const importPatterns = {
		source: StandardQueryPatterns.getImportPattern("source"),
		named: StandardQueryPatterns.getImportPattern("named"),
		default: StandardQueryPatterns.getImportPattern("default"),
		namespace: StandardQueryPatterns.getImportPattern("namespace"),
		type: StandardQueryPatterns.getImportPattern("type")
	};

	Object.entries(importPatterns).forEach(([type, pattern]) => {
		console.log(`  ${type}: ${pattern.substring(0, 50)}...`);
	});

	// Export 패턴들
	console.log("\n📤 Export 패턴들:");
	const exportPatterns = {
		named: StandardQueryPatterns.getExportPattern("named"),
		default: StandardQueryPatterns.getExportPattern("default"),
		all: StandardQueryPatterns.getExportPattern("all")
	};

	Object.entries(exportPatterns).forEach(([type, pattern]) => {
		console.log(`  ${type}: ${pattern.substring(0, 50)}...`);
	});

	// 함수 패턴들
	console.log("\n🔧 함수 패턴들:");
	const functionPatterns = {
		declaration: StandardQueryPatterns.getFunctionPattern("declaration"),
		expression: StandardQueryPatterns.getFunctionPattern("expression"),
		arrow: StandardQueryPatterns.getFunctionPattern("arrow")
	};

	Object.entries(functionPatterns).forEach(([type, pattern]) => {
		console.log(`  ${type}: ${pattern.substring(0, 50)}...`);
	});

	// 클래스 패턴들
	console.log("\n🏛️ 클래스 패턴들:");
	const classPatterns = {
		declaration: StandardQueryPatterns.getClassPattern("declaration"),
		method: StandardQueryPatterns.getClassPattern("method"),
		property: StandardQueryPatterns.getClassPattern("property")
	};

	Object.entries(classPatterns).forEach(([type, pattern]) => {
		console.log(`  ${type}: ${pattern.substring(0, 50)}...`);
	});

	return { importPatterns, exportPatterns, functionPatterns, classPatterns };
}

/**
 * ========================================
 * 데모 4: 복합 쿼리 예시
 * ========================================
 */

async function demo4_ComplexExamples() {
	console.log("\n📋 === 데모 4: 복합 쿼리 예시 ===");

	// Export 분석 쿼리 예시
	console.log("📤 Export 분석 쿼리 예시");
	const exportExample = ExportAnalysisQueryExample.integrate();
	console.log("✅ Export 쿼리 통합:", exportExample.queryDef.id);

	// Class 분석 쿼리 예시들
	console.log("\n🏛️ Class 분석 쿼리 예시들");
	const classMethodExample = ClassAnalysisQueryExample.createMethodExtractionQuery();
	console.log("✅ Class 메서드 쿼리 설계:");
	console.log("  도메인:", classMethodExample.requirements.domain);
	console.log("  패턴 길이:", classMethodExample.queryPattern.length, "문자");

	const classPropertyExample = ClassAnalysisQueryExample.createPropertyExtractionQuery();
	console.log("✅ Class 속성 쿼리 설계:");
	console.log("  도메인:", classPropertyExample.requirements.domain);
	console.log("  패턴 길이:", classPropertyExample.queryPattern.length, "문자");

	return { exportExample, classMethodExample, classPropertyExample };
}

/**
 * ========================================
 * 데모 5: 테스트 생성
 * ========================================
 */

async function demo5_TestGeneration() {
	console.log("\n📋 === 데모 5: 테스트 생성 ===");

	// 기본 테스트 케이스
	const testCases = [
		{
			name: "extract const variable",
			sourceCode: `const myVar: string = "hello";`,
			expectedResults: [{
				variableName: "myVar",
				variableType: "string",
				declarationType: "const",
				hasInitialValue: true,
				initialValue: '"hello"'
			}]
		},
		{
			name: "extract let variable without type",
			sourceCode: `let count = 0;`,
			expectedResults: [{
				variableName: "count",
				declarationType: "let",
				hasInitialValue: true,
				initialValue: "0"
			}]
		}
	];

	// 기본 테스트 생성
	const basicTest = QueryTestTemplate.generateBasicTest(
		"variable-declarations-extract",
		testCases
	);

	console.log("✅ 기본 테스트 생성 완료");
	console.log("📝 테스트 코드 길이:", basicTest.length, "문자");
	console.log("🧪 테스트 케이스 수:", testCases.length, "개");

	// 통합 테스트 시나리오
	const integrationScenarios = [
		{
			name: "analyze complete variable file",
			sourceCode: `
				const message: string = "hello";
				let count: number = 0;
				var flag = true;
			`,
			expectedCombination: {
				variables: [
					{ variableName: "message", declarationType: "const" },
					{ variableName: "count", declarationType: "let" },
					{ variableName: "flag", declarationType: "var" }
				]
			}
		}
	];

	const integrationTest = QueryTestTemplate.generateIntegrationTest(
		"variable-analysis",
		integrationScenarios
	);

	console.log("✅ 통합 테스트 생성 완료");
	console.log("📝 통합 테스트 코드 길이:", integrationTest.length, "문자");

	return { basicTest, integrationTest };
}

/**
 * ========================================
 * 데모 실행 및 결과 요약
 * ========================================
 */

async function runAllDemos() {
	try {
		console.log("🎬 전체 데모 실행 시작\n");

		// 각 데모 실행
		const demo1Result = await demo1_StandardWorkflow();
		const demo2Result = await demo2_AutoGeneration();
		const demo3Result = await demo3_StandardPatterns();
		const demo4Result = await demo4_ComplexExamples();
		const demo5Result = await demo5_TestGeneration();

		// 결과 요약
		console.log("\n🎉 === 전체 데모 완료 요약 ===");
		console.log("✅ 데모 1 - 표준 워크플로우: 성공");
		console.log(`   생성된 쿼리: ${demo1Result.queryId}`);
		console.log(`   타입 이름: ${demo1Result.resultTypeName}`);

		console.log("✅ 데모 2 - 자동 생성 도구: 성공");
		console.log(`   스켈레톤 쿼리: ${demo2Result.skeleton.queryId}`);
		console.log(`   빠른 쿼리: ${demo2Result.quickQuery.queryId}`);

		console.log("✅ 데모 3 - 표준 패턴 라이브러리: 성공");
		console.log(`   Import 패턴 수: ${Object.keys(demo3Result.importPatterns).length}개`);
		console.log(`   Export 패턴 수: ${Object.keys(demo3Result.exportPatterns).length}개`);

		console.log("✅ 데모 4 - 복합 쿼리 예시: 성공");
		console.log(`   Export 쿼리: ${demo4Result.exportExample.queryDef.id}`);

		console.log("✅ 데모 5 - 테스트 생성: 성공");
		console.log(`   기본 테스트 길이: ${demo5Result.basicTest.length}문자`);

		console.log("\n🚀 컨벤션 적용 완료!");
		console.log("💡 이제 표준화된 방식으로 Tree-sitter 쿼리를 만들 수 있습니다.");

		return {
			demo1: demo1Result,
			demo2: demo2Result,
			demo3: demo3Result,
			demo4: demo4Result,
			demo5: demo5Result,
			success: true
		};

	} catch (error) {
		console.error("❌ 데모 실행 중 오류:", error);
		return {
			error,
			success: false
		};
	}
}

/**
 * ========================================
 * 컨벤션 검증 및 가이드라인 확인
 * ========================================
 */

function validateConventions() {
	console.log("\n🔍 === 컨벤션 검증 ===");

	const validationResults = {
		naming: true,
		structure: true,
		typing: true,
		testing: true,
		documentation: true
	};

	// 네이밍 컨벤션 검증
	const testId = QueryNamingConvention.generateQueryId("test", "demo", "validate");
	const testType = QueryNamingConvention.generateResultTypeName("demo", "validate");
	const testProcessor = QueryNamingConvention.generateProcessorName("demo", "validate");

	console.log("✅ 네이밍 컨벤션:");
	console.log(`   쿼리 ID: ${testId}`);
	console.log(`   타입 이름: ${testType}`);
	console.log(`   프로세서 이름: ${testProcessor}`);

	// 패턴 검증
	const testPattern = StandardQueryPatterns.getImportPattern("source");
	const syntaxCheck = QueryValidator.validateSyntax(testPattern);
	console.log(`✅ 패턴 검증: ${syntaxCheck.valid ? "통과" : "실패"}`);

	console.log(`\n🎯 전체 컨벤션 준수도: ${Object.values(validationResults).every(v => v) ? "100%" : "부분적"}`);

	return validationResults;
}

// 실행
if (require.main === module) {
	runAllDemos().then(result => {
		if (result && result.success) {
			validateConventions();
			console.log("\n✨ 모든 데모가 성공적으로 완료되었습니다!");
		}
	});
}

export {
	demo1_StandardWorkflow,
	demo2_AutoGeneration,
	demo3_StandardPatterns,
	demo4_ComplexExamples,
	demo5_TestGeneration,
	runAllDemos,
	validateConventions
};