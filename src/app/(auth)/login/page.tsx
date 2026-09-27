import { Suspense } from "react";
import { SignUpMockForm } from "@/features/auth/login/components/SignUpMockForm";

// DESIGN MOCK: the login route currently renders the UI-only unified sign-up
// screen, which calls no APIs. Restore real sign-in by rendering
// `LoginFeature` from "@/features/auth/login" here instead.
export default function LoginPage() {
  return (
    <Suspense>
      <SignUpMockForm />
    </Suspense>
  );
}
