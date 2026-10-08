import { AppImage } from "@/components/common/AppImage";

/**
 * The hero picture: pg-dashboard's hosted-page artwork
 * (`public/assets/static-link/static-link-preview.png`), cropped to fill the
 * panel. Decorative: it carries a sample handle, never a stand-in for the
 * merchant's own link, which is in the card beside it.
 */
export function StaticLinkArtwork() {
  return (
    <div
      aria-hidden
      className="relative h-[220px] w-full shrink-0 overflow-hidden rounded-lg sm:w-[288px]"
    >
      <AppImage
        src="/assets/static-link/static-link-preview.png"
        alt=""
        fill
        sizes="(min-width: 640px) 288px, 100vw"
        className="object-cover object-center"
      />
    </div>
  );
}
