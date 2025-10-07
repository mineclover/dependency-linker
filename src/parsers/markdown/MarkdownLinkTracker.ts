/**
 * Markdown Link Tracker
 * 마크다운 링크 추적 및 분석 시스템
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
	ExternalLinkValidator,
	type LinkValidationResult,
} from "./ExternalLinkValidator";
import type { MarkdownRelationship } from "./MarkdownRDFIntegration";
import { MarkdownRDFIntegration } from "./MarkdownRDFIntegration";

// ===== LINK TRACKING TYPES =====

/**
 * 링크 추적 결과
 */
export interface LinkTrackingResult {
	/** 소스 파일 */
	sourceFile: string;
	/** 타겟 파일들 */
	targetFiles: string[];
	/** 링크 관계들 */
	relationships: MarkdownRelationship[];
	/** 깨진 링크들 */
	brokenLinks: BrokenLink[];
	/** 외부 링크들 */
	externalLinks: ExternalLink[];
	/** 앵커 링크들 */
	anchorLinks: AnchorLink[];
	/** 내부 링크들 (테스트 호환성) */
	internal: InternalLink[];
	/** 외부 링크들 (테스트 호환성) */
	external: ExternalLink[];
	/** 앵커 링크들 (테스트 호환성) */
	anchor: AnchorLink[];
	/** 이미지 링크들 (테스트 호환성) */
	images: ImageLink[];
	/** 통계 */
	statistics: LinkStatistics;
}

/**
 * 깨진 링크 정보
 */
export interface BrokenLink {
	/** 링크 텍스트 */
	text: string;
	/** 링크 URL */
	url: string;
	/** 소스 파일 */
	sourceFile: string;
	/** 라인 번호 */
	line: number;
	/** 에러 메시지 */
	error: string;
}

/**
 * 외부 링크 정보
 */
export interface ExternalLink {
	/** 링크 텍스트 */
	text: string;
	/** 링크 URL */
	url: string;
	/** 소스 파일 */
	sourceFile: string;
	/** 라인 번호 */
	line: number;
	/** 링크 타입 */
	type: "http" | "https" | "mailto" | "other";
	/** 검증 상태 */
	validation?: LinkValidationResult;
}

/**
 * 내부 링크 정보
 */
export interface InternalLink {
	/** 링크 텍스트 */
	text: string;
	/** 파일 경로 */
	path: string;
	/** 소스 파일 */
	sourceFile: string;
	/** 라인 번호 */
	line: number;
	/** 유효성 */
	isValid: boolean;
}

/**
 * 앵커 링크 정보
 */
export interface AnchorLink {
	/** 링크 텍스트 */
	text: string;
	/** 앵커 ID */
	anchor: string;
	/** 소스 파일 */
	sourceFile: string;
	/** 타겟 파일 */
	targetFile: string;
	/** 라인 번호 */
	line: number;
	/** 유효성 */
	isValid: boolean;
}

/**
 * 이미지 링크 정보
 */
export interface ImageLink {
	/** 이미지 텍스트 */
	alt: string;
	/** 이미지 URL */
	src: string;
	/** 소스 파일 */
	sourceFile: string;
	/** 라인 번호 */
	line: number;
	/** 유효성 */
	isValid: boolean;
}

/**
 * 링크 통계
 */
export interface LinkStatistics {
	/** 총 링크 수 */
	totalLinks: number;
	/** 내부 링크 수 */
	internalLinks: number;
	/** 외부 링크 수 */
	externalLinks: number;
	/** 앵커 링크 수 */
	anchorLinks: number;
	/** 깨진 링크 수 */
	brokenLinks: number;
	/** 유효한 링크 수 */
	validLinks: number;
	/** 링크 유효성 비율 */
	validityRatio: number;
}

// ===== MARKDOWN LINK TRACKER =====

/**
 * 마크다운 링크 추적기
 */
