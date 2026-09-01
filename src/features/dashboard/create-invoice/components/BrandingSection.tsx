"use client";

import { useState } from "react";
import { AppImage as Image } from "@/components/common/AppImage";
import { Button, Separator, Switch } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { themeFor } from "@/features/dashboard/create-invoice/helpers";
import { InvoiceThemePicker } from "@/features/dashboard/create-invoice/components/InvoiceThemePicker";
import { InvoiceColorPicker } from "@/features/dashboard/create-invoice/components/InvoiceColorPicker";
import type { InvoiceAsset, InvoiceThemePalette } from "@/features/dashboard/create-invoice/hooks";
import type {
  InvoiceTheme,
  ThemeMetadata,
  ThemePaletteOption,
} from "@/features/dashboard/create-invoice/types";

/**
 * Guarantees the value an invoice actually holds is one of the options offered.
 *
 * The palette is the server's and can shrink between releases, so a draft saved
 * against a theme or colour that has since been withdrawn would otherwise render
 * a picker with nothing selected — and the merchant's next click would silently
 * discard a choice they never revisited. Carrying it into the list keeps what is
 * on the document and what is highlighted the same thing.
 */
function withSelected<T extends { name: string }>(options: T[], selected: T): T[] {
  return options.some((option) => option.name === selected.name)
    ? options
    : [...options, selected];
}

/**
 * Advanced branding options.
 *
 * Nova's panel: invoice theme, brand colours, logo and signature. All four are
 * backed end to end — the assets upload to S3, the invoice carries logoEnabled /
 * signatureEnabled, and the theme and its two colours ride along as
 * `themeMetadata` — so nothing here shows the merchant something the generated
 * document will not reproduce.
 *
 * Nova's fifth control, a document language, is deliberately absent: the
 * server's renderer takes no locale, so the picker could only ever have styled a
 * preview of a document that would arrive in English.
 *
 * Note the asymmetry, which is production's and not a bug here: the toggles are
 * per invoice, the images are per merchant. Replacing a logo changes it on every
 * future invoice, which is exactly why the upload goes through a cropper.
 */
export function BrandingSection({
  logoEnabled,
  signatureEnabled,
  branding,
  palette,
  logo,
  signature,
  onChange,
  onBrandingChange,
  onResetColors,
  onOpenUpload,
}: {
  logoEnabled: boolean;
  signatureEnabled: boolean;
  /** The effective theme trio, all three of them enum names. */
  branding: ThemeMetadata;
  /** The server's vocabulary, and the hexes to draw it with on screen. */
  palette: InvoiceThemePalette;
  /** Lifted to the editor so the panel and the document share one upload state. */
  logo: InvoiceAsset;
  signature: InvoiceAsset;
  onChange: (patch: { logoEnabled?: boolean; signatureEnabled?: boolean }) => void;
  /**
   * Separate from `onChange` because branding is not part of the form: it lives
   * beside it as an override on what the invoice already carries.
   */
  onBrandingChange: (patch: Partial<ThemeMetadata>) => void;
  /** Puts the colour pair back to the server's own default. */
  onResetColors: () => void;
  onOpenUpload: (type: "LOGO" | "SIGNATURE") => void;
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
            Logo, signature, theme and colours
          </span>
        </span>
      </Button>

      {expanded && (
        <div className="border-t border-border">
          {/* Logo and signature first. They are what a merchant opens this
              panel for, and the only two they come back to change — a theme and
              a colour pair are set once and then left alone, so putting the
              grids above the uploads buried the frequent job under the rare
              one. Each asset keeps its own bottom border so the four blocks
              still read as one list. */}
          <AssetRow
            label="Logo"
            hint="Shown at the top of the invoice"
            enabled={logoEnabled}
            onEnabledChange={(next) => onChange({ logoEnabled: next })}
            asset={logo}
            onOpen={() => onOpenUpload("LOGO")}
          />
          <AssetRow
            label="Signature"
            hint="Authorised signatory image"
            enabled={signatureEnabled}
            onEnabledChange={(next) => onChange({ signatureEnabled: next })}
            asset={signature}
            onOpen={() => onOpenUpload("SIGNATURE")}
          />

          <div className="border-b border-border p-4">
            <p className="mb-2.5 text-[13px] font-semibold text-foreground">Invoice theme</p>
            <InvoiceThemePicker
              themes={withSelected<InvoiceTheme>(palette.themes, themeFor(branding.theme))}
              theme={branding.theme}
              primaryHex={palette.colorHexFor(branding.color)}
              accentHex={palette.accentHexFor(branding.accent)}
              onChange={(theme) => onBrandingChange({ theme })}
            />
          </div>

          <div className="p-4">
            <p className="mb-2.5 text-[13px] font-semibold text-foreground">Invoice colours</p>
            <InvoiceColorPicker
              color={branding.color}
              accent={branding.accent}
              colors={withSelected<ThemePaletteOption>(palette.colors, {
                name: branding.color,
                hex: palette.colorHexFor(branding.color),
              })}
              accents={withSelected<ThemePaletteOption>(palette.accents, {
                name: branding.accent,
                hex: palette.accentHexFor(branding.accent),
              })}
              onColorChange={(color) => onBrandingChange({ color })}
              onAccentChange={(accent) => onBrandingChange({ accent })}
              onReset={onResetColors}
            />
          </div>
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
                leftIcon={<Icon name="upload" className="h-3.5 w-3.5" />}
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
