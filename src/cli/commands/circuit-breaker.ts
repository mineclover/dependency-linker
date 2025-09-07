/**
 * Circuit Breaker Management CLI Command
 * Provides tools for monitoring and managing circuit breakers
 */

import { Command } from 'commander';
import { CircuitBreakerManager } from '../../shared/utils/circuitBreakerManager.js';
import { logger } from '../../shared/utils/index.js';

export function createCircuitBreakerCommand(): Command {
  const cmd = new Command('circuit-breaker')
    .alias('cb')
    .description('🔌 Circuit breaker management and monitoring');

  // Status command
  cmd.command('status')
    .description('Show circuit breaker status')
    .option('-s, --service <name>', 'Check specific service (default: all)')
    .option('-w, --watch', 'Watch status continuously')
    .option('-i, --interval <seconds>', 'Watch interval in seconds', '5')
    .action(async (options) => {
      await showCircuitBreakerStatus(options);
    });

  // Health command
  cmd.command('health')
    .description('Show detailed health report')
    .option('-j, --json', 'Output as JSON')
    .action(async (options) => {
      await showHealthReport(options);
    });

  // Reset command
  cmd.command('reset')
    .description('Reset circuit breakers')
    .option('-s, --service <name>', 'Reset specific service (default: all)')
    .option('-f, --force', 'Force reset without confirmation')
    .option('-r, --reason <reason>', 'Reason for reset')
    .action(async (options) => {
      await resetCircuitBreaker(options);
    });

  // Test command
  cmd.command('test')
    .description('Test circuit breaker behavior')
    .option('-s, --service <name>', 'Test specific service', 'notion')
    .option('-f, --failures <count>', 'Simulate failures', '3')
    .action(async (options) => {
      await testCircuitBreaker(options);
    });

  // Offline queue command
  cmd.command('offline')
    .description('Manage offline operation queue')
    .option('-p, --process [count]', 'Process queued operations', '10')
    .option('-c, --clear', 'Clear all queued operations')
    .option('-l, --list', 'List queued operations')
    .action(async (options) => {
      await manageOfflineQueue(options);
    });

  return cmd;
}

async function showCircuitBreakerStatus(options: any): Promise<void> {
  const manager = CircuitBreakerManager.getInstance();

  if (options.watch) {
    const interval = parseInt(options.interval) * 1000;
    console.log(`👁️ Watching circuit breaker status (${options.interval}s intervals)...`);
    console.log('Press Ctrl+C to stop\n');

    const watchStatus = () => {
      console.clear();
      console.log(`🔌 Circuit Breaker Status - ${new Date().toLocaleString()}`);
      console.log('━'.repeat(80));
      displayStatus(manager, options.service);
      console.log('\n' + '━'.repeat(80));
    };

    watchStatus();
    const intervalId = setInterval(watchStatus, interval);

    process.on('SIGINT', () => {
      clearInterval(intervalId);
      console.log('\n👋 Stopping watch mode...');
      process.exit(0);
    });

    return;
  }

  displayStatus(manager, options.service);
}

function displayStatus(manager: CircuitBreakerManager, serviceName?: string): void {
  if (serviceName) {
    const queue = manager.getApiQueue(serviceName);
    const health = queue.getHealthStatus();
    displayServiceStatus(serviceName, health);
  } else {
    const systemHealth = manager.getSystemHealth();
    
    console.log(`\n🎯 Overall System Status: ${getStatusIcon(systemHealth.overall)} ${systemHealth.overall.toUpperCase()}`);
    console.log(`📱 Offline Queue: ${systemHealth.offlineQueue.size} operations`);
    
    if (systemHealth.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      systemHealth.recommendations.forEach(rec => console.log(`   ${rec}`));
    }

    console.log('\n📊 Service Details:');
    for (const [service, health] of systemHealth.services) {
      displayServiceStatus(service, health);
    }
  }
}

function displayServiceStatus(serviceName: string, health: any): void {
  const { status, metrics, alerts } = health;
  const statusIcon = getStatusIcon(status);
  
  console.log(`\n🔌 Service: ${serviceName} ${statusIcon} ${status.toUpperCase()}`);
  console.log(`   Circuit Breaker: ${getCircuitBreakerIcon(metrics.circuitBreakerState)} ${metrics.circuitBreakerState}`);
  console.log(`   Total Requests: ${metrics.totalRequests}`);
  console.log(`   Success Rate: ${((metrics.successfulRequests / Math.max(metrics.totalRequests, 1)) * 100).toFixed(1)}%`);
  console.log(`   Queue Size: ${metrics.queueSize}`);
  console.log(`   Rate Limit Hits: ${metrics.rateLimitHits}`);
  
  if (metrics.averageResponseTime > 0) {
    console.log(`   Avg Response Time: ${metrics.averageResponseTime.toFixed(0)}ms`);
  }

  if (alerts.length > 0) {
    console.log('   Alerts:');
    alerts.forEach((alert: string) => console.log(`     ${alert}`));
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'healthy': return '✅';
    case 'degraded': return '⚠️';
    case 'critical': return '🚨';
    default: return '❓';
  }
}

function getCircuitBreakerIcon(state: string): string {
  switch (state) {
    case 'closed': return '🟢';
    case 'half-open': return '🟡';
    case 'open': return '🔴';
    default: return '❓';
  }
}

