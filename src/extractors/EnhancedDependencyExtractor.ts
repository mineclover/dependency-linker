/**
 * Enhanced Dependency Extractor
 * Named import 사용 메서드까지 분석하는 확장된 의존성 추출기
 */

import type Parser from "tree-sitter";
import type { SourceLocation } from "../models/SourceLocation";
import type { DependencyExtractionResult } from "./DependencyExtractor";
import { DependencyExtractor } from "./DependencyExtractor";
import type { AST } from "./IDataExtractor";

/**
 * 확장된 의존성 정보 - 사용된 메서드 포함
 */
export interface EnhancedDependencyInfo {
	/** 기본 의존성 정보 */
	source: string;
	type: "external" | "internal" | "relative";
	location?: SourceLocation;
	isTypeOnly?: boolean;

	/** 확장 정보 - Named Import 분석 */
	importedNames?: string[]; // 임포트된 named 항목들
	usedMethods?: UsedMethodInfo[]; // 실제 코드에서 사용된 메서드들
	unusedImports?: string[]; // 임포트했지만 사용하지 않은 항목들
	usageCount?: number; // 총 사용 횟수
	usageLocations?: SourceLocation[]; // 사용된 위치들
}

/**
 * 사용된 메서드 정보
 */
export interface UsedMethodInfo {
	methodName: string; // 메서드명
	originalName?: string; // 별칭 사용 시 원본명
	usageType: "call" | "property" | "reference"; // 사용 형태
	locations: SourceLocation[]; // 사용된 모든 위치
	callCount: number; // 호출 횟수
	contextInfo?: {
		// 사용 컨텍스트
		parentFunction?: string;
		isInCondition?: boolean;
		isInLoop?: boolean;
		callArguments?: string[]; // 호출 시 인자 정보
	};
}

/**
 * 확장된 의존성 추출 결과
 */
export interface EnhancedDependencyExtractionResult
	extends DependencyExtractionResult {
	enhancedDependencies: EnhancedDependencyInfo[];
	usageAnalysis: {
		totalImports: number;
		usedImports: number;
		unusedImports: number;
		mostUsedMethods: Array<{ method: string; count: number; source: string }>;
		unusedImportsList: Array<{ source: string; unusedItems: string[] }>;
	};
}

/**
 * 확장된 의존성 추출기
 */
export class EnhancedDependencyExtractor extends DependencyExtractor {
	private importMap: Map<string, { source: string; originalName: string }> =
		new Map();
	private usageMap: Map<string, UsedMethodInfo> = new Map();

	/**
	 * 확장된 의존성 추출
	 */
	extractEnhanced(
		ast: AST,
		filePath: string,
	): EnhancedDependencyExtractionResult {
		// 기본 추출 실행
		const baseResult = this.extract(ast, filePath);

		// 확장 분석 초기화
		this.importMap.clear();
		this.usageMap.clear();

		const tree = ast as Parser.Tree;
		// const cursor = tree.rootNode.walk(); // Future use for tree-sitter queries

		// 1단계: Import 문 분석 (named import 매핑)
		this.analyzeImports(tree.rootNode);

		// 2단계: 코드 사용 분석
		this.analyzeUsage(tree.rootNode);

		// 3단계: 결과 통합
		const enhancedDependencies = this.buildEnhancedDependencies(
			baseResult.dependencies,
		);
		const usageAnalysis = this.buildUsageAnalysis(enhancedDependencies);

		return {
			...baseResult,
			enhancedDependencies,
			usageAnalysis,
		};
	}

	/**
	 * Import 문 분석하여 매핑 테이블 구축
	 */
	private analyzeImports(rootNode: Parser.SyntaxNode): void {
		// Future: tree-sitter query for import analysis
		// const query = `(import_statement ...)`;  // Reserved for tree-sitter query implementation

		this.traverseNode(rootNode, (node) => {
			if (node.type === "import_statement") {
				this.processImportStatement(node);
			}
		});
	}

	/**
	 * Import 문 처리
	 */
	private processImportStatement(node: Parser.SyntaxNode): void {
		const sourceNode = node.childForFieldName("source");
		if (!sourceNode) return;

		const source = this.extractStringFromNode(sourceNode);
		const importClause = node.childForFieldName("import");
		if (!importClause) return;

		if (importClause.type === "named_imports") {
			this.processNamedImports(importClause, source);
		} else if (importClause.type === "namespace_import") {
			const alias = importClause.childForFieldName("alias");
			if (alias) {
				this.importMap.set(alias.text, { source, originalName: "*" });
			}
		} else if (importClause.type === "identifier") {
			// Default import
			this.importMap.set(importClause.text, {
				source,
				originalName: "default",
			});
		}
	}

