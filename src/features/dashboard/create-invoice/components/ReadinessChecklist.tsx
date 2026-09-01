"use client";

import { Button, Popover, PopoverContent, PopoverTrigger, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

/** One thing the invoice needs before it can be generated. */
export interface InvoiceRequirement {
  id: string;
  /** What it is, as a heading. "Due date", "Receiving account". */
  label: string;
  /** Unmet: what to do about it. Met: what is on the invoice. One line either way. */
  detail: string;
  /** `data-field` anchor to scroll to. Null when nothing on the page can fix it
   *  by being scrolled to — a still-loading lookup, for instance. */
  fieldId: string | null;
  done: boolean;
}

/**
 * Scrolls a requirement's field into view and flashes it.
 *
 * A plain query rather than a ref map: the anchors are `data-field` attributes
 * on the sections themselves, the same decoupling the guide's `data-guide`
 * targets use, so a new requirement needs an attribute and nothing threaded
 * through the tree. Runs from a click, never during render.
 */
export function revealInvoiceField(fieldId: string): void {
  const el = document.querySelector<HTMLElement>(`[data-field="${fieldId}"]`);
  if (!el) return;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  // Re-triggerable: removing the class first restarts the animation when the
  // same row is clicked twice.
  el.classList.remove("field-flash");
  void el.offsetWidth;
  el.classList.add("field-flash");
  window.setTimeout(() => el.classList.remove("field-flash"), 1800);
}

function RequirementRow({
  requirement,
  onReveal,
}: {
  requirement: InvoiceRequirement;
  onReveal: () => void;
}) {
  const mark = requirement.done ? (
    <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
  ) : (
    // An empty ring, not a cross: nothing has gone wrong, this is simply not
    // done yet. A red X on a form the merchant is halfway through reads as an
    // error they caused.
    <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-[1.5px] border-muted-foreground/50" />
  );

  const body = (
    <>
      {mark}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-[12.5px] font-medium",
            requirement.done ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {requirement.label}
        </span>
        <span className="block text-[11.5px] leading-snug text-muted-foreground">
          {requirement.detail}
        </span>
      </span>
    </>
  );

  // A met requirement is a statement, not a control — there is nothing to go and
  // do. Only the outstanding ones are clickable, which is also what makes the
  // list's tab order the merchant's to-do list.
  if (requirement.done || !requirement.fieldId) {
    return <div className="flex items-start gap-2.5 rounded-lg px-2.5 py-2">{body}</div>;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onReveal}
      className="h-auto min-h-0 w-full justify-start gap-2.5 rounded-lg px-2.5 py-2 text-left font-normal [&>span]:flex [&>span]:w-full [&>span]:items-start [&>span]:gap-2.5"
    >
      {body}
    </Button>
  );
}

/**
 * What the invoice still needs, as a list the merchant can act on.
 *
 * This replaces a toast that named one problem per press. Nine different things
 * can block generation, and surfacing them one at a time meant a merchant near
 * the end could press Generate five times and be told five different things,
 * each message gone by the time they had scrolled to the field it described.
 *
 * So: all of them at once, standing next to the button rather than floating over
 * the page, each unmet one a control that scrolls to and flashes its own field.
 * The count on the trigger is the point — it turns "why won't this generate"
 * into something answerable before the press, not after it.
 */
export function ReadinessChecklist({
  requirements,
  open,
  onOpenChange,
}: {
  requirements: InvoiceRequirement[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const outstanding = requirements.filter((r) => !r.done);
  const isReady = outstanding.length === 0;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={
            isReady
              ? "Everything needed is filled in"
              : `${outstanding.length} things still needed before this invoice can be generated`
          }
          // Through leftIcon, not as a child beside the label. Button wraps its
          // children in a plain non-flex <span>, and preflight renders an <svg>
          // as display:block — so an Icon passed as a child takes a line of its
          // own above the text, which is what turned this pill into a circle
          // with the count under the glyph. leftIcon is a direct flex child of
          // the button, which is what puts the two on one line.
          leftIcon={
            <Icon
              name={isReady ? "check-circle" : "alert-circle"}
              className="h-3.5 w-3.5 shrink-0"
            />
          }
          className={cn(
            "h-auto min-h-0 shrink-0 gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium whitespace-nowrap",
            isReady
              ? "text-success hover:text-success"
              : "bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-500"
          )}
        >
          {isReady ? "Ready" : `${outstanding.length} left`}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" collisionPadding={8} className="w-[21rem] p-2">
        <div className="px-2.5 pb-1 pt-1.5">
          <p className="text-[12.5px] font-semibold text-foreground">
            {isReady ? "Ready to generate" : "Before you can generate"}
          </p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
            {isReady
              ? "Everything this invoice needs is filled in."
              : "Pick any of these to jump straight to it."}
          </p>
        </div>

        <Separator className="my-1.5" />

        {/* Outstanding first, in the order the page is filled in, then what is
            already done — so the list opens on the work rather than on a wall of
            ticks the merchant has to read past. */}
        <div className="max-h-[22rem] space-y-0.5 overflow-y-auto">
          {[...outstanding, ...requirements.filter((r) => r.done)].map((requirement) => (
            <RequirementRow
              key={requirement.id}
              requirement={requirement}
              onReveal={() => {
                onOpenChange(false);
                if (requirement.fieldId) revealInvoiceField(requirement.fieldId);
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
