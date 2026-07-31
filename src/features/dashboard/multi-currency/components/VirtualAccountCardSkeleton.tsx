import { Card, CardContent, Shimmer } from "@/components/ui";
import { cn } from "@/lib/utils";
import { CARD_SIZE_CLASS } from "@/features/dashboard/multi-currency/constants";

/** Loading placeholder that mirrors VirtualAccountCard's footprint exactly. */
export function VirtualAccountCardSkeleton() {
  return (
    <Card className={cn(CARD_SIZE_CLASS, "shrink-0 overflow-hidden px-4 py-4")} aria-hidden>
      <CardContent className="flex h-full flex-col gap-1 overflow-hidden">
        {/* Mirrors the card's own stack: the expand control sits top-right
            (absolute there, a flex row here — same footprint either way),
            then flag, title/country, and the two identifier rows. */}
        <div className="flex items-start justify-between">
          <Shimmer className="h-8 w-8" rounded="full" />
          <Shimmer className="h-6 w-6" rounded="full" />
        </div>
        <div className="mt-3 space-y-1">
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
