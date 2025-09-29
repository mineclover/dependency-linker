/**
 * 쿼리 확장 예시 - Query Extension Examples
 * 새로운 쿼리 타입을 추가하는 방법과 사용자 정의 키 매핑 확장 예시
 */

import type {
	QueryFunction,
	QueryExecutionContext,
	QueryMatch,
	QueryKey,
	QueryResultMap,
	CustomKeyMapping,
	CustomKeyMappingResult,
} from "../queries/ImportQueries";
import type { ExtendedSourceLocation } from "../results/QueryResults";

/**
 * 1. 새로운 쿼리 결과 타입 정의
 */

// Export 선언 결과 타입
export interface ExportDeclarationResult {
	queryName: "export-declarations";
	location: ExtendedSourceLocation;
	nodeText: string;
	exportType: "named" | "default" | "namespace";
	exportName: string;
	isDefault: boolean;
	source?: string; // re-export인 경우
}

// 클래스 정의 결과 타입
export interface ClassDefinitionResult {
	queryName: "class-definitions";
	location: ExtendedSourceLocation;
	nodeText: string;
	className: string;
	isExported: boolean;
	isAbstract: boolean;
	superClass?: string;
	implements?: string[];
	accessModifier?: "public" | "private" | "protected";
}

// 함수 선언 결과 타입
export interface FunctionDeclarationResult {
	queryName: "function-declarations";
	location: ExtendedSourceLocation;
	nodeText: string;
	functionName: string;
	isExported: boolean;
	isAsync: boolean;
	isGenerator: boolean;
	parameters: Array<{
		name: string;
		type?: string;
		isOptional: boolean;
		defaultValue?: string;
	}>;
	returnType?: string;
}

// React Hook 결과 타입
export interface ReactHookResult {
	queryName: "react-hooks";
	location: ExtendedSourceLocation;
	nodeText: string;
	hookName: string;
	hookType: "useState" | "useEffect" | "useContext" | "useCallback" | "useMemo" | "custom";
	dependencies?: string[];
	isCustomHook: boolean;
}

/**
 * 2. 확장된 QueryResultMap 타입 (실제 구현에서는 ImportQueries.ts에 추가)
 */
export interface ExtendedQueryResultMap extends QueryResultMap {
	"export-declarations": ExportDeclarationResult;
	"class-definitions": ClassDefinitionResult;
	"function-declarations": FunctionDeclarationResult;
	"react-hooks": ReactHookResult;
}

export type ExtendedQueryKey = keyof ExtendedQueryResultMap;

/**
 * 3. 새로운 쿼리 함수 구현 예시
 */

// 유틸리티 함수들
const extractStringFromNode = (node: any): string => {
	const text = node.text;
	return text.slice(1, -1);
};

const extractLocation = (node: any): ExtendedSourceLocation => ({
	line: node.startPosition.row + 1,
	column: node.startPosition.column,
	offset: 0,
	endLine: node.endPosition.row + 1,
	endColumn: node.endPosition.column,
	endOffset: 0,
});

/**
 * Export Declaration 쿼리 함수
 */
export const exportDeclarationQuery: QueryFunction<ExportDeclarationResult> = {
	name: "export-declarations",
	description: "Extract export declarations from modules",
	query: `
		[
			(export_statement
				declaration: [
					(class_declaration name: (identifier) @export_name)
					(function_declaration name: (identifier) @export_name)
					(variable_declaration (variable_declarator name: (identifier) @export_name))
				] @export_declaration)
			(export_statement
				(export_clause
					(export_specifier
						name: (identifier) @export_name
						alias: (identifier)? @export_alias)))
		]
	`,
	languages: ["typescript", "tsx", "javascript", "jsx"] as const,
	priority: 95,
	resultType: "export-declarations",
	processor: (matches, context) => {
		const results: ExportDeclarationResult[] = [];

		for (const match of matches) {
			const exportNameCaptures = match.captures.filter(c => c.name === "export_name");
			const exportDeclarationCaptures = match.captures.filter(c => c.name === "export_declaration");

			for (let i = 0; i < exportNameCaptures.length; i++) {
				const nameNode = exportNameCaptures[i]?.node;
				const declarationNode = exportDeclarationCaptures[i]?.node || nameNode;

				if (nameNode) {
					results.push({
						queryName: "export-declarations",
						location: extractLocation(nameNode),
						nodeText: declarationNode.text,
						exportType: "named", // 추후 정확한 타입 감지 로직 추가
						exportName: nameNode.text,
						isDefault: false, // 추후 default export 감지 로직 추가
					});
				}
			}
		}

		return results;
	},
};

