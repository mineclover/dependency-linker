import type Parser from "tree-sitter";
import type { ExportMethodInfo } from "../types/result-types";
import {
	isTypeDeclaration,
	getSourceLocation,
	getIdentifierName,
} from "../utils/NodeUtils";
import { BaseNodeProcessor, type ProcessingContext } from "./NodeProcessor";

/**
 * Processor for type exports (interfaces, type aliases, enums)
 */
export class TypeProcessor extends BaseNodeProcessor {
	canProcess(node: Parser.SyntaxNode): boolean {
		return isTypeDeclaration(node);
	}

	process(
		node: Parser.SyntaxNode,
		context: ProcessingContext,
	): ExportMethodInfo[] {
		if (!this.isExported(node, context)) {
			return [];
		}

		const typeName = this.extractName(node);
		if (!typeName) {
			return [];
		}

		const typeExport: ExportMethodInfo = {
			name: typeName,
			exportType: "type",
			declarationType: this.getDeclarationType(node, context),
			location: getSourceLocation(node),
		};

		// Add additional information based on type kind
		this.enrichTypeInfo(typeExport, node);

		return [typeExport];
	}

	/**
	 * Enrich type information based on the specific type declaration
	 */
	private enrichTypeInfo(
		typeExport: ExportMethodInfo,
		node: Parser.SyntaxNode,
	): void {
		switch (node.type) {
			case "interface_declaration":
				this.enrichInterfaceInfo(typeExport, node);
				break;

			case "type_alias_declaration":
				this.enrichTypeAliasInfo(typeExport, node);
				break;

			case "enum_declaration":
				this.enrichEnumInfo(typeExport, node);
				break;
		}
	}

	/**
	 * Enrich interface information
	 */
	private enrichInterfaceInfo(
		typeExport: ExportMethodInfo,
		node: Parser.SyntaxNode,
	): void {
		// Extract extends clause
		const extendsInfo = this.extractExtendsClause(node);
		if (extendsInfo.length > 0) {
			// Store inheritance info in returnType for now (could be extended with new field)
			typeExport.returnType = `extends ${extendsInfo.join(", ")}`;
		}

		// Extract interface members (simplified)
		const memberCount = this.countInterfaceMembers(node);
		if (memberCount > 0) {
			// Could add member count or other metrics
		}
	}

	/**
	 * Extract extends clause from interface
	 */
	private extractExtendsClause(node: Parser.SyntaxNode): string[] {
		const extendsTypes: string[] = [];

		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (child && child.type === "extends_clause") {
				const types = this.extractTypeList(child);
				extendsTypes.push(...types);
			}
		}

