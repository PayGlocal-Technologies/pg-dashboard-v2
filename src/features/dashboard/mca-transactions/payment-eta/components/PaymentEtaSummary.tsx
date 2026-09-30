/** The details the estimate is for, as one quiet line under the title. The
 *  way back to change them is the back arrow beside the title. */
export function PaymentEtaSummary({ text }: { text: string }) {
  return <p className="truncate text-[13px] tabular-nums text-muted-foreground">{text}</p>;
}
