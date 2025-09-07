/**
 * Validate Command - Schema and configuration validation CLI
 * Provides comprehensive validation with TypeScript SDK compatibility
 */

import { Command } from 'commander';
import * as path from 'path';
import { getServiceContainer } from '../../infrastructure/container/ServiceContainer.js';
import type { IConfigurationService } from '../../domain/interfaces/IConfigurationService.js';
import type { INotionApiService } from '../../domain/interfaces/INotionApiService.js';
import { UnifiedValidationService } from '../../services/validation/index.js';
import { DiagnosticService } from '../../services/validation/DiagnosticService.js';
import { InteractiveResolutionAssistant } from '../../services/validation/InteractiveResolutionAssistant.js';
import { ValidationMonitoringService } from '../../services/validation/ValidationMonitoringService.js';
import { logger } from '../../shared/utils/index.js';
import type { SchemaValidationReport, ValidationError } from '../../shared/types/index.js';

export function createValidateCommand(): Command {
  const validateCmd = new Command('validate');
  
  validateCmd
    .description('Advanced validation with diagnostics and interactive resolution')
    .option('-d, --database <id>', 'Validate specific database by ID')
    .option('-s, --system', 'Validate entire system')
    .option('-c, --config', 'Validate configuration consistency only')
    .option('--export <path>', 'Export validation results to directory')
    .option('--auto-fix', 'Apply auto-fixes (use with --dry-run first)')
    .option('--dry-run', 'Show what would be fixed without making changes')
    .option('--watch', 'Watch for changes and re-validate')
    .option('--format <format>', 'Output format (table|json|summary)', 'table')
    .option('--interactive', 'Start interactive resolution assistant for issues')
    .option('--diagnostics', 'Show detailed diagnostics and resolution guides')
    .option('--health', 'Generate comprehensive health report')
    .option('--dashboard', 'Show monitoring dashboard')
    .option('--monitor', 'Enable continuous monitoring')
    .option('--alert-threshold <value>', 'Set custom alert thresholds')
    .option('--verbose', 'Enable verbose diagnostic output')
    .action(async (options) => {
      try {
        await handleValidateCommand(options);
      } catch (error) {
        logger.error(`❌ Validation failed: ${error}`);
        process.exit(1);
      }
    });

  return validateCmd;
}

async function handleValidateCommand(options: any): Promise<void> {
  logger.info('🔍 Starting advanced validation process...');

  // Initialize services through dependency injection
  const container = getServiceContainer();
  const configService = container.resolve<IConfigurationService>('configurationService');
  const config = await configService.loadAndProcessConfig(process.cwd());
  
  if (!config.apiKey) {
    throw new Error('Notion API key not found. Please configure your API key first.');
  }

  // Create standardized Notion service through DI
  const notionApiService = container.resolve<INotionApiService>('notionApiService');
  const notionClient = container.createNotionClient(config.apiKey); // For compatibility with existing validation services
  
  const validationService = new UnifiedValidationService({
    notionClient,
    configManager: configService, // Use the dependency-injected config service
    projectPath: process.cwd(),
    enableAutoFix: options.autoFix || false
  });

  // Initialize advanced services
  const diagnosticService = new DiagnosticService(notionClient, configService);
  const monitoringService = new ValidationMonitoringService('./monitoring');
  const interactiveAssistant = new InteractiveResolutionAssistant(diagnosticService);

  // Handle advanced features first
  if (options.health) {
    await showHealthReport(diagnosticService, monitoringService);
    return;
  }

  if (options.dashboard) {
    await showMonitoringDashboard(monitoringService);
    return;
  }

  if (options.monitor) {
    await enableContinuousMonitoring(monitoringService, options);
    return;
  }

  // Handle different validation modes with enhanced features
  let validationResults: any = null;
  const startTime = Date.now();

  if (options.database) {
    validationResults = await validateSpecificDatabaseAdvanced(
      validationService, diagnosticService, options
    );
  } else if (options.config) {
    validationResults = await validateConfigurationAdvanced(
      validationService, diagnosticService, options
    );
  } else if (options.system || (!options.database && !options.config)) {
    validationResults = await validateSystemAdvanced(
      validationService, diagnosticService, options
    );
  }

  const duration = Date.now() - startTime;

  // Record metrics
  if (validationResults) {
    await monitoringService.recordValidationMetrics(
      'system',
      validationResults,
      duration,
      { environment: config.environment }
    );
  }

  // Handle interactive resolution
  if (options.interactive && validationResults) {
    await handleInteractiveResolution(
      validationResults, interactiveAssistant, options
    );
  }

  // Handle diagnostics
  if (options.diagnostics && validationResults) {
    await showDetailedDiagnostics(diagnosticService, validationResults);
  }

  // Handle exports
  if (options.export) {
    await validationService.exportValidationData(options.export);
    await monitoringService.exportMonitoringData(
      path.join(options.export, 'monitoring-data.json')
    );
  }

  // Handle auto-fix
  if (options.autoFix || options.dryRun) {
    const fixResults = await validationService.autoFixIssues(options.dryRun);
    displayAutoFixResults(fixResults, options.dryRun);
  }

  // Handle watch mode
  if (options.watch) {
    await enableWatchMode(validationService, options);
  }

  // Cleanup
  interactiveAssistant.close();
}

