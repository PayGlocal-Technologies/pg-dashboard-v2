/**
 * Shared types for the dev-only Design Agent. Imported by both the server route
 * handlers and the client overlay, so it must stay free of any Node-only imports.
 */

/** Model aliases offered in the picker. Hardcoded — the CLI/SDK won't enumerate
 *  plan-allowed models (see DESIGN-AGENT-IMPLEMENTATION.md §9). */
export type AgentModel = "sonnet" | "opus" | "haiku";

export interface AgentModelOption {
  value: AgentModel;
  label: string;
  hint: string;
}

export const AGENT_MODELS: AgentModelOption[] = [
  { value: "sonnet", label: "Sonnet 4.6", hint: "Fast, strong default" },
  { value: "opus", label: "Opus 4.8", hint: "Hardest screens" },
  { value: "haiku", label: "Haiku 4.5", hint: "Cheap iterations" },
];

export const DEFAULT_MODEL: AgentModel = "sonnet";

/** Request body for POST /api/design-agent (a single chat turn). */
export interface AgentChatRequest {
  prompt: string;
  model?: AgentModel;
  /** Resume an existing Claude session (multi-turn continuity + credit-resume). */
  sessionId?: string;
  /** Server-side temp path for an image attachment, created by POST /upload. */
  imagePath?: string;
  /** Client-side conversation ID — used to reconnect to an in-progress session after page reload. */
  conversationId?: string;
  /** Current Next.js pathname (e.g. "/transactions") — used to inject page-specific file context. */
  currentRoute?: string;
}

/** A coalesced snapshot block used in the `resume` event. */
export type SnapshotBlock =
  | { type: "text"; text: string }
  | { type: "tool"; summary: string };

/**
 * Events the chat route streams to the client over SSE. A thin, UI-friendly
 * projection of Claude Code's `stream-json` output — we do not leak raw tool
 * internals or any secret material.
 */
export type AgentEvent =
  | { type: "session"; sessionId: string }
  | { type: "text"; delta: string }
  | { type: "tool"; name: string; summary: string }
  | { type: "usage"; inputTokens: number; outputTokens: number; costUsd: number }
  | { type: "done"; sessionId: string; costUsd: number }
  /** Sent as the first event on reconnect — restores the in-progress assistant turn. */
  | { type: "resume"; claudeSessionId?: string; blocks: SnapshotBlock[] }
  /** Terminal: the designer's monthly Agent credits are exhausted. The same
   *  sessionId can be resumed once credits refill — no work is lost. */
  | { type: "credits_exhausted"; sessionId?: string; message: string }
  | { type: "error"; message: string };

/** GET /api/design-agent/auth */
export interface AgentAuthStatus {
  loggedIn: boolean;
  account?: string;
  plan?: string;
}

/** GET /api/design-agent/usage (Option B — surfaced from Claude Code's /usage). */
export interface AgentUsageResult {
  /** "view" = captured /usage text; "fallback" = node-pty unavailable, link out. */
  kind: "view" | "fallback";
  text?: string;
  accountUrl?: string;
}

/** POST /api/design-agent/publish */
export interface AgentPublishRequest {
  feature: string;
  summary: string;
}
export interface AgentPublishResult {
  branch: string;
  prUrl?: string;
  pushed: boolean;
  message: string;
}
