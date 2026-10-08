import type { ReactNode } from "react";
import { SettingsSidebar } from "@/features/dashboard/settings/components/SettingsSidebar";
import { PA_SETTINGS_NAV_GROUPS } from "@/features/dashboard/pa-settings/constants";

/**
 * The PA settings section: the current settings pages and left nav, mounted
 * at /pa-settings so the new PA settings can be built here without touching
 * /settings. Same layout as (dashboard)/settings/layout.tsx.
 */
export default function PaSettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="-m-4 flex min-h-[calc(100vh-57px)] gap-6 p-4 md:-m-6 md:p-6">
      <SettingsSidebar basePath="/pa-settings" groups={PA_SETTINGS_NAV_GROUPS} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
