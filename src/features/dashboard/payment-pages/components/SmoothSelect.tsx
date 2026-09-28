"use client";

import { useRef, useState } from "react";
import { Select } from "@/components/ui";

type SelectProps = React.ComponentProps<typeof Select>;

/**
 * Controlled wrapper around flux Select that fixes the "click trigger to close,
 * it flickers back open" bug. Radix fires two onOpenChange events on that click
 * (dismiss-outside → false, then the trigger's own toggle → true), which
 * reopens the menu. We drive `open` from state and, right after a close, hold a
 * short lock that swallows the stray reopen. Use this instead of the raw Select
 * for every dropdown so the behaviour is consistent everywhere.
 */
export function SmoothSelect({ children, ...props }: SelectProps) {
  const [open, setOpen] = useState(false);
  const lockRef = useRef(false);

  return (
    <Select
      {...props}
      open={open}
      onOpenChange={(next) => {
        if (next && lockRef.current) return; // ignore reopen fired right after a close
        setOpen(next);
        if (!next) {
          lockRef.current = true;
          // Cleared on the next tick's timer — this runs in an event handler,
          // not during render, so it's safe per the hooks-purity rules.
          setTimeout(() => {
            lockRef.current = false;
          }, 250);
        }
      }}
    >
      {children}
    </Select>
  );
}
