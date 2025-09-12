/**
 * Task Management System
 * Complete task management implementation based on specs/tasks.md
 */

// Error Handling
export * from "./errors";
// Interfaces
export * from "./interfaces";
// Services
export * from "./services";
export type { TaskAPIConfig, TaskCreationOptions } from "./TaskAPI";
// Main API
// Default export for convenience
export { createTaskAPI, TaskAPI, TaskAPI as default } from "./TaskAPI";
// Core Types
export * from "./types";