export class MarkdownLinkTracker {
	private rdfIntegration: MarkdownRDFIntegration;
	private projectRoot: string;
	private linkValidator: ExternalLinkValidator;

	constructor(projectRoot: string) {
		this.rdfIntegration = new MarkdownRDFIntegration();
		this.projectRoot = projectRoot;
		this.linkValidator = new ExternalLinkValidator({
			timeout: 5000,
			concurrent: 5,
			cache: true,
		});
	}

	/**
	 * 마크다운 파일의 링크 추적
	 */
	async trackLinks(
		filePath: string,
		projectName: string,
	): Promise<LinkTrackingResult> {
		try {
			// 파일 읽기
			const sourceCode = await fs.readFile(filePath, "utf-8");

			// RDF 분석
			const rdfResult = await this.rdfIntegration.analyzeMarkdownWithRDF(
				sourceCode,
				filePath,
				projectName,
			);

			// 링크 분석
			const brokenLinks: BrokenLink[] = [];
			const externalLinks: ExternalLink[] = [];
			const anchorLinks: AnchorLink[] = [];

			// 각 링크 분석
			for (const relationship of rdfResult.relationships) {
				await this.analyzeLink(
					relationship,
					filePath,
					brokenLinks,
					externalLinks,
					anchorLinks,
				);
			}

			// 통계 생성
			const statistics = this.generateStatistics(
				rdfResult.relationships,
				brokenLinks,
				externalLinks,
				anchorLinks,
			);

			// 내부 링크 추출 (테스트 호환성)
			const internal: InternalLink[] = this.extractInternalLinks(
				rdfResult.relationships,
				filePath,
			);

			// 이미지 링크 추출 (테스트 호환성)
			const images: ImageLink[] = this.extractImageLinks(
				rdfResult.relationships,
				filePath,
			);

			return {
				sourceFile: filePath,
				targetFiles: this.extractTargetFiles(rdfResult.relationships),
				relationships: rdfResult.relationships,
				brokenLinks,
				externalLinks,
				anchorLinks,
				internal,
				external: externalLinks,
				anchor: anchorLinks,
				images,
				statistics,
			};
		} catch (error) {
			throw new Error(`Failed to track links in ${filePath}: ${error}`);
		}
	}

	/**
	 * 프로젝트 전체 링크 추적
	 */
	async trackProjectLinks(
		projectName: string,
		markdownFiles: string[],
	): Promise<LinkTrackingResult[]> {
		const results: LinkTrackingResult[] = [];

		for (const filePath of markdownFiles) {
			try {
				const result = await this.trackLinks(filePath, projectName);
				results.push(result);
			} catch (error) {
				console.warn(`Failed to track links in ${filePath}: ${error}`);
			}
		}

		return results;
	}

	/**
	 * 개별 링크 분석
	 */
	private async analyzeLink(
		relationship: MarkdownRelationship,
		sourceFile: string,
		brokenLinks: BrokenLink[],
		externalLinks: ExternalLink[],
		anchorLinks: AnchorLink[],
	): Promise<void> {
		const { metadata } = relationship;

		if (relationship.type === "links_to" && metadata.filePath) {
			// 내부 파일 링크 검증
			const targetPath = path.resolve(this.projectRoot, metadata.filePath);
			try {
				await fs.access(targetPath);
			} catch {
				brokenLinks.push({
					text: metadata.linkText || "",
					url: metadata.url || "",
					sourceFile,
					line: 0, // TODO: 실제 라인 번호 추출
					error: `File not found: ${metadata.filePath}`,
				});
			}
		} else if (relationship.type === "references" && metadata.anchorId) {
			// 앵커 링크 검증
			const isValid = await this.validateAnchorLink(
				metadata.anchorId,
				sourceFile,
			);
			anchorLinks.push({
				text: metadata.linkText || "",
				anchor: metadata.anchorId || "",
				sourceFile,
				targetFile: sourceFile,
				line: 0, // TODO: 실제 라인 번호 추출
				isValid,
			});
		} else if (metadata.url && this.isExternalUrl(metadata.url)) {
			// 외부 링크 - 검증 포함
			const validation = await this.linkValidator.validateLink(metadata.url);
			externalLinks.push({
				text: metadata.linkText || "",
				url: metadata.url,
				sourceFile,
				line: 0, // TODO: 실제 라인 번호 추출
				type: this.getExternalLinkType(metadata.url),
				validation,
			});
		}
	}