	/**
	 * Named Import 처리
	 */
	private processNamedImports(
		namedImportsNode: Parser.SyntaxNode,
		source: string,
	): void {
		for (let i = 0; i < namedImportsNode.childCount; i++) {
			const child = namedImportsNode.child(i);
			if (child?.type === "import_specifier") {
				const name = child.childForFieldName("name");
				const alias = child.childForFieldName("alias");

				if (name) {
					const localName = alias ? alias.text : name.text;
					const originalName = name.text;

					this.importMap.set(localName, { source, originalName });
				}
			}
		}
	}

	/**
	 * 코드에서 사용된 메서드 분석
	 */
	private analyzeUsage(rootNode: Parser.SyntaxNode): void {
		this.traverseNode(rootNode, (node) => {
			this.analyzeNodeUsage(node);
		});
	}

	/**
	 * 노드별 사용 분석
	 */
	private analyzeNodeUsage(node: Parser.SyntaxNode): void {
		switch (node.type) {
			case "call_expression":
				this.analyzeCallExpression(node);
				break;
			case "member_expression":
				this.analyzeMemberExpression(node);
				break;
			case "identifier":
				this.analyzeIdentifierUsage(node);
				break;
		}
	}

	/**
	 * 함수 호출 분석
	 */
	private analyzeCallExpression(node: Parser.SyntaxNode): void {
		const functionNode = node.childForFieldName("function");
		if (!functionNode) return;

		let methodName: string;
		let importInfo: { source: string; originalName: string } | undefined;

		if (functionNode.type === "identifier") {
			// 직접 호출: foo()
			methodName = functionNode.text;
			importInfo = this.importMap.get(methodName);
		} else if (functionNode.type === "member_expression") {
			// 메서드 호출: obj.method()
			const property = functionNode.childForFieldName("property");
			const object = functionNode.childForFieldName("object");

			if (property && object) {
				methodName = property.text;
				const objectName = object.text;
				importInfo = this.importMap.get(objectName);

				// namespace import의 경우 (예: utils.format())
				if (importInfo) {
					methodName = `${objectName}.${methodName}`;
				}
			} else {
				return;
			}
		} else {
			return;
		}

		if (importInfo) {
			this.recordUsage(
				methodName,
				importInfo,
				{
					line: node.startPosition.row + 1,
					column: node.startPosition.column + 1,
					offset: node.startPosition.column,
				},
				"call",
				{
					callArguments: this.extractCallArguments(node),
				},
			);
		}
	}

	/**
	 * 멤버 접근 분석
	 */
	private analyzeMemberExpression(node: Parser.SyntaxNode): void {
		const object = node.childForFieldName("object");
		const property = node.childForFieldName("property");

		if (object && property) {
			const objectName = object.text;
			const propertyName = property.text;
			const importInfo = this.importMap.get(objectName);

			if (importInfo) {
				const memberName = `${objectName}.${propertyName}`;
				this.recordUsage(
					memberName,
					importInfo,
					{
						line: node.startPosition.row + 1,
						column: node.startPosition.column + 1,
						offset: node.startPosition.column,
					},
					"property",
				);
			}
		}
	}

	/**
	 * 식별자 사용 분석
	 */
	private analyzeIdentifierUsage(node: Parser.SyntaxNode): void {
		const identifierName = node.text;
		const importInfo = this.importMap.get(identifierName);

		if (importInfo) {
			// 함수 호출이나 멤버 접근이 아닌 일반 참조
			const parent = node.parent;
			if (
				parent &&
				parent.type !== "call_expression" &&
				parent.type !== "member_expression"
			) {
				this.recordUsage(
					identifierName,
					importInfo,
					{
						line: node.startPosition.row + 1,
						column: node.startPosition.column + 1,
						offset: node.startPosition.column,
					},
					"reference",
				);
			}
		}
	}

	/**
	 * 사용 기록
	 */
	private recordUsage(
		methodName: string,
		importInfo: { source: string; originalName: string },
		location: SourceLocation,
		usageType: "call" | "property" | "reference",
		contextInfo?: any,
	): void {
		const key = `${importInfo.source}::${methodName}`;

		if (!this.usageMap.has(key)) {
			this.usageMap.set(key, {
				methodName,
				originalName: importInfo.originalName,
				usageType,
				locations: [],
				callCount: 0,
				contextInfo,
			});
		}

		const usage = this.usageMap.get(key);
		if (!usage) return;
		usage.locations.push(location);
		usage.callCount++;

		if (contextInfo) {
			usage.contextInfo = { ...usage.contextInfo, ...contextInfo };
		}
	}

