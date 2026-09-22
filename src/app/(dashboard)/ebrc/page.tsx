import { type Metadata } from "next";
import { EbrcFeature } from "@/features/dashboard/ebrc";

export const metadata: Metadata = {
  title: "eBRC",
};

export default function EbrcPage() {
  return <EbrcFeature />;
}
