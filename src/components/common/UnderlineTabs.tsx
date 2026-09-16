"use client";

/**
 * Page-level tab bar with a sliding active indicator.
 *
 * The implementation is flux's `UnderlineTabs` — both apps carried a copy, and
 * they had already drifted (this one's `label` had been widened to `ReactNode`
 * for a tab that shows a status badge; the other's was still `string`). flux
 * took the wider one.
 */
export { UnderlineTabs } from "@/components/ui";
export type { UnderlineTab } from "@/components/ui";
