/**
 * Export Information Model
 * Information about an export statement
 */

import type { SourceLocation } from "./SourceLocation";

export interface ExportInfo {
	/** Exported symbol name */
	name: string;
	/** Export type */
	type: "default" | "named" | "namespace" | "re-export" | "function";
	/** Whether this is a type-only export */
	isTypeOnly: boolean;
	/** Location in source file */
	location: SourceLocation;
	/** Source module for re-exports */
	source?: string;
	/** Line number (backward compatibility) */
	line?: number;
}

/**
 * Creates an export info object
 * @param name The exported symbol name
 * @param type The export type
 * @param location Source location
 * @param isTypeOnly Whether this is a type-only export
 * @returns ExportInfo object
 */
export function createExportInfo(
	name: string,
	type: ExportInfo["type"],
	location: SourceLocation,
	isTypeOnly: boolean = false,
): ExportInfo {
	return {
		name,
		type,
		location,
		isTypeOnly,
	};
}

/**
 * Creates a default export info object
 * @param name The name of the default export (usually 'default')
 * @param location Source location
 * @param isTypeOnly Whether this is a type-only export
 * @returns ExportInfo for default export
 */
export function createDefaultExport(
	name: string = "default",
	location: SourceLocation,
	isTypeOnly: boolean = false,
): ExportInfo {
	return createExportInfo(name, "default", location, isTypeOnly);
}

/**
 * Creates a named export info object
 * @param name The exported symbol name
 * @param location Source location
 * @param isTypeOnly Whether this is a type-only export
 * @returns ExportInfo for named export
 */
export function createNamedExport(
	name: string,
	location: SourceLocation,
	isTypeOnly: boolean = false,
): ExportInfo {
	return createExportInfo(name, "named", location, isTypeOnly);
}

/**
 * Creates a namespace export info object
 * @param name The namespace name
 * @param location Source location
 * @param isTypeOnly Whether this is a type-only export
 * @returns ExportInfo for namespace export
 */
export function createNamespaceExport(
	name: string,
	location: SourceLocation,
	isTypeOnly: boolean = false,
): ExportInfo {
	return createExportInfo(name, "namespace", location, isTypeOnly);
}

/**
 * Determines if an export is a default export
 * @param exportInfo The export to check
 * @returns True if it's a default export
 */
export function isDefaultExport(exportInfo: ExportInfo): boolean {
	return exportInfo.type === "default";
}

/**
 * Determines if an export is a named export
 * @param exportInfo The export to check
 * @returns True if it's a named export
 */
export function isNamedExport(exportInfo: ExportInfo): boolean {
	return exportInfo.type === "named";
}

/**
 * Determines if an export is a namespace export
 * @param exportInfo The export to check
 * @returns True if it's a namespace export
 */
export function isNamespaceExport(exportInfo: ExportInfo): boolean {
	return exportInfo.type === "namespace";
}

/**
 * Filters exports by type
 * @param exports Array of exports
 * @param type The export type to filter by
 * @returns Exports matching the specified type
 */
export function filterExportsByType(
	exports: ExportInfo[],
	type: ExportInfo["type"],
): ExportInfo[] {
	return exports.filter((exp) => exp.type === type);
}

/**
 * Gets the default export if it exists
 * @param exports Array of exports
 * @returns Default export or undefined
 */
export function getDefaultExport(
	exports: ExportInfo[],
): ExportInfo | undefined {
	return exports.find(isDefaultExport);
}

/**
 * Gets all named exports
 * @param exports Array of exports
 * @returns Array of named exports
 */
export function getNamedExports(exports: ExportInfo[]): ExportInfo[] {
	return filterExportsByType(exports, "named");
}

/**
 * Gets all namespace exports
 * @param exports Array of exports
 * @returns Array of namespace exports
 */
export function getNamespaceExports(exports: ExportInfo[]): ExportInfo[] {
	return filterExportsByType(exports, "namespace");
}

/**
 * Filters exports by type-only status
 * @param exports Array of exports
 * @param typeOnly Whether to filter for type-only exports
 * @returns Filtered exports
 */
export function filterTypeOnlyExports(
	exports: ExportInfo[],
	typeOnly: boolean = true,
): ExportInfo[] {
	return exports.filter((exp) => exp.isTypeOnly === typeOnly);
}

/**
 * Gets all type exports (interfaces, types, etc.)
 * @param exports Array of exports
 * @returns Array of type-only exports
 */
