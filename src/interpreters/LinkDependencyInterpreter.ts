/**
 * Link Dependency Interpreter
 * Processes extracted link dependencies and provides analysis insights
 */

import { existsSync, statSync } from "node:fs";
import type { MarkdownLinkDependency } from "../extractors/MarkdownLinkExtractor";
import { LinkType } from "../parsers/MarkdownParser";
import type {
	IDataInterpreter,
	InterpreterConfiguration,
	InterpreterContext,
	InterpreterDependency,
	InterpreterMetadata,
	OutputSchema,
	ValidationResult,
} from "./IDataInterpreter";

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
	DOCUMENTATION = "documentation",
	IMAGE = "image",
	EXTERNAL_RESOURCE = "external_resource",
	INTERNAL_FILE = "internal_file",
	ANCHOR = "anchor",
	EMAIL = "email",
	UNKNOWN = "unknown",
}

/**
 * Link validation status
 */
export enum LinkStatus {
	VALID = "valid",
	BROKEN = "broken",
	UNREACHABLE = "unreachable",
	SUSPICIOUS = "suspicious",
	UNKNOWN = "unknown",
}

/**
 * Issue types
 */
export enum IssueType {
	BROKEN_LINK = "broken_link",
	MISSING_FILE = "missing_file",
	SECURITY_RISK = "security_risk",
	PERFORMANCE_ISSUE = "performance_issue",
	ACCESSIBILITY_ISSUE = "accessibility_issue",
	BEST_PRACTICE = "best_practice",
}

/**
 * Issue severity levels
 */
