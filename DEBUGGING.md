# Error Reporting and Debugging Guide

## 📊 Overview

The TypeScript File Analyzer now includes a comprehensive error reporting and debugging system designed to help developers diagnose issues, monitor performance, and maintain system health.

## 🔧 System Architecture

### Core Components

1. **ErrorReporter**: Comprehensive error tracking with context and diagnostic information
2. **DebugHelper**: Performance tracking, file analysis diagnostics, and debug utilities
3. **DiagnosticTool**: System health monitoring, benchmarking, and comprehensive reporting

## 🚀 Quick Start

### API Usage

```typescript
import { 
  TypeScriptAnalyzer, 
  DiagnosticTool,
  DebugHelper,
  errorReporter 
} from 'tree-sitter-analyzer';

// Create analyzer with enhanced error reporting
const analyzer = new TypeScriptAnalyzer();

// Enable debug mode
analyzer.setDebugMode(true);

// Run system health check
const health = await analyzer.getSystemHealth();
console.log(`System Status: ${health.status} (${health.score}/100)`);

// Analyze file with detailed diagnostics
const diagnosis = await analyzer.diagnoseFileAnalysis('./src/example.ts');
console.log('Success:', diagnosis.success);
console.log('Recommendations:', diagnosis.diagnostics.recommendations);
```

### CLI Usage

```bash
# System health check
npm run diagnostic health

# Comprehensive diagnostics
npm run diagnostic diagnose --format json

# Analyze specific file
npm run diagnostic analyze-file src/index.ts

# Performance benchmarks
npm run diagnostic benchmark

# Error statistics
npm run diagnostic errors

# Enable debug mode
npm run diagnostic debug on

# Generate debug report
npm run diagnostic debug-report

# Clear diagnostic data
npm run diagnostic clear
```

## 📋 Diagnostic Features

### System Health Monitoring

**Automated Health Checks**:
- Node.js version compatibility
- Memory usage monitoring
- File system access verification
- Parser availability testing
- Cache system functionality
- Core analyzer operations

```typescript
// Get system health
const health = await analyzer.getSystemHealth();

// Example output:
{
  status: 'healthy',
  score: 95,
  criticalIssues: [],
  summary: '6/6 components healthy'
}
```

### Error Tracking and Reporting

**Comprehensive Error Context**:
- Error categorization (parsing, analysis, io, resource, validation, system)
- Severity assessment (low, medium, high, critical)
- Contextual information (file path, operation, environment)
- Recovery suggestions and steps

```typescript
// Report custom error
const errorId = errorReporter.reportError(new Error('Custom error'), {
  filePath: './src/example.ts',
  operation: 'custom_operation'
});

// Get error statistics
const stats = errorReporter.getStatistics();
console.log(`Total errors: ${stats.totalErrors}`);
console.log(`Critical errors: ${stats.criticalErrors}`);
```

### Performance Analysis

**Built-in Benchmarking**:
- File analysis performance (small/medium/large files)
- Memory usage profiling
- Success rate monitoring
- Performance regression detection

```typescript
// Run performance benchmark
const results = await analyzer.benchmarkPerformance({
  iterations: 10,
  fileTypes: ['small', 'medium', 'large'],
  includeMemoryProfile: true
});

// Example results show 3-7ms analysis times
```

### File Analysis Diagnostics

**Detailed File Analysis**:
- File context gathering (size, encoding, line count)
- Parse failure analysis with suggestions
- Dependency pattern analysis
- Circular dependency detection

```typescript
// Diagnose specific file
const diagnosis = await analyzer.diagnoseFileAnalysis('./problematic-file.ts');

if (!diagnosis.success) {
  console.log('Error:', diagnosis.error.message);
  console.log('Possible causes:', diagnosis.error.analysis.possibleCauses);
  console.log('Suggestions:', diagnosis.error.analysis.suggestions);
}
```

## 🔍 Error Categories and Handling

### Error Categories

