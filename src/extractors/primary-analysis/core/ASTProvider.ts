/**
 * AST Provider - Standardized AST Generation Interface
 * 표준화된 AST 생성 인터페이스
 *
 * 목적:
 * - 언어별 Tree-sitter 파서를 표준화된 인터페이스로 통합
 * - AST 생성 과정의 일관성 보장
 * - 타입 안전한 AST 처리 환경 제공
 */

import type Parser from "tree-sitter";

/**
 * 지원되는 언어 타입
 */
export type SupportedLanguage = "typescript" | "tsx" | "javascript" | "jsx";

/**
 * AST 생성 설정
 */
export interface ASTGenerationOptions {
	/** 파일 경로 */
	filePath: string;
	/** 언어 타입 (자동 감지 시 undefined) */
	language?: SupportedLanguage;
	/** 인코딩 (기본값: utf8) */
	encoding?: string;
	/** 에러 허용 여부 */
	tolerateErrors?: boolean;
}

/**
 * AST 생성 결과
 */
export interface ASTGenerationResult {
	/** 생성된 AST */
	ast: Parser.Tree;
	/** 사용된 언어 */
	language: SupportedLanguage;
	/** 사용된 Grammar */
	grammar: Parser.Language;
	/** 소스 코드 */
	sourceCode: string;
	/** 생성 시간 (ms) */
	generationTime: number;
	/** 에러 여부 */
	hasErrors: boolean;
	/** 에러 목록 */
	errors: Parser.SyntaxError[];
}

/**
 * AST 제공자 인터페이스
 */
export interface IASTProvider {
	/** 지원 언어 목록 */
	readonly supportedLanguages: readonly SupportedLanguage[];

	/**
	 * 파일에서 AST 생성
	 */
	generateFromFile(filePath: string, options?: Partial<ASTGenerationOptions>): Promise<ASTGenerationResult>;

	/**
	 * 소스 코드에서 AST 생성
	 */
	generateFromSource(
		sourceCode: string,
		language: SupportedLanguage,
		options?: Partial<ASTGenerationOptions>
	): ASTGenerationResult;

	/**
	 * 언어 자동 감지
	 */
	detectLanguage(filePath: string): SupportedLanguage;

	/**
	 * 언어 지원 여부 확인
	 */
	isLanguageSupported(language: string): language is SupportedLanguage;
}

/**
 * 언어별 파서 팩토리
 */
export interface ILanguageParserFactory {
	/**
	 * 언어별 파서 생성
	 */
	createParser(language: SupportedLanguage): Parser;

	/**
	 * 언어별 Grammar 반환
	 */
	getGrammar(language: SupportedLanguage): Parser.Language;

	/**
	 * 파서 캐시 관리
	 */
	clearCache(): void;
}

/**
 * Tree-sitter 기반 AST 제공자 구현
 */
export class TreeSitterASTProvider implements IASTProvider {
	public readonly supportedLanguages: readonly SupportedLanguage[] = [
		"typescript",
		"tsx",
		"javascript",
		"jsx"
	] as const;

	private parserFactory: ILanguageParserFactory;

	constructor(parserFactory: ILanguageParserFactory) {
		this.parserFactory = parserFactory;
	}

	/**
	 * 파일에서 AST 생성
	 */
	async generateFromFile(
		filePath: string,
		options: Partial<ASTGenerationOptions> = {}
	): Promise<ASTGenerationResult> {
		const fs = await import("fs/promises");
		const sourceCode = await fs.readFile(filePath, { encoding: options.encoding || "utf8" });

		const language = options.language || this.detectLanguage(filePath);

		return this.generateFromSource(sourceCode, language, {
			...options,
			filePath,
		});
	}

