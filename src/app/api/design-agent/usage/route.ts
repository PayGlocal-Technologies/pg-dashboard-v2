/**
 * GET /api/design-agent/usage — Option B: surface Claude Code's own `/usage`.
 *
 * There is no public API to read subscription quota/reset programmatically, so we
 * drive Claude Code's interactive `/usage` view through a pseudo-terminal and
 * return its (ANSI-stripped) text. If node-pty isn't available, we fall back to
 * pointing the designer at their account usage page. See IMPLEMENTATION §8.
 */
import { agentEnv, claudeBin } from "@/lib/design-agent/claudeCli";
import { isDevAgentEnabled } from "@/lib/design-agent/guards";
import type { AgentUsageResult } from "@/lib/design-agent/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCOUNT_USAGE_URL = "https://claude.ai/settings/usage";

// Strip CSI (ESC [ … final-byte) and OSC (ESC ] … BEL) terminal escape sequences.
const ANSI = new RegExp("\\u001b\\[[0-9;?]*[ -/]*[@-~]|\\u001b\\][^\\u0007]*\\u0007", "g");

function fallback(): Response {
  return Response.json({ kind: "fallback", accountUrl: ACCOUNT_USAGE_URL } satisfies AgentUsageResult);
}

export async function GET(): Promise<Response> {
  if (!isDevAgentEnabled()) return new Response(null, { status: 404 });

  // node-pty is an optional native devDependency; import loosely so a missing or
  // unbuilt module degrades to the fallback instead of breaking the build.
  let pty: { spawn: (file: string, args: string[], opts: Record<string, unknown>) => PtyProcess };
  try {
    // Indirect specifier: keeps TS from resolving the optional native module at
    // compile time, so the build doesn't depend on node-pty being installed.
    const moduleName = "node-pty";
    pty = (await import(moduleName)) as unknown as typeof pty;
  } catch {
    return fallback();
  }

  try {
    return Response.json({ kind: "view", text: await captureUsage(pty) } satisfies AgentUsageResult);
  } catch {
    return fallback();
  }
}

interface PtyProcess {
  onData: (cb: (d: string) => void) => void;
  onExit: (cb: () => void) => void;
  write: (data: string) => void;
  kill: () => void;
}

function captureUsage(pty: {
  spawn: (file: string, args: string[], opts: Record<string, unknown>) => PtyProcess;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const term = pty.spawn(claudeBin(), [], {
      name: "xterm-color",
      cols: 100,
      rows: 40,
      cwd: process.cwd(),
      env: agentEnv(),
    });

    let buf = "";
    term.onData((d) => (buf += d));

    // Let the TUI boot, send /usage, let it render, then exit.
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => term.write("/usage\r"), 1200));
    timers.push(
      setTimeout(() => {
        try {
          term.kill();
        } catch {
          /* noop */
        }
        const clean = buf.replace(ANSI, "").replace(/\r/g, "").trim();
        if (clean) resolve(clean);
        else reject(new Error("empty"));
      }, 4000),
    );

    term.onExit(() => timers.forEach(clearTimeout));
  });
}
