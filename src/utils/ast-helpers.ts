/**
 * AST Helper Functions
 * Tree-sitter 네이티브 객체용 헬퍼 함수들
 */

import type Parser from "tree-sitter";
import type { ExtendedSourceLocation } from "../core/types";

/**
 * Tree-sitter SyntaxNode에서 위치 정보 추출
 */
export function extractLocation(
	node: Parser.SyntaxNode,
): ExtendedSourceLocation {
	return {
		line: node.startPosition.row + 1, // tree-sitter는 0-based, 우리는 1-based
		column: node.startPosition.column + 1,
		offset: node.startIndex,
		endLine: node.endPosition.row + 1,
		endColumn: node.endPosition.column + 1,
		endOffset: node.endIndex,
	};
}

/**
 * 노드에서 텍스트 추출 (간단한 wrapper)
 */
export function extractNodeText(node: Parser.SyntaxNode): string {
	return node.text;
}

/**
 * 특정 타입의 자식 노드 찾기
 */
export function findChildByType(
	node: Parser.SyntaxNode,
	type: string,
): Parser.SyntaxNode | null {
	for (let i = 0; i < node.childCount; i++) {
		const child = node.child(i);
		if (child && child.type === type) {
			return child;
		}
	}
	return null;
}

/**
 * 특정 타입의 모든 자식 노드 찾기
 */
export function findChildrenByType(
	node: Parser.SyntaxNode,
	type: string,
): Parser.SyntaxNode[] {
	const results: Parser.SyntaxNode[] = [];
	for (let i = 0; i < node.childCount; i++) {
		const child = node.child(i);
		if (child && child.type === type) {
			results.push(child);
		}
	}
	return results;
}

/**
 * 노드에서 특정 필드의 자식 노드 찾기
 */
export function getChildForField(
	node: Parser.SyntaxNode,
	fieldName: string,
): Parser.SyntaxNode | null {
	return node.childForFieldName(fieldName);
}
