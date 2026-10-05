import { forwardRef, type SVGProps } from "react";

/**
 * State Bank of India, as a monogram badge in the bank badges' shared frame.
 * Simple Icons carries no SBI mark (see scripts/generate-bank-logos.mjs), and
 * a rough trace of a registered logo is worse than an honest monogram; the
 * bank's name is always printed beside it.
 */
export const SbiLogo = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => (
  <svg
    ref={ref}
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="State Bank of India"
    {...props}
  >
    <rect width="24" height="24" rx="6" fill="#22409A" />
    <circle cx="12" cy="12" r="6" stroke="#FFFFFF" strokeWidth="2" />
    <path d="M12 12V18" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
  </svg>
));
SbiLogo.displayName = "SbiLogo";
