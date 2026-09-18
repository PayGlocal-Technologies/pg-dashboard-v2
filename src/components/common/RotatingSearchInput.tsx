"use client";

/**
 * The rotating "Search by …" field now lives in flux-ui. Both apps carried a
 * near-identical copy; they had already drifted on the input's height and the
 * default aria-label.
 *
 * Re-exported from this path because the feature toolbars already import it here.
 */
export { RotatingSearchInput } from "@/components/ui";
export type { RotatingSearchInputProps } from "@/components/ui";
