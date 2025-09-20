/**
 * Integrated Data Structures for Optimized Output
 * 출력 모듈 최적화를 위한 통합 데이터 구조
 */

import type { AnalysisResult } from "./AnalysisResult";

/**
 * 출력을 위해 통합된 분석 데이터
 */
export interface IntegratedAnalysisData {
	/** 핵심 정보 (모든 출력 형태에서 공통 사용) */
	core: CoreAnalysisInfo;

	/** 상세 분석 결과 (JSON, 상세 출력용) */
	detailed: DetailedAnalysisInfo;

	/** 출력별 최적화된 뷰 */
	views: OutputViews;

	/** 통합 메타데이터 */
	metadata: IntegratedMetadata;
}

/**
 * 핵심 분석 정보
 */
export interface CoreAnalysisInfo {
	/** 파일 정보 */
	file: {
		name: string;
		path: string;
		extension: string;
		size?: number;
	};

	/** 언어 정보 */
	language: {
		detected: string;
		confidence: number;
		parser: string;
	};

	/** 분석 상태 */
	status: {
		overall: "success" | "error" | "partial" | "warning";
		code: string;
		message?: string;
	};

	/** 통합된 카운트 */
	counts: {
		dependencies: {
			total: number;
			external: number;
			internal: number;
			builtin: number;
		};
		imports: {
			total: number;
			named: number;
			default: number;
			namespace: number;
		};
		exports: {
			total: number;
			named: number;
			default: number;
			reexports: number;
		};
		identifiers: {
			functions: number;
			classes: number;
			interfaces: number;
			variables: number;
			types: number;
		};
	};

	/** 통합된 타이밍 */
	timing: {
		parse: number;
		extract: number;
		interpret: number;
		integrate: number;
		total: number;
	};

	/** 메모리 사용량 */
	memory: {
		peak: number;
		current: number;
		efficiency: number;
	};
}

/**
 * 상세 분석 정보
 */
export interface DetailedAnalysisInfo {
	/** 통합된 의존성 정보 */
	dependencies: MergedDependencyInfo;

	/** 통합된 코드 구조 */
	codeStructure: MergedCodeStructure;

	/** 통합된 복잡도 메트릭 */
	complexity: MergedComplexityMetrics;

	/** 분석 인사이트 */
	insights: AnalysisInsights;

	/** 권장사항 */
	recommendations: Recommendation[];
}

/**
 * 출력별 최적화된 뷰
 */
export interface OutputViews {
	/** 한 줄 요약용 뷰 */
	summary: SummaryView;

	/** 테이블 행용 뷰 */
	table: TableView;

	/** 트리 구조용 뷰 */
	tree: TreeView;

	/** CSV 행용 뷰 */
	csv: CSVView;

	/** 최소 정보 뷰 */
	minimal: MinimalView;
}

/**
 * 한 줄 요약 뷰
 */
export interface SummaryView {
	fileName: string;
	depCount: number;
	importCount: number;
	exportCount: number;
	parseTime: number;
	status: string;
	language: string;
	issues?: string[];
}

/**
 * 테이블 뷰
 */
export interface TableView {
	file: string;
	lang: string;
	deps: string;
	imports: string;
	exports: string;
	functions: string;
	classes: string;
	time: string;
	memory: string;
	status: string;
	issues: string;
}

/**
 * 트리 뷰
 */
export interface TreeView {
	root: TreeNode;
	summary: TreeSummary;
}

export interface TreeNode {
	type: "file" | "section" | "item" | "metric";
	name: string;
	value?: string | number;
	children?: TreeNode[];
	metadata?: Record<string, any>;
}

export interface TreeSummary {
	totalNodes: number;
	maxDepth: number;
	sections: string[];
}

/**
 * CSV 뷰
 */
export interface CSVView {
	file: string;
	language: string;
	dependencies: number;
	imports: number;
	exports: number;
	functions: number;
	classes: number;
	interfaces: number;
	variables: number;
	cyclomaticComplexity: number;
	linesOfCode: number;
	parseTime: number;
	totalTime: number;
	memoryUsage: number;
	status: string;
	errors: number;
	warnings: number;
}

/**
 * 최소 정보 뷰
 */
export interface MinimalView {
	name: string;
	deps: number;
	exports: number;
	time: number;
	ok: boolean;
}

/**
 * 통합된 의존성 정보
 */
export interface MergedDependencyInfo {
	/** 외부 의존성 (패키지) */
	external: EnhancedDependency[];

	/** 내부 의존성 (로컬 파일) */
	internal: EnhancedDependency[];

	/** 내장 모듈 */
	builtin: EnhancedDependency[];

	/** 의존성 그래프 */
	graph: DependencyGraphSummary;

	/** 순환 의존성 */
	cycles: CircularDependency[];

	/** 미사용 의존성 */
	unused: string[];

	/** 보안 이슈 */
	security: SecurityIssue[];
}

