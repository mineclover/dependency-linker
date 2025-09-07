/**
 * Configuration Validation Command
 * Enhanced command for validating and auditing configuration security
 */

import { Command } from 'commander';
import { logger } from '../../shared/utils/index.js';
import { ConfigurationManager } from '../../services/config/ConfigurationManager.js';

export function createConfigValidateCommand(): Command {
  const command = new Command()
    .name('config-validate')
    .alias('cv')
    .description('Validate configuration with security audit')
    .option('--project-path <path>', 'Project path to validate', process.cwd())
    .option('--security-audit', 'Perform comprehensive security audit', true)
    .option('--fix-ids', 'Attempt to fix invalid ID formats')
    .option('--no-security-audit', 'Skip security audit')
    .option('--verbose', 'Verbose output');

  command.action(async (options) => {
    try {
      logger.info('🔍 Starting configuration validation...', '⚙️');

      const configManager = ConfigurationManager.getInstance();
      
      // Load configuration with security audit
      const { config, securityReport } = await configManager.loadSecureConfiguration(
        options.projectPath,
        {
          validateIds: true,
          performSecurityAudit: options.securityAudit
        }
      );

      // Display configuration summary
      const summary = configManager.getConfigurationSummary(config);
      
      console.log('\n📊 Configuration Summary:');
      console.log(`   Status: ${summary.status === 'valid' ? '✅ Valid' : '❌ Invalid'}`);
      console.log(`   Security: ${summary.security === 'secure' ? '🔒 Secure' : '⚠️ Needs Attention'}`);
      console.log(`   Databases: ${summary.databases} configured`);
      console.log(`   Validated IDs: ${summary.validatedIds}/${summary.databases}`);
      
      if (summary.issues.length > 0) {
        console.log('\n❗ Issues Found:');
        summary.issues.forEach(issue => console.log(`   • ${issue}`));
      }

      if (summary.nextSteps.length > 0) {
        console.log('\n🎯 Next Steps:');
        summary.nextSteps.forEach(step => console.log(`   • ${step}`));
      }

      // Display security report
      if (securityReport) {
        console.log('\n🛡️ Security Audit Results:');
        console.log(`   Overall Rating: ${getSecurityEmoji(securityReport.overall)} ${securityReport.overall.toUpperCase()}`);
        
        if (securityReport.findings.length > 0) {
          console.log('\n   Security Findings:');
          securityReport.findings.forEach(finding => {
            const emoji = getSeverityEmoji(finding.severity);
            console.log(`   ${emoji} [${finding.severity.toUpperCase()}] ${finding.message}`);
            if (finding.recommendation) {
              console.log(`     → Recommendation: ${finding.recommendation}`);
            }
          });
        }

        if (securityReport.recommendations.length > 0) {
          console.log('\n   Recommendations:');
          securityReport.recommendations.forEach(rec => console.log(`   • ${rec}`));
        }
      }

      // Fix IDs if requested
      if (options.fixIds) {
        console.log('\n🔧 Attempting to fix invalid IDs...');
        const { fixes, validationResults } = await configManager.validateAndFixIds(config);
        
        if (fixes.length > 0) {
          console.log('   ID Fixes Applied:');
          fixes.forEach(fix => {
            console.log(`   ✅ ${fix.database}: ${fix.oldId} → ${fix.newId}`);
          });
          logger.success(`Fixed ${fixes.length} invalid ID(s)`);
        } else {
          console.log('   No ID fixes needed or possible');
        }
      }

      // Verbose output
      if (options.verbose) {
        console.log('\n🔍 Detailed Configuration:');
        console.log(`   Project Path: ${config.projectPath}`);
        console.log(`   Environment: ${config.environment}`);
        console.log(`   Config Source: ${config._metadata.source}`);
        console.log(`   Last Synced: ${config._metadata.lastSynced.toISOString()}`);
        
        if (config._metadata.validatedIds) {
          console.log('   Database Validation:');
          Object.entries(config._metadata.validatedIds).forEach(([name, isValid]) => {
            console.log(`     ${name}: ${isValid ? '✅' : '❌'}`);
          });
        }
      }

      // Exit with appropriate code
      const hasErrors = summary.status !== 'valid' || 
        (securityReport?.overall === 'critical');
      
      if (hasErrors) {
        console.log('\n❌ Configuration validation failed');
        process.exit(1);
      } else {
        console.log('\n✅ Configuration validation passed');
        process.exit(0);
      }

    } catch (error) {
      logger.error(`Configuration validation failed: ${error}`);
      if (options.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

  return command;
}

function getSecurityEmoji(level: string): string {
  switch (level) {
    case 'secure': return '🟢';
    case 'warning': return '🟡';
    case 'critical': return '🔴';
    default: return '⚪';
  }
}

function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'low': return '🟢';
    case 'medium': return '🟡';
    case 'high': return '🟠';
    case 'critical': return '🔴';
    default: return '⚪';
  }
}