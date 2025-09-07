/**
 * Validation Monitoring Service - Advanced logging and monitoring for validation system
 * Provides comprehensive monitoring, alerting, and analytics for validation operations
 */

import { readFile, writeFile, appendFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { logger } from '../../shared/utils/index.js';
import type {
  ValidationResult,
  SchemaValidationReport,
  ValidationError,
  ValidationWarning
} from '../../shared/types/index.js';

export interface ValidationMetrics {
  timestamp: Date;
  validationId: string;
  validationType: 'schema' | 'configuration' | 'runtime' | 'system';
  databaseId?: string;
  databaseName?: string;
  duration: number; // milliseconds
  success: boolean;
  errorCount: number;
  warningCount: number;
  criticalIssues: number;
  performanceMetrics: {
    apiResponseTime?: number;
    memoryUsage: number;
    cpuUsage?: number;
  };
  environment: string;
  version: string;
}

export interface ValidationAlert {
  alertId: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  source: string;
  metadata: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
  escalated: boolean;
}

export interface TrendData {
  date: string;
  successRate: number;
  averageResponseTime: number;
  totalValidations: number;
  errorCount: number;
  warningCount: number;
}

export interface MonitoringDashboard {
  summary: {
    totalValidations: number;
    successRate: number;
    averageResponseTime: number;
    systemHealth: 'healthy' | 'degraded' | 'critical';
    lastUpdate: Date;
  };
  recentValidations: ValidationMetrics[];
  activeAlerts: ValidationAlert[];
  trends: {
    daily: TrendData[];
    weekly: TrendData[];
    monthly: TrendData[];
  };
  topIssues: {
    errorCode: string;
    count: number;
    lastOccurred: Date;
    description: string;
  }[];
}

export class ValidationMonitoringService {
  private metricsPath: string;
  private alertsPath: string;
  private logsPath: string;
  private metricsCache: ValidationMetrics[] = [];
  private alertsCache: ValidationAlert[] = [];
  private readonly maxCacheSize = 1000;
  private readonly alertThresholds = {
    errorRate: 0.1, // 10% error rate triggers alert
    responseTime: 5000, // 5 second response time triggers alert
    criticalIssues: 1, // Any critical issue triggers alert
    consecutiveFailures: 3 // 3 consecutive failures trigger alert
  };

  constructor(baseDir: string = './monitoring') {
    this.metricsPath = path.join(baseDir, 'metrics');
    this.alertsPath = path.join(baseDir, 'alerts');
    this.logsPath = path.join(baseDir, 'logs');
    
    this.initializeDirectories();
  }

  /**
   * Initialize monitoring directories
   */
  private async initializeDirectories(): Promise<void> {
    const dirs = [this.metricsPath, this.alertsPath, this.logsPath];
    
    for (const dir of dirs) {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * Record validation metrics
   */
  async recordValidationMetrics(
    validationType: ValidationMetrics['validationType'],
    result: ValidationResult | SchemaValidationReport,
    duration: number,
    context?: {
      databaseId?: string;
      databaseName?: string;
      environment?: string;
    }
  ): Promise<void> {
    const memUsage = process.memoryUsage();
    
    const metrics: ValidationMetrics = {
      timestamp: new Date(),
      validationId: `${validationType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      validationType,
      databaseId: context?.databaseId,
      databaseName: context?.databaseName,
      duration,
      success: this.determineValidationSuccess(result),
      errorCount: this.getErrorCount(result),
      warningCount: this.getWarningCount(result),
      criticalIssues: this.getCriticalIssueCount(result),
      performanceMetrics: {
        memoryUsage: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      },
      environment: context?.environment || process.env.NODE_ENV || 'unknown',
      version: '1.0.0'
    };

    // Add to cache
    this.metricsCache.push(metrics);
    
    // Maintain cache size
    if (this.metricsCache.length > this.maxCacheSize) {
      this.metricsCache.shift();
    }

    // Persist to file
    await this.persistMetrics(metrics);

    // Check for alert conditions
    await this.checkAlertConditions(metrics);

    logger.info(`📊 Validation metrics recorded: ${validationType} (${duration}ms, ${metrics.errorCount} errors)`);
  }

  /**
   * Create alert for monitoring conditions
   */
  async createAlert(
    severity: ValidationAlert['severity'],
    title: string,
    message: string,
    source: string,
    metadata: Record<string, any> = {}
  ): Promise<ValidationAlert> {
    const alert: ValidationAlert = {
      alertId: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      severity,
      title,
      message,
      timestamp: new Date(),
      source,
      metadata,
      resolved: false,
      escalated: false
    };

    this.alertsCache.push(alert);
    await this.persistAlert(alert);

    // Log alert based on severity
    switch (severity) {
      case 'critical':
        logger.error(`🚨 CRITICAL ALERT: ${title} - ${message}`);
        break;
      case 'warning':
        logger.warning(`⚠️ WARNING: ${title} - ${message}`);
        break;
      case 'info':
        logger.info(`ℹ️ INFO: ${title} - ${message}`);
        break;
    }

    return alert;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolutionNote?: string): Promise<boolean> {
    const alert = this.alertsCache.find(a => a.alertId === alertId);
    
    if (!alert) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();
    
    if (resolutionNote) {
      alert.metadata.resolutionNote = resolutionNote;
    }

    await this.persistAlert(alert);
    logger.info(`✅ Alert resolved: ${alert.title}`);
    
    return true;
  }

  /**
   * Generate comprehensive monitoring dashboard
   */
  async generateDashboard(): Promise<MonitoringDashboard> {
    const recentMetrics = this.getRecentMetrics(24); // Last 24 hours
    const activeAlerts = this.alertsCache.filter(alert => !alert.resolved);
    
    const summary = {
      totalValidations: recentMetrics.length,
      successRate: recentMetrics.length > 0 
        ? recentMetrics.filter(m => m.success).length / recentMetrics.length 
        : 1,
      averageResponseTime: recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
        : 0,
      systemHealth: this.determineSystemHealth(recentMetrics, activeAlerts),
      lastUpdate: new Date()
    };

    const trends = {
      daily: this.calculateTrends(this.getRecentMetrics(7 * 24), 'daily'), // Last 7 days
      weekly: this.calculateTrends(this.getRecentMetrics(30 * 24), 'weekly'), // Last 30 days
      monthly: this.calculateTrends(this.metricsCache, 'monthly') // All data
    };

    const topIssues = this.identifyTopIssues();

    return {
      summary,
      recentValidations: recentMetrics.slice(-10), // Last 10 validations
      activeAlerts,
      trends,
      topIssues
    };
  }

  /**
   * Export monitoring data
   */
  async exportMonitoringData(outputPath: string): Promise<void> {
    const dashboard = await this.generateDashboard();
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      dashboard,
      rawMetrics: this.metricsCache.slice(-100), // Last 100 metrics
      rawAlerts: this.alertsCache
    };

    await writeFile(outputPath, JSON.stringify(exportData, null, 2));
    logger.success(`📊 Monitoring data exported: ${outputPath}`);
  }

  /**
   * Generate health report
   */
  async generateHealthReport(): Promise<{
    overall: 'healthy' | 'degraded' | 'critical';
    components: {
      name: string;
      status: 'healthy' | 'degraded' | 'critical';
      metrics: Record<string, any>;
      issues: string[];
    }[];
    recommendations: string[];
  }> {
    const recentMetrics = this.getRecentMetrics(24);
    const activeAlerts = this.alertsCache.filter(alert => !alert.resolved);

    const components = [
      {
        name: 'Validation Success Rate',
        status: this.getComponentStatus(
          recentMetrics.length > 0 
            ? recentMetrics.filter(m => m.success).length / recentMetrics.length 
            : 1,
          0.95, 0.85 // thresholds: healthy > 95%, degraded > 85%
        ),
        metrics: {
          successRate: recentMetrics.length > 0 
            ? Math.round((recentMetrics.filter(m => m.success).length / recentMetrics.length) * 100)
            : 100,
          totalValidations: recentMetrics.length
        },
        issues: recentMetrics.filter(m => !m.success).map(m => 
          `Failed validation: ${m.validationType} (${m.errorCount} errors)`
        )
      },
      {
        name: 'Response Time Performance',
        status: this.getComponentStatus(
          recentMetrics.length > 0
            ? 5000 / (recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length) // Inverted - lower is better
            : 1,
          0.8, 0.5 // Normalized thresholds
        ),
        metrics: {
          averageResponseTime: recentMetrics.length > 0
            ? Math.round(recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length)
            : 0,
          maxResponseTime: recentMetrics.length > 0
            ? Math.max(...recentMetrics.map(m => m.duration))
            : 0
        },
        issues: recentMetrics
          .filter(m => m.duration > this.alertThresholds.responseTime)
          .map(m => `Slow validation: ${m.validationType} (${m.duration}ms)`)
      },
      {
        name: 'Critical Issues',
        status: recentMetrics.some(m => m.criticalIssues > 0) ? 'critical' : 'healthy',
        metrics: {
          criticalIssuesCount: recentMetrics.reduce((sum, m) => sum + m.criticalIssues, 0),
          affectedValidations: recentMetrics.filter(m => m.criticalIssues > 0).length
        },
        issues: recentMetrics
          .filter(m => m.criticalIssues > 0)
          .map(m => `Critical issues in ${m.validationType}: ${m.criticalIssues}`)
      },
      {
        name: 'Active Alerts',
        status: activeAlerts.length === 0 ? 'healthy' : 
                activeAlerts.some(a => a.severity === 'critical') ? 'critical' : 'degraded',
        metrics: {
          totalAlerts: activeAlerts.length,
          criticalAlerts: activeAlerts.filter(a => a.severity === 'critical').length,
          warningAlerts: activeAlerts.filter(a => a.severity === 'warning').length
        },
        issues: activeAlerts.map(a => `${a.severity.toUpperCase()}: ${a.title}`)
      }
    ];

    const overall = components.some(c => c.status === 'critical') ? 'critical' :
                   components.some(c => c.status === 'degraded') ? 'degraded' : 'healthy';

    const recommendations = this.generateHealthRecommendations(components);

    return {
      overall,
      components,
      recommendations
    };
  }

  /**
   * Set up automated monitoring
   */
  setupAutomatedMonitoring(intervalMinutes: number = 15): void {
    logger.info(`🔄 Setting up automated monitoring (every ${intervalMinutes} minutes)`);

    setInterval(async () => {
      try {
        // Check system health
        const healthReport = await this.generateHealthReport();
        
        // Create alerts for degraded components
        for (const component of healthReport.components) {
          if (component.status === 'critical' || component.status === 'degraded') {
            const existingAlert = this.alertsCache.find(
              a => !a.resolved && a.source === component.name && a.severity !== 'info'
            );
            
            if (!existingAlert) {
              await this.createAlert(
                component.status === 'critical' ? 'critical' : 'warning',
                `Component ${component.name} Status: ${component.status}`,
                `Component ${component.name} is showing ${component.status} status with ${component.issues.length} issues`,
                component.name,
                { component: component.name, metrics: component.metrics }
              );
            }
          }
        }

        // Auto-resolve alerts for components that are now healthy
        const healthyComponents = healthReport.components
          .filter(c => c.status === 'healthy')
          .map(c => c.name);

        for (const componentName of healthyComponents) {
          const activeComponentAlerts = this.alertsCache.filter(
            a => !a.resolved && a.source === componentName
          );
          
          for (const alert of activeComponentAlerts) {
            await this.resolveAlert(alert.alertId, 'Component returned to healthy status');
          }
        }

      } catch (error) {
        logger.error(`Automated monitoring error: ${error}`);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Persist metrics to file
   */
  private async persistMetrics(metrics: ValidationMetrics): Promise<void> {
    const date = metrics.timestamp.toISOString().split('T')[0];
    const filename = path.join(this.metricsPath, `metrics-${date}.jsonl`);
    
    await appendFile(filename, JSON.stringify(metrics) + '\n');
  }

  /**
   * Persist alert to file
   */
  private async persistAlert(alert: ValidationAlert): Promise<void> {
    const date = alert.timestamp.toISOString().split('T')[0];
    const filename = path.join(this.alertsPath, `alerts-${date}.jsonl`);
    
    await appendFile(filename, JSON.stringify(alert) + '\n');
  }

  /**
   * Check for alert conditions
   */
  private async checkAlertConditions(metrics: ValidationMetrics): Promise<void> {
    // Error rate threshold
    if (!metrics.success && metrics.errorCount > 0) {
      await this.createAlert(
        metrics.criticalIssues > 0 ? 'critical' : 'warning',
        `Validation Failed: ${metrics.validationType}`,
        `Validation failed with ${metrics.errorCount} errors and ${metrics.warningCount} warnings`,
        'validation_system',
        { metrics }
      );
    }

    // Response time threshold
    if (metrics.duration > this.alertThresholds.responseTime) {
      await this.createAlert(
        'warning',
        'Slow Validation Response',
        `Validation took ${metrics.duration}ms (threshold: ${this.alertThresholds.responseTime}ms)`,
        'performance_monitor',
        { metrics }
      );
    }

    // Critical issues threshold
    if (metrics.criticalIssues > 0) {
      await this.createAlert(
        'critical',
        'Critical Issues Detected',
        `${metrics.criticalIssues} critical issues found in ${metrics.validationType} validation`,
        'validation_system',
        { metrics }
      );
    }

    // Memory usage threshold (500MB)
    if (metrics.performanceMetrics.memoryUsage > 500) {
      await this.createAlert(
        'warning',
        'High Memory Usage',
        `Memory usage: ${metrics.performanceMetrics.memoryUsage}MB (threshold: 500MB)`,
        'performance_monitor',
        { metrics }
      );
    }
  }

  /**
   * Get recent metrics within specified hours
   */
  private getRecentMetrics(hours: number): ValidationMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metricsCache.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Calculate trend data
   */
  private calculateTrends(metrics: ValidationMetrics[], period: 'daily' | 'weekly' | 'monthly'): TrendData[] {
    const grouped = new Map<string, ValidationMetrics[]>();
    
    metrics.forEach(metric => {
      let key: string;
      const date = new Date(metric.timestamp);
      
      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(metric);
    });

    const trends: TrendData[] = [];
    for (const [date, dateMetrics] of grouped) {
      trends.push({
        date,
        successRate: dateMetrics.filter(m => m.success).length / dateMetrics.length,
        averageResponseTime: dateMetrics.reduce((sum, m) => sum + m.duration, 0) / dateMetrics.length,
        totalValidations: dateMetrics.length,
        errorCount: dateMetrics.reduce((sum, m) => sum + m.errorCount, 0),
        warningCount: dateMetrics.reduce((sum, m) => sum + m.warningCount, 0)
      });
    }

    return trends.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Identify top issues from metrics
   */
  private identifyTopIssues(): MonitoringDashboard['topIssues'] {
    const issueCount = new Map<string, { count: number; lastOccurred: Date; description: string }>();
    
    // This would analyze actual error patterns from metrics
    // For now, return mock data structure
    
    return Array.from(issueCount.entries()).map(([errorCode, data]) => ({
      errorCode,
      ...data
    })).sort((a, b) => b.count - a.count).slice(0, 10);
  }

  /**
   * Utility methods
   */
  private determineValidationSuccess(result: ValidationResult | SchemaValidationReport): boolean {
    if ('valid' in result) {
      return result.valid;
    } else {
      return result.overallStatus === 'healthy';
    }
  }

  private getErrorCount(result: ValidationResult | SchemaValidationReport): number {
    if ('errors' in result) {
      return result.errors.length;
    } else {
      return [
        result.schemaConsistency?.errors?.length || 0,
        result.propertyMappings?.errors?.length || 0,
        result.configurationSync?.errors?.length || 0,
        result.runtimeValidation?.errors?.length || 0
      ].reduce((sum, count) => sum + count, 0);
    }
  }

  private getWarningCount(result: ValidationResult | SchemaValidationReport): number {
    if ('warnings' in result) {
      return result.warnings.length;
    } else {
      return [
        result.schemaConsistency?.warnings?.length || 0,
        result.propertyMappings?.warnings?.length || 0,
        result.configurationSync?.warnings?.length || 0,
        result.runtimeValidation?.warnings?.length || 0
      ].reduce((sum, count) => sum + count, 0);
    }
  }

  private getCriticalIssueCount(result: ValidationResult | SchemaValidationReport): number {
    if ('errors' in result) {
      return result.errors.filter(e => e.severity === 'critical').length;
    } else {
      return [
        result.schemaConsistency?.errors?.filter(e => e.severity === 'critical').length || 0,
        result.propertyMappings?.errors?.filter(e => e.severity === 'critical').length || 0,
        result.configurationSync?.errors?.filter(e => e.severity === 'critical').length || 0,
        result.runtimeValidation?.errors?.filter(e => e.severity === 'critical').length || 0
      ].reduce((sum, count) => sum + count, 0);
    }
  }

  private determineSystemHealth(
    metrics: ValidationMetrics[], 
    alerts: ValidationAlert[]
  ): 'healthy' | 'degraded' | 'critical' {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const recentFailures = metrics.filter(m => !m.success).length;
    const successRate = metrics.length > 0 ? metrics.filter(m => m.success).length / metrics.length : 1;

    if (criticalAlerts > 0 || successRate < 0.8) {
      return 'critical';
    } else if (recentFailures > 0 || successRate < 0.95) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  private getComponentStatus(value: number, healthyThreshold: number, degradedThreshold: number): 'healthy' | 'degraded' | 'critical' {
    if (value >= healthyThreshold) return 'healthy';
    if (value >= degradedThreshold) return 'degraded';
    return 'critical';
  }

  private generateHealthRecommendations(components: any[]): string[] {
    const recommendations: string[] = [];
    
    components.forEach(component => {
      if (component.status === 'critical') {
        recommendations.push(`URGENT: Address critical issues in ${component.name}`);
      } else if (component.status === 'degraded') {
        recommendations.push(`Review and improve ${component.name} performance`);
      }
      
      if (component.name === 'Response Time Performance' && component.status !== 'healthy') {
        recommendations.push('Consider optimizing API calls and database queries');
      }
      
      if (component.name === 'Validation Success Rate' && component.status !== 'healthy') {
        recommendations.push('Review and fix recurring validation failures');
      }
    });

    return recommendations;
  }
}