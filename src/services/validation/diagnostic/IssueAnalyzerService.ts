/**
 * Issue Analyzer Service - 문제 분석 및 근본 원인 파악
 */

import { Client } from '@notionhq/client';
import type { ConfigurationService } from '../../config/ConfigurationService.js';
import type { ValidationError, ValidationWarning } from '../../../shared/types/index.js';
import type { DiagnosticResult } from './DiagnosticTypes.js';
import { logger } from '../../../shared/utils/index.js';

export class IssueAnalyzerService {
  private knowledgeBase: Map<string, DiagnosticResult> = new Map();

  constructor(
    private notionClient: Client,
    private configService: ConfigurationService
  ) {
    this.initializeKnowledgeBase();
  }

  /**
   * 검증 오류 분석
   */
  async analyzeValidationError(error: ValidationError, context?: Record<string, any>): Promise<DiagnosticResult> {
    logger.info(`🔬 Analyzing validation error: ${error.code}`);

    const issueId = `${error.code}_${Date.now()}`;
    
    // 지식 베이스에서 진단 템플릿 가져오기
    const template = this.knowledgeBase.get(error.code) || this.createDefaultDiagnostic(error);
    
    // 실시간 데이터로 진단 향상
    const enhancedDiagnostic = await this.enhanceDiagnosticWithRealTimeData(template, error, context);
    
    return enhancedDiagnostic;
  }

  /**
   * 시스템 문제 분석
   */
  async analyzeSystemIssues(): Promise<DiagnosticResult[]> {
    const diagnostics: DiagnosticResult[] = [];
    
    try {
      // 설정 문제 분석
      const configIssues = await this.analyzeConfigurationIssues();
      diagnostics.push(...configIssues);
      
      // API 연결 문제 분석
      const apiIssues = await this.analyzeApiIssues();
      diagnostics.push(...apiIssues);
      
      // 스키마 일관성 문제 분석
      const schemaIssues = await this.analyzeSchemaConsistency();
      diagnostics.push(...schemaIssues);
      
      // 성능 문제 분석
      const performanceIssues = await this.analyzePerformanceIssues();
      diagnostics.push(...performanceIssues);
      
    } catch (error: any) {
      logger.error(`Issue analysis failed: ${error.message}`);
    }
    
    return diagnostics;
  }

  /**
   * 설정 문제 분석
   */
  private async analyzeConfigurationIssues(): Promise<DiagnosticResult[]> {
    const issues: DiagnosticResult[] = [];
    
    try {
      const config = await this.configService.loadAndProcessConfig(process.cwd());
      
      // API 키 누락 확인
      if (!config?.apiKey) {
        issues.push(this.createDiagnostic({
          code: 'CONFIG_MISSING_API_KEY',
          severity: 'critical',
          category: 'configuration',
          title: 'Notion API Key Not Configured',
          description: 'The Notion API key is missing from configuration, preventing all API operations.',
          impact: {
            immediate: ['Cannot connect to Notion API', 'All database operations will fail'],
            longTerm: ['System cannot function', 'Data synchronization impossible'],
            affected: ['Database operations', 'Data upload', 'Schema validation']
          },
          rootCause: {
            primary: 'Missing NOTION_API_KEY environment variable or configuration',
            contributing: ['Configuration file not set up', 'Environment variables not loaded'],
            technicalDetails: { configPath: process.cwd(), apiKeyPresent: false }
          }
        }));
      }
      
      // 데이터베이스 ID 확인
      if (!config?.databases || Object.keys(config.databases).length === 0) {
        issues.push(this.createDiagnostic({
          code: 'CONFIG_MISSING_DATABASES',
          severity: 'error',
          category: 'configuration',
          title: 'No Databases Configured',
          description: 'No database IDs are configured, limiting system functionality.',
          impact: {
            immediate: ['Cannot access databases', 'Upload operations unavailable'],
            longTerm: ['System partially functional', 'Data storage unavailable'],
            affected: ['Data upload', 'Database management']
          },
          rootCause: {
            primary: 'Empty or missing databases configuration section',
            contributing: ['Configuration not initialized', 'Database setup incomplete'],
            technicalDetails: { configuredDatabases: 0, expectedDatabases: 6 }
          }
        }));
      }
      
    } catch (error: any) {
      issues.push(this.createDiagnostic({
        code: 'CONFIG_LOAD_ERROR',
        severity: 'critical',
        category: 'configuration',
        title: 'Configuration Load Failed',
        description: `Failed to load configuration: ${error.message}`,
        impact: {
          immediate: ['System cannot start', 'All operations blocked'],
          longTerm: ['System unusable until configuration is fixed'],
          affected: ['All system components']
        },
        rootCause: {
          primary: 'Configuration file parsing or access error',
          contributing: ['File permissions', 'Invalid JSON syntax', 'Missing file'],
          technicalDetails: { error: error.message, configPath: process.cwd() }
        }
      }));
    }
    
    return issues;
  }