export enum IssueSeverity {
	ERROR = "error",
	WARNING = "warning",
	INFO = "info",
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
export class LinkDependencyInterpreter
	implements IDataInterpreter<MarkdownLinkDependency[], LinkDependencyAnalysis>
{
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
			...options,
		};
	}

	/**
	 * Interprets link dependencies and generates analysis results
	 */
	interpret(
		dependencies: MarkdownLinkDependency[],
		_context: InterpreterContext,
	): LinkDependencyAnalysis {
		const startTime = process.hrtime.bigint(); // Use high resolution timing
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
			const dependencyIssues = this.checkDependencyIssues(
				dependency,
				processed,
			);
			issues.push(...dependencyIssues);

			// Update counters
			if (processed.fileExists !== undefined) {
				checkedFiles++;
			}
			if (processed.status === LinkStatus.UNREACHABLE) {
				unreachableLinks++;
			}

			// Count issue types
			dependencyIssues.forEach((issue) => {
				if (issue.type === IssueType.SECURITY_RISK) {
					securityWarnings++;
				}
				if (issue.type === IssueType.PERFORMANCE_ISSUE) {
					performanceWarnings++;
				}
			});
		}

		// Generate summary
		const summary = this.generateSummary(
			dependencies,
			processedDependencies,
			domains.size,
		);

		// Generate recommendations
		const recommendations = this.generateRecommendations(issues, summary);

		const endTime = process.hrtime.bigint();
		const analysisTime = Number(endTime - startTime) / 1000000; // Convert nanoseconds to milliseconds

		return {
			summary,
			dependencies: processedDependencies,
			issues,
			recommendations,
			metadata: {
				analysisTime: Math.max(1, Math.round(analysisTime)), // Ensure at least 1ms
				checkedFiles,
				unreachableLinks,
				securityWarnings,
				performanceWarnings,
			},
		};
	}

	/**
	 * Checks if this interpreter supports the given data type
	 */
	supports(dataType: string): boolean {
		return (
			dataType === "MarkdownLinkDependency[]" ||
			dataType === "markdown-links" ||
			dataType === "link-dependencies"
		);
	}

	/**
	 * Gets the unique name of this interpreter
	 */
	getName(): string {
		return "LinkDependencyInterpreter";
	}

	/**
	 * Gets the version of this interpreter
	 */
	getVersion(): string {
		return "1.0.0";
	}

	/**
	 * Validates input data before interpretation
	 */
	validate(input: MarkdownLinkDependency[]): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		if (!Array.isArray(input)) {
			errors.push("Input must be an array of MarkdownLinkDependency objects");
			return { isValid: false, errors, warnings };
		}

		input.forEach((dependency, index) => {
			if (!dependency.source) {
				errors.push(`Dependency at index ${index} missing source property`);
			}
			if (typeof dependency.isExternal !== "boolean") {
				warnings.push(
					`Dependency at index ${index} missing or invalid isExternal property`,
				);
			}
			if (typeof dependency.line !== "number") {
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
				overall: errors.length === 0 ? 0.95 : 0.5,
			},
		};
	}

	/**
	 * Gets the output schema for this interpreter
	 */
	getOutputSchema(): OutputSchema {
		return {
			type: "object",
			properties: {
				summary: {
					type: "object",
					properties: {
						totalLinks: { type: "number" },
						internalLinks: { type: "number" },
						externalLinks: { type: "number" },
						brokenLinks: { type: "number" },
					},
				},
				dependencies: {
					type: "array",
					items: {
						type: "object",
						properties: {
							source: { type: "string" },
							category: { type: "string" },
							status: { type: "string" },
						},
					},
				},
				issues: {
					type: "array",
					items: {
						type: "object",
						properties: {
							type: { type: "string" },
							message: { type: "string" },
							severity: { type: "string" },
						},
					},
				},
			},
			required: ["summary", "dependencies", "issues"],
			version: "1.0.0",
			metadata: {
				interpreterName: "LinkDependencyInterpreter",
			},
		};
	}

	/**
	 * Gets metadata about this interpreter
	 */
	getMetadata(): InterpreterMetadata {
		return {
			name: "LinkDependencyInterpreter",
			version: "1.0.0",
			description:
				"Analyzes markdown link dependencies for broken links, security issues, and performance problems",
			supportedDataTypes: [
				"MarkdownLinkDependency[]",
				"markdown-links",
				"link-dependencies",
			],
			outputType: "LinkDependencyAnalysis",
			dependencies: [],
			performance: {
				averageTimePerItem: 50,
				memoryUsage: "low",
				timeComplexity: "linear",
				scalability: "good",
				maxRecommendedDataSize: 10000,
			},
			quality: {
				accuracy: 0.95,
				completeness: 0.9,
				consistency: 0.98,
				reliability: 0.92,
			},
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
			dataTypes: ["MarkdownLinkDependency[]"],
			defaultOptions: {
				custom: this.options,
			},
			errorHandling: "lenient",
			logLevel: "warn",
		};
	}

	/**
	 * Gets the data types this interpreter can process
	 */
	getSupportedDataTypes(): string[] {
		return ["MarkdownLinkDependency[]", "markdown-links", "link-dependencies"];
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
	private processDependencySync(
		dependency: MarkdownLinkDependency,
	): ProcessedDependency {
		const category = this.categorizeDependency(dependency);
		const processed: ProcessedDependency = {
			source: dependency.source,
			type: dependency.type,
			category,
			status: LinkStatus.UNKNOWN,
			resolvedPath: dependency.resolvedPath,
			mimeType: this.getMimeType(dependency.extension || dependency.source),
			fileExists: undefined,
			domain: dependency.isExternal
				? this.extractDomain(dependency.source)
				: undefined,
			line: dependency.line,
			column: dependency.column,
			title: dependency.title,
			alt: dependency.alt,
		};

		// Determine status based on link type and checks
		if (category === DependencyCategory.ANCHOR) {
			// Anchor links are always valid (they reference the same page)
			processed.status = LinkStatus.VALID;
		} else if (dependency.isExternal) {
			// Check security first for external links
			if (this.options.securityChecks && this.isBlockedDomain(dependency.source)) {
				processed.status = LinkStatus.SUSPICIOUS;
			} else if (this.options.allowedDomains && this.options.allowedDomains.length > 0) {
				// Check if domain is in allowed list
				const domain = this.extractDomain(dependency.source);
				const isAllowed = this.options.allowedDomains.some(allowed => 
					domain === allowed || domain?.endsWith('.' + allowed)
				);
				processed.status = isAllowed ? LinkStatus.VALID : LinkStatus.UNREACHABLE;
			} else {
				// For external links, assume accessible (full check would require async)
				processed.status = LinkStatus.VALID;
			}
		} else if (dependency.isInternal && dependency.resolvedPath) {
			// File existence check for internal links
			try {
				processed.fileExists = existsSync(dependency.resolvedPath);
				processed.status = processed.fileExists
					? LinkStatus.VALID
					: LinkStatus.BROKEN; // Use BROKEN instead of UNREACHABLE for missing files
			} catch {
				processed.fileExists = false;
				processed.status = LinkStatus.BROKEN;
			}
		} else {
			// Unknown or invalid
			processed.status = LinkStatus.UNKNOWN;
		}

		return processed;
	}

	/**
	 * Extract domain from URL
	 */
	private extractDomain(url: string): string | undefined {
		try {
			const urlObj = new URL(url);
			let hostname = urlObj.hostname;
			
			// Group subdomains with main domain (e.g., docs.github.com -> github.com)
			const parts = hostname.split('.');
			if (parts.length > 2) {
				// Keep the last two parts for most domains (github.com, example.com, etc.)
				hostname = parts.slice(-2).join('.');
			}
			
			return hostname;
		} catch {
			return undefined;
		}
	}

	/**
	 * Categorize dependency type
	 */
	private categorizeDependency(
		dependency: MarkdownLinkDependency,
	): DependencyCategory {
		// Check for anchor links first
		if (dependency.source.startsWith("#")) {
			return DependencyCategory.ANCHOR;
		}

		if (dependency.isExternal) {
			if (dependency.source.startsWith("mailto:")) {
				return DependencyCategory.EMAIL;
			}
			return DependencyCategory.EXTERNAL_RESOURCE;
		}

		if (dependency.isInternal) {
			// Check by LinkType first for images
			if (dependency.type === "image") {
				return DependencyCategory.IMAGE;
			}
			
			if (dependency.extension) {
				const ext = dependency.extension.toLowerCase();
				if ([".md", ".markdown"].includes(ext)) {
					return DependencyCategory.DOCUMENTATION;
				}
				if ([".png", ".jpg", ".jpeg", ".gif", ".svg"].includes(ext)) {
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
	private checkDependencyIssues(
		dependency: MarkdownLinkDependency,
		processed: ProcessedDependency,
	): LinkIssue[] {
		const issues: LinkIssue[] = [];

		// Check for broken links (missing files)
		if (processed.status === LinkStatus.BROKEN) {
			issues.push({
				type: IssueType.BROKEN_LINK,
				severity: IssueSeverity.ERROR,
				message: `Broken link: ${dependency.source}`,
				dependency: dependency,
				suggestion: "Verify the link target exists and is accessible",
			});

			// Add separate MISSING_FILE issue for internal files that don't exist
			if (dependency.isInternal && processed.fileExists === false) {
				issues.push({
					type: IssueType.MISSING_FILE,
					severity: IssueSeverity.ERROR,
					message: `File not found: ${dependency.resolvedPath || dependency.source}`,
					dependency: dependency,
					suggestion: "Create the missing file or update the link path",
				});
			}
		}

		// Check for security issues
		if (processed.status === LinkStatus.SUSPICIOUS) {
			issues.push({
				type: IssueType.SECURITY_RISK,
				severity: IssueSeverity.WARNING,
				message: `Suspicious link detected: ${dependency.source}`,
				dependency: dependency,
				suggestion: "Review the link destination for security concerns",
			});
		}

		// Additional security check for HTTP links
		if (dependency.isExternal && this.options.checkExternalLinks) {
			const url = dependency.source.toLowerCase();
			if (url.startsWith("http://")) {
				issues.push({
					type: IssueType.SECURITY_RISK,
					severity: IssueSeverity.WARNING,
					message: `Insecure HTTP link: ${dependency.source}`,
					dependency: dependency,
					suggestion: "Consider using HTTPS instead of HTTP",
				});
			}
		}

		// Check for performance issues (large files)
		if (dependency.isInternal && dependency.resolvedPath && this.options.performanceChecks) {
			try {
				const stats = statSync(dependency.resolvedPath);
				const maxSize = this.options.maxFileSizeWarning || 1024 * 1024; // 1MB default
				
				if (stats.size > maxSize) {
					issues.push({
						type: IssueType.PERFORMANCE_ISSUE,
						severity: IssueSeverity.WARNING,
						message: `Large file detected: ${dependency.source} (${Math.round(stats.size / 1024 / 1024)}MB)`,
						dependency: dependency,
						suggestion: "Consider optimizing or compressing large files",
					});
				}
			} catch {
				// Ignore file stat errors
			}
		}

		// Check for accessibility issues (images without alt text)
		if (this.options.accessibilityChecks && dependency.type === "image") {
			if (!dependency.alt || dependency.alt.trim() === "") {
				issues.push({
					type: IssueType.ACCESSIBILITY_ISSUE,
					severity: IssueSeverity.WARNING,
					message: `Image missing alt text: ${dependency.source}`,
					dependency: dependency,
					suggestion: "Add descriptive alt text for screen readers and accessibility",
				});
			}
		}

		return issues;
	}

	/**
	 * Generate summary of analysis
	 */
	private generateSummary(
		dependencies: MarkdownLinkDependency[],
		processed: ProcessedDependency[],
		uniqueDomains: number,
	): LinkSummary {
		const totalLinks = dependencies.length;
		const internalLinks = dependencies.filter((d) => d.isInternal).length;
		const externalLinks = dependencies.filter((d) => d.isExternal).length;
		const brokenLinks = processed.filter(
			(p) => p.status === LinkStatus.BROKEN, // Changed from UNREACHABLE to BROKEN
		).length;
		const imageLinks = dependencies.filter(
			(d) =>
				d.type === "image" || // Check LinkType first
				(d.extension &&
				[".png", ".jpg", ".jpeg", ".gif", ".svg"].includes(
					d.extension.toLowerCase(),
				)),
		).length;
		const referenceLinks = dependencies.filter(
			(d) =>
				d.type === LinkType.REFERENCE || d.type === LinkType.IMAGE_REFERENCE,
		).length;
		
		// Calculate link density as links per line
		// Find the maximum line number to determine total lines
		const maxLine = dependencies.length > 0 
			? Math.max(...dependencies.map(d => d.line || 1))
			: 1;
		const linkDensity = totalLinks > 0 ? totalLinks / maxLine : 0;

		return {
			totalLinks,
			internalLinks,
			externalLinks,
			brokenLinks,
			imageLinks,
			referenceLinks,
			uniqueDomains,
			linkDensity,
		};
	}

	/**
	 * Generate recommendations based on issues
	 */
	private generateRecommendations(
		issues: LinkIssue[],
		summary: LinkSummary,
	): string[] {
		const recommendations: string[] = [];

		const brokenLinkIssues = issues.filter(
			(i) => i.type === IssueType.BROKEN_LINK,
		);
		if (brokenLinkIssues.length > 0) {
			const linkText = brokenLinkIssues.length === 1 ? "broken link" : "broken link(s)";
			recommendations.push(`Fix ${brokenLinkIssues.length} ${linkText}`);
		}

		const securityIssues = issues.filter(
			(i) => i.type === IssueType.SECURITY_RISK,
		);
		if (securityIssues.length > 0) {
			recommendations.push(
				`Address ${securityIssues.length} security concern(s)`,
			);
		}

		const performanceIssues = issues.filter(
			(i) => i.type === IssueType.PERFORMANCE_ISSUE,
		);
		if (performanceIssues.length > 0) {
			recommendations.push(
				`Optimize ${performanceIssues.length} performance issue(s)`,
			);
		}

		const accessibilityIssues = issues.filter(
			(i) => i.type === IssueType.ACCESSIBILITY_ISSUE,
		);
		if (accessibilityIssues.length > 0) {
			recommendations.push(
				`Improve accessibility for ${accessibilityIssues.length} image(s) - add alt text`,
			);
		}

		if (summary.externalLinks > summary.internalLinks * 2) {
			recommendations.push(
				"Consider reducing external dependencies for better reliability",
			);
		}

		const healthScore =
			summary.totalLinks > 0
				? (summary.totalLinks - summary.brokenLinks) / summary.totalLinks
				: 1.0;
		if (healthScore < 0.9) {
			recommendations.push(
				"Review and fix broken links to improve overall link health",
			);
		}

		if (recommendations.length === 0) {
			recommendations.push("No issues found - link dependencies are healthy");
		}

		return recommendations;
	}

	/**
	 * Get MIME type from file extension
	 */
	private getMimeType(extensionOrSource?: string): string | undefined {
		if (!extensionOrSource) return undefined;

		let extension = extensionOrSource;
		// If it's a full source URL/path, extract the extension
		if (extensionOrSource.includes('.')) {
			const parts = extensionOrSource.split('.');
			extension = '.' + parts[parts.length - 1].split('?')[0].split('#')[0]; // Remove query params and fragments
		}

		const mimeTypes: Record<string, string> = {
			".md": "text/markdown",
			".markdown": "text/markdown", 
			".txt": "text/plain",
			".html": "text/html",
			".htm": "text/html",
			".css": "text/css",
			".js": "application/javascript",
			".json": "application/json",
			".xml": "application/xml",
			".pdf": "application/pdf",
			".png": "image/png",
			".jpg": "image/jpeg",
			".jpeg": "image/jpeg",
			".gif": "image/gif",
			".svg": "image/svg+xml",
			".webp": "image/webp",
			".mp4": "video/mp4",
			".mp3": "audio/mpeg",
			".zip": "application/zip",
		};

		const mimeType = mimeTypes[extension.toLowerCase()];
		return mimeType || "application/octet-stream";
	}

	/**
	 * Check if a domain is in the blocked domains list
	 */
	private isBlockedDomain(source: string): boolean {
		if (!this.options.blockedDomains || this.options.blockedDomains.length === 0) {
			return false;
		}

		const domain = this.extractDomain(source);
		if (!domain) return false;

		return this.options.blockedDomains.some(blocked => 
			domain.includes(blocked) || blocked.includes(domain)
		);
	}
}
