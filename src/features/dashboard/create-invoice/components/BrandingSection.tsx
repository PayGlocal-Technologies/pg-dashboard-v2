"use client";

import { useState } from "react";
import { AppImage as Image } from "@/components/common/AppImage";
import { Button, Separator, Switch } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { InvoiceBrandingStylePicker } from "@/features/dashboard/create-invoice/components/InvoiceBrandingStylePicker";
import { InvoiceColorPicker } from "@/features/dashboard/create-invoice/components/InvoiceColorPicker";
import { LanguageSelect } from "@/features/dashboard/create-invoice/components/LanguageSelect";
import type { InvoiceAsset } from "@/features/dashboard/create-invoice/hooks";

/**
 * Advanced branding options.
 *
 * Restores the whole of Nova's panel: invoice theme, brand colours, document
 * language, logo and signature. Two of those five are backed end to end today —
 * the assets upload to S3 and the invoice carries logoEnabled / signatureEnabled
 * — and three drive the preview while the renderer catches up. That distinction
 * is stated where the merchant makes the choice (the theme grid badges which
 * layout the server produces) rather than left for them to discover after
 * sending. See the branding block in types.ts for the wiring that remains.
 *
 * Note the asymmetry, which is production's and not a bug here: the toggles are
 * per invoice, the images are per merchant. Replacing a logo changes it on every
 * future invoice, which is exactly why the upload goes through a cropper.
 */
export function BrandingSection({
  logoEnabled,
  signatureEnabled,
  brandingStyleId,
  primaryColor,
  accentColor,
  language,
  logo,
  signature,
  onChange,
  onStyleChange,
  onResetColors,
  onOpenCropper,
}: {
  logoEnabled: boolean;
  signatureEnabled: boolean;
  brandingStyleId: string;
  primaryColor: string;
  accentColor: string;
  language: string;
  /** Lifted to the editor so the panel and the document share one upload state. */
  logo: InvoiceAsset;
  signature: InvoiceAsset;
  onChange: (patch: {
    logoEnabled?: boolean;
    signatureEnabled?: boolean;
    primaryColor?: string;
    accentColor?: string;
    language?: string;
  }) => void;
  /** Separate from onChange: picking a theme also resets its two colours. */
  onStyleChange: (brandingStyleId: string) => void;
  onResetColors: () => void;
  onOpenCropper: (type: "LOGO" | "SIGNATURE") => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <Button
        type="button"
        variant="ghost"
        className="h-auto w-full justify-between rounded-none px-4 py-3 text-left"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        rightIcon={
          <Icon
            name="chevron-down"
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
            aria-hidden
          />
        }
      >
        <span className="block">
          <span className="block text-[13px] font-semibold text-foreground">
            Advanced branding options
          </span>
          <span className="block text-[11px] font-normal text-muted-foreground">
            Invoice theme, colours, language and signature
          </span>
        </span>
      </Button>

      {expanded && (
        <div className="border-t border-border">
          <div className="border-b border-border p-4">
            <p className="mb-2.5 text-[13px] font-semibold text-foreground">Invoice theme</p>
            <InvoiceBrandingStylePicker
              brandingStyleId={brandingStyleId}
              primaryColor={primaryColor}
              accentColor={accentColor}
              onChange={onStyleChange}
            />
          </div>

          <div className="border-b border-border p-4">
            <p className="mb-2.5 text-[13px] font-semibold text-foreground">Invoice colours</p>
            <InvoiceColorPicker
              primaryColor={primaryColor}
              accentColor={accentColor}
              onPrimaryColorChange={(primary) => onChange({ primaryColor: primary })}
              onAccentColorChange={(accent) => onChange({ accentColor: accent })}
              onReset={onResetColors}
            />
          </div>

          <div className="border-b border-border p-4">
            <p className="mb-1 text-[13px] font-semibold text-foreground">Invoice language</p>
            <p className="mb-2.5 text-[11px] text-muted-foreground">
              Changes the invoice&apos;s own labels. Your item names, memo and notes are never
              translated.
            </p>
            <LanguageSelect value={language} onChange={(next) => onChange({ language: next })} />
          </div>

          <AssetRow
            label="Logo"
            hint="Shown at the top of the invoice"
            enabled={logoEnabled}
            onEnabledChange={(next) => onChange({ logoEnabled: next })}
            asset={logo}
            onOpen={() => onOpenCropper("LOGO")}
          />
          <AssetRow
            label="Signature"
            hint="Authorised signatory image"
            enabled={signatureEnabled}
            onEnabledChange={(next) => onChange({ signatureEnabled: next })}
            asset={signature}
            onOpen={() => onOpenCropper("SIGNATURE")}
          />
        </div>
      )}
    </div>
  );
}

function AssetRow({
  label,
  hint,
  enabled,
  onEnabledChange,
  asset,
  onOpen,
}: {
  label: string;
  hint: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  asset: InvoiceAsset;
  onOpen: () => void;
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-[13px] font-semibold text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onEnabledChange}
          aria-label={`Show ${label.toLowerCase()} on the invoice`}
        />
      </div>

      {enabled && (
        <div className="px-4 pb-3">
          {asset.url ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
              <Image
                src={asset.url}
                alt={label}
                width={64}
                height={64}
                unoptimized
                className="h-16 w-16 object-contain"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={asset.isUploading}
                leftIcon={<Icon name="crop" className="h-3.5 w-3.5" />}
                onClick={onOpen}
              >
                {asset.isUploading ? "Uploading…" : "Replace"}
              </Button>
              <Separator orientation="vertical" className="h-8" />
              <p className="text-[11px] text-muted-foreground">
                Used on every invoice you raise from now on.
              </p>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={asset.isUploading}
              className="h-20 w-full border-dashed"
              onClick={onOpen}
            >
              {/* The column lives on one child, not on the Button: flux wraps
                  every child in a single plain <span>, so `flex-col` set on the
                  button itself has nothing to lay out. This was already the
                  shape here before, and already had this bug. */}
              <span className="flex flex-col items-center gap-1">
                <Icon name="upload" className="h-4 w-4 text-muted-foreground" />
                <span className="text-[13px] font-medium">
                  {asset.isUploading ? "Uploading…" : `Upload ${label.toLowerCase()}`}
                </span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  .png or .jpg, max 10MB
                </span>
              </span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
