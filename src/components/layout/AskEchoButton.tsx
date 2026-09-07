"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import useNewPermissions from "@/hooks/useNewPermissions";
import { cn } from "@/lib/utils";

type Props = {
  /** Sidebar rail mode: icon only, no label. */
  collapsed?: boolean;
  /** Closes the mobile drawer the sidebar renders into. */
  onNavigate?: () => void;
  className?: string;
};

/**
 * Sidebar entry point: the only way into Echo, and it goes straight to /echo.
 *
 * Sits above the nav groups rather than inside one, and keeps its gradient
 * ring, because Echo is a way into everything below it rather than one more
 * destination in the list.
 *
 * Gated on `getEchoActiveSession`, the same permission pg-dashboard uses to
 * decide who gets Echo at all (see its whatsapp-banner and payglocal-go
 * features) — a merchant without it has no Echo session to talk to, so the
 * button does not appear rather than leading to a page that cannot work.
 *
 * A Button with router.push rather than a Link, because flux's Button has no
 * `asChild`.
 */
export function AskEchoButton({ collapsed = false, onNavigate, className }: Props) {
  const checkPermissions = useNewPermissions();
  const pathname = usePathname();
  const router = useRouter();

  if (!checkPermissions(["getEchoActiveSession"])) return null;

  const isActive = pathname === "/echo";

  return (
    <span
      className={cn(
        "echo-ask-ring block rounded-[9px]",
        collapsed ? "w-fit" : "w-full",
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        aria-label="Ask Echo"
        aria-current={isActive ? "page" : undefined}
        title={collapsed ? "Ask Echo" : undefined}
        onClick={() => {
          onNavigate?.();
          if (!isActive) router.push("/echo");
        }}
        leftIcon={<Icon name="echo-mark" className="shrink-0 text-[18px]" />}
        className={cn(
          "relative z-[1] h-9 min-h-0 gap-2.5 rounded-lg bg-card text-[14px] font-medium",
          "text-foreground shadow-sm hover:bg-muted",
          collapsed ? "w-9 justify-center px-0" : "w-full justify-start px-2.5",
          // The ring already makes this the loudest thing in the rail, so the
          // active state is just the label going primary rather than the
          // card/border treatment the nav rows use.
          isActive && "text-primary"
        )}
      >
        {!collapsed && <span className="flex-1 truncate text-left">Ask Echo</span>}
      </Button>
    </span>
  );
}
