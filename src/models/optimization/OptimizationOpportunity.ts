/**
 * OptimizationOpportunity model for test optimization (T019)
 * Identified improvement areas with impact assessment
 *
 * Source: Data model specification, FR-010 (identify flaky tests), research risk assessment
 */

import { EffortLevel, OptimizationType, RiskLevel } from "./types";

export {
	EffortLevel,
	OptimizationType,
	RiskLevel,
} from "./types";

export enum OptimizationStatus {
	Identified = "identified",
	Planned = "planned",
	InProgress = "in_progress",
	Completed = "completed",
	Failed = "failed",
	Skipped = "skipped",
}

export interface IOptimizationOpportunity {
	id: string; // Unique identifier
	type: OptimizationType; // Category of optimization
	targetSuite: string; // TestSuite.id this applies to
	targetCases?: string[]; // Specific TestCase.ids if applicable
	description: string; // What needs optimization
	impact: {
		timeReduction: number; // Expected time reduction (ms)
		complexityReduction: number; // Complexity reduction score
		maintainabilityImprovement: number; // Maintainability improvement score
	};
	estimatedTimeSaving: number; // Expected execution time reduction (ms) - for compatibility
	riskLevel: RiskLevel; // Risk assessment for this change
	implementationEffort: EffortLevel; // Required work level
	prerequisites: string[]; // What must be done first
	status: OptimizationStatus; // Current status
	createdAt: Date; // When opportunity was identified
	updatedAt: Date; // Last status update
	completedAt?: Date; // When optimization was completed
	validationRequired: boolean; // Whether this needs validation
	rollbackPlan?: string; // How to undo if something goes wrong
	strategy?: string; // Strategy name for optimization
	constraints?: string[]; // Optimization constraints
	implementation?: {
		approach: string;
		steps: string[];
		codeChanges?: string[];
		rollbackPlan?: string;
	};
	validation?: {
		criteria: string[];
		testPlan: string;
		successMetrics: string[];
	};
}

export class OptimizationOpportunity implements IOptimizationOpportunity {
	id: string;
	type: OptimizationType;
	targetSuite: string;
	targetCases?: string[];
	description: string;
	impact: {
		timeReduction: number;
		complexityReduction: number;
		maintainabilityImprovement: number;
	};
	estimatedTimeSaving: number;
	riskLevel: RiskLevel;
	implementationEffort: EffortLevel;
	prerequisites: string[];
	status: OptimizationStatus;
	createdAt: Date;
	updatedAt: Date;
	completedAt?: Date;
	validationRequired: boolean;
	rollbackPlan?: string;
	strategy?: string;
	constraints?: string[];
	implementation?: {
		approach: string;
		steps: string[];
		codeChanges?: string[];
		rollbackPlan?: string;
	};
	validation?: {
		criteria: string[];
		testPlan: string;
		successMetrics: string[];
	};

	constructor(
		data: Partial<IOptimizationOpportunity> & {
			id: string;
			type: OptimizationType;
			targetSuite: string;
		},
	) {
		this.id = data.id;
		this.type = data.type;
		this.targetSuite = data.targetSuite;
		this.targetCases = data.targetCases;
		this.description = data.description || `${data.type} optimization`;
		this.impact = data.impact || {
			timeReduction: data.estimatedTimeSaving || 100,
			complexityReduction: 0.5,
			maintainabilityImprovement: 0.3,
		};
		this.estimatedTimeSaving =
			data.estimatedTimeSaving || this.impact.timeReduction || 100;
		this.riskLevel = data.riskLevel || RiskLevel.Medium;
		this.implementationEffort = data.implementationEffort || EffortLevel.Medium;
		this.prerequisites = data.prerequisites || [];
		this.status = data.status || OptimizationStatus.Identified;
		this.createdAt = data.createdAt || new Date();
		this.updatedAt = data.updatedAt || new Date();
		this.completedAt = data.completedAt;
		this.validationRequired = data.validationRequired || false;
		this.rollbackPlan = data.rollbackPlan;
		this.strategy = data.strategy;
		this.constraints = data.constraints;
		this.implementation = data.implementation;
		this.validation = data.validation;
	}
}

export interface OptimizationImpact {
	timeSavingPercentage: number; // (baseline.time - optimized.time) / baseline.time * 100
	testReduction: number; // Number of tests removed/consolidated
	reliabilityImprovement: number; // Pass rate improvement
	coverageMaintained: boolean; // Whether coverage was preserved
	riskRealized: boolean; // Whether the assessed risk materialized
}

