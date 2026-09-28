"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ContentAreaProvider } from "@/components/layout/ContentAreaContext";

/**
 * DEMO shell: the dashboard's own Sidebar and Header around a page, with no
 * session and no account data fetched (unlike (dashboard)/layout.tsx, which
 * loads the signed-in merchant first). Only for walking through the mock
 * sign-up; everything under it runs on the app's sample data.
 */
export default function DemoLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contentEl, setContentEl] = useState<HTMLElement | null>(null);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main ref={setContentEl} className="relative flex-1 overflow-y-auto">
          <ContentAreaProvider value={contentEl}>
            <div className="page-enter p-4 md:p-6">{children}</div>
          </ContentAreaProvider>
        </main>
      </div>
    </div>
  );
}
