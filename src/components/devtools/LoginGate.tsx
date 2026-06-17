"use client";

/**
 * Gates the chat behind a Claude subscription login. No API key is ever asked
 * for. Clicking "Log in with Claude" opens a Terminal running `claude login`
 * (browser OAuth); we poll status until it succeeds.
 */
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import type { AgentAuthStatus } from "@/lib/design-agent/types";

export function LoginGate({
  children,
  forceLoggedOut,
  onLoginSuccess,
}: {
  children: (status: AgentAuthStatus) => React.ReactNode;
  forceLoggedOut?: boolean;
  onLoginSuccess?: () => void;
}) {
  const [status, setStatus] = useState<AgentAuthStatus | null>(null);
  const [waiting, setWaiting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/design-agent/auth", { cache: "no-store" });
      setStatus(res.ok ? ((await res.json()) as AgentAuthStatus) : { loggedIn: false });
    } catch {
      setStatus({ loggedIn: false });
    }
  }, []);

  useEffect(() => {
    // One-time initial fetch of auth status from an external system (the Claude
    // CLI). setState happens asynchronously inside refresh's promise callback.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  // While waiting for the Terminal OAuth to complete, poll status.
  useEffect(() => {
    if (!waiting || status?.loggedIn) return;
    const id = setInterval(refresh, 2500);
    return () => clearInterval(id);
  }, [waiting, status?.loggedIn, refresh]);

  // Clear the forced-logged-out override once the user successfully logs back in.
  useEffect(() => {
    if (status?.loggedIn && forceLoggedOut) onLoginSuccess?.();
  }, [status?.loggedIn, forceLoggedOut, onLoginSuccess]);

  const login = useCallback(async () => {
    setWaiting(true);
    await fetch("/api/design-agent/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login" }),
    });
  }, []);

  if (!forceLoggedOut && status?.loggedIn) return <>{children(status)}</>;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <Icon name="sparkles" className="h-7 w-7 text-primary" />
      <p className="text-sm font-medium">Log in to start designing</p>
      <p className="text-xs text-muted-foreground">
        Uses your own Claude account — no API key needed.
      </p>
      <Button
        size="sm"
        onClick={login}
        disabled={waiting}
        leftIcon={<Icon name={waiting ? "loader" : "log-in"} className={waiting ? "animate-spin" : ""} />}
      >
        {waiting ? "Waiting for login…" : "Log in with Claude"}
      </Button>
      {waiting && (
        <p className="text-[11px] text-muted-foreground">
          Complete the login in the Terminal window that just opened.
        </p>
      )}
    </div>
  );
}
