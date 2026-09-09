/** The timeframe the "Total settled" card reports over. Sent to the overview
 *  endpoint verbatim as its `timeframe` query parameter. */
export type TotalSettledTimeframe = "week" | "month" | "ytd";

export const totalSettledTimeframes: { value: TotalSettledTimeframe; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "ytd", label: "Year to date" },
];
