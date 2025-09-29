/**
 * Typed Common Queries
 * 타입 안전한 공통 쿼리 정의들
 */

import type { TypedQueryDefinition } from "./TypedQueryProcessors";
import {
	createFunctionCallsProcessor,
	createImportSourcesProcessor,
	createJSXComponentsProcessor,
	createNamedImportsProcessor,
	createReactHooksProcessor,
	TypedQueryResultCollector,
} from "./TypedQueryProcessors";

// 글로벌 수집기 인스턴스 (각 쿼리 실행 시 새로 생성됨)
const _createCollector = () => new TypedQueryResultCollector();

/**
 * 타입 안전한 Import Sources 쿼리
 */
export const TYPED_IMPORT_SOURCES_QUERY: TypedQueryDefinition<"import-sources"> =
	{
		name: "typed-import-sources-collector",
		description: "Type-safe import sources collection for tsx, ts, jsx, js",
		query: `
    (import_statement
      source: (string) @source)
  `,
		processor: (matches, context, collector) => {
			const processor = createImportSourcesProcessor(collector);
			processor(matches, context);
		},
		languages: ["typescript", "tsx", "javascript", "jsx"],
		resultType: "import-sources",
		priority: 100,
		enabled: true,
	};

/**
 * 타입 안전한 Named Imports 쿼리
 */
export const TYPED_NAMED_IMPORTS_QUERY: TypedQueryDefinition<"named-imports"> =
	{
		name: "typed-named-imports-collector",
		description: "Type-safe named imports collection for tsx, ts, jsx, js",
		query: `
    (import_statement
      (import_clause
        (named_imports
          (import_specifier
            name: (identifier) @named_import
            alias: (identifier)? @import_alias)))
      source: (string) @source)
  `,
		processor: (matches, context, collector) => {
			const processor = createNamedImportsProcessor(collector);
			processor(matches, context);
		},
		languages: ["typescript", "tsx", "javascript", "jsx"],
		resultType: "named-imports",
		priority: 95,
		enabled: true,
	};

/**
 * 타입 안전한 Default Imports 쿼리
 */
export const TYPED_DEFAULT_IMPORTS_QUERY: TypedQueryDefinition<"default-imports"> =
	{
		name: "typed-default-imports-collector",
		description: "Type-safe default imports collection for tsx, ts, jsx, js",
		query: `
    (import_statement
      (import_clause
        (identifier) @default_import)
      source: (string) @source)
  `,
		processor: (matches, context, collector) => {
			for (const match of matches) {
				const captures: Record<string, any[]> = {};

				for (const capture of match.captures) {
					if (!captures[capture.name]) captures[capture.name] = [];
					captures[capture.name].push(capture.node);
				}

				const defaultImports = captures.default_import || [];
				const sources = captures.source || [];

				for (let i = 0; i < defaultImports.length; i++) {
					const defaultImport = defaultImports[i];
					const source = sources[Math.min(i, sources.length - 1)];

					if (defaultImport && source) {
						const result = {
							queryName: "default-imports" as const,
							location: {
								line: defaultImport.startPosition.row + 1,
								column: defaultImport.startPosition.column,
								offset: 0,
								endLine: defaultImport.endPosition.row + 1,
								endColumn: defaultImport.endPosition.column,
								endOffset: 0,
							},
							nodeText: defaultImport.text,
							name: defaultImport.text,
							source: context.extractStringFromNode(source),
						};

						collector.addResult("default-imports", result);
					}
				}
			}
		},
		languages: ["typescript", "tsx", "javascript", "jsx"],
		resultType: "default-imports",
		priority: 90,
		enabled: true,
	};

/**
 * 타입 안전한 Type Imports 쿼리 (TypeScript 전용)
 */
