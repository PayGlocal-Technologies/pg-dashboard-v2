"use client";

import { useState, type ReactNode } from "react";
import { useFetchCommonData } from "@/lib/hooks/useFetchCommonData";
import { useApp } from "@/stores/useApp";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Icon } from "@/components/icon";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isError } = useFetchCommonData();
  const profile = useApp((s) => s.profile);
  const [mobileOpen, setMobileOpen] = useState(false);

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
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 page-enter">{children}</div>
        </main>
      </div>
    </div>
  );
}
