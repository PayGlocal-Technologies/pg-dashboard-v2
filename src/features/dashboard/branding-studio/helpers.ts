import type { CSSProperties } from "react";
import { BRAND_FONT_FAMILY } from "@/features/dashboard/branding-studio/fonts";
import type {
  BrandingSettings,
  CornerStyle,
  PayButtonLabel,
} from "@/features/dashboard/branding-studio/types";

export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value.trim());
}

/** "₹19,616", Indian grouping, no paise. */
export function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

const RADII: Record<CornerStyle, { card: string; field: string; button: string }> = {
  SHARP: { card: "0px", field: "0px", button: "0px" },
  ROUNDED: { card: "12px", field: "8px", button: "8px" },
  PILL: { card: "16px", field: "9999px", button: "9999px" },
};

/**
 * The settings as CSS variables on a preview's root, so every surface reads
 * one set: --bs-brand fills bars and banners, --bs-accent buttons, links and
 * highlights, the radii follow Corners, and the font the Font family.
 */
export function previewThemeStyle(settings: BrandingSettings): CSSProperties {
  const radii = RADII[settings.corners];
  return {
    "--bs-brand": isHexColor(settings.brandColor) ? settings.brandColor : "#0061E3",
    "--bs-accent": isHexColor(settings.accentColor) ? settings.accentColor : "#0061E3",
    "--bs-radius-card": radii.card,
    "--bs-radius-field": radii.field,
    "--bs-radius-button": radii.button,
    fontFamily: BRAND_FONT_FAMILY[settings.font],
  } as CSSProperties;
}

const LABEL_WORD: Record<Exclude<PayButtonLabel, "NONE" | "PAY">, string> = {
  BUY: "Buy",
  CHECKOUT: "Checkout",
  SUBSCRIBE: "Subscribe",
  DONATE: "Donate",
};

/**
 * The primary pay button's text: "Pay ₹19,616 INR" by default, just "Pay"
 * when Pay is picked, and the picked word before the amount otherwise.
 */
export function payButtonText(label: PayButtonLabel, amount: string): string {
  if (label === "PAY") return "Pay";
  if (label === "NONE") return `Pay ${amount}`;
  return `${LABEL_WORD[label]} ${amount}`;
}

export function sameBranding(a: BrandingSettings, b: BrandingSettings): boolean {
  return (
    a.logoUrl === b.logoUrl &&
    a.brandColor.toLowerCase() === b.brandColor.toLowerCase() &&
    a.accentColor.toLowerCase() === b.accentColor.toLowerCase() &&
    a.corners === b.corners &&
    a.font === b.font &&
    a.buttonLabel === b.buttonLabel
  );
}
