/**
 * 마크다운 분석 예시 코드
 */

export const exampleMarkdown = `# 프로젝트 문서

## 개요
이 프로젝트는 의존성 분석 도구입니다.

## 기능
- [의존성 분석](dependency-analysis.md) #기능
- [코드 분석](code-analysis.md) #기능
- [리포트 생성](report-generation.md) #기능

## 사용법
자세한 사용법은 [사용자 가이드](user-guide.md)를 참조하세요.

## 태그
- #기능: 기능 관련 문서
- #가이드: 사용 가이드
- #API: API 문서
`;

export const exampleHeadings = [
	{
		level: 1,
		text: "프로젝트 문서",
		line: 1,
		column: 1,
	},
	{
		level: 2,
		text: "개요",
		line: 3,
		column: 1,
	},
	{
		level: 2,
		text: "기능",
		line: 5,
		column: 1,
	},
	{
		level: 2,
		text: "사용법",
		line: 9,
		column: 1,
	},
	{
		level: 2,
		text: "태그",
		line: 11,
		column: 1,
	},
];

export const exampleMarkdowns = [
	"docs/README.md",
	"docs/API.md", 
	"docs/USAGE.md",
	"docs/CHANGELOG.md",
	"docs/CONTRIBUTING.md",
];

export const markdownFiles = [
	"docs/README.md",
	"docs/API.md",
	"docs/USAGE.md",
];
