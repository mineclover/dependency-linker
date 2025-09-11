/**
 * Performance Test for Analysis Speed
 * Ensures the analyzer meets performance requirements
 */

import * as fs from 'fs';
import * as path from 'path';
import { FileAnalyzer } from '../../src/services/FileAnalyzer';
import { FileAnalysisRequest } from '../../src/models/FileAnalysisRequest';

describe('Analysis Speed Performance', () => {
  let fileAnalyzer: FileAnalyzer;
  const testFilesDir = path.join(__dirname, '../fixtures');

  beforeAll(async () => {
    fileAnalyzer = new FileAnalyzer();
    await fs.promises.mkdir(testFilesDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(testFilesDir, { recursive: true, force: true });
  });

  test('should analyze simple file in under 1 second', async () => {
    const testFile = path.join(testFilesDir, 'simple-perf.ts');
    await fs.promises.writeFile(testFile, `
import React from 'react';
import { useState, useEffect } from 'react';
import lodash from 'lodash';

export const Component: React.FC = () => {
  const [state, setState] = useState(0);
  
  useEffect(() => {
    console.log('Effect');
  }, []);
  
  return <div>{state}</div>;
};

export default Component;
`);

    const request: FileAnalysisRequest = {
      filePath: testFile,
      options: { format: 'json', parseTimeout: 5000 }
    };

    const startTime = Date.now();
    const result = await fileAnalyzer.analyzeFile(request);
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(1000); // Must be under 1 second
    expect(result.parseTime).toBeLessThan(500); // Internal parsing under 0.5s
  });

  test('should analyze medium complexity file in under 2 seconds', async () => {
    const testFile = path.join(testFilesDir, 'medium-perf.ts');
    
    // Generate a medium complexity file
    const imports = [
      "import React, { useState, useEffect, useCallback, useMemo } from 'react';",
      "import { Button, TextField, Box, Typography } from '@mui/material';",
      "import { styled, ThemeProvider } from '@mui/material/styles';",
      "import axios from 'axios';",
      "import lodash from 'lodash';",
      "import { formatDistance, parseISO } from 'date-fns';",
      "import './component.css';"
    ].join('\n');

    const interfaces = Array.from({ length: 10 }, (_, i) => `
export interface Data${i} {
  id: number;
  name: string;
  value: string;
  metadata: Record<string, any>;
}`).join('\n');

    const functions = Array.from({ length: 20 }, (_, i) => `
export const processData${i} = (data: Data${i % 10}) => {
  return lodash.map([data], item => ({
    ...item,
    processed: true,
    timestamp: Date.now()
  }));
};`).join('\n');

    const content = imports + '\n' + interfaces + '\n' + functions + `
export default { ${Array.from({ length: 20 }, (_, i) => `processData${i}`).join(', ')} };
`;

    await fs.promises.writeFile(testFile, content);

    const request: FileAnalysisRequest = {
      filePath: testFile,
      options: { format: 'json', parseTimeout: 10000 }
    };

    const startTime = Date.now();
    const result = await fileAnalyzer.analyzeFile(request);
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(2000); // Must be under 2 seconds
    expect(result.parseTime).toBeLessThan(1000); // Internal parsing under 1s
    expect(result.dependencies.length).toBeGreaterThan(5);
    expect(result.exports.length).toBeGreaterThan(25); // Interfaces + functions + default
  });

  test('should handle large file within time limits', async () => {
    const testFile = path.join(testFilesDir, 'large-perf.ts');
    
    // Generate a large file (but not too large to cause memory issues)
    const imports = Array.from({ length: 25 }, (_, i) => 
      `import { util${i} } from './utils/util${i}';`
    ).join('\n');

    const types = Array.from({ length: 25 }, (_, i) => `
export interface LargeType${i} {
  id: number;
  name: string;
  data: {
    value${i}: string;
    metadata: Record<string, any>;
    nested: {
      level1: string;
      level2: { prop: number };
    };
  };
}`).join('\n');

    const functions = Array.from({ length: 25 }, (_, i) => `
export const largeFunction${i} = (param: LargeType${i}) => {
  return {
    processed: param,
    timestamp: Date.now(),
    id: ${i}
  };
};`).join('\n');

    const content = imports + '\n' + types + '\n' + functions;
    await fs.promises.writeFile(testFile, content);

    const request: FileAnalysisRequest = {
      filePath: testFile,
      options: { format: 'json', parseTimeout: 15000 }
    };

    const startTime = Date.now();
    const result = await fileAnalyzer.analyzeFile(request);
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(5000); // Must be under 5 seconds for large files
    expect(result.parseTime).toBeLessThan(3000); // Internal parsing under 3s
    expect(result.dependencies.length).toBe(25); // 25 imports
    expect(result.exports.length).toBeGreaterThan(45); // Types + functions
  });

  test('should handle multiple files in parallel efficiently', async () => {
    const numFiles = 5;
    const testFiles: string[] = [];
    
    // Create multiple test files
    for (let i = 0; i < numFiles; i++) {
      const testFile = path.join(testFilesDir, `parallel-${i}.ts`);
      testFiles.push(testFile);
      
      const content = `
import React from 'react';
import { Component${i} } from './component${i}';

export interface ParallelType${i} {
  id: number;
  name: string;
}

export const parallelFunction${i} = (data: ParallelType${i}) => {
  return React.createElement(Component${i}, { data });
};

export default parallelFunction${i};
`;
      await fs.promises.writeFile(testFile, content);
    }

    const requests: FileAnalysisRequest[] = testFiles.map(filePath => ({
      filePath,
      options: { format: 'json', parseTimeout: 5000 }
    }));

    const startTime = Date.now();
    const results = await Promise.all(
      requests.map(request => fileAnalyzer.analyzeFile(request))
    );
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify all analyses succeeded
    results.forEach((result, index) => {
      expect(result.success).toBe(true);
      expect(result.dependencies.length).toBeGreaterThanOrEqual(2);
      expect(result.exports.length).toBeGreaterThanOrEqual(3);
    });

    // Parallel processing should be efficient
    expect(duration).toBeLessThan(3000); // All 5 files processed in under 3 seconds
    expect(results.length).toBe(numFiles);
    
    // Average per-file time should be reasonable
    const avgPerFile = duration / numFiles;
    expect(avgPerFile).toBeLessThan(1000); // Average under 1 second per file
  });

  test('should respect timeout settings', async () => {
    const testFile = path.join(testFilesDir, 'timeout-perf.ts');
    await fs.promises.writeFile(testFile, `
// Simple file for timeout testing
export const test = 'timeout test';
export default test;
`);

    const request: FileAnalysisRequest = {
      filePath: testFile,
      options: { 
        format: 'json', 
        parseTimeout: 100 // Very short timeout
      }
    };

    const startTime = Date.now();
    const result = await fileAnalyzer.analyzeFile(request);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should either succeed quickly or timeout within the specified time
    if (result.success) {
      expect(duration).toBeLessThan(500); // If successful, should be fast
    } else {
      // If it times out, should respect the timeout
      expect(duration).toBeLessThan(200); // Should timeout close to 100ms + overhead
      expect(result.error?.code).toBe('TIMEOUT');
    }
  });

  test('should maintain consistent performance across multiple runs', async () => {
    const testFile = path.join(testFilesDir, 'consistent-perf.ts');
    const content = `
import React, { useState, useEffect } from 'react';
import { Button, Box } from '@mui/material';
import lodash from 'lodash';

export interface ConsistentType {
  id: number;
  data: string[];
}

export const consistentFunction = (items: ConsistentType[]) => {
  return lodash.map(items, item => ({ ...item, processed: true }));
};

export default consistentFunction;
`;
    await fs.promises.writeFile(testFile, content);

    const request: FileAnalysisRequest = {
      filePath: testFile,
      options: { format: 'json', parseTimeout: 5000 }
    };

    const durations: number[] = [];
    const numRuns = 5;

    // Run multiple times and collect durations
    for (let i = 0; i < numRuns; i++) {
      const startTime = Date.now();
      const result = await fileAnalyzer.analyzeFile(request);
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      durations.push(endTime - startTime);
    }

    // Check consistency
    const avgDuration = durations.reduce((a, b) => a + b) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    
    expect(avgDuration).toBeLessThan(1000); // Average under 1 second
    expect(maxDuration).toBeLessThan(2000); // No run should take over 2 seconds
    
    // Variance should be reasonable (max shouldn't be more than 3x min)
    // Guard against division by zero if a test runs very quickly
    if (minDuration > 0) {
      expect(maxDuration / minDuration).toBeLessThan(3);
    } else {
      // If minimum duration is 0, just check that maximum is still reasonable
      expect(maxDuration).toBeLessThan(100); // Very fast execution
    }
  });
});