  /**
   * API 연결 문제 분석
   */
  private async analyzeApiIssues(): Promise<DiagnosticResult[]> {
    const issues: DiagnosticResult[] = [];
    
    try {
      const startTime = Date.now();
      await this.notionClient.users.me();
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 5000) {
        issues.push(this.createDiagnostic({
          code: 'API_SLOW_RESPONSE',
          severity: 'warning',
          category: 'api',
          title: 'Slow API Response Time',
          description: `Notion API responding slowly (${responseTime}ms), which may indicate network or rate limiting issues.`,
          impact: {
            immediate: ['Slow operations', 'User experience degradation'],
            longTerm: ['Potential timeouts', 'Operation failures'],
            affected: ['All API operations', 'Data synchronization']
          },
          rootCause: {
            primary: 'Network latency or API rate limiting',
            contributing: ['Network connectivity', 'API load', 'Rate limiting'],
            technicalDetails: { responseTime, threshold: 5000 }
          }
        }));
      }
      
    } catch (error: any) {
      issues.push(this.createDiagnostic({
        code: 'API_CONNECTION_FAILED',
        severity: 'critical',
        category: 'api',
        title: 'Notion API Connection Failed',
        description: `Cannot connect to Notion API: ${error.message}`,
        impact: {
          immediate: ['All API operations blocked', 'System non-functional'],
          longTerm: ['Data synchronization impossible', 'System unusable'],
          affected: ['Database access', 'Data upload', 'Schema management']
        },
        rootCause: {
          primary: 'API authentication or network connectivity failure',
          contributing: ['Invalid API key', 'Network issues', 'API service down'],
          technicalDetails: { error: error.message, timestamp: new Date() }
        }
      }));
    }
    
    return issues;
  }

  /**
   * 스키마 일관성 분석
   */
  private async analyzeSchemaConsistency(): Promise<DiagnosticResult[]> {
    const issues: DiagnosticResult[] = [];
    
    // 스키마 일관성 검사 로직 구현
    // 향후 확장 가능
    
    return issues;
  }

  /**
   * 성능 문제 분석
   */
  private async analyzePerformanceIssues(): Promise<DiagnosticResult[]> {
    const issues: DiagnosticResult[] = [];
    
    const memoryUsage = process.memoryUsage();
    const memoryInMB = memoryUsage.heapUsed / 1024 / 1024;
    
    if (memoryInMB > 500) {
      issues.push(this.createDiagnostic({
        code: 'PERFORMANCE_HIGH_MEMORY',
        severity: 'warning',
        category: 'performance',
        title: 'High Memory Usage',
        description: `System is using ${memoryInMB.toFixed(2)}MB of memory, which may indicate memory leaks or inefficient operations.`,
        impact: {
          immediate: ['Slower performance', 'Potential memory pressure'],
          longTerm: ['System instability', 'Potential crashes'],
          affected: ['System performance', 'Operation speed']
        },
        rootCause: {
          primary: 'High memory consumption',
          contributing: ['Memory leaks', 'Large data processing', 'Inefficient algorithms'],
          technicalDetails: { memoryUsage: memoryInMB, threshold: 500 }
        }
      }));
    }
    
    return issues;
  }

  /**
   * 기본 진단 생성
   */
  private createDefaultDiagnostic(error: ValidationError): DiagnosticResult {
    return this.createDiagnostic({
      code: error.code,
      severity: 'error',
      category: 'schema',
      title: `Validation Error: ${error.code}`,
      description: error.message,
      impact: {
        immediate: ['Validation failure'],
        longTerm: ['Data integrity issues'],
        affected: ['Data validation']
      },
      rootCause: {
        primary: 'Schema validation failure',
        contributing: ['Invalid data', 'Schema mismatch'],
        technicalDetails: { error: error.message, field: error.field }
      }
    });
  }

  /**
   * 진단 결과 생성 헬퍼
   */
  private createDiagnostic(params: {
    code: string;
    severity: 'critical' | 'error' | 'warning' | 'info';
    category: 'schema' | 'configuration' | 'api' | 'performance' | 'data';
    title: string;
    description: string;
    impact: {
      immediate: string[];
      longTerm: string[];
      affected: string[];
    };
    rootCause: {
      primary: string;
      contributing: string[];
      technicalDetails: Record<string, any>;
    };
  }): DiagnosticResult {
    return {
      issueId: params.code,
      title: params.title,
      severity: params.severity,
      category: params.category,
      description: params.description,
      impact: params.impact,
      rootCause: params.rootCause,
      resolution: {
        detailedSteps: [],
        alternatives: [],
        prevention: []
      },
      diagnosticData: {
        detectedAt: new Date(),
        environment: process.env.NODE_ENV || 'development',
        systemState: {},
        relatedIssues: [],
        confidence: 0.8
      }
    };
  }

  /**
   * 실시간 데이터로 진단 향상
   */
  private async enhanceDiagnosticWithRealTimeData(
    template: DiagnosticResult,
    error: ValidationError,
    context?: Record<string, any>
  ): Promise<DiagnosticResult> {
    // 실시간 데이터로 진단 결과 향상
    const enhanced = { ...template };
    
    enhanced.diagnosticData.systemState = {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      ...context
    };
    
    enhanced.diagnosticData.detectedAt = new Date();
    
    return enhanced;
  }

  /**
   * 지식 베이스 초기화
   */
  private initializeKnowledgeBase(): void {
    // 일반적인 오류 패턴들을 지식 베이스에 추가
    // 향후 확장 가능
  }
}