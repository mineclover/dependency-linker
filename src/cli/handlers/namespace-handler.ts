import { TypeScriptParser } from "../../parsers/typescript/TypeScriptParser.js";
import { MarkdownParser } from "../../parsers/markdown/MarkdownParser.js";
import { RDFIntegratedGraphDatabase } from "../../database/RDFIntegratedGraphDatabase.js";
import { glob } from "glob";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

export class NamespaceHandler {
	private rdfDatabase: RDFIntegratedGraphDatabase;
	private tsParser: TypeScriptParser;
	private markdownParser: MarkdownParser;

	constructor() {
		this.rdfDatabase = new RDFIntegratedGraphDatabase("./dependency-linker.db");
		this.tsParser = new TypeScriptParser();
		this.markdownParser = new MarkdownParser();
	}

	/**
	 * Namespace 분석 수행
	 */
	async analyzeNamespaces(options: {
		pattern?: string;
		directory?: string;
		recursive?: boolean;
	}): Promise<void> {
		try {
			// 데이터베이스 초기화
			await this.rdfDatabase.initialize();

			// 파일 패턴 설정
			const pattern = options.pattern || "**/*.{ts,js,tsx,jsx,md}";
			const directory = options.directory || process.cwd();

			// 파일 목록 가져오기
			const files = await glob(pattern, {
				cwd: directory,
				absolute: true,
			});

			console.log(`📁 Found ${files.length} files to analyze`);

			// 각 파일 분석
			for (const filePath of files) {
				await this.analyzeFile(filePath);
			}

			console.log("✅ Namespace analysis completed");
		} catch (error) {
			console.error("❌ Namespace analysis failed:", error);
			throw error;
		}
	}

	/**
	 * 개별 파일 분석
	 */
	private async analyzeFile(filePath: string): Promise<void> {
		try {
			const sourceCode = readFileSync(filePath, "utf-8");
			const extension = extname(filePath).toLowerCase();

			// 파일 타입에 따른 파싱
			if (extension === ".md" || extension === ".markdown") {
				await this.parseMarkdownFile(filePath, sourceCode);
			} else if ([".ts", ".js", ".tsx", ".jsx"].includes(extension)) {
				await this.parseTypeScriptFile(filePath, sourceCode);
			}
		} catch (error) {
			console.error(`❌ Failed to analyze file ${filePath}:`, error);
		}
	}

	/**
	 * TypeScript 파일 파싱
	 */
	private async parseTypeScriptFile(
		filePath: string,
		sourceCode: string,
	): Promise<void> {
		try {
			const result = await this.tsParser.parse(sourceCode, {
				filePath,
			});

			// RDF 주소 생성 및 저장
			await this.createRDFAddresses(filePath, result);
		} catch (error) {
			console.error(`❌ TypeScript parsing failed for ${filePath}:`, error);
		}
	}

	/**
	 * Markdown 파일 파싱
	 */
	private async parseMarkdownFile(
		filePath: string,
		sourceCode: string,
	): Promise<void> {
		try {
			const result = await this.markdownParser.parse(sourceCode, {
				filePath,
			});

			// RDF 주소 생성 및 저장
			await this.createRDFAddresses(filePath, result);
		} catch (error) {
			console.error(`❌ Markdown parsing failed for ${filePath}:`, error);
		}
	}

	/**
	 * RDF 주소 생성 및 저장
	 */
	private async createRDFAddresses(
		filePath: string,
		parseResult: any,
	): Promise<void> {
		try {
			// 파일 경로에서 프로젝트명 추출
			const projectName = this.extractProjectName(filePath);

			// 파싱 결과에서 심볼 추출
			const symbols = this.extractSymbols(parseResult);

			// 각 심볼에 대해 RDF 주소 생성
			for (const symbol of symbols) {
				const rdfAddress = `${projectName}/${filePath}#${symbol.type}:${symbol.name}`;

				await this.rdfDatabase.storeRDFAddress({
					rdfAddress,
					projectName,
					filePath,
					nodeType: symbol.type as any,
					symbolName: symbol.name,
					namespace: projectName,
					localName: symbol.name,
					lineNumber: symbol.line || 1,
					columnNumber: symbol.column || 0,
					accessModifier: "public",
					isStatic: false,
					isAsync: false,
					isAbstract: false,
				});
			}
		} catch (error) {
			console.error(
				`❌ Failed to create RDF addresses for ${filePath}:`,
				error,
			);
		}
	}

	/**
	 * 프로젝트명 추출
	 */
	private extractProjectName(filePath: string): string {
		const parts = filePath.split("/");
		// 프로젝트 루트 디렉토리명을 프로젝트명으로 사용
		return parts[parts.length - 2] || "default-project";
	}

	/**
	 * 파싱 결과에서 심볼 추출
	 */
	private extractSymbols(parseResult: any): Array<{
		name: string;
		type: string;
		line?: number;
		column?: number;
	}> {
		const symbols: Array<{
			name: string;
			type: string;
			line?: number;
			column?: number;
		}> = [];

		// Tree-sitter AST에서 심볼 추출
		if (parseResult.tree && parseResult.tree.rootNode) {
			this.extractSymbolsFromNode(parseResult.tree.rootNode, symbols);
		}

		return symbols;
	}

	/**
	 * AST 노드에서 심볼 추출
	 */
	private extractSymbolsFromNode(
		node: any,
		symbols: Array<{
			name: string;
			type: string;
			line?: number;
			column?: number;
		}>,
	): void {
		if (!node) return;

		// 클래스 정의
		if (node.type === "class_declaration") {
			const nameNode = node.childForFieldName("name");
			if (nameNode) {
				symbols.push({
					name: nameNode.text,
					type: "Class",
					line: node.startPosition.row + 1,
					column: node.startPosition.column,
				});
			}
		}

		// 함수 정의
		if (node.type === "function_declaration") {
			const nameNode = node.childForFieldName("name");
			if (nameNode) {
				symbols.push({
					name: nameNode.text,
					type: "Function",
					line: node.startPosition.row + 1,
					column: node.startPosition.column,
				});
			}
		}

		// 인터페이스 정의
		if (node.type === "interface_declaration") {
			const nameNode = node.childForFieldName("name");
			if (nameNode) {
				symbols.push({
					name: nameNode.text,
					type: "Interface",
					line: node.startPosition.row + 1,
					column: node.startPosition.column,
				});
			}
		}

		// 변수 정의
		if (node.type === "variable_declaration") {
			const declarator = node.childForFieldName("declarator");
			if (declarator) {
				const nameNode = declarator.childForFieldName("name");
				if (nameNode) {
					symbols.push({
						name: nameNode.text,
						type: "Variable",
						line: node.startPosition.row + 1,
						column: node.startPosition.column,
					});
				}
			}
		}

		// 자식 노드들 재귀적으로 처리
		for (let i = 0; i < node.childCount; i++) {
			this.extractSymbolsFromNode(node.child(i), symbols);
		}
	}
}
