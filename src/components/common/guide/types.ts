/** A single coach-mark in a screen tour. */
export interface GuideStep {
  /**
   * Value of the `data-guide` attribute on the element this step highlights.
   * The element is looked up at runtime via `[data-guide="<target>"]`, so a
   * step and its target stay decoupled — no refs threaded through components.
   */
  target: string;
  title: string;
  description: string;
  /** Which side of the target the card sits on. Radix flips it on collision. */
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  /**
   * The step covers something the merchant cannot submit without. Draws a
   * "Required" mark on the card, so a tour of a long form separates the blocks
   * that gate the submit from the ones that only improve the result.
   */
  required?: boolean;
}
