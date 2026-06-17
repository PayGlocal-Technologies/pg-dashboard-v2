"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { MerchantSelector } from "@/components/layout/MerchantSelector";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";

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
  const tidsInfo = useApp((s) => s.tidsInfo);

  const selectedMidDetails = useAccountSetup((s) => s.selectedMidDetails);
  const setSelectedMidDetails = useAccountSetup((s) => s.setSelectedMidDetails);

  const [createOpen, setCreateOpen] = useState(false);
  const [createHover, setCreateHover] = useState(false);

  const createRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const isMultiMids = paMids.length > 1 || (paCbMids.length > 1 && isMultiMidUser);

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

        {/* Merchant selector */}
        <MerchantSelector />

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

          {/* Help */}
          <Button
            type="button"
            variant="ghost"
            className="w-9 h-9 rounded-lg bg-muted border border-border hover:bg-accent flex items-center justify-center transition-colors"
            aria-label="Help"
          >
            <Icon name="help-circle" size={17} className="text-muted-foreground" />
          </Button>

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

      {/* "Viewing as" ribbon — shown when a MID is selected in multi-MID mode */}
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
