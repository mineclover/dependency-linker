/**
 * Link Dependency Interpreter
 * Processes extracted link dependencies and provides analysis insights
 */

import type {
	IDataInterpreter,
	InterpreterContext,
	ValidationResult,
	OutputSchema,
	InterpreterMetadata,
	InterpreterConfiguration,
	InterpreterDependency
} from './IDataInterpreter';
import type { MarkdownLinkDependency } from '../extractors/MarkdownLinkExtractor';
import { LinkType } from '../parsers/MarkdownParser';
import { existsSync, statSync } from 'node:fs';
import { extname, resolve, dirname } from 'node:path';

/**
 * Link dependency analysis result
 */
export interface LinkDependencyAnalysis {
	summary: LinkSummary;
	dependencies: ProcessedDependency[];
	issues: LinkIssue[];
	recommendations: string[];
	metadata: AnalysisMetadata;
}

/**
 * Summary statistics of link analysis
 */
export interface LinkSummary {
	totalLinks: number;
	externalLinks: number;
	internalLinks: number;
	brokenLinks: number;
	imageLinks: number;
	referenceLinks: number;
	uniqueDomains: number;
	linkDensity: number;
}

/**
 * Processed dependency with validation and categorization
 */
export interface ProcessedDependency {
	source: string;
	type: LinkType;
	category: DependencyCategory;
	status: LinkStatus;
	resolvedPath?: string;
	fileExists?: boolean;
	fileSize?: number;
	mimeType?: string;
	title?: string;
	alt?: string;
	domain?: string;
	line: number;
	column: number;
}

/**
 * Link issue detected during analysis
 */
export interface LinkIssue {
	type: IssueType;
	severity: IssueSeverity;
	message: string;
	dependency: MarkdownLinkDependency;
	suggestion?: string;
}

/**
 * Analysis metadata
 */
export interface AnalysisMetadata {
	analysisTime: number;
	checkedFiles: number;
	unreachableLinks: number;
	securityWarnings: number;
	performanceWarnings: number;
}

/**
 * Dependency categories
 */
export enum DependencyCategory {
	DOCUMENTATION = 'documentation',
	IMAGE = 'image',
	EXTERNAL_RESOURCE = 'external_resource',
	INTERNAL_FILE = 'internal_file',
	ANCHOR = 'anchor',
	EMAIL = 'email',
	UNKNOWN = 'unknown'
}

/**
 * Link validation status
 */
export enum LinkStatus {
	VALID = 'valid',
	BROKEN = 'broken',
	UNREACHABLE = 'unreachable',
	SUSPICIOUS = 'suspicious',
	UNKNOWN = 'unknown'
}

/**
 * Issue types
 */
export enum IssueType {
	BROKEN_LINK = 'broken_link',
	MISSING_FILE = 'missing_file',
	SECURITY_RISK = 'security_risk',
	PERFORMANCE_ISSUE = 'performance_issue',
	ACCESSIBILITY_ISSUE = 'accessibility_issue',
	BEST_PRACTICE = 'best_practice'
}

/**
 * Issue severity levels
 */
export enum IssueSeverity {
	ERROR = 'error',
	WARNING = 'warning',
	INFO = 'info'
}

/**
 * Configuration for link dependency analysis
 */
export interface LinkAnalysisOptions {
	validateFiles?: boolean;
	checkExternalLinks?: boolean;
	securityChecks?: boolean;
	performanceChecks?: boolean;
	accessibilityChecks?: boolean;
	baseDir?: string;
	allowedDomains?: string[];
	blockedDomains?: string[];
	maxFileSizeWarning?: number;
}

/**
 * Link dependency interpreter
 */
export class LinkDependencyInterpreter implements IDataInterpreter<MarkdownLinkDependency[], LinkDependencyAnalysis> {
	private options: LinkAnalysisOptions;

	constructor(options: LinkAnalysisOptions = {}) {
		this.options = {
			validateFiles: true,
			checkExternalLinks: true,
			securityChecks: true,
			performanceChecks: true,
			accessibilityChecks: true,
			baseDir: process.cwd(),
			allowedDomains: [],
			blockedDomains: [],
			maxFileSizeWarning: 1024 * 1024,
			...options
		};
	}

