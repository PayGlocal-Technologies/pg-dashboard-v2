"use client";

import { type ReactNode } from "react";
import { useFetchCommonData } from "@/lib/hooks/useFetchCommonData";
import { useApp } from "@/stores/useApp";
import { Icon } from "@/components/icon";

/**
 * Full-screen editor shell.
 *
 * The invoice editor is a focused, document-shaped surface: it fills the
 * viewport with no sidebar and no page chrome, and its own header carries the
 * close action back to the invoice list. Mirrors Nova's (invoice-editor)
 * route group.
 *
 * It still loads the same common data the dashboard shell does, because the
 * merchant profile is where the MID every mca-invoice endpoint is scoped to
 * comes from. Rendering before that resolves would fire every request with an
 * empty merchant id.
 */
export default function InvoiceEditorLayout({ children }: { children: ReactNode }) {
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
