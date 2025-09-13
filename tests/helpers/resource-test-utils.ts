/**
 * Resource management utilities for test scenarios
 * Provides tools for tracking and managing system resources during tests
 */

import { createReadStream, createWriteStream, existsSync, statSync } from 'fs';
import { mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

export interface ResourceUsage {
	cpuUsage: NodeJS.CpuUsage;
	memoryUsage: NodeJS.MemoryUsage;
	fileHandles: number;
	timestamp: number;
}

export interface ResourceLimits {
	maxMemoryMB?: number;
	maxCpuPercent?: number;
	maxFileHandles?: number;
	timeoutMs?: number;
}

export interface TempResource {
	path: string;
	type: 'file' | 'directory';
	cleanup: () => Promise<void>;
}

/**
 * Resource monitor for tracking system resource usage during tests
 */
export class ResourceMonitor {
	private initialCpu: NodeJS.CpuUsage;
	private samples: ResourceUsage[] = [];
	private intervalId: NodeJS.Timeout | null = null;
	private startTime: number = 0;

	constructor() {
		this.initialCpu = process.cpuUsage();
	}

	/**
	 * Take a resource usage snapshot
	 */
	public takeSnapshot(): ResourceUsage {
		// Estimate file handles (approximation for testing)
		const fileHandles = (process as any)._getActiveHandles?.()?.length || 0;
		
		return {
			cpuUsage: process.cpuUsage(this.initialCpu),
			memoryUsage: process.memoryUsage(),
			fileHandles,
			timestamp: Date.now(),
		};
	}

	/**
	 * Start monitoring resource usage
	 */
	public startMonitoring(intervalMs: number = 100): void {
		this.startTime = Date.now();
		this.samples = [];
		this.initialCpu = process.cpuUsage();

		this.intervalId = setInterval(() => {
			this.samples.push(this.takeSnapshot());
		}, intervalMs);
	}

	/**
	 * Stop monitoring and return samples
	 */
	public stopMonitoring(): ResourceUsage[] {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
		return [...this.samples];
	}

	/**
	 * Get resource usage statistics
	 */
	public getStats(): {
		peak: {
			memory: number;
			cpuUser: number;
			cpuSystem: number;
			fileHandles: number;
		};
		average: {
			memory: number;
			cpuUser: number;
			cpuSystem: number;
			fileHandles: number;
		};
		duration: number;
		samples: number;
	} {
		if (this.samples.length === 0) {
			throw new Error('No samples collected');
		}

		const peak = this.samples.reduce(
			(max, sample) => ({
				memory: Math.max(max.memory, sample.memoryUsage.heapUsed),
				cpuUser: Math.max(max.cpuUser, sample.cpuUsage.user),
				cpuSystem: Math.max(max.cpuSystem, sample.cpuUsage.system),
				fileHandles: Math.max(max.fileHandles, sample.fileHandles),
			}),
			{ memory: 0, cpuUser: 0, cpuSystem: 0, fileHandles: 0 }
		);

		const totals = this.samples.reduce(
			(acc, sample) => ({
				memory: acc.memory + sample.memoryUsage.heapUsed,
				cpuUser: acc.cpuUser + sample.cpuUsage.user,
				cpuSystem: acc.cpuSystem + sample.cpuUsage.system,
				fileHandles: acc.fileHandles + sample.fileHandles,
			}),
			{ memory: 0, cpuUser: 0, cpuSystem: 0, fileHandles: 0 }
		);

		const count = this.samples.length;
		const average = {
			memory: Math.round(totals.memory / count),
			cpuUser: Math.round(totals.cpuUser / count),
			cpuSystem: Math.round(totals.cpuSystem / count),
			fileHandles: Math.round(totals.fileHandles / count),
		};

		return {
			peak,
			average,
			duration: Date.now() - this.startTime,
			samples: count,
		};
	}
}

/**
 * Temporary resource manager for tests
 */
export class TempResourceManager {
	private resources: TempResource[] = [];
	private baseDir: string;

	constructor() {
		this.baseDir = join(tmpdir(), `test-resources-${Date.now()}`);
	}

	/**
	 * Create a temporary directory
	 */
	public async createTempDir(name?: string): Promise<TempResource> {
		const dirName = name || `temp-dir-${Date.now()}`;
		const dirPath = join(this.baseDir, dirName);
		
		await mkdir(dirPath, { recursive: true });

		const resource: TempResource = {
			path: dirPath,
			type: 'directory',
			cleanup: async () => {
				try {
					await rm(dirPath, { recursive: true, force: true });
				} catch (error) {
					console.warn(`Failed to cleanup directory ${dirPath}:`, error);
				}
			},
		};

		this.resources.push(resource);
		return resource;
	}

	/**
	 * Create a temporary file with content
	 */
	public async createTempFile(
		content: string,
		fileName?: string,
		extension: string = '.ts'
	): Promise<TempResource> {
		const name = fileName || `temp-file-${Date.now()}`;
		const fullName = name.endsWith(extension) ? name : `${name}${extension}`;
		const filePath = join(this.baseDir, fullName);
		
		await mkdir(this.baseDir, { recursive: true });
		await writeFile(filePath, content, 'utf8');

		const resource: TempResource = {
			path: filePath,
			type: 'file',
			cleanup: async () => {
				try {
					await rm(filePath, { force: true });
				} catch (error) {
					console.warn(`Failed to cleanup file ${filePath}:`, error);
				}
			},
		};

		this.resources.push(resource);
		return resource;
	}

	/**
	 * Create multiple test files at once
	 */
	public async createTestFiles(files: Record<string, string>): Promise<Record<string, TempResource>> {
		const results: Record<string, TempResource> = {};
		
		for (const [fileName, content] of Object.entries(files)) {
			results[fileName] = await this.createTempFile(content, fileName);
		}

		return results;
	}

	/**
	 * Cleanup all managed resources
	 */
	public async cleanupAll(): Promise<void> {
		const cleanupPromises = this.resources.map(resource => 
			resource.cleanup().catch(error => 
				console.warn(`Cleanup failed for ${resource.path}:`, error)
			)
		);

		await Promise.allSettled(cleanupPromises);

		// Clean up base directory
		try {
			if (existsSync(this.baseDir)) {
				await rm(this.baseDir, { recursive: true, force: true });
			}
		} catch (error) {
			console.warn(`Failed to cleanup base directory ${this.baseDir}:`, error);
		}

		this.resources = [];
	}

	/**
	 * Get paths of all created resources
	 */
	public getResourcePaths(): string[] {
		return this.resources.map(r => r.path);
	}
}

/**
 * Resource-aware test runner that enforces limits
 */
export async function withResourceLimits<T>(
	fn: () => Promise<T>,
	limits: ResourceLimits = {}
): Promise<{ result: T; stats: ResourceUsage }> {
	const monitor = new ResourceMonitor();
	const {
		maxMemoryMB = 500,
		maxFileHandles = 100,
		timeoutMs = 30000,
	} = limits;

	// Set timeout
	const timeoutPromise = new Promise<never>((_, reject) => {
		setTimeout(() => reject(new Error(`Test exceeded timeout: ${timeoutMs}ms`)), timeoutMs);
	});

	try {
		monitor.startMonitoring();
		const before = monitor.takeSnapshot();

		// Run the function with timeout
		const result = await Promise.race([fn(), timeoutPromise]);
		
		const after = monitor.takeSnapshot();
		monitor.stopMonitoring();

		// Check limits
		const memoryUsedMB = after.memoryUsage.heapUsed / 1024 / 1024;
		if (memoryUsedMB > maxMemoryMB) {
			throw new Error(`Memory limit exceeded: ${memoryUsedMB.toFixed(2)}MB > ${maxMemoryMB}MB`);
		}

		if (after.fileHandles > maxFileHandles) {
			throw new Error(`File handle limit exceeded: ${after.fileHandles} > ${maxFileHandles}`);
		}

		return { result, stats: after };
	} catch (error) {
		monitor.stopMonitoring();
		throw error;
	}
}

/**
 * Create test TypeScript files with various complexities
 */
export function createTestTypeScriptFiles(): Record<string, string> {
	return {
		'simple.ts': `
export interface SimpleType {
  id: number;
  name: string;
}

export const simpleFunction = (): SimpleType => ({
  id: 1,
  name: 'test'
});
`,
		'complex.ts': `
import { readFile } from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface ComplexType<T = any> {
  id: number;
  data: T;
  metadata: Record<string, unknown>;
  callbacks: Array<(item: T) => void>;
}

export class ComplexClass<T> extends EventEmitter implements ComplexType<T> {
  public readonly id: number;
  public data: T;
  public metadata: Record<string, unknown> = {};
  public callbacks: Array<(item: T) => void> = [];

  constructor(id: number, data: T) {
    super();
    this.id = id;
    this.data = data;
  }

  public async processData(): Promise<void> {
    const filePath = path.resolve('./data.json');
    try {
      const content = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(content);
      this.emit('processed', parsed);
    } catch (error) {
      this.emit('error', error);
    }
  }
}

export type ProcessorFunction<T> = (input: T) => Promise<T | null>;
export type ValidatorFunction<T> = (input: T) => boolean;

export const createProcessor = <T>(
  validator: ValidatorFunction<T>,
  processor: ProcessorFunction<T>
) => async (input: T): Promise<T | null> => {
  if (!validator(input)) return null;
  return processor(input);
};
`,
		'with-errors.ts': `
import { missingModule } from 'non-existent-package';
import * as fs from 'fs'

export interface ErrorType {
  id number; // Missing colon
  name: string;
}

export const errorFunction = (): ErrorType => {
  const result = {
    id: 1,
    name: 'test'
  }
  return result; // Type error
};

export class ErrorClass implements ErrorType {
  public id: number
  public name: string; // Missing semicolon above

  constructor() {
    this.id = 'not-a-number'; // Type error
    this.name = 123; // Type error
  }
}
`,
	};
}

/**
 * Jest setup helper for resource management
 */
export function setupResourceManagement(): {
	tempManager: TempResourceManager;
	cleanup: () => Promise<void>;
} {
	const tempManager = new TempResourceManager();
	
	const cleanup = async () => {
		await tempManager.cleanupAll();
	};

	// Auto-cleanup on process exit
	process.on('exit', () => {
		// Synchronous cleanup on exit
		try {
			const paths = tempManager.getResourcePaths();
			paths.forEach(p => {
				try {
					if (existsSync(p)) {
						const stat = statSync(p);
						if (stat.isDirectory()) {
							require('child_process').execSync(`rm -rf "${p}"`, { stdio: 'ignore' });
						} else {
							require('fs').unlinkSync(p);
						}
					}
				} catch (e) {
					// Ignore cleanup errors on exit
				}
			});
		} catch (e) {
			// Ignore cleanup errors on exit
		}
	});

	return { tempManager, cleanup };
}