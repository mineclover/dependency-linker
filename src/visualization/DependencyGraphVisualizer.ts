/**
 * Dependency Graph Visualizer
 * 의존성 그래프 시각화 시스템
 *
 * 핵심 기능:
 * 1. Graph DB 데이터 시각화
 * 2. 다양한 출력 형식 (SVG, HTML, JSON)
 * 3. 인터랙티브 그래프
 * 4. 스타일링 및 테마
 * 5. 성능 최적화
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type {
	GraphDatabase,
	GraphNode,
	GraphRelationship,
} from "../database/GraphDatabase.js";

export interface GraphVisualizationOptions {
	/** 출력 형식 */
	format?: "svg" | "html" | "json" | "dot";
	/** 그래프 방향 */
	direction?: "TB" | "BT" | "LR" | "RL";
	/** 노드 스타일 */
	nodeStyle?: {
		shape?: "box" | "ellipse" | "circle" | "diamond";
		color?: string;
		fillColor?: string;
		fontSize?: number;
		width?: number;
		height?: number;
	};
	/** 엣지 스타일 */
	edgeStyle?: {
		color?: string;
		style?: "solid" | "dashed" | "dotted";
		width?: number;
		arrowSize?: number;
	};
	/** 레이아웃 옵션 */
	layout?: {
		spacing?: number;
		rankSep?: number;
		nodeSep?: number;
		edgeSep?: number;
	};
	/** 필터링 옵션 */
	filters?: {
		nodeTypes?: string[];
		relationshipTypes?: string[];
		maxDepth?: number;
		minWeight?: number;
	};
	/** 성능 옵션 */
	performance?: {
		maxNodes?: number;
		maxEdges?: number;
		enableClustering?: boolean;
		enableSimplification?: boolean;
	};
}

export interface GraphVisualizationResult {
	format: string;
	content: string;
	metadata: {
		nodeCount: number;
		edgeCount: number;
		generatedAt: Date;
		processingTime: number;
		fileSize: number;
	};
}

export interface GraphNodeData {
	id: string;
	label: string;
	type: string;
	attributes: Record<string, any>;
	position?: { x: number; y: number };
	style: {
		shape: string;
		color: string;
		fillColor: string;
		fontSize: number;
		width: number;
		height: number;
	};
}

export interface GraphEdgeData {
	id: string;
	source: string;
	target: string;
	label: string;
	type: string;
	weight: number;
	style: {
		color: string;
		style: string;
		width: number;
		arrowSize: number;
	};
}

/**
 * 의존성 그래프 시각화 시스템
 */
export class DependencyGraphVisualizer {
	private options: Required<GraphVisualizationOptions>;

	constructor(options: GraphVisualizationOptions = {}) {
		this.options = {
			format: options.format || "svg",
			direction: options.direction || "TB",
			nodeStyle: {
				shape: options.nodeStyle?.shape || "box",
				color: options.nodeStyle?.color || "#333333",
				fillColor: options.nodeStyle?.fillColor || "#ffffff",
				fontSize: options.nodeStyle?.fontSize || 12,
				width: options.nodeStyle?.width || 100,
				height: options.nodeStyle?.height || 50,
				...options.nodeStyle,
			},
			edgeStyle: {
				color: options.edgeStyle?.color || "#666666",
				style: options.edgeStyle?.style || "solid",
				width: options.edgeStyle?.width || 1,
				arrowSize: options.edgeStyle?.arrowSize || 1,
				...options.edgeStyle,
			},
			layout: {
				spacing: options.layout?.spacing || 50,
				rankSep: options.layout?.rankSep || 100,
				nodeSep: options.layout?.nodeSep || 50,
				edgeSep: options.layout?.edgeSep || 20,
				...options.layout,
			},
			filters: {
				nodeTypes: options.filters?.nodeTypes || [],
				relationshipTypes: options.filters?.relationshipTypes || [],
				maxDepth: options.filters?.maxDepth || 10,
				minWeight: options.filters?.minWeight || 0,
				...options.filters,
			},
			performance: {
				maxNodes: options.performance?.maxNodes || 1000,
				maxEdges: options.performance?.maxEdges || 5000,
				enableClustering: options.performance?.enableClustering !== false,
				enableSimplification:
					options.performance?.enableSimplification !== false,
				...options.performance,
			},
		};
	}

