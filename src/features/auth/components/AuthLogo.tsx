import { AppImage } from "@/components/common/AppImage";
import { cn } from "@/lib/utils";

/**
 * PayGlocal wordmark for the auth screens. A raster file (no SVG source has
 * been supplied yet), so it can't be an icon-registry entry; AppImage keeps
 * it base-path safe, same as the sidebar's logo.
 */
export function AuthLogo({ className }: { className?: string }) {
  return (
    <AppImage
      src="/assets/logopg.png"
      alt="PayGlocal"
      width={372}
      height={104}
      priority
      className={cn("h-9 w-auto", className)}
    />
  );
}
