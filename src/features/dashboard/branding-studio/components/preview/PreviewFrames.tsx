import type { ReactNode } from "react";
import { AppImage } from "@/components/common/AppImage";
import { cn } from "@/lib/utils";

/** A browser window around a desktop preview: traffic lights and the URL. */
export function BrowserFrame({
  url,
  className,
  children,
}: {
  url: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-border bg-card shadow-sm", className)}
    >
      <div className="flex h-9 items-center gap-3 border-b border-border bg-muted/50 px-3">
        <span className="flex shrink-0 gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        </span>
        <span className="min-w-0 flex-1 truncate rounded border border-border bg-card px-2 py-1 font-mono text-[10.5px] text-muted-foreground">
          {url}
        </span>
      </div>
      {children}
    </div>
  );
}

/** A phone around a mobile preview: bezel, screen that scrolls, home bar. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="relative h-[740px] w-[372px] overflow-hidden rounded-[44px] border-[10px] border-neutral-900 bg-card">
        <div className="scrollbar-none h-full overflow-y-auto pb-8">{children}</div>
        <span className="absolute bottom-2 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-neutral-400" />
      </div>
    </div>
  );
}

const NETWORK_BASE = "https://static.payglocal.in/images/network/";
const NETWORK_FILE = {
  visa: "visa.v2.svg",
  mastercard: "mastercard-new.v1.svg",
  amex: "american-express.v3.svg",
  diners: "diners.v3.svg",
} as const;

/** A card network's mark from PayGlocal's static host (as on Transactions). */
export function NetworkMark({
  network,
  className,
}: {
  network: keyof typeof NETWORK_FILE;
  className?: string;
}) {
  return (
    <AppImage
      src={NETWORK_BASE + NETWORK_FILE[network]}
      alt=""
      width={16}
      height={10}
      unoptimized
      className={cn("h-2.5 w-4 object-contain", className)}
    />
  );
}

/** The merchant's mark: their logo if uploaded, else a tile with the initial. */
export function MerchantMark({
  name,
  logoUrl,
  size = 44,
}: {
  name: string;
  logoUrl: string | null;
  size?: number;
}) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-[min(var(--bs-radius-card),10px)] bg-white font-semibold text-neutral-900"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {logoUrl ? (
        <AppImage
          src={logoUrl}
          alt=""
          width={size}
          height={size}
          unoptimized
          className="h-full w-full object-contain p-1"
        />
      ) : (
        name.charAt(0)
      )}
    </span>
  );
}
