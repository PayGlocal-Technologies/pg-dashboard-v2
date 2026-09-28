"use client";

import { useRouter } from "next/navigation";
import { CreatePaymentPage } from "@/features/dashboard/payment-pages/components/CreatePaymentPage";

export default function CreatePaymentPageRoute() {
  const router = useRouter();
  return <CreatePaymentPage open row={null} onClose={() => router.push("/payment-pages")} />;
}
