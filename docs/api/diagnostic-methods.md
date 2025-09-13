# Diagnostic Methods API

Comprehensive diagnostic tools for system health monitoring, performance analysis, and error detection in the TypeScript Dependency Linker.

## 🏥 DiagnosticTool Class

The `DiagnosticTool` class provides comprehensive system health monitoring and performance analysis capabilities.

### Constructor

```typescript
import { DiagnosticTool } from 'dependency-linker/api/errors';

const analyzer = new TypeScriptAnalyzer();
const diagnosticTool = new DiagnosticTool(analyzer);
```

### Core Diagnostic Methods

#### `analyzePerformance(filePath?: string): Promise<PerformanceAnalysis>`

Analyzes system performance with detailed metrics and recommendations.

**Parameters:**
- `filePath` (optional): Specific file to analyze for performance bottlenecks

**Returns:** Promise resolving to performance analysis report

**Example:**
```typescript
const performanceReport = await diagnosticTool.analyzePerformance('./src/complex-file.ts');

console.log(`Parse Speed: ${performanceReport.parseSpeed.toFixed(2)}ms`);
console.log(`Memory Usage: ${performanceReport.memoryUsage}MB`);
console.log(`Recommendations: ${performanceReport.recommendations.join(', ')}`);
```

**Performance Metrics:**
- **Parse Speed**: Average parsing time per file
- **Memory Usage**: Current heap usage and peak usage
- **Cache Efficiency**: Hit/miss ratios and optimization suggestions
- **Error Rate**: Frequency of parsing errors and their impact

#### `getSystemHealth(): Promise<DiagnosticReport>`

Performs comprehensive system health check with actionable insights.

**Returns:** Promise resolving to detailed system health report

**Example:**
```typescript
const healthReport = await diagnosticTool.getSystemHealth();

healthReport.healthChecks.forEach(check => {
  console.log(`${check.component}: ${check.status}`);
  if (check.status !== 'healthy') {
    console.log(`  Issue: ${check.message}`);
    console.log(`  Suggestions: ${check.suggestions?.join(', ')}`);
  }
});
```

**Health Check Components:**
- **Parser Health**: TypeScript parser status and configuration
- **Memory Status**: Current memory usage vs. limits
- **Cache Performance**: Cache hit rates and storage efficiency
- **File System**: Access permissions and file availability
- **Dependencies**: Node.js version compatibility and required modules

#### `analyzeError(error: Error, context?: ErrorContext): Promise<ErrorAnalysis>`

Provides detailed error analysis with actionable solutions.

**Parameters:**
- `error`: The error object to analyze
- `context` (optional): Additional context about where the error occurred

**Returns:** Promise resolving to error analysis with solutions

**Example:**
```typescript
try {
  await analyzer.analyzeFile('./problematic-file.ts');
} catch (error) {
  const errorAnalysis = await diagnosticTool.analyzeError(error, {
    filePath: './problematic-file.ts',
    operation: 'file-analysis'
  });

  console.log(`Error Type: ${errorAnalysis.errorType}`);
  console.log(`Root Cause: ${errorAnalysis.rootCause}`);
  console.log(`Solutions: ${errorAnalysis.solutions.join('\n- ')}`);
}
```

**Error Analysis Features:**
- **Root Cause Detection**: Identifies underlying causes beyond surface errors
- **Solution Recommendations**: Actionable steps to resolve the issue
- **Impact Assessment**: Severity and scope of the error
- **Prevention Suggestions**: Ways to prevent similar errors in the future

#### `analyzePerformanceMetrics(metrics: PerformanceMetrics): PerformanceInsights`

Analyzes performance metrics to identify optimization opportunities.

**Parameters:**
- `metrics`: Performance metrics from analyzer operations

**Returns:** Performance insights with optimization recommendations

**Example:**
```typescript
const analyzer = new TypeScriptAnalyzer({ enablePerformanceTracking: true });
await analyzer.analyzeFile('./src/index.ts');

const metrics = analyzer.getPerformanceMetrics();
const insights = diagnosticTool.analyzePerformanceMetrics(metrics);

console.log(`Overall Score: ${insights.overallScore}/100`);
insights.optimizations.forEach(opt => {
  console.log(`- ${opt.description} (Impact: ${opt.impact})`);
});
```

#### `analyzeResourceUsage(resourceMetrics: ResourceMetrics): ResourceInsights`

Analyzes resource usage patterns and provides optimization recommendations.

**Parameters:**
- `resourceMetrics`: Resource metrics from batch operations

**Returns:** Resource usage insights and recommendations

