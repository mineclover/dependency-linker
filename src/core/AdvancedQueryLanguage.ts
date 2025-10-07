/**
 * Advanced Query Language
 * 고급 쿼리 언어 시스템 - SQL-like 문법과 GraphQL-like 쿼리 지원
 */

export interface QueryAST {
	type: "SELECT" | "WHERE" | "ORDER_BY" | "LIMIT" | "GROUP_BY" | "HAVING";
	fields?: string[];
	conditions?: QueryCondition[];
	orderBy?: OrderByClause[];
	limit?: number;
	offset?: number;
	groupBy?: string[];
	having?: QueryCondition[];
}

export interface QueryCondition {
	field: string;
	operator:
		| "="
		| "!="
		| ">"
		| "<"
		| ">="
		| "<="
		| "LIKE"
		| "IN"
		| "NOT_IN"
		| "EXISTS"
		| "NOT_EXISTS";
	value: any;
	logicalOperator?: "AND" | "OR";
}

export interface OrderByClause {
	field: string;
	direction: "ASC" | "DESC";
}

export interface GraphQLQuery {
	query: string;
	variables?: Record<string, any>;
	operationName?: string;
}

export interface GraphQLField {
	name: string;
	alias?: string;
	arguments?: Record<string, any>;
	selectionSet?: GraphQLField[];
}

export interface GraphQLSelectionSet {
	fields: GraphQLField[];
}

export interface GraphQLOperation {
	type: "query" | "mutation" | "subscription";
	name?: string;
	selectionSet: GraphQLSelectionSet;
	variables?: Record<string, any>;
}

/**
 * 고급 쿼리 언어 파서
 */
export class AdvancedQueryParser {
	/**
	 * SQL-like 쿼리 파싱
	 */
	parseSQLQuery(query: string): QueryAST {
		const tokens = this.tokenize(query);
		return this.parseSQLTokens(tokens);
	}

	/**
	 * GraphQL 쿼리 파싱
	 */
	parseGraphQLQuery(query: string): GraphQLOperation {
		const tokens = this.tokenizeGraphQL(query);
		return this.parseGraphQLTokens(tokens);
	}

	/**
	 * 자연어 쿼리 파싱
	 */
	parseNaturalLanguageQuery(query: string): QueryAST {
		// 자연어를 SQL-like 쿼리로 변환
		const normalizedQuery = this.normalizeNaturalLanguage(query);
		return this.parseSQLQuery(normalizedQuery);
	}

	/**
	 * 쿼리 토큰화
	 */
	private tokenize(query: string): string[] {
		return query
			.replace(/\s+/g, " ")
			.trim()
			.split(/(\s+|[(),;])/)
			.filter((token) => token.trim() !== "");
	}

	/**
	 * GraphQL 토큰화
	 */
	private tokenizeGraphQL(query: string): string[] {
		return query
			.replace(/\s+/g, " ")
			.trim()
			.split(/(\s+|{|}|\(|\)|:|,|!|\[|\])/)
			.filter((token) => token.trim() !== "");
	}

	/**
	 * SQL 토큰 파싱
	 */
	private parseSQLTokens(tokens: string[]): QueryAST {
		const ast: QueryAST = { type: "SELECT" };
		let i = 0;

		while (i < tokens.length) {
			const token = tokens[i].toUpperCase();

			switch (token) {
				case "SELECT":
					ast.fields = this.parseSelectFields(tokens, i + 1);
					i = this.findNextKeyword(tokens, i + 1);
					break;

				case "WHERE":
					ast.conditions = this.parseWhereConditions(tokens, i + 1);
					i = this.findNextKeyword(tokens, i + 1);
					break;

				case "ORDER":
					if (tokens[i + 1]?.toUpperCase() === "BY") {
						ast.orderBy = this.parseOrderBy(tokens, i + 2);
						i = this.findNextKeyword(tokens, i + 2);
					} else {
						i++;
					}
					break;

				case "LIMIT":
					ast.limit = parseInt(tokens[i + 1], 10);
					i += 2;
					break;

				case "OFFSET":
					ast.offset = parseInt(tokens[i + 1], 10);
					i += 2;
					break;

				case "GROUP":
					if (tokens[i + 1]?.toUpperCase() === "BY") {
						ast.groupBy = this.parseGroupBy(tokens, i + 2);
						i = this.findNextKeyword(tokens, i + 2);
					} else {
						i++;
					}
					break;

				case "HAVING":
					ast.having = this.parseWhereConditions(tokens, i + 1);
					i = this.findNextKeyword(tokens, i + 1);
					break;

				default:
					i++;
			}
		}

		return ast;
	}

	/**
	 * GraphQL 토큰 파싱
	 */
	private parseGraphQLTokens(tokens: string[]): GraphQLOperation {
		const operation: GraphQLOperation = {
			type: "query",
			selectionSet: { fields: [] },
		};

		let i = 0;
		while (i < tokens.length) {
			const token = tokens[i];

			if (
				token === "query" ||
				token === "mutation" ||
				token === "subscription"
			) {
				operation.type = token as "query" | "mutation" | "subscription";
				i++;
			} else if (token === "{") {
				operation.selectionSet = this.parseSelectionSet(tokens, i + 1);
				break;
			} else {
				i++;
			}
		}

		return operation;
	}

	/**
	 * SELECT 필드 파싱
	 */
	private parseSelectFields(tokens: string[], startIndex: number): string[] {
		const fields: string[] = [];
		let i = startIndex;

		while (i < tokens.length && tokens[i] !== "FROM" && tokens[i] !== "WHERE") {
			if (tokens[i] !== "," && tokens[i] !== "*") {
				fields.push(tokens[i]);
			}
			i++;
		}

		return fields;
	}

	/**
	 * WHERE 조건 파싱
	 */
	private parseWhereConditions(
		tokens: string[],
		startIndex: number,
	): QueryCondition[] {
		const conditions: QueryCondition[] = [];
		let i = startIndex;

		while (
			i < tokens.length &&
			tokens[i] !== "ORDER" &&
			tokens[i] !== "GROUP" &&
			tokens[i] !== "LIMIT"
		) {
			if (tokens[i] === "AND" || tokens[i] === "OR") {
				i++;
				continue;
			}

			const condition: QueryCondition = {
				field: tokens[i],
				operator: tokens[i + 1] as any,
				value: this.parseValue(tokens[i + 2]),
			};

			if (i > startIndex && tokens[i - 1] === "OR") {
				condition.logicalOperator = "OR";
			}

			conditions.push(condition);
			i += 3;
		}

		return conditions;
	}

	/**
	 * ORDER BY 파싱
	 */
	private parseOrderBy(tokens: string[], startIndex: number): OrderByClause[] {
		const orderBy: OrderByClause[] = [];
		let i = startIndex;

		while (
			i < tokens.length &&
			tokens[i] !== "LIMIT" &&
			tokens[i] !== "GROUP"
		) {
			if (tokens[i] !== ",") {
				const field = tokens[i];
				const direction =
					tokens[i + 1]?.toUpperCase() === "DESC" ? "DESC" : "ASC";

				orderBy.push({ field, direction });
				i += direction === "DESC" ? 2 : 1;
			} else {
				i++;
			}
		}

		return orderBy;
	}

	/**
	 * GROUP BY 파싱
	 */
	private parseGroupBy(tokens: string[], startIndex: number): string[] {
		const groupBy: string[] = [];
		let i = startIndex;

		while (
			i < tokens.length &&
			tokens[i] !== "HAVING" &&
			tokens[i] !== "ORDER" &&
			tokens[i] !== "LIMIT"
		) {
			if (tokens[i] !== ",") {
				groupBy.push(tokens[i]);
			}
			i++;
		}

		return groupBy;
	}

