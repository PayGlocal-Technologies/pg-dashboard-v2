import { Card, CardContent, Shimmer } from "@/components/ui";
import { cn } from "@/lib/utils";
import { CARD_SIZE_CLASS } from "@/features/dashboard/multi-currency/constants";

/** Loading placeholder that mirrors VirtualAccountCard's footprint exactly. */
export function VirtualAccountCardSkeleton() {
  return (
    <Card className={cn(CARD_SIZE_CLASS, "shrink-0 overflow-hidden px-4 py-4")} aria-hidden>
      <CardContent className="flex h-full flex-col gap-1 overflow-hidden">
        <div className="flex items-center justify-end gap-0.5">
          <Shimmer className="h-6 w-6" rounded="md" />
          <Shimmer className="h-6 w-6" rounded="md" />
        </div>
        <Shimmer className="h-8 w-8" rounded="full" />
        <div className="space-y-1">
          <Shimmer className="h-4 w-24" rounded="sm" />
          <Shimmer className="h-3 w-20" rounded="sm" />
        </div>
        <div className="mt-auto space-y-1.5">
          <Shimmer className="h-3.5 w-28" rounded="sm" />
          <Shimmer className="h-3.5 w-24" rounded="sm" />
        </div>
      </CardContent>
    </Card>
  );
}
