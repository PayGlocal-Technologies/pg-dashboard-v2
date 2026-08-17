import { forwardRef, type SVGProps } from "react";

/**
 * Toptal platform mark for the Platforms tutorial page.
 *
 * PLACEHOLDER ARTWORK — see AmazonLogo for the swap-in note.
 */
export const ToptalLogo = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => (
  <svg
    ref={ref}
    width="1em"
    height="1em"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Toptal"
    {...props}
  >
    <rect width="32" height="32" rx="8" fill="#204ECF" />
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
      T
    </text>
  </svg>
));
ToptalLogo.displayName = "ToptalLogo";
