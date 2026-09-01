import type { IconName } from "@/components/icon";

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

/** Prose for a group's card on the /settings landing page. A group without this
 * gets no card (Overview is just the link back to that page). Everything else
 * the card needs — icon, href, the list of pages inside — is derived from the
 * group's `items`, so the landing page cannot drift from the nav. See
 * buildSettingsOverviewCards in helper.ts. */
export interface SettingsOverviewCardMeta {
  /** Card heading. Defaults to the group label, which is sometimes too terse
   * to stand on its own as a title. */
  title?: string;
  description: string;
  note?: string;
}

export interface SettingsNavGroup {
  label: string;
  card?: SettingsOverviewCardMeta;
  items: SettingsNavItem[];
}

/** Left-nav structure for the /settings section, see SettingsSidebar. Also the
 * single source for the /settings landing cards, see SettingsOverviewFeature —
 * commenting an item out below removes it from both. */
export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "All settings", href: "/settings", icon: "layout-grid" }],
  },
  {
    label: "Personal",
    card: {
      title: "Personal settings",
      description:
        "Profile photo, name, email, contact details and change password for your signed-in user.",
    },
    items: [{ label: "Personal details", href: "/settings/personal", icon: "users" }],
  },
  {
    label: "Account & Business",
    card: {
      description: "Your legal entity, merchant ID, GSTIN and the bank account we settle funds to.",
      note: "GST and compliance live under Tax; eBRC stays in Finance in the main nav.",
    },
    items: [
      { label: "Business details", href: "/settings/business", icon: "building-2" },
      { label: "Banking & currencies", href: "/settings/banking", icon: "landmark" },
    ],
  },
  {
    label: "Payments & Platform",
    card: {
      description: "Connected platforms and the integrations that feed your transactions.",
    },
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
