/**
 * Markdown RDF Integration
 * 마크다운 심볼을 RDF 형식으로 변환
 */

import * as path from "node:path";
import type { NodeType } from "../../core/RDFAddress";
import { createRDFAddress } from "../../core/RDFAddress";
import type { RDFSymbolExtractionResult } from "../../core/types";
import { MarkdownParser, type MarkdownSymbol } from "./MarkdownParser";

// ===== MARKDOWN RDF TYPES =====

/**
 * 마크다운 RDF 분석 결과
 */
export interface MarkdownRDFResult {
	/** 파일 경로 */
	filePath: string;
	/** 프로젝트 이름 */
	projectName: string;
	/** RDF 심볼들 */
	symbols: RDFSymbolExtractionResult[];
	/** 링크 관계 */
	relationships: MarkdownRelationship[];
	/** 통계 */
	statistics: {
		tagsByType: Record<string, number>;
		tagsByCategory: Record<string, number>;
		mostUsedTags: string[];
		totalSymbols: number;
		totalRelationships: number;
	};
	/** 에러 */
	errors: string[];
	/** 경고 */
	warnings: string[];
}

/**
 * 마크다운 관계
 */
export interface MarkdownRelationship {
	/** 소스 RDF 주소 */
	source: string;
	/** 타겟 RDF 주소 */
	target: string;
	/** 관계 타입 */
	type: "links_to" | "references" | "includes" | "defines";
	/** 관계 메타데이터 */
	metadata: {
		linkText?: string;
		anchorId?: string;
		filePath?: string;
		url?: string;
	};
}

// ===== MARKDOWN RDF INTEGRATION =====

/**
 * 마크다운 RDF 통합 클래스
 */
export class MarkdownRDFIntegration {
	private parser: MarkdownParser;

	constructor() {
		this.parser = new MarkdownParser();
	}

	/**
	 * 마크다운 파일을 RDF 형식으로 분석
	 */
	async analyzeMarkdownWithRDF(
		sourceCode: string,
		filePath: string,
		projectName: string,
	): Promise<MarkdownRDFResult> {
		// 마크다운 파싱
		const parseResult = await this.parser.parseMarkdown(sourceCode);

		// RDF 심볼 변환
		const rdfSymbols: RDFSymbolExtractionResult[] = [];
		const relationships: MarkdownRelationship[] = [];

		// 심볼을 RDF 형식으로 변환
		for (const symbol of parseResult.symbols) {
			const rdfSymbol = this.convertToRDFSymbol(symbol, projectName, filePath);
			if (rdfSymbol) {
				rdfSymbols.push(rdfSymbol);
			}
		}

		// 링크 관계 처리
		for (const link of parseResult.links) {
			const relationship = this.createLinkRelationship(
				link,
				filePath,
				projectName,
			);
			if (relationship) {
				relationships.push(relationship);
			}
		}

		// 통계 계산
		const statistics = this.calculateStatistics(rdfSymbols, relationships);

		return {
			filePath,
			projectName,
			symbols: rdfSymbols,
			relationships,
			statistics,
			errors: [],
			warnings: [],
		};
	}

	/**
	 * 링크 관계 생성
	 */
	private createLinkRelationship(
		link: any,
		filePath: string,
		projectName: string,
	): MarkdownRelationship | null {
		try {
			const sourceRDF = createRDFAddress({
				nodeType: "Section",
				projectName,
				filePath,
				symbolName: path.basename(filePath),
			});

			let targetRDF: string;
			let relationshipType: "links_to" | "references" | "includes" | "defines";

			if (link.url && link.url.startsWith("http")) {
				// 외부 링크
				targetRDF = link.url;
				relationshipType = "links_to";
			} else if (link.url && link.url.startsWith("#")) {
				// 앵커 링크
				targetRDF = createRDFAddress({
					nodeType: "Heading",
					projectName,
					filePath,
					symbolName: link.url.substring(1),
				});
				relationshipType = "references";
			} else if (link.url) {
				// 내부 파일 링크
				targetRDF = createRDFAddress({
					nodeType: "Section",
					projectName,
					filePath: link.url,
					symbolName: path.basename(link.url),
				});
				relationshipType = "links_to";
			} else {
				return null;
			}

			return {
				source: sourceRDF,
				target: targetRDF,
				type: relationshipType,
				metadata: {
					linkText: link.text || "",
					url: link.url || "",
					filePath:
						link.url &&
						!link.url.startsWith("http") &&
						!link.url.startsWith("#")
							? link.url
							: undefined,
					anchorId:
						link.url && link.url.startsWith("#")
							? link.url.substring(1)
							: undefined,
				},
			};
		} catch (error) {
			console.warn(`Failed to create link relationship: ${error}`);
			return null;
		}
	}

