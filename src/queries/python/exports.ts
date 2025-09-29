/**
 * Python Export Queries
 * Python 언어의 export 관련 쿼리들 (def, class 등의 정의)
 */

import type {
	QueryExecutionContext,
	QueryFunction,
	QueryMatch,
} from "../../core/types";
import type {
	PythonClassDefinitionResult,
	PythonFunctionDefinitionResult,
	PythonMethodDefinitionResult,
	PythonVariableDefinitionResult,
} from "../../results";
import { extractLocation } from "../../utils/ast-helpers";

// ===== PYTHON FUNCTION DEFINITION EXTRACTION =====

/**
 * Python 함수 정의 추출
 */
export const pythonFunctionDefinitions: QueryFunction<PythonFunctionDefinitionResult> =
	{
		name: "python-function-definitions",
		description: "Extract Python function definitions",
		query: "(function_definition) @function",
		resultType: "python-function-definitions",
		languages: ["python"],
		priority: 90,
		processor: (
			matches: QueryMatch[],
			_context: QueryExecutionContext,
		): PythonFunctionDefinitionResult[] => {
			return matches
				.map((match) => {
					const node = match.captures[0]?.node;
					if (!node) return null;
					const returnType = extractReturnTypeAnnotation(node);
					const result: PythonFunctionDefinitionResult = {
						queryName: "python-function-definitions",
						functionName: extractPythonFunctionName(node),
						parameters: extractFunctionParameters(node),
						isAsync: isAsyncFunction(node),
						decorators: extractDecorators(node),
						location: extractLocation(node),
						nodeText: node.text,
					};
					if (returnType) result.returnType = returnType;
					return result;
				})
				.filter(
					(result): result is PythonFunctionDefinitionResult => result !== null,
				);
		},
	};

// ===== PYTHON CLASS DEFINITION EXTRACTION =====

/**
 * Python 클래스 정의 추출
 */
export const pythonClassDefinitions: QueryFunction<PythonClassDefinitionResult> =
	{
		name: "python-class-definitions",
		description: "Extract Python class definitions",
		query: "(class_definition) @class",
		resultType: "python-class-definitions",
		languages: ["python"],
		priority: 85,
		processor: (
			matches: QueryMatch[],
			_context: QueryExecutionContext,
		): PythonClassDefinitionResult[] => {
			return matches
				.map((match) => {
					const node = match.captures[0]?.node;
					if (!node) return null;
					return {
						queryName: "python-class-definitions",
						className: extractPythonClassName(node),
						baseClasses: extractBaseClasses(node),
						decorators: extractDecorators(node),
						location: extractLocation(node),
						nodeText: node.text,
					};
				})
				.filter(
					(result): result is PythonClassDefinitionResult => result !== null,
				);
		},
	};

// ===== PYTHON VARIABLE DEFINITION EXTRACTION =====

/**
 * Python 전역 변수 정의 추출
 */
export const pythonVariableDefinitions: QueryFunction<PythonVariableDefinitionResult> =
	{
		name: "python-variable-definitions",
		description: "Extract Python global variable definitions",
		query: "(assignment) @variable",
		resultType: "python-variable-definitions",
		languages: ["python"],
		priority: 75,
		processor: (
			matches: QueryMatch[],
			_context: QueryExecutionContext,
		): PythonVariableDefinitionResult[] => {
			return matches
				.map((match) => {
					const node = match.captures[0]?.node;
					if (!node) return null;
					const variableType = extractVariableTypeAnnotation(node);
					const initialValue = extractInitialValue(node);
					const result: PythonVariableDefinitionResult = {
						queryName: "python-variable-definitions",
						variableName: extractVariableName(node),
						location: extractLocation(node),
						nodeText: node.text,
					};
					if (variableType) result.variableType = variableType;
					if (initialValue) result.initialValue = initialValue;
					return result;
				})
				.filter(
					(result): result is PythonVariableDefinitionResult => result !== null,
				);
		},
	};

// ===== PYTHON METHOD DEFINITION EXTRACTION =====

/**
 * Python 메서드 정의 추출 (클래스 내부 메서드)
 */
