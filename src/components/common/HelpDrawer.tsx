"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  IconButton,
  StatusBadge,
  type BadgeTrailIcon,
  type BadgeVariant,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableText } from "@/components/common/CopyableText";
import {
  TutorialTile,
  type TutorialVideo,
} from "@/features/dashboard/multi-currency/components/TutorialVideoTile";

export interface HelpGuideItem {
  question: string;
  answer: string;
}

export interface HelpGlossaryRow {
  label: string;
  variant: BadgeVariant;
  trailIcon?: BadgeTrailIcon;
  meaning: string;
}

/**
 * A plain "table column name → what it means" pair, distinct from
 * HelpGlossaryRow above: that one is built around a live StatusBadge
 * (variant/trailIcon) for status-chip glossaries, this one is just a label
 * and explanation for a table's column headers. Kept generic (not tied to
 * Settlements) so any screen's column glossary can reuse this same shape and
 * the row renderer below rather than a bespoke one per screen.
 */
export interface HelpColumnGlossaryRow {
  column: string;
  meaning: string;
}

// Same PayGlocal support line for every screen this drawer opens on, so it
// isn't threaded through as a prop.
const HELP_PHONE_DISPLAY = "+91 92402 31940";
const HELP_PHONE_DIALABLE = "+919240231940";
const HELP_SUPPORT_EMAIL = "merchant.support@payglocal.in";

/**
 * The shared Help drawer shell: a floating panel docked to the right edge,
 * detached from all four edges, with NO backdrop. The rest of the dashboard
 * stays fully visible and interactive while it's open, so this deliberately
 * isn't a modal. That rules out flux-ui's Drawer (which always renders its
 * own dimmed overlay, see that component's own source) and Radix Dialog
 * (whose focus trap/aria-hiding of the rest of the page assumes a modal even
 * with no visible overlay rendered). This is a plain floating div, portaled
 * to <body> so its fixed positioning can't be clipped by an ancestor's
 * overflow/transform, closed by its own mousedown/Escape listeners rather
 * than any dialog primitive's built-in dismissal.
 *
 * Owns its own trigger, the header's '?' control, so the button and the
 * panel it opens can never drift apart.
 *
 * Content-only differs per screen (guideItems/tutorials/glossary); the shell
 * itself (positioning, animation, close behaviour, footer) is shared so a
 * second screen's Help drawer is a config, not a second component. See
 * AccountsHelpDrawer and TransactionsHelpDrawer for the two current callers.
 */
