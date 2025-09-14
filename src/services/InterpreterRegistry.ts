/**
 * InterpreterRegistry service implementation
 * Manages registration and execution of data interpretation plugins
 */

import type {
	IDataInterpreter,
	InterpretationOptions,
} from "../interpreters/IDataInterpreter";

export interface IInterpreterRegistry {
	/**
	 * Registers a data interpreter
	 */
	register<TInput, TOutput>(
		name: string,
		interpreter: IDataInterpreter<TInput, TOutput>,
	): void;

	/**
	 * Unregisters a data interpreter
	 */
	unregister(name: string): boolean;

	/**
	 * Gets a registered interpreter
	 */
	getInterpreter<TInput, TOutput>(
		name: string,
	): IDataInterpreter<TInput, TOutput> | undefined;

	/**
	 * Gets all registered interpreters
	 */
	getAllInterpreters(): Map<string, IDataInterpreter<any, any>>;

	/**
	 * Gets interpreters that support specific input/output types
	 */
	getInterpretersForType(
		inputType: string,
		outputType?: string,
	): IDataInterpreter<any, any>[];

	/**
	 * Executes all applicable interpreters on extracted data
	 */
	executeAll(
		extractedData: Record<string, any>,
		context: any,
		options?: InterpretationOptions,
	): Record<string, any>;

	/**
	 * Executes specific interpreters
	 */
	executeSelected(
		interpreterNames: string[],
		extractedData: Record<string, any>,
		context: any,
		options?: InterpretationOptions,
	): Record<string, any>;

	/**
	 * Gets interpretation pipeline for data flow
	 */
	getPipeline(dataTypes: string[]): IDataInterpreter<any, any>[];

	/**
	 * Clears all registered interpreters
	 */
	clear(): void;
}

export class InterpreterRegistry implements IInterpreterRegistry {
	private interpreters: Map<string, IDataInterpreter<any, any>> = new Map();

	/**
	 * Registers a data interpreter
	 */
	register<TInput, TOutput>(
		name: string,
		interpreter: IDataInterpreter<TInput, TOutput>,
	): void {
		if (this.interpreters.has(name)) {
			console.warn(`Interpreter '${name}' is already registered. Overwriting.`);
		}
		this.interpreters.set(name, interpreter);
	}

	/**
	 * Unregisters a data interpreter
	 */
	unregister(name: string): boolean {
		const interpreter = this.interpreters.get(name);
		if (interpreter) {
			interpreter.dispose();
			return this.interpreters.delete(name);
		}
		return false;
	}

	/**
	 * Gets a registered interpreter
	 */
	getInterpreter<TInput, TOutput>(
		name: string,
	): IDataInterpreter<TInput, TOutput> | undefined {
		return this.interpreters.get(name) as
			| IDataInterpreter<TInput, TOutput>
			| undefined;
	}

	/**
	 * Gets all registered interpreters
	 */
	getAllInterpreters(): Map<string, IDataInterpreter<any, any>> {
		return new Map(this.interpreters);
	}

	/**
	 * Gets interpreters that support specific input/output types
	 */
	getInterpretersForType(
		inputType: string,
		outputType?: string,
	): IDataInterpreter<any, any>[] {
		return Array.from(this.interpreters.values()).filter((interpreter) => {
			const metadata = interpreter.getMetadata();
			const supportsInput =
				metadata.supportedInputTypes?.includes(inputType) ?? false;
			const supportsOutput = outputType
				? (metadata.supportedOutputTypes?.includes(outputType) ?? false)
				: true;
			return supportsInput && supportsOutput;
		});
	}

	/**
	 * Executes all applicable interpreters on extracted data
	 */
	executeAll(
		extractedData: Record<string, any>,
		context: any,
		options?: InterpretationOptions,
	): Record<string, any> {
		const results: Record<string, any> = {};

		for (const [name, interpreter] of this.interpreters) {
			try {
				// Check if interpreter can process any of the available data
				const metadata = interpreter.getMetadata();
				const availableDataTypes = Object.keys(extractedData);
				const canProcess = metadata.supportedInputTypes?.some((type) =>
					availableDataTypes.includes(type),
				);

				if (canProcess) {
					const result = interpreter.interpret(extractedData, context);
					const validation = interpreter.validateOutput?.(result) ?? {
						isValid: true,
						errors: [],
					};

					if (validation.isValid) {
						results[name] = result;
					} else {
						console.warn(
							`Interpreter '${name}' produced invalid output:`,
							validation.errors,
						);
						results[name] = null;
					}
				}
			} catch (error) {
				console.error(`Error executing interpreter '${name}':`, error);
				results[name] = null;
			}
		}

		return results;
	}

	/**
	 * Executes specific interpreters
	 */
	executeSelected(
		interpreterNames: string[],
		extractedData: Record<string, any>,
		context: any,
		options?: InterpretationOptions,
	): Record<string, any> {
		const results: Record<string, any> = {};

		for (const name of interpreterNames) {
			const interpreter = this.interpreters.get(name);
			if (!interpreter) {
				console.warn(`Interpreter '${name}' not found`);
				results[name] = null;
				continue;
			}

			try {
				const result = interpreter.interpret(extractedData, context);
				const validation = interpreter.validateOutput?.(result) ?? {
					isValid: true,
					errors: [],
				};

				if (validation.isValid) {
					results[name] = result;
				} else {
					console.warn(
						`Interpreter '${name}' produced invalid output:`,
						validation.errors,
					);
					results[name] = null;
				}
			} catch (error) {
				console.error(`Error executing interpreter '${name}':`, error);
				results[name] = null;
			}
		}

		return results;
	}

	/**
	 * Gets interpretation pipeline for data flow
	 */
	getPipeline(dataTypes: string[]): IDataInterpreter<any, any>[] {
		const pipeline: IDataInterpreter<any, any>[] = [];
		const processedTypes = new Set<string>();

		// Build pipeline based on data type dependencies
		for (const dataType of dataTypes) {
			if (processedTypes.has(dataType)) continue;

			const interpreters = this.getInterpretersForType(dataType);
			for (const interpreter of interpreters) {
				const metadata = interpreter.getMetadata();

				// Check dependencies are satisfied
				const dependenciesSatisfied = metadata.dependencies.every((dep) =>
					processedTypes.has(dep),
				);

				if (dependenciesSatisfied) {
					pipeline.push(interpreter);
					metadata.supportedOutputTypes?.forEach((type) =>
						processedTypes.add(type),
					);
				}
			}
		}

		return pipeline;
	}

	/**
	 * Clears all registered interpreters
	 */
	clear(): void {
		// Dispose of all interpreters first
		for (const interpreter of this.interpreters.values()) {
			interpreter.dispose();
		}
		this.interpreters.clear();
	}
}
