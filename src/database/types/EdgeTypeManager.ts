/**
 * Edge Type Management System
 * 동적 엣지 타입 생성, 수정, 삭제 및 의존성 추론 규칙 관리
 */

export interface EdgeTypeDefinition {
	type: string;
	description: string;
	schema: Record<string, any>;
	isDirected: boolean;
	parentType?: string;
	isTransitive: boolean;
	isInheritable: boolean;
	priority: number; // 추론 우선순위 (높을수록 우선)

	// 고급 추론 규칙
	inferenceRules?: InferenceRule[];
	validationRules?: ValidationRule[];
	conflictResolution?: ConflictResolutionStrategy;
}

export interface InferenceRule {
	id: string;
	name: string;
	description: string;
	condition: InferenceCondition;
	action: InferenceAction;
	priority: number;
	enabled: boolean;
}

export interface InferenceCondition {
	type: "path" | "pattern" | "custom";
	pattern?: string; // 경로 패턴 (예: "A -> B -> C")
	nodeTypeConstraints?: string[]; // 노드 타입 제약
	edgeTypeConstraints?: string[]; // 엣지 타입 제약
	customFunction?: string; // 커스텀 조건 함수
	metadata?: Record<string, any>;
}

export interface InferenceAction {
	type: "create_edge" | "update_metadata" | "aggregate" | "custom";
	targetEdgeType: string;
	metadataTransform?: Record<string, any>;
	aggregationMethod?: "count" | "sum" | "max" | "min" | "avg";
	customFunction?: string;
}

export interface ValidationRule {
	id: string;
	type: "uniqueness" | "consistency" | "constraint" | "custom";
	description: string;
	condition: string;
	errorMessage: string;
}

export type ConflictResolutionStrategy =
	| "priority_based" // 우선순위 기반
	| "merge_metadata" // 메타데이터 병합
	| "keep_existing" // 기존 유지
	| "replace_new" // 새로운 것으로 교체
	| "custom"; // 커스텀 전략

export interface EdgeTypeOperationResult {
	success: boolean;
	edgeType?: EdgeTypeDefinition;
	errors?: string[];
	warnings?: string[];
	affectedInferences?: number;
}

/**
 * Edge Type Manager
 * 엣지 타입의 전체 생명주기 관리
 */
export class EdgeTypeManager {
	private edgeTypes = new Map<string, EdgeTypeDefinition>();
	private inferenceEngine: InferenceEngine;

	constructor(private database: any) {
		this.inferenceEngine = new InferenceEngine(database);
		this.loadExistingEdgeTypes();
	}

	/**
	 * 기존 엣지 타입들을 데이터베이스에서 로드
	 */
	private async loadExistingEdgeTypes(): Promise<void> {
		try {
			const sql = `
        SELECT type, description, schema, is_directed, parent_type,
               is_transitive, is_inheritable, priority, metadata
        FROM edge_types
      `;

			this.database.all?.(sql, [], (err: Error | null, rows: any[]) => {
				if (err) {
					console.warn("Failed to load existing edge types:", err);
					return;
				}

				rows.forEach((row) => {
					try {
						const metadata = JSON.parse(row.metadata || "{}");
						const edgeType: EdgeTypeDefinition = {
							type: row.type,
							description: row.description,
							schema: JSON.parse(row.schema || "{}"),
							isDirected: Boolean(row.is_directed),
							parentType: row.parent_type,
							isTransitive: Boolean(row.is_transitive),
							isInheritable: Boolean(row.is_inheritable),
							priority: row.priority,
							inferenceRules: metadata.inferenceRules || [],
							validationRules: metadata.validationRules || [],
							conflictResolution:
								metadata.conflictResolution || "priority_based",
						};

						this.edgeTypes.set(row.type, edgeType);
					} catch (parseError) {
						console.warn(`Failed to parse edge type ${row.type}:`, parseError);
					}
				});
			});
		} catch (error) {
			console.warn("Failed to load existing edge types:", error);
		}
	}