export interface EnhancedDependency {
	name: string;
	version?: string;
	type: "import" | "require" | "dynamic";
	usageCount: number;
	locations: DependencyLocation[];
	resolved: boolean;
	size?: number;
	license?: string;
	deprecated?: boolean;
}

export interface DependencyLocation {
	line: number;
	column: number;
	importType: "named" | "default" | "namespace";
	specifiers?: string[];
}

export interface DependencyGraphSummary {
	nodes: number;
	edges: number;
	depth: number;
	fanIn: number;
	fanOut: number;
	clusters: number;
}

export interface CircularDependency {
	cycle: string[];
	severity: "low" | "medium" | "high";
	impact: string;
}

export interface SecurityIssue {
	type: "vulnerability" | "license" | "deprecated";
	severity: "low" | "medium" | "high" | "critical";
	dependency: string;
	description: string;
	fix?: string;
}

/**
 * 통합된 코드 구조
 */
export interface MergedCodeStructure {
	/** 함수 정보 */
	functions: EnhancedFunction[];

	/** 클래스 정보 */
	classes: EnhancedClass[];

	/** 인터페이스 정보 */
	interfaces: EnhancedInterface[];

	/** 타입 정보 */
	types: EnhancedType[];

	/** 변수 정보 */
	variables: EnhancedVariable[];

	/** 모듈 정보 */
	module: ModuleInfo;

	/** 코드 패턴 */
	patterns: CodePattern[];
}

export interface EnhancedFunction {
	name: string;
	signature: string;
	complexity: number;
	linesOfCode: number;
	parameters: number;
	returnType?: string;
	isExported: boolean;
	isAsync: boolean;
	visibility: "public" | "private" | "protected";
	calls: string[];
	calledBy: string[];
	location: CodeLocation;
}

export interface EnhancedClass {
	name: string;
	methods: number;
	properties: number;
	extends?: string;
	implements: string[];
	isExported: boolean;
	isAbstract: boolean;
	complexity: number;
	cohesion: number;
	coupling: number;
	location: CodeLocation;
}

export interface EnhancedInterface {
	name: string;
	methods: number;
	properties: number;
	extends: string[];
	isExported: boolean;
	usage: number;
	location: CodeLocation;
}

export interface EnhancedType {
	name: string;
	definition: string;
	category: "primitive" | "object" | "union" | "intersection" | "generic";
	isExported: boolean;
	usage: number;
	complexity: number;
	location: CodeLocation;
}

export interface EnhancedVariable {
	name: string;
	type?: string;
	kind: "var" | "let" | "const";
	isExported: boolean;
	scope: "global" | "function" | "block";
	mutations: number;
	location: CodeLocation;
}

export interface ModuleInfo {
	type: "commonjs" | "esmodule" | "umd" | "mixed";
	hasDefaultExport: boolean;
	namedExports: number;
	reexports: number;
	sideEffects: boolean;
	treeShakeable: boolean;
}

export interface CodePattern {
	name: string;
	type: "design-pattern" | "anti-pattern" | "best-practice";
	description: string;
	instances: number;
	confidence: number;
	locations: CodeLocation[];
}

export interface CodeLocation {
	line: number;
	column: number;
	endLine?: number;
	endColumn?: number;
}

/**
 * 통합된 복잡도 메트릭
 */
export interface MergedComplexityMetrics {
	/** 전체 파일 메트릭 */
	file: FileComplexityMetrics;

	/** 함수별 메트릭 */
	functions: FunctionComplexityMetrics[];

	/** 클래스별 메트릭 */
	classes: ClassComplexityMetrics[];

	/** 품질 지표 */
	quality: QualityMetrics;

	/** 유지보수성 */
	maintainability: MaintainabilityMetrics;
}

export interface FileComplexityMetrics {
	cyclomaticComplexity: number;
	cognitiveComplexity: number;
	nestingDepth: number;
	linesOfCode: number;
	linesOfComments: number;
	linesBlank: number;
	maintainabilityIndex: number;
	halstead: HalsteadMetrics;
}

export interface FunctionComplexityMetrics {
	name: string;
	cyclomaticComplexity: number;
	cognitiveComplexity: number;
	nestingDepth: number;
	linesOfCode: number;
	parameters: number;
	returnPaths: number;
	location: CodeLocation;
}

export interface ClassComplexityMetrics {
	name: string;
	weightedMethodsPerClass: number;
	depthOfInheritance: number;
	numberOfChildren: number;
	couplingBetweenObjects: number;
	lackOfCohesion: number;
	location: CodeLocation;
}

export interface QualityMetrics {
	duplicateLines: number;
	duplicateBlocks: number;
	codeSmells: CodeSmell[];
	testCoverage?: number;
	documentationCoverage: number;
}

export interface CodeSmell {
	type: string;
	severity: "low" | "medium" | "high";
	description: string;
	location: CodeLocation;
	suggestion?: string;
}

export interface MaintainabilityMetrics {
	index: number;
	category: "low" | "medium" | "high";
	debt: TechnicalDebt;
	trends: QualityTrend[];
}

