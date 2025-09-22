#!/usr/bin/env npx tsx

/**
 * Interactive Demo: Enhanced Path Properties
 *
 * 이 데모는 새로운 PathInfo 기능들을 실제로 보여줍니다.
 */

import {
	analyzeMarkdownFile,
	getBatchMarkdownAnalysis,
	analyzeDirectory,
	PathInfo,
	createPathInfo,
	createBatchPathInfo,
	createValidatedPathInfo,
	comparePathInfo,
	groupPathInfoByDirectory,
	filterPathInfo
} from './src/lib/index';

// 색상 및 이모지 헬퍼
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
};

function colorize(text: string, color: keyof typeof colors): string {
	return `${colors[color]}${text}${colors.reset}`;
}

function section(title: string): void {
	console.log(`\n${colorize('═'.repeat(60), 'blue')}`);
	console.log(colorize(`🎯 ${title}`, 'bright'));
	console.log(colorize('═'.repeat(60), 'blue'));
}

function subsection(title: string): void {
	console.log(`\n${colorize(`📋 ${title}`, 'cyan')}`);
	console.log(colorize('─'.repeat(40), 'cyan'));
}

async function runInteractiveDemo() {
	console.log(colorize('\n🚀 Enhanced Path Properties - Interactive Demo', 'bright'));
	console.log(colorize('새로운 PathInfo 기능들을 실제로 체험해보세요!\n', 'yellow'));

	try {
		// Demo 1: 기본 PathInfo 기능
		section('Demo 1: 기본 PathInfo 기능');

		subsection('1.1 단일 파일 분석');
		console.log('📄 파일 분석 중: ./README.md');

		const singleResult = await analyzeMarkdownFile('./README.md');

		console.log(colorize('✅ 분석 완료!', 'green'));
		console.log('\n📊 PathInfo 상세 정보:');
		console.log(`   ${colorize('입력 경로:', 'magenta')} ${singleResult.pathInfo.input}`);
		console.log(`   ${colorize('절대 경로:', 'magenta')} ${singleResult.pathInfo.absolute}`);
		console.log(`   ${colorize('상대 경로:', 'magenta')} ${singleResult.pathInfo.relative}`);
		console.log(`   ${colorize('파일명:', 'magenta')} ${singleResult.pathInfo.fileName}`);
		console.log(`   ${colorize('기본명:', 'magenta')} ${singleResult.pathInfo.baseName}`);
		console.log(`   ${colorize('확장자:', 'magenta')} ${singleResult.pathInfo.extension}`);
		console.log(`   ${colorize('디렉토리:', 'magenta')} ${singleResult.pathInfo.relativeDirectory}`);
		console.log(`   ${colorize('프로젝트 내부:', 'magenta')} ${singleResult.pathInfo.isWithinProject ? colorize('✅ Yes', 'green') : colorize('❌ No', 'red')}`);
		console.log(`   ${colorize('깊이:', 'magenta')} ${singleResult.pathInfo.depth}`);

		subsection('1.2 기존 방식과 비교');
		console.log(`${colorize('기존 filePath:', 'yellow')} ${singleResult.filePath}`);
		console.log(`${colorize('새로운 absolute:', 'yellow')} ${singleResult.pathInfo.absolute}`);
		console.log(`${colorize('일치 여부:', 'yellow')} ${singleResult.filePath === singleResult.pathInfo.absolute ? colorize('✅ 일치', 'green') : colorize('❌ 불일치', 'red')}`);

		// Demo 2: 배치 분석 및 정렬
		section('Demo 2: 배치 분석 및 정렬');

		subsection('2.1 여러 파일 분석');
		const batchFiles = [
			'./README.md',
			'./docs/quickstart.md',
			'./CLAUDE.md'
		];

		console.log('📄 배치 분석 중:');
		batchFiles.forEach(file => console.log(`   - ${file}`));

		const batchResults = await getBatchMarkdownAnalysis(batchFiles, {
			concurrency: 2,
			continueOnError: true
		});

		console.log(colorize(`\n✅ ${batchResults.length}개 파일 분석 완료!`, 'green'));

		subsection('2.2 깊이 기준 정렬');
		const sortedResults = batchResults.sort((a, b) => comparePathInfo(a.pathInfo, b.pathInfo));

		console.log('\n📈 정렬된 결과 (깊이 → 알파벳순):');
		sortedResults.forEach((result, index) => {
			const status = result.errors.length > 0 ? colorize('❌', 'red') : colorize('✅', 'green');
			console.log(`   ${index + 1}. ${status} ${colorize(result.pathInfo.relative, 'cyan')} (깊이: ${result.pathInfo.depth})`);
		});

		// Demo 3: 디렉토리 분석
		section('Demo 3: 디렉토리 분석 및 그룹핑');

		subsection('3.1 프로젝트 디렉토리 스캔');
		console.log('📁 디렉토리 분석 중: ./ (Markdown 파일만)');

		const dirResults = await analyzeDirectory('./', {
			includeMarkdown: true,
			extensions: ['.md'],
			maxDepth: 2,
			ignorePatterns: ['**/node_modules/**', '**/dist/**', '**/.*']
		});

		console.log(colorize(`\n✅ ${dirResults.length}개 파일 발견!`, 'green'));

		subsection('3.2 디렉토리별 그룹핑');
		const validPathInfos = dirResults
			.filter(r => r.pathInfo)
			.map(r => r.pathInfo);

		if (validPathInfos.length > 0) {
			const groupedByDir = groupPathInfoByDirectory(validPathInfos);

			console.log(`\n📂 ${groupedByDir.size}개 디렉토리로 그룹화:`);
			for (const [dir, files] of groupedByDir) {
				const dirName = dir === '.' ? colorize('(프로젝트 루트)', 'yellow') : colorize(dir, 'cyan');
				console.log(`\n   📁 ${dirName}: ${colorize(`${files.length}개 파일`, 'green')}`);
				files.forEach(file => {
					console.log(`      📄 ${file.fileName}`);
				});
			}
		}

		// Demo 4: PathInfo 유틸리티 함수들
		section('Demo 4: PathInfo 유틸리티 함수');

		subsection('4.1 배치 PathInfo 생성');
		const testPaths = [
			'./README.md',
			'./src/lib/index.ts',
			'./docs/api/overview.md',
			'./tests/unit/parser.test.ts',
			'../external/file.md'
		];

		console.log('🔧 테스트 경로들:');
		testPaths.forEach(path => console.log(`   - ${path}`));

		const pathInfos = createBatchPathInfo(testPaths);

		subsection('4.2 필터링 예제');

		// 확장자별 필터링
		const markdownFiles = filterPathInfo(pathInfos, { extensions: ['.md'] });
		console.log(`\n📝 Markdown 파일 (${colorize(`${markdownFiles.length}개`, 'green')}):`);
		markdownFiles.forEach(info => {
			console.log(`   - ${colorize(info.relative, 'cyan')} (깊이: ${info.depth})`);
		});

		// 깊이별 필터링
		const shallowFiles = filterPathInfo(pathInfos, { maxDepth: 1 });
		console.log(`\n🏔️ 얕은 파일들 (깊이 ≤ 1, ${colorize(`${shallowFiles.length}개`, 'green')}):`);
		shallowFiles.forEach(info => {
			console.log(`   - ${colorize(info.relative, 'cyan')} (깊이: ${info.depth})`);
		});

		// 프로젝트 내부 파일만
		const internalFiles = filterPathInfo(pathInfos, { withinProject: true });
		console.log(`\n🏠 프로젝트 내부 파일 (${colorize(`${internalFiles.length}개`, 'green')}):`);
		internalFiles.forEach(info => {
			console.log(`   - ${colorize(info.relative, 'cyan')}`);
		});

		subsection('4.3 검증 기능');
		const validationTests = [
			{ path: './README.md', desc: '존재하는 Markdown 파일' },
			{ path: './nonexistent.md', desc: '존재하지 않는 파일' },
			{ path: './src/lib/index.ts', desc: 'TypeScript 파일 (확장자 제한)' }
		];

		console.log('\n🔍 파일 검증 테스트:');
		for (const test of validationTests) {
			const validation = createValidatedPathInfo(test.path, undefined, {
				mustExist: true,
				allowedExtensions: ['.md']
			});

			const status = validation.isValid ? colorize('✅ 유효', 'green') : colorize('❌ 무효', 'red');
			console.log(`   ${status} ${test.desc}`);
			if (!validation.isValid && validation.validationError) {
				console.log(`      ${colorize(`→ ${validation.validationError}`, 'red')}`);
			}
		}

		// Demo 5: 실제 사용 사례
		section('Demo 5: 실제 사용 사례');

		subsection('5.1 프로젝트 구조 분석');
		const structureAnalysis = analyzeProjectStructure(validPathInfos);

		console.log('\n📊 프로젝트 구조 분석 결과:');
		console.log(`   ${colorize('총 파일 수:', 'magenta')} ${structureAnalysis.totalFiles}`);
		console.log(`   ${colorize('평균 깊이:', 'magenta')} ${structureAnalysis.averageDepth.toFixed(1)}`);
		console.log(`   ${colorize('최대 깊이:', 'magenta')} ${structureAnalysis.maxDepth}`);

		console.log(`\n📈 깊이별 분포:`);
		Object.entries(structureAnalysis.depthDistribution)
			.sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
			.forEach(([depth, count]) => {
				const bar = '█'.repeat(Math.ceil(count / structureAnalysis.totalFiles * 20));
				console.log(`   깊이 ${depth}: ${colorize(bar, 'blue')} ${count}개`);
			});

		console.log(`\n📁 확장자별 분포:`);
		Object.entries(structureAnalysis.extensionDistribution)
			.sort((a, b) => b[1] - a[1])
			.forEach(([ext, count]) => {
				const percentage = ((count / structureAnalysis.totalFiles) * 100).toFixed(1);
				console.log(`   ${colorize(ext, 'cyan')}: ${count}개 (${percentage}%)`);
			});

		subsection('5.2 네비게이션 생성');
		const navigation = generateNavigation(validPathInfos);

		console.log('\n🧭 문서 네비게이션:');
		navigation.forEach(section => {
			console.log(`\n   📂 ${colorize(section.directory || '(루트)', 'yellow')}`);
			section.files.forEach(file => {
				console.log(`      📄 ${file.name} → ${colorize(file.url, 'cyan')}`);
			});
		});

		// Demo 완료
		section('Demo 완료');
		console.log(colorize('🎉 모든 데모가 성공적으로 완료되었습니다!', 'green'));
		console.log('\n✨ 주요 개선사항:');
		console.log(colorize('   ✅ 포괄적인 경로 정보 제공', 'green'));
		console.log(colorize('   ✅ 프로젝트 구조 인식', 'green'));
		console.log(colorize('   ✅ 고급 필터링 및 정렬', 'green'));
		console.log(colorize('   ✅ 디렉토리별 그룹핑', 'green'));
		console.log(colorize('   ✅ 하위 호환성 유지', 'green'));
		console.log(colorize('   ✅ 검증 및 유효성 검사', 'green'));

	} catch (error) {
		console.error(colorize('\n❌ 데모 실행 중 오류가 발생했습니다:', 'red'));
		console.error(error);
		process.exit(1);
	}
}

