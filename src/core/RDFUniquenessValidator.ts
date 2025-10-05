/**
 * RDF Uniqueness Validator
 * RDF 주소 고유성 검증 시스템
 */

import {
	parseRDFAddress,
	compareRDFAddresses,
	type RDFAddress,
} from "./RDFAddress";
import type { RDFNodeIdentifier, RDFSymbolExtractionResult } from "./types";

// ===== UNIQUENESS VALIDATION TYPES =====

/**
 * 고유성 검증 결과
 */
export interface UniquenessValidationResult {
	isUnique: boolean;
	duplicates: RDFAddressDuplicate[];
	errors: string[];
	warnings: string[];
}

/**
 * 중복된 RDF 주소 정보
 */
export interface RDFAddressDuplicate {
	rdfAddress: string;
	occurrences: RDFAddressOccurrence[];
	conflictType: "exact" | "symbol" | "namespace";
}

/**
 * RDF 주소 발생 위치
 */
export interface RDFAddressOccurrence {
	filePath: string;
	lineNumber?: number;
	columnNumber?: number;
	context?: string;
}

/**
 * 고유성 검증 옵션
 */
export interface UniquenessValidationOptions {
	strictMode?: boolean; // 엄격 모드 (대소문자 구분)
	caseSensitive?: boolean; // 대소문자 구분
	namespaceAware?: boolean; // 네임스페이스 인식
	allowOverloads?: boolean; // 오버로드 허용
}

// ===== UNIQUENESS VALIDATION FUNCTIONS =====

/**
 * RDF 주소 고유성 검증
 */
export function validateRDFUniqueness(
	symbols: RDFSymbolExtractionResult[],
	options: UniquenessValidationOptions = {},
): UniquenessValidationResult {
	const {
		strictMode = false,
		caseSensitive = true,
		namespaceAware = true,
		allowOverloads = false,
	} = options;

	const duplicates: RDFAddressDuplicate[] = [];
	const errors: string[] = [];
	const warnings: string[] = [];

	// RDF 주소별 그룹화
	const addressGroups = groupSymbolsByRDFAddress(symbols, caseSensitive);

	// 중복 검사
	for (const [rdfAddress, occurrences] of addressGroups.entries()) {
		if (occurrences.length > 1) {
			// 중복 타입 결정
			const conflictType = determineConflictType(occurrences, namespaceAware);

			// 오버로드 허용 여부 확인
			if (!allowOverloads || conflictType !== "exact") {
				duplicates.push({
					rdfAddress,
					occurrences: occurrences.map((occ) => ({
						filePath: occ.rdfAddress.split("#")[0], // Extract file path from RDF address
						lineNumber: occ.metadata.lineNumber,
						columnNumber: occ.metadata.columnNumber,
						context: `${occ.nodeType}:${occ.symbolName}`,
					})),
					conflictType,
				});
			}
		}
	}

	// 엄격 모드에서 추가 검증
	if (strictMode) {
		const strictDuplicates = findStrictDuplicates(symbols, caseSensitive);
		duplicates.push(...strictDuplicates);
	}

	return {
		isUnique: duplicates.length === 0,
		duplicates,
		errors,
		warnings,
	};
}

/**
 * 심볼을 RDF 주소별로 그룹화
 */
function groupSymbolsByRDFAddress(
	symbols: RDFSymbolExtractionResult[],
	caseSensitive: boolean,
): Map<string, RDFSymbolExtractionResult[]> {
	const groups = new Map<string, RDFSymbolExtractionResult[]>();

	for (const symbol of symbols) {
		const key = caseSensitive
			? symbol.rdfAddress
			: symbol.rdfAddress.toLowerCase();

		if (!groups.has(key)) {
			groups.set(key, []);
		}

		groups.get(key)!.push(symbol);
	}

	return groups;
}

/**
 * 충돌 타입 결정
 */
function determineConflictType(
	occurrences: RDFSymbolExtractionResult[],
	namespaceAware: boolean,
): "exact" | "symbol" | "namespace" {
	// 정확한 중복 (동일한 RDF 주소)
	if (occurrences.length > 1) {
		return "exact";
	}

	// 심볼명 중복 (네임스페이스 무시)
	if (namespaceAware) {
		const symbolNames = occurrences.map((occ) => occ.symbolName);
		const uniqueSymbolNames = new Set(symbolNames);

		if (uniqueSymbolNames.size < symbolNames.length) {
			return "symbol";
		}
	}

	// 네임스페이스 중복
	const namespaces = occurrences.map((occ) => occ.namespace || "");
	const uniqueNamespaces = new Set(namespaces);

	if (uniqueNamespaces.size < namespaces.length) {
		return "namespace";
	}

	return "exact";
}

/**
 * 엄격 모드 중복 검사
 */
