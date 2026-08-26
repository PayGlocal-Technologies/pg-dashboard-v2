import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/app/providers";
import { DesignAgentOverlay } from "@payglocal_ui/lumen/client";
import { withBasePath } from "@/constants/basePath";
import "@payglocal_ui/lumen/styles.css";
import "@/app/globals.css";

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
        {/* apiBasePath must be prefixed by hand. Lumen's client defaults it to
            "/api/lumen", which is the path its route handler would sit at in an
            app served from the root — this one is served from BASE_PATH, so the
            handler is really at "/app-v2/api/lumen" and the default 404s on
            every call (auth, usage, publish, upload, and the chat SSE). Next
            cannot fix this for us: the value is a fetch URL inside a
            node_modules component, not a next/link or next/navigation call. */}
        {process.env.NODE_ENV === "development" && (
          <DesignAgentOverlay apiBasePath={withBasePath("/api/lumen")} />
        )}
      </body>
    </html>
  );
}
