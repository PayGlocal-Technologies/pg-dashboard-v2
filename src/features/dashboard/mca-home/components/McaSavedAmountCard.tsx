import { Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { RollingNumber } from "@/components/common/RollingNumber";
import { mcaSavedAmount } from "@/features/dashboard/mca-home/mock-data";

export function McaSavedAmountCard() {
  return (
    <Card className="gap-3 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10">
        <Icon name="piggy-bank" className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
      </div>
      <div>
        <p className="text-[13px] font-medium text-muted-foreground">Saved amount</p>
        <RollingNumber
          value={mcaSavedAmount.valueLabel}
          className="mt-1 block text-2xl font-bold tracking-tight text-foreground tabular-nums"
        />
      </div>
      <p className="text-xs text-muted-foreground">{mcaSavedAmount.description}</p>
    </Card>
  );
}
