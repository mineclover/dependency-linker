/**
 * Enhanced Error Reporting and Debugging System
 * Comprehensive error reporting with diagnostic capabilities
 */

import { logger } from "../../utils/logger";
import { LogLevel } from "../types";

export interface ErrorContext {
	filePath?: string;
	operation?: string;
	timestamp: number;
	environment: {
		nodeVersion: string;
		platform: string;
		memory: NodeJS.MemoryUsage;
		cwd: string;
	};
	stackTrace?: string | undefined;
	additionalData?: Record<string, any>;
}

export interface DiagnosticInfo {
	id: string;
	severity: "low" | "medium" | "high" | "critical";
	category:
		| "parsing"
		| "analysis"
		| "io"
		| "resource"
		| "validation"
		| "system";
	message: string;
	context: ErrorContext;
	suggestions: string[];
	relatedErrors: string[];
	recoverySteps: string[];
}

export interface ErrorReport {
	id: string;
	timestamp: number;
	errors: DiagnosticInfo[];
	summary: {
		totalErrors: number;
		errorsByCategory: Record<string, number>;
		errorsBySeverity: Record<string, number>;
		mostCommonErrors: Array<{ message: string; count: number }>;
	};
	systemInfo: {
		nodeVersion: string;
		platform: string;
		memoryUsage: NodeJS.MemoryUsage;
		uptime: number;
		environment: string;
	};
}

export class ErrorReporter {
	private static instance: ErrorReporter;
	private diagnostics: Map<string, DiagnosticInfo> = new Map();
	private errorHistory: DiagnosticInfo[] = [];
	private enabled: boolean = true;
	private maxHistorySize: number = 1000;

	private constructor() {}

	public static getInstance(): ErrorReporter {
		if (!ErrorReporter.instance) {
			ErrorReporter.instance = new ErrorReporter();
		}
		return ErrorReporter.instance;
	}

	/**
	 * Enable or disable error reporting
	 */
	public setEnabled(enabled: boolean): void {
		this.enabled = enabled;
	}

	/**
	 * Report an error with comprehensive context
	 */
	public reportError(
		error: Error,
		context: Partial<ErrorContext> = {},
	): string {
		if (!this.enabled) return "";

		const errorId = this.generateErrorId();
		const fullContext = this.buildErrorContext(error, context);
		const diagnostic = this.createDiagnostic(errorId, error, fullContext);

		this.diagnostics.set(errorId, diagnostic);
		this.addToHistory(diagnostic);

		if (diagnostic.severity === "critical" || diagnostic.severity === "high") {
			logger.error(
				`[${diagnostic.category.toUpperCase()}] ${diagnostic.message}`,
				{
					id: errorId,
					suggestions: diagnostic.suggestions,
					recoverySteps: diagnostic.recoverySteps,
				},
			);
		} else {
			logger.warn(
				`[${diagnostic.category.toUpperCase()}] ${diagnostic.message}`,
				{
					id: errorId,
				},
			);
		}

		return errorId;
	}

	/**
	 * Report a custom diagnostic issue
	 */
	public reportDiagnostic(
		category: DiagnosticInfo["category"],
		severity: DiagnosticInfo["severity"],
		message: string,
		context: Partial<ErrorContext> = {},
		suggestions: string[] = [],
	): string {
		if (!this.enabled) return "";

		const errorId = this.generateErrorId();
		const fullContext = this.buildErrorContext(new Error(message), context);

		const diagnostic: DiagnosticInfo = {
			id: errorId,
			category,
			severity,
			message,
			context: fullContext,
			suggestions,
			relatedErrors: [],
			recoverySteps: this.generateRecoverySteps(category, message),
		};

		this.diagnostics.set(errorId, diagnostic);
		this.addToHistory(diagnostic);

		const logLevel = this.severityToLogLevel(severity);
		if (logLevel === LogLevel.ERROR) {
			logger.error(`[${category.toUpperCase()}] ${message}`, {
				id: errorId,
				suggestions: diagnostic.suggestions,
			});
		} else if (logLevel === LogLevel.WARN) {
			logger.warn(`[${category.toUpperCase()}] ${message}`, {
				id: errorId,
				suggestions: diagnostic.suggestions,
			});
		} else {
			logger.info(`[${category.toUpperCase()}] ${message}`, {
				id: errorId,
				suggestions: diagnostic.suggestions,
			});
		}

		return errorId;
	}