	/**
	 * 앵커 링크 유효성 검증
	 */
	private async validateAnchorLink(
		anchorId: string,
		filePath: string,
	): Promise<boolean> {
		try {
			const sourceCode = await fs.readFile(filePath, "utf-8");
			const rdfResult = await this.rdfIntegration.analyzeMarkdownWithRDF(
				sourceCode,
				filePath,
				"temp",
			);

			// 해당 앵커 ID를 가진 heading 찾기
			return rdfResult.symbols.some(
				(symbol) => (symbol.metadata as any).anchorId === anchorId,
			);
		} catch {
			return false;
		}
	}

	/**
	 * 외부 URL 확인
	 */
	private isExternalUrl(url: string): boolean {
		return (
			url.startsWith("http://") ||
			url.startsWith("https://") ||
			url.startsWith("mailto:")
		);
	}

	/**
	 * 외부 링크 타입 결정
	 */
	private getExternalLinkType(
		url: string,
	): "http" | "https" | "mailto" | "other" {
		if (url.startsWith("https://")) return "https";
		if (url.startsWith("http://")) return "http";
		if (url.startsWith("mailto:")) return "mailto";
		return "other";
	}

	/**
	 * 타겟 파일 목록 추출
	 */
	private extractTargetFiles(relationships: MarkdownRelationship[]): string[] {
		const targetFiles = new Set<string>();

		for (const relationship of relationships) {
			if (relationship.type === "links_to" && relationship.metadata.filePath) {
				targetFiles.add(relationship.metadata.filePath);
			}
		}

		return Array.from(targetFiles);
	}

	/**
	 * 통계 생성
	 */
	private generateStatistics(
		relationships: MarkdownRelationship[],
		brokenLinks: BrokenLink[],
		externalLinks: ExternalLink[],
		anchorLinks: AnchorLink[],
	): LinkStatistics {
		const totalLinks = relationships.length;
		const internalLinks = relationships.filter(
			(r) => r.type === "links_to",
		).length;
		const externalLinksCount = externalLinks.length;
		const anchorLinksCount = anchorLinks.length;
		const brokenLinksCount = brokenLinks.length;
		const validLinks = totalLinks - brokenLinksCount;
		const validityRatio = totalLinks > 0 ? validLinks / totalLinks : 0;

		return {
			totalLinks,
			internalLinks,
			externalLinks: externalLinksCount,
			anchorLinks: anchorLinksCount,
			brokenLinks: brokenLinksCount,
			validLinks,
			validityRatio,
		};
	}

	/**
	 * 내부 링크 추출 (테스트 호환성)
	 */
	private extractInternalLinks(
		relationships: MarkdownRelationship[],
		sourceFile: string,
	): InternalLink[] {
		return relationships
			.filter((rel) => rel.type === "links_to")
			.map((rel, index) => ({
				text: rel.metadata.linkText || "",
				path: rel.target,
				sourceFile,
				line: index + 1,
				isValid: true,
			}));
	}

	/**
	 * 이미지 링크 추출 (테스트 호환성)
	 */
	private extractImageLinks(
		relationships: MarkdownRelationship[],
		sourceFile: string,
	): ImageLink[] {
		return relationships
			.filter((rel) => rel.type === "includes")
			.map((rel, index) => ({
				alt: rel.metadata.linkText || "",
				src: rel.target,
				sourceFile,
				line: index + 1,
				isValid: true,
			}));
	}
}
