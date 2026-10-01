"use client";

import { useState } from "react";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import { CheckoutPreview } from "@/features/dashboard/branding-studio/components/preview/CheckoutPreview";
import { EmailPreview } from "@/features/dashboard/branding-studio/components/preview/EmailPreview";
import { PaymentPagePreview } from "@/features/dashboard/branding-studio/components/preview/PaymentPagePreview";
import { PREVIEW_SURFACES } from "@/features/dashboard/branding-studio/constants";
import { previewThemeStyle } from "@/features/dashboard/branding-studio/helpers";
import type {
  BrandingSettings,
  PreviewDevice,
  PreviewSurface,
} from "@/features/dashboard/branding-studio/types";
import { cn } from "@/lib/utils";

const DEVICES: { value: PreviewDevice; icon: "smartphone" | "monitor"; label: string }[] = [
  { value: "MOBILE", icon: "smartphone", label: "Phone preview" },
  { value: "DESKTOP", icon: "monitor", label: "Desktop preview" },
];

/**
 * The right half: which surface to preview, phone or desktop, and the surface
 * itself on a dotted canvas. The settings reach every preview as CSS
 * variables on one wrapper (previewThemeStyle), so they all update together.
 */
export function PreviewPane({ settings }: { settings: BrandingSettings }) {
  const [surface, setSurface] = useState<PreviewSurface>("CHECKOUT");
  const [device, setDevice] = useState<PreviewDevice>("DESKTOP");

  return (
    <div className="flex min-h-0 flex-col bg-muted/40">
      <div className="shrink-0 border-b border-border bg-card px-5">
        <UnderlineTabs
          tabs={PREVIEW_SURFACES}
          value={surface}
          onValueChange={(value) => setSurface(value as PreviewSurface)}
        />
      </div>

      <div
        className="relative min-h-0 flex-1 overflow-auto px-5 pt-5 pb-10"
        style={{
          backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-foreground">Preview</h2>
          <div
            role="group"
            aria-label="Preview size"
            className="flex gap-0.5 rounded-lg border border-border bg-card p-0.5"
          >
            {DEVICES.map((option) => {
              const active = option.value === device;
              return (
                <Tooltip key={option.value}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={option.label}
                      aria-pressed={active}
                      onClick={() => setDevice(option.value)}
                      className={cn(
                        "h-7 min-h-7 w-7 px-0",
                        active ? "bg-muted text-foreground" : "text-muted-foreground"
                      )}
                    >
                      <Icon name={option.icon} size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{option.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* A picture of the merchant's pages, not controls on this one: no
            element inside is interactive, so it takes no clicks. It still
            takes the wheel, so the phone screen scrolls like a phone. */}
        <div
          role="img"
          aria-label={`${PREVIEW_SURFACES.find((s) => s.value === surface)?.label} preview`}
          className="mt-6 flex justify-center"
          style={previewThemeStyle(settings)}
        >
          <div aria-hidden className="select-none">
            {surface === "CHECKOUT" && <CheckoutPreview settings={settings} device={device} />}
            {surface === "PAYMENT_PAGE" && (
              <PaymentPagePreview settings={settings} device={device} />
            )}
            {surface === "EMAIL" && <EmailPreview device={device} />}
          </div>
        </div>
      </div>
    </div>
  );
}
