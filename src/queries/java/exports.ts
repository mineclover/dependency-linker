/**
 * Java Export Queries
 * Java 언어의 export 관련 쿼리들 (public class, interface, enum 등)
 */

import type {
	QueryExecutionContext,
	QueryFunction,
	QueryMatch,
} from "../../core/types";
import type {
	JavaClassDeclarationResult,
	JavaEnumDeclarationResult,
	JavaInterfaceDeclarationResult,
	JavaMethodDeclarationResult,
} from "../../results";
import { extractLocation } from "../../utils/ast-helpers";

// ===== JAVA CLASS DECLARATION EXTRACTION =====

/**
 * Java public class 선언 추출
 */
export const javaClassDeclarations: QueryFunction<JavaClassDeclarationResult> =
	{
		name: "java-class-declarations",
		description: "Extract Java public class declarations",
		query: "(class_declaration) @class",
		resultType: "java-class-declarations",
		languages: ["java"],
		priority: 90,
		processor: (
			matches: QueryMatch[],
			_context: QueryExecutionContext,
		): JavaClassDeclarationResult[] => {
			return matches
				.map((match) => {
					const node = match.captures[0]?.node;
					if (!node) return null;
					const superClass = extractSuperClass(node);
					const result: JavaClassDeclarationResult = {
						queryName: "java-class-declarations",
						className: extractJavaClassName(node),
						isPublic: isPublicDeclaration(node),
						isAbstract: isAbstractClass(node),
						isFinal: isFinalClass(node),
						interfaces: extractImplementedInterfaces(node),
						location: extractLocation(node),
						nodeText: node.text,
					};
					if (superClass) result.superClass = superClass;
					return result;
				})
				.filter(
					(result): result is JavaClassDeclarationResult => result !== null,
				);
		},
	};

// ===== JAVA INTERFACE DECLARATION EXTRACTION =====

/**
 * Java interface 선언 추출
 */
export const javaInterfaceDeclarations: QueryFunction<JavaInterfaceDeclarationResult> =
	{
		name: "java-interface-declarations",
		description: "Extract Java interface declarations",
		query: "(interface_declaration) @interface",
		resultType: "java-interface-declarations",
		languages: ["java"],
		priority: 85,
		processor: (
			matches: QueryMatch[],
			_context: QueryExecutionContext,
		): JavaInterfaceDeclarationResult[] => {
			return matches
				.map((match) => {
					const node = match.captures[0]?.node;
					if (!node) return null;
					return {
						queryName: "java-interface-declarations",
						interfaceName: extractJavaInterfaceName(node),
						isPublic: isPublicDeclaration(node),
						extendsInterfaces: extractExtendedInterfaces(node),
						location: extractLocation(node),
						nodeText: node.text,
					};
				})
				.filter(
					(result): result is JavaInterfaceDeclarationResult => result !== null,
				);
		},
	};

// ===== JAVA ENUM DECLARATION EXTRACTION =====

/**
 * Java enum 선언 추출
 */
export const javaEnumDeclarations: QueryFunction<JavaEnumDeclarationResult> = {
	name: "java-enum-declarations",
	description: "Extract Java enum declarations",
	query: "(enum_declaration) @enum",
	resultType: "java-enum-declarations",
	languages: ["java"],
	priority: 85,
	processor: (
		matches: QueryMatch[],
		_context: QueryExecutionContext,
	): JavaEnumDeclarationResult[] => {
		return matches
			.map((match) => {
				const node = match.captures[0]?.node;
				if (!node) return null;
				return {
					queryName: "java-enum-declarations",
					enumName: extractJavaEnumName(node),
					isPublic: isPublicDeclaration(node),
					enumValues: extractEnumValues(node),
					location: extractLocation(node),
					nodeText: node.text,
				};
			})
			.filter((result): result is JavaEnumDeclarationResult => result !== null);
	},
};

// ===== JAVA METHOD DECLARATION EXTRACTION =====

/**
 * Java public method 선언 추출
 */
export const javaMethodDeclarations: QueryFunction<JavaMethodDeclarationResult> =
	{
		name: "java-method-declarations",
		description: "Extract Java public method declarations",
		query: "(method_declaration) @method",
		resultType: "java-method-declarations",
		languages: ["java"],
		priority: 80,
		processor: (
			matches: QueryMatch[],
			_context: QueryExecutionContext,
		): JavaMethodDeclarationResult[] => {
			return matches
				.map((match) => {
					const node = match.captures[0]?.node;
					if (!node) return null;
					return {
						queryName: "java-method-declarations",
						methodName: extractJavaMethodName(node),
						returnType: extractMethodReturnType(node),
						parameters: extractMethodParameters(node),
						isPublic: isPublicDeclaration(node),
						isStatic: isStaticMethod(node),
						isAbstract: isAbstractMethod(node),
						isFinal: isFinalMethod(node),
						location: extractLocation(node),
						nodeText: node.text,
					};
				})
				.filter(
					(result): result is JavaMethodDeclarationResult => result !== null,
				);
		},
	};

