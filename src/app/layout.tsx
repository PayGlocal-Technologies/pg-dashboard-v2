import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/app/providers";
import "@/app/globals.css";

// Dev-only. A conditional dynamic import keeps the Lumen agent (and its styles)
// out of production bundles — a static import would ship the whole client module
// even when its render is gated behind NODE_ENV. The agent + its CSS are bundled
// together in the dev-only wrapper so a single dynamic import resolves one JS
// client module (Turbopack rejects a `.css` import inside `next/dynamic`).
const DesignAgentOverlay =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("@/components/dev/LumenOverlay"))
    : null;

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PayGlocal — Dashboard",
  description: "Manage your global payments, settlements, and currency accounts",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        {DesignAgentOverlay && <DesignAgentOverlay />}
      </body>
    </html>
  );
}
