/**
 * Scored fuzzy matching for the header search. No dependency: the index is well
 * under a hundred entries, so ranking quality matters far more than the typo
 * tolerance a Bitap library would add.
 *
 * What this handles: dropped letters and abbreviations, via subsequence
 * matching. "mcatxn" finds "MCA Transactions", "setlment" finds "Settlements",
 * "bnkacc" finds "Banking & currencies".
 *
 * What it does not: inserted or transposed letters. "settelment" fails, because
 * after "sett" there is no "l" left in "settlements" to match. That is the line
 * between subsequence fuzz and Bitap fuzz; crossing it means Fuse.js, which is
 * a swap of this one file if it ever proves necessary.
 */

const normalise = (value: string): string => value.toLowerCase().replace(/\s+/g, " ").trim();

/** Word-boundary characters. A match just after one of these scores higher. */
const isBoundary = (char: string | undefined): boolean =>
  char === undefined || char === " " || char === "-" || char === "&" || char === "/";

/** Shortest query length that may match on subsequence alone. */
const MIN_SUBSEQUENCE_QUERY = 3;

/**
 * Scores `query` against `text`, higher is better, or null when they don't
 * match at all. Tiers are wide apart so a weaker tier can never outrank a
 * stronger one however many bonuses it accumulates.
 */
export function fuzzyScore(query: string, text: string): number | null {
  const q = normalise(query);
  const t = normalise(text);

  if (!q || !t) return null;
  if (q === t) return 1000;

  if (t.startsWith(q)) {
    // Among prefix matches, prefer the shorter label: typing "trans" should
    // rank "Transactions" above a hypothetical "Transactions archive".
    return 900 - Math.min(t.length - q.length, 99);
  }

  // A match at the start of any word — "currencies" in "Banking & currencies".
  const wordStart = t.split(/[\s\-&/]+/).some((word) => word.startsWith(q));
  if (wordStart) return 800 - Math.min(t.length - q.length, 99);

  const index = t.indexOf(q);
  if (index > -1) return 700 - Math.min(index, 99);

  // Subsequence. Guarded on length because a one- or two-character query is a
  // subsequence of nearly every label, which turns the dropdown into a
  // directory listing rather than a search result.
  if (q.length < MIN_SUBSEQUENCE_QUERY) return null;

  let score = 400;
  let cursor = 0;
  let previousMatch = -1;

  for (const [position, char] of [...q].entries()) {
    const found = t.indexOf(char, cursor);
    if (found === -1) return null;
    // The first character must land at the start of a word. People abbreviate
    // forwards from a word ("bnkacc" for "bank account"), they do not start
    // mid-syllable — and without this, four-character queries match almost
    // anything: "setl" is a subsequence of "personal details", "business
    // details" and half the registry besides.
    if (position === 0 && !isBoundary(t[found - 1])) return null;
    if (isBoundary(t[found - 1])) score += 25;
    if (found === previousMatch + 1) score += 15;
    else score -= found - cursor;
    previousMatch = found;
    cursor = found + 1;
  }

  return score;
}

/**
 * An entry's overall score: the best of its label, its keywords and its parent
 * label, each weighted by how much a hit there really tells us. A keyword hit
 * is a genuine signal but a weaker one than the label itself; a parent hit
 * ("settings") should surface every page under it, but below anything whose own
 * name matched.
 */
export function scoreFields(
  query: string,
  fields: { label: string; keywords: string[]; parent?: string }
): number | null {
  const scores: number[] = [];

  const label = fuzzyScore(query, fields.label);
  if (label !== null) scores.push(label);

  for (const keyword of fields.keywords) {
    const keywordScore = fuzzyScore(query, keyword);
    if (keywordScore !== null) scores.push(keywordScore * 0.7);
  }

  if (fields.parent) {
    const parent = fuzzyScore(query, fields.parent);
    if (parent !== null) scores.push(parent * 0.4);
  }

  return scores.length ? Math.max(...scores) : null;
}
