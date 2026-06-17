/**
 * Design Agent SSE route — dev-only.
 *
 * POST /api/design-agent  — start a new chat turn; streams events while
 *   the Claude Code CLI runs.
 *
 * GET  /api/design-agent  — reconnect to an in-progress turn after a
 *   page reload. Returns 404 if no active session exists for the given
 *   conversationId (fall back to manual "Continue").
 *
 * Resilience strategy for long sessions (5–20 min, many file edits):
 *   • The CLI process is NOT killed when the SSE client disconnects.
 *   • A global session registry (keyed by conversationId) survives
 *     Next.js module hot-reloads via `global.__designAgentSessions`.
 *   • On reconnect the server sends a `resume` event with the coalesced
 *     state so far (tool summaries + accumulated text), then live events
 *     continue streaming into the new controller.
 */
import { readFile, unlink } from "node:fs/promises";
import { extname } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { agentEnv, buildChatArgs, claudeBin } from "@/lib/design-agent/claudeCli";
import { isCreditExhaustion, isDevAgentEnabled } from "@/lib/design-agent/guards";
import { systemAppend } from "@/lib/design-agent/prompt";
import { buildRouteContext } from "@/lib/design-agent/routeContext";
import { setSessionId } from "@/lib/design-agent/sessionStore";
import {
  DEFAULT_MODEL,
  type AgentChatRequest,
  type AgentEvent,
  type SnapshotBlock,
} from "@/lib/design-agent/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Global session registry — survives Next.js module hot-reloads in dev.
// ---------------------------------------------------------------------------

interface ActiveSession {
  /** Spawned Claude CLI process — set once inside the ReadableStream start callback. */
  child?: ChildProcess;
  /** All live SSE controllers subscribed to this session. */
  controllers: Set<ReadableStreamDefaultController<Uint8Array>>;
  /** Coalesced ordered blocks (text + tool) for reconnect replay. */
  snapshot: SnapshotBlock[];
  claudeSessionId?: string;
  costUsd: number;
  done: boolean;
  encoder: TextEncoder;
}

declare global {
  var __designAgentSessions: Map<string, ActiveSession> | undefined;
}

const activeSessions: Map<string, ActiveSession> =
  global.__designAgentSessions ?? (global.__designAgentSessions = new Map());

function broadcastEncoded(session: ActiveSession, encoded: Uint8Array): void {
  for (const ctrl of session.controllers) {
    try {
      ctrl.enqueue(encoded);
    } catch {
      session.controllers.delete(ctrl);
    }
  }
}

