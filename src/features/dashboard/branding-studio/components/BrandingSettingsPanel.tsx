"use client";

import type { ReactNode } from "react";
import {
  Card,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@/components/ui";
import { PillToggle } from "@/components/common/PillToggle";
import { ColourField } from "@/features/dashboard/branding-studio/components/ColourField";
import { LogoField } from "@/features/dashboard/branding-studio/components/LogoField";
import {
  BUTTON_LABEL_OPTIONS,
  CORNER_OPTIONS,
  FONT_OPTIONS,
} from "@/features/dashboard/branding-studio/constants";
import type {
  BrandFont,
  BrandingSettings,
  PayButtonLabel,
} from "@/features/dashboard/branding-studio/types";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 py-5 first:pt-0 last:pb-0">
      <div>
        <h3 className="text-[13px] font-medium text-foreground">{title}</h3>
        <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

/** The Branding card: every setting the previews follow. */
export function BrandingSettingsPanel({
  value,
  onChange,
}: {
  value: BrandingSettings;
  onChange: (patch: Partial<BrandingSettings>) => void;
}) {
  const sections = [
    <Section key="logo" title="Logo" description="Wide image for the checkout header.">
      <LogoField value={value.logoUrl} onChange={(logoUrl) => onChange({ logoUrl })} />
    </Section>,
    <Section
      key="colours"
      title="Colours"
      description="Brand fills the bar; accent is buttons and highlights."
    >
      <div className="space-y-2">
        <ColourField
          label="Brand"
          value={value.brandColor}
          onChange={(brandColor) => onChange({ brandColor })}
        />
        <ColourField
          label="Accent"
          value={value.accentColor}
          onChange={(accentColor) => onChange({ accentColor })}
        />
      </div>
    </Section>,
    <Section key="corners" title="Corners" description="Rounding for cards and fields in checkout.">
      <PillToggle
        options={CORNER_OPTIONS}
        value={value.corners}
        onChange={(corners) => onChange({ corners })}
        ariaLabel="Corners"
        className="w-fit"
      />
    </Section>,
    <Section key="font" title="Font family" description="Used across checkout, links and pages.">
      <Select value={value.font} onValueChange={(font) => onChange({ font: font as BrandFont })}>
        <SelectTrigger className="w-[250px] text-[13.5px]" aria-label="Font family">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Section>,
    <Section
      key="label"
      title="Button label"
      description='Word shown on the primary pay button. Selecting "Pay" shows just "Pay"; every other option keeps the amount.'
    >
      <Select
        value={value.buttonLabel}
        onValueChange={(buttonLabel) => onChange({ buttonLabel: buttonLabel as PayButtonLabel })}
      >
        <SelectTrigger className="w-[250px] text-[13.5px]" aria-label="Button label">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BUTTON_LABEL_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Section>,
  ];

  return (
    <Card className="gap-0 p-0">
      <div className="border-b border-border px-3 py-3.5">
        <h2 className="text-[14.5px] font-semibold text-foreground">Branding</h2>
      </div>
      <div className="px-3 py-5">
        {sections.flatMap((section, i) =>
          i === 0 ? [section] : [<Separator key={`sep-${i}`} />, section]
        )}
      </div>
    </Card>
  );
}
