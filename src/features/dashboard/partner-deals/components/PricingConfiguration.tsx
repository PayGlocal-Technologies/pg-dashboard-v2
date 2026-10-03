"use client";

import { useRef, type ReactNode } from "react";
import { useStore } from "@tanstack/react-form";
import { AnimatePresence, motion } from "framer-motion";
import {
  Button,
  Card,
  DataTable,
  Field,
  FieldError,
  FieldLabel,
  IconButton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
  type Column,
} from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import {
  CellError,
  COMPACT_CONTROL,
  FeeInput,
  FeeTypeSelect,
} from "@/features/dashboard/partner-deals/components/FeeControls";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/features/dashboard/partner-deals/components/DealDetailsSection";
import { DOMESTIC_CARD_BRANDS } from "@/features/dashboard/partner-deals/constants";
import {
  cardBrandError,
  DEAL_FIELD_IDS,
  feeError,
} from "@/features/dashboard/partner-deals/validation";
import type { DealForm } from "@/features/dashboard/partner-deals/form";
import type {
  DomesticCardFeeRow,
  InternationalFeeRow,
} from "@/features/dashboard/partner-deals/types";

/**
 * Pricing configuration: one page section, three subsections. Each
 * subsection is ONE surface (a Card) with its heading, helper text and
 * controls straight inside it, no card-in-card. The two card-level grids are
 * compact DataTables, so each network is a row, not a form of its own.
 */

/** DataTable draws its own bordered card and a "Showing n of n" footer. Inside
 *  a subsection that is already a card, both are dropped so the grid sits
 *  flush: one surface, not a card in a card. */
const FLUSH_TABLE = "rounded-none border-0 bg-transparent [&>div+div]:hidden";

