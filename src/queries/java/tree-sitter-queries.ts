/**
 * Java Tree-sitter Query Strings
 * Tree-sitter 쿼리 문자열 정의 (실제 Java AST 패턴 매칭용)
 */

/**
 * Java Tree-sitter 쿼리 문자열들
 */
export const JAVA_TREE_SITTER_QUERIES = {
	// ===== IMPORT QUERIES =====

	/**
	 * Import sources (모든 import 문의 소스 경로)
	 * 예: import java.util.List → java.util.List
	 */
	"java-import-sources": `
		(import_declaration
			(scoped_identifier) @source)
	`,

	/**
	 * Import statements (전체 import 문)
	 * 예: import java.util.*
	 */
	"java-import-statements": `
		(import_declaration) @import
	`,

	/**
	 * Static imports (정적 임포트)
	 * 예: import static java.lang.Math.PI
	 */
	"java-static-imports": `
		(import_declaration
			"static"
			(scoped_identifier) @static_import)
	`,

	/**
	 * Wildcard imports (와일드카드 임포트)
	 * 예: import java.util.*
	 */
	"java-wildcard-imports": `
		(import_declaration
			(asterisk) @wildcard_import)
	`,

	// ===== DECLARATION QUERIES =====

	/**
	 * Class declarations (클래스 선언)
	 * 예: public class MyClass extends BaseClass
	 */
	"java-class-declarations": `
		(class_declaration
			name: (identifier) @class_name
			superclass: (superclass (type_identifier) @superclass)?
			interfaces: (super_interfaces (interface_type_list (type_identifier) @interface))*
			body: (class_body) @class_body)
	`,

	/**
	 * Interface declarations (인터페이스 선언)
	 * 예: public interface MyInterface extends BaseInterface
	 */
	"java-interface-declarations": `
		(interface_declaration
			name: (identifier) @interface_name
			extends: (extends_interfaces (interface_type_list (type_identifier) @extends))*
			body: (interface_body) @interface_body)
	`,

	/**
	 * Method declarations (메서드 선언)
	 * 예: public void myMethod(String param)
	 */
	"java-method-declarations": `
		(method_declaration
			type: (type_identifier) @return_type
			name: (identifier) @method_name
			parameters: (formal_parameters) @parameters
			body: (block)? @method_body)
	`,

	/**
	 * Enum declarations (열거형 선언)
	 * 예: public enum Color { RED, GREEN, BLUE }
	 */
	"java-enum-declarations": `
		(enum_declaration
			name: (identifier) @enum_name
			body: (enum_body) @enum_body)
	`,

} as const;

/**
 * Java의 모든 Tree-sitter 쿼리 가져오기
 */
export function getJavaTreeSitterQueries(): Record<string, string> {
	return JAVA_TREE_SITTER_QUERIES;
}

/**
 * 특정 Java 쿼리 가져오기
 */
export function getJavaTreeSitterQuery(queryName: string): string | undefined {
	return JAVA_TREE_SITTER_QUERIES[queryName as keyof typeof JAVA_TREE_SITTER_QUERIES];
}

/**
 * 모든 Java 쿼리 이름 목록
 */
export function getAllJavaQueryNames(): string[] {
	return Object.keys(JAVA_TREE_SITTER_QUERIES);
}