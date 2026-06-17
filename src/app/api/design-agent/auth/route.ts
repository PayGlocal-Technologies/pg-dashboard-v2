/**
 * Design Agent auth — subscription login, NO API key.
 *
 *   GET  → { loggedIn, account?, plan? }   (best-effort status from ~/.claude.json)
 *   POST { action: "login" | "logout" }
 *
 * Login opens a real Terminal window running `claude login`, which launches the
 * browser OAuth flow and stores credentials in the macOS Keychain. The client
 * then polls GET until `loggedIn` flips true. See IMPLEMENTATION §7 (and §15 #1
 * for the validation note on detecting status programmatically).
 */
import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { agentEnv, claudeBin } from "@/lib/design-agent/claudeCli";
import { isDevAgentEnabled } from "@/lib/design-agent/guards";
import type { AgentAuthStatus } from "@/lib/design-agent/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readStatus(): AgentAuthStatus {
  try {
    const cfgPath = join(homedir(), ".claude.json");
    if (!existsSync(cfgPath)) return { loggedIn: false };
    const cfg = JSON.parse(readFileSync(cfgPath, "utf8")) as {
      oauthAccount?: { emailAddress?: string; organizationName?: string };
      subscriptionType?: string;
    };
    const acct = cfg.oauthAccount;
    if (!acct?.emailAddress) return { loggedIn: false };
    return {
      loggedIn: true,
      account: acct.emailAddress,
      plan: cfg.subscriptionType ?? acct.organizationName,
    };
  } catch {
    return { loggedIn: false };
  }
}

export async function GET(): Promise<Response> {
  if (!isDevAgentEnabled()) return new Response(null, { status: 404 });
  return Response.json(readStatus());
}

export async function POST(req: Request): Promise<Response> {
  if (!isDevAgentEnabled()) return new Response(null, { status: 404 });

  let action = "";
  try {
    ({ action } = (await req.json()) as { action: string });
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (action === "login") {
    // Open Terminal and run `claude login` there so the designer gets a real TTY
    // + browser OAuth. We do not block on completion; the client polls GET.
    const cmd = `cd ${JSON.stringify(process.cwd())} && ${JSON.stringify(claudeBin())} login`;
    const script = `tell application "Terminal" to do script ${JSON.stringify(cmd)}\ntell application "Terminal" to activate`;
    execFile("osascript", ["-e", script], () => {});
    return Response.json({ started: true });
  }

  if (action === "logout") {
    await new Promise<void>((resolve) =>
      execFile(claudeBin(), ["logout"], { env: agentEnv() }, () => resolve()),
    );
    return Response.json({ loggedIn: false });
  }

  return new Response("Unknown action", { status: 400 });
}