export interface OptimizationBatch {
	id: string;
	name: string;
	opportunities: IOptimizationOpportunity[];
	totalEstimatedSaving: number;
	overallRiskLevel: RiskLevel;
	executionOrder: string[]; // Order to execute opportunities
	dependencies: string[]; // Inter-opportunity dependencies
	createdAt: Date;
	status: OptimizationStatus;
}

export class OptimizationOpportunityBuilder {
	private opportunity: Partial<IOptimizationOpportunity> = {};

	constructor(id: string, type: OptimizationType, targetSuite: string) {
		this.opportunity.id = id;
		this.opportunity.type = type;
		this.opportunity.targetSuite = targetSuite;
		this.opportunity.prerequisites = [];
		this.opportunity.status = OptimizationStatus.Identified;
		this.opportunity.createdAt = new Date();
		this.opportunity.updatedAt = new Date();
	}

	withDescription(description: string): OptimizationOpportunityBuilder {
		this.opportunity.description = description;
		return this;
	}

	withEstimatedTimeSaving(timeSaving: number): OptimizationOpportunityBuilder {
		if (timeSaving <= 0) {
			throw new Error("Estimated time saving must be positive");
		}
		this.opportunity.estimatedTimeSaving = timeSaving;
		return this;
	}

	withRiskLevel(riskLevel: RiskLevel): OptimizationOpportunityBuilder {
		this.opportunity.riskLevel = riskLevel;
		return this;
	}

	withEffortLevel(effortLevel: EffortLevel): OptimizationOpportunityBuilder {
		this.opportunity.implementationEffort = effortLevel;
		return this;
	}

	withTargetCases(targetCases: string[]): OptimizationOpportunityBuilder {
		this.opportunity.targetCases = [...targetCases];
		return this;
	}

	addPrerequisite(prerequisite: string): OptimizationOpportunityBuilder {
		if (!this.opportunity.prerequisites?.includes(prerequisite)) {
			this.opportunity.prerequisites?.push(prerequisite);
		}
		return this;
	}

	requireValidation(required: boolean = true): OptimizationOpportunityBuilder {
		this.opportunity.validationRequired = required;
		return this;
	}

	withRollbackPlan(plan: string): OptimizationOpportunityBuilder {
		this.opportunity.rollbackPlan = plan;
		return this;
	}

	build(): OptimizationOpportunity {
		this.validateOpportunity();

		// After validation, these required fields are guaranteed to exist
		if (
			!this.opportunity.id ||
			!this.opportunity.type ||
			!this.opportunity.targetSuite ||
			!this.opportunity.prerequisites ||
			!this.opportunity.status ||
			!this.opportunity.createdAt ||
			!this.opportunity.updatedAt
		) {
			throw new Error(
				"Required opportunity fields are missing after validation",
			);
		}

		const timeSaving = this.opportunity.estimatedTimeSaving || 100;
		return {
			id: this.opportunity.id,
			type: this.opportunity.type,
			targetSuite: this.opportunity.targetSuite,
			targetCases: this.opportunity.targetCases,
			description:
				this.opportunity.description || `${this.opportunity.type} optimization`,
			impact: {
				timeReduction: timeSaving,
				complexityReduction: 0.5,
				maintainabilityImprovement: 0.3,
			},
			estimatedTimeSaving: timeSaving,
			riskLevel: this.opportunity.riskLevel || RiskLevel.Medium,
			implementationEffort:
				this.opportunity.implementationEffort || EffortLevel.Medium,
			prerequisites: this.opportunity.prerequisites,
			status: this.opportunity.status,
			createdAt: this.opportunity.createdAt,
			updatedAt: this.opportunity.updatedAt,
			completedAt: this.opportunity.completedAt,
			validationRequired: this.opportunity.validationRequired || false,
			rollbackPlan: this.opportunity.rollbackPlan,
		};
	}

	private validateOpportunity(): void {
		if (!this.opportunity.id) {
			throw new Error("OptimizationOpportunity id is required");
		}
		if (!this.opportunity.targetSuite) {
			throw new Error("OptimizationOpportunity targetSuite is required");
		}
	}
}

/**
 * Prioritize opportunities based on impact and risk
 */
export function prioritizeOpportunities(
	opportunities: IOptimizationOpportunity[],
): IOptimizationOpportunity[] {
	return [...opportunities].sort((a, b) => {
		const scoreA = calculatePriorityScore(a);
		const scoreB = calculatePriorityScore(b);
		return scoreB - scoreA; // Higher score first
	});
}

/**
 * Group opportunities by risk level
 */
