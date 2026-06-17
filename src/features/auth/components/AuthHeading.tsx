import type { ReactNode } from "react";

/** Title + supporting copy at the top of an auth screen. */
export function AuthHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
      {children && <p className="text-sm text-muted-foreground">{children}</p>}
    </div>
  );
}
