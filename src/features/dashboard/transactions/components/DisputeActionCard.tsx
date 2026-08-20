import { Button, Card, Separator } from "@/components/ui";

interface DisputeActionCardProps {
  description: string;
  onLearnMore: () => void;
  onAccept: () => void;
  onContest: () => void;
}

/** First-stage dispute card shown at the top of a disputed transaction's full
 * page (matches the reference: a card explaining the dispute, then Accept /
 * Contest actions), only for the raw statuses that still need a merchant
 * response, see TransactionDetailFeature. */
export function DisputeActionCard({ description, onLearnMore, onAccept, onContest }: DisputeActionCardProps) {
  return (
    <Card className="gap-0 p-5">
      <h2 className="text-base font-bold text-foreground">The customer disputed this payment</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        You may either contest the dispute by providing evidence that the charge is legitimate, or accept it
        immediately to refund the cardholder and close the dispute.
      </p>

      <Separator className="my-4" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="link"
          onClick={onLearnMore}
          className="h-auto w-fit p-0 text-sm font-medium"
        >
          Learn how to respond to disputes
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onAccept}>
            Accept dispute
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={onContest}>
            Contest dispute
          </Button>
        </div>
      </div>
    </Card>
  );
}
