import type { IconName } from "@/components/icon";
import {
  SETTINGS_NAV_GROUPS,
  type SettingsNavChild,
  type SettingsNavItem,
} from "@/features/dashboard/settings/constants";

export interface SettingsOverviewCard {
  title: string;
  description: string;
  note?: string;
  icon: IconName;
  /** Where the card navigates: the group's first page. */
  href: string;
  /** Every page the group contains, listed on the card. */
  links: SettingsNavChild[];
}

/** The pages one nav item actually navigates to. A parent with children is not
 *  a page itself — its children are. */
function pagesOf(item: SettingsNavItem): SettingsNavChild[] {
  if (item.children?.length) return item.children;
  return [{ label: item.label, href: item.href }];
}

/** The /settings landing cards, derived from the left nav so the two can never
 *  disagree about which pages exist.
 *
 *  A group produces a card only when it declares `card` prose AND still has a
 *  visible item: commenting an item out of SETTINGS_NAV_GROUPS drops it from
 *  the card's link list, and emptying a group drops the card entirely. */
export function buildSettingsOverviewCards(): SettingsOverviewCard[] {
  return SETTINGS_NAV_GROUPS.flatMap((group) => {
    const [firstItem] = group.items;
    if (!group.card || !firstItem) return [];

    const links = group.items.flatMap(pagesOf);
    const [firstLink] = links;
    if (!firstLink) return [];

    return [
      {
        title: group.card.title ?? group.label,
        description: group.card.description,
        note: group.card.note,
        icon: firstItem.icon,
        href: firstLink.href,
        links,
      },
    ];
  });
}
