/**
 * Diagnostic Command
 * Handles system diagnostics, health checks, and troubleshooting
 */

import fs from "fs";
import path from "path";
import { TypeScriptAnalyzer } from "../../api/TypeScriptAnalyzer";
import { LogLevel } from "../../api/types";

export interface DiagnosticOptions {
	format: string;
	includeSystem?: boolean;
	includeBenchmark?: boolean;
	verbose?: boolean;
	outputFile?: string;
}

export interface SystemInfo {
	nodeVersion: string;
	platform: string;
	arch: string;
	memory: {
		total: number;
		used: number;
		free: number;
	};
	uptime: number;
	cwd: string;
	packageInfo?: {
		name: string;
		version: string;
		dependencies: Record<string, string>;
	};
}

export interface HealthCheck {
	status: "healthy" | "warning" | "error";
	score: number;
	summary: string;
	checks: Array<{
		name: string;
		status: "pass" | "warn" | "fail";
		message: string;
		details?: any;
	}>;
	recommendations: string[];
	criticalIssues: string[];
}

export class DiagnosticCommand {
	private analyzer: TypeScriptAnalyzer;

	constructor() {
		this.analyzer = new TypeScriptAnalyzer({
			enableCache: false,
			logLevel: LogLevel.INFO,
			defaultTimeout: 10000,
		});
	}