**Example:**
```typescript
const batchAnalyzer = new BatchAnalyzer(analyzer, { enableResourceMonitoring: true });
await batchAnalyzer.processBatch(files);

const resourceMetrics = batchAnalyzer.getResourceMetrics();
const insights = diagnosticTool.analyzeResourceUsage(resourceMetrics);

console.log(`Memory Efficiency: ${insights.memoryEfficiency}%`);
console.log(`CPU Utilization: ${insights.cpuUtilization}%`);
```

### Advanced Diagnostic Methods

#### `runSystemDiagnostics(options?: DiagnosticOptions): Promise<ComprehensiveDiagnosticReport>`

Runs comprehensive system diagnostics with customizable depth and scope.

**Parameters:**
- `options` (optional): Diagnostic configuration options
  - `includePerformanceTests`: Run performance benchmarks
  - `analyzeMemoryLeaks`: Check for memory leaks
  - `validateDependencies`: Verify all dependencies
  - `checkFileSystem`: Validate file system permissions

**Example:**
```typescript
const fullReport = await diagnosticTool.runSystemDiagnostics({
  includePerformanceTests: true,
  analyzeMemoryLeaks: true,
  validateDependencies: true
});

console.log(`Overall Health Score: ${fullReport.healthScore}/100`);
console.log(`Critical Issues: ${fullReport.criticalIssues.length}`);
```

#### `generatePerformanceBenchmark(): Promise<BenchmarkReport>`

Generates detailed performance benchmarks for the current system.

**Returns:** Promise resolving to benchmark report with comparative analysis

**Example:**
```typescript
const benchmark = await diagnosticTool.generatePerformanceBenchmark();

console.log(`Single File Analysis: ${benchmark.singleFileAnalysis.averageTime}ms`);
console.log(`Batch Processing (10 files): ${benchmark.batchProcessing.averageTime}ms`);
console.log(`Memory Efficiency: ${benchmark.memoryEfficiency.score}/100`);
```

## 🐛 DebugHelper Class

The `DebugHelper` class provides debugging utilities and detailed analysis logging.

### Constructor

```typescript
import { DebugHelper } from 'dependency-linker/api/errors';

const debugHelper = new DebugHelper();
```

### Debug Methods

#### `logAnalysisDetails(result: AnalysisResult, options?: DebugOptions): void`

Logs detailed analysis information for debugging purposes.

**Parameters:**
- `result`: Analysis result to debug
- `options` (optional): Debug logging options
  - `includeMetrics`: Include performance metrics
  - `includeSourceDetails`: Include source code snippets
  - `verboseMode`: Enable verbose debugging output

**Example:**
```typescript
const result = await analyzer.analyzeFile('./src/index.ts');

debugHelper.logAnalysisDetails(result, {
  includeMetrics: true,
  includeSourceDetails: true,
  verboseMode: process.env.DEBUG === 'true'
});
```

#### `generateDetailedReport(analysis: AnalysisResult): DetailedDebugReport`

Generates comprehensive debug report with all available analysis details.

**Example:**
```typescript
const detailedReport = debugHelper.generateDetailedReport(result);

console.log('=== Analysis Debug Report ===');
console.log(`File: ${detailedReport.filePath}`);
console.log(`Dependencies: ${detailedReport.dependencies.length}`);
console.log(`Parse Time: ${detailedReport.performance.parseTime}ms`);
console.log(`Memory Usage: ${detailedReport.performance.memoryUsage}MB`);
```

#### `traceExecutionPath(operationName: string, callback: () => Promise<T>): Promise<T>`

Traces execution path for debugging complex operations.

**Example:**
```typescript
const result = await debugHelper.traceExecutionPath('file-analysis', async () => {
  return await analyzer.analyzeFile('./complex-file.ts');
});

// Automatically logs execution timing and call stack information
```

## 📊 Error Reporter

The error reporting system provides comprehensive error tracking and analysis.

### `errorReporter.reportError(error: Error, options?: ErrorReportOptions): void`

Reports errors with comprehensive context and analysis.

**Parameters:**
- `error`: Error to report
- `options` (optional): Error reporting options
  - `context`: Additional context about the error
  - `severity`: Error severity level ('low', 'medium', 'high', 'critical')
  - `includeStackTrace`: Include full stack trace
  - `notifyAdmin`: Send notification for critical errors

**Example:**
```typescript
import { errorReporter } from 'dependency-linker/api/errors';

try {
  await riskyOperation();
} catch (error) {
  errorReporter.reportError(error, {
    context: {
      operation: 'file-analysis',
      filePath: './src/problematic.ts',
      userId: 'system'
    },
    severity: 'high',
    includeStackTrace: true
  });

  throw error; // Re-throw if needed
}
```

