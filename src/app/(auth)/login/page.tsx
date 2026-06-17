import { Suspense } from "react";
import { LoginFeature } from "@/features/auth/login";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginFeature />
    </Suspense>
  );
}
