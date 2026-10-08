import type { IconName } from "@/components/icon";
import type { StaticLinkBaseField } from "@/features/dashboard/static-link/types";

export const STATIC_LINK_TITLE = "A unique link for your business";
export const STATIC_LINK_SUBTITLE = "That you and your customers can remember";
export const STATIC_LINK_COPIED_MESSAGE = "Link copied";

/** React Query keys: the lookup that finds the link's id, and the link read. */
export const STATIC_LINK_SEARCH_QUERY_KEY = ["static-link-search"];
export const STATIC_LINK_QUERY_KEY = ["static-link"];

/** A merchant has one static link in practice; this is headroom, not paging. */
export const STATIC_LINK_SEARCH_PAGE_LIMIT = 10;

/**
 * The five keys every link has, with this dashboard's copy and the `fieldType`
 * a write has to restate. The two address keys carry no type on purpose (the
 * server rejects one). Order is the checkout's, so the panel lists them alike.
 */
export const STATIC_LINK_BASE_FIELDS: StaticLinkBaseField[] = [
  { fieldKey: "NAME", label: "Customer name", fieldType: "ALPHABETS" },
  { fieldKey: "EMAIL", label: "Email address", fieldType: "EMAIL" },
  { fieldKey: "MOBILE", label: "Phone no.", fieldType: "PHONE_NUMBER" },
  { fieldKey: "BILLING_ADDRESS", label: "Billing address", fieldType: null },
  { fieldKey: "SHIPPING_ADDRESS", label: "Shipping address", fieldType: null },
];

/** Fallback for a custom field the server sent without a type. */
export const STATIC_LINK_DEFAULT_FIELD_TYPE = "SINGLE_LINE_TEXT" as const;

// ── The vanity handle ────────────────────────────────────────────────────────

/** Handle length the server enforces, after sanitizing. */
export const STATIC_LINK_HANDLE_MIN = 3;
export const STATIC_LINK_HANDLE_MAX = 15;

/**
 * Handles the server refuses outright, mirrored only to fail fast in the input:
 * whether one is taken is the server's answer alone.
 */
export const STATIC_LINK_RESERVED_HANDLES = [
  "admin",
  "api",
  "app",
  "www",
  "help",
  "support",
  "payglocal",
  "static",
  "link",
];

/** localStorage flag for the one-time intro (pg-dashboard's key). */
export const STATIC_LINK_INTRO_SEEN_KEY = "static_link_intro_seen";

/** The three-step pitch in the first-visit intro. */
export const STATIC_LINK_INTRO_BENEFITS: { icon: IconName; title: string; description: string }[] =
  [
    {
      icon: "share-2",
      title: "Share your link",
      description:
        "Copy your static link and share it anywhere, be it website, socials, WhatsApp, or an invoice.",
    },
    {
      icon: "wallet",
      title: "Customers can pay any amount",
      description:
        "Collect payments of any amount from as many customers as you need, without creating a new link for every sale.",
    },
    {
      icon: "trending-up",
      title: "Track every payment here",
      description:
        "Every payment made through this link shows up on this page, with status and revenue at a glance.",
    },
  ];
