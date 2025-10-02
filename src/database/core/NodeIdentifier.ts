/**
 * Node Identifier System
 * 노드의 고유성을 보장하고 재현 가능한 식별 시스템
 */

import { createHash } from "node:crypto";
import type { SupportedLanguage } from "../../core/types";

export interface NodeContext {
	sourceFile: string;
	language: SupportedLanguage;
	projectRoot: string;
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
	| "package";

export interface UniqueNodeIdentity {
	identifier: string;
	type: NodeType;
	name: string;
	context: NodeContext;
	location?: NodeLocation;
	metadata?: NodeMetadata;
}

/**
 * 노드 식별자 생성 및 관리 시스템
 *
 * 고유성 보장 원칙:
 * 1. 같은 엔티티는 항상 같은 identifier 생성
 * 2. 다른 엔티티는 절대 같은 identifier 생성 불가
 * 3. 프로젝트 재분석 시에도 동일한 identifier 유지
 */
export class NodeIdentifier {
	private projectRoot: string;

	constructor(projectRoot: string) {
		this.projectRoot = this.normalizeProjectRoot(projectRoot);
	}

	/**
	 * 고유 노드 식별자 생성
	 */
	createIdentifier(
		type: NodeType,
		name: string,
		context: NodeContext,
		location?: NodeLocation,
		metadata?: NodeMetadata,
	): string {
		const normalizedContext = this.normalizeContext(context);

		switch (type) {
			case "file":
				return this.createFileIdentifier(normalizedContext.sourceFile);

			case "directory":
				return this.createDirectoryIdentifier(name, normalizedContext);

			case "library":
			case "package":
				return this.createExternalIdentifier(type, name);

			case "import":
				return this.createImportIdentifier(name, normalizedContext, metadata);

			case "export":
				return this.createExportIdentifier(name, normalizedContext, metadata);

			case "class":
			case "interface":
			case "namespace":
			case "type":
			case "enum":
				return this.createTypeIdentifier(
					type,
					name,
					normalizedContext,
					location,
				);

			case "method":
			case "function":
				return this.createFunctionIdentifier(
					type,
					name,
					normalizedContext,
					location,
					metadata,
				);

			case "variable":
			case "constant":
			case "property":
			case "parameter":
				return this.createVariableIdentifier(
					type,
					name,
					normalizedContext,
					location,
					metadata,
				);

			default:
				return this.createGenericIdentifier(
					type,
					name,
					normalizedContext,
					location,
				);
		}
	}

	/**
	 * 식별자로부터 노드 정보 파싱
	 */
	parseIdentifier(identifier: string): Partial<UniqueNodeIdentity> | null {
		try {
			// 기본 유효성 검사
			if (
				!identifier ||
				identifier.trim() === "" ||
				!identifier.includes("#")
			) {
				return null;
			}

			const parts = identifier.split("#");

			if (parts.length < 2) {
				return null;
			}

			const [prefix, ...suffixParts] = parts;
			const suffix = suffixParts.join("#");

			// 빈 prefix나 suffix 검사
			if (!prefix || !suffix) {
				return null;
			}

			// 파일 식별자
			if (prefix === "file") {
				return {
					type: "file",
					name: this.getFileName(suffix),
					context: {
						sourceFile: suffix,
						language: this.detectLanguage(suffix),
						projectRoot: this.projectRoot,
					},
				};
			}

			// 외부 라이브러리/패키지
			if (prefix === "lib" || prefix === "pkg") {
				return {
					type: prefix === "lib" ? "library" : "package",
					name: suffix,
				};
			}

			// 프로젝트 내 엔티티
			const [filePath, entityPath] = suffix.split("::");
			if (!filePath || !entityPath) {
				return null;
			}

			// 위치 정보 제거하여 순수한 이름 추출
			const entityWithoutLocation = entityPath.split("@")[0];
			const entityParts = entityWithoutLocation.split(".");
			const name = entityParts[entityParts.length - 1];

			// 함수/메서드의 경우 매개변수 정보 제거
			const cleanName = name.includes("(") ? name.split("(")[0] : name;

			return {
				type: prefix as NodeType,
				name: cleanName,
				context: {
					sourceFile: filePath,
					language: this.detectLanguage(filePath),
					projectRoot: this.projectRoot,
				},
			};
		} catch (error) {
			return null;
		}
	}

