/**
 * DI System Validation Test
 */

import { getServiceContainer } from './src/infrastructure/container/ServiceContainer.js';
import type { IConfigurationService } from './src/domain/interfaces/IConfigurationService.js';
import type { INotionApiService } from './src/domain/interfaces/INotionApiService.js';

async function testDISystem() {
  console.log('🧪 Testing Dependency Injection System...\n');

  try {
    // Get service container
    console.log('1. Getting service container...');
    const container = getServiceContainer();
    console.log('✅ Service container obtained');

    // Test configuration service
    console.log('\n2. Testing ConfigurationService...');
    const configService = container.resolve<IConfigurationService>('configurationService');
    console.log('✅ ConfigurationService resolved');
    
    const config = await configService.loadAndProcessConfig(process.cwd());
    console.log('✅ Configuration loaded successfully');
    console.log(`   - Valid: ${config.isValid}`);
    console.log(`   - API Key: ${config.apiKey ? '***configured***' : 'missing'}`);

    // Test service availability
    console.log('\n3. Testing service registration...');
    const services = [
      'configurationService',
      'configNormalizer', 
      'configRepository',
      'notionClientFactory'
    ];
    
    for (const serviceName of services) {
      const isRegistered = container.isRegistered(serviceName);
      console.log(`   ${isRegistered ? '✅' : '❌'} ${serviceName}: ${isRegistered ? 'registered' : 'not registered'}`);
    }

    // Test container stats
    console.log('\n4. Container statistics...');
    const stats = container.getStats();
    console.log(`   - Total services: ${stats.totalServices}`);
    console.log(`   - Singletons: ${stats.singletons}`);
    console.log(`   - Instances: ${stats.instances}`);
    console.log('   - Services by tag:');
    for (const [tag, count] of Object.entries(stats.servicesByTag)) {
      console.log(`     ${tag}: ${count}`);
    }

    console.log('\n✅ DI System validation completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ DI System validation failed:', error);
    return false;
  }
}

testDISystem()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });