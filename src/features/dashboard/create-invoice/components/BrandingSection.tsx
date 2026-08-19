"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button, Switch } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useInvoiceAsset, type InvoiceAsset } from "@/features/dashboard/create-invoice/hooks";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ".png,.jpg,.jpeg";

/**
 * Logo and signature.
 *
 * This is what remains of Nova's "Advanced branding options" panel. Its other
 * three controls — invoice theme (six layouts), primary/accent colours, and
 * invoice language — are not here on purpose: the invoice has no field for any
 * of them and the server-side PDF renderer implements exactly one layout, so
 * every one of those controls would change the on-screen preview while the
 * document the customer receives stayed identical. Shipping them would be a
 * lie the merchant only discovers after sending.
 *
 * Logo and signature survive because they are genuinely backed: the assets
 * upload to S3 and the invoice carries logoEnabled / signatureEnabled.
 *
 * Note the asymmetry, which is production's and not a bug here: the toggles are
 * per invoice, the images are per merchant. Replacing a logo changes it on
 * every future invoice.
 */
export function BrandingSection({
  logoEnabled,
  signatureEnabled,
  onChange,
}: {
  logoEnabled: boolean;
  signatureEnabled: boolean;
  onChange: (patch: { logoEnabled?: boolean; signatureEnabled?: boolean }) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const logo = useInvoiceAsset("LOGO");
  const signature = useInvoiceAsset("SIGNATURE");

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
          <span className="block text-[13px] font-semibold text-foreground">Branding</span>
          <span className="block text-[11px] font-normal text-muted-foreground">
            Logo and authorised signature
          </span>
        </span>
      </Button>

      {expanded && (
        <div className="border-t border-border">
          <AssetRow
            label="Logo"
            hint="Shown at the top of the invoice"
            enabled={logoEnabled}
            onEnabledChange={(next) => onChange({ logoEnabled: next })}
            asset={logo}
          />
          <AssetRow
            label="Signature"
            hint="Authorised signatory image"
            enabled={signatureEnabled}
            onEnabledChange={(next) => onChange({ signatureEnabled: next })}
            asset={signature}
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
}: {
  label: string;
  hint: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  asset: InvoiceAsset;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(`${label} is too large`, { description: "Maximum size is 10MB." });
      return;
    }
    asset.upload(file);
  };

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
          {/* No flux component wraps a file picker, so the native input is used
              and kept hidden behind a Button, which is the interactive element. */}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

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
                onClick={() => inputRef.current?.click()}
              >
                {asset.isUploading ? "Uploading…" : "Replace"}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={asset.isUploading}
              className="h-20 w-full flex-col gap-1 border-dashed"
              onClick={() => inputRef.current?.click()}
            >
              <Icon name="upload" className="h-4 w-4 text-muted-foreground" />
              <span className="text-[13px] font-medium">
                {asset.isUploading ? "Uploading…" : `Upload ${label.toLowerCase()}`}
              </span>
              <span className="text-[11px] font-normal text-muted-foreground">
                .png or .jpg, max 10MB
              </span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
