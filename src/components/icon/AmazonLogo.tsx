import { forwardRef, type SVGProps } from "react";

/**
 * Amazon platform mark for the Platforms tutorial page.
 *
 * PLACEHOLDER ARTWORK. The official Amazon wordmark is not in the repo yet, so
 * this renders a brand-coloured monogram tile of the same footprint. Swapping
 * in the real asset means replacing the `<rect>`/`<text>` below with the
 * official paths — no call site changes, since every consumer references it as
 * `<Icon name="amazon-logo" />`.
 *
 * em units on width/height so the parent's font-size controls rendered size,
 * matching every other registry entry.
 */
export const AmazonLogo = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      width="1em"
      height="1em"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Amazon"
      {...props}
    >
      <rect width="32" height="32" rx="8" fill="#FF9900" />
      <text
        x="16"
        y="16.5"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontSize="17"
        fontWeight="700"
        fill="#FFFFFF"
      >
        a
      </text>
    </svg>
  )
);
AmazonLogo.displayName = "AmazonLogo";
