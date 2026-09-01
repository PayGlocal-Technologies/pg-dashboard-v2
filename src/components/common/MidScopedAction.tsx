"use client";

import { useState, type ReactElement } from "react";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon/registry";
import { MidAvatar, MID_STATUS_DOT } from "@/components/common/MidAvatar";
import { useApp } from "@/stores/useApp";
import { cn } from "@/lib/utils";

/**
 * One account, as the merchant knows it.
 *
 * A bare MID (`ptplbhavyaba9130`) is not how anyone identifies their own
 * business — it is a database key, and three of them stacked in a plain list is
 * a lookup puzzle, not a choice. The store already holds the trade name, the
 * merchant's own tag for it and its status (see MidConfig / tidsInfo), so the
 * row leads with the name the sidebar's selector shows and keeps the MID
 * underneath as the confirming detail.
 */
function MidRow({
  mid,
  name,
  status,
  onSelect,
}: {
  mid: string;
  name: string;
  status: string;
  onSelect: (mid: string) => void;
}) {
  const isDisabled = status === "DISABLED";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isDisabled}
      onClick={() => onSelect(mid)}
      className={cn(
        "h-auto min-h-0 w-full justify-start gap-2.5 rounded-xl px-2 py-2 text-left font-normal",
        // Button puts its children in a plain non-flex <span>; this is what lets
        // the avatar and the two text lines sit side by side inside it instead
        // of stacking, the same override the readiness checklist's rows use.
        "[&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-2.5"
      )}
    >
      <MidAvatar name={name} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: MID_STATUS_DOT[status] ?? MID_STATUS_DOT.DISABLED }}
          />
          <span className="truncate text-[12.5px] font-medium text-foreground">{name}</span>
        </span>
        {/* Only worth a line of its own when it is not already the heading. */}
        {name !== mid && (
          <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
            {mid}
          </span>
        )}
      </span>
    </Button>
  );
}

/**
 * The list of accounts to pick from. Shared by the popover below and by
 * SelectMidView, which renders it inline on surfaces that have no sidebar to
 * point the merchant at.
 */
export function MidChoiceList({
  midOptions,
  onSelect,
  className,
}: {
  midOptions: string[];
  onSelect: (mid: string) => void;
  className?: string;
}) {
  // Read once for the whole list rather than once per row: the lookup is the
  // same array every time, and a store subscription per option buys nothing.
  const tidsInfo = useApp((s) => s.tidsInfo);

  return (
    <div className={cn("space-y-0.5", className)}>
      {midOptions.map((mid) => {
        const info = tidsInfo.find((t) => t.mid === mid);
        return (
          <MidRow
            key={mid}
            mid={mid}
            // Falls back to the MID itself, so an account missing from tidsInfo
            // is still pickable rather than drawing as a blank row.
            name={info?.displayTag || info?.tradeName || mid}
            status={info?.status ?? "ACTIVE"}
            onSelect={onSelect}
          />
        );
      })}
    </div>
  );
}

/**
 * Turns any control into "pick a merchant ID, then run".
 *
 * The trigger is whatever the caller already draws — a header button, a table's
 * primary CTA, a dashboard tile — so a MID question can be attached to a control
 * without that control being redesigned into one shape. The caller decides
 * *whether* to wrap (see `needsMidChoice` on usePacbMidScope); this only
 * describes what the asking looks like.
 *
 * A Popover rather than a DropdownMenu: the rows are two-line records with an
 * avatar and a status dot, which is a panel, not a menu of commands.
 *
 * `children` must be a single element that forwards ref and props, because
 * PopoverTrigger's `asChild` clones it to attach the trigger wiring.
 */
export function MidChoiceMenu({
  midOptions,
  onSelect,
  align = "end",
  children,
}: {
  midOptions: string[];
  onSelect: (mid: string) => void;
  align?: "start" | "center" | "end";
  children: ReactElement;
}) {
  // Held here, because a Popover does not close on a click inside it the way a
  // DropdownMenu's item does — picking an account has to dismiss the panel, or
  // the action runs with the picker still sitting over the page.
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      {/* Standard scale, not an arbitrary value — see the note on the readiness
          checklist's own PopoverContent for why that matters here. */}
      <PopoverContent align={align} collisionPadding={8} className="w-72 p-2">
        <div className="px-2 pb-1.5 pt-1">
          <p className="text-[12.5px] font-semibold text-foreground">Which account?</p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
            You hold more than one. Pick the one this belongs to.
          </p>
        </div>
        <MidChoiceList
          midOptions={midOptions}
          onSelect={(mid) => {
            setOpen(false);
            onSelect(mid);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * One action, in whichever form the merchant's account shape calls for.
 *
 * With a single PACB MID (or one already selected) it is a plain button that
 * acts. With several and none selected, the same action first has to be told
 * which account it applies to, so it becomes a picker and the pick is what runs
 * it. pg-dashboard does this with its ChooseMidSelect.
 *
 * Lifted here from client-management and sku-management, which each carried
 * their own copy, because the create-invoice entry points need the identical
 * control and three copies of a branch is three chances for them to drift.
 */
export function MidScopedAction({
  label,
  icon,
  variant,
  size = "sm",
  isLoading,
  className,
  needsMidChoice,
  midOptions,
  onRun,
}: {
  label: string;
  icon: IconName;
  variant: "primary" | "ghost" | "outline" | "secondary";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  className?: string;
  needsMidChoice: boolean;
  midOptions: string[];
  /** Called with the chosen MID, or "" when there was nothing to choose. */
  onRun: (mid: string) => void;
}) {
  const glyph = <Icon name={icon} className="h-3.5 w-3.5" />;

  // No onClick in the choice form: the trigger's own click has to open the
  // picker, and a handler here would run the action before a MID was chosen.
  const trigger = (
    <Button
      type="button"
      variant={variant}
      size={size}
      isLoading={isLoading}
      leftIcon={glyph}
      className={className}
      {...(needsMidChoice ? {} : { onClick: () => onRun("") })}
    >
      {label}
    </Button>
  );

  if (!needsMidChoice) return trigger;

  return (
    <MidChoiceMenu midOptions={midOptions} onSelect={onRun}>
      {trigger}
    </MidChoiceMenu>
  );
}
