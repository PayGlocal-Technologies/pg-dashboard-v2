import { forwardRef, type SVGProps } from "react";

/**
 * Circular arrows, marking an invoice that re-issues on a schedule.
 *
 * Ported verbatim from pg-dashboard's public/assets/recurringOutlined.tsx.
 * Lucide's Repeat2 was standing in for this and is a different glyph; this is
 * the one production shows on the invoice list, so the two apps now agree.
 */
export const RecurringOutlined = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 16 16"
      fill="none"
      {...props}
    >
      <path
        d="M3.69482 10.7079C3.88901 11.0316 4.12634 11.3336 4.39604 11.6033C6.38102 13.5883 9.60661 13.5883 11.6024 11.6033C12.4115 10.7942 12.8754 9.76933 13.0264 8.7229"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.97119 7.2775C3.12222 6.22028 3.58611 5.20616 4.39521 4.39706C6.3802 2.41208 9.60579 2.41208 11.6016 4.39706C11.882 4.67755 12.1086 4.97963 12.3028 5.29248"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.48926 13.5881V10.7077H6.36963"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5078 2.41211V5.29248H9.62744"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
);
RecurringOutlined.displayName = "RecurringOutlined";