export interface TechnicalDebt {
	estimated: number; // minutes
	rating: "A" | "B" | "C" | "D" | "E";
	issues: DebtIssue[];
}

export interface DebtIssue {
	type: string;
	effort: number; // minutes
	description: string;
	location: CodeLocation;
}

export interface QualityTrend {
	metric: string;
	direction: "improving" | "stable" | "degrading";
	change: number;
}

export interface HalsteadMetrics {
	length: number;
	vocabulary: number;
	volume: number;
	difficulty: number;
	effort: number;
	timeToImplement: number;
	bugs: number;
}

/**
 * 분석 인사이트
 */
export interface AnalysisInsights {
	/** 주요 발견사항 */
	keyFindings: string[];

	/** 위험 요소 */
	risks: RiskAssessment[];

	/** 최적화 기회 */
	opportunities: OptimizationOpportunity[];

	/** 비교 메트릭 */
	benchmarks: BenchmarkComparison[];
}

export interface RiskAssessment {
	type: "security" | "performance" | "maintainability" | "compatibility";
	level: "low" | "medium" | "high" | "critical";
	description: string;
	impact: string;
	mitigation: string[];
	locations?: CodeLocation[];
}

export interface OptimizationOpportunity {
	type: "performance" | "size" | "maintainability" | "security";
	description: string;
	impact: "low" | "medium" | "high";
	effort: "low" | "medium" | "high";
	savings: string;
	implementation: string[];
}

export interface BenchmarkComparison {
	metric: string;
	value: number;
	benchmark: number;
	percentile: number;
	category: "excellent" | "good" | "average" | "below-average" | "poor";
}

/**
 * 권장사항
 */
export interface Recommendation {
	id: string;
	type: "improvement" | "fix" | "optimization" | "best-practice";
	priority: "low" | "medium" | "high" | "critical";
	title: string;
	description: string;
	rationale: string;
	implementation: ImplementationGuide;
	impact: ImpactAssessment;
	references?: string[];
}

export interface ImplementationGuide {
	steps: string[];
	codeExample?: string;
	toolsRequired?: string[];
	estimatedTime: string;
	difficulty: "easy" | "medium" | "hard";
}

export interface ImpactAssessment {
	performance?: "positive" | "neutral" | "negative";
	maintainability?: "positive" | "neutral" | "negative";
	security?: "positive" | "neutral" | "negative";
	compatibility?: "positive" | "neutral" | "negative";
	effort: "low" | "medium" | "high";
	confidence: number; // 0-1
}

/**
 * 통합 메타데이터
 */
export interface IntegratedMetadata {
	/** 통합 버전 */
	integrationVersion: string;

	/** 통합 시간 */
	integratedAt: Date;

	/** 데이터 소스 */
	dataSources: {
		extractors: string[];
		interpreters: string[];
		versions: Record<string, string>;
	};

	/** 통합 옵션 */
	integrationOptions: IntegrationOptions;

	/** 데이터 품질 */
	dataQuality: DataQualityAssessment;

	/** 신뢰도 점수 */
	confidence: {
		overall: number;
		parsing: number;
		extraction: number;
		interpretation: number;
		integration: number;
	};
}

export interface IntegrationOptions {
	includeLowConfidence: boolean;
	mergeStrategy: "conservative" | "aggressive" | "balanced";
	conflictResolution: "first-wins" | "last-wins" | "merge" | "skip";
	qualityThreshold: number;
}

export interface DataQualityAssessment {
	completeness: number; // 0-1
	accuracy: number; // 0-1
	consistency: number; // 0-1
	freshness: number; // 0-1
	validity: number; // 0-1
	issues: DataQualityIssue[];
}

export interface DataQualityIssue {
	type: "missing" | "inconsistent" | "invalid" | "outdated";
	severity: "low" | "medium" | "high";
	description: string;
	affectedData: string[];
	resolution?: string;
}

/**
 * 통합 설정
 */
export interface DataIntegrationConfig {
	/** 활성화할 뷰들 */
	enabledViews: (keyof OutputViews)[];

	/** 상세도 레벨 */
	detailLevel: "minimal" | "standard" | "comprehensive";

	/** 성능 vs 정확도 트레이드오프 */
	optimizationMode: "speed" | "accuracy" | "balanced";

	/** 출력 크기 제한 */
	sizeLimits: {
		maxStringLength: number;
		maxArrayLength: number;
		maxDepth: number;
	};

	/** 사용자 정의 뷰 */
	customViews?: Record<string, CustomViewConfig>;
}

export interface CustomViewConfig {
	name: string;
	description: string;
	fields: ViewField[];
	format: "object" | "array" | "string";
	transformer?: string; // Function name for custom transformation
}

export interface ViewField {
	key: string;
	source: string; // JSONPath to source data
	transformer?: "count" | "sum" | "avg" | "max" | "min" | "join" | "format";
	format?: string;
	default?: any;
}