import { useGet } from "@/lib/api/hooks";
import { invoiceSummaryApi } from "@/features/dashboard/mca-invoices/services";
import type {
  McaInvoiceSummaryData,
  McaInvoiceSummaryResponse,
} from "@/features/dashboard/mca-invoices/types";

/**
 * `get-invoice-summary` for one MID over a unix-SECONDS window. Shared by the
 * Invoices page's donut and the MCA dashboard's invoice-count widgets, so both
 * read one cached query for the same window rather than two copies of it.
 */
export function useInvoiceSummary(
  merchantId: string,
  windowSeconds: { start: number; end: number }
): { summary: McaInvoiceSummaryData | undefined; isLoading: boolean } {
  const url = invoiceSummaryApi(merchantId, windowSeconds.start, windowSeconds.end);
  // isPending, not isLoading: isPending is false the moment there is data to
  // show, cached or fresh, so a revisit renders the previous counts instead of
  // skeletons while the background revalidation runs.
  const { data, isPending } = useGet<McaInvoiceSummaryResponse>(
    ["invoice-summary", merchantId, windowSeconds.start, windowSeconds.end],
    url,
    undefined,
    { enabled: !!url }
  );

  // Note the doubly-nested data: BaseResponse.data.data.
  return { summary: data?.data?.data, isLoading: !!url && isPending };
}