	/**
	 * GraphQL SelectionSet 파싱
	 */
	private parseSelectionSet(
		tokens: string[],
		startIndex: number,
	): GraphQLSelectionSet {
		const fields: GraphQLField[] = [];
		let i = startIndex;

		while (i < tokens.length && tokens[i] !== "}") {
			if (tokens[i] === "{") {
				// 중첩된 SelectionSet
				const nestedSet = this.parseSelectionSet(tokens, i + 1);
				if (fields.length > 0) {
					fields[fields.length - 1].selectionSet = nestedSet.fields;
				}
				i = this.findMatchingBrace(tokens, i) + 1;
			} else if (tokens[i] !== "," && tokens[i] !== " ") {
				const field: GraphQLField = {
					name: tokens[i],
					selectionSet: undefined,
				};

				// 별칭 처리
				if (i + 1 < tokens.length && tokens[i + 1] === ":") {
					field.alias = field.name;
					field.name = tokens[i + 2];
					i += 3;
				} else {
					i++;
				}

				fields.push(field);
			} else {
				i++;
			}
		}

		return { fields };
	}

	/**
	 * 값 파싱
	 */
	private parseValue(value: string): any {
		if (value.startsWith("'") && value.endsWith("'")) {
			return value.slice(1, -1);
		} else if (value === "true" || value === "false") {
			return value === "true";
		} else if (!Number.isNaN(Number(value))) {
			return Number(value);
		} else if (value === "null") {
			return null;
		}
		return value;
	}

	/**
	 * 자연어 정규화
	 */
	private normalizeNaturalLanguage(query: string): string {
		// 간단한 자연어 패턴 매칭
		const patterns = [
			{
				pattern: /find all (.+) that (.+)/i,
				replacement: "SELECT * WHERE $1 $2",
			},
			{ pattern: /show me (.+) from (.+)/i, replacement: "SELECT $1 FROM $2" },
			{ pattern: /get (.+) where (.+)/i, replacement: "SELECT $1 WHERE $2" },
			{
				pattern: /list (.+) ordered by (.+)/i,
				replacement: "SELECT $1 ORDER BY $2",
			},
		];

		for (const { pattern, replacement } of patterns) {
			if (pattern.test(query)) {
				return query.replace(pattern, replacement);
			}
		}

		return query;
	}

	/**
	 * 다음 키워드 찾기
	 */
	private findNextKeyword(tokens: string[], startIndex: number): number {
		const keywords = [
			"SELECT",
			"FROM",
			"WHERE",
			"ORDER",
			"GROUP",
			"HAVING",
			"LIMIT",
			"OFFSET",
		];
		for (let i = startIndex; i < tokens.length; i++) {
			if (keywords.includes(tokens[i].toUpperCase())) {
				return i;
			}
		}
		return tokens.length;
	}

	/**
	 * 매칭하는 중괄호 찾기
	 */
	private findMatchingBrace(tokens: string[], startIndex: number): number {
		let braceCount = 1;
		for (let i = startIndex + 1; i < tokens.length; i++) {
			if (tokens[i] === "{") {
				braceCount++;
			} else if (tokens[i] === "}") {
				braceCount--;
				if (braceCount === 0) {
					return i;
				}
			}
		}
		return tokens.length;
	}
}

/**
 * 고급 쿼리 실행 엔진
 */
export class AdvancedQueryExecutor {
	private parser = new AdvancedQueryParser();

	/**
	 * SQL-like 쿼리 실행
	 */
	async executeSQLQuery(query: string, dataSource: any): Promise<any[]> {
		const ast = this.parser.parseSQLQuery(query);
		return this.executeSQLAST(ast, dataSource);
	}

	/**
	 * GraphQL 쿼리 실행
	 */
	async executeGraphQLQuery(query: string, dataSource: any): Promise<any> {
		const operation = this.parser.parseGraphQLQuery(query);
		return this.executeGraphQLOperation(operation, dataSource);
	}

	/**
	 * 자연어 쿼리 실행
	 */
	async executeNaturalLanguageQuery(
		query: string,
		dataSource: any,
	): Promise<any[]> {
		const ast = this.parser.parseNaturalLanguageQuery(query);
		return this.executeSQLAST(ast, dataSource);
	}

