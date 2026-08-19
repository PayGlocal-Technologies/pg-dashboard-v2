import { forwardRef, type SVGProps } from "react";

/**
 * The chain-link mark used on linked-transaction affordances.
 *
 * Ported from pg-dashboard's public/assets/linkCustomOutlined.tsx. Its stroke
 * was hard-coded to #0061E3 there; here it is currentColor so the glyph follows
 * whatever text colour it sits in and survives dark mode, which a fixed brand
 * blue would not.
 */
export const LinkCustomOutlined = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 29 29"
      fill="none"
      {...props}
    >
      <path
        d="M11.8999 9.73182L8.81624 9.73181C7.66456 9.73181 6.54991 10.1842 5.73251 11.0137C4.91511 11.8432 4.45071 12.9554 4.46934 14.1431C4.45066 15.3308 4.91524 16.4431 5.73251 17.2725C6.56842 18.1208 7.64587 18.5732 8.7976 18.5733L11.8813 18.5733M15.7825 18.6109L18.8662 18.6109C20.0178 18.6109 21.1325 18.1586 21.9499 17.3291C22.7673 16.4996 23.2317 15.3874 23.2131 14.1997C23.2131 13.0309 22.7486 11.9187 21.9313 11.0892C21.1139 10.2597 20.0179 9.78842 18.8662 9.7884L15.7825 9.78841M9.2062 14.1301L18.4573 14.1301"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
);
LinkCustomOutlined.displayName = "LinkCustomOutlined";
