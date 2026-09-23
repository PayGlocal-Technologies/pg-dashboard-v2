"use client";

import { useState } from "react";
import { EbrcBanner } from "@/features/dashboard/ebrc/components/EbrcBanner";
import { DgftLoginDialog } from "@/features/dashboard/ebrc-generation/components/DgftLoginDialog";
import { useDgftLogin } from "@/features/dashboard/ebrc-generation/hooks";

/**
 * DGFT login — gates eBRC Generation until the merchant's DGFT account is
 * linked. Reuses the same designed banner (EbrcBanner) as the "eBRC" parent
 * landing page (see ebrc/index.tsx) rather than a bare empty state, since a
 * merchant can land directly on eBRC Generation without passing through
 * that page first. "Sign in to DGFT" opens DgftLoginDialog as a popup on
 * top of the banner, which stays on screen underneath rather than being
 * swapped out.
 *
 * The credentials go to `validate_customer` (useDgftLogin), which is what
 * establishes the DGFT session every other eBRC call then rides on. They are
 * held in local state for exactly as long as the dialog is open and cleared on
 * both cancel and success — never persisted, never logged.
 *
 * `onConnected` fires only after the backend confirms; the caller re-reads
 * `fetch_customer_status` rather than trusting this component's own state,
 * so a reload lands on the same answer the server would give.
 */
export function DgftConnectGate({ onConnected }: { onConnected: () => void }) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const { login, isPending } = useDgftLogin();

  const closeLogin = () => {
    setLoginOpen(false);
    setUsername("");
    setPassword("");
  };

  const handleLogin = () => {
    login(username, password, () => {
      closeLogin();
      onConnected();
    });
  };

  return (
    <>
      <EbrcBanner ctaLabel="Sign in to DGFT" onCtaClick={() => setLoginOpen(true)} />

      <DgftLoginDialog
        open={loginOpen}
        username={username}
        password={password}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        // Dismissing mid-request would leave `validate_customer` resolving into
        // a closed dialog and the credentials cleared out from under it, so the
        // close is refused while one is in flight.
        onOpenChange={(open) => {
          if (open) setLoginOpen(true);
          else if (!isPending) closeLogin();
        }}
        onLogin={handleLogin}
        isPending={isPending}
      />
    </>
  );
}
