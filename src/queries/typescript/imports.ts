/**
 * TypeScript Import Queries
 * TypeScript 전용 Import 관련 쿼리들
 */

import type {
	ASTNode,
	ExtendedSourceLocation,
	QueryFunction,
} from "../../core/types";
import type {
	DefaultImportResult,
	ImportSourceResult,
	NamedImportResult,
	TypeImportResult,
} from "../../results";

// ===== UTILITY FUNCTIONS =====
const extractStringFromNode = (node: ASTNode): string => {
	const text = node.text;
	return text.slice(1, -1); // 따옴표 제거
};

const extractLocation = (node: ASTNode): ExtendedSourceLocation => ({
	line: node.startPosition.row + 1,
	column: node.startPosition.column,
	offset: 0,
	endLine: node.endPosition.row + 1,
	endColumn: node.endPosition.column,
	endOffset: 0,
});

const isRelativePath = (source: string): boolean => {
	return source.startsWith("./") || source.startsWith("../");
};

const getFileExtension = (source: string): string | undefined => {
	const match = source.match(/\.([^./]+)$/);
	return match ? match[1] : undefined;
};

// ===== TYPESCRIPT IMPORT SOURCE QUERY =====
export const tsImportSourceQuery: QueryFunction<ImportSourceResult> = {
	name: "ts-import-sources",
	description: "Extract all TypeScript import sources from import statements",
	query: `
    (import_statement
      source: (string) @source)
  `,
	languages: ["typescript", "tsx"] as const,
	priority: 100,
	resultType: "ts-import-sources",
	processor: (matches, _context) => {
		const results: ImportSourceResult[] = [];

		for (const match of matches) {
			for (const capture of match.captures) {
				if (capture.name === "source") {
					const sourceText = extractStringFromNode(capture.node);

					results.push({
						queryName: "ts-import-sources",
						location: extractLocation(capture.node),
						nodeText: capture.node.text,
						source: sourceText,
						isRelative: isRelativePath(sourceText),
						fileExtension: getFileExtension(sourceText),
						importType: "static", // TypeScript는 기본적으로 정적 import
					});
				}
			}
		}

		return results;
	},
};

// ===== TYPESCRIPT NAMED IMPORT QUERY =====
export const tsNamedImportQuery: QueryFunction<NamedImportResult> = {
	name: "ts-named-imports",
	description: "Extract TypeScript named imports with type-only detection",
	query: `
    (import_statement
      import_clause: (import_clause
        named_imports: (named_imports
          (import_specifier
            name: (identifier) @import_name
            alias: (identifier)? @import_alias)
        )
      )
      source: (string) @source
    )
  `,
	languages: ["typescript", "tsx"] as const,
	priority: 95,
	resultType: "ts-named-imports",
	processor: (matches, _context) => {
		const results: NamedImportResult[] = [];

		for (const match of matches) {
			const sourceNodes = match.captures.filter((c) => c.name === "source");
			const nameNodes = match.captures.filter((c) => c.name === "import_name");
			const aliasNodes = match.captures.filter(
				(c) => c.name === "import_alias",
			);

			if (sourceNodes.length > 0 && nameNodes.length > 0) {
				const source = extractStringFromNode(sourceNodes[0].node);

				nameNodes.forEach((nameNode, index) => {
					const aliasNode = aliasNodes[index];

					// TypeScript type-only import 검사
					const isTypeOnly =
						match.node.text.includes("import type") ||
						match.node.text.includes(`type ${nameNode.node.text}`);

					results.push({
						queryName: "ts-named-imports",
						location: extractLocation(nameNode.node),
						nodeText: nameNode.node.text,
						name: nameNode.node.text,
						alias: aliasNode?.node.text,
						source,
						isTypeOnly,
					});
				});
			}
		}

		return results;
	},
};

// ===== TYPESCRIPT DEFAULT IMPORT QUERY =====
export const tsDefaultImportQuery: QueryFunction<DefaultImportResult> = {
	name: "ts-default-imports",
	description: "Extract TypeScript default imports",
	query: `
    (import_statement
      import_clause: (import_clause
        name: (identifier) @import_name)
      source: (string) @source)
  `,
	languages: ["typescript", "tsx"] as const,
	priority: 94,
	resultType: "ts-default-imports",
	processor: (matches, _context) => {
		const results: DefaultImportResult[] = [];

		for (const match of matches) {
			const sourceNodes = match.captures.filter((c) => c.name === "source");
			const nameNodes = match.captures.filter((c) => c.name === "import_name");

			if (sourceNodes.length > 0 && nameNodes.length > 0) {
				const source = extractStringFromNode(sourceNodes[0].node);

				nameNodes.forEach((nameNode) => {
					results.push({
						queryName: "ts-default-imports",
						location: extractLocation(nameNode.node),
						nodeText: nameNode.node.text,
						name: nameNode.node.text,
						source,
					});
				});
			}
		}

		return results;
	},
};

// ===== TYPESCRIPT TYPE IMPORT QUERY =====
export const tsTypeImportQuery: QueryFunction<TypeImportResult> = {
	name: "ts-type-imports",
	description: "Extract TypeScript type-only imports",
	query: `
    [
      (import_statement
        import_clause: (import_clause
          "type"
          named_imports: (named_imports
            (import_specifier
              name: (identifier) @type_name
              alias: (identifier)? @type_alias)
          )
        )
        source: (string) @source)
      (import_statement
        import_clause: (import_clause
          "type"
          name: (identifier) @type_name)
        source: (string) @source)
    ]
  `,
	languages: ["typescript", "tsx"] as const,
	priority: 93,
	resultType: "ts-type-imports",
	processor: (matches, _context) => {
		const results: TypeImportResult[] = [];

		for (const match of matches) {
			const sourceNodes = match.captures.filter((c) => c.name === "source");
			const nameNodes = match.captures.filter((c) => c.name === "type_name");
			const aliasNodes = match.captures.filter((c) => c.name === "type_alias");

			if (sourceNodes.length > 0 && nameNodes.length > 0) {
				const source = extractStringFromNode(sourceNodes[0].node);

				nameNodes.forEach((nameNode, index) => {
					const aliasNode = aliasNodes[index];

					results.push({
						queryName: "ts-type-imports",
						location: extractLocation(nameNode.node),
						nodeText: nameNode.node.text,
						name: nameNode.node.text,
						alias: aliasNode?.node.text,
						source,
						importKind: "type", // TypeScript는 type 또는 typeof
					});
				});
			}
		}

		return results;
	},
};

// ===== EXPORTS =====
export const typeScriptImportQueries = {
	"ts-import-sources": tsImportSourceQuery,
	"ts-named-imports": tsNamedImportQuery,
	"ts-default-imports": tsDefaultImportQuery,
	"ts-type-imports": tsTypeImportQuery,
} as const;

export default typeScriptImportQueries;
