/**
 * Typed Query Processors
 * 타입 안전한 쿼리 처리기들과 결과 변환 유틸리티
 */

import type {
	QueryDefinition,
	QueryProcessorContext,
} from "./QueryConfiguration";
import type {
	ComprehensiveQueryResult,
	ExtendedSourceLocation,
	FunctionCallResult,
	ImportSourceResult,
	JSXComponentResult,
	NamedImportResult,
	QueryExecutionResult,
	QueryResult,
	QueryResultMapping,
	ReactHookResult,
} from "./QueryResults";

export type { QueryProcessorContext } from "./QueryConfiguration";

/**
 * 타입 안전한 쿼리 결과 수집기
 */
export class TypedQueryResultCollector {
	private results = new Map<string, QueryResult[]>();

	/**
	 * 결과 추가
	 */
	addResult<T extends keyof QueryResultMapping>(
		queryName: T,
		result: QueryResultMapping[T][0],
	): void {
		if (!this.results.has(queryName)) {
			this.results.set(queryName, []);
		}
		this.results.get(queryName)?.push(result);
	}

	/**
	 * 특정 쿼리 결과 조회
	 */
	getResults<T extends keyof QueryResultMapping>(
		queryName: T,
	): QueryResultMapping[T] {
		return (this.results.get(queryName) || []) as QueryResultMapping[T];
	}

	/**
	 * 모든 결과 조회
	 */
	getAllResults(): Map<string, QueryResult[]> {
		return new Map(this.results);
	}

	/**
	 * 결과 초기화
	 */
	clear(): void {
		this.results.clear();
	}
}

/**
 * 노드에서 확장된 소스 위치 정보 추출
 */
function extractSourceLocation(node: any): ExtendedSourceLocation {
	return {
		line: node.startPosition.row + 1,
		column: node.startPosition.column,
		offset: 0, // 추후 계산 필요
		endLine: node.endPosition.row + 1,
		endColumn: node.endPosition.column,
		endOffset: 0, // 추후 계산 필요
	};
}

/**
 * Import Sources 처리기
 */
export const createImportSourcesProcessor = (
	collector: TypedQueryResultCollector,
) => {
	return (matches: any[], context: QueryProcessorContext): void => {
		for (const match of matches) {
			for (const capture of match.captures) {
				if (capture.name === "source") {
					const source = context.extractStringFromNode(capture.node);

					const result: ImportSourceResult = {
						queryName: "import-sources",
						location: extractSourceLocation(capture.node),
						nodeText: capture.node.text,
						source,
						isRelative: source.startsWith("."),
						type: source.startsWith(".") ? "local" : "package",
					};

					collector.addResult("import-sources", result);
				}
			}
		}
	};
};

/**
 * Named Imports 처리기
 */
export const createNamedImportsProcessor = (
	collector: TypedQueryResultCollector,
) => {
	return (matches: any[], context: QueryProcessorContext): void => {
		for (const match of matches) {
			const captures: Record<string, any[]> = {};

			// Capture 그룹화
			for (const capture of match.captures) {
				if (!captures[capture.name]) captures[capture.name] = [];
				captures[capture.name].push(capture.node);
			}

			const sources = captures.source || [];
			const namedImports = captures.named_import || [];
			const aliases = captures.import_alias || [];

			for (let i = 0; i < namedImports.length; i++) {
				const namedImport = namedImports[i];
				const source = sources[Math.min(i, sources.length - 1)];
				const alias = aliases[i];

				if (namedImport && source) {
					const result: NamedImportResult = {
						queryName: "named-imports",
						location: extractSourceLocation(namedImport),
						nodeText: namedImport.text,
						name: namedImport.text,
						source: context.extractStringFromNode(source),
						alias: alias?.text,
						originalName: namedImport.text,
					};

					collector.addResult("named-imports", result);
				}
			}
		}
	};
};

/**
 * Function Calls 처리기
 */
