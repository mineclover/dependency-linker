/**
 * TypeScript Class Definition Queries
 * 클래스 정의 관련 쿼리들
 */

import type Parser from "tree-sitter";
import type { QueryFunction } from "../../core/types";
import type { QueryMatch, QueryExecutionContext } from "../../core/types";
import { extractLocation } from "../../utils/ast-helpers";

/**
 * Class definition query processor
 */
export const tsClassDefinitions: QueryFunction<any> = {
	name: "ts-class-definitions",
	description: "Extract TypeScript class definitions",
	query: `
		(class_declaration
			name: (type_identifier) @class_name
			type_parameters: (type_parameters)? @type_params
			(class_heritage)? @heritage
			body: (class_body) @class_body) @class
	`,
	languages: ["typescript", "tsx"] as const,
	priority: 1,
	resultType: "ts-class-definitions",
	processor: (matches: QueryMatch[], context: QueryExecutionContext) => {
		const results = matches.map((match) => {
			const classNode = match.captures.find(
				(c: any) => c.name === "class",
			)?.node;
			const className = match.captures.find((c: any) => c.name === "class_name")
				?.node?.text;
			const typeParams = match.captures.find(
				(c: any) => c.name === "type_params",
			)?.node?.text;
			const heritage = match.captures.find((c: any) => c.name === "heritage")
				?.node?.text;
			const classBody = match.captures.find((c: any) => c.name === "class_body")
				?.node?.text;

			return {
				class_name: className,
				type_parameters: typeParams,
				heritage: heritage,
				class_body: classBody,
				location: extractLocation(classNode || context.tree.rootNode),
			};
		});

		return results;
	},
};

/**
 * Interface definition query processor
 */
export const tsInterfaceDefinitions: QueryFunction<any> = {
	name: "ts-interface-definitions",
	description: "Extract TypeScript interface definitions",
	query: `
		(interface_declaration
			name: (type_identifier) @interface_name
			type_parameters: (type_parameters)? @type_params
			body: (interface_body) @interface_body) @interface
	`,
	languages: ["typescript", "tsx"] as const,
	priority: 1,
	resultType: "ts-interface-definitions",
	processor: (matches: QueryMatch[], context: QueryExecutionContext) => {
		const results = matches.map((match) => {
			const interfaceNode = match.captures.find(
				(c: any) => c.name === "interface",
			)?.node;
			const interfaceName = match.captures.find(
				(c: any) => c.name === "interface_name",
			)?.node?.text;
			const typeParams = match.captures.find(
				(c: any) => c.name === "type_params",
			)?.node?.text;
			const interfaceBody = match.captures.find(
				(c: any) => c.name === "interface_body",
			)?.node?.text;

			return {
				interface_name: interfaceName,
				type_parameters: typeParams,
				interface_body: interfaceBody,
				location: extractLocation(interfaceNode || context.tree.rootNode),
			};
		});

		return results;
	},
};

/**
 * Function definition query processor
 */
export const tsFunctionDefinitions: QueryFunction<any> = {
	name: "ts-function-definitions",
	description: "Extract TypeScript function definitions",
	query: `
		(function_declaration
			name: (identifier) @function_name
			parameters: (formal_parameters) @parameters
			return_type: (type_annotation)? @return_type
			body: (statement_block) @function_body) @function
	`,
	languages: ["typescript", "tsx"] as const,
	priority: 1,
	resultType: "ts-function-definitions",
	processor: (matches: QueryMatch[], context: QueryExecutionContext) => {
		const results = matches.map((match) => {
			const functionNode = match.captures.find(
				(c: any) => c.name === "function",
			)?.node;
			const functionName = match.captures.find(
				(c: any) => c.name === "function_name",
			)?.node?.text;
			const parameters = match.captures.find(
				(c: any) => c.name === "parameters",
			)?.node?.text;
			const returnType = match.captures.find(
				(c: any) => c.name === "return_type",
			)?.node?.text;
			const functionBody = match.captures.find(
				(c: any) => c.name === "function_body",
			)?.node?.text;

			return {
				function_name: functionName,
				parameters: parameters,
				return_type: returnType,
				function_body: functionBody,
				location: extractLocation(functionNode || context.tree.rootNode),
			};
		});

		return results;
	},
};