export function HelpDrawer({
  guideItems,
  tutorials,
  glossary,
  columnGlossary,
  columnGlossaryLabel = "Table Column Glossary",
}: {
  guideItems: HelpGuideItem[];
  /** Omitted entirely on screens with no Tutorials section (e.g. Dashboard). */
  tutorials?: TutorialVideo[];
  /** Omitted entirely on screens with no glossary (e.g. Accounts). */
  glossary?: HelpGlossaryRow[];
  /** Omitted entirely on screens with no column glossary (e.g. Accounts, Transactions). */
  columnGlossary?: HelpColumnGlossaryRow[];
  /** Section header above columnGlossary; defaults to the Settlements wording. */
  columnGlossaryLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  // Both open and close are one continuous animated transition; a second tap
  // mid-transition is ignored rather than starting a competing one. A ref,
  // not state: requestClose/toggle are read by the Escape/click-outside
  // listeners below, which are attached once per open (effect deps: [open])
  // rather than re-attached on every animation-state change. If this were
  // state, those listeners would close over the isAnimating value from the
  // render that ran the effect (always true, since opening sets it
  // immediately) and never see it flip back to false, permanently
  // latching Escape/click-outside closed while the trigger button's onClick
  // (bound fresh every render) kept working — a real bug this once was.
  const isAnimatingRef = useRef(false);
  // `document.body` (the portal target below) doesn't exist during SSR.
  // Rather than an effect+setState just to detect the client, this flips
  // true inside the trigger's own click handler, which can only ever fire
  // post-hydration, and then stays true, so the portal (and the
  // AnimatePresence inside it that plays the close animation) keeps
  // rendering after the first open rather than disappearing the instant
  // `open` goes back to false.
  const [everOpened, setEverOpened] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const requestClose = () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setOpen(false);
  };

  const toggle = () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setEverOpened(true);
    setOpen((prev) => !prev);
  };

  // Escape and click-outside both only listen while open, and both check the
  // trigger too, otherwise the same tap that reopens the drawer via the
  // trigger's own onClick would first be seen here as an outside click and
  // close it, flickering shut-then-open.
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      requestClose();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      {/* Icon-only, matching the header's other square controls (the
          notification bell, theme toggle) it sits beside, this isn't a
          page action like Forex calculator, it's a header-level control. */}
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        aria-label="Help"
        onClick={toggle}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted p-0 transition-colors hover:bg-accent"
      >
        <Icon name="help-circle" size={17} className="text-muted-foreground" />
      </Button>

      {everOpened &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={panelRef}
                role="dialog"
                aria-modal="false"
                aria-label="Help"
                className="fixed inset-y-4 right-4 z-[100] flex w-[min(400px,calc(100vw-2rem))] flex-col
                           overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl outline-none"
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                onAnimationComplete={() => {
                  isAnimatingRef.current = false;
                }}
              >
                {/* Header: fixed, does not scroll. */}
                <div className="shrink-0 border-b border-border px-5 py-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-foreground">Help</h2>
                    <IconButton
                      aria-label="Close help"
                      variant="ghost"
                      size="sm"
                      onClick={requestClose}
                    >
                      <Icon name="x" className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>

                {/* Scrollable body. */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Guide
                  </p>
                  <Accordion type="single" collapsible className="mt-2">
                    {guideItems.map((item) => (
                      <AccordionItem key={item.question} value={item.question}>
                        {/* No brand blue on hover, flux-ui's own AccordionTrigger
                            defaults to hover:text-primary; overridden to a plain
                            gray tint here, since this list is informational,
                            not a set of links. */}
                        <AccordionTrigger className="-mx-1 rounded-md px-1 text-left text-sm hover:bg-muted/50 hover:text-foreground">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-[13px] text-muted-foreground">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  {tutorials && tutorials.length > 0 && (
                    <>
                      <p className="mt-6 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Tutorials
                      </p>
                      <div className="mt-2">
                        <TutorialTile video={tutorials[0]} />
                      </div>
                    </>
                  )}

                  {glossary && glossary.length > 0 && (
                    <>
                      <p className="mt-6 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Glossary
                      </p>
                      {/* Same bordered-card shell as the Table Column
                          Glossary below (and not flux-ui's DataTable: that's
                          built for paginated/loading/empty-state-aware data
                          grids with a non-omittable "Showing X of Y" footer,
                          the wrong shape for a short static reference list
                          embedded inside an already-scrollable panel). Only
                          the left cell differs: a live StatusBadge instead of
                          plain bold text, so a row visually matches the same
                          chip the table renders for that status. Scrolls with
                          the rest of the body rather than independently, same
                          as Guide/Tutorials above. */}
                      <div className="mt-2 divide-y divide-border rounded-xl border border-border">
                        {glossary.map((row) => (
                          <div
                            key={row.label}
                            className="grid grid-cols-2 items-start gap-3 px-3.5 py-3"
                          >
                            <StatusBadge
                              variant={row.variant}
                              label={row.label}
                              trailIcon={row.trailIcon}
                              size="sm"
                              className="justify-self-start"
                            />
                            <p className="text-[13px] text-muted-foreground">{row.meaning}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {columnGlossary && columnGlossary.length > 0 && (
                    <>
                      <p className="mt-6 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {columnGlossaryLabel}
                      </p>
                      {/* Same bordered-card shell as the status Glossary
                          above; this section has no badge/icon to show, just
                          a bold column name in place of the StatusBadge cell.
                          Generic label/meaning row shape so a future screen's
                          column glossary can reuse this same block rather
                          than a bespoke one. */}
                      <div className="mt-2 divide-y divide-border rounded-xl border border-border">
                        {columnGlossary.map((row) => (
                          <div key={row.column} className="grid grid-cols-2 gap-3 px-3.5 py-3">
                            <p className="text-[13px] font-semibold text-foreground">
                              {row.column}
                            </p>
                            <p className="text-[13px] text-muted-foreground">{row.meaning}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Footer: fixed to the bottom of the drawer, never the
                    bottom of the (possibly shorter) body content above it. */}
                <div className="shrink-0 border-t border-border px-5 py-4">
                  {/* One stack, one gap for all three rows — feedback, phone
                      and email read as three equal entries in the same list,
                      not "feedback, then a phone+email pair" (which is what
                      a smaller nested space-y around just the last two used
                      to read as). */}
                  <div className="flex flex-col gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      leftIcon={<Icon name="message-circle" className="h-3.5 w-3.5" />}
                      className="h-auto min-h-0 justify-start gap-1.5 p-0 text-[13px] font-medium text-primary hover:bg-transparent hover:underline"
                      onClick={() => {
                        window.location.href = `mailto:${HELP_SUPPORT_EMAIL}?subject=Feedback`;
                      }}
                    >
                      Send us feedback
                    </Button>
                    {/* font-sans overrides CopyableText's default font-mono.
                        This spec wants the same body font as the rest of the
                        drawer, not a distinct typeface for these two lines. */}
                    <div className="flex items-center gap-2">
                      <Icon name="phone" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <CopyableText
                        value={HELP_PHONE_DIALABLE}
                        displayValue={HELP_PHONE_DISPLAY}
                        valueClassName="font-sans text-[13px] text-foreground"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon name="mail" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <CopyableText
                        value={HELP_SUPPORT_EMAIL}
                        valueClassName="font-sans text-[13px] text-foreground"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
