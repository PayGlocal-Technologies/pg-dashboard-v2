import { cn } from "@/lib/utils";

/**
 * Shared success-state animation — a single drawn checkmark, used wherever a
 * flow's outcome is "this went through" (eBRC generation, invoice
 * generation, ...) so every one of those confirmations looks the same.
 *
 * A plain animated SVG (stroke-dashoffset draw-in, see globals.css's
 * `success-tick-*` keyframes) rather than a Lottie file: it paints
 * immediately on first render since it's just markup + CSS, with nothing
 * that depends on a third-party library mounting and driving an imperative
 * canvas/SVG render on the client — which is what left this blank in
 * practice (lottie-react's animation only starts once its own effect runs,
 * and its very first frame in the supplied Lottie source is scaled to 0 /
 * fully transparent, so anything that delayed or skipped that effect showed
 * nothing at all).
 */
export function SuccessTick({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-success/10 text-success",
        className ?? "h-20 w-20"
      )}
    >
      <svg viewBox="0 0 52 52" className="h-[60%] w-[60%]" aria-hidden>
        <circle
          cx="26"
          cy="26"
          r="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="success-tick-circle"
        />
        <path
          d="M14 27 l8 8 16 -16"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="success-tick-check"
        />
      </svg>
    </span>
  );
}
