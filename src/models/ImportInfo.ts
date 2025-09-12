/**
 * Import Information Model
 * Detailed information about an import statement
 */

import type { SourceLocation } from "./SourceLocation";

export interface ImportSpecifier {
	/** Name in the source module */
	imported: string;
	/** Local name in this file */
	local: string;
	/** Import type */
	type: "default" | "namespace" | "named";
}

export interface ImportInfo {
	/** The module being imported from */
	source: string;
	/** What is being imported */
	specifiers: ImportSpecifier[];
	/** Whether this is a type-only import */
	isTypeOnly: boolean;
	/** Location in source file */
	location: SourceLocation;
}

/**
 * Creates an import specifier
 * @param imported Name in the source module
 * @param local Local name (defaults to imported name)
 * @param type Import type
 * @returns ImportSpecifier object
 */
export function createImportSpecifier(
	imported: string,
	local?: string,
	type: ImportSpecifier["type"] = "named",
): ImportSpecifier {
	return {
		imported,
		local: local || imported,
		type,
	};
}

/**
 * Creates a default import specifier
 * @param localName The local name for the default import
 * @returns ImportSpecifier for default import
 */
export function createDefaultImportSpecifier(
	localName: string,
): ImportSpecifier {
	return createImportSpecifier("default", localName, "default");
}

/**
 * Creates a namespace import specifier
 * @param localName The local name for the namespace import
 * @returns ImportSpecifier for namespace import
 */
export function createNamespaceImportSpecifier(
	localName: string,
): ImportSpecifier {
	return createImportSpecifier("*", localName, "namespace");
}

/**
 * Creates a named import specifier
 * @param imported The imported name
 * @param local The local name (optional, defaults to imported name)
 * @returns ImportSpecifier for named import
 */
export function createNamedImportSpecifier(
	imported: string,
	local?: string,
): ImportSpecifier {
	return createImportSpecifier(imported, local, "named");
}

/**
 * Creates an import info object
 * @param source The module being imported from
 * @param specifiers Array of import specifiers
 * @param location Source location
 * @param isTypeOnly Whether this is a type-only import
 * @returns ImportInfo object
 */
export function createImportInfo(
	source: string,
	specifiers: ImportSpecifier[],
	location: SourceLocation,
	isTypeOnly: boolean = false,
): ImportInfo {
	return {
		source,
		specifiers,
		location,
		isTypeOnly,
	};
}

/**
 * Creates a side-effect import (no specifiers)
 * @param source The module being imported
 * @param location Source location
 * @returns ImportInfo for side-effect import
 */
export function createSideEffectImport(
	source: string,
	location: SourceLocation,
): ImportInfo {
	return createImportInfo(source, [], location, false);
}

/**
 * Determines if an import is a side-effect import
 * @param importInfo The import to check
 * @returns True if it's a side-effect import
 */
export function isSideEffectImport(importInfo: ImportInfo): boolean {
	return importInfo.specifiers.length === 0;
}

/**
 * Determines if an import has default imports
 * @param importInfo The import to check
 * @returns True if it has default imports
 */
export function hasDefaultImport(importInfo: ImportInfo): boolean {
	return importInfo.specifiers.some((spec) => spec.type === "default");
}

/**
 * Determines if an import has named imports
 * @param importInfo The import to check
 * @returns True if it has named imports
 */
export function hasNamedImports(importInfo: ImportInfo): boolean {
	return importInfo.specifiers.some((spec) => spec.type === "named");
}

/**
 * Determines if an import has namespace imports
 * @param importInfo The import to check
 * @returns True if it has namespace imports
 */
export function hasNamespaceImport(importInfo: ImportInfo): boolean {
	return importInfo.specifiers.some((spec) => spec.type === "namespace");
}

/**
 * Gets the default import specifier if it exists
 * @param importInfo The import to check
 * @returns Default import specifier or undefined
 */
export function getDefaultImport(
	importInfo: ImportInfo,
): ImportSpecifier | undefined {
	return importInfo.specifiers.find((spec) => spec.type === "default");
}

/**
 * Gets all named import specifiers
 * @param importInfo The import to check
 * @returns Array of named import specifiers
 */
export function getNamedImports(importInfo: ImportInfo): ImportSpecifier[] {
	return importInfo.specifiers.filter((spec) => spec.type === "named");
}

/**
 * Gets the namespace import specifier if it exists
 * @param importInfo The import to check
 * @returns Namespace import specifier or undefined
 */
export function getNamespaceImport(
	importInfo: ImportInfo,
): ImportSpecifier | undefined {
	return importInfo.specifiers.find((spec) => spec.type === "namespace");
}

/**
 * Groups imports by source
 * @param imports Array of imports to group
 * @returns Map of source to imports
 */
export function groupImportsBySource(
	imports: ImportInfo[],
): Map<string, ImportInfo[]> {
	const groups = new Map<string, ImportInfo[]>();

	for (const imp of imports) {
		const existing = groups.get(imp.source) || [];
		existing.push(imp);
		groups.set(imp.source, existing);
	}

	return groups;
}

/**
 * Gets all unique import sources
 * @param imports Array of imports
 * @returns Array of unique source strings
 */
export function getImportSources(imports: ImportInfo[]): string[] {
	return [...new Set(imports.map((imp) => imp.source))];
}

/**
 * Filters imports by type-only status
 * @param imports Array of imports
 * @param typeOnly Whether to filter for type-only imports
 * @returns Filtered imports
 */
export function filterTypeOnlyImports(
	imports: ImportInfo[],
	typeOnly: boolean = true,
): ImportInfo[] {
	return imports.filter((imp) => imp.isTypeOnly === typeOnly);
}

/**
 * Validates an import info object
 * @param importInfo The import to validate
 * @returns True if the import is valid
 */
export function isValidImportInfo(importInfo: any): importInfo is ImportInfo {
	return (
		importInfo &&
		typeof importInfo === "object" &&
		typeof importInfo.source === "string" &&
		importInfo.source.length > 0 &&
		Array.isArray(importInfo.specifiers) &&
		typeof importInfo.isTypeOnly === "boolean" &&
		importInfo.location &&
		typeof importInfo.location === "object" &&
		importInfo.specifiers.every(
			(spec: any) =>
				spec &&
				typeof spec === "object" &&
				typeof spec.imported === "string" &&
				typeof spec.local === "string" &&
				["default", "namespace", "named"].includes(spec.type),
		)
	);
}

/**
 * Gets import statistics
 * @param imports Array of imports to analyze
 * @returns Statistics about the imports
 */
export function getImportStats(imports: ImportInfo[]): {
	total: number;
	typeOnly: number;
	sideEffect: number;
	withDefault: number;
	withNamed: number;
	withNamespace: number;
	uniqueSources: number;
	totalSpecifiers: number;
} {
	const totalSpecifiers = imports.reduce(
		(sum, imp) => sum + imp.specifiers.length,
		0,
	);

	return {
		total: imports.length,
		typeOnly: imports.filter((imp) => imp.isTypeOnly).length,
		sideEffect: imports.filter(isSideEffectImport).length,
		withDefault: imports.filter(hasDefaultImport).length,
		withNamed: imports.filter(hasNamedImports).length,
		withNamespace: imports.filter(hasNamespaceImport).length,
		uniqueSources: getImportSources(imports).length,
		totalSpecifiers,
	};
}
