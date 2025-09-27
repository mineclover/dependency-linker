/**
 * Data Integration Test - Simplified
 * Tests core data integration functionality
 */

import { DataIntegrator } from "../../src/services/integration/DataIntegrator";
import { AnalysisEngine } from "../../src/services/analysis-engine";
import type { DataIntegrationConfig } from "../../src/models/IntegratedData";

describe("Data Integration", () => {
	let analysisEngine: AnalysisEngine;
	let dataIntegrator: DataIntegrator;

	beforeEach(() => {
		analysisEngine = new AnalysisEngine();
		dataIntegrator = new DataIntegrator();
	});

	afterEach(async () => {
		await analysisEngine.shutdown();
	});

	describe("Core Integration", () => {
		it("should integrate analysis results", async () => {
			// Mock analysis result
			const mockResult = {
				filePath: "test.ts",
				language: "typescript",
				extractedData: {
					dependency: { dependencies: [], totalCount: 0 },
					identifier: { identifiers: [], totalCount: 0 },
				},
				interpretedData: {},
				errors: [],
				performanceMetrics: { totalTime: 10, parseTime: 5, extractionTime: 3 },
				metadata: { timestamp: new Date(), version: "2.0.0" }
			};

			const config: DataIntegrationConfig = {
				enabledViews: ["summary", "table"],
				detailLevel: "standard",
				optimizationMode: "balanced",
				sizeLimits: {
					maxStringLength: 1000,
					maxArrayLength: 100,
					maxDepth: 10,
				},
			};

			const integratedData = await dataIntegrator.integrate(mockResult as any, config);

			expect(integratedData).toBeDefined();
			expect(integratedData.core).toBeDefined();
			expect(integratedData.views).toBeDefined();
		});

		it("should handle batch integration", async () => {
			const results = [
				{ filePath: "file1.ts", extractedData: {}, interpretedData: {}, errors: [], performanceMetrics: { totalTime: 5 } },
				{ filePath: "file2.ts", extractedData: {}, interpretedData: {}, errors: [], performanceMetrics: { totalTime: 8 } }
			];

			const config: DataIntegrationConfig = {
				enabledViews: ["summary"],
				detailLevel: "minimal",
				optimizationMode: "speed",
				sizeLimits: { maxStringLength: 500, maxArrayLength: 50, maxDepth: 5 },
			};

			const batchResults = await dataIntegrator.integrateBatch(results as any, config);

			expect(batchResults).toHaveLength(2);
			expect(batchResults[0].core).toBeDefined();
			expect(batchResults[1].core).toBeDefined();
		});
	});

	describe("Configuration", () => {
		it("should respect size limits", async () => {
			const mockResult = {
				filePath: "test.ts",
				extractedData: { dependency: { dependencies: [] } },
				interpretedData: {},
				errors: [],
				performanceMetrics: { totalTime: 1 }
			};

			const restrictiveConfig: DataIntegrationConfig = {
				enabledViews: ["minimal"],
				detailLevel: "minimal",
				optimizationMode: "speed",
				sizeLimits: { maxStringLength: 10, maxArrayLength: 1, maxDepth: 1 },
			};

			const result = await dataIntegrator.integrate(mockResult as any, restrictiveConfig);
			expect(result.core).toBeDefined();
		});
	});
});