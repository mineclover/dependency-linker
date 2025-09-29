/**
 * Java Parser Module
 * Java 파싱 모듈 메인 익스포트
 */

export { JavaParser } from "./JavaParser";

// 편의 함수들
import JavaParser from "./JavaParser";

/**
 * Java 파서 인스턴스 생성
 */
export function createJavaParser(): JavaParser {
	return new JavaParser();
}

/**
 * Java 소스 코드 빠른 파싱
 */
export async function parseJava(sourceCode: string, filePath?: string) {
	const parser = new JavaParser();
	return parser.parse(sourceCode, { filePath });
}

/**
 * Java 파일 빠른 파싱
 */
export async function parseJavaFile(filePath: string) {
	const parser = new JavaParser();
	return parser.parseFile(filePath);
}
