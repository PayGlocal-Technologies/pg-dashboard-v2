import { Icon, type IconName } from "@/components/icon";
import { BrandLogo } from "@/features/auth/components/BrandLogo";

const HIGHLIGHTS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "shield-check",
    title: "Bank-grade security",
    body: "End-to-end encrypted sign-in and multi-factor authentication on every login.",
  },
  {
    icon: "repeat",
    title: "Payments in one place",
    body: "Transactions, settlements, and payouts across every market you operate in.",
  },
  {
    icon: "bar-chart",
    title: "Insights that move the needle",
    body: "Real-time reporting on success rates, refunds, and reconciliation.",
  },
];

/** Marketing/brand panel shown on the left of the auth screens (desktop only). */
export function AuthSplitScreen() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-white lg:flex">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-black/10 blur-3xl"
      />
      <BrandLogo onDark className="relative" />

      <div className="relative max-w-md space-y-8">
        <h2 className="text-2xl font-semibold leading-snug">
          The cross-border payments platform built for global growth.
        </h2>
        <ul className="space-y-5">
          {HIGHLIGHTS.map((h) => (
            <li key={h.title} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                <Icon name={h.icon} size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold">{h.title}</p>
                <p className="text-sm text-white/75">{h.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-white/60">
        © PayGlocal. All rights reserved.
      </p>
    </div>
  );
}
