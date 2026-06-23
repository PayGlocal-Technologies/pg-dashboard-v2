"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";

type QuickActionId =
  | "payment-link"
  | "invoice"
  | "invite-teammate"
  | "fx-calculator"
  | "international-accounts"
  | "manage-dispute";

type QuickActionItem = {
  id: QuickActionId;
  label: string;
  icon: IconName;
};

const quickActions: QuickActionItem[] = [
  { id: "payment-link", label: "Create payment link", icon: "link" },
  { id: "invoice", label: "Create invoice", icon: "receipt" },
  { id: "invite-teammate", label: "Invite teammate", icon: "user-plus" },
  { id: "fx-calculator", label: "FX calculator", icon: "circle-dollar-sign" },
  { id: "international-accounts", label: "International accounts", icon: "globe-2" },
  { id: "manage-dispute", label: "Manage dispute", icon: "scale" },
];

// Mirrors Nova's quickAccessCardClass. Applied via Button's className override so
// the Flux Button renders as Nova's bordered tile (no variant background bleed).
const quickAccessCardClass = cn(
  "group flex h-auto w-[9rem] shrink-0 flex-col items-start gap-2 rounded-xl border border-border bg-card text-left sm:w-[9.25rem]",
  "px-3.5 pb-2.5 pt-3.5 shadow-sm transition-shadow duration-150",
  "hover:bg-muted/40 hover:shadow"
);

type QuickAccessProps = {
  onAction?: (id: QuickActionId) => void;
  onEditDashboard?: () => void;
  editMode?: boolean;
  /** @deprecated legacy alias for `onEditDashboard`; kept for the existing dashboard caller. */
  onOpenWidgetLibrary?: () => void;
};

// Router fallbacks used only when no `onAction` callback is supplied.
const ACTION_ROUTES: Record<QuickActionId, string> = {
  "payment-link": "/payment-links/create",
  invoice: "/invoices/create",
  "invite-teammate": "/settings/team",
  "fx-calculator": "/fx-calculator",
  "international-accounts": "/international-accounts",
  "manage-dispute": "/disputes",
};

export function QuickAccess({
  onAction,
  onEditDashboard,
  editMode = false,
  onOpenWidgetLibrary,
}: QuickAccessProps) {
  const router = useRouter();
  const handleEditDashboard = onEditDashboard ?? onOpenWidgetLibrary;

  const handleAction = (id: QuickActionId) => {
    if (onAction) {
      onAction(id);
      return;
    }
    router.push(ACTION_ROUTES[id]);
  };

  return (
    <div className="w-full">
      <h2 className="mb-3 text-[15px] font-semibold tracking-[-0.02em] text-foreground sm:text-base">
        Quick access
      </h2>

      <div className="w-fit max-w-full">
        <div className="flex flex-wrap gap-2.5">
          {quickActions.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => handleAction(item.id)}
              className={quickAccessCardClass}
            >
              <Icon name={item.icon} className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="text-left text-[11px] font-medium leading-snug text-foreground sm:text-xs">
                {item.label}
              </span>
            </Button>
          ))}

          {handleEditDashboard != null && !editMode && (
            <Button
              variant="ghost"
              onClick={handleEditDashboard}
              className={cn(quickAccessCardClass, "w-[9.25rem] sm:w-[9.75rem]")}
              aria-label="Customise your dashboard layout"
            >
              <Icon name="settings" className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="text-left text-[11px] font-medium leading-snug text-foreground sm:text-xs">
                Customise dashboard
              </span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
