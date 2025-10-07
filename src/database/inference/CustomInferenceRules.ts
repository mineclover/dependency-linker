/**
 * Custom Inference Rules
 * 사용자 정의 추론 규칙 시스템
 */

import type { GraphDatabase } from "../GraphDatabase";

export interface CustomRule {
	id: string;
	name: string;
	description: string;
	condition: RuleCondition;
	action: RuleAction;
	priority: number;
	enabled: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface RuleCondition {
	type:
		| "node_property"
		| "relationship_exists"
		| "path_exists"
		| "custom_function";
	field?: string;
	operator?:
		| "equals"
		| "not_equals"
		| "contains"
		| "starts_with"
		| "ends_with"
		| "greater_than"
		| "less_than";
	value?: any;
	path?: string[];
	customFunction?: string;
	parameters?: Record<string, any>;
}

export interface RuleAction {
	type:
		| "create_relationship"
		| "update_property"
		| "delete_relationship"
		| "custom_function";
	relationshipType?: string;
	propertyName?: string;
	propertyValue?: any;
	customFunction?: string;
	parameters?: Record<string, any>;
}

export interface RuleExecutionContext {
	fromNodeId: number;
	toNodeId?: number;
	relationshipType?: string;
	metadata?: Record<string, any>;
}

export interface RuleExecutionResult {
	ruleId: string;
	executed: boolean;
	createdRelationships: number;
	updatedProperties: number;
	deletedRelationships: number;
	executionTime: number;
	error?: string;
}

export interface CustomRuleEngine {
	registerRule(rule: CustomRule): Promise<void>;
	unregisterRule(ruleId: string): Promise<void>;
	updateRule(ruleId: string, updates: Partial<CustomRule>): Promise<void>;
	executeRules(context: RuleExecutionContext): Promise<RuleExecutionResult[]>;
	getRule(ruleId: string): CustomRule | undefined;
	getAllRules(): CustomRule[];
	validateRule(rule: CustomRule): ValidationResult;
}

export interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

/**
 * 사용자 정의 추론 규칙 엔진
 */
export class CustomInferenceRuleEngine implements CustomRuleEngine {
	private rules = new Map<string, CustomRule>();
	private database: GraphDatabase;
	private customFunctions = new Map<string, Function>();

	constructor(database: GraphDatabase) {
		this.database = database;
		this.initializeBuiltInFunctions();
	}

