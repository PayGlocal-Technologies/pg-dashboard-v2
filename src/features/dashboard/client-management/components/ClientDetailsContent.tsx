"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui";
import { CopyableText } from "@/components/common/CopyableText";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import {
  clientAmountLocale,
  clientInvoiceMetrics,
} from "@/features/dashboard/client-management/constants";
import { formatCurrency, formatPhoneNumber, formatTransactionDateOnly } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { Client } from "@/features/dashboard/client-management/types";

// Every section of the client detail view, built as the same "title outside +
// card inside" modules the Transaction Details page uses, with the same
// uppercase section headings and Card size="sm" surfaces. Rendered as-is by
// both ClientDetailsDrawer and ClientDetailsPage (see ClientDetailsContent at
// the bottom), so neither view can drift from the other — only the
// arrangement differs between them, exactly as it does for transactions.

function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3
      className={cn(
        "mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
        className
      )}
    >
      {children}
    </h3>
  );
}

/**
 * A single label/value field: the Transaction Details page's own DetailRow,
 * copied class for class — label above, value directly beneath, gap-1 between
 * the two, and nothing dividing one field from the next, so the vertical
 * rhythm comes entirely from the parent's space-y. One arrangement, used by
 * both the drawer and the page, which is what makes the client details column
 * read as the same component as the Payment/Sender Details column beside a
 * transaction.
 */
