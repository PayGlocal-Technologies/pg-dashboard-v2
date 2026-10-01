import { Inter, Poppins, Roboto, Work_Sans } from "next/font/google";
import type { BrandFont } from "@/features/dashboard/branding-studio/types";

// Loaded only by Branding Studio, so the rest of the app never downloads them.
const workSans = Work_Sans({ subsets: ["latin"], display: "swap" });
const inter = Inter({ subsets: ["latin"], display: "swap" });
const roboto = Roboto({ subsets: ["latin"], display: "swap" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/** The CSS font-family each option renders the previews in. */
export const BRAND_FONT_FAMILY: Record<BrandFont, string> = {
  WORK_SANS: workSans.style.fontFamily,
  INTER: inter.style.fontFamily,
  ROBOTO: roboto.style.fontFamily,
  POPPINS: poppins.style.fontFamily,
  SYSTEM_UI: "system-ui, -apple-system, 'Segoe UI', sans-serif",
};
