"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import { useGet, usePost } from "@/lib/api/hooks";
import { merchantProductsApi } from "@/api";
import { toast } from "sonner";
import type { MerchantEnabledProducts } from "@/stores/useApp";
import type { BaseResponse } from "@/types/common";
import { cn } from "@/lib/utils";

const COLOR_SET = ["#E5B5FF", "#D4FFB5", "#A9FFCB"];

const AVATAR_PALETTES: [string, string][] = [
  ["#e0f2fe", "#0369a1"],
  ["#fce7f3", "#9d174d"],
  ["#d1fae5", "#065f46"],
  ["#ede9fe", "#5b21b6"],
];

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  DISABLED: "Disabled",
};

const STATUS_DOT_COLOR: Record<string, string> = {
  ACTIVE: "#22c55e",
  INACTIVE: "#f59e0b",
  DISABLED: "#9ca3af",
};

const STATUS_BADGE_STYLE: Record<string, React.CSSProperties> = {
  ACTIVE: { background: "#f0fdf4", color: "#16a34a" },
  INACTIVE: { background: "#fef3c7", color: "#d97706" },
  DISABLED: { background: "#f9fafb", color: "#9ca3af" },
};

function MidAvatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const initials = name.slice(0, 2).toUpperCase();
  const [bg, color] = AVATAR_PALETTES[name.charCodeAt(0) % AVATAR_PALETTES.length];
  return (
    <div
      className={cn(
        "flex flex-shrink-0 items-center justify-center font-bold",
        size === "md" ? "h-8 w-8 rounded-lg text-[13px]" : "h-6 w-6 rounded-md text-[10px]"
      )}
      style={{ background: bg, color }}
    >
      {initials}
    </div>
  );
}

type TagUpdateVars = { dynamicUrl: string };