1. **Parsing Errors**
   - Syntax errors in TypeScript code
   - File encoding issues
   - Corrupted or truncated files

2. **Analysis Errors**  
   - Dependency resolution failures
   - Import/export analysis issues
   - Type information extraction problems

3. **I/O Errors**
   - File not found
   - Permission denied
   - Directory access issues

4. **Resource Errors**
   - Memory exhaustion
   - Timeout conditions
   - Resource allocation failures

5. **Validation Errors**
   - Invalid configuration
   - Parameter validation failures
   - Format specification errors

6. **System Errors**
   - Platform compatibility issues
   - Dependency problems
   - Environment configuration errors

### Error Severity Levels

- **Critical**: System functionality compromised, immediate action required
- **High**: Major functionality affected, should be addressed soon
- **Medium**: Performance or reliability impact, monitor and plan fixes
- **Low**: Minor issues, can be addressed during maintenance

## 📊 Debug Mode Features

### Debug Mode Capabilities

```typescript
// Enable debug mode
analyzer.setDebugMode(true);

// Automatic features when enabled:
// - Performance tracking for all operations
// - Detailed error context collection
// - Operation trace logging
// - Memory usage monitoring
// - Comprehensive debug reports
```

**Debug Traces**:
- Operation start/end timestamps
- Memory usage at key points
- Performance metrics
- Error context and stack traces
- Data flow analysis

**Performance Tracking**:
- Automatic operation timing
- Memory delta tracking
- Success/failure rates
- Resource utilization metrics

## 🛠️ Diagnostic Commands Reference

### CLI Commands

| Command | Description | Options |
|---------|-------------|---------|
| `health` | System health check | `--format json\|text` |
| `diagnose` | Comprehensive diagnostics | `--format json\|text` |
| `analyze-file <file>` | File analysis diagnostics | `--format json\|text` |
| `benchmark` | Performance benchmarks | `--format json\|text` |
| `errors` | Error statistics | `--format json\|text` |
| `debug-report` | Generate debug report | - |
| `debug <on\|off>` | Toggle debug mode | - |
| `clear` | Clear diagnostic data | - |

### API Methods

```typescript
// TypeScriptAnalyzer methods
analyzer.setDebugMode(enabled: boolean)
analyzer.getSystemHealth()
analyzer.getDiagnosticReport()
analyzer.diagnoseFileAnalysis(filePath: string)
analyzer.benchmarkPerformance(options?)
analyzer.exportDiagnostics(format: 'json'|'text')
analyzer.getErrorStatistics()
analyzer.generateDebugReport()
analyzer.clearDiagnosticData()

// Standalone utilities
DiagnosticTool.runComprehensiveDiagnostics()
DebugHelper.gatherFileContext(filePath)
DebugHelper.analyzeParseFailure(filePath, error)
errorReporter.reportError(error, context)
```

## 📈 Performance Monitoring

### Built-in Metrics

**Analysis Performance**:
- Parse time: 70-90% of total execution time
- Memory efficiency: Negative growth during processing
- Typical performance: 3-7ms for standard TypeScript files

**Memory Management**:
- Peak memory usage monitoring
- Memory delta tracking
- Garbage collection impact analysis
- Resource leak detection

**Success Rates**:
- Overall analysis success rate
- Error patterns and frequency
- Performance regression detection
- Resource utilization trends

### Performance Optimization

**Recommended Practices**:
- Monitor performance with `benchmarkPerformance()`
- Use batch processing for multiple files
- Enable caching for repeated operations
- Monitor memory usage in production

**Troubleshooting Performance Issues**:
1. Run benchmark to identify bottlenecks
2. Check system health for resource constraints
3. Enable debug mode for detailed analysis
4. Review error statistics for patterns

## 🚨 Troubleshooting Guide

### Common Issues and Solutions

**"Parser initialization failed"**
- Check tree-sitter and tree-sitter-typescript installation
- Verify native module compilation
- Review platform compatibility

