/**
 * Python Language Query Results
 * Python 언어별 쿼리 결과 타입 정의
 */

import type { BaseQueryResult } from "../core/types";

// ===== PYTHON IMPORT RESULTS =====

/**
 * Python import source 결과
 */
export interface PythonImportSourceResult extends BaseQueryResult {
	queryName: "python-import-sources";
	source: string; // os.path, numpy, etc.
}

/**
 * Python import statement 전체 정보
 */
export interface PythonImportStatementResult extends BaseQueryResult {
	queryName: "python-import-statements";
	modulePath: string; // os.path, numpy, etc.
	isFromImport: boolean; // from module import name 여부
	isRelativeImport: boolean; // . 또는 .. 로 시작하는 상대 import
	alias?: string; // import numpy as np의 np
}

/**
 * Python from import 결과
 */
export interface PythonFromImportResult extends BaseQueryResult {
	queryName: "python-from-imports";
	modulePath: string; // os (from os import path에서)
	importedNames: string[]; // [path, dirname] (from os import path, dirname에서)
	isRelative: boolean; // from .module import name 여부
}

/**
 * Python import as 결과 (별칭 사용)
 */
export interface PythonImportAsResult extends BaseQueryResult {
	queryName: "python-import-as";
	modulePath: string; // numpy (import numpy as np에서)
	originalName: string; // numpy
	alias: string; // np
}

// ===== PYTHON DEFINITION RESULTS =====

/**
 * Python 함수 정의 결과
 */
export interface PythonFunctionDefinitionResult extends BaseQueryResult {
	queryName: "python-function-definitions";
	functionName: string; // my_function
	parameters: string[]; // [arg1, arg2: int, *args, **kwargs]
	returnType?: string; // 반환 타입 annotation
	isAsync: boolean; // async def 여부
	decorators: string[]; // [@decorator1, @decorator2]
}

/**
 * Python 클래스 정의 결과
 */
export interface PythonClassDefinitionResult extends BaseQueryResult {
	queryName: "python-class-definitions";
	className: string; // MyClass
	baseClasses: string[]; // [BaseClass1, BaseClass2]
	decorators: string[]; // [@dataclass, @property]
}

/**
 * Python 변수 정의 결과
 */
export interface PythonVariableDefinitionResult extends BaseQueryResult {
	queryName: "python-variable-definitions";
	variableName: string; // my_variable
	variableType?: string; // 타입 annotation
	initialValue?: string; // 초기값
}

/**
 * Python 메서드 정의 결과
 */
export interface PythonMethodDefinitionResult extends BaseQueryResult {
	queryName: "python-method-definitions";
	methodName: string; // my_method
	parameters: string[]; // [self, arg1, arg2]
	returnType?: string; // 반환 타입 annotation
	isAsync: boolean; // async def 여부
	isClassMethod: boolean; // @classmethod 여부
	isStaticMethod: boolean; // @staticmethod 여부
	decorators: string[]; // 모든 데코레이터들
}

// ===== PYTHON QUERY RESULT MAP =====

/**
 * Python 언어의 모든 쿼리 결과 매핑
 */
export interface PythonQueryResultMap {
	// Import queries
	"python-import-sources": PythonImportSourceResult;
	"python-import-statements": PythonImportStatementResult;
	"python-from-imports": PythonFromImportResult;
	"python-import-as": PythonImportAsResult;

	// Definition queries
	"python-function-definitions": PythonFunctionDefinitionResult;
	"python-class-definitions": PythonClassDefinitionResult;
	"python-variable-definitions": PythonVariableDefinitionResult;
	"python-method-definitions": PythonMethodDefinitionResult;
}