async function showHealthReport(options: any): Promise<void> {
  const manager = CircuitBreakerManager.getInstance();
  const health = manager.getSystemHealth();

  if (options.json) {
    console.log(JSON.stringify(health, null, 2));
    return;
  }

  console.log('\n🏥 Comprehensive Health Report');
  console.log('━'.repeat(80));
  
  console.log(`\n🎯 Overall Status: ${getStatusIcon(health.overall)} ${health.overall.toUpperCase()}`);
  
  console.log('\n📊 Service Health:');
  for (const [serviceName, serviceHealth] of health.services) {
    const { status, metrics } = serviceHealth as any;
    console.log(`   ${serviceName}: ${getStatusIcon(status)} ${status} - ${metrics.totalRequests} requests`);
  }

  console.log('\n📱 Offline Operations:');
  console.log(`   Queue Size: ${health.offlineQueue.size}`);
  if (health.offlineQueue.oldestOperation > 0) {
    const ageMinutes = Math.round(health.offlineQueue.oldestOperation / 60000);
    console.log(`   Oldest Operation: ${ageMinutes} minutes ago`);
  }

  if (health.recommendations.length > 0) {
    console.log('\n💡 System Recommendations:');
    health.recommendations.forEach(rec => console.log(`   • ${rec}`));
  }

  console.log('\n📈 Performance Tips:');
  console.log('   • Monitor rate limit hits - reduce request frequency if high');
  console.log('   • Watch queue size - indicates system load');
  console.log('   • Check circuit breaker state - indicates API health');
  console.log('   • Process offline operations when system recovers');
}

async function resetCircuitBreaker(options: any): Promise<void> {
  const manager = CircuitBreakerManager.getInstance();

  if (!options.force) {
    console.log('⚠️ Are you sure you want to reset circuit breakers?');
    console.log('This will clear failure counts and open circuits.');
    
    // In a real implementation, you'd want to add interactive confirmation
    console.log('Use --force flag to skip this confirmation.');
    return;
  }

  const reason = options.reason || 'Manual reset via CLI';

  if (options.service) {
    const queue = manager.getApiQueue(options.service);
    queue.forceCircuitBreakerState('closed', reason);
    console.log(`✅ Reset circuit breaker for service: ${options.service}`);
  } else {
    manager.resetAll(reason);
    console.log('✅ Reset all circuit breakers');
  }
}

async function testCircuitBreaker(options: any): Promise<void> {
  const manager = CircuitBreakerManager.getInstance();
  const queue = manager.getApiQueue(options.service);
  const failures = parseInt(options.failures);

  console.log(`🧪 Testing circuit breaker for service: ${options.service}`);
  console.log(`📊 Simulating ${failures} failures...`);

  // Simulate failures
  for (let i = 0; i < failures; i++) {
    try {
      await queue.add(async () => {
        throw new Error(`Simulated failure ${i + 1}`);
      });
    } catch (error) {
      // Expected to fail
    }
    
    const health = queue.getHealthStatus();
    console.log(`   Failure ${i + 1}: Circuit breaker state = ${health.metrics.circuitBreakerState}`);
  }

  // Show final status
  const finalHealth = queue.getHealthStatus();
  console.log(`\n🎯 Final Status: ${getStatusIcon(finalHealth.status)} ${finalHealth.status}`);
  console.log(`🔌 Circuit Breaker: ${getCircuitBreakerIcon(finalHealth.metrics.circuitBreakerState)} ${finalHealth.metrics.circuitBreakerState}`);
  
  if (finalHealth.alerts.length > 0) {
    console.log('\n🚨 Alerts:');
    finalHealth.alerts.forEach(alert => console.log(`   ${alert}`));
  }
}

async function manageOfflineQueue(options: any): Promise<void> {
  const manager = CircuitBreakerManager.getInstance();

  if (options.list) {
    const health = manager.getSystemHealth();
    console.log(`\n📱 Offline Operation Queue`);
    console.log(`   Size: ${health.offlineQueue.size} operations`);
    if (health.offlineQueue.oldestOperation > 0) {
      const ageMinutes = Math.round(health.offlineQueue.oldestOperation / 60000);
      console.log(`   Oldest: ${ageMinutes} minutes ago`);
    }
    return;
  }

  if (options.clear) {
    console.log('🗑️ Clearing offline operation queue...');
    manager.resetAll('clear offline queue');
    console.log('✅ Queue cleared');
    return;
  }

  if (options.process) {
    const count = parseInt(options.process) || 10;
    console.log(`🔄 Processing up to ${count} offline operations...`);
    
    try {
      const result = await manager.processOfflineOperations(count);
      console.log('\n📊 Processing Results:');
      console.log(`   Processed: ${result.processed}`);
      console.log(`   Successful: ${result.successful}`);
      console.log(`   Failed: ${result.failed}`);
      
      if (result.successful > 0) {
        console.log(`✅ Successfully processed ${result.successful} operations`);
      }
      
      if (result.failed > 0) {
        console.log(`⚠️ ${result.failed} operations failed and may be re-queued`);
      }
    } catch (error: any) {
      console.error(`❌ Error processing offline operations: ${error.message}`);
    }
    return;
  }

  // Default: show queue status
  await manageOfflineQueue({ list: true });
}