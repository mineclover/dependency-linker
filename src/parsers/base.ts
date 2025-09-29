/**
 * Base Parser Interface
 * 모든 언어 파서의 공통 인터페이스
 */

import type Parser from "tree-sitter";
import type {
	QueryExecutionContext,
	SupportedLanguage,
} from "../core/types";

export interface ParserOptions {
	/** 파일 경로 (선택적) */
	filePath?: string;
	/** 파싱 옵션 */
	parseOptions?: Record<string, any>;
}

export interface ParseResult {
	/** 파싱된 tree-sitter Tree 객체 */
	tree: Parser.Tree;
	/** 실행 컨텍스트 */
	context: QueryExecutionContext;
	/** 파싱 메타데이터 */
	metadata: {
		language: SupportedLanguage;
		filePath?: string;
		parseTime: number;
		nodeCount: number;
	};
}

/**
 * 언어별 파서 공통 인터페이스
 */
export abstract class BaseParser {
	protected abstract language: SupportedLanguage;
	protected abstract fileExtensions: string[];

	/**
	 * 소스 코드 파싱
	 */
	abstract parse(
		sourceCode: string,
		options?: ParserOptions,
	): Promise<ParseResult>;

	/**
	 * 파일 파싱
	 */
	abstract parseFile(
		filePath: string,
		options?: ParserOptions,
	): Promise<ParseResult>;

	/**
	 * 언어 지원 확인
	 */
	supportsFile(filePath: string): boolean {
		const extension = this.getFileExtension(filePath);
		return this.fileExtensions.includes(extension);
	}

	/**
	 * 언어 정보 조회
	 */
	getLanguage(): SupportedLanguage {
		return this.language;
	}

	/**
	 * 지원 파일 확장자 조회
	 */
	getSupportedExtensions(): string[] {
		return [...this.fileExtensions];
	}

	/**
	 * 파일 확장자 추출
	 */
	protected getFileExtension(filePath: string): string {
		const match = filePath.match(/\.([^.]+)$/);
		return match ? match[1] : "";
	}

	/**
	 * 노드 수 계산 (tree-sitter 노드에서 직접)
	 */
	protected countTreeSitterNodes(node: Parser.SyntaxNode): number {
		let count = 1;
		for (let i = 0; i < node.childCount; i++) {
			count += this.countTreeSitterNodes(node.child(i)!);
		}
		return count;
	}
}

/**
 * 파서 팩토리 인터페이스
 */
export interface ParserFactory {
	/**
	 * 언어별 파서 생성
	 */
	createParser(language: SupportedLanguage): BaseParser;

	/**
	 * 파일 경로로 파서 자동 선택
	 */
	createParserForFile(filePath: string): BaseParser | null;

	/**
	 * 지원되는 언어 목록
	 */
	getSupportedLanguages(): SupportedLanguage[];
}