	/**
	 * 함수 호출 인자 추출
	 */
	private extractCallArguments(callNode: Parser.SyntaxNode): string[] {
		const args: string[] = [];
		const argumentsNode = callNode.childForFieldName("arguments");

		if (argumentsNode) {
			for (let i = 0; i < argumentsNode.childCount; i++) {
				const arg = argumentsNode.child(i);
				if (arg && arg.type !== "," && arg.type !== "(" && arg.type !== ")") {
					args.push(arg.text);
				}
			}
		}

		return args;
	}

	/**
	 * 확장된 의존성 정보 구축
	 */
	private buildEnhancedDependencies(
		baseDependencies: any[],
	): EnhancedDependencyInfo[] {
		const enhanced: EnhancedDependencyInfo[] = [];

		for (const dep of baseDependencies) {
			const importedNames: string[] = [];
			const usedMethods: UsedMethodInfo[] = [];
			const usageLocations: SourceLocation[] = [];
			let usageCount = 0;

			// 해당 소스의 import 찾기
			for (const [localName, importInfo] of this.importMap.entries()) {
				if (importInfo.source === dep.source) {
					importedNames.push(localName);
				}
			}

			// 해당 소스의 사용 찾기
			for (const [key, usage] of this.usageMap.entries()) {
				const [source] = key.split("::");
				if (source === dep.source) {
					usedMethods.push(usage);
					usageLocations.push(...usage.locations);
					usageCount += usage.callCount;
				}
			}

			// 사용하지 않은 import 찾기
			const usedLocalNames = new Set(
				usedMethods.map((m) => m.methodName.split(".")[0]),
			);
			const unusedImports = importedNames.filter(
				(name) => !usedLocalNames.has(name),
			);

			enhanced.push({
				...dep,
				importedNames,
				usedMethods,
				unusedImports,
				usageCount,
				usageLocations,
			});
		}

		return enhanced;
	}

	/**
	 * 사용 분석 통계 구축
	 */
	private buildUsageAnalysis(enhancedDependencies: EnhancedDependencyInfo[]) {
		const totalImports = enhancedDependencies.reduce(
			(sum, dep) => sum + (dep.importedNames?.length || 0),
			0,
		);
		const usedImports = enhancedDependencies.reduce(
			(sum, dep) => sum + (dep.usedMethods?.length || 0),
			0,
		);
		const unusedImports = totalImports - usedImports;

		// 가장 많이 사용된 메서드 찾기
		const methodUsageMap = new Map<string, { count: number; source: string }>();

		for (const dep of enhancedDependencies) {
			if (dep.usedMethods) {
				for (const method of dep.usedMethods) {
					const key = method.methodName;
					const existing = methodUsageMap.get(key);
					if (existing) {
						existing.count += method.callCount;
					} else {
						methodUsageMap.set(key, {
							count: method.callCount,
							source: dep.source,
						});
					}
				}
			}
		}

		const mostUsedMethods = Array.from(methodUsageMap.entries())
			.map(([method, info]) => ({
				method,
				count: info.count,
				source: info.source,
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		// 사용하지 않은 imports 목록
		const unusedImportsList = enhancedDependencies
			.filter((dep) => dep.unusedImports && dep.unusedImports.length > 0)
			.map((dep) => ({
				source: dep.source,
				unusedItems: dep.unusedImports || [],
			}));

		return {
			totalImports,
			usedImports,
			unusedImports,
			mostUsedMethods,
			unusedImportsList,
		};
	}

	/**
	 * 노드 순회 헬퍼
	 */
	private traverseNode(
		node: Parser.SyntaxNode,
		callback: (node: Parser.SyntaxNode) => void,
	): void {
		callback(node);

		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (child) {
				this.traverseNode(child, callback);
			}
		}
	}

	/**
	 * 문자열 리터럴 추출 (새로운 메서드)
	 */
	private extractStringFromNode(node: Parser.SyntaxNode): string {
		const text = node.text;
		if (text.startsWith('"') && text.endsWith('"')) {
			return text.slice(1, -1);
		}
		if (text.startsWith("'") && text.endsWith("'")) {
			return text.slice(1, -1);
		}
		if (text.startsWith("`") && text.endsWith("`")) {
			return text.slice(1, -1);
		}
		return text;
	}
}
