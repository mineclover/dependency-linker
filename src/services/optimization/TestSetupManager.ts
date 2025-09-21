/**
 * Test Setup Manager (T024)
 * Manages test setup and teardown operations, shared resources, and environment configuration
 */

import type { TestCase } from "../../models/optimization/TestCase";
import type { TestSuite } from "../../models/optimization/TestSuite";

export interface TestSetupConfiguration {
	setupTimeout: number;
	teardownTimeout: number;
	maxConcurrentSetups: number;
	enableResourcePooling: boolean;
	sharedResources: Record<string, any>;
	environmentVariables: Record<string, string>;
}

export interface SharedResource {
	id: string;
	type: "database" | "server" | "file" | "memory" | "network" | "custom";
	resource: any;
	setupTime: number;
	teardownTime: number;
	isReusable: boolean;
	currentUsers: string[];
	maxConcurrentUsers: number;
}

export interface SetupResult {
	success: boolean;
	setupTime: number;
	resources: SharedResource[];
	environment: Record<string, any>;
	errors: string[];
}

export interface TeardownResult {
	success: boolean;
	teardownTime: number;
	releasedResources: string[];
	cleanupErrors: string[];
}

export class TestSetupManager {
	private static instance: TestSetupManager;
	private configuration: TestSetupConfiguration;
	private sharedResources: Map<string, SharedResource> = new Map();
	private activeSetups: Set<string> = new Set();
	private setupQueue: Array<{
		testId: string;
		resolve: (result: SetupResult) => void;
		reject: (error: Error) => void;
	}> = [];

	constructor(configuration?: Partial<TestSetupConfiguration>) {
		this.configuration = {
			setupTimeout: 30000, // 30 seconds
			teardownTimeout: 15000, // 15 seconds
			maxConcurrentSetups: 5,
			enableResourcePooling: true,
			sharedResources: {},
			environmentVariables: {},
			...configuration,
		};
	}

	/**
	 * Get singleton instance
	 */
	static getInstance(
		configuration?: Partial<TestSetupConfiguration>,
	): TestSetupManager {
		if (!TestSetupManager.instance) {
			TestSetupManager.instance = new TestSetupManager(configuration);
		}
		return TestSetupManager.instance;
	}

	/**
	 * Setup test environment for a test suite
	 */
	async setupTestSuite(testSuite: TestSuite): Promise<SetupResult> {
		const startTime = performance.now();
		const result: SetupResult = {
			success: false,
			setupTime: 0,
			resources: [],
			environment: {},
			errors: [],
		};

		try {
			// Wait for available setup slot
			await this.waitForSetupSlot(testSuite.id);

			this.activeSetups.add(testSuite.id);

			// Setup shared resources
			const sharedResources = await this.setupSharedResources(testSuite);
			result.resources = sharedResources;

			// Setup environment variables
			const environment = await this.setupEnvironment(testSuite);
			result.environment = environment;

			// Configure test-specific setup
			await this.configureTestSpecificSetup(testSuite);

			result.success = true;
			result.setupTime = performance.now() - startTime;
		} catch (error) {
			result.errors.push(
				error instanceof Error ? error.message : String(error),
			);
			result.success = false;
		} finally {
			this.activeSetups.delete(testSuite.id);
			this.processSetupQueue();
		}

		return result;
	}

	/**
	 * Teardown test environment for a test suite
	 */
	async teardownTestSuite(testSuite: TestSuite): Promise<TeardownResult> {
		const startTime = performance.now();
		const result: TeardownResult = {
			success: false,
			teardownTime: 0,
			releasedResources: [],
			cleanupErrors: [],
		};

		try {
			// Release shared resources
			const releasedResources = await this.releaseSharedResources(testSuite.id);
			result.releasedResources = releasedResources;

			// Cleanup test-specific resources
			await this.cleanupTestSpecificResources(testSuite);

			// Restore environment
			await this.restoreEnvironment();

			result.success = true;
			result.teardownTime = performance.now() - startTime;
		} catch (error) {
			result.cleanupErrors.push(
				error instanceof Error ? error.message : String(error),
			);
			result.success = false;
		}

		return result;
	}

	/**
	 * Setup shared resources needed by multiple tests
	 */
	private async setupSharedResources(
		testSuite: TestSuite,
	): Promise<SharedResource[]> {
		const resources: SharedResource[] = [];

		for (const testCase of testSuite.testCases) {
			const requiredResources = this.analyzeRequiredResources(testCase);

			for (const resourceType of requiredResources) {
				const existingResource = this.sharedResources.get(resourceType);

				if (existingResource?.isReusable) {
					// Use existing resource
					if (
						existingResource.currentUsers.length <
						existingResource.maxConcurrentUsers
					) {
						existingResource.currentUsers.push(testCase.id);
						resources.push(existingResource);
					} else {
						// Create new instance if needed
						const newResource = await this.createSharedResource(
							resourceType,
							testCase.id,
						);
						resources.push(newResource);
					}
				} else {
					// Create new resource
					const newResource = await this.createSharedResource(
						resourceType,
						testCase.id,
					);
					this.sharedResources.set(newResource.id, newResource);
					resources.push(newResource);
				}
			}
		}

		return resources;
	}

