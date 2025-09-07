/**
 * Diagnostic Types - 진단 서비스의 타입 정의
 */

export interface DiagnosticResult {
  issueId: string;
  title: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  category: 'schema' | 'configuration' | 'api' | 'performance' | 'data';
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
  resolution: {
    quickFix?: {
      description: string;
      commands: string[];
      estimatedTime: string;
      riskLevel: 'low' | 'medium' | 'high';
    };
    detailedSteps: ResolutionStep[];
    alternatives: AlternativeResolution[];
    prevention: PreventionStrategy[];
  };
  diagnosticData: {
    detectedAt: Date;
    environment: string;
    systemState: Record<string, any>;
    relatedIssues: string[];
    confidence: number; // 0-1
  };
}

export interface ResolutionStep {
  order: number;
  title: string;
  description: string;
  commands: string[];
  expectedOutcome: string;
  validationCheck: string;
  rollbackPlan?: string;
  timeEstimate: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prerequisites: string[];
}

export interface AlternativeResolution {
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  steps: ResolutionStep[];
  riskLevel: 'low' | 'medium' | 'high';
  timeEstimate: string;
}

export interface PreventionStrategy {
  title: string;
  description: string;
  implementation: string[];
  monitoringPoints: string[];
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

export interface HealthCheck {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  metrics: Record<string, any>;
  issues: string[];
  recommendations: string[];
}

export interface SystemDiagnostics {
  overview: {
    totalIssues: number;
    criticalIssues: number;
    systemHealth: 'healthy' | 'degraded' | 'critical';
    lastDiagnostic: Date;
  };
  healthChecks: HealthCheck[];
  detailedDiagnostics: DiagnosticResult[];
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}