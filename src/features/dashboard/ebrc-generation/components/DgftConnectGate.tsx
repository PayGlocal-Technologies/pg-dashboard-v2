"use client";

import { useState } from "react";
import { EbrcBanner } from "@/features/dashboard/ebrc/components/EbrcBanner";
import { DgftLoginPanel } from "@/features/dashboard/ebrc-generation/components/DgftLoginPanel";
import { useDgftLogin } from "@/features/dashboard/ebrc-generation/hooks";

/**
 * DGFT login — gates eBRC Generation until the merchant's DGFT account is
 * linked. Reuses the same designed banner (EbrcBanner) as the "eBRC" parent
 * landing page (see ebrc/index.tsx) rather than a bare empty state, since a
 * merchant can land directly on eBRC Generation without passing through
 * that page first. "Sign in to DGFT" swaps that banner for DgftLoginPanel
 * inline, in the same bordered box footprint — not a dialog, not a
 * full-screen takeover.
 *
 * The credentials go to `validate_customer` (useDgftLogin), which is what
 * establishes the DGFT session every other eBRC call then rides on. They are
 * held in local state for exactly as long as the form is open and cleared on
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

  return loginOpen ? (
    <DgftLoginPanel
      username={username}
      password={password}
      onUsernameChange={setUsername}
      onPasswordChange={setPassword}
      onCancel={closeLogin}
      onLogin={handleLogin}
      isPending={isPending}
    />
  ) : (
    <EbrcBanner ctaLabel="Sign in to DGFT" onCtaClick={() => setLoginOpen(true)} />
  );
}
