import type { PaTransaction } from "@/features/dashboard/transactions/types";

// ── Payment method cell — moved from paColumns.tsx verbatim (same logo maps,
// same fallback rules) so both the column renderer and any future reuse share
// one implementation instead of two. ──────────────────────────────────────────
const STATIC_BASE = "https://static.payglocal.in/";

const CARD_BRAND_LOGO_MAPPER: Record<string, string> = {
  VISA: "images/network/visa.v2.svg",
  MASTERCARD: "images/network/mastercard-new.v1.svg",
  AMEX: "images/network/american-express.v3.svg",
  AMERICAN_EXPRESS: "images/network/american-express.v3.svg",
  DINERS: "images/network/diners.v3.svg",
  DINERSCLUBINTERNATIONAL: "images/network/diners.v3.svg",
  JCB: "images/network/jcb.v5.svg",
  MAESTRO: "images/network/maestro.v2.svg",
  RUPAY: "images/network/rupay.v3.svg",
  DISCOVER: "images/network/discover.v3.svg",
};

const PAYMENT_METHOD_ICONS: Record<string, string> = {
  ALTPAY_UPI_INTENT: "images/payment-methods/upi/upi-name.v2.svg",
  ALTPAY_UPI_COLLECT: "images/payment-methods/upi/upi-name.v2.svg",
  PAYMENT_ACCOUNT_GOOGLE_PAY: "images/payment-methods/upi/google-pay.v1.svg",
  PAYMENT_ACCOUNT_APPLE_PAY: "icons/payflow/apple-pay.v2.svg",
};

function MethodImage({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="inline-flex items-center justify-center w-8 h-5 rounded bg-muted border border-border overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-3.5 w-5 object-contain" />
    </span>
  );
}

function FallbackBrand({ brand }: { brand?: string }) {
  return (
    <span className="inline-flex items-center justify-center min-w-8 h-5 px-1 rounded text-[9px] font-bold text-muted-foreground bg-muted border border-border">
      {brand ? brand.slice(0, 4).toUpperCase() : "CARD"}
    </span>
  );
}

export function TransactionPaymentMethod({ row }: { row: PaTransaction }) {
  const instrument = row.paymentInstrument?.toUpperCase();
  const last4 = row.maskedCardNumber?.replaceAll("x", "").replaceAll("X", "").trim();

  let logo: React.ReactNode;

  if (row.maskedCardNumber && row.cardBrand) {
    const path = CARD_BRAND_LOGO_MAPPER[row.cardBrand.toUpperCase()];
    logo = path ? (
      <MethodImage src={STATIC_BASE + path} alt={row.cardBrand} />
    ) : (
      <FallbackBrand brand={row.cardBrand} />
    );
  } else if (instrument && PAYMENT_METHOD_ICONS[instrument]) {
    logo = <MethodImage src={STATIC_BASE + PAYMENT_METHOD_ICONS[instrument]} alt={instrument} />;
  } else {
    logo = <FallbackBrand brand={row.cardBrand} />;
  }

  return (
    <div className="flex items-center gap-1.5">
      {logo}
      <span className="text-[13px] text-muted-foreground font-mono whitespace-nowrap">
        {instrument === "UPI" || instrument?.startsWith("ALTPAY_UPI")
          ? "UPI"
          : instrument?.startsWith("NETBANKING")
            ? "Net Banking"
            : instrument === "WALLET"
              ? "Wallet"
              : last4
                ? `••• ${last4}`
                : "•••••••"}
      </span>
    </div>
  );
}
