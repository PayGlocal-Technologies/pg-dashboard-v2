const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const CURRENCY_SYMBOLS: Record<string, string> = {
  // Major Global Currencies
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
  CAD: "C$",
  JPY: "¥",
  CNY: "¥",
  CHF: "CHF",
  HKD: "HK$",
  SEK: "kr",
  // Additional Major Currencies
  KRW: "₩",
  SGD: "S$",
  NOK: "kr",
  NZD: "NZ$",
  MXN: "Mex$",
  TWD: "NT$",
  ZAR: "R",
  BRL: "R$",
  DKK: "kr",
  // European Currencies
  PLN: "zł",
  CZK: "Kč",
  HUF: "Ft",
  RON: "lei",
  BGN: "лв",
  HRK: "kn",
  RSD: "дин",
  UAH: "₴",
  BYN: "Br",
  ALL: "L",
  // Middle Eastern Currencies
  AED: "د.إ",
  SAR: "﷼",
  BHD: ".د.ب",
  QAR: "﷼",
  OMR: "﷼",
  KWD: "د.ك",
  JOD: "د.أ",
  ILS: "₪",
  IRR: "﷼",
  EGP: "£",
  // Asian Currencies
  THB: "฿",
  IDR: "Rp",
  PHP: "₱",
  MYR: "RM",
  VND: "₫",
  PKR: "₨",
  BDT: "৳",
  LKR: "රු",
  NPR: "₨",
  KZT: "₸",
  // Latin American Currencies
  ARS: "ARS$",
  CLP: "CLP$",
  COP: "COL$",
  PEN: "S/",
  UYU: "$U",
  PYG: "₲",
  BOB: "Bs",
  CRC: "₡",
  DOP: "RD$",
  GTQ: "Q",
  // African Currencies
  NGN: "₦",
  KES: "KSh",
  ETB: "Br",
  GHS: "GH₵",
  MAD: "د.م.",
  TZS: "TSh",
  UGX: "USh",
  XAF: "FCFA",
  XOF: "CFA",
  ZMW: "ZK",
  // Other Currencies
  RUB: "₽",
  TRY: "₺",
  ISK: "kr",
  FJD: "FJ$",
  JMD: "J$",
  BSD: "B$",
  BBD: "Bds$",
  BZD: "BZ$",
  BMD: "BD$",
  KYD: "CI$",
};

/**
 * Single source of truth for currency formatting (replaces the ~8 ad-hoc
 * symbol ternaries that existed in the prototype). Symbol + grouped amount.
 */
export function formatCurrency(amount: number, currency: string = "INR", locale = "en-IN"): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Compact number formatting: 1_500 -> "1.5K", 2_400_000 -> "2.4M". */
export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

/**
 * Formats dates for UI. Uses fixed English strings (not Intl) so server and
 * client render identical markup and avoid hydration mismatches.
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const o: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...options,
  };

  const includeTime = o.hour !== undefined && o.minute !== undefined;

  let datePart: string;
  if (o.month === "long" && o.day === "numeric") {
    const y =
      o.year === "numeric" ? String(d.getFullYear()) : String(d.getFullYear() % 100).padStart(2, "0");
    datePart = `${MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${y}`;
  } else {
    const day = String(d.getDate()).padStart(2, "0");
    const mon = o.month === "long" ? MONTHS_LONG[d.getMonth()] : MONTHS_SHORT[d.getMonth()];
    const yr =
      o.year === "numeric" ? String(d.getFullYear()) : String(d.getFullYear() % 100).padStart(2, "0");
    datePart = `${day} ${mon} ${yr}`;
  }

  if (!includeTime) return datePart;

  const use12 = o.hour12 !== false;
  const h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  let timePart: string;
  if (use12) {
    const ap = h >= 12 ? "PM" : "AM";
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    timePart = `${String(h12).padStart(2, "0")}:${min} ${ap}`;
  } else {
    timePart = `${String(h).padStart(2, "0")}:${min}`;
  }

  return `${datePart}, ${timePart}`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return `${str.slice(0, length)}...`;
}