/**
 * Method definition query processor
 */
export const tsMethodDefinitions: QueryFunction<any> = {
	name: "ts-method-definitions",
	description: "Extract TypeScript method definitions",
	query: `
		(method_definition
			name: (property_identifier) @method_name
			parameters: (formal_parameters) @parameters
			return_type: (type_annotation)? @return_type
			body: (statement_block) @method_body) @method
	`,
	languages: ["typescript", "tsx"] as const,
	priority: 1,
	resultType: "ts-method-definitions",
	processor: (matches: QueryMatch[], context: QueryExecutionContext) => {
		const results = matches.map((match) => {
			const methodNode = match.captures.find(
				(c: any) => c.name === "method",
			)?.node;
			const methodName = match.captures.find(
				(c: any) => c.name === "method_name",
			)?.node?.text;
			const parameters = match.captures.find(
				(c: any) => c.name === "parameters",
			)?.node?.text;
			const returnType = match.captures.find(
				(c: any) => c.name === "return_type",
			)?.node?.text;
			const methodBody = match.captures.find(
				(c: any) => c.name === "method_body",
			)?.node?.text;

			return {
				method_name: methodName,
				parameters: parameters,
				return_type: returnType,
				method_body: methodBody,
				location: extractLocation(methodNode || context.tree.rootNode),
			};
		});

		return results;
	},
};

/**
 * Variable definition query processor
 */
export const tsVariableDefinitions: QueryFunction<any> = {
	name: "ts-variable-definitions",
	description: "Extract TypeScript variable definitions",
	query: `
		(variable_declaration
			declarator: (variable_declarator
				name: (identifier) @variable_name
				type: (type_annotation)? @variable_type
				value: (expression)? @initializer)) @variable
	`,
	languages: ["typescript", "tsx"] as const,
	priority: 1,
	resultType: "ts-variable-definitions",
	processor: (matches: QueryMatch[], context: QueryExecutionContext) => {
		const results = matches.map((match) => {
			const variableNode = match.captures.find(
				(c: any) => c.name === "variable",
			)?.node;
			const variableName = match.captures.find(
				(c: any) => c.name === "variable_name",
			)?.node?.text;
			const variableType = match.captures.find(
				(c: any) => c.name === "variable_type",
			)?.node?.text;
			const initializer = match.captures.find(
				(c: any) => c.name === "initializer",
			)?.node?.text;

			return {
				variable_name: variableName,
				variable_type: variableType,
				initializer: initializer,
				location: extractLocation(variableNode || context.tree.rootNode),
			};
		});

		return results;
	},
};

/**
 * Arrow function definition query processor
 */
export const tsArrowFunctionDefinitions: QueryFunction<any> = {
	name: "ts-arrow-function-definitions",
	description: "Extract TypeScript arrow function definitions",
	query: `
		(arrow_function
			parameters: (formal_parameters) @parameters
			return_type: (type_annotation)? @return_type
			body: (statement_block) @function_body) @arrow_function
	`,
	languages: ["typescript", "tsx"] as const,
	priority: 1,
	resultType: "ts-arrow-function-definitions",
	processor: (matches: QueryMatch[], context: QueryExecutionContext) => {
		const results = matches.map((match) => {
			const arrowFunctionNode = match.captures.find(
				(c: any) => c.name === "arrow_function",
			)?.node;
			const functionName = match.captures.find(
				(c: any) => c.name === "function_name",
			)?.node?.text;
			const parameters = match.captures.find(
				(c: any) => c.name === "parameters",
			)?.node?.text;
			const returnType = match.captures.find(
				(c: any) => c.name === "return_type",
			)?.node?.text;
			const functionBody = match.captures.find(
				(c: any) => c.name === "function_body",
			)?.node?.text;

			return {
				function_name: functionName,
				parameters: parameters,
				return_type: returnType,
				function_body: functionBody,
				location: extractLocation(arrowFunctionNode || context.tree.rootNode),
			};
		});

		return results;
	},
};

