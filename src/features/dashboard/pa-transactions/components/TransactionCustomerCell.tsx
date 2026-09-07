interface TransactionCustomerCellProps {
  name: string;
  email?: string;
}

export function TransactionCustomerCell({ name, email }: TransactionCustomerCellProps) {
  const displayName = name || "Unknown customer";

  return (
    <div className="min-w-0">
      <p className="truncate text-[12px] font-medium text-foreground">{displayName}</p>
      {email && <p className="truncate text-[10px] text-muted-foreground lowercase">{email}</p>}
    </div>
  );
}
