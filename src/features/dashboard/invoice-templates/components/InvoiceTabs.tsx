"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Invoices / Templates, the two halves of invoice management.
 *
 * Routes rather than local tab state, which is what makes each half linkable,
 * bookmarkable and reachable with the back button. `Tabs` from flux is
 * deliberately not used here: it owns its own selection, and a tab whose
 * selection is really a URL ends up with two sources of truth for one thing.
 *
 * Rendered inside <MidGuard> on both pages, so a merchant with several PACB
 * MIDs and none picked sees the MID prompt rather than an empty list — the
 * failure mode the templates dialog had while it lived in the page header.
 */
const TABS = [
  { href: "/mca-invoices", label: "Invoices" },
  { href: "/mca-invoices/templates", label: "Templates" },
] as const;

export function InvoiceTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Invoice management sections"
      className="flex items-center gap-1 border-b border-border"
    >
      {TABS.map((tab) => {
        // Exact match, not startsWith: /mca-invoices is a prefix of every other
        // route under it, so a prefix test would light both tabs on /templates.
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative px-3 py-2 text-[13.5px] font-medium transition-colors",
              "after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full",
              isActive
                ? "text-foreground after:bg-primary"
                : "text-muted-foreground hover:text-foreground after:bg-transparent"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
