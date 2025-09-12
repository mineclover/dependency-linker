/**
 * Logger Utility
 * Simple logging configuration for the tree-sitter analyzer
 */

export enum LogLevel {
	ERROR = 0,
	WARN = 1,
	INFO = 2,
	DEBUG = 3,
}

export interface LogEntry {
	timestamp: Date;
	level: LogLevel;
	message: string;
	data?: any;
	component?: string;
}

export class Logger {
	private level: LogLevel;
	private component: string;

	constructor(
		component: string = "TreeSitterAnalyzer",
		level: LogLevel = LogLevel.INFO,
	) {
		this.component = component;
		this.level = this.getLogLevelFromEnv() ?? level;
	}

	/**
	 * Logs an error message
	 * @param message Error message
	 * @param data Optional error data
	 */
	error(message: string, data?: any): void {
		this.log(LogLevel.ERROR, message, data);
	}

	/**
	 * Logs a warning message
	 * @param message Warning message
	 * @param data Optional warning data
	 */
	warn(message: string, data?: any): void {
		this.log(LogLevel.WARN, message, data);
	}

	/**
	 * Logs an info message
	 * @param message Info message
	 * @param data Optional info data
	 */
	info(message: string, data?: any): void {
		this.log(LogLevel.INFO, message, data);
	}

	/**
	 * Logs a debug message
	 * @param message Debug message
	 * @param data Optional debug data
	 */
	debug(message: string, data?: any): void {
		this.log(LogLevel.DEBUG, message, data);
	}

	/**
	 * Logs a message at the specified level
	 * @param level Log level
	 * @param message Message to log
	 * @param data Optional data to include
	 */
	private log(level: LogLevel, message: string, data?: any): void {
		if (level > this.level) {
			return;
		}

		const entry: LogEntry = {
			timestamp: new Date(),
			level,
			message,
			data,
			component: this.component,
		};

		this.output(entry);
	}

	/**
	 * Outputs log entry to appropriate destination
	 * @param entry Log entry to output
	 */
	private output(entry: LogEntry): void {
		const timestamp = entry.timestamp.toISOString();
		const levelName = LogLevel[entry.level];
		const prefix = `[${timestamp}] [${levelName}] [${entry.component}]`;

		const message = `${prefix} ${entry.message}`;

		if (entry.level === LogLevel.ERROR) {
			console.error(message);
			if (entry.data) {
				console.error("Data:", entry.data);
			}
		} else if (entry.level === LogLevel.WARN) {
			console.warn(message);
			if (entry.data) {
				console.warn("Data:", entry.data);
			}
		} else {
			console.error(message); // Use stderr for all logging to avoid interfering with CLI JSON output
			if (entry.data && this.level >= LogLevel.DEBUG) {
				console.error("Data:", entry.data);
			}
		}
	}

	/**
	 * Gets log level from environment variable
	 * @returns LogLevel or undefined
	 */
	private getLogLevelFromEnv(): LogLevel | undefined {
		const envLevel = process.env.LOG_LEVEL?.toUpperCase();

		switch (envLevel) {
			case "ERROR":
				return LogLevel.ERROR;
			case "WARN":
			case "WARNING":
				return LogLevel.WARN;
			case "INFO":
				return LogLevel.INFO;
			case "DEBUG":
				return LogLevel.DEBUG;
			default:
				return undefined;
		}
	}

	/**
	 * Sets the log level
	 * @param level New log level
	 */
	setLevel(level: LogLevel): void {
		this.level = level;
	}

	/**
	 * Gets the current log level
	 * @returns Current log level
	 */
	getLevel(): LogLevel {
		return this.level;
	}

	/**
	 * Creates a child logger with a specific component name
	 * @param component Component name
	 * @returns New logger instance
	 */
	child(component: string): Logger {
		return new Logger(component, this.level);
	}
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Creates a logger for a specific component
 * @param component Component name
 * @returns Logger instance
 */
export function createLogger(component: string): Logger {
	return new Logger(component);
}
