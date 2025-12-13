/**
 * LegacyToolAgent - Wrapper for existing DIANA tools
 *
 * Feature: 004-agent-mcp-foundation
 * Date: 2025-12-12
 *
 * Wraps the existing ToolRegistry to work with the new agent architecture.
 * Provides backward compatibility while enabling unified tool management.
 */

import type { ToolResult } from '../types/agent.js';
import type { Agent, AgentManifest, ToolDefinition } from './types/agent.js';
import { ToolRegistry } from './tools.js';

/**
 * Agent that wraps the legacy ToolRegistry.
 * Per spec clarification Q44 - facade pattern for backward compatibility.
 */
export class LegacyToolAgent implements Agent {
  private readonly registry: ToolRegistry;
  private readonly agentId = 'legacy-tools';

  constructor(registry: ToolRegistry) {
    this.registry = registry;
  }

  /**
   * Initialize the agent.
   * No-op for legacy tools - they're already registered with the registry.
   */
  async initialize(): Promise<void> {
    // Legacy tools are already initialized when registered with ToolRegistry
    // Nothing to do here
  }

  /**
   * Execute a tool by delegating to the underlying ToolRegistry.
   */
  async execute(toolName: string, params: Record<string, unknown>): Promise<ToolResult> {
    // Check if tool exists
    if (!this.registry.has(toolName)) {
      return {
        success: false,
        error: `Tool '${toolName}' not found in legacy registry`,
      };
    }

    try {
      // Delegate to the underlying registry
      return await this.registry.execute(toolName, params);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Tool '${toolName}' execution failed: ${message}`,
      };
    }
  }

  /**
   * Shutdown the agent.
   * No-op for legacy tools - the registry has no cleanup requirements.
   */
  async shutdown(): Promise<void> {
    // ToolRegistry has no cleanup requirements
    // Nothing to do here
  }

  /**
   * Get the agent's manifest describing its capabilities.
   * Converts registry tool definitions to the new ToolDefinition format.
   */
  getManifest(): AgentManifest {
    const tools = this.convertToolDefinitions();

    return {
      id: this.agentId,
      name: 'Legacy Tools',
      tools,
      capabilities: this.inferCapabilities(tools),
      requiresApproval: false, // Legacy tools don't require approval by default
    };
  }

  /**
   * Convert Ollama tool definitions from registry to ToolDefinition format.
   */
  private convertToolDefinitions(): ToolDefinition[] {
    const ollamaTools = this.registry.getToolDefinitions();

    return ollamaTools.map((ollamaTool) => ({
      name: ollamaTool.function.name,
      description: ollamaTool.function.description,
      parameters: ollamaTool.function.parameters,
    }));
  }

  /**
   * Infer capabilities from tool names.
   */
  private inferCapabilities(tools: ToolDefinition[]): string[] {
    const capabilities = new Set<string>(['legacy']);

    for (const tool of tools) {
      const name = tool.name.toLowerCase();

      if (name.includes('fact') || name.includes('memory')) {
        capabilities.add('memory');
      }
      if (name.includes('daily') || name.includes('note') || name.includes('obsidian') || name.includes('observation')) {
        capabilities.add('obsidian');
      }
      if (name.includes('write')) {
        capabilities.add('writing');
      }
      if (name.includes('read')) {
        capabilities.add('reading');
      }
    }

    return Array.from(capabilities);
  }
}
