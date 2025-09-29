/**
 * TypeScript Export Queries
 * TypeScript 전용 Export 관련 쿼리들
 */

import type Parser from "tree-sitter";
import type {
	QueryExecutionContext,
	QueryFunction,
	QueryMatch,
} from "../../core/types";
import type {
	ExportAssignmentResult,
	ExportDeclarationResult,
} from "../../results";
import { extractLocation } from "../../utils/ast-helpers";

// ===== UTILITY FUNCTIONS =====
const extractStringFromNode = (node: Parser.SyntaxNode): string => {
	const text = node.text;
	return text.slice(1, -1); // 따옴표 제거
};

// ===== TYPESCRIPT EXPORT DECLARATION QUERY =====
export const tsExportDeclarationQuery: QueryFunction<ExportDeclarationResult> =
	{
		name: "ts-export-declarations",
		description: "Extract TypeScript export declarations",
		query: `
    [
      ; Named exports
      (export_statement
        declaration: [
          (class_declaration name: (identifier) @export_name)
          (function_declaration name: (identifier) @export_name)
          (interface_declaration name: (identifier) @export_name)
          (type_alias_declaration name: (identifier) @export_name)
          (enum_declaration name: (identifier) @export_name)
          (variable_declaration (variable_declarator name: (identifier) @export_name))
        ] @export_declaration)

      ; Export clause
      (export_statement
        (export_clause
          (export_specifier
            name: (identifier) @export_name
            alias: (identifier)? @export_alias)))

      ; Re-exports
      (export_statement
        (export_clause
          (export_specifier
            name: (identifier) @export_name
            alias: (identifier)? @export_alias))
        source: (string) @source)

      ; Default exports
      (export_statement
        "default"
        [
          (class_declaration name: (identifier)? @export_name)
          (function_declaration name: (identifier)? @export_name)
          (identifier) @export_name
          (_) @export_expression
        ] @export_declaration)
    ]
  `,
		languages: ["typescript", "tsx"] as const,
		priority: 95,
		resultType: "ts-export-declarations",
		processor: (matches: QueryMatch[], _context: QueryExecutionContext) => {
			const results: ExportDeclarationResult[] = [];

			for (const match of matches) {
				const exportNameNodes = match.captures.filter(
					(c) => c.name === "export_name",
				);
				const exportAliasNodes = match.captures.filter(
					(c) => c.name === "export_alias",
				);
				const sourceNodes = match.captures.filter((c) => c.name === "source");
				const exportExpressionNodes = match.captures.filter(
					(c) => c.name === "export_expression",
				);

				// Default export 확인
				const matchNode = match.captures[0]?.node;
				const isDefault = matchNode
					? matchNode.text.includes("export default")
					: false;

				if (exportNameNodes.length > 0) {
					exportNameNodes.forEach((nameNode, index) => {
						const aliasNode = exportAliasNodes[index];
						const sourceNode = sourceNodes[0]; // re-export인 경우

						results.push({
							queryName: "ts-export-declarations",
							location: extractLocation(nameNode.node),
							nodeText: matchNode ? matchNode.text : "",
							exportType: isDefault
								? "default"
								: sourceNode
									? "re-export"
									: "named",
							exportName: nameNode.node.text,
							isDefault,
							source: sourceNode
								? extractStringFromNode(sourceNode.node)
								: undefined,
							localName: aliasNode ? nameNode.node.text : undefined,
						});
					});
				} else if (exportExpressionNodes.length > 0) {
					// Default export without identifier
					exportExpressionNodes.forEach((expressionNode) => {
						results.push({
							queryName: "ts-export-declarations",
							location: extractLocation(expressionNode.node),
							nodeText: matchNode ? matchNode.text : "",
							exportType: "default",
							exportName: "default", // Anonymous default export
							isDefault: true,
						});
					});
				}
			}

			return results;
		},
	};

// ===== TYPESCRIPT EXPORT ASSIGNMENT QUERY =====
export const tsExportAssignmentQuery: QueryFunction<ExportAssignmentResult> = {
	name: "ts-export-assignments",
	description: "Extract TypeScript export assignments (export = ...)",
	query: `
    (export_assignment
      expression: (_) @export_expression)
  `,
	languages: ["typescript", "tsx"] as const,
	priority: 90,
	resultType: "ts-export-assignments",
	processor: (matches: QueryMatch[], _context: QueryExecutionContext) => {
		const results: ExportAssignmentResult[] = [];

		for (const match of matches) {
			const expressionNodes = match.captures.filter(
				(c) => c.name === "export_expression",
			);

			expressionNodes.forEach((expressionNode) => {
				const matchNode = match.captures[0]?.node;
				const isDefault = matchNode
					? matchNode.text.includes("export =")
					: false;

				results.push({
					queryName: "ts-export-assignments",
					location: extractLocation(expressionNode.node),
					nodeText: matchNode ? matchNode.text : "",
					expression: expressionNode.node.text,
					isDefault,
				});
			});
		}

		return results;
	},
};

// ===== EXPORTS =====
export const typeScriptExportQueries = {
	"ts-export-declarations": tsExportDeclarationQuery,
	"ts-export-assignments": tsExportAssignmentQuery,
} as const;

export default typeScriptExportQueries;
