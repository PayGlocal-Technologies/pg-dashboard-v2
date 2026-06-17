/**
 * POST /api/design-agent/upload — accept an image file and write it to a
 * server-side temp path so the Claude CLI can read it via --image <path>.
 * Dev-only. The caller (main chat route) unlinks the file after the CLI exits.
 */
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { isDevAgentEnabled } from "@/lib/design-agent/guards";

export const runtime = "nodejs";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export async function POST(req: Request): Promise<Response> {
  if (!isDevAgentEnabled()) return new Response(null, { status: 404 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new Response("Invalid form data", { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) return new Response("Missing file field", { status: 400 });
  if (!ALLOWED_MIME.has(file.type)) {
    return new Response("Only jpeg/png/gif/webp images are supported", { status: 415 });
  }

  const ext = extname(file.name).toLowerCase() || ".png";
  const tmpPath = join(tmpdir(), `design-agent-${Date.now()}${ext}`);

  try {
    await writeFile(tmpPath, Buffer.from(await file.arrayBuffer()));
  } catch {
    return new Response("Failed to write temp file", { status: 500 });
  }

  return Response.json({ tmpPath });
}
