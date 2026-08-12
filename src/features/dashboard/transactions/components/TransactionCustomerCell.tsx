import { Avatar, AvatarFallback } from "@/components/ui";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

interface TransactionCustomerCellProps {
  name: string;
  email?: string;
}

export function TransactionCustomerCell({ name, email }: TransactionCustomerCellProps) {
  const displayName = name || "Unknown customer";

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-[11px]">{initials(displayName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-foreground">{displayName}</p>
        {email && <p className="truncate text-[11px] text-muted-foreground lowercase">{email}</p>}
      </div>
    </div>
  );
}