		return extendsTypes;
	}

	/**
	 * Extract type list from a clause
	 */
	private extractTypeList(clause: Parser.SyntaxNode): string[] {
		const types: string[] = [];

		for (let i = 0; i < clause.namedChildCount; i++) {
			const child = clause.namedChild(i);
			if (child) {
				if (child.type === "identifier") {
					types.push(child.text);
				} else if (child.type === "generic_type") {
					types.push(child.text);
				}
			}
		}

		return types;
	}

	/**
	 * Count interface members (simplified)
	 */
	private countInterfaceMembers(node: Parser.SyntaxNode): number {
		const objectType = this.findObjectType(node);
		if (!objectType) {
			return 0;
		}

		let count = 0;
		for (let i = 0; i < objectType.namedChildCount; i++) {
			const member = objectType.namedChild(i);
			if (member && this.isInterfaceMember(member)) {
				count++;
			}
		}

		return count;
	}

	/**
	 * Find object type in interface declaration
	 */
	private findObjectType(
		node: Parser.SyntaxNode,
	): Parser.SyntaxNode | undefined {
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (
				child &&
				(child.type === "object_type" || child.type === "interface_body")
			) {
				return child;
			}
		}
		return undefined;
	}

	/**
	 * Check if node is an interface member
	 */
	private isInterfaceMember(node: Parser.SyntaxNode): boolean {
		return (
			node.type === "property_signature" ||
			node.type === "method_signature" ||
			node.type === "call_signature" ||
			node.type === "construct_signature"
		);
	}

	/**
	 * Enrich type alias information
	 */
	private enrichTypeAliasInfo(
		typeExport: ExportMethodInfo,
		node: Parser.SyntaxNode,
	): void {
		// Extract the aliased type
		const aliasedType = this.extractAliasedType(node);
		if (aliasedType) {
			typeExport.returnType = aliasedType;
		}

		// Check if it's a union or intersection type
		const typeKind = this.getTypeAliasKind(node);
		if (typeKind) {
			// Could add a new field for type kind, for now use returnType
			if (typeExport.returnType) {
				typeExport.returnType = `${typeKind}: ${typeExport.returnType}`;
			} else {
				typeExport.returnType = typeKind;
			}
		}
	}

	/**
	 * Extract the type being aliased
	 */
	private extractAliasedType(node: Parser.SyntaxNode): string | undefined {
		// Look for the type after the equals sign
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (child && child.text === "=") {
				// The next meaningful child should be the type
				for (let j = i + 1; j < node.childCount; j++) {
					const typeChild = node.child(j);
					if (typeChild && typeChild.type !== "comment") {
						return typeChild.text;
					}
				}
			}
		}

		return undefined;
	}

	/**
	 * Get type alias kind (union, intersection, etc.)
	 */
	private getTypeAliasKind(node: Parser.SyntaxNode): string | undefined {
		const aliasedType = this.extractAliasedType(node);
		if (!aliasedType) {
			return undefined;
		}

		if (aliasedType.includes("|")) {
			return "union";
		}
		if (aliasedType.includes("&")) {
			return "intersection";
		}
		if (aliasedType.includes("=>")) {
			return "function";
		}
		if (aliasedType.startsWith("{") && aliasedType.endsWith("}")) {
			return "object";
		}
		if (aliasedType.includes("<") && aliasedType.includes(">")) {
			return "generic";
		}

		return "primitive";
	}

	/**
	 * Enrich enum information
	 */
	private enrichEnumInfo(
		typeExport: ExportMethodInfo,
		node: Parser.SyntaxNode,
	): void {
		// Override exportType for enums
		typeExport.exportType = "enum";

		// Count enum members
		const memberCount = this.countEnumMembers(node);
		if (memberCount > 0) {
			typeExport.returnType = `${memberCount} members`;
		}

		// Check if it's a const enum
		if (this.isConstEnum(node)) {
			typeExport.returnType = typeExport.returnType
				? `const enum: ${typeExport.returnType}`
				: "const enum";
		}
	}

	/**
	 * Count enum members
	 */
	private countEnumMembers(node: Parser.SyntaxNode): number {
		const enumBody = this.findEnumBody(node);
		if (!enumBody) {
			return 0;
		}

		let count = 0;
		for (let i = 0; i < enumBody.namedChildCount; i++) {
			const member = enumBody.namedChild(i);
			if (member && member.type === "enum_assignment") {
				count++;
			}
		}

		return count;
	}

	/**
	 * Find enum body
	 */
	private findEnumBody(node: Parser.SyntaxNode): Parser.SyntaxNode | undefined {
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (child && child.type === "enum_body") {
				return child;
			}
		}
		return undefined;
	}

	/**
	 * Check if enum is const enum
	 */
	private isConstEnum(node: Parser.SyntaxNode): boolean {
		const text = node.text;
		return text.includes("const enum");
	}

	/**
	 * Determine declaration type based on context
	 */
	private getDeclarationType(
		node: Parser.SyntaxNode,
		_context: ProcessingContext,
	): ExportMethodInfo["declarationType"] {
		// Check if it's a default export
		const parent = node.parent;
		if (parent && parent.type === "export_statement") {
			const exportText = parent.text;
			if (exportText.includes("export default")) {
				return "default_export";
			}
		}

		return "named_export";
	}
}
