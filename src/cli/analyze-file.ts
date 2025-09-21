#!/usr/bin/env node

/**
 * CLI Main Entry Point
 * Command-line interface for TypeScript file analysis
 */

import { isSuccessful } from "../models/AnalysisResult";
import { CLIAdapter } from "./CLIAdapter";
import { CommandParser } from "./CommandParser";

function outputError(error: any, format: string = "json"): void {
	if (format === "json") {
		const errorOutput = {
			error: {
				code: error.code || "UNKNOWN_ERROR",
				message: error.message || "An unknown error occurred",
			},
		};
		console.log(JSON.stringify(errorOutput, null, 2));
	} else {
		console.error(`Error: ${error.message}`);
	}
}

async function main(): Promise<void> {
	const parser = new CommandParser();
	const cliAdapter = new CLIAdapter();

	try {
		// Check for config command first
		const args = process.argv.slice(2);
		if (args.length > 0 && args[0] === "config") {
			// Route to config command
			const { execSync } = require("node:child_process");
			const path = require("node:path");
			const configScript = path.join(__dirname, "commands", "config.js");

			try {
				execSync(`node "${configScript}" ${args.slice(1).join(" ")}`, {
					stdio: "inherit",
					encoding: "utf8",
				});
				process.exit(0);
			} catch {
				process.exit(1);
			}
		}

		// Parse command line arguments
		const parseResult = parser.parse(args);

		if (parseResult.error) {
			console.error(parser.formatError(parseResult.error));
			process.exit(parseResult.error.exitCode);
		}

		const options = parseResult.options;
		if (!options) {
			console.error("Failed to parse command options");
			process.exit(1);
		}

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
			let errorCode = "INVALID_OPTIONS";
			const errorMessage = validation.errors.join(", ");

			// Check if it's a file type validation error
			if (errorMessage.includes(".ts or .tsx extension")) {
				errorCode = "INVALID_FILE_TYPE";
			}

			outputError(
				{
					code: errorCode,
					message: errorMessage,
				},
				mergedOptions.format,
			);
			process.exit(1);
		}

		// Use CLI adapter for validation and analysis
		// At this point, validation ensures file is defined
		if (!mergedOptions.file) {
			throw new Error("File path is required after validation");
		}
		const cliOptions = {
			file: mergedOptions.file,
			format: mergedOptions.format,
			includeSources: mergedOptions.includeSources,
			parseTimeout: mergedOptions.parseTimeout,
			useIntegrated: mergedOptions.useIntegrated,
			optimizeOutput: mergedOptions.optimizeOutput,
		};

		// Validate using adapter
		const cliValidation = await cliAdapter.validateOptions(cliOptions);
		if (!cliValidation.isValid) {
			let errorCode = "UNKNOWN_ERROR";
			const errorMessage = cliValidation.errors.join(", ");

			if (
				errorMessage.includes("not found") ||
				errorMessage.includes("does not exist") ||
				errorMessage.includes("no such file")
			) {
				errorCode = "FILE_NOT_FOUND";
			} else if (
				errorMessage.includes("not a TypeScript") ||
				errorMessage.includes("Invalid file type") ||
				errorMessage.includes("TypeScript")
			) {
				errorCode = "INVALID_FILE_TYPE";
			}

			outputError(
				{
					code: errorCode,
					message: errorMessage,
				},
				mergedOptions.format,
			);
			process.exit(1);
		}

		// Perform analysis using adapter (integrated or traditional)
		if (cliOptions.useIntegrated) {
			// Use integrated analysis flow
			const integratedData = await cliAdapter.analyzeFileIntegrated(cliOptions);

			// Format and output result using integrated formatter
			const header = cliAdapter.getFormatHeader(mergedOptions.format);
			if (header) {
				console.log(header);
			}

			const output = cliAdapter.formatIntegratedResult(
				integratedData,
				mergedOptions.format,
			);
			console.log(output);

			// Exit with appropriate code based on overall status
			const hasErrors = integratedData.core.status.overall === "error";
			process.exit(hasErrors ? 1 : 0);
		} else {
			// Use traditional analysis flow
			const result = await cliAdapter.analyzeFile(cliOptions);

			// Format and output result using adapter
			const header = cliAdapter.getFormatHeader(mergedOptions.format);
			if (header) {
				console.log(header);
			}

			const output = cliAdapter.formatResult(result, mergedOptions.format);
			console.log(output);

			// Exit with appropriate code
			process.exit(isSuccessful(result) ? 0 : 1);
		}
	} catch (error) {
		console.error(
			"Unexpected error:",
			error instanceof Error ? error.message : String(error),
		);

		if (process.env.DEBUG) {
			console.error(
				"Stack trace:",
				error instanceof Error ? error.stack : "No stack trace available",
			);
		}

		process.exit(1);
	} finally {
		// Clean up adapter resources
		cliAdapter.dispose();
	}
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
	console.error("Uncaught exception:", error.message);
	if (process.env.DEBUG) {
		console.error(error.stack);
	}
	process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
	console.error("Unhandled rejection at:", promise, "reason:", reason);
	process.exit(1);
});

// Handle SIGINT (Ctrl+C) gracefully
process.on("SIGINT", () => {
	console.log("\nReceived SIGINT. Exiting gracefully...");
	process.exit(0);
});

// Handle SIGTERM gracefully
process.on("SIGTERM", () => {
	console.log("\nReceived SIGTERM. Exiting gracefully...");
	process.exit(0);
});

// Run the main function
if (require.main === module) {
	main().catch((error) => {
		console.error(
			"Fatal error:",
			error instanceof Error ? error.message : String(error),
		);
		process.exit(1);
	});
}
