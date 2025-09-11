#!/usr/bin/env node

/**
 * CLI Main Entry Point
 * Command-line interface for TypeScript file analysis
 */

import { CommandParser } from './CommandParser';
import { FileAnalyzer } from '../services/FileAnalyzer';
import { OutputFormatter } from '../formatters/OutputFormatter';
import { FileAnalysisRequest } from '../models/FileAnalysisRequest';

function outputError(error: any, format: string = 'json'): void {
  if (format === 'json') {
    const errorOutput = {
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred'
      }
    };
    console.log(JSON.stringify(errorOutput, null, 2));
  } else {
    console.error('Error: ' + error.message);
  }
}

async function main(): Promise<void> {
  const parser = new CommandParser();
  const analyzer = new FileAnalyzer();
  const formatter = new OutputFormatter();

  try {
    // Parse command line arguments
    const parseResult = parser.parse(process.argv.slice(2));
    
    if (parseResult.error) {
      console.error(parser.formatError(parseResult.error));
      process.exit(parseResult.error.exitCode);
    }

    const options = parseResult.options!;

    // Handle help and version flags
    if (options.help) {
      console.log(parser.getHelpText());
      process.exit(0);
    }

    if (options.version) {
      console.log(parser.getVersionText());
      process.exit(0);
    }

    // Merge with environment variables
    const mergedOptions = parser.mergeWithEnvironment(options);

    // Validate options
    const validation = parser.validateOptions(mergedOptions);
    if (!validation.isValid) {
      let errorCode = 'INVALID_OPTIONS';
      const errorMessage = validation.errors.join(', ');
      
      // Check if it's a file type validation error
      if (errorMessage.includes('.ts or .tsx extension')) {
        errorCode = 'INVALID_FILE_TYPE';
      }
      
      outputError({ 
        code: errorCode, 
        message: errorMessage 
      }, mergedOptions.format);
      process.exit(1);
    }

    // Validate file can be analyzed
    const fileValidation = await analyzer.validateFile(mergedOptions.file!);
    if (!fileValidation.canAnalyze) {
      let errorCode = 'UNKNOWN_ERROR';
      const errorMessage = fileValidation.errors.join(', ');
      
      if (errorMessage.includes('not found') || errorMessage.includes('does not exist') || errorMessage.includes('no such file')) {
        errorCode = 'FILE_NOT_FOUND';
      } else if (errorMessage.includes('not a TypeScript') || errorMessage.includes('Invalid file type') || errorMessage.includes('TypeScript')) {
        errorCode = 'INVALID_FILE_TYPE';
      }
      
      outputError({ 
        code: errorCode, 
        message: errorMessage 
      }, mergedOptions.format);
      process.exit(1);
    }

    // Create analysis request
    const request: FileAnalysisRequest = {
      filePath: mergedOptions.file!,
      options: parser.toAnalysisOptions(mergedOptions)
    };

    // Perform analysis
    const result = await analyzer.analyzeFile(request);

    // Format and output result
    if (mergedOptions.format === 'json') {
      const jsonOutput = formatter.formatAsJson(result);
      console.log(jsonOutput);
    } else {
      const textOutput = formatter.formatAsText(result);
      console.log(textOutput);
    }

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    console.error('Unexpected error:', error instanceof Error ? error.message : String(error));
    
    if (process.env.DEBUG) {
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    }
    
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle SIGINT (Ctrl+C) gracefully
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Exiting gracefully...');
  process.exit(0);
});

// Handle SIGTERM gracefully
process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM. Exiting gracefully...');
  process.exit(0);
});

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}