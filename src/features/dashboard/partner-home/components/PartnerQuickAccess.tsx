"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  icon: IconName;
  href: string;
  primary?: boolean;
}

/** Where a partner most often goes next, as the Partners nav names them. */
const ACTIONS: QuickAction[] = [
  { id: "referral", label: "Referral links", icon: "link", href: "/refer-and-earn", primary: true },
  { id: "activation", label: "Merchant activation", icon: "users", href: "/my-merchants" },
  { id: "portfolio", label: "Merchant portfolio", icon: "line-chart", href: "/merchant-portfolio" },
  { id: "transactions", label: "Transactions", icon: "repeat", href: "/transaction-overview" },
  { id: "commissions", label: "Commissions", icon: "file-text", href: "/commission" },
  { id: "deals", label: "Deals", icon: "receipt", href: "/partner-deals-dashboard" },
];

/**
 * Shortcuts, not a card: one loose row of pills under the greeting, the same
 * build as the MCA dashboard's McaQuickAccess. The first is tinted as the
 * partner's main growth action.
 */
export function PartnerQuickAccess({
  onReferralLinks,
}: {
  /** Referral links opens the links pop-up in place instead of navigating. */
  onReferralLinks?: () => void;
}) {
  const router = useRouter();
  return (
    <nav aria-label="Quick actions" className="flex flex-wrap items-center gap-1.5">
      {ACTIONS.map((a) => (
        <Button
          key={a.id}
          type="button"
          variant="ghost"
          onClick={() =>
            a.id === "referral" && onReferralLinks ? onReferralLinks() : router.push(a.href)
          }
          className={cn(
            "h-auto min-h-0 w-fit justify-start rounded-full border-transparent px-3.5 py-1.5 shadow-none transition-colors duration-150",
            "[&>span]:flex [&>span]:w-fit [&>span]:items-center [&>span]:gap-1.5",
            a.primary ? "bg-primary-light hover:bg-primary-light/70" : "bg-muted hover:bg-muted/70"
          )}
        >
          <Icon
            name={a.icon}
            className={cn("h-3.5 w-3.5 shrink-0", a.primary ? "text-primary" : "text-foreground")}
            aria-hidden
          />
          <span
            className={cn(
              "whitespace-nowrap text-[13px] font-medium",
              a.primary ? "text-primary" : "text-foreground"
            )}
          >
            {a.label}
          </span>
        </Button>
      ))}
    </nav>
  );
}
