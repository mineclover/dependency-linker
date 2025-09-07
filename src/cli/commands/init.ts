/**
 * Interactive Setup Command for npm package workflow
 * Creates .env and deplink.config.json with guided setup
 */

import { Command } from 'commander';
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { logger, ProjectDetector } from '../../shared/utils/index.js';
import type { NotionConfig } from '../../shared/types/index.js';

// Simple prompts without external dependencies
async function prompt(message: string, defaultValue?: string): Promise<string> {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const promptText = defaultValue ? `${message} (${defaultValue}): ` : `${message}: `;
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

async function confirm(message: string, defaultValue: boolean = false): Promise<boolean> {
  const answer = await prompt(`${message} (y/N)`, defaultValue ? 'y' : 'n');
  return ['y', 'yes', 'true'].includes(answer.toLowerCase());
}

export interface InitOptions {
  force?: boolean;
  template?: string;
  silent?: boolean;
}

export interface SetupConfig {
  apiKey: string;
  workspaceName?: string;
  parentPageId?: string;
  environment: 'development' | 'test' | 'production';
  features: string[];
  gitIntegration: boolean;
  autoSync: boolean;
}

export function createInitCommand(): Command {
  const command = new Command('init')
    .description('Initialize dependency tracking in current project')
    .option('-f, --force', 'Overwrite existing configuration files')
    .option('-t, --template <type>', 'Use configuration template (basic|full|enterprise)')
    .option('-s, --silent', 'Skip interactive prompts, use defaults')
    .action(async (options: InitOptions) => {
      await executeInit(options);
    });

  return command;
}

async function executeInit(options: InitOptions): Promise<void> {
  try {
    logger.info('Starting Dependency Linker setup...', '🚀');
    
    // Detect project root and info
    const detection = await ProjectDetector.autoDetectProject();
    
    if (!detection.projectRoot) {
      logger.error('Could not detect project root. Please run from a valid project directory.');
      process.exit(1);
    }

    const projectRoot = detection.projectRoot;
    const projectInfo = detection.projectInfo!;
    
    // Display project info
    logger.info(`Project: ${projectInfo.name || 'Unknown'} (${projectInfo.type})`, '📦');
    logger.info(`Root: ${projectRoot}`, '📍');
    
    // Check existing configuration
    const configPath = path.join(projectRoot, 'deplink.config.json');
    const envPath = path.join(projectRoot, '.env');
    
    if (existsSync(configPath) && !options.force) {
      const overwrite = await confirm('Configuration already exists. Overwrite?', false);
      
      if (!overwrite) {
        logger.warning('Setup cancelled. Use --force to overwrite existing configuration.');
        return;
      }
    }
    
    // Interactive setup or use template
    let config: SetupConfig;
    
    if (options.silent) {
      config = getDefaultConfig();
    } else if (options.template) {
      config = getTemplateConfig(options.template);
    } else {
      config = await interactiveSetup(projectInfo);
    }
    
    // Generate configuration files
    await generateConfigFiles(projectRoot, config, projectInfo);
    
    // Setup project structure if needed
    await setupProjectStructure(projectRoot, config);
    
    logger.success('Dependency Linker initialized successfully!');
    logger.info('Next steps:', '🔨');
    logger.info('   1. Run `deplink sync` to start tracking dependencies');
    logger.info('   2. Check your Notion workspace for created databases');
    logger.info('   3. Explore documentation with `deplink --help`');
    
    // Display recommendations
    if (detection.recommendations.length > 0) {
      logger.info('Recommendations:', '💡');
      detection.recommendations.forEach(rec => {
        logger.info(`   ${rec}`);
      });
    }
    
  } catch (error) {
    logger.error(`Setup failed: ${error}`);
    process.exit(1);
  }
}

async function interactiveSetup(projectInfo: any): Promise<SetupConfig> {
  logger.info('Interactive setup - Answer the following questions:', '📝');
  
  // API Key
  const apiKey = await prompt('Enter your Notion API key');
  if (!apiKey || apiKey.length < 10) {
    throw new Error('Valid Notion API key is required');
  }
  
  // Workspace name (optional)
  const workspaceName = await prompt('Workspace name (optional)', projectInfo.name || 'My Project');
  
  // Environment
  logger.info('Available environments: 1) development  2) test  3) production');
  const envChoice = await prompt('Select environment (1-3)', '1');
  const environments: Array<'development' | 'test' | 'production'> = ['development', 'test', 'production'];
  const environment = environments[parseInt(envChoice) - 1] || 'development';
  
  // Features (simplified)
  const enableDocs = await confirm('Enable documentation linking?', true);
  const enableAnalysis = await confirm('Enable code analysis?', false);
  
  const features = ['dependencies'];
  if (enableDocs) features.push('documentation');
  if (enableAnalysis) features.push('analysis');
  
  // Git integration
  const gitIntegration = projectInfo.hasGit ? await confirm('Enable Git integration (automatic sync on commits)?', true) : false;
  
  // Auto sync
  const autoSync = await confirm('Enable automatic sync on file changes?', false);
  
  // Parent page (optional)
  const hasParentPage = await confirm('Do you have a specific Notion page to organize databases under?', false);
  
  let parentPageId: string | undefined;
  if (hasParentPage) {
    parentPageId = await prompt('Enter parent page ID or URL');
    
    // Extract page ID from URL if needed
    if (parentPageId?.includes('notion.so')) {
      const match = parentPageId.match(/([a-f0-9]{32}|[a-f0-9-]{36})/);
      if (match) {
        parentPageId = match[1].replace(/-/g, '');
      }
    }
  }
  
  return {
    apiKey,
    workspaceName,
    parentPageId,
    environment,
    features,
    gitIntegration,
    autoSync
  };
}

function getDefaultConfig(): SetupConfig {
  return {
    apiKey: process.env.NOTION_API_KEY || '',
    environment: 'development',
    features: ['dependencies', 'documentation'],
    gitIntegration: false,
    autoSync: false
  };
}

function getTemplateConfig(template: string): SetupConfig {
  const base = getDefaultConfig();
  
  switch (template) {
    case 'basic':
      return {
        ...base,
        features: ['dependencies']
      };
      
    case 'full':
      return {
        ...base,
        features: ['dependencies', 'documentation', 'analysis'],
        gitIntegration: true
      };
      
    case 'enterprise':
      return {
        ...base,
        features: ['dependencies', 'documentation', 'analysis', 'performance', 'search'],
        gitIntegration: true,
        autoSync: true
      };
      
    default:
      return base;
  }
}

async function generateConfigFiles(
  projectRoot: string, 
  config: SetupConfig, 
  projectInfo: any
): Promise<void> {
  // Generate deplink.config.json
  const deplinkConfig: NotionConfig = {
    apiKey: '', // Don't store API key in config file
    databases: {
      files: '', // Will be created during first sync
    },
    parentPageId: config.parentPageId,
    environment: config.environment,
    workspaceInfo: {
      userId: '',
      projectName: config.workspaceName || projectInfo.name || 'Unknown Project',
      setupDate: new Date().toISOString(),
      workspaceUrl: ''
    },
    git: config.gitIntegration ? {
      enabled: true,
      autoSync: config.autoSync,
      watchBranches: ['main', 'master', 'develop'],
      ignorePatterns: ['node_modules/**', '.git/**', 'dist/**', 'build/**']
    } : {
      enabled: false,
      autoSync: false,
      watchBranches: [],
      ignorePatterns: []
    }
  };
  
  const configPath = path.join(projectRoot, 'deplink.config.json');
  await writeFile(configPath, JSON.stringify(deplinkConfig, null, 2));
  logger.info(`Created: ${configPath}`, '📄');
  
  // Generate .env file
  const envContent = [
    '# Dependency Linker Configuration',
    '# Add this file to .gitignore to keep your API key secure',
    '',
    `DEPLINK_API_KEY=${config.apiKey}`,
    `DEPLINK_ENVIRONMENT=${config.environment}`,
    '',
    '# Optional: Override project settings',
    '# DEPLINK_WORKSPACE_URL=https://www.notion.so/your-workspace',
    '# DEPLINK_PARENT_PAGE_ID=your-parent-page-id',
    ''
  ].join('\n');
  
  const envPath = path.join(projectRoot, '.env');
  await writeFile(envPath, envContent);
  logger.info(`Created: ${envPath}`, '🔐');
  
  // Create or update .gitignore
  await updateGitignore(projectRoot);
}

async function updateGitignore(projectRoot: string): Promise<void> {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  const entries = [
    '.env',
    '.deplink/',
    '.deplink-*.json'
  ];
  
  let content = '';
  if (existsSync(gitignorePath)) {
    content = await readFile(gitignorePath, 'utf-8');
  }
  
  let updated = false;
  for (const entry of entries) {
    if (!content.includes(entry)) {
      content += content.endsWith('\n') ? '' : '\n';
      content += `${entry}\n`;
      updated = true;
    }
  }
  
  if (updated) {
    await writeFile(gitignorePath, content);
    logger.info(`Updated: ${gitignorePath}`, '📝');
  }
}

async function setupProjectStructure(projectRoot: string, config: SetupConfig): Promise<void> {
  // Create .deplink directory for local storage
  const deplinkDir = path.join(projectRoot, '.deplink');
  const { mkdir } = await import('fs/promises');
  
  try {
    await mkdir(deplinkDir, { recursive: true });
    logger.info(`Created: ${deplinkDir}`, '📁');
  } catch (error) {
    // Directory might already exist
  }
  
  // Setup Git hooks if requested
  if (config.gitIntegration) {
    await setupGitHooks(projectRoot);
  }
}

async function setupGitHooks(projectRoot: string): Promise<void> {
  const hooksDir = path.join(projectRoot, '.git', 'hooks');
  
  if (!existsSync(hooksDir)) {
    logger.warning('Git hooks directory not found. Skipping Git integration setup.');
    return;
  }
  
  // Create post-commit hook
  const hookContent = [
    '#!/bin/sh',
    '# Dependency Linker auto-sync hook',
    '',
    'echo "🔄 Running Dependency Linker sync..."',
    'npx deplink sync --auto || true',
    ''
  ].join('\n');
  
  const hookPath = path.join(hooksDir, 'post-commit');
  await writeFile(hookPath, hookContent);
  
  // Make executable (Unix systems)
  if (process.platform !== 'win32') {
    const { chmod } = await import('fs/promises');
    await chmod(hookPath, '755');
  }
  
  logger.info(`Created Git hook: ${hookPath}`, '🪝');
}

// Export for use in main CLI
export { executeInit };