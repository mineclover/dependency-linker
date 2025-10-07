/**
 * Node Identifier System
 * RDF 기반 노드 식별 시스템
 *
 * RDF 주소 형식: <projectName>/<filePath>#<NodeType>:<SymbolName>
 * 예시: dependency-linker/src/parser.ts#Method:TypeScriptParser.parse
 */

import { createHash } from "node:crypto";
import type { SupportedLanguage } from "../../core/types";

export interface NodeContext {
	sourceFile: string;
	language: SupportedLanguage;
	projectRoot: string;
	projectName?: string;
}

export interface NodeLocation {
	startLine?: number;
	startColumn?: number;
	endLine?: number;
	endColumn?: number;
}

export interface NodeMetadata {
	[key: string]: any;
}

export type NodeType =
	| "file"
	| "directory"
	| "class"
	| "interface"
	| "method"
	| "function"
	| "variable"
	| "constant"
	| "property"
	| "parameter"
	| "import"
	| "export"
	| "namespace"
	| "type"
	| "enum"
	| "library"
	| "module"
	| "package"
	| "heading"
	| "unknown";

export interface UniqueNodeIdentity {
	identifier: string;
	type: NodeType;
	name: string;
	context: NodeContext;
	location?: NodeLocation;
	metadata?: NodeMetadata;
}

/**
 * RDF 주소 파싱 결과
 */
export interface RdfAddress {
	/** 프로젝트 이름 */
	projectName: string;
	/** 파일 경로 */
	filePath: string;
	/** 노드 타입 (메타 태그의 modifier 부분) */
	nodeType: string;
	/** 심볼 이름 (메타 태그의 value 부분) */
	symbolName: string;
	/** 원본 RDF 주소 */
	raw: string;
}

/**
 * 노드 식별자 생성 및 관리 시스템
 *
 * RDF 기반 고유성 보장 원칙:
 * 1. 같은 파일의 같은 심볼은 항상 같은 RDF 주소 생성
 * 2. 다른 심볼은 절대 같은 RDF 주소 생성 불가
 * 3. 프로젝트 재분석 시에도 동일한 RDF 주소 유지
 * 4. 같은 파일 내 동일 심볼명 금지 (문서 품질 강제)
 */
export class NodeIdentifier {
	private projectRoot: string;

	constructor(projectRoot: string) {
		this.projectRoot = this.normalizeProjectRoot(projectRoot);
	}

	/**
	 * RDF 형식 노드 식별자 생성
	 * 형식: <projectName>/<filePath>#<NodeType>:<SymbolName>
	 */
	createIdentifier(
		type: NodeType,
		name: string,
		context: NodeContext,
		location?: NodeLocation,
		metadata?: NodeMetadata,
	): string {
		const normalizedContext = this.normalizeContext(context);
		const { sourceFile } = normalizedContext;
		const projectName = normalizedContext.projectName || "unknown-project";

		// 파일 노드는 메타 태그 없이 처리
		if (type === "file") {
			return `${projectName}/${sourceFile}`;
		}

		// 디렉토리 노드
		if (type === "directory") {
			const dirPath = sourceFile.endsWith("/")
				? sourceFile.slice(0, -1)
				: sourceFile;
			return `${projectName}/${dirPath}`;
		}

		// 외부 라이브러리/패키지는 프로젝트 이름 없이
		if (type === "library" || type === "package") {
			return `${type}#${name}`;
		}

		// 일반 심볼: RDF 주소 + 메타 태그
		const capitalizedType = this.capitalizeNodeType(type);
		return `${projectName}/${sourceFile}#${capitalizedType}:${name}`;
	}

	/**
	 * RDF 주소로부터 노드 정보 파싱
	 */
	parseIdentifier(identifier: string): Partial<UniqueNodeIdentity> | null {
		try {
			// 외부 라이브러리/패키지 체크
			if (
				identifier.startsWith("library#") ||
				identifier.startsWith("package#")
			) {
				const [type, name] = identifier.split("#");
				return {
					type: type as NodeType,
					name: name,
				};
			}

			// RDF 주소 파싱
			const rdfAddress = this.parseRdfAddress(identifier);
			if (!rdfAddress) {
				return null;
			}

			const { projectName, filePath, nodeType, symbolName } = rdfAddress;

			// 파일/디렉토리 노드 (메타 태그 없음)
			if (!nodeType && !symbolName) {
				return {
					type: "file",
					name: this.getFileName(filePath),
					context: {
						sourceFile: filePath,
						language: this.detectLanguage(filePath),
						projectRoot: this.projectRoot,
						projectName: projectName,
					},
				};
			}

			// 일반 심볼 노드
			const type = this.normalizeNodeType(nodeType);
			return {
				type: type,
				name: symbolName,
				context: {
					sourceFile: filePath,
					language: this.detectLanguage(filePath),
					projectRoot: this.projectRoot,
					projectName: projectName,
				},
			};
		} catch (error) {
			return null;
		}
	}