	/**
	 * 소스 코드에서 AST 생성
	 */
	generateFromSource(
		sourceCode: string,
		language: SupportedLanguage,
		options: Partial<ASTGenerationOptions> = {}
	): ASTGenerationResult {
		const startTime = performance.now();

		if (!this.isLanguageSupported(language)) {
			throw new Error(`Unsupported language: ${language}`);
		}

		const parser = this.parserFactory.createParser(language);
		const grammar = this.parserFactory.getGrammar(language);

		const ast = parser.parse(sourceCode);
		const endTime = performance.now();

		// 에러 수집
		const errors: Parser.SyntaxError[] = [];
		this.collectSyntaxErrors(ast.rootNode, errors);

		const hasErrors = errors.length > 0;
		if (hasErrors && !options.tolerateErrors) {
			console.warn(`AST generation has ${errors.length} syntax errors for ${options.filePath || 'source'}`);
		}

		return {
			ast,
			language,
			grammar,
			sourceCode,
			generationTime: endTime - startTime,
			hasErrors,
			errors,
		};
	}

	/**
	 * 언어 자동 감지
	 */
	detectLanguage(filePath: string): SupportedLanguage {
		const extension = filePath.split('.').pop()?.toLowerCase();

		switch (extension) {
			case 'ts':
				return 'typescript';
			case 'tsx':
				return 'tsx';
			case 'js':
				return 'javascript';
			case 'jsx':
				return 'jsx';
			default:
				// 기본값으로 TypeScript 사용
				return 'typescript';
		}
	}

	/**
	 * 언어 지원 여부 확인
	 */
	isLanguageSupported(language: string): language is SupportedLanguage {
		return this.supportedLanguages.includes(language as SupportedLanguage);
	}

	/**
	 * 구문 에러 수집
	 */
	private collectSyntaxErrors(node: Parser.SyntaxNode, errors: Parser.SyntaxError[]): void {
		if (node.hasError) {
			if (node.type === "ERROR") {
				errors.push({
					message: `Syntax error at ${node.startPosition.row}:${node.startPosition.column}`,
					location: node.startPosition,
					length: node.endPosition.column - node.startPosition.column,
				} as Parser.SyntaxError);
			}
		}

		// 자식 노드 재귀 검사
		for (const child of node.children) {
			this.collectSyntaxErrors(child, errors);
		}
	}
}

/**
 * Language Parser Factory 구현
 */
export class LanguageParserFactory implements ILanguageParserFactory {
	private parsers = new Map<SupportedLanguage, Parser>();
	private grammars = new Map<SupportedLanguage, Parser.Language>();

	/**
	 * 언어별 파서 생성
	 */
	createParser(language: SupportedLanguage): Parser {
		if (!this.parsers.has(language)) {
			const Parser = require("tree-sitter");
			const parser = new Parser();

			const grammar = this.getGrammar(language);
			parser.setLanguage(grammar);

			this.parsers.set(language, parser);
		}

		return this.parsers.get(language)!;
	}

	/**
	 * 언어별 Grammar 반환
	 */
	getGrammar(language: SupportedLanguage): Parser.Language {
		if (!this.grammars.has(language)) {
			let grammar: Parser.Language;

			switch (language) {
				case 'typescript':
				case 'tsx':
					grammar = require("tree-sitter-typescript").typescript;
					break;
				case 'javascript':
				case 'jsx':
					grammar = require("tree-sitter-javascript");
					break;
				default:
					throw new Error(`Grammar not found for language: ${language}`);
			}

			this.grammars.set(language, grammar);
		}

		return this.grammars.get(language)!;
	}

	/**
	 * 파서 캐시 관리
	 */
	clearCache(): void {
		this.parsers.clear();
		this.grammars.clear();
	}
}

/**
 * AST Provider Factory - 싱글톤 패턴
 */
export class ASTProviderFactory {
	private static instance: TreeSitterASTProvider;

	/**
	 * AST Provider 인스턴스 반환
	 */
	static getInstance(): TreeSitterASTProvider {
		if (!this.instance) {
			const parserFactory = new LanguageParserFactory();
			this.instance = new TreeSitterASTProvider(parserFactory);
		}
		return this.instance;
	}

	/**
	 * 새로운 AST Provider 생성
	 */
	static create(parserFactory?: ILanguageParserFactory): TreeSitterASTProvider {
		const factory = parserFactory || new LanguageParserFactory();
		return new TreeSitterASTProvider(factory);
	}
}