export const TYPED_TYPE_IMPORTS_QUERY: TypedQueryDefinition<"type-imports"> = {
	name: "typed-type-imports-collector",
	description: "Type-safe TypeScript type imports collection for tsx, ts",
	query: `
    (import_statement
      "type"
      (import_clause
        (named_imports
          (import_specifier
            name: (identifier) @type_name)))
      source: (string) @source)
  `,
	processor: (matches, context, collector) => {
		for (const match of matches) {
			const captures: Record<string, any[]> = {};

			for (const capture of match.captures) {
				if (!captures[capture.name]) captures[capture.name] = [];
				captures[capture.name].push(capture.node);
			}

			const sources = captures.source || [];
			const typeNames = captures.type_name || [];
			const typeAliases = captures.type_alias || [];
			const defaultTypes = captures.default_type || [];
			const namespaceTypes = captures.namespace_type || [];

			if (sources.length > 0) {
				const source = context.extractStringFromNode(sources[0]);

				// Named type imports: import type { FC, ReactNode } from 'react'
				typeNames.forEach((typeNode, i) => {
					const alias = typeAliases[i];
					const result = {
						queryName: "type-imports" as const,
						location: {
							line: typeNode.startPosition.row + 1,
							column: typeNode.startPosition.column,
							offset: 0,
							endLine: typeNode.endPosition.row + 1,
							endColumn: typeNode.endPosition.column,
							endOffset: 0,
						},
						nodeText: typeNode.text,
						typeName: typeNode.text,
						source,
						alias: alias?.text,
						importType: "named" as const,
					};

					collector.addResult("type-imports", result);
				});

				// Default type imports: import type React from 'react'
				defaultTypes.forEach((typeNode) => {
					const result = {
						queryName: "type-imports" as const,
						location: {
							line: typeNode.startPosition.row + 1,
							column: typeNode.startPosition.column,
							offset: 0,
							endLine: typeNode.endPosition.row + 1,
							endColumn: typeNode.endPosition.column,
							endOffset: 0,
						},
						nodeText: typeNode.text,
						typeName: typeNode.text,
						source,
						importType: "default" as const,
					};

					collector.addResult("type-imports", result);
				});

				// Namespace type imports: import type * as Types from './types'
				namespaceTypes.forEach((typeNode) => {
					const result = {
						queryName: "type-imports" as const,
						location: {
							line: typeNode.startPosition.row + 1,
							column: typeNode.startPosition.column,
							offset: 0,
							endLine: typeNode.endPosition.row + 1,
							endColumn: typeNode.endPosition.column,
							endOffset: 0,
						},
						nodeText: typeNode.text,
						typeName: typeNode.text,
						source,
						importType: "namespace" as const,
					};

					collector.addResult("type-imports", result);
				});
			}
		}
	},
	languages: ["typescript", "tsx"],
	resultType: "type-imports",
	priority: 88,
	enabled: true,
};

/**
 * 타입 안전한 Function Calls 쿼리
 */
export const TYPED_FUNCTION_CALLS_QUERY: TypedQueryDefinition<"function-calls"> =
	{
		name: "typed-function-calls-collector",
		description: "Type-safe function calls collection for tsx, ts, jsx, js",
		query: `
    (call_expression
      function: (identifier) @function_name)
  `,
		processor: (matches, context, collector) => {
			const processor = createFunctionCallsProcessor(collector);
			processor(matches, context);
		},
		languages: ["typescript", "tsx", "javascript", "jsx"],
		resultType: "function-calls",
		priority: 80,
		enabled: true,
	};

/**
 * 타입 안전한 React Hooks 쿼리
 */
export const TYPED_REACT_HOOKS_QUERY: TypedQueryDefinition<"react-hooks"> = {
	name: "typed-react-hooks-collector",
	description: "Type-safe React hooks collection for tsx, jsx",
	query: `
    (call_expression
      function: (identifier) @hook_name
      (#match? @hook_name "^use[A-Z]"))
  `,
	processor: (matches, context, collector) => {
		const processor = createReactHooksProcessor(collector);
		processor(matches, context);
	},
	languages: ["typescript", "tsx", "javascript", "jsx"],
	resultType: "react-hooks",
	priority: 85,
	enabled: true,
};

/**
 * 타입 안전한 Property Access 쿼리
 */
export const TYPED_PROPERTY_ACCESS_QUERY: TypedQueryDefinition<"property-access"> =
	{
		name: "typed-property-access-collector",
		description: "Type-safe property access collection for tsx, ts, jsx, js",
		query: `
    (member_expression
      object: (identifier) @object_name
      property: (property_identifier) @property_name)
  `,
		processor: (matches, context, collector) => {
			for (const match of matches) {
				const captures: Record<string, any[]> = {};

				for (const capture of match.captures) {
					if (!captures[capture.name]) captures[capture.name] = [];
					captures[capture.name].push(capture.node);
				}

				const objects = captures.object_name || [];
				const properties = captures.property_name || [];

				for (let i = 0; i < Math.min(objects.length, properties.length); i++) {
					const objectNode = objects[i];
					const propertyNode = properties[i];
					const importInfo = context.importMap.get(objectNode.text);

					const result = {
						queryName: "property-access" as const,
						location: {
							line: propertyNode.startPosition.row + 1,
							column: propertyNode.startPosition.column,
							offset: 0,
							endLine: propertyNode.endPosition.row + 1,
							endColumn: propertyNode.endPosition.column,
							endOffset: 0,
						},
						nodeText: propertyNode.text,
						objectName: objectNode.text,
						propertyName: propertyNode.text,
						source: importInfo?.source,
						accessType: "read" as const,
						isChained: false, // 추후 더 정교한 분석 가능
					};

					collector.addResult("property-access", result);
				}
			}
		},
		languages: ["typescript", "tsx", "javascript", "jsx"],
		resultType: "property-access",
		priority: 75,
		enabled: true,
	};

/**
 * 타입 안전한 JSX Components 쿼리
 */
