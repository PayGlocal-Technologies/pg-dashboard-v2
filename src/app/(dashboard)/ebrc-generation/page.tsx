import { type Metadata } from "next";
import { EbrcGenerationFeature } from "@/features/dashboard/ebrc-generation";

export const metadata: Metadata = {
  title: "eBRC Generation",
};

export default function EbrcGenerationPage() {
  return <EbrcGenerationFeature />;
}
