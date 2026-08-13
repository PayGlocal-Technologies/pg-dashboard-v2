"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui";
import { CopyableText } from "@/components/common/CopyableText";
import { CountryFlagAvatar } from "@/features/dashboard/multi-currency/components/CountryFlagAvatar";
import {
  clientAmountLocale,
  clientInvoiceMetrics,
} from "@/features/dashboard/client-management/constants";
import { formatCurrency, formatPhoneNumber, formatTransactionDateOnly } from "@/lib/utils/format";
import type { Client } from "@/features/dashboard/client-management/types";

// Every section of the client detail view, built as the same "title outside +
// card inside" modules the Transaction Details page uses, with the same
// uppercase section headings and Card size="sm" surfaces. Rendered as-is by
// both ClientDetailsDrawer and ClientDetailsPage (see ClientDetailsContent at
// the bottom), so neither view can drift from the other — only the
// arrangement differs between them, exactly as it does for transactions.

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

/** Which way a field's label and value are arranged. See ClientDetailRow. */
type DetailRowVariant = "stacked" | "inline";

/**
 * A single label/value field, in one of two arrangements:
 *
 * - "stacked" (the expanded page's details column) is the Transaction Details
 *   page's own DetailRow, copied class for class: label above, value directly
 *   beneath, gap-1 between the two, and nothing dividing one field from the
 *   next — the vertical rhythm comes entirely from the parent's space-y. This
 *   is what makes the client details column read as the same component as the
 *   Payment/Sender Details column beside a transaction.
 * - "inline" (the drawer) keeps the label opposite its value on one line, the
 *   arrangement the drawer already shipped with. `items-start` plus a shrink-0
 *   label lets a long value wrap inside its own half rather than pushing the
 *   label out of the card.
 */
