/**
 * 태그 분석 예시 코드
 */

export const exampleTags = [
	{
		name: "기능",
		type: "function_definition",
		location: { line: 5, column: 1 },
		metadata: {
			category: "development",
			priority: 1,
		},
	},
	{
		name: "가이드",
		type: "guide",
		location: { line: 9, column: 1 },
		metadata: {
			category: "documentation",
			priority: 2,
		},
	},
	{
		name: "API",
		type: "api",
		location: { line: 11, column: 1 },
		metadata: {
			category: "development",
			priority: 1,
		},
	},
];

export const exampleTagRelationships = [
	{
		tag: "기능",
		heading: "기능",
		relationshipType: "defines",
		context: "기능 관련 문서",
		strength: 0.9,
	},
	{
		tag: "가이드",
		heading: "사용법",
		relationshipType: "describes",
		context: "사용 가이드",
		strength: 0.8,
	},
];
