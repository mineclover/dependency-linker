/**
 * 실제 작동하는 CLI 명령어 테스트
 * 실제로 구현되어 작동하는 명령어들만 테스트
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

// 테스트용 데이터베이스 경로
const TEST_DB_PATH = "test-dependency-linker.db";
const TEST_PROJECT_ROOT = path.join(__dirname, "../fixtures/test-project");

describe("실제 작동하는 CLI 명령어 테스트", () => {
	beforeAll(async () => {
		// 테스트용 프로젝트 디렉토리 생성
		if (!fs.existsSync(TEST_PROJECT_ROOT)) {
			fs.mkdirSync(TEST_PROJECT_ROOT, { recursive: true });
		}
	});

	afterAll(async () => {
		// 테스트용 파일들 정리
		if (fs.existsSync(TEST_DB_PATH)) {
			fs.unlinkSync(TEST_DB_PATH);
		}

		if (fs.existsSync(TEST_PROJECT_ROOT)) {
			fs.rmSync(TEST_PROJECT_ROOT, { recursive: true, force: true });
		}
	});

	describe("analyze 명령어", () => {
		it("TypeScript 파일 분석이 정상적으로 작동해야 함", async () => {
			// 테스트용 TypeScript 파일 생성
			const testFile = path.join(TEST_PROJECT_ROOT, "UserService.ts");
			const testContent = `
/**
 * User Service
 * @semantic-tags: service-layer, auth-domain, public-api
 */
export class UserService {
  async authenticateUser(email: string, password: string): Promise<User | null> {
    return null;
  }
}
`;
			fs.writeFileSync(testFile, testContent);

			// analyze 명령어 실행
			const { stdout, stderr } = await execAsync(
				`npm run cli -- analyze --pattern "${testFile}"`,
			);

			// stderr에 경고가 있을 수 있지만 정상 동작 확인
			expect(stdout).toContain("Analysis completed");
		}, 30000);
	});

	describe("rdf 명령어", () => {
		it("RDF 주소 생성이 정상적으로 작동해야 함", async () => {
			const { stdout, stderr } = await execAsync(
				`npm run cli -- rdf --create --project "test-project" --file "src/UserService.ts" --type "class" --symbol "UserService"`,
			);

			// stderr에 경고가 있을 수 있지만 정상 동작 확인
			expect(stdout).toContain("RDF 주소 생성:");
		}, 30000);

		it("RDF 주소 검색이 정상적으로 작동해야 함", async () => {
			// 먼저 RDF 주소 생성
			await execAsync(
				`npm run cli -- rdf --create --project "test-project" --file "src/UserService.ts" --type "class" --symbol "UserService"`,
			);

			// RDF 주소 검색
			const { stdout, stderr } = await execAsync(
				`npm run cli -- rdf --query "UserService"`,
			);

			// stderr에 경고가 있을 수 있지만 정상 동작 확인
			expect(stdout).toContain("UserService");
		}, 30000);
	});

	describe("rdf-file 명령어", () => {
		it("파일 위치 정보 반환이 정상적으로 작동해야 함", async () => {
			const testFile = path.join(TEST_PROJECT_ROOT, "UserService.ts");
			const testContent = `export class UserService {}`;
			fs.writeFileSync(testFile, testContent);

			const { stdout, stderr } = await execAsync(
				`npm run cli -- rdf-file --location "test-project/${path.relative(process.cwd(), testFile)}#class:UserService"`,
			);

			// stderr에 경고가 있을 수 있지만 정상 동작 확인
			expect(stdout).toContain("RDF 주소:");
			expect(stdout).toContain("파일 경로:");
		}, 30000);

		it("파일 경로 반환이 정상적으로 작동해야 함", async () => {
			const testFile = path.join(TEST_PROJECT_ROOT, "UserService.ts");
			const testContent = `export class UserService {}`;
			fs.writeFileSync(testFile, testContent);

			const { stdout, stderr } = await execAsync(
				`npm run cli -- rdf-file --path "test-project/${path.relative(process.cwd(), testFile)}#class:UserService"`,
			);

			// stderr에 경고가 있을 수 있지만 정상 동작 확인
			expect(stdout).toContain("파일 경로:");
		}, 30000);

		it("파일 존재 여부 확인이 정상적으로 작동해야 함", async () => {
			const testFile = path.join(TEST_PROJECT_ROOT, "UserService.ts");
			const testContent = `export class UserService {}`;
			fs.writeFileSync(testFile, testContent);

			const { stdout, stderr } = await execAsync(
				`npm run cli -- rdf-file --exists "test-project/${path.relative(process.cwd(), testFile)}#class:UserService"`,
			);

			// stderr에 경고가 있을 수 있지만 정상 동작 확인
			expect(stdout).toContain("파일 존재 여부:");
		}, 30000);

		it("RDF 주소 유효성 검증이 정상적으로 작동해야 함", async () => {
			const { stdout, stderr } = await execAsync(
				`npm run cli -- rdf-file --validate "test-project/src/UserService.ts#class:UserService"`,
			);

			// stderr에 경고가 있을 수 있지만 정상 동작 확인
			expect(stdout).toContain("RDF 주소 유효성:");
		}, 30000);
	});

	describe("CLI 도움말 명령어", () => {
		it("메인 도움말이 정상적으로 작동해야 함", async () => {
			const { stdout, stderr } = await execAsync(`npm run cli -- --help`);

			expect(stdout).toContain("Advanced dependency analysis tool");
			expect(stdout).toContain("Commands:");
		}, 10000);

		it("analyze 도움말이 정상적으로 작동해야 함", async () => {
			const { stdout, stderr } = await execAsync(
				`npm run cli -- analyze --help`,
			);

			expect(stdout).toContain("Analyze files for dependencies");
			expect(stdout).toContain("Options:");
		}, 10000);

		it("rdf 도움말이 정상적으로 작동해야 함", async () => {
			const { stdout, stderr } = await execAsync(`npm run cli -- rdf --help`);

			expect(stdout).toContain("RDF operations");
			expect(stdout).toContain("Options:");
		}, 10000);

		it("rdf-file 도움말이 정상적으로 작동해야 함", async () => {
			const { stdout, stderr } = await execAsync(
				`npm run cli -- rdf-file --help`,
			);

			expect(stdout).toContain("RDF 주소 기반 파일 위치 반환 및 파일 열기");
			expect(stdout).toContain("Options:");
		}, 10000);
	});

	describe("CLI 버전 명령어", () => {
		it("버전 정보가 정상적으로 작동해야 함", async () => {
			const { stdout, stderr } = await execAsync(`npm run cli -- --version`);

			expect(stdout).toContain("2.1.0");
		}, 10000);
	});
});
