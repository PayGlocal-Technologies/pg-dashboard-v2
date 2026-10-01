import { Icon, type IconName } from "@/components/icon";
import {
  BrowserFrame,
  PhoneFrame,
} from "@/features/dashboard/branding-studio/components/preview/PreviewFrames";
import { PREVIEW_CONTENT } from "@/features/dashboard/branding-studio/constants";
import type { PreviewDevice } from "@/features/dashboard/branding-studio/types";
import { cn } from "@/lib/utils";

const SOCIAL: IconName[] = ["instagram", "facebook", "x", "youtube"];

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 text-[12px]">
      <span className="shrink-0 text-neutral-500">{label}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

/** The payment request email itself; `compact` is the phone layout. */
function EmailBody({ compact }: { compact: boolean }) {
  const amount = `₹${PREVIEW_CONTENT.amount.toLocaleString("en-IN")}.00 INR`;
  const pad = compact ? "px-4" : "px-6";
  return (
    <div className="bg-white text-neutral-900">
      <p className="border-b border-neutral-200 bg-neutral-50 px-2.5 py-1.5 font-mono text-[9.5px] text-neutral-600">
        To: {PREVIEW_CONTENT.customerEmail} · Payment request
      </p>

      <div className={cn("bg-[var(--bs-brand)] py-5 text-white", pad)}>
        <p className={cn("font-semibold", compact ? "text-[14px]" : "text-[19px]")}>
          Payment request from {PREVIEW_CONTENT.merchant}
        </p>
        <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px]">
          <Icon name="package" size={11} />
          {PREVIEW_CONTENT.purpose}
        </span>
      </div>

      <div className={cn("space-y-5 py-7", pad)}>
        <p className={cn("font-semibold", compact ? "text-[14px]" : "text-[16px]")}>
          Hi {PREVIEW_CONTENT.customerName},
        </p>
        <p className="text-[12.5px] leading-relaxed text-neutral-700">
          You&apos;ve received a payment request of{" "}
          <strong className="text-neutral-900">{amount}</strong> from{" "}
          <strong className="text-neutral-900">{PREVIEW_CONTENT.merchant}</strong>. Here are the
          details:
        </p>

        <div className="space-y-2.5 rounded-[var(--bs-radius-card)] border border-neutral-200 bg-neutral-50 p-3.5">
          <p className="text-[9.5px] font-semibold tracking-wider text-neutral-500 uppercase">
            Payment details
          </p>
          <Detail label="Issued to">
            <span className="text-[var(--bs-accent)]">{PREVIEW_CONTENT.issuedTo}</span>
          </Detail>
          <Detail label="Link expiry">
            <span className="text-amber-800">{PREVIEW_CONTENT.linkExpiry}</span>
          </Detail>
          <Detail label="Billing details">{PREVIEW_CONTENT.billingAddress}</Detail>
        </div>

        <div className="flex items-end justify-between gap-3 border-t border-neutral-200 pt-5">
          <div>
            <p className="text-[9.5px] font-semibold tracking-wider text-neutral-500 uppercase">
              Amount payable
            </p>
            <p className="mt-1 text-[20px] font-semibold">{amount}</p>
          </div>
          <span className="flex h-10 shrink-0 items-center rounded-[var(--bs-radius-button)] bg-[var(--bs-accent)] px-5 text-[13px] font-semibold text-white">
            Proceed to pay
          </span>
        </div>

        <p className="text-[11.5px] leading-relaxed text-neutral-600">
          For any order or payment-related queries, please reach out to{" "}
          <strong className="text-neutral-900">{PREVIEW_CONTENT.merchant}</strong> support.
        </p>
      </div>

      <div className={cn("border-t border-neutral-200 bg-neutral-50 py-5", pad)}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13.5px] font-semibold text-[#0061E3]">PayGlocal</p>
            <p className="text-[9.5px] text-neutral-500">Fostering Global Commerce</p>
          </div>
          <span className="flex gap-3 text-neutral-500">
            {SOCIAL.map((icon) => (
              <Icon key={icon} name={icon} size={13} />
            ))}
          </span>
        </div>
        <p className="mt-5 text-[9.5px] text-neutral-500">
          © 2026 PayGlocal Technologies Pvt. Ltd.
        </p>
      </div>
    </div>
  );
}

/** The payment request email a customer receives, in the merchant's branding. */
export function EmailPreview({ device }: { device: PreviewDevice }) {
  if (device === "MOBILE") {
    return (
      <PhoneFrame>
        <EmailBody compact />
      </PhoneFrame>
    );
  }
  return (
    <BrowserFrame url="https://mail.payglocal.in/view/payment-request/mock" className="w-[672px]">
      <div className="px-12 py-3">
        <div className="overflow-hidden rounded-[var(--bs-radius-card)] border border-neutral-200 shadow-sm">
          <EmailBody compact={false} />
        </div>
      </div>
    </BrowserFrame>
  );
}
