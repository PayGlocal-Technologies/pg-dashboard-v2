"use client";

import { Button, Card, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import {
  PREVIEW_DEMO_PRODUCT,
  PREVIEW_FALLBACK_DOMAIN,
} from "@/features/dashboard/payment-button/constants";
import { cn } from "@/lib/utils";
import {
  buttonAppearanceStyle,
  displayDomain,
  formatButtonAmount,
} from "@/features/dashboard/payment-button/helpers";
import type { PaymentButtonFormValues } from "@/features/dashboard/payment-button/types";

/**
 * A mock product page on the merchant's own site, with the button as it will
 * render there. Everything but the button is illustrative (the product is a
 * labelled demo); the button's label and the amount line follow the form live.
 */
export function CheckoutPreview({
  values,
  website,
}: {
  values: PaymentButtonFormValues;
  website: string;
}) {
  const domain = displayDomain(website) || PREVIEW_FALLBACK_DOMAIN;
  const isFixed = values.amountType === "FIXED";
  const amountLabel = formatButtonAmount(values.amount, values.currency);
  const button = buttonAppearanceStyle(values.appearance);

  return (
    <div
      // The dotted canvas the page sits on. A CSS pattern, not an asset, so it
      // follows the theme's border colour in light and dark.
      className="flex justify-center rounded-xl border border-border bg-card px-4 py-8 sm:px-10"
      style={{
        backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
    >
      <Card className="w-full max-w-[36rem] gap-0 overflow-hidden p-0">
        {/* The site's address bar. */}
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground uppercase">
            {domain.charAt(0)}
          </span>
          <span className="truncate text-[14px] font-semibold text-foreground">{domain}</span>
        </div>

        <div className="flex flex-col gap-4 p-6">
          {/* Product image slot. TODO: swap for the design's product photo
              once it is added under public/assets and rendered via AppImage. */}
          <div className="flex h-52 items-center justify-center rounded-xl bg-muted">
            <Icon name="image" className="h-10 w-10 text-muted-foreground/60" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[18px] font-semibold text-foreground">
              {PREVIEW_DEMO_PRODUCT.name}
            </h3>
            <StatusBadge variant="warning" label="DEMO PRODUCT" size="sm" />
          </div>

          <div className="space-y-2 text-[13.5px] leading-relaxed text-muted-foreground">
            <p>{PREVIEW_DEMO_PRODUCT.description}</p>
            <p>
              {isFixed
                ? `You'll pay ${amountLabel === "—" ? "the set amount" : `${amountLabel} ${values.currency}`}.`
                : "You'll be able to enter the amount to pay on the next page."}
            </p>
          </div>

          {/* The button itself, drawn with the Customisation panel's theme,
              colour, radius and size (inline styles override flux's primary
              fill). Out of the tab order: it is a picture of the merchant's
              button, not a control on this page. */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="primary"
              tabIndex={-1}
              aria-hidden
              style={button.style}
              className={cn("pointer-events-none min-h-0 w-full font-semibold", button.className)}
            >
              {values.label.trim() || "Pay Now"}
            </Button>
            {/* TODO: PayGlocal wordmark once its SVG is in the icon registry. */}
            <p className="text-center text-[11.5px] text-muted-foreground">
              Secured by <span className="font-semibold text-primary">PayGlocal</span>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
