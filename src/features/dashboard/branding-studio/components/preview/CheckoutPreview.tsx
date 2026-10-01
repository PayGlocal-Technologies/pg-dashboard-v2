import { Icon } from "@/components/icon";
import { AppImage } from "@/components/common/AppImage";
import {
  BrowserFrame,
  MerchantMark,
  NetworkMark,
  PhoneFrame,
} from "@/features/dashboard/branding-studio/components/preview/PreviewFrames";
import { PREVIEW_CONTENT } from "@/features/dashboard/branding-studio/constants";
import { formatRupees, payButtonText } from "@/features/dashboard/branding-studio/helpers";
import type { BrandingSettings, PreviewDevice } from "@/features/dashboard/branding-studio/types";
import { cn } from "@/lib/utils";

const FIELD =
  "flex h-8 items-center border border-border px-2.5 text-[11px] text-muted-foreground rounded-[var(--bs-radius-field)]";

/** One cell of the joined card-details block; the block owns the border. */
const CARD_CELL = "flex h-8 items-center px-2.5 text-[11px] text-muted-foreground";

function OrderPanel({ settings, compact }: { settings: BrandingSettings; compact: boolean }) {
  const amount = formatRupees(PREVIEW_CONTENT.amount);
  return (
    <div className={cn("bg-[var(--bs-brand)] text-white", compact ? "p-5" : "p-6")}>
      <div className="flex items-center gap-3">
        <MerchantMark name={PREVIEW_CONTENT.merchant} logoUrl={settings.logoUrl} />
        <span className="text-[15px] font-semibold">{PREVIEW_CONTENT.merchant}</span>
      </div>
      <p className="mt-8 text-[9.5px] font-medium tracking-wider text-white/70 uppercase">Paying</p>
      <p className="mt-1 text-[21px] font-semibold">{amount}</p>
      {!compact && (
        <div className="mt-5 divide-y divide-white/20 border-t border-white/20 text-[11.5px]">
          <div className="flex justify-between py-3.5 text-white/85">
            <span>Order value</span>
            <span className="font-medium text-white">{amount}</span>
          </div>
          <div className="flex items-center justify-between py-3.5 text-white/85">
            <span>Total amount</span>
            <span className="text-[15px] font-semibold text-white">{amount}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentForm({ settings }: { settings: BrandingSettings }) {
  const amount = formatRupees(PREVIEW_CONTENT.amount);
  return (
    <div className="flex flex-col p-5 text-neutral-900">
      <div className="-mx-5 flex items-center justify-between border-b border-neutral-200 px-5 pb-4">
        <p className="text-[14px] font-semibold">Complete your payment</p>
        <Icon name="x" size={14} className="text-neutral-500" />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold">
          Express checkout
          <span className="rounded-full bg-[var(--bs-accent)]/15 px-1.5 py-0.5 text-[8.5px] font-semibold text-[var(--bs-accent)]">
            Fastest
          </span>
        </span>
        <span className="flex gap-1">
          <NetworkMark network="visa" />
          <NetworkMark network="mastercard" />
        </span>
      </div>
      <div className="mt-2 flex h-9 items-center justify-center gap-1 rounded-[var(--bs-radius-button)] bg-black text-[11.5px] font-medium text-white">
        <AppImage
          src="https://static.payglocal.in/icons/payflow/apple-pay.v2.svg"
          alt=""
          width={36}
          height={16}
          unoptimized
          className="h-[11px] w-auto invert"
        />
      </div>

      <div className="my-4 flex items-center gap-2 text-[8.5px] font-medium tracking-wider text-neutral-400 uppercase">
        <span className="h-px flex-1 bg-neutral-200" />
        Or pay with
        <span className="h-px flex-1 bg-neutral-200" />
      </div>

      <div className="space-y-3.5 rounded-[var(--bs-radius-card)] border border-neutral-200 p-3.5">
        <div className="-mx-3.5 flex items-center justify-between border-b border-neutral-200 px-3.5 pb-3.5">
          <span className="flex items-center gap-1.5 text-[11.5px] font-medium">
            Credit or debit card
            <NetworkMark network="visa" />
            <NetworkMark network="mastercard" />
            <NetworkMark network="amex" />
            <NetworkMark network="diners" />
            <span className="rounded border border-neutral-200 px-1 text-[8px] text-neutral-500">
              +4
            </span>
          </span>
          <span className="h-3 w-3 rounded-full bg-[var(--bs-accent)] ring-2 ring-[var(--bs-accent)]/25" />
        </div>
        <div className="space-y-1.5">
          <p className="text-[10.5px] font-medium">Email</p>
          <div className={FIELD}>you@example.com</div>
        </div>
        <div className="space-y-1.5">
          <p className="text-[10.5px] text-neutral-500">Enter card details</p>
          <div className="overflow-hidden rounded-[min(var(--bs-radius-field),12px)] border border-border">
            <div className={cn(CARD_CELL, "justify-between border-b border-border")}>
              1234 1234 1234 1234
              <span className="flex gap-0.5">
                <NetworkMark network="visa" />
                <NetworkMark network="mastercard" />
              </span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-border">
              <div className={CARD_CELL}>MM / YY</div>
              <div className={cn(CARD_CELL, "justify-between")}>
                CVC
                <Icon name="credit-card" size={12} />
              </div>
            </div>
          </div>
        </div>
        <p className="flex items-start gap-1.5 text-[9.5px] leading-snug text-neutral-600">
          <span className="mt-px h-3 w-3 shrink-0 rounded-[3px] border border-neutral-300" />
          <span>
            By continuing, you agree to the <span className="text-[var(--bs-accent)]">T&amp;C</span>{" "}
            and <span className="text-[var(--bs-accent)]">Privacy Policy</span>.
          </span>
        </p>
        <div className="flex h-9 items-center justify-center rounded-[var(--bs-radius-button)] bg-[var(--bs-accent)] text-[11.5px] font-semibold text-white">
          {payButtonText(settings.buttonLabel, `${amount} INR`)}
        </div>
        <p className="flex justify-center gap-4 text-[8.5px] text-neutral-400">
          <span className="flex items-center gap-1">
            <Icon name="shield-check" size={10} /> 256-bit encryption
          </span>
          <span className="flex items-center gap-1">
            <Icon name="lock" size={10} /> PCI DSS Compliant
          </span>
        </p>
      </div>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-neutral-500">
        Powered by
        <AppImage
          src="/assets/payglocal-logo.png"
          alt="PayGlocal"
          width={80}
          height={14}
          className="h-3.5 w-auto"
        />
      </p>
    </div>
  );
}

/** The hosted checkout, as a customer paying the merchant sees it. */
export function CheckoutPreview({
  settings,
  device,
}: {
  settings: BrandingSettings;
  device: PreviewDevice;
}) {
  if (device === "MOBILE") {
    return (
      <PhoneFrame>
        <OrderPanel settings={settings} compact />
        <PaymentForm settings={settings} />
      </PhoneFrame>
    );
  }
  return (
    <BrowserFrame url="https://pay.payglocal.in/checkout/mock" className="w-[600px]">
      <div className="grid grid-cols-[250px_1fr]">
        <OrderPanel settings={settings} compact={false} />
        <PaymentForm settings={settings} />
      </div>
    </BrowserFrame>
  );
}
