import { forwardRef, type SVGProps } from "react";

/**
 * HDFC Bank, as a compact monogram badge — see IciciLogo for why this is an
 * initial mark rather than a traced copy of the bank's registered logo.
 */
export const HdfcLogo = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => (
  <svg
    ref={ref}
    width="1em"
    height="1em"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="HDFC Bank"
    {...props}
  >
    <rect width="20" height="20" rx="5" fill="#004C8F" />
    <rect x="4.5" y="8.5" width="11" height="3" fill="#ED232A" />
    <path d="M6 5.5V14.5M14 5.5V14.5" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
));
HdfcLogo.displayName = "HdfcLogo";
