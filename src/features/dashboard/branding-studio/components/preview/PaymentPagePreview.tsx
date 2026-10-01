import { Icon, type IconName } from "@/components/icon";
import {
  BrowserFrame,
  MerchantMark,
  PhoneFrame,
} from "@/features/dashboard/branding-studio/components/preview/PreviewFrames";
import { PREVIEW_CONTENT } from "@/features/dashboard/branding-studio/constants";
import type { BrandingSettings, PreviewDevice } from "@/features/dashboard/branding-studio/types";

const FIELD =
  "flex h-10 items-center border border-neutral-200 bg-neutral-50 px-3.5 text-[12.5px] rounded-[var(--bs-radius-field)]";

function Label({ children }: { children: string }) {
  return (
    <p className="text-[12px] font-medium text-neutral-900">
      {children} <span className="text-red-500">*</span>
    </p>
  );
}

function ContactLine({ icon, children }: { icon: IconName; children: string }) {
  return (
    <p className="flex items-center gap-2 text-[11.5px] text-white/90">
      <Icon name={icon} size={12} className="text-white/70" />
      {children}
    </p>
  );
}

function PagePanel({ settings }: { settings: BrandingSettings }) {
  return (
    <div className="bg-[var(--bs-brand)] p-7 text-white">
      <div className="flex items-center gap-3">
        <MerchantMark name={PREVIEW_CONTENT.merchant} logoUrl={settings.logoUrl} />
        <div>
          <p className="text-[10px] text-white/75">Pay to</p>
          <p className="text-[14px] font-semibold">{PREVIEW_CONTENT.merchant}</p>
        </div>
      </div>

      {/* Product image slot, drawn as the design's placeholder art. */}
      <div className="relative mt-5 h-32 overflow-hidden rounded-[var(--bs-radius-card)] bg-white/15">
        <span className="absolute top-1/2 -left-8 h-16 w-16 -translate-y-1/2 rounded-full bg-white/15" />
        <span className="absolute top-9 right-2 left-20 h-2.5 rounded-full bg-white/25" />
        <span className="absolute top-14 right-12 left-20 h-2 rounded-full bg-white/20" />
        <span className="absolute top-[4.6rem] right-17 left-20 h-2 rounded-full bg-white/20" />
      </div>

      <p className="mt-6 text-[13.5px] font-semibold">{PREVIEW_CONTENT.product}</p>
      <p className="mt-2 text-[11.5px] leading-relaxed text-white/80">
        {PREVIEW_CONTENT.productDescription}
      </p>

      <div className="mt-5 space-y-2.5 border-t border-white/20 pt-5">
        <p className="text-[9.5px] font-semibold tracking-wider text-white/70 uppercase">
          Contact us
        </p>
        <ContactLine icon="mail">{PREVIEW_CONTENT.contactEmail}</ContactLine>
        <ContactLine icon="phone">{PREVIEW_CONTENT.contactPhone}</ContactLine>
        <ContactLine icon="globe">{PREVIEW_CONTENT.contactWebsite}</ContactLine>
      </div>
    </div>
  );
}

function DetailsForm() {
  return (
    <div className="p-8 text-neutral-900">
      <p className="text-[17px] font-semibold">Your details</p>
      <p className="mt-1 text-[12px] text-neutral-500">Enter information to continue to payment.</p>

      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label>Amount</Label>
          <div className={FIELD}>₹ {PREVIEW_CONTENT.pageAmount}</div>
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <div className={`${FIELD} text-neutral-400`}>you@example.com</div>
        </div>
        <div className="space-y-2">
          <Label>Phone number</Label>
          <div className={`${FIELD} gap-3`}>
            <span className="flex items-center gap-1 border-r border-neutral-200 pr-3">
              +91 <Icon name="chevron-down" size={11} className="text-neutral-400" />
            </span>
            {PREVIEW_CONTENT.pagePhone}
          </div>
        </div>
        <p className="flex items-start gap-2.5 text-[11.5px] leading-relaxed text-neutral-600">
          <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-[3px] border border-neutral-300" />
          By continuing, you confirm this purchase is being made by you and that you&apos;re
          responsible for its accuracy.
        </p>
        {/* Faded, as it is until the box above is ticked. */}
        <div className="flex h-11 items-center justify-center gap-1.5 rounded-[var(--bs-radius-button)] bg-[var(--bs-accent)]/55 text-[13px] font-semibold text-white">
          Continue to payment <Icon name="chevron-right" size={14} />
        </div>
      </div>
    </div>
  );
}

/** A hosted payment page (here, a donation page) in the merchant's branding. */
export function PaymentPagePreview({
  settings,
  device,
}: {
  settings: BrandingSettings;
  device: PreviewDevice;
}) {
  if (device === "MOBILE") {
    return (
      <PhoneFrame>
        <PagePanel settings={settings} />
        <DetailsForm />
      </PhoneFrame>
    );
  }
  return (
    <BrowserFrame url="https://pay.payglocal.in/pages/mock-donation" className="w-[768px]">
      <div className="grid grid-cols-[290px_1fr]">
        <PagePanel settings={settings} />
        <DetailsForm />
      </div>
    </BrowserFrame>
  );
}
