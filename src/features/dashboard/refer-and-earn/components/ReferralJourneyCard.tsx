import { Card, Text } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { REFERRAL_STEPS } from "@/features/dashboard/refer-and-earn/constants";

/**
 * The three-step referral journey, as its own standalone card — a compact
 * recap of the same REFERRAL_STEPS the page's full "How it works" section
 * reads further down, so the two can never say something different about how
 * the programme works. Purely informational: nothing here is a button or a
 * link, and it carries no state of its own.
 */
export function ReferralJourneyCard() {
  return (
    <Card size="sm" className="gap-0 p-4 sm:p-5">
      <div className="flex flex-col">
        {REFERRAL_STEPS.map((step, index) => {
          const isLast = index === REFERRAL_STEPS.length - 1;
          return (
            <div key={step.title} className="flex gap-3">
              {/* Icon column: a tinted rounded bubble, then the connector down
                  to the next one. `items-center` centres the bubble
                  horizontally in its own column; the row's default
                  `align-items: stretch` is what then lets this column grow to
                  the row's full height so the connector — a 1px line at
                  `flex-1` — reaches exactly to the next bubble with no length
                  computed by hand. The last row omits it: there is nothing
                  below it to connect to. */}
              <div className="flex flex-col items-center">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon name={step.icon} size={16} />
                </span>
                {!isLast && <span aria-hidden className="w-px flex-1 bg-border" />}
              </div>

              {/* Left-aligned title and description, vertically lined up
                  with the bubble beside it. `pb-5` on every row but the last
                  is the row's own height — and so the connector's own
                  length — rather than a separate spacer element between
                  rows; it now spans both lines of text instead of just the
                  title, so the connector still reaches exactly to the next
                  bubble however long the description wraps to. */}
              <div className={cn("flex flex-col pt-1.5", !isLast && "pb-5")}>
                <Text size="sm" className="font-medium text-foreground">
                  {step.title}
                </Text>
                <Text size="sm" color="subtle" className="mt-0.5 leading-relaxed">
                  {step.description}
                </Text>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
