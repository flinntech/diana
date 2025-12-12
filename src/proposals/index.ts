/**
 * Proposals Module
 *
 * Feature: 003-file-watcher-proposals
 * Date: 2025-12-11
 *
 * Module exports for the proposal management system.
 */

// Types
export type {
  Proposal,
  ProposalAction,
  ProposalStatus,
  ConfidenceLevel,
  FileCategory,
  ApproveResult,
  RejectResult,
  BatchApproveResult,
  ProposalSummary,
  ProposalServiceEvents,
} from './proposal.types.js';

// Store
export {
  ProposalStore,
  createProposalStore,
  serializeProposal,
  deserializeProposal,
  cleanExpiredCooldowns,
  cleanResolvedProposals,
} from './proposal.store.js';
export type { SerializedProposal, StoreData } from './proposal.store.js';

// Service
export { ProposalService, createProposalService } from './proposal.service.js';
