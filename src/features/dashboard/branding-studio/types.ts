export type CornerStyle = "SHARP" | "ROUNDED" | "PILL";

export type BrandFont = "WORK_SANS" | "INTER" | "ROBOTO" | "POPPINS" | "SYSTEM_UI";

/** The word on the primary pay button; NONE keeps the default "Pay <amount>". */
export type PayButtonLabel = "NONE" | "BUY" | "CHECKOUT" | "PAY" | "SUBSCRIBE" | "DONATE";

export interface BrandingSettings {
  /** An object URL for a freshly picked file, else the saved logo's URL. */
  logoUrl: string | null;
  brandColor: string;
  accentColor: string;
  corners: CornerStyle;
  font: BrandFont;
  buttonLabel: PayButtonLabel;
}

export type PreviewSurface = "CHECKOUT" | "PAYMENT_PAGE" | "EMAIL";

export type PreviewDevice = "MOBILE" | "DESKTOP";
