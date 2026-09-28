"use client";

import { type ReactNode, useEffect } from "react";
import { motion } from "framer-motion";
import { AuthSplitScreen } from "@/features/auth/components/AuthSplitScreen";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { getPublicKey } from "@/features/auth/helpers";
import { AuthLogo } from "@/features/auth/components/AuthLogo";

/**
 * Auth shell: split-screen brand panel + form column. Loads the
 * payload-encryption public key once on mount (mirrors pg-dashboard's
 * NoAuthLayout). Route protection / redirect-if-authenticated is handled by
 * middleware.ts before this ever renders.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    void getPublicKey();
  }, []);

  return (
    <div className="relative grid min-h-screen bg-white lg:h-screen lg:grid-cols-2 lg:overflow-hidden">
      <AuthSplitScreen />
      {/* Right column: logo bar, the form, then the footer. All three
          share one left inset (lg:pl-[14%]) so their left edges line up. */}
      <div className="relative flex min-h-0 flex-col dark:bg-background">
        <header className="flex shrink-0 items-center justify-between px-6 pt-6 lg:pl-[14%] lg:pr-8">
          <AuthLogo />
          <ThemeToggle />
        </header>

        {/* Scrolls on short screens. The child centres itself with my-auto
            rather than the parent using items-center, which would push
            overflowing content up under the header instead of scrolling. */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6 lg:pl-[14%] lg:pr-8">
          {/* Eases in on arrival, pairing with the landing page's hand-off
              (a fade to white). */}
          <motion.div
            className="mx-auto my-auto w-full max-w-[25rem] lg:mx-0"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          >
            {children}
          </motion.div>
        </div>

        <footer className="shrink-0 px-6 pb-6 text-[12px] text-muted-foreground lg:pl-[14%] lg:pr-8">
          © PayGlocal Technologies Pvt. Ltd.
        </footer>
      </div>
    </div>
  );
}