	/**
	 * 새로운 엣지 타입 생성
	 */
	async createEdgeType(
		definition: EdgeTypeDefinition,
	): Promise<EdgeTypeOperationResult> {
		try {
			// 1. 유효성 검증
			const validationResult = await this.validateEdgeType(definition);
			if (!validationResult.isValid) {
				return {
					success: false,
					errors: validationResult.errors,
				};
			}

			// 2. 계층 구조 검증
			if (definition.parentType) {
				const hierarchyValidation = await this.validateHierarchy(definition);
				if (!hierarchyValidation.isValid) {
					return {
						success: false,
						errors: hierarchyValidation.errors,
					};
				}
			}

			// 3. 데이터베이스에 저장
			await this.database.createEdgeType(definition);

			// 4. 메모리 캐시 업데이트
			this.edgeTypes.set(definition.type, definition);

			// 5. 데이터베이스에서 실제 저장된 데이터로 다시 로드
			await this.reloadEdgeType(definition.type);

			// 5. 새로운 추론 규칙 활성화
			let affectedInferences = 0;
			if (definition.inferenceRules) {
				affectedInferences = await this.inferenceEngine.activateRules(
					definition.inferenceRules,
				);
			}

			// 6. 기존 데이터에 대한 소급 추론 실행
			if (definition.isTransitive || definition.isInheritable) {
				await this.inferenceEngine.computeRetroactiveInferences(
					definition.type,
				);
			}

			return {
				success: true,
				edgeType: definition,
				affectedInferences,
			};
		} catch (error) {
			return {
				success: false,
				errors: [
					`Failed to create edge type: ${error instanceof Error ? error.message : String(error)}`,
				],
			};
		}
	}

	/**
	 * 엣지 타입 수정
	 */
	async updateEdgeType(
		type: string,
		updates: Partial<EdgeTypeDefinition>,
	): Promise<EdgeTypeOperationResult> {
		try {
			const existing = this.edgeTypes.get(type);
			if (!existing) {
				return {
					success: false,
					errors: [`Edge type '${type}' not found`],
				};
			}

			const updated = { ...existing, ...updates };

			// 변경 영향도 분석
			const impactAnalysis = await this.analyzeUpdateImpact(existing, updated);

			if (impactAnalysis.requiresRecomputation) {
				// 기존 추론 데이터 클리어
				await this.inferenceEngine.clearInferences(type);
			}

			// 데이터베이스 업데이트
			await this.database.updateEdgeType(type, updates);

			// 캐시 업데이트
			this.edgeTypes.set(type, updated);

			// 추론 재계산
			let affectedInferences = 0;
			if (impactAnalysis.requiresRecomputation) {
				affectedInferences =
					await this.inferenceEngine.recomputeInferences(type);
			}

			return {
				success: true,
				edgeType: updated,
				affectedInferences,
				warnings: impactAnalysis.warnings,
			};
		} catch (error) {
			return {
				success: false,
				errors: [
					`Failed to update edge type: ${error instanceof Error ? error.message : String(error)}`,
				],
			};
		}
	}

	/**
	 * 엣지 타입 삭제
	 */
	async deleteEdgeType(
		type: string,
		force = false,
	): Promise<EdgeTypeOperationResult> {
		try {
			// 의존성 체크
			const dependencies = await this.findDependencies(type);

			if (dependencies.length > 0 && !force) {
				return {
					success: false,
					errors: [`Cannot delete edge type '${type}': has dependencies`],
					warnings: dependencies.map((dep) => `Dependency: ${dep}`),
				};
			}

			// 관련 추론 데이터 삭제
			await this.inferenceEngine.clearInferences(type);

			// 데이터베이스에서 삭제
			await this.database.deleteEdgeType(type);

			// 캐시에서 제거
			this.edgeTypes.delete(type);

			return {
				success: true,
			};
		} catch (error) {
			return {
				success: false,
				errors: [
					`Failed to delete edge type: ${error instanceof Error ? error.message : String(error)}`,
				],
			};
		}
	}

