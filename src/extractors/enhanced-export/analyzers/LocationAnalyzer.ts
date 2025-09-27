import type Parser from "tree-sitter";
import type { SourceLocation } from "../types/export-types";

/**
 * Extended location information with additional context
 */
export interface ExtendedSourceLocation extends SourceLocation {
	/** Byte offset from start of file */
	startOffset: number;
	endOffset: number;

	/** Length of the source span */
	length: number;

	/** Text content at this location */
	text: string;

	/** Context lines around the location */
	context?: {
		before: string[];
		after: string[];
	};
}

/**
 * Location analysis options
 */
export interface LocationAnalysisOptions {
	/** Number of context lines to include before and after */
	contextLines?: number;

	/** Whether to include the actual text content */
	includeText?: boolean;

	/** Whether to calculate byte offsets */
	includeOffsets?: boolean;
}

/**
 * Analyzer for extracting detailed source location information
 */
export class LocationAnalyzer {
	private sourceLines: string[] = [];

	/**
	 * Initialize with source code for context analysis
	 * @param sourceCode Complete source code of the file
	 */
	constructor(private sourceCode?: string) {
		if (sourceCode) {
			this.sourceLines = sourceCode.split("\n");
		}
	}

	/**
	 * Extract basic source location from a node
	 * @param node Tree-sitter node
	 * @returns Basic source location
	 */
	getSourceLocation(node: Parser.SyntaxNode): SourceLocation {
		return {
			line: node.startPosition.row + 1, // Convert 0-based to 1-based
			column: node.startPosition.column + 1,
			endLine: node.endPosition.row + 1,
			endColumn: node.endPosition.column + 1,
		};
	}

	/**
	 * Extract extended source location with additional context
	 * @param node Tree-sitter node
	 * @param options Analysis options
	 * @returns Extended source location information
	 */
	getExtendedLocation(
		node: Parser.SyntaxNode,
		options: LocationAnalysisOptions = {},
	): ExtendedSourceLocation {
		const basicLocation = this.getSourceLocation(node);

		const extended: ExtendedSourceLocation = {
			...basicLocation,
			startOffset: node.startIndex,
			endOffset: node.endIndex,
			length: node.endIndex - node.startIndex,
			text: options.includeText !== false ? node.text : "",
		};

		// Add context if source code is available and requested
		if (this.sourceCode && options.contextLines && options.contextLines > 0) {
			extended.context = this.extractContext(
				basicLocation,
				options.contextLines,
			);
		}

		return extended;
	}

	/**
	 * Get the range of lines that a node spans
	 * @param node Tree-sitter node
	 * @returns Array of line numbers (1-based)
	 */
	getLineRange(node: Parser.SyntaxNode): number[] {
		const startLine = node.startPosition.row + 1;
		const endLine = node.endPosition.row + 1;
		const lines: number[] = [];

		for (let i = startLine; i <= endLine; i++) {
			lines.push(i);
		}

		return lines;
	}

	/**
	 * Get the source text for specific lines
	 * @param startLine Starting line (1-based)
	 * @param endLine Ending line (1-based)
	 * @returns Source text for the specified range
	 */
	getTextForLines(startLine: number, endLine: number): string {
		if (!this.sourceCode) {
			return "";
		}

		const start = Math.max(0, startLine - 1); // Convert to 0-based
		const end = Math.min(this.sourceLines.length, endLine);

		return this.sourceLines.slice(start, end).join("\n");
	}

	/**
	 * Calculate the indentation level at a specific location
	 * @param location Source location
	 * @returns Indentation level (number of spaces/tabs)
	 */
	getIndentationLevel(location: SourceLocation): number {
		if (!this.sourceCode || location.line > this.sourceLines.length) {
			return 0;
		}

		const line = this.sourceLines[location.line - 1]; // Convert to 0-based
		const match = line.match(/^(\s*)/);
		return match ? match[1].length : 0;
	}

	/**
	 * Check if a location is within a specific range
	 * @param location Location to check
	 * @param rangeStart Start of range
	 * @param rangeEnd End of range
	 * @returns True if location is within range
	 */
	isWithinRange(
		location: SourceLocation,
		rangeStart: SourceLocation,
		rangeEnd: SourceLocation,
	): boolean {
		// Check if location is after range start
		if (
			location.line < rangeStart.line ||
			(location.line === rangeStart.line && location.column < rangeStart.column)
		) {
			return false;
		}

		// Check if location is before range end
		if (
			location.line > rangeEnd.line ||
			(location.line === rangeEnd.line && location.column > rangeEnd.column)
		) {
			return false;
		}

		return true;
	}

