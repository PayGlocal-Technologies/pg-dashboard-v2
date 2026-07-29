/**
 * Fixed square footprint, shared by every card and by the loading skeleton —
 * the row never reflows when data arrives. Sized to fit the tallest card
 * (3 detail rows, e.g. Canada/Singapore) without any internal scrolling.
 * ~3.5 cards are visible in a desktop content area before the horizontal
 * scroll kicks in.
 */
export const CARD_SIZE_CLASS = "w-[300px] h-[300px]";

/** Number of placeholder cards rendered while accounts are loading. */
export const SKELETON_CARD_COUNT = 4;

/** Matches the tooltip styling already used by CopyableText across the app. */
export const TOOLTIP_CONTENT_CLASS =
  "rounded-lg bg-popover text-popover-foreground border border-border text-xs px-2 py-1 shadow-md z-[200]";