	/**
	 * Get diagnostic information by ID
	 */
	public getDiagnostic(id: string): DiagnosticInfo | undefined {
		return this.diagnostics.get(id);
	}

	/**
	 * Get all diagnostics for a specific category
	 */
	public getDiagnosticsByCategory(
		category: DiagnosticInfo["category"],
	): DiagnosticInfo[] {
		return Array.from(this.diagnostics.values()).filter(
			(d) => d.category === category,
		);
	}

	/**
	 * Get diagnostics by severity
	 */
	public getDiagnosticsBySeverity(
		severity: DiagnosticInfo["severity"],
	): DiagnosticInfo[] {
		return Array.from(this.diagnostics.values()).filter(
			(d) => d.severity === severity,
		);
	}

	/**
	 * Generate comprehensive error report
	 */
	public generateErrorReport(): ErrorReport {
		const diagnostics = Array.from(this.diagnostics.values());
		const errorsByCategory: Record<string, number> = {};
		const errorsBySeverity: Record<string, number> = {};
		const messageCount: Map<string, number> = new Map();

		diagnostics.forEach((diagnostic) => {
			errorsByCategory[diagnostic.category] =
				(errorsByCategory[diagnostic.category] || 0) + 1;
			errorsBySeverity[diagnostic.severity] =
				(errorsBySeverity[diagnostic.severity] || 0) + 1;

			const count = messageCount.get(diagnostic.message) || 0;
			messageCount.set(diagnostic.message, count + 1);
		});

		const mostCommonErrors = Array.from(messageCount.entries())
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5)
			.map(([message, count]) => ({ message, count }));

