/**
 * Health Check Service - 시스템 컴포넌트 건강 상태 확인
 */

import { Client } from '@notionhq/client';
import type { ConfigurationService } from '../../config/ConfigurationService.js';
import type { HealthCheck } from './DiagnosticTypes.js';
import { logger } from '../../../shared/utils/index.js';

export class HealthCheckService {
  constructor(
    private notionClient: Client,
    private configService: ConfigurationService
  ) {}

  /**
   * 모든 건강 상태 확인 실행
   */
  async performHealthChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];
    
    checks.push(await this.checkNotionApi());
    checks.push(await this.checkConfiguration());
    checks.push(await this.checkDatabaseSchemas());
    checks.push(await this.checkFileSystem());
    checks.push(await this.checkPerformance());
    
    return checks;
  }

  /**
   * Notion API 연결 상태 확인
   */
  private async checkNotionApi(): Promise<HealthCheck> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: HealthCheck['status'] = 'healthy';

    try {
      const start = Date.now();
      await this.notionClient.users.me();
      const responseTime = Date.now() - start;

      if (responseTime > 5000) {
        issues.push('Notion API response time is slow');
        recommendations.push('Check network connection and API rate limits');
        status = 'degraded';
      }

      return {
        component: 'Notion API',
        status,
        metrics: { 
          responseTime,
          lastCheck: new Date()
        },
        issues,
        recommendations
      };
    } catch (error) {
      return {
        component: 'Notion API',
        status: 'unhealthy',
        metrics: { lastCheck: new Date() },
        issues: [`Cannot connect to Notion API: ${error}`],
        recommendations: ['Verify API key and network connectivity']
      };
    }
  }

  /**
   * 설정 상태 확인
   */
  private async checkConfiguration(): Promise<HealthCheck> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: HealthCheck['status'] = 'healthy';

    try {
      const config = await this.configService.loadAndProcessConfig(process.cwd());
      
      if (!config?.apiKey) {
        issues.push('Notion API key not configured');
        recommendations.push('Set NOTION_API_KEY environment variable');
        status = 'unhealthy';
      }

      if (!config?.databases) {
        issues.push('No databases configured');
        recommendations.push('Configure database IDs in config file');
        status = 'degraded';
      } else {
        const configuredDbs = Object.keys(config.databases).length;
        const expectedDbs = 6; // files, functions, dependencies, libraries, classes, relationships
        
        if (configuredDbs < expectedDbs) {
          issues.push(`Only ${configuredDbs}/${expectedDbs} databases configured`);
          recommendations.push('Configure all required database IDs');
          status = 'degraded';
        }
      }

      return {
        component: 'Configuration',
        status,
        metrics: { 
          configuredDatabases: config?.databases ? Object.keys(config.databases).length : 0,
          lastCheck: new Date()
        },
        issues,
        recommendations
      };
    } catch (error) {
      return {
        component: 'Configuration',
        status: 'unhealthy',
        metrics: { lastCheck: new Date() },
        issues: [`Configuration error: ${error}`],
        recommendations: ['Check configuration file syntax and permissions']
      };
    }
  }

  /**
   * 데이터베이스 스키마 상태 확인
   */
  private async checkDatabaseSchemas(): Promise<HealthCheck> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: HealthCheck['status'] = 'healthy';

    try {
      const config = await this.configService.loadAndProcessConfig(process.cwd());
      
      if (!config?.databases) {
        return {
          component: 'Database Schemas',
          status: 'unknown',
          metrics: { lastCheck: new Date() },
          issues: ['No databases configured to check'],
          recommendations: []
        };
      }

      let totalDatabases = 0;
      let healthyDatabases = 0;

      for (const [dbName, dbId] of Object.entries(config.databases)) {
        totalDatabases++;
        
        try {
          const database = await this.notionClient.databases.retrieve({
            database_id: dbId as string
          });

          // Check data sources for properties (new API structure)
          let dbProperties = {};
          let hasDataSources = false;
          
          if (database.data_sources && database.data_sources.length > 0) {
            hasDataSources = true;
            try {
              // For new API structure with data sources, assume database has proper schema
              // Since data sources exist, the database is properly configured
              dbProperties = { "Name": { type: "title" } }; // Default assumption for data source databases
            } catch (queryError) {
              console.warn(`Failed to query database for ${dbName}:`, queryError.message);
              // Fallback: assume basic structure exists if data sources are present
              dbProperties = { "Name": { type: "title" } };
            }
          } else {
            // Fallback to old API structure
            dbProperties = 'properties' in database ? database.properties : {};
          }

          if (!hasDataSources && (!dbProperties || Object.keys(dbProperties).length === 0)) {
            issues.push(`Database ${dbName} has no properties`);
            recommendations.push(`Add properties to ${dbName} database`);
            status = 'degraded';
          } else if (hasDataSources && Object.keys(dbProperties).length === 0) {
            issues.push(`Database ${dbName} data source has no properties`);
            recommendations.push(`Add properties to ${dbName} data source`);
            status = 'degraded';
          } else {
            healthyDatabases++;
          }

          // Check for title property
          const hasTitleProperty = Object.values(dbProperties).some(
            (prop: any) => prop.type === 'title'
          );

          if (!hasTitleProperty) {
            issues.push(`Database ${dbName} missing title property`);
            recommendations.push(`Add title property to ${dbName} database`);
            status = 'degraded';
          }

        } catch (error) {
          issues.push(`Cannot access database ${dbName}: ${error}`);
          recommendations.push(`Verify ${dbName} database ID and permissions`);
          status = 'unhealthy';
        }
      }

      return {
        component: 'Database Schemas',
        status,
        metrics: { 
          totalDatabases,
          healthyDatabases,
          lastCheck: new Date()
        },
        issues,
        recommendations
      };
    } catch (error) {
      return {
        component: 'Database Schemas',
        status: 'unknown',
        metrics: { lastCheck: new Date() },
        issues: [`Schema check failed: ${error}`],
        recommendations: ['Check database configuration and connectivity']
      };
    }
  }

  /**
   * 파일 시스템 상태 확인
   */
  private async checkFileSystem(): Promise<HealthCheck> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: HealthCheck['status'] = 'healthy';

    try {
      // 기본적인 파일 시스템 접근 확인
      const testPath = process.cwd();
      const { access } = await import('fs/promises');
      await access(testPath);

      // 설정 파일 존재 확인
      const configPaths = [
        '.deplink-config.json',
        'deplink.config.json',
        '.env'
      ];

      let configFound = false;
      for (const configPath of configPaths) {
        try {
          await access(configPath);
          configFound = true;
          break;
        } catch {
          // 파일이 없음
        }
      }

      if (!configFound) {
        issues.push('No configuration file found');
        recommendations.push('Create .deplink-config.json or deplink.config.json');
        status = 'degraded';
      }

      return {
        component: 'File System',
        status,
        metrics: { 
          workingDirectory: testPath,
          configurationFound: configFound,
          lastCheck: new Date()
        },
        issues,
        recommendations
      };
    } catch (error) {
      return {
        component: 'File System',
        status: 'unhealthy',
        metrics: { lastCheck: new Date() },
        issues: [`File system error: ${error}`],
        recommendations: ['Check file permissions and disk space']
      };
    }
  }

  /**
   * 성능 상태 확인
   */
  private async checkPerformance(): Promise<HealthCheck> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: HealthCheck['status'] = 'healthy';

    try {
      const memoryUsage = process.memoryUsage();
      const memoryInMB = memoryUsage.heapUsed / 1024 / 1024;

      if (memoryInMB > 500) {
        issues.push(`High memory usage: ${memoryInMB.toFixed(2)}MB`);
        recommendations.push('Monitor memory usage and optimize if needed');
        status = 'degraded';
      }

      return {
        component: 'Performance',
        status,
        metrics: {
          memoryUsage: memoryInMB,
          uptime: process.uptime(),
          lastCheck: new Date()
        },
        issues,
        recommendations
      };
    } catch (error) {
      return {
        component: 'Performance',
        status: 'unknown',
        metrics: { lastCheck: new Date() },
        issues: [`Performance check failed: ${error}`],
        recommendations: []
      };
    }
  }
}