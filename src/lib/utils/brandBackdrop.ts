import type { CSSProperties } from "react";
import { withBasePath } from "@/constants/basePath";

/**
 * Inline half of the `.brand-backdrop` class in globals.css: the artwork
 * behind the refer banner, the invoice preview and the eBRC wizard, with a
 * wash of the page background laid over it.
 *
 * `image` defaults to the shared artwork; a screen with its own passes a
 * public path.
 *
 * `wash` is how much of the light-mode background covers the image (0–100).
 * Dark mode ignores it and uses the one strength globals.css sets, since a
 * light-tuned wash left the artwork as a bright block on a dark page.
 *
 * The URL comes from here rather than the stylesheet because it needs the
 * base path, which a `url()` in bundled CSS never gets. Quoted, because the
 * filename has a space and an unquoted `url()` ends at the first whitespace.
 */
export function brandBackdropStyle(
  wash: number,
  image: string = "/assets/bg image.png"
): CSSProperties {
  return {
    "--backdrop-wash": `${wash}%`,
    "--backdrop-image": `url("${withBasePath(image)}")`,
  } as CSSProperties;
}

/** The create-invoice preview column's own artwork, in place of the shared
 *  backdrop the refer banner and eBRC wizard still use. */
export const INVOICE_PREVIEW_BACKDROP = "/assets/invoice-preview-bg.png";
