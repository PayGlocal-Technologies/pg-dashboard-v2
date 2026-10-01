"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { AppImage } from "@/components/common/AppImage";
import { LOGO_ACCEPT, LOGO_MAX_BYTES } from "@/features/dashboard/branding-studio/constants";

/**
 * The checkout logo: a dashed slot that shows the picked image, Upload logo,
 * and Remove once there is one. PNG or JPG up to 5 MB.
 *
 * TODO(api): a picked file stays a local object URL until saving uploads it.
 */
export function LogoField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Every object URL this field made. Draft and saved settings can both point
  // at one, so none is freed until the studio closes.
  const createdUrls = useRef<string[]>([]);
  useEffect(() => {
    const urls = createdUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast.error("Upload a PNG or JPG image");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      toast.error("That image is over 5 MB. Pick a smaller one.");
      return;
    }
    const url = URL.createObjectURL(file);
    createdUrls.current.push(url);
    onChange(url);
  };

  return (
    <div className="flex items-start gap-2.5">
      <span className="flex h-[60px] w-[140px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/20">
        {value ? (
          <AppImage
            src={value}
            alt="Logo preview"
            width={140}
            height={60}
            unoptimized
            className="h-full w-full object-contain p-1.5"
          />
        ) : (
          <Icon name="image-plus" size={20} className="text-muted-foreground" />
        )}
      </span>
      <div className="space-y-1.5">
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            className="h-8 min-h-8 text-[12px]"
          >
            {value ? "Replace logo" : "Upload logo"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
              className="h-8 min-h-8 text-[12px] text-muted-foreground"
            >
              Remove
            </Button>
          )}
        </div>
        <p className="text-[11.5px] text-muted-foreground">PNG or JPG. Max 5 MB.</p>
      </div>
      {/* Hidden native picker, opened by Upload logo: no flux file input
          exists (PersonalDetailsFeature's photo upload does the same). */}
      <input ref={inputRef} type="file" accept={LOGO_ACCEPT} className="hidden" onChange={onPick} />
    </div>
  );
}
