import { Icon } from "@/components/icon";

/** Inline error banner for failed auth API calls. */
export function AuthError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive"
    >
      <Icon name="alert-circle" size={16} className="mt-px shrink-0" />
      <span>{message}</span>
    </div>
  );
}