// 유틸리티 함수들
function analyzeProjectStructure(pathInfos: PathInfo[]) {
	const totalFiles = pathInfos.length;
	const depths = pathInfos.map(info => info.depth);
	const extensions = pathInfos.map(info => info.extension);

	const depthDistribution = depths.reduce((acc, depth) => {
		acc[depth] = (acc[depth] || 0) + 1;
		return acc;
	}, {} as Record<number, number>);

	const extensionDistribution = extensions.reduce((acc, ext) => {
		acc[ext] = (acc[ext] || 0) + 1;
		return acc;
	}, {} as Record<string, number>);

	const averageDepth = depths.reduce((sum, depth) => sum + depth, 0) / totalFiles;
	const maxDepth = Math.max(...depths);

	return {
		totalFiles,
		averageDepth,
		maxDepth,
		depthDistribution,
		extensionDistribution
	};
}

function generateNavigation(pathInfos: PathInfo[]) {
	const grouped = groupPathInfoByDirectory(pathInfos);

	return Array.from(grouped.entries()).map(([dir, files]) => ({
		directory: dir,
		files: files.map(file => ({
			name: file.baseName,
			path: file.relative,
			url: `/${file.relative.replace('.md', '.html')}`
		}))
	}));
}

// 데모 실행
if (require.main === module) {
	runInteractiveDemo().catch(error => {
		console.error(colorize('❌ 데모 실행 실패:', 'red'), error);
		process.exit(1);
	});
}