/**
 * Class Definition 쿼리 함수
 */
export const classDefinitionQuery: QueryFunction<ClassDefinitionResult> = {
	name: "class-definitions",
	description: "Extract class definitions with inheritance information",
	query: `
		(class_declaration
			name: (identifier) @class_name
			superclass: (identifier)? @super_class
			body: (class_body) @class_body)
	`,
	languages: ["typescript", "tsx", "javascript", "jsx"] as const,
	priority: 90,
	resultType: "class-definitions",
	processor: (matches, context) => {
		const results: ClassDefinitionResult[] = [];

		for (const match of matches) {
			const classNameNode = match.captures.find(c => c.name === "class_name")?.node;
			const superClassNode = match.captures.find(c => c.name === "super_class")?.node;

			if (classNameNode) {
				results.push({
					queryName: "class-definitions",
					location: extractLocation(classNameNode),
					nodeText: match.node.text,
					className: classNameNode.text,
					isExported: false, // 추후 export 여부 감지 로직 추가
					isAbstract: false, // 추후 abstract 클래스 감지 로직 추가
					superClass: superClassNode?.text,
					implements: [], // 추후 implements 감지 로직 추가
				});
			}
		}

		return results;
	},
};

/**
 * Function Declaration 쿼리 함수
 */
export const functionDeclarationQuery: QueryFunction<FunctionDeclarationResult> = {
	name: "function-declarations",
	description: "Extract function declarations with parameter information",
	query: `
		[
			(function_declaration
				name: (identifier) @function_name
				parameters: (formal_parameters) @function_params)
			(arrow_function
				parameters: (formal_parameters) @function_params)
		]
	`,
	languages: ["typescript", "tsx", "javascript", "jsx"] as const,
	priority: 88,
	resultType: "function-declarations",
	processor: (matches, context) => {
		const results: FunctionDeclarationResult[] = [];

		for (const match of matches) {
			const functionNameNode = match.captures.find(c => c.name === "function_name")?.node;
			const paramsNode = match.captures.find(c => c.name === "function_params")?.node;

			if (functionNameNode) {
				results.push({
					queryName: "function-declarations",
					location: extractLocation(functionNameNode),
					nodeText: match.node.text,
					functionName: functionNameNode.text,
					isExported: false, // 추후 export 여부 감지 로직 추가
					isAsync: false, // 추후 async 함수 감지 로직 추가
					isGenerator: false, // 추후 generator 함수 감지 로직 추가
					parameters: [], // 추후 파라미터 파싱 로직 추가
				});
			}
		}

		return results;
	},
};

/**
 * React Hook 쿼리 함수
 */
export const reactHookQuery: QueryFunction<ReactHookResult> = {
	name: "react-hooks",
	description: "Extract React hooks usage patterns",
	query: `
		(call_expression
			function: (identifier) @hook_name
			arguments: (_)* @hook_args
			(#match? @hook_name "^use[A-Z]"))
	`,
	languages: ["typescript", "tsx", "javascript", "jsx"] as const,
	priority: 85,
	resultType: "react-hooks",
	processor: (matches, context) => {
		const results: ReactHookResult[] = [];

		for (const match of matches) {
			const hookNameNode = match.captures.find(c => c.name === "hook_name")?.node;

			if (hookNameNode) {
				const hookName = hookNameNode.text;
				const hookType = getHookType(hookName);

				results.push({
					queryName: "react-hooks",
					location: extractLocation(hookNameNode),
					nodeText: match.node.text,
					hookName,
					hookType,
					isCustomHook: !["useState", "useEffect", "useContext", "useCallback", "useMemo"].includes(hookName),
					dependencies: [], // 추후 의존성 배열 파싱 로직 추가
				});
			}
		}

		return results;
	},
};

