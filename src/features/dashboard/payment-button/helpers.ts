import type { CSSProperties } from "react";
import type { IconName } from "@/components/icon";
import type { BadgeVariant } from "@payglocal_ui/flux-ui";
import { currencySymbol } from "@/lib/utils/format";
import { toast } from "sonner";
import {
  COLLECT_FIELD_TOKEN,
  DEFAULT_BUTTON_COLOR,
  EMBED_CODE_COPIED_MESSAGE,
  PAYMENT_BUTTON_SCRIPT_SRC,
  PAYMENT_BUTTON_STATUS_LABEL,
} from "@/features/dashboard/payment-button/constants";
import type {
  PaymentButton,
  PaymentButtonAppearance,
  PaymentButtonListRequest,
  PaymentButtonCollectFields,
  CreatePaymentButtonBody,
  PaymentButtonFormValues,
  PaymentButtonScript,
  PaymentButtonRadius,
  PaymentButtonSize,
  PaymentButtonStatus,
  PaymentButtonTheme,
  WqrProductEntry,
} from "@/features/dashboard/payment-button/types";

type StatusMeta = {
  label: string;
  variant: BadgeVariant;
  /** Trailing glyph, from our own registry (see PaymentButtonStatusBadge). */
  icon: IconName;
};

/**
 * Status → chip. Active is MCA Links' green chip with a tick, Disabled the red
 * `danger` chip with a ban (circle and slash), Draft the quiet muted chip with
 * a pencil: still being written, never live.
 *
 * Every glyph comes from our registry rather than flux's `trailIcon`, which
 * has no ban or pencil and draws its own icons a touch below the text's visual
 * centre; drawing all three one way keeps the chips identical.
 */
const STATUS_META: Record<PaymentButtonStatus, StatusMeta> = {
  ACTIVE: { label: PAYMENT_BUTTON_STATUS_LABEL.ACTIVE, variant: "success", icon: "check" },
  DISABLED: { label: PAYMENT_BUTTON_STATUS_LABEL.DISABLED, variant: "danger", icon: "ban" },
  DRAFT: { label: PAYMENT_BUTTON_STATUS_LABEL.DRAFT, variant: "muted", icon: "pencil" },
};

export function getPaymentButtonStatusMeta(status: PaymentButtonStatus): StatusMeta {
  return STATUS_META[status];
}

/**
 * Symbol + grouped amount, with decimals only when the value has them —
 * "₹5,000", "C$1,500", "$12.50". formatCurrency always pads to two decimals,
 * which the design doesn't show for whole amounts; the symbol still comes from
 * the shared map so no currency is spelled differently here.
 */
