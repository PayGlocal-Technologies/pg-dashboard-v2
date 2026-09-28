"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useForm } from "@tanstack/react-form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Card,
  Checkbox,
  Field,
  FieldLabel,
  Input,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
} from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";
import { PaymentPagePreview } from "@/features/dashboard/payment-pages/components/PaymentPagePreview";
import { AddProductModal } from "@/features/dashboard/payment-pages/components/AddProductModal";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { CustomFieldsEditor } from "@/features/dashboard/payment-pages/components/CustomFieldsEditor";
import { SmoothSelect as Select } from "@/features/dashboard/payment-pages/components/SmoothSelect";
import { PAYMENT_PAGE_STATUS_META } from "@/features/dashboard/payment-pages/columns";
import {
  AMOUNT_TYPE_OPTIONS,
  BUILDER_CURRENCIES,
  CURRENCY_ISO2,
  EMPTY_CUSTOM_FIELD,
  PAYMENT_PAGE_BUILDER_DEFAULTS,
  PHONE_COUNTRY_OPTIONS,
} from "@/features/dashboard/payment-pages/constants";
import type {
  PaymentPageBuilderValues,
  PaymentPageRow,
  PreviewDevice,
} from "@/features/dashboard/payment-pages/types";

interface CreatePaymentPageProps {
  open: boolean;
  onClose: () => void;
  /** When set, the builder opens in edit mode prefilled from this row. */
  row?: PaymentPageRow | null;
}

// Maps a list row back into builder form values for edit mode. The URL segments
// (pay.payglocal.in/<handle>/<slug>) seed the handle + page slug.
function buildInitialValues(row?: PaymentPageRow | null): PaymentPageBuilderValues {
  if (!row) return PAYMENT_PAGE_BUILDER_DEFAULTS;
  const parts = row.link.split("/");
  return {
    ...PAYMENT_PAGE_BUILDER_DEFAULTS,
    pageHandle: parts[1] || PAYMENT_PAGE_BUILDER_DEFAULTS.pageHandle,
    pageSlug: parts.slice(2).join("/") || PAYMENT_PAGE_BUILDER_DEFAULTS.pageSlug,
    amountType: row.amount == null ? "customer" : "fixed",
    currency: row.currency,
    price: row.amount == null ? "" : String(row.amount),
    products: [{ id: row.id, title: row.product, description: "" }],
  };
}

// Description may contain rich-text HTML; strip tags for the compact one-line
// row under "What are you selling".
const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const COLLECT_FIELDS: {
  name: "collectEmail" | "collectPhone" | "collectBilling";
  label: string;
  icon: IconName;
  // Email + phone are always collected — locked on and grayed out.
  mandatory: boolean;
}[] = [
  { name: "collectEmail", label: "Email", icon: "mail", mandatory: true },
  { name: "collectPhone", label: "Phone", icon: "phone", mandatory: true },
  { name: "collectBilling", label: "Billing address", icon: "map-pin", mandatory: false },
];

// TODO(integration): mock-only builder. Wire "Publish page" to the real
// payment pages create endpoint per the CLAUDE.md migration checklist before
// shipping — endpoint URL, payload and response statuses copied from
// pg-dashboard, not guessed.