// Hook 타입 결정 헬퍼 함수
function getHookType(hookName: string): ReactHookResult["hookType"] {
	switch (hookName) {
		case "useState": return "useState";
		case "useEffect": return "useEffect";
		case "useContext": return "useContext";
		case "useCallback": return "useCallback";
		case "useMemo": return "useMemo";
		default: return "custom";
	}
}

/**
 * 4. 사전 정의된 매핑 확장 예시
 */

export const extendedPredefinedMappings = {
	/**
	 * 모듈 구조 전체 분석용 매핑
	 */
	moduleStructureAnalysis: {
		imports: "import-sources",
		namedImports: "named-imports",
		exports: "export-declarations",
		classes: "class-definitions",
		functions: "function-declarations",
	} as const,

	/**
	 * React 컴포넌트 완전 분석용 매핑
	 */
	reactFullAnalysis: {
		imports: "import-sources",
		namedImports: "named-imports",
		typeImports: "type-imports",
		exports: "export-declarations",
		classes: "class-definitions",
		functions: "function-declarations",
		hooks: "react-hooks",
	} as const,

	/**
	 * 클래스 기반 코드 분석용 매핑
	 */
	classBasedAnalysis: {
		classes: "class-definitions",
		classImports: "import-sources",
		classExports: "export-declarations",
		classFunctions: "function-declarations",
	} as const,

	/**
	 * 함수형 프로그래밍 분석용 매핑
	 */
	functionalAnalysis: {
		functions: "function-declarations",
		namedImports: "named-imports",
		exports: "export-declarations",
		hooks: "react-hooks",
	} as const,

	/**
	 * API 모듈 분석용 매핑
	 */
	apiModuleAnalysis: {
		exports: "export-declarations",
		functions: "function-declarations",
		imports: "import-sources",
		types: "type-imports",
	} as const,

	/**
	 * 컴포넌트 라이브러리 분석용 매핑
	 */
	componentLibraryAnalysis: {
		components: "function-declarations",
		hooks: "react-hooks",
		exports: "export-declarations",
		types: "type-imports",
		imports: "import-sources",
	} as const,
} as const;

/**
 * 5. 동적 매핑 생성 예시
 */

/**
 * 언어별 맞춤 매핑 생성
 */
export function createLanguageSpecificMapping(language: "typescript" | "javascript" | "tsx" | "jsx") {
	const baseMapping = {
		imports: "import-sources",
		namedImports: "named-imports",
		exports: "export-declarations",
		functions: "function-declarations",
	};

	switch (language) {
		case "typescript":
			return {
				...baseMapping,
				types: "type-imports",
				classes: "class-definitions",
			} as const;

		case "tsx":
			return {
				...baseMapping,
				types: "type-imports",
				classes: "class-definitions",
				hooks: "react-hooks",
			} as const;

		case "jsx":
			return {
				...baseMapping,
				hooks: "react-hooks",
			} as const;

		case "javascript":
		default:
			return baseMapping;
	}
}

/**
 * 프로젝트 타입별 매핑 생성
 */
export function createProjectTypeMapping(projectType: "library" | "application" | "component" | "api") {
	switch (projectType) {
		case "library":
			return extendedPredefinedMappings.moduleStructureAnalysis;

		case "application":
			return extendedPredefinedMappings.reactFullAnalysis;

		case "component":
			return extendedPredefinedMappings.componentLibraryAnalysis;

		case "api":
			return extendedPredefinedMappings.apiModuleAnalysis;

		default:
			return extendedPredefinedMappings.moduleStructureAnalysis;
	}
}

