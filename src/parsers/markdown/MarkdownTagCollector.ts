/**
 * Markdown Tag Collector
 * 마크다운 문서에서 태그 수집
 */

export interface MarkdownTag {
	/** 태그 이름 */
	name: string;
	/** 태그 타입 */
	type: "inline" | "heading" | "link" | "definition" | "category";
	/** 태그 위치 */
	location: {
		line: number;
		column: number;
		endLine?: number;
		endColumn?: number;
	};
	/** 컨텍스트 */
	context?: string;
	/** 메타데이터 */
	metadata?: {
		priority?: number;
		category?: string;
		attributes?: Record<string, string>;
	};
}

export interface TagCollectionResult {
	/** 수집된 태그들 */
	tags: MarkdownTag[];
	/** 에러 */
	errors: string[];
	/** 경고 */
	warnings: string[];
	/** 배열 메서드 (테스트 호환성) */
	length: number;
	map: <T>(callback: (tag: MarkdownTag, index: number) => T) => T[];
	filter: (
		callback: (tag: MarkdownTag, index: number) => boolean,
	) => MarkdownTag[];
	find: (
		callback: (tag: MarkdownTag, index: number) => boolean,
	) => MarkdownTag | undefined;
	forEach: (callback: (tag: MarkdownTag, index: number) => void) => void;
	[Symbol.iterator]: () => Iterator<MarkdownTag>;
}

/**
 * 마크다운 태그 수집기
 */
