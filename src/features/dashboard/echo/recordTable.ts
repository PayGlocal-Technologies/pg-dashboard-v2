import type { EchoTableResult } from "@/features/dashboard/echo/types";

/**
 * Recovers tabular data from an Echo text body.
 *
 * The server has no structured result type: a list of transactions arrives as
 * one `text`/`interactive` body with the records written out as repeated
 * `Label: *value*` blocks, because the same engine drives a WhatsApp bot where
 * that is the only thing that can be rendered. In the dashboard that reads as
 * a wall of text, so identical consecutive blocks are lifted into a real table
 * and everything around them stays prose.
 *
 * This is a PARSER OVER PROSE, with the fragility that implies: it holds only
 * while the server keeps writing records this way, and it is deliberately
 * conservative — anything it is not sure about falls through and renders as
 * the text it always did. It is not a substitute for a structured chunk type
 * on the wire, which is what should eventually replace it (see the BACKEND GAP
 * note on `EchoResult`).
 */

/** Strips WhatsApp's `*bold*` so a value can sit in a table cell. */
function stripBold(text: string): string {
  return text.replace(/\*([^*\n]+)\*/g, "$1");
}

/**
 * A record's field line: `Status: Sent For Review`.
 *
 * The key must start with a letter and hold no digits, which is what keeps a
 * timestamp out. `24 Aug 2026, 04:42 PM` contains a colon, so a looser
 * `[^:]+:` would read it as the key "24 Aug 2026, 04" and silently shred the
 * date line into a field.
 */
const FIELD_LINE = /^([A-Za-z][A-Za-z /&_-]{0,30}):\s*(.+)$/;

/** Dates the leading line of a record commonly takes. Only used to decide
 *  whether that column can be called "Date" rather than left unlabelled. */
const DATE_LIKE =
  /(\d{1,2}\s+[A-Za-z]{3,}\s+\d{2,4})|(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}\/\d{2,4})/;

/** Column key from a label: "Transaction ID" → "transaction-id". */
function toKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type ParsedRecord = {
  /** The un-keyed first line, if the block opened with one. */
  lead?: string;
  fields: { label: string; value: string }[];
};

/** A block is a record when it carries at least two `Label: value` lines. */
function parseRecord(block: string): ParsedRecord | null {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let lead: string | undefined;
  const fields: { label: string; value: string }[] = [];

  for (const line of lines) {
    const match = FIELD_LINE.exec(line);
    if (match) {
      fields.push({ label: match[1].trim(), value: stripBold(match[2]).trim() });
      continue;
    }
    // Any un-keyed line other than the very first one means this block is
    // prose that happens to contain a colon, not a record.
    if (fields.length > 0 || lead !== undefined) return null;
    lead = stripBold(line);
  }

  return fields.length >= 2 ? { lead, fields } : null;
}

/** Records only tabulate together when they carry the same fields in the same
 *  order and agree on whether they have a leading line. */
function signatureOf(record: ParsedRecord): string {
  return `${record.lead === undefined ? "" : "lead|"}${record.fields.map((f) => f.label).join("|")}`;
}

export type ParsedBody = {
  /** Prose before the table. */
  preamble: string;
  /** Prose after it. */
  trailing: string;
  /** Null when the body held nothing tabular, which is the common case. */
  table: EchoTableResult | null;
};

export function parseRecordTable(body: string): ParsedBody {
  const blocks = body.split(/\n\s*\n/).filter((block) => block.trim().length > 0);
  const parsed = blocks.map(parseRecord);

  // Longest run of consecutive records sharing one signature. Two is the
  // minimum worth a table: a single record reads better as the prose it is.
  let bestStart = -1;
  let bestLength = 0;
  let index = 0;
  while (index < parsed.length) {
    const record = parsed[index];
    if (!record) {
      index += 1;
      continue;
    }
    const signature = signatureOf(record);
    let end = index + 1;
    while (end < parsed.length && parsed[end] && signatureOf(parsed[end]!) === signature) end += 1;
    if (end - index > bestLength) {
      bestLength = end - index;
      bestStart = index;
    }
    index = end;
  }

  if (bestLength < 2) return { preamble: body, trailing: "", table: null };

  const records = parsed.slice(bestStart, bestStart + bestLength) as ParsedRecord[];
  const hasLead = records[0].lead !== undefined;
  const leadIsDate = hasLead && records.every((r) => DATE_LIKE.test(r.lead ?? ""));

  const columns: EchoTableResult["columns"] = [
    // An unlabelled first column when the leading line is not recognisably a
    // date: the server chose to put it first and inventing a name for it
    // would be a guess.
    ...(hasLead ? [{ key: "_lead", label: leadIsDate ? "Date" : "" }] : []),
    ...records[0].fields.map((field) => ({
      key: toKey(field.label),
      label: field.label,
      // Amounts read right-aligned; everything else stays left.
      align: /amount|total|value/.test(toKey(field.label)) ? ("right" as const) : ("left" as const),
    })),
  ];

  const rows = records.map((record) => {
    const row: Record<string, string> = {};
    if (hasLead) row._lead = record.lead ?? "";
    for (const field of record.fields) row[toKey(field.label)] = field.value;
    return row;
  });

  return {
    preamble: blocks.slice(0, bestStart).join("\n\n"),
    trailing: blocks.slice(bestStart + bestLength).join("\n\n"),
    table: { kind: "table", title: "", columns, rows },
  };
}