/**
 * 6. 실제 사용 예시
 */

/**
 * React 컴포넌트 전체 분석 예시
 */
export async function analyzeReactComponent(sourceCode: string, context: QueryExecutionContext) {
	// 실제 구현에서는 executeQueriesWithCustomKeys 사용
	const mapping = extendedPredefinedMappings.reactFullAnalysis;

	// 모킹된 실행 결과 (실제로는 아래와 같이 호출)
	// const result = executeQueriesWithCustomKeys(mapping, matches, context);

	const mockResult = {
		imports: [], // ImportSourceResult[]
		namedImports: [], // NamedImportResult[]
		typeImports: [], // TypeImportResult[]
		exports: [], // ExportDeclarationResult[]
		classes: [], // ClassDefinitionResult[]
		functions: [], // FunctionDeclarationResult[]
		hooks: [], // ReactHookResult[]
	};

	// 결과 분석
	const analysis = {
		hasReactImport: mockResult.imports.some(imp => imp.source === "react"),
		componentCount: mockResult.functions.filter(fn => fn.functionName.match(/^[A-Z]/)).length,
		hookCount: mockResult.hooks.length,
		customHookCount: mockResult.hooks.filter(hook => hook.isCustomHook).length,
		exportedComponents: mockResult.exports.filter(exp => exp.exportType === "default" || exp.exportType === "named").length,
	};

	return { rawResults: mockResult, analysis };
}

/**
 * 모듈 의존성 분석 예시
 */
export async function analyzeDependencies(sourceCode: string, context: QueryExecutionContext) {
	const mapping = {
		externalImports: "import-sources",
		namedImports: "named-imports",
		exports: "export-declarations",
		internalStructure: "function-declarations",
	} as const;

	// const result = executeQueriesWithCustomKeys(mapping, matches, context);

	const mockResult = {
		externalImports: [], // ImportSourceResult[]
		namedImports: [], // NamedImportResult[]
		exports: [], // ExportDeclarationResult[]
		internalStructure: [], // FunctionDeclarationResult[]
	};

	// 의존성 그래프 생성
	const dependencyGraph = {
		external: mockResult.externalImports.map(imp => imp.source),
		internal: mockResult.internalStructure.map(fn => fn.functionName),
		publicAPI: mockResult.exports.map(exp => exp.exportName),
		imports: mockResult.namedImports.map(imp => ({ name: imp.name, from: imp.source })),
	};

	return { rawResults: mockResult, dependencyGraph };
}

/**
 * 7. 조건부 분석 예시
 */

/**
 * 코드 복잡도에 따른 적응적 분석
 */
export function createAdaptiveMapping(codeComplexity: "simple" | "moderate" | "complex") {
	const baseMapping = {
		imports: "import-sources",
		exports: "export-declarations",
	};

	switch (codeComplexity) {
		case "simple":
			return {
				...baseMapping,
				functions: "function-declarations",
			} as const;

		case "moderate":
			return {
				...baseMapping,
				functions: "function-declarations",
				classes: "class-definitions",
				namedImports: "named-imports",
			} as const;

		case "complex":
			return {
				...baseMapping,
				functions: "function-declarations",
				classes: "class-definitions",
				namedImports: "named-imports",
				types: "type-imports",
				hooks: "react-hooks",
			} as const;

		default:
			return baseMapping;
	}
}

export default {
	// 쿼리 함수들
	exportDeclarationQuery,
	classDefinitionQuery,
	functionDeclarationQuery,
	reactHookQuery,

	// 매핑들
	extendedPredefinedMappings,

	// 헬퍼 함수들
	createLanguageSpecificMapping,
	createProjectTypeMapping,
	createAdaptiveMapping,

	// 사용 예시들
	analyzeReactComponent,
	analyzeDependencies,
};