	/**
	 * 특정 엣지 타입을 데이터베이스에서 다시 로드
	 */
	private async reloadEdgeType(type: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const sql = `
        SELECT type, description, schema, is_directed, parent_type,
               is_transitive, is_inheritable, priority, metadata
        FROM edge_types
        WHERE type = ?
      `;

			this.database.get?.(sql, [type], (err: Error | null, row: any) => {
				if (err) {
					reject(err);
					return;
				}

				if (row) {
					try {
						const metadata = JSON.parse(row.metadata || "{}");
						const edgeType: EdgeTypeDefinition = {
							type: row.type,
							description: row.description,
							schema: JSON.parse(row.schema || "{}"),
							isDirected: Boolean(row.is_directed),
							parentType: row.parent_type,
							isTransitive: Boolean(row.is_transitive),
							isInheritable: Boolean(row.is_inheritable),
							priority: row.priority,
							inferenceRules: metadata.inferenceRules || [],
							validationRules: metadata.validationRules || [],
							conflictResolution:
								metadata.conflictResolution || "priority_based",
						};

						this.edgeTypes.set(row.type, edgeType);
						resolve();
					} catch (parseError) {
						reject(parseError);
					}
				} else {
					resolve(); // 없으면 그냥 통과
				}
			});
		});
	}

	/**
	 * 사용 가능한 모든 엣지 타입 조회
	 */
	getAvailableEdgeTypes(): EdgeTypeDefinition[] {
		return Array.from(this.edgeTypes.values());
	}

	/**
	 * 특정 엣지 타입 조회
	 */
	getEdgeType(type: string): EdgeTypeDefinition | undefined {
		return this.edgeTypes.get(type);
	}

	/**
	 * 엣지 타입 계층 구조 조회
	 */
	getEdgeTypeHierarchy(): EdgeTypeHierarchy {
		const hierarchy: EdgeTypeHierarchy = {};

		for (const edgeType of this.edgeTypes.values()) {
			if (!edgeType.parentType) {
				hierarchy[edgeType.type] = this.buildHierarchyNode(edgeType.type);
			}
		}

		return hierarchy;
	}

	private buildHierarchyNode(type: string): EdgeTypeHierarchyNode {
		const edgeType = this.edgeTypes.get(type)!;
		const children = Array.from(this.edgeTypes.values())
			.filter((et) => et.parentType === type)
			.map((et) => this.buildHierarchyNode(et.type));

		return {
			type: edgeType.type,
			definition: edgeType,
			children: children.length > 0 ? children : undefined,
		};
	}

	private async validateEdgeType(
		definition: EdgeTypeDefinition,
	): Promise<ValidationResult> {
		const errors: string[] = [];

		// 기본 유효성 검증
		if (!definition.type || definition.type.trim() === "") {
			errors.push("Edge type name is required");
		}

		if (!/^[a-z][a-z0-9_]*$/.test(definition.type)) {
			errors.push(
				"Edge type name must start with lowercase letter and contain only lowercase letters, numbers, and underscores",
			);
		}

		if (this.edgeTypes.has(definition.type)) {
			errors.push(`Edge type '${definition.type}' already exists`);
		}

		// 스키마 검증
		if (definition.schema) {
			const schemaValidation = this.validateSchema(definition.schema);
			if (!schemaValidation.isValid) {
				errors.push(...schemaValidation.errors);
			}
		}

		// 추론 규칙 검증
		if (definition.inferenceRules) {
			for (const rule of definition.inferenceRules) {
				const ruleValidation = this.validateInferenceRule(rule);
				if (!ruleValidation.isValid) {
					errors.push(...ruleValidation.errors);
				}
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	private async validateHierarchy(
		definition: EdgeTypeDefinition,
	): Promise<ValidationResult> {
		const errors: string[] = [];

		if (definition.parentType) {
			const parent = this.edgeTypes.get(definition.parentType);
			if (!parent) {
				errors.push(
					`Parent edge type '${definition.parentType}' does not exist`,
				);
			} else {
				// 순환 참조 검사
				if (
					await this.wouldCreateCycle(definition.type, definition.parentType)
				) {
					errors.push("Creating this hierarchy would create a cycle");
				}
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	private validateSchema(schema: Record<string, any>): ValidationResult {
		// JSON Schema 유효성 검증 로직
		return { isValid: true, errors: [] };
	}

	private validateInferenceRule(rule: InferenceRule): ValidationResult {
		const errors: string[] = [];

		if (!rule.id || !rule.name) {
			errors.push("Inference rule must have id and name");
		}

		if (rule.priority < 0 || rule.priority > 100) {
			errors.push("Inference rule priority must be between 0 and 100");
		}

		// 조건 검증
		if (!rule.condition.type) {
			errors.push("Inference rule condition type is required");
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	private async wouldCreateCycle(
		childType: string,
		parentType: string,
	): Promise<boolean> {
		const visited = new Set<string>();
		const stack = [parentType];

		while (stack.length > 0) {
			const current = stack.pop()!;

			if (visited.has(current)) {
				continue;
			}

			if (current === childType) {
				return true;
			}

			visited.add(current);

			const currentType = this.edgeTypes.get(current);
			if (currentType?.parentType) {
				stack.push(currentType.parentType);
			}
		}

		return false;
	}

	private async analyzeUpdateImpact(
		existing: EdgeTypeDefinition,
		updated: EdgeTypeDefinition,
	): Promise<UpdateImpactAnalysis> {
		const requiresRecomputation =
			existing.isTransitive !== updated.isTransitive ||
			existing.isInheritable !== updated.isInheritable ||
			existing.parentType !== updated.parentType;

		const warnings: string[] = [];
		if (requiresRecomputation) {
			warnings.push("This update will trigger inference recomputation");
		}

		return {
			requiresRecomputation,
			warnings,
		};
	}

	private async findDependencies(type: string): Promise<string[]> {
		const dependencies: string[] = [];

		// 자식 타입들 찾기
		for (const edgeType of this.edgeTypes.values()) {
			if (edgeType.parentType === type) {
				dependencies.push(`Child type: ${edgeType.type}`);
			}
		}

		// 추론 규칙에서 참조하는지 확인
		for (const edgeType of this.edgeTypes.values()) {
			if (edgeType.inferenceRules) {
				for (const rule of edgeType.inferenceRules) {
					if (rule.action.targetEdgeType === type) {
						dependencies.push(
							`Inference rule: ${rule.name} in ${edgeType.type}`,
						);
					}
				}
			}
		}

		return dependencies;
	}
}

/**
 * Inference Engine
 * 추론 규칙 실행 및 관리
 */
export class InferenceEngine {
	private activeRules = new Map<string, InferenceRule>();

	constructor(private database: any) {}

	async activateRules(rules: InferenceRule[]): Promise<number> {
		let activated = 0;

		for (const rule of rules) {
			if (rule.enabled) {
				this.activeRules.set(rule.id, rule);
				activated++;
			}
		}

		return activated;
	}

	async computeRetroactiveInferences(edgeType: string): Promise<void> {
		// 기존 엣지들에 대해 새로운 추론 규칙 적용
		const edges = await this.database.getEdgesByType(edgeType);

		for (const edge of edges) {
			await this.applyInferenceRules(edge);
		}
	}

	async recomputeInferences(edgeType: string): Promise<number> {
		// 특정 엣지 타입에 대한 모든 추론 재계산
		await this.clearInferences(edgeType);
		await this.computeRetroactiveInferences(edgeType);

		return this.activeRules.size;
	}

	async clearInferences(edgeType: string): Promise<void> {
		await this.database.clearInferenceCache(edgeType);
	}

	private async applyInferenceRules(edge: any): Promise<void> {
		for (const rule of this.activeRules.values()) {
			if (await this.evaluateCondition(rule.condition, edge)) {
				await this.executeAction(rule.action, edge);
			}
		}
	}

	private async evaluateCondition(
		condition: InferenceCondition,
		edge: any,
	): Promise<boolean> {
		switch (condition.type) {
			case "path":
				return this.evaluatePathCondition(condition, edge);
			case "pattern":
				return this.evaluatePatternCondition(condition, edge);
			case "custom":
				return this.evaluateCustomCondition(condition, edge);
			default:
				return false;
		}
	}

	private evaluatePathCondition(
		condition: InferenceCondition,
		edge: any,
	): boolean {
		if (!condition.pattern) return false;

		// 경로 패턴 매칭 (예: "A -> B -> C")
		const pathPattern = condition.pattern.split(" -> ");

		// 노드 타입 제약 확인
		if (condition.nodeTypeConstraints) {
			const fromNodeType = edge.fromNodeType || "unknown";
			const toNodeType = edge.toNodeType || "unknown";

			if (
				!condition.nodeTypeConstraints.includes(fromNodeType) ||
				!condition.nodeTypeConstraints.includes(toNodeType)
			) {
				return false;
			}
		}

		// 엣지 타입 제약 확인
		if (condition.edgeTypeConstraints) {
			return condition.edgeTypeConstraints.includes(edge.type);
		}

		return true;
	}

	private evaluatePatternCondition(
		condition: InferenceCondition,
		edge: any,
	): boolean {
		if (!condition.pattern) return false;

		// 정규식 패턴 매칭
		try {
			const regex = new RegExp(condition.pattern);
			const edgeString = `${edge.fromIdentifier} --[${edge.type}]--> ${edge.toIdentifier}`;
			return regex.test(edgeString);
		} catch (error) {
			return false;
		}
	}

	private evaluateCustomCondition(
		condition: InferenceCondition,
		edge: any,
	): boolean {
		if (!condition.customFunction) return false;

		try {
			// 안전한 커스텀 함수 평가 (실제 구현에서는 sandbox 필요)
			const func = new Function("edge", "metadata", condition.customFunction);
			return func(edge, condition.metadata || {});
		} catch (error) {
			console.warn(`Custom condition evaluation failed: ${error}`);
			return false;
		}
	}

	private async executeAction(
		action: InferenceAction,
		edge: any,
	): Promise<void> {
		switch (action.type) {
			case "create_edge":
				await this.createInferredEdge(action, edge);
				break;
			case "update_metadata":
				await this.updateEdgeMetadata(action, edge);
				break;
			case "aggregate":
				await this.aggregateEdgeData(action, edge);
				break;
			case "custom":
				await this.executeCustomAction(action, edge);
				break;
		}
	}

	private async createInferredEdge(
		action: InferenceAction,
		sourceEdge: any,
	): Promise<void> {
		const inferredMetadata = {
			...sourceEdge.metadata,
			inferred: true,
			sourceEdgeId: sourceEdge.id,
			inferenceRule: action.targetEdgeType,
			...action.metadataTransform,
		};

		// 추론된 엣지를 데이터베이스에 삽입
		const sql = `
      INSERT INTO edges (start_node_id, end_node_id, type, label, metadata, weight)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

		return new Promise((resolve, reject) => {
			this.database.run(
				sql,
				[
					sourceEdge.startNodeId,
					sourceEdge.endNodeId,
					action.targetEdgeType,
					`Inferred from ${sourceEdge.type}`,
					JSON.stringify(inferredMetadata),
					sourceEdge.weight || 1,
				],
				(err: Error | null) => {
					if (err) {
						reject(new Error(`Failed to create inferred edge: ${err.message}`));
					} else {
						resolve();
					}
				},
			);
		});
	}

	private async updateEdgeMetadata(
		action: InferenceAction,
		edge: any,
	): Promise<void> {
		const updatedMetadata = {
			...edge.metadata,
			...action.metadataTransform,
			lastInferenceUpdate: new Date().toISOString(),
		};

		const sql = `UPDATE edges SET metadata = ? WHERE id = ?`;

		return new Promise((resolve, reject) => {
			this.database.run(
				sql,
				[JSON.stringify(updatedMetadata), edge.id],
				(err: Error | null) => {
					if (err) {
						reject(new Error(`Failed to update edge metadata: ${err.message}`));
					} else {
						resolve();
					}
				},
			);
		});
	}

	private async aggregateEdgeData(
		action: InferenceAction,
		edge: any,
	): Promise<void> {
		if (!action.aggregationMethod) return;

		// 같은 타입의 엣지들 집계
		const sql = `
      SELECT COUNT(*) as count, SUM(weight) as total_weight, AVG(weight) as avg_weight,
             MAX(weight) as max_weight, MIN(weight) as min_weight
      FROM edges
      WHERE type = ? AND start_node_id = ? AND end_node_id = ?
    `;

		return new Promise((resolve, reject) => {
			this.database.get(
				sql,
				[edge.type, edge.startNodeId, edge.endNodeId],
				async (err: Error | null, row: any) => {
					if (err) {
						reject(new Error(`Failed to aggregate edge data: ${err.message}`));
						return;
					}

					let aggregatedValue: number;
					switch (action.aggregationMethod) {
						case "count":
							aggregatedValue = row.count;
							break;
						case "sum":
							aggregatedValue = row.total_weight;
							break;
						case "avg":
							aggregatedValue = row.avg_weight;
							break;
						case "max":
							aggregatedValue = row.max_weight;
							break;
						case "min":
							aggregatedValue = row.min_weight;
							break;
						default:
							aggregatedValue = row.count;
					}

					// 집계 결과를 메타데이터에 저장
					const aggregatedMetadata = {
						...edge.metadata,
						aggregation: {
							method: action.aggregationMethod,
							value: aggregatedValue,
							lastUpdate: new Date().toISOString(),
						},
					};

					try {
						await this.updateEdgeMetadata(
							{
								...action,
								metadataTransform: aggregatedMetadata,
							},
							edge,
						);
						resolve();
					} catch (updateError) {
						reject(updateError);
					}
				},
			);
		});
	}

	private async executeCustomAction(
		action: InferenceAction,
		edge: any,
	): Promise<void> {
		if (!action.customFunction) return;

		try {
			// 안전한 커스텀 액션 실행 (실제 구현에서는 sandbox 필요)
			const func = new Function(
				"edge",
				"database",
				"action",
				action.customFunction,
			);
			await func(edge, this.database, action);
		} catch (error) {
			throw new Error(`Custom action execution failed: ${error}`);
		}
	}
}

// 타입 정의들
export interface EdgeTypeHierarchy {
	[rootType: string]: EdgeTypeHierarchyNode;
}

export interface EdgeTypeHierarchyNode {
	type: string;
	definition: EdgeTypeDefinition;
	children?: EdgeTypeHierarchyNode[];
}

export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

export interface UpdateImpactAnalysis {
	requiresRecomputation: boolean;
	warnings: string[];
}
