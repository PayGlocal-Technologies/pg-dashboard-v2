/**
 * Fixed landscape footprint (240×176), shared by every card and by the
 * loading skeleton — the row never reflows when data arrives. The width is
 * what the two standard-size ("sm") Copy/Share buttons revealed on hover need
 * to sit comfortably side by side; the height is trimmed to the content stack
 * (flag → title → country → two identifier rows ≈ 112px) plus the card's own
 * 16px padding, leaving real breathing room without the dead space a square
 * left below the identifiers. Anything too long for the width is truncated
 * rather than growing the card — see `overflow-hidden` + `truncate` in
 * VirtualAccountCard.
 */
export const CARD_SIZE_CLASS = "w-60 h-44";

/** Number of placeholder cards rendered while accounts are loading. */
export const SKELETON_CARD_COUNT = 4;

/** Matches the tooltip styling already used by CopyableText across the app. */
export const TOOLTIP_CONTENT_CLASS =
  "rounded-lg bg-popover text-popover-foreground border border-border text-xs px-2 py-1 shadow-md z-[200]";