	/**
	 * SQL AST 실행
	 */
	private async executeSQLAST(ast: QueryAST, dataSource: any): Promise<any[]> {
		let results = Array.isArray(dataSource) ? dataSource : [dataSource];

		// WHERE 조건 적용
		if (ast.conditions) {
			results = results.filter((item) =>
				this.evaluateConditions(item, ast.conditions || []),
			);
		}

		// SELECT 필드 선택
		if (ast.fields && ast.fields.length > 0) {
			results = results.map((item) => {
				const selected: any = {};
				ast.fields?.forEach((field) => {
					if (field === "*") {
						Object.assign(selected, item);
					} else {
						selected[field] = item[field];
					}
				});
				return selected;
			});
		}

		// GROUP BY 적용
		if (ast.groupBy && ast.groupBy.length > 0) {
			results = this.applyGroupBy(results, ast.groupBy);
		}

		// HAVING 조건 적용
		if (ast.having) {
			results = results.filter((item) =>
				this.evaluateConditions(item, ast.having || []),
			);
		}

		// ORDER BY 적용
		if (ast.orderBy && ast.orderBy.length > 0) {
			results = this.applyOrderBy(results, ast.orderBy);
		}

		// LIMIT 적용
		if (ast.limit) {
			const offset = ast.offset || 0;
			results = results.slice(offset, offset + ast.limit);
		}

		return results;
	}

	/**
	 * GraphQL Operation 실행
	 */
	private async executeGraphQLOperation(
		operation: GraphQLOperation,
		dataSource: any,
	): Promise<any> {
		const result: any = {};

		for (const field of operation.selectionSet.fields) {
			if (field.selectionSet) {
				// 중첩된 필드 처리
				result[field.alias || field.name] = await this.executeGraphQLOperation(
					{ type: "query", selectionSet: { fields: field.selectionSet } },
					dataSource[field.name],
				);
			} else {
				// 단순 필드 처리
				result[field.alias || field.name] = dataSource[field.name];
			}
		}

		return result;
	}

	/**
	 * 조건 평가
	 */
	private evaluateConditions(item: any, conditions: QueryCondition[]): boolean {
		let result = true;
		let currentLogicalOperator: "AND" | "OR" = "AND";

		for (const condition of conditions) {
			const conditionResult = this.evaluateCondition(item, condition);

			if (currentLogicalOperator === "AND") {
				result = result && conditionResult;
			} else {
				result = result || conditionResult;
			}

			currentLogicalOperator = condition.logicalOperator || "AND";
		}

		return result;
	}

	/**
	 * 단일 조건 평가
	 */
	private evaluateCondition(item: any, condition: QueryCondition): boolean {
		const fieldValue = item[condition.field];
		const { operator, value } = condition;

		switch (operator) {
			case "=":
				return fieldValue === value;
			case "!=":
				return fieldValue !== value;
			case ">":
				return fieldValue > value;
			case "<":
				return fieldValue < value;
			case ">=":
				return fieldValue >= value;
			case "<=":
				return fieldValue <= value;
			case "LIKE":
				return String(fieldValue).includes(String(value));
			case "IN":
				return Array.isArray(value) && value.includes(fieldValue);
			case "NOT_IN":
				return Array.isArray(value) && !value.includes(fieldValue);
			case "EXISTS":
				return fieldValue !== undefined && fieldValue !== null;
			case "NOT_EXISTS":
				return fieldValue === undefined || fieldValue === null;
			default:
				return false;
		}
	}

	/**
	 * GROUP BY 적용
	 */
	private applyGroupBy(results: any[], groupBy: string[]): any[] {
		const groups = new Map<string, any[]>();

		for (const item of results) {
			const key = groupBy.map((field) => item[field]).join("|");
			if (!groups.has(key)) {
				groups.set(key, []);
			}
			groups.get(key)?.push(item);
		}

		return Array.from(groups.values()).map((group) => ({
			...group[0],
			_count: group.length,
		}));
	}

	/**
	 * ORDER BY 적용
	 */
	private applyOrderBy(results: any[], orderBy: OrderByClause[]): any[] {
		return results.sort((a, b) => {
			for (const { field, direction } of orderBy) {
				const aValue = a[field];
				const bValue = b[field];

				if (aValue < bValue) {
					return direction === "ASC" ? -1 : 1;
				} else if (aValue > bValue) {
					return direction === "ASC" ? 1 : -1;
				}
			}
			return 0;
		});
	}
}
