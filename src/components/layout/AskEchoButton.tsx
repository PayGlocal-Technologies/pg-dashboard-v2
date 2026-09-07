"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import useNewPermissions from "@/hooks/useNewPermissions";
import { cn } from "@/lib/utils";

/**
 * Header entry point: the only way into Echo, and it goes straight to /echo.
 *
 * Gated on `getEchoActiveSession`, the same permission pg-dashboard uses to
 * decide who gets Echo at all (see its whatsapp-banner and payglocal-go
 * features) — a merchant without it has no Echo session to talk to, so the
 * button does not appear rather than leading to a page that cannot work.
 *
 * A Button with router.push rather than a Link, because flux's Button has no
 * `asChild` and the header's own Create menu already navigates this way.
 */
export function AskEchoButton({ className }: { className?: string }) {
  const checkPermissions = useNewPermissions();
  const pathname = usePathname();
  const router = useRouter();

  if (!checkPermissions(["getEchoActiveSession"])) return null;
  // Nothing to offer while the merchant is already looking at it.
  if (pathname === "/echo") return null;

  return (
    <span className={cn("echo-ask-ring rounded-lg", className)}>
      <Button
        type="button"
        variant="ghost"
        onClick={() => router.push("/echo")}
        aria-label="Ask Echo"
        className={cn(
          "relative z-[1] h-9 gap-2 rounded-[7px] bg-muted px-2.5 text-[13px] font-medium",
          "text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground sm:px-3"
        )}
        leftIcon={<Icon name="echo-mark" className="text-[18px]" />}
      >
        <span className="hidden sm:inline">Ask Echo</span>
      </Button>
    </span>
  );
}
