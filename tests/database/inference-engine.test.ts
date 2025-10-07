/**
 * InferenceEngine Unit Tests
 * 추론 엔진의 핵심 기능 검증
 */

import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import {
	createGraphDatabase,
	GraphDatabase,
} from "../../src/database/GraphDatabase";
import { InferenceEngine } from "../../src/database/inference/InferenceEngine";
import * as EdgeTypeRegistry from "../../src/database/inference/EdgeTypeRegistry";

describe("InferenceEngine", () => {
	let db: GraphDatabase;
	let engine: InferenceEngine;
	let tempDir: string;

	beforeEach(async () => {
		// Create temporary database
		tempDir = mkdtempSync(join(tmpdir(), "inference-test-"));
		const dbPath = join(tempDir, "test.db");
		db = createGraphDatabase(dbPath);
		await db.initialize();

		// EdgeTypeRegistry is auto-initialized with CORE_TYPES
		// We'll use the existing types: depends_on, imports, contains, extends

		// Create engine
		engine = new InferenceEngine(db, {
			enableCache: true,
			cacheSyncStrategy: "manual",
			defaultMaxPathLength: 10,
			enableCycleDetection: true,
		});
	});

	afterEach(async () => {
		await db.close();
		rmSync(tempDir, { recursive: true, force: true });
	});

	describe("Cache Synchronization", () => {
		test("should sync cache with transitive relationships", async () => {
			// Create nodes
			const node1 = await db.upsertNode({
				identifier: "node1",
				type: "module",
				name: "Module 1",
				sourceFile: "file1.ts",
				language: "typescript",
			});

			const node2 = await db.upsertNode({
				identifier: "node2",
				type: "module",
				name: "Module 2",
				sourceFile: "file2.ts",
				language: "typescript",
			});

			const node3 = await db.upsertNode({
				identifier: "node3",
				type: "module",
				name: "Module 3",
				sourceFile: "file3.ts",
				language: "typescript",
			});

			// Create edges: 1 → 2 → 3
			await db.upsertRelationship({
				fromNodeId: node1,
				toNodeId: node2,
				type: "depends_on",
			});

			await db.upsertRelationship({
				fromNodeId: node2,
				toNodeId: node3,
				type: "depends_on",
			});

			// Sync cache
			const count = await engine.syncCache(true);

			// Should have 1 inferred relationship: 1 → 3
			expect(count).toBeGreaterThan(0);
		});

		test("should handle cache sync with no relationships", async () => {
			const count = await engine.syncCache(true);
			expect(count).toBe(0);
		});

		test("should respect cache disabled config", async () => {
			const noCacheEngine = new InferenceEngine(db, {
				enableCache: false,
			});

			const count = await noCacheEngine.syncCache(true);
			expect(count).toBe(0);
		});

		test("should respect manual sync strategy", async () => {
			// Manual strategy without force should skip
			const count = await engine.syncCache(false);
			expect(count).toBe(0);

			// With force should work
			const forcedCount = await engine.syncCache(true);
			expect(forcedCount).toBeGreaterThanOrEqual(0);
		});
	});

	describe("Transitive Inference", () => {
		test("should infer transitive relationships", async () => {
			// Create chain: A → B → C
			const nodeA = await db.upsertNode({
				identifier: "A",
				type: "module",
				name: "A",
				sourceFile: "a.ts",
				language: "typescript",
			});

			const nodeB = await db.upsertNode({
				identifier: "B",
				type: "module",
				name: "B",
				sourceFile: "b.ts",
				language: "typescript",
			});

			const nodeC = await db.upsertNode({
				identifier: "C",
				type: "module",
				name: "C",
				sourceFile: "c.ts",
				language: "typescript",
			});

			await db.upsertRelationship({
				fromNodeId: nodeA,
				toNodeId: nodeB,
				type: "depends_on",
			});

			await db.upsertRelationship({
				fromNodeId: nodeB,
				toNodeId: nodeC,
				type: "depends_on",
			});

			// Query transitive
			const inferences = await engine.queryTransitive(nodeA, "depends_on");

			// Should find A → C
			expect(inferences.length).toBeGreaterThan(0);
			const inference = inferences.find((i) => i.toNodeId === nodeC);
			expect(inference).toBeDefined();
			expect(inference?.path.depth).toBe(2);
			expect(inference?.path.inferenceType).toBe("transitive");
		});

		test("should limit transitive depth", async () => {
			// Create long chain: 1 → 2 → 3 → 4 → 5
			const nodes: number[] = [];
			for (let i = 1; i <= 5; i++) {
				const nodeId = await db.upsertNode({
					identifier: `node${i}`,
					type: "module",
					name: `Node ${i}`,
					sourceFile: `file${i}.ts`,
					language: "typescript",
				});
				nodes.push(nodeId);
			}

			for (let i = 0; i < nodes.length - 1; i++) {
				await db.upsertRelationship({
					fromNodeId: nodes[i],
					toNodeId: nodes[i + 1],
					type: "depends_on",
				});
			}

			// Query with max depth 3
			const inferences = await engine.queryTransitive(nodes[0], "depends_on", {
				maxPathLength: 3,
			});

			// Should not include paths longer than 3
			expect(inferences.every((i) => i.path.depth <= 3)).toBe(true);
		});

		test("should detect cycles with cycle detection enabled", async () => {
			// Create cycle: A → B → C → A
			const nodeA = await db.upsertNode({
				identifier: "cycleA",
				type: "module",
				name: "A",
				sourceFile: "a.ts",
				language: "typescript",
			});

			const nodeB = await db.upsertNode({
				identifier: "cycleB",
				type: "module",
				name: "B",
				sourceFile: "b.ts",
				language: "typescript",
			});

			const nodeC = await db.upsertNode({
				identifier: "cycleC",
				type: "module",
				name: "C",
				sourceFile: "c.ts",
				language: "typescript",
			});

			await db.upsertRelationship({
				fromNodeId: nodeA,
				toNodeId: nodeB,
				type: "depends_on",
			});

			await db.upsertRelationship({
				fromNodeId: nodeB,
				toNodeId: nodeC,
				type: "depends_on",
			});

			await db.upsertRelationship({
				fromNodeId: nodeC,
				toNodeId: nodeA,
				type: "depends_on",
			});

			// Should not include cycles
			const inferences = await engine.queryTransitive(nodeA, "depends_on", {
				detectCycles: true,
			});

			// All inferences should have different start and end nodes
			expect(inferences.every((i) => i.fromNodeId !== i.toNodeId)).toBe(true);
		});
	});

	describe("Hierarchical Inference", () => {
		test("should query hierarchical relationships", async () => {
			const node1 = await db.upsertNode({
				identifier: "h1",
				type: "module",
				name: "H1",
				sourceFile: "h1.ts",
				language: "typescript",
			});

			const node2 = await db.upsertNode({
				identifier: "h2",
				type: "module",
				name: "H2",
				sourceFile: "h2.ts",
				language: "typescript",
			});

			await db.upsertRelationship({
				fromNodeId: node1,
				toNodeId: node2,
				type: "imports",
			});

			const inferences = await engine.queryHierarchical("imports", {
				includeChildren: true,
			});

			expect(inferences.length).toBeGreaterThan(0);
		});

		test("should include parent types when requested", async () => {
			const node1 = await db.upsertNode({
				identifier: "ext1",
				type: "class",
				name: "Class1",
				sourceFile: "class1.ts",
				language: "typescript",
			});

			const node2 = await db.upsertNode({
				identifier: "ext2",
				type: "class",
				name: "Class2",
				sourceFile: "class2.ts",
				language: "typescript",
			});

			await db.upsertRelationship({
				fromNodeId: node1,
				toNodeId: node2,
				type: "extends",
			});

			const inferences = await engine.queryHierarchical("extends", {
				includeParents: true,
			});

			expect(inferences).toBeDefined();
		});
	});

	describe("Inheritable Inference", () => {
		test("should infer inheritable relationships", async () => {
			// File contains Class, Class extends Base
			// Should infer: File extends Base
			const fileNode = await db.upsertNode({
				identifier: "file1",
				type: "file",
				name: "file1.ts",
				sourceFile: "file1.ts",
				language: "typescript",
			});

			const classNode = await db.upsertNode({
				identifier: "MyClass",
				type: "class",
				name: "MyClass",
				sourceFile: "file1.ts",
				language: "typescript",
			});

			const baseNode = await db.upsertNode({
				identifier: "BaseClass",
				type: "class",
				name: "BaseClass",
				sourceFile: "base.ts",
				language: "typescript",
			});

			// File contains Class
			await db.upsertRelationship({
				fromNodeId: fileNode,
				toNodeId: classNode,
				type: "contains",
			});

			// Class extends Base
			await db.upsertRelationship({
				fromNodeId: classNode,
				toNodeId: baseNode,
				type: "extends",
			});

			// Query inheritable
			const inferences = await engine.queryInheritable(
				fileNode,
				"contains",
				"extends",
			);

			// Should find File → Base
			expect(inferences.length).toBeGreaterThan(0);
			const inference = inferences.find((i) => i.toNodeId === baseNode);
			expect(inference).toBeDefined();
			expect(inference?.path.inferenceType).toBe("inheritable");
		});
	});

	describe("Inference Validation", () => {
		test("should validate without errors on clean graph", async () => {
			const validation = await engine.validate();

			expect(validation.valid).toBe(true);
			expect(validation.errors).toHaveLength(0);
		});

		test("should detect circular references", async () => {
			// Create cycle
			const node1 = await db.upsertNode({
				identifier: "cycle1",
				type: "module",
				name: "Cycle1",
				sourceFile: "cycle1.ts",
				language: "typescript",
			});

			const node2 = await db.upsertNode({
				identifier: "cycle2",
				type: "module",
				name: "Cycle2",
				sourceFile: "cycle2.ts",
				language: "typescript",
			});

			// A → B → A
			await db.upsertRelationship({
				fromNodeId: node1,
				toNodeId: node2,
				type: "depends_on",
			});

			await db.upsertRelationship({
				fromNodeId: node2,
				toNodeId: node1,
				type: "depends_on",
			});

			const validation = await engine.validate();

			// Should detect cycle
			expect(validation.valid).toBe(false);
			expect(validation.errors.length).toBeGreaterThan(0);
			expect(validation.errors[0]).toContain("Circular reference");
			expect(validation.warnings.length).toBeGreaterThan(0);
		});

		test("should report cycle details in warnings", async () => {
			// Create simple cycle
			const node1 = await db.upsertNode({
				identifier: "warn1",
				type: "module",
				name: "Warn1",
				sourceFile: "warn1.ts",
				language: "typescript",
			});

			const node2 = await db.upsertNode({
				identifier: "warn2",
				type: "module",
				name: "Warn2",
				sourceFile: "warn2.ts",
				language: "typescript",
			});

			await db.upsertRelationship({
				fromNodeId: node1,
				toNodeId: node2,
				type: "imports",
			});

			await db.upsertRelationship({
				fromNodeId: node2,
				toNodeId: node1,
				type: "imports",
			});

			const validation = await engine.validate();

			if (!validation.valid) {
				expect(validation.warnings.some((w) => w.includes("Cycle:"))).toBe(
					true,
				);
			}
		});
	});

	describe("Integration: inferAll", () => {
		test("should compute all inference types", async () => {
			// Create test graph
			const nodes: number[] = [];
			for (let i = 1; i <= 3; i++) {
				const nodeId = await db.upsertNode({
					identifier: `all${i}`,
					type: "module",
					name: `Module ${i}`,
					sourceFile: `file${i}.ts`,
					language: "typescript",
				});
				nodes.push(nodeId);
			}

			// Create relationships
			await db.upsertRelationship({
				fromNodeId: nodes[0],
				toNodeId: nodes[1],
				type: "depends_on",
			});

			await db.upsertRelationship({
				fromNodeId: nodes[1],
				toNodeId: nodes[2],
				type: "depends_on",
			});

			// Infer all
			const result = await engine.inferAll(nodes[0]);

			expect(result.inferences.length).toBeGreaterThan(0);
			expect(result.statistics).toBeDefined();
			expect(result.statistics.directRelationships).toBeGreaterThanOrEqual(0);
			expect(result.executionTime).toBeGreaterThan(0);
		});

		test("should calculate statistics correctly", async () => {
			const node1 = await db.upsertNode({
				identifier: "stats1",
				type: "module",
				name: "Stats1",
				sourceFile: "stats1.ts",
				language: "typescript",
			});

			const node2 = await db.upsertNode({
				identifier: "stats2",
				type: "module",
				name: "Stats2",
				sourceFile: "stats2.ts",
				language: "typescript",
			});

			await db.upsertRelationship({
				fromNodeId: node1,
				toNodeId: node2,
				type: "depends_on",
			});

			const result = await engine.inferAll(node1);

			expect(result.statistics.inferredByType).toBeDefined();
			expect(result.statistics.averageDepth).toBeGreaterThanOrEqual(0);
			expect(result.statistics.maxDepth).toBeGreaterThanOrEqual(0);
		});
	});

	describe("Edge Cases", () => {
		test("should handle non-existent edge type", async () => {
			await expect(async () => {
				await engine.queryHierarchical("nonexistent");
			}).rejects.toThrow("Edge type not found");
		});

		test("should handle non-transitive type for transitive query", async () => {
			const node1 = await db.upsertNode({
				identifier: "nt1",
				type: "module",
				name: "NT1",
				sourceFile: "nt1.ts",
				language: "typescript",
			});

			// Use 'declares' which is non-transitive
			await expect(async () => {
				await engine.queryTransitive(node1, "declares");
			}).rejects.toThrow("not transitive");
		});

		test("should handle non-inheritable type for inheritable query", async () => {
			const node1 = await db.upsertNode({
				identifier: "ni1",
				type: "module",
				name: "NI1",
				sourceFile: "ni1.ts",
				language: "typescript",
			});

			await expect(async () => {
				await engine.queryInheritable(node1, "contains", "depends_on");
			}).rejects.toThrow("not inheritable");
		});

		test("should handle empty result sets gracefully", async () => {
			const node1 = await db.upsertNode({
				identifier: "empty1",
				type: "module",
				name: "Empty1",
				sourceFile: "empty1.ts",
				language: "typescript",
			});

			const inferences = await engine.queryTransitive(node1, "depends_on");
			expect(inferences).toEqual([]);
		});
	});
});
