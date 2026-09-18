"use client";

import { EchoResultCard } from "@/features/dashboard/echo/components/EchoResultCards";
import { EchoRichText } from "@/features/dashboard/echo/components/EchoRichText";
import { parseRecordTable } from "@/features/dashboard/echo/recordTable";

/**
 * One chunk's body copy.
 *
 * Every chunk type routes its text through here, because the server writes
 * tabular answers as prose regardless of which chunk carries them — the
 * "recent transactions" reply is an `interactive.button` body, not a text one.
 * Repeated `Label: value` blocks are lifted into a table and the prose around
 * them is left as prose; a body with nothing tabular in it renders exactly as
 * it did before. See `recordTable.ts` for why this parses rather than reads a
 * structured field.
 */
export function EchoBody({ text }: { text: string }) {
  const { preamble, trailing, table } = parseRecordTable(text);

  if (!table) {
    return (
      <p className="text-[13.5px] leading-relaxed text-foreground">
        <EchoRichText text={text} />
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {preamble.trim() ? (
        <p className="text-[13.5px] leading-relaxed text-foreground">
          <EchoRichText text={preamble} />
        </p>
      ) : null}

      <EchoResultCard result={table} />

      {trailing.trim() ? (
        <p className="text-[13.5px] leading-relaxed text-foreground">
          <EchoRichText text={trailing} />
        </p>
      ) : null}
    </div>
  );
}