**"Memory usage is high"**
- Reduce batch sizes
- Enable memory monitoring
- Check for memory leaks
- Increase available memory

**"Analysis took longer than expected"**
- Check file size and complexity
- Monitor system resource usage
- Consider file optimization
- Review timeout settings

**"Circular dependency detected"**
- Enable dependency analysis
- Review import/export patterns
- Refactor circular dependencies
- Use dependency visualization

### Getting Help

1. **Enable Debug Mode**: Get detailed information about operations
2. **Run Health Check**: Verify system components are working
3. **Check Error Statistics**: Review error patterns and frequency
4. **Generate Debug Report**: Comprehensive system state analysis
5. **File-Specific Diagnosis**: Analyze problematic files in detail

## 🔧 Configuration

### Debug Mode Configuration

```typescript
// Enable debug mode with custom settings
const analyzer = new TypeScriptAnalyzer({
  enableCache: true,
  logLevel: LogLevel.DEBUG // Show all debug information
});

// Enable enhanced error reporting
analyzer.setDebugMode(true);
```

### Production Monitoring

```typescript
// Production-friendly error monitoring
const analyzer = new TypeScriptAnalyzer({
  logLevel: LogLevel.WARN, // Reduce noise in production
  enableCache: true
});

// Monitor system health periodically
setInterval(async () => {
  const health = await analyzer.getSystemHealth();
  if (health.status !== 'healthy') {
    console.warn('System health issue detected:', health.criticalIssues);
  }
}, 300000); // Check every 5 minutes
```

## 🎯 Best Practices

### Development

1. **Enable Debug Mode**: During development for comprehensive insights
2. **Regular Health Checks**: Monitor system components regularly
3. **Performance Benchmarking**: Establish performance baselines
4. **Error Pattern Analysis**: Review and address common error patterns

### Production

1. **Health Monitoring**: Implement automated health checks
2. **Error Tracking**: Monitor error rates and patterns
3. **Performance Monitoring**: Track analysis performance over time
4. **Resource Management**: Monitor memory and CPU usage

### Debugging Workflow

1. **Reproduce Issue**: Use diagnostic tools to reproduce problems
2. **Gather Context**: Use debug mode and file diagnostics
3. **Analyze Patterns**: Review error statistics and traces
4. **Apply Fixes**: Implement targeted solutions
5. **Verify Resolution**: Re-run diagnostics to confirm fixes

## 📚 Advanced Usage

### Custom Error Reporting

```typescript
import { errorReporter, DebugHelper } from 'tree-sitter-analyzer';

// Report custom diagnostic
const errorId = errorReporter.reportDiagnostic(
  'analysis',
  'medium',
  'Custom analysis issue detected',
  { filePath: './src/example.ts' },
  ['Check file syntax', 'Review import statements']
);

// Add custom debug trace
DebugHelper.addTrace({
  timestamp: Date.now(),
  operation: 'custom_operation',
  phase: 'start',
  data: { customData: 'value' }
});
```

### Integration with Monitoring Systems

```typescript
// Export diagnostic data for external monitoring
const diagnostics = await analyzer.exportDiagnostics('json');
const report = JSON.parse(diagnostics);

// Send to monitoring system
await monitoringSystem.sendMetrics({
  timestamp: report.timestamp,
  systemHealth: report.performance.overallScore,
  errorCount: report.summary.totalErrors,
  memoryUsage: report.systemInfo.memoryUsage.heapUsed
});
```

## 🏆 Summary

The enhanced error reporting and debugging system provides:

- **Comprehensive Error Tracking**: Detailed context and recovery suggestions
- **System Health Monitoring**: Automated checks and performance metrics
- **Debug Mode**: Detailed tracing and analysis capabilities
- **Performance Benchmarking**: Built-in performance analysis and monitoring
- **CLI Integration**: Easy-to-use diagnostic commands
- **Production Ready**: Monitoring and alerting capabilities

This system enables developers to quickly diagnose issues, monitor system health, and maintain optimal performance in both development and production environments.