export const createFunctionCallsProcessor = (
	collector: TypedQueryResultCollector,
) => {
	return (matches: any[], context: QueryProcessorContext): void => {
		for (const match of matches) {
			for (const capture of match.captures) {
				if (capture.name === "function_name") {
					const functionName = capture.node.text;
					const importInfo = context.importMap.get(functionName);

					// 인자 추출 시도
					const parent = capture.node.parent;
					const args: string[] = [];
					if (parent && parent.type === "call_expression") {
						const argumentsNode = parent.childForFieldName("arguments");
						if (argumentsNode) {
							for (let i = 0; i < argumentsNode.childCount; i++) {
								const arg = argumentsNode.child(i);
								if (
									arg &&
									arg.type !== "," &&
									arg.type !== "(" &&
									arg.type !== ")"
								) {
									args.push(arg.text);
								}
							}
						}
					}

					// 호출 컨텍스트 판단
					let context_type: FunctionCallResult["context"] = "other";
					let current = capture.node.parent;
					while (current) {
						if (
							current.type === "jsx_element" ||
							current.type === "jsx_fragment"
						) {
							context_type = "component";
							break;
						} else if (current.type === "call_expression") {
							const funcNode = current.childForFieldName("function");
							if (funcNode && funcNode.text === "useEffect") {
								context_type = "useEffect";
								break;
							}
						}
						current = current.parent;
					}

					const result: FunctionCallResult = {
						queryName: "function-calls",
						location: extractSourceLocation(capture.node),
						nodeText: capture.node.text,
						functionName,
						source: importInfo?.source,
						arguments: args,
						context: context_type,
					};

					collector.addResult("function-calls", result);
				}
			}
		}
	};
};

/**
 * React Hooks 처리기
 */
export const createReactHooksProcessor = (
	collector: TypedQueryResultCollector,
) => {
	return (matches: any[], context: QueryProcessorContext): void => {
		for (const match of matches) {
			for (const capture of match.captures) {
				if (capture.name === "hook_name") {
					const hookName = capture.node.text;
					const importInfo = context.importMap.get(hookName);

					// Hook 타입 분류
					let hookType: ReactHookResult["hookType"] = "other";
					if (hookName.startsWith("useState")) hookType = "state";
					else if (hookName.startsWith("useEffect")) hookType = "effect";
					else if (hookName.startsWith("useContext")) hookType = "context";
					else if (hookName.startsWith("useRef")) hookType = "ref";
					else if (hookName.startsWith("useMemo")) hookType = "memo";
					else if (hookName.startsWith("useCallback")) hookType = "callback";
					else if (hookName.startsWith("use") && !hookName.match(/^use[A-Z]/))
						hookType = "custom";

					// 인자 및 의존성 배열 추출
					const parent = capture.node.parent;
					const args: string[] = [];
					let dependencies: string[] | undefined;

					if (parent && parent.type === "call_expression") {
						const argumentsNode = parent.childForFieldName("arguments");
						if (argumentsNode) {
							for (let i = 0; i < argumentsNode.childCount; i++) {
								const arg = argumentsNode.child(i);
								if (
									arg &&
									arg.type !== "," &&
									arg.type !== "(" &&
									arg.type !== ")"
								) {
									args.push(arg.text);
								}
							}

							// useEffect, useMemo, useCallback의 의존성 배열 추출
							if (
								["useEffect", "useMemo", "useCallback"].includes(hookName) &&
								args.length > 1
							) {
								const depArray = args[1];
								if (depArray.startsWith("[") && depArray.endsWith("]")) {
									dependencies = depArray
										.slice(1, -1)
										.split(",")
										.map((s) => s.trim())
										.filter(Boolean);
								}
							}
						}
					}

					const result: ReactHookResult = {
						queryName: "react-hooks",
						location: extractSourceLocation(capture.node),
						nodeText: capture.node.text,
						hookName,
						source: importInfo?.source || "react",
						arguments: args,
						hookType,
						dependencies,
					};

					collector.addResult("react-hooks", result);
				}
			}
		}
	};
};

/**
 * JSX Components 처리기
 */
