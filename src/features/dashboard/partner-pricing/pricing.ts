/**
 * Partner Pricing: the products, PayGlocal's rate on each, and the maths the
 * page and the Earnings Preview share. One module, so the table's margin, the
 * header's counts and the preview's split can never disagree.
 *
 * DESIGN MOCK. No pricing endpoint or calculation exists in this app yet.
 * TODO(integration): read products, PayGlocal rates and the partner's saved
 * fees from the partner pricing API, and replace `splitPayment` with the real
 * settlement rule, both confirmed against pg-dashboard and Finance.
 */

export interface PricingProduct {
  id: string;
  category: PricingCategoryId;
  name: string;
  description: string;
  /** PayGlocal's rate, in percent. Read-only for the partner. */
  payglocalRate: number;
}

export type PricingCategoryId = "global" | "domestic" | "international";

export const PRICING_CATEGORIES: { id: PricingCategoryId; name: string; description: string }[] = [
  {
    id: "global",
    name: "Global accounts",
    description: "Default fees for global account products.",
  },
  {
    id: "domestic",
    name: "Domestic payment processing",
    description: "Fees on payments made with cards and methods issued in India.",
  },
  {
    id: "international",
    name: "International payment processing",
    description: "Fees on payments made with cards issued outside India.",
  },
];

/** MOCK products and PayGlocal rates. Illustrative, not real pricing. */
export const PRICING_PRODUCTS: PricingProduct[] = [
  {
    id: "mca",
    category: "global",
    name: "MCA",
    description: "Multi-Currency Accounts collections",
    payglocalRate: 10,
  },
  {
    id: "amazon",
    category: "global",
    name: "Amazon",
    description: "Payouts from Amazon marketplaces",
    payglocalRate: 0.3,
  },
  {
    id: "upi",
    category: "domestic",
    name: "UPI",
    description: "UPI payments",
    payglocalRate: 0.5,
  },
  {
    id: "domestic-debit",
    category: "domestic",
    name: "Debit cards",
    description: "Domestic debit cards on all networks",
    payglocalRate: 1,
  },
  {
    id: "domestic-credit",
    category: "domestic",
    name: "Credit cards",
    description: "Domestic credit cards on all networks",
    payglocalRate: 1.75,
  },
  {
    id: "intl-cards",
    category: "international",
    name: "International cards",
    description: "Visa, Mastercard, Amex and other foreign cards",
    payglocalRate: 2.65,
  },
  {
    id: "wallets",
    category: "international",
    name: "Apple Pay and Google Pay",
    description: "Wallet payments from international customers",
    payglocalRate: 2.65,
  },
];

/** MOCK saved merchant fees: three set below PayGlocal's rate, so the page
 *  opens on a realistic mix of states. Strings, as typed. */
export const SAVED_MERCHANT_FEES: Record<string, string> = {
  mca: "10",
  amazon: "0.5",
  upi: "0.4",
  "domestic-debit": "1.25",
  "domestic-credit": "1.5",
  "intl-cards": "3",
  wallets: "2.5",
};

/** A merchant fee as typed: a number with up to 2 decimals, 0–100. Empty or
 *  anything else is "not configured". */
export function parseFee(value: string): number | null {
  const v = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return null;
  const n = Number(v);
  return n <= 100 ? n : null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export type MarginState = "positive" | "zero" | "below" | "unset";

/** The partner's margin on a product: merchant fee minus PayGlocal's rate,
 *  in percentage points, rounded so 0.5 − 0.3 reads 0.2, not 0.20000000004. */
export function marginFor(product: PricingProduct, merchantFee: string) {
  const fee = parseFee(merchantFee);
  if (fee === null) return { state: "unset" as MarginState, margin: null };
  const margin = round2(fee - product.payglocalRate);
  const state: MarginState = margin > 0 ? "positive" : margin === 0 ? "zero" : "below";
  return { state, margin };
}

/** "2", "0.2", "1.75": no trailing zeros. */
export function formatRate(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/** GST charged on the fee. MOCK: inferred, see splitPayment. */
export const GST_RATE = 18;

export interface PaymentSplit {
  merchantGets: number;
  youGet: number;
  payglocalGets: number;
  /** The merchant fee charged on the payment, before GST. */
  feeAmount: number;
  gstAmount: number;
}

/**
 * How one payment divides, for the Earnings Preview.
 *
 * MOCK RULE, inferred from the design brief's own example (₹10,000 at a 10%
 * fee and a 10% PayGlocal rate → merchant ₹8,820, partner ₹0, PayGlocal
 * ₹1,180), which only holds if:
 *  - the merchant fee is charged on the payment amount,
 *  - GST (18%) is charged on that fee,
 *  - the partner gets the margin (fee − PayGlocal rate) on the amount,
 *  - PayGlocal gets its rate on the amount, plus the GST it collects.
 * Below PayGlocal's rate the merchant is still charged the fee the partner
 * set (that is what this page sets), the partner gets nothing, and PayGlocal
 * gets that whole fee; who covers the shortfall to its rate is not defined
 * here. This is a stand-in, not a settlement rule: confirm the real one
 * (including that shortfall, and whether GST applies to the partner's share)
 * before launch.
 */
export function splitPayment(
  amount: number,
  product: PricingProduct,
  merchantFee: number
): PaymentSplit {
  const feeAmount = round2((amount * merchantFee) / 100);
  const gstAmount = round2((feeAmount * GST_RATE) / 100);
  const youGet = round2((amount * Math.max(0, merchantFee - product.payglocalRate)) / 100);
  const payglocalGets = round2(feeAmount - youGet + gstAmount);
  return {
    merchantGets: round2(amount - feeAmount - gstAmount),
    youGet,
    payglocalGets,
    feeAmount,
    gstAmount,
  };
}

/** "₹8,820" for whole rupees, "₹994.10" otherwise: never "₹994.1". */
export function formatInr(n: number) {
  const fractional = Math.round(n * 100) % 100 !== 0;
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: fractional ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}
