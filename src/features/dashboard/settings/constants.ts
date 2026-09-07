import type { IconName } from "@/components/icon";

// ── Change email ─────────────────────────────────────────────────────────────

/** Both change-email codes are 6 digits. Not to be confused with login's
 *  OTP_LENGTH, which is 4. */
export const EMAIL_OTP_LENGTH = 6;

/** The API ends the session on the third wrong code at either OTP step. Counted
 *  client-side only to warn before it happens — the server is the authority. */
export const MAX_EMAIL_OTP_ATTEMPTS = 3;

export const EMAIL_OTP_RESEND_COOLDOWN_SECONDS = 30;

export interface SettingsNavChild {
  label: string;
  href: string;
}

export interface SettingsNavItem {
  label: string;
  href: string;
  icon: IconName;
  /** When present, this item expands to show these child links (see
   * SettingsSidebar) instead of being directly navigable itself. */
  children?: SettingsNavChild[];
}

export interface SettingsNavGroup {
  label: string;
  items: SettingsNavItem[];
}

/** Left-nav structure for the /settings section, see SettingsSidebar. Also the
 * source for the section's search entries, see buildSearchRegistry, so
 * commenting an item out below removes it from both. */
export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    label: "Personal",
    items: [{ label: "Personal details", href: "/settings/personal", icon: "users" }],
  },
  {
    label: "Account & Business",
    items: [
      { label: "Business details", href: "/settings/business", icon: "building-2" },
      { label: "Banking & currencies", href: "/settings/banking", icon: "landmark" },
    ],
  },
  {
    label: "Payments & Platform",
    items: [
      // OUT OF SCOPE — Payments settings tab hidden for now. The route/page and
      // components stay in the codebase. Restore by un-commenting this item.
      // { label: "Payments", href: "/settings/payments", icon: "credit-card" },
      // TEMPORARILY HIDDEN — Developer section (API keys + Webhooks). Removed
      // from the nav for now (no backing endpoints yet); the routes/pages and
      // components stay in the codebase. Restore by un-commenting this item.
      // {
      //   label: "Developer",
      //   href: "/settings/developer",
      //   icon: "key-round",
      //   children: [
      //     { label: "API keys", href: "/settings/developer/api-keys" },
      //     { label: "Webhooks", href: "/settings/developer/webhooks" },
      //   ],
      // },
      { label: "Integrations", href: "/settings/integrations", icon: "puzzle" },
      // OUT OF SCOPE — Notifications settings tab hidden for now. The route/page
      // and components stay in the codebase. Restore by un-commenting this item.
      // { label: "Notifications", href: "/settings/notifications", icon: "bell" },
    ],
  },
];
