"use client";

import { usePathname } from "next/navigation";
import { HeaderHelpMenu } from "@/components/layout/HeaderHelpMenu";
import { AccountsHelpDrawer } from "@/features/dashboard/multi-currency/components/AccountsHelpDrawer";
import { TransactionsHelpDrawer } from "@/features/dashboard/mca-transactions/components/TransactionsHelpDrawer";
import { SettlementsHelpDrawer } from "@/features/dashboard/settlement-reports/components/SettlementsHelpDrawer";
import { DashboardHelpDrawer } from "@/features/dashboard/home/components/DashboardHelpDrawer";
import { PlatformsHelpDrawer } from "@/features/dashboard/platforms/components/PlatformsHelpDrawer";
import {
  SETTLEMENT_LIST_PATH,
  MCA_SETTLEMENT_LIST_PATH,
} from "@/features/dashboard/settlement-reports/routes";

/**
 * One entry per screen that has its own Guide/Glossary/Tutorials content.
 * `matches` decides whether the current pathname belongs to that screen;
 * `Drawer` is that screen's own trigger+panel component (each owns its '?'
 * button the same way HeaderHelpMenu below owns its), rendered in its place
 * on the header. To give a sixth screen its own drawer, add one entry here —
 * nothing else in this file, and nothing in Header.tsx, needs to change.
 */
const HELP_DRAWER_CONFIG: {
  key: string;
  matches: (pathname: string) => boolean;
  Drawer: () => React.JSX.Element;
}[] = [
  {
    key: "transactions",
    matches: (path) => path === "/mca-transactions" || path.startsWith("/mca-transactions/"),
    Drawer: TransactionsHelpDrawer,
  },
  {
    key: "settlements",
    matches: (path) =>
      path === SETTLEMENT_LIST_PATH ||
      path.startsWith(`${SETTLEMENT_LIST_PATH}/`) ||
      path === MCA_SETTLEMENT_LIST_PATH ||
      path.startsWith(`${MCA_SETTLEMENT_LIST_PATH}/`),
    Drawer: SettlementsHelpDrawer,
  },
  {
    key: "dashboard",
    matches: (path) =>
      path === "/dashboard" || path === "/pa-dashboard" || path === "/mca-dashboard",
    Drawer: DashboardHelpDrawer,
  },
  {
    key: "platforms",
    matches: (path) => path === "/platforms" || path.startsWith("/platforms/"),
    Drawer: PlatformsHelpDrawer,
  },
  {
    key: "accounts",
    matches: (path) => path === "/multi-currency" || path.startsWith("/multi-currency/"),
    Drawer: AccountsHelpDrawer,
  },
];

/**
 * The header's single Help control (Header renders `<HelpTrigger />` and
 * nothing else in that slot). Looks up whether the current screen has a
 * registered custom drawer above and renders that screen's own
 * Guide/Glossary/Tutorials drawer if so; every other screen — anything not
 * in HELP_DRAWER_CONFIG — falls back to HeaderHelpMenu, the original
 * lightweight contacts popover every screen had before the custom drawers
 * existed. One shared slot either way, never two Help buttons.
 */
export function HelpTrigger() {
  const pathname = usePathname();
  const entry = HELP_DRAWER_CONFIG.find((candidate) => candidate.matches(pathname));

  if (entry) {
    const { Drawer } = entry;
    return <Drawer />;
  }

  return <HeaderHelpMenu />;
}
