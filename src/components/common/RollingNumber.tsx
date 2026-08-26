"use client";

import { motion, useReducedMotion } from "framer-motion";

interface RollingDigitProps {
  digit: number;
  delay: number;
}

function RollingDigit({ digit, delay }: RollingDigitProps) {
  const reduceMotion = useReducedMotion();
  const stack = Array.from({ length: digit + 1 }, (_, i) => i);

  return (
    <span
      className="relative inline-block align-baseline"
      style={{ height: "1lh" }}
      aria-hidden="true"
    >
      {/* Invisible reference digit — reserves this box's real width and
       * baseline exactly like normal text (visibility:hidden keeps it in
       * flow, unlike display:none). Everything below is sized in the CSS
       * `lh` unit (the element's actual computed line-height) rather than
       * `em` (font-size): a stacked row set to exactly 1em/leading-none
       * squeezes the glyph into less vertical space than its static
       * siblings get from the inherited line-height, which shifts its
       * rendered baseline up relative to them even when box tops match.
       * `1lh` keeps every row's metrics identical to plain text. The
       * animated strip is absolutely positioned on top and out of flow, so
       * it never affects the parent's own baseline. */}
      <span className="invisible tabular-nums">{digit}</span>
      <span className="absolute inset-0 overflow-hidden">
        <motion.span
          className="flex flex-col"
          initial={reduceMotion ? false : { y: 0 }}
          animate={{ y: `-${digit}lh` }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.5 + digit * 0.03, delay, ease: [0.16, 1, 0.3, 1] }
          }
        >
          {stack.map((d) => (
            <span key={d} className="block text-center tabular-nums" style={{ height: "1lh" }}>
              {d}
            </span>
          ))}
        </motion.span>
      </span>
    </span>
  );
}

interface RollingNumberProps {
  /** Fully formatted display value, e.g. "₹5.07L" or "+12.3% vs last". Only
   * the 0-9 characters animate; everything else (currency symbols, commas,
   * letters, signs) renders statically in place. */
  value: string;
  className?: string;
}

export function RollingNumber({ value, className }: RollingNumberProps) {
  const chars = value.split("");

  return (
    <span className={className} aria-label={value}>
      {chars.map((char, i) => {
        if (/[0-9]/.test(char)) {
          const digitPosition = chars.slice(0, i).filter((c) => /[0-9]/.test(c)).length;
          return <RollingDigit key={i} digit={Number(char)} delay={digitPosition * 0.035} />;
        }
        return (
          <span key={i} aria-hidden="true">
            {char}
          </span>
        );
      })}
    </span>
  );
}
