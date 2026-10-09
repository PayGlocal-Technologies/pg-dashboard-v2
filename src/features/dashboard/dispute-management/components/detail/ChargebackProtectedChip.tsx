"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";

/**
 * Shown beside a fraud dispute's status and stage: PayGlocal's chargeback
 * protection covers its fee. The info icon explains what that means, and that
 * contesting with documents is still worth doing.
 *
 * MOCK: protection is assumed for every fraud dispute; the real eligibility
 * (merchant plan, network, amount) comes from the backend. TODO(integration).
 */
export function ChargebackProtectedChip() {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        {/* The whole chip is the trigger (focusable), so the explanation is
            reachable by keyboard as well as by hovering the info icon. */}
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className="inline-flex h-7 cursor-default items-center gap-1.5 rounded-full border border-emerald-200 bg-linear-to-r from-emerald-50 to-teal-50 pr-2 pl-1 text-[12.5px] font-semibold text-emerald-800 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-teal-500/10 dark:text-emerald-300"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Icon name="shield-check" size={12} strokeWidth={2.5} aria-hidden />
            </span>
            Chargeback protected
            <Icon
              name="info"
              size={13}
              aria-hidden
              className="text-emerald-700/70 dark:text-emerald-300/70"
            />
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-72 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <Icon name="shield-check" size={13} aria-hidden />
            You&apos;re covered on this fraud dispute
          </p>
          <p className="mt-1.5 text-xs leading-relaxed opacity-90">
            PayGlocal bears the chargeback fee for this dispute, so it won&apos;t be charged to you.
          </p>
          <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed opacity-90">
            <Icon name="upload" size={12} aria-hidden className="mt-0.5 shrink-0" />
            We still recommend contesting it and uploading supporting documents (order details,
            proof of delivery, authorisation records) for the best chance of winning.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