export function groupByRiskLevel(
	opportunities: IOptimizationOpportunity[],
): Record<RiskLevel, IOptimizationOpportunity[]> {
	return opportunities.reduce(
		(groups, opportunity) => {
			if (!groups[opportunity.riskLevel]) {
				groups[opportunity.riskLevel] = [];
			}
			groups[opportunity.riskLevel].push(opportunity);
			return groups;
		},
		{} as Record<RiskLevel, IOptimizationOpportunity[]>,
	);
}

/**
 * Group opportunities by type
 */
export function groupByType(
	opportunities: IOptimizationOpportunity[],
): Record<OptimizationType, IOptimizationOpportunity[]> {
	return opportunities.reduce(
		(groups, opportunity) => {
			if (!groups[opportunity.type]) {
				groups[opportunity.type] = [];
			}
			groups[opportunity.type].push(opportunity);
			return groups;
		},
		{} as Record<OptimizationType, IOptimizationOpportunity[]>,
	);
}

/**
 * Calculate total estimated time savings
 */
export function calculateTotalSavings(
	opportunities: IOptimizationOpportunity[],
): number {
	return opportunities.reduce(
		(sum, opportunity) => sum + opportunity.estimatedTimeSaving,
		0,
	);
}

/**
 * Find opportunities that can be executed in parallel
 */
export function findParallelExecutableOpportunities(
	opportunities: IOptimizationOpportunity[],
): IOptimizationOpportunity[][] {
	const groups: IOptimizationOpportunity[][] = [];
	const processed = new Set<string>();

	opportunities.forEach((opportunity) => {
		if (processed.has(opportunity.id)) return;

		const parallelGroup = findNonConflictingOpportunities(
			opportunity,
			opportunities,
		);
		groups.push(parallelGroup);
		for (const opp of parallelGroup) {
			processed.add(opp.id);
		}
	});

	return groups;
}

/**
 * Validate dependencies and prerequisites
 */
export function validateDependencies(
	opportunities: IOptimizationOpportunity[],
): string[] {
	const errors: string[] = [];
	const opportunityIds = new Set(opportunities.map((o) => o.id));

	opportunities.forEach((opportunity) => {
		opportunity.prerequisites.forEach((prerequisite) => {
			if (!opportunityIds.has(prerequisite)) {
				errors.push(
					`Opportunity ${opportunity.id} has unknown prerequisite: ${prerequisite}`,
				);
			}
		});
	});

	return errors;
}

/**
 * Create execution plan with proper ordering
 */
export function createExecutionPlan(
	opportunities: IOptimizationOpportunity[],
): OptimizationBatch[] {
	const batches: OptimizationBatch[] = [];
	const remaining = [...opportunities];
	let batchNumber = 1;

	while (remaining.length > 0) {
		const readyOpportunities = remaining.filter((opp) =>
			arePrerequisitesSatisfied(opp, batches),
		);

		if (readyOpportunities.length === 0 && remaining.length > 0) {
			throw new Error(
				"Circular dependency detected in optimization opportunities",
			);
		}

		const batch: OptimizationBatch = {
			id: `batch-${batchNumber}`,
			name: `Optimization Batch ${batchNumber}`,
			opportunities: readyOpportunities,
			totalEstimatedSaving: calculateTotalSavings(readyOpportunities),
			overallRiskLevel: calculateOverallRiskLevel(readyOpportunities),
			executionOrder: readyOpportunities.map((o) => o.id),
			dependencies: extractBatchDependencies(readyOpportunities, batches),
			createdAt: new Date(),
			status: OptimizationStatus.Planned,
		};

		batches.push(batch);

		// Remove processed opportunities
		readyOpportunities.forEach((opp) => {
			const index = remaining.indexOf(opp);
			remaining.splice(index, 1);
		});

		batchNumber++;
	}

	return batches;
}

function calculatePriorityScore(opportunity: IOptimizationOpportunity): number {
	// Higher savings = higher score
	const savingsScore = opportunity.estimatedTimeSaving / 1000; // Normalize to seconds

	// Lower risk = higher score
	const riskScore =
		opportunity.riskLevel === RiskLevel.Low
			? 3
			: opportunity.riskLevel === RiskLevel.Medium
				? 2
				: 1;

	// Lower effort = higher score
	const effortScore =
		opportunity.implementationEffort === EffortLevel.Minimal
			? 4
			: opportunity.implementationEffort === EffortLevel.Low
				? 3
				: opportunity.implementationEffort === EffortLevel.Medium
					? 2
					: 1;

	return savingsScore * 0.5 + riskScore * 0.3 + effortScore * 0.2;
}

