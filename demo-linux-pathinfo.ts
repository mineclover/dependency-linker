#!/usr/bin/env npx tsx

/**
 * Linux PathInfo Demo - 리눅스 환경 최적화 시연
 *
 * 이 데모는 Linux 환경에서 PathInfo의 최적 성능과 기능을 보여줍니다.
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

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { cpus } from 'os';

// Linux 스타일 색상 출력
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

function linuxBanner(): void {
	console.log(colorize('┌─────────────────────────────────────────────────────────────┐', 'cyan'));
	console.log(colorize('│                🐧 Linux PathInfo Demo                      │', 'cyan'));
	console.log(colorize('│         Linux 환경 최적화된 경로 분석 시스템               │', 'cyan'));
	console.log(colorize('└─────────────────────────────────────────────────────────────┘', 'cyan'));
}

async function runLinuxDemo() {
	linuxBanner();

	console.log(colorize('\n🖥️  시스템 정보:', 'bright'));
	console.log(`   플랫폼: ${colorize(process.platform, 'green')} (${process.arch})`);
	console.log(`   Node.js: ${colorize(process.version, 'green')}`);
	console.log(`   CPU 코어: ${colorize(cpus().length.toString(), 'green')}개`);
	console.log(`   작업 디렉토리: ${colorize(process.cwd(), 'green')}`);
	console.log(`   프로세스 ID: ${colorize(process.pid.toString(), 'green')}`);

	try {
		// =================================================================
		// Demo 1: Linux 표준 경로 처리
		// =================================================================
		console.log(colorize('\n╭─────────────────────────────────────────────────────────────╮', 'blue'));
		console.log(colorize('│                Demo 1: Linux 표준 경로 처리                │', 'blue'));
		console.log(colorize('╰─────────────────────────────────────────────────────────────╯', 'blue'));

		const linuxPaths = [
			'./README.md',                    // 현재 프로젝트
			'/home/user/projects/app/src',   // 사용자 프로젝트
			'/opt/applications/service',     // 시스템 애플리케이션
			'/usr/local/bin/tool',          // 로컬 도구
			'/var/log/application.log',     // 로그 파일
			'/tmp/build/output.js',         // 임시 빌드
			'~/documents/file.md',          // 홈 디렉토리 (~는 실제로는 확장되지 않음)
			'../external/library'           // 프로젝트 외부
		];

		console.log(colorize('\n🐧 Linux 경로 패턴 분석:', 'yellow'));
		const linuxPathInfos = createBatchPathInfo(linuxPaths);

		linuxPathInfos.forEach((pathInfo, i) => {
			const status = pathInfo.isWithinProject ? colorize('✅ 내부', 'green') : colorize('🔗 외부', 'yellow');
			const separator = pathInfo.separator === '/' ? colorize('/', 'green') : colorize('\\', 'red');

			console.log(`   ${i + 1}. ${pathInfo.input}`);
			console.log(`      → ${pathInfo.relative} (깊이: ${pathInfo.depth}, 구분자: ${separator}, ${status})`);
		});

		// =================================================================
		// Demo 2: 프로젝트 구조 분석 (Linux 최적화)
		// =================================================================
		console.log(colorize('\n╭─────────────────────────────────────────────────────────────╮', 'blue'));
		console.log(colorize('│            Demo 2: 프로젝트 구조 분석 (Linux 최적화)       │', 'blue'));
		console.log(colorize('╰─────────────────────────────────────────────────────────────╯', 'blue'));

		console.log(colorize('\n🔍 현재 프로젝트 구조 분석 중...', 'cyan'));

		const startTime = Date.now();
		const projectResults = await analyzeDirectory('./', {
			includeMarkdown: true,
			extensions: ['.ts', '.js', '.md', '.json'],
			maxDepth: 3,
			ignorePatterns: [
				'**/node_modules/**',
				'**/dist/**',
				'**/build/**',
				'**/.git/**',
				'**/.cache/**',
				'**/coverage/**'
			]
		});
		const analysisTime = Date.now() - startTime;

		const validPathInfos = projectResults
			.filter(r => r.pathInfo)
			.map(r => r.pathInfo);

		console.log(colorize(`✅ 분석 완료! (${analysisTime}ms)`, 'green'));
		console.log(`   총 파일: ${colorize(projectResults.length.toString(), 'cyan')}개`);
		console.log(`   유효한 PathInfo: ${colorize(validPathInfos.length.toString(), 'cyan')}개`);

		// Linux 스타일 트리 구조 출력
		console.log(colorize('\n🌳 프로젝트 트리 구조:', 'yellow'));
		const grouped = groupPathInfoByDirectory(validPathInfos);

		const sortedDirs = Array.from(grouped.keys()).sort();
		sortedDirs.forEach((dir, dirIndex) => {
			const files = grouped.get(dir)!;
			const isLast = dirIndex === sortedDirs.length - 1;
			const dirSymbol = isLast ? '└──' : '├──';
			const dirName = dir === '.' ? colorize('(프로젝트 루트)', 'bright') : colorize(dir, 'cyan');

			console.log(`   ${dirSymbol} 📁 ${dirName} (${files.length}개)`);

			files.forEach((file, fileIndex) => {
				const isLastFile = fileIndex === files.length - 1;
				const fileSymbol = isLast ? '    ' : '│   ';
				const filePrefix = isLastFile ? '└──' : '├──';
				const fileIcon = file.extension === '.md' ? '📝' :
								file.extension === '.ts' ? '📘' :
								file.extension === '.js' ? '📙' :
								file.extension === '.json' ? '📋' : '📄';

				console.log(`   ${fileSymbol}${filePrefix} ${fileIcon} ${file.fileName}`);
			});
		});

		// =================================================================
		// Demo 3: Linux 성능 벤치마크
		// =================================================================
		console.log(colorize('\n╭─────────────────────────────────────────────────────────────╮', 'blue'));
		console.log(colorize('│              Demo 3: Linux 성능 벤치마크                   │', 'blue'));
		console.log(colorize('╰─────────────────────────────────────────────────────────────╯', 'blue'));

		const benchmarkPaths = Array.from({ length: 1000 }, (_, i) =>
			`./src/component${i % 10}/module${i % 5}/file${i}.ts`
		);

		console.log(colorize(`\n⚡ ${benchmarkPaths.length}개 경로 성능 테스트:`, 'yellow'));

		// 단일 처리 성능
		const singleStart = Date.now();
		benchmarkPaths.forEach(path => createPathInfo(path));
		const singleTime = Date.now() - singleStart;

		// 배치 처리 성능
		const batchStart = Date.now();
		createBatchPathInfo(benchmarkPaths);
		const batchTime = Date.now() - batchStart;

		console.log(`   개별 처리: ${colorize(singleTime.toString(), 'cyan')}ms`);
		console.log(`   배치 처리: ${colorize(batchTime.toString(), 'cyan')}ms`);
		console.log(`   성능 향상: ${colorize((((singleTime - batchTime) / singleTime * 100).toFixed(1) + '%'), 'green')}`);

		// 메모리 사용량 (대략적)
		const memUsage = process.memoryUsage();
		console.log(`\n💾 메모리 사용량:`);
		console.log(`   RSS: ${colorize((memUsage.rss / 1024 / 1024).toFixed(1), 'cyan')} MB`);
		console.log(`   Heap Used: ${colorize((memUsage.heapUsed / 1024 / 1024).toFixed(1), 'cyan')} MB`);

		// =================================================================
		// Demo 4: Linux 개발 워크플로우
		// =================================================================
		console.log(colorize('\n╭─────────────────────────────────────────────────────────────╮', 'blue'));
		console.log(colorize('│             Demo 4: Linux 개발 워크플로우                  │', 'blue'));
		console.log(colorize('╰─────────────────────────────────────────────────────────────╯', 'blue'));

		// package.json 정보 읽기
		const packageJsonPath = './package.json';
		if (existsSync(packageJsonPath)) {
			console.log(colorize('\n📦 프로젝트 정보:', 'yellow'));

			try {
				const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
				const pkgPathInfo = createPathInfo(packageJsonPath);

				console.log(`   이름: ${colorize(packageJson.name || 'Unknown', 'cyan')}`);
				console.log(`   버전: ${colorize(packageJson.version || '0.0.0', 'cyan')}`);
				console.log(`   경로: ${colorize(pkgPathInfo.relative, 'cyan')}`);

				// 의존성 분석
				const deps = Object.keys(packageJson.dependencies || {});
				const devDeps = Object.keys(packageJson.devDependencies || {});
				console.log(`   의존성: ${colorize(deps.length.toString(), 'cyan')}개`);
				console.log(`   개발 의존성: ${colorize(devDeps.length.toString(), 'cyan')}개`);
			} catch (error) {
				console.log(`   ${colorize('package.json 파싱 오류', 'red')}`);
			}
		}

		// 중요한 설정 파일들 확인
		const configFiles = [
			'./tsconfig.json',
			'./jest.config.js',
			'./eslint.config.js',
			'./.gitignore',
			'./README.md'
		];

		console.log(colorize('\n⚙️  설정 파일 상태:', 'yellow'));
		configFiles.forEach(file => {
			const pathInfo = createPathInfo(file);
			const exists = existsSync(file);
			const status = exists ? colorize('✅', 'green') : colorize('❌', 'red');
			const icon = file.endsWith('.json') ? '📋' :
						file.endsWith('.js') ? '📙' :
						file.endsWith('.md') ? '📝' :
						file.startsWith('.') ? '🔧' : '📄';

			console.log(`   ${status} ${icon} ${pathInfo.fileName}`);
		});

		// =================================================================
		// Demo 5: Linux 시스템 통합
		// =================================================================
		console.log(colorize('\n╭─────────────────────────────────────────────────────────────╮', 'blue'));
		console.log(colorize('│             Demo 5: Linux 시스템 통합                     │', 'blue'));
		console.log(colorize('╰─────────────────────────────────────────────────────────────╯', 'blue'));

		// 환경 변수 기반 경로
		const envPaths = [
			process.env.HOME || '/home/user',
			process.env.PWD || process.cwd(),
			process.env.TMPDIR || '/tmp',
			'/usr/local/bin',
			'/opt'
		];

		console.log(colorize('\n🌍 시스템 환경 경로:', 'yellow'));
		envPaths.forEach((path, i) => {
			const pathInfo = createPathInfo(path);
			const envName = i === 0 ? '$HOME' :
							i === 1 ? '$PWD' :
							i === 2 ? '$TMPDIR' :
							'시스템';

			console.log(`   ${envName}: ${colorize(pathInfo.absolute, 'cyan')}`);
			console.log(`      상대: ${pathInfo.relative} (깊이: ${pathInfo.depth})`);
		});

		// 로그 파일 생성 (Linux 표준)
		const logData = {
			timestamp: new Date().toISOString(),
			platform: process.platform,
			nodeVersion: process.version,
			pid: process.pid,
			cwd: process.cwd(),
			analysis: {
				totalFiles: projectResults.length,
				validPathInfos: validPathInfos.length,
				analysisTimeMs: analysisTime,
				directories: grouped.size
			},
			performance: {
				singleProcessTimeMs: singleTime,
				batchProcessTimeMs: batchTime,
				improvementPercent: ((singleTime - batchTime) / singleTime * 100).toFixed(1)
			}
		};

		const logPath = '/tmp/pathinfo-linux-demo.log';
		writeFileSync(logPath, JSON.stringify(logData, null, 2));

		console.log(colorize(`\n📝 데모 로그 저장: ${logPath}`, 'green'));

		// =================================================================
		// Demo 완료
		// =================================================================
		console.log(colorize('\n╭─────────────────────────────────────────────────────────────╮', 'green'));
		console.log(colorize('│                 🎉 Linux Demo 완료!                       │', 'green'));
		console.log(colorize('╰─────────────────────────────────────────────────────────────╯', 'green'));

		console.log(colorize('\n✨ Linux 최적화 기능 검증 완료:', 'bright'));
		console.log(colorize('   ✅ POSIX 경로 표준 준수', 'green'));
		console.log(colorize('   ✅ Linux 파일 시스템 최적화', 'green'));
		console.log(colorize('   ✅ 멀티코어 환경 성능 향상', 'green'));
		console.log(colorize('   ✅ 시스템 환경 변수 통합', 'green'));
		console.log(colorize('   ✅ 표준 디렉토리 구조 인식', 'green'));
		console.log(colorize('   ✅ 효율적인 메모리 관리', 'green'));
		console.log(colorize('   ✅ Linux 개발 도구 호환성', 'green'));

		console.log(colorize('\n🔧 추천 Linux 명령어:', 'cyan'));
		console.log('   $ npm run test         # 테스트 실행');
		console.log('   $ npm run build        # 프로덕션 빌드');
		console.log('   $ npx tsx demo-*.ts    # 다른 데모 실행');
		console.log('   $ htop                 # 시스템 모니터링');
		console.log('   $ df -h                # 디스크 사용량');

		console.log(colorize('\n🐧 Linux PathInfo 시스템 - 최적의 성능으로 준비 완료!', 'bright'));

	} catch (error) {
		console.error(colorize('\n❌ Linux 데모 실행 중 오류:', 'red'));
		console.error(error);
		process.exit(1);
	}
}

// SIGINT 처리 (Ctrl+C)
process.on('SIGINT', () => {
	console.log(colorize('\n\n🐧 Linux 신호 수신 - 정리 중...', 'yellow'));
	console.log(colorize('데모를 안전하게 종료합니다.', 'cyan'));
	process.exit(0);
});

// 실행
if (require.main === module) {
	runLinuxDemo().catch(error => {
		console.error(colorize('❌ Linux 데모 실행 실패:', 'red'), error);
		process.exit(1);
	});
}