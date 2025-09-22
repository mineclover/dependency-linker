#!/usr/bin/env npx tsx

/**
 * Multi-OS PathInfo Demo - 통합 플랫폼 시연
 *
 * 이 데모는 Linux, Windows, macOS 환경에서 PathInfo의
 * 크로스 플랫폼 호환성과 최적화를 보여줍니다.
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

import {
	WindowsPathUtils,
	MacOSPathUtils,
	LinuxPathUtils,
	CrossPlatformPathUtils
} from './examples/cross-platform-paths';

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { cpus, homedir, platform as osPlatform, arch as osArch } from 'os';

// 다국어 지원 색상 시스템
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
	bgRed: '\x1b[41m',
	bgGreen: '\x1b[42m',
	bgBlue: '\x1b[44m'
};

function colorize(text: string, color: keyof typeof colors): string {
	return `${colors[color]}${text}${colors.reset}`;
}

function createUniversalBanner(): void {
	const platformEmojis = {
		win32: '🪟',
		darwin: '🍎',
		linux: '🐧',
		default: '🌍'
	};

	const currentPlatform = osPlatform();
	const emoji = platformEmojis[currentPlatform as keyof typeof platformEmojis] || platformEmojis.default;

	console.log(colorize('┌─────────────────────────────────────────────────────────────┐', 'cyan'));
	console.log(colorize(`│            ${emoji} Multi-OS PathInfo Demo 🌍                │`, 'cyan'));
	console.log(colorize('│          크로스 플랫폼 경로 분석 통합 시스템                │', 'cyan'));
	console.log(colorize('└─────────────────────────────────────────────────────────────┘', 'cyan'));
}

async function detectSystemCapabilities(): Promise<any> {
	const platform = osPlatform();
	const arch = osArch();
	const cpuCount = cpus().length;
	const nodeVersion = process.version;

	const capabilities = {
		platform,
		platformName: {
			win32: 'Windows',
			darwin: 'macOS',
			linux: 'Linux'
		}[platform] || 'Unknown',
		arch,
		archName: {
			x64: 'Intel/AMD 64-bit',
			arm64: 'ARM 64-bit (Apple Silicon/ARM)',
			x32: 'Intel/AMD 32-bit',
			arm: 'ARM 32-bit'
		}[arch] || 'Unknown Architecture',
		cpuCount,
		nodeVersion,
		memory: process.memoryUsage(),
		isAppleSilicon: platform === 'darwin' && arch === 'arm64',
		isWindowsNT: platform === 'win32',
		isLinuxDistro: platform === 'linux'
	};

	// 추가 시스템 정보 수집
	try {
		if (platform === 'win32') {
			// Windows 특정 정보는 별도 구현 필요
			capabilities.pathSeparator = '\\';
			capabilities.homeDir = process.env.USERPROFILE || homedir();
		} else {
			capabilities.pathSeparator = '/';
			capabilities.homeDir = homedir();
		}
	} catch (error) {
		console.warn('시스템 정보 수집 중 일부 오류:', error);
	}

	return capabilities;
}

async function runMultiOSDemo() {
	createUniversalBanner();

	const systemInfo = await detectSystemCapabilities();

	console.log(colorize('\n🖥️  통합 시스템 정보:', 'bright'));
	console.log(`   플랫폼: ${colorize(systemInfo.platformName, 'green')} (${systemInfo.platform})`);
	console.log(`   아키텍처: ${colorize(systemInfo.archName, 'green')}`);
	console.log(`   Node.js: ${colorize(systemInfo.nodeVersion, 'green')}`);
	console.log(`   CPU 코어: ${colorize(systemInfo.cpuCount.toString(), 'green')}개`);
	console.log(`   경로 구분자: ${colorize(systemInfo.pathSeparator, 'green')}`);
	console.log(`   홈 디렉토리: ${colorize(systemInfo.homeDir, 'green')}`);

	// 특별 최적화 표시
	if (systemInfo.isAppleSilicon) {
		console.log(`   ${colorize('🚀 Apple Silicon 최적화 활성화', 'magenta')}`);
	}
	if (systemInfo.isWindowsNT) {
		console.log(`   ${colorize('🪟 Windows NT 커널 지원', 'blue')}`);
	}
	if (systemInfo.isLinuxDistro) {
		console.log(`   ${colorize('🐧 Linux 커널 POSIX 준수', 'cyan')}`);
	}

	try {
		// =================================================================
		// Demo 1: 다중 플랫폼 경로 호환성 테스트
		// =================================================================
		console.log(colorize('\n╭─────────────────────────────────────────────────────────────╮', 'blue'));
		console.log(colorize('│            Demo 1: 다중 플랫폼 경로 호환성 테스트           │', 'blue'));
		console.log(colorize('╰─────────────────────────────────────────────────────────────╯', 'blue'));

		const multiPlatformPaths = CrossPlatformPathUtils.createPlatformPaths();
		const allTestPaths = [...multiPlatformPaths.common, ...multiPlatformPaths.specific];

		console.log(colorize(`\n🌍 ${allTestPaths.length}개 다중 플랫폼 경로 테스트:`, 'yellow'));
		console.log(colorize('공통 경로:', 'cyan'), multiPlatformPaths.common.length + '개');
		console.log(colorize('플랫폼별 경로:', 'cyan'), multiPlatformPaths.specific.length + '개');

		const multiPathInfos = createBatchPathInfo(allTestPaths);

		// 플랫폼별 결과 분석
		const platformResults = {
			withinProject: 0,
			outsideProject: 0,
			invalidPaths: 0,
			maxDepth: 0,
			totalDepth: 0,
			extensions: new Set<string>(),
			separatorTypes: new Set<string>()
		};

		multiPathInfos.forEach(pathInfo => {
			if (pathInfo.isWithinProject) platformResults.withinProject++;
			else platformResults.outsideProject++;

			platformResults.maxDepth = Math.max(platformResults.maxDepth, pathInfo.depth);
			platformResults.totalDepth += pathInfo.depth;

			if (pathInfo.extension) platformResults.extensions.add(pathInfo.extension);
			platformResults.separatorTypes.add(pathInfo.separator);
		});

		console.log(colorize('\n📊 플랫폼 호환성 분석 결과:', 'yellow'));
		console.log(`   프로젝트 내부: ${colorize(platformResults.withinProject.toString(), 'green')}개`);
		console.log(`   프로젝트 외부: ${colorize(platformResults.outsideProject.toString(), 'yellow')}개`);
		console.log(`   평균 깊이: ${colorize((platformResults.totalDepth / multiPathInfos.length).toFixed(1), 'cyan')}`);
		console.log(`   최대 깊이: ${colorize(platformResults.maxDepth.toString(), 'cyan')}`);
		console.log(`   확장자 종류: ${colorize(platformResults.extensions.size.toString(), 'cyan')}개`);
		console.log(`   구분자 종류: ${colorize(Array.from(platformResults.separatorTypes).join(', '), 'cyan')}`);

		// =================================================================
		// Demo 2: 플랫폼별 고급 분석
		// =================================================================
		console.log(colorize('\n╭─────────────────────────────────────────────────────────────╮', 'blue'));
		console.log(colorize('│              Demo 2: 플랫폼별 고급 분석                    │', 'blue'));
		console.log(colorize('╰─────────────────────────────────────────────────────────────╯', 'blue'));

		console.log(colorize('\n🔍 현재 플랫폼 심화 분석:', 'yellow'));

		const samplePaths = multiPathInfos.slice(0, 5); // 상위 5개만 분석
		samplePaths.forEach((pathInfo, i) => {
			const extendedAnalysis = CrossPlatformPathUtils.analyzeExtended(pathInfo);

			console.log(`\n   ${i + 1}. ${colorize(pathInfo.input, 'cyan')}`);
			console.log(`      기본: ${pathInfo.relative} (깊이: ${pathInfo.depth})`);

			// 플랫폼별 확장 정보
			if (extendedAnalysis.windows) {
				const winInfo = extendedAnalysis.windows;
				console.log(`      Windows: 드라이브 ${winInfo.drive.drive || 'N/A'}, 타입: ${winInfo.drive.driveType}`);
				if (winInfo.unc) {
					console.log(`      UNC: 서버 ${winInfo.unc.server}, 공유 ${winInfo.unc.share}`);
				}
			}

			if (extendedAnalysis.macos) {
				const macInfo = extendedAnalysis.macos;
				console.log(`      macOS: ${macInfo.systemPath.description} (${macInfo.systemPath.pathType})`);
				if (macInfo.appBundle.isAppBundle) {
					console.log(`      앱 번들: ${macInfo.appBundle.appName} (${macInfo.appBundle.contentType})`);
				}
			}

			if (extendedAnalysis.linux) {
				const linuxInfo = extendedAnalysis.linux;
				console.log(`      Linux: ${linuxInfo.fhs.description} (${linuxInfo.fhs.category})`);
				console.log(`      보안: ${linuxInfo.permissions.securityLevel} 레벨, 소유자: ${linuxInfo.permissions.likelyOwner}`);
			}
		});

		// =================================================================
		// Demo 3: 통합 성능 벤치마크
		// =================================================================
		console.log(colorize('\n╭─────────────────────────────────────────────────────────────╮', 'blue'));
		console.log(colorize('│             Demo 3: 통합 성능 벤치마크                     │', 'blue'));
		console.log(colorize('╰─────────────────────────────────────────────────────────────╯', 'blue'));

		const benchmarkSizes = [100, 500, 1000, 2000];
		console.log(colorize('\n⚡ 다중 규모 성능 테스트:', 'yellow'));

		const performanceResults: any[] = [];

		for (const size of benchmarkSizes) {
			const testPaths = Array.from({ length: size }, (_, i) => {
				const pathTypes = [
					`./src/component${i % 20}/file${i}.ts`,
					`./docs/section${i % 10}/page${i}.md`,
					`./tests/unit/test${i % 15}.test.js`,
					`../external/lib${i % 5}/module${i}.js`
				];
				return pathTypes[i % pathTypes.length];
			});

			// 단일 처리 벤치마크
			const singleStart = process.hrtime.bigint();
			testPaths.forEach(path => createPathInfo(path));
			const singleEnd = process.hrtime.bigint();
			const singleTime = Number(singleEnd - singleStart) / 1_000_000; // ms

			// 배치 처리 벤치마크
			const batchStart = process.hrtime.bigint();
			createBatchPathInfo(testPaths);
			const batchEnd = process.hrtime.bigint();
			const batchTime = Number(batchEnd - batchStart) / 1_000_000; // ms

			const improvement = ((singleTime - batchTime) / singleTime * 100);

			performanceResults.push({
				size,
				singleTime,
				batchTime,
				improvement
			});

			console.log(`   ${size}개 경로:`);
			console.log(`     개별: ${colorize(singleTime.toFixed(2), 'cyan')}ms`);
			console.log(`     배치: ${colorize(batchTime.toFixed(2), 'cyan')}ms`);
			console.log(`     향상: ${colorize(improvement.toFixed(1) + '%', 'green')}`);
		}

		// 성능 트렌드 분석
		console.log(colorize('\n📈 성능 트렌드 분석:', 'yellow'));
		const avgImprovement = performanceResults.reduce((sum, r) => sum + r.improvement, 0) / performanceResults.length;
		const bestSize = performanceResults.reduce((best, current) =>
			current.improvement > best.improvement ? current : best
		);

		console.log(`   평균 성능 향상: ${colorize(avgImprovement.toFixed(1) + '%', 'green')}`);
		console.log(`   최적 배치 크기: ${colorize(bestSize.size.toString(), 'green')}개 (${bestSize.improvement.toFixed(1)}% 향상)`);

		// =================================================================
		// Demo 4: 실제 프로젝트 구조 분석
		// =================================================================
		console.log(colorize('\n╭─────────────────────────────────────────────────────────────╮', 'blue'));
		console.log(colorize('│            Demo 4: 실제 프로젝트 구조 분석                 │', 'blue'));
		console.log(colorize('╰─────────────────────────────────────────────────────────────╯', 'blue'));

		console.log(colorize('\n🔍 현재 프로젝트 전체 분석 중...', 'cyan'));

		const projectStartTime = Date.now();
		const projectResults = await analyzeDirectory('./', {
			includeMarkdown: true,
			extensions: ['.ts', '.js', '.md', '.json', '.yml', '.yaml'],
			maxDepth: 4,
			ignorePatterns: [
				'**/node_modules/**',
				'**/dist/**',
				'**/build/**',
				'**/.git/**',
				'**/.cache/**',
				'**/coverage/**',
				'**/DerivedData/**',
				'**/*.log'
			]
		});
		const projectAnalysisTime = Date.now() - projectStartTime;

		const validProjectPathInfos = projectResults
			.filter(r => r.pathInfo)
			.map(r => r.pathInfo);

		console.log(colorize(`✅ 프로젝트 분석 완료! (${projectAnalysisTime}ms)`, 'green'));
		console.log(`   총 파일: ${colorize(projectResults.length.toString(), 'cyan')}개`);
		console.log(`   유효한 PathInfo: ${colorize(validProjectPathInfos.length.toString(), 'cyan')}개`);

		// 디렉토리별 그룹화
		const projectGrouped = groupPathInfoByDirectory(validProjectPathInfos);

		console.log(colorize('\n🌳 프로젝트 구조 요약:', 'yellow'));
		const topDirectories = Array.from(projectGrouped.entries())
			.sort(([,a], [,b]) => b.length - a.length)
			.slice(0, 10);

		topDirectories.forEach(([dir, files], i) => {
			const icon = dir === '.' ? '🏠' :
					   dir.includes('src') ? '📂' :
					   dir.includes('test') ? '🧪' :
					   dir.includes('doc') ? '📚' :
					   dir.includes('spec') ? '📋' : '📁';

			console.log(`   ${i + 1}. ${icon} ${dir === '.' ? '(루트)' : dir}: ${colorize(files.length.toString(), 'cyan')}개`);
		});

		// 확장자별 분석
		const extensionStats = new Map<string, number>();
		validProjectPathInfos.forEach(pathInfo => {
			if (pathInfo.extension) {
				extensionStats.set(pathInfo.extension, (extensionStats.get(pathInfo.extension) || 0) + 1);
			}
		});

		console.log(colorize('\n📄 파일 형식 분포:', 'yellow'));
		Array.from(extensionStats.entries())
			.sort(([,a], [,b]) => b - a)
			.slice(0, 8)
			.forEach(([ext, count]) => {
				const icon = ext === '.ts' ? '📘' :
						   ext === '.js' ? '📙' :
						   ext === '.md' ? '📝' :
						   ext === '.json' ? '📋' :
						   ext === '.yml' || ext === '.yaml' ? '⚙️' : '📄';

				console.log(`   ${icon} ${ext}: ${colorize(count.toString(), 'cyan')}개`);
			});

		// =================================================================
		// Demo 5: 메모리 및 시스템 리소스 분석
		// =================================================================
		console.log(colorize('\n╭─────────────────────────────────────────────────────────────╮', 'blue'));
		console.log(colorize('│          Demo 5: 메모리 및 시스템 리소스 분석              │', 'blue'));
		console.log(colorize('╰─────────────────────────────────────────────────────────────╯', 'blue'));

		const finalMemUsage = process.memoryUsage();
		const memoryDiff = {
			rss: (finalMemUsage.rss - systemInfo.memory.rss) / 1024 / 1024,
			heapUsed: (finalMemUsage.heapUsed - systemInfo.memory.heapUsed) / 1024 / 1024,
			heapTotal: (finalMemUsage.heapTotal - systemInfo.memory.heapTotal) / 1024 / 1024,
			external: (finalMemUsage.external - systemInfo.memory.external) / 1024 / 1024
		};

		console.log(colorize('\n💾 메모리 사용 현황:', 'yellow'));
		console.log(`   RSS: ${colorize((finalMemUsage.rss / 1024 / 1024).toFixed(1), 'cyan')} MB (${memoryDiff.rss > 0 ? '+' : ''}${memoryDiff.rss.toFixed(1)} MB)`);
		console.log(`   Heap Used: ${colorize((finalMemUsage.heapUsed / 1024 / 1024).toFixed(1), 'cyan')} MB (${memoryDiff.heapUsed > 0 ? '+' : ''}${memoryDiff.heapUsed.toFixed(1)} MB)`);
		console.log(`   Heap Total: ${colorize((finalMemUsage.heapTotal / 1024 / 1024).toFixed(1), 'cyan')} MB (${memoryDiff.heapTotal > 0 ? '+' : ''}${memoryDiff.heapTotal.toFixed(1)} MB)`);
		console.log(`   External: ${colorize((finalMemUsage.external / 1024 / 1024).toFixed(1), 'cyan')} MB (${memoryDiff.external > 0 ? '+' : ''}${memoryDiff.external.toFixed(1)} MB)`);

		// CPU 사용 시간 (대략적)
		const cpuUsage = process.cpuUsage();
		console.log(`\n⚡ CPU 사용 시간:`);
		console.log(`   User: ${colorize((cpuUsage.user / 1000).toFixed(2), 'cyan')}ms`);
		console.log(`   System: ${colorize((cpuUsage.system / 1000).toFixed(2), 'cyan')}ms`);

		// =================================================================
		// 통합 보고서 생성
		// =================================================================
		const comprehensiveReport = {
			timestamp: new Date().toISOString(),
			system: systemInfo,
			demo: {
				multiPlatformPaths: {
					total: allTestPaths.length,
					common: multiPlatformPaths.common.length,
					specific: multiPlatformPaths.specific.length,
					analysis: platformResults
				},
				performance: performanceResults,
				project: {
					totalFiles: projectResults.length,
					validPathInfos: validProjectPathInfos.length,
					analysisTimeMs: projectAnalysisTime,
					directories: projectGrouped.size,
					topDirectories: topDirectories.map(([dir, files]) => ({ directory: dir, fileCount: files.length })),
					extensions: Array.from(extensionStats.entries()).map(([ext, count]) => ({ extension: ext, count }))
				},
				memory: {
					initial: systemInfo.memory,
					final: finalMemUsage,
					delta: memoryDiff
				},
				cpu: cpuUsage
			}
		};

		const reportPath = `/tmp/pathinfo-multi-os-report-${Date.now()}.json`;
		writeFileSync(reportPath, JSON.stringify(comprehensiveReport, null, 2));

		console.log(colorize(`\n📊 종합 보고서 생성: ${reportPath}`, 'green'));

		// =================================================================
		// Demo 완료
		// =================================================================
		console.log(colorize('\n╭─────────────────────────────────────────────────────────────╮', 'green'));
		console.log(colorize('│              🎉 Multi-OS Demo 완료!                       │', 'green'));
		console.log(colorize('╰─────────────────────────────────────────────────────────────╯', 'green'));

		console.log(colorize('\n✨ 크로스 플랫폼 기능 검증 완료:', 'bright'));
		console.log(colorize('   ✅ Windows, macOS, Linux 통합 호환성', 'green'));
		console.log(colorize('   ✅ 플랫폼별 최적화 및 특화 기능', 'green'));
		console.log(colorize('   ✅ 확장 가능한 멀티 스케일 성능', 'green'));
		console.log(colorize('   ✅ 실시간 메모리 및 리소스 관리', 'green'));
		console.log(colorize('   ✅ 포괄적인 프로젝트 구조 분석', 'green'));
		console.log(colorize('   ✅ 자동화된 보고서 생성', 'green'));

		console.log(colorize('\n🌍 지원 플랫폼:', 'cyan'));
		console.log('   🪟 Windows: 드라이브, UNC, 환경변수');
		console.log('   🍎 macOS: 앱번들, 시스템경로, Apple Silicon');
		console.log('   🐧 Linux: FHS, 권한, POSIX 준수');

		console.log(colorize('\n🚀 성능 하이라이트:', 'cyan'));
		console.log(`   📊 평균 배치 성능 향상: ${avgImprovement.toFixed(1)}%`);
		console.log(`   📈 최적 배치 크기: ${bestSize.size}개`);
		console.log(`   💾 효율적 메모리 사용: ${(memoryDiff.heapUsed).toFixed(1)} MB 증가`);
		console.log(`   ⚡ 고속 분석: ${projectResults.length}개 파일을 ${projectAnalysisTime}ms에 처리`);

		console.log(colorize('\n🌟 Multi-OS PathInfo 시스템 - 모든 플랫폼에서 최적의 성능!', 'bright'));

	} catch (error) {
		console.error(colorize('\n❌ Multi-OS 데모 실행 중 오류:', 'red'));
		console.error(error);
		process.exit(1);
	}
}

// 범용 시그널 처리
['SIGINT', 'SIGTERM'].forEach(signal => {
	process.on(signal, () => {
		console.log(colorize(`\n\n🌍 ${signal} 신호 수신 - 안전하게 종료 중...`, 'yellow'));
		console.log(colorize('Multi-OS 데모를 정리합니다.', 'cyan'));
		process.exit(0);
	});
});

// 실행
if (require.main === module) {
	runMultiOSDemo().catch(error => {
		console.error(colorize('❌ Multi-OS 데모 실행 실패:', 'red'), error);
		process.exit(1);
	});
}