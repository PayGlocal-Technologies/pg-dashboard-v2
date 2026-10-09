import { AppImage } from "@/components/common/AppImage";

/**
 * The hero picture: the same artwork as the first-visit intro
 * (`public/assets/static-link/static-link-popup.png`), cropped to fill the
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
        src="/assets/static-link/static-link-popup.png"
        alt=""
        fill
        sizes="(min-width: 640px) 288px, 100vw"
        className="object-cover object-center"
      />
    </div>
  );
}
