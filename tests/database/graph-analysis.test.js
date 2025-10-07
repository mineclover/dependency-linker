"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const promises_1 = require("node:fs/promises");
const GraphDatabase_1 = require("../../src/database/GraphDatabase");
const GraphQueryEngine_1 = require("../../src/database/GraphQueryEngine");
const NodeIdentifier_1 = require("../../src/database/core/NodeIdentifier");
const NodeCentricAnalyzer_1 = require("../../src/database/core/NodeCentricAnalyzer");
const CircularDependencyDetector_1 = require("../../src/database/core/CircularDependencyDetector");
describe("Graph Analysis System - Comprehensive Test Scenarios", () => {
	let testDir;
	let db;
	let queryEngine;
	let nodeIdentifier;
	let analyzer;
	const projectRoot = "/test/project";
	beforeAll(async () => {
		testDir = await (0, promises_1.mkdtemp)(
			(0, node_path_1.join)((0, node_os_1.tmpdir)(), "graph-test-"),
		);
	});
	beforeEach(async () => {
		const dbPath = (0, node_path_1.join)(testDir, `test-${Date.now()}.db`);
		db = (0, GraphDatabase_1.createGraphDatabase)(dbPath);
		await db.initialize();
		queryEngine = (0, GraphQueryEngine_1.createGraphQueryEngine)(db);
		nodeIdentifier = (0, NodeIdentifier_1.createNodeIdentifier)(projectRoot);
		analyzer = (0, NodeCentricAnalyzer_1.createNodeCentricAnalyzer)(
			db,
			queryEngine,
			nodeIdentifier,
		);
	});
	afterEach(async () => {
		await db.close();
	});
	afterAll(async () => {
		await (0, promises_1.rm)(testDir, { recursive: true, force: true });
	});
	describe("Scenario 1: React Application Analysis", () => {
		beforeEach(async () => {
			await setupReactApplicationGraph();
		});
		test("should identify component hierarchy", async () => {
			const appComponentId = await getNodeIdByIdentifier("file#src/App.tsx");
			const userProfileId = await getNodeIdByIdentifier(
				"file#src/components/UserProfile.tsx",
			);
			const avatarId = await getNodeIdByIdentifier(
				"file#src/components/Avatar.tsx",
			);
			expect(appComponentId).toBeDefined();
			expect(userProfileId).toBeDefined();
			expect(avatarId).toBeDefined();
			const appDependencies = await db.findNodeDependencies(appComponentId, [
				"imports",
			]);
			const importedUserProfile = appDependencies.find(
				(dep) => dep.id === userProfileId,
			);
			expect(importedUserProfile).toBeDefined();
			const userProfileDependencies = await db.findNodeDependencies(
				userProfileId,
				["imports"],
			);
			const importedAvatar = userProfileDependencies.find(
				(dep) => dep.id === avatarId,
			);
			expect(importedAvatar).toBeDefined();
		});
		test("should detect component reusability", async () => {
			const avatarId = await getNodeIdByIdentifier(
				"file#src/components/Avatar.tsx",
			);
			const avatarDependents = await db.findNodeDependents(avatarId, [
				"imports",
			]);
			expect(avatarDependents.length).toBeGreaterThan(1);
			const dependentNames = avatarDependents.map((dep) => dep.name);
			expect(dependentNames).toContain("UserProfile.tsx");
			expect(dependentNames).toContain("ContactCard.tsx");
		});
		test("should analyze hook dependencies", async () => {
			const useUserDataId = await getNodeIdByIdentifier(
				"function#src/hooks/useUserData.ts::useUserData()",
			);
			if (useUserDataId) {
				const hookDependencies = await db.findNodeDependencies(useUserDataId, [
					"calls",
					"references",
				]);
				expect(hookDependencies.length).toBeGreaterThan(0);
				const apiCalls = hookDependencies.filter(
					(dep) => dep.identifier.includes("api") || dep.type === "function",
				);
				expect(apiCalls.length).toBeGreaterThan(0);
			}
		});
		test("should identify circular dependencies in components", async () => {
			await createCircularDependency();
			const detector = (0,
			CircularDependencyDetector_1.createCircularDependencyDetector)({
				maxDepth: 10,
				maxCycles: 50,
				timeout: 5000,
				edgeTypes: ["imports"],
			});
			const result = await detector.detect(
				async (nodeId) => {
					const dependencies = await db.findNodeDependencies(parseInt(nodeId), [
						"imports",
					]);
					return dependencies.map((dep) => ({
						to: dep.id.toString(),
						type: "imports",
					}));
				},
				async () => {
					const nodes = await db.findNodes({ nodeTypes: ["file"] });
					return nodes.map((n) => ({ id: n.id.toString(), type: n.type }));
				},
			);
			expect(result.cycles.length).toBeGreaterThan(0);
			expect(result.stats.totalNodesVisited).toBeGreaterThan(0);
			expect(result.stats.processingTime).toBeLessThan(5000);
		});
	});
	describe("Scenario 2: API Layer Analysis", () => {
		beforeEach(async () => {
			await setupApiLayerGraph();
		});
		test("should trace API endpoint dependencies", async () => {
			const userApiId = await getNodeIdByIdentifier("file#src/api/user.ts");
			const authServiceId = await getNodeIdByIdentifier(
				"file#src/services/auth.ts",
			);
			expect(userApiId).toBeDefined();
			expect(authServiceId).toBeDefined();
			const dependencies = await db.findNodeDependencies(userApiId, [
				"imports",
				"calls",
			]);
			const authDependency = dependencies.find(
				(dep) => dep.id === authServiceId,
			);
			expect(authDependency).toBeDefined();
		});
		test("should analyze service layer coupling", async () => {
			const userServiceId = await getNodeIdByIdentifier(
				"file#src/services/user.ts",
			);
			expect(userServiceId).toBeDefined();
			if (userServiceId) {
				const analysis = await analyzer.analyzeNodeImpact(
					"file#src/services/user.ts",
				);
				expect(analysis.metrics.fanIn).toBeGreaterThan(0);
				expect(analysis.metrics.fanOut).toBeGreaterThan(0);
				expect(analysis.metrics.instability).toBeLessThan(1);
				if (analysis.risks.highCoupling) {
					expect(
						analysis.dependencies.direct.length +
							analysis.dependents.direct.length,
					).toBeGreaterThan(10);
				}
			}
		});
		test("should identify critical API nodes", async () => {
			const authServiceId = await getNodeIdByIdentifier(
				"file#src/services/auth.ts",
			);
			if (authServiceId) {
				const analysis = await analyzer.analyzeNodeImpact(
					"file#src/services/auth.ts",
				);
				expect(analysis.metrics.criticalityScore).toBeGreaterThanOrEqual(5);
				expect(analysis.dependents.direct.length).toBeGreaterThan(3);
				if (analysis.risks.singlePointOfFailure) {
					expect(analysis.dependents.direct.length).toBeGreaterThan(50);
				}
			}
		});
	});
	describe("Scenario 3: Library and Package Analysis", () => {
		beforeEach(async () => {
			await setupLibraryDependencyGraph();
		});
		test("should distinguish internal vs external dependencies", async () => {
			const appId = await getNodeIdByIdentifier("file#src/App.tsx");
			if (appId) {
				const dependencies = await db.findNodeDependencies(appId, ["imports"]);
				const internalDeps = dependencies.filter((dep) => dep.type === "file");
				const externalDeps = dependencies.filter(
					(dep) => dep.type === "library",
				);
				expect(internalDeps.length).toBeGreaterThan(0);
				expect(externalDeps.length).toBeGreaterThan(0);
				const externalNames = externalDeps.map((dep) => dep.name);
				expect(externalNames).toContain("react");
				expect(externalNames).toContain("lodash");
			}
		});
		test("should analyze library usage patterns", async () => {
			const reactLibId = await getNodeIdByIdentifier("lib#react");
			if (reactLibId) {
				const reactDependents = await db.findNodeDependents(reactLibId, [
					"imports",
				]);
				expect(reactDependents.length).toBeGreaterThan(2);
				const componentFiles = reactDependents.filter(
					(dep) =>
						dep.sourceFile.includes("components/") ||
						dep.name.includes("Component"),
				);
				expect(componentFiles.length).toBeGreaterThan(0);
			}
		});
		test("should identify unused libraries", async () => {
			const allLibraries = await db.findNodes({ nodeTypes: ["library"] });
			for (const lib of allLibraries) {
				const dependents = await db.findNodeDependents(lib.id, ["imports"]);
				if (dependents.length === 0) {
					console.log(`Unused library detected: ${lib.name}`);
				}
			}
			const usedLibraries = await Promise.all(
				allLibraries.map(async (lib) => {
					const dependents = await db.findNodeDependents(lib.id, ["imports"]);
					return dependents.length > 0;
				}),
			);
			expect(usedLibraries.some((used) => used)).toBe(true);
		});
	});
	describe("Scenario 4: Node-Centric Deep Analysis", () => {
		beforeEach(async () => {
			await setupComplexDependencyGraph();
		});
		test("should perform comprehensive node impact analysis", async () => {
			const coreUtilId = "file#src/utils/core.ts";
			const analysis = await analyzer.analyzeNodeImpact(coreUtilId);
			expect(analysis.node.identifier).toBe(coreUtilId);
			expect(analysis.dependencies).toBeDefined();
			expect(analysis.dependents).toBeDefined();
			expect(analysis.metrics).toBeDefined();
			expect(analysis.risks).toBeDefined();
			expect(analysis.metrics.fanIn).toBeGreaterThanOrEqual(0);
			expect(analysis.metrics.fanOut).toBeGreaterThanOrEqual(0);
			expect(analysis.metrics.instability).toBeGreaterThanOrEqual(0);
			expect(analysis.metrics.instability).toBeLessThanOrEqual(1);
			expect(analysis.metrics.criticalityScore).toBeGreaterThanOrEqual(0);
		});
		test("should analyze node neighborhood", async () => {
			const coreUtilId = "file#src/utils/core.ts";
			const neighborhood = await analyzer.analyzeNodeNeighborhood(coreUtilId);
			expect(neighborhood.center.identifier).toBe(coreUtilId);
			expect(neighborhood.immediate).toBeDefined();
			expect(neighborhood.extended).toBeDefined();
			expect(neighborhood.clusters).toBeDefined();
			expect(
				neighborhood.immediate.incoming.length +
					neighborhood.immediate.outgoing.length,
			).toBeGreaterThan(0);
		});
		test("should find shortest path between nodes", async () => {
			const sourceId = "file#src/App.tsx";
			const targetId = "file#src/utils/helpers.ts";
			const path = await analyzer.findShortestPath(sourceId, targetId);
			if (path) {
				expect(path.length).toBeGreaterThan(1);
				expect(path[0].identifier).toBe(sourceId);
				expect(path[path.length - 1].identifier).toBe(targetId);
				for (let i = 0; i < path.length - 1; i++) {
					expect(path[i + 1].distance).toBe(path[i].distance + 1);
				}
			}
		});
		test("should perform node evolution analysis", async () => {
			const nodeId = "file#src/services/api.ts";
			const evolution = await analyzer.analyzeNodeEvolution(nodeId);
			expect(evolution.node.identifier).toBe(nodeId);
			expect(evolution.changeFrequency).toBeGreaterThanOrEqual(0);
			expect(evolution.changeFrequency).toBeLessThanOrEqual(1);
			expect(evolution.impactRadius).toBeGreaterThanOrEqual(0);
			expect(evolution.stabilityScore).toBeGreaterThanOrEqual(0);
			expect(evolution.stabilityScore).toBeLessThanOrEqual(1);
			expect(["low", "medium", "high"]).toContain(evolution.refactoringRisk);
			expect(Array.isArray(evolution.recommendations)).toBe(true);
		});
		test("should cluster related nodes", async () => {
			const seedNodes = [
				"file#src/components/UserProfile.tsx",
				"file#src/components/Avatar.tsx",
				"file#src/utils/helpers.ts",
			];
			const clusters = await analyzer.clusterRelatedNodes(seedNodes);
			expect(clusters.length).toBeGreaterThan(0);
			for (const cluster of clusters) {
				expect(cluster.id).toBeDefined();
				expect(cluster.nodes.length).toBeGreaterThan(0);
				expect(cluster.cohesion).toBeGreaterThanOrEqual(0);
				expect(cluster.cohesion).toBeLessThanOrEqual(1);
				expect(cluster.purpose).toBeDefined();
			}
		});
	});
	describe("Scenario 5: Performance and Edge Cases", () => {
		test("should handle large graphs efficiently", async () => {
			await setupLargeGraph(1000);
			const startTime = Date.now();
			const stats = await db.getStats();
			const processingTime = Date.now() - startTime;
			expect(stats.totalNodes).toBe(1000);
			expect(processingTime).toBeLessThan(5000);
		});
		test("should handle deep dependency chains", async () => {
			await setupDeepDependencyChain(20);
			const detector = (0,
			CircularDependencyDetector_1.createCircularDependencyDetector)({
				maxDepth: 25,
				timeout: 10000,
			});
			const result = await detector.detect(
				async (nodeId) => {
					const dependencies = await db.findNodeDependencies(parseInt(nodeId), [
						"imports",
					]);
					return dependencies.map((dep) => ({
						to: dep.id.toString(),
						type: "imports",
					}));
				},
				async () => {
					const nodes = await db.findNodes({});
					return nodes.map((n) => ({ id: n.id.toString(), type: n.type }));
				},
			);
			expect(result.stats.maxDepthReached).toBeLessThanOrEqual(25);
			expect(result.stats.timeoutOccurred).toBe(false);
		});
		test("should respect timeout limits", async () => {
			await setupComplexGraph(100);
			const detector = (0,
			CircularDependencyDetector_1.createCircularDependencyDetector)({
				maxDepth: 50,
				timeout: 100,
			});
			const startTime = Date.now();
			const result = await detector.detect(
				async (nodeId) => {
					const dependencies = await db.findNodeDependencies(parseInt(nodeId), [
						"imports",
					]);
					return dependencies.map((dep) => ({
						to: dep.id.toString(),
						type: "imports",
					}));
				},
				async () => {
					const nodes = await db.findNodes({});
					return nodes.map((n) => ({ id: n.id.toString(), type: n.type }));
				},
			);
			const actualTime = Date.now() - startTime;
			expect(actualTime).toBeLessThan(500);
		});
	});
	async function setupReactApplicationGraph() {
		const files = [
			{ id: "file#src/App.tsx", name: "App.tsx", type: "file" },
			{
				id: "file#src/components/UserProfile.tsx",
				name: "UserProfile.tsx",
				type: "file",
			},
			{
				id: "file#src/components/Avatar.tsx",
				name: "Avatar.tsx",
				type: "file",
			},
			{
				id: "file#src/components/ContactCard.tsx",
				name: "ContactCard.tsx",
				type: "file",
			},
			{
				id: "file#src/hooks/useUserData.ts",
				name: "useUserData.ts",
				type: "file",
			},
		];
		const libraries = [
			{ id: "lib#react", name: "react", type: "library" },
			{ id: "lib#lodash", name: "lodash", type: "library" },
		];
		const functions = [
			{
				id: "function#src/hooks/useUserData.ts::useUserData()",
				name: "useUserData",
				type: "function",
			},
			{
				id: "function#src/api/user.ts::fetchUser()",
				name: "fetchUser",
				type: "function",
			},
			{
				id: "function#src/api/user.ts::updateUser()",
				name: "updateUser",
				type: "function",
			},
		];
		for (const node of [...files, ...libraries, ...functions]) {
			await db.upsertNode({
				identifier: node.id,
				type: node.type,
				name: node.name,
				sourceFile: node.id.includes("src/")
					? node.id.split("#")[1]
					: node.name,
				language: "typescript",
				metadata: {},
			});
		}
		const relationships = [
			{
				from: "file#src/App.tsx",
				to: "file#src/components/UserProfile.tsx",
				type: "imports",
			},
			{
				from: "file#src/components/UserProfile.tsx",
				to: "file#src/components/Avatar.tsx",
				type: "imports",
			},
			{
				from: "file#src/components/ContactCard.tsx",
				to: "file#src/components/Avatar.tsx",
				type: "imports",
			},
			{ from: "file#src/App.tsx", to: "lib#react", type: "imports" },
			{ from: "file#src/App.tsx", to: "lib#lodash", type: "imports" },
			{
				from: "file#src/components/UserProfile.tsx",
				to: "lib#react",
				type: "imports",
			},
			{
				from: "file#src/components/Avatar.tsx",
				to: "lib#react",
				type: "imports",
			},
			{
				from: "file#src/hooks/useUserData.ts",
				to: "lib#lodash",
				type: "imports",
			},
			{
				from: "function#src/hooks/useUserData.ts::useUserData()",
				to: "function#src/api/user.ts::fetchUser()",
				type: "calls",
			},
			{
				from: "function#src/hooks/useUserData.ts::useUserData()",
				to: "function#src/api/user.ts::updateUser()",
				type: "references",
			},
		];
		for (const rel of relationships) {
			const fromId = await getNodeIdByIdentifier(rel.from);
			const toId = await getNodeIdByIdentifier(rel.to);
			if (fromId && toId) {
				await db.upsertRelationship({
					fromNodeId: fromId,
					toNodeId: toId,
					type: rel.type,
					metadata: {},
				});
			}
		}
	}
	async function setupApiLayerGraph() {
		const nodes = [
			{ id: "file#src/api/user.ts", name: "user.ts", type: "file" },
			{ id: "file#src/api/auth.ts", name: "auth.ts", type: "file" },
			{ id: "file#src/services/user.ts", name: "user.ts", type: "file" },
			{ id: "file#src/services/auth.ts", name: "auth.ts", type: "file" },
			{
				id: "file#src/services/database.ts",
				name: "database.ts",
				type: "file",
			},
			{ id: "file#src/controllers/user.ts", name: "user.ts", type: "file" },
		];
		for (const node of nodes) {
			await db.upsertNode({
				identifier: node.id,
				type: node.type,
				name: node.name,
				sourceFile: node.id.split("#")[1],
				language: "typescript",
				metadata: {},
			});
		}
		const relationships = [
			{
				from: "file#src/api/user.ts",
				to: "file#src/services/auth.ts",
				type: "imports",
			},
			{
				from: "file#src/api/user.ts",
				to: "file#src/services/user.ts",
				type: "imports",
			},
			{
				from: "file#src/api/auth.ts",
				to: "file#src/services/auth.ts",
				type: "imports",
			},
			{
				from: "file#src/services/user.ts",
				to: "file#src/services/database.ts",
				type: "imports",
			},
			{
				from: "file#src/services/auth.ts",
				to: "file#src/services/database.ts",
				type: "imports",
			},
			{
				from: "file#src/controllers/user.ts",
				to: "file#src/services/user.ts",
				type: "imports",
			},
			{
				from: "file#src/controllers/user.ts",
				to: "file#src/services/auth.ts",
				type: "imports",
			},
			{
				from: "file#src/services/user.ts",
				to: "file#src/services/auth.ts",
				type: "imports",
			},
			{
				from: "file#src/services/database.ts",
				to: "file#src/services/auth.ts",
				type: "imports",
			},
		];
		for (const rel of relationships) {
			const fromId = await getNodeIdByIdentifier(rel.from);
			const toId = await getNodeIdByIdentifier(rel.to);
			if (fromId && toId) {
				await db.upsertRelationship({
					fromNodeId: fromId,
					toNodeId: toId,
					type: rel.type,
					metadata: {},
				});
			}
		}
	}
	async function setupLibraryDependencyGraph() {
		await setupReactApplicationGraph();
	}
	async function setupComplexDependencyGraph() {
		const nodes = [
			{ id: "file#src/App.tsx", name: "App.tsx", type: "file" },
			{ id: "file#src/utils/core.ts", name: "core.ts", type: "file" },
			{ id: "file#src/utils/helpers.ts", name: "helpers.ts", type: "file" },
			{ id: "file#src/services/api.ts", name: "api.ts", type: "file" },
			{ id: "file#src/services/user.ts", name: "user.ts", type: "file" },
			{ id: "file#src/services/auth.ts", name: "auth.ts", type: "file" },
			{
				id: "file#src/components/Layout.tsx",
				name: "Layout.tsx",
				type: "file",
			},
			{
				id: "file#src/components/UserProfile.tsx",
				name: "UserProfile.tsx",
				type: "file",
			},
			{
				id: "file#src/components/Avatar.tsx",
				name: "Avatar.tsx",
				type: "file",
			},
		];
		for (const node of nodes) {
			await db.upsertNode({
				identifier: node.id,
				type: node.type,
				name: node.name,
				sourceFile: node.id.split("#")[1],
				language: "typescript",
				metadata: {},
			});
		}
		const relationships = [
			{
				from: "file#src/App.tsx",
				to: "file#src/components/Layout.tsx",
				type: "imports",
			},
			{
				from: "file#src/App.tsx",
				to: "file#src/services/api.ts",
				type: "imports",
			},
			{
				from: "file#src/services/api.ts",
				to: "file#src/utils/core.ts",
				type: "imports",
			},
			{
				from: "file#src/utils/core.ts",
				to: "file#src/utils/helpers.ts",
				type: "imports",
			},
			{
				from: "file#src/components/Layout.tsx",
				to: "file#src/utils/helpers.ts",
				type: "imports",
			},
			{
				from: "file#src/services/api.ts",
				to: "file#src/services/user.ts",
				type: "imports",
			},
			{
				from: "file#src/services/api.ts",
				to: "file#src/services/auth.ts",
				type: "imports",
			},
			{
				from: "file#src/services/user.ts",
				to: "file#src/utils/core.ts",
				type: "imports",
			},
			{
				from: "file#src/services/auth.ts",
				to: "file#src/utils/core.ts",
				type: "imports",
			},
			{
				from: "file#src/components/UserProfile.tsx",
				to: "file#src/services/user.ts",
				type: "imports",
			},
			{
				from: "file#src/components/UserProfile.tsx",
				to: "file#src/components/Avatar.tsx",
				type: "imports",
			},
			{
				from: "file#src/components/Avatar.tsx",
				to: "file#src/utils/helpers.ts",
				type: "imports",
			},
		];
		for (const rel of relationships) {
			const fromId = await getNodeIdByIdentifier(rel.from);
			const toId = await getNodeIdByIdentifier(rel.to);
			if (fromId && toId) {
				await db.upsertRelationship({
					fromNodeId: fromId,
					toNodeId: toId,
					type: rel.type,
					metadata: {},
				});
			}
		}
	}
	async function createCircularDependency() {
		const circularNodes = [
			{ id: "file#src/circular/A.ts", name: "A.ts", type: "file" },
			{ id: "file#src/circular/B.ts", name: "B.ts", type: "file" },
			{ id: "file#src/circular/C.ts", name: "C.ts", type: "file" },
		];
		for (const node of circularNodes) {
			await db.upsertNode({
				identifier: node.id,
				type: node.type,
				name: node.name,
				sourceFile: node.id.split("#")[1],
				language: "typescript",
				metadata: {},
			});
		}
		const circularRels = [
			{
				from: "file#src/circular/A.ts",
				to: "file#src/circular/B.ts",
				type: "imports",
			},
			{
				from: "file#src/circular/B.ts",
				to: "file#src/circular/C.ts",
				type: "imports",
			},
			{
				from: "file#src/circular/C.ts",
				to: "file#src/circular/A.ts",
				type: "imports",
			},
		];
		for (const rel of circularRels) {
			const fromId = await getNodeIdByIdentifier(rel.from);
			const toId = await getNodeIdByIdentifier(rel.to);
			if (fromId && toId) {
				await db.upsertRelationship({
					fromNodeId: fromId,
					toNodeId: toId,
					type: rel.type,
					metadata: {},
				});
			}
		}
	}
	async function setupLargeGraph(nodeCount) {
		const nodes = Array.from({ length: nodeCount }, (_, i) => ({
			id: `file#src/generated/file${i}.ts`,
			name: `file${i}.ts`,
			type: "file",
		}));
		for (const node of nodes) {
			await db.upsertNode({
				identifier: node.id,
				type: node.type,
				name: node.name,
				sourceFile: node.id.split("#")[1],
				language: "typescript",
				metadata: {},
			});
		}
	}
	async function setupDeepDependencyChain(depth) {
		const nodes = Array.from({ length: depth }, (_, i) => ({
			id: `file#src/chain/level${i}.ts`,
			name: `level${i}.ts`,
			type: "file",
		}));
		for (const node of nodes) {
			await db.upsertNode({
				identifier: node.id,
				type: node.type,
				name: node.name,
				sourceFile: node.id.split("#")[1],
				language: "typescript",
				metadata: {},
			});
		}
		for (let i = 0; i < depth - 1; i++) {
			const fromId = await getNodeIdByIdentifier(`file#src/chain/level${i}.ts`);
			const toId = await getNodeIdByIdentifier(
				`file#src/chain/level${i + 1}.ts`,
			);
			if (fromId && toId) {
				await db.upsertRelationship({
					fromNodeId: fromId,
					toNodeId: toId,
					type: "imports",
					metadata: {},
				});
			}
		}
	}
	async function setupComplexGraph(nodeCount) {
		await setupLargeGraph(nodeCount);
		for (let i = 0; i < nodeCount * 2; i++) {
			const fromIndex = Math.floor(Math.random() * nodeCount);
			const toIndex = Math.floor(Math.random() * nodeCount);
			if (fromIndex !== toIndex) {
				const fromId = await getNodeIdByIdentifier(
					`file#src/generated/file${fromIndex}.ts`,
				);
				const toId = await getNodeIdByIdentifier(
					`file#src/generated/file${toIndex}.ts`,
				);
				if (fromId && toId) {
					await db.upsertRelationship({
						fromNodeId: fromId,
						toNodeId: toId,
						type: "imports",
						metadata: {},
					});
				}
			}
		}
	}
	async function getNodeIdByIdentifier(identifier) {
		const nodes = await db.findNodes({});
		const node = nodes.find((n) => n.identifier === identifier);
		return node?.id || null;
	}
});
//# sourceMappingURL=graph-analysis.test.js.map
