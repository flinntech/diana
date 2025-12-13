/**
 * Agent Types - Core agent interface and manifest types
 *
 * Feature: 004-agent-mcp-foundation
 * Date: 2025-12-12
 *
 * These interfaces define the stable contracts for DIANA's agent system.
 * Per spec clarification Q42, only Agent interface and ToolResult are stable.
 */

import type { JSONSchema, ToolResult } from '../../types/agent.js';

// =============================================================================
// Agent Lifecycle States
// =============================================================================

/**
 * Agent lifecycle states.
 * Extensible string union for future additions (per spec Q39).
 */
export type AgentState = 'initialized' | 'running' | 'stopped';

// =============================================================================
// Tool Definition (Enhanced)
// =============================================================================

/**
 * Enhanced tool definition with optional metadata for richer LLM context.
 * Per spec clarification Q36.
 */
export interface ToolDefinition {
  /** Unique tool identifier (lowercase, underscores) */
  name: string;

  /** Human-readable description for LLM */
  description: string;

  /** JSON Schema for parameter validation */
  parameters: JSONSchema;

  /** Example invocations (optional, for LLM context) */
  examples?: string[];

  /** Category for grouping (optional) */
  category?: string;

  /** Whether this tool performs destructive actions */
  destructive?: boolean;
}

// =============================================================================
// Agent Manifest
// =============================================================================

/**
 * Agent manifest describing capabilities and tools.
 * Per spec clarification Q40 and constitution IX.b.
 */
export interface AgentManifest {
  /** Unique agent identifier */
  id: string;

  /** Human-readable display name */
  name: string;

  /** Tools this agent exposes */
  tools: ToolDefinition[];

  /** Routing hints for orchestrator (e.g., ["web-search", "file-ops"]) */
  capabilities: string[];

  /** If true, destructive operations require user approval */
  requiresApproval: boolean;

  /** Reserved for future multi-model support (optional) */
  modelRequirements?: string;
}

// =============================================================================
// Agent Interface (STABLE)
// =============================================================================

/**
 * Core Agent interface - STABLE per spec clarification Q42.
 *
 * All agents must implement this interface.
 * Per spec clarifications Q9-Q11:
 * - initialize() and shutdown() return Promise<void>, throw AgentError on failure
 * - execute() params are Record<string, unknown>
 * - execute() returns Promise<ToolResult>
 */
export interface Agent {
  /**
   * Initialize the agent.
   * Called once before any tool execution.
   * @throws AgentError with code AGENT_INIT_FAILED on failure
   */
  initialize(): Promise<void>;

  /**
   * Execute a tool by name with parameters.
   * @param toolName - Name of the tool to execute
   * @param params - Tool parameters (validated against JSON Schema)
   * @returns ToolResult with success/data or success=false/error
   */
  execute(toolName: string, params: Record<string, unknown>): Promise<ToolResult>;

  /**
   * Gracefully shut down the agent.
   * Release resources, close connections.
   * @throws AgentError with code AGENT_SHUTDOWN_FAILED on failure
   */
  shutdown(): Promise<void>;

  /**
   * Get the agent's manifest describing its capabilities.
   * Per spec clarification Q40.
   */
  getManifest(): AgentManifest;
}

/**
 * Factory function for creating agents.
 * Per spec clarification Q37 - factory pattern for registration.
 */
export type AgentFactory = () => Agent;
