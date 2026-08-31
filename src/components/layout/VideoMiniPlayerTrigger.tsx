"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { VideoMiniPlayer } from "@/components/common/VideoMiniPlayer";
import { useHelpDrawerStore } from "@/stores/useHelpDrawer";

// No unlisted YouTube URL has been supplied yet — VideoMiniPlayer already
// renders a blank placeholder for an undefined videoUrl, so this only needs
// to change to the real embed URL once one exists, nothing else.
const VIDEO_URL: string | undefined = undefined;

// Screens the floating mini-player is allowed on, matching the same
// pathname convention HELP_DRAWER_CONFIG (HelpTrigger.tsx) uses. One shared
// widget with one videoUrl, so this is a plain allow-list rather than a
// per-screen config.
const ALLOWED_PATHS = [
  (path: string) => path === "/mca-transactions" || path.startsWith("/mca-transactions/"),
  (path: string) => path === "/multi-currency" || path.startsWith("/multi-currency/"),
  (path: string) => path === "/platforms" || path.startsWith("/platforms/"),
];

/**
 * Mounted once in the dashboard layout (like FeedbackSheet/HelpTrigger), this
 * decides whether the current screen is one of the three the mini-player is
 * allowed on and owns its dismiss state. Dismissal is a plain in-memory flag
 * — not sessionStorage, not a persisted preference — so it resets on reload
 * but survives navigating between the three screens, since this component
 * itself never unmounts while the dashboard layout is mounted.
 */
export function VideoMiniPlayerTrigger() {
  const pathname = usePathname();
  const [closed, setClosed] = useState(false);
  const helpDrawerOpen = useHelpDrawerStore((s) => s.isOpen);

  const allowed = ALLOWED_PATHS.some((matches) => matches(pathname));
  if (!allowed || closed || helpDrawerOpen) return null;

  return <VideoMiniPlayer videoUrl={VIDEO_URL} onClose={() => setClosed(true)} />;
}
