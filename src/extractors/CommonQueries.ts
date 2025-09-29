/**
 * Common Tree-sitter Queries for TypeScript/JavaScript Analysis
 * 자주 사용되는 분석 로직들을 미리 정의된 쿼리로 제공
 */

import type { QueryDefinition } from "./QueryConfiguration";

// =================== IMPORT ANALYSIS QUERIES ===================

/**
 * 1. Import 파일/라이브러리 수집 쿼리
 * 모든 import된 소스(파일/라이브러리) 목록 수집
 */
export const IMPORT_SOURCES_QUERY: QueryDefinition = {
	name: "import-sources-collector",
	description: "Collect all imported sources (files/libraries)",
	query: `
    (import_statement
      source: (string) @import_source)
  `,
	processor: (matches, context) => {
		const sources = new Set<string>();

		for (const match of matches) {
			for (const capture of match.captures) {
				if (capture.name === "import_source") {
					const source = context.extractStringFromNode(capture.node);
					sources.add(source);
				}
			}
		}

		console.log("📦 Import Sources:", Array.from(sources));
	},
	languages: ["typescript", "tsx", "javascript", "jsx"],
	priority: 95,
	enabled: true,
};

/**
 * 2. Named Import 메서드/함수 수집 쿼리
 * { foo, bar, baz } 형태의 named import들 수집
 */
export const NAMED_IMPORTS_QUERY: QueryDefinition = {
	name: "named-imports-collector",
	description: "Collect all named imports with their sources",
	query: `
    (import_statement
      (import_clause
        (named_imports
          (import_specifier
            name: (identifier) @named_import
            alias: (identifier)? @import_alias)))
      source: (string) @source)
  `,
	processor: (matches, context) => {
		const namedImports: { name: string; alias?: string; source: string }[] = [];

		for (const match of matches) {
			const captures: Record<string, any[]> = {};

			for (const capture of match.captures) {
				if (!captures[capture.name]) captures[capture.name] = [];
				captures[capture.name].push(capture.node);
			}

			const sources = captures.source || [];
			const names = captures.named_import || [];
			const aliases = captures.import_alias || [];

			if (sources.length > 0) {
				const source = context.extractStringFromNode(sources[0]);

				names.forEach((nameNode, index) => {
					const name = nameNode.text;
					const alias = aliases[index]?.text;

					namedImports.push({ name, alias, source });
					context.importMap.set(alias || name, {
						source,
						originalName: name,
					});
				});
			}
		}

		console.log("🎯 Named Imports:", namedImports);
	},
	languages: ["typescript", "tsx", "javascript", "jsx"],
	priority: 90,
	enabled: true,
};

/**
 * 3. Default Import 수집 쿼리
 * import React from 'react' 형태의 default import 수집
 */
export const DEFAULT_IMPORTS_QUERY: QueryDefinition = {
	name: "default-imports-collector",
	description: "Collect all default imports",
	query: `
    (import_statement
      (import_clause
        (identifier) @default_import)
      source: (string) @source)
  `,
	processor: (matches, context) => {
		const defaultImports: { name: string; source: string }[] = [];

		for (const match of matches) {
			const captures: Record<string, any[]> = {};

			for (const capture of match.captures) {
				if (!captures[capture.name]) captures[capture.name] = [];
				captures[capture.name].push(capture.node);
			}

			const sources = captures.source || [];
			const imports = captures.default_import || [];

			if (sources.length > 0 && imports.length > 0) {
				const source = context.extractStringFromNode(sources[0]);
				const name = imports[0].text;

				defaultImports.push({ name, source });
				context.importMap.set(name, {
					source,
					originalName: "default",
				});
			}
		}

		console.log("🔤 Default Imports:", defaultImports);
	},
	languages: ["typescript", "tsx", "javascript", "jsx"],
	priority: 90,
	enabled: true,
};

/**
 * 4. Namespace Import 수집 쿼리
 * import * as utils from './utils' 형태의 namespace import 수집
 */
