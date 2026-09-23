"use client";

import { type ReactNode } from "react";
import { useFetchCommonData } from "@/lib/hooks/useFetchCommonData";
import { useApp } from "@/stores/useApp";
import { Icon } from "@/components/icon";

/**
 * Full-screen editor shell for the eBRC Generation wizard — same pattern as
 * `(invoice-editor)`: fills the viewport with no sidebar and no dashboard
 * chrome, and the feature's own header carries the close action back to the
 * eBRC Status landing page.
 *
 * Still loads the same common data the dashboard shell does — the merchant
 * profile is where the MID this flow is scoped to comes from.
 */
export default function EbrcEditorLayout({ children }: { children: ReactNode }) {
  const { isError } = useFetchCommonData();
  const profile = useApp((s) => s.profile);

  if (!profile && !isError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Icon name="loader" className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <div className="h-screen overflow-hidden bg-background">{children}</div>;
}