function findStrictDuplicates(
	symbols: RDFSymbolExtractionResult[],
	caseSensitive: boolean,
): RDFAddressDuplicate[] {
	const duplicates: RDFAddressDuplicate[] = [];

	// 심볼명별 그룹화
	const symbolGroups = new Map<string, RDFSymbolExtractionResult[]>();

	for (const symbol of symbols) {
		const key = caseSensitive
			? symbol.symbolName
			: symbol.symbolName.toLowerCase();

		if (!symbolGroups.has(key)) {
			symbolGroups.set(key, []);
		}

		symbolGroups.get(key)!.push(symbol);
	}

	// 중복된 심볼명 찾기
	for (const [symbolName, occurrences] of symbolGroups.entries()) {
		if (occurrences.length > 1) {
			// 같은 파일 내 중복 검사
			const fileGroups = new Map<string, RDFSymbolExtractionResult[]>();

			for (const occurrence of occurrences) {
				if (!fileGroups.has(occurrence.rdfAddress)) {
					fileGroups.set(occurrence.rdfAddress, []);
				}
				fileGroups.get(occurrence.rdfAddress)!.push(occurrence);
			}

			// 같은 파일 내 중복
			for (const [rdfAddress, fileOccurrences] of fileGroups.entries()) {
				if (fileOccurrences.length > 1) {
					duplicates.push({
						rdfAddress,
						occurrences: fileOccurrences.map((occ) => ({
							filePath: occ.rdfAddress.split("#")[0], // Extract file path from RDF address
							lineNumber: occ.metadata.lineNumber,
							columnNumber: occ.metadata.columnNumber,
							context: `${occ.nodeType}:${occ.symbolName}`,
						})),
						conflictType: "exact",
					});
				}
			}
		}
	}

	return duplicates;
}

/**
 * RDF 주소 충돌 해결 제안
 */
export function suggestConflictResolution(
	duplicate: RDFAddressDuplicate,
): string[] {
	const suggestions: string[] = [];

	switch (duplicate.conflictType) {
		case "exact":
			suggestions.push("Rename one of the symbols to make them unique");
			suggestions.push("Use different namespaces to separate the symbols");
			suggestions.push("Consider using different file locations");
			break;

		case "symbol":
			suggestions.push("Use fully qualified names to distinguish symbols");
			suggestions.push("Consider using different namespaces");
			suggestions.push("Rename symbols to be more descriptive");
			break;

		case "namespace":
			suggestions.push("Use different namespace prefixes");
			suggestions.push("Organize symbols in different files");
			suggestions.push("Consider using module-based organization");
			break;
	}

	return suggestions;
}

/**
 * RDF 주소 정규화 (중복 방지)
 */
export function normalizeRDFAddressForUniqueness(
	rdfAddress: string,
	existingAddresses: string[],
): string {
	const parsed = parseRDFAddress(rdfAddress);

	if (!parsed.isValid) {
		return rdfAddress;
	}

	// 기존 주소와 중복 확인
	let normalizedAddress = rdfAddress;
	let counter = 1;

	while (existingAddresses.includes(normalizedAddress)) {
		// 중복 시 카운터 추가
		const newSymbolName = `${parsed.symbolName}_${counter}`;
		normalizedAddress = `${parsed.projectName}/${parsed.filePath}#${parsed.nodeType}:${newSymbolName}`;
		counter++;
	}

	return normalizedAddress;
}

/**
 * RDF 주소 고유성 검증 (단일 주소)
 */
export function validateSingleRDFAddress(
	rdfAddress: string,
	existingAddresses: string[],
	options: UniquenessValidationOptions = {},
): { isUnique: boolean; conflicts: string[] } {
	const conflicts: string[] = [];

	// 정확한 중복 검사
	if (existingAddresses.includes(rdfAddress)) {
		conflicts.push(`Exact duplicate: ${rdfAddress}`);
	}

	// 대소문자 무시 중복 검사
	if (!options.caseSensitive) {
		const lowerAddress = rdfAddress.toLowerCase();
		const lowerExisting = existingAddresses.map((addr) => addr.toLowerCase());

		if (lowerExisting.includes(lowerAddress)) {
			conflicts.push(`Case-insensitive duplicate: ${rdfAddress}`);
		}
	}

	// 네임스페이스 인식 중복 검사
	if (options.namespaceAware) {
		const parsed = parseRDFAddress(rdfAddress);

		if (parsed.isValid) {
			const { symbolName } = parsed;

			// 심볼명 중복 검사
			for (const existingAddress of existingAddresses) {
				const existingParsed = parseRDFAddress(existingAddress);

				if (
					existingParsed.isValid &&
					existingParsed.symbolName === symbolName
				) {
					conflicts.push(`Symbol name conflict: ${symbolName}`);
					break;
				}
			}
		}
	}

	return {
		isUnique: conflicts.length === 0,
		conflicts,
	};
}