	/**
	 * RDF 주소 파싱
	 * 형식: <projectName>/<filePath>#<NodeType>:<SymbolName>
	 */
	parseRdfAddress(address: string): RdfAddress | null {
		try {
			// 기본 유효성 검사
			if (!address || address.trim() === "") {
				return null;
			}

			// # 기준으로 분리
			const hashIndex = address.indexOf("#");

			// 파일/디렉토리 노드 (메타 태그 없음)
			if (hashIndex === -1) {
				const firstSlashIndex = address.indexOf("/");
				if (firstSlashIndex === -1) {
					return null;
				}

				const projectName = address.substring(0, firstSlashIndex);
				const filePath = address.substring(firstSlashIndex + 1);

				return {
					projectName: projectName,
					filePath: filePath,
					nodeType: "",
					symbolName: "",
					raw: address,
				};
			}

			// 메타 태그가 있는 노드
			const [projectAndFile, metaTag] = [
				address.substring(0, hashIndex),
				address.substring(hashIndex + 1),
			];

			// projectName/filePath 분리 (첫 번째 / 기준)
			const firstSlashIndex = projectAndFile.indexOf("/");
			if (firstSlashIndex === -1) {
				return null;
			}

			const projectName = projectAndFile.substring(0, firstSlashIndex);
			const filePath = projectAndFile.substring(firstSlashIndex + 1);

			// 메타 태그 파싱: NodeType:SymbolName
			const colonIndex = metaTag.indexOf(":");
			if (colonIndex === -1) {
				return null;
			}

			const nodeType = metaTag.substring(0, colonIndex);
			const symbolName = metaTag.substring(colonIndex + 1);

			return {
				projectName: projectName,
				filePath: filePath,
				nodeType: nodeType,
				symbolName: symbolName,
				raw: address,
			};
		} catch (error) {
			return null;
		}
	}

	/**
	 * RDF 주소 유효성 검증
	 */
	validateIdentifier(identifier: string): boolean {
		try {
			// 빈 식별자 거부
			if (!identifier || identifier.trim() === "") {
				return false;
			}

			// 외부 라이브러리/패키지 검증
			if (
				identifier.startsWith("library#") ||
				identifier.startsWith("package#")
			) {
				return (
					identifier.split("#").length === 2 && identifier.split("#")[1] !== ""
				);
			}

			// RDF 주소 파싱 가능 여부로 검증
			const parsed = this.parseRdfAddress(identifier);
			if (!parsed) {
				return false;
			}

			// projectName과 filePath는 필수
			if (!parsed.projectName || !parsed.filePath) {
				return false;
			}

			// 메타 태그가 있다면 둘 다 있어야 함
			if (
				(parsed.nodeType && !parsed.symbolName) ||
				(!parsed.nodeType && parsed.symbolName)
			) {
				return false;
			}

			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * 두 식별자의 관련성 확인 (같은 파일 내 엔티티)
	 */
	areRelated(id1: string, id2: string): boolean {
		const addr1 = this.parseRdfAddress(id1);
		const addr2 = this.parseRdfAddress(id2);

		if (!addr1 || !addr2) {
			return false;
		}

		// 같은 프로젝트, 같은 파일
		return (
			addr1.projectName === addr2.projectName &&
			addr1.filePath === addr2.filePath
		);
	}

	// Private 헬퍼 메서드들

	private normalizeProjectRoot(projectRoot: string): string {
		return projectRoot.replace(/\\/g, "/").replace(/\/$/, "");
	}

	private normalizeContext(context: NodeContext): NodeContext {
		return {
			...context,
			sourceFile: this.normalizeFilePath(context.sourceFile),
			projectRoot: this.normalizeProjectRoot(context.projectRoot),
		};
	}

	private normalizeFilePath(filePath: string): string {
		const normalized = filePath.replace(/\\/g, "/");

		// 프로젝트 루트 기준 상대 경로로 변환
		if (normalized.startsWith(this.projectRoot)) {
			return normalized.substring(this.projectRoot.length + 1);
		}

		return normalized;
	}

	/**
	 * NodeType을 대문자로 시작하도록 변환 (메타 태그용)
	 * class → Class, method → Method
	 */
	private capitalizeNodeType(type: NodeType): string {
		return type.charAt(0).toUpperCase() + type.slice(1);
	}

	/**
	 * 대문자로 시작하는 NodeType을 소문자 NodeType으로 변환
	 * Class → class, Method → method
	 */
	private normalizeNodeType(capitalizedType: string): NodeType {
		const lowerType = capitalizedType.toLowerCase();
		return lowerType as NodeType;
	}

	private getFileName(filePath: string): string {
		return filePath.split("/").pop() || filePath;
	}

	private detectLanguage(filePath: string): SupportedLanguage {
		if (filePath.endsWith(".tsx")) return "tsx";
		if (filePath.endsWith(".ts")) return "typescript";
		if (filePath.endsWith(".jsx")) return "jsx";
		if (filePath.endsWith(".js")) return "javascript";
		if (filePath.endsWith(".java")) return "java";
		if (filePath.endsWith(".py")) return "python";
		if (filePath.endsWith(".go")) return "go";
		if (filePath.endsWith(".md")) return "markdown";
		return "typescript";
	}
}

/**
 * 노드 식별자 팩토리
 */
export function createNodeIdentifier(projectRoot: string): NodeIdentifier {
	return new NodeIdentifier(projectRoot);
}

/**
 * 표준 노드 생성 헬퍼
 */
export function createStandardNode(
	type: NodeType,
	name: string,
	context: NodeContext,
	location?: NodeLocation,
	metadata?: NodeMetadata,
): UniqueNodeIdentity {
	const identifier = createNodeIdentifier(context.projectRoot);

	return {
		identifier: identifier.createIdentifier(
			type,
			name,
			context,
			location,
			metadata,
		),
		type,
		name,
		context,
		location,
		metadata,
	};
}
