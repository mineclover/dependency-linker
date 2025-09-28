/**
 * Represents a pattern match result
 */
export interface ExportMatch {
	match: string;
	type: "variable" | "named" | "default" | "function" | "class" | "type";
	startIndex: number;
	endIndex: number;
	groups: string[];
}

/**
 * Pre-compiled regex patterns for better performance
 */
const compiledPatterns = {
	// Variable exports: export const/let/var name = ...
	variableExport:
		/export\s+(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g,

	// Named exports: export { name1, name2 as alias }
	namedExport: /export\s*\{\s*([^}]+)\s*\}/g,

	// Default exports: export default ...
	defaultExport: /export\s+default\s+/g,

	// Function exports: export function name() {}
	functionExport:
		/export\s+(async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,

	// Class exports: export class Name {}
	classExport: /export\s+(abstract\s+)?class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,

	// Type exports: export type/interface Name
	typeExport: /export\s+(type|interface|enum)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,

	// Re-exports: export { ... } from 'module'
	reExport: /export\s*\{[^}]*\}\s+from\s+['"]/g,

	// Export all: export * from 'module'
	exportAll: /export\s+\*\s+from\s+['"]/g,
};

/**
 * Find all export patterns in source code with single pass
 * @param sourceCode Source code to analyze
 * @returns Array of all export matches
 */
export function findAllExports(sourceCode: string): ExportMatch[] {
	const matches: ExportMatch[] = [];

	// Single pass through all patterns
	Object.entries(compiledPatterns).forEach(
		([patternName, pattern]) => {
			// Reset pattern to start from beginning
			pattern.lastIndex = 0;

			let match: RegExpExecArray | null;
			while ((match = pattern.exec(sourceCode)) !== null) {
				const exportType = getExportTypeFromPattern(patternName);
				matches.push({
					match: match[0],
					type: exportType,
					startIndex: match.index,
					endIndex: match.index + match[0].length,
					groups: Array.from(match).slice(1),
				});
			}
		},
	);

	// Sort by start index for consistent ordering
	return matches.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Find specific type of exports
 * @param sourceCode Source code to analyze
 * @param exportType Type of exports to find
 * @returns Array of matching exports
 */
export function findExportsByType(
	sourceCode: string,
	exportType: keyof typeof compiledPatterns,
): ExportMatch[] {
	const pattern = compiledPatterns[exportType];
	if (!pattern) {
		return [];
	}

	const matches: ExportMatch[] = [];
	pattern.lastIndex = 0;

	let match: RegExpExecArray | null;
	while ((match = pattern.exec(sourceCode)) !== null) {
		matches.push({
			match: match[0],
			type: getExportTypeFromPattern(exportType),
			startIndex: match.index,
			endIndex: match.index + match[0].length,
			groups: Array.from(match).slice(1),
		});
	}

	return matches;
}

/**
 * Check if text contains any export statements
 * @param sourceCode Source code to check
 * @returns True if exports are found
 */
export function hasExports(sourceCode: string): boolean {
	// Quick check with simple pattern
	return /export\s+/.test(sourceCode);
}

/**
 * Count the number of export statements in source code
 * @param sourceCode Source code to analyze
 * @returns Number of export statements found
 */
export function countExports(sourceCode: string): number {
	return findAllExports(sourceCode).length;
}

/**
 * Extract export names from named export pattern
 * @param namedExportContent Content inside { }
 * @returns Array of export names and aliases
 */
export function parseNamedExports(namedExportContent: string): Array<{
	name: string;
	alias?: string;
}> {
	const exports: Array<{ name: string; alias?: string }> = [];

	// Split by comma and process each export
	const parts = namedExportContent.split(",").map((part) => part.trim());

	for (const part of parts) {
		if (!part) continue;

		// Check for alias: name as alias
		const aliasMatch = part.match(
			/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s+as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)$/,
		);
		if (aliasMatch) {
			exports.push({
				name: aliasMatch[1],
				alias: aliasMatch[2],
			});
		} else {
			// Simple export name
			const nameMatch = part.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)$/);
			if (nameMatch) {
				exports.push({
					name: nameMatch[1],
				});
			}
		}
	}

	return exports;
}

/**
 * Get export type from pattern name
 */
function getExportTypeFromPattern(
	patternName: string,
): ExportMatch["type"] {
	switch (patternName) {
		case "variableExport":
			return "variable";
		case "namedExport":
		case "reExport":
		case "exportAll":
			return "named";
		case "defaultExport":
			return "default";
		case "functionExport":
			return "function";
		case "classExport":
			return "class";
		case "typeExport":
			return "type";
		default:
			return "named";
	}
}

/**
 * Clean and normalize export text for analysis
 * @param text Raw export text
 * @returns Cleaned text
 */
export function cleanExportText(text: string): string {
	return text
		.replace(/\s+/g, " ") // Normalize whitespace
		.replace(/\/\*[\s\S]*?\*\//g, "") // Remove block comments
		.replace(/\/\/.*$/gm, "") // Remove line comments
		.trim();
}