export const NAMESPACE_IMPORTS_QUERY: QueryDefinition = {
	name: "namespace-imports-collector",
	description: "Collect all namespace imports (import * as)",
	query: `
    (import_statement
      (import_clause
        (namespace_import
          name: (identifier) @namespace_alias))
      source: (string) @source)
  `,
	processor: (matches, context) => {
		const namespaceImports: { alias: string; source: string }[] = [];

		for (const match of matches) {
			const captures: Record<string, any[]> = {};

			for (const capture of match.captures) {
				if (!captures[capture.name]) captures[capture.name] = [];
				captures[capture.name].push(capture.node);
			}

			const sources = captures.source || [];
			const aliases = captures.namespace_alias || [];

			if (sources.length > 0 && aliases.length > 0) {
				const source = context.extractStringFromNode(sources[0]);
				const alias = aliases[0].text;

				namespaceImports.push({ alias, source });
				context.importMap.set(alias, {
					source,
					originalName: "*",
				});
			}
		}

		console.log("🌐 Namespace Imports:", namespaceImports);
	},
	languages: ["typescript", "tsx", "javascript", "jsx"],
	priority: 90,
	enabled: true,
};

// =================== USAGE ANALYSIS QUERIES ===================

/**
 * 5. 함수 호출 수집 쿼리
 * 모든 함수 호출 패턴 분석
 */
export const FUNCTION_CALLS_QUERY: QueryDefinition = {
	name: "function-calls-collector",
	description: "Collect all function calls",
	query: `
    (call_expression
      function: (identifier) @function_name)
  `,
	processor: (matches, context) => {
		const functionCalls: { name: string; source?: string }[] = [];

		for (const match of matches) {
			for (const capture of match.captures) {
				if (capture.name === "function_name") {
					const name = capture.node.text;
					const importInfo = context.importMap.get(name);

					if (importInfo) {
						functionCalls.push({ name, source: importInfo.source });
						context.addUsage(importInfo.source, name);
					} else {
						functionCalls.push({ name });
					}
				}
			}
		}

		console.log("🔧 Function Calls:", functionCalls);
	},
	languages: ["typescript", "tsx", "javascript", "jsx"],
	priority: 85,
	enabled: true,
};

/**
 * 6. 메서드 체이닝 수집 쿼리
 * object.method().anotherMethod() 형태의 메서드 체이닝 분석
 */
export const METHOD_CHAINING_QUERY: QueryDefinition = {
	name: "method-chaining-collector",
	description: "Collect method chaining patterns",
	query: `
    (call_expression
      function: (member_expression
        object: (call_expression) @chained_call
        property: (identifier) @method_name))
  `,
	processor: (matches, _context) => {
		const methodChains: { method: string; context: string }[] = [];

		for (const match of matches) {
			const captures: Record<string, any[]> = {};

			for (const capture of match.captures) {
				if (!captures[capture.name]) captures[capture.name] = [];
				captures[capture.name].push(capture.node);
			}

			const methods = captures.method_name || [];
			const calls = captures.chained_call || [];

			methods.forEach((methodNode, index) => {
				const method = methodNode.text;
				const callContext = calls[index]?.text || "";

				methodChains.push({ method, context: callContext });
			});
		}

		console.log("⛓️ Method Chains:", methodChains);
	},
	languages: ["typescript", "tsx", "javascript", "jsx"],
	priority: 80,
	enabled: true,
};

/**
 * 7. Object Property 접근 수집 쿼리
 * object.property 형태의 속성 접근 분석
 */
export const PROPERTY_ACCESS_QUERY: QueryDefinition = {
	name: "property-access-collector",
	description: "Collect object property access patterns",
	query: `
    (member_expression
      object: (identifier) @object_name
      property: (identifier) @property_name)
  `,
	processor: (matches, context) => {
		const propertyAccess: {
			object: string;
			property: string;
			source?: string;
		}[] = [];

		for (const match of matches) {
			const captures: Record<string, any[]> = {};

			for (const capture of match.captures) {
				if (!captures[capture.name]) captures[capture.name] = [];
				captures[capture.name].push(capture.node);
			}

			const objects = captures.object_name || [];
			const properties = captures.property_name || [];

			objects.forEach((objectNode, index) => {
				const object = objectNode.text;
				const property = properties[index]?.text;

				if (property) {
					const importInfo = context.importMap.get(object);

					if (importInfo) {
						propertyAccess.push({
							object,
							property,
							source: importInfo.source,
						});
						context.addUsage(importInfo.source, `${object}.${property}`);
					} else {
						propertyAccess.push({ object, property });
					}
				}
			});
		}

		console.log("🎪 Property Access:", propertyAccess);
	},
	languages: ["typescript", "tsx", "javascript", "jsx"],
	priority: 80,
	enabled: true,
};

