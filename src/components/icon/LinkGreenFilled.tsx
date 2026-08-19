import { forwardRef, type SVGProps } from "react";

/**
 * The filled green link badge shown once a transaction has been attached.
 *
 * Ported from pg-dashboard's public/assets/linkGreenCustomFilled.tsx. Unlike
 * the outlined variant this keeps its fixed palette: it is a status medallion
 * whose green is the signal, not a glyph tinted by its surroundings.
 */
export const LinkGreenFilled = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => (
  <svg
    ref={ref}
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 48 48"
    fill="none"
    role="img"
    aria-label="Transaction linked"
    {...props}
  >
    <rect x="0.5" y="0.5" width="47" height="47" rx="23.5" fill="#F6F8FA" />
    <rect x="0.5" y="0.5" width="47" height="47" rx="23.5" stroke="#E6EAED" />
    <circle cx="24" cy="24" r="20" fill="#29C189" />
    <path
      d="M19.5906 26.242L19.5906 29.3257C19.5906 30.4773 20.043 31.592 20.8725 32.4094C21.702 33.2268 22.8142 33.6912 24.0019 33.6726C25.1896 33.6912 26.3019 33.2267 27.1313 32.4094C27.9795 31.5735 28.432 30.496 28.4321 29.3443L28.4321 26.2606M28.4697 22.3594L28.4697 19.2757C28.4697 18.1241 28.0174 17.0094 27.1879 16.192C26.3584 15.3746 25.2462 14.9102 24.0585 14.9288C22.8897 14.9288 21.7775 15.3932 20.948 16.2106C20.1185 17.028 19.6472 18.124 19.6472 19.2757V22.3594M23.9889 28.9357L23.9889 19.6846"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
));
LinkGreenFilled.displayName = "LinkGreenFilled";
