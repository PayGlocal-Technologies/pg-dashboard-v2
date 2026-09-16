"use client";

import { CopyableCell as FluxCopyableCell } from "@/components/ui";

/**
 * Compact table-cell value with a hover-revealed copy button.
 *
 * The implementation is flux's `CopyableCell` — this app and pg-internal-v2 had
 * four separate takes on "a value with a copy button" between them, which is
 * three too many for a control that appears in almost every grid.
 *
 * This stays as a named wrapper for one reason: the prop names are inverted.
 * Here `value` is what is **shown** and `copyValue` is what reaches the
 * clipboard; flux takes `value` as the real value and `display` as the elided
 * form, so that the clipboard, the tooltip and the accessible name cannot
 * accidentally carry the truncated string. Translating at the boundary keeps
 * every existing call site working.
 */
export function CopyableCell({
  value,
  copyValue,
  label,
  monospace,
  className,
}: {
  value: string;
  /** Text actually written to the clipboard, if different from the displayed `value`. */
  copyValue?: string;
  /** Shown in the copy toast, e.g. "Username copied". */
  label: string;
  monospace?: boolean;
  className?: string;
}) {
  return (
    <FluxCopyableCell
      value={copyValue ?? value}
      display={copyValue ? value : undefined}
      label={label}
      monospace={monospace}
      className={className}
    />
  );
}
