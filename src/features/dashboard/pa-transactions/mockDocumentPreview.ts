const PREVIEW_ACCENTS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b"];

/** A small inline "receipt" thumbnail (a header bar + a few text lines),
 * self-contained as a data URI so mock data never depends on a real image
 * asset. Distinct only by accent color, just enough for several mock
 * attachments in the same list to not look identical. */
function buildPreviewSvg(accent: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">` +
    `<rect width="120" height="120" fill="#f8fafc"/>` +
    `<rect x="10" y="10" width="100" height="14" rx="3" fill="${accent}"/>` +
    `<rect x="10" y="34" width="80" height="6" rx="3" fill="#cbd5e1"/>` +
    `<rect x="10" y="46" width="90" height="6" rx="3" fill="#cbd5e1"/>` +
    `<rect x="10" y="58" width="60" height="6" rx="3" fill="#cbd5e1"/>` +
    `<rect x="10" y="80" width="40" height="20" rx="3" fill="#e2e8f0"/>` +
    `<rect x="60" y="80" width="40" height="20" rx="3" fill="#e2e8f0"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

/** A deterministic placeholder thumbnail for a document NAME that came from
 * mock/persisted data — there's no real File/blob behind a name like this
 * (see SubmittedDocument's own doc comment on DisputeStatusNoticeCard.tsx),
 * so a real preview is impossible, but the empty file-icon fallback made a
 * dispute that's already "Under review" with evidence attached look like
 * nothing had actually been uploaded. Only filenames that look like images
 * get one, same rule DisputeRespondForm's own addFiles uses for a real
 * upload — a PDF/other file still falls back to the plain file icon. */
export function getMockDocumentPreviewUrl(name: string): string | undefined {
  const lower = name.toLowerCase();
  if (!IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))) return undefined;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const accent = PREVIEW_ACCENTS[hash % PREVIEW_ACCENTS.length]!;
  return buildPreviewSvg(accent);
}
