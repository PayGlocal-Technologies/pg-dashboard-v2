"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@tanstack/react-form";
import { toast } from "sonner";
import { Button, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useDealForm } from "@/features/dashboard/partner-deals/form";
import { DealDetailsSection } from "@/features/dashboard/partner-deals/components/DealDetailsSection";
import { PricingConfiguration } from "@/features/dashboard/partner-deals/components/PricingConfiguration";
import { DealSummary, focusField } from "@/features/dashboard/partner-deals/components/DealSummary";
import { DEALS_PATH } from "@/features/dashboard/partner-deals/constants";
import { listIssues } from "@/features/dashboard/partner-deals/validation";

/**
 * DESIGN MOCK: Create Deal as a workspace page (/partner-deals-dashboard/create).
 * The form on the left (about three quarters of the width); a live Deal
 * Summary on the right, sticky while the pricing scrolls past, divided off by
 * a hairline rather than floated as a card. Create Deal sits at the foot of
 * that sticky summary, under "Ready to create" / what needs attention, so
 * it's always in view beside the form and reads as the summary's outcome;
 * there is no header button and no bottom action bar. Below lg the summary
 * (and with it Create) stacks under the form.
 *
 * Submitting runs the form's validation and then stops at a "not connected"
 * toast. TODO(integration): replace `submit` with the real create-deal call
 * (payload, endpoint, success/error handling) from pg-dashboard's drawer, and
 * validation.ts's placeholder rules with its real ones.
 */
export function CreateDealPage() {
  const router = useRouter();

  const form = useDealForm({
    onSubmit: async () => {
      // Stands in for the request so the loading state can be seen.
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      toast.message("Deal creation isn't connected yet", {
        description: "This screen is a design preview. Nothing was saved.",
      });
    },
    onSubmitInvalid: () => {
      // Straight to the first problem, in page order, from the same rules
      // the summary counts.
      const first = listIssues(form.state.values)[0];
      if (first) focusField(first.fieldId);
      toast.error("Some fields need attention", {
        description: "Fix the highlighted fields to create this deal.",
      });
    },
  });

  const values = useStore(form.store, (s) => s.values);
  const isSubmitting = useStore(form.store, (s) => s.isSubmitting);

  const createButton = (className?: string) => (
    <Button
      type="button"
      variant="primary"
      isLoading={isSubmitting}
      onClick={() => void form.handleSubmit()}
      className={className}
    >
      Create Deal
    </Button>
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 page-enter">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        leftIcon={<Icon name="chevron-left" className="h-4 w-4" />}
        onClick={() => router.push(DEALS_PATH)}
        className="pl-0 text-primary hover:text-primary-hover"
      >
        Back to Partner Deals
      </Button>

      <PageHeader
        title="Create Deal"
        subtitle="Set up the referral details and pricing for this deal."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        noValidate
        className="grid grid-cols-1 items-start gap-8 pt-2 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,28%)] lg:gap-0"
      >
        <div className="min-w-0 space-y-10 lg:pr-8">
          <DealDetailsSection form={form} />
          <PricingConfiguration form={form} />
        </div>

        {/* Part of the page, not a floating card: a hairline on its left on
            lg+, a top rule when stacked. Stretches the full row height so the
            summary inside can stick while the configuration scrolls; it has
            no scroll of its own. */}
        <aside
          aria-label="Deal Summary"
          className="min-w-0 border-t border-border pt-6 lg:self-stretch lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8"
        >
          <DealSummary
            values={values}
            className="lg:sticky lg:top-4"
            footer={createButton("w-full")}
          />
        </aside>
      </form>
    </div>
  );
}