// =================== JSX SPECIFIC QUERIES ===================

/**
 * 8. JSX 컴포넌트 사용 수집 쿼리
 * <Component> 형태의 JSX 컴포넌트 사용 분석
 */
export const JSX_COMPONENTS_QUERY: QueryDefinition = {
	name: "jsx-components-collector",
	description: "Collect JSX component usage",
	query: `
    (jsx_element
      opening_element: (jsx_opening_element
        name: (identifier) @component_name))
  `,
	processor: (matches, context) => {
		const jsxComponents: { name: string; source?: string }[] = [];

		for (const match of matches) {
			for (const capture of match.captures) {
				if (capture.name === "component_name") {
					const name = capture.node.text;
					const importInfo = context.importMap.get(name);

					if (importInfo) {
						jsxComponents.push({ name, source: importInfo.source });
						context.addUsage(importInfo.source, `<${name}>`);
					} else {
						jsxComponents.push({ name });
					}
				}
			}
		}

		console.log("🎨 JSX Components:", jsxComponents);
	},
	languages: ["tsx", "jsx"],
	priority: 85,
	enabled: true,
};

/**
 * 9. JSX Props 수집 쿼리
 * <Component prop="value" /> 형태의 JSX props 분석
 */
export const JSX_PROPS_QUERY: QueryDefinition = {
	name: "jsx-props-collector",
	description: "Collect JSX component props",
	query: `
    (jsx_element
      opening_element: (jsx_opening_element
        name: (identifier) @component_name
        attribute: (jsx_attribute
          name: (property_identifier) @prop_name)))
  `,
	processor: (matches, _context) => {
		const jsxProps: { component: string; prop: string }[] = [];

		for (const match of matches) {
			const captures: Record<string, any[]> = {};

			for (const capture of match.captures) {
				if (!captures[capture.name]) captures[capture.name] = [];
				captures[capture.name].push(capture.node);
			}

			const components = captures.component_name || [];
			const props = captures.prop_name || [];

			components.forEach((compNode, _index) => {
				const component = compNode.text;

				props.forEach((propNode) => {
					const prop = propNode.text;
					jsxProps.push({ component, prop });
				});
			});
		}

		console.log("🏷️ JSX Props:", jsxProps);
	},
	languages: ["tsx", "jsx"],
	priority: 75,
	enabled: true,
};

// =================== ADVANCED ANALYSIS QUERIES ===================

/**
 * 10. Hook 사용 패턴 수집 쿼리
 * useState, useEffect 등 React Hook 사용 분석
 */
export const REACT_HOOKS_QUERY: QueryDefinition = {
	name: "react-hooks-collector",
	description: "Collect React hooks usage patterns",
	query: `
    (call_expression
      function: (identifier) @hook_name
      (#match? @hook_name "^use[A-Z]"))
  `,
	processor: (matches, context) => {
		const hooks: { name: string; source?: string }[] = [];

		for (const match of matches) {
			for (const capture of match.captures) {
				if (capture.name === "hook_name") {
					const name = capture.node.text;
					const importInfo = context.importMap.get(name);

					if (importInfo) {
						hooks.push({ name, source: importInfo.source });
						context.addUsage(importInfo.source, name);
					} else {
						hooks.push({ name });
					}
				}
			}
		}

		console.log("🪝 React Hooks:", hooks);
	},
	languages: ["tsx", "jsx", "typescript", "javascript"],
	priority: 85,
	enabled: true,
};

/**
 * 11. Destructuring Assignment 수집 쿼리
 * const { foo, bar } = object 형태의 구조분해할당 분석
 */
