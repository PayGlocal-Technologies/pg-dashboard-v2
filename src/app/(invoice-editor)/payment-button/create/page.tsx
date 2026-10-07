import { redirect } from "next/navigation";

// Create a payment button now opens as a modal over the list. This route stays
// for links into it (the header search, bookmarks) and hands off to the list
// with ?create=1, keeping the account picked there as ?mid=.
export default async function CreatePaymentButtonPage({
  searchParams,
}: {
  searchParams: Promise<{ mid?: string }>;
}) {
  const { mid } = await searchParams;
  redirect(
    mid ? `/payment-button?create=1&mid=${encodeURIComponent(mid)}` : "/payment-button?create=1"
  );
}
