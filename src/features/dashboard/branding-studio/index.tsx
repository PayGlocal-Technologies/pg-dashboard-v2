"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { BrandingSettingsPanel } from "@/features/dashboard/branding-studio/components/BrandingSettingsPanel";
import { PreviewPane } from "@/features/dashboard/branding-studio/components/PreviewPane";
import {
  BRANDING_SAVED_MESSAGE,
  DEFAULT_BRANDING,
} from "@/features/dashboard/branding-studio/constants";
import { isHexColor, sameBranding } from "@/features/dashboard/branding-studio/helpers";
import type { BrandingSettings } from "@/features/dashboard/branding-studio/types";

/**
 * Branding Studio, at /branding-studio: one set of brand settings (logo,
 * colours, corners, font, pay button label) for every checkout, payment page
 * and email, edited beside a live preview of each. Full screen, in the
 * (invoice-editor) shell, like Create payment button.
 *
 * TODO(api): there is no branding endpoint yet (pg-dashboard has none), so
 * settings start from DEFAULT_BRANDING and Save only moves the saved
 * snapshot; the save request, and the logo upload, go in `save`.
 */
export function BrandingStudioFeature() {
  const router = useRouter();
  const [saved, setSaved] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [draft, setDraft] = useState<BrandingSettings>(DEFAULT_BRANDING);

  const isDirty = !sameBranding(draft, saved);
  const isValid = isHexColor(draft.brandColor) && isHexColor(draft.accentColor);

  const save = () => {
    setSaved(draft);
    toast.success(BRANDING_SAVED_MESSAGE);
  };

  const close = () => {
    if (window.history.length > 1) router.back();
    else router.push("/pa-dashboard");
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Close Branding Studio"
          onClick={close}
          className="h-8 min-h-8 w-8 px-0 text-muted-foreground"
        >
          <Icon name="x" size={16} />
        </Button>
        <h1 className="text-[16px] font-semibold text-foreground">Branding Studio</h1>
        <span
          aria-live="polite"
          className="flex items-center gap-1 text-[11.5px] text-muted-foreground"
        >
          {isDirty ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Unsaved changes
            </>
          ) : (
            <>
              <Icon name="refresh" size={11} />
              All changes saved
            </>
          )}
        </span>
        <Button
          variant="primary"
          size="sm"
          onClick={save}
          disabled={!isDirty || !isValid}
          leftIcon={<Icon name="save" className="h-3.5 w-3.5" />}
          className="ml-auto text-[12.5px]"
        >
          Save branding
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,39fr)_minmax(0,61fr)]">
        <div className="min-h-0 overflow-y-auto p-5">
          <BrandingSettingsPanel
            value={draft}
            onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          />
        </div>
        <PreviewPane settings={draft} />
      </div>
    </div>
  );
}
