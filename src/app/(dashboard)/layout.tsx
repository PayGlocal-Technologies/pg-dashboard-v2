"use client";

import { useState, type ReactNode } from "react";
import { useFetchCommonData } from "@/lib/hooks/useFetchCommonData";
import { useApp } from "@/stores/useApp";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ContentAreaProvider } from "@/components/layout/ContentAreaContext";
import { Icon } from "@/components/icon";
import { FeedbackSheet } from "@/features/dashboard/feedback/FeedbackSheet";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isError } = useFetchCommonData();
  const profile = useApp((s) => s.profile);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contentEl, setContentEl] = useState<HTMLElement | null>(null);

  if (!profile && !isError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Icon name="loader" className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main ref={setContentEl} className="relative flex-1 overflow-y-auto">
          <ContentAreaProvider value={contentEl}>
            <div className="p-4 md:p-6 page-enter">{children}</div>
          </ContentAreaProvider>
        </main>
      </div>

      {/* App-wide, not tied to any page: the survey asks about PayGlocal as a
          whole. Whether it actually appears is the server's call — see the
          eligibility check inside. */}
      <FeedbackSheet />
    </div>
  );
}