	/**
	 * 마크다운 심볼을 RDF 심볼로 변환
	 */
	private convertToRDFSymbol(
		symbol: MarkdownSymbol,
		projectName: string,
		filePath: string,
	): RDFSymbolExtractionResult | null {
		try {
			// NodeType 매핑
			const nodeType = this.mapMarkdownTypeToNodeType(symbol.type);

			// RDF 주소 생성
			const rdfAddress = createRDFAddress({
				projectName,
				filePath,
				nodeType: nodeType as any,
				symbolName: symbol.name,
			});

			// 네임스페이스 추출
			const { namespace, localName } = this.extractNamespace(symbol.name);

			return {
				rdfAddress,
				nodeType,
				symbolName: symbol.name,
				namespace: namespace || undefined,
				localName: localName || symbol.name,
				metadata: {
					accessModifier: "public",
					isStatic: false,
					isAsync: false,
					isAbstract: false,
					lineNumber: symbol.location.line,
					columnNumber: symbol.location.column,
					...symbol.metadata,
					level: symbol.level,
					anchorId: symbol.anchorId,
					url: symbol.url,
				} as any,
			};
		} catch (_error) {
			return null;
		}
	}

	/**
	 * 마크다운 타입을 NodeType으로 매핑
	 */
	private mapMarkdownTypeToNodeType(markdownType: string): NodeType {
		switch (markdownType) {
			case "heading":
				return "Class";
			case "link":
				return "Method";
			case "image":
				return "Property";
			case "code_block":
				return "Function";
			case "inline_code":
				return "Variable";
			case "list_item":
				return "Interface";
			case "table":
				return "Type";
			case "blockquote":
				return "Enum";
			case "reference":
				return "Enum";
			default:
				return "Class";
		}
	}

	/**
	 * 네임스페이스 추출
	 */
	private extractNamespace(symbolName: string): {
		namespace?: string;
		localName: string;
	} {
		// 마크다운에서는 일반적으로 네임스페이스가 없음
		// 하지만 heading의 경우 계층 구조를 네임스페이스로 사용할 수 있음
		const parts = symbolName.split("/");
		if (parts.length > 1) {
			return {
				namespace: parts.slice(0, -1).join("/"),
				localName: parts[parts.length - 1],
			};
		}
		return { localName: symbolName };
	}

	/**
	 * 통계 계산
	 */
	private calculateStatistics(
		symbols: RDFSymbolExtractionResult[],
		relationships: MarkdownRelationship[],
	) {
		const tagsByType: Record<string, number> = {};
		const tagsByCategory: Record<string, number> = {};
		const mostUsedTags: string[] = [];

		// 심볼별 타입 통계
		for (const symbol of symbols) {
			const nodeType = symbol.nodeType || "Unknown";
			tagsByType[nodeType] = (tagsByType[nodeType] || 0) + 1;
		}

		// 관계별 카테고리 통계
		for (const relationship of relationships) {
			const category = relationship.type;
			tagsByCategory[category] = (tagsByCategory[category] || 0) + 1;
		}

		// 가장 많이 사용된 태그 (타입별)
		const sortedTypes = Object.entries(tagsByType)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5)
			.map(([type]) => type);
		mostUsedTags.push(...sortedTypes);

		return {
			tagsByType,
			tagsByCategory,
			mostUsedTags,
			totalSymbols: symbols.length,
			totalRelationships: relationships.length,
		};
	}
}
