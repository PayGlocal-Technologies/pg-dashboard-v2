"use client";

import { useState } from "react";
import { toast } from "sonner";
import { EbrcBanner } from "@/features/dashboard/ebrc/components/EbrcBanner";
import { DgftLoginPanel } from "@/features/dashboard/ebrc-generation/components/DgftLoginPanel";

/**
 * DGFT login — gates eBRC Generation until the merchant's DGFT account is
 * linked. Reuses the same designed banner (EbrcBanner) as the "eBRC" parent
 * landing page (see ebrc/index.tsx) rather than a bare empty state, since a
 * merchant can land directly on eBRC Generation without passing through
 * that page first. "Sign in to DGFT" swaps that banner for DgftLoginPanel
 * inline, in the same bordered box footprint — not a dialog, not a
 * full-screen takeover.
 *
 * There is no real DGFT integration yet (no OAuth handshake, no credential
 * exchange endpoint), so "Login" only flips local state — same honest-stub
 * pattern CreateMcaLinkPage uses for its own not-yet-wired submit. Nothing
 * typed into the username/password fields leaves the browser.
 */
export function DgftConnectGate({ onConnected }: { onConnected: () => void }) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const closeLogin = () => {
    setLoginOpen(false);
    setUsername("");
    setPassword("");
  };

  const handleLogin = () => {
    // TODO(integration): exchange these for a real DGFT session once the
    // endpoint exists. For now this only unlocks the mock flow below.
    toast.message("DGFT sign-in isn't connected to the backend yet", {
      description: "Continuing with example IRMs so you can preview the flow.",
    });
    closeLogin();
    onConnected();
  };

  return loginOpen ? (
    <DgftLoginPanel
      username={username}
      password={password}
      onUsernameChange={setUsername}
      onPasswordChange={setPassword}
      onCancel={closeLogin}
      onLogin={handleLogin}
    />
  ) : (
    <EbrcBanner ctaLabel="Sign in to DGFT" onCtaClick={() => setLoginOpen(true)} />
  );
}
