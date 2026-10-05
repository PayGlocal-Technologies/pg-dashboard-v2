import { forwardRef, type SVGProps } from "react";

/**
 * Kotak Mahindra Bank, as a monogram badge in the bank badges' shared frame.
 * Simple Icons carries no Kotak mark (see scripts/generate-bank-logos.mjs);
 * the bank's name is always printed beside it.
 */
export const KotakLogo = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => (
  <svg
    ref={ref}
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Kotak Mahindra Bank"
    {...props}
  >
    <rect width="24" height="24" rx="6" fill="#ED1C24" />
    <path
      d="M8.5 6.5V17.5M15.5 6.5L9 12L15.5 17.5"
      stroke="#FFFFFF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
));
KotakLogo.displayName = "KotakLogo";
