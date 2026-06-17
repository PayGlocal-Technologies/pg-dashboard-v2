"use client";

import { type ReactNode, useEffect } from "react";
import { AuthSplitScreen } from "@/features/auth/components/AuthSplitScreen";
import { BrandLogo } from "@/features/auth/components/BrandLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { getPublicKey } from "@/features/auth/helpers";

/**
 * Auth shell: split-screen brand panel + centered form column. Loads the
 * payload-encryption public key once on mount (mirrors pg-dashboard's
 * NoAuthLayout). Route protection / redirect-if-authenticated is handled by
 * middleware.ts before this ever renders.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    void getPublicKey();
  }, []);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthSplitScreen />
      <div className="relative flex flex-col">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-8">
            <BrandLogo
              className="lg:hidden"
              wordmarkClassName="text-[12px] font-medium"
            />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
