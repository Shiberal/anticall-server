/**
 * Federated Blocklist – Number + Type Federation
 *
 * Plan for a distributed blocklist where:
 * - Entries are phone numbers with associated block types
 * - Multiple instances federate (sync) blocklist data
 * - Types categorize the reason for blocking (spam, scam, telemarketer, etc.)
 */

// ─── Block entry types ───────────────────────────────────────────────────────

/** Canonical block reason / category */
export type BlockType =
  | "spam"
  | "scam"
  | "telemarketer"
  | "robocall"
  | "harassment"
  | "fraud"
  | "other";

/** Block tier: confidence level or special rule */
export type BlockTier =
  | "default"
  | "regional"       // block if call from outside user's region
  | "personal"       // user's personal blocklist (local to device on server)
  | "surely_spam"
  | "surely_scam"
  | "surely_telemarketer"
  | "surely_harassment";

/** Single blocklist entry: number + type */
export interface BlocklistEntry {
  /** E.164 or normalized phone number */
  number: string;
  /** Block reason/category */
  type: BlockType;
  /** Block tier (default, regional, or high-confidence) */
  tier?: BlockTier;
  /** Optional: when this entry was added */
  addedAt?: number;
  /** Optional: source instance ID */
  sourceId?: string;
  /** Optional: confidence or vote count for federated consensus */
  weight?: number;
}

// ─── Federation identity & discovery ────────────────────────────────────────

/** Unique identifier for a federated instance */
export type InstanceId = string;

/** Metadata about a federated instance */
export interface FederationInstance {
  id: InstanceId;
  /** Base URL for federation API */
  endpoint: string;
  /** Optional: public key for verification */
  publicKey?: string;
  /** Last successful sync timestamp */
  lastSyncAt?: number;
}

// ─── Federation sync payloads ───────────────────────────────────────────────

/** Request to pull blocklist entries from another instance */
export interface FederationPullRequest {
  /** Requester instance ID */
  from: InstanceId;
  /** Cursor for incremental sync (e.g. last seen timestamp) */
  since?: number;
  /** Optional: limit entries per request */
  limit?: number;
}

/** Response with blocklist entries for federation sync */
export interface FederationPullResponse {
  entries: BlocklistEntry[];
  /** Cursor for next page */
  nextCursor?: number;
  /** Whether more data is available */
  hasMore: boolean;
}

/** Push: announce new entries to federated instances */
export interface FederationPushPayload {
  /** Sender instance ID */
  from: InstanceId;
  entries: BlocklistEntry[];
  /** Timestamp of push */
  pushedAt: number;
}

// ─── Number–type aggregation (federated consensus) ───────────────────────────

/** Aggregated view: same number can have multiple types from different sources */
export interface AggregatedBlockEntry {
  number: string;
  /** Map of type → total weight from all federated sources */
  types: Partial<Record<BlockType, number>>;
  /** Combined weight for ranking */
  totalWeight: number;
  /** Source instance IDs that contributed */
  sources: InstanceId[];
}

/** Result of a lookup: is number blocked, and with what types? */
export interface BlockLookupResult {
  blocked: boolean;
  number: string;
  /** Types from federated sources (if blocked) */
  types?: BlockType[];
  /** Aggregated confidence */
  confidence?: number;
}
