"use client";

import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { AppImage } from "@/components/common/AppImage";

/**
 * What the Amazon platform shows a merchant who has no Amazon payout accounts
 * yet: the accounts are issued on request, so this is the request.
 *
 * A banner in the slot the account details and the connect steps occupy
 * (neither can say anything until an account exists): the ask on the left,
 * the Amazon artwork on the right, on a flat #F2F2F2 fill. "Activate account"
 * runs the same provisioning request pg-dashboard's "Get Amazon Account" did.
 * Production used to drop Amazon out of the platform list entirely in this
 * state, which left a merchant who *wanted* an Amazon account with nothing to
 * click; the row now stays and carries this banner instead.
 */
export function AmazonProvisionCard({
  onProvision,
  isProvisioning,
}: {
  onProvision: () => void;
  isProvisioning: boolean;
}) {
  return (
    <div>
      {/* Same caption as the platform column's "Select platform", so the two
          columns' cards start at the same height. */}
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Account details
      </div>

      {/* 260px tall on sm+: the height of a loaded Account details card, so
          the page doesn't jump once an account exists. dark: a muted fill in
          place of #F2F2F2, which would glare on the dark theme. */}
      <div className="mt-2 flex flex-col-reverse overflow-hidden rounded-xl border border-border bg-[#F2F2F2] sm:h-65 sm:flex-row dark:bg-muted">
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-7 sm:py-6">
          <h2 className="text-xl font-bold leading-snug tracking-tight text-foreground">
            Create your Amazon account
          </h2>
          <p className="max-w-sm text-[14px] leading-relaxed text-muted-foreground">
            Don&apos;t have an Amazon seller account? We&apos;ll create one for you so you can start
            receiving payments.
          </p>
          <Button
            type="button"
            variant="primary"
            rightIcon={<Icon name="arrow-right" className="h-4 w-4" />}
            isLoading={isProvisioning}
            onClick={onProvision}
            className="mt-3 w-fit"
          >
            Activate account
          </Button>
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
            <Icon name="zap" size={14} className="text-primary" aria-hidden />
            Instant activation
          </p>
        </div>

        {/* The artwork's own shape (2368 x 1296) at the banner's height, so it
            shows whole. scale-[1.02] trims its rounded corners so it runs
            flush to the banner's edges. */}
        <div className="relative h-44 shrink-0 overflow-hidden sm:aspect-2368/1296 sm:h-full">
          <AppImage
            src="/assets/amazon banner.png"
            alt=""
            fill
            sizes="(min-width: 640px) 30rem, 100vw"
            className="scale-[1.02] object-cover object-center"
          />
        </div>
      </div>
    </div>
  );
}
