/**
 * Base Command Class - CLI Command Foundation
 * Provides standardized dependency injection and error handling for CLI commands
 */

import { Command } from 'commander';
import { getServiceContainer } from '../../infrastructure/container/ServiceContainer.js';
import { logger } from '../../shared/utils/index.js';
import type { ConfigurationService } from '../../services/config/ConfigurationService.js';
import type { ProcessedConfig } from '../../shared/types/index.js';
import type { NotionApiService } from '../../infrastructure/notion/core/NotionApiService.js';

export interface CommandDependencies {
  configService: ConfigurationService;
  config: ProcessedConfig;
  notionApiService?: NotionApiService;
}

export interface CommandOptions {
  requiresNotion?: boolean;
  validateConfig?: boolean;
}

/**
 * Abstract base class for CLI commands with standardized patterns
 */
export abstract class BaseCommand {
  protected dependencies: CommandDependencies | null = null;

  constructor(
    protected commandName: string,
    protected description: string,
    protected options: CommandOptions = {}
  ) {}

  /**
   * Initialize command dependencies
   */
  protected async initializeDependencies(): Promise<CommandDependencies> {
    if (this.dependencies) {
      return this.dependencies;
    }

    try {
      // Get service container
      const container = getServiceContainer();
      const configService = container.resolve<ConfigurationService>('configurationService');
      
      // Load configuration
      const config = await configService.loadAndProcessConfig(process.cwd());
      
      // Validate configuration if required
      if (this.options.validateConfig !== false) {
        const validation = await configService.validateConfig(config);
        if (!validation.isValid) {
          throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
        }
        
        if (validation.warnings.length > 0) {
          validation.warnings.forEach(warning => logger.warning(warning));
        }
      }

      // Initialize Notion service if required
      let notionApiService: NotionApiService | undefined;
      if (this.options.requiresNotion) {
        if (!config.apiKey) {
          throw new Error('Notion API key not found in configuration. Please run `deplink init` first.');
        }

        // Get NotionApiService from service container instead of creating directly
        try {
          notionApiService = container.resolve<NotionApiService>('notionApiService');
        } catch (error) {
          // If not available in container, skip for now - this should be handled by proper DI setup
          logger.warning('NotionApiService not available in service container. Some functionality may be limited.');
        }
        
        logger.debug(`Notion API service initialized for command: ${this.commandName}`);
      }

      this.dependencies = {
        configService,
        config,
        notionApiService
      };

      return this.dependencies;
    } catch (error) {
      logger.error(`Failed to initialize dependencies for command '${this.commandName}': ` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * Execute command with error handling
   */
  protected async executeWithErrorHandling<T>(
    handler: (deps: CommandDependencies) => Promise<T>,
    options: any = {}
  ): Promise<T> {
    try {
      const deps = await this.initializeDependencies();
      return await handler(deps);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Command '${this.commandName}' failed: ${errorMessage}`);
      
      if (options.exitOnError !== false) {
        process.exit(1);
      }
      
      throw error;
    }
  }

  /**
   * Create the Commander command instance
   */
  abstract createCommand(): Command;

  /**
   * Handle command execution (to be implemented by subclasses)
   */
  protected abstract handleCommand(deps: CommandDependencies, options: any): Promise<void>;
}

/**
 * Utility function to create standardized command handlers
 */
export function createStandardizedCommand(
  name: string,
  description: string,
  commandOptions: CommandOptions,
  handler: (deps: CommandDependencies, options: any) => Promise<void>
): Command {
  const command = new Command(name)
    .description(description)
    .action(async (options) => {
      const baseCommand = new (class extends BaseCommand {
        createCommand(): Command {
          return command;
        }
        
        protected async handleCommand(deps: CommandDependencies, cmdOptions: any): Promise<void> {
          return handler(deps, cmdOptions);
        }
      })(name, description, commandOptions);
      
      await baseCommand.executeWithErrorHandling(
        (deps) => baseCommand['handleCommand'](deps, options),
        options
      );
    });

  return command;
}

/**
 * Progress tracking utilities for long-running commands
 */
export class CommandProgress {
  private startTime: number;
  private currentStep: number = 0;
  private totalSteps: number;
  private stepDescriptions: string[] = [];

  constructor(totalSteps: number, stepDescriptions: string[] = []) {
    this.startTime = Date.now();
    this.totalSteps = totalSteps;
    this.stepDescriptions = stepDescriptions;
    
    logger.info(`Starting operation with ${totalSteps} steps...`);
  }

  nextStep(description?: string): void {
    this.currentStep++;
    const desc = description || this.stepDescriptions[this.currentStep - 1] || `Step ${this.currentStep}`;
    const progress = Math.round((this.currentStep / this.totalSteps) * 100);
    
    logger.info(`[${progress}%] ${desc} (${this.currentStep}/${this.totalSteps})`);
  }

  complete(): void {
    const duration = Date.now() - this.startTime;
    logger.success(`Operation completed in ${Math.round(duration / 1000)}s`);
  }

  fail(error: string): void {
    const duration = Date.now() - this.startTime;
    logger.error(`Operation failed after ${Math.round(duration / 1000)}s: ${error}`);
  }
}