export const createJSXComponentsProcessor = (
	collector: TypedQueryResultCollector,
) => {
	return (matches: any[], context: QueryProcessorContext): void => {
		for (const match of matches) {
			for (const capture of match.captures) {
				if (capture.name === "component_name") {
					const componentName = capture.node.text;
					const importInfo = context.importMap.get(componentName);

					// JSX 요소 정보 추출
					const jsxElement = capture.node.parent;
					let childrenCount = 0;
					let isSelfClosing = false;
					let isConditional = false;

					if (jsxElement) {
						// self-closing 확인
						isSelfClosing = jsxElement.type === "jsx_self_closing_element";

						// 자식 요소 개수 계산
						if (!isSelfClosing) {
							for (let i = 0; i < jsxElement.childCount; i++) {
								const child = jsxElement.child(i);
								if (
									child &&
									["jsx_element", "jsx_text", "jsx_expression"].includes(
										child.type,
									)
								) {
									childrenCount++;
								}
							}
						}

						// 조건부 렌더링 확인
						let current = jsxElement.parent;
						while (current) {
							if (
								current.type === "conditional_expression" ||
								current.type === "logical_expression"
							) {
								isConditional = true;
								break;
							}
							current = current.parent;
						}
					}

					const result: JSXComponentResult = {
						queryName: "jsx-components",
						location: extractSourceLocation(capture.node),
						nodeText: capture.node.text,
						componentName,
						source: importInfo?.source,
						childrenCount,
						isSelfClosing,
						isConditional,
					};

					collector.addResult("jsx-components", result);
				}
			}
		}
	};
};

/**
 * 쿼리 정의와 타입 안전한 처리기 매핑
 */
export interface TypedQueryDefinition<T extends keyof QueryResultMapping>
	extends Omit<QueryDefinition, "processor"> {
	processor: (
		matches: any[],
		context: QueryProcessorContext,
		collector: TypedQueryResultCollector,
	) => void;
	resultType: T;
}

/**
 * 타입 안전한 쿼리 실행기
 */
export class TypedQueryExecutor {
	private collector = new TypedQueryResultCollector();

	/**
	 * 쿼리 실행
	 */
	executeQuery<T extends keyof QueryResultMapping>(
		queryDef: TypedQueryDefinition<T>,
		matches: any[],
		context: QueryProcessorContext,
	): QueryExecutionResult<T> {
		const startTime = performance.now();

		try {
			this.collector.clear();
			queryDef.processor(matches, context, this.collector);

			const endTime = performance.now();
			const results = this.collector.getResults(queryDef.resultType);

			return {
				queryName: queryDef.resultType,
				success: true,
				results,
				executionTime: endTime - startTime,
				nodeCount: matches.length,
			};
		} catch (error) {
			const endTime = performance.now();

			return {
				queryName: queryDef.resultType,
				success: false,
				results: [] as QueryResultMapping[T],
				executionTime: endTime - startTime,
				error: error instanceof Error ? error.message : String(error),
				nodeCount: matches.length,
			};
		}
	}

	/**
	 * 여러 쿼리 일괄 실행
	 */
	executeQueries(
		queries: Array<{ definition: TypedQueryDefinition<any>; matches: any[] }>,
		context: QueryProcessorContext,
	): ComprehensiveQueryResult {
		const timestamp = new Date().toISOString();
		const totalStartTime = performance.now();

		const results: any = {
			imports: {},
			usage: {},
			jsx: {},
		};

		let totalQueries = 0;
		let successfulQueries = 0;
		let totalNodes = 0;

		for (const { definition, matches } of queries) {
			const result = this.executeQuery(definition, matches, context);
			totalQueries++;
			totalNodes += result.nodeCount;

			if (result.success) {
				successfulQueries++;
			}

			// 결과를 적절한 카테고리에 배치
			if (definition.resultType.includes("import")) {
				results.imports[definition.resultType.replace("-", "")] = result;
			} else if (definition.resultType.includes("jsx")) {
				results.jsx[definition.resultType.replace("jsx-", "")] = result;
			} else {
				results.usage[definition.resultType.replace("-", "")] = result;
			}
		}

		const totalEndTime = performance.now();
		const totalExecutionTime = totalEndTime - totalStartTime;

		return {
			filePath: context.usageMap.has("__filePath")
				? String(context.usageMap.get("__filePath"))
				: "",
			timestamp,
			totalExecutionTime,
			imports: results.imports,
			usage: results.usage,
			jsx: results.jsx,
			summary: {
				totalQueries,
				successfulQueries,
				failedQueries: totalQueries - successfulQueries,
				totalNodes,
				avgExecutionTime: totalExecutionTime / totalQueries,
			},
		};
	}
}
