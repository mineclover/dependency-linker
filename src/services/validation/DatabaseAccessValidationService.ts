/**
 * DatabaseAccessValidationService - Database access validation and remediation
 * Analyzes permission issues and provides automatic remediation strategies
 */

import { logger } from '../../shared/utils/index.js';
import { BaseValidationService } from './BaseValidationService.js';
import type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,
  DatabaseInfo
} from '../../shared/types/index.js';

interface DatabaseAccessIssue {
  databaseId: string;
  databaseName: string;
  issueType: 'not_found' | 'unauthorized' | 'invalid_id' | 'rate_limited' | 'network_error';
  errorCode: string;
  errorMessage: string;
  suggestedActions: RemediationAction[];
  severity: 'critical' | 'error' | 'warning';
  autoFixable: boolean;
}

interface RemediationAction {
  type: 'update_id' | 'check_permissions' | 'recreate_database' | 'verify_integration' | 'wait_retry';
  description: string;
  autoExecutable: boolean;
  priority: number;
  execute?: () => Promise<boolean>;
}

interface AccessValidationReport {
  totalDatabases: number;
  accessibleDatabases: number;
  inaccessibleDatabases: number;
  issues: DatabaseAccessIssue[];
  remediationPlan: RemediationAction[];
  overallHealth: 'healthy' | 'degraded' | 'critical';
  recommendations: string[];
}

/**
 * DatabaseAccessValidationService - Enhanced validation with remediation
 */
export class DatabaseAccessValidationService extends BaseValidationService {
  private accessIssues: Map<string, DatabaseAccessIssue> = new Map();
  private remediationHistory: Map<string, RemediationAction[]> = new Map();

  constructor() {
    super();
  }

  /**
   * Comprehensive database access validation
   */
  async validate(...args: any[]): Promise<ValidationResult> {
    return this.validateAllDatabaseAccess();
  }

  /**
   * Validate access to all configured databases with detailed analysis
   */
  async validateAllDatabaseAccess(): Promise<ValidationResult> {
    logger.info('🔍 Starting comprehensive database access validation...');

    const config = await this.loadConfiguration();
    if (!config.databases || Object.keys(config.databases).length === 0) {
      return this.createFailureResult([
        this.createValidationError(
          'NO_DATABASES_CONFIGURED',
          'No databases are configured for validation',
          {},
          'critical'
        )
      ]);
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];
    const issues: DatabaseAccessIssue[] = [];

    // Test access to each configured database
    for (const [dbName, dbId] of Object.entries(config.databases)) {
      logger.info(`🔍 Validating access to ${dbName} (${dbId})`);
      
      const accessResult = await this.validateDatabaseAccess(dbName, dbId);
      
      if (!accessResult.accessible) {
        const issue = this.analyzeAccessIssue(dbName, dbId, accessResult.error!);
        issues.push(issue);
        this.accessIssues.set(dbId, issue);

        // Convert issue to validation error
        errors.push(this.createValidationError(
          issue.errorCode,
          issue.errorMessage,
          { databaseId: dbId, databaseName: dbName, issueType: issue.issueType },
          issue.severity
        ));

        // Add remediation suggestions
        for (const action of issue.suggestedActions) {
          suggestions.push(this.createValidationSuggestion(
            'improvement',
            action.description,
            action.priority === 1 ? 'high' : action.priority === 2 ? 'medium' : 'low',
            action.autoExecutable,
            action.execute
          ));
        }
      } else {
        logger.info(`✅ ${dbName}: Access confirmed`);
      }
    }

    // Generate comprehensive report
    const report = this.generateAccessReport(Object.keys(config.databases).length, issues);
    logger.info(`📊 Access validation completed: ${report.overallHealth.toUpperCase()}`);

    return this.createFailureResult(errors, warnings, suggestions);
  }

