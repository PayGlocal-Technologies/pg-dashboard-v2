"use client";

import { useEffect, useState } from "react";
import { SelectMidView } from "@/components/common/SelectMidView";
import { HowItWorksDialog } from "@/features/dashboard/static-link/components/HowItWorksDialog";
import { StaticLinkHandleDialog } from "@/features/dashboard/static-link/components/StaticLinkHandleDialog";
import { StaticLinkHero } from "@/features/dashboard/static-link/components/StaticLinkHero";
import { StaticLinkIntroDialog } from "@/features/dashboard/static-link/components/StaticLinkIntroDialog";
import { StaticLinkTransactions } from "@/features/dashboard/static-link/components/StaticLinkTransactions";
import { STATIC_LINK_INTRO_SEEN_KEY } from "@/features/dashboard/static-link/constants";
import { splitShareableLink, toDisplayLink } from "@/features/dashboard/static-link/helpers";
import { useStaticLink } from "@/features/dashboard/static-link/hooks";

/**
 * Static Link, at /static-link: the merchant's one permanent payment link
 * (where the customer enters the amount) and every payment taken through it.
 * Migrated from pg-dashboard's src/features/static-link.
 *
 * The link is issued by the server (`shareableLink`) and never built here.
 * Every call is addressed by one PA MID in the path, so with no PA MID
 * resolved the page asks for one instead.
 */
export function StaticLinkFeature() {
  const { merchantId, link, isLoading, isSaving, activateWithHandle, saveDisplayFields } =
    useStaticLink();

  // Separate dialogs: the first-visit pitch, the one-time name editor, and the
  // on-demand explainer, so none can suppress another.
  const [introOpen, setIntroOpen] = useState(false);
  const [handleOpen, setHandleOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  // First visit only: show the intro, then remember it. Read after mount
  // (localStorage isn't on the server), and opened from a timer callback
  // rather than the effect body (see CLAUDE.md).
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        if (localStorage.getItem(STATIC_LINK_INTRO_SEEN_KEY) === "true") return;
        localStorage.setItem(STATIC_LINK_INTRO_SEEN_KEY, "true");
      } catch {
        // Storage blocked: show the intro, it just won't be remembered.
      }
      setIntroOpen(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const { prefix, handle } = splitShareableLink(link?.shareableLink);

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      {merchantId ? (
        <>
          <StaticLinkHero
            link={link}
            isLoading={isLoading}
            isSaving={isSaving}
            onHowItWorks={() => setHowItWorksOpen(true)}
            onEditHandle={() => setHandleOpen(true)}
            onSaveDisplayFields={saveDisplayFields}
          />
          <StaticLinkTransactions
            merchantId={merchantId}
            productId={link?.productId}
            isLoading={isLoading}
          />
        </>
      ) : (
        <SelectMidView midType="PA" />
      )}

      <StaticLinkIntroDialog open={introOpen} onOpenChange={setIntroOpen} />
      <StaticLinkHandleDialog
        open={handleOpen}
        onOpenChange={setHandleOpen}
        currentHandle={handle}
        linkPrefix={prefix}
        isSaving={isSaving}
        onConfirm={(next) => {
          setHandleOpen(false);
          activateWithHandle(next);
        }}
      />
      <HowItWorksDialog
        open={howItWorksOpen}
        onOpenChange={setHowItWorksOpen}
        url={toDisplayLink(link?.shareableLink) || "Your link will appear here"}
      />
    </div>
  );
}
