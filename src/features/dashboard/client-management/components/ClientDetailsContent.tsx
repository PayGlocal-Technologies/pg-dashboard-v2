"use client";

import type { ReactNode } from "react";
import {
  Badge,
  Card,
  CardContent,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableText } from "@/components/common/CopyableText";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import {
  clientAmountLocale,
  clientInvoiceAmounts,
  type ClientReceivedTotal,
} from "@/features/dashboard/client-management/constants";
import { useClientInvoiceSummary } from "@/features/dashboard/client-management/hooks";
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
export function ClientIdentitySummary({
  client,
  className,
}: {
  client: Client;
  className?: string;
}) {
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
 * One KPI tile: a muted label, the count as the figure that carries the card,
 * and the money those invoices are worth beneath it. Deliberately dense — three
 * tight lines rather than the tall icon/title/figure/description column the
 * page-level analytics cards use (see OutstandingAmountCard). Same Card surface
 * and the same tabular-nums figure in foreground weight, at roughly half the
 * height.
 *
 * What keeps it there: Card's px-7 py-7 is overridden down to px-4 py-3.5, the
 * figure steps from text-3xl to text-2xl, and the amount is one 11px muted line
 * with no label of its own — the count above already names what is being
 * counted. mt-1/mt-0.5 keep the three lines reading as one unit rather than
 * three that happen to share a card.
 *
 * The hierarchy is deliberate and holds at a glance: 24px semibold foreground
 * against 11px regular muted. The count is the KPI; the amount is the context
 * for it.
 *
 * h-full is what keeps all three cards exactly equal in height — the grid
 * stretches every one to the tallest, which is whichever label wraps first or
 * whichever card carries the most currencies.
 */
function ClientMetricCard({
  label,
  value,
  amounts,
  hint,
  onClick,
}: {
  label: string;
  value: number;
  /** What those invoices are worth, one entry per currency. Empty when there are
   *  no invoices to value. */
  amounts: ClientReceivedTotal[];
  /** What the figure counts, on an info affordance beside the label. Wording is
   *  production's own (see ClientSummary's tooltips) — these three counts are
   *  easy to read as the same number three ways, and the tooltip is what says
   *  which invoices each one includes. */
  hint?: string;
  /** Filters the invoice ledger below to the statuses this card describes.
   *  Absent when there is no ledger to filter. */
  onClick?: () => void;
}) {
  // min-w-0 so the three cards can narrow with the column that holds them,
  // rather than the row's min-content width becoming a floor that overflows it.
  // Their labels wrap instead.
  return (
    <Card
      size="sm"
      className={cn(
        "h-full w-full min-w-0 px-4 py-3.5",
        onClick && "cursor-pointer transition-colors hover:bg-muted/40"
      )}
      {...(onClick
        ? {
            role: "button",
            tabIndex: 0,
            onClick,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            },
          }
        : {})}
    >
      <CardContent className="flex h-full flex-1 flex-col">
        <div className="flex items-center gap-1">
          <p className="text-[12px] text-muted-foreground">{label}</p>
          {hint ? (
            <Tooltip>
              <TooltipTrigger asChild>
                {/* A button, not a bare icon: it has to be focusable for the
                    tooltip to be reachable without a pointer. */}
                <button
                  type="button"
                  aria-label={`About ${label.toLowerCase()}`}
                  className="shrink-0 text-muted-foreground/70 hover:text-muted-foreground"
                  // The card itself may be clickable; the hint is not that.
                  onClick={(e) => e.stopPropagation()}
                >
                  <Icon name="info" className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{hint}</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        {/* mt-auto pins the figure and its amount to the card's bottom edge, so
            the three cards' numbers sit on one line and their amounts on
            another whatever their labels do. Without it, a label that wraps to
            two lines ("Outstanding invoices" at this column width) pushes its
            own figure down while its neighbours' stay put — leaving the short
            cards with dead space under their amounts and no two figures level.
            The slack now opens under the label, where it reads as breathing
            room rather than as a gap. pt-1 is the floor: the figure never
            touches the label even when the label takes the full height. */}
        <div className="mt-auto pt-1">
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
            {value}
          </p>
          {amounts.length === 0 ? (
            // An em-dash, not a formatted zero: "there are no invoices here"
            // and "these invoices are worth nothing" are different facts, and
            // only the first one is ever true. Rendered rather than omitted so
            // a card with nothing to value keeps its neighbours' bottom line.
            <p className="mt-0.5 text-[11px] text-muted-foreground">—</p>
          ) : (
            // One line per currency, amount then ISO code, the same pairing the
            // table's Total received column uses. A client billed in a single
            // currency — every client today — gets exactly one line, so this
            // never makes the card taller in practice; a mixed-currency client
            // adds a line rather than silently summing across rates.
            amounts.map((total) => (
              <p
                key={total.currency}
                className="mt-0.5 truncate text-[11px] tabular-nums text-muted-foreground"
                title={`${formatCurrency(total.amount, total.currency, clientAmountLocale(total.currency))} ${total.currency}`}
              >
                {formatCurrency(total.amount, total.currency, clientAmountLocale(total.currency))}{" "}
                <span className="font-medium">{total.currency}</span>
              </p>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * The three invoice figures, in a row that collapses to a single column on
 * narrow viewports (the existing responsive card pattern). All three counts,
 * and the amounts beneath them, are derived from the client's own transactions
 * Counts come from the per-client invoice summary endpoint and amounts from the
 * client record's own totals — both server figures, so this row reports what
 * production reports rather than an approximation computed from the transactions
 * listed underneath it. See useClientInvoiceSummary and clientInvoiceAmounts.
 */
/**
 * Which invoice statuses each KPI card narrows the ledger to. Copied from
 * pg-dashboard's ClientSummary: "completed" spans everything that was actually
 * raised, "paid" both settled states, and outstanding just the one.
 */
const METRIC_STATUS_FILTERS = {
  total: ["ACTIVE", "PAID", "PAID_OUTSIDE", "OUTSTANDING"],
  paid: ["PAID", "PAID_OUTSIDE"],
  outstanding: ["OUTSTANDING"],
} as const;

export function ClientInvoiceMetrics({
  client,
  floatTitle = false,
  onFilterByStatus,
}: {
  client: Client;
  /** Narrows the invoice ledger below to these statuses. Absent in the drawer,
   *  where there is no ledger on screen to filter. */
  onFilterByStatus?: (statuses: string[]) => void;
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
  // Counts and amounts come from two different places, because the API splits
  // them that way: get-invoice-summary returns the three counts and no money,
  // while the client record carries the money and no counts. Both describe the
  // same client, so the pairing holds — see useClientInvoiceSummary and
  // clientInvoiceAmounts.
  const { counts } = useClientInvoiceSummary(client.id);
  const amounts = clientInvoiceAmounts(client);
  // Zero rather than a skeleton while the summary loads: the amounts beside them
  // are already on screen from the record, so blanking the counts alone would
  // make the row flicker in two stages.
  const metrics = counts ?? { total: 0, paid: 0, outstanding: 0 };

  return (
    <section className={cn(floatTitle && "lg:relative")}>
      <SectionTitle className={floatTitle ? "lg:absolute lg:-top-7 lg:left-0 lg:mb-0" : undefined}>
        Invoice summary
      </SectionTitle>
      {/* gap-3 at the widths where the main column is tightest, opening to
          gap-4 from xl — the same proportional easing the grid's own column
          gap uses. */}
      <div className="grid gap-3 sm:grid-cols-3 xl:gap-4">
        {/* Every invoice, then the settled subset, then the remainder — read
            left to right, the row says what was raised and how much of it has
            landed. Each label names its own count, so no card needs a unit or
            a supporting line. */}
        <ClientMetricCard
          label="Total invoices"
          value={metrics.total}
          amounts={amounts.total}
          hint="The total number of successfully generated invoices."
          onClick={
            onFilterByStatus ? () => onFilterByStatus([...METRIC_STATUS_FILTERS.total]) : undefined
          }
        />
        <ClientMetricCard
          label="Paid invoices"
          value={metrics.paid}
          amounts={amounts.paid}
          hint="The total number of invoices for which payments have been linked."
          onClick={
            onFilterByStatus ? () => onFilterByStatus([...METRIC_STATUS_FILTERS.paid]) : undefined
          }
        />
        <ClientMetricCard
          label="Outstanding invoices"
          value={metrics.outstanding}
          amounts={amounts.outstanding}
          hint="The total number of unpaid invoices past due date."
          onClick={
            onFilterByStatus
              ? () => onFilterByStatus([...METRIC_STATUS_FILTERS.outstanding])
              : undefined
          }
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
  onViewContract,
}: {
  client: Client;
  /** Opens the stored contract. Absent where nothing can open it. */
  onViewContract?: () => void;
  /** Lifts the heading out of the flow from lg up, so this section's box is
   *  exactly its card's box and the card's top edge — not the heading above
   *  it — lands level with the KPI cards across the grid. Same device, and
   *  same offset, as ClientInvoiceMetrics' own floatTitle. */
  floatTitle?: boolean;
}) {
  // Only the parts that are actually populated, in the order production lists
  // them (country down to street).
  const addressRows = (
    [
      ["Country", client.countryName],
      ["State", client.state],
      ["City", client.city],
      ["Zipcode", client.zipcode],
      ["Street address", client.addressLine],
    ] as const
  )
    .filter(([, value]) => !!value?.trim())
    .map(([label, value]) => ({ label, value: value as string }));

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
          {/* Client type, GST and tags all come off the record and were being
              mapped but never drawn. Each is omitted when absent rather than
              shown as an empty row: the seeded book predates the form that
              collects them, so a client legitimately has none. */}
          {client.businessType ? (
            <ClientDetailRow label="Client type" value={client.businessType} />
          ) : null}
          {client.gstin ? (
            <ClientDetailRow
              label="GST number"
              value={<CopyableText value={client.gstin} valueClassName={CONTACT_VALUE_CLASS} />}
            />
          ) : null}
          {client.tags && client.tags.length > 0 ? (
            <ClientDetailRow
              label="Tags"
              value={
                <span className="flex flex-wrap gap-1">
                  {client.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </span>
              }
            />
          ) : null}

          {/* The address, broken into the parts the record carries rather than
              the one composed line this used to draw. Each part is its own row,
              as production's details page has them, so a reader can pick out a
              city or a postcode without reading a sentence. `billingAddress`
              remains the composed form and is what the table's cells use — this
              is the only place the parts are addressed individually.

              Any part the record lacks is dropped, which is what keeps this from
              becoming six near-empty rows for a client captured before the form
              collected them. */}
          {client.notes ? (
            <ClientDetailRow
              label="Notes"
              value={<span className="whitespace-normal">{client.notes}</span>}
            />
          ) : null}

          {/* The contract, openable rather than just named: the file is stored
              server-side and reachable only through a presigned GET, so the row
              is a button that fetches one on the click (see onViewContract).
              Without a handler it stays a plain filename — which is what the
              drawer shows, since nothing there can open it. */}
          {client.contract ? (
            <ClientDetailRow
              label="Contract"
              value={
                onViewContract && client.contract.fileId ? (
                  <button
                    type="button"
                    onClick={onViewContract}
                    className="inline-flex items-center gap-1.5 text-left font-medium text-primary underline-offset-2 hover:underline"
                  >
                    <Icon name="file-text" className="h-3.5 w-3.5 shrink-0" />
                    <span className="whitespace-normal break-all">{client.contract.name}</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="file-text" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="whitespace-normal break-all">{client.contract.name}</span>
                  </span>
                )
              }
            />
          ) : null}

          {addressRows.length > 0 ? (
            addressRows.map((row) => (
              <ClientDetailRow key={row.label} label={row.label} value={row.value} />
            ))
          ) : (
            // Nothing structured to break out, so fall back to the one line the
            // record does have.
            <ClientDetailRow
              label="Billing address"
              value={<span className="whitespace-normal">{client.billingAddress}</span>}
            />
          )}
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
   * arranged. Both layouts place it identically: last, after Contact.
   */
  transactionsSlot?: ReactNode;
  /**
   * The client's invoice ledger, composed by the expanded view (which owns the
   * status filter the KPI cards drive) and positioned here, between the metrics
   * those cards show and the transactions below. Absent in the drawer, which is a
   * single narrow column with no room for a second table.
   */
  ledgerSlot?: ReactNode;
  /** Narrows the ledger to the statuses a KPI card describes. */
  onFilterByStatus?: (statuses: string[]) => void;
  /** Opens the stored contract. */
  onViewContract?: () => void;
}

export function ClientDetailsContent({
  client,
  layout = "page",
  transactionsSlot,
  ledgerSlot,
  onFilterByStatus,
  onViewContract,
}: ClientDetailsContentProps) {
  if (layout === "drawer") {
    // Single column, in the same priority order the expanded view uses:
    // identity → metrics → contact → transactions. The drawer is the same
    // content at one column wide rather than a reduced subset, so the two
    // states read as two levels of one experience; its scroll container (see
    // ClientDetailsDrawer) is what absorbs the extra height.
    return (
      <div className="space-y-6">
        <ClientIdentitySummary client={client} />
        {/* No onFilterByStatus: the drawer carries no ledger, so a card here has
            nothing to filter and stays a plain figure. */}
        <ClientInvoiceMetrics client={client} />
        <ClientContactSection client={client} onViewContract={onViewContract} />
        {transactionsSlot}
      </div>
    );
  }

  // 2/3 main + 1/3 details, as a three-row grid: the summary alone in row 1,
  // the KPI cards and the Contact card side by side in row 2, and the
  // transactions table in row 3 under the KPI cards.
  //
  // Source order is identity → metrics → contact → transactions, which is the
  // hierarchy this view means: who the client is, what they owe and have paid,
  // how to reach them, then the detail behind those figures. Grid placement is
  // explicit, so that order is what a screen reader and the sub-lg single
  // column both follow, while the two columns above lg stay exactly where they
  // were — Contact beside the KPI cards, transactions directly beneath them.
  //
  // Contact spans rows 2 and 3 rather than sitting in row 2 alone. That span is
  // load-bearing: the Contact card is ~3× the height of a KPI card, so confined
  // to row 2 it would set that row's height and push the transactions table
  // down, leaving a hole under the cards. Spanning both rows means its height
  // is measured against rows 2 and 3 together — comfortably taller than it —
  // so it contributes nothing to either and the transactions table stays where
  // the KPI cards leave it. (This is why the details column can no longer hold
  // an arbitrarily tall stack: a spanning item taller than the rows it covers
  // has its excess distributed back across them, which is exactly the gap this
  // avoids. Nothing here is close to that.)
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
  //   scrolling belongs. min-w-0 on each main-column item applies the same
  //   floor to the grid items themselves, which default to min-width:auto for
  //   the same reason.
  return (
    <div className="grid gap-x-6 gap-y-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-y-12 xl:gap-x-10">
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
        <ClientIdentitySummary client={client} />
      </div>

      <div className="min-w-0 lg:col-start-1 lg:row-start-2">
        <ClientInvoiceMetrics client={client} floatTitle onFilterByStatus={onFilterByStatus} />
      </div>

      {/* Supporting detail, deliberately secondary to the column beside it:
          narrower, no KPI figures, and carrying the one reference module —
          the same role, and the same label-above-value fields, as the
          Payment/Sender Details column on a transaction. Spans both content
          rows so its height lands on neither; see above.
          row-start-2 + row-end-4, not row-span-2: `row-span-*` compiles to the
          `grid-row` shorthand, which would overwrite the explicit start
          depending on rule order. Two longhands can't conflict. */}
      <div className="lg:col-start-2 lg:row-start-2 lg:row-end-5">
        <ClientContactSection client={client} floatTitle onViewContract={onViewContract} />
      </div>

      {/* Pulled up by 16px above lg, so the space between the KPI cards and
          the Transactions heading is the 32px these two sections had when they
          shared a column, not the grid's full 48px row gap — that gap is sized
          for the floated headings in row 2, and there is no floated heading
          here. Below lg the sections are simply gap-y-8 apart already. */}
      {/* Invoices, then transactions: the ledger explains the KPI figures
          directly above it, and the transactions are the money that settled
          against them. Both sit in the main column under the cards; the Contact
          card spans past both (see above), so neither affects it. */}
      <div className="min-w-0 lg:col-start-1 lg:row-start-3 lg:-mt-4">{ledgerSlot}</div>

      <div className="min-w-0 lg:col-start-1 lg:row-start-4">{transactionsSlot}</div>
    </div>
  );
}
