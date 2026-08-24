"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { HeaderHelpMenu } from "@/components/layout/HeaderHelpMenu";
import { cn } from "@/lib/utils";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import { useProductContext, type NavContext } from "@/stores/useProductContext";

/**
 * The 4 tabs represent 3 contexts: Home (combined overview), Payments (PA)
 * and Multi-Currency Accounts (PACB), each carrying a `context` tag read by
 * useProductContext.ts. Partners is unrelated and carries none.
 *
 * Each tab lands on its context's own dashboard (/dashboard, /pa-dashboard,
 * /mca-dashboard) and sets the active context, which decides both the Sidebar
 * nav tree shown (the short Home tree, the MCA tree, or the full Payments
 * tree) and the data the feature screens beneath it resolve. Many of those
 * screens are shared by all three contexts (/team-management, ...), so the
 * same URL renders different data depending on the tab last picked, while a
 * few, like Transactions, are genuinely separate routes per product.
 */
const HEADER_TABS: { label: string; href: string; context?: NavContext }[] = [
  { label: "Home", href: "/dashboard", context: "HOME" },
  // Each product tab lands on that product's own dashboard, the same way Home
  // lands on /dashboard, rather than on one of its inner feature tables.
  { label: "Payments", href: "/pa-dashboard", context: "PA" },
  { label: "Multi-Currency Accounts", href: "/mca-dashboard", context: "PACB" },
  { label: "Partners", href: "/refer-and-earn" },
] as const;

