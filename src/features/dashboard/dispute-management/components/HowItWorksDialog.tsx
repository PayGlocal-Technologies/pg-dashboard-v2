"use client";

import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import {
  CB_LEVEL_META,
  HOW_IT_WORKS,
} from "@/features/dashboard/dispute-management/constants";

const OPTION_ICONS: IconName[] = ["shield-check", "check-circle", "scale"];

/**
 * "How it works", pg-dashboard's HowDoesItWorkDrawer (merchant only): what a
 * dispute is, why disputes happen, the five levels and the three ways to
 * resolve one. Copy verbatim; laid out like the design's stage guide.
 */
export function HowItWorksDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <div className="flex items-center gap-3 px-6 pt-6 pr-14">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon name="help-circle" size={18} aria-hidden />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-lg leading-tight">How it works</DialogTitle>
            <DialogDescription className="mt-0.5 text-[13px]">
              What a dispute is, its stages, and how to resolve one.
            </DialogDescription>
          </div>
        </div>

        <div className="flex flex-col gap-5 px-6 py-5 text-[13px] leading-relaxed text-muted-foreground">
          <section>
            <p className="font-semibold text-foreground">What is a Dispute?</p>
            <p className="mt-0.5">{HOW_IT_WORKS.whatIs}</p>
          </section>

          <section>
            <p className="font-semibold text-foreground">Why do disputes happen?</p>
            <p className="mt-0.5">Disputes are usually raised when:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {HOW_IT_WORKS.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </section>

          <section>
            <p className="font-semibold text-foreground">Levels of a Dispute</p>
            <p className="mt-0.5">{HOW_IT_WORKS.levelsIntro}</p>
            <ol className="mt-3 flex flex-col gap-3">
              {HOW_IT_WORKS.levels.map(({ level, title, points }) => {
                const meta = CB_LEVEL_META[level];
                return (
                  <li key={level} className="flex items-start gap-3">
                    <Badge
                      variant={meta.variant}
                      size="sm"
                      className="mt-0.5 shrink-0 gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium"
                    >
                      {meta.label}
                      {meta.chevrons === 1 && <Icon name="chevron-up" size={12} aria-hidden />}
                      {meta.chevrons === 2 && <Icon name="chevrons-up" size={12} aria-hidden />}
                    </Badge>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{title}</p>
                      <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-xs">
                        {points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section>
            <p className="font-semibold text-foreground">How can you resolve a dispute?</p>
            <p className="mt-0.5">You have three options:</p>
            <ul className="mt-2 flex flex-col gap-3">
              {HOW_IT_WORKS.options.map((option, index) => (
                <li key={option.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/70">
                    <Icon name={OPTION_ICONS[index] ?? "info"} size={14} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{option.title}</p>
                    <p className="text-xs">{option.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="border-t border-border bg-muted/30 px-6 py-5 text-[13px] leading-relaxed">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Important things to know
          </p>
          <ul className="mt-2 list-disc space-y-0.5 pl-4 text-muted-foreground">
            {HOW_IT_WORKS.important.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p className="mt-3 text-muted-foreground">
            <span className="font-semibold text-foreground">Tip:</span> {HOW_IT_WORKS.tip}
          </p>
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="primary" size="sm" onClick={() => onOpenChange(false)}>
              Got it
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