	/**
	 * 규칙 등록
	 */
	async registerRule(rule: CustomRule): Promise<void> {
		// 규칙 검증
		const validation = this.validateRule(rule);
		if (!validation.valid) {
			throw new Error(`Invalid rule: ${validation.errors.join(", ")}`);
		}

		// ID 중복 확인
		if (this.rules.has(rule.id)) {
			throw new Error(`Rule with ID '${rule.id}' already exists`);
		}

		// 규칙 저장
		this.rules.set(rule.id, {
			...rule,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}

	/**
	 * 규칙 제거
	 */
	async unregisterRule(ruleId: string): Promise<void> {
		if (!this.rules.has(ruleId)) {
			throw new Error(`Rule with ID '${ruleId}' not found`);
		}

		this.rules.delete(ruleId);
	}

	/**
	 * 규칙 업데이트
	 */
	async updateRule(
		ruleId: string,
		updates: Partial<CustomRule>,
	): Promise<void> {
		const existingRule = this.rules.get(ruleId);
		if (!existingRule) {
			throw new Error(`Rule with ID '${ruleId}' not found`);
		}

		const updatedRule = {
			...existingRule,
			...updates,
			updatedAt: new Date(),
		};

		// 업데이트된 규칙 검증
		const validation = this.validateRule(updatedRule);
		if (!validation.valid) {
			throw new Error(`Invalid rule update: ${validation.errors.join(", ")}`);
		}

		this.rules.set(ruleId, updatedRule);
	}

	/**
	 * 규칙 실행
	 */
	async executeRules(
		context: RuleExecutionContext,
	): Promise<RuleExecutionResult[]> {
		const results: RuleExecutionResult[] = [];

		// 우선순위별로 정렬된 규칙들
		const sortedRules = Array.from(this.rules.values())
			.filter((rule) => rule.enabled)
			.sort((a, b) => b.priority - a.priority);

		for (const rule of sortedRules) {
			const startTime = performance.now();
			const result: RuleExecutionResult = {
				ruleId: rule.id,
				executed: false,
				createdRelationships: 0,
				updatedProperties: 0,
				deletedRelationships: 0,
				executionTime: 0,
			};

			try {
				// 조건 확인
				const conditionMet = await this.evaluateCondition(
					rule.condition,
					context,
				);

				if (conditionMet) {
					// 액션 실행
					await this.executeAction(rule.action, context, result);
					result.executed = true;
				}

				result.executionTime = performance.now() - startTime;
			} catch (error) {
				result.error = error instanceof Error ? error.message : "Unknown error";
			}

			results.push(result);
		}

		return results;
	}

	/**
	 * 규칙 조회
	 */
	getRule(ruleId: string): CustomRule | undefined {
		return this.rules.get(ruleId);
	}

	/**
	 * 모든 규칙 조회
	 */
	getAllRules(): CustomRule[] {
		return Array.from(this.rules.values());
	}

	/**
	 * 규칙 검증
	 */
	validateRule(rule: CustomRule): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// 필수 필드 확인
		if (!rule.id || rule.id.trim() === "") {
			errors.push("Rule ID is required");
		}

		if (!rule.name || rule.name.trim() === "") {
			errors.push("Rule name is required");
		}

		if (!rule.condition) {
			errors.push("Rule condition is required");
		}

		if (!rule.action) {
			errors.push("Rule action is required");
		}

		// 조건 검증
		if (rule.condition) {
			this.validateCondition(rule.condition, errors, warnings);
		}

		// 액션 검증
		if (rule.action) {
			this.validateAction(rule.action, errors, warnings);
		}

		// 우선순위 검증
		if (rule.priority < 0 || rule.priority > 1000) {
			warnings.push("Priority should be between 0 and 1000");
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * 조건 평가
	 */
	private async evaluateCondition(
		condition: RuleCondition,
		context: RuleExecutionContext,
	): Promise<boolean> {
		switch (condition.type) {
			case "node_property":
				return this.evaluateNodePropertyCondition(condition, context);
			case "relationship_exists":
				return this.evaluateRelationshipExistsCondition(condition, context);
			case "path_exists":
				return this.evaluatePathExistsCondition(condition, context);
			case "custom_function":
				return this.evaluateCustomFunctionCondition(condition, context);
			default:
				return false;
		}
	}

	/**
	 * 노드 속성 조건 평가
	 */
	private async evaluateNodePropertyCondition(
		condition: RuleCondition,
		context: RuleExecutionContext,
	): Promise<boolean> {
		if (
			!condition.field ||
			condition.operator === undefined ||
			condition.value === undefined
		) {
			return false;
		}

		const nodes = await this.database.findNodes({ nodeTypes: ["class"] });
		const node = nodes.find((n) => n.id === context.fromNodeId);
		if (!node) {
			return false;
		}

		const fieldValue = (node as any)[condition.field];
		return this.compareValues(fieldValue, condition.value, condition.operator);
	}

	/**
	 * 관계 존재 조건 평가
	 */
	private async evaluateRelationshipExistsCondition(
		condition: RuleCondition,
		context: RuleExecutionContext,
	): Promise<boolean> {
		if (!context.toNodeId || !condition.field) {
			return false;
		}

		const relationships = await this.database.findRelationships({
			fromNodeIds: [context.fromNodeId],
			toNodeIds: [context.toNodeId],
			relationshipTypes: [condition.field],
		});

		return relationships.length > 0;
	}

	/**
	 * 경로 존재 조건 평가
	 */
	private async evaluatePathExistsCondition(
		condition: RuleCondition,
		context: RuleExecutionContext,
	): Promise<boolean> {
		if (!condition.path || condition.path.length === 0) {
			return false;
		}

		// 간단한 경로 존재 확인 (실제로는 더 복잡한 경로 탐색이 필요)
		const relationships = await this.database.findRelationships({
			fromNodeIds: [context.fromNodeId],
			relationshipTypes: condition.path,
		});

		return relationships.length > 0;
	}

	/**
	 * 사용자 정의 함수 조건 평가
	 */
	private async evaluateCustomFunctionCondition(
		condition: RuleCondition,
		context: RuleExecutionContext,
	): Promise<boolean> {
		if (!condition.customFunction) {
			return false;
		}

		const customFunction = this.customFunctions.get(condition.customFunction);
		if (!customFunction) {
			throw new Error(
				`Custom function '${condition.customFunction}' not found`,
			);
		}

		return await customFunction(context, condition.parameters || {});
	}

	/**
	 * 액션 실행
	 */
	private async executeAction(
		action: RuleAction,
		context: RuleExecutionContext,
		result: RuleExecutionResult,
	): Promise<void> {
		switch (action.type) {
			case "create_relationship":
				await this.executeCreateRelationshipAction(action, context, result);
				break;
			case "update_property":
				await this.executeUpdatePropertyAction(action, context, result);
				break;
			case "delete_relationship":
				await this.executeDeleteRelationshipAction(action, context, result);
				break;
			case "custom_function":
				await this.executeCustomFunctionAction(action, context, result);
				break;
		}
	}

	/**
	 * 관계 생성 액션 실행
	 */
	private async executeCreateRelationshipAction(
		action: RuleAction,
		context: RuleExecutionContext,
		result: RuleExecutionResult,
	): Promise<void> {
		if (!action.relationshipType || !context.toNodeId) {
			return;
		}

		// 실제 구현에서는 createRelationship 메서드가 필요
		// await this.database.createRelationship({
		//   fromNodeId: context.fromNodeId,
		//   toNodeId: context.toNodeId,
		//   type: action.relationshipType,
		//   metadata: context.metadata || {},
		// });

		result.createdRelationships++;
	}

	/**
	 * 속성 업데이트 액션 실행
	 */
	private async executeUpdatePropertyAction(
		action: RuleAction,
		_context: RuleExecutionContext,
		result: RuleExecutionResult,
	): Promise<void> {
		if (!action.propertyName || action.propertyValue === undefined) {
			return;
		}

		// 노드 업데이트 (실제 구현에서는 GraphDatabase에 updateNode 메서드가 필요)
		// await this.database.updateNode(context.fromNodeId, {
		//   [action.propertyName]: action.propertyValue
		// });

		result.updatedProperties++;
	}

	/**
	 * 관계 삭제 액션 실행
	 */
	private async executeDeleteRelationshipAction(
		action: RuleAction,
		context: RuleExecutionContext,
		result: RuleExecutionResult,
	): Promise<void> {
		if (!action.relationshipType || !context.toNodeId) {
			return;
		}

		const relationships = await this.database.findRelationships({
			fromNodeIds: [context.fromNodeId],
			toNodeIds: [context.toNodeId],
			relationshipTypes: [action.relationshipType],
		});

		for (const relationship of relationships) {
			await this.database.deleteRelationship(relationship.id!);
			result.deletedRelationships++;
		}
	}

	/**
	 * 사용자 정의 함수 액션 실행
	 */
	private async executeCustomFunctionAction(
		action: RuleAction,
		context: RuleExecutionContext,
		_result: RuleExecutionResult,
	): Promise<void> {
		if (!action.customFunction) {
			return;
		}

		const customFunction = this.customFunctions.get(action.customFunction);
		if (!customFunction) {
			throw new Error(`Custom function '${action.customFunction}' not found`);
		}

		await customFunction(context, action.parameters || {});
	}

	/**
	 * 값 비교
	 */
	private compareValues(actual: any, expected: any, operator: string): boolean {
		switch (operator) {
			case "equals":
				return actual === expected;
			case "not_equals":
				return actual !== expected;
			case "contains":
				return String(actual).includes(String(expected));
			case "starts_with":
				return String(actual).startsWith(String(expected));
			case "ends_with":
				return String(actual).endsWith(String(expected));
			case "greater_than":
				return Number(actual) > Number(expected);
			case "less_than":
				return Number(actual) < Number(expected);
			default:
				return false;
		}
	}

	/**
	 * 조건 검증
	 */
	private validateCondition(
		condition: RuleCondition,
		errors: string[],
		_warnings: string[],
	): void {
		if (!condition.type) {
			errors.push("Condition type is required");
			return;
		}

		switch (condition.type) {
			case "node_property":
				if (!condition.field) {
					errors.push("Field is required for node_property condition");
				}
				if (!condition.operator) {
					errors.push("Operator is required for node_property condition");
				}
				if (condition.value === undefined) {
					errors.push("Value is required for node_property condition");
				}
				break;
			case "relationship_exists":
				if (!condition.field) {
					errors.push("Field is required for relationship_exists condition");
				}
				break;
			case "path_exists":
				if (!condition.path || condition.path.length === 0) {
					errors.push("Path is required for path_exists condition");
				}
				break;
			case "custom_function":
				if (!condition.customFunction) {
					errors.push(
						"Custom function is required for custom_function condition",
					);
				}
				break;
		}
	}

	/**
	 * 액션 검증
	 */
	private validateAction(
		action: RuleAction,
		errors: string[],
		_warnings: string[],
	): void {
		if (!action.type) {
			errors.push("Action type is required");
			return;
		}

		switch (action.type) {
			case "create_relationship":
				if (!action.relationshipType) {
					errors.push(
						"Relationship type is required for create_relationship action",
					);
				}
				break;
			case "update_property":
				if (!action.propertyName) {
					errors.push("Property name is required for update_property action");
				}
				if (action.propertyValue === undefined) {
					errors.push("Property value is required for update_property action");
				}
				break;
			case "delete_relationship":
				if (!action.relationshipType) {
					errors.push(
						"Relationship type is required for delete_relationship action",
					);
				}
				break;
			case "custom_function":
				if (!action.customFunction) {
					errors.push("Custom function is required for custom_function action");
				}
				break;
		}
	}

	/**
	 * 내장 함수 초기화
	 */
	private initializeBuiltInFunctions(): void {
		// 예시 내장 함수들
		this.customFunctions.set(
			"is_high_priority",
			async (context: RuleExecutionContext) => {
				// 고우선순위 노드 확인 로직
				return context.metadata?.priority === "high";
			},
		);

		this.customFunctions.set(
			"has_dependencies",
			async (context: RuleExecutionContext) => {
				const relationships = await this.database.findRelationships({
					fromNodeIds: [context.fromNodeId],
					relationshipTypes: ["depends_on"],
				});
				return relationships.length > 0;
			},
		);
	}

	/**
	 * 사용자 정의 함수 등록
	 */
	registerCustomFunction(name: string, func: Function): void {
		this.customFunctions.set(name, func);
	}

	/**
	 * 사용자 정의 함수 제거
	 */
	unregisterCustomFunction(name: string): void {
		this.customFunctions.delete(name);
	}
}