function broadcastEvent(session: ActiveSession, event: AgentEvent): void {
  // Keep the snapshot up-to-date for reconnect replay.
  if (event.type === "text") {
    const last = session.snapshot[session.snapshot.length - 1];
    if (last?.type === "text") {
      last.text += event.delta; // mutate-in-place: snapshot is server-only
    } else {
      session.snapshot.push({ type: "text", text: event.delta });
    }
  } else if (event.type === "tool") {
    const last = session.snapshot[session.snapshot.length - 1];
    if (!(last?.type === "tool" && last.summary === event.summary)) {
      session.snapshot.push({ type: "tool", summary: event.summary });
    }
  } else if (event.type === "session") {
    session.claudeSessionId = event.sessionId;
  } else if (event.type === "done") {
    if (event.sessionId) session.claudeSessionId = event.sessionId;
    session.costUsd = event.costUsd;
  }

  broadcastEncoded(session, session.encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
} as const;

// ---------------------------------------------------------------------------
// GET — reconnect to an in-progress session after page reload.
// ---------------------------------------------------------------------------

export async function GET(req: Request): Promise<Response> {
  if (!isDevAgentEnabled()) return new Response(null, { status: 404 });

  const url = new URL(req.url);
  const convId = url.searchParams.get("conversationId");
  if (!convId) return new Response("Missing conversationId", { status: 400 });

  const session = activeSessions.get(convId);
  if (!session) return new Response("No active session", { status: 404 });

  const { encoder } = session;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Send a coalesced state snapshot so the client can restore the turn.
      const resumeEvent: AgentEvent = {
        type: "resume",
        claudeSessionId: session.claudeSessionId,
        blocks: session.snapshot,
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(resumeEvent)}\n\n`));

      if (session.done) {
        // Session already finished before we reconnected — replay the done event.
        const doneEvent: AgentEvent = {
          type: "done",
          sessionId: session.claudeSessionId ?? "",
          costUsd: session.costUsd,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(doneEvent)}\n\n`));
        controller.close();
        return;
      }

      // Subscribe to future events.
      session.controllers.add(controller);

      // On disconnect: unsubscribe but do NOT kill the child.
      req.signal.addEventListener("abort", () => {
        session.controllers.delete(controller);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

// ---------------------------------------------------------------------------
// POST — start a new chat turn.
// ---------------------------------------------------------------------------

export async function POST(req: Request): Promise<Response> {
  if (!isDevAgentEnabled()) return new Response(null, { status: 404 });

  let body: AgentChatRequest;
  try {
    body = (await req.json()) as AgentChatRequest;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const prompt = (body.prompt ?? "").trim();
  const imagePath = body.imagePath;
  if (!prompt && !imagePath) return new Response("Empty prompt", { status: 400 });

  // Base64-encode the image before entering the ReadableStream constructor.
  let imageBase64: string | undefined;
  let imageMimeType: string | undefined;
  if (imagePath) {
    const buf = await readFile(imagePath);
    imageBase64 = buf.toString("base64");
    const ext = extname(imagePath).toLowerCase();
    imageMimeType =
      ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".png"
          ? "image/png"
          : ext === ".gif"
            ? "image/gif"
            : "image/webp";
  }

  const sessionId = body.sessionId;
  const convId = body.conversationId;

  // Prepend page-level file context so Claude knows which files to look at
  // without spending tool calls exploring the filesystem.
  const routeCtx = body.currentRoute
    ? await buildRouteContext(body.currentRoute, process.cwd())
    : "";
  const fullPrompt = routeCtx ? `${routeCtx}\n\n---\n\n${prompt}` : prompt;

  // If there's already a running session for this conversation, kill it before
  // starting a new turn (prevents zombie processes from a previous turn that
  // somehow wasn't cleaned up).
  if (convId) {
    const old = activeSessions.get(convId);
    if (old && !old.done) {
      old.child?.kill("SIGTERM");
      for (const ctrl of old.controllers) {
        try {
          ctrl.close();
        } catch {
          /* ignore */
        }
      }
      activeSessions.delete(convId);
    }
  }

  const { args, stdinData } = buildChatArgs({
    prompt: fullPrompt,
    model: body.model ?? DEFAULT_MODEL,
    systemAppend: systemAppend(),
    sessionId,
    imageBase64,
    imageMimeType,
  });

  const encoder = new TextEncoder();
  const session: ActiveSession = {
    controllers: new Set(),
    snapshot: [],
    claudeSessionId: sessionId,
    costUsd: 0,
    done: false,
    encoder,
  };
  if (convId) activeSessions.set(convId, session);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      session.controllers.add(controller);

      const child = spawn(claudeBin(), args, { cwd: process.cwd(), env: agentEnv() });
      session.child = child;

      if (stdinData) {
        child.stdin.write(stdinData, "utf8");
        child.stdin.end();
      }

      let stdoutBuf = "";
      let stderrBuf = "";
      let activeSessionId = sessionId;
      let lastCost = 0;
      let finished = false;
      const finishedBlocks = new Set<number>();

      const finish = () => {
        if (finished) return;
        finished = true;
        session.done = true;
        if (convId) {
          // Keep the session entry briefly so a reconnecting client can see
          // the done event, then clean up after 60 s.
          setTimeout(() => activeSessions.delete(convId), 60_000);
        }
        if (imagePath)
          unlink(imagePath).catch(() => {
            /* ignore */
          });
        // Close all remaining controllers.
        for (const ctrl of session.controllers) {
          try {
            ctrl.close();
          } catch {
            /* already closed */
          }
        }
        session.controllers.clear();
      };

      // On client disconnect: unsubscribe but do NOT kill the child.
      // The CLI keeps running so file edits complete through hot reloads.
      req.signal.addEventListener("abort", () => {
        session.controllers.delete(controller);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
        // Child continues running — reconnect via GET /api/design-agent.
      });

      const handleLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(trimmed) as Record<string, unknown>;
        } catch {
          return;
        }

        const type = msg.type as string | undefined;

        if (type === "system" && msg.subtype === "init" && typeof msg.session_id === "string") {
          activeSessionId = msg.session_id;
          setSessionId(activeSessionId);
          broadcastEvent(session, { type: "session", sessionId: activeSessionId });
          return;
        }

        if (type === "stream_event") {
          const ev = msg.event as
            | {
                type?: string;
                index?: number;
                delta?: { type?: string; text?: string };
                content_block?: { type?: string; name?: string };
              }
            | undefined;
          const blockIdx = ev?.index ?? -1;

          if (ev?.type === "message_start") {
            finishedBlocks.clear();
          } else if (ev?.type === "content_block_stop") {
            if (blockIdx >= 0) finishedBlocks.add(blockIdx);
          } else if (
            ev?.type === "content_block_delta" &&
            !finishedBlocks.has(blockIdx) &&
            ev.delta?.type === "text_delta" &&
            ev.delta.text
          ) {
            broadcastEvent(session, { type: "text", delta: ev.delta.text });
          } else if (
            ev?.type === "content_block_start" &&
            !finishedBlocks.has(blockIdx) &&
            ev.content_block?.type === "tool_use"
          ) {
            const name = ev.content_block.name ?? "tool";
            broadcastEvent(session, { type: "tool", name, summary: toolSummary(name) });
          }
          return;
        }

        if (type === "result") {
          const usage = msg.usage as { input_tokens?: number; output_tokens?: number } | undefined;
          lastCost = (msg.total_cost_usd as number) ?? lastCost;
          if (usage) {
            broadcastEvent(session, {
              type: "usage",
              inputTokens: usage.input_tokens ?? 0,
              outputTokens: usage.output_tokens ?? 0,
              costUsd: lastCost,
            });
          }
          if (typeof msg.session_id === "string") {
            activeSessionId = msg.session_id;
            setSessionId(activeSessionId);
          }
          const resultText = typeof msg.result === "string" ? msg.result : "";
          if (msg.is_error && isCreditExhaustion(resultText)) {
            broadcastEvent(session, {
              type: "credits_exhausted",
              sessionId: activeSessionId,
              message: resultText,
            });
          }
          return;
        }
      };

      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdoutBuf += chunk;
        let nl: number;
        while ((nl = stdoutBuf.indexOf("\n")) !== -1) {
          const line = stdoutBuf.slice(0, nl);
          stdoutBuf = stdoutBuf.slice(nl + 1);
          handleLine(line);
        }
      });

      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk: string) => {
        stderrBuf += chunk;
      });

      child.on("error", (err) => {
        broadcastEvent(session, {
          type: "error",
          message: `Could not start Claude Code. Is it installed and are you logged in? (${err.message})`,
        });
        finish();
      });

      child.on("close", (code) => {
        if (stdoutBuf.trim()) handleLine(stdoutBuf);
        if (code !== 0 && !finished) {
          if (isCreditExhaustion(stderrBuf)) {
            broadcastEvent(session, {
              type: "credits_exhausted",
              sessionId: activeSessionId,
              message: stderrBuf.trim(),
            });
          } else {
            broadcastEvent(session, {
              type: "error",
              message: stderrBuf.trim() || `Agent exited with code ${code}.`,
            });
          }
        } else if (!finished) {
          broadcastEvent(session, {
            type: "done",
            sessionId: activeSessionId ?? "",
            costUsd: lastCost,
          });
        }
        finish();
      });
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

/** Short, designer-friendly label for a tool the agent is using. */
function toolSummary(name: string): string {
  switch (name) {
    case "Read":
    case "Glob":
    case "Grep":
      return "Looking through the code…";
    case "Edit":
    case "Write":
      return "Updating the UI…";
    case "Bash":
      return "Running a check…";
    default:
      return "Working…";
  }
}