	/**
	 * Run comprehensive system diagnostics
	 */
	async runDiagnostics(options: DiagnosticOptions): Promise<{
		systemInfo: SystemInfo;
		healthCheck: HealthCheck;
		benchmark?: any;
	}> {
		try {
			const systemInfo = await this.getSystemInfo();
			const healthCheck = await this.runHealthCheck();

			let benchmark;
			if (options.includeBenchmark) {
				benchmark = await this.runBenchmark();
			}

			const result = {
				systemInfo,
				healthCheck,
				...(benchmark && { benchmark }),
			};

			// Save to file if requested
			if (options.outputFile) {
				await this.saveReport(result, options);
			}

			return result;
		} catch (error) {
			throw new Error(
				`Diagnostics failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Get system information
	 */
	private async getSystemInfo(): Promise<SystemInfo> {
		const memUsage = process.memoryUsage();

		let packageInfo;
		try {
			const packagePath = path.join(process.cwd(), "package.json");
			if (fs.existsSync(packagePath)) {
				const packageContent = await fs.promises.readFile(packagePath, "utf8");
				const packageJson = JSON.parse(packageContent);
				packageInfo = {
					name: packageJson.name,
					version: packageJson.version,
					dependencies: packageJson.dependencies || {},
				};
			}
		} catch (error) {
			// Ignore package.json errors
		}

		return {
			nodeVersion: process.version,
			platform: process.platform,
			arch: process.arch,
			memory: {
				total: Math.round(memUsage.heapTotal / 1024 / 1024),
				used: Math.round(memUsage.heapUsed / 1024 / 1024),
				free: Math.round(
					(memUsage.heapTotal - memUsage.heapUsed) / 1024 / 1024,
				),
			},
			uptime: Math.round(process.uptime()),
			cwd: process.cwd(),
			packageInfo,
		};
	}

	/**
	 * Run health check
	 */
	private async runHealthCheck(): Promise<HealthCheck> {
		const checks: HealthCheck["checks"] = [];
		let score = 100;
		const recommendations: string[] = [];
		const criticalIssues: string[] = [];

		// Check Node.js version
		const nodeVersion = process.version;
		const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);
		if (majorVersion < 18) {
			checks.push({
				name: "Node.js Version",
				status: "fail",
				message: `Node.js ${majorVersion} is not supported. Requires Node.js 18+.`,
				details: { current: nodeVersion, required: "18+" },
			});
			score -= 30;
			criticalIssues.push("Unsupported Node.js version");
		} else if (majorVersion === 18) {
			checks.push({
				name: "Node.js Version",
				status: "warn",
				message: `Node.js ${majorVersion} is minimum supported. Consider upgrading.`,
				details: { current: nodeVersion, recommended: "20+" },
			});
			score -= 5;
			recommendations.push("Upgrade to Node.js 20+ for better performance");
		} else {
			checks.push({
				name: "Node.js Version",
				status: "pass",
				message: `Node.js ${majorVersion} is supported.`,
				details: { current: nodeVersion },
			});
		}

		// Check memory usage
		const memUsage = process.memoryUsage();
		const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
		if (memUsedMB > 512) {
			checks.push({
				name: "Memory Usage",
				status: "warn",
				message: `High memory usage: ${memUsedMB}MB`,
				details: { used: memUsedMB, threshold: 512 },
			});
			score -= 10;
			recommendations.push("Monitor memory usage during batch operations");
		} else {
			checks.push({
				name: "Memory Usage",
				status: "pass",
				message: `Memory usage normal: ${memUsedMB}MB`,
				details: { used: memUsedMB },
			});
		}

		// Check tree-sitter dependencies
		try {
			const Parser = require("tree-sitter");
			const TypeScript = require("tree-sitter-typescript");

			checks.push({
				name: "Tree-sitter Dependencies",
				status: "pass",
				message: "Tree-sitter dependencies are available",
				details: { parser: "available", typescript: "available" },
			});

			// Test parser creation
			try {
				const parser = new Parser();
				parser.setLanguage(TypeScript.typescript);
				checks.push({
					name: "Parser Initialization",
					status: "pass",
					message: "Parser can be initialized successfully",
				});
			} catch (error) {
				checks.push({
					name: "Parser Initialization",
					status: "fail",
					message: `Parser initialization failed: ${error}`,
				});
				score -= 25;
				criticalIssues.push("Cannot initialize tree-sitter parser");
			}
		} catch (error) {
			checks.push({
				name: "Tree-sitter Dependencies",
				status: "fail",
				message: `Tree-sitter dependencies missing: ${error}`,
			});
			score -= 40;
			criticalIssues.push("Missing tree-sitter dependencies");
		}

		// Check file system permissions
		try {
			const tempPath = path.join(process.cwd(), ".tsdl_test");
			await fs.promises.writeFile(tempPath, "test", "utf8");
			await fs.promises.unlink(tempPath);
			checks.push({
				name: "File System Access",
				status: "pass",
				message: "File system is writable",
			});
		} catch (error) {
			checks.push({
				name: "File System Access",
				status: "fail",
				message: `Cannot write to current directory: ${error}`,
			});
			score -= 15;
			recommendations.push("Ensure write permissions in working directory");
		}

		// Check analyzer functionality
		try {
			const health = await this.analyzer.getSystemHealth();
			if (health.status === "healthy") {
				checks.push({
					name: "Analyzer Health",
					status: "pass",
					message: "TypeScript analyzer is healthy",
					details: health,
				});
			} else {
				checks.push({
					name: "Analyzer Health",
					status: "warn",
					message: `Analyzer status: ${health.status}`,
					details: health,
				});
				score -= 10;
				recommendations.push("Review analyzer configuration");
			}
		} catch (error) {
			checks.push({
				name: "Analyzer Health",
				status: "fail",
				message: `Analyzer health check failed: ${error}`,
			});
			score -= 20;
			criticalIssues.push("Analyzer is not functioning");
		}

		// Determine overall status
		let status: HealthCheck["status"];
		if (score >= 90) {
			status = "healthy";
		} else if (score >= 70) {
			status = "warning";
		} else {
			status = "error";
		}

		const summary = `System is ${status}. Score: ${score}/100. ${criticalIssues.length} critical issues, ${recommendations.length} recommendations.`;

		return {
			status,
			score,
			summary,
			checks,
			recommendations,
			criticalIssues,
		};
	}

	/**
	 * Run performance benchmark
	 */
	private async runBenchmark(): Promise<any> {
		try {
			return await this.analyzer.benchmarkPerformance({
				iterations: 3,
				fileTypes: ["small", "medium"],
				includeMemoryProfile: true,
			});
		} catch (error) {
			return {
				error: `Benchmark failed: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * Diagnose specific file
	 */
	async diagnoseFile(
		filePath: string,
		options: DiagnosticOptions,
	): Promise<any> {
		try {
			const result = await this.analyzer.diagnoseFileAnalysis(filePath);

			if (options.outputFile) {
				await this.saveReport(result, options);
			}

			return result;
		} catch (error) {
			throw new Error(
				`File diagnosis failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Save diagnostic report to file
	 */
	private async saveReport(
		data: any,
		options: DiagnosticOptions,
	): Promise<void> {
		try {
			const outputPath = path.resolve(options.outputFile!);
			const outputDir = path.dirname(outputPath);

			// Ensure output directory exists
			if (!fs.existsSync(outputDir)) {
				fs.mkdirSync(outputDir, { recursive: true });
			}

			let content: string;
			const ext = path.extname(outputPath).toLowerCase();

			switch (ext) {
				case ".json":
					content = JSON.stringify(data, null, 2);
					break;
				case ".md":
					content = this.formatAsMarkdown(data);
					break;
				default:
					content = JSON.stringify(data, null, 2);
					break;
			}

			await fs.promises.writeFile(outputPath, content, "utf8");
			console.log(`Diagnostic report saved to: ${outputPath}`);
		} catch (error) {
			console.error(
				`Failed to save report: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Format diagnostic data as Markdown
	 */
	private formatAsMarkdown(data: any): string {
		let content = `# Diagnostic Report\n\n`;
		content += `Generated: ${new Date().toISOString()}\n\n`;

		if (data.systemInfo) {
			const sys = data.systemInfo;
			content += `## System Information\n\n`;
			content += `- **Node.js Version**: ${sys.nodeVersion}\n`;
			content += `- **Platform**: ${sys.platform} (${sys.arch})\n`;
			content += `- **Memory**: ${sys.memory.used}MB used / ${sys.memory.total}MB total\n`;
			content += `- **Uptime**: ${sys.uptime}s\n`;
			content += `- **Working Directory**: ${sys.cwd}\n`;

			if (sys.packageInfo) {
				content += `- **Package**: ${sys.packageInfo.name} v${sys.packageInfo.version}\n`;
			}
			content += `\n`;
		}

		if (data.healthCheck) {
			const health = data.healthCheck;
			content += `## Health Check\n\n`;
			content += `- **Status**: ${health.status.toUpperCase()}\n`;
			content += `- **Score**: ${health.score}/100\n`;
			content += `- **Summary**: ${health.summary}\n\n`;

			if (health.checks.length > 0) {
				content += `### Checks\n\n`;
				health.checks.forEach((check: any) => {
					const icon =
						check.status === "pass"
							? "✅"
							: check.status === "warn"
								? "⚠️"
								: "❌";
					content += `${icon} **${check.name}**: ${check.message}\n`;
				});
				content += `\n`;
			}

			if (health.criticalIssues.length > 0) {
				content += `### Critical Issues\n\n`;
				health.criticalIssues.forEach((issue: any, index: number) => {
					content += `${index + 1}. ${issue}\n`;
				});
				content += `\n`;
			}

			if (health.recommendations.length > 0) {
				content += `### Recommendations\n\n`;
				health.recommendations.forEach((rec: any, index: number) => {
					content += `${index + 1}. ${rec}\n`;
				});
				content += `\n`;
			}
		}

		if (data.benchmark) {
			content += `## Benchmark Results\n\n`;
			if (data.benchmark.error) {
				content += `❌ ${data.benchmark.error}\n`;
			} else {
				data.benchmark.forEach((test: any) => {
					content += `### ${test.testName}\n\n`;
					content += `- **Iterations**: ${test.iterations}\n`;
					content += `- **Average Time**: ${test.results.averageTime.toFixed(2)}ms\n`;
					content += `- **Success Rate**: ${test.results.successRate.toFixed(1)}%\n`;
					if (test.results.memoryUsage > 0) {
						content += `- **Memory Usage**: ${Math.round(test.results.memoryUsage / 1024)}KB\n`;
					}
					content += `\n`;
				});
			}
		}

		return content;
	}

	/**
	 * Format diagnostic results for console output
	 */
	formatResult(result: any, format: string): string {
		switch (format.toLowerCase()) {
			case "json":
				return JSON.stringify(result, null, 2);
			case "compact":
				return JSON.stringify(result);
			case "summary":
				return this.formatSummary(result);
			case "text":
			default:
				return this.formatAsText(result);
		}
	}

	/**
	 * Format as summary
	 */
	private formatSummary(result: any): string {
		if (result.healthCheck) {
			const health = result.healthCheck;
			return (
				`${health.status.toUpperCase()}: Score ${health.score}/100, ` +
				`${health.criticalIssues.length} critical issues, ` +
				`${health.recommendations.length} recommendations`
			);
		}
		return "Diagnostic completed";
	}

	/**
	 * Format as detailed text
	 */
	private formatAsText(result: any): string {
		let output = `Diagnostic Report\n`;
		output += `================\n\n`;

		if (result.systemInfo) {
			const sys = result.systemInfo;
			output += `System Information:\n`;
			output += `  Node.js: ${sys.nodeVersion}\n`;
			output += `  Platform: ${sys.platform} (${sys.arch})\n`;
			output += `  Memory: ${sys.memory.used}MB used / ${sys.memory.total}MB total\n`;
			output += `  Uptime: ${sys.uptime}s\n`;
			output += `  Working Directory: ${sys.cwd}\n`;
			if (sys.packageInfo) {
				output += `  Package: ${sys.packageInfo.name} v${sys.packageInfo.version}\n`;
			}
			output += `\n`;
		}

		if (result.healthCheck) {
			const health = result.healthCheck;
			output += `Health Check:\n`;
			output += `  Status: ${health.status.toUpperCase()}\n`;
			output += `  Score: ${health.score}/100\n`;
			output += `  Summary: ${health.summary}\n\n`;

			if (health.checks.length > 0) {
				output += `  Checks:\n`;
				health.checks.forEach((check: any) => {
					const status =
						check.status === "pass"
							? "PASS"
							: check.status === "warn"
								? "WARN"
								: "FAIL";
					output += `    [${status}] ${check.name}: ${check.message}\n`;
				});
				output += `\n`;
			}

			if (health.criticalIssues.length > 0) {
				output += `  Critical Issues:\n`;
				health.criticalIssues.forEach((issue: any, index: number) => {
					output += `    ${index + 1}. ${issue}\n`;
				});
				output += `\n`;
			}

			if (health.recommendations.length > 0) {
				output += `  Recommendations:\n`;
				health.recommendations.forEach((rec: any, index: number) => {
					output += `    ${index + 1}. ${rec}\n`;
				});
				output += `\n`;
			}
		}

		if (result.benchmark && !result.benchmark.error) {
			output += `Benchmark Results:\n`;
			result.benchmark.forEach((test: any) => {
				output += `  ${test.testName}:\n`;
				output += `    Iterations: ${test.iterations}\n`;
				output += `    Average Time: ${test.results.averageTime.toFixed(2)}ms\n`;
				output += `    Success Rate: ${test.results.successRate.toFixed(1)}%\n`;
				if (test.results.memoryUsage > 0) {
					output += `    Memory Usage: ${Math.round(test.results.memoryUsage / 1024)}KB\n`;
				}
				output += `\n`;
			});
		}

		return output;
	}

	/**
	 * Clean up resources
	 */
	dispose(): void {
		this.analyzer.clearCache();
	}
}
