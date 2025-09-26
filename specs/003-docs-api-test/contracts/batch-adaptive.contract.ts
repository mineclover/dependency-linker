/**
 * Test Contract: Batch Processing Adaptive Logic
 *
 * This contract defines the expected behavior for adaptive concurrency
 * and resource management in batch processing operations.
 */

export interface BatchAdaptiveContract {
	// Adaptive concurrency management
	adjustConcurrency(memoryUsageRatio: number): number;
	monitorResourceUsage(): ResourceUsageReport;

	// Resource thresholds and triggers
	checkMemoryThreshold(currentUsage: number, limit: number): ThresholdStatus;
	triggerGarbageCollection(force: boolean): Promise<void>;

	// Processing strategy selection
	selectProcessingStrategy(
		errorRate: number,
		totalProcessed: number,
	): ProcessingStrategy;
	shouldTerminateEarly(errorRate: number, processed: number): boolean;
}

// Supporting interfaces
export interface ResourceUsageReport {
	memoryUsage: {
		current: number;
		limit: number;
		ratio: number; // 0.0 to 1.0
	};
	cpuUsage: {
		current: number;
		average: number;
	};
	concurrency: {
		current: number;
		maximum: number;
		recommended: number;
	};
	timestamp: Date;
}

export interface ThresholdStatus {
	threshold: "60%" | "80%" | "90%" | "95%";
	exceeded: boolean;
	actionRequired: ThresholdAction;
	severity: "info" | "warning" | "critical" | "emergency";
}

export interface ThresholdAction {
	type: "monitor" | "throttle" | "gc_trigger" | "emergency_stop";
	parameters: Record<string, any>;
	priority: number;
}

export interface ProcessingStrategy {
	name: "aggressive" | "balanced" | "conservative" | "best_effort";
	concurrency: number;
	errorTolerance: number;
	timeoutMultiplier: number;
	retryAttempts: number;
}

// Test scenario contracts
export interface BatchAdaptiveTestScenarios {
	adaptiveConcurrency: {
		memoryScenarios: Array<{
			memoryUsageRatio: number; // 0.0 to 1.0
			expectedConcurrency: {
				exact?: number;
				min?: number;
				max?: number;
			};
			behaviorDescription: string;
		}>;

		boundaryConditions: Array<{
			scenario:
				| "below_60%"
				| "at_60%"
				| "at_80%"
				| "at_90%"
				| "at_95%"
				| "above_95%";
			expectedBehavior: string;
			concurrencyChange: "increase" | "decrease" | "maintain" | "emergency";
		}>;

		dynamicAdjustment: {
			testDuration: number; // seconds
			memoryFluctuations: Array<{
				time: number; // seconds from start
				memoryRatio: number;
				expectedResponse: number; // new concurrency level
			}>;
		};
	};

	resourceMonitoring: {
		continuousMonitoring: {
			monitoringInterval: number; // milliseconds
			reportingFrequency: number; // reports per minute
			expectedAccuracy: number; // percentage
		};

		resourcePressure: Array<{
			pressureType: "memory" | "cpu" | "combined";
			intensity: "light" | "moderate" | "heavy";
			duration: number; // seconds
			expectedDetection: boolean;
			responseTime: number; // milliseconds
		}>;

		alertingThresholds: Array<{
			threshold: number; // percentage
			alertType: "warning" | "critical";
			expectedTrigger: boolean;
			escalationTime: number; // milliseconds
		}>;
	};

	garbageCollectionManagement: {
		triggerConditions: Array<{
			memoryRatio: number;
			forceTrigger: boolean;
			expectedGCActivation: boolean;
			memoryReductionExpected: boolean;
		}>;

		performanceImpact: {
			gcTriggerTime: number; // milliseconds
			processingPauseDuration: number; // milliseconds
			memoryRecoveryAmount: number; // bytes or percentage
		};

		reliabilityTests: Array<{
			scenario: "frequent_gc" | "gc_failure" | "memory_leak";
			testDuration: number; // minutes
			expectedStability: boolean;
		}>;
	};

	processingStrategySelection: {
		strategyMapping: Array<{
			errorRate: number; // 0.0 to 1.0
			totalProcessed: number;
			expectedStrategy: ProcessingStrategy["name"];
			rationale: string;
		}>;

		strategyTransitions: Array<{
			from: ProcessingStrategy["name"];
			to: ProcessingStrategy["name"];
			trigger: "error_increase" | "error_decrease" | "resource_change";
			transitionTime: number; // milliseconds
		}>;

		earlyTermination: Array<{
			errorRate: number;
			processedCount: number;
			minProcessedThreshold: number;
			expectedTermination: boolean;
			reason: string;
		}>;
	};

	integrationScenarios: {
		highLoadTesting: {
			fileCount: number;
			fileSize: "small" | "medium" | "large" | "mixed";
			concurrentUsers: number;
			testDuration: number; // minutes
			expectedBehaviors: Array<{
				metric: string;
				threshold: number;
				comparison: "less_than" | "greater_than" | "approximately";
			}>;
		};

		resourceConstrainedEnvironment: {
			memoryLimit: number; // MB
			cpuLimit: number; // percentage
			networkBandwidth: number; // Mbps
			expectedAdaptations: string[];
			performanceDegradation: number; // acceptable percentage
		};

		errorScenarios: Array<{
			errorType:
				| "parse_error"
				| "file_not_found"
				| "permission_denied"
				| "timeout";
			errorFrequency: number; // errors per minute
			expectedRecovery: boolean;
			recoveryTime: number; // seconds
		}>;
	};

	performanceValidation: {
		responseTimeTargets: Array<{
			operation:
				| "concurrency_adjustment"
				| "resource_monitoring"
				| "strategy_selection";
			maxResponseTime: number; // milliseconds
			percentile: 95 | 99; // performance percentile
		}>;

		throughputMeasurement: {
			baselineThroughput: number; // operations per second
			adaptiveModeThroughput: number; // operations per second
			efficiencyRatio: number; // adaptive/baseline
		};

		memoryEfficiency: {
			baselineMemory: number; // MB
			peakMemoryUsage: number; // MB
			memoryRecoveryRate: number; // MB per second
			leakDetectionThreshold: number; // MB growth per hour
		};
	};
}