/**
 * Property definition query processor
 */
export const tsPropertyDefinitions: QueryFunction<any> = {
	name: "ts-property-definitions",
	description: "Extract TypeScript property definitions",
	query: `
		(property_signature
			name: (property_identifier) @property_name
			type: (type_annotation)? @property_type
			value: (expression)? @initializer) @property
	`,
	languages: ["typescript", "tsx"] as const,
	priority: 1,
	resultType: "ts-property-definitions",
	processor: (matches: QueryMatch[], context: QueryExecutionContext) => {
		const results = matches.map((match) => {
			const propertyNode = match.captures.find(
				(c: any) => c.name === "property",
			)?.node;
			const propertyName = match.captures.find(
				(c: any) => c.name === "property_name",
			)?.node?.text;
			const propertyType = match.captures.find(
				(c: any) => c.name === "property_type",
			)?.node?.text;
			const initializer = match.captures.find(
				(c: any) => c.name === "initializer",
			)?.node?.text;

			return {
				property_name: propertyName,
				property_type: propertyType,
				initializer: initializer,
				location: extractLocation(propertyNode || context.tree.rootNode),
			};
		});

		return results;
	},
};

/**
 * Type definition query processor
 */
export const tsTypeDefinitions: QueryFunction<any> = {
	name: "ts-type-definitions",
	description: "Extract TypeScript type definitions",
	query: `
		(type_alias_declaration
			name: (type_identifier) @type_name
			type_parameters: (type_parameters)? @type_parameters
			value: (type) @type_body) @type
	`,
	languages: ["typescript", "tsx"] as const,
	priority: 1,
	resultType: "ts-type-definitions",
	processor: (matches: QueryMatch[], context: QueryExecutionContext) => {
		const results = matches.map((match) => {
			const typeNode = match.captures.find((c: any) => c.name === "type")?.node;
			const typeName = match.captures.find((c: any) => c.name === "type_name")
				?.node?.text;
			const typeParameters = match.captures.find(
				(c: any) => c.name === "type_parameters",
			)?.node?.text;
			const typeBody = match.captures.find((c: any) => c.name === "type_body")
				?.node?.text;

			return {
				type_name: typeName,
				type_parameters: typeParameters,
				type_body: typeBody,
				location: extractLocation(typeNode || context.tree.rootNode),
			};
		});

		return results;
	},
};

/**
 * Enum definition query processor
 */
export const tsEnumDefinitions: QueryFunction<any> = {
	name: "ts-enum-definitions",
	description: "Extract TypeScript enum definitions",
	query: `
		(enum_declaration
			name: (identifier) @enum_name
			body: (enum_body) @enum_body) @enum
	`,
	languages: ["typescript", "tsx"] as const,
	priority: 1,
	resultType: "ts-enum-definitions",
	processor: (matches: QueryMatch[], context: QueryExecutionContext) => {
		const results = matches.map((match) => {
			const enumNode = match.captures.find((c: any) => c.name === "enum")?.node;
			const enumName = match.captures.find((c: any) => c.name === "enum_name")
				?.node?.text;
			const enumBody = match.captures.find((c: any) => c.name === "enum_body")
				?.node?.text;

			return {
				enum_name: enumName,
				enum_body: enumBody,
				location: extractLocation(enumNode || context.tree.rootNode),
			};
		});

		return results;
	},
};

export default {
	"ts-class-definitions": tsClassDefinitions,
	"ts-interface-definitions": tsInterfaceDefinitions,
	"ts-function-definitions": tsFunctionDefinitions,
	"ts-method-definitions": tsMethodDefinitions,
	"ts-variable-definitions": tsVariableDefinitions,
	"ts-arrow-function-definitions": tsArrowFunctionDefinitions,
	"ts-property-definitions": tsPropertyDefinitions,
	"ts-type-definitions": tsTypeDefinitions,
	"ts-enum-definitions": tsEnumDefinitions,
};
