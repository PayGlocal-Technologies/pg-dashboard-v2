/**
 * Fixed square footprint, shared by every card and by the loading skeleton —
 * the row never reflows when data arrives. Sized generously enough that the
 * two standard-size ("sm") Copy/Share buttons revealed on hover sit with
 * comfortable room on every side, not just enough to avoid wrapping. Every
 * account has exactly two detail rows, sized to fit; anything that doesn't
 * (an unusually long value) is truncated rather than growing the card — see
 * `overflow-hidden` + `truncate` in VirtualAccountCard.
 */
export const CARD_SIZE_CLASS = "w-60 h-60";

/** Number of placeholder cards rendered while accounts are loading. */
export const SKELETON_CARD_COUNT = 4;

/** Matches the tooltip styling already used by CopyableText across the app. */
export const TOOLTIP_CONTENT_CLASS =
  "rounded-lg bg-popover text-popover-foreground border border-border text-xs px-2 py-1 shadow-md z-[200]";