function ClientDetailRow({ label, value }: { label: string; value: ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-foreground">
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
export function ClientIdentitySummary({ client, className }: { client: Client; className?: string }) {
  return (
    // No second column opposite the stack: the identity stays one narrow
    // group at the left of whatever column holds it, rather than spreading
    // across the width. Same structure as the transaction summary — country
    // mark, mt-1.5, then the headline and its supporting lines.
    <div className={className}>
      {/* The Transaction Details flag treatment, exactly: CountryFlag (the
          rectangular 20×14 CDN flag with its rounded-sm border) beside the
          country name in muted 13px, laid out with the same
          flex/min-w-max/gap-1.5 as CountryCell, which is what the transaction
          summary renders. Not CountryCell itself only because the name is
          already on the client record, so there's nothing to resolve through
          the country/currency store — the output is identical. Never a
          circular avatar. */}
      <div className="flex min-w-max items-center gap-1.5">
        <CountryFlag iso2={client.countryIso2} alt={client.countryName} />
        <span className="text-[13px] whitespace-nowrap text-muted-foreground">
          {client.countryName}
        </span>
      </div>

      {/* mt-1.5 then a tight gap-1.5 inside, the same rhythm the transaction
          summary uses between its country mark, amount, and "Charged by" line:
          the identity elements read as one group, per the "group by proximity"
          hierarchy. */}
      <div className="mt-1.5 flex flex-col items-start gap-1.5">
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
  );
}

/**
 * One KPI tile, deliberately dense: three tightly stacked lines rather than
 * the tall icon/title/figure/description column the page-level analytics cards
 * use (see OutstandingAmountCard). Same Card surface, same tabular-nums figure
 * in foreground weight against a muted label, but roughly half the height.
 *
 * What buys that back, in order of effect: the unit moves out of the label and
 * onto the figure's own baseline ("Total completed" / "41 invoices" instead of
 * "Total completed invoices" over "41"), which stops the label wrapping to two
 * or three lines in a narrow column; Card's px-7 py-7 is overridden down to
 * px-4 py-3.5; the figure steps from text-3xl to text-2xl; and the supporting
 * amount sits directly under the figure it qualifies rather than being pushed
 * to the card's bottom edge by mt-auto. gap-1 throughout keeps label, figure,
 * and caption reading as one unit.
 *
 * h-full is what keeps all three equal in height when only one carries a
 * caption — the grid stretches every card to the tallest.
 */
function ClientMetricCard({
  label,
  value,
  caption,
}: {
  label: string;
  /** The dominant figure. "invoices" trails it on the same baseline, so the
   *  two read as one phrase ("41 invoices") and the label doesn't have to
   *  carry the noun. */
  value: number;
  /** Optional supporting line directly below the figure. */
  caption?: string;
}) {
  return (
    <Card size="sm" className="h-full w-full px-4 py-3.5">
      <CardContent className="flex h-full flex-1 flex-col">
        <p className="text-[12px] text-muted-foreground">{label}</p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
            {value}
          </span>
          <span className="text-[12px] text-muted-foreground">invoices</span>
        </p>
        {caption && (
          <p className="mt-1 text-[12px] tabular-nums text-muted-foreground">{caption}</p>
        )}
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
export function ClientInvoiceMetrics({
  client,
  floatTitle = false,
}: {
  client: Client;
  /**
   * Lifts the section heading out of the flow (from lg up, where the expanded
   * view's two columns exist), so this section's box is exactly the KPI row's
   * box and the details column beside it starts level with the cards rather
   * than with the heading above them. The same device, for the same reason, as
   * the Transaction Details page's own `floatTitle` — an alternative to
   * offsetting the neighbouring column, which would only be correct at one
   * heading height. Below lg, and in the drawer's single column, the heading
   * stays in normal flow.
   */
  floatTitle?: boolean;
}) {
  const metrics = clientInvoiceMetrics(client);
  const outstandingLabel = formatCurrency(
    client.outstandingAmount,
    client.outstandingCurrency,
    clientAmountLocale(client.outstandingCurrency)
  );

  return (
    <section className={cn(floatTitle && "lg:relative")}>
      <SectionTitle className={floatTitle ? "lg:absolute lg:-top-7 lg:left-0 lg:mb-0" : undefined}>
        Invoice summary
      </SectionTitle>
      <div className="grid gap-4 sm:grid-cols-3">
        <ClientMetricCard label="Total completed" value={metrics.total} />
        <ClientMetricCard label="Paid" value={metrics.paid} />
        {/* The one card carrying a caption: the count alone doesn't say how
            much is actually owed, which is the figure a merchant chasing this
            client needs. Same value as the table's Outstanding column; the
            currency code is left off since formatCurrency's symbol already
            carries it (and falls back to the code where there's no symbol). */}
        <ClientMetricCard
          label="Outstanding"
          value={metrics.outstanding}
          caption={`${outstandingLabel} due`}
        />
      </div>
    </section>
  );
}

// Both sections below use Card size="sm" and CardContent's space-y-4 — the
// same container and the same field rhythm as the Transaction Details page's
// Payment Details and Sender Details sections, so the two detail views' side
// columns are literally the same module with different fields. size="sm" is
// already the tighter of Card's two paddings (gap-6 px-7 py-7 against the
// default's px-10 py-10); anything narrower would be an arbitrary override
// rather than a Flux token.

export function ClientContactSection({ client }: { client: Client }) {
  return (
    <section>
      <SectionTitle>Contact</SectionTitle>
      <Card size="sm">
        <CardContent className="space-y-4">
          <ClientDetailRow label="Primary contact" value={client.primaryContactName} />
          {/* Copyable, since an address or number in a details panel is almost
              always on its way into a message. CopyableText's own button stops
              at its own click handler, so a copy never reaches whatever row or
              card this sits inside. whitespace-normal/break-all overrides its
              default nowrap so a long address wraps within the column instead
              of overflowing the card. */}
          <ClientDetailRow
            label="Email"
            value={
              <CopyableText
                value={client.email}
                valueClassName="whitespace-normal break-all text-left"
              />
            }
          />
          <ClientDetailRow
            label="Phone number"
            value={<CopyableText value={formatPhoneNumber(client.phoneDialCode, client.phoneNumber)} />}
          />
        </CardContent>
      </Card>
    </section>
  );
}

export function ClientAccountSection({ client }: { client: Client }) {
  return (
    <section>
      <SectionTitle>Account</SectionTitle>
      <Card size="sm">
        <CardContent className="space-y-4">
          <ClientDetailRow label="Country" value={client.countryName} />
          <ClientDetailRow label="Created" value={formatTransactionDateOnly(client.createdAt)} />
          <ClientDetailRow label="Client ID" value={<CopyableText value={client.id} />} />
        </CardContent>
      </Card>
    </section>
  );
}

interface ClientDetailsContentProps {
  client: Client;
  /** "page" (default): the expanded view's 2/3 main + 1/3 details grid.
   *  "drawer": single column, everything stacked in document order, for the
   *  narrower drawer viewport. */
  layout?: "page" | "drawer";
  /**
   * The client's transactions section, composed by whichever view is rendering
   * (each owns the transaction drawer state it needs) but positioned here, so
   * this module stays the single description of how a client's details are
   * arranged. Both layouts place it identically: directly below the invoice
   * metrics, above Contact.
   */
  transactionsSlot?: ReactNode;
}

export function ClientDetailsContent({
  client,
  layout = "page",
  transactionsSlot,
}: ClientDetailsContentProps) {
  if (layout === "drawer") {
    // Single column, in the same priority order the expanded view uses:
    // identity → metrics → transactions → contact → account. The drawer is now
    // the same content at one column wide rather than a reduced subset, so the
    // two states read as two levels of one experience; its scroll container
    // (see ClientDetailsDrawer) is what absorbs the extra height.
    return (
      <div className="space-y-6">
        <ClientIdentitySummary client={client} />
        <ClientInvoiceMetrics client={client} />
        {transactionsSlot}
        <ClientContactSection client={client} />
        <ClientAccountSection client={client} />
      </div>
    );
  }

  // 2/3 main + 1/3 details, with the left column's three blocks placed in
  // explicit grid rows rather than stacked inside one div. That's what lets the
  // details column start at row 2 — its top edge landing exactly on the KPI
  // row's, since both are row 2 of the same grid and share its gap — instead of
  // at the summary. Same technique (and same reason) as the Transaction Details
  // page's own ROW_START/ROW_SPAN placement. It spans rows 2 and 3 so the
  // grid's row-height algorithm can distribute its height across both rather
  // than forcing it all into one.
  //
  // Below lg the grid collapses to a single column and the natural document
  // order is already the required mobile order; items-start keeps every block
  // sized to its own content instead of stretching to its row's tallest.
  //
  // gap-y-8 throughout: still far tighter than the transaction page's
  // space-y-9, and wide enough for the Invoice summary heading to sit in the
  // gap above its own row (see floatTitle below) with clearance from the
  // summary above it. The heading ends up ~12px from the cards it labels and
  // further from the block above, so it groups downward, with its section.
  return (
    <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[2fr_1fr] lg:items-start">
      <div className="lg:col-start-1 lg:row-start-1">
        <ClientIdentitySummary client={client} />
      </div>

      {/* floatTitle: this row's box is exactly the KPI cards' box, so the
          details column starting at row 2 aligns with the cards themselves
          rather than with the heading above them. */}
      <div className="lg:col-start-1 lg:row-start-2">
        <ClientInvoiceMetrics client={client} floatTitle />
      </div>

      <div className="lg:col-start-1 lg:row-start-3">{transactionsSlot}</div>

      {/* Supporting detail, deliberately secondary to the column beside it:
          narrower, no KPI figures, and carrying only the two reference
          modules — the same role, and the same label-above-value fields, as
          the Payment/Sender Details column on a transaction. Starts level with
          the KPI cards, not with the summary. */}
      <div className="space-y-6 lg:col-start-2 lg:row-start-2 lg:row-span-2">
        <ClientContactSection client={client} />
        <ClientAccountSection client={client} />
      </div>
    </div>
  );
}
