import { forwardRef, type SVGProps } from "react";

/**
 * ICICI Bank, as a compact monogram badge rather than the bank's registered
 * swirl mark — no accurate vector trace of that mark is available here, and
 * a rough approximation of a bank's registered logo is worse than a plain,
 * honest initial. The bank's full name is always printed in text beside
 * this, so the badge only has to be recognisable as "a bank", not carry the
 * identification on its own.
 */
export const IciciLogo = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => (
  <svg
    ref={ref}
    width="1em"
    height="1em"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="ICICI Bank"
    {...props}
  >
    <rect width="20" height="20" rx="5" fill="#B7212B" />
    <path
      d="M10 5C7.23858 5 5 7.23858 5 10C5 12.7614 7.23858 15 10 15C11.3849 15 12.6383 14.4386 13.5459 13.5324"
      stroke="#FFFFFF"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    <circle cx="10" cy="10" r="1.4" fill="#FFFFFF" />
  </svg>
));
IciciLogo.displayName = "IciciLogo";
