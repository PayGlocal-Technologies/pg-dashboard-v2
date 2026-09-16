"use client";

import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { AppImage as Image } from "@/components/common/AppImage";
import { cn } from "@/lib/utils";
import { withAlpha } from "@/features/dashboard/create-invoice/helpers";

/**
 * The logo, and the way you get one.
 *
 * Restores Nova's best branding affordance: the placeholder sits where the logo
 * will print, and clicking it opens the upload dialog. The reason v2 dropped it
 * was sound as far as it went — an unclickable dashed box promises a frame the
 * PDF will not contain — but the fix was to remove the box rather than to wire
 * the click. This wires the click, so the box means something again.
 *
 * With no `onUpload` (the read-only case) it renders the logo or nothing at all,
 * which is exactly the old behaviour.
 */
export function LogoSlot({
  url,
  onUpload,
  size = 64,
  shape = "rounded",
  /** Border and icon colour for the empty state. Defaults to the theme's. */
  tint,
  className,
}: {
  url: string;
  onUpload?: () => void;
  size?: number;
  shape?: "rounded" | "circle";
  tint?: string;
  className?: string;
}) {
  const radius = shape === "circle" ? "rounded-full" : "rounded-xl";
  const boxStyle = { width: size, height: size };

  if (url) {
    const image = (
      <Image
        src={url}
        alt="Business logo"
        width={size}
        height={size}
        unoptimized
        className={cn("shrink-0 border border-border object-contain", radius, className)}
        style={boxStyle}
      />
    );

    if (!onUpload) return image;

    return (
      // `self-start` and an explicit box are both load-bearing. This Button is a
      // flex item in several themes, and Bold Sidebar puts it in a *column* —
      // where the default `align-items: stretch` grew the button to the column's
      // full width and its `justify-center` then parked the 40px logo in the
      // middle of the page instead of on the left margin.
      <Button
        type="button"
        variant="ghost"
        aria-label="Replace logo"
        className={cn("h-auto shrink-0 self-start p-0 hover:opacity-80", radius)}
        style={boxStyle}
        onClick={onUpload}
      >
        {image}
      </Button>
    );
  }

  if (!onUpload) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      aria-label="Add a logo"
      className={cn("h-auto shrink-0 self-start border-2 border-dashed p-0", radius, className)}
      style={{
        ...boxStyle,
        borderColor: tint ? withAlpha(tint, 0.4) : undefined,
        color: tint,
      }}
      onClick={onUpload}
    >
      {/* flux's Button puts every child inside one plain <span>, so the column
          has to live on a single child of our own — otherwise the icon and the
          caption flow inline and overspill a 44px slot. */}
      <span className="flex h-full w-full flex-col items-center justify-center gap-1">
        <Icon name="image-plus" className="h-4 w-4" />
        <span className="text-[9px] font-medium leading-none">Add logo</span>
      </span>
    </Button>
  );
}
