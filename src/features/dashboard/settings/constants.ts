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

export interface SettingsNavGroup {
  label: string;
  items: SettingsNavItem[];
}

/** Left-nav structure for the /settings section, see SettingsSidebar. */
export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "All settings", href: "/settings", icon: "layout-grid" }],
  },
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
      { label: "Payments", href: "/settings/payments", icon: "credit-card" },
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
      { label: "Notifications", href: "/settings/notifications", icon: "bell" },
    ],
  },
];