	/**
	 * 식별자 유효성 검증
	 */
	validateIdentifier(identifier: string): boolean {
		try {
			const parts = identifier.split("#");
			if (parts.length < 2) {
				return false;
			}

			const [prefix] = parts;

			// 유효한 노드 타입인지 확인
			const validTypes = [
				"file",
				"class",
				"interface",
				"function",
				"method",
				"variable",
				"constant",
				"property",
				"import",
				"export",
				"library",
				"package",
				"lib",
				"pkg",
			];

			if (!validTypes.includes(prefix)) {
				return false;
			}

			// 빈 식별자 거부
			if (identifier.trim() === "" || identifier.endsWith("#")) {
				return false;
			}

			const parsed = this.parseIdentifier(identifier);
			return parsed !== null;
		} catch (error) {
			return false;
		}
	}

	/**
	 * 두 식별자의 관련성 확인
	 */
	areRelated(id1: string, id2: string): boolean {
		const parsed1 = this.parseIdentifier(id1);
		const parsed2 = this.parseIdentifier(id2);

		if (!parsed1 || !parsed2) {
			return false;
		}

		// 같은 파일 내 엔티티
		if (parsed1.context?.sourceFile === parsed2.context?.sourceFile) {
			return true;
		}

		// 외부 의존성 관계는 별도 로직으로 판단
		return false;
	}

	// Private 메서드들

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

	private createFileIdentifier(filePath: string): string {
		return `file#${filePath}`;
	}

	private createDirectoryIdentifier(
		name: string,
		context: NodeContext,
	): string {
		const dirPath = context.sourceFile.endsWith("/")
			? context.sourceFile.slice(0, -1)
			: context.sourceFile;
		return `dir#${dirPath}`;
	}

	private createExternalIdentifier(
		type: "library" | "package",
		name: string,
	): string {
		const prefix = type === "library" ? "lib" : "pkg";
		return `${prefix}#${name}`;
	}

	private createImportIdentifier(
		name: string,
		context: NodeContext,
		metadata?: NodeMetadata,
	): string {
		const importPath = metadata?.importPath || name;
		const hash = this.createHash(
			`${context.sourceFile}::import::${importPath}`,
		);
		return `import#${context.sourceFile}::${importPath}@${hash.slice(0, 8)}`;
	}

	private createExportIdentifier(
		name: string,
		context: NodeContext,
		metadata?: NodeMetadata,
	): string {
		const isDefault = metadata?.isDefault || false;
		const exportType = isDefault ? "default" : "named";
		return `export#${context.sourceFile}::${exportType}.${name}`;
	}

	private createTypeIdentifier(
		type: NodeType,
		name: string,
		context: NodeContext,
		location?: NodeLocation,
	): string {
		const locationSuffix = location
			? `@${location.startLine || 0}:${location.startColumn || 0}`
			: "";
		return `${type}#${context.sourceFile}::${name}${locationSuffix}`;
	}

	private createFunctionIdentifier(
		type: NodeType,
		name: string,
		context: NodeContext,
		location?: NodeLocation,
		metadata?: NodeMetadata,
	): string {
		// 함수 시그니처 기반 고유성 보장
		const params = metadata?.parameters || [];
		const paramSignature = params.map((p: any) => p.type || "any").join(",");
		const signature = `${name}(${paramSignature})`;

		const locationSuffix = location
			? `@${location.startLine || 0}:${location.startColumn || 0}`
			: "";

		return `${type}#${context.sourceFile}::${signature}${locationSuffix}`;
	}

	private createVariableIdentifier(
		type: NodeType,
		name: string,
		context: NodeContext,
		location?: NodeLocation,
		metadata?: NodeMetadata,
	): string {
		const scope = metadata?.scope || "unknown";
		const locationSuffix = location
			? `@${location.startLine || 0}:${location.startColumn || 0}`
			: "";

		return `${type}#${context.sourceFile}::${scope}.${name}${locationSuffix}`;
	}

	private createGenericIdentifier(
		type: NodeType,
		name: string,
		context: NodeContext,
		location?: NodeLocation,
	): string {
		const locationSuffix = location
			? `@${location.startLine || 0}:${location.startColumn || 0}`
			: "";

		return `${type}#${context.sourceFile}::${name}${locationSuffix}`;
	}

	private createHash(input: string): string {
		return createHash("md5").update(input).digest("hex");
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