	/**
	 * Calculate the distance between two locations
	 * @param location1 First location
	 * @param location2 Second location
	 * @returns Distance information
	 */
	calculateDistance(
		location1: SourceLocation,
		location2: SourceLocation,
	): {
		lines: number;
		characters: number;
		isAfter: boolean;
	} {
		const lineDiff = location2.line - location1.line;
		const isAfter =
			lineDiff > 0 || (lineDiff === 0 && location2.column > location1.column);

		let characterDiff = 0;
		if (this.sourceCode) {
			// Calculate character distance through the source
			const start = Math.min(location1.line, location2.line) - 1;
			const end = Math.max(location1.line, location2.line) - 1;

			for (let i = start; i <= end; i++) {
				if (i < this.sourceLines.length) {
					characterDiff += this.sourceLines[i].length + 1; // +1 for newline
				}
			}

			// Adjust for actual column positions
			if (location1.line === location2.line) {
				characterDiff = Math.abs(location2.column - location1.column);
			}
		}

		return {
			lines: Math.abs(lineDiff),
			characters: characterDiff,
			isAfter,
		};
	}

	/**
	 * Find the nearest export statement location to a given location
	 * @param location Target location
	 * @param exportLocations Array of export statement locations
	 * @returns Nearest export location or undefined
	 */
	findNearestExport(
		location: SourceLocation,
		exportLocations: SourceLocation[],
	): SourceLocation | undefined {
		if (exportLocations.length === 0) {
			return undefined;
		}

		let nearest = exportLocations[0];
		let minDistance = this.calculateDistance(location, nearest).lines;

		for (const exportLocation of exportLocations.slice(1)) {
			const distance = this.calculateDistance(location, exportLocation).lines;
			if (distance < minDistance) {
				minDistance = distance;
				nearest = exportLocation;
			}
		}

		return nearest;
	}

	/**
	 * Extract line numbers that contain exports
	 * @param exportLocations Array of export locations
	 * @returns Set of line numbers containing exports
	 */
	getExportLines(exportLocations: SourceLocation[]): Set<number> {
		const exportLines = new Set<number>();

		for (const location of exportLocations) {
			if (location.endLine) {
				// Add all lines from start to end
				for (let line = location.line; line <= location.endLine; line++) {
					exportLines.add(line);
				}
			} else {
				exportLines.add(location.line);
			}
		}

		return exportLines;
	}

	/**
	 * Get line-by-line coverage of exports in the file
	 * @param exportLocations Array of export locations
	 * @returns Coverage information
	 */
	getExportCoverage(exportLocations: SourceLocation[]): {
		totalLines: number;
		exportLines: number;
		coverage: number;
		exportLineNumbers: number[];
	} {
		const totalLines = this.sourceLines.length;
		const exportLineSet = this.getExportLines(exportLocations);
		const exportLines = exportLineSet.size;
		const coverage = totalLines > 0 ? (exportLines / totalLines) * 100 : 0;

		return {
			totalLines,
			exportLines,
			coverage,
			exportLineNumbers: Array.from(exportLineSet).sort((a, b) => a - b),
		};
	}

	/**
	 * Extract context lines around a location
	 */
	private extractContext(
		location: SourceLocation,
		contextLines: number,
	): {
		before: string[];
		after: string[];
	} {
		const before: string[] = [];
		const after: string[] = [];

		// Extract lines before
		const startBefore = Math.max(0, location.line - contextLines - 1);
		const endBefore = Math.max(0, location.line - 1);
		for (let i = startBefore; i < endBefore; i++) {
			if (i < this.sourceLines.length) {
				before.push(this.sourceLines[i]);
			}
		}

		// Extract lines after
		const startAfter = Math.min(
			this.sourceLines.length,
			location.endLine || location.line,
		);
		const endAfter = Math.min(
			this.sourceLines.length,
			startAfter + contextLines,
		);
		for (let i = startAfter; i < endAfter; i++) {
			after.push(this.sourceLines[i]);
		}

		return { before, after };
	}

	/**
	 * Create a visual representation of source location
	 * @param location Source location to visualize
	 * @param highlightChar Character to use for highlighting
	 * @returns Visual representation
	 */
	visualizeLocation(
		location: SourceLocation,
		highlightChar: string = "^",
	): string {
		if (!this.sourceCode || location.line > this.sourceLines.length) {
			return "";
		}

		const line = this.sourceLines[location.line - 1];
		const highlight =
			" ".repeat(location.column - 1) +
			highlightChar.repeat(
				Math.max(1, (location.endColumn || location.column) - location.column),
			);

		return `${location.line}: ${line}\n${" ".repeat(String(location.line).length + 2)}${highlight}`;
	}
}
