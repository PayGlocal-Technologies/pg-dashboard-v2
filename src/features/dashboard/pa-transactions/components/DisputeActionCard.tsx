import {
  Badge,
  Button,
  Callout,
  CalloutText,
  CalloutTitle,
  Card,
  Separator,
} from "@/components/ui";

interface DisputeActionCardProps {
  /** Short, concise, merchant-facing label derived from the dispute's own
   * reason (see getDisputeReasonMeta), e.g. "Duplicate charge". This is now
   * the PRIMARY thing a merchant sees, a merchant should understand what
   * this dispute is about within 1-2 seconds, not after reading a generic
   * "The customer disputed this payment" sentence. */
  merchantLabel: string;
  /** Card-network reason code, e.g. "12.6", shown as prominent metadata
   * right under merchantLabel, not buried in the right-side details card. */
  reasonCode: string;
  /** The dispute's own (scheme-level) reason string, e.g. "Duplicate
   * processing", shown next to reasonCode as secondary context. */
  reason: string;
  /** Longer, plain-language sentence, now supporting text below the
   * reason/code, not the heading. */
  description: string;
  onLearnMore: () => void;
  onAccept: () => void;
  onContest: () => void;
}

/** First-stage dispute card shown at the top of a disputed transaction's full
 * page (matches the reference: a card explaining the dispute, then Accept /
 * Contest actions), only for the raw statuses that still need a merchant
 * response, see TransactionDetailFeature. Three distinct information
 * layers, in order: dispute type (reason/code), why the customer raised it
 * (the callout below, deliberately given its own tinted container so it
 * doesn't blend into ordinary body copy), then what the merchant can do
 * about it. A merchant should be able to scan straight down this card and
 * answer all three without opening the right-side Dispute Details card. */
export function DisputeActionCard({
  merchantLabel,
  reasonCode,
  reason,
  description,
  onLearnMore,
  onAccept,
  onContest,
}: DisputeActionCardProps) {
  return (
    <Card className="gap-0 p-5">
      <h2 className="text-base font-bold text-foreground">{merchantLabel}</h2>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" size="sm" square className="font-mono">
          {reasonCode}
        </Badge>
        <span className="text-sm text-muted-foreground">{reason}</span>
      </div>

      {/* The customer's own claim, why the dispute exists, this is the
       * single most important sentence on the card, it gets its own tinted
       * container (not just bold text) so it reads as a distinct
       * information layer rather than another line of body copy. */}
      <Callout variant="neutral" className="mt-4">
        <div className="min-w-0 flex-1">
          <CalloutTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Why was this disputed?
          </CalloutTitle>
          <CalloutText className="mt-1 text-sm font-medium text-foreground opacity-100">
            {description}
          </CalloutText>
        </div>
      </Callout>

      {/* Merchant guidance, deliberately plain body copy (muted, no
       * container) so it reads as secondary to the claim above it. */}
      <div className="mt-4">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          What can you do?
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          You may either contest the dispute by providing evidence that the charge is legitimate, or
          accept it immediately to refund the cardholder and close the dispute.
        </p>
      </div>

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