export const DESTRUCTURING_QUERY: QueryDefinition = {
	name: "destructuring-collector",
	description: "Collect destructuring assignment patterns",
	query: `
    (variable_declarator
      name: (object_pattern
        (shorthand_property_identifier_pattern) @destructured_var)
      value: (identifier) @source_object)
  `,
	processor: (matches, _context) => {
		const destructuring: { variable: string; source: string }[] = [];

		for (const match of matches) {
			const captures: Record<string, any[]> = {};

			for (const capture of match.captures) {
				if (!captures[capture.name]) captures[capture.name] = [];
				captures[capture.name].push(capture.node);
			}

			const variables = captures.destructured_var || [];
			const sources = captures.source_object || [];

			variables.forEach((varNode) => {
				const variable = varNode.text;
				sources.forEach((sourceNode) => {
					const source = sourceNode.text;
					destructuring.push({ variable, source });
				});
			});
		}

		console.log("🔄 Destructuring:", destructuring);
	},
	languages: ["typescript", "tsx", "javascript", "jsx"],
	priority: 75,
	enabled: true,
};

/**
 * 12. Type Import 수집 쿼리 (TypeScript 전용)
 * import type { Type } from 'module' 형태의 타입 import 분석
 */
export const TYPE_IMPORTS_QUERY: QueryDefinition = {
	name: "type-imports-collector",
	description: "Collect TypeScript type imports",
	query: `
    (import_statement
      "type"
      (import_clause
        (named_imports
          (import_specifier
            name: (identifier) @type_name)))
      source: (string) @source)
  `,
	processor: (matches, context) => {
		const typeImports: { type: string; source: string }[] = [];

		for (const match of matches) {
			const captures: Record<string, any[]> = {};

			for (const capture of match.captures) {
				if (!captures[capture.name]) captures[capture.name] = [];
				captures[capture.name].push(capture.node);
			}

			const types = captures.type_name || [];
			const sources = captures.source || [];

			if (sources.length > 0) {
				const source = context.extractStringFromNode(sources[0]);

				types.forEach((typeNode) => {
					const type = typeNode.text;
					typeImports.push({ type, source });
				});
			}
		}

		console.log("🏷️ Type Imports:", typeImports);
	},
	languages: ["typescript", "tsx"],
	priority: 85,
	enabled: true,
};

// =================== EXPORT COLLECTIONS ===================

/**
 * 모든 일반 쿼리 (Import + Usage + JSX)
 */
export const ALL_COMMON_QUERIES: QueryDefinition[] = [
	IMPORT_SOURCES_QUERY,
	NAMED_IMPORTS_QUERY,
	DEFAULT_IMPORTS_QUERY,
	NAMESPACE_IMPORTS_QUERY,
	FUNCTION_CALLS_QUERY,
	METHOD_CHAINING_QUERY,
	PROPERTY_ACCESS_QUERY,
	JSX_COMPONENTS_QUERY,
	JSX_PROPS_QUERY,
	REACT_HOOKS_QUERY,
	DESTRUCTURING_QUERY,
	TYPE_IMPORTS_QUERY,
];

/**
 * Import 관련 쿼리만
 */
export const IMPORT_QUERIES: QueryDefinition[] = [
	IMPORT_SOURCES_QUERY,
	NAMED_IMPORTS_QUERY,
	DEFAULT_IMPORTS_QUERY,
	NAMESPACE_IMPORTS_QUERY,
	TYPE_IMPORTS_QUERY,
];

/**
 * Usage 관련 쿼리만
 */
export const USAGE_QUERIES: QueryDefinition[] = [
	FUNCTION_CALLS_QUERY,
	METHOD_CHAINING_QUERY,
	PROPERTY_ACCESS_QUERY,
	REACT_HOOKS_QUERY,
	DESTRUCTURING_QUERY,
];

/**
 * JSX 관련 쿼리만
 */
export const JSX_QUERIES: QueryDefinition[] = [
	JSX_COMPONENTS_QUERY,
	JSX_PROPS_QUERY,
];

/**
 * TypeScript 전용 쿼리
 */
export const TYPESCRIPT_QUERIES: QueryDefinition[] = [TYPE_IMPORTS_QUERY];