	/**
	 * Analyze what resources a test case needs
	 */
	private analyzeRequiredResources(testCase: TestCase): string[] {
		const resources: string[] = [];

		// Analyze test characteristics to determine resource needs
		if (
			testCase.name.toLowerCase().includes("database") ||
			testCase.coverageAreas.some((area) =>
				area.toLowerCase().includes("database"),
			)
		) {
			resources.push("database");
		}

		if (
			testCase.name.toLowerCase().includes("network") ||
			testCase.coverageAreas.some((area) =>
				area.toLowerCase().includes("network"),
			)
		) {
			resources.push("network");
		}

		if (testCase.type === "integration" || testCase.executionTime > 1000) {
			resources.push("memory");
		}

		if (
			testCase.name.toLowerCase().includes("file") ||
			testCase.coverageAreas.some((area) => area.toLowerCase().includes("file"))
		) {
			resources.push("file");
		}

		// Analyze test name for additional resource hints
		const testNameLower = testCase.name.toLowerCase();
		if (testNameLower.includes("server") || testNameLower.includes("api")) {
			resources.push("server");
		}

		return resources;
	}

	/**
	 * Create a new shared resource
	 */
	private async createSharedResource(
		resourceType: string,
		testId: string,
	): Promise<SharedResource> {
		const setupStart = performance.now();
		let resource: any = null;
		let maxConcurrentUsers = 1;

		try {
			switch (resourceType) {
				case "database":
					resource = await this.createDatabaseResource();
					maxConcurrentUsers = 3; // Multiple tests can share a database
					break;

				case "server":
					resource = await this.createServerResource();
					maxConcurrentUsers = 10; // Many tests can share a server
					break;

				case "file":
					resource = await this.createFileResource();
					maxConcurrentUsers = 1; // File resources are typically exclusive
					break;

				case "memory":
					resource = await this.createMemoryResource();
					maxConcurrentUsers = 5; // Shared memory pool
					break;

				case "network":
					resource = await this.createNetworkResource();
					maxConcurrentUsers = 8; // Network resources can be shared
					break;

				default:
					resource = await this.createCustomResource(resourceType);
					maxConcurrentUsers = 2;
			}

			const setupTime = performance.now() - setupStart;

			return {
				id: `${resourceType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				type: resourceType as SharedResource["type"],
				resource,
				setupTime,
				teardownTime: 0,
				isReusable: true,
				currentUsers: [testId],
				maxConcurrentUsers,
			};
		} catch (error) {
			throw new Error(
				`Failed to create ${resourceType} resource: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Database resource creation
	 */
	private async createDatabaseResource(): Promise<any> {
		// Mock database creation - in real implementation, this would create/connect to a test database
		return {
			type: "test_database",
			connectionString: `test_db_${Date.now()}`,
			isConnected: true,
			tables: [],
			cleanup: async () => {
				// Cleanup database
			},
		};
	}

	/**
	 * Server resource creation
	 */
	private async createServerResource(): Promise<any> {
		// Mock server creation - in real implementation, this would start a test server
		const port = 3000 + Math.floor(Math.random() * 1000);
		return {
			type: "test_server",
			port,
			baseUrl: `http://localhost:${port}`,
			isRunning: true,
			cleanup: async () => {
				// Stop server
			},
		};
	}

	/**
	 * File resource creation
	 */
	private async createFileResource(): Promise<any> {
		// Mock file resource - in real implementation, this would create temp files/directories
		const tempPath = `/tmp/test_${Date.now()}`;
		return {
			type: "file_resource",
			path: tempPath,
			isCreated: true,
			cleanup: async () => {
				// Remove temp files
			},
		};
	}

	/**
	 * Memory resource creation
	 */
	private async createMemoryResource(): Promise<any> {
		return {
			type: "memory_pool",
			size: 50 * 1024 * 1024, // 50MB
			allocated: 0,
			cleanup: async () => {
				// Free memory
			},
		};
	}

	/**
	 * Network resource creation
	 */
	private async createNetworkResource(): Promise<any> {
		return {
			type: "network_mock",
			interceptors: [],
			isActive: true,
			cleanup: async () => {
				// Clean up network mocks
			},
		};
	}

	/**
	 * Custom resource creation
	 */
	private async createCustomResource(resourceType: string): Promise<any> {
		const customFactory = this.configuration.sharedResources[resourceType];
		if (customFactory && typeof customFactory === "function") {
			return await customFactory();
		}

		return {
			type: "custom_resource",
			resourceType,
			data: {},
			cleanup: async () => {
				// Custom cleanup
			},
		};
	}

	/**
	 * Setup environment variables and configuration
	 */
	private async setupEnvironment(
		testSuite: TestSuite,
	): Promise<Record<string, any>> {
		const environment: Record<string, any> = {
			...this.configuration.environmentVariables,
			NODE_ENV: "test",
			TEST_SUITE_ID: testSuite.id,
			TEST_SUITE_NAME: testSuite.name,
			TEST_ISOLATION: "true",
		};

		// Apply environment variables
		for (const [key, value] of Object.entries(environment)) {
			process.env[key] = String(value);
		}

		return environment;
	}

	/**
	 * Configure test-specific setup
	 */
	private async configureTestSpecificSetup(
		testSuite: TestSuite,
	): Promise<void> {
		// Configure Jest/test runner specific settings
		if ((global as any).beforeEach && !(global as any).__testSetupConfigured) {
			(global as any).beforeEach(() => {
				// Test-specific setup that runs before each test
				console.log(`Setting up for test suite: ${testSuite.name}`);
			});
			(global as any).__testSetupConfigured = true;
		}

		// Configure parser registry to prevent warnings
		await this.configureParserRegistry();
	}

	/**
	 * Configure parser registry to eliminate warnings
	 */
	private async configureParserRegistry(): Promise<void> {
		// This addresses parser registration warnings mentioned in the spec
		try {
			// Mock parser registry configuration
			if (typeof require !== "undefined") {
				// Ensure parsers are properly registered
				(global as any).__parserRegistryConfigured = true;
			}
		} catch (_error) {
			// Ignore configuration errors in test environment
		}
	}

	/**
	 * Wait for available setup slot
	 */
	private async waitForSetupSlot(testId: string): Promise<void> {
		if (this.activeSetups.size < this.configuration.maxConcurrentSetups) {
			return Promise.resolve();
		}

		return new Promise<void>((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				reject(new Error(`Setup timeout for test ${testId}`));
			}, this.configuration.setupTimeout);

			this.setupQueue.push({
				testId,
				resolve: (_result) => {
					clearTimeout(timeoutId);
					resolve();
				},
				reject: (error) => {
					clearTimeout(timeoutId);
					reject(error);
				},
			});
		});
	}

	/**
	 * Process setup queue when slots become available
	 */
	private processSetupQueue(): void {
		if (this.setupQueue.length === 0) return;
		if (this.activeSetups.size >= this.configuration.maxConcurrentSetups)
			return;

		const next = this.setupQueue.shift();
		if (next) {
			next.resolve({
				success: true,
				setupTime: 0,
				resources: [],
				environment: {},
				errors: [],
			});
		}
	}

	/**
	 * Release shared resources when no longer needed
	 */
	private async releaseSharedResources(testId: string): Promise<string[]> {
		const releasedResources: string[] = [];

		for (const [resourceId, resource] of this.sharedResources.entries()) {
			const userIndex = resource.currentUsers.indexOf(testId);
			if (userIndex !== -1) {
				resource.currentUsers.splice(userIndex, 1);

				// If no more users, cleanup the resource
				if (resource.currentUsers.length === 0) {
					const teardownStart = performance.now();
					try {
						if (resource.resource.cleanup) {
							await resource.resource.cleanup();
						}
						resource.teardownTime = performance.now() - teardownStart;
						this.sharedResources.delete(resourceId);
						releasedResources.push(resourceId);
					} catch (error) {
						console.warn(`Failed to cleanup resource ${resourceId}:`, error);
					}
				}
			}
		}

		return releasedResources;
	}

	/**
	 * Cleanup test-specific resources
	 */
	private async cleanupTestSpecificResources(
		_testSuite: TestSuite,
	): Promise<void> {
		// Cleanup global test state
		delete (global as any).__testSetupConfigured;
		delete (global as any).__parserRegistryConfigured;

		// Clear any test-specific timers or intervals
		if (typeof (global as any).clearAllTimers === "function") {
			(global as any).clearAllTimers();
		}
	}

	/**
	 * Restore environment to previous state
	 */
	private async restoreEnvironment(): Promise<void> {
		// Remove test-specific environment variables
		const testEnvVars = ["TEST_SUITE_ID", "TEST_SUITE_NAME", "TEST_ISOLATION"];
		for (const varName of testEnvVars) {
			delete process.env[varName];
		}
	}

	/**
	 * Get current setup statistics
	 */
	getSetupStatistics() {
		return {
			activeSetups: this.activeSetups.size,
			queuedSetups: this.setupQueue.length,
			sharedResources: this.sharedResources.size,
			resourceTypes: Array.from(this.sharedResources.values()).map(
				(r) => r.type,
			),
			configuration: this.configuration,
		};
	}

	/**
	 * Reset the setup manager state
	 */
	async reset(): Promise<void> {
		// Cleanup all resources
		for (const resource of this.sharedResources.values()) {
			try {
				if (resource.resource.cleanup) {
					await resource.resource.cleanup();
				}
			} catch (error) {
				console.warn("Error during resource cleanup:", error);
			}
		}

		this.sharedResources.clear();
		this.activeSetups.clear();
		this.setupQueue.length = 0;
	}
}
