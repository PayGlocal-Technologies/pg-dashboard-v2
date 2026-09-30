import type { ReactNode } from "react";
import { SettingsSidebar } from "@/features/dashboard/settings/components/SettingsSidebar";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    // min-h-[calc(100vh-57px)] (57px = the dashboard header's height, same
    // figure the pa-transactions detail pages use for this) — without it the
    // row is only as tall as its own content, so the sidebar's border-r
    // divider stopped wherever "Personal details" (or whichever settings
    // page) happened to end, instead of running to the bottom of the
    // viewport. -m-4/md:-m-6 cancels <main>'s own padding so this reaches
    // the real page edges before the min-height is measured.
    <div className="-m-4 flex min-h-[calc(100vh-57px)] gap-6 p-4 md:-m-6 md:p-6">
      <SettingsSidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
