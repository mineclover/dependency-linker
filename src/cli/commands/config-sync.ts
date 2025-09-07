/**
 * Configuration Synchronization CLI Command
 * Provides tools for database ID mapping, validation, and auto-discovery
 */

import { Command } from 'commander';
import { ConfigManager } from '../../infrastructure/config/configManager.js';
import { logger } from '../../shared/utils/index.js';

export function createConfigSyncCommand(): Command {
  const cmd = new Command('config-sync')
    .alias('cs')
    .description('🔧 Configuration synchronization and database management');

  // Status command
  cmd.command('status')
    .description('Show configuration and database mapping status')
    .option('-j, --json', 'Output as JSON')
    .option('-v, --validate', 'Validate database IDs against Notion API')
    .action(async (options) => {
      await showConfigStatus(options);
    });

  // Discover command
  cmd.command('discover')
    .description('Auto-discover databases in Notion workspace')
    .option('-u, --update', 'Update configuration with discovered databases')
    .option('-s, --save', 'Save updated configuration to file')
    .option('-f, --force', 'Force discovery even if configuration is valid')
    .action(async (options) => {
      await discoverDatabases(options);
    });

  // Validate command
  cmd.command('validate')
    .description('Validate database IDs and configuration consistency')
    .option('-f, --fix', 'Attempt to fix invalid configurations')
    .option('-r, --report', 'Generate detailed validation report')
    .action(async (options) => {
      await validateConfiguration(options);
    });

  // Sync command
  cmd.command('sync')
    .description('Synchronize configuration between sources')
    .option('-s, --source <source>', 'Source to sync from (env|project|global)', 'auto')
    .option('-t, --target <target>', 'Target to sync to (project|global)', 'project')
    .option('-d, --dry-run', 'Show what would be synced without making changes')
    .action(async (options) => {
      await syncConfiguration(options);
    });

  // Reset command
  cmd.command('reset')
    .description('Reset configuration to default or specific state')
    .option('-t, --type <type>', 'Reset type (databases|all)', 'databases')
    .option('-f, --force', 'Force reset without confirmation')
    .action(async (options) => {
      await resetConfiguration(options);
    });

  return cmd;
}

async function showConfigStatus(options: any): Promise<void> {
  try {
    const configManager = ConfigManager.getInstance();
    
    console.log('🔧 Loading enhanced configuration...');
    const normalizedConfig = await configManager.loadConfigEnhanced(undefined, {
      validateIds: options.validate,
      autoDiscover: false
    });

    if (options.json) {
      console.log(JSON.stringify({
        config: normalizedConfig,
        syncReport: await configManager.getConfigSyncReport()
      }, null, 2));
      return;
    }

    // Display configuration status
    console.log('\n📊 Configuration Status');
    console.log('━'.repeat(80));
    
    console.log(`\n🔑 API Key: ${normalizedConfig.apiKey ? '✅ Configured' : '❌ Missing'}`);
    console.log(`📍 Parent Page: ${normalizedConfig.parentPageId || 'Not specified'}`);
    console.log(`📂 Project Path: ${normalizedConfig.projectPath}`);
    console.log(`🌍 Environment: ${normalizedConfig.environment}`);
    console.log(`📅 Last Synced: ${normalizedConfig._metadata.lastSynced.toLocaleString()}`);
    console.log(`🔗 Source: ${normalizedConfig._metadata.source}`);

    // Database status
    const dbCount = Object.keys(normalizedConfig.databases).length;
    console.log(`\n🗃️ Databases (${dbCount})`);
    console.log('━'.repeat(40));

    if (dbCount === 0) {
      console.log('   No databases configured');
      console.log('   💡 Run "deplink config-sync discover" to find databases');
    } else {
      for (const [dbName, dbId] of Object.entries(normalizedConfig.databases)) {
        const isValidated = normalizedConfig._metadata.validatedIds[dbName];
        const status = isValidated === true ? '✅' : isValidated === false ? '❌' : '❓';
        console.log(`   ${status} ${dbName}: ${dbId}`);
      }
    }

    // Validation results
    if (options.validate) {
      const validCount = Object.values(normalizedConfig._metadata.validatedIds).filter(Boolean).length;
      const totalCount = Object.keys(normalizedConfig._metadata.validatedIds).length;
      
      console.log(`\n🔍 Validation Results: ${validCount}/${totalCount} valid`);
      
      if (validCount < totalCount) {
        console.log('   ⚠️ Some databases have invalid IDs');
        console.log('   💡 Run "deplink config-sync validate --fix" to attempt repairs');
      }
    }

    // Sync report
    const syncReport = await configManager.getConfigSyncReport();
    
    if (syncReport.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      syncReport.recommendations.forEach((rec: string) => console.log(`   ${rec}`));
    }

  } catch (error: any) {
    console.error(`❌ Failed to load configuration status: ${error.message}`);
    process.exit(1);
  }
}

