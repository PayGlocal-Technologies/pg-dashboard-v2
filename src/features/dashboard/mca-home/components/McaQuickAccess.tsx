"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { MidChoiceMenu } from "@/components/common/MidScopedAction";
import { usePacbMidScope } from "@/lib/hooks/usePacbMidScope";
import { cn } from "@/lib/utils";
import { mcaQuickAccessItems } from "@/features/dashboard/mca-home/constants";
import { FxCalculatorModal } from "@/features/dashboard/multi-currency/components/FxCalculatorModal";

/**
 * Where each tile goes. Two tiles are deliberately absent: "forex-calculator"
 * opens the calculator dialog in place (it is a modal, not a page, and the
 * dashboard mounts its own copy below rather than sending the merchant to
 * /multi-currency just to click it), and "customise-dashboard" calls straight
 * into this dashboard's own edit mode.
 */
const QUICK_ACCESS_ROUTES: Record<string, string> = {
  "invoice-links": "/create-invoice",
  // Virtual accounts is this app's international-accounts screen, there is no
  // separate /international-accounts route, see lib/navigation.ts.
  "international-accounts": "/multi-currency",
  // Closest real destination: /platforms is where marketplace and payout
  // platforms are connected. No withdrawal-specific page exists yet.
  "platform-withdrawal": "/platforms",
  "client-management": "/client-management",
};

// A loose row of independent shortcut pills, not a shared dashboard card —
// no enclosing border/background around the whole row, so the page's own
// background shows straight through between (and around) them; each pill
// carries its own stroke/fill instead (see quickAccessTileClass). Each pill
// sizes to its own label (`inline-flex` + `w-fit`, no equal-width grid
// column), so "Create invoice" stays visibly narrower than "International
// accounts" instead of both stretching to match. Wraps naturally onto a
// second line below `lg` rather than switching to a different layout —
// still just shortcuts, at any width.
const quickAccessRailClass = "flex flex-wrap items-center gap-1.5";

// flux's Button wraps every child in one inner <span> of its own (see the
// leftIcon note on ReadinessChecklist's Button usage) — without forcing that
// wrapper to flex/w-fit itself, the icon and text stack on top of each
// other instead of sitting side by side, and the pill would stretch full
// width instead of hugging its own label.
//
// Matches the reference's own pill treatment: fully rounded, no shadow on
// either variant (`shadow-none` overrides `secondary`'s default
// `shadow-sm`). The ghost/secondary tiles additionally get a slight
// `border-border` stroke (see the `!isPrimary` className below) — the
// primary tile keeps its own `border-primary`, already the same colour as
// its fill, so no override is needed there.
const quickAccessTileClass = cn(
  "h-auto min-h-0 w-fit justify-start rounded-full px-3.5 py-1.5 text-left shadow-none transition-colors duration-150",
  "[&>span]:flex [&>span]:w-fit [&>span]:items-center [&>span]:gap-1.5"
);

interface McaQuickAccessProps {
  /** Dashboard is currently in "customise" edit mode, hides the tile that
   * opens it (mirrors home/components/QuickAccess.tsx). */
  editMode?: boolean;
  onEditDashboard?: () => void;
}

/**
 * Shortcuts, not a card: one loose row of compact action pills sitting
 * directly under the greeting, above the main performance cards — see
 * McaDashboardFeature's own ordering comment for why this moved there.
 * `aria-label` carries the section's name instead of a visible heading,
 * since a "Quick actions" label above five short pills would outweigh the
 * pills themselves.
 */
export function McaQuickAccess({ editMode = false, onEditDashboard }: McaQuickAccessProps) {
  const router = useRouter();
  const [fxModalOpen, setFxModalOpen] = useState(false);
  const { needsMidChoice, midOptions, selectMid } = usePacbMidScope();

  /** The invoice editor addresses one MID in every request path, so this tile
   *  has to know which before it opens — see the MidChoiceMenu below. */
  function openInvoiceEditor(mid: string) {
    if (mid) selectMid(mid);
    router.push(QUICK_ACCESS_ROUTES["invoice-links"]!);
  }

  function handleAction(id: string) {
    if (id === "customise-dashboard") {
      onEditDashboard?.();
      return;
    }
    if (id === "forex-calculator") {
      setFxModalOpen(true);
      return;
    }
    const href = QUICK_ACCESS_ROUTES[id];
    if (href) router.push(href);
  }

  return (
    <nav aria-label="Quick actions" className="w-full">
      <div className={quickAccessRailClass}>
        {mcaQuickAccessItems.map((item) => {
          if (item.id === "customise-dashboard" && editMode) return null;

          // "Create invoice" is the one shortcut that duplicates the header's
          // own primary CTA, so it gets the primary (blue-filled) treatment
          // to match; every other tile uses `ghost` with an explicit
          // `bg-muted` fill — flux's own `secondary` variant carries a
          // visible border and shadow (see quickAccessTileClass's note),
          // neither of which the reference's flat grey pills have.
          const isPrimary = item.id === "invoice-links";

          // `title` carries the same description the old two-line layout
          // showed — still there on hover, just not taking up permanent
          // width/height.
          const tile = (
            <Button
              type="button"
              variant={isPrimary ? "primary" : "ghost"}
              title={item.description}
              className={cn(
                quickAccessTileClass,
                !isPrimary && "border-border bg-muted hover:bg-muted/70"
              )}
              {...(item.id === "invoice-links" && needsMidChoice
                ? {}
                : { onClick: () => handleAction(item.id) })}
            >
              <Icon
                name={item.icon}
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  isPrimary ? "text-primary-foreground" : "text-foreground"
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "whitespace-nowrap text-[13px] font-medium",
                  isPrimary ? "text-primary-foreground" : "text-foreground"
                )}
              >
                {item.label}
              </span>
            </Button>
          );

          // Raising an invoice needs a MID the editor can put in its request
          // paths. With several and none selected, the tile asks first instead
          // of the editor silently picking the merchant's first account.
          if (item.id === "invoice-links" && needsMidChoice) {
            return (
              <MidChoiceMenu
                key={item.id}
                align="start"
                midOptions={midOptions}
                onSelect={openInvoiceEditor}
              >
                {tile}
              </MidChoiceMenu>
            );
          }

          return <Fragment key={item.id}>{tile}</Fragment>;
        })}
      </div>

      <FxCalculatorModal open={fxModalOpen} onOpenChange={setFxModalOpen} />
    </nav>
  );
}