export function MerchantSelector() {
  const paMidIds = useApp((s) => s.paMids);
  const paCbMidIds = useApp((s) => s.paCbMids);
  const tidsInfo = useApp((s) => s.tidsInfo);
  const isMultiMidUser = useApp((s) => s.isMultiMidUser);
  const setTidsInfo = useApp((s) => s.setTidsInfo);

  const selectedMidDetails = useAccountSetup((s) => s.selectedMidDetails);
  const setSelectedMidDetails = useAccountSetup((s) => s.setSelectedMidDetails);

  const [open, setOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<string | null>(null);
  const [hoveredMid, setHoveredMid] = useState<string | null>(null);
  const [editingMid, setEditingMid] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");

  const ref = useRef<HTMLDivElement>(null);

  const paMidInfos = useMemo(
    () => tidsInfo.filter((t) => paMidIds.includes(t.mid)),
    [tidsInfo, paMidIds]
  );
  const paCbMidInfos = useMemo(
    () => tidsInfo.filter((t) => paCbMidIds.includes(t.mid)),
    [tidsInfo, paCbMidIds]
  );

  const products = useMemo(
    () =>
      [
        {
          key: "GFT",
          label: "Global Funds Transfer",
          icon: "database" as const,
          mids: paCbMidInfos,
        },
        { key: "CARDS", label: "Card Payments", icon: "credit-card" as const, mids: paMidInfos },
      ].filter((p) => p.mids.length > 0),
    [paCbMidInfos, paMidInfos]
  );

  const isMultiMids = paMidIds.length > 1 || (paCbMidIds.length > 1 && isMultiMidUser);

  const {
    data: merchantProductsData,
    refetch: refetchMerchantProducts,
    isFetching,
  } = useGet<BaseResponse<MerchantEnabledProducts>>(
    ["merchantEnabledProducts"],
    merchantProductsApi,
    undefined,
    { enabled: false }
  );

  const { mutate: updateTag, isPending: isUpdatingTag } = usePost<unknown, TagUpdateVars>(
    merchantProductsApi,
    {
      invalidateQueries: false,
      onSuccess: async () => {
        const result = await refetchMerchantProducts();
        const newTidsInfo = result.data?.data?.tidInfos;
        if (newTidsInfo) setTidsInfo(newTidsInfo);
        setEditingMid(null);
        setNewTag("");
        toast.success("Account name updated successfully");
      },
      onError: () => {
        toast.error("Failed to update account name");
      },
    }
  );

  // Auto-activate the product that contains the selected MID when the dropdown opens
  useEffect(() => {
    if (open && !activeProduct && selectedMidDetails.mid) {
      const parent = products.find((p) => p.mids.some((m) => m.mid === selectedMidDetails.mid));
      if (parent) {
        const key = parent.key;
        const timer = setTimeout(() => setActiveProduct(key), 0);
        return () => clearTimeout(timer);
      }
    }
  }, [open, activeProduct, selectedMidDetails.mid, products]);

  // Reset panel state on close
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setActiveProduct(null);
        setEditingMid(null);
        setHoveredMid(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Suppress unused-variable warning — data drives tidsInfo via useFetchCommonData
  void merchantProductsData;

  const allMids = useMemo(() => products.flatMap((p) => p.mids), [products]);

  const selectedMidInfo = useMemo(
    () => allMids.find((m) => m.mid === selectedMidDetails.mid),
    [allMids, selectedMidDetails.mid]
  );

  const selectedProductLabel = useMemo(
    () => products.find((p) => p.mids.some((m) => m.mid === selectedMidDetails.mid))?.label ?? "",
    [products, selectedMidDetails.mid]
  );

  if (!isMultiMids) return null;

  const triggerName = selectedMidInfo
    ? selectedMidInfo.displayTag || selectedMidInfo.tradeName
    : null;

  const activeMids = products.find((p) => p.key === activeProduct)?.mids ?? [];

  return (
    <div ref={ref} className="relative flex-shrink-0">
      {/* Trigger */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-lg py-1.5 pl-2 pr-2.5 transition-colors",
          open ? "bg-muted" : "hover:bg-muted"
        )}
      >
        {triggerName ? (
          <MidAvatar name={triggerName} />
        ) : (
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
            <Icon name="building-2" size={14} className="text-muted-foreground" />
          </div>
        )}
        <span className="max-w-[160px] truncate text-[13px] font-semibold text-foreground">
          {triggerName ? `${selectedProductLabel} / ${triggerName}` : "All accounts"}
        </span>
        <Icon
          name="chevron-down"
          size={14}
          className={cn("text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-2 min-w-[480px] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground"
          style={{ boxShadow: "0 12px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)" }}
        >
          {/* Header */}
          <div className="border-b border-border px-4 pb-3.5 pt-4">
            <div className="flex items-center gap-2.5">
              {selectedMidInfo ? (
                <MidAvatar
                  name={selectedMidInfo.displayTag || selectedMidInfo.tradeName}
                  size="md"
                />
              ) : (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon name="building-2" size={16} className="text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="text-[13px] font-semibold leading-tight text-foreground">
                  {selectedMidInfo
                    ? selectedMidInfo.displayTag || selectedMidInfo.tradeName
                    : "Select an account"}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {selectedMidInfo
                    ? `${selectedProductLabel} · ${selectedMidDetails.mid}`
                    : "Choose a product and MID below"}
                </p>
              </div>
            </div>
          </div>

          {/* Two-column body */}
          <div className="grid grid-cols-2 divide-x divide-border">
            {/* Left — products */}
            <div className="px-3 py-3">
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Active Products
              </p>
              <div className="space-y-0.5">
                {products.map((p) => (
                  <div
                    key={p.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveProduct(p.key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveProduct(p.key);
                      }
                    }}
                    className={cn(
                      "group flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors",
                      activeProduct === p.key ? "bg-muted/80" : "hover:bg-muted/60"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors",
                        activeProduct === p.key ? "bg-accent" : "bg-muted group-hover:bg-accent"
                      )}
                    >
                      <Icon name={p.icon} size={14} className="text-muted-foreground" />
                    </div>
                    <span className="flex-1 whitespace-nowrap text-[12.5px] font-medium leading-tight text-foreground">
                      {p.label}
                      <span className="ml-1 text-[11.5px] font-normal text-muted-foreground">
                        ({p.mids.length})
                      </span>
                    </span>
                    <Icon
                      name="chevron-right"
                      size={14}
                      className={cn(
                        "flex-shrink-0 transition-colors",
                        activeProduct === p.key
                          ? "text-muted-foreground"
                          : "text-muted-foreground/50 group-hover:text-muted-foreground"
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Right — MIDs */}
            <div className="px-3 py-3">
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Accounts
              </p>
              {activeProduct ? (
                <div className="space-y-0.5">
                  {activeMids.map(({ mid, status, tradeName, displayTag }) =>
                    editingMid === mid ? (
                      <div
                        key={mid}
                        className="flex items-center gap-1 rounded-xl bg-muted/40 px-2 py-1.5"
                      >
                        <input
                          autoFocus
                          defaultValue={displayTag || tradeName}
                          onChange={(e) => setNewTag(e.target.value)}
                          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={isUpdatingTag || isFetching}
                          onClick={() =>
                            updateTag({
                              dynamicUrl: `${merchantProductsApi}/${mid}/update-tag?displayTag=${newTag}`,
                            })
                          }
                          className="flex h-5 w-5 items-center justify-center rounded p-0 text-green-600 hover:bg-green-50 disabled:opacity-50 dark:hover:bg-green-950"
                        >
                          <Icon name="check" size={12} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setEditingMid(null)}
                          className="flex h-5 w-5 items-center justify-center rounded p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Icon name="x" size={12} />
                        </Button>
                      </div>
                    ) : (
                      <div
                        key={mid}
                        role="button"
                        tabIndex={status === "ACTIVE" ? 0 : -1}
                        aria-disabled={status !== "ACTIVE"}
                        onMouseEnter={() => status === "ACTIVE" && setHoveredMid(mid)}
                        onMouseLeave={() => setHoveredMid(null)}
                        onClick={() => {
                          if (status !== "ACTIVE" || selectedMidDetails.mid === mid) return;
                          setSelectedMidDetails((prev) => {
                            const others = COLOR_SET.filter((c) => c !== prev.color);
                            const newColor =
                              others[Math.floor(Math.random() * others.length)] ?? COLOR_SET[0];
                            return { mid, status, color: newColor };
                          });
                          setOpen(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (status !== "ACTIVE" || selectedMidDetails.mid === mid) return;
                            setSelectedMidDetails((prev) => {
                              const others = COLOR_SET.filter((c) => c !== prev.color);
                              const newColor =
                                others[Math.floor(Math.random() * others.length)] ?? COLOR_SET[0];
                              return { mid, status, color: newColor };
                            });
                            setOpen(false);
                          }
                        }}
                        className={cn(
                          "group flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors",
                          selectedMidDetails.mid === mid
                            ? "bg-muted/70"
                            : status === "ACTIVE"
                              ? "cursor-pointer hover:bg-muted/80"
                              : "cursor-not-allowed opacity-50"
                        )}
                      >
                        <div
                          className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                          style={{
                            background: STATUS_DOT_COLOR[status] ?? "#9ca3af",
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-medium text-foreground">
                            {displayTag || tradeName}
                          </p>
                          <p className="truncate text-[10.5px] text-muted-foreground">{mid}</p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1">
                          {hoveredMid === mid ? (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingMid(mid);
                                setNewTag(displayTag || tradeName);
                              }}
                              className="flex h-5 w-5 items-center justify-center rounded p-0 text-primary hover:bg-primary/10"
                            >
                              <Icon name="pencil" size={11} />
                            </Button>
                          ) : (
                            <span
                              className="rounded-md px-2 py-0.5 text-[10.5px] font-medium"
                              style={
                                selectedMidDetails.mid === mid
                                  ? { background: "#e0ecff", color: "#1d4ed8" }
                                  : (STATUS_BADGE_STYLE[status] ?? STATUS_BADGE_STYLE.DISABLED)
                              }
                            >
                              {selectedMidDetails.mid === mid
                                ? "Selected"
                                : (STATUS_LABEL[status] ?? status)}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="flex h-20 items-center justify-center">
                  <p className="text-[12px] text-muted-foreground">
                    Select a product to view accounts
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2.5">
            <span className="text-[11px] text-muted-foreground">
              {tidsInfo.length} account{tidsInfo.length !== 1 ? "s" : ""} available
            </span>
            {selectedMidDetails.mid && (
              <Button
                variant="link"
                type="button"
                onClick={() => {
                  setSelectedMidDetails({ mid: "", status: "", color: "" });
                  setOpen(false);
                }}
                className="h-auto min-h-0 p-0 text-[12px] hover:no-underline hover:opacity-80 hover:bg-transparent"
              >
                Clear selection →
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
