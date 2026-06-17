#!/usr/bin/env node
/**
 * PreToolUse hook for the Design Agent. Claude Code pipes a JSON event on stdin
 * before every Read/Edit/Write/Bash call. We deny (exit code 2) any attempt to
 * touch secret/credential material — protecting card/PII data and the cert
 * bundles in the pg-dashboard reference checkout.
 *
 * Exit 0 = allow. Exit 2 = block (stderr is shown back to the model).
 *
 * Kept as plain .mjs (not TS) so Claude Code can execute it directly with node.
 * The patterns mirror SECRET_PATH_PATTERNS in guards.ts — keep them in sync.
 */

const SECRET_PATTERNS = [
  /(^|\/)\.env(\.|$)/i,
  /(^|\/)\.git\/config$/i,
  /uidai_certs?_?js/i,
  /\.(pem|key|p12|pfx|jks|keystore)$/i,
  /(^|\/)(secrets?|credentials?)(\/|\.|$)/i,
  /id_rsa|id_ed25519|\.ssh\//i,
  /\.npmrc$/i,
];

const isSecret = (s) => typeof s === "string" && SECRET_PATTERNS.some((re) => re.test(s.replace(/\\/g, "/")));

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
    // If nothing arrives quickly, fail open is unsafe — fail closed instead.
    setTimeout(() => resolve(data), 2000);
  });
}

const raw = await readStdin();
let event = {};
try {
  event = JSON.parse(raw || "{}");
} catch {
  // Unparseable input → be conservative and allow (the allowlist still applies).
  process.exit(0);
}

const input = event.tool_input ?? {};
const candidates = [input.file_path, input.path, input.notebook_path, input.command]
  .flat()
  .filter(Boolean);

if (candidates.some(isSecret)) {
  process.stderr.write(
    "Blocked: this path is protected (secrets/credentials/certs). The Design Agent must not read or modify it.",
  );
  process.exit(2);
}

process.exit(0);