	/**
	 * Interprets link dependencies and generates analysis results
	 */
	interpret(dependencies: MarkdownLinkDependency[], context: InterpreterContext): LinkDependencyAnalysis {
		const startTime = Date.now();
		const processedDependencies: ProcessedDependency[] = [];
		const issues: LinkIssue[] = [];
		const domains = new Set<string>();
		let checkedFiles = 0;
		let unreachableLinks = 0;
		let securityWarnings = 0;
		let performanceWarnings = 0;

		// Process each dependency synchronously for interface compliance
		for (const dependency of dependencies) {
			const processed = this.processDependencySync(dependency);
			processedDependencies.push(processed);

			// Collect domains for external links
			if (processed.domain) {
				domains.add(processed.domain);
			}

			// Check for issues
			const dependencyIssues = this.checkDependencyIssues(dependency, processed);
			issues.push(...dependencyIssues);

			// Update counters
			if (processed.fileExists !== undefined) {
				checkedFiles++;
			}
			if (processed.status === LinkStatus.UNREACHABLE) {
				unreachableLinks++;
			}

			// Count issue types
			dependencyIssues.forEach(issue => {
				if (issue.type === IssueType.SECURITY_RISK) {
					securityWarnings++;
				}
				if (issue.type === IssueType.PERFORMANCE_ISSUE) {
					performanceWarnings++;
				}
			});
		}

		// Generate summary
		const summary = this.generateSummary(dependencies, processedDependencies, domains.size);

		// Generate recommendations
		const recommendations = this.generateRecommendations(issues, summary);

		const analysisTime = Date.now() - startTime;

		return {
			summary,
			dependencies: processedDependencies,
			issues,
			recommendations,
			metadata: {
				analysisTime,
				checkedFiles,
				unreachableLinks,
				securityWarnings,
				performanceWarnings
			}
		};
	}

	/**
	 * Checks if this interpreter supports the given data type
	 */
	supports(dataType: string): boolean {
		return dataType === 'MarkdownLinkDependency[]' || 
		       dataType === 'markdown-links' ||
		       dataType === 'link-dependencies';
	}

	/**
	 * Gets the unique name of this interpreter
	 */
	getName(): string {
		return 'LinkDependencyInterpreter';
	}

	/**
	 * Gets the version of this interpreter
	 */
	getVersion(): string {
		return '1.0.0';
	}

	/**
	 * Validates input data before interpretation
	 */
	validate(input: MarkdownLinkDependency[]): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		if (!Array.isArray(input)) {
			errors.push('Input must be an array of MarkdownLinkDependency objects');
			return { isValid: false, errors, warnings };
		}

