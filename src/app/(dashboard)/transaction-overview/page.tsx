import { type Metadata } from "next";
import { TransactionOverviewFeature } from "@/features/dashboard/transaction-overview";

export const metadata: Metadata = {
  title: "Transaction Overview",
};

export default function TransactionOverviewPage() {
  return <TransactionOverviewFeature />;
}