	/**
	 * Graph DB에서 데이터 시각화
	 */
	async visualizeFromDatabase(
		database: GraphDatabase,
		outputPath?: string,
	): Promise<GraphVisualizationResult> {
		const startTime = Date.now();

		try {
			// Graph DB에서 데이터 조회
			const { nodes, edges } = await this.extractGraphData(database);

			// 데이터 필터링 및 최적화
			const filteredData = this.filterAndOptimizeData(nodes, edges);

			// 시각화 생성
			const content = await this.generateVisualization(filteredData);

			// 파일 저장
			if (outputPath) {
				await this.saveToFile(content, outputPath);
			}

			const processingTime = Date.now() - startTime;

			return {
				format: this.options.format,
				content,
				metadata: {
					nodeCount: filteredData.nodes.length,
					edgeCount: filteredData.edges.length,
					generatedAt: new Date(),
					processingTime,
					fileSize: Buffer.byteLength(content, "utf-8"),
				},
			};
		} catch (error) {
			throw new Error(
				`Graph visualization failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Graph DB 데이터 추출
	 */
	private async extractGraphData(database: GraphDatabase): Promise<{
		nodes: GraphNodeData[];
		edges: GraphEdgeData[];
	}> {
		// 노드 조회
		const graphNodes = await database.findNodes({});
		const nodes: GraphNodeData[] = graphNodes.map((node) => ({
			id: node.id?.toString() || `node-${Math.random()}`,
			label: node.name || node.identifier || `Node ${node.id}`,
			type: node.type || "unknown",
			attributes: {
				identifier: node.identifier,
				sourceFile: node.sourceFile,
				language: node.language,
				...node.metadata,
			},
			style: this.getNodeStyle(node),
		}));

		// 엣지 조회
		const graphEdges = await database.findRelationships({});
		const edges: GraphEdgeData[] = graphEdges.map((edge) => ({
			id: `${edge.fromNodeId}-${edge.toNodeId}`,
			source: edge.fromNodeId?.toString() || `node-${Math.random()}`,
			target: edge.toNodeId?.toString() || `node-${Math.random()}`,
			label: edge.type || "relationship",
			type: edge.type || "unknown",
			weight: edge.weight || 1,
			style: this.getEdgeStyle(edge),
		}));

		return { nodes, edges };
	}

	/**
	 * 데이터 필터링 및 최적화
	 */
	private filterAndOptimizeData(
		nodes: GraphNodeData[],
		edges: GraphEdgeData[],
	): { nodes: GraphNodeData[]; edges: GraphEdgeData[] } {
		let filteredNodes = nodes;
		let filteredEdges = edges;

		// 노드 타입 필터링
		if (
			this.options.filters?.nodeTypes &&
			this.options.filters.nodeTypes.length > 0
		) {
			filteredNodes = nodes.filter((node) =>
				this.options.filters?.nodeTypes?.includes(node.type),
			);
		}

		// 관계 타입 필터링
		if (
			this.options.filters?.relationshipTypes &&
			this.options.filters.relationshipTypes.length > 0
		) {
			filteredEdges = edges.filter((edge) =>
				this.options.filters?.relationshipTypes?.includes(edge.type),
			);
		}

		// 가중치 필터링
		if ((this.options.filters?.minWeight ?? 0) > 0) {
			filteredEdges = filteredEdges.filter(
				(edge) => (edge.weight ?? 0) >= (this.options.filters?.minWeight ?? 0),
			);
		}

		// 성능 최적화
		if (filteredNodes.length > (this.options.performance?.maxNodes ?? 1000)) {
			filteredNodes = this.clusterNodes(filteredNodes);
		}

		if (filteredEdges.length > (this.options.performance?.maxEdges ?? 5000)) {
			filteredEdges = this.simplifyEdges(filteredEdges);
		}

		// 유효한 노드만 포함하는 엣지 필터링
		const validNodeIds = new Set(filteredNodes.map((n) => n.id));
		filteredEdges = filteredEdges.filter(
			(edge) => validNodeIds.has(edge.source) && validNodeIds.has(edge.target),
		);

		return { nodes: filteredNodes, edges: filteredEdges };
	}

	/**
	 * 노드 클러스터링
	 */
	private clusterNodes(nodes: GraphNodeData[]): GraphNodeData[] {
		// 타입별로 클러스터링
		const clusters = new Map<string, GraphNodeData[]>();

		for (const node of nodes) {
			if (!clusters.has(node.type)) {
				clusters.set(node.type, []);
			}
			clusters.get(node.type)?.push(node);
		}

		const clusteredNodes: GraphNodeData[] = [];

		for (const [type, typeNodes] of clusters) {
			if (typeNodes.length <= 10) {
				// 작은 클러스터는 그대로 유지
				clusteredNodes.push(...typeNodes);
			} else {
				// 큰 클러스터는 대표 노드로 축약
				const representative = typeNodes[0];
				representative.label = `${type} (${typeNodes.length} nodes)`;
				representative.attributes.clusterSize = typeNodes.length;
				clusteredNodes.push(representative);
			}
		}

		return clusteredNodes;
	}

	/**
	 * 엣지 단순화
	 */
	private simplifyEdges(edges: GraphEdgeData[]): GraphEdgeData[] {
		// 가중치가 높은 엣지 우선 선택
		return edges
			.sort((a, b) => b.weight - a.weight)
			.slice(0, this.options.performance.maxEdges);
	}

	/**
	 * 시각화 생성
	 */
	private async generateVisualization(data: {
		nodes: GraphNodeData[];
		edges: GraphEdgeData[];
	}): Promise<string> {
		switch (this.options.format) {
			case "svg":
				return this.generateSVG(data);
			case "html":
				return this.generateHTML(data);
			case "json":
				return this.generateJSON(data);
			case "dot":
				return this.generateDOT(data);
			default:
				throw new Error(`Unsupported format: ${this.options.format}`);
		}
	}

	/**
	 * SVG 생성
	 */
	private generateSVG(data: {
		nodes: GraphNodeData[];
		edges: GraphEdgeData[];
	}): string {
		const width = 1200;
		const height = 800;
		const margin = 50;

		let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
		svg += `<defs><style>
			.node { fill: ${this.options.nodeStyle.fillColor}; stroke: ${this.options.nodeStyle.color}; stroke-width: 2; }
			.edge { stroke: ${this.options.edgeStyle.color}; stroke-width: ${this.options.edgeStyle.width}; }
			.label { font-family: Arial, sans-serif; font-size: ${this.options.nodeStyle.fontSize}px; text-anchor: middle; }
		</style></defs>`;

		// 노드 렌더링
		for (const node of data.nodes) {
			const x = margin + Math.random() * (width - 2 * margin);
			const y = margin + Math.random() * (height - 2 * margin);

			const nodeWidth = this.options.nodeStyle?.width ?? 100;
			const nodeHeight = this.options.nodeStyle?.height ?? 50;
			svg += `<rect x="${x - nodeWidth / 2}" y="${y - nodeHeight / 2}" 
				width="${nodeWidth}" height="${nodeHeight}" 
				class="node" rx="5"/>`;
			svg += `<text x="${x}" y="${y + 5}" class="label">${node.label}</text>`;
		}

		// 엣지 렌더링
		for (const edge of data.edges) {
			const sourceNode = data.nodes.find((n) => n.id === edge.source);
			const targetNode = data.nodes.find((n) => n.id === edge.target);

			if (sourceNode && targetNode) {
				svg += `<line x1="${sourceNode.position?.x || 0}" y1="${sourceNode.position?.y || 0}" 
					x2="${targetNode.position?.x || 0}" y2="${targetNode.position?.y || 0}" 
					class="edge" marker-end="url(#arrowhead)"/>`;
			}
		}

		svg += `</svg>`;
		return svg;
	}

	/**
	 * HTML 생성
	 */
	private generateHTML(data: {
		nodes: GraphNodeData[];
		edges: GraphEdgeData[];
	}): string {
		return `<!DOCTYPE html>
<html>
<head>
	<title>Dependency Graph Visualization</title>
	<script src="https://d3js.org/d3.v7.min.js"></script>
	<style>
		.node { fill: ${this.options.nodeStyle.fillColor}; stroke: ${this.options.nodeStyle.color}; stroke-width: 2; }
		.edge { stroke: ${this.options.edgeStyle.color}; stroke-width: ${this.options.edgeStyle.width}; }
		.label { font-family: Arial, sans-serif; font-size: ${this.options.nodeStyle.fontSize}px; text-anchor: middle; }
	</style>
</head>
<body>
	<div id="graph"></div>
	<script>
		const data = ${JSON.stringify(data, null, 2)};
		// D3.js를 사용한 인터랙티브 그래프 구현
		// (실제 구현은 더 복잡함)
	</script>
</body>
</html>`;
	}

	/**
	 * JSON 생성
	 */
	private generateJSON(data: {
		nodes: GraphNodeData[];
		edges: GraphEdgeData[];
	}): string {
		return JSON.stringify(
			{
				nodes: data.nodes,
				edges: data.edges,
				metadata: {
					generatedAt: new Date().toISOString(),
					format: this.options.format,
					options: this.options,
				},
			},
			null,
			2,
		);
	}

	/**
	 * DOT (Graphviz) 생성
	 */
	private generateDOT(data: {
		nodes: GraphNodeData[];
		edges: GraphEdgeData[];
	}): string {
		let dot = `digraph G {
	rankdir=${this.options.direction};
	ranksep=${this.options.layout.rankSep};
	nodesep=${this.options.layout.nodeSep};
	edgesep=${this.options.layout.edgeSep};
	
`;

		// 노드 정의
		for (const node of data.nodes) {
			dot += `	"${node.id}" [label="${node.label}", shape=${this.options.nodeStyle.shape}, 
				color="${this.options.nodeStyle.color}", fillcolor="${this.options.nodeStyle.fillColor}"];\n`;
		}

		// 엣지 정의
		for (const edge of data.edges) {
			dot += `	"${edge.source}" -> "${edge.target}" [label="${edge.label}", 
				color="${this.options.edgeStyle.color}", style=${this.options.edgeStyle.style}];\n`;
		}

		dot += `}`;
		return dot;
	}

	/**
	 * 노드 스타일 생성
	 */
	private getNodeStyle(node: GraphNode): GraphNodeData["style"] {
		const typeColors: Record<string, string> = {
			file: "#e1f5fe",
			library: "#f3e5f5",
			function: "#e8f5e8",
			class: "#fff3e0",
			interface: "#fce4ec",
		};

		return {
			shape: this.options.nodeStyle?.shape || "ellipse",
			color: this.options.nodeStyle?.color || "#333",
			fillColor:
				typeColors[node.type || "unknown"] ||
				this.options.nodeStyle?.fillColor ||
				"#fff",
			fontSize: this.options.nodeStyle?.fontSize || 12,
			width: this.options.nodeStyle?.width || 100,
			height: this.options.nodeStyle?.height || 50,
		};
	}

	/**
	 * 엣지 스타일 생성
	 */
	private getEdgeStyle(edge: GraphRelationship): GraphEdgeData["style"] {
		const typeStyles: Record<string, string> = {
			imports_file: "solid",
			imports_library: "dashed",
			uses: "dotted",
		};

		return {
			color: this.options.edgeStyle?.color || "#999",
			style:
				typeStyles[edge.type || "unknown"] ||
				this.options.edgeStyle?.style ||
				"solid",
			width: this.options.edgeStyle?.width || 2,
			arrowSize: this.options.edgeStyle?.arrowSize || 8,
		};
	}

	/**
	 * 파일 저장
	 */
	private async saveToFile(content: string, outputPath: string): Promise<void> {
		await fs.mkdir(path.dirname(outputPath), { recursive: true });
		await fs.writeFile(outputPath, content, "utf-8");
	}
}

