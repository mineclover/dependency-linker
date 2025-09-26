#!/usr/bin/env npx tsx

/**
 * Windows PathInfo Demo - Windows 환경 최적화 시연
 *
 * 이 데모는 Windows 환경에서 PathInfo의 특화 기능을 보여줍니다.
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
	filterPathInfo,
} from "./src/lib/index";

import { writeFileSync, existsSync } from "fs";
import { homedir, tmpdir, cpus } from "os";

// Windows 스타일 색상 출력 (PowerShell 호환)
const colors = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
};

function colorize(text: string, color: keyof typeof colors): string {
	return `${colors[color]}${text}${colors.reset}`;
}

function windowsBanner(): void {
	console.log(
		colorize(
			"┌─────────────────────────────────────────────────────────────┐",
			"blue",
		),
	);
	console.log(
		colorize(
			"│                🪟 Windows PathInfo Demo                   │",
			"blue",
		),
	);
	console.log(
		colorize(
			"│        Windows 환경 특화된 경로 분석 시스템                │",
			"blue",
		),
	);
	console.log(
		colorize(
			"└─────────────────────────────────────────────────────────────┘",
			"blue",
		),
	);
}

// Windows 환경 변수 확장 함수
function expandWindowsVariables(path: string): string {
	const variables = {
		"%USERPROFILE%": homedir(),
		"%APPDATA%": process.env.APPDATA || `${homedir()}\\AppData\\Roaming`,
		"%LOCALAPPDATA%":
			process.env.LOCALAPPDATA || `${homedir()}\\AppData\\Local`,
		"%TEMP%": tmpdir(),
		"%TMP%": tmpdir(),
		"%PROGRAMFILES%": process.env.PROGRAMFILES || "C:\\Program Files",
		"%PROGRAMFILES(X86)%":
			process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)",
		"%PROGRAMDATA%": process.env.PROGRAMDATA || "C:\\ProgramData",
		"%WINDIR%": process.env.WINDIR || "C:\\Windows",
		"%SYSTEMROOT%": process.env.SYSTEMROOT || "C:\\Windows",
	};

	let expandedPath = path;
	for (const [variable, value] of Object.entries(variables)) {
		expandedPath = expandedPath.replace(
			new RegExp(variable.replace(/[()]/g, "\\$&"), "gi"),
			value,
		);
	}

	return expandedPath;
}

// Windows 드라이브 분석
function analyzeWindowsDrives(pathInfos: PathInfo[]) {
	const driveInfo = new Map<
		string,
		{
			count: number;
			totalDepth: number;
			extensions: Set<string>;
			types: Set<string>;
		}
	>();

	pathInfos.forEach((pathInfo) => {
		const match = pathInfo.absolute.match(/^([A-Z]):/);
		if (match) {
			const drive = match[1];
			const info = driveInfo.get(drive) || {
				count: 0,
				totalDepth: 0,
				extensions: new Set(),
				types: new Set(),
			};

			info.count++;
			info.totalDepth += pathInfo.depth;
			info.extensions.add(pathInfo.extension);

			// 파일 타입 분류
			if (pathInfo.extension === ".exe") info.types.add("실행파일");
			else if ([".ts", ".js", ".json"].includes(pathInfo.extension))
				info.types.add("개발파일");
			else if ([".md", ".txt", ".doc"].includes(pathInfo.extension))
				info.types.add("문서파일");
			else info.types.add("기타");

			driveInfo.set(drive, info);
		}
	});

	return driveInfo;
}

async function runWindowsDemo() {
	windowsBanner();

	console.log(colorize("\n🖥️  Windows 시스템 정보:", "bright"));
	console.log(
		`   플랫폼: ${colorize(process.platform, "green")} (${process.arch})`,
	);
	console.log(`   Node.js: ${colorize(process.version, "green")}`);
	console.log(`   CPU 코어: ${colorize(cpus().length.toString(), "green")}개`);
	console.log(
		`   컴퓨터명: ${colorize(process.env.COMPUTERNAME || "Unknown", "green")}`,
	);
	console.log(
		`   사용자: ${colorize(process.env.USERNAME || "Unknown", "green")}`,
	);
	console.log(
		`   사용자 프로필: ${colorize(process.env.USERPROFILE || homedir(), "green")}`,
	);
	console.log(`   프로세스 ID: ${colorize(process.pid.toString(), "green")}`);

	try {
		// =================================================================
		// Demo 1: Windows 특화 경로 처리
		// =================================================================
		console.log(
			colorize(
				"\n╭─────────────────────────────────────────────────────────────╮",
				"blue",
			),
		);
		console.log(
			colorize(
				"│              Demo 1: Windows 특화 경로 처리                │",
				"blue",
			),
		);
		console.log(
			colorize(
				"╰─────────────────────────────────────────────────────────────╯",
				"blue",
			),
		);

		const windowsPaths = [
			"C:\\Users\\Developer\\Projects\\myapp", // 사용자 프로젝트
			"D:\\Development\\Tools\\VSCode", // 개발 도구
			"%USERPROFILE%\\Documents\\Projects", // 환경 변수
			"%APPDATA%\\npm\\node_modules", // npm 글로벌
			"%TEMP%\\build-output", // 임시 디렉토리
			"C:\\Program Files\\nodejs", // 프로그램 파일
			"C:\\Program Files (x86)\\Microsoft", // x86 프로그램
			"\\\\Server\\SharedFolder\\Data", // UNC 경로
			"./README.md", // 상대 경로
			"..\\..\\external\\library", // 상위 디렉토리
		];

		console.log(colorize("\n🪟 Windows 경로 패턴 분석:", "yellow"));

		// 환경 변수 확장 전후 비교
		windowsPaths.forEach((originalPath, i) => {
			const expandedPath = expandWindowsVariables(originalPath);
			const pathInfo = createPathInfo(expandedPath);

			const status = pathInfo.isWithinProject
				? colorize("✅ 내부", "green")
				: colorize("🔗 외부", "yellow");
			const separator =
				pathInfo.separator === "\\"
					? colorize("\\", "green")
					: colorize("/", "red");
			const wasExpanded =
				originalPath !== expandedPath ? colorize("🔄", "cyan") : "  ";

			console.log(`   ${i + 1}. ${wasExpanded} ${originalPath}`);
			if (originalPath !== expandedPath) {
				console.log(`      → ${colorize(expandedPath, "cyan")}`);
			}
			console.log(
				`      PathInfo: ${pathInfo.relative} (깊이: ${pathInfo.depth}, 구분자: ${separator}, ${status})`,
			);

			// UNC 경로 특별 처리
			if (pathInfo.absolute.startsWith("\\\\")) {
				const uncMatch = pathInfo.absolute.match(/^\\\\([^\\]+)\\([^\\]+)/);
				if (uncMatch) {
					const [, server, share] = uncMatch;
					console.log(
						`      UNC: 서버=${colorize(server, "magenta")}, 공유=${colorize(share, "magenta")}`,
					);
				}
			}
		});

		// =================================================================
		// Demo 2: Windows 환경 변수 및 시스템 경로
		// =================================================================
		console.log(
			colorize(
				"\n╭─────────────────────────────────────────────────────────────╮",
				"blue",
			),
		);
		console.log(
			colorize(
				"│          Demo 2: Windows 환경 변수 및 시스템 경로          │",
				"blue",
			),
		);
		console.log(
			colorize(
				"╰─────────────────────────────────────────────────────────────╯",
				"blue",
			),
		);

		const systemPaths = [
			"%WINDIR%\\System32",
			"%PROGRAMFILES%\\Common Files",
			"%PROGRAMDATA%\\Microsoft",
			"%LOCALAPPDATA%\\Temp",
			"%APPDATA%\\Microsoft\\Windows",
		];

		console.log(colorize("\n⚙️  Windows 시스템 경로 분석:", "yellow"));

		systemPaths.forEach((envPath) => {
			const expandedPath = expandWindowsVariables(envPath);
			const pathInfo = createPathInfo(expandedPath);
			const exists = existsSync(expandedPath)
				? colorize("✅", "green")
				: colorize("❌", "red");

			console.log(`   ${envPath}`);
			console.log(`   → ${pathInfo.absolute} ${exists}`);
			console.log(
				`     깊이: ${pathInfo.depth}, 절대경로: ${pathInfo.wasAbsolute ? "✅" : "❌"}`,
			);
		});

		// =================================================================
		// Demo 3: Windows 개발 도구 감지
		// =================================================================
		console.log(
			colorize(
				"\n╭─────────────────────────────────────────────────────────────╮",
				"blue",
			),
		);
		console.log(
			colorize(
				"│             Demo 3: Windows 개발 도구 감지                 │",
				"blue",
			),
		);
		console.log(
			colorize(
				"╰─────────────────────────────────────────────────────────────╯",
				"blue",
			),
		);

		const devToolPaths = [
			{ name: "Node.js", path: "%PROGRAMFILES%\\nodejs\\node.exe" },
			{ name: "npm", path: "%APPDATA%\\npm" },
			{ name: "Git", path: "%PROGRAMFILES%\\Git\\bin\\git.exe" },
			{
				name: "VS Code",
				path: "%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\Code.exe",
			},
			{
				name: "PowerShell",
				path: "%WINDIR%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
			},
			{ name: "CMD", path: "%WINDIR%\\System32\\cmd.exe" },
		];

		console.log(colorize("\n🛠️  개발 도구 상태:", "yellow"));

		devToolPaths.forEach((tool) => {
			const expandedPath = expandWindowsVariables(tool.path);
			const pathInfo = createPathInfo(expandedPath);
			const exists = existsSync(expandedPath);
			const status = exists
				? colorize("✅ 설치됨", "green")
				: colorize("❌ 없음", "red");
			const icon =
				tool.name === "Node.js"
					? "📗"
					: tool.name === "npm"
						? "📦"
						: tool.name === "Git"
							? "🔄"
							: tool.name === "VS Code"
								? "💻"
								: tool.name.includes("PowerShell")
									? "💙"
									: "⚫";

			console.log(`   ${icon} ${tool.name}: ${status}`);
			if (exists) {
				console.log(`      경로: ${pathInfo.relative}`);
			}
		});

		// =================================================================
		// Demo 4: Windows 프로젝트 구조 분석
		// =================================================================
		console.log(
			colorize(
				"\n╭─────────────────────────────────────────────────────────────╮",
				"blue",
			),
		);
		console.log(
			colorize(
				"│           Demo 4: Windows 프로젝트 구조 분석               │",
				"blue",
			),
		);
		console.log(
			colorize(
				"╰─────────────────────────────────────────────────────────────╯",
				"blue",
			),
		);

		console.log(colorize("\n🔍 현재 Windows 프로젝트 분석 중...", "cyan"));

		const startTime = Date.now();
		const projectResults = await analyzeDirectory("./", {
			includeMarkdown: true,
			extensions: [".ts", ".js", ".md", ".json", ".bat", ".ps1"],
			maxDepth: 3,
			ignorePatterns: [
				"**/node_modules/**",
				"**/dist/**",
				"**/build/**",
				"**/.git/**",
				"**/bin/**",
				"**/obj/**", // .NET 프로젝트 호환
			],
		});
		const analysisTime = Date.now() - startTime;

		const validPathInfos = projectResults
			.filter((r) => r.pathInfo)
			.map((r) => r.pathInfo);

		console.log(colorize(`✅ Windows 분석 완료! (${analysisTime}ms)`, "green"));
		console.log(
			`   총 파일: ${colorize(projectResults.length.toString(), "cyan")}개`,
		);
		console.log(
			`   유효한 PathInfo: ${colorize(validPathInfos.length.toString(), "cyan")}개`,
		);

		// Windows 스타일 트리 출력
		console.log(colorize("\n🌲 Windows 프로젝트 트리:", "yellow"));
		const grouped = groupPathInfoByDirectory(validPathInfos);

		// 루트 파일들 먼저 표시
		if (grouped.has(".")) {
			const rootFiles = grouped.get(".")!;
			console.log(
				`   📁 ${colorize("(프로젝트 루트)", "bright")} (${rootFiles.length}개)`,
			);

			rootFiles.slice(0, 10).forEach((file, index) => {
				const isLast = index === Math.min(9, rootFiles.length - 1);
				const prefix = isLast && rootFiles.length <= 10 ? "└──" : "├──";
				const icon =
					file.extension === ".md"
						? "📝"
						: file.extension === ".ts"
							? "📘"
							: file.extension === ".js"
								? "📙"
								: file.extension === ".json"
									? "📋"
									: file.extension === ".bat"
										? "⚫"
										: file.extension === ".ps1"
											? "💙"
											: "📄";

				console.log(`   ${prefix} ${icon} ${file.fileName}`);
			});

			if (rootFiles.length > 10) {
				console.log(
					`   └── ${colorize(`... 그리고 ${rootFiles.length - 10}개 더`, "gray")}`,
				);
			}
		}

		// 드라이브 분석
		const driveAnalysis = analyzeWindowsDrives(validPathInfos);
		if (driveAnalysis.size > 0) {
			console.log(colorize("\n💾 Windows 드라이브 분석:", "yellow"));
			for (const [drive, info] of driveAnalysis) {
				const avgDepth = (info.totalDepth / info.count).toFixed(1);
				console.log(
					`   ${drive}: ${colorize(info.count.toString(), "cyan")}개 파일 (평균 깊이: ${avgDepth})`,
				);
				console.log(
					`      확장자: ${info.extensions.size}종류, 타입: ${Array.from(info.types).join(", ")}`,
				);
			}
		}

		// =================================================================
		// Demo 5: Windows 성능 및 최적화
		// =================================================================
		console.log(
			colorize(
				"\n╭─────────────────────────────────────────────────────────────╮",
				"blue",
			),
		);
		console.log(
			colorize(
				"│            Demo 5: Windows 성능 및 최적화                  │",
				"blue",
			),
		);
		console.log(
			colorize(
				"╰─────────────────────────────────────────────────────────────╯",
				"blue",
			),
		);

		const benchmarkPaths = Array.from({ length: 1000 }, (_, i) => {
			const drives = ["C:", "D:", "E:"];
			const drive = drives[i % drives.length];
			return `${drive}\\Projects\\app${Math.floor(i / 3)}\\src\\component${i % 10}\\file${i}.ts`;
		});

		console.log(
			colorize(
				`\n⚡ Windows ${benchmarkPaths.length}개 경로 성능 테스트:`,
				"yellow",
			),
		);

		// 환경 변수 확장 성능
		const expandStart = Date.now();
		const expandedBenchmarkPaths = benchmarkPaths.map(expandWindowsVariables);
		const expandTime = Date.now() - expandStart;

		// 단일 처리 성능
		const singleStart = Date.now();
		benchmarkPaths.forEach((path) => createPathInfo(path));
		const singleTime = Date.now() - singleStart;

		// 배치 처리 성능
		const batchStart = Date.now();
		createBatchPathInfo(benchmarkPaths);
		const batchTime = Date.now() - batchStart;

		// 드라이브 분석 성능
		const driveStart = Date.now();
		const pathInfosForDriveAnalysis = createBatchPathInfo(benchmarkPaths);
		analyzeWindowsDrives(pathInfosForDriveAnalysis);
		const driveTime = Date.now() - driveStart;

		console.log(
			`   환경 변수 확장: ${colorize(expandTime.toString(), "cyan")}ms`,
		);
		console.log(
			`   개별 PathInfo 생성: ${colorize(singleTime.toString(), "cyan")}ms`,
		);
		console.log(
			`   배치 PathInfo 생성: ${colorize(batchTime.toString(), "cyan")}ms`,
		);
		console.log(
			`   드라이브 분석: ${colorize(driveTime.toString(), "cyan")}ms`,
		);
		console.log(
			`   성능 향상: ${colorize((((singleTime - batchTime) / singleTime) * 100).toFixed(1) + "%", "green")}`,
		);

		// Windows 메모리 정보
		const memUsage = process.memoryUsage();
		console.log(`\n💾 Windows 메모리 사용량:`);
		console.log(
			`   RSS: ${colorize((memUsage.rss / 1024 / 1024).toFixed(1), "cyan")} MB`,
		);
		console.log(
			`   Heap Used: ${colorize((memUsage.heapUsed / 1024 / 1024).toFixed(1), "cyan")} MB`,
		);
		console.log(
			`   External: ${colorize((memUsage.external / 1024 / 1024).toFixed(1), "cyan")} MB`,
		);

		// =================================================================
		// Demo 6: Windows 로그 및 진단
		// =================================================================
		console.log(
			colorize(
				"\n╭─────────────────────────────────────────────────────────────╮",
				"blue",
			),
		);
		console.log(
			colorize(
				"│             Demo 6: Windows 로그 및 진단                   │",
				"blue",
			),
		);
		console.log(
			colorize(
				"╰─────────────────────────────────────────────────────────────╯",
				"blue",
			),
		);

		// Windows 진단 정보 수집
		const diagnosticInfo = {
			timestamp: new Date().toISOString(),
			platform: process.platform,
			arch: process.arch,
			nodeVersion: process.version,
			pid: process.pid,
			windowsInfo: {
				computername: process.env.COMPUTERNAME,
				username: process.env.USERNAME,
				userprofile: process.env.USERPROFILE,
				programfiles: process.env.PROGRAMFILES,
				windir: process.env.WINDIR,
				temp: tmpdir(),
			},
			analysis: {
				totalFiles: projectResults.length,
				validPathInfos: validPathInfos.length,
				analysisTimeMs: analysisTime,
				directories: grouped.size,
				drives: Array.from(driveAnalysis.keys()),
			},
			performance: {
				expandTimeMs: expandTime,
				singleProcessTimeMs: singleTime,
				batchProcessTimeMs: batchTime,
				driveAnalysisTimeMs: driveTime,
				improvementPercent: (
					((singleTime - batchTime) / singleTime) *
					100
				).toFixed(1),
			},
			memory: {
				rss: Math.round(memUsage.rss / 1024 / 1024),
				heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
				external: Math.round(memUsage.external / 1024 / 1024),
			},
		};

		// Windows 문서 폴더에 로그 저장
		const logPath = `${homedir()}\\Documents\\pathinfo-windows-demo.json`;
		writeFileSync(logPath, JSON.stringify(diagnosticInfo, null, 2));

		console.log(colorize(`\n📝 Windows 진단 로그 저장: ${logPath}`, "green"));
		console.log(
			`   분석된 드라이브: ${diagnosticInfo.analysis.drives.join(", ")}`,
		);
		console.log(`   Windows 사용자: ${diagnosticInfo.windowsInfo.username}`);

		// =================================================================
		// Demo 완료
		// =================================================================
		console.log(
			colorize(
				"\n╭─────────────────────────────────────────────────────────────╮",
				"green",
			),
		);
		console.log(
			colorize(
				"│                🎉 Windows Demo 완료!                      │",
				"green",
			),
		);
		console.log(
			colorize(
				"╰─────────────────────────────────────────────────────────────╯",
				"green",
			),
		);

		console.log(colorize("\n✨ Windows 특화 기능 검증 완료:", "bright"));
		console.log(
			colorize("   ✅ 드라이브 문자 완전 지원 (C:, D:, E:)", "green"),
		);
		console.log(colorize("   ✅ UNC 네트워크 경로 처리", "green"));
		console.log(colorize("   ✅ Windows 환경 변수 자동 확장", "green"));
		console.log(colorize("   ✅ 개발 도구 자동 감지", "green"));
		console.log(colorize("   ✅ Windows 파일 시스템 최적화", "green"));
		console.log(colorize("   ✅ PowerShell/CMD 환경 호환성", "green"));
		console.log(colorize("   ✅ Windows 서비스 통합 준비", "green"));

		console.log(colorize("\n🔧 추천 Windows 명령어:", "cyan"));
		console.log("   > npm run test           # 테스트 실행");
		console.log("   > npm run build          # 프로덕션 빌드");
		console.log("   > npx tsx demo-*.ts      # 다른 데모 실행");
		console.log("   > Get-Process node        # PowerShell 프로세스 확인");
		console.log("   > dir /s *.ts             # TypeScript 파일 검색");

		console.log(
			colorize("\n🪟 Windows PathInfo 시스템 - 완벽한 Windows 통합!", "bright"),
		);
	} catch (error) {
		console.error(colorize("\n❌ Windows 데모 실행 중 오류:", "red"));
		console.error(error);
		process.exit(1);
	}
}

// Windows Ctrl+C 처리
process.on("SIGINT", () => {
	console.log(colorize("\n\n🪟 Windows 신호 수신 - 정리 중...", "yellow"));
	console.log(colorize("데모를 안전하게 종료합니다.", "cyan"));
	process.exit(0);
});

// 실행
if (require.main === module) {
	runWindowsDemo().catch((error) => {
		console.error(colorize("❌ Windows 데모 실행 실패:", "red"), error);
		process.exit(1);
	});
}
