import type { ReactNode } from "react";
import { SettingsSidebar } from "@/features/dashboard/settings/components/SettingsSidebar";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-6">
      <SettingsSidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