  /**
   * Validate access to a specific database
   */
  private async validateDatabaseAccess(
    databaseName: string, 
    databaseId: string
  ): Promise<{
    accessible: boolean;
    databaseInfo?: DatabaseInfo;
    error?: any;
    responseTime?: number;
  }> {
    const startTime = Date.now();

    try {
      const result = await this.dbManager.safeRetrieve(databaseId);
      const responseTime = Date.now() - startTime;

      if (result.success) {
        return {
          accessible: true,
          databaseInfo: result.data,
          responseTime
        };
      } else {
        return {
          accessible: false,
          error: {
            message: result.error,
            code: 'RETRIEVAL_FAILED'
          },
          responseTime
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        accessible: false,
        error,
        responseTime
      };
    }
  }

  /**
   * Analyze access issue and determine remediation strategies
   */
  private analyzeAccessIssue(
    databaseName: string,
    databaseId: string,
    error: any
  ): DatabaseAccessIssue {
    let issueType: DatabaseAccessIssue['issueType'] = 'network_error';
    let severity: DatabaseAccessIssue['severity'] = 'error';
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = String(error.message || error);

    // Analyze error type
    if (error.code === 'object_not_found') {
      issueType = 'not_found';
      severity = 'critical';
      errorCode = 'DATABASE_NOT_FOUND';
      errorMessage = `Database '${databaseName}' not found. ID may be incorrect or database may have been deleted.`;
    } else if (error.code === 'unauthorized') {
      issueType = 'unauthorized';
      severity = 'critical';
      errorCode = 'UNAUTHORIZED_ACCESS';
      errorMessage = `Unauthorized access to database '${databaseName}'. Integration may not have proper permissions.`;
    } else if (error.code === 'rate_limited') {
      issueType = 'rate_limited';
      severity = 'warning';
      errorCode = 'RATE_LIMITED';
      errorMessage = `Rate limit exceeded when accessing database '${databaseName}'.`;
    } else if (databaseId.length !== 36 || !databaseId.includes('-')) {
      issueType = 'invalid_id';
      severity = 'error';
      errorCode = 'INVALID_DATABASE_ID';
      errorMessage = `Database ID format is invalid for '${databaseName}'. Expected UUID format.`;
    }

    // Generate remediation actions based on issue type
    const suggestedActions = this.generateRemediationActions(issueType, databaseName, databaseId);

    return {
      databaseId,
      databaseName,
      issueType,
      errorCode,
      errorMessage,
      suggestedActions,
      severity,
      autoFixable: suggestedActions.some(action => action.autoExecutable)
    };
  }

  /**
   * Generate remediation actions for specific issue types
   */
  private generateRemediationActions(
    issueType: DatabaseAccessIssue['issueType'],
    databaseName: string,
    databaseId: string
  ): RemediationAction[] {
    const actions: RemediationAction[] = [];

    switch (issueType) {
      case 'not_found':
        actions.push(
          {
            type: 'update_id',
            description: `Update database ID for '${databaseName}' in configuration`,
            autoExecutable: false,
            priority: 1
          },
          {
            type: 'recreate_database',
            description: `Recreate missing database '${databaseName}' with proper schema`,
            autoExecutable: true,
            priority: 2,
            execute: () => this.recreateDatabase(databaseName, databaseId)
          },
          {
            type: 'check_permissions',
            description: `Verify integration has access to workspace`,
            autoExecutable: false,
            priority: 3
          }
        );
        break;

      case 'unauthorized':
        actions.push(
          {
            type: 'verify_integration',
            description: `Check if Notion integration has proper permissions`,
            autoExecutable: true,
            priority: 1,
            execute: () => this.verifyIntegrationPermissions()
          },
          {
            type: 'check_permissions',
            description: `Ensure database '${databaseName}' is shared with integration`,
            autoExecutable: false,
            priority: 2
          }
        );
        break;

      case 'invalid_id':
        actions.push(
          {
            type: 'update_id',
            description: `Fix invalid database ID format for '${databaseName}'`,
            autoExecutable: false,
            priority: 1
          }
        );
        break;

      case 'rate_limited':
        actions.push(
          {
            type: 'wait_retry',
            description: `Wait and retry access to '${databaseName}'`,
            autoExecutable: true,
            priority: 1,
            execute: () => this.waitAndRetry(databaseId)
          }
        );
        break;

      default:
        actions.push(
          {
            type: 'check_permissions',
            description: `General troubleshooting for '${databaseName}'`,
            autoExecutable: false,
            priority: 3
          }
        );
    }

    return actions;
  }

  /**
   * Execute automatic remediation for accessible issues
   */
  async executeAutoRemediation(dryRun: boolean = true): Promise<{
    attempted: number;
    successful: number;
    failed: number;
    details: string[];
  }> {
    logger.info(`🔧 ${dryRun ? 'Analyzing' : 'Executing'} automatic remediation...`);

    const results = {
      attempted: 0,
      successful: 0,
      failed: 0,
      details: [] as string[]
    };

    for (const issue of this.accessIssues.values()) {
      if (!issue.autoFixable) continue;

      const autoActions = issue.suggestedActions.filter(action => action.autoExecutable);
      
      for (const action of autoActions) {
        results.attempted++;
        
        if (dryRun) {
          results.details.push(`[DRY RUN] Would execute: ${action.description}`);
          continue;
        }

        if (action.execute) {
          try {
            const success = await action.execute();
            if (success) {
              results.successful++;
              results.details.push(`✅ Successfully executed: ${action.description}`);
              
              // Record successful remediation
              const history = this.remediationHistory.get(issue.databaseId) || [];
              history.push(action);
              this.remediationHistory.set(issue.databaseId, history);
            } else {
              results.failed++;
              results.details.push(`❌ Failed to execute: ${action.description}`);
            }
          } catch (error) {
            results.failed++;
            results.details.push(`❌ Error executing ${action.description}: ${error}`);
          }
        }
      }
    }

    logger.info(`🔧 Remediation ${dryRun ? 'analysis' : 'execution'} completed: ${results.attempted} attempted, ${results.successful} successful, ${results.failed} failed`);

    return results;
  }

  /**
   * Generate comprehensive access report
   */
  private generateAccessReport(
    totalDatabases: number,
    issues: DatabaseAccessIssue[]
  ): AccessValidationReport {
    const accessibleDatabases = totalDatabases - issues.length;
    const inaccessibleDatabases = issues.length;

    let overallHealth: AccessValidationReport['overallHealth'] = 'healthy';
    if (issues.some(issue => issue.severity === 'critical')) {
      overallHealth = 'critical';
    } else if (issues.length > 0) {
      overallHealth = 'degraded';
    }

    // Generate prioritized remediation plan
    const allActions = issues.flatMap(issue => issue.suggestedActions);
    const remediationPlan = allActions
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 10); // Top 10 priority actions

    // Generate recommendations
    const recommendations = this.generateRecommendations(issues);

    return {
      totalDatabases,
      accessibleDatabases,
      inaccessibleDatabases,
      issues,
      remediationPlan,
      overallHealth,
      recommendations
    };
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(issues: DatabaseAccessIssue[]): string[] {
    const recommendations: string[] = [];

    const issueTypes = new Set(issues.map(issue => issue.issueType));

    if (issueTypes.has('unauthorized')) {
      recommendations.push('🔐 Review Notion integration permissions and ensure databases are shared');
    }

    if (issueTypes.has('not_found')) {
      recommendations.push('🔍 Verify database IDs in configuration file are current and valid');
    }

    if (issueTypes.has('invalid_id')) {
      recommendations.push('📝 Check database ID format - should be UUID with dashes');
    }

    if (issues.length > totalDatabases * 0.5) {
      recommendations.push('⚠️ High failure rate detected - consider reviewing integration setup');
    }

    if (issues.some(issue => issue.autoFixable)) {
      recommendations.push('🤖 Some issues can be auto-fixed - run remediation with --fix flag');
    }

    return recommendations;
  }

  /**
   * Auto-remediation implementations
   */
  private async recreateDatabase(databaseName: string, oldDatabaseId: string): Promise<boolean> {
    try {
      logger.info(`🔧 Attempting to recreate database: ${databaseName}`);
      
      const config = await this.loadConfiguration();
      if (!config.parentPageId) {
        logger.error('❌ No parent page ID configured for database creation');
        return false;
      }

      // Create new database with basic schema
      const result = await this.dbManager.safeCreate(config.parentPageId, {
        title: [{ type: 'text', text: { content: databaseName } }],
        properties: {
          'Name': { title: {} },
          'Status': {
            select: {
              options: [
                { name: 'Active', color: 'green' },
                { name: 'Inactive', color: 'red' }
              ]
            }
          }
        }
      });

      if (result.success) {
        logger.success(`✅ Successfully recreated database: ${databaseName} (${result.data!.id})`);
        
        // Update configuration with new ID
        const updates = { databases: { ...config.databases, [databaseName]: result.data!.id } };
        await this.configManager.updateConfig(updates);
        
        return true;
      } else {
        logger.error(`❌ Failed to recreate database: ${result.error}`);
        return false;
      }
    } catch (error) {
      logger.error(`❌ Error recreating database: ${error}`);
      return false;
    }
  }

  private async verifyIntegrationPermissions(): Promise<boolean> {
    try {
      logger.info('🔧 Verifying integration permissions...');
      
      // Try to search for any accessible page/database
      const response = await this.notionClient.search({
        filter: { property: 'object', value: 'database' },
        page_size: 1
      });

      if (response.results.length > 0) {
        logger.success('✅ Integration has basic access permissions');
        return true;
      } else {
        logger.warning('⚠️ Integration may have limited permissions');
        return false;
      }
    } catch (error: any) {
      logger.error(`❌ Integration permission check failed: ${error.message}`);
      return false;
    }
  }

  private async waitAndRetry(databaseId: string): Promise<boolean> {
    logger.info('🔧 Waiting before retry due to rate limiting...');
    
    // Wait 60 seconds
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    // Retry access
    const result = await this.dbManager.safeRetrieve(databaseId);
    return result.success;
  }

  /**
   * Get current access issues
   */
  getAccessIssues(): DatabaseAccessIssue[] {
    return Array.from(this.accessIssues.values());
  }

  /**
   * Get remediation history
   */
  getRemediationHistory(databaseId: string): RemediationAction[] {
    return this.remediationHistory.get(databaseId) || [];
  }

  /**
   * Clear access validation cache
   */
  clearAccessCache(): void {
    this.accessIssues.clear();
    this.remediationHistory.clear();
    logger.info('🧹 Access validation cache cleared');
  }
}