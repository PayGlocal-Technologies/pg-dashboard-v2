"use client";

import { Button } from "@/components/ui";

/** The "Want to go deeper?" line plus up to three short follow-up chips
 *  after a completed reply — tapping one sends it as the next message. */
export function EchoFollowUps({
  closingLine,
  followUps,
  onSend,
  disabled,
}: {
  closingLine?: string;
  followUps: string[];
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  if (!closingLine && followUps.length === 0) return null;

  return (
    <div className="space-y-2">
      {closingLine && <p className="text-[13px] leading-relaxed text-foreground">{closingLine}</p>}
      {followUps.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {followUps.map((chip) => (
            <Button
              key={chip}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className="h-auto min-h-0 rounded-lg border-border px-3 py-1.5 text-[12px] font-medium text-foreground hover:border-primary/40 hover:bg-muted/40"
              onClick={() => onSend(chip)}
            >
              {chip}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