## 🎯 Best Practices

### Performance Monitoring

1. **Regular Health Checks**: Run system health checks before processing large batches
```typescript
const health = await diagnosticTool.getSystemHealth();
if (health.issues.some(issue => issue.severity === 'critical')) {
  throw new Error('System not ready for batch processing');
}
```

2. **Performance Baseline**: Establish performance baselines for your typical workloads
```typescript
const baseline = await diagnosticTool.generatePerformanceBenchmark();
// Store baseline for future comparisons
```

3. **Resource Monitoring**: Monitor resource usage during long-running operations
```typescript
const batchAnalyzer = new BatchAnalyzer(analyzer, {
  enableResourceMonitoring: true,
  maxMemoryUsage: 500 * 1024 * 1024 // 500MB limit
});
```

### Error Handling and Debugging

1. **Structured Error Analysis**: Use diagnostic tools for systematic error analysis
```typescript
catch (error) {
  const analysis = await diagnosticTool.analyzeError(error, { filePath, operation });
  logger.error(`Error analysis: ${analysis.rootCause}`, {
    solutions: analysis.solutions,
    impact: analysis.impact
  });
}
```

2. **Debug Mode**: Enable detailed debugging in development environments
```typescript
if (process.env.NODE_ENV === 'development') {
  debugHelper.logAnalysisDetails(result, { verboseMode: true });
}
```

3. **Proactive Issue Detection**: Use health checks to detect issues before they cause failures
```typescript
setInterval(async () => {
  const health = await diagnosticTool.getSystemHealth();
  const criticalIssues = health.issues.filter(i => i.severity === 'critical');
  if (criticalIssues.length > 0) {
    logger.warn('Critical system issues detected', { issues: criticalIssues });
  }
}, 300000); // Check every 5 minutes
```

## 📈 Performance Benchmarks

Based on comprehensive testing across different system configurations:

### DiagnosticTool Performance

| Operation | Small Files | Medium Files | Large Files |
|-----------|-------------|--------------|-------------|
| `analyzePerformance()` | < 10ms | < 50ms | < 200ms |
| `getSystemHealth()` | < 100ms | < 100ms | < 100ms |
| `analyzeError()` | < 5ms | < 5ms | < 5ms |
| `runSystemDiagnostics()` | < 500ms | < 1s | < 2s |

### Memory Usage

- **DiagnosticTool**: < 5MB additional overhead
- **DebugHelper**: < 2MB with verbose logging
- **Error Reporter**: < 1MB for error context storage

### Recommended Usage Patterns

1. **Production**: Run health checks every 5-10 minutes
2. **Development**: Enable detailed debugging and error analysis
3. **CI/CD**: Include diagnostic validation in build pipelines
4. **Monitoring**: Integrate with application monitoring systems

## 🔧 Integration Examples

### Express.js Health Check Endpoint

```typescript
import express from 'express';
import { DiagnosticTool } from 'dependency-linker/api/errors';

const app = express();
const analyzer = new TypeScriptAnalyzer();
const diagnostics = new DiagnosticTool(analyzer);

app.get('/health', async (req, res) => {
  try {
    const health = await diagnostics.getSystemHealth();
    const status = health.healthChecks.every(check => check.status === 'healthy') ? 200 : 503;

    res.status(status).json({
      status: status === 200 ? 'healthy' : 'unhealthy',
      timestamp: health.timestamp,
      checks: health.healthChecks,
      recommendations: health.recommendations
    });
  } catch (error) {
    res.status(500).json({ error: 'Health check failed' });
  }
});
```

### Automated Error Analysis

```typescript
import { DiagnosticTool, errorReporter } from 'dependency-linker/api/errors';

class EnhancedAnalyzer extends TypeScriptAnalyzer {
  private diagnostics = new DiagnosticTool(this);

  async analyzeFileWithDiagnostics(filePath: string) {
    try {
      const result = await this.analyzeFile(filePath);

      // Analyze performance if slow
      const metrics = this.getPerformanceMetrics();
      if (metrics.averageParseTime > 100) {
        const perfAnalysis = await this.diagnostics.analyzePerformance(filePath);
        console.warn('Slow parsing detected:', perfAnalysis.recommendations);
      }

      return result;
    } catch (error) {
      const errorAnalysis = await this.diagnostics.analyzeError(error, { filePath });

      errorReporter.reportError(error, {
        context: { filePath, analysis: errorAnalysis },
        severity: errorAnalysis.severity,
        includeStackTrace: true
      });

      throw error;
    }
  }
}
```