const CREATE_ITEMS = [
  {
    label: "Invoice link",
    icon: "file-text" as const,
    href: "/payment-products/invoice-links?create=1",
  },
  {
    label: "Payment link",
    icon: "link" as const,
    href: "/payment-products/payment-links?create=1",
  },
  { label: "Payment", icon: "credit-card" as const, href: "/payment-products" },
  { label: "Subscription", icon: "repeat" as const, href: "/payment-products" },
];

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const paMids = useApp((s) => s.paMids);
  const paCbMids = useApp((s) => s.paCbMids);
  const isMultiMidUser = useApp((s) => s.isMultiMidUser);
  const isPartnerUser = useApp((s) => s.isPartnerUser);
  const tidsInfo = useApp((s) => s.tidsInfo);

  const selectedMidDetails = useAccountSetup((s) => s.selectedMidDetails);
  const setSelectedMidDetails = useAccountSetup((s) => s.setSelectedMidDetails);

  const activeContext = useProductContext((s) => s.activeContext);
  const setActiveContext = useProductContext((s) => s.setActiveContext);

  const [createOpen, setCreateOpen] = useState(false);
  const [createHover, setCreateHover] = useState(false);

  const createRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const isMultiMids = paMids.length > 1 || (paCbMids.length > 1 && isMultiMidUser);

  // Only the products this account actually holds MIDs for get a tab. "Home"
  // is the *combined* overview of both, so it only earns its place when the
  // account has both, a single-product merchant's Home would just duplicate
  // that product's own dashboard. Partners is unrelated to MIDs and always
  // shows. Note both MID lists start empty and fill in once the account loads,
  // so the tab row grows in rather than flashing tabs the account can't use.
  const hasPa = paMids.length > 0;
  const hasPacb = paCbMids.length > 0;
  const visibleTabs = useMemo(
    () =>
      HEADER_TABS.filter((tab) => {
        if (tab.context === "HOME") return hasPa && hasPacb;
        if (tab.context === "PA") return hasPa;
        if (tab.context === "PACB") return hasPacb;
        return true;
      }),
    [hasPa, hasPacb]
  );

  // A persisted context whose tab this account doesn't have (most commonly the
  // "HOME" default on a single-product merchant) would leave no tab
  // highlighted and the Sidebar rendering a nav tree with no way back to it.
  // Fall back to the first product tab the account does have. Deferred through
  // a zero-delay timer rather than called straight from the effect body, per
  // the no-synchronous-setState-in-effects rule in CLAUDE.md.
  useEffect(() => {
    if (visibleTabs.some((tab) => tab.context === activeContext)) return;
    const fallback = visibleTabs.find((tab) => tab.context)?.context;
    if (!fallback) return;
    const timer = window.setTimeout(() => setActiveContext(fallback), 0);
    return () => window.clearTimeout(timer);
  }, [visibleTabs, activeContext, setActiveContext]);

  const tradeName = useMemo(
    () => tidsInfo.find((t) => t.mid === selectedMidDetails.mid)?.tradeName ?? "",
    [tidsInfo, selectedMidDetails.mid]
  );

  const showRibbon = Boolean(selectedMidDetails.mid) && isMultiMids;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (createRef.current && !createRef.current.contains(e.target as Node)) setCreateOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="sticky top-0 z-30 flex flex-col">
      <header className="flex h-[57px] items-center gap-2 px-4 md:px-5 flex-shrink-0 bg-header border-b border-header-border">
        {/* Hamburger (mobile only) */}
        <Button
          variant="ghost"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
        >
          <Icon name="menu" size={20} />
        </Button>

        {/* Top-level category tabs */}
        {!isPartnerUser && (
          <nav className="hidden items-center gap-1 md:flex">
            {visibleTabs.map((tab) => {
              // Home/Payments/MCA currently share the same feature routes, so
              // their highlight is driven by the active context, not the URL.
              // Partners still keys off its own unique route (it has no
              // context tag, and never touches activeContext on click).
              const onPartners =
                pathname === "/refer-and-earn" || pathname.startsWith("/refer-and-earn/");
              const isActive = tab.context
                ? activeContext === tab.context && !onPartners
                : pathname === tab.href || pathname.startsWith(tab.href + "/");
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => tab.context && setActiveContext(tab.context)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[13.5px] font-medium transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <Button
            type="button"
            variant="ghost"
            className="relative w-9 h-9 rounded-lg bg-muted border border-border hover:bg-accent flex items-center justify-center transition-colors"
            aria-label="Notifications"
          >
            <Icon name="bell" size={17} className="text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-header" />
          </Button>

          <ThemeToggle />

          {/* Help — support contacts and hours, see HeaderHelpMenu. */}
          <HeaderHelpMenu />

          {/* Create button */}
          <div ref={createRef} className="relative">
            <AnimatePresence>
              {createHover && !createOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg text-[11px] font-medium text-white whitespace-nowrap pointer-events-none z-50"
                  style={{ background: "#1a1a2e" }}
                >
                  Create
                  <span
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45"
                    style={{ background: "#1a1a2e" }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCreateOpen((o) => !o);
                setCreateHover(false);
              }}
              onMouseEnter={() => setCreateHover(true)}
              onMouseLeave={() => setCreateHover(false)}
              aria-label="Create"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{ background: "#0061E3" }}
            >
              <Icon name="plus" size={18} className="text-white" />
            </Button>

            <AnimatePresence>
              {createOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-11 z-50 bg-popover text-popover-foreground rounded-2xl overflow-hidden border border-border min-w-[200px]"
                  style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)" }}
                >
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-4 pt-3.5 pb-2">
                    Create new
                  </p>
                  <div className="pb-2">
                    {CREATE_ITEMS.map((item) => (
                      <div
                        key={item.label}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setCreateOpen(false);
                          router.push(item.href);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setCreateOpen(false);
                            router.push(item.href);
                          }
                        }}
                        className="flex items-center gap-3 px-3 mx-2 py-2.5 rounded-xl hover:bg-muted/80 transition-colors group cursor-pointer"
                        style={{ width: "calc(100% - 16px)" }}
                      >
                        <div className="w-8 h-8 rounded-xl bg-muted group-hover:bg-accent flex items-center justify-center flex-shrink-0 transition-colors">
                          <Icon name={item.icon} size={15} className="text-muted-foreground" />
                        </div>
                        <span className="text-[13.5px] font-medium text-foreground">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* "Viewing as" ribbon, shown when a MID is selected in multi-MID mode */}
      {showRibbon && (
        <div
          className="flex items-center justify-between px-4 py-1.5 text-[13px]"
          style={{ backgroundColor: selectedMidDetails.color || "#f3f4f6" }}
        >
          <span className="text-gray-800">
            Viewing as <strong>{tradeName}</strong>
          </span>
          <Button
            type="button"
            variant="ghost"
            className="h-auto min-h-0 p-0 font-medium text-gray-800 underline transition-opacity hover:opacity-70 hover:bg-transparent"
            onClick={() => setSelectedMidDetails({ mid: "", status: "", color: "" })}
          >
            Switch to main view
          </Button>
        </div>
      )}
    </div>
  );
}
