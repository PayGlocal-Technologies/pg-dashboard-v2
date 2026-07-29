/**
 * Fixed square footprint, shared by every card and by the loading skeleton —
 * the row never reflows when data arrives. Every account has exactly two
 * detail rows, sized to fit; anything that doesn't (an unusually long value)
 * is truncated rather than growing the card — see `overflow-hidden` +
 * `truncate` in VirtualAccountCard.
 */
export const CARD_SIZE_CLASS = "w-[190px] h-[190px]";

/** Number of placeholder cards rendered while accounts are loading. */
export const SKELETON_CARD_COUNT = 4;

/** Matches the tooltip styling already used by CopyableText across the app. */
export const TOOLTIP_CONTENT_CLASS =
  "rounded-lg bg-popover text-popover-foreground border border-border text-xs px-2 py-1 shadow-md z-[200]";
