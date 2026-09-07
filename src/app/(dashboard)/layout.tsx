"use client";

import { useState, type ReactNode } from "react";
import { useFetchCommonData } from "@/lib/hooks/useFetchCommonData";
import { useApp } from "@/stores/useApp";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ContentAreaProvider } from "@/components/layout/ContentAreaContext";
import { Icon } from "@/components/icon";
import { FeedbackSheet } from "@/features/dashboard/feedback/FeedbackSheet";
import { McaV2AnnouncementModal } from "@/components/layout/McaV2AnnouncementModal";
import { EchoPanel } from "@/features/dashboard/echo/components/EchoPanel";

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

      {/* Echo's side panel — a flex sibling of the main column, sliding open
          rather than overlaying, so it shares the row with Sidebar/main
          instead of covering either. See EchoPanel for why it (and its full
          page at /echo) share one conversation via a store. */}
      <EchoPanel />

      {/* App-wide, not tied to any page: the survey asks about PayGlocal as a
          whole. Whether it actually appears is the server's call — see the
          eligibility check inside. */}
      <FeedbackSheet />

      {/* One-time "MCA has a new look" announcement, gated on actually
          having MCA access — see the component for why this is a plain
          localStorage flag rather than something tied to the login action
          itself. */}
      <McaV2AnnouncementModal />
    </div>
  );
}
