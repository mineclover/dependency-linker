/**
 * Java Language Query Results
 * Java 언어별 쿼리 결과 타입 정의
 */

import type { BaseQueryResult } from "../core/types";

// ===== JAVA IMPORT RESULTS =====

/**
 * Java import source 결과
 */
export interface JavaImportSourceResult extends BaseQueryResult {
	queryName: "java-import-sources";
	source: string; // com.example.package
}

/**
 * Java import statement 전체 정보
 */
export interface JavaImportStatementResult extends BaseQueryResult {
	queryName: "java-import-statements";
	packagePath: string; // com.example.Class
	isStatic: boolean; // import static 여부
	isWildcard: boolean; // import package.* 여부
	importedName: string; // Class 또는 *
}

/**
 * Java wildcard import 결과
 */
export interface JavaWildcardImportResult extends BaseQueryResult {
	queryName: "java-wildcard-imports";
	packagePath: string; // com.example (without .*)
}

/**
 * Java static import 결과
 */
export interface JavaStaticImportResult extends BaseQueryResult {
	queryName: "java-static-imports";
	className: string; // com.example.Class
	memberName: string; // method 또는 *
	isWildcard: boolean; // static import Class.* 여부
}

// ===== JAVA EXPORT/DECLARATION RESULTS =====

/**
 * Java class 선언 결과
 */
export interface JavaClassDeclarationResult extends BaseQueryResult {
	queryName: "java-class-declarations";
	className: string; // MyClass
	isPublic: boolean;
	isAbstract: boolean;
	isFinal: boolean;
	superClass?: string; // 상위 클래스
	interfaces: string[]; // 구현된 인터페이스들
}

/**
 * Java interface 선언 결과
 */
export interface JavaInterfaceDeclarationResult extends BaseQueryResult {
	queryName: "java-interface-declarations";
	interfaceName: string; // MyInterface
	isPublic: boolean;
	extendsInterfaces: string[]; // 확장된 인터페이스들
}

/**
 * Java enum 선언 결과
 */
export interface JavaEnumDeclarationResult extends BaseQueryResult {
	queryName: "java-enum-declarations";
	enumName: string; // MyEnum
	isPublic: boolean;
	enumValues: string[]; // enum 값들
}

/**
 * Java method 선언 결과
 */
export interface JavaMethodDeclarationResult extends BaseQueryResult {
	queryName: "java-method-declarations";
	methodName: string; // myMethod
	returnType: string; // String, void, int 등
	parameters: string[]; // 매개변수 목록
	isPublic: boolean;
	isStatic: boolean;
	isAbstract: boolean;
	isFinal: boolean;
}

// ===== JAVA QUERY RESULT MAP =====

/**
 * Java 언어의 모든 쿼리 결과 매핑
 */
export interface JavaQueryResultMap {
	// Import queries
	"java-import-sources": JavaImportSourceResult;
	"java-import-statements": JavaImportStatementResult;
	"java-wildcard-imports": JavaWildcardImportResult;
	"java-static-imports": JavaStaticImportResult;

	// Export/Declaration queries
	"java-class-declarations": JavaClassDeclarationResult;
	"java-interface-declarations": JavaInterfaceDeclarationResult;
	"java-enum-declarations": JavaEnumDeclarationResult;
	"java-method-declarations": JavaMethodDeclarationResult;
}
