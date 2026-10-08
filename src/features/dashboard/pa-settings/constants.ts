import {
  SETTINGS_NAV_GROUPS,
  type SettingsNavGroup,
} from "@/features/dashboard/settings/constants";

/** The /pa-settings left nav: /settings' own (rebased by SettingsSidebar's
 *  basePath), plus Payments and Developer under "Payments & Platform", and a
 *  Support group whose "Raise a ticket" opens My queries' ticket form (the
 *  same ?action=raise-ticket handoff global search uses). */
export const PA_SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  ...SETTINGS_NAV_GROUPS.map((group): SettingsNavGroup =>
    group.label === "Payments & Platform"
      ? {
          ...group,
          items: [
            { label: "Payments", href: "/settings/payments", icon: "credit-card" },
            ...group.items,
            { label: "Developer", href: "/settings/developer", icon: "key-round" },
            // Its own page outside settings, not rebased (see SettingsSidebar).
            { label: "Key management", href: "/key-management-system", icon: "lock" },
          ],
        }
      : group
  ),
  {
    label: "Support",
    items: [
      { label: "Raise a ticket", href: "/my-queries?action=raise-ticket", icon: "message-circle" },
    ],
  },
];
