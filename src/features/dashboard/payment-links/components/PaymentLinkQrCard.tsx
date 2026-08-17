"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Button, Card } from "@/components/ui";
import { Icon } from "@/components/icon";

const QR_PIXEL_SIZE = 168;

interface PaymentLinkQrCardProps {
  url: string;
  onCopy: () => void;
  className?: string;
}

export function PaymentLinkQrCard({ url, onCopy, className }: PaymentLinkQrCardProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    // PaymentLinkQrCard is remounted fresh per row (the modal unmounts
    // entirely between rows — see PaymentLinkDetailsModal), so `dataUrl`
    // already starts `null` for a new `url`; no synchronous reset needed here
    // (setState only belongs inside the async callback, not the effect body).
    let cancelled = false;
    QRCode.toDataURL(url, { width: QR_PIXEL_SIZE, margin: 1 }).then((result) => {
      if (!cancelled) setDataUrl(result);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  function handleDownload() {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "payment-link-qr.png";
    link.click();
  }

  return (
    <Card className={className}>
      <div className="flex h-[168px] w-[168px] items-center justify-center rounded-lg border border-border bg-muted/30">
        {dataUrl ? (
          <Image
            src={dataUrl}
            alt="Payment link QR code"
            width={QR_PIXEL_SIZE}
            height={QR_PIXEL_SIZE}
            unoptimized
            className="h-full w-full rounded-lg"
          />
        ) : (
          <Icon name="loader" className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCopy} className="whitespace-nowrap">
          Copy to Clipboard
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={!dataUrl}
          className="whitespace-nowrap"
        >
          Download Image
        </Button>
      </div>
    </Card>
  );
}
