import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The page-scoped decorative background for the MCA Dashboard
 * (/mca-dashboard, the merchant's actual post-login landing page) only —
 * see `.mca-dashboard-aurora` / `.mca-dashboard-aurora-layer` in globals.css
 * for the sweep's geometry, colours and the reasoning behind both. Nothing
 * else in the app imports this component, which is what keeps the effect
 * from leaking onto any other route.
 *
 * The colour is entirely CSS; the only thing this file draws is the grain
 * over it. `feTurbulence` is the one way to get film grain without shipping
 * a noise bitmap — it synthesises the noise at paint time, so there is no
 * asset to load, nothing to go blurry at high DPI, and it costs no bytes.
 * It renders once and never animates.
 *
 * The layer is a fixed-height band pinned to the top rather than the full
 * page: the sweep belongs just under the header, and a page-height layer
 * also meant the gradients' percentage centres resolved against whatever a
 * given page's content happened to total, moving the whole effect between a
 * short page and a long one. Its gradients are sized to fade out well
 * before the band's own bottom edge, so nothing ends in a cut line.
 *
 * Everything else here is structurally identical to
 * `InternationalAccountsAurora`:
 *
 * - Outermost element this page returns, not nested inside the usual
 *   `mx-auto max-w-[1400px]` wrapper. That wrapper (and the shared dashboard
 *   layout's own `p-4 md:p-6`) moved to the inner content div below,
 *   cancelled here via `-m-4 md:-m-6` and re-applied inside — so the fill
 *   spans the entire scrollable area rather than sitting inset within that
 *   padding (the "box, not blended" bug the International Accounts version
 *   hit first).
 * - `isolation: isolate` is cheap insurance; every overlay this page can
 *   open still portals to `document.body`.
 * - `min-h-[calc(100dvh-57px)]` (57px = the fixed header height) rather than
 *   a percentage, since no ancestor here has a defined height.
 */
export function McaDashboardAurora({
  children,
  contentClassName,
}: {
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="mca-dashboard-aurora relative isolate -m-4 min-h-[calc(100dvh-57px)] bg-(--aurora-base) md:-m-6">
      <div
        aria-hidden="true"
        className="mca-dashboard-aurora-layer pointer-events-none absolute inset-x-0 top-0 z-0 h-150 overflow-hidden"
      >
        {/* Grain, over the CSS sweep beneath it. `baseFrequency` this high
            gives noise at roughly per-pixel scale — the fine film grain the
            reference has, rather than visible clouds — and `numOctaves={1}`
            keeps it to a single, cheap pass. The <feColorMatrix> drains the
            saturation out of the turbulence, which is colourful by default
            and would otherwise speckle the page with stray hues instead of
            the neutral grain wanted here.

            The mask is what stops the band from ending in a hard line. The
            colour layers fade out on their own (their radii are sized to),
            but noise is uniform to its last pixel and would otherwise cut
            dead at 600px against clean background. Both spellings of the
            property: unprefixed `mask-image` is only supported from Safari
            15.4. */}
        <svg
          className="h-full w-full"
          style={{
            opacity: "var(--grain-opacity)",
            maskImage: "linear-gradient(to bottom, black 0%, black 45%, transparent 88%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 45%, transparent 88%)",
          }}
        >
          <filter id="mca-dashboard-grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves={1}
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#mca-dashboard-grain)" />
        </svg>
      </div>
      <div
        className={cn(
          "relative z-10 mx-auto max-w-[1400px] p-4 page-enter md:p-6",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