		return {
			id: this.generateErrorId(),
			timestamp: Date.now(),
			errors: diagnostics,
			summary: {
				totalErrors: diagnostics.length,
				errorsByCategory,
				errorsBySeverity,
				mostCommonErrors,
			},
			systemInfo: {
				nodeVersion: process.version,
				platform: process.platform,
				memoryUsage: process.memoryUsage(),
				uptime: process.uptime(),
				environment: process.env.NODE_ENV || "development",
			},
		};
	}

	/**
	 * Export error report as JSON
	 */
	public exportErrorReport(format: "json" | "text" = "json"): string {
		const report = this.generateErrorReport();

		if (format === "text") {
			return this.formatTextReport(report);
		}

		return JSON.stringify(report, null, 2);
	}

	/**
	 * Clear all diagnostics
	 */
	public clear(): void {
		this.diagnostics.clear();
	}

	/**
	 * Clear diagnostics older than specified age (in milliseconds)
	 */
	public clearOldDiagnostics(maxAge: number): void {
		const cutoff = Date.now() - maxAge;
		const toRemove: string[] = [];

		this.diagnostics.forEach((diagnostic, id) => {
			if (diagnostic.context.timestamp < cutoff) {
				toRemove.push(id);
			}
		});

		toRemove.forEach((id) => this.diagnostics.delete(id));
	}

	/**
	 * Check if there are any critical errors
	 */
	public hasCriticalErrors(): boolean {
		return Array.from(this.diagnostics.values()).some(
			(d) => d.severity === "critical",
		);
	}

	/**
	 * Get error statistics
	 */
	public getStatistics(): {
		totalErrors: number;
		criticalErrors: number;
		recentErrors: number;
		topCategories: Array<{ category: string; count: number }>;
	} {
		const diagnostics = Array.from(this.diagnostics.values());
		const recentCutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours

		const categoryCount: Record<string, number> = {};
		diagnostics.forEach((d) => {
			categoryCount[d.category] = (categoryCount[d.category] || 0) + 1;
		});

		const topCategories = Object.entries(categoryCount)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 3)
			.map(([category, count]) => ({ category, count }));

		return {
			totalErrors: diagnostics.length,
			criticalErrors: diagnostics.filter((d) => d.severity === "critical")
				.length,
			recentErrors: diagnostics.filter(
				(d) => d.context.timestamp > recentCutoff,
			).length,
			topCategories,
		};
	}

	private generateErrorId(): string {
		return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private buildErrorContext(
		error: Error,
		context: Partial<ErrorContext>,
	): ErrorContext {
		return {
			timestamp: Date.now(),
			environment: {
				nodeVersion: process.version,
				platform: process.platform,
				memory: process.memoryUsage(),
				cwd: process.cwd(),
			},
			stackTrace: error.stack || undefined,
			...context,
		};
	}

	private createDiagnostic(
		id: string,
		error: Error,
		context: ErrorContext,
	): DiagnosticInfo {
		const category = this.categorizeError(error);
		const severity = this.assessSeverity(error, category);
		const suggestions = this.generateSuggestions(error, category);
		const recoverySteps = this.generateRecoverySteps(category, error.message);

		return {
			id,
			category,
			severity,
			message: error.message,
			context,
			suggestions,
			relatedErrors: [],
			recoverySteps,
		};
	}

	private categorizeError(error: Error): DiagnosticInfo["category"] {
		const message = error.message.toLowerCase();
		const name = error.name.toLowerCase();

		if (
			message.includes("parse") ||
			message.includes("syntax") ||
			name.includes("syntax")
		) {
			return "parsing";
		}
		if (
			message.includes("file") ||
			message.includes("directory") ||
			name.includes("enoent")
		) {
			return "io";
		}
		if (
			message.includes("memory") ||
			message.includes("timeout") ||
			name.includes("resource")
		) {
			return "resource";
		}
		if (message.includes("validation") || message.includes("invalid")) {
			return "validation";
		}
		if (name.includes("system") || message.includes("system")) {
			return "system";
		}

		return "analysis";
	}

	private assessSeverity(
		error: Error,
		category: DiagnosticInfo["category"],
	): DiagnosticInfo["severity"] {
		const message = error.message.toLowerCase();

		if (
			message.includes("critical") ||
			message.includes("fatal") ||
			category === "system"
		) {
			return "critical";
		}
		if (
			message.includes("error") ||
			category === "parsing" ||
			category === "resource"
		) {
			return "high";
		}
		if (message.includes("warn") || category === "validation") {
			return "medium";
		}

		return "low";
	}

	private generateSuggestions(
		error: Error,
		category: DiagnosticInfo["category"],
	): string[] {
		const suggestions: string[] = [];
		const message = error.message.toLowerCase();

		switch (category) {
			case "parsing":
				suggestions.push("Check TypeScript syntax and file encoding");
				suggestions.push("Verify file is not corrupted or truncated");
				suggestions.push(
					"Try with a simpler TypeScript file to isolate the issue",
				);
				break;

			case "io":
				suggestions.push("Verify file path exists and is accessible");
				suggestions.push("Check file permissions and ownership");
				suggestions.push("Ensure sufficient disk space");
				break;

			case "resource":
				suggestions.push("Reduce concurrency or batch size");
				suggestions.push("Increase memory limits or timeout values");
				suggestions.push("Monitor system resource usage");
				break;

			case "validation":
				suggestions.push("Check input parameters and types");
				suggestions.push("Verify configuration options are valid");
				suggestions.push("Review API documentation for correct usage");
				break;

			case "system":
				suggestions.push("Check system requirements and dependencies");
				suggestions.push("Verify Node.js version compatibility");
				suggestions.push("Review environment configuration");
				break;

			default:
				suggestions.push("Enable debug logging for more information");
				suggestions.push("Try with a minimal test case");
		}

		// Add specific suggestions based on error message
		if (message.includes("timeout")) {
			suggestions.push("Increase timeout values in configuration");
		}
		if (message.includes("memory")) {
			suggestions.push(
				"Reduce concurrent operations or enable garbage collection",
			);
		}
		if (message.includes("permission")) {
			suggestions.push(
				"Run with appropriate permissions or check file ownership",
			);
		}

		return suggestions;
	}

	private generateRecoverySteps(
		category: DiagnosticInfo["category"],
		_message: string,
	): string[] {
		const steps: string[] = [];

		switch (category) {
			case "parsing":
				steps.push("1. Validate TypeScript file syntax");
				steps.push("2. Check for encoding issues (ensure UTF-8)");
				steps.push("3. Try parsing with TypeScript compiler directly");
				steps.push("4. Report issue with file sample if problem persists");
				break;

			case "io":
				steps.push("1. Verify file/directory exists");
				steps.push("2. Check read permissions");
				steps.push("3. Ensure path is absolute or correctly relative");
				steps.push("4. Try with a different file to isolate issue");
				break;

			case "resource":
				steps.push("1. Monitor system resource usage");
				steps.push("2. Reduce concurrent operations");
				steps.push("3. Increase resource limits if possible");
				steps.push("4. Implement retry logic with backoff");
				break;

			default:
				steps.push("1. Enable detailed logging");
				steps.push("2. Create minimal reproduction case");
				steps.push("3. Check system requirements");
				steps.push("4. Contact support with error details");
		}

		return steps;
	}

	private addToHistory(diagnostic: DiagnosticInfo): void {
		this.errorHistory.push(diagnostic);

		// Maintain history size limit
		if (this.errorHistory.length > this.maxHistorySize) {
			this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
		}
	}

	private severityToLogLevel(severity: DiagnosticInfo["severity"]): LogLevel {
		switch (severity) {
			case "critical":
				return LogLevel.ERROR;
			case "high":
				return LogLevel.ERROR;
			case "medium":
				return LogLevel.WARN;
			case "low":
				return LogLevel.INFO;
			default:
				return LogLevel.INFO;
		}
	}

	private formatTextReport(report: ErrorReport): string {
		let text = `Error Report (${new Date(report.timestamp).toISOString()})\n`;
		text += `${"=".repeat(60)}\n\n`;

		text += `System Information:\n`;
		text += `  Node.js: ${report.systemInfo.nodeVersion}\n`;
		text += `  Platform: ${report.systemInfo.platform}\n`;
		text += `  Memory: ${Math.round(report.systemInfo.memoryUsage.heapUsed / 1024 / 1024)}MB used\n`;
		text += `  Uptime: ${Math.round(report.systemInfo.uptime)}s\n\n`;

		text += `Summary:\n`;
		text += `  Total Errors: ${report.summary.totalErrors}\n`;

		if (Object.keys(report.summary.errorsByCategory).length > 0) {
			text += `  By Category:\n`;
			Object.entries(report.summary.errorsByCategory).forEach(
				([category, count]) => {
					text += `    ${category}: ${count}\n`;
				},
			);
		}

		if (Object.keys(report.summary.errorsBySeverity).length > 0) {
			text += `  By Severity:\n`;
			Object.entries(report.summary.errorsBySeverity).forEach(
				([severity, count]) => {
					text += `    ${severity}: ${count}\n`;
				},
			);
		}

		if (report.summary.mostCommonErrors.length > 0) {
			text += `\nMost Common Errors:\n`;
			report.summary.mostCommonErrors.forEach((error, index) => {
				text += `  ${index + 1}. ${error.message} (${error.count}x)\n`;
			});
		}

		return text;
	}
}

// Export singleton instance
export const errorReporter = ErrorReporter.getInstance();
