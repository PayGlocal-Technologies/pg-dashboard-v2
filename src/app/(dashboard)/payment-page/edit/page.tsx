"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreatePaymentPage } from "@/features/dashboard/payment-pages/components/CreatePaymentPage";
import { useEditingPaymentPage } from "@/features/dashboard/payment-pages/useEditingPaymentPage";

export default function EditPaymentPageRoute() {
  const router = useRouter();
  const row = useEditingPaymentPage((s) => s.row);

  useEffect(() => {
    // A direct visit or refresh loses the in-memory selection — send them back
    // to the list rather than showing an empty edit screen.
    if (!row) router.replace("/payment-pages");
  }, [row, router]);

  if (!row) return null;

  return <CreatePaymentPage open row={row} onClose={() => router.push("/payment-pages")} />;
}
