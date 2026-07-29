import { Card, CardContent, Shimmer } from "@/components/ui";
import { cn } from "@/lib/utils";
import { CARD_SIZE_CLASS } from "@/features/dashboard/multi-currency/constants";

/** Loading placeholder that mirrors VirtualAccountCard's footprint exactly. */
export function VirtualAccountCardSkeleton() {
  return (
    <Card className={cn(CARD_SIZE_CLASS, "shrink-0 px-4 py-4")} aria-hidden>
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-end gap-1">
          <Shimmer className="h-7 w-7" rounded="md" />
          <Shimmer className="h-7 w-7" rounded="md" />
        </div>
        <Shimmer className="h-9 w-9" rounded="full" />
        <div className="space-y-1.5">
          <Shimmer className="h-4 w-28" rounded="sm" />
          <Shimmer className="h-3 w-20" rounded="sm" />
        </div>
        <div className="space-y-2.5">
          <Shimmer className="h-3 w-24" rounded="sm" />
          <Shimmer className="h-3.5 w-36" rounded="sm" />
          <Shimmer className="h-3 w-20" rounded="sm" />
          <Shimmer className="h-3.5 w-32" rounded="sm" />
        </div>
      </CardContent>
    </Card>
  );
}