/**
 * Validate specific database
 */
async function validateSpecificDatabase(
  validationService: UnifiedValidationService,
  options: any
): Promise<void> {
  logger.info(`🎯 Validating database: ${options.database}`);

  const report = await validationService.validateDatabase(options.database);
  
  if (options.format === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else if (options.format === 'summary') {
    displayValidationSummary({ [options.database]: report });
  } else {
    displayValidationTable({ [options.database]: report });
  }
}

/**
 * Validate configuration only
 */
async function validateConfigurationOnly(
  validationService: UnifiedValidationService,
  options: any
): Promise<void> {
  logger.info('⚙️ Validating configuration consistency...');

  const systemValidation = await validationService.validateSystem();
  const configResult = systemValidation.configurationConsistency;

  if (options.format === 'json') {
    console.log(JSON.stringify(configResult, null, 2));
  } else {
    displayConfigurationValidation(configResult);
  }
}

/**
 * Validate entire system
 */
async function validateSystem(
  validationService: UnifiedValidationService,
  options: any
): Promise<void> {
  logger.info('🚀 Validating entire system...');

  const result = await validationService.validateSystem();

  if (options.format === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else if (options.format === 'summary') {
    displaySystemSummary(result);
  } else {
    displayValidationTable(result.schemaReports);
    displayConfigurationValidation(result.configurationConsistency);
    displaySystemSummary(result);
  }
}

/**
 * Display validation results in table format
 */
function displayValidationTable(reports: Record<string, SchemaValidationReport>): void {
  console.log('\n📊 Database Validation Results:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Header
  console.log('Database Name'.padEnd(20) + 
              'Status'.padEnd(12) + 
              'Errors'.padEnd(8) + 
              'Warnings'.padEnd(10) + 
              'Last Validated');
  console.log('─'.repeat(88));

  // Data rows
  for (const [dbName, report] of Object.entries(reports)) {
    const statusEmoji = {
      'healthy': '✅',
      'warning': '⚠️',
      'critical': '🚨'
    };

    const totalErrors = [
      report.schemaConsistency,
      report.propertyMappings,
      report.configurationSync,
      report.runtimeValidation
    ].reduce((total, result) => total + result.errors.length, 0);

    const totalWarnings = [
      report.schemaConsistency,
      report.propertyMappings,
      report.configurationSync,
      report.runtimeValidation
    ].reduce((total, result) => total + result.warnings.length, 0);

    const status = `${statusEmoji[report.overallStatus]} ${report.overallStatus}`;
    const lastValidated = report.lastValidated.toLocaleString();

    console.log(
      dbName.padEnd(20) +
      status.padEnd(12) +
      totalErrors.toString().padEnd(8) +
      totalWarnings.toString().padEnd(10) +
      lastValidated
    );
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

/**
 * Display validation summary
 */
function displayValidationSummary(reports: Record<string, SchemaValidationReport>): void {
  const reportValues = Object.values(reports);
  const healthyCount = reportValues.filter(r => r.overallStatus === 'healthy').length;
  const warningCount = reportValues.filter(r => r.overallStatus === 'warning').length;
  const criticalCount = reportValues.filter(r => r.overallStatus === 'critical').length;

  console.log('\n📈 Validation Summary:');
  console.log(`   Total Databases: ${reportValues.length}`);
  console.log(`   ✅ Healthy: ${healthyCount}`);
  console.log(`   ⚠️  Warning: ${warningCount}`);
  console.log(`   🚨 Critical: ${criticalCount}`);
}

/**
 * Display configuration validation results
 */
function displayConfigurationValidation(configResult: any): void {
  console.log('\n⚙️ Configuration Validation:');
  
  if (configResult.valid) {
    console.log('   ✅ Configuration is consistent');
  } else {
    console.log(`   ❌ Found ${configResult.errors.length} errors`);
    
    if (configResult.errors.length > 0) {
      console.log('\n   Errors:');
      configResult.errors.forEach((error: any, index: number) => {
        console.log(`     ${index + 1}. ${error.message}`);
        if (error.suggestedFix) {
          console.log(`        💡 Fix: ${error.suggestedFix}`);
        }
      });
    }
    
    if (configResult.warnings.length > 0) {
      console.log('\n   Warnings:');
      configResult.warnings.forEach((warning: any, index: number) => {
        console.log(`     ${index + 1}. ${warning.message}`);
      });
    }
  }
}

/**
 * Display system summary
 */
function displaySystemSummary(result: any): void {
  const { summary, overallHealth } = result;
  
  const healthEmoji = {
    'healthy': '✅',
    'warning': '⚠️',
    'critical': '🚨'
  };

  console.log('\n🎯 Overall System Health:');
  console.log(`   ${healthEmoji[overallHealth]} Status: ${overallHealth.toUpperCase()}`);
  console.log(`   📊 Summary:`);
  console.log(`     Total Databases: ${summary.totalDatabases}`);
  console.log(`     Healthy: ${summary.healthyDatabases}`);
  console.log(`     Warning: ${summary.warningDatabases}`);
  console.log(`     Critical: ${summary.criticalDatabases}`);
  console.log(`     Total Errors: ${summary.totalErrors}`);
  console.log(`     Total Warnings: ${summary.totalWarnings}`);
}

/**
 * Display auto-fix results
 */
function displayAutoFixResults(results: any, isDryRun: boolean): void {
  const mode = isDryRun ? 'Analysis' : 'Execution';
  
  console.log(`\n🔧 Auto-Fix ${mode} Results:`);
  console.log(`   Fixable Issues: ${results.fixable}`);
  
  if (!isDryRun) {
    console.log(`   Successfully Fixed: ${results.fixed}`);
    console.log(`   Failed to Fix: ${results.failed}`);
  }
  
  if (results.details.length > 0) {
    console.log('\n   Details:');
    results.details.slice(0, 10).forEach((detail: string, index: number) => {
      console.log(`     ${index + 1}. ${detail}`);
    });
    
    if (results.details.length > 10) {
      console.log(`     ... and ${results.details.length - 10} more`);
    }
  }
}

/**
 * Enable watch mode
 */
async function enableWatchMode(
  validationService: UnifiedValidationService,
  options: any
): Promise<void> {
  console.log('\n👀 Watch mode enabled - Press Ctrl+C to stop');
  
  // Simple polling implementation
  setInterval(async () => {
    try {
      logger.info('🔄 Re-validating...');
      await validateSystem(validationService, { ...options, watch: false });
    } catch (error) {
      logger.error(`Watch validation error: ${error}`);
    }
  }, 60000); // Check every minute

  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('\n👋 Watch mode stopped');
    process.exit(0);
  });
}

/**
 * Enhanced validation functions with diagnostics
 */

async function validateSpecificDatabaseAdvanced(
  validationService: UnifiedValidationService,
  diagnosticService: DiagnosticService,
  options: any
): Promise<SchemaValidationReport> {
  logger.info(`🎯 Advanced validation for database: ${options.database}`);

  const report = await validationService.validateDatabase(options.database);
  
  // Run comprehensive diagnostics
  const diagnostics = await diagnosticService.runComprehensiveDiagnostics();
  
  if (options.format === 'json') {
    console.log(JSON.stringify({ report, diagnostics }, null, 2));
  } else if (options.format === 'summary') {
    displayValidationSummary({ [options.database]: report });
    displayDiagnosticSummary(diagnostics);
  } else {
    displayValidationTable({ [options.database]: report });
    if (options.verbose) {
      displayDiagnosticSummary(diagnostics);
    }
  }

  return report;
}

async function validateConfigurationAdvanced(
  validationService: UnifiedValidationService,
  diagnosticService: DiagnosticService,
  options: any
): Promise<any> {
  logger.info('⚙️ Advanced configuration validation...');

  const systemValidation = await validationService.validateSystem();
  const configResult = systemValidation.configurationConsistency;

  // Enhanced diagnostics for configuration issues
  const diagnostics = await diagnosticService.runComprehensiveDiagnostics();

  if (options.format === 'json') {
    console.log(JSON.stringify({ configResult, diagnostics }, null, 2));
  } else {
    displayConfigurationValidation(configResult);
    if (options.verbose) {
      displayDiagnosticSummary(diagnostics);
    }
  }

  return configResult;
}

async function validateSystemAdvanced(
  validationService: UnifiedValidationService,
  diagnosticService: DiagnosticService,
  options: any
): Promise<any> {
  logger.info('🚀 Advanced system validation...');

  const result = await validationService.validateSystem();
  const diagnostics = await diagnosticService.runComprehensiveDiagnostics();

  if (options.format === 'json') {
    console.log(JSON.stringify({ result, diagnostics }, null, 2));
  } else if (options.format === 'summary') {
    displaySystemSummary(result);
    displayDiagnosticSummary(diagnostics);
  } else {
    displayValidationTable(result.schemaReports);
    displayConfigurationValidation(result.configurationConsistency);
    displaySystemSummary(result);
    if (options.verbose) {
      displayDiagnosticSummary(diagnostics);
    }
  }

  return result;
}

async function showHealthReport(
  diagnosticService: DiagnosticService,
  monitoringService: ValidationMonitoringService
): Promise<void> {
  console.log('🏥 Generating Comprehensive Health Report...\n');

  const healthReport = await monitoringService.generateHealthReport();
  const diagnostics = await diagnosticService.runComprehensiveDiagnostics();

  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('🎯 SYSTEM HEALTH REPORT');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════\n');

  // Overall health status
  const statusEmoji = {
    'healthy': '✅',
    'degraded': '⚠️',
    'critical': '🚨'
  };

  console.log(`${statusEmoji[healthReport.overall]} Overall System Health: ${healthReport.overall.toUpperCase()}\n`);

  // Component health breakdown
  console.log('📊 Component Health Status:');
  console.log('─'.repeat(80));
  
  healthReport.components.forEach(component => {
    console.log(`${statusEmoji[component.status]} ${component.name.padEnd(30)} ${component.status.toUpperCase()}`);
    
    if (component.metrics && Object.keys(component.metrics).length > 0) {
      console.log(`   Metrics: ${JSON.stringify(component.metrics)}`);
    }
    
    if (component.issues.length > 0) {
      console.log(`   Issues:`);
      component.issues.forEach(issue => console.log(`     • ${issue}`));
    }
    console.log();
  });

  // Recommendations
  if (healthReport.recommendations.length > 0) {
    console.log('💡 Health Recommendations:');
    healthReport.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    console.log();
  }

  // System diagnostics overview
  console.log('🔍 System Diagnostics Overview:');
  console.log(`   Total Issues Found: ${diagnostics.detailedDiagnostics.length}`);
  console.log(`   Critical Issues: ${diagnostics.detailedDiagnostics.filter(d => d.severity === 'critical').length}`);
  console.log(`   Active Alerts: ${diagnostics.healthChecks.reduce((sum, check) => sum + check.issues.length, 0)}`);
  console.log(`   System Health: ${diagnostics.overview.systemHealth.toUpperCase()}`);
}

async function showMonitoringDashboard(
  monitoringService: ValidationMonitoringService
): Promise<void> {
  console.log('📊 Validation Monitoring Dashboard\n');

  const dashboard = await monitoringService.generateDashboard();

  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('📈 MONITORING DASHBOARD');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════\n');

  // Summary metrics
  console.log('📊 Summary Metrics:');
  console.log(`   Total Validations (24h): ${dashboard.summary.totalValidations}`);
  console.log(`   Success Rate: ${Math.round(dashboard.summary.successRate * 100)}%`);
  console.log(`   Average Response Time: ${Math.round(dashboard.summary.averageResponseTime)}ms`);
  console.log(`   System Health: ${dashboard.summary.systemHealth.toUpperCase()}`);
  console.log(`   Last Updated: ${dashboard.summary.lastUpdate.toLocaleString()}\n`);

  // Active alerts
  if (dashboard.activeAlerts.length > 0) {
    console.log('🚨 Active Alerts:');
    dashboard.activeAlerts.forEach(alert => {
      const emoji = alert.severity === 'critical' ? '🔴' : 
                   alert.severity === 'warning' ? '🟡' : '🔵';
      console.log(`   ${emoji} ${alert.title}`);
      console.log(`      ${alert.message}`);
      console.log(`      Source: ${alert.source} | ${alert.timestamp.toLocaleString()}`);
    });
    console.log();
  }

  // Recent validations
  console.log('🕐 Recent Validations:');
  dashboard.recentValidations.slice(-5).forEach(validation => {
    const status = validation.success ? '✅' : '❌';
    console.log(`   ${status} ${validation.validationType} | ${validation.duration}ms | ${validation.errorCount} errors`);
  });
  console.log();

  // Trends
  if (dashboard.trends.daily.length > 0) {
    console.log('📈 Daily Trends (Last 7 Days):');
    dashboard.trends.daily.slice(-7).forEach(trend => {
      const successPercent = Math.round(trend.successRate * 100);
      console.log(`   ${trend.date}: ${successPercent}% success, ${Math.round(trend.averageResponseTime)}ms avg`);
    });
  }
}

async function enableContinuousMonitoring(
  monitoringService: ValidationMonitoringService,
  options: any
): Promise<void> {
  console.log('📡 Enabling Continuous Monitoring...\n');
  
  const intervalMinutes = parseInt(options.alertThreshold) || 15;
  
  console.log(`🔄 Starting automated monitoring (every ${intervalMinutes} minutes)`);
  console.log('📊 Dashboard updates every 5 minutes');
  console.log('🚨 Alerts will be generated automatically');
  console.log('Press Ctrl+C to stop monitoring\n');

  // Setup automated monitoring
  monitoringService.setupAutomatedMonitoring(intervalMinutes);

  // Show periodic dashboard updates
  const dashboardInterval = setInterval(async () => {
    console.clear();
    await showMonitoringDashboard(monitoringService);
  }, 5 * 60 * 1000); // Every 5 minutes

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    clearInterval(dashboardInterval);
    console.log('\n👋 Continuous monitoring stopped');
    process.exit(0);
  });

  // Keep process alive
  await new Promise(() => {});
}

async function handleInteractiveResolution(
  validationResults: any,
  interactiveAssistant: InteractiveResolutionAssistant,
  options: any
): Promise<void> {
  console.log('\n🤖 Starting Interactive Resolution Assistant...\n');

  // Find errors to resolve
  const errors: ValidationError[] = [];
  
  if (validationResults.configurationConsistency?.errors) {
    errors.push(...validationResults.configurationConsistency.errors);
  }
  
  if (validationResults.schemaReports) {
    for (const report of Object.values(validationResults.schemaReports) as any[]) {
      // Safe access with optional chaining and array checks
      if (report.schemaConsistency?.errors && Array.isArray(report.schemaConsistency.errors)) {
        errors.push(...report.schemaConsistency.errors);
      }
      if (report.propertyMappings?.errors && Array.isArray(report.propertyMappings.errors)) {
        errors.push(...report.propertyMappings.errors);
      }
      if (report.configurationSync?.errors && Array.isArray(report.configurationSync.errors)) {
        errors.push(...report.configurationSync.errors);
      }
      if (report.runtimeValidation?.errors && Array.isArray(report.runtimeValidation.errors)) {
        errors.push(...report.runtimeValidation.errors);
      }
    }
  }

  if (errors.length === 0) {
    console.log('✅ No errors found that require interactive resolution.');
    return;
  }

  console.log(`Found ${errors.length} errors that can be resolved interactively.\n`);

  for (let i = 0; i < errors.length; i++) {
    const error = errors[i];
    console.log(`\n📋 Resolving Error ${i + 1}/${errors.length}: ${error.message}\n`);

    try {
      await interactiveAssistant.startInteractiveResolution(error, {
        verboseMode: options.verbose,
        dryRun: options.dryRun,
        skipConfirmation: false
      });
    } catch (resolutionError) {
      console.error(`Failed to resolve error: ${resolutionError}`);
    }
  }
}

async function showDetailedDiagnostics(
  diagnosticService: DiagnosticService,
  validationResults: any
): Promise<void> {
  console.log('\n🔬 Detailed Diagnostic Analysis\n');

  const diagnostics = await diagnosticService.runComprehensiveDiagnostics();

  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('🔍 DIAGNOSTIC ANALYSIS REPORT');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════\n');

  // Health checks
  console.log('🏥 System Health Checks:');
  diagnostics.healthChecks.forEach(check => {
    const statusEmoji = {
      'healthy': '✅',
      'degraded': '⚠️',
      'unhealthy': '❌',
      'unknown': '❓'
    };

    console.log(`   ${statusEmoji[check.status]} ${check.component}: ${check.status.toUpperCase()}`);
    
    if (check.metrics.responseTime) {
      console.log(`      Response Time: ${check.metrics.responseTime}ms`);
    }
    if (check.metrics.availability) {
      console.log(`      Availability: ${check.metrics.availability}%`);
    }
    
    if (check.issues.length > 0) {
      console.log('      Issues:');
      check.issues.forEach(issue => console.log(`        • ${issue}`));
    }
    
    if (check.recommendations.length > 0) {
      console.log('      Recommendations:');
      check.recommendations.forEach(rec => console.log(`        → ${rec}`));
    }
    console.log();
  });

  // Detailed diagnostics for specific issues
  if (diagnostics.detailedDiagnostics.length > 0) {
    console.log('🚨 Issue Analysis & Resolution Guides:');
    
    diagnostics.detailedDiagnostics.forEach((diagnostic, index) => {
      console.log(`\n   ${index + 1}. ${diagnostic.title} (${diagnostic.severity.toUpperCase()})`);
      console.log(`      ${diagnostic.description}`);
      
      console.log('      Root Cause:');
      console.log(`        • ${diagnostic.rootCause.primary}`);
      
      if (diagnostic.resolution.quickFix) {
        console.log('      Quick Fix Available:');
        console.log(`        ${diagnostic.resolution.quickFix.description}`);
        console.log(`        Risk Level: ${diagnostic.resolution.quickFix.riskLevel}`);
        console.log(`        Estimated Time: ${diagnostic.resolution.quickFix.estimatedTime}`);
      }
      
      console.log(`      Resolution Steps: ${diagnostic.resolution.detailedSteps.length} steps`);
      console.log(`      Confidence Level: ${Math.round(diagnostic.diagnosticData.confidence * 100)}%`);
    });
  }

  // Recommendations
  if (diagnostics.recommendations.immediate.length > 0) {
    console.log('\n💡 Immediate Action Items:');
    diagnostics.recommendations.immediate.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }

  if (diagnostics.recommendations.shortTerm.length > 0) {
    console.log('\n📅 Short-term Improvements:');
    diagnostics.recommendations.shortTerm.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }
}

function displayDiagnosticSummary(diagnostics: any): void {
  console.log('\n🔬 Diagnostic Summary:');
  console.log(`   System Health: ${diagnostics.overview.systemHealth.toUpperCase()}`);
  console.log(`   Issues Found: ${diagnostics.overview.totalIssues}`);
  console.log(`   Critical Issues: ${diagnostics.overview.criticalIssues}`);
  console.log(`   Health Checks: ${diagnostics.healthChecks.filter((c: any) => c.status === 'healthy').length}/${diagnostics.healthChecks.length} healthy`);
}