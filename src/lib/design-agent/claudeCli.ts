/**
 * Locates the Claude Code CLI binary and builds the common argument set.
 * Server-only (uses node:path / node:fs).
 *
 * We drive the CLI (not the SDK) because the CLI honors the designer's Claude
 * SUBSCRIPTION login from `claude login` (stored in the macOS Keychain) — no API
 * key is ever required or handled. See DESIGN-AGENT-IMPLEMENTATION.md §6–7.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentModel } from "@/lib/design-agent/types";

let cachedBin: string | null = null;

/**
 * Resolve the `claude` binary. A `next dev` server launched from a GUI/IDE on
 * macOS does NOT inherit the shell's PATH, so a bare "claude" lookup throws
 * ENOENT even when Claude Code is installed. We therefore look in:
 *   1. CLAUDE_BIN override
 *   2. the local devDependency (node_modules/.bin/claude)
 *   3. well-known install locations (native installer, Homebrew, npm global)
 *   4. the user's login shell PATH (`command -v claude`) — covers nvm/asdf/etc.
 * Result is cached for the process.
 */
export function claudeBin(): string {
  if (cachedBin) return cachedBin;
  cachedBin = resolveClaudeBin();
  return cachedBin;
}

function resolveClaudeBin(): string {
  if (process.env.CLAUDE_BIN && existsSync(process.env.CLAUDE_BIN)) return process.env.CLAUDE_BIN;

  const local = join(process.cwd(), "node_modules", ".bin", "claude");
  if (existsSync(local)) return local;

  const home = homedir();
  const candidates = [
    join(home, ".claude", "local", "claude"), // native installer
    "/opt/homebrew/bin/claude", // Homebrew (Apple Silicon)
    "/usr/local/bin/claude", // Homebrew (Intel) / npm global
    join(home, ".local", "bin", "claude"),
    join(home, ".npm-global", "bin", "claude"),
  ];
  for (const c of candidates) if (existsSync(c)) return c;

  // Catch-all: ask the user's login shell where claude lives (resolves nvm, asdf,
  // and any custom PATH the GUI process didn't inherit). Bounded so it can't hang.
  try {
    const shell = process.env.SHELL || "/bin/zsh";
    const found = execFileSync(shell, ["-lic", "command -v claude"], {
      encoding: "utf8",
      timeout: 4000,
    })
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .pop();
    if (found) return found;
  } catch {
    /* fall through */
  }

  return "claude"; // last resort — rely on PATH
}

let cachedPath: string | null = null;

/**
 * The PATH a GUI-launched dev server is missing. We pull the real PATH from the
 * user's login shell (so `claude` — and any `node` it shells out to — resolve)
 * and merge in well-known bin dirs. Cached for the process.
 */
function loginShellPath(): string {
  if (cachedPath) return cachedPath;
  const home = homedir();
  const parts = new Set<string>((process.env.PATH || "").split(":").filter(Boolean));
  try {
    const shell = process.env.SHELL || "/bin/zsh";
    const out = execFileSync(shell, ["-lic", "echo $PATH"], { encoding: "utf8", timeout: 4000 })
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .pop();
    for (const p of (out || "").split(":")) if (p) parts.add(p);
  } catch {
    /* ignore */
  }
  for (const p of ["/opt/homebrew/bin", "/usr/local/bin", join(home, ".claude", "local"), join(home, ".local", "bin")]) {
    parts.add(p);
  }
  cachedPath = Array.from(parts).join(":");
  return cachedPath;
}

/** Process env augmented with the login-shell PATH — use for every CLI spawn. */
export function agentEnv(): NodeJS.ProcessEnv {
  return { ...process.env, PATH: loginShellPath() };
}

/** Absolute path to the agent settings file (registers the secret-guard hook). */
export function agentSettingsPath(): string {
  return join(process.cwd(), "src", "lib", "design-agent", "agent-settings.json");
}

/**
 * Tools the designer-driven agent may use. `dontAsk` mode silently denies
 * anything not on this list, so the designer never sees a raw permission prompt.
 * Note: git push / gh are intentionally excluded here — publishing is a separate,
 * explicit action handled by the /publish route.
 */
export const ALLOWED_TOOLS = [
  "Read",
  "Edit",
  "Write",
  "Glob",
  "Grep",
  "Bash(npm run lint)",
  "Bash(npm run build)",
  "Bash(git status:*)",
  "Bash(git diff:*)",
];

/** Reference directories the agent may read but not edit. Resolved relative to
 *  the pg-dashboard-v2 working directory (siblings in the designer workspace). */
function referenceDirs(): string[] {
  return [join(process.cwd(), "..", "Flux"), join(process.cwd(), "..", "pg-dashboard")].filter(
    existsSync,
  );
}

/**
 * Build argv for a single chat turn in headless streaming mode.
 * `--output-format stream-json` emits one JSON object per line.
 *
 * When an image is present the CLI's `--image` flag is unavailable in this
 * version, so we switch to `--input-format stream-json` and pass the prompt +
 * image as a multimodal NDJSON message written to stdin (`stdinData`).
 */
export function buildChatArgs(opts: {
  prompt: string;
  model: AgentModel;
  systemAppend: string;
  sessionId?: string;
  imageBase64?: string;
  imageMimeType?: string;
}): { args: string[]; stdinData?: string } {
  const hasImage = !!(opts.imageBase64 && opts.imageMimeType);

  const args = [
    // With stream-json input we use --print as a bare flag (no positional
    // prompt argument); the prompt comes from stdin instead.
    ...(hasImage ? ["--print"] : ["-p", opts.prompt]),
    "--output-format",
    "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--model",
    opts.model,
    "--permission-mode",
    "dontAsk",
    "--allowedTools",
    ALLOWED_TOOLS.join(" "),
    "--append-system-prompt",
    opts.systemAppend,
    "--settings",
    agentSettingsPath(),
  ];
  if (hasImage) args.push("--input-format", "stream-json");
  for (const dir of referenceDirs()) args.push("--add-dir", dir);
  if (opts.sessionId) args.push("--resume", opts.sessionId);

  let stdinData: string | undefined;
  if (hasImage) {
    const content: unknown[] = [
      { type: "image", source: { type: "base64", media_type: opts.imageMimeType, data: opts.imageBase64 } },
    ];
    if (opts.prompt) content.push({ type: "text", text: opts.prompt });
    stdinData = JSON.stringify({ type: "user", message: { role: "user", content } }) + "\n";
  }

  return { args, stdinData };
}