export const TYPED_JSX_COMPONENTS_QUERY: TypedQueryDefinition<"jsx-components"> =
	{
		name: "typed-jsx-components-collector",
		description: "Type-safe JSX components collection for tsx, jsx",
		query: `
    [
      (jsx_opening_element
        name: (identifier) @component_name)
      (jsx_self_closing_element
        name: (identifier) @component_name)
    ]
  `,
		processor: (matches, context, collector) => {
			const processor = createJSXComponentsProcessor(collector);
			processor(matches, context);
		},
		languages: ["typescript", "tsx", "javascript", "jsx"],
		resultType: "jsx-components",
		priority: 70,
		enabled: true,
	};

/**
 * 타입 안전한 JSX Props 쿼리
 */
export const TYPED_JSX_PROPS_QUERY: TypedQueryDefinition<"jsx-props"> = {
	name: "typed-jsx-props-collector",
	description: "Type-safe JSX props collection for tsx, jsx",
	query: `
    (jsx_attribute
      name: (property_identifier) @prop_name
      value: (_) @prop_value)
  `,
	processor: (matches, _context, collector) => {
		for (const match of matches) {
			const captures: Record<string, any[]> = {};

			for (const capture of match.captures) {
				if (!captures[capture.name]) captures[capture.name] = [];
				captures[capture.name].push(capture.node);
			}

			const propNames = captures.prop_name || [];
			const propValues = captures.prop_value || [];

			for (let i = 0; i < Math.min(propNames.length, propValues.length); i++) {
				const propNameNode = propNames[i];
				const propValueNode = propValues[i];

				// 컴포넌트명 추출
				let componentName = "unknown";
				let current = propNameNode.parent;
				while (current) {
					if (
						current.type === "jsx_opening_element" ||
						current.type === "jsx_self_closing_element"
					) {
						const nameNode = current.childForFieldName("name");
						if (nameNode) {
							componentName = nameNode.text;
							break;
						}
					}
					current = current.parent;
				}

				// prop 타입 추정
				let propType:
					| "string"
					| "number"
					| "boolean"
					| "expression"
					| "function"
					| "object" = "string";
				const valueText = propValueNode.text;

				if (propValueNode.type === "jsx_expression_container") {
					propType = "expression";
				} else if (valueText.match(/^\d+$/)) {
					propType = "number";
				} else if (valueText === "true" || valueText === "false") {
					propType = "boolean";
				} else if (valueText.includes("=>") || valueText.includes("function")) {
					propType = "function";
				} else if (valueText.startsWith("{") && valueText.endsWith("}")) {
					propType = "object";
				}

				const result = {
					queryName: "jsx-props" as const,
					location: {
						line: propNameNode.startPosition.row + 1,
						column: propNameNode.startPosition.column,
						offset: 0,
						endLine: propNameNode.endPosition.row + 1,
						endColumn: propNameNode.endPosition.column,
						endOffset: 0,
					},
					nodeText: propNameNode.text,
					componentName,
					propName: propNameNode.text,
					propValue: valueText,
					propType,
					isDynamic: propValueNode.type === "jsx_expression_container",
				};

				collector.addResult("jsx-props", result);
			}
		}
	},
	languages: ["typescript", "tsx", "javascript", "jsx"],
	resultType: "jsx-props",
	priority: 65,
	enabled: true,
};

/**
 * 모든 타입 안전한 쿼리들
 */
export const ALL_TYPED_QUERIES: Array<TypedQueryDefinition<any>> = [
	TYPED_IMPORT_SOURCES_QUERY,
	TYPED_NAMED_IMPORTS_QUERY,
	TYPED_DEFAULT_IMPORTS_QUERY,
	TYPED_TYPE_IMPORTS_QUERY,
	TYPED_FUNCTION_CALLS_QUERY,
	TYPED_REACT_HOOKS_QUERY,
	TYPED_PROPERTY_ACCESS_QUERY,
	TYPED_JSX_COMPONENTS_QUERY,
	TYPED_JSX_PROPS_QUERY,
];

/**
 * Import 관련 타입 안전한 쿼리들
 */
export const TYPED_IMPORT_QUERIES: Array<TypedQueryDefinition<any>> = [
	TYPED_IMPORT_SOURCES_QUERY,
	TYPED_NAMED_IMPORTS_QUERY,
	TYPED_DEFAULT_IMPORTS_QUERY,
	TYPED_TYPE_IMPORTS_QUERY,
];

/**
 * Usage 관련 타입 안전한 쿼리들
 */
export const TYPED_USAGE_QUERIES: Array<TypedQueryDefinition<any>> = [
	TYPED_FUNCTION_CALLS_QUERY,
	TYPED_REACT_HOOKS_QUERY,
	TYPED_PROPERTY_ACCESS_QUERY,
];

/**
 * JSX 관련 타입 안전한 쿼리들
 */
export const TYPED_JSX_QUERIES: Array<TypedQueryDefinition<any>> = [
	TYPED_JSX_COMPONENTS_QUERY,
	TYPED_JSX_PROPS_QUERY,
];

/**
 * TypeScript 전용 타입 안전한 쿼리들
 */
export const TYPED_TYPESCRIPT_QUERIES: Array<TypedQueryDefinition<any>> = [
	TYPED_TYPE_IMPORTS_QUERY,
];
