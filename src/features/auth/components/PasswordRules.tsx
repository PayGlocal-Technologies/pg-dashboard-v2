"use client";

import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { PASSWORD_RULES } from "@/features/auth/login/schemas";

/** Live checklist of password requirements; ticks turn green as `value` satisfies each rule. */
export function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="grid gap-1.5 rounded-lg border border-border bg-muted/40 p-3">
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(value);
        return (
          <li
            key={rule.label}
            className={cn(
              "flex items-center gap-2 text-xs transition-colors",
              passed ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <Icon
              name={passed ? "check-circle" : "x"}
              size={14}
              className={passed ? "text-emerald-500" : "text-muted-foreground/60"}
            />
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
