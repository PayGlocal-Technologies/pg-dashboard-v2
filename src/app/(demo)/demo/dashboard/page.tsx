import { type Metadata } from "next";
import { DashboardHomeFeature } from "@/features/dashboard/home";
import { VerifyEmailOverlay } from "@/features/auth/components/VerifyEmailOverlay";

export const metadata: Metadata = {
  title: "Dashboard",
};

/** DEMO: the Home dashboard on sample data, opened by the mock sign-up, with
 *  the "verification email sent" overlay on top. */
export default function DemoDashboardPage() {
  return (
    <>
      <DashboardHomeFeature />
      <VerifyEmailOverlay />
    </>
  );
}
