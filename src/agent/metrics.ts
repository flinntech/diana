/**
 * Orchestrator Metrics - Observability metrics collection
 *
 * Feature: 004-agent-mcp-foundation
 * Date: 2025-12-12
 *
 * Per FR-016 - metrics for execution counts and latencies.
 */

import type { IOrchestratorMetrics, OrchestratorMetricsData } from './types/metrics.js';

/**
 * Default implementation of orchestrator metrics.
 * Collects tool execution counts, latencies, health checks, and errors.
 */
export class OrchestratorMetrics implements IOrchestratorMetrics {
  private toolExecutionCount: Map<string, number> = new Map();
  private toolLatencies: Map<string, number[]> = new Map();
  private agentHealthChecks: Map<string, number> = new Map();
  private errors: Map<string, number> = new Map();

  /** Maximum latency samples to keep per tool */
  private readonly maxLatencySamples: number;

  constructor(options: { maxLatencySamples?: number } = {}) {
    this.maxLatencySamples = options.maxLatencySamples ?? 100;
  }

  /**
   * Record a tool execution with its duration.
   */
  recordToolExecution(toolName: string, durationMs: number): void {
    // Increment execution count
    const currentCount = this.toolExecutionCount.get(toolName) ?? 0;
    this.toolExecutionCount.set(toolName, currentCount + 1);

    // Record latency sample
    let latencies = this.toolLatencies.get(toolName);
    if (!latencies) {
      latencies = [];
      this.toolLatencies.set(toolName, latencies);
    }
    latencies.push(durationMs);

    // Trim to max samples (keep most recent)
    if (latencies.length > this.maxLatencySamples) {
      latencies.shift();
    }
  }

  /**
   * Record an error by error code.
   */
  recordError(errorCode: string): void {
    const currentCount = this.errors.get(errorCode) ?? 0;
    this.errors.set(errorCode, currentCount + 1);
  }

  /**
   * Record a health check for an agent.
   */
  recordHealthCheck(agentId: string): void {
    const currentCount = this.agentHealthChecks.get(agentId) ?? 0;
    this.agentHealthChecks.set(agentId, currentCount + 1);
  }

  /**
   * Get a snapshot of current metrics.
   */
  getMetrics(): OrchestratorMetricsData {
    return {
      toolExecutionCount: new Map(this.toolExecutionCount),
      toolLatencies: new Map(
        Array.from(this.toolLatencies.entries()).map(([k, v]) => [k, [...v]])
      ),
      agentHealthChecks: new Map(this.agentHealthChecks),
      errors: new Map(this.errors),
    };
  }

  /**
   * Reset all metrics to initial state.
   */
  reset(): void {
    this.toolExecutionCount.clear();
    this.toolLatencies.clear();
    this.agentHealthChecks.clear();
    this.errors.clear();
  }

  /**
   * Get average latency for a tool.
   */
  getAverageLatency(toolName: string): number | null {
    const latencies = this.toolLatencies.get(toolName);
    if (!latencies || latencies.length === 0) {
      return null;
    }
    const sum = latencies.reduce((a, b) => a + b, 0);
    return sum / latencies.length;
  }

  /**
   * Get p95 latency for a tool.
   */
  getP95Latency(toolName: string): number | null {
    const latencies = this.toolLatencies.get(toolName);
    if (!latencies || latencies.length === 0) {
      return null;
    }
    const sorted = [...latencies].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[Math.min(index, sorted.length - 1)];
  }

  /**
   * Get total execution count for a tool.
   */
  getExecutionCount(toolName: string): number {
    return this.toolExecutionCount.get(toolName) ?? 0;
  }

  /**
   * Get total error count by code.
   */
  getErrorCount(errorCode: string): number {
    return this.errors.get(errorCode) ?? 0;
  }

  /**
   * Get summary statistics.
   */
  getSummary(): {
    totalExecutions: number;
    totalErrors: number;
    totalHealthChecks: number;
    uniqueTools: number;
  } {
    const totalExecutions = Array.from(this.toolExecutionCount.values()).reduce(
      (a, b) => a + b,
      0
    );
    const totalErrors = Array.from(this.errors.values()).reduce((a, b) => a + b, 0);
    const totalHealthChecks = Array.from(this.agentHealthChecks.values()).reduce(
      (a, b) => a + b,
      0
    );

    return {
      totalExecutions,
      totalErrors,
      totalHealthChecks,
      uniqueTools: this.toolExecutionCount.size,
    };
  }
}
