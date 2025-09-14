/**
 * Helper functions to work with new AnalysisResult format
 */

import type { AnalysisResult } from "../models/AnalysisResult";
import type { DependencyInfo } from "../models/DependencyInfo";
import type { ExportInfo } from "../models/ExportInfo";
import type { ImportInfo } from "../models/ImportInfo";

/**
 * Check if analysis was successful (no errors)
 */
export function isSuccessful(result: AnalysisResult): boolean {
	return result.errors.length === 0;
}

/**
 * Get dependencies from analysis result
 */
export function getDependencies(result: AnalysisResult): DependencyInfo[] {
	const depData = result.extractedData?.["dependency"] as any;
	return depData?.dependencies || [];
}

/**
 * Get imports from analysis result
 */
export function getImports(result: AnalysisResult): ImportInfo[] {
	const depData = result.extractedData?.["dependency"] as any;
	return depData?.imports || [];
}

/**
 * Get exports from analysis result
 */
export function getExports(result: AnalysisResult): ExportInfo[] {
	const identData = result.extractedData?.["identifier"] as any;
	return identData?.exports || [];
}

/**
 * Get parse time from performance metrics
 */
export function getParseTime(result: AnalysisResult): number {
	return result.performanceMetrics.parseTime || 0;
}

/**
 * Get first error (legacy compatibility)
 */
export function getError(result: AnalysisResult): any | undefined {
	return result.errors[0] || undefined;
}