export function CreatePaymentPage({ open, onClose, row }: CreatePaymentPageProps) {
  const isEdit = !!row;
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [addProductOpen, setAddProductOpen] = useState(false);
  const advancedRef = useRef<HTMLDivElement>(null);

  const form = useForm({
    defaultValues: buildInitialValues(row),
    onSubmit: async () => {
      // Publish is a no-op stub until the backend is wired (see TODO above).
      onClose();
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Close"
            onClick={onClose}
            className="h-8 w-8 min-h-0 min-w-0 cursor-pointer rounded-md p-0 text-muted-foreground hover:text-foreground"
          >
            <Icon name="x" className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-semibold text-foreground">
            {isEdit ? "Edit payment page" : "Create a new payment page"}
          </h1>
          {row ? (
            <StatusBadge
              variant={PAYMENT_PAGE_STATUS_META[row.status].variant}
              label={PAYMENT_PAGE_STATUS_META[row.status].label}
              size="sm"
            />
          ) : (
            <StatusBadge variant="muted" label="Draft" size="sm" />
          )}
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon name="refresh" className="h-3 w-3" />
            Auto-saved as you type
          </span>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          leftIcon={<Icon name={isEdit ? "check" : "send-horizontal"} className="h-3.5 w-3.5" />}
          onClick={() => void form.handleSubmit()}
        >
          {isEdit ? "Save changes" : "Publish page"}
        </Button>
      </header>

      {/* Body: form + live preview */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        {/* Left: form. Reserve the scrollbar gutter so expanding a section
         * (e.g. Advanced options) doesn't introduce a scrollbar that shifts
         * the whole column sideways. */}
        <div className="min-h-0 overflow-y-auto bg-card px-14 py-6 scrollbar-gutter-stable">
          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
            {/* What are you selling */}
            <Card className="gap-4 p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon name="package" className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-semibold text-foreground">What are you selling</h2>
              </div>

              <form.Subscribe selector={(s) => s.values.products}>
                {(products) =>
                  products.length > 0 ? (
                    // Only one product per page — the row shows the selected
                    // product with a remove action instead of an add button.
                    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                      {products[0].coverImage ? (
                        <Image
                          src={products[0].coverImage}
                          alt={products[0].title}
                          width={44}
                          height={44}
                          unoptimized
                          className="h-11 w-11 shrink-0 rounded-md bg-muted object-contain"
                        />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Icon name="package" className="h-5 w-5" />
                        </span>
                      )}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[13px] font-semibold text-foreground">
                          {products[0].title}
                        </span>
                        {products[0].description && (
                          <span className="truncate text-[12px] text-muted-foreground">
                            {stripHtml(products[0].description)}
                          </span>
                        )}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Remove product"
                        onClick={() => form.setFieldValue("products", [])}
                        className="h-8 w-8 min-h-0 min-w-0 shrink-0 cursor-pointer rounded-md p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Icon name="trash-2" className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-6">
                      <p className="text-[13px] text-muted-foreground">
                        Add what you&apos;re selling on this page.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
                        onClick={() => setAddProductOpen(true)}
                        className="cursor-pointer border-border bg-muted text-foreground hover:bg-muted/80"
                      >
                        Add a product
                      </Button>
                    </div>
                  )
                }
              </form.Subscribe>
            </Card>

            {/* What you'll be collecting */}
            <Card className="gap-4 p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon name="credit-card" className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-semibold text-foreground">What you&apos;ll be collecting</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <form.Field name="amountType">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="amountType">Amount</FieldLabel>
                      <Select
                        value={field.state.value}
                        onValueChange={(v) =>
                          field.handleChange(v as (typeof AMOUNT_TYPE_OPTIONS)[number]["value"])
                        }
                      >
                        <SelectTrigger id="amountType" className="cursor-pointer">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          {AMOUNT_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                </form.Field>

                <form.Subscribe selector={(s) => s.values.amountType}>
                  {(amountType) => (
                    <Field>
                      <FieldLabel htmlFor="price">Item price</FieldLabel>
                      <div className="flex items-stretch gap-2">
                        <form.Field name="currency">
                          {(currencyField) => (
                            <Select
                              value={currencyField.state.value}
                              onValueChange={currencyField.handleChange}
                            >
                              <SelectTrigger className="w-28 shrink-0 cursor-pointer">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent position="popper">
                                {BUILDER_CURRENCIES.map((c) => (
                                  <SelectItem key={c} value={c}>
                                    <span className="flex items-center gap-2">
                                      <CountryFlag iso2={CURRENCY_ISO2[c] ?? "default"} />
                                      {c}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </form.Field>
                        <form.Field name="price">
                          {(priceField) => (
                            <Input
                              id="price"
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              disabled={amountType === "customer"}
                              value={priceField.state.value}
                              onChange={(e) => priceField.handleChange(e.target.value)}
                            />
                          )}
                        </form.Field>
                      </div>
                    </Field>
                  )}
                </form.Subscribe>
              </div>

              <div className="flex flex-col gap-3">
                {COLLECT_FIELDS.map((cf) => (
                  <form.Field key={cf.name} name={cf.name}>
                    {(field) => (
                      <label
                        className={cn(
                          "flex items-center gap-2.5",
                          cf.mandatory ? "cursor-not-allowed" : "cursor-pointer"
                        )}
                      >
                        <Checkbox
                          checked={field.state.value}
                          disabled={cf.mandatory}
                          onCheckedChange={
                            cf.mandatory
                              ? undefined
                              : (checked) => field.handleChange(checked === true)
                          }
                        />
                        <Icon
                          name={cf.icon}
                          className={cn(
                            "h-3.5 w-3.5",
                            cf.mandatory ? "text-muted-foreground/60" : "text-muted-foreground"
                          )}
                        />
                        <span
                          className={cn(
                            "text-[13px]",
                            cf.mandatory ? "text-muted-foreground" : "text-foreground"
                          )}
                        >
                          {cf.label}
                        </span>
                        {cf.mandatory && (
                          <span className="text-[11px] text-muted-foreground">Required</span>
                        )}
                      </label>
                    )}
                  </form.Field>
                ))}
              </div>
            </Card>

            {/* Advanced options */}
            <div ref={advancedRef}>
            <Card className="gap-0 p-0">
              <Accordion
                type="single"
                collapsible
                onValueChange={(v) => {
                  // Once expanded, bring the section into view — its content
                  // often opens below the fold. Wait for the expand animation.
                  if (v === "advanced") {
                    setTimeout(() => {
                      advancedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 220);
                  }
                }}
              >
                <AccordionItem value="advanced" className="border-b-0">
                  <AccordionTrigger className="cursor-pointer px-5 py-4 hover:no-underline">
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon name="sliders-horizontal" className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-semibold text-foreground">Advanced options</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5">
                    <div className="flex flex-col gap-4">
                      <form.Field name="addCustomFields">
                        {(field) => (
                          <div className="flex flex-col gap-3">
                            <label className="flex cursor-pointer items-center gap-2.5">
                              <Checkbox
                                checked={field.state.value}
                                onCheckedChange={(checked) => {
                                  const on = checked === true;
                                  field.handleChange(on);
                                  // Seed the first row so the section isn't empty when opened.
                                  if (on && form.getFieldValue("customFields").length === 0) {
                                    form.setFieldValue("customFields", [{ ...EMPTY_CUSTOM_FIELD }]);
                                  }
                                }}
                              />
                              <span className="text-[13px] font-medium text-foreground">
                                Add custom fields
                              </span>
                              <Icon name="info" className="h-3.5 w-3.5 text-muted-foreground" />
                            </label>

                            {field.state.value && (
                              <div className="pl-1 duration-200 animate-in fade-in-0 slide-in-from-top-1">
                                <form.Field name="customFields">
                                  {(cf) => (
                                    <CustomFieldsEditor
                                      value={cf.state.value}
                                      onChange={cf.handleChange}
                                    />
                                  )}
                                </form.Field>
                              </div>
                            )}

                            <div className="border-t border-border" />
                          </div>
                        )}
                      </form.Field>

                      <form.Field name="showContactUs">
                        {(field) => (
                          <div className="flex flex-col gap-3">
                            <label className="flex cursor-pointer items-center gap-2.5">
                              <Checkbox
                                checked={field.state.value}
                                onCheckedChange={(checked) => field.handleChange(checked === true)}
                              />
                              <span className="text-[13px] font-medium text-foreground">
                                Contact us
                              </span>
                            </label>

                            {field.state.value && (
                              <div className="flex flex-col gap-3 pl-1 duration-200 animate-in fade-in-0 slide-in-from-top-1">
                                <div className="flex items-center gap-2.5">
                                  <Icon name="mail" className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  <form.Field name="supportEmail">
                                    {(f) => (
                                      <Input
                                        type="email"
                                        aria-label="Support email"
                                        value={f.state.value}
                                        onChange={(e) => f.handleChange(e.target.value)}
                                        className="text-foreground"
                                      />
                                    )}
                                  </form.Field>
                                </div>

                                <div className="flex items-center gap-2.5">
                                  <Icon name="phone" className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  <form.Field name="supportPhoneCountry">
                                    {(f) => (
                                      <Select value={f.state.value} onValueChange={f.handleChange}>
                                        <SelectTrigger className="w-28 shrink-0 cursor-pointer">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent position="popper">
                                          {PHONE_COUNTRY_OPTIONS.map((c) => (
                                            <SelectItem key={c} value={c}>
                                              {c}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </form.Field>
                                  <form.Field name="supportPhone">
                                    {(f) => (
                                      <Input
                                        aria-label="Support phone"
                                        value={f.state.value}
                                        onChange={(e) => f.handleChange(e.target.value)}
                                        className="text-foreground"
                                      />
                                    )}
                                  </form.Field>
                                </div>

                                <div className="flex items-center gap-2.5">
                                  <Icon name="globe" className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  <form.Field name="website">
                                    {(f) => (
                                      <Input
                                        aria-label="Website"
                                        value={f.state.value}
                                        onChange={(e) => f.handleChange(e.target.value)}
                                        className="text-foreground"
                                      />
                                    )}
                                  </form.Field>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </form.Field>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
            </div>
          </div>
        </div>

        {/* Right: live preview. The device toggle stays pinned while the
         * preview itself scrolls, so the taller mobile mock-up is fully
         * reachable instead of being clipped. */}
        <div className="hidden min-h-0 flex-col border-l border-border bg-sidebar lg:flex">
          <div className="flex shrink-0 items-center justify-between p-10 pb-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Preview
            </p>
            <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1">
              {(["desktop", "mobile"] as const).map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDevice(d)}
                  className={cn(
                    "h-auto min-h-0 cursor-pointer rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                    device === d
                      ? "bg-muted text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-14 pb-6">
            <form.Subscribe selector={(s) => s.values}>
              {(values) => <PaymentPagePreview values={values} device={device} />}
            </form.Subscribe>
          </div>
        </div>
      </div>

      <AddProductModal
        open={addProductOpen}
        onOpenChange={setAddProductOpen}
        onAdd={(product) => form.setFieldValue("products", [product])}
      />
    </div>
  );
}