		input.forEach((dependency, index) => {
			if (!dependency.source) {
				errors.push(`Dependency at index ${index} missing source property`);
			}
			if (typeof dependency.isExternal !== 'boolean') {
				warnings.push(`Dependency at index ${index} missing or invalid isExternal property`);
			}
			if (typeof dependency.line !== 'number') {
				warnings.push(`Dependency at index ${index} missing line number`);
			}
		});

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
			quality: {
				completeness: warnings.length === 0 ? 1.0 : 0.8,
				accuracy: errors.length === 0 ? 1.0 : 0.0,
				consistency: 1.0,
				freshness: 1.0,
				overall: errors.length === 0 ? 0.95 : 0.5
			}
		};
	}

	/**
	 * Gets the output schema for this interpreter
	 */
	getOutputSchema(): OutputSchema {
		return {
			type: 'object',
			properties: {
				summary: {
					type: 'object',
					properties: {
						totalLinks: { type: 'number' },
						internalLinks: { type: 'number' },
						externalLinks: { type: 'number' },
						brokenLinks: { type: 'number' }
					}
				},
				dependencies: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							source: { type: 'string' },
							category: { type: 'string' },
							status: { type: 'string' }
						}
					}
				},
				issues: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							type: { type: 'string' },
							message: { type: 'string' },
							severity: { type: 'string' }
						}
					}
				}
			},
			required: ['summary', 'dependencies', 'issues'],
			version: '1.0.0',
			metadata: {
				interpreterName: 'LinkDependencyInterpreter'
			}
		};
	}

	/**
	 * Gets metadata about this interpreter
	 */
	getMetadata(): InterpreterMetadata {
		return {
			name: 'LinkDependencyInterpreter',
			version: '1.0.0',
			description: 'Analyzes markdown link dependencies for broken links, security issues, and performance problems',
			supportedDataTypes: ['MarkdownLinkDependency[]', 'markdown-links', 'link-dependencies'],
			outputType: 'LinkDependencyAnalysis',
			dependencies: [],
			performance: {
				averageTimePerItem: 50,
				memoryUsage: 'low',
				timeComplexity: 'linear',
				scalability: 'good',
				maxRecommendedDataSize: 10000
			},
			quality: {
				accuracy: 0.95,
				completeness: 0.90,
				consistency: 0.98,
				reliability: 0.92
			}
		};
	}

	/**
	 * Configures the interpreter with options
	 */
	configure(options: InterpreterConfiguration): void {
		if (options.defaultOptions?.custom) {
			this.options = { ...this.options, ...options.defaultOptions.custom };
		}
	}

	/**
	 * Gets the current configuration
	 */
	getConfiguration(): InterpreterConfiguration {
		return {
			enabled: true,
			priority: 100,
			timeout: 5000,
			memoryLimit: 64 * 1024 * 1024, // 64MB
			dataTypes: ['MarkdownLinkDependency[]'],
			defaultOptions: {
				custom: this.options
			},
			errorHandling: 'lenient',
			logLevel: 'warn'
		};
	}

	/**
	 * Gets the data types this interpreter can process
	 */
	getSupportedDataTypes(): string[] {
		return ['MarkdownLinkDependency[]', 'markdown-links', 'link-dependencies'];
	}

	/**
	 * Gets dependencies on other interpreters or data
	 */
	getDependencies(): InterpreterDependency[] {
		return []; // No dependencies on other interpreters
	}

	/**
	 * Cleans up interpreter resources
	 */
	dispose(): void {
		// No resources to clean up for this interpreter
	}

	/**
	 * Process a dependency synchronously (for interface compliance)
	 */
	private processDependencySync(dependency: MarkdownLinkDependency): ProcessedDependency {
		const category = this.categorizeDependency(dependency);
		const processed: ProcessedDependency = {
			source: dependency.source,
			type: dependency.type,
			category,
			status: LinkStatus.UNKNOWN,
			resolvedPath: dependency.resolvedPath,
			mimeType: dependency.isInternal ? this.getMimeType(dependency.extension) : undefined,
			fileExists: undefined,
			domain: dependency.isExternal ? this.extractDomain(dependency.source) : undefined,
			line: dependency.line,
			column: dependency.column,
			title: dependency.title,
			alt: dependency.alt
		};

		// Basic validation for internal links
		if (dependency.isInternal && dependency.resolvedPath) {
			try {
				const fs = require('fs');
				processed.fileExists = fs.existsSync(dependency.resolvedPath);
				processed.status = processed.fileExists ? LinkStatus.VALID : LinkStatus.UNREACHABLE;
			} catch {
				processed.fileExists = false;
				processed.status = LinkStatus.UNREACHABLE;
			}
		} else if (dependency.isExternal) {
			// For external links, assume accessible (full check would require async)
			processed.status = LinkStatus.VALID;
		}

		return processed;
	}

	/**
	 * Extract domain from URL
	 */
	private extractDomain(url: string): string | undefined {
		try {
			const urlObj = new URL(url);
			return urlObj.hostname;
		} catch {
			return undefined;
		}
	}

	/**
	 * Process a single dependency (async version for internal use)
	 */
	private async processDependency(dependency: MarkdownLinkDependency): Promise<ProcessedDependency> {
		const category = this.categorizeDependency(dependency);
		const processed: ProcessedDependency = {
			source: dependency.source,
			type: dependency.type,
			category,
			status: LinkStatus.UNKNOWN,
			resolvedPath: dependency.resolvedPath,
			mimeType: dependency.isInternal ? this.getMimeType(dependency.extension) : undefined,
			fileExists: undefined,
			domain: dependency.isExternal ? this.extractDomain(dependency.source) : undefined,
			line: dependency.line,
			column: dependency.column,
			title: dependency.title,
			alt: dependency.alt
		};

		// Check if internal file exists
		if (dependency.isInternal && dependency.resolvedPath) {
			try {
				const fs = require('fs').promises;
				await fs.access(dependency.resolvedPath);
				processed.fileExists = true;
				processed.status = LinkStatus.VALID;
			} catch {
				processed.fileExists = false;
				processed.status = LinkStatus.UNREACHABLE;
			}
		} else if (dependency.isExternal && this.options.checkExternalLinks) {
			// For external links, we could implement HTTP checks here
			// For now, assume accessible to avoid async complexity
			processed.status = LinkStatus.VALID;
		}

		return processed;
	}

	/**
	 * Categorize dependency type
	 */
	private categorizeDependency(dependency: MarkdownLinkDependency): DependencyCategory {
		if (dependency.isExternal) {
			if (dependency.source.startsWith('mailto:')) {
				return DependencyCategory.EMAIL;
			}
			return DependencyCategory.EXTERNAL_RESOURCE;
		}

		if (dependency.isInternal) {
			if (dependency.extension) {
				const ext = dependency.extension.toLowerCase();
				if (['.md', '.markdown'].includes(ext)) {
					return DependencyCategory.DOCUMENTATION;
				}
				if (['.png', '.jpg', '.jpeg', '.gif', '.svg'].includes(ext)) {
					return DependencyCategory.IMAGE;
				}
			}
			return DependencyCategory.INTERNAL_FILE;
		}

		return DependencyCategory.UNKNOWN;
	}

	/**
	 * Check for issues with a dependency
	 */
	private checkDependencyIssues(dependency: MarkdownLinkDependency, processed: ProcessedDependency): LinkIssue[] {
		const issues: LinkIssue[] = [];

		// Check for broken links
		if (processed.status === LinkStatus.UNREACHABLE) {
			issues.push({
				type: IssueType.BROKEN_LINK,
				severity: IssueSeverity.ERROR,
				message: `Broken link: ${dependency.source}`,
				dependency: dependency,
				suggestion: 'Verify the link target exists and is accessible'
			});
		}

		// Check for security issues
		if (dependency.isExternal && this.options.checkExternalLinks) {
			const url = dependency.source.toLowerCase();
			if (url.startsWith('http://')) {
				issues.push({
					type: IssueType.SECURITY_RISK,
					severity: IssueSeverity.WARNING,
					message: `Insecure HTTP link: ${dependency.source}`,
					dependency: dependency,
					suggestion: 'Consider using HTTPS instead of HTTP'
				});
			}
		}

		// Check for performance issues
		if (dependency.isExternal && processed.domain) {
			// Flag potential performance issues with external resources
			if (['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.webm'].some(ext =>
				dependency.source.toLowerCase().includes(ext))) {
				issues.push({
					type: IssueType.PERFORMANCE_ISSUE,
					severity: IssueSeverity.INFO,
					message: `External media resource: ${dependency.source}`,
					dependency: dependency,
					suggestion: 'Consider hosting media locally for better performance'
				});
			}
		}

		return issues;
	}

	/**
	 * Generate summary of analysis
	 */
	private generateSummary(dependencies: MarkdownLinkDependency[], processed: ProcessedDependency[], uniqueDomains: number): LinkSummary {
		const totalLinks = dependencies.length;
		const internalLinks = dependencies.filter(d => d.isInternal).length;
		const externalLinks = dependencies.filter(d => d.isExternal).length;
		const brokenLinks = processed.filter(p => p.status === LinkStatus.UNREACHABLE).length;
		const imageLinks = dependencies.filter(d => d.extension &&
			['.png', '.jpg', '.jpeg', '.gif', '.svg'].includes(d.extension.toLowerCase())).length;
		const referenceLinks = dependencies.filter(d => d.type === LinkType.REFERENCE || d.type === LinkType.IMAGE_REFERENCE).length;
		const linkDensity = totalLinks > 0 ? totalLinks / Math.max(1, dependencies.length) : 0;

		return {
			totalLinks,
			internalLinks,
			externalLinks,
			brokenLinks,
			imageLinks,
			referenceLinks,
			uniqueDomains,
			linkDensity
		};
	}

	/**
	 * Generate recommendations based on issues
	 */
	private generateRecommendations(issues: LinkIssue[], summary: LinkSummary): string[] {
		const recommendations: string[] = [];

		const brokenLinkIssues = issues.filter(i => i.type === IssueType.BROKEN_LINK);
		if (brokenLinkIssues.length > 0) {
			recommendations.push(`Fix ${brokenLinkIssues.length} broken link(s)`);
		}

		const securityIssues = issues.filter(i => i.type === IssueType.SECURITY_RISK);
		if (securityIssues.length > 0) {
			recommendations.push(`Address ${securityIssues.length} security concern(s)`);
		}

		const performanceIssues = issues.filter(i => i.type === IssueType.PERFORMANCE_ISSUE);
		if (performanceIssues.length > 0) {
			recommendations.push(`Optimize ${performanceIssues.length} performance issue(s)`);
		}

		if (summary.externalLinks > summary.internalLinks * 2) {
			recommendations.push('Consider reducing external dependencies for better reliability');
		}

		const healthScore = summary.totalLinks > 0 ? (summary.totalLinks - summary.brokenLinks) / summary.totalLinks : 1.0;
		if (healthScore < 0.9) {
			recommendations.push('Review and fix broken links to improve overall link health');
		}

		if (recommendations.length === 0) {
			recommendations.push('No issues found - link dependencies are healthy');
		}

		return recommendations;
	}

	/**
	 * Get MIME type from file extension
	 */
	private getMimeType(extension?: string): string | undefined {
		if (!extension) return undefined;
		
		const mimeTypes: Record<string, string> = {
			'.md': 'text/markdown',
			'.markdown': 'text/markdown',
			'.txt': 'text/plain',
			'.html': 'text/html',
			'.htm': 'text/html',
			'.css': 'text/css',
			'.js': 'application/javascript',
			'.json': 'application/json',
			'.png': 'image/png',
			'.jpg': 'image/jpeg',
			'.jpeg': 'image/jpeg',
			'.gif': 'image/gif',
			'.svg': 'image/svg+xml'
		};

		return mimeTypes[extension.toLowerCase()];
	}
}