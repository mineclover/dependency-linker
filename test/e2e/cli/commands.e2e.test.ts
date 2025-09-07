/**
 * End-to-End Tests for CLI Commands
 * Tests complete command workflows with real file system and mock external services
 */

import { 
  describe, 
  it, 
  expect, 
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  vi
} from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { 
  TestEnvironment,
  IntegrationTestHelpers,
  TestAssertions
} from '../../setup/test-framework.js';

const execAsync = promisify(exec);

describe('CLI Commands End-to-End Tests', () => {
  let tempProjectDir: string;
  let cliPath: string;

  beforeAll(async () => {
    // Setup test environment
    TestEnvironment.setupEnvironment({
      NOTION_API_KEY: 'test_integration_key',
      DEPLINK_ENVIRONMENT: 'test',
      NODE_ENV: 'test'
    });

    cliPath = path.resolve(process.cwd(), 'src/main.ts');

    // Create comprehensive test project structure
    tempProjectDir = await IntegrationTestHelpers.createTempProject({
      'package.json': JSON.stringify({
        name: 'e2e-test-project',
        version: '1.0.0',
        type: 'module',
        scripts: {
          test: 'vitest',
          build: 'tsc'
        },
        dependencies: {
          'express': '^4.18.0',
          'lodash': '^4.17.0'
        },
        devDependencies: {
          'typescript': '^5.0.0',
          'vitest': '^1.0.0'
        }
      }),
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          moduleResolution: 'node',
          strict: true,
          esModuleInterop: true
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist']
      }),
      'deplink.config.json': JSON.stringify({
        project: {
          name: 'E2E Test Project',
          type: 'typescript',
          path: '.'
        },
        notion: {
          apiKey: 'test_integration_key',
          workspaceUrl: 'https://notion.so/test-workspace',
          parentPageId: 'test-parent-page-id',
          databases: {
            files: 'test-files-db-id',
            functions: 'test-functions-db-id',
            dependencies: 'test-deps-db-id',
            libraries: 'test-libs-db-id',
            classes: 'test-classes-db-id'
          }
        },
        features: {
          sqliteIndexing: true,
          notionUpload: false, // Disabled for E2E tests
          gitIntegration: true,
          autoSync: false
        }
      }),
      'src/index.ts': `
        import express from 'express';
        import { merge } from 'lodash';

        export interface UserData {
          id: number;
          name: string;
          email: string;
        }

        export class UserService {
          private users: UserData[] = [];

          constructor(private config: any) {}

          async createUser(userData: Partial<UserData>): Promise<UserData> {
            const user: UserData = {
              id: Date.now(),
              name: userData.name || '',
              email: userData.email || ''
            };
            this.users.push(user);
            return user;
          }

          async getUserById(id: number): Promise<UserData | null> {
            return this.users.find(u => u.id === id) || null;
          }

          async updateUser(id: number, updates: Partial<UserData>): Promise<UserData | null> {
            const userIndex = this.users.findIndex(u => u.id === id);
            if (userIndex === -1) return null;
            
            this.users[userIndex] = merge(this.users[userIndex], updates);
            return this.users[userIndex];
          }
        }

        export const app = express();
        export const userService = new UserService({});
      `,
      'src/utils/helpers.ts': `
        export function formatDate(date: Date): string {
          return date.toISOString().split('T')[0];
        }

        export function validateEmail(email: string): boolean {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(email);
        }

        export async function delay(ms: number): Promise<void> {
          return new Promise(resolve => setTimeout(resolve, ms));
        }
      `,
      'src/api/routes.ts': `
        import { Router } from 'express';
        import { UserService } from '../index.js';

        export function createUserRoutes(userService: UserService): Router {
          const router = Router();

          router.get('/users/:id', async (req, res) => {
            const user = await userService.getUserById(parseInt(req.params.id));
            if (!user) {
              return res.status(404).json({ error: 'User not found' });
            }
            res.json(user);
          });

          router.post('/users', async (req, res) => {
            const user = await userService.createUser(req.body);
            res.status(201).json(user);
          });

          return router;
        }
      `,
      'README.md': `
        # E2E Test Project

        This is a test project for end-to-end CLI testing.

        ## Features
        - User management API
        - Express.js server
        - TypeScript support
      `,
      '.gitignore': `
        node_modules/
        dist/
        .env
        *.log
      `
    });

    await TestEnvironment.setupTestDatabase(tempProjectDir);
  });

  afterAll(async () => {
    TestEnvironment.restoreEnvironment();
    await IntegrationTestHelpers.cleanupTempProject(tempProjectDir);
    await TestEnvironment.cleanupTestDatabase(tempProjectDir);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('deplink init command', () => {
    it('should initialize project configuration interactively', async () => {
      const tempDir = await IntegrationTestHelpers.createTempProject({
        'package.json': JSON.stringify({ name: 'init-test', version: '1.0.0' })
      });

      try {
        const { stdout, stderr } = await execAsync(
          `cd "${tempDir}" && node "${cliPath}" init --yes`,
          { timeout: 10000 }
        );

        expect(stderr).toBe('');
        expect(stdout).toContain('✅ Configuration initialized successfully');
        
        // Verify config file was created
        const configPath = path.join(tempDir, 'deplink.config.json');
        const fs = await import('fs/promises');
        const configExists = await fs.access(configPath).then(() => true).catch(() => false);
        expect(configExists).toBe(true);

      } finally {
        await IntegrationTestHelpers.cleanupTempProject(tempDir);
      }
    });

    it('should detect project type automatically', async () => {
      const { stdout } = await execAsync(
        `cd "${tempProjectDir}" && node "${cliPath}" init --auto-detect --yes`,
        { timeout: 10000 }
      );

      expect(stdout).toContain('🔍 Detected project type: typescript');
      expect(stdout).toContain('📦 Found package.json');
      expect(stdout).toContain('⚙️ Found tsconfig.json');
    });

    it('should handle existing configuration gracefully', async () => {
      // Run init twice
      await execAsync(
        `cd "${tempProjectDir}" && node "${cliPath}" init --yes`,
        { timeout: 10000 }
      );

      const { stdout } = await execAsync(
        `cd "${tempProjectDir}" && node "${cliPath}" init --yes`,
        { timeout: 10000 }
      );

      expect(stdout).toContain('⚠️ Configuration already exists');
      expect(stdout).toContain('Use --force to overwrite');
    });
  });

  describe('deplink status command', () => {
    it('should display comprehensive project status', async () => {
      const { stdout } = await execAsync(
        `cd "${tempProjectDir}" && node "${cliPath}" status`,
        { timeout: 10000 }
      );

      expect(stdout).toContain('📊 Project Status:');
      expect(stdout).toContain('📦 Project: E2E Test Project');
      expect(stdout).toContain('🏗️  Type: typescript');
      expect(stdout).toContain('⚙️ Configuration:');
      expect(stdout).toContain('✅ Valid: Yes');
    });

    it('should show Notion connection status', async () => {
      const { stdout } = await execAsync(
        `cd "${tempProjectDir}" && node "${cliPath}" status`,
        { timeout: 10000 }
      );

      expect(stdout).toContain('🔗 Notion Connection:');
      expect(stdout).toContain('🗄️  Databases:');
      expect(stdout).toMatch(/files:.*test-files-db-id/);
      expect(stdout).toMatch(/functions:.*test-functions-db-id/);
    });

    it('should display analysis statistics', async () => {
      const { stdout } = await execAsync(
        `cd "${tempProjectDir}" && node "${cliPath}" status`,
        { timeout: 10000 }
      );

      expect(stdout).toContain('📈 Analysis Statistics:');
      expect(stdout).toMatch(/Analyzed Files: \d+/);
      expect(stdout).toMatch(/Dependencies: \d+/);
      expect(stdout).toMatch(/Functions: \d+/);
    });
  });

  describe('deplink validate command', () => {
    it('should validate project configuration', async () => {
      const { stdout } = await execAsync(
        `cd "${tempProjectDir}" && node "${cliPath}" validate`,
        { timeout: 15000 }
      );

      expect(stdout).toContain('🔍 Validating project configuration...');
      expect(stdout).toContain('✅ Configuration validation passed');
    });

    it('should validate system integrity', async () => {
      const { stdout } = await execAsync(
        `cd "${tempProjectDir}" && node "${cliPath}" validate --system`,
        { timeout: 20000 }
      );

      expect(stdout).toContain('🔍 Performing system validation...');
      expect(stdout).toContain('📁 File system access');
      expect(stdout).toContain('⚙️ Configuration integrity');
      expect(stdout).toContain('🗃️ Database connectivity');
    });

    it('should detect configuration issues', async () => {
      // Create temporary config with issues
      const configPath = path.join(tempProjectDir, 'deplink.config.json');
      const fs = await import('fs/promises');
      const originalConfig = await fs.readFile(configPath, 'utf-8');
      
      const invalidConfig = JSON.parse(originalConfig);
      delete invalidConfig.notion.apiKey; // Remove required field

      await fs.writeFile(configPath, JSON.stringify(invalidConfig, null, 2));

      try {
        const { stdout, stderr } = await execAsync(
          `cd "${tempProjectDir}" && node "${cliPath}" validate`,
          { timeout: 10000 }
        );

        expect(stdout || stderr).toContain('❌ Configuration validation failed');
        expect(stdout || stderr).toMatch(/API key.*required/i);
      } finally {
        // Restore original config
        await fs.writeFile(configPath, originalConfig);
      }
    });
  });

  describe('deplink sync command', () => {
    it('should sync project files with dry-run mode', async () => {
      const { stdout } = await execAsync(
        `cd "${tempProjectDir}" && node "${cliPath}" sync --dry-run`,
        { timeout: 15000 }
      );

      expect(stdout).toContain('🔄 Starting synchronization process...');
      expect(stdout).toContain('📋 Dry run mode - no changes will be made');
      expect(stdout).toMatch(/Found \d+ files to process/);
      expect(stdout).toMatch(/TypeScript files: \d+/);
      expect(stdout).toContain('✅ Synchronization completed successfully!');
    });

    it('should sync code files only', async () => {
      const { stdout } = await execAsync(
        `cd "${tempProjectDir}" && node "${cliPath}" sync --code --dry-run`,
        { timeout: 15000 }
      );

      expect(stdout).toContain('🔄 Starting synchronization process...');
      expect(stdout).toContain('📝 Syncing code files only');
      expect(stdout).toMatch(/Processing.*\.ts files/);
    });

    it('should sync with custom file patterns', async () => {
      const { stdout } = await execAsync(
        `cd "${tempProjectDir}" && node "${cliPath}" sync --code --pattern "src/**/*.ts" --dry-run`,
        { timeout: 15000 }
      );

      expect(stdout).toContain('🔍 Using pattern: src/**/*.ts');
      expect(stdout).toMatch(/Matched \d+ files/);
    });
  });

  describe('deplink upload command', () => {
    it('should upload single file', async () => {
      const testFilePath = path.join(tempProjectDir, 'src/index.ts');
      
      const { stdout } = await execAsync(
        `cd "${tempProjectDir}" && node "${cliPath}" upload --file "${testFilePath}" --skip-notion`,
        { timeout: 15000 }
      );

      expect(stdout).toContain('📤 Starting upload process...');
      expect(stdout).toContain('✅ File uploaded successfully!');
      expect(stdout).toMatch(/Functions: \d+/);
      expect(stdout).toMatch(/Dependencies: \d+/);
    });

    it('should upload with content inclusion', async () => {
      const testFilePath = path.join(tempProjectDir, 'src/utils/helpers.ts');
      
      const { stdout } = await execAsync(
        `cd "${tempProjectDir}" && node "${cliPath}" upload --file "${testFilePath}" --include-content --skip-notion`,
        { timeout: 15000 }
      );

      expect(stdout).toContain('📝 Including file content in upload');
      expect(stdout).toContain('✅ File uploaded successfully!');
    });

    it('should handle upload batch operations', async () => {
      const files = [
        path.join(tempProjectDir, 'src/index.ts'),
        path.join(tempProjectDir, 'src/utils/helpers.ts')
      ].join(',');
      
      const { stdout } = await execAsync(
        `cd "${tempProjectDir}" && node "${cliPath}" upload --batch "${files}" --skip-notion`,
        { timeout: 20000 }
      );

      expect(stdout).toContain('📦 Batch upload mode');
      expect(stdout).toMatch(/Batch upload completed: \d+ successful, \d+ failed/);
    });

    it('should respect upload limits', async () => {
      const testFilePath = path.join(tempProjectDir, 'src/index.ts');
      
      const { stdout } = await execAsync(
        `cd "${tempProjectDir}" && node "${cliPath}" upload --file "${testFilePath}" --max-functions 2 --max-dependencies 3 --skip-notion`,
        { timeout: 15000 }
      );

      expect(stdout).toContain('⚖️ Applying collection limits');
      expect(stdout).toMatch(/Functions: [0-2]/); // Should be limited to 2
      expect(stdout).toMatch(/Dependencies: [0-3]/); // Should be limited to 3
    });
  });

  describe('deplink health command', () => {
    it('should perform comprehensive health check', async () => {
      const { stdout } = await execAsync(
        `cd "${tempProjectDir}" && node "${cliPath}" health`,
        { timeout: 20000 }
      );

      expect(stdout).toContain('🏥 System Health Report:');
      expect(stdout).toContain('✅ Overall Health: HEALTHY');
      expect(stdout).toContain('📊 Components:');
      expect(stdout).toMatch(/✅ configuration: HEALTHY/);
      expect(stdout).toMatch(/✅ filesystem: HEALTHY/);
      expect(stdout).toMatch(/✅ database: HEALTHY/);
    });

    it('should detect and report health issues', async () => {
      // Temporarily corrupt configuration
      const configPath = path.join(tempProjectDir, 'deplink.config.json');
      const fs = await import('fs/promises');
      const originalConfig = await fs.readFile(configPath, 'utf-8');
      
      await fs.writeFile(configPath, 'invalid json content');

      try {
        const { stdout, stderr } = await execAsync(
          `cd "${tempProjectDir}" && node "${cliPath}" health`,
          { timeout: 15000 }
        );

        const output = stdout + stderr;
        expect(output).toMatch(/(❌|⚠️).*Overall Health: (UNHEALTHY|DEGRADED)/);
        expect(output).toContain('❌ configuration: UNHEALTHY');
      } finally {
        // Restore original config
        await fs.writeFile(configPath, originalConfig);
      }
    });

    it('should provide actionable health recommendations', async () => {
      const { stdout } = await execAsync(
        `cd "${tempProjectDir}" && node "${cliPath}" health`,
        { timeout: 20000 }
      );

      if (stdout.includes('💡 Immediate Actions:')) {
        expect(stdout).toMatch(/\d+\./); // Should have numbered recommendations
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid commands gracefully', async () => {
      const { stderr } = await execAsync(
        `cd "${tempProjectDir}" && node "${cliPath}" invalid-command || true`,
        { timeout: 5000 }
      );

      expect(stderr).toMatch(/unknown command.*invalid-command/i);
    });

    it('should handle missing configuration', async () => {
      const tempDir = await IntegrationTestHelpers.createTempProject({
        'package.json': JSON.stringify({ name: 'no-config-test', version: '1.0.0' })
      });

      try {
        const { stderr } = await execAsync(
          `cd "${tempDir}" && node "${cliPath}" status || true`,
          { timeout: 10000 }
        );

        expect(stderr).toMatch(/configuration.*not found/i);
      } finally {
        await IntegrationTestHelpers.cleanupTempProject(tempDir);
      }
    });

    it('should handle file system permission errors', async () => {
      // Create read-only directory (simulate permission error)
      const restrictedDir = await IntegrationTestHelpers.createTempProject({
        'package.json': JSON.stringify({ name: 'restricted', version: '1.0.0' })
      });

      try {
        const fs = await import('fs/promises');
        await fs.chmod(restrictedDir, 0o444); // Read-only

        const { stderr } = await execAsync(
          `cd "${restrictedDir}" && node "${cliPath}" init --yes || true`,
          { timeout: 10000 }
        );

        expect(stderr).toMatch(/(permission|access).*denied/i);
      } finally {
        const fs = await import('fs/promises');
        await fs.chmod(restrictedDir, 0o755); // Restore permissions
        await IntegrationTestHelpers.cleanupTempProject(restrictedDir);
      }
    });

    it('should handle network connectivity issues', async () => {
      // Mock network failure by using invalid API endpoint
      const configPath = path.join(tempProjectDir, 'deplink.config.json');
      const fs = await import('fs/promises');
      const originalConfig = await fs.readFile(configPath, 'utf-8');
      
      const config = JSON.parse(originalConfig);
      config.notion.workspaceUrl = 'https://invalid-notion-url.test';
      
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      try {
        const { stderr } = await execAsync(
          `cd "${tempProjectDir}" && node "${cliPath}" health || true`,
          { timeout: 15000 }
        );

        expect(stderr).toMatch(/(network|connection|timeout)/i);
      } finally {
        // Restore original config
        await fs.writeFile(configPath, originalConfig);
      }
    });
  });

  describe('Command Integration and Workflows', () => {
    it('should support complete project setup workflow', async () => {
      const workflowDir = await IntegrationTestHelpers.createTempProject({
        'package.json': JSON.stringify({
          name: 'workflow-test',
          version: '1.0.0',
          type: 'module'
        }),
        'src/app.ts': 'export const app = "workflow test";'
      });

      try {
        // Step 1: Initialize
        const initResult = await execAsync(
          `cd "${workflowDir}" && node "${cliPath}" init --yes`,
          { timeout: 10000 }
        );
        expect(initResult.stdout).toContain('✅ Configuration initialized');

        // Step 2: Validate
        const validateResult = await execAsync(
          `cd "${workflowDir}" && node "${cliPath}" validate`,
          { timeout: 10000 }
        );
        expect(validateResult.stdout).toContain('✅ Configuration validation passed');

        // Step 3: Check status
        const statusResult = await execAsync(
          `cd "${workflowDir}" && node "${cliPath}" status`,
          { timeout: 10000 }
        );
        expect(statusResult.stdout).toContain('📊 Project Status:');

        // Step 4: Sync (dry run)
        const syncResult = await execAsync(
          `cd "${workflowDir}" && node "${cliPath}" sync --dry-run`,
          { timeout: 15000 }
        );
        expect(syncResult.stdout).toContain('✅ Synchronization completed');

      } finally {
        await IntegrationTestHelpers.cleanupTempProject(workflowDir);
      }
    });

    it('should maintain consistent state across commands', async () => {
      // Run multiple commands and verify state consistency
      const commands = [
        'status',
        'validate',
        'sync --dry-run',
        'status'
      ];

      for (const cmd of commands) {
        const { stdout, stderr } = await execAsync(
          `cd "${tempProjectDir}" && node "${cliPath}" ${cmd}`,
          { timeout: 15000 }
        );

        expect(stderr).toBe('');
        expect(stdout).not.toContain('Error:');
        expect(stdout).not.toContain('Failed:');
      }
    });
  });
});