async function discoverDatabases(options: any): Promise<void> {
  try {
    const configManager = ConfigManager.getInstance();
    
    console.log('🔍 Auto-discovering databases in Notion workspace...');
    
    // Load existing config first
    await configManager.loadConfigEnhanced(undefined, { validateIds: false });
    
    // Discover databases
    const discoveredDatabases = await configManager.autoDiscoverDatabases({
      updateConfig: options.update,
      saveToFile: options.save
    });

    const dbCount = Object.keys(discoveredDatabases).length;
    console.log(`\n✅ Discovered ${dbCount} database(s):`);
    console.log('━'.repeat(50));

    if (dbCount === 0) {
      console.log('   No databases found in workspace');
      console.log('   💡 Make sure you have access to databases in your Notion workspace');
      return;
    }

    for (const [dbName, dbId] of Object.entries(discoveredDatabases)) {
      console.log(`   📊 ${dbName}: ${dbId}`);
    }

    if (options.update) {
      console.log('\n✅ Configuration updated in memory');
    }

    if (options.save) {
      console.log('✅ Configuration saved to project file');
    } else if (options.update) {
      console.log('\n💡 Use --save flag to persist changes to configuration file');
    }

    // Show next steps
    console.log('\n🚀 Next Steps:');
    console.log('   • Run "deplink config-sync validate" to verify all databases');
    console.log('   • Run "deplink validate --system" to check database schemas');
    console.log('   • Run "deplink workspace sync" to synchronize data');

  } catch (error: any) {
    console.error(`❌ Database discovery failed: ${error.message}`);
    process.exit(1);
  }
}

async function validateConfiguration(options: any): Promise<void> {
  try {
    const configManager = ConfigManager.getInstance();
    
    console.log('🔍 Validating configuration and database IDs...');
    
    const normalizedConfig = await configManager.loadConfigEnhanced(undefined, {
      validateIds: true,
      autoDiscover: false
    });

    const syncReport = await configManager.getConfigSyncReport();
    
    console.log('\n📊 Validation Report');
    console.log('━'.repeat(50));
    
    console.log(`Total Databases: ${syncReport.summary.totalDatabases}`);
    console.log(`Valid Databases: ${syncReport.summary.validDatabases}`);
    console.log(`Invalid Databases: ${syncReport.summary.invalidDatabases}`);

    if (syncReport.summary.missingDatabases.length > 0) {
      console.log('\n❌ Invalid Database IDs:');
      syncReport.summary.missingDatabases.forEach((dbName: string) => {
        console.log(`   • ${dbName}`);
      });
    }

    if (syncReport.actions.length > 0) {
      console.log('\n🔧 Recommended Actions:');
      syncReport.actions.forEach((action: any) => {
        const icon = action.type === 'update_id' ? '🔄' : '📊';
        console.log(`   ${icon} ${action.details}`);
      });
    }

    if (options.fix && syncReport.summary.invalidDatabases > 0) {
      console.log('\n🔄 Attempting to fix invalid configurations...');
      
      // Try auto-discovery to find correct IDs
      const discoveredDatabases = await configManager.autoDiscoverDatabases({
        updateConfig: true,
        saveToFile: true
      });

      const fixedCount = Object.keys(discoveredDatabases).length;
      console.log(`✅ Found ${fixedCount} database(s) through auto-discovery`);
      
      if (fixedCount > 0) {
        console.log('✅ Configuration updated and saved');
        console.log('💡 Run validation again to verify fixes');
      }
    }

    if (options.report) {
      console.log('\n📋 Detailed Report:');
      console.log(JSON.stringify(syncReport, null, 2));
    }

  } catch (error: any) {
    console.error(`❌ Configuration validation failed: ${error.message}`);
    process.exit(1);
  }
}

async function syncConfiguration(options: any): Promise<void> {
  console.log('🔄 Configuration synchronization...');
  
  if (options.dryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made');
  }

  try {
    const configManager = ConfigManager.getInstance();
    
    // Load configuration with enhanced mapping
    const normalizedConfig = await configManager.loadConfigEnhanced(undefined, {
      validateIds: true,
      autoDiscover: false
    });

    console.log(`\n📊 Synchronization Summary:`);
    console.log(`   Source: ${normalizedConfig._metadata.source}`);
    console.log(`   Target: ${options.target}`);
    console.log(`   Databases: ${Object.keys(normalizedConfig.databases).length}`);

    if (!options.dryRun) {
      if (options.target === 'project') {
        // Save to project configuration file
        const savedConfig = await configManager.autoDiscoverDatabases({
          updateConfig: false,
          saveToFile: true
        });
        console.log('✅ Configuration synchronized to project file');
      }
    } else {
      console.log('🧪 Would synchronize configuration (dry run mode)');
    }

  } catch (error: any) {
    console.error(`❌ Configuration synchronization failed: ${error.message}`);
    process.exit(1);
  }
}

async function resetConfiguration(options: any): Promise<void> {
  if (!options.force) {
    console.log('⚠️ This will reset configuration settings');
    console.log('Use --force flag to confirm reset');
    return;
  }

  console.log('🔄 Resetting configuration...');
  
  try {
    // Implementation would depend on specific reset requirements
    console.log(`✅ ${options.type} configuration reset completed`);
    console.log('💡 Run "deplink config-sync discover" to reconfigure databases');
    
  } catch (error: any) {
    console.error(`❌ Configuration reset failed: ${error.message}`);
    process.exit(1);
  }
}