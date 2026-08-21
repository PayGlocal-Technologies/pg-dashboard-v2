"use client";

import Image from "next/image";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { CURRENCY_SYMBOLS } from "@/features/dashboard/payment-pages/constants";
import type {
  PaymentPageBuilderValues,
  PreviewDevice,
} from "@/features/dashboard/payment-pages/types";

interface PaymentPagePreviewProps {
  values: PaymentPageBuilderValues;
  device: PreviewDevice;
}

function slugify(title: string): string {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function formatAmount(values: PaymentPageBuilderValues): string {
  if (values.amountType === "customer") return "Customer decides";
  const symbol = CURRENCY_SYMBOLS[values.currency] ?? `${values.currency} `;
  const parsed = Number(values.price);
  const amount = values.price.trim() && !Number.isNaN(parsed) ? parsed : 0;
  return `${symbol}${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** A non-interactive input facsimile for the preview form. */
function FakeField({ placeholder, isSelect }: { placeholder: string; isSelect?: boolean }) {
  return (
    <div className="flex h-9 items-center justify-between gap-2 rounded-md border border-border bg-card px-3 text-[13px] text-muted-foreground">
      <span className="truncate">{placeholder}</span>
      {isSelect ? <Icon name="chevron-down" className="h-3.5 w-3.5 shrink-0" /> : null}
    </div>
  );
}

/** Read-only facsimile of the hosted payment page. Every value is derived from
 * the builder form so it re-renders live as the merchant edits the left panel.
 * Rendered as a separate component so the builder container stays focused on
 * form state. */
export function PaymentPagePreview({ values, device }: PaymentPagePreviewProps) {
  const isMobile = device === "mobile";
  const initial = (values.businessName.trim()[0] ?? "A").toUpperCase();
  const firstProduct = values.products[0];
  const slug = firstProduct ? slugify(firstProduct.title) : values.pageSlug || "your-page";
  const pageUrl = `pay.payglocal.in/${values.pageHandle || "your-business"}/${slug}`;

  const labelledField = (
    label: string,
    placeholder: string,
    opts?: { prefix?: string; required?: boolean }
  ) => (
    <div className="space-y-1.5">
      <p className="text-[13px] font-medium text-foreground">
        {label} {opts?.required !== false && <span className="text-primary">*</span>}
      </p>
      <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-[13px] text-muted-foreground">
        {opts?.prefix ? <span className="text-foreground">{opts.prefix}</span> : null}
        <span>{placeholder}</span>
      </div>
    </div>
  );

  // Placeholder hint per custom-field type (falls back to the default value).
  const customFieldPlaceholder = (type: string, defaultValue: string): string => {
    if (defaultValue.trim()) return defaultValue;
    if (type === "email") return "you@example.com";
    if (type === "number") return "0";
    if (type === "phone") return "Phone number";
    return "Enter value";
  };

  return (
    <div
      className={cn(
        "mx-auto w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        "transition-[max-width] duration-500 ease-in-out",
        isMobile ? "max-w-[400px]" : "max-w-[760px]"
      )}
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-3 border-b border-border bg-muted/50 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex flex-1 items-center justify-center gap-1.5 text-[12px] text-muted-foreground">
          <Icon name="lock" className="h-3 w-3" />
          <span className="truncate">{pageUrl}</span>
        </div>
      </div>

      {/* Hosted page body */}
      <div className={cn("flex", isMobile ? "flex-col" : "min-h-[480px] flex-row")}>
        {/* Left blue panel */}
        <div
          className={cn(
            "flex flex-col bg-primary text-primary-foreground",
            isMobile ? "w-full p-5 text-center" : "w-[46%] p-6"
          )}
        >
          <div className={cn("flex items-center gap-2.5", isMobile && "justify-center")}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground text-sm font-bold text-primary">
              {initial}
            </span>
            <div className="leading-tight">
              <p className="text-[11px] text-primary-foreground/70">Pay to</p>
              <p className="text-sm font-semibold">{values.businessName || "Your business"}</p>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-[11px] font-medium uppercase tracking-wide text-primary-foreground/70">
              Paying
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{formatAmount(values)}</p>
          </div>

          {firstProduct?.coverImage && (
            <Image
              src={firstProduct.coverImage}
              alt={firstProduct.title}
              width={320}
              height={180}
              unoptimized
              // Fixed height + capped width so the cover doesn't scale up when
              // the panel briefly widens during the desktop/mobile switch.
              // object-contain shows any aspect ratio fully (no crop); the tinted
              // backdrop fills the letterbox.
              className="mx-auto mt-6 h-44 w-full max-w-[340px] rounded-lg bg-primary-foreground/10 object-contain"
            />
          )}

          {firstProduct && (
            <div className="mt-4">
              <p className="text-lg font-semibold">{firstProduct.title}</p>
              {firstProduct.description && (
                <p className="mt-0.5 text-[13px] text-primary-foreground/80">
                  {firstProduct.description}
                </p>
              )}
            </div>
          )}

          {values.showContactUs && (
            <div
              className={cn(
                "border-t border-primary-foreground/20 pt-4",
                isMobile ? "mt-8" : "mt-auto"
              )}
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-primary-foreground/70">
                Contact us
              </p>
              <div className="mt-2.5 space-y-2 text-[12px] text-primary-foreground/90">
                <div className={cn("flex items-center gap-2", isMobile && "justify-center")}>
                  <Icon name="mail" className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{values.supportEmail}</span>
                </div>
                <div className={cn("flex items-center gap-2", isMobile && "justify-center")}>
                  <Icon name="phone" className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {values.supportPhoneCountry} {values.supportPhone}
                  </span>
                </div>
                <div className={cn("flex items-center gap-2", isMobile && "justify-center")}>
                  <Icon name="globe" className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{values.website}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right details panel */}
        <div className={cn("flex flex-1 flex-col gap-4", isMobile ? "p-5 text-center" : "p-6")}>
          <div>
            <p className="text-lg font-bold text-foreground">Your details</p>
            <p className="text-[13px] text-muted-foreground">
              Enter information to continue to payment.
            </p>
          </div>

          {values.collectEmail && labelledField("Email", "you@example.com")}
          {values.collectPhone && labelledField("Phone number", "7011458408", { prefix: "+91" })}

          {values.collectBilling && (
            <div className="space-y-1.5">
              <p className="text-[13px] font-medium text-foreground">Billing address</p>
              <FakeField placeholder="India" isSelect />
              <div className="grid grid-cols-2 gap-2">
                <FakeField placeholder="PIN code" />
                <FakeField placeholder="City" />
              </div>
              <FakeField placeholder="State / province / region" isSelect />
              <FakeField placeholder="Address line 1" />
              <FakeField placeholder="Address line 2 (optional)" />
            </div>
          )}

          {values.addCustomFields &&
            values.customFields.map((f, i) => (
              <div key={i}>
                {labelledField(f.label || "Field", customFieldPlaceholder(f.type, f.defaultValue), {
                  required: !f.optional,
                })}
              </div>
            ))}

          <div className="mt-1 flex h-11 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            Continue to payment
          </div>
        </div>
      </div>
    </div>
  );
}
