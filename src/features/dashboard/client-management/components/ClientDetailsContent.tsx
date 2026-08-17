"use client";

import type { ReactNode } from "react";
import { Card, CardContent, Separator } from "@/components/ui";
import { CopyableText } from "@/components/common/CopyableText";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import {
  clientAmountLocale,
  clientInvoiceMetrics,
} from "@/features/dashboard/client-management/constants";
import { formatCurrency, formatPhoneNumber } from "@/lib/utils/format";
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
        {/* Contact, phone, and email on one line rather than stacked: the
            contact's name carries foreground weight and a vertical rule after
            it, then the two ways to reach them in muted text. flex-wrap with
            gap-y-1 lets the line break naturally at narrow widths — the
            drawer's column, or a phone — while keeping the order, rather than
            forcing a horizontal scroll. items-center so the rule sits centred
            against the text either side of it. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[13px] font-medium text-foreground">
            {client.primaryContactName}
          </span>
          {/* h-4 rather than Separator's own h-full for a vertical rule: there
              is no fixed row height here to fill, and a wrapped line would
              otherwise stretch it. */}
          <Separator orientation="vertical" className="h-4" />
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
  // min-w-0 so the three cards can narrow with the column that holds them,
  // rather than the row's min-content width becoming a floor that overflows it.
  // Their labels wrap instead.
  return (
    <Card size="sm" className="h-full w-full min-w-0 px-4 py-3.5">
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
   * box and the row it sits in starts at the cards rather than at the heading
   * above them. The same device, for the same reason, as the Transaction
   * Details page's own `floatTitle` — an alternative to offsetting the
   * neighbouring column, which would only ever be correct at one heading
   * height. Below lg, and in the drawer's single column, the heading stays in
   * normal flow.
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
      {/* gap-3 at the widths where the main column is tightest, opening to
          gap-4 from xl — the same proportional easing the grid's own column
          gap uses. */}
      <div className="grid gap-3 sm:grid-cols-3 xl:gap-4">
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

/**
 * Overrides CopyableText's own font-mono/regular-weight value styling so a
 * copyable value in the Contact card renders in exactly the typography
 * ClientDetailRow gives every other value: the app's sans stack (font-sans →
 * --font-geist-sans, the same family Transaction Details' own field values
 * use), at the row's 13px/medium/foreground. Only the family, weight, and
 * wrapping are set here — size and colour already come from the row.
 * whitespace-normal cancels CopyableText's nowrap so a long address can wrap
 * inside the column rather than overflowing the card.
 */
const CONTACT_VALUE_CLASS = "font-sans font-medium whitespace-normal break-all";

// Both sections below use Card size="sm" and CardContent's space-y-4 — the
// same container and the same field rhythm as the Transaction Details page's
// Payment Details and Sender Details sections, so the two detail views' side
// columns are literally the same module with different fields. size="sm" is
// already the tighter of Card's two paddings (gap-6 px-7 py-7 against the
// default's px-10 py-10); anything narrower would be an arbitrary override
// rather than a Flux token.

export function ClientContactSection({
  client,
  floatTitle = false,
}: {
  client: Client;
  /** Lifts the heading out of the flow from lg up, so this section's box is
   *  exactly its card's box and the card's top edge — not the heading above
   *  it — lands level with the KPI cards across the grid. Same device, and
   *  same offset, as ClientInvoiceMetrics' own floatTitle. */
  floatTitle?: boolean;
}) {
  return (
    <section className={cn(floatTitle && "lg:relative")}>
      <SectionTitle className={floatTitle ? "lg:absolute lg:-top-7 lg:left-0 lg:mb-0" : undefined}>
        Contact
      </SectionTitle>
      <Card size="sm">
        <CardContent className="space-y-4">
          <ClientDetailRow label="Primary contact" value={client.primaryContactName} />
          {/* Copyable, since an address or number in a details panel is almost
              always on its way into a message. CopyableText's own button stops
              at its own click handler, so a copy never reaches whatever row or
              card this sits inside.
              CONTACT_VALUE_CLASS is what keeps these values in the same
              typeface as the plain ones above and below them: CopyableText
              defaults to font-mono, which is right for an opaque identifier
              (a transaction id) but makes an email or a phone number read as a
              different kind of text than the rest of the card. */}
          <ClientDetailRow
            label="Email"
            value={<CopyableText value={client.email} valueClassName={CONTACT_VALUE_CLASS} />}
          />
          <ClientDetailRow
            label="Phone number"
            value={
              <CopyableText
                value={formatPhoneNumber(client.phoneDialCode, client.phoneNumber)}
                valueClassName={CONTACT_VALUE_CLASS}
              />
            }
          />
          {/* Not copyable and not truncated: an address is read, not lifted
              into a form field, and it's the one field here long enough to
              need more than a line. */}
          <ClientDetailRow
            label="Billing address"
            value={<span className="whitespace-normal">{client.billingAddress}</span>}
          />
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
    // identity → metrics → transactions → contact. The drawer is the same
    // content at one column wide rather than a reduced subset, so the two
    // states read as two levels of one experience; its scroll container (see
    // ClientDetailsDrawer) is what absorbs the extra height.
    return (
      <div className="space-y-6">
        <ClientIdentitySummary client={client} />
        <ClientInvoiceMetrics client={client} />
        {transactionsSlot}
        <ClientContactSection client={client} />
      </div>
    );
  }

  // 2/3 main + 1/3 details, as a deliberately shallow two-row grid: the summary
  // alone in row 1, then everything else side by side in row 2. Both row-2
  // columns are single grid items that stack their own sections internally
  // (space-y-8), rather than each section claiming a grid row of its own.
  //
  // That shape matters. When the details column spanned several rows, the grid
  // distributed its height across every row it covered, inflating the KPI row
  // and opening a gap between the cards and the Transactions heading below
  // them. With one row, each column's height is its own content's, and neither
  // can stretch the other.
  //
  // Both row-2 columns lead with a floatTitle section, so the row starts at the
  // KPI cards and the Contact card respectively, not at their headings: the two
  // cards' top edges land on the same line, and the headings sit above it in
  // the row gap. That gap is gap-y-12 from lg up — 48px, of which the floated
  // heading occupies the lower 28px, leaving ~20px below the summary and ~12px
  // above the cards, so each heading reads as belonging to the section under
  // it. Below lg there is no float and no second column, so gap-y-8 is the
  // whole story and the headings sit in normal flow.
  //
  // items-start keeps each column sized to its own content rather than
  // stretching to the taller one; below lg the grid collapses to a single
  // column already in the required order.
  //
  // The track sizing is `minmax(0,1fr) 20rem`, not `2fr 1fr`. Two things follow
  // from that, both of them the point:
  //
  // - The details column is a fixed 20rem at every desktop width, so the
  //   Contact card stops resizing as the viewport moves and its label/value
  //   rows keep one stable measure. The main column takes whatever is left
  //   after that column and the gap, growing and shrinking with the viewport
  //   rather than holding a share of it.
  // - The `0` minimum is what stops the transactions table forcing the grid
  //   wider than its container. A grid track's implicit minimum is `auto` —
  //   its content's intrinsic width — so a table needing ~800px would push the
  //   whole row out, overflowing the page and squeezing the fixed column.
  //   Flooring it at 0 lets the main column narrow past its content, and
  //   DataTable's own overflow-x-auto takes over inside the table where the
  //   scrolling belongs. min-w-0 on the two main-column items applies the same
  //   floor to the grid items themselves, which default to min-width:auto for
  //   the same reason.
  return (
    <div className="grid gap-x-6 gap-y-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-y-12 xl:gap-x-10">
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
        <ClientIdentitySummary client={client} />
      </div>

      <div className="min-w-0 space-y-8 lg:col-start-1 lg:row-start-2">
        <ClientInvoiceMetrics client={client} floatTitle />
        {transactionsSlot}
      </div>

      {/* Supporting detail, deliberately secondary to the column beside it:
          narrower, no KPI figures, and carrying the one reference module —
          the same role, and the same label-above-value fields, as the
          Payment/Sender Details column on a transaction. */}
      <div className="lg:col-start-2 lg:row-start-2">
        <ClientContactSection client={client} floatTitle />
      </div>
    </div>
  );
}
