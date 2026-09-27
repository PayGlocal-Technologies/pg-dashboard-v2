import { forwardRef, type SVGProps } from "react";

/** Facebook's round "f" mark, for the "Sign in with Facebook" button. Brand
 *  fills, not currentColor. */
export const FacebookLogo = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => (
  <svg
    ref={ref}
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Facebook"
    {...props}
  >
    <circle cx="12" cy="12" r="12" fill="#1877F2" />
    <path
      fill="#FFFFFF"
      d="M16.67 15.47 17.2 12h-3.33V9.75c0-.95.47-1.87 1.96-1.87h1.51V4.93s-1.37-.23-2.68-.23c-2.74 0-4.53 1.66-4.53 4.66V12H7.08v3.47h3.05V24a12.1 12.1 0 0 0 3.74 0v-8.53h2.8Z"
    />
  </svg>
));
FacebookLogo.displayName = "FacebookLogo";
