#!/usr/bin/env bun

/**
 * Dependency Injection Validation Script
 * Tests that all DI components work correctly together
 */

import { getServiceContainer } from './src/infrastructure/container/ServiceContainer.js';
import { legacyBridge } from './src/services/legacy/LegacyBridgeService.js';
import { logger } from './src/shared/utils/index.js';
import type { IConfigurationService } from './src/domain/interfaces/IConfigurationService.js';
import type { IProjectUploadService } from './src/domain/interfaces/IUploadService.js';

async function validateDependencyInjection(): Promise<boolean> {
  let allTestsPassed = true;
  
  logger.info('🧪 Starting Dependency Injection Validation Tests...\n');

  try {
    // Test 1: Service Container Resolution
    logger.info('Test 1: Service Container Resolution');
    const container = getServiceContainer();
    
    const configService = container.resolve<IConfigurationService>('configurationService');
    if (configService) {
      logger.success('✅ ConfigurationService resolved from container');
    } else {
      logger.error('❌ Failed to resolve ConfigurationService');
      allTestsPassed = false;
    }

    const uploadService = container.resolve<IProjectUploadService>('projectUploadService');
    if (uploadService) {
      logger.success('✅ ProjectUploadService resolved from container');
    } else {
      logger.error('❌ Failed to resolve ProjectUploadService');
      allTestsPassed = false;
    }

    // Test 2: Container Statistics
    logger.info('\nTest 2: Container Statistics');
    const stats = container.getStats();
    logger.info(`📊 Container Stats:`);
    logger.info(`   Total services: ${stats.totalServices}`);
    logger.info(`   Singletons: ${stats.singletons}`);
    logger.info(`   Active instances: ${stats.instances}`);
    logger.info(`   Services by tag:`, stats.servicesByTag);

    if (stats.totalServices > 0) {
      logger.success('✅ Service container properly populated');
    } else {
      logger.error('❌ Service container appears empty');
      allTestsPassed = false;
    }

    // Test 3: Legacy Bridge Functionality
    logger.info('\nTest 3: Legacy Bridge Functionality');
    const legacyConfigService = legacyBridge.getConfigurationService();
    if (legacyConfigService) {
      logger.success('✅ Legacy bridge can resolve ConfigurationService');
    } else {
      logger.error('❌ Legacy bridge failed to resolve ConfigurationService');
      allTestsPassed = false;
    }

    const legacyUploadService = legacyBridge.getUploadService();
    if (legacyUploadService) {
      logger.success('✅ Legacy bridge can resolve ProjectUploadService');
    } else {
      logger.error('❌ Legacy bridge failed to resolve ProjectUploadService');
      allTestsPassed = false;
    }

    // Test 4: Migration Status
    logger.info('\nTest 4: Migration Status');
    const migrationReport = legacyBridge.generateMigrationReport();
    logger.info(`📊 Migration Report:`);
    logger.info(`   ${migrationReport.summary}`);
    logger.info(`   Progress: ${migrationReport.progress}%`);

    if (migrationReport.progress >= 0) {
      logger.success('✅ Migration tracking working');
    } else {
      logger.error('❌ Migration tracking appears broken');
      allTestsPassed = false;
    }

    // Test 5: Configuration Service Interface Methods
    logger.info('\nTest 5: Configuration Service Interface Methods');
    try {
      // Test method exists
      const cachedConfig = configService.getCachedConfig();
      logger.success('✅ ConfigurationService interface methods accessible');
      
      // Test clearCache method
      configService.clearCache();
      logger.success('✅ ConfigurationService clearCache method works');
    } catch (error) {
      logger.error(`❌ ConfigurationService interface methods failed: ${error}`);
      allTestsPassed = false;
    }

    // Final Results
    logger.info('\n🎯 Validation Results Summary:');
    if (allTestsPassed) {
      logger.success('🎉 All Dependency Injection tests PASSED!');
      logger.success('✅ DI system is working correctly');
      logger.info('📋 Next steps: Remove legacy code and direct imports');
    } else {
      logger.error('❌ Some Dependency Injection tests FAILED!');
      logger.error('🔧 Review failed tests and fix issues before proceeding');
    }

    return allTestsPassed;

  } catch (error) {
    logger.error(`💥 Validation failed with error: ${error}`);
    return false;
  }
}

// Run validation if script is executed directly
if (import.meta.main) {
  const success = await validateDependencyInjection();
  process.exit(success ? 0 : 1);
}

export { validateDependencyInjection };