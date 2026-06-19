"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { ViewPortal } from "@/components/layout/ViewPortal";
import {
  regularNavigation,
  partnerNavigation,
  globalNavigation,
  type NavItem,
  type NavGroup,
} from "@/lib/navigation";
import { useApp } from "@/stores/useApp";
import { useLogout } from "@/lib/hooks/useLogout";
import useNewPermissions from "@/hooks/useNewPermissions";

function profileInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Converts SCREAMING_SNAKE_CASE role enums to "Title Case" labels. */
function formatRole(role: string | undefined): string {
  if (!role) return "";
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/* ── Expandable nav item ─────────────────────────────────────────────────────── */
function ExpandableItem({
  item,
  pathname,
  collapsed,
  onNavClick,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  onNavClick?: () => void;
}) {
  const childActive =
    item.children?.some((c) => pathname === c.href || pathname.startsWith(c.href + "/")) ?? false;

  const [open, setOpen] = useState(childActive);
  const isParentActive = pathname === item.href || childActive;

  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        onClick={() => !collapsed && setOpen((o) => !o)}
        title={collapsed ? item.label : undefined}
        className={cn(
          "w-full p-0 h-auto min-h-0 text-[14px] font-medium transition-all duration-100 rounded-lg text-left",
          "[&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-2.5 [&>span]:px-2.5 [&>span]:py-2",
          isParentActive
            ? "bg-card text-foreground border border-border shadow-sm"
            : "text-sidebar-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
        )}
      >
        <Icon
          name={item.icon}
          size={16}
          className={cn("flex-shrink-0", isParentActive ? "text-primary" : "text-muted-foreground")}
        />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge && (
              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full tracking-widest text-primary-foreground bg-primary mr-1">
                {item.badge}
              </span>
            )}
            <Icon
              name={open ? "chevron-up" : "chevron-down"}
              size={13}
              className="flex-shrink-0 text-muted-foreground"
            />
          </>
        )}
      </Button>

      {/* Height animation via grid-template-rows trick */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
          open && !collapsed ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="ml-[18px] mt-0.5 mb-1 pl-3 border-l-2 border-sidebar-border/90">
            {item.children!.map((child) => {
              const isChildActive =
                pathname === child.href || pathname.startsWith(child.href + "/");
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={onNavClick}
                  className={cn(
                    "relative flex items-center py-1.5 pl-1 pr-2 text-[13px] rounded-md transition-colors duration-100",
                    isChildActive
                      ? "text-primary font-semibold"
                      : "text-sidebar-foreground/95 font-medium hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                  )}
                >
                  <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-px w-2 bg-sidebar-border/90" />
                  {child.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sidebar body (shared desktop + mobile) ──────────────────────────────────── */
function SidebarBody({
  collapsed,
  pathname,
  onNavClick,
  navigation,
}: {
  collapsed: boolean;
  pathname: string;
  onNavClick?: () => void;
  navigation: NavGroup[];
}) {
  const profile = useApp((s) => s.profile);
  const { logout, isLoading } = useLogout();

  const displayName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || profile?.username || "";

  return (
    <>
      <nav className="flex-1 overflow-y-auto py-3 px-2.5">
        {navigation.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed ? (
              <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-2 mb-1.5">
                {group.label}
              </p>
            ) : (
              <div className="h-px bg-sidebar-border my-2 mx-1" />
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => {
                if (item.children) {
                  return (
                    <ExpandableItem
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      collapsed={collapsed}
                      onNavClick={onNavClick}
                    />
                  );
                }

                const isActive =
                  item.href === "/" || item.href === "/dashboard"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavClick}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] font-medium transition-all duration-100",
                      isActive
                        ? "bg-card text-foreground border border-border shadow-sm"
                        : "text-sidebar-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    <Icon
                      name={item.icon}
                      size={16}
                      className={cn(
                        "flex-shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full tracking-widest text-primary-foreground bg-primary">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Bottom profile section ── */}
      <div className="px-2.5 py-2.5 flex-shrink-0 border-t border-sidebar-border">
        <div
          className={cn(
            "flex gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5",
            collapsed ? "flex-col items-center justify-center gap-1" : "items-center"
          )}
        >
          {/* Avatar */}
          <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-transparent">
            {displayName ? (
              <span className="flex h-full w-full items-center justify-center bg-muted-foreground text-[11px] font-bold text-background">
                {profileInitials(displayName)}
              </span>
            ) : (
              <Icon name="users" size={16} className="text-muted-foreground" />
            )}
          </div>

          {!collapsed ? (
            <>
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-[13px] font-medium leading-tight text-foreground truncate">
                  {displayName || "—"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {formatRole(profile?.role)}
                </p>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Link
                  href="/settings"
                  onClick={onNavClick}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Settings"
                  title="Settings"
                >
                  <Icon name="settings" size={16} />
                </Link>
                <Button
                  variant="ghost"
                  disabled={isLoading}
                  className="h-7 w-7 min-h-0 rounded-md text-muted-foreground hover:text-foreground"
                  aria-label="Log out"
                  title="Log out"
                  onClick={() => {
                    onNavClick?.();
                    void logout();
                  }}
                >
                  <Icon
                    name={isLoading ? "loader" : "log-out"}
                    size={16}
                    className={isLoading ? "animate-spin" : ""}
                  />
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/settings"
                onClick={onNavClick}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Settings"
                title="Settings"
              >
                <Icon name="settings" size={16} />
              </Link>
              <Button
                variant="ghost"
                disabled={isLoading}
                className="h-7 w-7 min-h-0 rounded-md text-muted-foreground hover:text-foreground"
                aria-label="Log out"
                title="Log out"
                onClick={() => {
                  onNavClick?.();
                  void logout();
                }}
              >
                <Icon
                  name={isLoading ? "loader" : "log-out"}
                  size={16}
                  className={isLoading ? "animate-spin" : ""}
                />
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Sidebar ──────────────────────────────────────────────────────────────────── */
interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isPartnerUser = useApp((s) => s.isPartnerUser);
  const isGlobalTenant = useApp((s) => s.isGlobalTenant);

  const checkPermissions = useNewPermissions();

  const baseNavigation = isPartnerUser
    ? partnerNavigation
    : isGlobalTenant
      ? globalNavigation
      : regularNavigation;

  // Filter groups based on permissions — mirrors pg-dashboard formatMenuItems logic
  const filteredNavigation: NavGroup[] = baseNavigation
    .map((group) => {
      const visibleItems = group.items
        .filter((item) => !item.permission?.length || checkPermissions(item.permission))
        .map((item) => ({
          ...item,
          children: item.children?.filter(
            (c) => !c.permission?.length || checkPermissions(c.permission)
          ),
        }))
        // Drop parent items whose children have all been filtered away
        .filter((item) => !item.children || item.children.length > 0);

      return { ...group, items: visibleItems };
    })
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
      <aside
        style={{ width: collapsed ? 60 : 232 }}
        className="relative hidden md:flex flex-col h-screen flex-shrink-0 z-20 overflow-hidden bg-sidebar border-r border-sidebar-border transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
      >
        {/* Logo + collapse toggle */}
        <div
          className={cn(
            "flex h-[57px] flex-shrink-0 items-center border-b border-sidebar-border",
            collapsed ? "justify-center px-2" : "justify-between px-3.5"
          )}
        >
          <div
            className={cn(
              "flex min-w-0 items-center overflow-hidden transition-[opacity,max-width] duration-150",
              collapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"
            )}
          >
            <Image src="/assets/payglocal-logo.png" alt="PayGlocal" width={126} height={28} />
          </div>
          <Button
            variant="ghost"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex-shrink-0 text-muted-foreground hover:text-foreground",
              collapsed ? "h-9 w-9" : "h-8 w-8"
            )}
          >
            <Icon name={collapsed ? "panel-left-open" : "panel-left-close"} size={18} />
          </Button>
        </div>

        <SidebarBody collapsed={collapsed} pathname={pathname} navigation={filteredNavigation} />
      </aside>

      {/* ── Mobile nav (portaled so fixed layers cover full viewport) ────── */}
      <ViewPortal>
        {/* Backdrop */}
        <div
          className={cn(
            "fixed inset-0 z-30 bg-black/40 md:hidden transition-opacity duration-200",
            mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
          onClick={onClose}
        />
        {/* Drawer */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-40 flex h-screen w-[232px] flex-col overflow-hidden border-r border-sidebar-border bg-sidebar md:hidden",
            "transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Logo + close button */}
          <div className="flex h-[57px] flex-shrink-0 items-center justify-between border-b border-sidebar-border px-3.5">
            <Image src="/assets/payglocal-logo.png" alt="PayGlocal" width={126} height={28} />
            <Button
              variant="ghost"
              onClick={onClose}
              aria-label="Close navigation"
              className="h-6 w-6 min-h-0 rounded-md text-muted-foreground hover:text-foreground"
            >
              <Icon name="x" size={16} />
            </Button>
          </div>

          <SidebarBody
            collapsed={false}
            pathname={pathname}
            onNavClick={onClose}
            navigation={filteredNavigation}
          />
        </aside>
      </ViewPortal>
    </>
  );
}