export class MarkdownTagCollector {
	private tagPatterns = {
		inline: /#[\w가-힣-]+/g,
		heading: /^#{1,6}\s+.*#[\w가-힣-]+/gm,
		link: /\[([^\]]+)\]\([^)]+\)\s*#[\w가-힣-]+/g,
		definition: /^#[\w가-힣-]+:\s*.*$/gm,
		category: /^##\s*#[\w가-힣-]+/gm,
	};

	/**
	 * 마크다운에서 태그 수집
	 */
	async collectTags(
		markdown: string,
		filePath: string,
		projectName: string,
	): Promise<TagCollectionResult> {
		const tags: MarkdownTag[] = [];
		const errors: string[] = [];
		const warnings: string[] = [];

		try {
			// 인라인 태그 수집
			this.collectInlineTags(markdown, tags);

			// 헤딩 태그 수집
			this.collectHeadingTags(markdown, tags);

			// 링크 태그 수집
			this.collectLinkTags(markdown, tags);

			// 정의 태그 수집
			this.collectDefinitionTags(markdown, tags);

			// 카테고리 태그 수집
			this.collectCategoryTags(markdown, tags);

			// 중복 제거
			const uniqueTags = this.removeDuplicateTags(tags);

			// 배열 메서드를 지원하는 객체 생성
			const result = {
				tags: uniqueTags,
				errors,
				warnings,
				length: uniqueTags.length,
				map: <T>(callback: (tag: MarkdownTag, index: number) => T) =>
					uniqueTags.map(callback),
				filter: (callback: (tag: MarkdownTag, index: number) => boolean) =>
					uniqueTags.filter(callback),
				find: (callback: (tag: MarkdownTag, index: number) => boolean) =>
					uniqueTags.find(callback),
				forEach: (callback: (tag: MarkdownTag, index: number) => void) =>
					uniqueTags.forEach(callback),
				[Symbol.iterator]: () => uniqueTags[Symbol.iterator](),
			};

			return result;
		} catch (error) {
			errors.push(`Failed to collect tags: ${error}`);
			const emptyTags: MarkdownTag[] = [];
			return {
				tags: emptyTags,
				errors,
				warnings,
				length: 0,
				map: <T>(callback: (tag: MarkdownTag, index: number) => T) =>
					emptyTags.map(callback),
				filter: (callback: (tag: MarkdownTag, index: number) => boolean) =>
					emptyTags.filter(callback),
				find: (callback: (tag: MarkdownTag, index: number) => boolean) =>
					emptyTags.find(callback),
				forEach: (callback: (tag: MarkdownTag, index: number) => void) =>
					emptyTags.forEach(callback),
				[Symbol.iterator]: () => emptyTags[Symbol.iterator](),
			};
		}
	}

	/**
	 * 인라인 태그 수집
	 */
	private collectInlineTags(markdown: string, tags: MarkdownTag[]): void {
		const matches = markdown.matchAll(this.tagPatterns.inline);

		for (const match of matches) {
			if (match.index !== undefined) {
				const tag = this.createTagFromMatch(match, "inline", markdown);
				if (tag) {
					tags.push(tag);
				}
			}
		}
	}

	/**
	 * 헤딩 태그 수집
	 */
	private collectHeadingTags(markdown: string, tags: MarkdownTag[]): void {
		const matches = markdown.matchAll(this.tagPatterns.heading);

		for (const match of matches) {
			if (match.index !== undefined) {
				const tag = this.createTagFromMatch(match, "heading", markdown);
				if (tag) {
					tags.push(tag);
				}
			}
		}
	}

	/**
	 * 링크 태그 수집
	 */
	private collectLinkTags(markdown: string, tags: MarkdownTag[]): void {
		const matches = markdown.matchAll(this.tagPatterns.link);

		for (const match of matches) {
			if (match.index !== undefined) {
				const tag = this.createTagFromMatch(match, "link", markdown);
				if (tag) {
					tags.push(tag);
				}
			}
		}
	}

	/**
	 * 정의 태그 수집
	 */
	private collectDefinitionTags(markdown: string, tags: MarkdownTag[]): void {
		const matches = markdown.matchAll(this.tagPatterns.definition);

		for (const match of matches) {
			if (match.index !== undefined) {
				const tag = this.createTagFromMatch(match, "definition", markdown);
				if (tag) {
					tags.push(tag);
				}
			}
		}
	}

	/**
	 * 카테고리 태그 수집
	 */
	private collectCategoryTags(markdown: string, tags: MarkdownTag[]): void {
		const matches = markdown.matchAll(this.tagPatterns.category);

		for (const match of matches) {
			if (match.index !== undefined) {
				const tag = this.createTagFromMatch(match, "category", markdown);
				if (tag) {
					tags.push(tag);
				}
			}
		}
	}

	/**
	 * 매치에서 태그 객체 생성
	 */
	private createTagFromMatch(
		match: RegExpMatchArray,
		type: MarkdownTag["type"],
		markdown: string,
	): MarkdownTag | null {
		try {
			const fullMatch = match[0];
			const tagMatch = fullMatch.match(/#[\w가-힣-]+/);

			if (!tagMatch) return null;

			const tagName = tagMatch[0];
			const startIndex = match.index!;
			const endIndex = startIndex + fullMatch.length;

			// 위치 정보 계산
			const beforeMatch = markdown.substring(0, startIndex);
			const line = (beforeMatch.match(/\n/g) || []).length + 1;
			const column = startIndex - beforeMatch.lastIndexOf("\n");

			// 컨텍스트 추출
			const context = this.extractContext(markdown, startIndex, endIndex);

			return {
				name: tagName,
				type,
				location: {
					line,
					column,
					endLine: line,
					endColumn: column + fullMatch.length,
				},
				context,
				metadata: {
					priority: this.calculatePriority(tagName, type),
					category: this.extractCategory(tagName),
				},
			};
		} catch (error) {
			console.error("Failed to create tag from match:", error);
			return null;
		}
	}

	/**
	 * 컨텍스트 추출
	 */
	private extractContext(
		markdown: string,
		startIndex: number,
		endIndex: number,
	): string {
		const contextStart = Math.max(0, startIndex - 50);
		const contextEnd = Math.min(markdown.length, endIndex + 50);
		return markdown.substring(contextStart, contextEnd).trim();
	}

	/**
	 * 태그 우선순위 계산
	 */
	private calculatePriority(
		tagName: string,
		type: MarkdownTag["type"],
	): number {
		const priorityMap: Record<string, number> = {
			"#기능": 10,
			"#예시": 8,
			"#요구사항": 9,
			"#시나리오": 7,
			"#개선": 6,
			"#todo": 5,
			"#테스트": 8,
			"#에러": 7,
		};

		return priorityMap[tagName] || 1;
	}

	/**
	 * 카테고리 추출
	 */
	private extractCategory(tagName: string): string {
		const categoryMap: Record<string, string> = {
			"#기능": "functionality",
			"#예시": "example",
			"#요구사항": "requirement",
			"#시나리오": "scenario",
			"#개선": "improvement",
			"#todo": "task",
			"#테스트": "test",
			"#에러": "error",
		};

		return categoryMap[tagName] || "general";
	}

	/**
	 * 중복 태그 제거
	 */
	private removeDuplicateTags(tags: MarkdownTag[]): MarkdownTag[] {
		const seen = new Set<string>();
		return tags.filter((tag) => {
			const key = `${tag.name}-${tag.location.line}-${tag.location.column}`;
			if (seen.has(key)) {
				return false;
			}
			seen.add(key);
			return true;
		});
	}
}