function Subsection({
  icon,
  title,
  helper,
  children,
}: {
  icon: IconName;
  title: string;
  helper: string;
  children: ReactNode;
}) {
  // A compact module header: a small icon beside the title, the helper under
  // it, no tinted band or icon disc. The card is the module boundary.
  return (
    <Card className="gap-0 overflow-hidden p-0 shadow-none">
      <div className="flex items-start gap-2.5 px-5 pt-4 pb-3">
        <Icon name={icon} size={15} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 space-y-0.5">
          <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
          <p className="text-[12.5px] text-muted-foreground">{helper}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

/** Fee type + fee side by side (stacked on narrow screens), labelled. */
function FeePair({
  form,
  base,
  idPrefix,
}: {
  form: DealForm;
  base: "global" | "domestic.platform";
  idPrefix: string;
}) {
  const feeType = useStore(form.store, (s) =>
    base === "global" ? s.values.global.feeType : s.values.domestic.platform.feeType
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <form.Field name={`${base}.feeType`}>
        {(field) => (
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-fee-type`}>Fee type</FieldLabel>
            <FeeTypeSelect
              id={`${idPrefix}-fee-type`}
              value={field.state.value}
              onChange={field.handleChange}
            />
          </Field>
        )}
      </form.Field>
      <form.Field
        name={`${base}.fee`}
        validators={{
          onBlur: ({ value }) => feeError(value, feeType),
          onSubmit: ({ value }) => feeError(value, feeType),
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-fee`}>Fee</FieldLabel>
            <FeeInput
              id={`${idPrefix}-fee`}
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              feeType={feeType}
              invalid={field.state.meta.errors.length > 0}
            />
            <FieldError>{field.state.meta.errors[0]}</FieldError>
          </Field>
        )}
      </form.Field>
    </div>
  );
}

// ── A. Global Accounts ───────────────────────────────────────────────────────

export function GlobalAccountsSection({ form }: { form: DealForm }) {
  return (
    <Subsection
      icon="globe"
      title="Global Accounts"
      helper="Fees applied per transaction on global accounts."
    >
      <div className="px-5 pb-4">
        <FeePair form={form} base="global" idPrefix="global" />
      </div>
    </Subsection>
  );
}

// ── B. International Payment Processing ─────────────────────────────────────

export function InternationalPaymentSection({ form }: { form: DealForm }) {
  const rows = useStore(form.store, (s) => s.values.international);

  const columns: Column<InternationalFeeRow & { index: number }>[] = [
    {
      key: "brand",
      header: "Brand",
      minWidth: 170,
      render: (row) => (
        <span className="text-[13px] font-medium text-foreground whitespace-nowrap">
          {row.brand}
        </span>
      ),
    },
    {
      key: "feeType",
      header: "Fee type",
      minWidth: 170,
      render: (row) => (
        <form.Field name={`international[${row.index}].feeType`}>
          {(field) => (
            <FeeTypeSelect
              value={field.state.value}
              onChange={field.handleChange}
              ariaLabel={`${row.brand} fee type`}
              compact
            />
          )}
        </form.Field>
      ),
    },
    {
      key: "fee",
      header: "Fee",
      minWidth: 150,
      render: (row) => (
        <form.Field
          name={`international[${row.index}].fee`}
          validators={{
            onBlur: ({ value }) => feeError(value, row.feeType),
            onSubmit: ({ value }) => feeError(value, row.feeType),
          }}
        >
          {(field) => (
            <div>
              <FeeInput
                id={DEAL_FIELD_IDS.internationalFee(row.index)}
                value={field.state.value}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
                feeType={row.feeType}
                invalid={field.state.meta.errors.length > 0}
                ariaLabel={`${row.brand} fee`}
                compact
              />
              <CellError message={field.state.meta.errors[0]} />
            </div>
          )}
        </form.Field>
      ),
    },
  ];

  return (
    <Subsection
      icon="credit-card"
      title="International Payment Processing"
      helper="Set the fee type and amount for each card network."
    >
      <div className="border-t border-border">
        <DataTable
          columns={columns}
          data={rows.map((r, index) => ({ ...r, index }))}
          rowKey={(row) => row.brand}
          density="compact"
          headerStyle="minimal"
          className={FLUSH_TABLE}
        />
      </div>
    </Subsection>
  );
}

// ── C. Domestic Payment Processing ──────────────────────────────────────────

/** A fresh card fee row: no brand yet, percentage, nothing to pay on top. */
const EMPTY_CARD_ROW: Omit<DomesticCardFeeRow, "rowId"> = {
  brand: "",
  feeType: "PERCENTAGE",
  fee: "0",
};

export function DomesticPaymentSection({ form }: { form: DealForm }) {
  const customise = useStore(form.store, (s) => s.values.domestic.customiseCards);
  const cards = useStore(form.store, (s) => s.values.domestic.cards);
  // Row keys, handed out in event handlers only (never during render).
  const nextRowId = useRef(0);
  const newRowId = () => {
    nextRowId.current += 1;
    return `card-${nextRowId.current}`;
  };

  function addRow() {
    form.pushFieldValue("domestic.cards", { ...EMPTY_CARD_ROW, rowId: newRowId() });
  }

  function setCustomise(next: boolean) {
    form.setFieldValue("domestic.customiseCards", next);
    // The first time it's switched on, start with one row per brand at 0,
    // as production does, so the partner edits fees rather than building
    // the list. Rows are kept if it's switched off and on again.
    if (next && cards.length === 0) {
      form.setFieldValue(
        "domestic.cards",
        DOMESTIC_CARD_BRANDS.map((brand) => ({ ...EMPTY_CARD_ROW, brand, rowId: newRowId() }))
      );
    }
  }

  const columns: Column<DomesticCardFeeRow & { index: number }>[] = [
    {
      key: "brand",
      header: "Brand",
      minWidth: 190,
      render: (row) => (
        <form.Field
          name={`domestic.cards[${row.index}].brand`}
          validators={{
            onChange: ({ value }) =>
              cardBrandError(
                value,
                cards.slice(0, row.index).map((c) => c.brand)
              ),
            onSubmit: ({ value }) =>
              cardBrandError(
                value,
                cards.slice(0, row.index).map((c) => c.brand)
              ),
          }}
        >
          {(field) => (
            <div>
              <Select value={field.state.value} onValueChange={field.handleChange}>
                <SelectTrigger
                  id={DEAL_FIELD_IDS.cardBrand(row.rowId)}
                  className={cn("w-full", COMPACT_CONTROL)}
                  aria-label={`Card fee ${row.index + 1} brand`}
                  aria-invalid={field.state.meta.errors.length > 0 || undefined}
                >
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {DOMESTIC_CARD_BRANDS.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <CellError message={field.state.meta.errors[0]} />
            </div>
          )}
        </form.Field>
      ),
    },
    {
      key: "feeType",
      header: "Fee type",
      minWidth: 160,
      render: (row) => (
        <form.Field name={`domestic.cards[${row.index}].feeType`}>
          {(field) => (
            <FeeTypeSelect
              value={field.state.value}
              onChange={field.handleChange}
              ariaLabel={`${row.brand || `Card fee ${row.index + 1}`} fee type`}
              compact
            />
          )}
        </form.Field>
      ),
    },
    {
      key: "fee",
      header: "Fee",
      minWidth: 140,
      render: (row) => (
        <form.Field
          name={`domestic.cards[${row.index}].fee`}
          validators={{
            onBlur: ({ value }) => feeError(value, row.feeType),
            onSubmit: ({ value }) => feeError(value, row.feeType),
          }}
        >
          {(field) => (
            <div>
              <FeeInput
                id={DEAL_FIELD_IDS.cardFee(row.rowId)}
                value={field.state.value}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
                feeType={row.feeType}
                invalid={field.state.meta.errors.length > 0}
                ariaLabel={`${row.brand || `Card fee ${row.index + 1}`} fee`}
                compact
              />
              <CellError message={field.state.meta.errors[0]} />
            </div>
          )}
        </form.Field>
      ),
    },
    {
      key: "remove",
      header: "",
      minWidth: 52,
      render: (row) => (
        <div className="flex justify-end">
          <IconButton
            aria-label={`Remove ${row.brand || `card fee ${row.index + 1}`}`}
            variant="outline"
            size="sm"
            onClick={() => form.removeFieldValue("domestic.cards", row.index)}
            className="text-primary"
          >
            <Icon name="minus" className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <Subsection
      icon="indian-rupee"
      title="Domestic Payment Processing"
      helper="Platform fee and optional per-card brand pricing."
    >
      <div className="space-y-3 px-5 pb-4">
        <p className="text-[13px] font-medium text-foreground">Platform Fee</p>
        <FeePair form={form} base="domestic.platform" idPrefix="domestic-platform" />
      </div>

      <Separator />

      {/* Same label / hint / Switch row the invoice branding settings use. */}
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Customise card fees</p>
          <p className="text-[12px] text-muted-foreground">
            Add fees per card brand. Networks and rows are optional.
          </p>
        </div>
        <Switch
          checked={customise}
          onCheckedChange={setCustomise}
          aria-label="Customise card fees"
        />
      </div>

      {/* Progressive disclosure: the brand grid only exists while the toggle
          is on. */}
      <AnimatePresence initial={false}>
        {customise && (
          <motion.div
            key="card-fees"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border">
              {cards.length > 0 ? (
                <DataTable
                  columns={columns}
                  data={cards.map((r, index) => ({ ...r, index }))}
                  rowKey={(row) => row.rowId}
                  density="compact"
                  headerStyle="minimal"
                  className={FLUSH_TABLE}
                />
              ) : (
                <p className="px-5 pt-4 text-[12.5px] text-muted-foreground">
                  No card fees yet. The platform fee applies to every card.
                </p>
              )}
              <div className="border-t border-dashed border-border px-5 py-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
                  onClick={addRow}
                  className="w-full text-primary hover:text-primary"
                >
                  Add card fee
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Subsection>
  );
}

export function PricingConfiguration({ form }: { form: DealForm }) {
  return (
    <section className="space-y-4">
      <SectionHeading
        title="Pricing configuration"
        description="Configure the fees that will apply to businesses using this referral deal."
      />
      <div className="space-y-4">
        <GlobalAccountsSection form={form} />
        <InternationalPaymentSection form={form} />
        <DomesticPaymentSection form={form} />
      </div>
    </section>
  );
}
