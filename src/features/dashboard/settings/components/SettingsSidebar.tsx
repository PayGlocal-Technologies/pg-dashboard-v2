"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { SETTINGS_NAV_GROUPS, type SettingsNavItem } from "@/features/dashboard/settings/constants";

function isPathActive(pathname: string, href: string): boolean {
  return href === "/settings" ? pathname === "/settings" : pathname.startsWith(href);
}

function SettingsNavItemRow({ item, pathname }: { item: SettingsNavItem; pathname: string }) {
  const childActive = item.children?.some((child) => isPathActive(pathname, child.href)) ?? false;
  const [open, setOpen] = useState(childActive);

  if (!item.children) {
    const isActive = isPathActive(pathname, item.href);
    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-2 py-2 text-[14px] font-medium transition-colors",
          isActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        )}
      >
        <Icon
          name={item.icon}
          size={16}
          className={cn("flex-shrink-0", isActive ? "text-foreground" : "text-muted-foreground")}
        />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  }

  const isParentHighlighted = childActive;

  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full p-0 h-auto min-h-0 rounded-lg text-left text-[14px] font-medium",
          "[&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-2.5 [&>span]:px-2 [&>span]:py-2",
          isParentHighlighted
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        )}
      >
        <Icon
          name={item.icon}
          size={16}
          className={cn(
            "flex-shrink-0",
            isParentHighlighted ? "text-foreground" : "text-muted-foreground"
          )}
        />
        <span className="flex-1 truncate">{item.label}</span>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={13} className="flex-shrink-0" />
      </Button>

      {open && (
        <div className="ml-[18px] mt-0.5 mb-1 border-l-2 border-border pl-3">
          {item.children.map((child) => {
            const isChildActive = isPathActive(pathname, child.href);
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "block rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
                  isChildActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Dedicated left nav for the /settings section, rendered as its own nested
 * column alongside the main app Sidebar (not a replacement for it), see
 * (dashboard)/settings/layout.tsx. */
export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 flex-shrink-0 border-r border-border pb-6 pr-5">
      <div className="px-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile and account</p>
      </div>

      <nav className="mt-6 space-y-5">
        {SETTINGS_NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {group.label}
            </p>
            <div className="mt-1.5 space-y-0.5">
              {group.items.map((item) => (
                <SettingsNavItemRow key={item.href} item={item} pathname={pathname} />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
