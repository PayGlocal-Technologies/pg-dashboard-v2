import { type Metadata } from "next";
import { MyQueriesFeature } from "@/features/dashboard/support-tickets";

export const metadata: Metadata = { title: "My queries" };

export default function MyQueriesPage() {
  return <MyQueriesFeature />;
}