function ClientDetailRow({
  label,
  value,
  variant,
}: {
  label: string;
  value: ReactNode;
  variant: DetailRowVariant;
}) {
  if (value == null || value === "") return null;

  if (variant === "stacked") {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[12px] text-muted-foreground">{label}</span>
        <div className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-foreground">
          {value}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-[12px] text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center justify-end gap-1.5 text-right text-[13px] font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}

/**
 * The client's identity, as a vertical stack: flag, business name, then the
 * contact's name, phone, and email. Mirrors the transaction summary's own
 * hierarchy — country mark, then the headline value at text-[26px], then
 * supporting context in muted text-[13px] beneath it — so the two detail views
 * read as the same page type. The business name takes the slot (and the
 * weight) the transaction amount has there, because it is what identifies this
 * record.
 */
export function ClientIdentitySummary({
  client,
  showOutstanding = false,
  className,
}: {
  client: Client;
  /**
   * Renders the client's outstanding balance opposite the identity stack.
   * Drawer only: on the expanded page the identity block stays a single
   * narrow stack rather than spanning the column, and the outstanding figure
   * is carried by the Outstanding invoices KPI beneath it instead.
   */
  showOutstanding?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      {/* flex-wrap rather than a hard breakpoint: the outstanding figure drops
          below the identity stack on its own once the row runs out of width
          (the drawer's narrower viewport), instead of being hidden outright —
          the same treatment the transaction summary gives its own date. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <CountryFlagAvatar
            iso2={client.countryIso2}
            countryName={client.countryName}
            className="h-10 w-10"
          />
          {/* mt-3 then a tight gap-1.5 inside: the five elements read as one
              identity group, per the "group by proximity" hierarchy, with the
              only real step being between the flag and the name it belongs
              to. */}
          <div className="mt-3 flex flex-col items-start gap-1.5">
            <h2 className="text-[26px] font-semibold leading-tight tracking-tight text-foreground">
              {client.businessName}
            </h2>
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-medium text-foreground">
                {client.primaryContactName}
              </span>
              <span className="text-[13px] tabular-nums text-muted-foreground">
                {formatPhoneNumber(client.phoneDialCode, client.phoneNumber)}
              </span>
              <span className="text-[13px] break-all text-muted-foreground">{client.email}</span>
            </div>
          </div>
        </div>

        {/* Opposite the identity stack, top-aligned with it via the row's
            items-start: the client's own headline number, the same figure the
            table's Outstanding column shows. Right-aligned so it reads as a
            value rather than a second identity element. */}
        {showOutstanding && (
          <div className="shrink-0 text-right">
            <p className="text-[12px] text-muted-foreground">Outstanding</p>
            <p className="mt-0.5 text-[20px] font-semibold tabular-nums tracking-tight text-foreground">
              {formatCurrency(
                client.outstandingAmount,
                client.outstandingCurrency,
                clientAmountLocale(client.outstandingCurrency)
              )}
              <span className="ml-1.5 text-[12px] font-medium text-muted-foreground">
                {client.outstandingCurrency}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * One KPI tile. Same Card surface, tabular-nums, and text-3xl figure as the
 * product's existing analytics cards (see OutstandingAmountCard/
 * SavedAmountCard), with the label muted and the number in foreground weight
 * so the figure is unambiguously the strongest element. h-full plus the
 * flex column is what keeps the three equal in height whatever their labels
 * wrap to.
 */
function ClientMetricCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: number;
  /** Optional supporting line pinned to the card's bottom edge (mt-auto),
   *  matching the existing analytics cards' own description placement. */
  caption?: string;
}) {
  return (
    <Card size="sm" className="h-full w-full">
      <CardContent className="flex h-full flex-1 flex-col">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
          {value}
        </p>
        {caption && <p className="mt-auto pt-4 text-[12px] tabular-nums text-muted-foreground">{caption}</p>}
      </CardContent>
    </Card>
  );
}

/**
 * The three invoice figures, in a row that collapses to a single column on
 * narrow viewports (the existing responsive card pattern). Outstanding is
 * derived from the other two rather than stored, so the row always adds up —
 * see clientInvoiceMetrics.
 */
export function ClientInvoiceMetrics({ client }: { client: Client }) {
  const metrics = clientInvoiceMetrics(client);
  const outstandingLabel = formatCurrency(
    client.outstandingAmount,
    client.outstandingCurrency,
    clientAmountLocale(client.outstandingCurrency)
  );

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <ClientMetricCard label="Total completed invoices" value={metrics.total} />
      <ClientMetricCard label="Paid invoices" value={metrics.paid} />
      {/* The one card carrying a caption: the count alone doesn't say how much
          is actually owed, which is the figure a merchant chasing this client
          needs. Same value as the table's Outstanding column. */}
      <ClientMetricCard
        label="Outstanding invoices"
        value={metrics.outstanding}
        caption={`${outstandingLabel} ${client.outstandingCurrency} due`}
      />
    </div>
  );
}

// Both sections below use Card size="sm" and CardContent's space-y-4 — the
// same container and the same field rhythm as the Transaction Details page's
// Payment Details and Sender Details sections, so the two detail views' side
// columns are literally the same module with different fields. size="sm" is
// already the tighter of Card's two paddings (gap-6 px-7 py-7 against the
// default's px-10 py-10); anything narrower would be an arbitrary override
// rather than a Flux token.

export function ClientContactSection({
  client,
  variant = "stacked",
}: {
  client: Client;
  variant?: DetailRowVariant;
}) {
  return (
    <section>
      <SectionTitle>Contact</SectionTitle>
      <Card size="sm">
        <CardContent className="space-y-4">
          <ClientDetailRow
            label="Primary contact"
            value={client.primaryContactName}
            variant={variant}
          />
          {/* Copyable, since an address or number in a details panel is almost
              always on its way into a message. CopyableText's own button stops
              at its own click handler, so a copy never reaches whatever row or
              card this sits inside. whitespace-normal/break-all overrides its
              default nowrap so a long address wraps within the column instead
              of overflowing the card. */}
          <ClientDetailRow
            label="Email"
            variant={variant}
            value={
              <CopyableText
                value={client.email}
                className={variant === "inline" ? "justify-end" : undefined}
                valueClassName="whitespace-normal break-all text-left"
              />
            }
          />
          <ClientDetailRow
            label="Phone number"
            variant={variant}
            value={<CopyableText value={formatPhoneNumber(client.phoneDialCode, client.phoneNumber)} />}
          />
        </CardContent>
      </Card>
    </section>
  );
}

export function ClientAccountSection({
  client,
  variant = "stacked",
}: {
  client: Client;
  variant?: DetailRowVariant;
}) {
  return (
    <section>
      <SectionTitle>Account</SectionTitle>
      <Card size="sm">
        <CardContent className="space-y-4">
          <ClientDetailRow label="Country" value={client.countryName} variant={variant} />
          <ClientDetailRow
            label="Created"
            value={formatTransactionDateOnly(client.createdAt)}
            variant={variant}
          />
          <ClientDetailRow
            label="Client ID"
            value={<CopyableText value={client.id} />}
            variant={variant}
          />
        </CardContent>
      </Card>
    </section>
  );
}

interface ClientDetailsContentProps {
  client: Client;
  /** "page" (default): the 1/3 details + 2/3 main grid of the expanded view.
   *  "drawer": single column, everything stacked in document order, for the
   *  narrower drawer viewport. */
  layout?: "page" | "drawer";
  /**
   * The client's transactions section, composed by ClientDetailsPage (which
   * owns the transaction drawer/expanded state it needs) but positioned here,
   * so this module stays the single description of how the expanded view is
   * arranged. Page layout only — the drawer is the condensed view and doesn't
   * carry a transaction list.
   */
  transactionsSlot?: ReactNode;
}

export function ClientDetailsContent({
  client,
  layout = "page",
  transactionsSlot,
}: ClientDetailsContentProps) {
  if (layout === "drawer") {
    // Single column, in document order, unchanged: the drawer keeps its own
    // inline label/value rows and its outstanding figure beside the identity
    // stack. The invoice metrics and the transactions list don't render here
    // at all — they're what Expand reveals, the same relationship the
    // transaction drawer has with its own Payment/Sender Details.
    return (
      <div className="space-y-9">
        <ClientIdentitySummary client={client} showOutstanding />
        <ClientContactSection client={client} variant="inline" />
        <ClientAccountSection client={client} variant="inline" />
      </div>
    );
  }

  // 2/3 main + 1/3 details. The main column is both first in the DOM and in
  // column 1, so nothing needs reordering at any width: from lg up it takes
  // the wider left track, and below lg the grid collapses to the single column
  // whose document order is already the required mobile order (identity →
  // metrics → transactions → contact → account). Explicit row-start-1 on both
  // keeps their top edges aligned; items-start keeps each sized to its own
  // content rather than stretching to match the taller one.
  //
  // Spacing runs tighter than the transaction page's own space-y-9: gap-6
  // inside each column keeps summary/metrics/transactions reading as one
  // column of related blocks, while the wider gap-y-8 between the columns (the
  // only gap that shows once they stack) separates the main content from the
  // supporting details.
  return (
    <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[2fr_1fr] lg:items-start">
      <div className="space-y-6 lg:col-start-1 lg:row-start-1">
        <ClientIdentitySummary client={client} />
        <ClientInvoiceMetrics client={client} />
        {transactionsSlot}
      </div>

      {/* Supporting detail, deliberately secondary to the column beside it:
          narrower, no KPI figures, and carrying only the two reference
          modules — the same role, and the same label-above-value fields, as
          the Payment/Sender Details column on a transaction. */}
      <div className="space-y-6 lg:col-start-2 lg:row-start-1">
        <ClientContactSection client={client} />
        <ClientAccountSection client={client} />
      </div>
    </div>
  );
}
