import { cn } from "@/lib/utils";

/** PayGlocal wordmark used on the auth screens (matches the sidebar mark). */
export function BrandLogo({
  className,
  wordmarkClassName,
  onDark = false,
}: {
  className?: string;
  wordmarkClassName?: string;
  onDark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold",
          onDark ? "bg-white/15 text-white" : "bg-primary text-primary-foreground"
        )}
      >
        P
      </span>
      <span
        className={cn(
          "text-lg font-semibold tracking-tight",
          onDark ? "text-white" : "text-foreground",
          wordmarkClassName
        )}
      >
        PayGlocal
      </span>
    </div>
  );
}
