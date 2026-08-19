import { Card, Heading, Text } from "@/components/ui";
import { Icon } from "@/components/icon";
import { REFERRAL_STEPS } from "@/features/dashboard/refer-and-earn/constants";

/**
 * The three referral steps, given equal weight and separated by spacing alone —
 * no dividers between the columns, the card boundary is the only edge.
 */
export function HowItWorks() {
  return (
    <Card className="gap-6 p-6 sm:p-8 lg:gap-8 lg:p-10">
      {/* Section-level heading: deliberately one step down from the hero's h1
          so the two don't compete. */}
      <Heading level={2} size="md">
        How it works
      </Heading>

      {/* Three across from sm up (tablet keeps them horizontal on tighter
          gaps); stacked below that. */}
      <div className="grid gap-8 sm:grid-cols-3 sm:gap-6 lg:gap-10">
        {REFERRAL_STEPS.map((step, index) => (
          <div key={step.title} className="flex flex-col">
            {/* Icon in a tinted square, with the step number alongside it so
                the order is explicit and not left to reading direction. */}
            <div className="flex items-center gap-2.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon name={step.icon} size={18} />
              </span>
              <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                Step {index + 1}
              </span>
            </div>

            <Heading level={3} size="xs" className="mt-4">
              {step.title}
            </Heading>
            <Text size="sm" color="subtle" className="mt-1.5 leading-relaxed">
              {step.description}
            </Text>
          </div>
        ))}
      </div>
    </Card>
  );
}
