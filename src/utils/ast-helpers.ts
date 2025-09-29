/**
 * AST Helper Functions
 * AST 조작 및 분석을 위한 헬퍼 함수들
 */

import type { ASTNode, ExtendedSourceLocation } from "../core/types";

// ===== LOCATION UTILITIES =====

/**
 * AST 노드에서 확장된 소스 위치 정보 추출
 */
export function extractLocation(node: ASTNode): ExtendedSourceLocation {
	return {
		line: node.startPosition.row + 1,
		column: node.startPosition.column,
		offset: 0, // 추후 계산 필요
		endLine: node.endPosition.row + 1,
		endColumn: node.endPosition.column,
		endOffset: 0, // 추후 계산 필요
	};
}

/**
 * 소스 코드에서 실제 오프셋 계산
 */
export function calculateOffsets(
	sourceCode: string,
	location: ExtendedSourceLocation,
): ExtendedSourceLocation {
	const lines = sourceCode.split("\n");

	let offset = 0;
	for (let i = 0; i < location.line - 1; i++) {
		offset += lines[i].length + 1; // +1 for newline
	}
	offset += location.column;

	let endOffset = 0;
	for (let i = 0; i < location.endLine - 1; i++) {
		endOffset += lines[i].length + 1;
	}
	endOffset += location.endColumn;

	return {
		...location,
		offset,
		endOffset,
	};
}

// ===== STRING UTILITIES =====

/**
 * 문자열 노드에서 따옴표 제거
 */
export function extractStringFromNode(node: ASTNode): string {
	const text = node.text;
	if (
		(text.startsWith('"') && text.endsWith('"')) ||
		(text.startsWith("'") && text.endsWith("'")) ||
		(text.startsWith("`") && text.endsWith("`"))
	) {
		return text.slice(1, -1);
	}
	return text;
}

/**
 * 식별자 텍스트 정규화
 */
export function normalizeIdentifier(text: string): string {
	return text.trim().replace(/\s+/g, " ");
}

// ===== PATH UTILITIES =====

/**
 * 상대 경로 확인
 */
export function isRelativePath(path: string): boolean {
	return path.startsWith("./") || path.startsWith("../");
}

/**
 * 파일 확장자 추출
 */
export function getFileExtension(path: string): string | undefined {
	const match = path.match(/\.([^./]+)$/);
	return match ? match[1] : undefined;
}

/**
 * 경로 정규화
 */
export function normalizePath(path: string): string {
	return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

// ===== NODE TRAVERSAL =====

/**
 * AST 노드 깊이 우선 탐색
 */
export function* traverseNodes(node: ASTNode): Generator<ASTNode> {
	yield node;

	if (node.children) {
		for (const child of node.children) {
			yield* traverseNodes(child);
		}
	}
}

/**
 * 특정 타입의 노드 찾기
 */
export function findNodesByType(root: ASTNode, nodeType: string): ASTNode[] {
	const result: ASTNode[] = [];

	for (const node of traverseNodes(root)) {
		if (node.type === nodeType) {
			result.push(node);
		}
	}

	return result;
}

/**
 * 첫 번째 매칭 노드 찾기
 */
export function findFirstNodeByType(
	root: ASTNode,
	nodeType: string,
): ASTNode | undefined {
	for (const node of traverseNodes(root)) {
		if (node.type === nodeType) {
			return node;
		}
	}
	return undefined;
}

// ===== NODE ANALYSIS =====

/**
 * 노드 깊이 계산
 */
export function getNodeDepth(node: ASTNode, _root: ASTNode): number {
	const depth = 0;
	const _current = node;

	// 간단한 구현 - 실제로는 부모 참조가 필요
	// 여기서는 위치 기반으로 추정
	return depth;
}

/**
 * 노드가 다른 노드 내부에 있는지 확인
 */
export function isNodeInside(inner: ASTNode, outer: ASTNode): boolean {
	const innerStart = inner.startPosition;
	const innerEnd = inner.endPosition;
	const outerStart = outer.startPosition;
	const outerEnd = outer.endPosition;

	return (
		(outerStart.row < innerStart.row ||
			(outerStart.row === innerStart.row &&
				outerStart.column <= innerStart.column)) &&
		(outerEnd.row > innerEnd.row ||
			(outerEnd.row === innerEnd.row && outerEnd.column >= innerEnd.column))
	);
}

/**
 * 두 노드가 겹치는지 확인
 */
export function nodesOverlap(node1: ASTNode, node2: ASTNode): boolean {
	const start1 = node1.startPosition;
	const end1 = node1.endPosition;
	const start2 = node2.startPosition;
	const end2 = node2.endPosition;

	return !(
		end1.row < start2.row ||
		(end1.row === start2.row && end1.column <= start2.column) ||
		end2.row < start1.row ||
		(end2.row === start1.row && end2.column <= start1.column)
	);
}

// ===== TEXT EXTRACTION =====

/**
 * 노드의 텍스트에서 공백 정리
 */
export function cleanNodeText(text: string): string {
	return text
		.replace(/\s+/g, " ")
		.replace(/^\s+|\s+$/g, "")
		.trim();
}

/**
 * 여러 줄 텍스트를 한 줄로 변환
 */
export function singleLineText(text: string): string {
	return text.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * 주석 텍스트 정리
 */
export function cleanCommentText(text: string): string {
	return text
		.replace(/^\/\*\*?/, "")
		.replace(/\*\/$/, "")
		.replace(/^\/\//, "")
		.replace(/^\s*\*\s?/gm, "")
		.trim();
}
