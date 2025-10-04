/**
 * Experimental Solution: Worker-Scoped Parser Manager
 *
 * This file demonstrates the proposed solution for fixing parser cache issues
 * by isolating parser instances per Jest worker.
 *
 * Status: EXPERIMENTAL - For validation only
 * Date: 2025-10-04
 */

import type { BaseParser } from '../src/parsers/base/BaseParser';
import type { SupportedLanguage } from '../src/parsers/types';

/**
 * Get the current Jest worker ID
 * Returns '0' for non-Jest environments (production)
 */
function getWorkerId(): string {
  return process.env.JEST_WORKER_ID || '0';
}

/**
 * Worker-Scoped Parser Manager
 *
 * Key Changes from Original:
 * 1. Parser keys include worker ID
 * 2. clearCache() only affects current worker's parsers
 * 3. Each worker maintains isolated parser instances
 */
export class WorkerScopedParserManager {
  private parsers = new Map<string, BaseParser>();
  private readonly workerId: string;

  constructor() {
    this.workerId = getWorkerId();
    console.log(`🔧 ParserManager initialized for worker ${this.workerId}`);
  }

  /**
   * Generate worker-scoped parser key
   * Format: "{workerId}-{language}"
   * Example: "1-typescript", "2-java"
   */
  private getParserKey(language: SupportedLanguage): string {
    return `${this.workerId}-${language}`;
  }

  /**
   * Get or create parser instance for current worker
   * Each worker gets its own parser instances
   */
  getParser(language: SupportedLanguage): BaseParser {
    const key = this.getParserKey(language);

    if (!this.parsers.has(key)) {
      // Import ParserFactory dynamically to avoid circular deps in example
      // In real implementation, use: const parser = ParserFactory.createParser(language);
      const parser = this.createParserStub(language);
      this.parsers.set(key, parser);
      console.log(`🔧 Created ${language} parser for worker ${this.workerId} (key: ${key})`);
    }

    return this.parsers.get(key)!;
  }

  /**
   * Clear cache for current worker's parsers only
   * Does not affect other workers' parsers
   */
  clearCache(): void {
    const workerPrefix = `${this.workerId}-`;
    let clearedCount = 0;

    for (const [key, parser] of this.parsers.entries()) {
      if (key.startsWith(workerPrefix)) {
        parser.clearCache();
        clearedCount++;
      }
    }

    console.log(`🧹 Cleared ${clearedCount} parser(s) for worker ${this.workerId}`);
  }

  /**
   * Dispose of current worker's parsers
   * Removes parser instances completely
   */
  dispose(): void {
    const workerPrefix = `${this.workerId}-`;
    const keysToDelete: string[] = [];

    for (const key of this.parsers.keys()) {
      if (key.startsWith(workerPrefix)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.parsers.delete(key);
    }

    console.log(`🗑️  Disposed ${keysToDelete.length} parser(s) for worker ${this.workerId}`);
  }

  /**
   * Get statistics about parser usage
   * Useful for monitoring and debugging
   */
  getStats() {
    const workerPrefix = `${this.workerId}-`;
    const workerParsers = Array.from(this.parsers.keys())
      .filter(key => key.startsWith(workerPrefix));

    return {
      workerId: this.workerId,
      totalParsers: this.parsers.size,
      workerParsers: workerParsers.length,
      parserKeys: workerParsers,
    };
  }

  // Stub for demonstration - replace with actual ParserFactory in implementation
  private createParserStub(language: SupportedLanguage): BaseParser {
    return {
      language,
      clearCache: () => {
        console.log(`  └─ clearCache() called for ${language}`);
      },
    } as unknown as BaseParser;
  }
}

/**
 * Example Usage in Tests
 */
export function exampleUsage() {
  console.log('\n=== Worker-Scoped Parser Manager Example ===\n');

  // Simulate Worker 1
  process.env.JEST_WORKER_ID = '1';
  const worker1Manager = new WorkerScopedParserManager();
  worker1Manager.getParser('typescript');
  worker1Manager.getParser('java');
  console.log('Worker 1 stats:', worker1Manager.getStats());

  // Simulate Worker 2
  process.env.JEST_WORKER_ID = '2';
  const worker2Manager = new WorkerScopedParserManager();
  worker2Manager.getParser('typescript');
  worker2Manager.getParser('python');
  console.log('Worker 2 stats:', worker2Manager.getStats());

  // Clear cache in Worker 1 - does NOT affect Worker 2
  console.log('\n--- Clearing Worker 1 cache ---');
  worker1Manager.clearCache();

  // Worker 2 parsers are unaffected
  console.log('Worker 2 stats after Worker 1 clear:', worker2Manager.getStats());

  console.log('\n=== Example Complete ===\n');
}

/**
 * Migration Guide
 *
 * To implement this solution in the actual codebase:
 *
 * 1. Update src/parsers/ParserManager.ts:
 *    - Add getWorkerId() helper
 *    - Modify getParserKey() to include worker ID
 *    - Update clearCache() to only clear current worker's parsers
 *
 * 2. No changes needed in:
 *    - Test files (existing tests will work)
 *    - Parser implementations (TypeScriptParser, etc.)
 *    - Production code (worker ID defaults to '0')
 *
 * 3. Testing:
 *    - Run: npm test (full suite with workers)
 *    - Verify: All 344 tests pass
 *    - Check: No parser state errors
 *
 * 4. Monitoring:
 *    - Add getStats() calls in tests to verify isolation
 *    - Monitor memory usage (should be +10-20MB)
 */

/**
 * Diff Preview for src/parsers/ParserManager.ts
 *
 * ```diff
 * + // Get Jest worker ID for parser isolation
 * + const WORKER_ID = process.env.JEST_WORKER_ID || '0';
 * +
 *   export class ParserManager {
 *     private parsers = new Map<SupportedLanguage, BaseParser>();
 * +   private readonly workerId = WORKER_ID;
 *
 * +   constructor() {
 * +     console.log(`🔧 ParserManager initialized for worker ${this.workerId}`);
 * +   }
 * +
 * +   private getParserKey(language: SupportedLanguage): string {
 * +     return `${this.workerId}-${language}`;
 * +   }
 *
 *     getParser(language: SupportedLanguage): BaseParser {
 * -     if (!this.parsers.has(language)) {
 * +     const key = this.getParserKey(language);
 * +     if (!this.parsers.has(key)) {
 *         const parser = ParserFactory.createParser(language);
 * -       this.parsers.set(language, parser);
 * +       this.parsers.set(key, parser);
 *         console.log(`🔧 Created new ${language} parser instance`);
 *       }
 * -     return this.parsers.get(language)!;
 * +     return this.parsers.get(key)!;
 *     }
 *
 *     clearCache(): void {
 * -     for (const parser of this.parsers.values()) {
 * -       parser.clearCache();
 * +     const workerPrefix = `${this.workerId}-`;
 * +     for (const [key, parser] of this.parsers.entries()) {
 * +       if (key.startsWith(workerPrefix)) {
 * +         parser.clearCache();
 * +       }
 *       }
 *     }
 *   }
 * ```
 */

// Run example if executed directly
if (require.main === module) {
  exampleUsage();
}
