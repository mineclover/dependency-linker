/**
 * Markdown Tag-Heading Mapper
 * 마크다운에서 태그와 헤딩의 관계 매핑
 */

import type { MarkdownHeading } from "./MarkdownHeadingExtractor";
import type { MarkdownTag } from "./MarkdownTagCollector";

export interface TagHeadingRelationship {
	/** 태그 */
	tag: MarkdownTag;
	/** 헤딩 */
	heading: MarkdownHeading;
	/** 관계 타입 */
	type: "direct" | "nearby" | "contextual";
	/** 관계 강도 (0-1) */
	strength: number;
	/** 거리 (라인 수) */
	distance: number;
	/** 컨텍스트 */
	context?: string;
}

export interface TagHeadingMappingResult {
	/** 매핑된 관계들 */
	relationships: TagHeadingRelationship[];
	/** 에러 */
	errors: string[];
	/** 경고 */
	warnings: string[];
	/** 배열 메서드 (테스트 호환성) */
	length: number;
	filter: (
		callback: (rel: TagHeadingRelationship, index: number) => boolean,
	) => TagHeadingRelationship[];
	forEach: (
		callback: (rel: TagHeadingRelationship, index: number) => void,
	) => void;
}

/**
 * 마크다운 태그-헤딩 매퍼
 */
export class MarkdownTagHeadingMapper {
	/**
	 * 태그와 헤딩의 관계 매핑
	 */
	async mapTagHeadingRelationships(
		headings: MarkdownHeading[],
		tags: MarkdownTag[],
		projectName: string,
	): Promise<TagHeadingMappingResult> {
		const relationships: TagHeadingRelationship[] = [];
		const errors: string[] = [];
		const warnings: string[] = [];

		try {
			// 각 태그에 대해 가장 가까운 헤딩 찾기
			for (const tag of tags) {
				const closestHeading = this.findClosestHeading(tag, headings);
				if (closestHeading) {
					const relationship = this.createRelationship(tag, closestHeading);
					relationships.push(relationship);
				}
			}

			// 관계 정렬 (강도 순)
			relationships.sort((a, b) => b.strength - a.strength);

			// 배열 메서드를 지원하는 객체 생성
			const result = {
				relationships,
				errors,
				warnings,
				length: relationships.length,
				filter: (
					callback: (rel: TagHeadingRelationship, index: number) => boolean,
				) => relationships.filter(callback),
				forEach: (
					callback: (rel: TagHeadingRelationship, index: number) => void,
				) => relationships.forEach(callback),
			};

			return result;
		} catch (error) {
			errors.push(`Failed to map tag-heading relationships: ${error}`);
			const emptyRelationships: TagHeadingRelationship[] = [];
			return {
				relationships: emptyRelationships,
				errors,
				warnings,
				length: 0,
				filter: (
					callback: (rel: TagHeadingRelationship, index: number) => boolean,
				) => emptyRelationships.filter(callback),
				forEach: (
					callback: (rel: TagHeadingRelationship, index: number) => void,
				) => emptyRelationships.forEach(callback),
			};
		}
	}

	/**
	 * 태그에 가장 가까운 헤딩 찾기
	 */
	private findClosestHeading(
		tag: MarkdownTag,
		headings: MarkdownHeading[],
	): MarkdownHeading | null {
		if (headings.length === 0) return null;

		let closestHeading: MarkdownHeading | null = null;
		let minDistance = Infinity;

		for (const heading of headings) {
			const distance = this.calculateDistance(tag, heading);
			if (distance < minDistance) {
				minDistance = distance;
				closestHeading = heading;
			}
		}

		return closestHeading;
	}

	/**
	 * 태그와 헤딩 간의 거리 계산
	 */
	private calculateDistance(
		tag: MarkdownTag,
		heading: MarkdownHeading,
	): number {
		const tagLine = tag.location.line;
		const headingLine = heading.location.line;

		// 같은 라인에 있으면 거리 0
		if (tagLine === headingLine) return 0;

		// 라인 차이
		return Math.abs(tagLine - headingLine);
	}

	/**
	 * 태그-헤딩 관계 생성
	 */
	private createRelationship(
		tag: MarkdownTag,
		heading: MarkdownHeading,
	): TagHeadingRelationship {
		const distance = this.calculateDistance(tag, heading);
		const strength = this.calculateStrength(tag, heading, distance);
		const type = this.determineRelationshipType(tag, heading, distance);

		return {
			tag,
			heading,
			type,
			strength,
			distance,
			context: this.extractContext(tag, heading),
		};
	}

	/**
	 * 관계 강도 계산
	 */
	private calculateStrength(
		tag: MarkdownTag,
		heading: MarkdownHeading,
		distance: number,
	): number {
		let strength = 1.0;

		// 거리에 따른 강도 감소
		if (distance > 0) {
			strength *= Math.exp(-distance / 10); // 지수적 감소
		}

		// 태그 타입에 따른 강도 조정
		const typeMultiplier = this.getTypeMultiplier(tag.type);
		strength *= typeMultiplier;

		// 태그 우선순위에 따른 강도 조정
		const priorityMultiplier = this.getPriorityMultiplier(tag.name);
		strength *= priorityMultiplier;

		return Math.min(1.0, Math.max(0.0, strength));
	}

	/**
	 * 관계 타입 결정
	 */
	private determineRelationshipType(
		tag: MarkdownTag,
		heading: MarkdownHeading,
		distance: number,
	): TagHeadingRelationship["type"] {
		// 같은 라인에 있으면 직접 관계
		if (distance === 0) return "direct";

		// 가까운 거리면 근접 관계
		if (distance <= 5) return "nearby";

		// 그 외는 맥락적 관계
		return "contextual";
	}

	/**
	 * 타입별 강도 배수
	 */
	private getTypeMultiplier(type: MarkdownTag["type"]): number {
		const multipliers: Record<MarkdownTag["type"], number> = {
			heading: 1.0,
			inline: 0.8,
			link: 0.9,
			definition: 1.0,
			category: 0.7,
		};

		return multipliers[type] || 0.5;
	}

	/**
	 * 우선순위별 강도 배수
	 */
	private getPriorityMultiplier(tagName: string): number {
		const priorityMap: Record<string, number> = {
			"#기능": 1.0,
			"#예시": 0.9,
			"#요구사항": 1.0,
			"#시나리오": 0.8,
			"#개선": 0.7,
			"#todo": 0.6,
			"#테스트": 0.9,
			"#에러": 0.8,
		};

		return priorityMap[tagName] || 0.5;
	}

	/**
	 * 컨텍스트 추출
	 */
	private extractContext(tag: MarkdownTag, heading: MarkdownHeading): string {
		const tagContext = tag.context || "";
		const headingText = heading.text;

		return `${headingText} - ${tagContext}`.trim();
	}
}
