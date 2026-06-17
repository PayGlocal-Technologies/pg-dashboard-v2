"use client";

import { type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders into document.body so `position: fixed` overlays span the full viewport.
 * Prevents clipping when ancestors use transform, filter, or scroll containers.
 */
export function ViewPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