function findNonConflictingOpportunities(
	target: IOptimizationOpportunity,
	candidates: IOptimizationOpportunity[],
): IOptimizationOpportunity[] {
	const group = [target];

	candidates.forEach((candidate) => {
		if (candidate.id === target.id) return;

		// Check if they conflict (same target suite or overlapping target cases)
		const conflicts =
			candidate.targetSuite === target.targetSuite ||
			(candidate.targetCases &&
				target.targetCases &&
				candidate.targetCases.some((tc) => target.targetCases?.includes(tc)));

		if (!conflicts) {
			group.push(candidate);
		}
	});

	return group;
}

function arePrerequisitesSatisfied(
	opportunity: IOptimizationOpportunity,
	completedBatches: OptimizationBatch[],
): boolean {
	const completedOpportunityIds = new Set(
		completedBatches.flatMap((batch) => batch.opportunities.map((o) => o.id)),
	);

	return opportunity.prerequisites.every((prerequisite) =>
		completedOpportunityIds.has(prerequisite),
	);
}

function calculateOverallRiskLevel(
	opportunities: IOptimizationOpportunity[],
): RiskLevel {
	const hasHighRisk = opportunities.some((o) => o.riskLevel === RiskLevel.High);
	if (hasHighRisk) return RiskLevel.High;

	const hasMediumRisk = opportunities.some(
		(o) => o.riskLevel === RiskLevel.Medium,
	);
	if (hasMediumRisk) return RiskLevel.Medium;

	return RiskLevel.Low;
}

function extractBatchDependencies(
	opportunities: IOptimizationOpportunity[],
	previousBatches: OptimizationBatch[],
): string[] {
	const dependencies = new Set<string>();

	opportunities.forEach((opportunity) => {
		opportunity.prerequisites.forEach((prerequisite) => {
			// Find which batch contains this prerequisite
			const batch = previousBatches.find((b) =>
				b.opportunities.some((o) => o.id === prerequisite),
			);
			if (batch) {
				dependencies.add(batch.id);
			}
		});
	});

	return Array.from(dependencies);
}

// Pre-defined optimization opportunity templates
export const OptimizationTemplates = {
	removeDuplicate: (
		targetSuite: string,
		duplicateTestIds: string[],
	): Partial<IOptimizationOpportunity> => ({
		type: OptimizationType.RemoveDuplicate,
		targetSuite,
		targetCases: duplicateTestIds,
		riskLevel: RiskLevel.Low,
		implementationEffort: EffortLevel.Minimal,
		validationRequired: true,
		rollbackPlan: "Restore removed test cases from backup",
	}),

	fixFlaky: (
		targetSuite: string,
		flakyTestIds: string[],
	): Partial<IOptimizationOpportunity> => ({
		type: OptimizationType.FixFlaky,
		targetSuite,
		targetCases: flakyTestIds,
		riskLevel: RiskLevel.Medium,
		implementationEffort: EffortLevel.Medium,
		validationRequired: true,
		rollbackPlan: "Revert test modifications and mark as skipped",
	}),

	simplifySetup: (targetSuite: string): Partial<OptimizationOpportunity> => ({
		type: OptimizationType.SimplifySetup,
		targetSuite,
		riskLevel: RiskLevel.Medium,
		implementationEffort: EffortLevel.Low,
		validationRequired: true,
		rollbackPlan: "Restore original setup/teardown code",
	}),

	consolidateScenarios: (
		targetSuite: string,
		scenarioTestIds: string[],
	): Partial<IOptimizationOpportunity> => ({
		type: OptimizationType.ConsolidateScenarios,
		targetSuite,
		targetCases: scenarioTestIds,
		riskLevel: RiskLevel.High,
		implementationEffort: EffortLevel.High,
		validationRequired: true,
		rollbackPlan: "Split consolidated test back into individual scenarios",
	}),

	behaviorFocus: (targetSuite: string): Partial<OptimizationOpportunity> => ({
		type: OptimizationType.BehaviorFocus,
		targetSuite,
		riskLevel: RiskLevel.Medium,
		implementationEffort: EffortLevel.Medium,
		validationRequired: true,
		rollbackPlan: "Revert to implementation-focused tests",
	}),

	sharedUtilities: (
		targetSuites: string[],
	): Partial<IOptimizationOpportunity> => ({
		type: OptimizationType.SharedUtilities,
		targetSuite: targetSuites[0], // Primary target
		riskLevel: RiskLevel.Low,
		implementationEffort: EffortLevel.Low,
		validationRequired: false,
		rollbackPlan: "Remove shared utilities and restore inline code",
	}),
};