export const pythonMethodDefinitions: QueryFunction<PythonMethodDefinitionResult> =
	{
		name: "python-method-definitions",
		description: "Extract Python method definitions within classes",
		query: "(function_definition) @method",
		resultType: "python-method-definitions",
		languages: ["python"],
		priority: 80,
		processor: (
			matches: QueryMatch[],
			_context: QueryExecutionContext,
		): PythonMethodDefinitionResult[] => {
			return matches
				.map((match) => {
					const node = match.captures[0]?.node;
					if (!node) return null;
					const returnType = extractReturnTypeAnnotation(node);
					const result: PythonMethodDefinitionResult = {
						queryName: "python-method-definitions",
						methodName: extractPythonFunctionName(node),
						parameters: extractFunctionParameters(node),
						isAsync: isAsyncFunction(node),
						isClassMethod: isClassMethod(node),
						isStaticMethod: isStaticMethod(node),
						decorators: extractDecorators(node),
						location: extractLocation(node),
						nodeText: node.text,
					};
					if (returnType) result.returnType = returnType;
					return result;
				})
				.filter(
					(result): result is PythonMethodDefinitionResult => result !== null,
				);
		},
	};

// ===== HELPER FUNCTIONS =====

/**
 * Python 함수명 추출
 */
function extractPythonFunctionName(node: any): string {
	const text = node.text;
	const funcMatch = text.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
	return funcMatch ? funcMatch[1] : "";
}

/**
 * Python 클래스명 추출
 */
function extractPythonClassName(node: any): string {
	const text = node.text;
	const classMatch = text.match(/class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
	return classMatch ? classMatch[1] : "";
}

/**
 * 함수 매개변수들 추출
 */
function extractFunctionParameters(node: any): string[] {
	const text = node.text;
	const paramMatch = text.match(/def\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(([^)]*)\)/);

	if (!paramMatch || !paramMatch[1].trim()) return [];

	return paramMatch[1]
		.split(",")
		.map((param: string) => param.trim())
		.filter((param: string) => param.length > 0);
}

/**
 * 반환 타입 annotation 추출
 */
function extractReturnTypeAnnotation(node: any): string | undefined {
	const text = node.text;
	const returnTypeMatch = text.match(/\)\s*->\s*([^:]+):/);
	return returnTypeMatch ? returnTypeMatch[1].trim() : undefined;
}

/**
 * async 함수 여부 확인
 */
function isAsyncFunction(node: any): boolean {
	return node.text.includes("async def");
}

/**
 * 기본 클래스들 추출
 */
function extractBaseClasses(node: any): string[] {
	const text = node.text;
	const baseMatch = text.match(/class\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(([^)]+)\)/);

	if (!baseMatch) return [];

	return baseMatch[1]
		.split(",")
		.map((base: string) => base.trim())
		.filter((base: string) => base.length > 0);
}

/**
 * 데코레이터들 추출
 */
function extractDecorators(node: any): string[] {
	const text = node.text;
	const decoratorMatches = text.match(/@[a-zA-Z_][a-zA-Z0-9_.]*/g);
	return decoratorMatches || [];
}

/**
 * 변수명 추출
 */
function extractVariableName(node: any): string {
	const text = node.text;
	const varMatch = text.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*[=:]/);
	return varMatch ? varMatch[1] : "";
}

/**
 * 변수 타입 annotation 추출
 */
function extractVariableTypeAnnotation(node: any): string | undefined {
	const text = node.text;
	const typeMatch = text.match(/:\s*([^=]+)(?:\s*=|$)/);
	return typeMatch ? typeMatch[1].trim() : undefined;
}

/**
 * 초기값 추출
 */
function extractInitialValue(node: any): string | undefined {
	const text = node.text;
	const valueMatch = text.match(/=\s*(.+)$/);
	return valueMatch ? valueMatch[1].trim() : undefined;
}

/**
 * @classmethod 데코레이터 확인
 */
function isClassMethod(node: any): boolean {
	return node.text.includes("@classmethod");
}

/**
 * @staticmethod 데코레이터 확인
 */
function isStaticMethod(node: any): boolean {
	return node.text.includes("@staticmethod");
}

// ===== EXPORTS =====
const pythonExportQueries = {
	"python-function-definitions": pythonFunctionDefinitions,
	"python-class-definitions": pythonClassDefinitions,
	"python-variable-definitions": pythonVariableDefinitions,
	"python-method-definitions": pythonMethodDefinitions,
} as const;

export default pythonExportQueries;
