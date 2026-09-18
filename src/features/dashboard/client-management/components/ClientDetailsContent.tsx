"use client";

import type { ReactNode } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableText } from "@/components/common/CopyableText";
import {
  clientAmountLocale,
  clientBusinessTypeLabel,
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
  // An absent value draws a dash rather than dropping the row, which is what
  // production's own details page does (every field in createClientContactDetails
  // and friends falls back to "-"). A field that disappears when empty makes the
  // set of fields differ from one client to the next, so a reader can't tell
  // "nothing was captured" from "this client has no such field".
  const isEmpty = value == null || value === "";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <div
        className={cn(
          "flex min-w-0 items-center gap-1.5 text-[13px] font-medium",
          isEmpty ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {isEmpty ? "-" : value}
      </div>
    </div>
  );
}

/** A group heading inside the details card — the label production puts on each of
 *  its accordion panels ("Billing details", "Notes & Contract"). Smaller and
 *  lighter than SectionTitle, which names the card itself. */
function FieldGroupTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h4 className={cn("text-[12px] font-semibold text-foreground", className)}>{children}</h4>;
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

/** Wraps a value in the copy affordance only when there is something to copy —
 *  CopyableText renders a control either way, and a copy button beside an empty
 *  string is an action that can't do anything. */
function copyableOrNothing(value: string | undefined): ReactNode {
  if (!value?.trim()) return null;
  return <CopyableText value={value} valueClassName={CONTACT_VALUE_CLASS} />;
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
    // mark, then the headline and its supporting lines.
    <div className={className}>
      {/* The country as text alone. There is no flag image here: the code it
          would be keyed by is resolved from a reference endpoint the client
          record does not carry, so a client whose country did not resolve drew a
          broken image at the very top of the drawer. The name is the fact worth
          showing, and it is already on the record. */}
      <div className="flex min-w-max items-center gap-1.5">
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
 *
 * The tile is a plain readout, not a control. It used to press to filter the
 * ledger below to the statuses it counts, but a card-shaped surface that shows a
 * pointer cursor reads as navigation, and the ledger already carries its own
 * Status filter — the same narrowing, where a merchant looks for it.
 */
function ClientMetricCard({
  label,
  value,
  amounts,
  hint,
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
}) {
  // min-w-0 so the three cards can narrow with the column that holds them,
  // rather than the row's min-content width becoming a floor that overflows it.
  // Their labels wrap instead.
  return (
    <Card size="sm" className="h-full w-full min-w-0 px-4 py-3.5">
      <CardContent className="flex h-full flex-1 flex-col">
        <div className="flex items-center gap-1">
          <p className="text-[12px] text-muted-foreground">{label}</p>
          {hint ? (
            // There is no app-wide TooltipProvider in this app — every call site
            // wraps its own (see SettlementStatCards, mca-transactions/columns).
            // Without it Radix throws on mount, which is what was breaking the
            // page the instant a client's details opened.
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* A button, not a bare icon: it has to be focusable for the
                    tooltip to be reachable without a pointer. */}
                  <button
                    type="button"
                    aria-label={`About ${label.toLowerCase()}`}
                    className="shrink-0 text-muted-foreground/70 hover:text-muted-foreground"
                  >
                    <Icon name="info" className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{hint}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
          {/* One line per currency, amount then ISO code, the same pairing the
              table's Total received column uses. A client billed in a single
              currency — every client today — gets exactly one line, so this
              never makes the card taller in practice; a mixed-currency client
              adds a line rather than silently summing across rates.

              A card with nothing to value renders no line at all. It used to
              draw an em-dash there to keep the three cards' bottom edges level,
              but a lone dash under a zero reads as a missing value rather than
              as "nothing to show", and the grid's own stretch already keeps the
              cards equal in height. */}
          {amounts.map((total) => (
            <p
              key={total.currency}
              className="mt-0.5 truncate text-[11px] tabular-nums text-muted-foreground"
              title={`${formatCurrency(total.amount, total.currency, clientAmountLocale(total.currency))} ${total.currency}`}
            >
              {formatCurrency(total.amount, total.currency, clientAmountLocale(total.currency))}{" "}
              <span className="font-medium">{total.currency}</span>
            </p>
          ))}
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
export function ClientInvoiceMetrics({ client }: { client: Client }) {
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
    <section>
      <SectionTitle>Invoice summary</SectionTitle>
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
        />
        <ClientMetricCard
          label="Paid invoices"
          value={metrics.paid}
          amounts={amounts.paid}
          hint="The total number of invoices for which payments have been linked."
        />
        <ClientMetricCard
          label="Outstanding invoices"
          value={metrics.outstanding}
          amounts={amounts.outstanding}
          hint="The total number of unpaid invoices past due date."
        />
      </div>
    </section>
  );
}

// The card below uses Card size="sm" and CardContent's space-y — the same
// container and the same field rhythm as the Transaction Details page's Payment
// Details and Sender Details sections, so the two detail views' side columns are
// literally the same module with different fields. size="sm" is already the
// tighter of Card's two paddings (gap-6 px-7 py-7 against the default's px-10
// py-10); anything narrower would be an arbitrary override rather than a Flux
// token.

/**
 * How many columns the fields inside the card flow across, per layout. Fifteen
 * label/value pairs stacked one per line is a very tall card — tall enough in the
 * drawer that the invoice ledger under it was off-screen — and every one of these
 * values is short, so a single column spends height on whitespace to the right of
 * each. Columns are what buy that height back.
 *
 * Set per layout rather than by viewport alone, because the card's own width is
 * what should decide this and the two layouts give it very different widths at the
 * same viewport: ~26rem inside the drawer against the full content width on the
 * page. A viewport breakpoint can't tell those apart. Within each layout the
 * breakpoints then handle the narrow end — one column on a phone, where two
 * columns of "Primary contact number" would wrap every label.
 */
const CONTACT_FIELD_GRID = {
  // The drawer is a fixed 32rem panel from sm up (see ClientDetailsDrawer), so
  // two columns is a measured fit there rather than a guess; below sm it is a
  // full-width bottom sheet on a phone, which takes one.
  drawer: "grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2",
  // Full content width, so the same two columns from sm and a third from lg,
  // where the fields would otherwise be far wider than anything in them.
  page: "grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3",
} as const;

/**
 * Every field production's client details page shows, in production's own three
 * groups and production's own order: Contact Details, then Billing details, then
 * Notes & Contract (see pg-dashboard's createClientContactDetails,
 * createClientBillingDetails and createClientNotesDetails).
 *
 * The groups are stacked inside one card with a rule between them rather than
 * being three collapsible panels as production has them: there is no width to
 * reclaim by collapsing, and a merchant who opened a client came for exactly
 * these fields. Nothing is hidden behind a disclosure. Within each group the
 * fields flow across columns — see CONTACT_FIELD_GRID.
 *
 * Every field renders whether or not the record carries it — an absent one draws
 * a dash (see ClientDetailRow), which is what production does too. The set of
 * fields is therefore the same for every client.
 */
export function ClientContactSection({
  client,
  layout = "page",
  onViewContract,
}: {
  client: Client;
  /** Opens the stored contract. Absent where nothing can open it. */
  onViewContract?: () => void;
  /** Which column count the fields flow across. See CONTACT_FIELD_GRID. */
  layout?: "page" | "drawer";
}) {
  const fieldGrid = CONTACT_FIELD_GRID[layout];

  return (
    <section>
      <SectionTitle>Contact details</SectionTitle>
      <Card size="sm">
        {/* space-y-5 between groups against the space-y-4 between fields inside
            one: enough that the rule reads as separating three groups rather
            than crowding the fields either side of it. */}
        <CardContent className="space-y-5">
          <div className={fieldGrid}>
            {/* Business name is repeated here even though the summary above
                already carries it as the headline: this card is production's
                Contact Details panel, and a labelled field is what makes it
                copy-readable as part of the record rather than as a title. */}
            <ClientDetailRow label="Business name" value={client.businessName} />
            <ClientDetailRow label="Primary contact name" value={client.primaryContactName} />
            {/* Copyable, since a number or an address in a details panel is
                almost always on its way into a message. CopyableText's own
                button stops at its own click handler, so a copy never reaches
                whatever row or card this sits inside. */}
            <ClientDetailRow
              label="Primary contact number"
              value={copyableOrNothing(formatPhoneNumber(client.phoneDialCode, client.phoneNumber))}
            />
            <ClientDetailRow label="Primary email" value={copyableOrNothing(client.email)} />
            {/* The stored value is an API enum code ("LIMITED_LIABILITY_PARTNERSHIP"),
                so it is drawn through its label rather than raw. */}
            <ClientDetailRow
              label="Client type"
              value={clientBusinessTypeLabel(client.businessType)}
            />
            <ClientDetailRow label="GST number" value={copyableOrNothing(client.gstin)} />
            <ClientDetailRow
              label="Tags"
              value={
                client.tags && client.tags.length > 0 ? (
                  <span className="flex flex-wrap gap-1">
                    {client.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </span>
                ) : null
              }
            />
          </div>

          <Separator />

          {/* The address broken into the parts the record carries rather than one
              composed line, in production's order (country down to the two street
              lines), so a reader can pick out a city or a postcode without
              reading a sentence. `billingAddress` remains the composed form and
              is what the table's cells use — this is the only place the parts are
              addressed individually. */}
          <div className={fieldGrid}>
            {/* col-span-full so the group's heading sits on its own line above the
                fields rather than taking the first cell of the grid. */}
            <FieldGroupTitle className="col-span-full">Billing details</FieldGroupTitle>
            <ClientDetailRow label="Country" value={client.countryName} />
            <ClientDetailRow label="State" value={client.state} />
            <ClientDetailRow label="City" value={client.city} />
            <ClientDetailRow label="Zipcode" value={client.zipcode} />
            <ClientDetailRow label="Street address 1" value={client.addressLine} />
            <ClientDetailRow label="Street address 2" value={client.addressLine2} />
          </div>

          <Separator />

          <div className={fieldGrid}>
            <FieldGroupTitle className="col-span-full">Notes &amp; contract</FieldGroupTitle>
            <ClientDetailRow
              label="Notes"
              value={
                client.notes ? <span className="whitespace-normal">{client.notes}</span> : null
              }
            />
            {/* The contract, openable rather than just named: the file is stored
                server-side and reachable only through a presigned GET, so the row
                is a button that fetches one on the click (see onViewContract).
                Without a handler it stays a plain filename. With no contract at
                all it says so in production's own words, rather than as the dash
                every other empty field draws — "no document was attached" is a
                more specific fact than "this was left blank". */}
            <ClientDetailRow
              label="Contract"
              value={
                !client.contract ? (
                  <span className="font-normal text-muted-foreground">No contract uploaded</span>
                ) : onViewContract && client.contract.fileId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onViewContract}
                    leftIcon={<Icon name="file-text" className="h-3.5 w-3.5 shrink-0" />}
                    className="h-auto min-h-0 justify-start gap-1.5 px-0 py-0 text-[13px] font-medium text-primary underline-offset-2 hover:underline"
                  >
                    <span className="whitespace-normal break-all">{client.contract.name}</span>
                  </Button>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="file-text" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="whitespace-normal break-all">{client.contract.name}</span>
                  </span>
                )
              }
            />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

interface ClientDetailsContentProps {
  client: Client;
  /** Which of the two detail views is rendering. Both stack the same sections in
   *  the same order; the difference is how wide the content is, and so how many
   *  columns the Contact card's fields flow across (see CONTACT_FIELD_GRID). */
  layout?: "page" | "drawer";
  /**
   * The client's invoice ledger, composed by whichever view is rendering (each
   * owns the status filter its own KPI cards drive) but positioned here, so this
   * module stays the single description of how a client's details are arranged.
   * Both layouts place it identically: last, after Contact.
   *
   * This is the only table in the client detail views. It used to be followed by
   * the client's transactions, matched to it by business name because no
   * transaction carries a client id — a looser link than this one, which filters
   * the invoice search by `clientId` outright. Production shows invoices here and
   * nothing else, so that is what these views show.
   */
  ledgerSlot?: ReactNode;
  /** Opens the stored contract. */
  onViewContract?: () => void;
}

/**
 * One column, both layouts: identity → invoice summary → contact → invoices.
 *
 * That order is the hierarchy this view means — who the client is, what they owe
 * and have paid, how to reach them, then the invoices behind those figures — and
 * as a plain stack it is also exactly the DOM order, so a screen reader, a phone,
 * the drawer, and the expanded page all follow the same sequence with nothing to
 * keep in step.
 *
 * The expanded view used to put the Contact card in a fixed 20rem column to the
 * right of the metrics and the ledger. That column was what forced the card to
 * stack all fifteen of its fields one per line, since 20rem fits nothing else —
 * and a card that tall next to a short KPI row needed an explicit row span and a
 * floated heading to stop it dragging the ledger down the page. Full width instead
 * lets the fields flow across columns, which is both shorter and less machinery.
 * The two layouts now differ in one thing only: how many columns that is.
 */
export function ClientDetailsContent({
  client,
  layout = "page",
  ledgerSlot,
  onViewContract,
}: ClientDetailsContentProps) {
  return (
    // A plain block stack, which is also what keeps the ledger's table from
    // forcing the view wider than its container: block children are constrained
    // to their parent's width, and DataTable's own overflow-x-auto takes over
    // inside the table where the scrolling belongs. The grid this replaced needed
    // an explicit min-w-0 on every item for that, since grid items default to
    // min-width:auto — their content's intrinsic width.
    <div className="space-y-6">
      <ClientIdentitySummary client={client} />
      <ClientInvoiceMetrics client={client} />
      <ClientContactSection client={client} layout={layout} onViewContract={onViewContract} />
      {ledgerSlot}
    </div>
  );
}
