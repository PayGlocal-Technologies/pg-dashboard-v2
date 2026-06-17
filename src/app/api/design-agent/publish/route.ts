/**
 * POST /api/design-agent/publish — "Request integration".
 *
 * Creates/uses a `design/<feature>` branch, commits the designer's work, pushes,
 * and opens a PR (via `gh` if available). This is the review gate: a designer's
 * "done" becomes a PR for an engineer to wire to the backend — it NEVER lands on
 * main directly. See IMPLEMENTATION §12.
 */
import { execFile } from "node:child_process";
import { isDevAgentEnabled } from "@/lib/design-agent/guards";
import type { AgentPublishRequest, AgentPublishResult } from "@/lib/design-agent/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROTECTED_BRANCHES = new Set(["main", "master", "develop", "production"]);

function run(cmd: string, args: string[]): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout: (stdout || "").trim(), stderr: (stderr || "").trim() });
    });
  });
}

/** "Payment Links" → "payment-links" */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function POST(req: Request): Promise<Response> {
  if (!isDevAgentEnabled()) return new Response(null, { status: 404 });

  let body: AgentPublishRequest;
  try {
    body = (await req.json()) as AgentPublishRequest;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const slug = slugify(body.feature || "");
  if (!slug) return new Response("A feature name is required", { status: 400 });

  const summary = (body.summary || `Design changes for ${body.feature}`).slice(0, 200);

  // Determine current branch; only create a design/ branch if we're on a
  // protected branch, so we never commit straight to main.
  const head = await run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  let branch = head.ok ? head.stdout : "";
  if (!branch || PROTECTED_BRANCHES.has(branch) || !branch.startsWith("design/")) {
    branch = `design/${slug}`;
    const co = await run("git", ["checkout", "-B", branch]);
    if (!co.ok) {
      return Response.json({
        branch,
        pushed: false,
        message: `Could not create branch: ${co.stderr}`,
      } satisfies AgentPublishResult);
    }
  }

  await run("git", ["add", "-A"]);
  const commit = await run("git", ["commit", "-m", `design: ${summary}`]);
  // A failed commit with "nothing to commit" is fine; otherwise surface it.
  if (!commit.ok && !/nothing to commit/i.test(commit.stdout + commit.stderr)) {
    return Response.json({
      branch,
      pushed: false,
      message: `Could not commit: ${commit.stderr || commit.stdout}`,
    } satisfies AgentPublishResult);
  }

  const push = await run("git", ["push", "-u", "origin", branch]);
  if (!push.ok) {
    return Response.json({
      branch,
      pushed: false,
      message:
        "Committed locally, but could not push. Ask engineering to check your Git access, then try again.",
    } satisfies AgentPublishResult);
  }

  // Open a PR if the GitHub CLI is available and authenticated; otherwise the
  // push is enough for engineering to pick up.
  const pr = await run("gh", [
    "pr",
    "create",
    "--base",
    "main",
    "--head",
    branch,
    "--title",
    `Design: ${body.feature}`,
    "--body",
    `${summary}\n\n_Submitted from the in-app Design Agent — for engineering integration._`,
  ]);

  const prUrl = pr.ok ? (pr.stdout.match(/https?:\/\/\S+/)?.[0] ?? undefined) : undefined;

  return Response.json({
    branch,
    prUrl,
    pushed: true,
    message: prUrl
      ? "Pushed and opened a PR for engineering review."
      : "Pushed your branch. Engineering can open the PR for review.",
  } satisfies AgentPublishResult);
}
