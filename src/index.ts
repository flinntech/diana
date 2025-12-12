/**
 * DIANA - Digital Intelligence And Neural Architecture
 *
 * Main entry point
 */

// Obsidian integration (001-obsidian-integration)
export * from './obsidian/index.js';

// Configuration
export { config, createConfig, obsidianConfig, ollamaConfig } from './config/diana.config.js';
export type { DianaConfig } from './config/diana.config.js';

// LLM client (002-llm-agent-core)
export * from './llm/index.js';

// Agent module (002-llm-agent-core)
export * from './agent/index.js';

// Types
export * from './types/agent.js';

// Proposals module (003-file-watcher-proposals)
// Note: Selectively export to avoid conflicts with obsidian types
export {
  ProposalStore,
  createProposalStore,
  serializeProposal,
  deserializeProposal,
  ProposalService,
  createProposalService,
} from './proposals/index.js';
export type {
  Proposal,
  ProposalAction,
  FileCategory,
  ApproveResult,
  RejectResult,
  BatchApproveResult,
  ProposalSummary,
  ProposalServiceEvents,
  SerializedProposal,
  StoreData,
} from './proposals/index.js';
// Re-export with aliases to avoid conflict
export type {
  ProposalStatus as FileProposalStatus,
  ConfidenceLevel as FileConfidenceLevel,
} from './proposals/index.js';

// Watcher module (003-file-watcher-proposals)
export * from './watcher/index.js';
export * from './types/watcher.js';
