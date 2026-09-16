import { Icon } from "@/components/icon";

/**
 * Standard marker for settings sections whose design exists but has no backing
 * pg-dashboard endpoint yet. Renders a muted, dashed banner so the mock UI still
 * shows but is unmistakably flagged as not-yet-live (the "keep UI, mark BACKEND
 * GAP" decision). Pair it with a `// BACKEND GAP:` code comment at the mock data.
 */
export function BackendGapNotice({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        <span className="font-semibold">Not available yet.</span> {message}
      </span>
    </div>
  );
}
