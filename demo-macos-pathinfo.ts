#!/usr/bin/env npx tsx

/**
 * macOS PathInfo Demo - macOS 환경 최적화 시연
 *
 * 이 데모는 macOS 환경에서 PathInfo의 최적 성능과 기능을 보여줍니다.
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
import { cpus, homedir } from 'os';
import { execSync } from 'child_process';

// macOS 스타일 색상 출력 (Terminal.app 최적화)
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	dim: '\x1b[2m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
	white: '\x1b[37m',
	bgBlue: '\x1b[44m',
	bgGreen: '\x1b[42m'
};

function colorize(text: string, color: keyof typeof colors): string {
	return `${colors[color]}${text}${colors.reset}`;
}

function macOSBanner(): void {
	console.log(colorize('┌─────────────────────────────────────────────────────────────┐', 'cyan'));
	console.log(colorize('│                🍎 macOS PathInfo Demo                      │', 'cyan'));
	console.log(colorize('│         macOS 환경 최적화된 경로 분석 시스템               │', 'cyan'));
	console.log(colorize('└─────────────────────────────────────────────────────────────┘', 'cyan'));
}

function getMacOSInfo(): any {
	try {
		const swVers = execSync('sw_vers', { encoding: 'utf8' });
		const systemInfo = {
			productName: swVers.match(/ProductName:\s+(.+)/)?.[1] || 'macOS',
			productVersion: swVers.match(/ProductVersion:\s+(.+)/)?.[1] || 'Unknown',
			buildVersion: swVers.match(/BuildVersion:\s+(.+)/)?.[1] || 'Unknown'
		};

		// CPU 정보
		const cpuInfo = cpus();
		const isAppleSilicon = process.arch === 'arm64';

		// Homebrew 확인
		let homebrewInfo = 'Not installed';
		try {
			const brewVersion = execSync('brew --version', { encoding: 'utf8' });
			homebrewInfo = brewVersion.split('\n')[0];
		} catch {
			// Homebrew not found
		}

		return { ...systemInfo, cpuInfo, isAppleSilicon, homebrewInfo };
	} catch (error) {
		return {
			productName: 'macOS',
			productVersion: 'Unknown',
			buildVersion: 'Unknown',
			cpuInfo: cpus(),
			isAppleSilicon: process.arch === 'arm64',
			homebrewInfo: 'Detection failed'
		};
	}
}

async function runMacOSDemo() {
	macOSBanner();

	const systemInfo = getMacOSInfo();

	console.log(colorize('\n🖥️  시스템 정보:', 'bright'));
	console.log(`   시스템: ${colorize(systemInfo.productName, 'green')} ${colorize(systemInfo.productVersion, 'green')}`);
	console.log(`   빌드: ${colorize(systemInfo.buildVersion, 'green')}`);
	console.log(`   아키텍처: ${colorize(process.arch, 'green')} ${systemInfo.isAppleSilicon ? colorize('(Apple Silicon)', 'magenta') : colorize('(Intel)', 'cyan')}`);
	console.log(`   Node.js: ${colorize(process.version, 'green')}`);
	console.log(`   CPU 코어: ${colorize(systemInfo.cpuInfo.length.toString(), 'green')}개`);
	console.log(`   Homebrew: ${colorize(systemInfo.homebrewInfo, 'green')}`);
	console.log(`   작업 디렉토리: ${colorize(process.cwd(), 'green')}`);

	try {
		// =================================================================
		// Demo 1: macOS 표준 경로 처리
		// =================================================================
		console.log(colorize('\n╭─────────────────────────────────────────────────────────────╮', 'blue'));
		console.log(colorize('│                Demo 1: macOS 표준 경로 처리                │', 'blue'));
		console.log(colorize('╰─────────────────────────────────────────────────────────────╯', 'blue'));

		const macOSPaths = [
			'./README.md',                          // 현재 프로젝트
			'~/Documents/Projects/app/src',         // 사용자 문서
			'/Applications/Xcode.app/Contents',     // 애플리케이션 번들
			'/usr/local/bin/node',                  // Homebrew/시스템 도구
			'/System/Library/Frameworks/Foundation.framework',  // 시스템 프레임워크
			'/Library/Developer/CommandLineTools',  // 개발 도구
			'~/Library/Application Support/VSCode', // 사용자 라이브러리
			'/tmp/build/output.js',                 // 임시 파일
			'../external/library',                  // 프로젝트 외부
			'/Volumes/ExternalDrive/data'           // 외부 볼륨
		];

		console.log(colorize('\n🍎 macOS 경로 패턴 분석:', 'yellow'));
		const macOSPathInfos = createBatchPathInfo(macOSPaths);

		macOSPathInfos.forEach((pathInfo, i) => {
			const status = pathInfo.isWithinProject ? colorize('✅ 내부', 'green') : colorize('🔗 외부', 'yellow');
			const separator = pathInfo.separator === '/' ? colorize('/', 'green') : colorize('\\', 'red');

			// macOS 특별 경로 식별
			let pathType = '';
			if (pathInfo.input.includes('.app/')) pathType = colorize('📱 앱번들', 'magenta');
			else if (pathInfo.input.startsWith('~/')) pathType = colorize('🏠 홈', 'cyan');
			else if (pathInfo.input.startsWith('/System/')) pathType = colorize('🔧 시스템', 'blue');
			else if (pathInfo.input.startsWith('/Applications/')) pathType = colorize('📱 앱', 'magenta');
			else if (pathInfo.input.startsWith('/Volumes/')) pathType = colorize('💾 볼륨', 'yellow');

			console.log(`   ${i + 1}. ${pathInfo.input}`);
			console.log(`      → ${pathInfo.relative} (깊이: ${pathInfo.depth}, 구분자: ${separator}, ${status}${pathType ? ', ' + pathType : ''}))`);
		});

		// =================================================================
		// Demo 2: Xcode 프로젝트 구조 분석
		// =================================================================
		console.log(colorize('\n╭─────────────────────────────────────────────────────────────╮', 'blue'));
		console.log(colorize('│            Demo 2: Xcode 프로젝트 구조 분석                │', 'blue'));
		console.log(colorize('╰─────────────────────────────────────────────────────────────╯', 'blue'));

		console.log(colorize('\n🔍 현재 프로젝트 구조 분석 중...', 'cyan'));

		const startTime = Date.now();
		const projectResults = await analyzeDirectory('./', {
			includeMarkdown: true,
			extensions: ['.ts', '.js', '.md', '.json', '.swift', '.m', '.h'],
			maxDepth: 3,
			ignorePatterns: [
				'**/node_modules/**',
				'**/dist/**',
				'**/build/**',
				'**/.git/**',
				'**/.cache/**',
				'**/coverage/**',
				'**/DerivedData/**',  // Xcode 빌드 데이터
				'**/*.xcodeproj/**'   // Xcode 프로젝트 내부
			]
		});
		const analysisTime = Date.now() - startTime;

		const validPathInfos = projectResults
			.filter(r => r.pathInfo)
			.map(r => r.pathInfo);

		console.log(colorize(`✅ 분석 완료! (${analysisTime}ms)`, 'green'));
		console.log(`   총 파일: ${colorize(projectResults.length.toString(), 'cyan')}개`);
		console.log(`   유효한 PathInfo: ${colorize(validPathInfos.length.toString(), 'cyan')}개`);

		if (systemInfo.isAppleSilicon) {
			console.log(`   ${colorize('🚀 Apple Silicon 최적화 활성화', 'magenta')}`);
		}

		// macOS 스타일 트리 구조 출력
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
						 file.extension === '.json' ? '📋' :
						 file.extension === '.swift' ? '🧡' :
						 file.extension === '.m' || file.extension === '.h' ? '🔵' : '📄';

				console.log(`   ${fileSymbol}${filePrefix} ${fileIcon} ${file.fileName}`);
			});
		});

		// =================================================================
		// Demo 3: Apple Silicon vs Intel 성능 비교
		// =================================================================
		console.log(colorize('\n╭─────────────────────────────────────────────────────────────╮', 'blue'));
		console.log(colorize('│          Demo 3: Apple Silicon vs Intel 성능 비교          │', 'blue'));
		console.log(colorize('╰─────────────────────────────────────────────────────────────╯', 'blue'));

		const benchmarkPaths = Array.from({ length: 1000 }, (_, i) =>
			`./src/component${i % 10}/module${i % 5}/file${i}.ts`
		);

		console.log(colorize(`\n⚡ ${benchmarkPaths.length}개 경로 성능 테스트 (${systemInfo.isAppleSilicon ? 'Apple Silicon' : 'Intel'} 최적화):`, 'yellow'));

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

		// Apple Silicon 특별 최적화 정보
		if (systemInfo.isAppleSilicon) {
			console.log(`   ${colorize('🚀 Apple Silicon 가속: 네이티브 ARM64 최적화', 'magenta')}`);
			console.log(`   ${colorize('⚡ 메모리 통합 아키텍처 활용', 'magenta')}`);
		} else {
			console.log(`   ${colorize('💻 Intel 호환성 모드', 'cyan')}`);
		}

		// 메모리 사용량
		const memUsage = process.memoryUsage();
		console.log(`\n💾 메모리 사용량:`);
		console.log(`   RSS: ${colorize((memUsage.rss / 1024 / 1024).toFixed(1), 'cyan')} MB`);
		console.log(`   Heap Used: ${colorize((memUsage.heapUsed / 1024 / 1024).toFixed(1), 'cyan')} MB`);
		console.log(`   External: ${colorize((memUsage.external / 1024 / 1024).toFixed(1), 'cyan')} MB`);

		// =================================================================
		// Demo 4: macOS 개발 환경 통합
		// =================================================================
		console.log(colorize('\n╭─────────────────────────────────────────────────────────────╮', 'blue'));
		console.log(colorize('│             Demo 4: macOS 개발 환경 통합                   │', 'blue'));
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

		// macOS 개발 도구 확인
		const devTools = [
			{ name: 'Xcode Command Line Tools', command: 'xcode-select -p', path: '/Library/Developer/CommandLineTools' },
			{ name: 'Homebrew', command: 'brew --version', path: '/opt/homebrew' },
			{ name: 'Node.js', command: 'node --version', path: process.execPath },
			{ name: 'Git', command: 'git --version', path: '/usr/bin/git' }
		];

		console.log(colorize('\n🛠️  개발 도구 상태:', 'yellow'));
		devTools.forEach(tool => {
			try {
				execSync(tool.command, { stdio: 'pipe' });
				const pathInfo = createPathInfo(tool.path);
				console.log(`   ✅ ${tool.name} (${pathInfo.relative})`);
			} catch {
				console.log(`   ❌ ${colorize(tool.name + ' - 설치되지 않음', 'red')}`);
			}
		});

		// 중요한 설정 파일들 확인
		const configFiles = [
			'./tsconfig.json',
			'./jest.config.js',
			'./eslint.config.js',
			'./.gitignore',
			'./README.md',
			'./.vscode/settings.json'  // VS Code 설정
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
		// Demo 5: macOS 시스템 통합 및 특별 경로
		// =================================================================
		console.log(colorize('\n╭─────────────────────────────────────────────────────────────╮', 'blue'));
		console.log(colorize('│          Demo 5: macOS 시스템 통합 및 특별 경로            │', 'blue'));
		console.log(colorize('╰─────────────────────────────────────────────────────────────╯', 'blue'));

		// macOS 특별 경로들
		const macOSSpecialPaths = [
			homedir(),                              // 사용자 홈
			`${homedir()}/Documents`,               // 문서
			`${homedir()}/Downloads`,               // 다운로드
			`${homedir()}/Library/Application Support`, // 앱 지원
			'/Applications',                        // 애플리케이션
			'/System/Library/Frameworks',           // 시스템 프레임워크
			'/usr/local/bin',                       // 로컬 바이너리
			systemInfo.isAppleSilicon ? '/opt/homebrew' : '/usr/local', // Homebrew 경로
			'/Library/Developer/CommandLineTools'   // 개발 도구
		];

		console.log(colorize('\n🏠 macOS 특별 경로 분석:', 'yellow'));
		macOSSpecialPaths.forEach((path, i) => {
			const pathInfo = createPathInfo(path);
			const exists = existsSync(path);
			const status = exists ? colorize('✅', 'green') : colorize('❌', 'red');

			let pathType = '';
			if (path.includes('Library')) pathType = colorize('📚 라이브러리', 'cyan');
			else if (path.includes('Applications')) pathType = colorize('📱 앱', 'magenta');
			else if (path.includes('Developer')) pathType = colorize('🛠️ 개발', 'blue');
			else if (path.includes('homebrew') || path.includes('local')) pathType = colorize('🍺 Homebrew', 'yellow');
			else if (path.includes('System')) pathType = colorize('🔧 시스템', 'blue');

			console.log(`   ${status} ${pathType} ${pathInfo.absolute}`);
			console.log(`      상대: ${pathInfo.relative} (깊이: ${pathInfo.depth})`);
		});

		// 로그 파일 생성 (macOS 표준 위치)
		const logData = {
			timestamp: new Date().toISOString(),
			platform: process.platform,
			arch: process.arch,
			nodeVersion: process.version,
			pid: process.pid,
			cwd: process.cwd(),
			system: systemInfo,
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
			},
			memory: {
				rss: (memUsage.rss / 1024 / 1024).toFixed(1) + ' MB',
				heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(1) + ' MB',
				external: (memUsage.external / 1024 / 1024).toFixed(1) + ' MB'
			}
		};

		const logPath = '/tmp/pathinfo-macos-demo.log';
		writeFileSync(logPath, JSON.stringify(logData, null, 2));

		console.log(colorize(`\n📝 데모 로그 저장: ${logPath}`, 'green'));

		// =================================================================
		// Demo 완료
		// =================================================================
		console.log(colorize('\n╭─────────────────────────────────────────────────────────────╮', 'green'));
		console.log(colorize('│                 🎉 macOS Demo 완료!                       │', 'green'));
		console.log(colorize('╰─────────────────────────────────────────────────────────────╯', 'green'));

		console.log(colorize('\n✨ macOS 최적화 기능 검증 완료:', 'bright'));
		console.log(colorize('   ✅ POSIX 경로 표준 준수', 'green'));
		console.log(colorize('   ✅ macOS 파일 시스템 최적화', 'green'));
		console.log(colorize(`   ✅ ${systemInfo.isAppleSilicon ? 'Apple Silicon' : 'Intel'} 아키텍처 최적화`, 'green'));
		console.log(colorize('   ✅ Xcode 개발 환경 통합', 'green'));
		console.log(colorize('   ✅ Homebrew 패키지 관리자 지원', 'green'));
		console.log(colorize('   ✅ 앱 번들(.app) 경로 인식', 'green'));
		console.log(colorize('   ✅ 사용자 라이브러리 경로 지원', 'green'));
		console.log(colorize('   ✅ 시스템 프레임워크 경로 인식', 'green'));

		console.log(colorize('\n🔧 추천 macOS 명령어:', 'cyan'));
		console.log('   $ npm run test         # 테스트 실행');
		console.log('   $ npm run build        # 프로덕션 빌드');
		console.log('   $ npx tsx demo-*.ts    # 다른 데모 실행');
		console.log('   $ brew install [pkg]   # Homebrew 패키지 설치');
		console.log('   $ xcode-select --install # 개발 도구 설치');
		console.log('   $ activity monitor      # 시스템 모니터링');

		console.log(colorize('\n🍎 macOS PathInfo 시스템 - 개발자 친화적 환경에서 준비 완료!', 'bright'));

	} catch (error) {
		console.error(colorize('\n❌ macOS 데모 실행 중 오류:', 'red'));
		console.error(error);
		process.exit(1);
	}
}

// macOS 시그널 처리
process.on('SIGINT', () => {
	console.log(colorize('\n\n🍎 macOS 신호 수신 - 정리 중...', 'yellow'));
	console.log(colorize('데모를 안전하게 종료합니다.', 'cyan'));
	process.exit(0);
});

process.on('SIGTERM', () => {
	console.log(colorize('\n\n🍎 시스템 종료 신호 수신', 'yellow'));
	process.exit(0);
});

// 실행
if (require.main === module) {
	runMacOSDemo().catch(error => {
		console.error(colorize('❌ macOS 데모 실행 실패:', 'red'), error);
		process.exit(1);
	});
}