"use client";

import type { ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  IconButton,
  Separator,
  VisuallyHidden,
  useBreakpoint,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableText } from "@/components/common/CopyableText";
import { CountryFlagAvatar } from "@/features/dashboard/multi-currency/components/CountryFlagAvatar";
import { clientAmountLocale } from "@/features/dashboard/client-management/constants";
import { formatCurrency, formatPhoneNumber, formatTransactionDateOnly } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { Client } from "@/features/dashboard/client-management/types";

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="shrink-0 text-[12px] text-muted-foreground">{label}</span>
      <div className="min-w-0 text-right text-[13px] text-foreground">{children}</div>
    </div>
  );
}

interface ClientDetailsDrawerProps {
  row: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The client details view a row click opens. Same presentation as the
 * Transactions drawer — a right-side panel above md, a bottom sheet below it,
 * via flux-ui's own Drawer `side` prop rather than a second component — and
 * rendered alongside the table rather than in place of it, so closing it
 * leaves the table's search, filters, and page exactly as they were.
 */
export function ClientDetailsDrawer({ row, open, onOpenChange }: ClientDetailsDrawerProps) {
  // A breakpoint read here can't cause a hydration mismatch: with open=false
  // Radix renders no portal and no content at all, so `side` has no effect on
  // the DOM until a row is clicked, which is client-only by definition.
  const { isBelow } = useBreakpoint();
  const isBottomSheet = isBelow("md");

  return (
    <Drawer open={open} onOpenChange={onOpenChange} side={isBottomSheet ? "bottom" : "right"}>
      {/* [&>button:last-child]:hidden — DrawerContent always appends its own
          close button pinned to the top-right; this header puts close on the
          left instead, so the built-in one is hidden rather than the drawer
          reimplemented to omit it. The width overrides apply to the right-side
          drawer only: as a bottom sheet the content already spans the full
          width via side="bottom"'s own inset-x-0/w-full. No "relative" here —
          DrawerContent's base class is already `fixed`, and twMerge would drop
          it in favour of a conflicting position utility. */}
      <DrawerContent
        className={cn(
          "[&>button:last-child]:hidden",
          !isBottomSheet && "w-full sm:w-[30rem] sm:max-w-[92vw]"
        )}
      >
        <DrawerTitle asChild>
          <VisuallyHidden>Client details</VisuallyHidden>
        </DrawerTitle>

        <DrawerHeader className="flex shrink-0 items-center gap-2 py-3">
          <IconButton aria-label="Close" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <Icon name="x" className="h-4 w-4" />
          </IconButton>
        </DrawerHeader>

        {/* Only this region scrolls, so close stays reachable however long the
            content runs. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          {row && (
            <>
              <div className="flex items-center gap-3">
                <CountryFlagAvatar
                  iso2={row.countryIso2}
                  countryName={row.countryName}
                  className="h-10 w-10"
                />
                <div className="min-w-0">
                  <h2 className="truncate text-[16px] font-semibold text-foreground">
                    {row.businessName}
                  </h2>
                  <p className="text-[12px] text-muted-foreground">{row.countryName}</p>
                </div>
              </div>

              {/* Outstanding leads the body rather than sitting in the field
                  list below it: it's the number the merchant opened this panel
                  to check, and the one thing here that changes on its own. */}
              <div className="mt-5 rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-[12px] text-muted-foreground">Outstanding</p>
                <p className="mt-0.5 text-[22px] font-semibold tabular-nums tracking-tight text-foreground">
                  {formatCurrency(
                    row.outstandingAmount,
                    row.outstandingCurrency,
                    clientAmountLocale(row.outstandingCurrency)
                  )}
                  <span className="ml-1.5 text-[12px] font-medium text-muted-foreground">
                    {row.outstandingCurrency}
                  </span>
                </p>
              </div>

              <p className="mt-6 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Contact
              </p>
              <Separator className="mt-2" />
              <DetailRow label="Primary contact">{row.primaryContactName}</DetailRow>
              <DetailRow label="Email">
                {/* Copyable, since an email address in a details panel is
                    almost always on its way into a message. */}
                <CopyableText value={row.email} className="justify-end" />
              </DetailRow>
              <DetailRow label="Phone number">
                <CopyableText
                  value={formatPhoneNumber(row.phoneDialCode, row.phoneNumber)}
                  className="justify-end"
                />
              </DetailRow>

              <p className="mt-6 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Account
              </p>
              <Separator className="mt-2" />
              <DetailRow label="Country">{row.countryName}</DetailRow>
              <DetailRow label="Created">{formatTransactionDateOnly(row.createdAt)}</DetailRow>
              <DetailRow label="Client ID">
                <CopyableText value={row.id} className="justify-end" />
              </DetailRow>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