export function formatButtonAmount(amount: string | null, currency: string | null): string {
  const value = parseFloat(amount ?? "");
  if (Number.isNaN(value) || !currency) return "—";
  return `${currencySymbol(currency)}${value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/** The API's status → the design's. INACTIVE is Disabled; DRAFT is future-proofing. */
export function mapWqrStatus(raw: string | null | undefined): PaymentButtonStatus {
  switch ((raw ?? "").toUpperCase()) {
    case "ACTIVE":
      return "ACTIVE";
    case "DRAFT":
      return "DRAFT";
    default:
      return "DISABLED";
  }
}

/**
 * The design's status → the API's `merchantProductDataStatus` values. DRAFT
 * has none yet, so it is dropped from the request (see buildPaymentButtonListBody).
 */
const STATUS_API_VALUE: Partial<Record<PaymentButtonStatus, string>> = {
  ACTIVE: "ACTIVE",
  DISABLED: "INACTIVE",
};

/** One list row → the table's row. Fields the API lacks stay null ("—"). */
export function mapWqrEntry(entry: WqrProductEntry): PaymentButton {
  return {
    gid: `${entry.mid}-${entry.productId}`,
    mid: entry.mid,
    buttonId: entry.productId,
    status: mapWqrStatus(entry.merchantProductDataStatus),
    createdAt: entry.formattedCreationTime,
    startsOn: entry.formattedStartDate || null,
    expiresOn: entry.formattedExpiryDate || null,
    label: null,
    amountType: null,
    amount: null,
    currency: null,
    successfulPayments: null,
    revenue: null,
  };
}

/**
 * The `/search/wqr` body, ported from pg-dashboard's
 * `buildRequestBody(filters, "paymentButton", { selectedMid: { key: "mid" } })`
 * for the fields this page uses: the PAYMENT_BUTTON sub-type and MID(s) always,
 * `merchantProductDataStatus` from the tabs / Status chip, the search box as
 * `queryString` (pg-dashboard's Button ID filter), and a date window. The
 * searchFilterType ladder is the builder's own, trimmed to the branches these
 * inputs can reach (fieldSearch is never empty here).
 *
 * Returns null when there is nothing the server could match: no MID, or a
 * status selection of Draft alone, which has no API value.
 */
export function buildPaymentButtonListBody({
  mids,
  statuses,
  search,
  startTime,
  endTime,
  pageLimit,
  from,
}: {
  mids: string[];
  statuses: string[];
  search: string;
  startTime?: number;
  endTime?: number;
  pageLimit: number;
  from: number;
}): PaymentButtonListRequest | null {
  if (mids.length === 0) return null;
  const apiStatuses = statuses
    .map((status) => STATUS_API_VALUE[status as PaymentButtonStatus])
    .filter((value): value is string => !!value);
  if (statuses.length > 0 && apiStatuses.length === 0) return null;

  const fieldSearch: Record<string, string[]> = {
    merchantProductDataSubType: ["PAYMENT_BUTTON"],
    mid: mids,
    ...(apiStatuses.length > 0 && { merchantProductDataStatus: apiStatuses }),
  };
  const queryString = search.trim() || undefined;
  const hasTimeRange = !!(startTime && endTime);

  const searchFilterType = queryString
    ? hasTimeRange
      ? "QUERY_FILTER_TYPE_TIME_RANGE"
      : "QUERY_FILTER_TYPE"
    : hasTimeRange
      ? "FILTER_TYPE_TIME_RANGE"
      : "FILTER_TYPE";

  return {
    pageLimit,
    from,
    searchFilterType,
    fieldSearch,
    ...(queryString && { queryString }),
    ...(hasTimeRange && { startTime, endTime }),
  };
}

/** Strips the scheme and any trailing path, for display: "https://acme.com/" → "acme.com". */
export function displayDomain(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "");
}

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value.trim());
}

const RADIUS_PX: Record<PaymentButtonRadius, string> = {
  SHARP: "0px",
  ROUNDED: "8px",
  PILL: "9999px",
};

const SIZE_CLASS: Record<PaymentButtonSize, string> = {
  SMALL: "h-9 px-4 text-[13px]",
  MEDIUM: "h-11 px-5 text-[15px]",
  LARGE: "h-13 px-6 text-[17px]",
};

/**
 * The inline style and size classes the preview's button draws with, for a
 * given appearance. Colours are inline, and literal rather than theme tokens,
 * on purpose: this is a picture of the button on the merchant's own website,
 * which does not switch with this dashboard's light/dark mode, and the brand
 * colour is the merchant's own hex, which no utility class can hold.
 */
export function buttonAppearanceStyle({ theme, color, radius, size }: PaymentButtonAppearance): {
  style: CSSProperties;
  className: string;
} {
  const brand = isHexColor(color) ? color : DEFAULT_BUTTON_COLOR;
  const byTheme: Record<PaymentButtonTheme, CSSProperties> = {
    BRAND: { backgroundColor: brand, color: "#ffffff", borderColor: brand },
    DARK: { backgroundColor: "#111827", color: "#ffffff", borderColor: "#111827" },
    LIGHT: { backgroundColor: "#ffffff", color: brand, borderColor: "#e5e7eb" },
    OUTLINE: { backgroundColor: "transparent", color: brand, borderColor: brand },
  };
  return {
    style: { ...byTheme[theme], borderRadius: RADIUS_PX[radius], borderWidth: 1 },
    className: SIZE_CLASS[size],
  };
}

/** One highlighted run of the embed snippet. */
export type EmbedToken = { kind: "tag" | "attr" | "value" | "text"; text: string };
/** One line of the snippet: its indent depth and its runs, left to right. */
export type EmbedLine = { indent: number; tokens: EmbedToken[] };

function attrLine(name: string, value: string): EmbedLine {
  return {
    indent: 1,
    tokens: [
      { kind: "attr", text: `${name}=` },
      { kind: "value", text: `"${value}"` },
    ],
  };
}

/**
 * The embed snippet for a button, as structured lines. Built as tokens rather
 * than a string so the dialog can colour it without parsing HTML back out of
 * text; embedLinesToText flattens the same lines for the clipboard, so what is
 * copied is always exactly what is shown.
 *
 * Collect and custom-field attributes appear only when they carry something,
 * so an unticked section never leaves an empty attribute in the merchant's page.
 */
export function buildEmbedLines(values: PaymentButtonFormValues, buttonId: string): EmbedLine[] {
  const collect = (Object.keys(COLLECT_FIELD_TOKEN) as (keyof PaymentButtonCollectFields)[])
    .filter((key) => values.collect[key])
    .map((key) => COLLECT_FIELD_TOKEN[key]);
  const customLabels = values.customFieldsEnabled
    ? values.customFields.map((field) => field.label.trim()).filter(Boolean)
    : [];

  return [
    { indent: 0, tokens: [{ kind: "tag", text: "<form>" }] },
    {
      indent: 0,
      tokens: [
        { kind: "tag", text: "<script" },
        { kind: "text", text: " async" },
      ],
    },
    attrLine("src", PAYMENT_BUTTON_SCRIPT_SRC),
    attrLine("data-payment_button_id", buttonId),
    ...(collect.length ? [attrLine("data-collect-fields", collect.join(","))] : []),
    ...(customLabels.length ? [attrLine("data-custom-fields", customLabels.join(","))] : []),
    { indent: 0, tokens: [{ kind: "tag", text: "></script>" }] },
    { indent: 0, tokens: [{ kind: "tag", text: "</form>" }] },
  ];
}

/**
 * The snippet for a button that exists, from the script coordinates the create
 * or download call returned. The attributes are pg-dashboard's, verbatim
 * (`src` + `data-pb-id`), since that is the markup the live script reads; the
 * richer design snippet above is only a preview until the script supports it.
 */
export function buildLiveEmbedLines(script: PaymentButtonScript): EmbedLine[] {
  return [
    { indent: 0, tokens: [{ kind: "tag", text: "<form>" }] },
    { indent: 0, tokens: [{ kind: "tag", text: "<script" }] },
    attrLine("src", script.pbScriptSrcUrl ?? ""),
    attrLine("data-pb-id", script.pbScriptId ?? ""),
    { indent: 0, tokens: [{ kind: "tag", text: "></script>" }] },
    { indent: 0, tokens: [{ kind: "tag", text: "</form>" }] },
  ];
}

/** Form values → the create body, keeping only what the contract has room for. */
export function toCreatePaymentButtonBody(
  values: PaymentButtonFormValues,
  webDomain: string
): CreatePaymentButtonBody {
  return {
    iso3CurrencyCode: values.currency,
    webDomain,
    pbRequiredFields: {
      customerPhoneNumber: values.collect.phone,
      customerEmailId: values.collect.email,
    },
  };
}

export function embedLinesToText(lines: EmbedLine[]): string {
  return lines
    .map((line) => "  ".repeat(line.indent) + line.tokens.map((token) => token.text).join(""))
    .join("\n");
}

/** Copies the snippet and confirms with the app's standard success toast. */
export async function copyEmbedCode(code: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(code);
    toast.success(EMBED_CODE_COPIED_MESSAGE);
  } catch {
    toast.error("Couldn't copy to clipboard");
  }
}

/**
 * The details page for one button. The MID rides along as `?mid=`: every
 * per-button endpoint is addressed by MID + id, and a multi-MID merchant's
 * button id alone does not say which account it lives under.
 */
export function paymentButtonDetailsPath(buttonId: string, mid: string): string {
  return `/payment-button/${encodeURIComponent(buttonId)}?mid=${encodeURIComponent(mid)}`;
}
