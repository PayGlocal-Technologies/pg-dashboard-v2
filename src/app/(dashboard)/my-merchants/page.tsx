import { Suspense } from "react";
import { type Metadata } from "next";
import { MyMerchantsFeature } from "@/features/dashboard/my-merchants";

export const metadata: Metadata = {
  title: "Merchants",
};

export default function MyMerchantsPage() {
  return (
    <Suspense>
      <MyMerchantsFeature />
    </Suspense>
  );
}