export function getTypeExports(exports: ExportInfo[]): ExportInfo[] {
	return filterTypeOnlyExports(exports, true);
}

/**
 * Gets all value exports (functions, classes, variables, etc.)
 * @param exports Array of exports
 * @returns Array of value exports
 */
export function getValueExports(exports: ExportInfo[]): ExportInfo[] {
	return filterTypeOnlyExports(exports, false);
}

/**
 * Groups exports by type
 * @param exports Array of exports to group
 * @returns Exports grouped by type
 */
export function groupExportsByType(exports: ExportInfo[]): {
	default: ExportInfo[];
	named: ExportInfo[];
	namespace: ExportInfo[];
	"re-export": ExportInfo[];
	function: ExportInfo[];
} {
	return exports.reduce(
		(groups, exp) => {
			groups[exp.type].push(exp);
			return groups;
		},
		{
			default: [] as ExportInfo[],
			named: [] as ExportInfo[],
			namespace: [] as ExportInfo[],
			"re-export": [] as ExportInfo[],
			function: [] as ExportInfo[],
		},
	);
}

/**
 * Gets unique export names
 * @param exports Array of exports
 * @returns Array of unique export names
 */
export function getExportNames(exports: ExportInfo[]): string[] {
	return [...new Set(exports.map((exp) => exp.name))];
}

/**
 * Checks if a name is exported
 * @param exports Array of exports
 * @param name The name to check
 * @returns True if the name is exported
 */
export function isExported(exports: ExportInfo[], name: string): boolean {
	return exports.some((exp) => exp.name === name);
}

/**
 * Gets exports by name
 * @param exports Array of exports
 * @param name The name to search for
 * @returns Array of exports with the given name
 */
export function getExportsByName(
	exports: ExportInfo[],
	name: string,
): ExportInfo[] {
	return exports.filter((exp) => exp.name === name);
}

/**
 * Creates a re-export info object
 * @param name The exported symbol name
 * @param source The source module being re-exported
 * @param location Source location
 * @param isTypeOnly Whether this is a type-only export
 * @returns ExportInfo for re-export
 */
export function createReExport(
	name: string,
	source: string,
	location: SourceLocation,
	isTypeOnly: boolean = false,
): ExportInfo {
	return {
		name,
		type: "re-export",
		source,
		location,
		isTypeOnly,
	};
}

/**
 * Validates an export info object
 * @param exportInfo The export to validate
 * @returns True if the export is valid
 */
export function isValidExportInfo(exportInfo: any): exportInfo is ExportInfo {
	return (
		exportInfo &&
		typeof exportInfo === "object" &&
		typeof exportInfo.name === "string" &&
		exportInfo.name.length > 0 &&
		["default", "named", "namespace", "re-export"].includes(exportInfo.type) &&
		typeof exportInfo.isTypeOnly === "boolean" &&
		exportInfo.location &&
		typeof exportInfo.location === "object"
	);
}

/**
 * Gets export statistics
 * @param exports Array of exports to analyze
 * @returns Statistics about the exports
 */
export function getExportStats(exports: ExportInfo[]): {
	total: number;
	default: number;
	named: number;
	namespace: number;
	typeOnly: number;
	values: number;
	uniqueNames: number;
} {
	const grouped = groupExportsByType(exports);
	const typeOnly = filterTypeOnlyExports(exports, true);
	const values = filterTypeOnlyExports(exports, false);

	return {
		total: exports.length,
		default: grouped.default.length,
		named: grouped.named.length,
		namespace: grouped.namespace.length,
		typeOnly: typeOnly.length,
		values: values.length,
		uniqueNames: getExportNames(exports).length,
	};
}

/**
 * Validates that exports don't have conflicting names
 * @param exports Array of exports to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateExportNames(exports: ExportInfo[]): string[] {
	const errors: string[] = [];
	const nameMap = new Map<string, ExportInfo[]>();

	// Group exports by name
	for (const exp of exports) {
		const existing = nameMap.get(exp.name) || [];
		existing.push(exp);
		nameMap.set(exp.name, existing);
	}

	// Check for conflicts
	for (const [name, exps] of nameMap.entries()) {
		if (exps.length > 1) {
			const types = exps.map((e) => e.type);
			const uniqueTypes = [...new Set(types)];

			if (uniqueTypes.length > 1) {
				errors.push(
					`Export name '${name}' has conflicting types: ${uniqueTypes.join(", ")}`,
				);
			}
		}
	}

	return errors;
}
