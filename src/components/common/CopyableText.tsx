"use client";

import { CopyableCell } from "@/components/ui";

/**
 * A monospace value with a copy control.
 *
 * The implementation is flux's `CopyableCell`, which now carries both of this
 * component's shapes — `variant="cell"` makes the whole element the copy
 * target, `revealOnHover` hides the button until the row is hovered. This app
 * and pg-internal-v2 had four takes on "a value with a copy button" between
 * them; there is one now.
 *
 * Kept as a named wrapper because the prop names differ (`displayValue` vs
 * `display`) and because the defaults do: this control is monospace, does not
 * toast, and shows its copy button by default, where a table cell does the
 * opposite on all three.
 */
export function CopyableText({
  value,
  displayValue,
  className,
  variant = "inline",
  valueClassName,
  revealOnHover = false,
}: {
  value: string;
  /**
   * What to show in place of `value` — an elided form of it, typically from
   * `truncateMiddle`. Display only: the clipboard, the tooltip and the
   * accessible name all still carry the full `value`, so shortening what's on
   * screen never shortens what the user actually walks away with.
   */
  displayValue?: string;
  className?: string;
  /**
   * "inline" (default): value always visible, its own copy button alongside.
   * "cell": for fixed-width table cells — the value truncates with an ellipsis
   * to make room, and the whole element is the click target.
   */
  variant?: "inline" | "cell";
  /** "inline" only: overrides the value's default colour. */
  valueClassName?: string;
  /**
   * "inline" only: keeps the copy button invisible until the row (or whatever
   * `group` ancestor holds it) is hovered.
   */
  revealOnHover?: boolean;
}) {
  return (
    <CopyableCell
      value={value}
      display={displayValue}
      variant={variant}
      monospace
      // The cell form is the clickable one, so it reads in the accent colour
      // the way a link would; inline stays body text.
      accent={variant === "cell"}
      revealOnHover={variant === "cell" ? true : revealOnHover}
      // The tick and the tooltip are feedback enough here — a toast on every
      // copy of a field on a detail page would be noise.
      showToast={false}
      valueClassName={valueClassName}
      className={className}
    />
  );
}
