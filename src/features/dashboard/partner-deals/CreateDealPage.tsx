"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@tanstack/react-form";
import { toast } from "sonner";
import { Button, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useDealForm } from "@/features/dashboard/partner-deals/form";
import { DealDetailsSection } from "@/features/dashboard/partner-deals/components/DealDetailsSection";
import { PricingConfiguration } from "@/features/dashboard/partner-deals/components/PricingConfiguration";
import { DealSummary } from "@/features/dashboard/partner-deals/components/DealSummary";
import { DEALS_PATH } from "@/features/dashboard/partner-deals/constants";

/**
 * DESIGN MOCK: Create Deal as its own page (/partner-deals-dashboard/create)
 * instead of a right-side drawer. Configuration on the left, a sticky Deal
 * Summary on the right that collapses under it below lg.
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
      toast.error("Some fields need attention", {
        description: "Fix the highlighted fields to create this deal.",
      });
    },
  });

  const values = useStore(form.store, (s) => s.values);
  const isSubmitting = useStore(form.store, (s) => s.isSubmitting);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 page-enter">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        leftIcon={<Icon name="chevron-left" className="h-3.5 w-3.5" />}
        onClick={() => router.push(DEALS_PATH)}
      >
        Back
      </Button>

      <PageHeader
        title="Create Deal"
        subtitle="Add deal details and configure product pricing for this referral link"
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        noValidate
        className="grid grid-cols-1 items-start gap-8 pt-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]"
      >
        <div className="min-w-0 space-y-10">
          <DealDetailsSection form={form} />
          <PricingConfiguration form={form} />

          <div className="flex items-center justify-end gap-2 border-t border-border pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(DEALS_PATH)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Create Deal
            </Button>
          </div>
        </div>

        {/* Stretches to the full row height so the summary card inside has
            room to stick while the configuration scrolls past it. */}
        <aside className="min-w-0 lg:self-stretch">
          <DealSummary values={values} />
        </aside>
      </form>
    </div>
  );
}
