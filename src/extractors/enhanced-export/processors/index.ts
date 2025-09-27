// Base processor interface and implementation

export { ClassProcessor } from "./ClassProcessor";
export { DefaultProcessor } from "./DefaultProcessor";

// Specific processors
export { FunctionProcessor } from "./FunctionProcessor";
export type { ProcessingContext } from "./NodeProcessor";
export { BaseNodeProcessor, NodeProcessor } from "./NodeProcessor";
export { TypeProcessor } from "./TypeProcessor";
export { VariableProcessor } from "./VariableProcessor";
