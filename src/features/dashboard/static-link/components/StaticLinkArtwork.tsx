/**
 * The hero picture: dusk hills with a link bar floating over them, the link
 * as it appears to a customer.
 *
 * TODO: swap the painted hills for the design's photograph once it is added
 * under public/assets and rendered via AppImage. The gradients stand in so
 * the card keeps its shape meanwhile. Decorative, so hidden from assistive
 * tech; the real link is in the card beside it.
 */
export function StaticLinkArtwork({ url }: { url: string }) {
  return (
    <div
      aria-hidden
      className="relative h-[220px] w-full shrink-0 overflow-hidden rounded-lg sm:w-[288px]"
      style={{
        backgroundImage: [
          // Grass in the foreground, then three ridges fading to the sky.
          "linear-gradient(180deg, transparent 62%, rgba(38, 70, 72, 0.85) 100%)",
          "radial-gradient(90% 40% at 15% 72%, #4d5f9a 0%, transparent 70%)",
          "radial-gradient(80% 38% at 80% 62%, #6c64a8 0%, transparent 70%)",
          "radial-gradient(110% 35% at 45% 45%, #7f86c0 0%, transparent 70%)",
          "radial-gradient(70% 30% at 70% 30%, #9aa3cf 0%, transparent 70%)",
          "linear-gradient(180deg, #52609a 0%, #7580b8 35%, #5a6aa3 70%, #34506a 100%)",
        ].join(", "),
      }}
    >
      <div className="absolute inset-x-9 top-1/2 flex h-6 -translate-y-1/2 items-center justify-between gap-2 rounded-md bg-white pr-1 pl-1.5 shadow-sm">
        <span className="truncate text-[6px] font-semibold text-slate-800">{url}</span>
        <span className="shrink-0 rounded bg-primary px-2 py-1 text-[5px] font-medium text-primary-foreground">
          Copy Link
        </span>
      </div>
    </div>
  );
}
