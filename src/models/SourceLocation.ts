/**
 * Source Location Model
 * Location information in source code
 */

export interface SourceLocation {
  /** Line number (1-indexed) */
  line: number;
  /** Column number (0-indexed) */
  column: number;
  /** Byte offset from file start */
  offset: number;
}

/**
 * Creates a source location object
 * @param line Line number (1-indexed)
 * @param column Column number (0-indexed)
 * @param offset Byte offset from file start
 * @returns SourceLocation object
 */
export function createSourceLocation(
  line: number,
  column: number,
  offset: number
): SourceLocation {
  return {
    line: Math.max(1, line), // Ensure line is at least 1
    column: Math.max(0, column), // Ensure column is at least 0
    offset: Math.max(0, offset) // Ensure offset is at least 0
  };
}

/**
 * Creates a source location from tree-sitter position
 * @param position Tree-sitter position object
 * @returns SourceLocation object
 */
export function createLocationFromTreeSitterPosition(position: {
  row: number;
  column: number;
}): SourceLocation {
  return createSourceLocation(
    position.row + 1, // Tree-sitter is 0-indexed for lines, we use 1-indexed
    position.column,  // Tree-sitter is 0-indexed for columns, we keep 0-indexed
    0 // Offset needs to be calculated separately
  );
}

/**
 * Creates a source location with calculated offset
 * @param content The file content
 * @param line Line number (1-indexed)
 * @param column Column number (0-indexed)
 * @returns SourceLocation object with calculated offset
 */
export function createLocationWithOffset(
  content: string,
  line: number,
  column: number
): SourceLocation {
  const offset = calculateOffset(content, line, column);
  return createSourceLocation(line, column, offset);
}

/**
 * Calculates byte offset from line and column
 * @param content The file content
 * @param line Line number (1-indexed)
 * @param column Column number (0-indexed)
 * @returns Byte offset
 */
export function calculateOffset(content: string, line: number, column: number): number {
  const lines = content.split('\n');
  let offset = 0;
  
  // Add lengths of all previous lines (including newline characters)
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    offset += lines[i].length + 1; // +1 for newline character
  }
  
  // Add column offset within the current line
  offset += Math.min(column, lines[line - 1]?.length || 0);
  
  return offset;
}

/**
 * Converts offset to line and column
 * @param content The file content
 * @param offset Byte offset
 * @returns Object with line and column
 */
export function offsetToLineColumn(content: string, offset: number): {
  line: number;
  column: number;
} {
  let line = 1;
  let column = 0;
  
  for (let i = 0; i < Math.min(offset, content.length); i++) {
    if (content[i] === '\n') {
      line++;
      column = 0;
    } else {
      column++;
    }
  }
  
  return { line, column };
}

/**
 * Creates a source location from offset
 * @param content The file content
 * @param offset Byte offset
 * @returns SourceLocation object
 */
export function createLocationFromOffset(content: string, offset: number): SourceLocation {
  const { line, column } = offsetToLineColumn(content, offset);
  return createSourceLocation(line, column, offset);
}

/**
 * Validates a source location object
 * @param location The location to validate
 * @returns True if the location is valid
 */
export function isValidSourceLocation(location: any): location is SourceLocation {
  return (
    location &&
    typeof location === 'object' &&
    typeof location.line === 'number' &&
    typeof location.column === 'number' &&
    typeof location.offset === 'number' &&
    location.line >= 1 &&
    location.column >= 0 &&
    location.offset >= 0
  );
}

/**
 * Compares two source locations
 * @param a First location
 * @param b Second location
 * @returns -1 if a comes before b, 1 if a comes after b, 0 if they're equal
 */
export function compareSourceLocations(a: SourceLocation, b: SourceLocation): number {
  if (a.line !== b.line) {
    return a.line < b.line ? -1 : 1;
  }
  
  if (a.column !== b.column) {
    return a.column < b.column ? -1 : 1;
  }
  
  return 0;
}

/**
 * Checks if two source locations are equal
 * @param a First location
 * @param b Second location
 * @returns True if locations are equal
 */
export function sourceLocationsEqual(a: SourceLocation, b: SourceLocation): boolean {
  return a.line === b.line && a.column === b.column && a.offset === b.offset;
}

/**
 * Gets a human-readable string representation of a location
 * @param location The source location
 * @returns Human-readable string (e.g., "line 5, column 10")
 */
export function formatSourceLocation(location: SourceLocation): string {
  return `line ${location.line}, column ${location.column}`;
}

/**
 * Gets a compact string representation of a location
 * @param location The source location
 * @returns Compact string (e.g., "5:10")
 */
export function formatSourceLocationCompact(location: SourceLocation): string {
  return `${location.line}:${location.column}`;
}

/**
 * Extracts context around a source location
 * @param content The file content
 * @param location The source location
 * @param contextLines Number of lines of context to include
 * @returns Object with context information
 */
export function getLocationContext(
  content: string,
  location: SourceLocation,
  contextLines: number = 2
): {
  beforeLines: string[];
  currentLine: string;
  afterLines: string[];
  lineNumber: number;
} {
  const lines = content.split('\n');
  const lineIndex = location.line - 1; // Convert to 0-indexed
  
  const startIndex = Math.max(0, lineIndex - contextLines);
  const endIndex = Math.min(lines.length - 1, lineIndex + contextLines);
  
  return {
    beforeLines: lines.slice(startIndex, lineIndex),
    currentLine: lines[lineIndex] || '',
    afterLines: lines.slice(lineIndex + 1, endIndex + 1),
    lineNumber: location.line
  };
}

/**
 * Validates that a location is within file bounds
 * @param content The file content
 * @param location The source location to validate
 * @returns True if location is within bounds
 */
export function isLocationWithinBounds(content: string, location: SourceLocation): boolean {
  const lines = content.split('\n');
  
  if (location.line < 1 || location.line > lines.length) {
    return false;
  }
  
  const lineContent = lines[location.line - 1];
  if (location.column < 0 || location.column > lineContent.length) {
    return false;
  }
  
  if (location.offset < 0 || location.offset > content.length) {
    return false;
  }
  
  return true;
}