// ===== HELPER FUNCTIONS =====

/**
 * Java 클래스명 추출
 */
function extractJavaClassName(node: any): string {
	const text = node.text;
	const classMatch = text.match(/class\s+([A-Za-z_][A-Za-z0-9_]*)/);
	return classMatch ? classMatch[1] : "";
}

/**
 * Java 인터페이스명 추출
 */
function extractJavaInterfaceName(node: any): string {
	const text = node.text;
	const interfaceMatch = text.match(/interface\s+([A-Za-z_][A-Za-z0-9_]*)/);
	return interfaceMatch ? interfaceMatch[1] : "";
}

/**
 * Java enum명 추출
 */
function extractJavaEnumName(node: any): string {
	const text = node.text;
	const enumMatch = text.match(/enum\s+([A-Za-z_][A-Za-z0-9_]*)/);
	return enumMatch ? enumMatch[1] : "";
}

/**
 * Java 메서드명 추출
 */
function extractJavaMethodName(node: any): string {
	const text = node.text;
	// public static void main(String[] args) -> main
	const methodMatch = text.match(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
	return methodMatch ? methodMatch[1] : "";
}

/**
 * public 접근 제한자 확인
 */
function isPublicDeclaration(node: any): boolean {
	return node.text.includes("public");
}

/**
 * abstract 키워드 확인
 */
function isAbstractClass(node: any): boolean {
	return node.text.includes("abstract class");
}

/**
 * abstract method 확인
 */
function isAbstractMethod(node: any): boolean {
	return node.text.includes("abstract") && node.text.includes("(");
}

/**
 * final 키워드 확인
 */
function isFinalClass(node: any): boolean {
	return node.text.includes("final class");
}

/**
 * final method 확인
 */
function isFinalMethod(node: any): boolean {
	return node.text.includes("final") && node.text.includes("(");
}

/**
 * static method 확인
 */
function isStaticMethod(node: any): boolean {
	return node.text.includes("static") && node.text.includes("(");
}

/**
 * 상위 클래스 추출
 */
function extractSuperClass(node: any): string | undefined {
	const text = node.text;
	const extendsMatch = text.match(/extends\s+([A-Za-z_][A-Za-z0-9_]*)/);
	return extendsMatch ? extendsMatch[1] : undefined;
}

/**
 * 구현된 인터페이스들 추출
 */
function extractImplementedInterfaces(node: any): string[] {
	const text = node.text;
	const implementsMatch = text.match(/implements\s+([^{]+)/);

	if (!implementsMatch) return [];

	return implementsMatch[1]
		.split(",")
		.map((iface: string) => iface.trim())
		.filter((iface: string) => iface.length > 0);
}

/**
 * 확장된 인터페이스들 추출
 */
function extractExtendedInterfaces(node: any): string[] {
	const text = node.text;
	const extendsMatch = text.match(/extends\s+([^{]+)/);

	if (!extendsMatch) return [];

	return extendsMatch[1]
		.split(",")
		.map((iface: string) => iface.trim())
		.filter((iface: string) => iface.length > 0);
}

/**
 * enum 값들 추출
 */
function extractEnumValues(node: any): string[] {
	const text = node.text;
	const bodyMatch = text.match(/\{([^}]+)\}/);

	if (!bodyMatch) return [];

	return bodyMatch[1]
		.split(",")
		.map((value: string) => value.trim())
		.filter(
			(value: string) =>
				value.length > 0 && !value.includes("(") && !value.includes(";"),
		);
}

/**
 * 메서드 반환 타입 추출
 */
function extractMethodReturnType(node: any): string {
	const text = node.text;
	// public static void main -> void
	const typeMatch = text.match(
		/(?:public|private|protected)?\s*(?:static)?\s*(?:final)?\s*([A-Za-z_][A-Za-z0-9_<>[\]]*)\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/,
	);
	return typeMatch ? typeMatch[1] : "void";
}

/**
 * 메서드 매개변수들 추출
 */
function extractMethodParameters(node: any): string[] {
	const text = node.text;
	const paramMatch = text.match(/\(([^)]*)\)/);

	if (!paramMatch || !paramMatch[1].trim()) return [];

	return paramMatch[1]
		.split(",")
		.map((param: string) => param.trim())
		.filter((param: string) => param.length > 0);
}

// ===== EXPORTS =====
const javaExportQueries = {
	"java-class-declarations": javaClassDeclarations,
	"java-interface-declarations": javaInterfaceDeclarations,
	"java-enum-declarations": javaEnumDeclarations,
	"java-method-declarations": javaMethodDeclarations,
} as const;

export default javaExportQueries;
