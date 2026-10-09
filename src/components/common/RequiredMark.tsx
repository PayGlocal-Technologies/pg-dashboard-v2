import { cn } from "@/lib/utils";

/**
 * Red asterisk marking a required field's label, so required-ness reads the
 * same across the product.
 *
 * `placement="after"` is for a mark that follows the label text inside a flux
 * FieldLabel: the `-ml-1.5` cancels most of FieldLabel's own `gap-2` between
 * its children, so the mark sits snug against the text rather than a full 8px
 * away. A mark before the label text needs no offset.
 */
export function RequiredMark({ placement = "before" }: { placement?: "before" | "after" }) {
  return (
    <span aria-hidden className={cn("text-destructive", placement === "after" && "-ml-1.5")}>
      *
    </span>
  );
}
